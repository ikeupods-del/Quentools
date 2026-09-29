# QuenTools

## Infikit — l’assistant des infirmières à domicile

Tournée, fiches patients, **ordonnances (photo ou PDF)**, fiche d’urgence, transmissions, cotations NGAP / INAMI et compta.
Application web installable (PWA) : elle s’installe sur l’écran d’accueil comme une vraie app et fonctionne hors connexion.

**Adresse de l’app :** https://ikeupods-del.github.io/Quentools/infikit/

### Pour l’infirmière

1. Ouvrir l’adresse ci-dessus sur son téléphone (Safari sur iPhone, Chrome sur Android).
2. **Installer** : bouton « 📲 Installer l’app » (Android), ou Partager → « Sur l’écran d’accueil » (iPhone).
3. Réglages → **Synchronisation** → « Se connecter avec Google » ou « Se connecter avec GitHub », puis choisir une phrase secrète.
4. Sur un autre appareil : installer l’app, puis « Retrouver mes données avec Google / GitHub » et saisir la même phrase secrète.

Ordonnances : fiche patient → **📷 Photographier** ou **📄 Photo ou PDF**. Les photos sont allégées automatiquement (≈ 2000 px) ;
la date de fin de validité saisie met à jour l’alerte « ordonnance expirée ».

### Sécurité des données
- Les données restent sur le téléphone (localStorage + IndexedDB pour les fichiers).
- La synchronisation chiffre **tout** sur le téléphone (AES-256-GCM, clé PBKDF2 de la phrase secrète) avant l’envoi :
  Google Drive (dossier privé de l’app) ou GitHub (gists secrets) ne reçoivent que des données illisibles.
- Sans la phrase secrète, la sauvegarde est irrécupérable.

### Mise en ligne (une seule fois)

1. **GitHub Pages** : Settings → Pages → Source : **GitHub Actions**. Le workflow `.github/workflows/pages.yml` publie le site à chaque push.
2. **Connexion Google** (facultatif) :
   - https://console.cloud.google.com → nouveau projet → « API et services » → activer **Google Drive API**.
   - Écran de consentement OAuth : type Externe, ajouter le scope `drive.appdata`.
   - Identifiants → Créer un **ID client OAuth** « Application Web », origine JavaScript autorisée : `https://ikeupods-del.github.io`.
   - Coller l’identifiant dans `infikit/config.js` → `googleClientId`.
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
| `infikit/config.js` | identifiants Google / GitHub |
| `infikit/manifest.webmanifest`, `infikit/sw.js`, `infikit/icons/` | installation et mode hors connexion |
| `infikit/oauth-worker/worker.js` | relais OAuth GitHub (facultatif) |
