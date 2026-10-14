/* QuenTools — nettoyage de l'ancien mode hors connexion de Wouf, qui vivait à la racine du site avant son déménagement vers wouf/ puis woufapp.fr.
   Les navigateurs qui l'avaient installé continuaient d'afficher l'ancienne page à la place de l'accueil QuenTools. Ce fichier le remplace :
   il efface ses copies (caches « wouf… »), se désinscrit et recharge les pages ouvertes. Les données saisies dans Wouf (stockage local) ne sont pas touchées.
   Aucune page ne l'enregistre : seul le navigateur le récupère en vérifiant la mise à jour de l'ancien service. Ne pas supprimer. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => /^wouf/i.test(k)).map(k => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(c => { try { c.navigate(c.url); } catch (err) { /* onglet fermé */ } });
  })());
});
