const SW_VERSION = "1.1.1-pwa-r24";
const CACHE_NAME = `meh-shell-${SW_VERSION}`;
const RUNTIME_CACHE_NAME = `meh-runtime-${SW_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  `./style.css?v=${SW_VERSION}`,
  `./app.js?v=${SW_VERSION}`,
  `./pwa-update.js?v=${SW_VERSION}`,
];

const OPTIONAL_ASSETS = [
  `./manifest.webmanifest?v=${SW_VERSION}`,
  `./manifest-meh.webmanifest?v=${SW_VERSION}`,
  `./manifest-zh.webmanifest?v=${SW_VERSION}`,
  `./favicon.ico?v=${SW_VERSION}`,
  `./fonts/material-symbols-rounded.woff2?v=${SW_VERSION}`,
  `./icons/meh_icon.png?v=${SW_VERSION}`,
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })));
    await Promise.allSettled(
      OPTIONAL_ASSETS.map((url) => cache.add(new Request(url, { cache: "reload" })))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "SW_VERSION", version: SW_VERSION });
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("meh-") && ![CACHE_NAME, RUNTIME_CACHE_NAME].includes(key))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(new Request(request, { cache: "no-store" })).catch(() =>
      new Response(JSON.stringify({ error: "offline" }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      })
    ));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstForPage(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirstForAsset(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstForPage(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    // Navigation HTML carries the viewport and Apple standalone metadata.
    // Force an origin revalidation before falling back to the versioned shell.
    const response = await fetch(new Request(request, { cache: "reload" }));
    if (response?.ok) await cache.put("./index.html", response.clone());
    return response;
  } catch {
    return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
  }
}

async function networkFirstForAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response?.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}
