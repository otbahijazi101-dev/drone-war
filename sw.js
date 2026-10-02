const CACHE_NAME = 'drone-war-offline-v2';
const CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/vercel.json',
  '/game.part1.txt',
  '/game.part2.txt',
  '/game.part3.txt',
  '/game.part4.txt',
  '/game.part5.txt',
  '/game.part6.txt',
  '/game.part7.txt'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('drone-war-offline-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put('/index.html', fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match('/index.html')) || (await caches.match('/'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const fresh = await fetch(event.request);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});