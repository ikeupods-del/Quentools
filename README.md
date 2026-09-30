# QuenTools

## Infikit — l’assistant des infirmières à domicile

Tournée, fiches patients, **ordonnances (photo ou PDF)**, fiche d’urgence, transmissions, cotations NGAP / INAMI et compta.
Application web installable (PWA) : elle s’installe sur l’écran d’accueil comme une vraie app et fonctionne hors connexion.

**Adresse de l’app :** https://ikeupods-del.github.io/Quentools/infikit/ (l’adresse principale https://ikeupods-del.github.io/Quentools/ ouvre Wouf)

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

## Wouf — le carnet de santé du chien et du chat

**Adresse :** https://woufapp.fr (publiée par le dépôt [ikeupods-del/woufapp](https://github.com/ikeupods-del/woufapp) ; l’ancienne adresse https://ikeupods-del.github.io/Quentools/wouf/ reste en ligne) — application installable (PWA), hors connexion, sans inscription obligatoire, données sur l'appareil.
**Guide du propriétaire (publier, corriger, vendre, assistance) : [`wouf/docs/MAINTENANCE.md`](wouf/docs/MAINTENANCE.md).**

### Gratuit, pour toujours
Carnet de santé complet (vaccins, vermifuges, antipuces, consultations…) avec **rappels automatiques**, plan chiot / chaton, courbe de poids vs race, traitements du jour, journal de symptômes,
dépenses, ration quotidienne, fiche d'urgence, affiche « animal perdu », **SOS** (vétérinaires ouverts et de garde autour de soi via OpenStreetMap, premiers secours, toxiques, contacts d'urgence),
**comparateur de croquettes** (analyse de la composition réelle selon l'âge, la race, l'activité, le poids et les allergies), **bouton de don à la SPA**, sauvegarde chiffrée, **connexion Google et sauvegarde automatique**,
**1 chien + 1 chat**, les principes d'éducation positive, **3 leçons chien et 2 leçons chat** complètes.

### Wouf Plus : 19,99 € **à vie** (paiement unique, lié au compte Google)
Animaux illimités · **35 leçons chien + 12 leçons chat** avancées (étapes, programme d'entraînement, dépannage) avec séances guidées (chrono, marqueur sonore, règle des 80 %) · 9 programmes guidés · **suivi GPS des balades** (tracé, allure, objectif du jour, export GPX) ·
bilan santé intelligent · plan de perte de poids · fiche gardien · carnet PDF pour le vétérinaire · rappels dans l'agenda · statistiques de dépenses · **assistance prioritaire** (vérifiée côté serveur).
**Tout est gratuit tant que `billing.enabled` vaut `false`** dans `wouf/config.js` ; la mise en vente suit la checklist du guide. Les données saisies ne sont jamais verrouillées.

### Développer et tester
```
cd wouf && npm install
npm run serve      # http://localhost:8099/wouf/
npm test           # contrôles de contenu + relais de paiement + 18 scénarios dans un vrai navigateur
```
La publication (GitHub Pages) ne se fait que si les tests passent. Détails et procédures : `wouf/docs/MAINTENANCE.md` ; conventions du code : `CLAUDE.md`.

| Dossier / fichier | Rôle |
|---|---|
| `wouf/index.html`, `style.css`, `sw.js`, `manifest.webmanifest` | coquille, thème, mode hors ligne, installation |
| `wouf/config.js` | **interrupteur de paiement**, prix affiché, fonctions Plus, infos légales, assistance |
| `wouf/data.js`, `species.js` | races, vaccins, toxiques, premiers secours (chien et chat) |
| `wouf/lessons*.js`, `educ.js` | contenu des leçons (chien : `lessons.js`, `lessons2.js`, `lessons3.js` ; chat : `lessons_cat*.js` ; programmes d'entraînement : `lessons_plans.js`) et écrans d'éducation |
| `wouf/core.js`, `health.js`, `screens.js`, `sos.js`, `nutrition.js`, `croquettes.js`, `tracker.js`, `plusfeatures.js`, `extras.js`, `main.js` | logique et écrans |
| `wouf/nutrition.js`, `croquettes.js` | comparateur de croquettes (calculs purs testés + écrans) |
| `wouf/cloud.js` | connexion Google et synchronisation |
| `wouf/business.js` | achat à vie, assistance, pages légales, nouveautés, mises à jour |
| `wouf/billing-worker/` | relais Cloudflare (paiement Stripe, vérification d'identité, e-mails d'assistance) |
| `wouf/tests/`, `wouf/docs/` | tests automatiques, guide du propriétaire |
