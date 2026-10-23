/**
 * GaneshAI service worker.
 * Same-origin shell only. YouTube, thumbnails, and other third parties are never intercepted.
 * HTML, CSS, and JS stay network-first so a published update is not stuck behind the cache.
 */

import { CACHE_NAME, SHELL_ASSETS, classifyFetch } from "./radio-core.js";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request)
      || (request.mode === "navigate"
        ? await cache.match("./index.html") || await cache.match("./")
        : null);
    if (cached) return cached;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const decision = classifyFetch({
    requestUrl: event.request.url,
    method: event.request.method,
    pageOrigin: self.location.origin,
  });
  if (decision === "bypass") return;
  event.respondWith(decision === "cache-first" ? cacheFirst(event.request) : networkFirst(event.request));
});
