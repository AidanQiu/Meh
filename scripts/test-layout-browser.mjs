import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
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
      finalTop: html.getPropertyValue('--app-safe-top').trim(),
      finalBottom: html.getPropertyValue('--app-safe-bottom').trim(),
    };
  })()`);
  check(base.build === "1.1.1-pwa-r7", "browser loaded the wrong build");
  check(base.viewport[0] === 390, `portrait viewport width was ${base.viewport[0]}, expected 390`);
  check(base.bodyPadding.join(",") === "0px,0px", "visual body must not consume safe-area padding");
  check(base.framePadding.join(",") === "0px,0px", "visual root must not consume safe-area padding");
  check(base.frameBackground === "rgba(0, 0, 0, 0)", "content root must remain transparent over the visual background");

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
  check(migration.savedTop === 0 && migration.version === 2 && migration.renderedTopExtra === "0px", "r6 persisted 16px top spacer was not migrated to the r7 zero default");

  const iosSimulation = await evaluate(`(() => {
    const root = document.documentElement;
    root.classList.remove('android-webview');
    root.classList.add('pwa-standalone');
    root.style.setProperty('--browser-safe-top', '59px');
    root.style.setProperty('--browser-safe-bottom', '34px');
    const app = getComputedStyle(document.querySelector('.app'));
    const dock = getComputedStyle(document.querySelector('.floating-dock'));
    const body = getComputedStyle(document.body);
    return { appTop: app.paddingTop, dockBottom: dock.bottom, bodyTop: body.paddingTop, bodyBottom: body.paddingBottom };
  })()`);
  check(iosSimulation.appTop === "59px", `simulated iOS top inset was applied ${iosSimulation.appTop}, expected once as 59px`);
  check(iosSimulation.dockBottom === "52px", `simulated iOS dock offset was ${iosSimulation.dockBottom}, expected 18px + 34px`);
  check(iosSimulation.bodyTop === "0px" && iosSimulation.bodyBottom === "0px", "simulated iOS visual background was inset");

  const androidSimulation = await evaluate(`(() => {
    const root = document.documentElement;
    root.classList.add('android-webview');
    root.style.setProperty('--browser-safe-top', '99px');
    root.style.setProperty('--browser-safe-bottom', '99px');
    root.style.setProperty('--native-safe-top', '24px');
    root.style.setProperty('--native-safe-bottom', '24px');
    const style = getComputedStyle(root);
    const app = getComputedStyle(document.querySelector('.app'));
    const dock = getComputedStyle(document.querySelector('.floating-dock'));
    return { finalTop: style.getPropertyValue('--app-safe-top').trim(), finalBottom: style.getPropertyValue('--app-safe-bottom').trim(), appTop: app.paddingTop, dockBottom: dock.bottom };
  })()`);
  check(androidSimulation.finalTop === "24px" && androidSimulation.finalBottom === "24px", "Android did not exclusively select native inset variables");
  check(androidSimulation.appTop === "24px", `simulated Android top inset was applied ${androidSimulation.appTop}, expected once`);
  check(androidSimulation.dockBottom === "42px", `simulated Android dock offset was ${androidSimulation.dockBottom}, expected 18px + 24px`);

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

  if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Chromium layout smoke tests passed: all pages/sheets, portrait/landscape, and single-source iOS/Android inset simulations.");
  }
} finally {
  try { socket?.close(); } catch {}
  child.kill();
  await delay(100);
  rmSync(profile, { recursive: true, force: true });
}
