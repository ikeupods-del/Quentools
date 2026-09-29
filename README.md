# QuenTools

## Infikit — l’assistant des infirmières à domicile

Tournée, fiches patients, **ordonnances (photo ou PDF)**, fiche d’urgence, transmissions, cotations NGAP / INAMI et compta.
Application web installable (PWA) : elle s’installe sur l’écran d’accueil comme une vraie app et fonctionne hors connexion.

**Adresse de l’app :** https://ikeupods-del.github.io/Quentools/infikit/

### Pour l’infirmière

1. Ouvrir l’adresse ci-dessus sur son téléphone (Safari sur iPhone, Chrome sur Android).
2. **Installer** : bouton « 📲 Installer l’app » (Android), ou Partager → « Sur l’écran d’accueil » (iPhone).
3. **Sauvegarder** (rappel automatique chaque semaine sur l’écran Tournée) : une phrase secrète, puis le menu Partager
   du téléphone → « Enregistrer dans Drive » (Android) ou « Enregistrer dans Fichiers → iCloud Drive » (iPhone).
   Aucun compte à créer, aucune configuration côté QuenTools.
4. Nouveau téléphone : installer l’app → « Restaurer ma sauvegarde » → choisir le fichier dans Drive / iCloud → même phrase secrète.

Option avancée : synchronisation automatique entre plusieurs appareils avec un compte GitHub (Réglages → Synchronisation automatique),
ou avec Google si un identifiant client est renseigné dans `infikit/config.js`.

Ordonnances : fiche patient → **📷 Photographier** ou **📄 Photo ou PDF**. Les photos sont allégées automatiquement (≈ 2000 px) ;
la date de fin de validité saisie met à jour l’alerte « ordonnance expirée ».

### Sécurité des données
- Les données restent sur le téléphone (localStorage + IndexedDB pour les fichiers).
- La synchronisation chiffre **tout** sur le téléphone (AES-256-GCM, clé PBKDF2 de la phrase secrète) avant l’envoi :
  Google (Firebase, espace privé de l’app) ou GitHub (gists secrets) ne reçoivent que des données illisibles.
- Sans la phrase secrète, la sauvegarde est irrécupérable.

### Mise en ligne (une seule fois)

1. **GitHub Pages** : Settings → Pages → Source : **GitHub Actions**. Le workflow `.github/workflows/pages.yml` publie le site à chaque push.
2. **Connexion Google** (projet Firebase `quentools-adca1`, commun à toutes les apps QuenTools, config déjà dans `infikit/config.js`) :
   - Firebase → Authentication → Sign-in method : activer **Google**.
   - Authentication → Settings → Authorized domains : ajouter `ikeupods-del.github.io`.
   - Firestore Database : créer la base, puis Rules : coller les règles (voir `firestore.rules` du dépôt `patrimoineai`) et **Publier**.
   - Données rangées dans `users/{uid}/apps/infikit` ; le même compte Google donne accès aux autres apps QuenTools, sans mélanger les données.
3. **Connexion GitHub** : fonctionne tout de suite en collant un jeton « gist » (l’app guide l’infirmière).
   Pour un bouton en un clic (facultatif) :
   - GitHub → Settings → Developer settings → **OAuth Apps** → New : Homepage et Callback URL = `https://ikeupods-del.github.io/Quentools/infikit/`.
   - Déployer `infikit/oauth-worker/worker.js` sur Cloudflare Workers (gratuit) avec les variables `GITHUB_CLIENT_ID`,
     `GITHUB_CLIENT_SECRET` (secret) et `ALLOWED_ORIGIN=https://ikeupods-del.github.io`.
   - Renseigner `githubClientId` et `githubOAuthProxy` dans `infikit/config.js`.

### Fichiers
| Fichier | Rôle |
|---|---|
| `infikit/index.html` | l’application (un seul fichier) |
| `infikit/config.js` | config Firebase (Google) / GitHub |
| `infikit/manifest.webmanifest`, `infikit/sw.js`, `infikit/icons/` | installation et mode hors connexion |
| `infikit/oauth-worker/worker.js` | relais OAuth GitHub (facultatif) |

## Freelance Kit — TJM & devis pour freelances

Calculateur de TJM (net visé, charges, frais, jours facturables) et générateur de devis sur-mesure (jours-hommes × coefficient de complexité, TVA, acompte).
Outil indépendant d'Infikit : il vit dans `freelance/` et n'utilise que son propre stockage (`fk:*`).

**Adresse :** https://ikeupods-del.github.io/Quentools/freelance/

- **Connexion Google** : même projet Firebase que les autres apps QuenTools (`freelance/config.js`), même compte. Les données (réglages TJM, devis, bibliothèque) sont synchronisées dans Firestore sous `users/{uid}/apps/freelance/main/current` ; la version la plus récente gagne. Prérequis identiques à Infikit (Google activé dans Firebase Auth, domaine `ikeupods-del.github.io` autorisé, règles Firestore couvrant `users/{uid}/apps/**`).
- **GitHub** : export du devis en **gist secret** (`.json` + `.md`), mis à jour à chaque nouvel export. Connexion en collant un jeton avec la seule case `gist`, ou en un clic via `githubClientId` / `githubOAuthProxy` dans `freelance/config.js` (OAuth App dont le callback est `.../Quentools/freelance/`).
- **Exports** : impression / PDF, `.md`, `.json`.
- Les données synchronisées ne sont **pas** chiffrées côté client (contrairement à Infikit) : ne pas y mettre d'informations sensibles.

| Fichier | Rôle |
|---|---|
| `freelance/index.html` | l'application (un seul fichier) |
| `freelance/config.js` | config Firebase / GitHub |

## Wouf — le carnet de santé du chien

Carnet de santé complet (vaccins, vermifuges, antipuces, consultations, chirurgies) avec **rappels automatiques**, plan chiot, courbe de poids
vs fourchette de la race, traitements du jour, journal de symptômes, dépenses, documents (ordonnances photo/PDF), ration quotidienne,
fiche d'urgence, affiche « chien perdu », fiche véto en PDF, export des rappels vers l'agenda (.ics) et sauvegarde chiffrée (AES-256).
**SOS** : vétérinaires ouverts / 24 h/24 autour de soi (OpenStreetMap, sans clé d'API), contacts d'urgence, premiers secours, aliments toxiques.
**Assurance** : simulateur de coût réel par niveau de couverture + comparateur de vrais devis saisis + liens de devis (affiliation possible).

**Adresse :** https://ikeupods-del.github.io/Quentools/wouf/ — application installable (PWA), hors connexion, sans inscription obligatoire, données sur l'appareil.

### Connexion Google et sauvegarde automatique
Bouton « Continuer avec Google » (accueil, Réglages) : les données (carnet, poids, éducation…) sont synchronisées automatiquement dans Firestore sous `users/{uid}/apps/wouf/main`
(même projet Firebase `quentools-adca1` et mêmes prérequis qu'Infikit / Freelance Kit : Google activé dans Authentication, domaine `ikeupods-del.github.io` autorisé, règles couvrant `users/{uid}/apps/**`).
Nouveau téléphone : se connecter avec Google suffit à tout retrouver. « La plus récente gagne » ; si des données existent des deux côtés à la première connexion, l'app demande lesquelles garder.
Les documents (photos / PDF) ne sont pas synchronisés (limite de taille Firestore) : ils sont dans la sauvegarde chiffrée manuelle. Les données synchronisées ne sont pas chiffrées côté client.

### Éducation (Wouf Éducation)
13 leçons en renforcement positif (`wouf/lessons.js`, éditable) : **3 gratuites** (marqueur et prénom, assis, propreté du chiot) et **10 Wouf Plus** (coucher, reste, rappel, marche en laisse,
laisse-le / donne, place, solitude, socialisation, soins coopératifs, ne pas sauter), plus les 10 principes (gratuits) et un programme chiot de 8 semaines (Plus).
Chaque leçon : objectif, matériel, étapes progressives avec critères de réussite, erreurs fréquentes, dépannage, test de validation. Mode **séance guidée** (chronomètre, marqueur sonore,
compteur de réussites avec la règle des 80 %), suivi par leçon, série de jours, badges. Réglage : `premium` (`lessons`, `programs`) dans `wouf/config.js`.

### Abonnement « Wouf Plus » : activable à tout moment
Par défaut **tout est gratuit**. Tout se pilote dans `wouf/config.js` (section `billing`) :

| Réglage | Effet |
|---|---|
| `enabled: false` | Tout gratuit (état actuel). Passer à `true` puis push = l'abonnement s'active sur tous les appareils à leur prochaine ouverture. |
| `freeUntil: '2027-03-31'` | Offre de lancement : tout reste gratuit jusqu'à cette date même si `enabled: true`. |
| `grandfatherBefore` + `grandfatherUntil` | Les utilisateurs arrivés avant la date gardent Plus (jusqu'à une date ou `'lifetime'`). |
| `limits`, `premium` | Ce que la formule gratuite limite (1 chien, 3 documents) et les fonctions Plus (multi-chiens, documents illimités, fiche PDF, agenda .ics, stats de dépenses). |

Les données déjà saisies ne sont jamais verrouillées : un utilisateur gratuit garde tout, seuls les nouveaux ajouts Plus sont limités. Le carnet, les rappels, SOS, assurance, sauvegarde restent toujours gratuits.
Tester l'expérience gratuite : ouvrir `…/wouf/?preview=free` (et `?preview=plus`).

**Paiement (à faire seulement le jour J)** — Stripe + relais Cloudflare Worker sans base de données :
1. Stripe : créer 2 prix récurrents (mensuel, annuel) et activer le *Customer portal* (résiliation à tout moment).
2. Cloudflare Workers : déployer `wouf/billing-worker/worker.js` avec `STRIPE_SECRET_KEY` (secret), `PRICE_MONTHLY`, `PRICE_YEARLY`, `ALLOWED_ORIGIN=https://ikeupods-del.github.io`.
3. `wouf/config.js` : `api: 'https://<votre-worker>.workers.dev'`, ajuster `plans` (prix affichés), puis `enabled: true`.
Le relais est **non testé contre un vrai compte Stripe** : l'essayer en mode test d'abord. Le contrôle d'accès côté app est un modèle « freemium » (contournable par un utilisateur technique), suffisant pour ce type d'app.

### Données d'assurance
Wouf ne connaît pas les tarifs en temps réel des assureurs et n'affiche donc **aucun prix inventé pour une marque** : les formules types sont des estimations de marché (modifiables dans `wouf/assurance.js`, tableau `TIERS`), les devis réels sont saisis par l'utilisateur. Liens partenaires : `affiliates` dans `wouf/config.js` (mention « partenaire » affichée automatiquement).

| Fichier | Rôle |
|---|---|
| `wouf/index.html`, `style.css` | coquille et thème (clair/sombre) |
| `wouf/config.js` | **interrupteur d'abonnement**, affiliation |
| `wouf/data.js` | races, vaccins, toxiques, premiers secours |
| `wouf/core.js`, `health.js` | stockage, formulaires, droits ; rappels, score, plan chiot |
| `wouf/screens.js`, `sos.js`, `assurance.js`, `extras.js`, `main.js` | écrans |
| `wouf/lessons.js`, `educ.js` | contenu des leçons et écrans d'éducation |
| `wouf/cloud.js` | connexion Google et synchronisation Firestore |
| `wouf/billing-worker/worker.js` | relais Stripe (facultatif tant que gratuit) |
