# Patrimoine AI et plan d'affaires : pistes d'évolution (18 octobre 2026)

Document de réflexion, à valider par le propriétaire. Aucun prix n'est publié : les montants cités sont des hypothèses de travail. Les chiffres de marché sont des ordres de grandeur issus de recherches publiques (sources en bas), souvent déclarés par les sociétés elles-mêmes.

## 1. Où en est Patrimoine AI
- Application web installable + application Mac (même code), version 6.3 : patrimoine net, budget réel (relevés CSV/OFX/QIF), rendement réel (TRI), simulateurs (retraite, fiscalité, succession, IFI, crédit), coffre à documents chiffré, IA locale du Mac, liaison bancaire Boursorama (Enable Banking), rappels de paiement (Bricks, BienPrêter).
- Atouts réels : données chiffrées sur l'appareil, IA qui tourne sans Internet, aucune commission ni revente de données, fiscalité française, suivi des plateformes de crowdlending et d'immobilier fractionné que les grands outils couvrent mal.
- Points faibles : pas de modèle de revenus défini, application Mac signée « ad hoc » (le clic droit → Ouvrir au premier lancement freine une vente), un seul compte bancaire relié (Boursorama), PEA et compte-titres non reliés (limite de la DSP2), un fichier `index.html` de plus de 3 600 lignes (maintenance), aucune audience propre pour l'instant.

## 2. Le marché en bref
- Finary (acteur principal en France) annonce environ 850 000 utilisateurs, environ 10 M€ de revenu récurrent annuel et une levée de 25 M€ en septembre 2025 ; son offre payante « Plus » est citée autour de 150 €/an (à confirmer sur sa page officielle). Il vend aussi des produits (crypto, assurance-vie) : son modèle n'est plus uniquement l'abonnement.
- Bankin' et Linxo sont orientés comptes courants et budget, pas investissement.
- Repères de conversion « gratuit vers payant » : 2 à 8 % selon les sources, essai avec carte bancaire nettement meilleur qu'essai sans carte (ordre de 50 % contre 20 %). Aucun repère solide pour les applications « données sur l'appareil ».
- Exemple de concurrent minuscule mais comparable : une application de finances personnelles « sans compte » vendue 34,99 € en paiement unique (déclaration de son auteur, non vérifiée).

Conclusion : inutile de concurrencer Finary sur la largeur. La place libre est « l'outil de patrimoine privé, sans pub, sans revente de données, qui comprend la fiscalité française et les plateformes de niche ».

## 3. Priorités proposées pour Patrimoine AI (classées)
| # | Piste | Effet attendu | Effort |
|---|---|---|---|
| 1 | **Signature Apple officielle de l'application Mac** (compte développeur, environ 99 $ par an, à vérifier) : plus de message d'avertissement au premier lancement | Indispensable avant toute vente ; moins d'abandons à l'installation | Faible (workflow à adapter) |
| 2 | **Choisir le modèle de revenus** : gratuit (web + fonctions de base) et Premium (Mac, liaison bancaire, IA, coffre). Hypothèses : achat unique 39 à 59 € ou 19 à 29 €/an ; les deux, comme Wouf | Premier euro encaissé | Faible à moyen |
| 3 | **Page d'accueil publique « Patrimoine AI »** (captures, vidéo de 60 s, comparatif honnête « alternative à Finary », FAQ confidentialité) et liens depuis les vidéos QuentInvest | Premier flux de visiteurs | Moyen |
| 4 | **Import des courtiers** (modèles CSV Trade Republic, Boursorama Bourse, Fortuneo, Degiro, Interactive Brokers) pour PEA et compte-titres, faute de DSP2 | Comble la plus grosse limite actuelle | Moyen (un format à la fois) |
| 5 | **Plusieurs banques** via Enable Banking (la liaison Boursorama sert de modèle), après vérification des conditions commerciales de ce prestataire pour des utilisateurs autres que le propriétaire | Argument fort pour les ventes | Moyen à élevé |
| 6 | **« Pourquoi mon patrimoine a bougé ce mois-ci ? »** : explication des variations (versements, marché, change) dans le résumé du mois | Fonction différenciante, utilise l'IA locale avec chiffres vérifiés | Moyen |
| 7 | **Aide à la déclaration d'impôt** (récapitulatif des intérêts, dividendes, plus-values à reporter, sans calcul d'impôt définitif) | Valeur annuelle récurrente (avril-mai) | Moyen ; relecture juridique nécessaire |
| 8 | **Mode couple / famille** (deux profils, patrimoine commun et personnel) | Élargit la cible | Moyen |
| 9 | **Application iPhone** : la version web installable existe ; envisager un habillage pour l'App Store (compte développeur déjà utile pour le Mac) et un widget de patrimoine | Accès aux utilisateurs iPhone | Moyen |
| 10 | **Calculateurs publics sans compte** (intérêts composés, crédit, retraite, épargne) sur le site : référencement naturel et porte d'entrée vers l'application | Visiteurs gratuits qualifiés | Faible : les calculs existent déjà dans `calculs.js` |
| 11 | **Détection des frais cachés** (frais de gestion des contrats importés, comparaison avec un ETF monde) | Réponse à un besoin très demandé | Moyen |
| 12 | **Crypto en lecture seule** (adresse publique) | Complète le patrimoine | Moyen |

À ne pas faire : conseils d'investissement personnalisés (statut réglementé), vente de produits financiers, publicité, revente de données.

## 4. Lien avec la chaîne QuentInvest
La chaîne devient l'entonnoir : chaque vidéo d'économie crée de la confiance, la fin de vidéo oriente vers un outil.
- Dans les épisodes « calcul » (intérêts composés, crédit, inflation, frais), ajouter à la fin une ligne « calcule le tien dans Patrimoine AI » dès qu'une page publique existe (jamais de prix dans les publications).
- Pico en mascotte de Patrimoine AI : les couleurs sont déjà alignées.
- Une vidéo d'usage par mois (comment suivre un placement, lire un relevé) en plus des vidéos de vulgarisation.
- Objectifs de départ réalistes : 500 abonnés et 3 000 vues par vidéo avant de parler de revenus ; le programme partenaire YouTube demande en général 1 000 abonnés et 4 000 heures de visionnage (seuils à revérifier, ils évoluent).

## 5. Plan d'affaires d'ensemble (à partir de `STRATEGIE-APPS.md`)
Principe : moins de produits poussés en même temps. Trois rôles distincts.

| Rôle | Produit | Modèle | Pourquoi |
|---|---|---|---|
| Audience | Chaîne QuentInvest (YouTube + TikTok) | Gratuit ; revenus de la plateforme plus tard | Fabrication presque automatique, coût en temps très faible |
| Produit grand public | Patrimoine AI (puis Wouf, Paperdecrypt) | Gratuit + Premium | Le seul produit qui parle directement au public de la chaîne |
| Revenu rapide B2B | Pack Commerçant (39 €/mois) et sur-mesure sur demande | Abonnement | Déjà construit, sans démarchage |

Ordre conseillé sur 90 jours :
1. **Octobre-novembre** : régler la publication automatique (limite Metricool), publier 2 vidéos par semaine, signer l'application Mac, choisir le modèle de revenus de Patrimoine AI, créer sa page publique.
2. **Décembre** : calculateurs publics, premiers liens depuis les vidéos, mesure (visiteurs, installations, essais). Début des imports courtiers.
3. **Janvier** : première offre Premium en vente, retour d'expérience des premiers utilisateurs, décision d'élargir (banques, couple) selon les demandes.

Scénarios de revenus pour Patrimoine AI (hypothèses de calcul, pas des prévisions) :
- 1 000 €/mois à 29 €/an : environ 415 abonnés payants. À 3 % de conversion : environ 14 000 utilisateurs gratuits.
- 1 000 €/mois en achat unique à 49 € : environ 20 ventes par mois.
- Chaque 1 000 utilisateurs gratuits supplémentaires apportent 20 à 50 payants à ces taux (2 à 5 %).
Ces volumes dépendent presque entièrement de l'audience : d'où la priorité donnée à la chaîne et aux calculateurs publics.

Indicateurs à suivre chaque semaine : vues et abonnés par vidéo, clics vers le site, installations, comptes créés, essais commencés, abonnés payants, résiliations.

Risques : dépendance aux plateformes (TikTok et YouTube peuvent restreindre un compte), réglementation (ne jamais présenter un contenu comme un conseil), conditions d'Enable Banking pour un usage commercial, dispersion sur trop de produits, charge de support quand les utilisateurs deviennent nombreux.

## 6. Décisions à prendre par le propriétaire
1. Modèle de revenus de Patrimoine AI (gratuit + Premium, prix de départ).
2. Ouverture d'un compte développeur Apple pour la signature (Mac, puis iPhone).
3. Solution de publication quand la limite Metricool est atteinte : passer à l'offre supérieure, programmer directement dans YouTube, ou automatiser par un autre outil.
4. Premier chantier technique : imports de courtiers ou plusieurs banques.
5. Moment du premier lien de Patrimoine AI dans les vidéos.

## Sources
- [Finary, lettre aux actionnaires 2026](https://finary.com/fr/actualites-produit/lettre-aux-actionnaires-2026)
- [Finary lève 25 millions d'euros (Journal du Net)](https://www.journaldunet.com/fintech/1544487-la-plateforme-d-investissement-finary-leve-25-millions-d-euros/)
- [Avis Finary 2026 : prix, limites](https://signal-alpha.fr/avis-finary/)
- [Plika, finances personnelles sans compte (Indie Hackers)](https://www.indiehackers.com/product/plika)
- [Conversion freemium vers premium (Adapty)](https://adapty.io/blog/markdown/freemium-to-premium-conversion-techniques.md)
