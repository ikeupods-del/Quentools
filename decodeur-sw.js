/* Paperdecrypt : mode hors connexion. Page : réseau d'abord (les mises à jour arrivent tout de suite), copie locale si pas de réseau.
   Icônes : copie locale d'abord. Rien d'autre n'est mis en cache : jamais de données personnelles, de courrier ni de fiche de paie.
   Pour forcer une mise à jour de ce cache, changer VERSION. */
const VERSION = 'paperdecrypt-1';
const PAGE = new URL('decodeur-courrier.html', self.location.href).pathname;
const SHELL = [PAGE, new URL('decodeur.webmanifest', self.location.href).pathname,
  ...['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'].map(n => new URL('assets/paperdecrypt/' + n, self.location.href).pathname)];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('paperdecrypt-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;   // services externes (Firebase, polices, lecture optique…) : jamais interceptés
  if (r.mode === 'navigate' && u.pathname === PAGE) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(PAGE, copy)); } return res; }).catch(() => caches.match(PAGE)));
    return;
  }
  if (SHELL.includes(u.pathname)) e.respondWith(caches.match(r).then(hit => hit || fetch(r)));
});
