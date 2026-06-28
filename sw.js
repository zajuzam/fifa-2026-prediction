// FIFA 2026 Score Prediction — Service Worker
const CACHE_NAME = 'fifa2026-v2';

const STATIC_ASSETS = [
  '/FIFA2026_Prediction.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: wipe old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   HTML files      → network-first (always get latest deployed version)
//   Images/manifest → cache-first   (rarely change, fast load)
//   Everything else → network-first (Supabase, CDNs, cross-origin)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname === '/';
  const isAsset = url.pathname.endsWith('.png') || url.pathname.endsWith('.json');

  // Cross-origin always goes straight to network
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isHTML) {
    // Network-first for HTML — ensures new deployments are picked up immediately
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)) // offline fallback
    );
    return;
  }

  if (isAsset) {
    // Cache-first for icons and manifest
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network
  event.respondWith(fetch(event.request));
});
