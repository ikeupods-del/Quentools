/* Wouf — service worker : l'app s'ouvre sans réseau. Les données (carnet, documents) ne passent jamais par ici :
   elles restent dans le stockage de l'appareil. Seuls les fichiers de l'app sont mis en cache. */
const CACHE = 'wouf-v1.20';
const SHELL = ['./', './index.html', './style.css', './config.js', './data.js', './species.js', './core.js', './health.js', './screens.js', './sos.js', './nutrition.js', './croquettes.js', './lessons.js', './lessons2.js', './lessons_cat.js', './lessons3.js', './lessons_cat2.js', './lessons4.js', './lessons_cat3.js', './lessons5.js', './lessons_cat4.js', './lessons6.js', './lessons7.js', './lessons_cat5.js', './lessons_plans.js', './quiz.js', './quiz2.js', './quiz_chat.js', './educ.js', './parcours.js', './cloud.js', './tracker.js', './plusfeatures.js', './guide.js', './noms.js', './business.js', './admin.js', './extras.js', './testalim.js', './guides.js', './main.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // cartes, Overpass, paiement : jamais en cache
  // réseau d'abord, en revalidant toujours (no-cache : sinon GitHub Pages sert des fichiers périmés jusqu'à 10 min) ; cache si hors connexion
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l[0] ? l[0].focus() : clients.openWindow('./'))); });
