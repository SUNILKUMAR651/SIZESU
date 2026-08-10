/* ==========================================================================
   SIZESU - Progressive Web App Service Worker
   Offline caching for instant performance & Core Web Vitals optimization.
   ========================================================================== */

const CACHE_NAME = 'sizesu-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/tools.css',
  './js/presetData.js',
  './js/imageProcessor.js',
  './js/cropEngine.js',
  './js/batchEngine.js',
  './js/aiEngine.js',
  './js/pdfEngine.js',
  './js/qrEngine.js',
  './js/seoData.js',
  './js/seoRouter.js',
  './js/blogEngine.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Robust individual asset caching so single asset failures don't block SW installation
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('SW Asset caching skipped:', asset);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for stale-while-revalidate
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
