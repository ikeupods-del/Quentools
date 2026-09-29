/* Wouf — configuration. Guide complet : wouf/docs/MAINTENANCE.md
   ► WOUF PLUS (achat unique à vie) : tout est GRATUIT tant que `billing.enabled` vaut false.
     Pour ouvrir la vente : suivre la checklist « Mise en vente » du guide, puis passer `enabled` à true (le test refuse si un prérequis manque).
     (config.js est toujours servi « réseau d'abord » : les appareils le voient dès leur prochaine ouverture.)
   Les données déjà saisies ne sont JAMAIS verrouillées ni supprimées : un utilisateur gratuit garde l'accès
   à tout ce qu'il a saisi, seuls les nouveaux ajouts « Plus » sont soumis à l'abonnement. */
window.WOUF_CONFIG = {
  appName: 'Wouf',
  version: '1.2.0',

  billing: {
    enabled: false,            // ← INTERRUPTEUR GLOBAL : false = tout est gratuit ; true = Wouf Plus devient payant
    freeUntil: null,           // ex. '2027-03-31' : offre de lancement, tout reste gratuit jusqu'à cette date même si enabled=true
    grandfatherBefore: null,   // ex. '2027-04-01' : les utilisateurs installés AVANT cette date gardent Plus…
    grandfatherUntil: 'lifetime', // …jusqu'à cette date ('2027-12-31') ou 'lifetime' (à vie)
    api: '',                   // URL du relais de paiement (voir wouf/billing-worker/). Vide = boutons de paiement désactivés
    // Achat unique « à vie ». Le prix AFFICHÉ ici doit être identique au prix Stripe (PRICE_LIFETIME) : c'est Stripe qui encaisse.
    plans: [{ id: 'lifetime', label: 'Wouf Plus à vie', price: '19,99 €', per: 'paiement unique', badge: 'Sans abonnement' }],
    limits: { perSpecies: 1, documents: 3 },     // formule gratuite : 1 chien + 1 chat, 3 documents
    // Fonctions réservées à Plus (quand enabled) — retirez une ligne pour la rendre gratuite
    premium: ['multiDogs', 'documents', 'report', 'calendar', 'stats', 'lessons', 'programs', 'tracker', 'bilan', 'sitter', 'weightplan']
  },

  // Assistance : le support prioritaire est réservé aux acheteurs de Wouf Plus (vérifié côté serveur).
  // Tant que le relais n'est pas configuré, le formulaire ouvre le mail de l'utilisateur vers `email`.
  support: {
    email: '',                       // ex. support@votre-domaine.fr  ← à renseigner avant la mise en vente
    priorityDelay: 'sous 24 h ouvrées',
    standardDelay: 'sous 5 jours ouvrés'
  },

  // Informations légales OBLIGATOIRES avant de faire payer (vendeur, mentions légales, CGV). À compléter puis à faire valider.
  legal: {
    seller: '',                      // nom ou raison sociale
    form: '',                        // ex. « Entrepreneur individuel (micro-entreprise) »
    address: '',
    siret: '',
    email: '',                       // contact du vendeur
    director: '',                    // directeur de la publication
    vat: 'TVA non applicable, art. 293 B du CGI',   // adaptez à votre situation
    mediator: '',                    // médiateur de la consommation (obligatoire pour vendre à des particuliers)
    refund: '',                      // ex. « Vous pouvez demander le remboursement sous 30 jours, sans justification. » (facultatif)
    shutdownNoticeDays: 90           // préavis avant arrêt du service (engagement à valider)
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
