/* Réglages du salon : à adapter pour chaque client. Tout le reste (prix, horaires, produits, options) se règle dans l'administration. */
window.BARBER_CONFIG = {
  name: 'Kings Ave Barber',
  tagline: 'Barbershop · Brooklyn style',
  address: '12 rue de la République, 00000 Ville',
  phone: '01 23 45 67 89',
  email: 'contact@exemple.fr',
  /* Code d'accès à l'administration. DÉMONSTRATION UNIQUEMENT : sur un vrai site, connexion Google + règles Firestore (voir README). */
  adminCode: 'kings',
  /* Envoi réel des e-mails : adresse d'un relais qui reçoit { to, subject, body } en POST JSON. Vide = e-mails simulés (visibles dans l'administration). */
  formEndpoint: '',
  demo: true
};
