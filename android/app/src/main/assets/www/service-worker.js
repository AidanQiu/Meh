const CACHE_NAME = "meh-cache-v0.1.5";
const RUNTIME_CACHE_NAME = "meh-runtime-v0.1.5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=0.1.4",
  "./app.js?v=0.1.4",
  "./manifest.webmanifest",
  "./manifest-zh.webmanifest",
  "./manifest-meh.webmanifest",
  "./favicon.ico",
  "./fonts/material-symbols-rounded.woff2",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-1024.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![CACHE_NAME, RUNTIME_CACHE_NAME].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstForPage(request));
    return;
  }

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (isCoreShellAsset(url)) {
      event.respondWith(networkFirstForAsset(request));
      return;
    }

    event.respondWith(cacheFirst(request));
    return;
  }

  // Cross-origin runtime resources: update online, fall back to cache offline.
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstForPage(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put("./index.html", response.clone());
    }
    return response;
  } catch {
    return (await cache.match("./index.html")) || (await cache.match("./"));
  }
}

async function networkFirstForAsset(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(stripVersionParam(request)));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(request);
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

function isCoreShellAsset(url) {
  const path = url.pathname.split("/").pop();
  return path === "app.js" || path === "style.css" || path === "index.html" || path === "";
}

function stripVersionParam(request) {
  const url = new URL(request.url);
  url.searchParams.delete("v");
  return new Request(url.toString(), { cache: "reload" });
}
