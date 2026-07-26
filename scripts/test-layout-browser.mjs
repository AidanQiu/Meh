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
    return {
      build: document.querySelector('meta[name="meh-build"]').content,
      viewport: [innerWidth, innerHeight],
      bodyPadding: [body.paddingTop, body.paddingBottom],
      framePadding: [frame.paddingTop, frame.paddingBottom],
      frameBackground: frame.backgroundColor,
      htmlBackground: html.backgroundColor,
      bodyBackground: body.backgroundColor,
      inlineAppHeight: document.documentElement.style.getPropertyValue('--app-height'),
      canvasHeight: [document.body.getBoundingClientRect().height, document.querySelector('.phone-frame').getBoundingClientRect().height],
      finalTop: html.getPropertyValue('--app-safe-top').trim(),
      finalBottom: html.getPropertyValue('--app-safe-bottom').trim(),
    };
  })()`);
  check(base.build === "1.1.1-pwa-r15", "browser loaded the wrong build");
  check(base.viewport[0] === 390, `portrait viewport width was ${base.viewport[0]}, expected 390`);
  check(base.bodyPadding.join(",") === "0px,0px", "visual body must not consume safe-area padding");
  check(base.framePadding.join(",") === "0px,0px", "visual root must not consume safe-area padding");
  check(base.frameBackground === "rgba(0, 0, 0, 0)", "content root must remain transparent over the visual background");
  check(base.htmlBackground !== "rgba(0, 0, 0, 0)" && base.bodyBackground !== "rgba(0, 0, 0, 0)", "system fallback canvas background must not be transparent");
  check(base.inlineAppHeight === "", "JavaScript wrote an inline full-screen app height");
  check(base.canvasHeight.every((height) => height >= 844), `portrait visual canvas did not cover the viewport: ${base.canvasHeight.join(",")}`);

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
    return { open: sheet.classList.contains('is-open'), paddingBottom: style.paddingBottom, wallpaperGrid: Boolean(document.querySelector('#presetWallpaperGrid')) };
  })()`);
  check(settings.open && settings.wallpaperGrid, "settings/custom-background page failed to open");
  await evaluate(`history.back(); new Promise((resolve) => setTimeout(resolve, 80))`);

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

  await evaluate(`localStorage.setItem('meh-app-settings-v2', JSON.stringify({ topHeight: 16 })); location.reload(); true`);
  await waitForApp();
  const migration = await evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem('meh-app-settings-v2'));
    return { savedTop: saved.topHeight, version: saved.systemBarLayoutVersion, renderedTopExtra: getComputedStyle(document.documentElement).getPropertyValue('--top-extra').trim() };
  })()`);
  check(migration.savedTop === 0 && migration.version === 5 && migration.renderedTopExtra === "0px", "legacy iOS 16px top spacer was not migrated to zero");

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
    root.classList.remove('android-webview');
    root.classList.add('pwa-standalone');
    root.style.setProperty('--browser-safe-top', '59px');
    root.style.setProperty('--browser-safe-right', '0px');
    root.style.setProperty('--browser-safe-bottom', '34px');
    root.style.setProperty('--browser-safe-left', '0px');
    root.style.setProperty('--app-safe-top', '59px');
    root.style.setProperty('--app-safe-right', '0px');
    root.style.setProperty('--app-safe-bottom', '34px');
    root.style.setProperty('--app-safe-left', '0px');
    const range = document.querySelector('#dockBottomGapRange');
    range.value = '0';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    window.dispatchEvent(new Event('resize'));
    const app = getComputedStyle(document.querySelector('.app'));
    const dock = getComputedStyle(document.querySelector('.floating-dock'));
    const surface = getComputedStyle(document.querySelector('.floating-dock-surface'));
    const indicator = getComputedStyle(document.querySelector('.dock-indicator'));
    const body = getComputedStyle(document.body);
    const dockRect = document.querySelector('.floating-dock').getBoundingClientRect();
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
      surfacePaddingBottom: surface.paddingBottom,
      indicatorBottom: indicator.bottom,
      dockHeight: Math.round(dockRect.height),
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
  check(iosSimulation.surfacePaddingBottom === "40px", `simulated iOS surface did not protect content internally: ${iosSimulation.surfacePaddingBottom}`);
  check(iosSimulation.indicatorBottom === "0px", `simulated iOS indicator bottom was ${iosSimulation.indicatorBottom}, expected 0px inside the content layer`);
  check(iosSimulation.dockHeight === 106, `simulated iOS dock height was ${iosSimulation.dockHeight}, expected the 34px safe area inside its surface`);
  check(iosSimulation.dockWidths.map((entry) => entry.width).join(",") === "366,334,262", `side-gap control produced wrong dock widths: ${iosSimulation.dockWidths.map((entry) => entry.width).join(",")}`);
  check(iosSimulation.dockWidths.every((entry) => entry.left === entry.gap && entry.right === entry.gap), `side-gap control did not keep symmetric physical margins: ${JSON.stringify(iosSimulation.dockWidths)}`);
  check(iosSimulation.bodyTop === "0px" && iosSimulation.bodyBottom === "0px", "simulated iOS visual background was inset");
  check(iosSimulation.appHeight === "100dvh", `simulated iOS standalone canvas used ${iosSimulation.appHeight}, expected CSS-owned 100dvh`);
  await captureScreenshot("system-bars-r15-ios-portrait.png");

  const androidSimulation = await evaluate(`(() => {
    const root = document.documentElement;
    root.classList.remove('pwa-standalone');
    root.classList.add('android-webview');
    root.style.removeProperty('--app-height');
    root.style.removeProperty('--app-safe-top');
    root.style.removeProperty('--app-safe-bottom');
    root.style.setProperty('--browser-safe-top', '18px');
    root.style.setProperty('--browser-safe-bottom', '30px');
    root.style.setProperty('--native-safe-top', '24px');
    root.style.setProperty('--native-safe-bottom', '24px');
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
    return { finalTop: style.getPropertyValue('--app-safe-top').trim(), finalBottom: style.getPropertyValue('--app-safe-bottom').trim(), appTop: app.paddingTop, savedGap, dockPositions };
  })()`);
  const [dockAt0, dockAt5, dockAt10, dockAt20] = androidSimulation.dockPositions;
  check(androidSimulation.appTop === "24px", `simulated Android top inset was applied ${androidSimulation.appTop}, expected once`);
  check(androidSimulation.savedGap === 0, `bottom-gap range did not persist its real value: ${androidSimulation.savedGap}`);
  check(androidSimulation.dockPositions.map((position) => position.cssBottom).join(",") === "0px,5px,10px,20px", `Android dock bottom did not equal the configured physical gaps: ${androidSimulation.dockPositions.map((position) => position.cssBottom).join(",")}`);
  check(androidSimulation.dockPositions.every((position) => position.physicalGap === position.gap), `Android dock physical gaps diverged from the setting: ${JSON.stringify(androidSimulation.dockPositions)}`);
  check(androidSimulation.dockPositions.every((position) => position.paddingBottom === "0px"), `Android positioner consumed safe-area padding: ${androidSimulation.dockPositions.map((position) => position.paddingBottom).join(",")}`);
  check(androidSimulation.dockPositions.every((position) => position.surfacePaddingBottom === "36px"), `Android dock content did not retain the 30px safe area internally: ${androidSimulation.dockPositions.map((position) => position.surfacePaddingBottom).join(",")}`);
  check(androidSimulation.dockPositions.every((position) => position.height === dockAt0.height), `Android dock thickness changed with its gap: ${androidSimulation.dockPositions.map((position) => position.height).join(",")}`);
  check(dockAt0.top - dockAt5.top === 5 && dockAt5.top - dockAt10.top === 5 && dockAt10.top - dockAt20.top === 10, `Android dock did not move as one piece: top positions ${androidSimulation.dockPositions.map((position) => position.top).join(",")}`);
  check(dockAt0.bottom - dockAt5.bottom === 5 && dockAt5.bottom - dockAt10.bottom === 5 && dockAt10.bottom - dockAt20.bottom === 10, `Android dock bottom edge did not track the slider: ${androidSimulation.dockPositions.map((position) => position.bottom).join(",")}`);
  await captureScreenshot("system-bars-r15-android-gap-0.png");
  await evaluate(`(() => { const range = document.querySelector('#dockBottomGapRange'); range.value = '40'; range.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await captureScreenshot("system-bars-r15-android-gap-40.png");
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
    root.classList.remove('android-webview');
    root.classList.add('pwa-standalone');
    root.style.setProperty('--app-safe-left', '59px');
    root.style.setProperty('--app-safe-right', '59px');
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
  await captureScreenshot("system-bars-r15-ios-landscape.png");

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
