import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "navigation-controller.js"), "utf8");

const RUNTIME = Object.freeze({
  BROWSER: "platform-browser",
  IOS_PWA: "platform-ios-pwa",
  ANDROID_APP: "platform-android-app",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class EventHub {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener, options) {
    const listeners = this.listeners.get(type) || [];
    listeners.push({ listener, options });
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    for (const { listener } of this.listeners.get(event.type) || []) listener(event);
    return !event.defaultPrevented;
  }
}

class FakeElement {
  constructor(tagName = "DIV", interactive = false) {
    this.tagName = tagName;
    this.id = "";
    this.className = "";
    this.interactive = interactive;
  }

  closest() {
    return this.interactive ? this : null;
  }
}

function createHarness(runtime) {
  const windowHub = new EventHub();
  const documentHub = new EventHub();
  const body = new FakeElement("BODY");
  const documentElement = new FakeElement("HTML");
  documentElement.clientHeight = 800;
  const calls = { replace: 0, push: 0, go: 0 };
  const entries = [{ external: true }];
  let position = 0;

  const historyMock = {
    get state() {
      return entries[position];
    },
    get length() {
      return entries.length;
    },
    replaceState(state) {
      calls.replace += 1;
      entries[position] = structuredClone(state);
    },
    pushState(state) {
      calls.push += 1;
      entries.splice(position + 1);
      entries.push(structuredClone(state));
      position += 1;
    },
    go(delta) {
      calls.go += 1;
      const target = position + delta;
      if (target < 0 || target >= entries.length) return;
      position = target;
      setTimeout(() => {
        windowHub.dispatchEvent({
          type: "popstate",
          state: structuredClone(entries[position]),
        });
      }, 0);
    },
  };

  const documentMock = Object.assign(documentHub, {
    activeElement: body,
    body,
    documentElement,
    hidden: false,
    querySelectorAll() {
      return [];
    },
  });

  Object.assign(windowHub, {
    innerHeight: 800,
    scrollY: 0,
    visualViewport: null,
    MehPlatform: { RUNTIME, current: runtime },
    document: documentMock,
    history: historyMock,
    location: { pathname: "/index.html", search: "?test=platform", hash: "" },
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) {
      return setTimeout(() => callback(performance.now()), 0);
    },
  });

  const context = vm.createContext({
    console,
    crypto: { randomUUID: () => `session-${runtime}` },
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
  nav.registerItemType("settings", {
    screen: "settings",
    historyMode: "push",
    onBack() {},
  });

  return {
    calls,
    documentHub,
    entries,
    historyMock,
    nav,
    windowHub,
  };
}

function nextSettled(nav) {
  return new Promise((resolve) => {
    const unsubscribe = nav.onSettled((detail) => {
      unsubscribe();
      resolve(detail);
    });
  });
}

async function openSettings(harness) {
  const settled = nextSettled(harness.nav);
  assert(harness.nav.pushItem({ type: "settings" }), "settings push was rejected");
  await settled;
}

async function closeSettings(harness, source = "ui-button") {
  const settled = nextSettled(harness.nav);
  assert(harness.nav.requestBack(source), `${source} back was rejected`);
  await settled;
}

for (const runtime of [RUNTIME.IOS_PWA, RUNTIME.ANDROID_APP]) {
  const harness = createHarness(runtime);
  assert(harness.nav.navigationMode === "ui-stack-only", `${runtime} did not select UI Stack-only navigation`);
  assert(!harness.nav.usesHistoryAdapter, `${runtime} unexpectedly enabled the History adapter`);
  assert(harness.calls.replace === 1 && harness.historyMock.length === 1, `${runtime} did not normalize exactly one root entry`);

  await openSettings(harness);
  assert(harness.nav.getTopItem()?.historyMode === "none", `${runtime} UI item retained History ownership`);
  assert(harness.calls.push === 0 && harness.historyMock.length === 1, `${runtime} changed history length while opening UI`);

  await closeSettings(harness, runtime === RUNTIME.ANDROID_APP ? "android-back" : "ui-button");
  assert(harness.nav.getStack().length === 0, `${runtime} back did not close the top UI item`);
  assert(harness.calls.push === 0 && harness.calls.go === 0 && harness.calls.replace === 1, `${runtime} used browser History during internal back`);
}

{
  const harness = createHarness(RUNTIME.BROWSER);
  assert(harness.nav.navigationMode === "history-adapter" && harness.nav.usesHistoryAdapter, "normal browser did not select the History adapter");
  await openSettings(harness);
  assert(harness.nav.getTopItem()?.historyMode === "push", "normal browser UI item lost History ownership");
  assert(harness.calls.push === 1 && harness.historyMock.length === 2, "normal browser did not create one child history entry");
  await closeSettings(harness);
  assert(harness.calls.go === 1 && harness.nav.getStack().length === 0, "normal browser back did not traverse and close the UI item");
}

{
  const harness = createHarness(RUNTIME.IOS_PWA);
  const guard = harness.windowHub.IosEdgeNavigationGuard;
  assert(guard.enabled, "iOS standalone edge guard is disabled");
  for (const type of ["touchstart", "touchmove", "touchend", "touchcancel"]) {
    const registrations = harness.documentHub.listeners.get(type) || [];
    assert(registrations.length === 1, `iOS edge guard did not register exactly one ${type} listener`);
    assert(registrations[0].options?.capture === true && registrations[0].options?.passive === false, `${type} listener options are not capture/passive:false`);
  }

  const target = new FakeElement("DIV");
  const touch = { identifier: 7, clientX: 18, clientY: 320 };
  let prevented = 0;
  const makeTouchEvent = (type, touches) => ({
    type,
    target,
    touches,
    cancelable: true,
    preventDefault() {
      prevented += 1;
      this.defaultPrevented = true;
    },
  });
  harness.documentHub.dispatchEvent(makeTouchEvent("touchstart", [touch]));
  harness.documentHub.dispatchEvent(makeTouchEvent("touchmove", [{ ...touch, clientX: 44 }]));
  assert(prevented === 2 && guard.snapshot().active, "iOS left-edge gesture was not claimed from start through move");
  harness.documentHub.dispatchEvent(makeTouchEvent("touchcancel", []));
  assert(!guard.snapshot().active && guard.snapshot().touchId === null, "touchcancel did not reset the iOS edge guard");

  const interactiveEvent = makeTouchEvent("touchstart", [touch]);
  interactiveEvent.target = new FakeElement("BUTTON", true);
  harness.documentHub.dispatchEvent(interactiveEvent);
  assert(prevented === 2 && !guard.snapshot().active, "iOS edge guard claimed an interactive control");

  await openSettings(harness);
  let normalized = 0;
  harness.windowHub.addEventListener("meh:platform-history-normalized", () => {
    normalized += 1;
  });
  harness.windowHub.dispatchEvent({ type: "popstate", state: { external: true } });
  assert(
    normalized === 1
      && harness.nav.getStack().map((item) => item.type).join(",") === "settings"
      && harness.calls.replace === 2
      && harness.calls.go === 0,
    "unexpected iOS popstate did not normalize the root while preserving the UI Stack"
  );
}

for (const runtime of [RUNTIME.BROWSER, RUNTIME.ANDROID_APP]) {
  const harness = createHarness(runtime);
  assert(!harness.windowHub.IosEdgeNavigationGuard.enabled, `${runtime} unexpectedly enabled the iOS edge guard`);
  const touchListeners = ["touchstart", "touchmove", "touchend", "touchcancel"]
    .flatMap((type) => harness.documentHub.listeners.get(type) || []);
  assert(touchListeners.length === 0, `${runtime} registered iOS edge touch listeners`);
}

console.log("Platform navigation simulation passed: iOS/Android UI Stack-only, browser History adapter, scoped edge guard, cancel reset, and unexpected-popstate normalization.");
