/* Infikit — service worker : l'app s'ouvre même sans réseau pendant la tournée.
   Les données (patients, ordonnances) ne passent jamais par ici : elles restent
   dans le stockage du téléphone. Seuls les fichiers de l'app sont mis en cache. */
const CACHE = 'infikit-v1.5';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './fonts/atkinson-400-latin.woff2', './fonts/atkinson-700-latin.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return; // API Google / GitHub : jamais en cache
  if (req.mode === 'navigate' || /\/(index\.html|config\.js)?$/.test(url.pathname)) {
    // réseau d'abord (mises à jour immédiates), cache si hors connexion
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req.mode === 'navigate' ? './index.html' : req, c)); return r; })
      .catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; })));
});
