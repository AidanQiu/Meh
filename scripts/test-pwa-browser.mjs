import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const build = "1.1.1-pwa-r26";
const browserCandidates = process.platform === "win32"
  ? [
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    ]
  : process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
const browser = process.env.MEH_TEST_BROWSER || browserCandidates.find(existsSync);
if (!browser) {
  console.error("No supported Chromium browser found; set MEH_TEST_BROWSER to run the PWA browser test.");
  process.exit(2);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".woff2", "font/woff2"],
]);

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    let filePath = resolve(root, relativePath);
    const pathFromRoot = relative(root, filePath);
    if (pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
    if (!existsSync(filePath)) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    });
    response.end(readFileSync(filePath));
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});
const serverAddress = server.address();
const appPort = typeof serverAddress === "object" && serverAddress ? serverAddress.port : 0;
const profile = mkdtempSync(join(tmpdir(), "meh-pwa-browser-test-"));
const debugPort = 20000 + Math.floor(Math.random() * 1000);
const child = spawn(browser, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--hide-scrollbars",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore", windowsHide: true });

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
const endpoint = `http://127.0.0.1:${debugPort}`;
let socket;
let nextId = 1;
const pending = new Map();

async function waitForBrowser() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${endpoint}/json/version`);
      if (response.ok) return;
    } catch {
      // Chromium is still starting.
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
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const ready = await evaluate(
        `document.readyState === "complete" && Boolean(window.MehPwaUpdate) && Boolean(document.querySelector(".page-card"))`
      );
      if (ready) return;
    } catch {
      // A controller-triggered navigation may briefly replace the execution context.
    }
    await delay(50);
  }
  throw new Error("PWA did not initialize");
}

try {
  await waitForBrowser();
  const pageUrl = `http://127.0.0.1:${appPort}/index.html?pwaBrowserTest=${Date.now()}`;
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
  await send("Network.enable");
  await waitForApp();

  const online = await evaluate(`(async () => {
    const registration = await navigator.serviceWorker.ready;
    for (let attempt = 0; attempt < 100 && !navigator.serviceWorker.controller; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const controller = navigator.serviceWorker.controller;
    const cacheKeys = await caches.keys();
    const shell = await caches.open("meh-shell-${build}");
    const expected = [
      "./index.html",
      "./style.css?v=${build}",
      "./app.js?v=${build}",
      "./pwa-update.js?v=${build}"
    ];
    const cached = {};
    for (const asset of expected) {
      cached[asset] = Boolean(await shell.match(new URL(asset, location.href).href));
    }
    return {
      controlled: Boolean(controller),
      controllerUrl: controller?.scriptURL || "",
      activeState: registration.active?.state || "",
      cacheKeys,
      cached,
      build: document.querySelector('meta[name="meh-build"]')?.content || "",
    };
  })()`);

  if (!online.controlled) throw new Error("The installed Service Worker did not claim the page");
  if (online.activeState !== "activated") throw new Error(`Service Worker state was ${online.activeState}`);
  if (online.build !== build) throw new Error(`Online page loaded build ${online.build}`);
  if (!online.cacheKeys.includes(`meh-shell-${build}`)) throw new Error("Current shell cache is missing");
  if (online.cacheKeys.some((key) => key.startsWith("meh-") && !key.endsWith(build))) {
    throw new Error(`Old Meh cache survived activation: ${online.cacheKeys.join(",")}`);
  }
  if (Object.values(online.cached).some((value) => !value)) {
    throw new Error(`App shell is incomplete: ${JSON.stringify(online.cached)}`);
  }

  const diagnostics = await evaluate(`window.MehSafeAreaDiagnostics.serviceWorker()`);
  if (diagnostics.controllerVersion !== build) {
    throw new Error(`Service Worker diagnostics read controller ${diagnostics.controllerVersion}, expected ${build}`);
  }
  if (diagnostics.networkIndex?.build !== build || diagnostics.cachedIndex?.build !== build) {
    throw new Error(`Service Worker diagnostics found mismatched HTML: ${JSON.stringify(diagnostics)}`);
  }
  if (diagnostics.consistency?.verdict !== "consistent") {
    throw new Error(`Service Worker diagnostics returned ${diagnostics.consistency?.verdict}: ${JSON.stringify(diagnostics.consistency)}`);
  }

  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
    connectionType: "none",
  });
  await send("Page.reload", { ignoreCache: true });
  await waitForApp();
  const offline = await evaluate(`({
    build: document.querySelector('meta[name="meh-build"]')?.content || "",
    controlled: Boolean(navigator.serviceWorker.controller),
    stylesheetLoaded: Array.from(document.styleSheets).some((sheet) => sheet.href?.includes("style.css?v=${build}")),
    htmlBackground: getComputedStyle(document.documentElement).backgroundImage,
    bodyBackground: getComputedStyle(document.body).backgroundImage,
    viewportBackground: getComputedStyle(document.querySelector("#viewport-background")).backgroundImage,
  })`);
  if (
    offline.build !== build
    || !offline.controlled
    || !offline.stylesheetLoaded
    || offline.htmlBackground !== "none"
    || offline.bodyBackground !== "none"
    || offline.viewportBackground === "none"
  ) {
    throw new Error(`Offline reopen failed: ${JSON.stringify(offline)}`);
  }

  console.log(`PWA browser test passed for ${build}: activated controller, complete shell cache, and offline CSS/background reopen.`);
} finally {
  try {
    if (socket?.readyState === WebSocket.OPEN) {
      await Promise.race([
        send("Browser.close").catch(() => {}),
        delay(500),
      ]);
      socket.close();
    }
  } catch {
    // Best-effort cleanup.
  }
  child.kill();
  await new Promise((resolveClose) => server.close(resolveClose));
  await delay(300);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    console.warn(`Temporary Chrome profile cleanup was deferred: ${error.message}`);
  }
}
