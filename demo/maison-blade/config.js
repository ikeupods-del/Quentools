/* Réglages du salon : à adapter pour chaque client. Prix, horaires, barbiers, produits et options se règlent dans l'administration. */
window.BARBER_CONFIG = {
  name: 'Maison Blade',
  tagline: 'Barbier · Salon privé',
  address: '12 rue du Faubourg, 75008 Paris',
  phone: '01 00 00 00 00',
  email: 'contact@exemple.fr',
  /* Code d'accès à l'administration. DÉMONSTRATION UNIQUEMENT : sur un vrai site, connexion Google + règles Firestore. */
  adminCode: 'maison',
  /* Envoi réel des e-mails : adresse d'un relais qui reçoit { to, subject, body } en POST JSON. Vide = e-mails simulés (visibles dans l'administration). */
  formEndpoint: '',
  demo: true
};
