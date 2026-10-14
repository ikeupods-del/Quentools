/* Pack Commerçant — fiche du commerce. Générée par tools/pack-commercant.js pour chaque client ; ici : exemple fictif.
   firebase vide = mode démonstration (données dans le navigateur). Rempli = vraies données (Firestore du commerçant,
   règles à coller affichées dans l'administration, onglet Réglages). */
window.PACK = {
  demo: true,                                   // bandeau « exemple fictif » et accès à l'administration sans connexion
  nom: 'Atelier Lila',
  metier: 'onglerie et beauté des mains',
  ville: 'Nantes',
  accroche: 'Des mains soignées, sans attendre au téléphone.',
  couleur: '#b4436c',
  telephone: '06 00 00 00 00',
  email: 'contact@exemple.fr',
  adresse: '12 rue de l’Exemple, 44000 Nantes',
  // Horaires par jour (1 = lundi … 7 = dimanche), plages « HH:MM-HH:MM »
  horaires: { 2: ['09:30-12:30', '14:00-19:00'], 3: ['09:30-12:30', '14:00-19:00'], 4: ['09:30-12:30', '14:00-19:00'], 5: ['09:30-19:00'], 6: ['09:00-17:00'] },
  pas: 30,                                      // minutes entre deux créneaux
  delaiMin: 2,                                  // heures minimum avant un rendez-vous
  jours: 21,                                    // jours ouverts à la réservation
  prestations: [
    { id: 'semi', nom: 'Pose semi-permanent', duree: 60, prix: 35 },
    { id: 'gel', nom: 'Pose gel complète', duree: 90, prix: 55 },
    { id: 'remplissage', nom: 'Remplissage gel', duree: 60, prix: 40 },
    { id: 'soin', nom: 'Soin des mains', duree: 30, prix: 20 }
  ],
  // Acompte : montant fixe (€) ou pourcentage du prix ; lien = lien de paiement Stripe ou adresse paypal.me du commerçant
  acompte: { type: 'fixe', valeur: 10, lien: '' },
  annulation: 'Annulation gratuite jusqu’à 24 h avant. Passé ce délai, l’acompte reste acquis.',
  fidelite: { tampons: 8, recompense: 'un soin des mains offert' },
  avis: { lien: 'https://quentools.fr/demo/pack-commercant/' },   // lien « Laisser un avis » de la fiche Google (ici : adresse de démonstration)
  firebase: { apiKey: '', projectId: '', authDomain: '' }   // les adresses autorisées dans l'administration sont dans les règles Firestore (REGLES-FIRESTORE.txt)
};
