// Offline support: the app shell is cached on install; the sound model and photos are cached the first time they load.
const SHELL = 'shell-v25', RUNTIME = 'runtime-v1', SPRITES = 'sprites-v3';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'js/app.js', 'js/api.js', 'js/bird.js', 'js/data.js', 'js/match.js', 'js/sound.js', 'js/store.js', 'js/card.js', 'js/map.js', 'js/forecast.js', 'js/looks.js', 'js/sprites.js', 'js/songid.js', 'js/lite.js', 'js/photo.js', 'js/marks.js', 'vendor/litert/index.js', 'icons/icon-192.png', 'icons/icon-180.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== RUNTIME && k !== SPRITES).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Live data always goes to the network.
  if (u.hostname === 'api.ebird.org' || u.hostname === 'api.inaturalist.org') return;
  const heavy = u.pathname.includes('/models/') || u.pathname.includes('/vendor/') || /inaturalist|fonts\.(googleapis|gstatic)/.test(u.hostname);
  // Bird sprites rarely change: cache first (bump SPRITES to refresh them).
  const sprite = u.origin === location.origin && u.pathname.includes('/img/birds/');
  if (heavy || sprite) {
    e.respondWith(caches.open(sprite ? SPRITES : RUNTIME).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok || r.type === 'opaque') c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  if (u.origin === location.origin) {
    // App files: network first so updates arrive, but on a weak signal fall back to the cached copy after 1.5 s
    // (the network copy still lands in the cache for next time).
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const cl = r.clone(); caches.open(SHELL).then(c => c.put(e.request, cl)); } return r; });
    const cachedCopy = () => caches.match(e.request).then(r => r || caches.match('index.html'));
    e.respondWith(Promise.race([net, new Promise(ok => setTimeout(ok, 1500))]).then(r => r || cachedCopy().then(c => c || net)).catch(cachedCopy));
    e.waitUntil(net.catch(() => {}));
  }
});
