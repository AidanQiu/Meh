(() => {
  "use strict";

  const buildMeta = document.querySelector('meta[name="meh-build"]');
  const CURRENT_BUILD = buildMeta?.content || "unknown";
  const CHECK_THROTTLE_MS = 5 * 60 * 1000;
  const PERIODIC_CHECK_MS = 30 * 60 * 1000;
  const RELOAD_GUARD_KEY = "meh-sw-reloaded-for-build";
  const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const IS_ANDROID_ASSET_HOST = location.hostname === "appassets.androidplatform.net";
  const canUseServiceWorker =
    "serviceWorker" in navigator &&
    !IS_ANDROID_ASSET_HOST &&
    (location.protocol === "https:" || LOCAL_HOSTS.has(location.hostname));

  let registration = null;
  let registrationPromise = null;
  let lastCheckAt = 0;
  let controllerChangeHandled = false;
  let lastStatus = "";

  function publishStatus(status, detail = {}) {
    lastStatus = status;
    window.dispatchEvent(new CustomEvent("meh:pwa-update-status", {
      detail: { status, build: CURRENT_BUILD, ...detail },
    }));
  }

  function askWaitingWorkerToActivate(worker = registration?.waiting) {
    if (!worker) return false;
    publishStatus("updating");
    worker.postMessage({ type: "SKIP_WAITING" });
    return true;
  }

  function watchInstallingWorker(worker) {
    if (!worker) return;
    publishStatus("updating");
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") {
        askWaitingWorkerToActivate(registration?.waiting || worker);
      }
    });
  }

  async function updateRegistration() {
    if (!registration) return;
    try {
      await registration.update();
      askWaitingWorkerToActivate();
    } catch (error) {
      console.warn("PWA update check failed:", error);
    }
  }

  async function fetchRemoteVersion() {
    const response = await fetch(`./version.json?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Version check returned ${response.status}`);
    return response.json();
  }

  async function checkForUpdates({ manual = false, force = false, skipRegistrationUpdate = false } = {}) {
    if (!canUseServiceWorker) {
      if (manual) publishStatus(navigator.onLine === false ? "offline" : "unavailable");
      return { status: "unavailable" };
    }

    const now = Date.now();
    if (!force && now - lastCheckAt < CHECK_THROTTLE_MS) {
      return { status: "throttled" };
    }
    lastCheckAt = now;

    if (navigator.onLine === false) {
      if (manual) publishStatus("offline");
      return { status: "offline" };
    }

    try {
      if (!registration) registration = await registrationPromise;
      if (!registration) throw new Error("Service worker registration is unavailable");
      const remote = await fetchRemoteVersion();
      const isNewBuild = typeof remote.build === "string" && remote.build !== CURRENT_BUILD;
      if (isNewBuild) publishStatus("updating", { remoteBuild: remote.build });

      if (!skipRegistrationUpdate) await updateRegistration();
      if (askWaitingWorkerToActivate()) {
        return { status: "updating", remote };
      }

      if (registration.installing) {
        publishStatus("updating", { remoteBuild: remote.build });
        return { status: "updating", remote };
      }

      if (isNewBuild) {
        return { status: "updating", remote };
      }

      if (manual) publishStatus("latest");
      return { status: "latest", remote };
    } catch (error) {
      if (manual) publishStatus(navigator.onLine === false ? "offline" : "error");
      console.warn("PWA version check failed; continuing with the current offline version:", error);
      return { status: "error", error };
    }
  }

  if (!canUseServiceWorker) {
    window.MehPwaUpdate = {
      checkForUpdates,
      currentBuild: CURRENT_BUILD,
      get status() { return lastStatus; },
    };
    return;
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (controllerChangeHandled) return;
    controllerChangeHandled = true;

    try {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === CURRENT_BUILD) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, CURRENT_BUILD);
    } catch {
      // The in-memory guard above still prevents repeated reloads in this page.
    }

    location.reload();
  });

  registrationPromise = navigator.serviceWorker
    .register(`./service-worker.js?v=${encodeURIComponent(CURRENT_BUILD)}`, {
      scope: "./",
      updateViaCache: "none",
    })
    .then((registered) => {
      registration = registered;
      registered.addEventListener("updatefound", () => watchInstallingWorker(registered.installing));
      if (registered.installing) watchInstallingWorker(registered.installing);
      askWaitingWorkerToActivate(registered.waiting);
      return registered;
    })
    .catch((error) => {
      console.warn("Service worker registration failed; the app will continue without updates:", error);
      return null;
    });

  window.MehPwaUpdate = {
    checkForUpdates,
    currentBuild: CURRENT_BUILD,
    get status() { return lastStatus; },
  };

  registrationPromise.then(async () => {
    await updateRegistration();
    await checkForUpdates({ force: true, skipRegistrationUpdate: true });
  });
  window.addEventListener("pageshow", () => checkForUpdates());
  window.addEventListener("focus", () => checkForUpdates());
  window.addEventListener("online", () => checkForUpdates());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdates();
  });
  window.setInterval(() => checkForUpdates(), PERIODIC_CHECK_MS);
})();
