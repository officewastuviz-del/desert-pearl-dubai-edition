"use strict";

const CACHE_VERSION = "dubai-edition-property-shell-v8";
const CORE_ASSETS = [
  "./index.html",
  "./vision.html",
  "./residences.html",
  "./amenities.html",
  "./gallery.html",
  "./experience.html",
  "./dubai-theme.css?v=2.1.0",
  "./dubai-template.js?v=2.1.0",
  "./ambient-audio.css?v=1.0.0",
  "./ambient-audio.js?v=1.0.0",
  "./tour-360.html",
  "./tour-360.css?v=2.0.1",
  "./tour-360.js?v=2.1.0",
  "./ar.html",
  "./ar-preview.css?v=3.0.1",
  "./ar-preview.js?v=3.0.1",
  "./manifest.webmanifest?v=2.0.0",
  "./config/property-config.js",
  "./media/images/property-logo.svg",
  "./media/images/dubai/01-exterior-aerial-golden-hour.png",
  "./media/images/dubai/ar-video-cover.jpg",
  "./media/music/ambient.m4a"
];

const coreAssetUrls = new Set(CORE_ASSETS.map((path) => new URL(path, self.registration.scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isPublicAppNavigation(url) {
  const path = url.pathname.toLowerCase();
  return path.endsWith("/") || path.endsWith(".html") || path.endsWith("/index.php");
}

self.addEventListener("fetch", (event) => {
  const {request} = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (!isPublicAppNavigation(url)) return;
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (!coreAssetUrls.has(request.url)) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
