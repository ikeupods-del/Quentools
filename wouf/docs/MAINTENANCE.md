# Wouf — guide du propriétaire

Ce document explique **comment faire vivre Wouf** : publier une correction, ajouter une leçon, changer le prix, ouvrir la vente, gérer l’assistance.
Il est écrit pour être suivi sans être développeur. Pour toute modification, vous pouvez aussi simplement la demander à Claude : il connaît le projet (voir `CLAUDE.md`).

## 1. Comment ça marche (en 2 minutes)

- Wouf est une **application web statique** : pas de serveur à louer, pas de base de données à gérer. Le dossier `wouf/` est publié tel quel sur **GitHub Pages** (gratuit).
- Chaque utilisateur garde ses données **sur son téléphone**. S’il se connecte avec Google, elles sont aussi copiées dans **Firebase** (gratuit jusqu’à un très gros volume).
- Le **paiement** passe par un **lien PayPal**. Juste avant de payer, l’acheteur remplit un **dossier de paiement** (prénom, nom et e-mail PayPal, e-mail de contact), enregistré dans Firebase. Vous vérifiez le paiement dans PayPal puis activez Wouf Plus en un bouton (Plus → Administration). Aucun serveur à installer.
- **Publier = fusionner une « pull request »** sur GitHub. Environ 1 minute plus tard, tous les utilisateurs ont la nouvelle version (l’app propose « Actualiser »).

| Je veux… | Je modifie |
|---|---|
| Activer / couper le paiement, changer le prix affiché, les fonctions Plus, les infos légales | `wouf/config.js` |
| Corriger ou ajouter une leçon | `wouf/lessons.js` (chien, gratuites et bases), `lessons2.js` et `lessons3.js` (chien Plus), `lessons_cat.js` et `lessons_cat2.js` (chat), `lessons_plans.js` (programmes d’entraînement des leçons de base) |
| Ajouter une race, un aliment toxique, un premier secours | `wouf/data.js` (chien) ou `wouf/species.js` (chat) |
| Changer les textes de vente, la FAQ, les conditions de vente | `wouf/business.js` |
| Ajuster les repères du comparateur de croquettes | `wouf/nutrition.js` (fonction `nutTargets`) |
| Changer l’association du bouton de don | `wouf/config.js` (`donation`) |
| Annoncer une nouveauté | `CHANGELOG` dans `wouf/business.js` |
| Changer les couleurs, la mise en page | `wouf/style.css` |

## 2. Publier une modification (routine)

1. Modifier les fichiers (ou demander à Claude).
2. Lancer les tests : `cd wouf && npm install && npm test` (la première fois seulement pour `npm install`). **Tout doit être vert.** Les tests vérifient le contenu des leçons, la configuration, le moteur de nutrition et le parcours utilisateur dans un vrai navigateur.
3. Pour une nouvelle version visible par les utilisateurs, **une seule commande** met à jour tous les numéros de version et ajoute l’annonce dans « Nouveautés » :
   `npm run release -- 1.3.0 "Première nouveauté" "Deuxième nouveauté"` (le test `check` refuse si un numéro est oublié).
4. Ouvrir une pull request. La vérification automatique (`Wouf — tests`) tourne toute seule.
5. Fusionner. Le déploiement (`Publier sur GitHub Pages`) ne démarre que si les tests passent.
6. En cas de problème : sur la page de la pull request fusionnée, bouton **« Revert »** → nouvelle pull request → fusionner. L’ancienne version revient en 1 minute.

> Petite correction de texte : pas besoin de changer le numéro de version, mais elle ne sera « annoncée » à personne. Les utilisateurs la reçoivent à leur prochaine ouverture de l’app.

### Un utilisateur voit encore l’ancienne version
Les fichiers de l’app sont revalidés à chaque ouverture, la mise à jour est donc immédiate. Pour un appareil qui traîne une très ancienne version (avant la 1.2), demandez d’ouvrir **`https://ikeupods-del.github.io/Quentools/wouf/?maj=1`** : ce lien vide le cache de l’application (**jamais les données**) puis recharge. Ne dites **jamais** d’« effacer les données du site » : cela supprimerait le carnet (sauf s’il est sauvegardé avec Google).

## 3. Recettes courantes

**Corriger une faute dans une leçon** : ouvrir le fichier, corriger le texte entre guillemets, `npm test`, pull request.

**Ajouter une leçon** : copier une leçon existante dans `lessons7.js` (chien) ou `lessons_cat5.js` (chat), changer `id` (unique, sans espace), `free: false` (ou `true` pour l’offrir), et remplir tous les champs, y compris `plan` (programme d’entraînement) et `next` (pistes pour aller plus loin). Le test `check` refuse une leçon incomplète (au moins 3 étapes avec critère de réussite, un plan de 3 étapes, 3 erreurs fréquentes, 2 questions de dépannage, 2 pistes). Pour la placer dans un programme, ajouter son `id` à une semaine de `PROGRAMS`. Les nombres de leçons affichés dans l’app (offre, présentation) se calculent tout seuls.

**Le bouton « Wouf+ »** (en-tête, accueil, éducation, fiche de leçon verrouillée) : tant que la vente n’est pas ouverte ou qu’aucun lien PayPal n’est renseigné, il présente l’offre (« tout est offert pour le moment »). Dès que la vente est ouverte, il ouvre l’achat à 19,99 € à vie : connexion Google, dossier de paiement, case de consentement, puis PayPal.

**Rendre une fonction gratuite ou payante** : dans `config.js`, ajouter ou retirer son nom de `billing.premium`. Noms possibles : `multiDogs`, `documents`, `report`, `calendar`, `stats`, `lessons`, `programs`, `tracker`, `bilan`, `sitter`, `weightplan`. (Le chat gratuit et la limite « 1 chien + 1 chat » se règlent avec `limits.perSpecies`.)

**Offre de lancement** : `freeUntil: '2027-03-31'` garde tout gratuit jusqu’à cette date, même une fois le paiement activé.
**Récompenser les premiers utilisateurs** : `grandfatherBefore: '2027-04-01'` offre Plus (à vie ou jusqu’à une date, `grandfatherUntil`) à tous ceux installés avant cette date.

**Changer le prix** : (1) dans PayPal, créer un **nouveau lien de paiement** au nouveau montant ; (2) le coller dans Plus → Administration → « Paiement et informations légales » ; (3) mettre le prix affiché dans `config.js` (`plans[0].price`), repris automatiquement par les conditions de vente. Les acheteurs existants ne sont pas concernés.

**Changer le format des données** (ajout d’un champ obligatoire, renommage) : augmenter `SCHEMA` dans `core.js` et ajouter une étape dans `migrate()`. Les données des utilisateurs sont ainsi mises à niveau à l’ouverture, sans perte. Le test « migration » montre comment vérifier avec d’anciennes données.

## 3 bis. Comparateur de croquettes et don

**Comparateur de croquettes** (gratuit). Wouf ne contient **aucune base de produits** : il analyse la composition de l’étiquette saisie par l’utilisateur (ou importée depuis Open Pet Food Facts, base collaborative gratuite et incomplète) et la compare aux besoins de l’animal (âge, taille, race, activité, stérilisation, surpoids, allergies déclarées). Il calcule matière sèche, énergie, note d’adéquation sur 100, ration et coût par jour / mois. Le calcul est dans `nutrition.js` et testé (`tests/unit/nutrition.test.mjs`).
- Les **repères** (protéines, graisses, fibres, énergie, calcium) sont des valeurs simplifiées inspirées de FEDIAF et AAFCO, dans `nutTargets`. **Faites-les relire par un vétérinaire nutritionniste** avant de communiquer largement dessus ; si vous les modifiez, adaptez les tests.
- Wouf **ne recommande jamais une marque** : il classe les produits que l’utilisateur compare. N’ajoutez pas de « produits recommandés » sans données vérifiées et sans divulguer les éventuels liens d’affiliation.
- L’importation Open Pet Food Facts dépend d’un service tiers : si l’adresse ou le format change, seule la fonction `fromOPFF` (croquettes.js) est à ajuster ; la saisie manuelle continue de fonctionner.

**Don à la SPA.** Le bouton (accueil, menu Plus, page « Faire un don ») ouvre directement l’adresse `donation.url` de `config.js` dans un nouvel onglet. **Vérifiez l’adresse exacte de la page de don sur le site de l’association** et mettez-la dans `donation.url` (les tests exigent une adresse en https). Wouf n’encaisse rien et n’est pas affilié à l’association : n’utilisez ni son logo ni son nom comme caution sans son accord écrit. Pour soutenir une autre association, changez `name`, `url` et `text`.

**Assurance.** Il n’y a plus de comparateur d’assurances (Wouf ne peut pas comparer de vraies offres en direct). La fiche de l’animal garde seulement l’assureur et la date de renouvellement pour le rappel.

## 4. Mise en vente : la checklist complète

Tant que `billing.enabled` vaut `false`, **tout est gratuit** et rien de ce qui suit n’est nécessaire. Le test `check` refuse volontairement `enabled: true` si les informations légales, l’adresse d’assistance ou le lien PayPal manquent ; l’interrupteur de l’administration fait la même vérification.

### A. Légal (obligatoire avant d’encaisser)
1. Avoir un statut pour vendre (par exemple micro-entrepreneur : SIRET). Choisir le régime de TVA.
2. Remplir `legal` dans `config.js` : vendeur, forme, adresse, SIRET, e-mail, directeur de publication, TVA, **médiateur de la consommation** (obligatoire pour vendre à des particuliers : adhérer à un médiateur).
3. Relire les pages **Conditions de vente, Confidentialité, Mentions** (menu Plus → Informations légales, générées par `business.js`). **Ce sont des modèles rédigés de bonne foi, pas un avis juridique : faites-les valider** (juriste, expert-comptable, ou organismes d’aide aux entrepreneurs). Points à valider en particulier : la formule « à vie » (engagement de préavis d’arrêt du service : `shutdownNoticeDays`), la renonciation au droit de rétractation (case à cocher avant paiement, art. L221-28 13° du Code de la consommation), le remboursement facultatif (`legal.refund`).
4. Décider votre politique de remboursement (le modèle n’en promet aucune au-delà de la loi ; un « satisfait ou remboursé 30 jours » est un bon argument de vente, à écrire dans `legal.refund`).

### B. PayPal
1. Créer un compte PayPal **professionnel** (gratuit) et compléter la vérification d’identité et le compte bancaire.
2. « Liens et boutons de paiement » → créer « Wouf Plus à vie » à **19,99 €** (et un second lien à **9,99 €** pour l’offre récompense). Si PayPal propose une page de retour, indiquer `https://woufapp.fr/#/merci`.
3. Coller les liens dans Plus → Administration → « Paiement et informations légales ».
4. Remboursement : PayPal → Activité → choisir le paiement → Rembourser, puis Administration → le compte → « Retirer ». Les données de l’utilisateur restent intactes.

### C. Firebase (connexion Google) — déjà en place pour QuenTools
Vérifier une fois : Authentication → Google activé ; domaines autorisés : `ikeupods-del.github.io` ; Firestore → règles : l’utilisateur peut lire et écrire `users/{uid}/apps/**` (déjà le cas si Infikit et Freelance Kit fonctionnent). Wouf écrit dans `users/{uid}/apps/wouf/main`.

### D. Ouvrir la vente
Plus → Administration : renseigner lien PayPal, informations légales et e-mail d’assistance → Enregistrer → « Ouvrir la vente » (bloqué tant qu’un élément manque). Faites d’abord **un achat réel** avec un proche (puis remboursez-le) pour vérifier tout le parcours : dossier, paiement, activation.

## 5. Assistance client

- Le formulaire prépare un e-mail vers `support.email`. Ceux des membres Plus portent `[PRIORITAIRE]` dans l’objet : **répondez-y d’abord**, dans le délai annoncé (`support.priorityDelay`, aujourd’hui « sous 24 h ouvrées »). Ne promettez que ce que vous pouvez tenir : modifiez ce texte dans `config.js` si besoin.
- Chaque message contient (si l’utilisateur l’a coché) la version, le navigateur et les dernières erreurs techniques : très utile pour reproduire un bug.
- **Suppression de compte (RGPD)** : dans la console Firebase, supprimer le document `users/{uid}/apps/wouf` de l’utilisateur (et son compte d’authentification s’il le demande). Les dossiers de paiement (`wouf_orders`) et l’historique PayPal restent conservés (obligation comptable).
- **Achat non activé** : chercher son dossier dans Administration → « Paiements à vérifier » (nom, e-mail PayPal) et le comparer à PayPal ; l’utilisateur doit être connecté avec le **même compte Google** que celui indiqué dans le dossier.

## 6. Coûts

| Service | Gratuit jusqu’à | Ensuite |
|---|---|---|
| GitHub Pages | usage courant | — |
| Firebase (connexion + sauvegarde) | ~50 000 lectures/jour | offre à l’usage |
| PayPal | pas d’abonnement | commission par paiement (de l’ordre de 3 % + 0,35 € : à vérifier sur paypal.com) |

Sur 19,99 €, il reste environ 19 € par vente avant impôts et charges (à vérifier avec le barème PayPal en vigueur).

## 7. Limites techniques à connaître (et à dire aux clients)

- **Suivi GPS** : une application web ne peut suivre le GPS que lorsque l’écran est allumé. Wouf garde l’écran allumé quand le téléphone le permet, et retrouve une balade interrompue. Une application native (App Store / Google Play) lèverait cette limite, mais c’est un autre projet.
- **Notifications** : pas de notification poussée app fermée sur le web. La solution proposée est l’export des rappels vers l’agenda du téléphone.
- **Vétérinaires de garde** : les données viennent d’OpenStreetMap (gratuit, sans clé). Ce service gratuit limite le volume : si Wouf grossit beaucoup, il faudra un fournisseur payant ou un cache (à traiter à ce moment-là).
- **Protection de Plus** : le contrôle d’accès est côté application (modèle « freemium »). Un utilisateur très technique peut le contourner sur son propre appareil. Le paiement, lui, est vérifié par vous dans PayPal avant chaque activation.
- **Documents (photos, PDF)** : gardés sur l’appareil, pas dans la sauvegarde Google (limite de taille). Ils sont dans la sauvegarde chiffrée manuelle.

## 8. Contenu médical et éducatif

Les fiches santé, premiers secours, toxiques, leçons et calculs (ration, plan de poids) sont **indicatifs**. Comme ils justifient le prix de Plus, faites-les **relire par un vétérinaire et un éducateur canin ou félin diplômé** avant la vente, puis à chaque ajout important. Les textes sont dans des fichiers simples : une relecture peut se faire en corrigeant directement les phrases.

## 9. Sécurité

- **Aucun secret dans le dépôt** : aucune clé privée n’est nécessaire (PayPal par simple lien). Le test `check` échoue si une clé secrète de paiement est écrite dans un fichier.
- Les clés Firebase de `config.js` sont publiques par conception ; la sécurité vient des règles Firestore.
- Les droits (Wouf Plus offert ou acheté), la liste des comptes et les dossiers de paiement sont protégés par les règles Firestore (section Administration).

**Générateur de noms** (`noms.js`) : listes de noms par style dans `NAME_STYLES` (format `Nom.sexe.espèce`, sexe `m`/`f`, espèce `d`/`c`, tout est facultatif). La lettre de l'année des pedigrees (LOF/LOOF) est calculée par `lofLetter(année)` : cycle de 20 lettres sans K Q W X Y Z, repères vérifiés (2025 = A, 2026 = B) ; ne pas la coder « en dur » année par année.

**Parcours et offre récompense** (`parcours.js`) : les leçons sont présentées comme un parcours (unités par catégorie, XP, niveaux). Une leçon est « acquise » après un quiz de 3 questions généré à partir des critères de réussite de ses étapes. Quand **toutes les leçons gratuites** des animaux du foyer sont acquises (chien : 6, chat : 4, les deux : 10), une fenêtre propose Wouf Plus au prix de `billing.rewardOffer.price` (config.js). Pour la vente : un second lien PayPal à 9,99 € (`rewardLink`, réglable dans l'administration). Le dossier de paiement indique le nombre de leçons acquises : vérifiez-le avant d'activer une offre récompense. Pour arrêter l'offre : `rewardOffer.enabled: false`.

## Statistiques (tableau de bord privé)
Wouf compte ses visites avec **GoatCounter** : pas de cookie, pas d'identifiant, aucune donnée saisie par l'utilisateur. Seuls le nom de l'écran ouvert, quelques actions (`animal-ajoute-chien`/`-chat`, `lecon-acquise`, `balade-enregistree`, `offre-recompense-vue`, `installation`, `test-aliments-commence`, `test-aliments-termine`), la taille d'écran et la provenance sont envoyés. Le tableau de bord n'est visible que par le titulaire du compte GoatCounter.
- **Actif** : compte GoatCounter `woufapp` → tableau de bord https://woufapp.goatcounter.com (connexion du propriétaire). Code dans `config.js` → `stats.goatcounter` ; vide = aucune mesure.
- **Mode propriétaire** : automatique quand on est connecté avec un compte Google listé dans `config.js → ownerHashes` (empreinte SHA-256 de l’adresse en minuscules : `printf %s adresse | sha256sum`). Sinon, ouvrir une fois `https://woufapp.fr/?proprio=1` sur son téléphone → bouton « 📊 Mes statistiques » en haut de Plus, et ses propres visites ne sont plus comptées (`?proprio=0` pour annuler, à refaire après un transfert d'adresse ou un effacement du navigateur).
- **Provenance des réseaux sociaux** : dans les bios, utiliser `…/wouf/?src=insta` et `…/wouf/?src=tiktok`. La valeur apparaît comme « referrer » dans GoatCounter.
- **Stats dans le panneau d'administration** (carte « 📊 Statistiques ») : dans GoatCounter → Paramètres → *API* → créer une clé avec le droit « lecture des statistiques » ; dans Cloudflare (Worker → Settings → Variables and Secrets) ajouter le **secret** `GOATCOUNTER_TOKEN` (et, si le compte n'est pas `woufapp`, la variable `GOATCOUNTER_SITE`). Sans cette clé, la carte affiche la consigne. Réponse mise en mémoire 1 min côté relais.
- **Copie des messages du formulaire par e-mail** (facultatif, via Resend, gratuit) : créer un compte sur resend.com avec l'adresse Proton, créer une clé API ; dans Cloudflare ajouter le secret `RESEND_API_KEY` et les variables `SUPPORT_TO=wouf-contact@proton.me`, `SUPPORT_FROM=Wouf <onboarding@resend.dev>` (cet expéditeur d'essai n'envoie qu'à l'adresse du compte Resend ; pour un expéditeur `@woufapp.fr`, vérifier le domaine dans Resend). Le message reste toujours enregistré même si l'envoi échoue ; l'état (📧 copie envoyée / ⚠️ non envoyé) s'affiche dans Administration → Messages.
- La mesure ne part que depuis le site publié (https). L'utilisateur peut la refuser dans Réglages → Confidentialité ; la politique de confidentialité la mentionne automatiquement dès que le code est renseigné.

## Adresse officielle : woufapp.fr
- Domaine acheté chez **OVH** (renouvellement automatique : à garder actif). Zone DNS : 4 enregistrements **A** sans sous-domaine vers `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` ; **CNAME** `www` → `ikeupods-del.github.io.` ; aucun AAAA.
- Publication : dépôt **ikeupods-del/woufapp**, workflow « Publier Wouf » (Settings → Pages : Source « GitHub Actions », Custom domain `woufapp.fr`, Enforce HTTPS). Il reprend le dossier `wouf/` de Quentools, relance les tests et publie : toutes les 3 heures, ou tout de suite via Actions → « Publier Wouf » → Run workflow.
- Firebase → Authentication → Settings → Authorized domains : `woufapp.fr` doit y figurer (connexion Google).
- Relais de paiement : `ALLOWED_ORIGIN` contient `https://woufapp.fr`.
- Bascule de l'ancienne adresse : `config.js → site.moved: true`. Sur `ikeupods-del.github.io/Quentools/wouf/`, un visiteur sans carnet est redirigé ; un utilisateur avec un carnet voit « Transférer mon carnet » (copie directe des données et documents vers woufapp.fr, rien n'est supprimé). Les comptes Google retrouvent tout en se reconnectant.

## Administration (propriétaire)
Onglet **Plus → 🛠️ Administration** (visible seulement pour le propriétaire connecté avec Google, voir `ownerHashes`) :
- **Comptes** : utilisateurs connectés avec Google (nom, e-mail, dernière visite, nombre d'animaux et de leçons). Les utilisateurs sans compte n'apparaissent que dans les statistiques de visite.
- **Wouf Plus offert** : « À vie », « 1 mois » ou « Retirer ». Pris en compte à la prochaine ouverture de l'app de l'utilisateur (connecté avec Google).
- **Paiements à vérifier** : chaque dossier (prénom, nom et e-mail PayPal, compte Google, e-mail de contact, montant, date). Après vérification dans PayPal : « ✅ Paiement reçu : activer » (Wouf Plus à vie sur le compte Google du dossier) ou « Refuser ».
- **Vente** : bouton « Ouvrir la vente / Repasser en gratuit » (document Firestore `wouf_admin/config`). Il reste bloqué tant que les infos légales et le lien PayPal ne sont pas renseignés : l'app ignore l'interrupteur dans ce cas.
- **Sécurité = règles Firestore** (Firebase → Firestore Database → Règles), à ajouter dans `match /databases/{database}/documents { … }`, en remplaçant ADRESSE par l'adresse Gmail du propriétaire :
```
function woufAdmin() { return request.auth != null && request.auth.token.email == 'ADRESSE' && request.auth.token.email_verified == true; }
match /wouf_users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; allow read: if woufAdmin(); }
match /wouf_grants/{uid} { allow read: if request.auth != null && request.auth.uid == uid; allow read, write: if woufAdmin(); }
match /wouf_admin/{doc} { allow read: if true; allow write: if woufAdmin(); }
match /wouf_orders/{id} { allow create: if request.auth != null && request.resource.data.uid == request.auth.uid && request.resource.data.status == 'pending'; allow read: if request.auth != null && resource.data.uid == request.auth.uid; allow read, update: if woufAdmin(); }
```

## Vendre avec PayPal
1. Plus → Administration → « Paiement et informations légales » : **adresse e-mail PayPal qui reçoit les paiements** (compte professionnel conseillé) + informations légales → Enregistrer → « Ouvrir la vente ». L'adresse peut être changée à tout moment : elle est relue juste avant chaque paiement.
2. L'app envoie l'acheteur vers une page de paiement PayPal (« Payer » classique, `cgi-bin/webscr?cmd=_xclick`) : montant du prix affiché (19,99 € ou 9,99 € pour l'offre récompense), référence du dossier `WOUF-…` (visible dans le détail du paiement PayPal), retour sur `#/merci`. Faites un **vrai paiement test** avec un proche après chaque changement d'adresse.
3. Alternative : un lien PayPal fixe créé dans PayPal (« Liens et boutons de paiement ») dans « lien fixe » ; il ne sert que si aucune adresse n'est renseignée.
4. **À chaque vente** : Administration → « Paiements à vérifier » : comparer la référence, le nom, l'e-mail et le montant avec PayPal → « ✅ Paiement reçu : activer ». Promesse affichée à l'acheteur : activation sous 24 h.

## Activation automatique après paiement PayPal (relais Cloudflare)
**Principe** : l'app construit la page de paiement PayPal (adresse PayPal choisie dans l'administration) et y ajoute l'identifiant du compte Google (`custom = uid|WOUF-…`) et l'adresse du relais (`notify_url`). À chaque paiement, PayPal prévient le relais (« IPN ») ; le relais **re-vérifie le message auprès de PayPal**, contrôle bénéficiaire (adresse PayPal de l'administration), devise (EUR) et montant (≥ 9,99 €), puis mémorise « ce compte a payé » (stockage KV Cloudflare). L'app lit ce statut avec le jeton Google de l'utilisateur ; la page « Merci » se met à jour toute seule. Un remboursement ou un litige PayPal retire l'accès. **Aucune clé secrète.** Sans relais (ou avec un lien PayPal fixe, qui ne transmet pas le compte), on revient à la validation manuelle (« Paiements à vérifier »), et les textes affichés au client changent en conséquence.

**Installation (10 minutes, sur ordinateur)** :
1. Compte gratuit sur cloudflare.com → **Workers & Pages** → **Create** → **Create Worker** → nom `wouf-billing` → **Deploy**.
2. **Edit code** → tout effacer, coller le contenu de `wouf/billing-worker/worker.js` → **Deploy**.
3. **Storage & Databases → KV** → **Create** : namespace `wouf-paid`.
4. Worker → **Settings → Bindings → Add → KV namespace** : nom de variable **`PAID`**, choisir `wouf-paid`.
5. Worker → **Settings → Variables and Secrets** : `ALLOWED_ORIGIN` = `https://woufapp.fr,https://ikeupods-del.github.io` ; `OWNER_EMAIL` = adresse Google du propriétaire.
6. Copier l'adresse du Worker (`https://wouf-billing.….workers.dev`) dans **Plus → Administration → « Adresse du relais d'activation automatique »** → Enregistrer. Renseigner aussi **l'adresse PayPal** (pas un lien fixe).
7. **Test réel** avec un proche : le paiement (19,99 €) doit activer son compte en quelques secondes ; le rembourser ensuite dans PayPal doit retirer l'accès.

**Limites à connaître** : IPN est l'ancien mécanisme de notification de PayPal (toujours en service à la date de rédaction : à vérifier si PayPal l'arrête un jour). L'offre récompense (9,99 €) n'est pas re-contrôlée côté serveur (le montant minimum accepté est `MIN_EUR`, défaut 9,99) : c'est le même niveau de confiance que le reste du contrôle d'accès de Plus. Modifier le code du relais = mettre à jour `worker.test.mjs`.

## Formulaire de contact et messages
Le formulaire de l'app (Plus → Assistance) **envoie le message directement** au relais Cloudflare (`POST /support`) : aucune messagerie n'est ouverte chez le client. Les messages sont rangés dans le KV et s'affichent dans **Plus → Administration → 📨 Messages** (lecture, « Répondre » qui ouvre votre messagerie vers le client, suppression). Limite anti-spam : 5 messages par heure et par adresse IP. Un membre Plus vérifié est marqué « ⭐ Membre Plus ». Si le relais est en panne, l'app se replie sur l'ouverture de la messagerie (`support.email`, sinon l'e-mail de contact des mentions légales).
- **Mise à jour du relais** : après une modification de `billing-worker/worker.js`, coller à nouveau le fichier dans Cloudflare (Worker → Edit code → tout remplacer → Deploy). Aucun autre réglage.
- **Recevoir aussi les messages par e-mail (facultatif)** : compte gratuit sur resend.com, vérification du domaine d'envoi, puis dans le Worker : secret `RESEND_API_KEY`, variables `SUPPORT_TO` (adresse de réception) et `SUPPORT_FROM` (expéditeur vérifié). Sans cela, les messages restent lisibles dans l'administration.

## Instagram automatique (1 publication par jour, gratuit)
Une tâche GitHub (`.github/workflows/instagram.yml`, deux fois par jour, vers 7 h et 18 h en heure de Paris ; en heure d'hiver 6 h et 17 h, sauf à décaler les heures `cron` du fichier) publie la prochaine image de `marketing/wouf/queue.json` avec sa légende, via l'API officielle et gratuite d'Instagram. Les images et légendes sont générées par `marketing/wouf/generate.js` puis `build-queue.js` (textes repris de l'app : aucune donnée inventée). `state.json` mémorise ce qui est déjà publié. Instagram uniquement (TikTok n'autorise pas la publication automatique gratuite).

**Une seule fois (environ 20 minutes)** — l'interface de Meta change souvent, suivre les intitulés approchants :
1. Le compte Instagram doit être en mode **Professionnel** (Paramètres → Type de compte).
2. Sur https://developers.facebook.com → *Mes apps* → *Créer une app* → cas d'usage « Gérer les messages et le contenu sur Instagram » (type Business) → produit **Instagram** → *API avec connexion Instagram*.
3. Dans *Générer des jetons d'accès*, ajouter le compte Instagram, se connecter, puis **Générer le jeton**. Copier le jeton (permission `instagram_business_content_publish`) et l'**identifiant du compte Instagram** affiché à côté.
4. Sur GitHub → dépôt → Settings → Secrets and variables → Actions → *New repository secret* : `IG_TOKEN` (le jeton) et `IG_USER_ID` (l'identifiant).
5. Actions → « Instagram — publication du jour » → *Run workflow* avec « Simulation » cochée : doit finir en vert et afficher la légende. Puis un essai réel en décochant.

**Ensuite** : rien à faire, sauf **renouveler le jeton tous les 60 jours** (refaire l'étape 3 et remplacer le secret `IG_TOKEN`). Si la tâche échoue, GitHub envoie un e-mail. Avec 2 publications par jour, 41 images durent 20 jours. Quand il reste 6 publications ou moins, la tâche affiche un avertissement : régénérer la file (`node marketing/wouf/generate.js && node marketing/wouf/build-queue.js`, ou demander à Claude).

**Aperçu par e-mail la veille** (`.github/workflows/apercu.yml`, chaque soir vers 20 h) : un e-mail avec les images et légendes des 2 publications du lendemain (7 h et 18 h). Secret GitHub à ajouter : `RESEND_API_KEY` (la même clé que celle du relais). Les mails arrivent sur `wouf-contact@proton.me` (secret facultatif `MAIL_TO` pour changer d'adresse) ; le compte Resend doit être créé avec cette adresse. Test : Actions → « Instagram — aperçu du lendemain » → Run workflow. Pour changer une publication avant sa sortie : le dire à Claude (modification de `queue.json`).

## Paiement retrouvé automatiquement + mail de confirmation
- **Quand un client écrit par le formulaire** de l'app en étant connecté avec Google, le relais cherche un paiement PayPal dont l'adresse du payeur est **l'adresse Google vérifiée** du client. Trouvé : son compte passe **Plus à vie tout de suite**, l'app le lui annonce, et un mail de confirmation part. Le message apparaît dans Administration → Messages avec « ✅ Paiement retrouvé… ».
- **Adresse différente ou client non connecté** : rien n'est activé (ce serait contournable) ; le message est marqué « 💳 Paiement trouvé pour cet e-mail… » et vous reliez le compte à la main (Comptes → ⭐ À vie).
- **Remboursement** : retire l'accès du compte qui a payé **et** des comptes reliés de cette façon.
- **Mail de confirmation** (à l'achat automatique aussi) : nécessite un expéditeur d'un domaine **vérifié chez Resend** : dans Resend → Domains → ajouter `woufapp.fr` et copier les enregistrements DNS demandés chez le registrar ; puis dans Cloudflare (Worker) la variable `CONFIRM_FROM` = `Wouf <contact@woufapp.fr>` (avec le secret `RESEND_API_KEY` déjà créé). Les réponses du client arrivent sur `SUPPORT_TO` (Proton). Sans `CONFIRM_FROM`, l'activation marche quand même, seul le mail n'est pas envoyé.

## Test express « dangereux ou OK ? » (porte d'entrée depuis les réseaux)
- Écran `#/test` (`testalim.js`), **accessible sans carnet** et sans barre d'onglets : lien à mettre en bio / dans les légendes (`https://woufapp.fr/?src=insta#/test`, `?src=tiktok#/test`). 8 aliments tirés au hasard (chien ou chat), score partageable (Web Share ou copie du message).
- Les aliments dangereux reprennent **les textes de SOS** (`TOXICS` / `TOXICS_CAT`) ; les aliments « OK » sont écrits à la main dans `TA_POOL` : contenu indicatif, à faire relire par un vétérinaire avant d'en ajouter.
- Suivi (anonyme) : `test-aliments-commence` et `test-aliments-termine`, visibles dans la carte Statistiques de l'administration.
- Aperçu des liens partagés : image `icons/og-image.png` (1200×630), balises Open Graph/Twitter, `canonical`, données structurées ; `robots.txt` et `sitemap.xml` à la racine.


## Sécurité et confidentialité
- **Données** : sur l'appareil (localStorage + IndexedDB), jamais envoyées sans action de l'utilisateur. Synchro Google (Firestore `users/{uid}/apps/wouf`) protégée par les règles Firestore.
- **Synchro chiffrée (optionnelle)** : Sauvegarde → « Chiffrer ma synchronisation Google » : AES-256-GCM, clé PBKDF2 (250 000 tours) dérivée d'une phrase secrète ; Google ne voit que `{"wouf":"cloud-enc",…}`. La phrase est gardée dans `wouf:cpass` (appareil seulement), effacée à la déconnexion Google et par « Tout supprimer ». Perdue = sauvegarde Google illisible (les données locales restent).
- **Sauvegarde fichier** : déjà chiffrée AES-256 par phrase secrète.
- **Politique de contenu** : `index.html` interdit les objets embarqués et le changement de base d'URL ; pas de CSP stricte (la connexion Google popup a besoin de domaines Google, non testables en dehors de la production).
- **À faire par le propriétaire** : vérifier les règles Firestore (chaque utilisateur ne lit que `users/{uid}`), ne jamais publier de clé secrète, garder l'accès Cloudflare/GitHub en double authentification.
- **Carte du code** : `node tools/carte.js` régénère `CARTE.md`.
