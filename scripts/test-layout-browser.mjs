import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const candidates = process.platform === "win32"
  ? [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ]
  : process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const browser = process.env.MEH_TEST_BROWSER || candidates.find(existsSync);
const captureDirectory = process.env.MEH_CAPTURE_DIR || "";
if (!browser) {
  console.error("No supported Chromium browser found; set MEH_TEST_BROWSER to run layout smoke tests.");
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), "meh-layout-test-"));
const port = 19000 + Math.floor(Math.random() * 1000);
const child = spawn(browser, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--hide-scrollbars",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore", windowsHide: true });

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const endpoint = `http://127.0.0.1:${port}`;
let socket;
let nextId = 1;
const pending = new Map();

async function waitForBrowser() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return;
    } catch {
      // Browser endpoint is still starting.
    }
    await delay(50);
  }
  throw new Error("Timed out waiting for Chromium DevTools endpoint");
}

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveMessage, rejectMessage) => {
    pending.set(id, { resolve: resolveMessage, reject: rejectMessage });
  });
}

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Browser evaluation failed");
  return response.result?.value;
}

async function captureScreenshot(name) {
  if (!captureDirectory) return;
  mkdirSync(captureDirectory, { recursive: true });
  const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(join(captureDirectory, name), Buffer.from(screenshot.data, "base64"));
}

async function waitForApp() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await evaluate(`document.readyState === 'complete' && Boolean(window.MehLayoutDiagnostics) && Boolean(document.querySelector('.page-card'))`);
    if (ready) {
      await delay(250);
      return;
    }
    await delay(50);
  }
  throw new Error("App did not initialize in Chromium");
}

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

try {
  await waitForBrowser();
  const pageUrl = `${pathToFileURL(join(root, "index.html")).href}?debugInsets=1`;
  const targetResponse = await fetch(`${endpoint}/json/new?${encodeURIComponent(pageUrl)}`, { method: "PUT" });
  const target = await targetResponse.json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result || {});
  });
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
  await send("Page.reload", { ignoreCache: true });
  await waitForApp();

  const base = await evaluate(`(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const frame = getComputedStyle(document.querySelector('.phone-frame'));
    const background = document.querySelector('#viewport-background');
    const backgroundRect = background.getBoundingClientRect();
    const dock = document.querySelector('.bottom-nav-positioner');
    const activeDockItemRect = document.querySelector('.dock-item.is-active').getBoundingClientRect();
    const dockIndicatorRect = document.querySelector('.dock-indicator').getBoundingClientRect();
    return {
      build: document.querySelector('meta[name="meh-build"]').content,
      viewport: [innerWidth, innerHeight],
      bodyPadding: [body.paddingTop, body.paddingBottom],
      framePadding: [frame.paddingTop, frame.paddingBottom],
      frameBackground: frame.backgroundColor,
      htmlBackground: html.backgroundColor,
      bodyBackground: body.backgroundColor,
      bodyBackgroundImage: body.backgroundImage,
      inlineAppHeight: document.documentElement.style.getPropertyValue('--app-height'),
      canvasHeight: [document.body.getBoundingClientRect().height, document.querySelector('.phone-frame').getBoundingClientRect().height],
      backgroundRect: [backgroundRect.top, backgroundRect.bottom],
      backgroundImage: html.backgroundImage,
      viewportBackgroundImage: getComputedStyle(background).backgroundImage,
      backgroundParentIsBody: background.parentElement === document.body,
      dockParentIsBody: dock.parentElement === document.body,
      platform: document.documentElement.dataset.runtime,
      finalTop: html.getPropertyValue('--content-inset-top').trim(),
      finalBottom: html.getPropertyValue('--content-inset-bottom').trim(),
      dockIndicatorDelta: [
        dockIndicatorRect.left - activeDockItemRect.left,
        dockIndicatorRect.width - activeDockItemRect.width,
      ],
    };
  })()`);
  check(base.build === "1.1.2-pwa-r4", "browser loaded the wrong build");
  check(base.platform === "platform-browser" && base.finalTop === "0px" && base.finalBottom === "0px", "browser fallback platform or zero-inset policy is wrong");
  check(base.viewport[0] === 390, `portrait viewport width was ${base.viewport[0]}, expected 390`);
  check(base.bodyPadding.join(",") === "0px,0px", "visual body must not consume safe-area padding");
  check(base.framePadding.join(",") === "0px,0px", "visual root must not consume safe-area padding");
  check(base.frameBackground !== "rgba(0, 0, 0, 0)", "content root must provide an opaque fallback background");
  check(base.htmlBackground !== "rgba(0, 0, 0, 0)" && base.bodyBackground !== "rgba(0, 0, 0, 0)", "html and body must provide opaque fallback backgrounds");
  check(base.backgroundImage !== "none" && base.bodyBackgroundImage !== "none" && base.viewportBackgroundImage !== "none", "root background layers did not receive the production theme");
  check(base.backgroundRect[0] === 0 && base.backgroundRect[1] === 844, `viewport background did not use fixed inset zero: ${JSON.stringify(base.backgroundRect)}`);
  check(base.backgroundParentIsBody && base.dockParentIsBody, "viewport background or fixed dock is not a direct body child");
  check(base.inlineAppHeight === "", "JavaScript wrote an inline full-screen app height");
  check(base.canvasHeight.every((height) => height >= 844), `portrait visual canvas did not cover the viewport: ${base.canvasHeight.join(",")}`);
  check(base.dockIndicatorDelta.every((delta) => Math.abs(delta) <= 0.5), `dock indicator was not aligned to its active item: ${base.dockIndicatorDelta.join(",")}`);

  const navigationDebug = await evaluate(`(() => {
    localStorage.setItem('meh-navigation-debug', '1');
    window.mehNavigationDebug.clear();
    window.mehNavigation.recordDebug('viewport-resize', { test: true });
    const exported = window.mehNavigationDebug.export();
    window.mehNavigationDebug.clear();
    localStorage.removeItem('meh-navigation-debug');
    return {
      count: exported.length,
      event: exported[0]?.event,
      sessionId: exported[0]?.sessionId,
      hasStack: Array.isArray(exported[0]?.uiStack),
      hasViewport: typeof exported[0]?.innerHeight === 'number',
      cleared: window.mehNavigationDebug.export().length,
    };
  })()`);
  check(
    navigationDebug.count === 1
      && navigationDebug.event === "viewport-resize"
      && navigationDebug.sessionId
      && navigationDebug.hasStack
      && navigationDebug.hasViewport
      && navigationDebug.cleared === 0,
    `opt-in navigation diagnostics export/clear failed: ${JSON.stringify(navigationDebug)}`
  );

  const safeAreaDiagnostics = await evaluate(`(() => {
    const snapshot = window.MehSafeAreaDiagnostics.snapshot();
    const testWallpaper = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
    applyBackgroundImage(testWallpaper, 0.5);
    const wallpaperVariable = document.documentElement.style.getPropertyValue('--app-wallpaper-image');
    const wallpaperOpacityVariable = document.documentElement.style.getPropertyValue('--app-wallpaper-opacity');
    const htmlBackground = getComputedStyle(document.documentElement).backgroundImage;
    const bodyBackground = getComputedStyle(document.body).backgroundImage;
    const viewportBackground = getComputedStyle(document.querySelector('#viewport-background')).backgroundImage;
    const wallpaperLayer = getComputedStyle(document.querySelector('#viewport-background'), '::before');
    const frameWallpaperLayer = getComputedStyle(document.querySelector('.phone-frame'), '::before');
    const wallpaperBackground = wallpaperLayer.backgroundImage;
    const frameWallpaperBackground = frameWallpaperLayer.backgroundImage;
    const wallpaperOpacity = wallpaperLayer.opacity;
    applyBackgroundImage('', 0.5);
    return {
      snapshot,
      wallpaperVariable,
      wallpaperOpacityVariable,
      htmlBackground,
      bodyBackground,
      viewportBackground,
      wallpaperBackground,
      frameWallpaperBackground,
      wallpaperOpacity,
    };
  })()`);
  check(safeAreaDiagnostics.snapshot.metaInfo.viewport === "width=device-width, initial-scale=1, viewport-fit=cover", "runtime diagnostics read the wrong viewport meta");
  check(safeAreaDiagnostics.snapshot.metaInfo.appleMobileWebAppCapable === "yes", "runtime diagnostics read the wrong standalone capability meta");
  check(safeAreaDiagnostics.snapshot.metaInfo.appleMobileWebAppStatusBarStyle === "black-translucent", "runtime diagnostics read the wrong status bar meta");
  check(safeAreaDiagnostics.snapshot.statusBarColors.statusBarStrategyValid, `browser status-bar fallback strategy is invalid: ${JSON.stringify(safeAreaDiagnostics.snapshot.statusBarColors)}`);
  check(safeAreaDiagnostics.wallpaperVariable.includes("url("), "custom wallpaper was not assigned to the shared background variable");
  check(safeAreaDiagnostics.wallpaperOpacityVariable === "0.5" && safeAreaDiagnostics.wallpaperOpacity === "0.5", "custom wallpaper opacity did not reach the dedicated wallpaper layer");
  check(
    safeAreaDiagnostics.htmlBackground !== "none"
      && safeAreaDiagnostics.bodyBackground !== "none"
      && safeAreaDiagnostics.viewportBackground !== "none"
      && safeAreaDiagnostics.wallpaperBackground.includes("url(")
      && safeAreaDiagnostics.frameWallpaperBackground.includes("url("),
    "custom wallpaper did not reach both the viewport and opaque content-root wallpaper layers"
  );

  const themeColorPolicy = await evaluate(`(() => {
    const root = document.documentElement;
    root.classList.remove("platform-browser", "platform-android-app");
    root.classList.add("platform-ios-pwa");
    applyThemeColor(appSettings.primaryThemeColor, appSettings.secondaryThemeColor);
    const removedForIosPwa = !document.querySelector('meta[name="theme-color"]');
    const iosDiagnostics = getSystemBarColorDiagnostics();

    const restored = document.createElement("meta");
    restored.id = "themeColorMeta";
    restored.name = "theme-color";
    document.head.appendChild(restored);
    root.classList.remove("platform-ios-pwa", "platform-android-app");
    root.classList.add("platform-browser");
    applyThemeColor(appSettings.primaryThemeColor, appSettings.secondaryThemeColor);
    const restoredForBrowser = Boolean(document.querySelector('meta[name="theme-color"]')?.content);
    return { removedForIosPwa, iosDiagnostics, restoredForBrowser };
  })()`);
  check(themeColorPolicy.removedForIosPwa, "iOS standalone theme-color was not removed");
  check(themeColorPolicy.iosDiagnostics.statusBarStrategyValid, `iOS transparent status-bar strategy is invalid: ${JSON.stringify(themeColorPolicy.iosDiagnostics)}`);
  check(themeColorPolicy.restoredForBrowser, "browser theme-color fallback was not restored for the remainder of the test");

  const viewportClassification = await evaluate(`(() => {
    const metaInfo = {
      viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
      appleMobileWebAppCapable: "yes",
      appleMobileWebAppStatusBarStyle: "black-translucent",
    };
    const colors = { fallbackColorsMatch: true };
    const fullPaint = (height) => ({
      html: { top: 0, bottom: height, height },
      body: { top: 0, bottom: height, height },
      appRoot: { top: 0, bottom: height, height },
      viewportMarker: { top: 0, bottom: height, height },
    });
    const classify = window.MehSafeAreaDiagnostics.classify;
    const external = classify({
      standaloneInfo: {
        navigatorStandalone: true,
        displayModeStandalone: true,
        screenHeight: 844,
        innerHeight: 782,
        documentClientHeight: 782,
        visualViewportHeight: 782,
        visualViewportOffsetTop: 0,
      },
      metaInfo,
      safeArea: { safeTop: "0px", safeBottom: "0px" },
      paintGeometry: fullPaint(782),
      statusBarColors: colors,
    });
    const internalPaint = fullPaint(844);
    internalPaint.appRoot.top = 59;
    const internal = classify({
      standaloneInfo: {
        navigatorStandalone: true,
        displayModeStandalone: true,
        screenHeight: 844,
        innerHeight: 844,
        documentClientHeight: 844,
        visualViewportHeight: 844,
        visualViewportOffsetTop: 0,
      },
      metaInfo,
      safeArea: { safeTop: "59px", safeBottom: "34px" },
      paintGeometry: internalPaint,
      statusBarColors: colors,
    });
    return { external, internal };
  })()`);
  check(viewportClassification.external.verdict === "webview-excludes-screen-region", `external WebView reservation was classified as ${viewportClassification.external.verdict}`);
  check(viewportClassification.external.deltas.screenMinusInner === 62, `external viewport delta was ${viewportClassification.external.deltas.screenMinusInner}, expected 62`);
  check(viewportClassification.internal.verdict === "dom-internal-gap", `internal DOM gap was classified as ${viewportClassification.internal.verdict}`);

  const pages = await evaluate(`(async () => {
    const results = [];
    for (const page of ['coin', 'dice', 'wheel', 'number']) {
      document.querySelector('[data-page="' + page + '"]').click();
      await new Promise((resolve) => setTimeout(resolve, 30));
      results.push({ page, title: document.querySelector('#pageTitle').textContent.trim(), content: document.querySelector('#pageContent').childElementCount });
    }
    return results;
  })()`);
  check(pages.every((page) => page.title && page.content > 0), "one or more main pages failed to render");
  await send("Page.reload", { ignoreCache: true });
  await waitForApp();
  const refreshedPage = await evaluate(`(() => ({
    page: document.querySelector('.dock-item.is-active')?.dataset.page,
    title: document.querySelector('#pageTitle')?.textContent.trim(),
    content: document.querySelector('#pageContent')?.childElementCount || 0,
  }))()`);
  check(refreshedPage.page === "number" && refreshedPage.title && refreshedPage.content > 0, `page refresh did not restore a valid saved page: ${JSON.stringify(refreshedPage)}`);

  const settings = await evaluate(`(async () => {
    document.querySelector('#settingsButton').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sheet = document.querySelector('#settingsSheet');
    const style = getComputedStyle(sheet);
    return {
      open: sheet.classList.contains('is-open'),
      paddingBottom: style.paddingBottom,
      wallpaperGrid: Boolean(document.querySelector('#presetWallpaperGrid')),
      githubProjectUrl: document.querySelector('.project-link-button')?.href,
      rootLocked: document.documentElement.classList.contains('page-scroll-locked'),
      bodyInlinePosition: document.body.style.position,
      bodyInlineTop: document.body.style.top,
      navigation: window.mehNavigation?.getState(),
    };
  })()`);
  check(settings.open && settings.wallpaperGrid, "settings/custom-background page failed to open");
  check(settings.navigation?.screen === "settings" && settings.navigation?.depth === 1, `settings did not create a depth-1 SPA state: ${JSON.stringify(settings.navigation)}`);
  check(settings.githubProjectUrl === "https://github.com/AidanQiu/Meh", `GitHub project link is missing or incorrect: ${settings.githubProjectUrl}`);
  check(settings.rootLocked && settings.bodyInlinePosition === "" && settings.bodyInlineTop === "", `sheet scroll lock mutated body positioning: ${JSON.stringify(settings)}`);
  await send("Page.reload", { ignoreCache: true });
  await waitForApp();
  const restoredSettings = await evaluate(`(() => ({
    open: document.querySelector('#settingsSheet').classList.contains('is-open'),
    state: window.mehNavigation?.getState(),
  }))()`);
  check(!restoredSettings.open && restoredSettings.state?.screen === "home" && restoredSettings.state?.depth === 0, `new document session did not normalize stale History state to root: ${JSON.stringify(restoredSettings)}`);
  const wallpaperLifecycle = await evaluate(`(async () => {
    const input = document.querySelector('#backgroundImageInput');
    const transfer = new DataTransfer();
    transfer.items.add(new File(
      ['<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>'],
      'test-wallpaper.svg',
      { type: 'image/svg+xml' }
    ));
    Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
    await handleBackgroundImageSelect({ target: input });
    const selected = {
      count: wallpapers.length,
      activeId: appSettings.activeWallpaperId,
      painted: document.documentElement.style.getPropertyValue('--app-wallpaper-image'),
    };
    const opacityRange = document.querySelector('#bgOpacityRange');
    opacityRange.value = '0.27';
    opacityRange.dispatchEvent(new Event('input', { bubbles: true }));
    const opacity = {
      setting: appSettings.backgroundOpacity,
      variable: document.documentElement.style.getPropertyValue('--app-wallpaper-opacity'),
      computed: getComputedStyle(document.querySelector('#viewport-background'), '::before').opacity,
    };
    await clearCurrentBackground();
    const stored = await getAllWallpapersFromDb();
    return {
      selected,
      opacity,
      remaining: wallpapers.length,
      activeId: appSettings.activeWallpaperId,
      stored: stored.length,
    };
  })()`);
  check(
    wallpaperLifecycle.selected.count === 1
      && wallpaperLifecycle.selected.activeId
      && wallpaperLifecycle.selected.painted.includes("url(")
      && wallpaperLifecycle.opacity.setting === 0.27
      && wallpaperLifecycle.opacity.variable === "0.27"
      && wallpaperLifecycle.opacity.computed === "0.27"
      && wallpaperLifecycle.remaining === 0
      && wallpaperLifecycle.activeId === ""
      && wallpaperLifecycle.stored === 0,
    `custom wallpaper select/delete lifecycle failed: ${JSON.stringify(wallpaperLifecycle)}`
  );
  const historyTransition = await evaluate(`(async () => {
    const settled = () => new Promise((resolve) => {
      const unsubscribe = window.mehNavigation.onSettled((detail) => {
        unsubscribe();
        resolve(detail);
      });
    });
    let done = settled();
    document.querySelector('#settingsButton').click();
    await done;
    done = settled();
    history.back();
    const detail = await done;
      const sheet = document.querySelector('#settingsSheet');
      const matrix = new DOMMatrixReadOnly(getComputedStyle(sheet).transform);
      return {
        navigationClasses: Array.from(sheet.classList).filter((name) => name.startsWith('is-navigation-')),
        horizontalOffset: Math.round(matrix.m41),
        open: sheet.classList.contains('is-open'),
        ariaHidden: sheet.getAttribute('aria-hidden'),
        state: window.mehNavigation?.getState(),
        source: detail.source,
      };
  })()`);
  check(
    historyTransition.navigationClasses.length === 0
      && historyTransition.horizontalOffset === 0
      && !historyTransition.open
      && historyTransition.ariaHidden === "true"
      && historyTransition.state?.screen === "home"
      && historyTransition.state?.depth === 0
      && historyTransition.source === "browser-history",
    `browser history return added a second transition or failed to restore root: ${JSON.stringify(historyTransition)}`
  );
  await evaluate(`new Promise((resolve) => setTimeout(resolve, 850))`);
  const historyRecovery = await evaluate(`(() => {
    const backgroundRect = document.querySelector('#viewport-background').getBoundingClientRect();
    return {
      sheetOpen: document.querySelector('#settingsSheet').classList.contains('is-open'),
      rootLocked: document.documentElement.classList.contains('page-scroll-locked'),
      bodyInlinePosition: document.body.style.position,
      bodyInlineTop: document.body.style.top,
      backgroundBottom: Math.round(backgroundRect.bottom),
      viewportBottom: innerHeight,
    };
  })()`);
  check(!historyRecovery.sheetOpen && !historyRecovery.rootLocked, `history return did not release the sheet scroll lock: ${JSON.stringify(historyRecovery)}`);
  check(historyRecovery.bodyInlinePosition === "" && historyRecovery.bodyInlineTop === "", `history return left a body-fixed offset: ${JSON.stringify(historyRecovery)}`);
  check(historyRecovery.backgroundBottom >= historyRecovery.viewportBottom, `history return exposed the viewport below the background: ${JSON.stringify(historyRecovery)}`);

  const repeatedSheetCycles = await evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const settled = () => new Promise((resolve) => {
      const unsubscribe = window.mehNavigation.onSettled(() => {
        unsubscribe();
        resolve();
      });
    });
    const baselineScrollHeight = document.documentElement.scrollHeight;
    const cycles = [];
    for (let index = 0; index < 20; index += 1) {
      let done = settled();
      document.querySelector('#settingsButton').click();
      await wait(45);
      const sheet = document.querySelector('#settingsSheet');
      const openingMatrix = new DOMMatrixReadOnly(getComputedStyle(sheet).transform);
      await done;
      done = settled();
      document.querySelector('#closeSettingsButton').click();
      await done;
      const closingMatrix = new DOMMatrixReadOnly(getComputedStyle(sheet).transform);
      cycles.push({
        openingHorizontal: Math.round(openingMatrix.m41),
        openingVertical: Math.round(openingMatrix.m42),
        closingHorizontal: Math.round(closingMatrix.m41),
        open: sheet.classList.contains('is-open'),
        rootLocked: document.documentElement.classList.contains('page-scroll-locked'),
        bodySheetOpen: document.body.classList.contains('sheet-open'),
        bodyStyles: {
          position: document.body.style.position,
          top: document.body.style.top,
          height: document.body.style.height,
          overflow: document.body.style.overflow,
          paddingBottom: document.body.style.paddingBottom,
          transform: document.body.style.transform,
        },
        legacyRecoveryClass: document.documentElement.classList.contains('viewport-recovery-active'),
        legacyRecoveryHeight: document.documentElement.style.getPropertyValue('--viewport-recovery-height'),
        scrollHeight: document.documentElement.scrollHeight,
        backgroundBottom: Math.round(document.querySelector('#viewport-background').getBoundingClientRect().bottom),
        viewportBottom: innerHeight,
      });
    }
    return { baselineScrollHeight, cycles };
  })()`);
  check(
    repeatedSheetCycles.cycles.every((cycle) =>
      cycle.openingHorizontal === 0
      && cycle.closingHorizontal === 0
      && cycle.openingVertical > 0
      && !cycle.open
      && !cycle.rootLocked
      && !cycle.bodySheetOpen
      && Object.values(cycle.bodyStyles).every((value) => value === "")
      && !cycle.legacyRecoveryClass
      && cycle.legacyRecoveryHeight === ""
      && Math.abs(cycle.scrollHeight - repeatedSheetCycles.baselineScrollHeight) <= 2
      && cycle.backgroundBottom >= cycle.viewportBottom
    ),
    `repeated Bottom Sheet cycles left horizontal motion, scroll locks, or viewport gaps: ${JSON.stringify(repeatedSheetCycles)}`
  );

  const stackNavigation = await evaluate(`(async () => {
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const settled = () => new Promise((resolve) => {
      const unsubscribe = window.mehNavigation.onSettled((detail) => {
        unsubscribe();
        resolve(detail);
      });
    });
    document.querySelector('[data-page="wheel"]').click();
    await wait(40);
    let done = settled();
    document.querySelector('#wheelHistoryButton').click();
    await done;
    const wheelHistoryOpen = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      expanded: wheelState.historyExpanded,
      canGoBack: window.mehNavigation.canGoBack(),
    };
    done = settled();
    window.mehNavigation.requestBack('android-back');
    await done;
    const wheelHistoryClosed = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      expanded: wheelState.historyExpanded,
      canGoBack: window.mehNavigation.canGoBack(),
    };

    done = settled();
    document.querySelector('#settingsButton').click();
    await done;
    done = settled();
    document.querySelector('#languageMenuButton').click();
    await done;
    const languageOpen = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      menuHidden: document.querySelector('#languageMenu').hidden,
    };
    done = settled();
    document.querySelector('#darkModeMenuButton').click();
    await done;
    const switchedToDark = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      languageHidden: document.querySelector('#languageMenu').hidden,
      darkHidden: document.querySelector('#darkModeMenu').hidden,
    };
    done = settled();
    document.querySelector('#languageMenuButton').click();
    await done;
    const switchedBackToLanguage = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      languageHidden: document.querySelector('#languageMenu').hidden,
      darkHidden: document.querySelector('#darkModeMenu').hidden,
    };
    done = settled();
    window.mehNavigation.requestBack('ui-button');
    await done;
    const languageClosed = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      settingsOpen: document.querySelector('#settingsSheet').classList.contains('is-open'),
      menuHidden: document.querySelector('#languageMenu').hidden,
    };
    done = settled();
    window.mehNavigation.requestBack('ui-button');
    await done;

    done = settled();
    document.querySelector('#settingsButton').click();
    await done;
    done = settled();
    document.querySelector('#primarySwatches .swatch-add-button').click();
    await done;
    const colorOpen = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      hidden: document.querySelector('#primaryColorPicker').hidden,
    };
    done = settled();
    window.mehNavigation.requestBack('ui-button');
    await done;
    const colorClosed = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      settingsOpen: document.querySelector('#settingsSheet').classList.contains('is-open'),
      hidden: document.querySelector('#primaryColorPicker').hidden,
    };
    done = settled();
    window.mehNavigation.requestBack('ui-button');
    await done;

    done = settled();
    history.forward();
    await done;
    const forwardSettings = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      settingsOpen: document.querySelector('#settingsSheet').classList.contains('is-open'),
    };
    done = settled();
    history.back();
    await done;

    document.querySelector('[data-page="wheel"]').click();
    await wait(40);
    done = settled();
    document.querySelector('#featureButton').click();
    await done;
    const presetOpen = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      sheetOpen: document.querySelector('#wheelEditorSheet').classList.contains('is-open'),
    };
    done = settled();
    window.mehNavigation.requestBack('ui-button');
    await done;
    const finalRoot = {
      stack: window.mehNavigation.getStack().map((item) => item.type),
      canGoBack: window.mehNavigation.canGoBack(),
      anySheetOpen: Boolean(document.querySelector('.settings-sheet.is-open, .editor-sheet.is-open')),
    };
    return {
      wheelHistoryOpen,
      wheelHistoryClosed,
      languageOpen,
      switchedToDark,
      switchedBackToLanguage,
      languageClosed,
      colorOpen,
      colorClosed,
      forwardSettings,
      presetOpen,
      finalRoot,
    };
  })()`);
  check(
    stackNavigation.wheelHistoryOpen.stack.join(",") === "wheel-history"
      && stackNavigation.wheelHistoryOpen.expanded
      && stackNavigation.wheelHistoryOpen.canGoBack
      && stackNavigation.wheelHistoryClosed.stack.length === 0
      && !stackNavigation.wheelHistoryClosed.expanded
      && !stackNavigation.wheelHistoryClosed.canGoBack,
    `home history UI left a ghost stack item: ${JSON.stringify(stackNavigation)}`
  );
  check(
    stackNavigation.languageOpen.stack.join(",") === "settings,language-menu"
      && !stackNavigation.languageOpen.menuHidden
      && stackNavigation.switchedToDark.stack.join(",") === "settings,dark-mode-menu"
      && stackNavigation.switchedToDark.languageHidden
      && !stackNavigation.switchedToDark.darkHidden
      && stackNavigation.switchedBackToLanguage.stack.join(",") === "settings,language-menu"
      && !stackNavigation.switchedBackToLanguage.languageHidden
      && stackNavigation.switchedBackToLanguage.darkHidden
      && stackNavigation.languageClosed.stack.join(",") === "settings"
      && stackNavigation.languageClosed.settingsOpen
      && stackNavigation.languageClosed.menuHidden,
    `language menu did not close before its owning settings Sheet: ${JSON.stringify(stackNavigation)}`
  );
  check(
    stackNavigation.colorOpen.stack.join(",") === "settings,advanced-color-picker"
      && !stackNavigation.colorOpen.hidden
      && stackNavigation.colorClosed.stack.join(",") === "settings"
      && stackNavigation.colorClosed.settingsOpen
      && stackNavigation.colorClosed.hidden,
    `advanced color picker left a hidden=false ghost item: ${JSON.stringify(stackNavigation)}`
  );
  check(
    stackNavigation.forwardSettings.stack.join(",") === "settings"
      && stackNavigation.forwardSettings.settingsOpen,
    `browser forward did not restore the serialized settings snapshot: ${JSON.stringify(stackNavigation)}`
  );
  check(
    stackNavigation.presetOpen.stack.join(",") === "preset-editor"
      && stackNavigation.presetOpen.sheetOpen
      && stackNavigation.finalRoot.stack.length === 0
      && !stackNavigation.finalRoot.canGoBack
      && !stackNavigation.finalRoot.anySheetOpen,
    `preset editor did not return to a ghost-free root: ${JSON.stringify(stackNavigation)}`
  );

  const editors = await evaluate(`(async () => {
    const result = {};
    const settled = () => new Promise((resolve) => {
      const unsubscribe = window.mehNavigation.onSettled(() => {
        unsubscribe();
        resolve();
      });
    });
    for (const page of ['wheel', 'number']) {
      document.querySelector('[data-page="' + page + '"]').click();
      await new Promise((resolve) => setTimeout(resolve, 40));
      let done = settled();
      document.querySelector('#featureButton').click();
      await done;
      const selector = page === 'wheel' ? '#wheelEditorSheet' : '#numberSettingsSheet';
      result[page] = document.querySelector(selector).classList.contains('is-open');
      done = settled();
      window.mehNavigation.requestBack('test');
      await done;
    }
    return result;
  })()`);
  check(editors.wheel && editors.number, "preset editor or keyboard-input sheet failed to open");

  const keyboardRecovery = await evaluate(`(async () => {
    document.documentElement.classList.remove('platform-android-app', 'platform-browser');
    document.documentElement.classList.add('platform-ios-pwa');
    window.MehKeyboardViewport.handleViewportChange('ios-test-bootstrap');
    await window.MehKeyboardViewport.requestSettle('ios-test-bootstrap');
    const settled = () => new Promise((resolve) => {
      const unsubscribe = window.mehNavigation.onSettled((detail) => {
        unsubscribe();
        resolve(detail);
      });
    });
    document.querySelector('[data-page="number"]').click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    let done = settled();
    document.querySelector('#featureButton').click();
    await done;
    const input = document.querySelector('#numberCountInput');
    input.focus();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const beforeAndroidBack = {
      keyboardState: window.MehKeyboardViewport.getState().state,
      keyboardActive: window.MehKeyboardViewport.isKeyboardActive(),
      pixelPaintHeight: document.documentElement.style.getPropertyValue('--viewport-paint-height'),
      fontSize: getComputedStyle(input).fontSize,
      bodyInlinePosition: document.body.style.position,
    };
    done = settled();
    window.mehNavigation.requestBack('android-back');
    const firstAndroidDetail = await done;
    const afterFirstAndroidBack = {
      detail: firstAndroidDetail,
      keyboardState: window.MehKeyboardViewport.getState().state,
      keyboardActive: window.MehKeyboardViewport.isKeyboardActive(),
      sheetOpen: document.querySelector('#numberSettingsSheet').classList.contains('is-open'),
      stack: window.mehNavigation.getStack().map((item) => item.type),
    };
    done = settled();
    window.mehNavigation.requestBack('android-back');
    await done;
    const afterSecondAndroidBack = {
      sheetOpen: document.querySelector('#numberSettingsSheet').classList.contains('is-open'),
      stack: window.mehNavigation.getStack().map((item) => item.type),
      rootLocked: document.documentElement.classList.contains('page-scroll-locked'),
    };

    done = settled();
    document.querySelector('#featureButton').click();
    await done;
    input.focus();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    done = settled();
    document.querySelector('#closeNumberSettingsButton').click();
    const closeDetail = await done;
    const backgroundRect = document.querySelector('#viewport-background').getBoundingClientRect();
    const afterUiClose = {
      closeDetail,
      keyboardState: window.MehKeyboardViewport.getState().state,
      keyboardActive: window.MehKeyboardViewport.isKeyboardActive(),
      sheetOpen: document.querySelector('#numberSettingsSheet').classList.contains('is-open'),
      rootLocked: document.documentElement.classList.contains('page-scroll-locked'),
      legacyRecoveryClass: document.documentElement.classList.contains('viewport-recovery-active'),
      legacyRecoveryHeight: document.documentElement.style.getPropertyValue('--viewport-recovery-height'),
      bodyInlinePosition: document.body.style.position,
      backgroundBottom: Math.round(backgroundRect.bottom),
      viewportBottom: innerHeight,
    };
    return { beforeAndroidBack, afterFirstAndroidBack, afterSecondAndroidBack, afterUiClose };
  })()`);
  check(
    keyboardRecovery.beforeAndroidBack.keyboardActive
      && ["keyboard-opening", "keyboard-open"].includes(keyboardRecovery.beforeAndroidBack.keyboardState)
      && keyboardRecovery.beforeAndroidBack.pixelPaintHeight === ""
      && keyboardRecovery.beforeAndroidBack.fontSize === "16px"
      && keyboardRecovery.beforeAndroidBack.bodyInlinePosition === "",
    `iOS editable focus did not enter the keyboard state machine safely: ${JSON.stringify(keyboardRecovery)}`
  );
  check(
    keyboardRecovery.afterFirstAndroidBack.detail.keyboardOnly
      && !keyboardRecovery.afterFirstAndroidBack.keyboardActive
      && keyboardRecovery.afterFirstAndroidBack.keyboardState === "stable"
      && keyboardRecovery.afterFirstAndroidBack.sheetOpen
      && keyboardRecovery.afterFirstAndroidBack.stack.join(",") === "number-settings",
    `first Android back did not settle only the keyboard: ${JSON.stringify(keyboardRecovery)}`
  );
  check(
    !keyboardRecovery.afterSecondAndroidBack.sheetOpen
      && keyboardRecovery.afterSecondAndroidBack.stack.length === 0
      && !keyboardRecovery.afterSecondAndroidBack.rootLocked,
    `second Android back did not close only the number settings Sheet: ${JSON.stringify(keyboardRecovery)}`
  );
  check(
    keyboardRecovery.afterUiClose.closeDetail.source === "ui-button"
      && keyboardRecovery.afterUiClose.keyboardState === "stable"
      && !keyboardRecovery.afterUiClose.keyboardActive
      && !keyboardRecovery.afterUiClose.sheetOpen
      && !keyboardRecovery.afterUiClose.rootLocked
      && !keyboardRecovery.afterUiClose.legacyRecoveryClass
      && keyboardRecovery.afterUiClose.legacyRecoveryHeight === ""
      && keyboardRecovery.afterUiClose.bodyInlinePosition === ""
      && keyboardRecovery.afterUiClose.backgroundBottom >= keyboardRecovery.afterUiClose.viewportBottom,
    `keyboard-first UI close left a viewport nudge, lock, or bottom gap: ${JSON.stringify(keyboardRecovery)}`
  );

  await evaluate(`localStorage.setItem('meh-app-settings-v2', JSON.stringify({ topHeight: 16 })); location.reload(); true`);
  await waitForApp();
  const migration = await evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem('meh-app-settings-v2'));
    return { savedTop: saved.topHeight, version: saved.systemBarLayoutVersion, renderedTopExtra: getComputedStyle(document.documentElement).getPropertyValue('--top-extra').trim() };
  })()`);
  check(migration.savedTop === 0 && migration.version === 6 && migration.renderedTopExtra === "0px", "legacy iOS 16px top spacer was not migrated to zero");

  const viewportOwnership = await evaluate(`(() => {
    window.dispatchEvent(new Event('resize'));
    window.visualViewport?.dispatchEvent(new Event('resize'));
    return {
      inlineAppHeight: document.documentElement.style.getPropertyValue('--app-height'),
      computedAppHeight: getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim(),
    };
  })()`);
  check(viewportOwnership.inlineAppHeight === "", "viewport events overwrote the CSS-owned full-screen height");
  check(viewportOwnership.computedAppHeight === "100dvh", `browser-tab canvas height source was ${viewportOwnership.computedAppHeight}, expected 100dvh`);

  const iosSimulation = await evaluate(`(() => {
    const root = document.documentElement;
    root.classList.remove('platform-android-app', 'platform-browser');
    root.classList.add('platform-ios-pwa');
    root.style.setProperty('--content-inset-top', '59px');
    root.style.setProperty('--content-inset-right', '0px');
    root.style.setProperty('--content-inset-bottom', '34px');
    root.style.setProperty('--content-inset-left', '0px');
    const range = document.querySelector('#dockBottomGapRange');
    range.value = '0';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    window.dispatchEvent(new Event('resize'));
    const app = getComputedStyle(document.querySelector('.app'));
    const dock = getComputedStyle(document.querySelector('.floating-dock'));
    const surface = getComputedStyle(document.querySelector('.floating-dock-surface'));
    const indicator = getComputedStyle(document.querySelector('.dock-indicator'));
    const indicatorRect = document.querySelector('.dock-indicator').getBoundingClientRect();
    const body = getComputedStyle(document.body);
    const dockRect = document.querySelector('.floating-dock').getBoundingClientRect();
    const surfaceRect = document.querySelector('.bottom-nav-surface').getBoundingClientRect();
    const itemRect = document.querySelector('.dock-item').getBoundingClientRect();
    const sideRange = document.querySelector('#dockSideGapRange');
    const dockWidths = [12, 28, 64].map((gap) => {
      sideRange.value = String(gap);
      sideRange.dispatchEvent(new Event('input', { bubbles: true }));
      const rect = document.querySelector('.floating-dock').getBoundingClientRect();
      return { gap, left: Math.round(rect.left), right: Math.round(innerWidth - rect.right), width: Math.round(rect.width) };
    });
    sideRange.value = '28';
    sideRange.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      appTop: app.paddingTop,
      dockBottom: dock.bottom,
      dockPaddingBottom: dock.paddingBottom,
      surfacePaddingTop: surface.paddingTop,
      surfacePaddingBottom: surface.paddingBottom,
      indicatorBottom: indicator.bottom,
      indicatorHeight: Math.round(indicatorRect.height),
      indicatorCenterOffset: Math.round(((indicatorRect.top + indicatorRect.bottom) - (surfaceRect.top + surfaceRect.bottom)) * 10) / 20,
      dockHeight: Math.round(dockRect.height),
      itemCenterOffset: Math.round(((itemRect.top + itemRect.bottom) - (surfaceRect.top + surfaceRect.bottom)) * 10) / 20,
      physicalGap: Math.round(innerHeight - dockRect.bottom),
      dockWidths,
      bodyTop: body.paddingTop,
      bodyBottom: body.paddingBottom,
      appHeight: getComputedStyle(root).getPropertyValue('--app-height').trim(),
    };
  })()`);
  check(iosSimulation.appTop === "59px", `simulated iOS top inset was applied ${iosSimulation.appTop}, expected once as 59px`);
  check(iosSimulation.dockBottom === "0px" && iosSimulation.physicalGap === 0, `simulated iOS dock did not reach the physical bottom edge: ${JSON.stringify(iosSimulation)}`);
  check(iosSimulation.dockPaddingBottom === "0px", `simulated iOS positioner consumed safe-area padding: ${iosSimulation.dockPaddingBottom}`);
  check(iosSimulation.surfacePaddingTop === "6px" && iosSimulation.surfacePaddingBottom === "6px", `simulated iOS surface padding became asymmetric: ${iosSimulation.surfacePaddingTop}/${iosSimulation.surfacePaddingBottom}`);
  check(iosSimulation.indicatorHeight === 58, `simulated iOS indicator height was ${iosSimulation.indicatorHeight}px, expected the 58px padded inner height`);
  check(Math.abs(iosSimulation.indicatorCenterOffset) <= 1, `simulated iOS indicator was not vertically centered: ${iosSimulation.indicatorCenterOffset}px`);
  check(iosSimulation.dockHeight === 72, `simulated iOS dock height was ${iosSimulation.dockHeight}, expected the fixed 72px surface height`);
  check(Math.abs(iosSimulation.itemCenterOffset) <= 1, `simulated iOS dock item was not vertically centered: ${iosSimulation.itemCenterOffset}px`);
  check(iosSimulation.dockWidths.map((entry) => entry.width).join(",") === "366,334,262", `side-gap control produced wrong dock widths: ${iosSimulation.dockWidths.map((entry) => entry.width).join(",")}`);
  check(iosSimulation.dockWidths.every((entry) => entry.left === entry.gap && entry.right === entry.gap), `side-gap control did not keep symmetric physical margins: ${JSON.stringify(iosSimulation.dockWidths)}`);
  check(iosSimulation.bodyTop === "0px" && iosSimulation.bodyBottom === "0px", "simulated iOS visual background was inset");
  check(iosSimulation.appHeight === "100dvh", `simulated iOS standalone canvas used ${iosSimulation.appHeight}, expected CSS-owned 100dvh`);
  await captureScreenshot("system-bars-r18-ios-portrait.png");

  const androidSimulation = await evaluate(`(() => {
    const root = document.documentElement;
    root.classList.remove('platform-ios-pwa', 'platform-browser');
    root.classList.add('platform-android-app');
    root.style.removeProperty('--app-height');
    root.style.removeProperty('--content-inset-top');
    root.style.removeProperty('--content-inset-bottom');
    root.style.setProperty('--android-inset-top', '24px');
    root.style.setProperty('--android-inset-bottom', '24px');
    const style = getComputedStyle(root);
    const app = getComputedStyle(document.querySelector('.app'));
    const dock = document.querySelector('.floating-dock');
    const surface = document.querySelector('.floating-dock-surface');
    const range = document.querySelector('#dockBottomGapRange');
    const dockPositions = [0, 5, 10, 20].map((gap) => {
      range.value = String(gap);
      range.dispatchEvent(new Event('input', { bubbles: true }));
      const dockStyle = getComputedStyle(dock);
      const surfaceStyle = getComputedStyle(surface);
      const rect = dock.getBoundingClientRect();
      return {
        gap,
        cssBottom: dockStyle.bottom,
        paddingBottom: dockStyle.paddingBottom,
        surfacePaddingBottom: surfaceStyle.paddingBottom,
        physicalGap: Math.round(innerHeight - rect.bottom),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
      };
    });
    range.value = '0';
    range.dispatchEvent(new Event('change', { bubbles: true }));
    const savedGap = JSON.parse(localStorage.getItem('meh-app-settings-v2')).dockBottomGap;
    return { finalTop: style.getPropertyValue('--content-inset-top').trim(), finalBottom: style.getPropertyValue('--content-inset-bottom').trim(), appTop: app.paddingTop, savedGap, dockPositions };
  })()`);
  const [dockAt0, dockAt5, dockAt10, dockAt20] = androidSimulation.dockPositions;
  check(androidSimulation.appTop === "24px", `simulated Android top inset was applied ${androidSimulation.appTop}, expected once`);
  check(androidSimulation.savedGap === 0, `bottom-gap range did not persist its real value: ${androidSimulation.savedGap}`);
  check(androidSimulation.dockPositions.map((position) => position.cssBottom).join(",") === "0px,5px,10px,20px", `Android dock bottom did not equal the configured physical gaps: ${androidSimulation.dockPositions.map((position) => position.cssBottom).join(",")}`);
  check(androidSimulation.dockPositions.every((position) => position.physicalGap === position.gap), `Android dock physical gaps diverged from the setting: ${JSON.stringify(androidSimulation.dockPositions)}`);
  check(androidSimulation.dockPositions.every((position) => position.paddingBottom === "0px"), `Android positioner consumed safe-area padding: ${androidSimulation.dockPositions.map((position) => position.paddingBottom).join(",")}`);
  check(androidSimulation.dockPositions.every((position) => position.surfacePaddingBottom === "6px"), `Android dock surface padding changed with safe-area: ${androidSimulation.dockPositions.map((position) => position.surfacePaddingBottom).join(",")}`);
  check(androidSimulation.dockPositions.every((position) => position.height === dockAt0.height), `Android dock thickness changed with its gap: ${androidSimulation.dockPositions.map((position) => position.height).join(",")}`);
  check(dockAt0.top - dockAt5.top === 5 && dockAt5.top - dockAt10.top === 5 && dockAt10.top - dockAt20.top === 10, `Android dock did not move as one piece: top positions ${androidSimulation.dockPositions.map((position) => position.top).join(",")}`);
  check(dockAt0.bottom - dockAt5.bottom === 5 && dockAt5.bottom - dockAt10.bottom === 5 && dockAt10.bottom - dockAt20.bottom === 10, `Android dock bottom edge did not track the slider: ${androidSimulation.dockPositions.map((position) => position.bottom).join(",")}`);
  await captureScreenshot("system-bars-r17-android-gap-0.png");
  await evaluate(`(() => { const range = document.querySelector('#dockBottomGapRange'); range.value = '40'; range.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await captureScreenshot("system-bars-r17-android-gap-40.png");
  await evaluate(`(() => { const range = document.querySelector('#dockBottomGapRange'); range.value = '0'; range.dispatchEvent(new Event('input', { bubbles: true })); })()`);

  await send("Emulation.setDeviceMetricsOverride", {
    width: 844,
    height: 390,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 844,
    screenHeight: 390,
  });
  await delay(150);
  const landscape = await evaluate(`(() => {
    const root = document.documentElement;
    root.classList.remove('platform-android-app', 'platform-browser');
    root.classList.add('platform-ios-pwa');
    root.style.setProperty('--content-inset-left', '59px');
    root.style.setProperty('--content-inset-right', '59px');
    const dockRect = document.querySelector('.floating-dock').getBoundingClientRect();
    return {
      viewport: [innerWidth, innerHeight],
      frameWidth: document.querySelector('.phone-frame').getBoundingClientRect().width,
      bodyPadding: getComputedStyle(document.body).paddingTop,
      dock: {
        left: Math.round(dockRect.left),
        right: Math.round(innerWidth - dockRect.right),
        width: Math.round(dockRect.width),
      },
    };
  })()`);
  check(landscape.viewport[0] === 844 && landscape.viewport[1] === 390, "landscape viewport did not update");
  check(landscape.frameWidth === 844, `coarse-pointer landscape background root width was ${landscape.frameWidth}, expected 844`);
  check(landscape.bodyPadding === "0px", "landscape visual background gained top padding");
  check(landscape.dock.width === 448, `landscape dock width was ${landscape.dock.width}, expected the 448px cap`);
  check(landscape.dock.left >= 59 && landscape.dock.right >= 59, `landscape dock entered the side safe areas: ${JSON.stringify(landscape.dock)}`);
  await captureScreenshot("system-bars-r17-ios-landscape.png");

  if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Chromium layout smoke tests passed: all pages/sheets, portrait/landscape, and iOS/Android inset fallback simulations.");
  }
} finally {
  try { socket?.close(); } catch {}
  child.kill();
  await delay(100);
  rmSync(profile, { recursive: true, force: true });
}
