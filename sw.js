/* Pluto TV — Service Worker (PWA) */

const CACHE_NAME = 'pluto-tv-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/api.js',
  './js/storage.js',
  './js/player.js',
  './js/router.js',
  './js/app.js',
  './js/remote.js',
  './js/pages/home.js',
  './js/pages/movies.js',
  './js/pages/series.js',
  './js/pages/search.js',
  './js/pages/favorites.js',
  './js/pages/settings.js',
  './js/pages/detail.js',
  './js/pages/shared.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] cache failed:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Network-first for HTML, cache-first for static assets
  const url = e.request.url;

  if (e.request.method !== 'GET') return;

  // Skip API calls (never cache them in SW)
  if (url.includes('server-hi-speed-iran.info') ||
      url.includes('hostinnegar.com') ||
      url.includes('windowsdiba.info')) {
    return; // Let fetch handle it
  }

  // Skip CDN (video.js, fonts)
  if (url.includes('cdn.jsdelivr') || url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Local assets: stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
