import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "pwa-update.js"), "utf8");

class EventHub {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) || []) listener(event);
  }
}

const windowHub = new EventHub();
const documentHub = new EventHub();
const serviceWorkerHub = new EventHub();
const registrationHub = new EventHub();
const installingHub = new EventHub();
const statuses = [];
let updateCalls = 0;
let reloadCalls = 0;
let registerArgs = null;
let versionFetch = null;
let skipWaitingMessages = 0;

windowHub.addEventListener("meh:pwa-update-status", (event) => statuses.push(event.detail.status));
windowHub.setInterval = () => 1;

const localData = new Map([
  ["meh-wheel-presets-v1", "presets"],
  ["meh-app-settings-v2", "settings"],
]);
const sessionData = new Map([["unrelated-session-key", "keep-me"]]);
const fakeIndexedDb = { databases: new Map([["meh-wallpapers-db", { wallpaper: true }]]) };

const waitingWorker = {
  postMessage(message) {
    if (message.type !== "SKIP_WAITING") return;
    skipWaitingMessages += 1;
    setTimeout(() => serviceWorkerHub.dispatchEvent({ type: "controllerchange" }), 0);
  },
};
const installingWorker = Object.assign(installingHub, { state: "installing" });
const registration = Object.assign(registrationHub, {
  waiting: null,
  installing: null,
  async update() {
    updateCalls += 1;
    if (!this.waiting) {
      this.installing = installingWorker;
      this.dispatchEvent({ type: "updatefound" });
      this.waiting = waitingWorker;
      installingWorker.state = "installed";
      installingWorker.dispatchEvent({ type: "statechange" });
    }
  },
});

const navigatorMock = {
  onLine: true,
  serviceWorker: Object.assign(serviceWorkerHub, {
    async register(url, options) {
      registerArgs = { url, options };
      return registration;
    },
  }),
};
const documentMock = Object.assign(documentHub, {
  visibilityState: "visible",
  querySelector(selector) {
    return selector === 'meta[name="meh-build"]' ? { content: "1.1.1-pwa-r3" } : null;
  },
});
const locationMock = {
  protocol: "https:",
  hostname: "example.test",
  reload() { reloadCalls += 1; },
};

const context = vm.createContext({
  console,
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
  Date,
  document: documentMock,
  fetch: async (url, options) => {
    versionFetch = { url, options };
    return { ok: true, json: async () => ({ version: "1.1.1", build: "1.1.1-pwa-r4" }) };
  },
  indexedDB: fakeIndexedDb,
  localStorage: {
    getItem: (key) => localData.get(key) ?? null,
    setItem: (key, value) => localData.set(key, value),
  },
  location: locationMock,
  navigator: navigatorMock,
  sessionStorage: {
    getItem: (key) => sessionData.get(key) ?? null,
    setItem: (key, value) => sessionData.set(key, value),
  },
  setTimeout,
  window: windowHub,
});
windowHub.navigator = navigatorMock;
windowHub.location = locationMock;
windowHub.document = documentMock;

vm.runInContext(source, context, { filename: "pwa-update.js" });
await new Promise((resolve) => setTimeout(resolve, 25));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(registerArgs?.url === "./service-worker.js?v=1.1.1-pwa-r3", "registration URL did not use the page build");
assert(registerArgs?.options?.updateViaCache === "none", "updateViaCache was not disabled");
assert(updateCalls >= 1, "registration.update() was not called");
assert(versionFetch?.url.startsWith("./version.json?t="), "version.json timestamp was missing");
assert(versionFetch?.options?.cache === "no-store", "version.json did not bypass HTTP cache");
assert(skipWaitingMessages >= 1, "waiting worker did not receive SKIP_WAITING");
assert(reloadCalls === 1, "controllerchange did not reload exactly once");
assert(sessionData.get("meh-sw-reloaded-for-build") === "1.1.1-pwa-r3", "reload guard was not stored");

serviceWorkerHub.dispatchEvent({ type: "controllerchange" });
assert(reloadCalls === 1, "a repeated controllerchange caused an extra reload");
assert(localData.get("meh-wheel-presets-v1") === "presets", "localStorage preset data changed");
assert(localData.get("meh-app-settings-v2") === "settings", "localStorage settings changed");
assert(sessionData.get("unrelated-session-key") === "keep-me", "unrelated sessionStorage data changed");
assert(fakeIndexedDb.databases.has("meh-wallpapers-db"), "IndexedDB wallpaper data changed");

navigatorMock.onLine = false;
const offlineResult = await windowHub.MehPwaUpdate.checkForUpdates({ manual: true, force: true });
assert(offlineResult.status === "offline", "offline update check did not fail safely");
assert(statuses.includes("updating") && statuses.includes("offline"), "expected update statuses were not emitted");

for (const localLocation of [
  { protocol: "file:", hostname: "" },
  { protocol: "https:", hostname: "appassets.androidplatform.net" },
]) {
  let localRegisterCalls = 0;
  const localWindow = new EventHub();
  const localNavigator = {
    onLine: true,
    serviceWorker: {
      register() { localRegisterCalls += 1; },
    },
  };
  const localContext = vm.createContext({
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    Date,
    document: {
      querySelector: () => ({ content: "1.1.1-pwa-r4" }),
    },
    location: { ...localLocation, reload() {} },
    navigator: localNavigator,
    sessionStorage: { getItem: () => null, setItem() {} },
    window: localWindow,
  });
  vm.runInContext(source, localContext, { filename: "pwa-update.js" });
  assert(localRegisterCalls === 0, `Service Worker registered for local Android context ${localLocation.protocol}//${localLocation.hostname}`);
}

console.log("PWA r3 -> r4 simulation passed: one reload, preserved local data, safe offline fallback, no Android-local registration.");
