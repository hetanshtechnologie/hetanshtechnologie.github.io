const CACHE = 'ffmax-v1';
const ASSETS = [
  '/android/games/freefiremax/',
  '/android/games/freefiremax/index.html',
  '/android/games/freefiremax/css/style.css',
  '/android/games/freefiremax/js/game.js',
  '/android/games/freefiremax/icons/icon-192.png',
  '/android/games/freefiremax/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
