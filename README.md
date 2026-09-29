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

## Freelance Kit — TJM, devis & factures pour freelances

Calculateur de TJM, **devis et factures séparés** (numérotation continue, mentions légales françaises, remises, TVA multi-taux, acomptes, avoirs) et carnet de clients.
Outil indépendant d'Infikit : il vit dans `freelance/` et n'utilise que son propre stockage (`fk:*`).

**Adresse :** https://ikeupods-del.github.io/Quentools/freelance/

- **Réglages** : identité (forme juridique, SIREN/SIRET contrôlés, APE, capital, RCS, assurance), TVA (franchise en base art. 293 B ou assujetti, TVA sur les débits), moyens de paiement (IBAN contrôlé avec QR code de virement SEPA, PayPal.me, lien de paiement, chèque), conditions (délai, pénalités, escompte, indemnité de 40 €), préfixes de numérotation, logo et couleur.
- **Documents** : un devis ou une facture est un brouillon modifiable ; « Finaliser » contrôle les mentions obligatoires (y compris le SIREN du client professionnel exigé depuis le 1er septembre 2026), attribue le numéro (`F-2026-001`, sans trou, remis à zéro chaque année) et fige l'émetteur et le client. Un document finalisé n'est plus modifiable : on le corrige par un **avoir**.
- **Remises & ajustements** : remise par ligne (%), remise globale (% ou €), coefficient de complexité, acompte (facture d'acompte puis facture de solde qui déduit l'acompte), autoliquidation / hors champ de TVA.
- **Suivi** : statuts (envoyé, accepté, payée, en retard…), indicateurs (facturé, encaissé, à encaisser, en retard), export CSV pour le comptable, sauvegarde / restauration JSON.
- **Connexion Google** : même projet Firebase que les autres apps QuenTools (`freelance/config.js`), données synchronisées dans Firestore sous `users/{uid}/apps/freelance/main/current` (la version la plus récente gagne). Prérequis identiques à Infikit (Google activé dans Firebase Auth, domaine `ikeupods-del.github.io` autorisé, règles Firestore couvrant `users/{uid}/apps/**`).
- **GitHub** : export d'un document en **gist secret** (`.json` + `.md`). Connexion par jeton `gist` collé, ou en un clic via `githubClientId` / `githubOAuthProxy` dans `freelance/config.js`.
- Les données synchronisées ne sont **pas** chiffrées côté client (contrairement à Infikit).
- Limites : pas de transmission par plateforme de facturation électronique agréée, pas de modèles de mentions propres à un métier réglementé. L'outil ne remplace pas l'avis d'un comptable.

| Fichier | Rôle |
|---|---|
| `freelance/index.html` | l'application (un seul fichier) |
| `freelance/config.js` | config Firebase / GitHub |
