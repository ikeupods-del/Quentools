/* Wouf — configuration.
   ► ABONNEMENT : tout est GRATUIT tant que `billing.enabled` vaut false.
     Pour activer l'abonnement Plus un jour : passer `enabled` à true, commit, push. C'est tout.
     (config.js est toujours servi « réseau d'abord » : les appareils le voient dès leur prochaine ouverture.)
   Les données déjà saisies ne sont JAMAIS verrouillées ni supprimées : un utilisateur gratuit garde l'accès
   à tout ce qu'il a saisi, seuls les nouveaux ajouts « Plus » sont soumis à l'abonnement. */
window.WOUF_CONFIG = {
  appName: 'Wouf',
  version: '1.1.0',

  billing: {
    enabled: false,            // ← INTERRUPTEUR GLOBAL de l'abonnement
    freeUntil: null,           // ex. '2027-03-31' : offre de lancement, tout reste gratuit jusqu'à cette date même si enabled=true
    grandfatherBefore: null,   // ex. '2027-04-01' : les utilisateurs installés AVANT cette date gardent Plus…
    grandfatherUntil: 'lifetime', // …jusqu'à cette date ('2027-12-31') ou 'lifetime' (à vie)
    api: '',                   // URL du relais Stripe (voir wouf/billing-worker/worker.js). Vide = boutons de paiement désactivés
    plans: [
      { id: 'monthly', label: 'Mensuel', price: '2,99 €', per: 'mois' },
      { id: 'yearly',  label: 'Annuel',  price: '24,99 €', per: 'an', badge: '−30 %' }
    ],
    limits: { dogs: 1, documents: 3 },                       // limites de la formule gratuite (si enabled)
    premium: ['multiDogs', 'documents', 'report', 'calendar', 'stats', 'lessons', 'programs']  // fonctions réservées à Plus (si enabled)
  },

  // Connexion Google + sauvegarde automatique (même projet Firebase que les autres apps QuenTools).
  // Clés publiques par conception : la sécurité vient des règles Firestore (users/{uid}/apps/**).
  firebase: {
    apiKey: "AIzaSyA-JS7hnSQXeNXnAPqbF3MV8rkPQ5_JVY8",
    authDomain: "quentools-adca1.firebaseapp.com",
    projectId: "quentools-adca1",
    storageBucket: "quentools-adca1.firebasestorage.app",
    messagingSenderId: "55024741286",
    appId: "1:55024741286:web:957475540e24ed223b7d67"
  },

  // Liens partenaires (affiliation) : { santevet: 'https://…' }. Quand un lien existe, il remplace la recherche
  // neutre et l'app affiche la mention « lien partenaire ».
  affiliates: {},

  contactEmail: ''
};
