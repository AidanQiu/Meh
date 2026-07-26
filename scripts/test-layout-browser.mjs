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
  check(base.build === "1.1.1-pwa-r27", "browser loaded the wrong build");
  check(base.platform === "platform-browser" && base.finalTop === "0px" && base.finalBottom === "0px", "browser fallback platform or zero-inset policy is wrong");
  check(base.viewport[0] === 390, `portrait viewport width was ${base.viewport[0]}, expected 390`);
  check(base.bodyPadding.join(",") === "0px,0px", "visual body must not consume safe-area padding");
  check(base.framePadding.join(",") === "0px,0px", "visual root must not consume safe-area padding");
  check(base.frameBackground === "rgba(0, 0, 0, 0)", "content root must remain transparent over the visual background");
  check(base.htmlBackground === "rgba(0, 0, 0, 0)" && base.bodyBackground === "rgba(0, 0, 0, 0)", "html and body must remain transparent over the dedicated viewport background");
  check(base.backgroundImage === "none" && base.bodyBackgroundImage === "none" && base.viewportBackgroundImage !== "none", "the dedicated viewport layer does not own the production background");
  check(base.backgroundRect[0] === -1 && base.backgroundRect[1] === 845, `viewport background did not overscan the layout viewport: ${JSON.stringify(base.backgroundRect)}`);
  check(base.backgroundParentIsBody && base.dockParentIsBody, "viewport background or fixed dock is not a direct body child");
  check(base.inlineAppHeight === "", "JavaScript wrote an inline full-screen app height");
  check(base.canvasHeight.every((height) => height >= 844), `portrait visual canvas did not cover the viewport: ${base.canvasHeight.join(",")}`);
  check(base.dockIndicatorDelta.every((delta) => Math.abs(delta) <= 0.5), `dock indicator was not aligned to its active item: ${base.dockIndicatorDelta.join(",")}`);

  const safeAreaDiagnostics = await evaluate(`(() => {
    const snapshot = window.MehSafeAreaDiagnostics.snapshot();
    const testWallpaper = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
    applyBackgroundImage(testWallpaper, 0.5);
    const wallpaperVariable = document.documentElement.style.getPropertyValue('--app-wallpaper-image');
    const htmlBackground = getComputedStyle(document.documentElement).backgroundImage;
    const bodyBackground = getComputedStyle(document.body).backgroundImage;
    const viewportBackground = getComputedStyle(document.querySelector('#viewport-background')).backgroundImage;
    applyBackgroundImage('', 0.5);
    return { snapshot, wallpaperVariable, htmlBackground, bodyBackground, viewportBackground };
  })()`);
  check(safeAreaDiagnostics.snapshot.metaInfo.viewport === "width=device-width, initial-scale=1, viewport-fit=cover", "runtime diagnostics read the wrong viewport meta");
  check(safeAreaDiagnostics.snapshot.metaInfo.appleMobileWebAppCapable === "yes", "runtime diagnostics read the wrong standalone capability meta");
  check(safeAreaDiagnostics.snapshot.metaInfo.appleMobileWebAppStatusBarStyle === "black-translucent", "runtime diagnostics read the wrong status bar meta");
  check(safeAreaDiagnostics.snapshot.statusBarColors.statusBarStrategyValid, `browser status-bar fallback strategy is invalid: ${JSON.stringify(safeAreaDiagnostics.snapshot.statusBarColors)}`);
  check(safeAreaDiagnostics.wallpaperVariable.includes("cross-fade") || safeAreaDiagnostics.wallpaperVariable.includes("url("), "custom wallpaper was not assigned to the shared background variable");
  check(safeAreaDiagnostics.htmlBackground === "none" && safeAreaDiagnostics.bodyBackground === "none" && safeAreaDiagnostics.viewportBackground.includes("url("), "custom wallpaper was not painted exclusively by the viewport layer");

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

  const settings = await evaluate(`(async () => {
    document.querySelector('#settingsButton').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sheet = document.querySelector('#settingsSheet');
    const style = getComputedStyle(sheet);
    return {
      open: sheet.classList.contains('is-open'),
      paddingBottom: style.paddingBottom,
      wallpaperGrid: Boolean(document.querySelector('#presetWallpaperGrid')),
      rootLocked: document.documentElement.classList.contains('page-scroll-locked'),
      bodyInlinePosition: document.body.style.position,
      bodyInlineTop: document.body.style.top,
    };
  })()`);
  check(settings.open && settings.wallpaperGrid, "settings/custom-background page failed to open");
  check(settings.rootLocked && settings.bodyInlinePosition === "" && settings.bodyInlineTop === "", `sheet scroll lock mutated body positioning: ${JSON.stringify(settings)}`);
  await evaluate(`history.back(); new Promise((resolve) => setTimeout(resolve, 850))`);
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

  const editors = await evaluate(`(async () => {
    const result = {};
    for (const page of ['wheel', 'number']) {
      document.querySelector('[data-page="' + page + '"]').click();
      document.querySelector('#featureButton').click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const selector = page === 'wheel' ? '#wheelEditorSheet' : '#numberSettingsSheet';
      result[page] = document.querySelector(selector).classList.contains('is-open');
      history.back();
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return result;
  })()`);
  check(editors.wheel && editors.number, "preset editor or keyboard-input sheet failed to open");

  const keyboardRecovery = await evaluate(`(async () => {
    document.documentElement.classList.remove('platform-android-app', 'platform-browser');
    document.documentElement.classList.add('platform-ios-pwa');
    syncPwaAppHeight({ resetStable: true, measuredHeight: innerHeight });
    const fullPaintHeight = document.documentElement.style.getPropertyValue('--viewport-paint-height');
    syncPwaAppHeight({ measuredHeight: innerHeight - 300 });
    const keyboardSizedPaintHeight = document.documentElement.style.getPropertyValue('--viewport-paint-height');
    document.querySelector('[data-page="number"]').click();
    document.querySelector('#featureButton').click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const input = document.querySelector('#numberMinInput');
    input.focus();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const during = {
      keyboardActive: keyboardViewportActive,
      paintHeight: document.documentElement.style.getPropertyValue('--viewport-paint-height'),
      fullPaintHeight,
      keyboardSizedPaintHeight,
      bodyInlinePosition: document.body.style.position,
    };
    input.blur();
    await new Promise((resolve) => setTimeout(resolve, 850));
    history.back();
    await new Promise((resolve) => setTimeout(resolve, 850));
    const backgroundRect = document.querySelector('#viewport-background').getBoundingClientRect();
    return {
      during,
      after: {
        keyboardActive: keyboardViewportActive,
        rootLocked: document.documentElement.classList.contains('page-scroll-locked'),
        bodyInlinePosition: document.body.style.position,
        backgroundBottom: Math.round(backgroundRect.bottom),
        viewportBottom: innerHeight,
      },
    };
  })()`);
  check(keyboardRecovery.during.keyboardActive && keyboardRecovery.during.paintHeight, `editable focus did not preserve the iOS viewport paint state: ${JSON.stringify(keyboardRecovery)}`);
  check(keyboardRecovery.during.fullPaintHeight === keyboardRecovery.during.keyboardSizedPaintHeight, `keyboard-sized viewport replaced the stable canvas height: ${JSON.stringify(keyboardRecovery)}`);
  check(keyboardRecovery.during.bodyInlinePosition === "", `keyboard sheet used body fixed positioning: ${JSON.stringify(keyboardRecovery)}`);
  check(!keyboardRecovery.after.keyboardActive && !keyboardRecovery.after.rootLocked, `keyboard dismissal did not settle its viewport state: ${JSON.stringify(keyboardRecovery)}`);
  check(keyboardRecovery.after.bodyInlinePosition === "" && keyboardRecovery.after.backgroundBottom >= keyboardRecovery.after.viewportBottom, `keyboard dismissal exposed a bottom canvas gap: ${JSON.stringify(keyboardRecovery)}`);

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
