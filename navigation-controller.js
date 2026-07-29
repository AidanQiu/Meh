(() => {
  "use strict";

  if (window.mehNavigation) return;

  const ROOT_SCREEN = "home";
  const HISTORY_TIMEOUT_MS = 900;
  const DEBUG_KEY = "meh-navigation-debug";
  const MAX_DEBUG_ENTRIES = 1200;
  const NAVIGATION_MODE = Object.freeze({
    UI_STACK_ONLY: "ui-stack-only",
    HISTORY_ADAPTER: "history-adapter",
  });
  const platformRuntime = window.MehPlatform?.current || "platform-browser";
  const navigationMode = platformRuntime === window.MehPlatform?.RUNTIME?.IOS_PWA
    || platformRuntime === window.MehPlatform?.RUNTIME?.ANDROID_APP
    ? NAVIGATION_MODE.UI_STACK_ONLY
    : NAVIGATION_MODE.HISTORY_ADAPTER;
  const usesHistoryAdapter = navigationMode === NAVIGATION_MODE.HISTORY_ADAPTER;
  const sessionId = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `meh-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const itemTypes = new Map();
  const uiStack = [];
  const settledListeners = new Set();
  const historyOperationQueue = [];
  const debugEntries = [];

  let renderer = null;
  let cursor = 0;
  let nextItemSequence = 0;
  let nextHistoryToken = 0;
  let isAlteringHistory = false;
  let pendingTraversalToken = null;
  let uiOperationChain = Promise.resolve();
  let requestInFlight = false;
  let backGuard = null;

  function cloneSerializable(value, fallback = {}) {
    if (value == null) return fallback;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function sameDocumentUrl() {
    return `${location.pathname}${location.search}${location.hash}`;
  }

  function isDebugEnabled() {
    try {
      return localStorage.getItem(DEBUG_KEY) === "1";
    } catch {
      return false;
    }
  }

  function stackSnapshot() {
    return uiStack.map((item) => ({
      id: item.id,
      type: item.type,
      screen: item.screen,
      context: cloneSerializable(item.context),
      historyMode: item.historyMode,
      historyIndex: item.historyIndex,
      isClosing: item.isClosing,
      isClosed: item.isClosed,
    }));
  }

  function debug(event, detail = {}) {
    if (!isDebugEnabled()) return;
    const activeElement = document.activeElement;
    const sheets = Array.from(document.querySelectorAll(
      ".settings-sheet, .editor-sheet"
    )).map((sheet) => ({
      id: sheet.id,
      ariaHidden: sheet.getAttribute("aria-hidden"),
      transform: getComputedStyle(sheet).transform,
    }));
    const entry = {
      sequence: debugEntries.length
        ? debugEntries[debugEntries.length - 1].sequence + 1
        : 1,
      now: performance.now(),
      event,
      sessionId,
      navigationMode,
      historyIndex: cursor,
      uiStack: stackSnapshot(),
      activeElement: activeElement instanceof Element
        ? `${activeElement.tagName.toLowerCase()}${activeElement.id ? `#${activeElement.id}` : ""}`
        : "",
      keyboardState: window.MehKeyboardViewport?.getState?.().state || "unavailable",
      innerHeight: window.innerHeight,
      clientHeight: document.documentElement.clientHeight,
      visualViewport: window.visualViewport
        ? {
            height: window.visualViewport.height,
            offsetTop: window.visualViewport.offsetTop,
          }
        : null,
      scrollY: window.scrollY,
      htmlClass: document.documentElement.className,
      bodyClass: document.body?.className || "",
      sheets,
      detail: cloneSerializable(detail),
    };
    debugEntries.push(entry);
    if (debugEntries.length > MAX_DEBUG_ENTRIES) {
      debugEntries.splice(0, debugEntries.length - MAX_DEBUG_ENTRIES);
    }
  }

  function serializeItem(item) {
    return {
      id: item.id,
      type: item.type,
      screen: item.screen,
      context: cloneSerializable(item.context),
      historyMode: item.historyMode,
      historyIndex: item.historyIndex,
    };
  }

  function serializeStack() {
    return uiStack
      .filter((item) => !item.isClosed)
      .map(serializeItem);
  }

  function historyState(index = cursor, itemId = uiStack.at(-1)?.id || null) {
    return {
      mehApp: true,
      sessionId,
      index,
      itemId,
      snapshot: usesHistoryAdapter ? serializeStack() : [],
    };
  }

  function isCurrentSessionState(value) {
    return Boolean(
      value
      && value.mehApp === true
      && value.sessionId === sessionId
      && Number.isInteger(value.index)
      && value.index >= 0
      && Array.isArray(value.snapshot)
    );
  }

  function createItem(input, restored = false) {
    const config = typeof input === "string" ? { type: input } : { ...input };
    const definition = itemTypes.get(config.type);
    if (!definition) throw new Error(`Unknown navigation item type: ${config.type}`);
    const context = cloneSerializable(config.context);
    if (!restored && context.parentItemId == null) {
      context.parentItemId = getTopItem()?.id || null;
    }
    if (typeof definition.validate === "function" && !definition.validate(context)) {
      throw new Error(`Invalid navigation context for item type: ${config.type}`);
    }
    const item = {
      id: String(config.id || `${sessionId}:${++nextItemSequence}`),
      type: config.type,
      screen: String(config.screen || definition.screen || config.type),
      context,
      historyMode: usesHistoryAdapter
        ? (
            ["push", "replace", "none"].includes(config.historyMode)
              ? config.historyMode
              : definition.historyMode || "push"
          )
        : "none",
      onBack: typeof config.onBack === "function" ? config.onBack : definition.onBack,
      canAnimate: config.canAnimate !== false,
      isClosing: false,
      isClosed: false,
      historyIndex: Number.isInteger(config.historyIndex)
        ? config.historyIndex
        : cursor,
      transitionToken: 0,
      restored,
    };
    if (typeof item.onBack !== "function") {
      throw new TypeError(`Navigation item type ${item.type} must define onBack()`);
    }
    return item;
  }

  function getTopItem() {
    return uiStack.at(-1) || null;
  }

  function getStack() {
    return uiStack.map((item) => ({
      ...item,
      context: cloneSerializable(item.context),
    }));
  }

  function getState() {
    const screenItem = [...uiStack]
      .reverse()
      .find((item) => item.screen !== ROOT_SCREEN && !item.isClosed);
    return {
      mehApp: true,
      sessionId,
      navigationMode,
      index: cursor,
      screen: screenItem?.screen || ROOT_SCREEN,
      // Compatibility only. UI truth comes from getStack(), never this value.
      depth: uiStack.filter((item) => !item.isClosed).length,
      params: cloneSerializable(screenItem?.context),
      itemId: getTopItem()?.id || null,
    };
  }

  function notifyRenderer(context) {
    if (typeof renderer === "function") {
      renderer(getState(), context);
    }
  }

  function emitSettled(detail = {}) {
    const payload = {
      ...detail,
      sessionId,
      historyIndex: cursor,
      stack: stackSnapshot(),
    };
    window.dispatchEvent(new CustomEvent("meh:navigation-settled", { detail: payload }));
    settledListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error("[Meh] navigation settled listener failed:", error);
      }
    });
  }

  function afterAnimationFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function queueHistoryOperation(kind, run) {
    return new Promise((resolve, reject) => {
      historyOperationQueue.push({ kind, run, resolve, reject });
      debug("history-operation-queued", { kind, queueLength: historyOperationQueue.length });
      drainHistoryOperations();
    });
  }

  async function drainHistoryOperations() {
    if (isAlteringHistory) return;
    const operation = historyOperationQueue.shift();
    if (!operation) return;
    isAlteringHistory = true;
    debug("history-operation-start", { kind: operation.kind });
    try {
      await afterAnimationFrame();
      const result = await operation.run();
      operation.resolve(result);
    } catch (error) {
      operation.reject(error);
    } finally {
      isAlteringHistory = false;
      if (historyOperationQueue.length) {
        requestAnimationFrame(() => drainHistoryOperations());
      }
    }
  }

  function queueReplaceState(index = cursor) {
    return queueHistoryOperation("replaceState", () => {
      history.replaceState(historyState(index), "", sameDocumentUrl());
      cursor = index;
      debug("history-operation-ack", { kind: "replaceState", index });
    });
  }

  function queuePushState(index) {
    return queueHistoryOperation("pushState", () => {
      history.pushState(historyState(index), "", sameDocumentUrl());
      cursor = index;
      debug("history-operation-ack", { kind: "pushState", index });
    });
  }

  function acknowledgeTraversal(state, eventSource = "popstate") {
    const pending = pendingTraversalToken;
    if (!pending) return false;
    if (!isCurrentSessionState(state)) return false;
    pendingTraversalToken = null;
    window.clearTimeout(pending.timeout);
    cursor = state.index;
    debug("history-operation-ack", {
      kind: "traversal",
      token: pending.token,
      targetIndex: pending.targetIndex,
      actualIndex: state.index,
      eventSource,
    });
    pending.resolve(state);
    return true;
  }

  function queueTraversal(targetIndex) {
    return queueHistoryOperation("traversal", () => new Promise((resolve) => {
      const delta = targetIndex - cursor;
      if (delta === 0) {
        resolve(history.state);
        return;
      }
      const token = `${sessionId}:history:${++nextHistoryToken}`;
      const timeout = window.setTimeout(() => {
        if (pendingTraversalToken?.token !== token) return;
        pendingTraversalToken = null;
        const liveState = history.state;
        if (isCurrentSessionState(liveState)) cursor = liveState.index;
        debug("history-operation-ack", {
          kind: "traversal-timeout",
          token,
          targetIndex,
          actualIndex: cursor,
        });
        resolve(liveState);
      }, HISTORY_TIMEOUT_MS);
      pendingTraversalToken = { token, targetIndex, resolve, timeout };
      history.go(delta);
    }));
  }

  async function callItemOpen(item, options = {}) {
    const definition = itemTypes.get(item.type);
    if (typeof definition?.onOpen === "function") {
      try {
        await definition.onOpen({
          item,
          source: options.source || "ui-open",
          canAnimate: options.canAnimate !== false,
          restored: Boolean(options.restored),
        });
      } catch (error) {
        console.error(`[Meh] ${item.type} onOpen failed:`, error);
      }
    }
  }

  async function closeItem(item, options = {}) {
    if (!item || item.isClosed) return;
    if (item.isClosing) {
      await item.closePromise;
      return;
    }
    item.isClosing = true;
    item.canAnimate = options.canAnimate !== false;
    const transitionToken = ++item.transitionToken;
    debug("ui-stack-close-request", {
      itemId: item.id,
      type: item.type,
      source: options.source,
      canAnimate: item.canAnimate,
    });
    item.closePromise = Promise.resolve()
      .then(() => item.onBack({
        item,
        source: options.source || "request-back",
        canAnimate: item.canAnimate,
        transitionToken,
      }))
      .catch((error) => {
        console.error(`[Meh] ${item.type} onBack failed:`, error);
      })
      .then(() => {
        if (item.transitionToken !== transitionToken) return;
        item.isClosing = false;
        item.isClosed = true;
        debug("ui-stack-animation-complete", {
          itemId: item.id,
          type: item.type,
          transitionToken,
        });
      });
    await item.closePromise;
  }

  function removeClosedItem(item) {
    const index = uiStack.indexOf(item);
    if (index < 0) return false;
    uiStack.splice(index, 1);
    debug("ui-stack-remove", { itemId: item.id, type: item.type });
    return true;
  }

  async function runBackGuard(source) {
    if (!backGuard?.canHandle?.(source)) return { handled: false, proceed: true };
    const result = await backGuard.run(source);
    if (!result || typeof result !== "object") {
      return { handled: Boolean(result), proceed: false };
    }
    return {
      handled: result.handled !== false,
      proceed: result.proceed === true,
    };
  }

  function settleAndroid(token, handled) {
    if (!token || !window.MehAndroid?.onNavigationSettled) return;
    try {
      window.MehAndroid.onNavigationSettled(String(token), Boolean(handled));
      debug("android-back-settled", { token, handled });
    } catch (error) {
      console.warn("[Meh] Android navigation-settled callback failed:", error);
    }
  }

  async function performActiveBack(source, nativeToken) {
    const guardResult = await runBackGuard(source);
    if (guardResult.handled && !guardResult.proceed) {
      return { handled: true, keyboardOnly: true };
    }

    const item = getTopItem();
    if (!item) {
      return { handled: guardResult.handled };
    }

    await closeItem(item, { source, canAnimate: true });
    if (item.historyMode === "push" && cursor >= item.historyIndex) {
      await queueTraversal(Math.max(0, item.historyIndex - 1));
    } else if (item.historyMode === "replace") {
      await queueReplaceState(cursor);
    }
    removeClosedItem(item);
    if (usesHistoryAdapter) {
      // The target entry predates the removal. Normalize its snapshot after
      // the traversal acknowledgment without creating another entry.
      await queueReplaceState(cursor);
    }
    notifyRenderer({
      action: "remove",
      direction: "back",
      source,
      item: serializeItem(item),
    });
    return { handled: true, itemId: item.id };
  }

  function requestBack(source = "ui-button", nativeToken = "") {
    const normalizedSource = typeof source === "string" && source ? source : "ui-button";
    const guardCanHandle = Boolean(backGuard?.canHandle?.(normalizedSource));
    if (!getTopItem() && !guardCanHandle) return false;
    if (requestInFlight) return true;
    requestInFlight = true;
    if (normalizedSource === "android-back") {
      debug("android-back-request", { token: nativeToken });
    }
    uiOperationChain = uiOperationChain
      .then(() => performActiveBack(normalizedSource, nativeToken))
      .then((result) => {
        requestInFlight = false;
        emitSettled({ source: normalizedSource, ...result });
        settleAndroid(nativeToken, result.handled);
        return result.handled;
      }, (error) => {
        requestInFlight = false;
        console.error("[Meh] Navigation back request failed:", error);
        emitSettled({ source: normalizedSource, handled: false, error: true });
        settleAndroid(nativeToken, false);
        return false;
      });
    return true;
  }

  function back(source = "ui-button", nativeToken = "") {
    return requestBack(source, nativeToken);
  }

  function canGoBack(source = "query") {
    return Boolean(getTopItem() || backGuard?.canHandle?.(source));
  }

  function nextHistoryIndex() {
    return Math.max(cursor, ...uiStack.map((item) => item.historyIndex)) + 1;
  }

  function pushItem(input) {
    let item;
    try {
      item = createItem(input);
    } catch (error) {
      console.error("[Meh] Unable to push navigation item:", error);
      return false;
    }
    if (item.historyMode === "push") item.historyIndex = nextHistoryIndex();
    if (item.historyMode === "replace") item.historyIndex = cursor;
    uiStack.push(item);
    debug("ui-stack-push", { item: serializeItem(item) });
    uiOperationChain = uiOperationChain.then(async () => {
      await callItemOpen(item, { source: "ui-open", canAnimate: item.canAnimate });
      if (item.historyMode === "push") {
        await queuePushState(item.historyIndex);
      } else if (item.historyMode === "replace") {
        await queueReplaceState(cursor);
      }
      notifyRenderer({
        action: "open",
        direction: "forward",
        source: "ui-open",
        item: serializeItem(item),
      });
      emitSettled({ source: "ui-open", handled: true, itemId: item.id });
    });
    return true;
  }

  function replaceItem(input) {
    const previous = getTopItem();
    if (!previous) return pushItem({ ...input, historyMode: "replace" });
    let next;
    try {
      next = createItem({
        ...(typeof input === "string" ? { type: input } : input),
        // The browser entry is replaced, but the new UI item still owns that
        // entry and must consume it when it later closes.
        historyMode: previous.historyMode,
        historyIndex: previous.historyIndex,
      });
    } catch (error) {
      console.error("[Meh] Unable to replace navigation item:", error);
      return false;
    }
    uiOperationChain = uiOperationChain.then(async () => {
      await closeItem(previous, { source: "replace", canAnimate: false });
      removeClosedItem(previous);
      uiStack.push(next);
      debug("ui-stack-push", { item: serializeItem(next), replacedItemId: previous.id });
      await callItemOpen(next, { source: "replace", canAnimate: true });
      if (usesHistoryAdapter) await queueReplaceState(cursor);
      notifyRenderer({
        action: "replace",
        direction: "none",
        source: "replace",
        item: serializeItem(next),
        previousItem: serializeItem(previous),
      });
      emitSettled({ source: "replace", handled: true, itemId: next.id });
    });
    return true;
  }

  function removeItem(itemOrId, options = {}) {
    const item = typeof itemOrId === "string"
      ? uiStack.find((candidate) => candidate.id === itemOrId)
      : itemOrId;
    if (!item || item !== getTopItem()) return false;
    return requestBack(options.source || "remove-item");
  }

  function open(screen, params = {}) {
    if (!screen || screen === ROOT_SCREEN) return false;
    const top = getTopItem();
    if (
      top?.type === screen
      && JSON.stringify(top.context) === JSON.stringify(cloneSerializable(params))
    ) {
      return false;
    }
    return pushItem({ type: screen, screen, context: params, historyMode: "push" });
  }

  function replace(screen, params = {}) {
    if (screen === ROOT_SCREEN) {
      if (!getTopItem()) {
        if (usesHistoryAdapter) queueReplaceState(0);
        return true;
      }
      uiOperationChain = uiOperationChain.then(async () => {
        while (getTopItem()) {
          const item = getTopItem();
          await closeItem(item, { source: "replace-root", canAnimate: false });
          removeClosedItem(item);
        }
        if (usesHistoryAdapter && cursor > 0) await queueTraversal(0);
        if (usesHistoryAdapter) await queueReplaceState(0);
        notifyRenderer({ action: "replace", direction: "back", source: "replace-root" });
        emitSettled({ source: "replace-root", handled: true });
      });
      return true;
    }
    return replaceItem({ type: screen, screen, context: params });
  }

  function registerItemType(type, definition) {
    if (!type || !definition || typeof definition.onBack !== "function") {
      throw new TypeError("registerItemType() requires a type and onBack()");
    }
    itemTypes.set(type, { ...definition });
    return () => itemTypes.delete(type);
  }

  function setRenderer(nextRenderer) {
    if (typeof nextRenderer !== "function") {
      throw new TypeError("Navigation renderer must be a function");
    }
    renderer = nextRenderer;
    notifyRenderer({
      action: "restore",
      direction: "none",
      source: "restore",
    });
  }

  function setBackGuard(guard) {
    if (guard == null) {
      backGuard = null;
      return;
    }
    if (
      typeof guard !== "object"
      || typeof guard.canHandle !== "function"
      || typeof guard.run !== "function"
    ) {
      throw new TypeError("Back guard requires canHandle() and run()");
    }
    backGuard = guard;
  }

  function onSettled(listener) {
    if (typeof listener !== "function") throw new TypeError("onSettled() requires a function");
    settledListeners.add(listener);
    return () => settledListeners.delete(listener);
  }

  function createIosEdgeNavigationGuard() {
    const enabled = platformRuntime === window.MehPlatform?.RUNTIME?.IOS_PWA;
    const listenerOptions = { capture: true, passive: false };
    const state = {
      enabled,
      active: false,
      touchId: null,
      startX: 0,
      startY: 0,
      prevented: false,
      startedAt: 0,
    };

    function snapshot() {
      return { ...state };
    }

    function reset(eventName = "") {
      if (eventName) debug(eventName, snapshot());
      state.active = false;
      state.touchId = null;
      state.startX = 0;
      state.startY = 0;
      state.prevented = false;
      state.startedAt = 0;
    }

    function isInteractiveTarget(target) {
      return target instanceof Element && Boolean(target.closest(
        "input, textarea, select, button, a, [role='button'], [contenteditable], "
        + ".picker-field, .picker-hue-range, .range-input"
      ));
    }

    function prevent(event, eventName) {
      if (!event.cancelable) return false;
      event.preventDefault();
      state.prevented = true;
      debug(eventName, snapshot());
      return true;
    }

    function onTouchStart(event) {
      reset();
      if (!enabled || event.touches.length !== 1 || isInteractiveTarget(event.target)) return;
      const touch = event.touches[0];
      if (touch.clientX > 28) return;
      state.active = true;
      state.touchId = touch.identifier;
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.startedAt = performance.now();
      debug("ios-edge-guard-start", snapshot());
      prevent(event, "ios-edge-guard-prevent");
    }

    function onTouchMove(event) {
      if (!state.active) return;
      if (event.touches.length !== 1) {
        reset("ios-edge-guard-cancel");
        return;
      }
      const touch = Array.from(event.touches)
        .find((candidate) => candidate.identifier === state.touchId);
      if (!touch) {
        reset("ios-edge-guard-cancel");
        return;
      }
      prevent(event, "ios-edge-guard-prevent");
    }

    function onTouchEnd() {
      if (!state.active) return;
      reset("ios-edge-guard-end");
    }

    function onTouchCancel() {
      reset("ios-edge-guard-cancel");
    }

    if (enabled) {
      document.addEventListener("touchstart", onTouchStart, listenerOptions);
      document.addEventListener("touchmove", onTouchMove, listenerOptions);
      document.addEventListener("touchend", onTouchEnd, listenerOptions);
      document.addEventListener("touchcancel", onTouchCancel, listenerOptions);
    }

    return Object.freeze({
      get enabled() {
        return enabled;
      },
      reset,
      snapshot,
      listenerOptions: Object.freeze({ ...listenerOptions }),
    });
  }

  const iosEdgeNavigationGuard = createIosEdgeNavigationGuard();
  window.IosEdgeNavigationGuard = iosEdgeNavigationGuard;

  async function restoreSnapshot(snapshot, source) {
    const desired = snapshot.filter((descriptor) => (
      descriptor
      && typeof descriptor.id === "string"
      && itemTypes.has(descriptor.type)
      && Number.isInteger(descriptor.historyIndex)
    ));
    let shared = 0;
    while (
      shared < uiStack.length
      && shared < desired.length
      && uiStack[shared].id === desired[shared].id
    ) {
      shared += 1;
    }
    while (uiStack.length > shared) {
      const item = getTopItem();
      await closeItem(item, { source, canAnimate: false });
      removeClosedItem(item);
    }
    for (let index = shared; index < desired.length; index += 1) {
      let item;
      try {
        item = createItem(desired[index], true);
      } catch (error) {
        console.warn("[Meh] Ignoring invalid forward navigation snapshot:", error);
        break;
      }
      uiStack.push(item);
      debug("ui-stack-push", { item: serializeItem(item), restored: true });
      await callItemOpen(item, { source, canAnimate: false, restored: true });
    }
  }

  function handleExternalPopstate(state) {
    const previousCursor = cursor;
    const source = "browser-history";
    cursor = state.index;
    debug("history-popstate", {
      source,
      previousIndex: previousCursor,
      targetIndex: state.index,
    });
    uiOperationChain = uiOperationChain.then(async () => {
      if (state.index < previousCursor) {
        while (getTopItem() && getTopItem().historyIndex > state.index) {
          const item = getTopItem();
          await closeItem(item, { source, canAnimate: true });
          removeClosedItem(item);
        }
      } else {
        await restoreSnapshot(state.snapshot, source);
      }
      // Snapshot validation also removes non-index-correlated stale items.
      await restoreSnapshot(state.snapshot, source);
      notifyRenderer({
        action: "pop",
        direction: state.index < previousCursor ? "back" : "forward",
        source,
      });
      emitSettled({ source, handled: true });
    });
  }

  window.addEventListener("popstate", (event) => {
    if (!usesHistoryAdapter) {
      cursor = 0;
      iosEdgeNavigationGuard.reset("ios-edge-guard-unexpected-popstate");
      history.replaceState(historyState(0, null), "", sameDocumentUrl());
      debug("history-popstate", {
        source: "stack-only-root-normalized",
        keptStack: true,
      });
      window.dispatchEvent(new CustomEvent("meh:platform-history-normalized", {
        detail: { navigationMode, keptStack: true },
      }));
      emitSettled({
        source: "platform-history-normalized",
        handled: true,
        keptStack: true,
      });
      return;
    }
    if (!isCurrentSessionState(event.state)) {
      // Never traverse again in response to an old document session. The
      // current entry is normalized in place so it cannot become a ghost root.
      cursor = 0;
      history.replaceState(historyState(0, null), "", sameDocumentUrl());
      debug("history-popstate", { source: "foreign-session-normalized" });
      return;
    }
    if (acknowledgeTraversal(event.state)) return;
    handleExternalPopstate(event.state);
  });

  function initializeHistory() {
    cursor = 0;
    history.replaceState(historyState(0, null), "", sameDocumentUrl());
  }

  initializeHistory();
  window.addEventListener("pagehide", () => iosEdgeNavigationGuard.reset(
    "ios-edge-guard-pagehide"
  ));
  window.addEventListener("pageshow", () => iosEdgeNavigationGuard.reset(
    "ios-edge-guard-pageshow"
  ));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) iosEdgeNavigationGuard.reset("ios-edge-guard-hidden");
  });

  window.mehNavigationDebug = Object.freeze({
    export() {
      return cloneSerializable(debugEntries, []);
    },
    clear() {
      debugEntries.length = 0;
    },
  });

  const api = Object.freeze({
    pushItem,
    replaceItem,
    removeItem,
    requestBack,
    canGoBack,
    getTopItem,
    getStack,
    registerItemType,
    onSettled,
    open,
    back,
    replace,
    getState,
    setRenderer,
    setBackGuard,
    recordDebug: debug,
    navigationMode,
    usesHistoryAdapter,
    get sessionId() {
      return sessionId;
    },
    get isAlteringHistory() {
      return isAlteringHistory;
    },
    get pendingTraversalToken() {
      return pendingTraversalToken?.token || null;
    },
  });

  window.mehNavigation = api;
  window.MehNavigation = api;
})();
