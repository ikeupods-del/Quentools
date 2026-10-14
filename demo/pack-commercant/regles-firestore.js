/* Pack Commerçant — règles de sécurité Firestore à coller dans la console Firebase du commerçant (Firestore → Règles).
   Le public peut seulement : voir les créneaux pris (sans nom), réserver un créneau libre, créer et lire sa propre carte (identifiant secret).
   Seules les adresses e-mail listées (connexion Google) lisent les rendez-vous et modifient les cartes. */
(() => {
  function regles(emails) {
    const liste = (emails || []).map(e => `'${String(e).trim().toLowerCase().replace(/'/g, '')}'`).join(', ') || "'adresse@exemple.fr'";
    return `rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function admin() {
      return request.auth != null && request.auth.token.email_verified == true
        && request.auth.token.email.lower() in [${liste}];
    }
    function texte(v, n) { return v is string && v.size() <= n; }

    match /creneaux/{id} {
      allow get, list: if true;
      allow create: if request.resource.data.keys().hasOnly(['date', 'heure', 'rdv'])
        && texte(request.resource.data.date, 10) && texte(request.resource.data.heure, 5) && texte(request.resource.data.rdv, 20);
      allow delete: if admin();
    }
    match /rdv/{id} {
      allow create: if request.resource.data.keys().hasOnly(['prestationId', 'prestation', 'prix', 'duree', 'date', 'heure', 'nom', 'tel', 'email', 'note', 'acompte', 'acompteRecu', 'statut', 'at'])
        && request.resource.data.statut == 'attente' && request.resource.data.acompteRecu == false
        && request.resource.data.prix is number && request.resource.data.duree is int && request.resource.data.acompte is number
        && texte(request.resource.data.nom, 80) && texte(request.resource.data.tel, 20) && texte(request.resource.data.email, 120)
        && texte(request.resource.data.note, 300) && texte(request.resource.data.prestation, 120) && texte(request.resource.data.date, 10) && texte(request.resource.data.heure, 5)
        && existsAfter(/databases/$(db)/documents/creneaux/$(request.resource.data.date + '_' + request.resource.data.heure.replace(':', '')));
      allow read, update, delete: if admin();
    }
    match /cartes/{id} {
      allow get: if true;
      allow create: if id.size() >= 16 && request.resource.data.keys().hasOnly(['prenom', 'tampons', 'recompenses', 'at'])
        && request.resource.data.tampons == 0 && request.resource.data.recompenses == 0 && texte(request.resource.data.prenom, 40);
      allow list, update, delete: if admin();
    }
  }
}
`;
  }
  if (typeof module !== 'undefined') module.exports = regles; else window.PACK_REGLES = regles;
})();
