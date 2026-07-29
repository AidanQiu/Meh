import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "navigation-controller.js"), "utf8");

class EventHub {
  constructor() {
    this.listeners = new Map();
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) || []) listener(event);
  }
}

class FakeElement {
  constructor(tagName = "BODY") {
    this.tagName = tagName;
    this.id = "";
    this.className = "";
  }
}

const windowHub = new EventHub();
const documentHub = new EventHub();
const documentElement = new FakeElement("HTML");
documentElement.clientHeight = 800;
const body = new FakeElement("BODY");
const historyEntries = [{ external: true }];
let historyPosition = 0;
let historyObject;

const historyMock = {
  get state() {
    return historyEntries[historyPosition];
  },
  replaceState(state) {
    historyEntries[historyPosition] = structuredClone(state);
  },
  pushState(state) {
    historyEntries.splice(historyPosition + 1);
    historyEntries.push(structuredClone(state));
    historyPosition += 1;
  },
  go(delta) {
    const target = historyPosition + delta;
    if (target < 0 || target >= historyEntries.length) return;
    historyPosition = target;
    setTimeout(() => {
      windowHub.dispatchEvent({
        type: "popstate",
        state: structuredClone(historyEntries[historyPosition]),
      });
    }, 0);
  },
};
historyObject = historyMock;

const documentMock = Object.assign(documentHub, {
  activeElement: body,
  body,
  documentElement,
  querySelectorAll() {
    return [];
  },
});

Object.assign(windowHub, {
  innerHeight: 800,
  scrollY: 0,
  visualViewport: null,
  MehPlatform: { ios: false },
  document: documentMock,
  history: historyMock,
  location: { pathname: "/index.html", search: "?test=1", hash: "#same" },
  setTimeout,
  clearTimeout,
  requestAnimationFrame(callback) {
    return setTimeout(() => callback(performance.now()), 0);
  },
});

const context = vm.createContext({
  console,
  crypto: { randomUUID: () => "test-session" },
  CustomEvent: class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  },
  document: documentMock,
  Element: FakeElement,
  getComputedStyle: () => ({ transform: "none" }),
  history: historyMock,
  localStorage: { getItem: () => null },
  location: windowHub.location,
  performance,
  requestAnimationFrame: windowHub.requestAnimationFrame,
  setTimeout,
  clearTimeout,
  window: windowHub,
});

vm.runInContext(source, context, { filename: "navigation-controller.js" });

const nav = windowHub.mehNavigation;
const lifecycle = [];
for (const type of ["settings", "language-menu", "dark-mode-menu"]) {
  nav.registerItemType(type, {
    screen: type === "settings" ? "settings" : "settings",
    historyMode: "push",
    onOpen({ item, restored }) {
      lifecycle.push(`open:${item.type}:${restored ? "restore" : "new"}`);
    },
    onBack({ item, source, canAnimate }) {
      lifecycle.push(`close:${item.type}:${source}:${canAnimate}`);
    },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nextSettled() {
  return new Promise((resolve) => {
    const unsubscribe = nav.onSettled((detail) => {
      unsubscribe();
      resolve(detail);
    });
  });
}

let settled = nextSettled();
assert(nav.pushItem({ type: "settings" }), "settings push was rejected");
await settled;
assert(nav.getStack().map((item) => item.type).join(",") === "settings", "settings was not the only stack item");
assert(historyObject.state.sessionId === "test-session" && historyObject.state.index === 1, "settings history entry lacks the session cursor");
assert(windowHub.location.pathname === "/index.html", "same-document navigation changed the path");

settled = nextSettled();
assert(nav.pushItem({ type: "language-menu" }), "language menu push was rejected");
await settled;
assert(nav.getStack().map((item) => item.type).join(",") === "settings,language-menu", "language menu stack order is wrong");

settled = nextSettled();
assert(nav.replaceItem({ type: "dark-mode-menu" }), "temporary item replacement was rejected");
await settled;
assert(
  nav.getStack().map((item) => item.type).join(",") === "settings,dark-mode-menu"
    && nav.getTopItem().historyMode === "push",
  "temporary item replacement lost stack order or History ownership"
);

settled = nextSettled();
assert(nav.requestBack("android-back", "token-1"), "first back was rejected");
await settled;
assert(nav.getStack().map((item) => item.type).join(",") === "settings", "first back did not close only the language menu");
assert(historyObject.state.index === 1, "first back did not acknowledge the expected history cursor");

settled = nextSettled();
nav.requestBack("ui-button");
await settled;
assert(nav.getStack().length === 0 && !nav.canGoBack(), "second back left a ghost item at home");
assert(historyObject.state.index === 0, "second back did not return to the root cursor");

settled = nextSettled();
nav.pushItem({ type: "settings" });
await settled;
settled = nextSettled();
nav.pushItem({ type: "language-menu" });
await settled;

settled = nextSettled();
historyObject.go(-1);
const browserBack = await settled;
assert(browserBack.source === "browser-history", "external history back used the wrong source");
assert(nav.getStack().map((item) => item.type).join(",") === "settings", "browser back skipped past the top UI item");

settled = nextSettled();
historyObject.go(1);
const browserForward = await settled;
assert(browserForward.source === "browser-history", "browser forward used the wrong source");
assert(nav.getStack().map((item) => item.type).join(",") === "settings,language-menu", "browser forward did not restore the serialized snapshot");
assert(lifecycle.includes("open:language-menu:restore"), "forward restoration did not use the registered item lifecycle");

console.log("Navigation controller simulation passed: session cursor, serialized history queue, two-stage back, no ghost root, and forward snapshot restoration.");
