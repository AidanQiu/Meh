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
  check(base.build === "1.1.1-pwa-r13", "browser loaded the wrong build");
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
  check(migration.savedTop === 0 && migration.version === 3 && migration.renderedTopExtra === "0px", "legacy browser/Android 16px top spacer was not migrated to zero");

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
    root.style.setProperty('--browser-safe-bottom', '34px');
    root.style.setProperty('--app-safe-top', '59px');
    root.style.setProperty('--app-safe-bottom', '34px');
    const range = document.querySelector('#dockBottomGapRange');
    range.value = '0';
    range.dispatchEvent(new Event('input', { bubbles: true }));
    window.dispatchEvent(new Event('resize'));
    const app = getComputedStyle(document.querySelector('.app'));
    const dock = getComputedStyle(document.querySelector('.floating-dock'));
    const indicator = getComputedStyle(document.querySelector('.dock-indicator'));
    const body = getComputedStyle(document.body);
    return { appTop: app.paddingTop, dockBottom: dock.bottom, dockPaddingBottom: dock.paddingBottom, indicatorBottom: indicator.bottom, bodyTop: body.paddingTop, bodyBottom: body.paddingBottom, appHeight: getComputedStyle(root).getPropertyValue('--app-height').trim() };
  })()`);
  check(iosSimulation.appTop === "59px", `simulated iOS top inset was applied ${iosSimulation.appTop}, expected once as 59px`);
  check(iosSimulation.dockBottom === "0px", `simulated iOS dock stopped at ${iosSimulation.dockBottom} instead of reaching the configured physical edge`);
  check(iosSimulation.dockPaddingBottom === "40px", `simulated iOS dock content padding was ${iosSimulation.dockPaddingBottom}, expected 6px + 34px`);
  check(iosSimulation.indicatorBottom === "40px", `simulated iOS indicator entered the Home Indicator area: ${iosSimulation.indicatorBottom}`);
  check(iosSimulation.bodyTop === "0px" && iosSimulation.bodyBottom === "0px", "simulated iOS visual background was inset");
  check(iosSimulation.appHeight === "844px", `simulated iOS standalone canvas used ${iosSimulation.appHeight}, expected the r3-style measured 844px height`);
  await captureScreenshot("system-bars-r13-ios-portrait.png");

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
    const range = document.querySelector('#dockBottomGapRange');
    const dockPositions = [0, 18, 40].map((gap) => {
      range.value = String(gap);
      range.dispatchEvent(new Event('input', { bubbles: true }));
      const dockStyle = getComputedStyle(dock);
      const rect = dock.getBoundingClientRect();
      return {
        gap,
        cssBottom: dockStyle.bottom,
        paddingBottom: dockStyle.paddingBottom,
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
  const [dockAt0, dockAt18, dockAt40] = androidSimulation.dockPositions;
  check(androidSimulation.appTop === "24px", `simulated Android top inset was applied ${androidSimulation.appTop}, expected once`);
  check(androidSimulation.savedGap === 0, `bottom-gap range did not persist its real value: ${androidSimulation.savedGap}`);
  check(dockAt0.cssBottom === "0px" && dockAt18.cssBottom === "18px" && dockAt40.cssBottom === "40px", `Android dock did not follow the configured gaps: ${androidSimulation.dockPositions.map((position) => position.cssBottom).join(",")}`);
  check(androidSimulation.dockPositions.every((position) => position.paddingBottom === "36px"), `Android dock safe padding changed with its gap: ${androidSimulation.dockPositions.map((position) => position.paddingBottom).join(",")}`);
  check(androidSimulation.dockPositions.every((position) => position.height === dockAt0.height), `Android dock thickness changed with its gap: ${androidSimulation.dockPositions.map((position) => position.height).join(",")}`);
  check(dockAt0.top - dockAt18.top === 18 && dockAt18.top - dockAt40.top === 22, `Android dock did not move as one piece: top positions ${androidSimulation.dockPositions.map((position) => position.top).join(",")}`);
  check(dockAt0.bottom - dockAt18.bottom === 18 && dockAt18.bottom - dockAt40.bottom === 22, `Android dock bottom edge did not track the slider: ${androidSimulation.dockPositions.map((position) => position.bottom).join(",")}`);
  await captureScreenshot("system-bars-r13-android-gap-0.png");
  await evaluate(`(() => { const range = document.querySelector('#dockBottomGapRange'); range.value = '40'; range.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await captureScreenshot("system-bars-r13-android-gap-40.png");
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
  const landscape = await evaluate(`(() => ({ viewport: [innerWidth, innerHeight], frameWidth: document.querySelector('.phone-frame').getBoundingClientRect().width, bodyPadding: getComputedStyle(document.body).paddingTop }))()`);
  check(landscape.viewport[0] === 844 && landscape.viewport[1] === 390, "landscape viewport did not update");
  check(landscape.frameWidth === 844, `coarse-pointer landscape background root width was ${landscape.frameWidth}, expected 844`);
  check(landscape.bodyPadding === "0px", "landscape visual background gained top padding");
  await captureScreenshot("system-bars-r13-android-landscape.png");

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
