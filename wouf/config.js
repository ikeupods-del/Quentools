/* Wouf — configuration. Guide complet : wouf/docs/MAINTENANCE.md
   ► WOUF PLUS (achat unique à vie) : tout est GRATUIT tant que `billing.enabled` vaut false.
     Pour ouvrir la vente : suivre la checklist « Mise en vente » du guide, puis passer `enabled` à true (le test refuse si un prérequis manque).
     (config.js est toujours servi « réseau d'abord » : les appareils le voient dès leur prochaine ouverture.)
   Les données déjà saisies ne sont JAMAIS verrouillées ni supprimées : un utilisateur gratuit garde l'accès
   à tout ce qu'il a saisi, seuls les nouveaux ajouts « Plus » sont soumis à l'abonnement. */
window.WOUF_CONFIG = {
  appName: 'Wouf',
  version: '1.21.2',

  billing: {
    enabled: false,            // ← INTERRUPTEUR GLOBAL : false = tout est gratuit ; true = Wouf Plus devient payant
    freeUntil: null,           // ex. '2027-03-31' : offre de lancement, tout reste gratuit jusqu'à cette date même si enabled=true
    grandfatherBefore: null,   // ex. '2027-04-01' : les utilisateurs installés AVANT cette date gardent Plus…
    grandfatherUntil: 'lifetime', // …jusqu'à cette date ('2027-12-31') ou 'lifetime' (à vie)
    // Paiement par lien PayPal (compte professionnel → Liens et boutons de paiement). Avant de payer, l'acheteur remplit un
    // dossier (nom, prénom, e-mail PayPal) ; le propriétaire vérifie le paiement et active Wouf Plus dans Plus → Administration.
    // Les liens et les informations légales se règlent aussi depuis l'administration (« Paiement et informations légales »).
    api: '',                   // relais d'activation automatique (voir wouf/billing-worker) : réglable dans l'administration ; vide = validation manuelle
    payee: '',                 // adresse e-mail PayPal qui reçoit les paiements (réglable à tout moment dans l'administration)
    paymentLink: '',           // lien PayPal fixe (secours, utilisé seulement si aucune adresse payee ; montant = plans[0].price). L'ancien lien à 19,99 € a été retiré au changement de prix.
    rewardLink: '',            // idem pour l'offre récompense (rewardOffer.price) ; vide = pas d'offre récompense
    // Achat unique « à vie ». Le prix AFFICHÉ ici doit être identique au montant du lien PayPal.
    plans: [{ id: 'lifetime', label: 'Wouf Plus à vie', price: '29,99 €', per: 'paiement unique', badge: 'Sans abonnement' }],
    // Abonnement ANNUEL proposé à côté de l'achat à vie (PayPal, reconduit chaque année, résiliable à tout moment depuis l'app).
    // Nécessite l'adresse PayPal `payee` (compte professionnel) ; activation et renouvellements automatiques avec le relais `api`.
    // Le prix doit être ≥ MIN_YEAR_EUR du relais (14.99 par défaut). enabled: false = seulement l'achat à vie. Guide : MAINTENANCE, « Abonnement annuel ».
    yearly: { enabled: true, label: 'Wouf Plus annuel', price: '14,99 €', per: 'par an' },
    trialDays: 7,              // essai gratuit de Wouf Plus (jours, une fois par carnet), proposé quand la vente est ouverte ; 0 = pas d'essai
    // Moyen de paiement proposé : 'paypal', 'stripe' ou 'both' (les deux, au choix de l'acheteur). Réglable dans Plus → Administration.
    provider: 'both',
    // Stripe : liens de paiement (Stripe → Liens de paiement), montants identiques aux prix ci-dessus ; portail client pour résilier seul.
    // Liens publics par conception, aucune clé secrète. Activation dans l'administration après vérification dans Stripe.
    stripe: { lifetimeLink: 'https://buy.stripe.com/14A3cv5Es3WodA04kU6c001', yearlyLink: 'https://buy.stripe.com/4gM9AT9UIfF68fG8Ba6c000', portal: '' },
    // Offre récompense : quand TOUTES les leçons gratuites sont terminées (quiz compris), Wouf Plus passe à ce prix.
    // Doit être égal au montant du lien PayPal rewardLink. enabled: false = pas d'offre.
    rewardOffer: { enabled: false, price: '9,99 €' },
    limits: { perSpecies: 1, documents: 3 },     // formule gratuite : 1 chien + 1 chat, 3 documents
    // Fonctions réservées à Plus (quand enabled) — retirez une ligne pour la rendre gratuite
    premium: ['multiDogs', 'documents', 'report', 'calendar', 'stats', 'lessons', 'programs', 'tracker', 'bilan', 'sitter', 'weightplan', 'weather', 'guides']
  },

  // Assistance : le support prioritaire est réservé aux acheteurs de Wouf Plus (vérifié côté serveur).
  // Tant que le relais n'est pas configuré, le formulaire ouvre le mail de l'utilisateur vers `email`.
  // Adresse officielle de Wouf (dépôt de publication ikeupods-del/woufapp). `moved: true` = l'ancienne adresse
  // (ikeupods-del.github.io/Quentools/wouf/) renvoie vers `home` ; ceux qui y ont un carnet peuvent le transférer.
  site: { home: 'https://woufapp.fr/', moved: false },

  // Statistiques anonymes (GoatCounter : sans cookie, sans identifiant, sans aucune donnée saisie).
  // Seuls le nom de l'écran ouvert et quelques actions (animal ajouté, leçon acquise, balade…) sont comptés.
  // Mettre le code du compte GoatCounter (ex. 'wouf' pour https://wouf.goatcounter.com). Vide = aucune mesure.
  stats: { goatcounter: 'woufapp' },
  // Compte(s) Google du propriétaire (empreinte SHA-256 de l'adresse en minuscules, jamais l'adresse elle-même) :
  // connecté avec l'un d'eux, on voit « Mes statistiques » dans Plus et ses visites ne sont pas comptées.
  ownerHashes: ['5551fc3e72a62b8fa55d701333c1151c37c9f61e98d805ad7cbba408e313817e'],   // tableau de bord : https://woufapp.goatcounter.com

  support: {
    replyUrl: 'https://mail.proton.me/compose?mailto=%s', // « Répondre » dans l'administration ouvre Proton Mail (%s = lien mailto: du client) ; vide = messagerie du téléphone
    email: 'wouf-contact@proton.me', // adresse qui reçoit le formulaire de contact (modifiable dans l'administration : « E-mail d'assistance »)
    priorityDelay: 'sous 24 h ouvrées',
    standardDelay: 'sous 5 jours ouvrés'
  },

  // Informations légales OBLIGATOIRES avant de faire payer (vendeur, mentions légales, CGV). À compléter puis à faire valider.
  legal: {
    seller: '',                      // nom ou raison sociale
    form: '',                        // ex. « Entrepreneur individuel (micro-entreprise) »
    address: '',
    siret: '',
    email: 'wouf-contact@proton.me', // contact du vendeur (mentions légales, conditions de vente) ; modifiable dans l'administration
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

  // Bouton « Faire un don » : ouvre directement la page de don de l'association (Wouf ne touche rien et n'encaisse rien).
  // Si la campagne change, mettez ici la nouvelle adresse de la page de don de l'association.
  donation: {
    name: 'la SPA',
    url: 'https://soutenir.la-spa.fr/P_StopAbandon2026_site/~mon-don',   // page de don indiquée par le propriétaire (campagne « Stop abandon 2026 »)
    text: 'La SPA recueille, soigne et fait adopter des animaux abandonnés ou maltraités.'
  },

  contactEmail: ''
};
