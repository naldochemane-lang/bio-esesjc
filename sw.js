/* ══════════════════════════════════════════════════════════════
   ESESJC — Service Worker  (v1.0)
   Cache-first para assets, Network-first para API/Firebase
══════════════════════════════════════════════════════════════ */

var CACHE_NAME = 'esesjc-v1';

/* Ficheiros a pré-cachear na instalação */
var PRECACHE = [
  './',
  './index.html',
  './manifest.json'
];

/* ── Instalar ───────────────────────────────────────────────── */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* ── Activar (limpar caches antigas) ────────────────────────── */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ── Fetch: Network-first para Firebase/APIs, Cache-first resto ─ */
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  /* Requisições Firebase e googleapis → sempre rede */
  if (url.includes('firebase') ||
      url.includes('googleapis') ||
      url.includes('gstatic') ||
      url.includes('cloudflare')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response('', { status: 503 });
      })
    );
    return;
  }

  /* Tudo o resto: Cache-first com fallback para rede */
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
