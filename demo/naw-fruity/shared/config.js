/* Réglages de la boutique : à adapter. Prix, plateaux, capacité, créneaux, zones et options se règlent dans l'administration. */
window.NF_CONFIG = {
  name: 'Naw Fruity',
  tagline: 'Plateaux de fruits frais',
  address: '14 rue des Halles, 00000 Ville',
  phone: '06 00 00 00 00',
  email: 'contact@exemple.fr',
  /* Code d'accès à l'administration. DÉMONSTRATION UNIQUEMENT : sur un vrai site, connexion Google + règles Firestore. */
  adminCode: 'fruity',
  /* Envoi réel des e-mails : relais qui reçoit { to, subject, body } en POST JSON. Vide = e-mails simulés (visibles dans l'administration). */
  formEndpoint: '',
  demo: true
};
