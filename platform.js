(() => {
  "use strict";

  const root = document.documentElement;
  const RUNTIME = Object.freeze({
    BROWSER: "platform-browser",
    IOS_PWA: "platform-ios-pwa",
    ANDROID_APP: "platform-android-app",
  });

  const standalone = Boolean(
    window.matchMedia?.("(display-mode: standalone)").matches
    || navigator.standalone === true
  );
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const androidApp = Boolean(window.MehAndroid?.getSafeAreaInsets);
  const current = androidApp
    ? RUNTIME.ANDROID_APP
    : ios && standalone
      ? RUNTIME.IOS_PWA
      : RUNTIME.BROWSER;

  function applyRuntimeClass() {
    root.classList.remove(...Object.values(RUNTIME));
    root.classList.add(current);
    root.dataset.runtime = current;
  }

  function applyAndroidInsets(insets = {}) {
    if (current !== RUNTIME.ANDROID_APP) return false;
    for (const side of ["top", "right", "bottom", "left"]) {
      const value = Number(insets[side]);
      root.style.setProperty(`--android-inset-${side}`, `${Number.isFinite(value) ? value : 0}px`);
    }
    window.dispatchEvent(new CustomEvent("meh:native-insets", { detail: insets }));
    return true;
  }

  function readNativeInsets() {
    if (current !== RUNTIME.ANDROID_APP) return;
    try {
      applyAndroidInsets(JSON.parse(window.MehAndroid.getSafeAreaInsets()));
    } catch (error) {
      console.warn("[Meh] Native safe-area bootstrap failed:", error);
    }
  }

  applyRuntimeClass();
  readNativeInsets();

  window.MehPlatform = Object.freeze({
    RUNTIME,
    current,
    standalone,
    ios,
    androidApp,
    is(runtime) {
      return root.classList.contains(runtime);
    },
    applyAndroidInsets,
    snapshot() {
      return { current, standalone, ios, androidApp };
    },
  });
})();
