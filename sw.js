/* ==========================================================================
   SIZESU - Progressive Web App Service Worker
   Network-First caching with offline fallback for instant performance & Core Web Vitals.
   ========================================================================== */

const CACHE_NAME = 'sizesu-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './tools.css',
  './presetData.js',
  './imageProcessor.js',
  './cropEngine.js',
  './batchEngine.js',
  './aiEngine.js',
  './pdfEngine.js',
  './qrEngine.js',
  './seoData.js',
  './seoRouter.js',
  './blogEngine.js',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-First with Cache Fallback for fresh development and instant updates
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
