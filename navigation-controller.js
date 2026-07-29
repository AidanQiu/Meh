(() => {
  "use strict";

  if (window.mehNavigation) return;

  const ROOT_SCREEN = "home";
  const VALID_SCREENS = new Set([
    ROOT_SCREEN,
    "settings",
    "preset-editor",
    "number-settings",
  ]);
  const backHandlers = [];
  let renderer = null;
  let currentState = normalizeState(history.state);
  let transitionPending = false;
  let backPending = false;
  let backPendingTimer = 0;

  function cloneParams(params) {
    if (!params || typeof params !== "object" || Array.isArray(params)) return {};
    try {
      return JSON.parse(JSON.stringify(params));
    } catch {
      return {};
    }
  }

  function rootState() {
    return {
      mehApp: true,
      screen: ROOT_SCREEN,
      depth: 0,
      params: {},
    };
  }

  function normalizeState(value) {
    if (!value || value.mehApp !== true || !VALID_SCREENS.has(value.screen)) {
      return rootState();
    }

    const depth = Number.isInteger(value.depth) && value.depth >= 0
      ? value.depth
      : 0;
    if (value.screen === ROOT_SCREEN || depth === 0) return rootState();

    return {
      mehApp: true,
      screen: value.screen,
      depth,
      params: cloneParams(value.params),
    };
  }

  function notifyRenderer(nextState, context) {
    if (typeof renderer !== "function") return;
    renderer(getState(), context);
  }

  function initializeHistory() {
    const normalized = normalizeState(history.state);
    currentState = normalized;
    if (JSON.stringify(history.state) !== JSON.stringify(normalized)) {
      history.replaceState(normalized, "", location.href);
    }
  }

  function open(screen, params = {}) {
    if (!VALID_SCREENS.has(screen) || screen === ROOT_SCREEN) return false;
    const nextState = {
      mehApp: true,
      screen,
      depth: currentState.depth + 1,
      params: cloneParams(params),
    };
    if (currentState.screen === screen
      && JSON.stringify(currentState.params) === JSON.stringify(nextState.params)) {
      return false;
    }

    const previousState = currentState;
    currentState = nextState;
    transitionPending = true;
    history.pushState(nextState, "", location.href);
    notifyRenderer(nextState, {
      action: "open",
      direction: "forward",
      previousState: { ...previousState, params: cloneParams(previousState.params) },
    });
    window.setTimeout(() => {
      transitionPending = false;
    }, 320);
    return true;
  }

  function runBackHandlers() {
    for (const { handler } of backHandlers) {
      try {
        if (handler()) return true;
      } catch (error) {
        console.error("[Meh] Navigation back handler failed:", error);
      }
    }
    return false;
  }

  function back() {
    if (runBackHandlers()) return true;
    if (!canGoBack()) return false;
    if (backPending) return true;
    backPending = true;
    transitionPending = true;
    history.back();
    window.clearTimeout(backPendingTimer);
    backPendingTimer = window.setTimeout(() => {
      backPending = false;
    }, 800);
    return true;
  }

  function canGoBack() {
    return currentState.mehApp === true && currentState.depth > 0;
  }

  function getState() {
    return {
      mehApp: true,
      screen: currentState.screen,
      depth: currentState.depth,
      params: cloneParams(currentState.params),
    };
  }

  function replace(screen, params = {}) {
    const candidate = normalizeState({
      mehApp: true,
      screen,
      depth: screen === ROOT_SCREEN ? 0 : Math.max(1, currentState.depth),
      params,
    });
    const previousState = currentState;
    currentState = candidate;
    history.replaceState(candidate, "", location.href);
    notifyRenderer(candidate, {
      action: "replace",
      direction: candidate.depth < previousState.depth ? "back" : "none",
      previousState: { ...previousState, params: cloneParams(previousState.params) },
    });
    return true;
  }

  function setRenderer(nextRenderer) {
    if (typeof nextRenderer !== "function") throw new TypeError("Navigation renderer must be a function");
    renderer = nextRenderer;
    notifyRenderer(currentState, {
      action: "restore",
      direction: "none",
      previousState: null,
    });
  }

  function registerBackHandler(name, handler, priority = 0) {
    if (typeof handler !== "function") throw new TypeError("Back handler must be a function");
    const entry = { name, handler, priority };
    backHandlers.push(entry);
    backHandlers.sort((left, right) => right.priority - left.priority);
    return () => {
      const index = backHandlers.indexOf(entry);
      if (index >= 0) backHandlers.splice(index, 1);
    };
  }

  window.addEventListener("popstate", (event) => {
    backPending = false;
    window.clearTimeout(backPendingTimer);
    const previousState = currentState;
    const nextState = normalizeState(event.state);
    if (!event.state || event.state.mehApp !== true || !VALID_SCREENS.has(event.state.screen)) {
      history.replaceState(nextState, "", location.href);
    }
    currentState = nextState;
    transitionPending = true;
    notifyRenderer(nextState, {
      action: "pop",
      direction: nextState.depth < previousState.depth ? "back" : "forward",
      previousState: { ...previousState, params: cloneParams(previousState.params) },
    });
    window.setTimeout(() => {
      transitionPending = false;
    }, 320);
  });

  initializeHistory();

  const api = Object.freeze({
    open,
    back,
    canGoBack,
    getState,
    replace,
    setRenderer,
    registerBackHandler,
    get transitionPending() {
      return transitionPending;
    },
  });

  window.mehNavigation = api;
  window.MehNavigation = api;
})();
