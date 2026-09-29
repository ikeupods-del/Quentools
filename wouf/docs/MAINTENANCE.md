# Wouf — guide du propriétaire

Ce document explique **comment faire vivre Wouf** : publier une correction, ajouter une leçon, changer le prix, ouvrir la vente, gérer l’assistance.
Il est écrit pour être suivi sans être développeur. Pour toute modification, vous pouvez aussi simplement la demander à Claude : il connaît le projet (voir `CLAUDE.md`).

## 1. Comment ça marche (en 2 minutes)

- Wouf est une **application web statique** : pas de serveur à louer, pas de base de données à gérer. Le dossier `wouf/` est publié tel quel sur **GitHub Pages** (gratuit).
- Chaque utilisateur garde ses données **sur son téléphone**. S’il se connecte avec Google, elles sont aussi copiées dans **Firebase** (gratuit jusqu’à un très gros volume).
- Le **paiement** passe par **Stripe**. Un tout petit programme (le « relais », `wouf/billing-worker/`, hébergé gratuitement chez **Cloudflare**) vérifie l’identité Google de l’acheteur et confirme l’achat. Il envoie aussi les messages d’assistance par e-mail (**Resend**).
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
2. Lancer les tests : `cd wouf && npm install && npm test` (la première fois seulement pour `npm install`). **Tout doit être vert.** Les tests vérifient le contenu des leçons, la configuration, le relais de paiement et le parcours utilisateur dans un vrai navigateur.
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

**Ajouter une leçon** : copier une leçon existante dans `lessons3.js` (chien) ou `lessons_cat2.js` (chat), changer `id` (unique, sans espace), `free: false` (ou `true` pour l’offrir), et remplir tous les champs, y compris `plan` (programme d’entraînement) et `next` (pistes pour aller plus loin). Le test `check` refuse une leçon incomplète (au moins 3 étapes avec critère de réussite, un plan de 3 étapes, 3 erreurs fréquentes, 2 questions de dépannage, 2 pistes). Pour la placer dans un programme, ajouter son `id` à une semaine de `PROGRAMS`. Les nombres de leçons affichés dans l’app (offre, présentation) se calculent tout seuls.

**Le bouton « Wouf+ »** (en-tête, accueil, éducation, fiche de leçon verrouillée) : tant que `billing.enabled` vaut `false` ou que le relais n’est pas configuré, il présente l’offre (« tout est offert pour le moment »). Dès que la vente est ouverte (`enabled: true` et `api` renseignée), il lance le paiement à 19,99 € à vie avec connexion Google et case de consentement.

**Rendre une fonction gratuite ou payante** : dans `config.js`, ajouter ou retirer son nom de `billing.premium`. Noms possibles : `multiDogs`, `documents`, `report`, `calendar`, `stats`, `lessons`, `programs`, `tracker`, `bilan`, `sitter`, `weightplan`. (Le chat gratuit et la limite « 1 chien + 1 chat » se règlent avec `limits.perSpecies`.)

**Offre de lancement** : `freeUntil: '2027-03-31'` garde tout gratuit jusqu’à cette date, même une fois le paiement activé.
**Récompenser les premiers utilisateurs** : `grandfatherBefore: '2027-04-01'` offre Plus (à vie ou jusqu’à une date, `grandfatherUntil`) à tous ceux installés avant cette date.

**Changer le prix** : (1) dans Stripe, créer un **nouveau prix** de paiement unique (on ne modifie pas un prix existant) ; (2) mettre son identifiant dans `wrangler.toml` (`PRICE_LIFETIME`) et redéployer le relais (`npx wrangler deploy`) ; (3) mettre le prix affiché dans `config.js` (`plans[0].price`) et dans les conditions de vente (elles le reprennent automatiquement). Les acheteurs existants ne sont pas concernés.

**Changer le format des données** (ajout d’un champ obligatoire, renommage) : augmenter `SCHEMA` dans `core.js` et ajouter une étape dans `migrate()`. Les données des utilisateurs sont ainsi mises à niveau à l’ouverture, sans perte. Le test « migration » montre comment vérifier avec d’anciennes données.

## 3 bis. Comparateur de croquettes et don

**Comparateur de croquettes** (gratuit). Wouf ne contient **aucune base de produits** : il analyse la composition de l’étiquette saisie par l’utilisateur (ou importée depuis Open Pet Food Facts, base collaborative gratuite et incomplète) et la compare aux besoins de l’animal (âge, taille, race, activité, stérilisation, surpoids, allergies déclarées). Il calcule matière sèche, énergie, note d’adéquation sur 100, ration et coût par jour / mois. Le calcul est dans `nutrition.js` et testé (`tests/unit/nutrition.test.mjs`).
- Les **repères** (protéines, graisses, fibres, énergie, calcium) sont des valeurs simplifiées inspirées de FEDIAF et AAFCO, dans `nutTargets`. **Faites-les relire par un vétérinaire nutritionniste** avant de communiquer largement dessus ; si vous les modifiez, adaptez les tests.
- Wouf **ne recommande jamais une marque** : il classe les produits que l’utilisateur compare. N’ajoutez pas de « produits recommandés » sans données vérifiées et sans divulguer les éventuels liens d’affiliation.
- L’importation Open Pet Food Facts dépend d’un service tiers : si l’adresse ou le format change, seule la fonction `fromOPFF` (croquettes.js) est à ajuster ; la saisie manuelle continue de fonctionner.

**Don à la SPA.** Le bouton (accueil, menu Plus, page « Faire un don ») ouvre directement l’adresse `donation.url` de `config.js` dans un nouvel onglet. **Vérifiez l’adresse exacte de la page de don sur le site de l’association** et mettez-la dans `donation.url` (les tests exigent une adresse en https). Wouf n’encaisse rien et n’est pas affilié à l’association : n’utilisez ni son logo ni son nom comme caution sans son accord écrit. Pour soutenir une autre association, changez `name`, `url` et `text`.

**Assurance.** Il n’y a plus de comparateur d’assurances (Wouf ne peut pas comparer de vraies offres en direct). La fiche de l’animal garde seulement l’assureur et la date de renouvellement pour le rappel.

## 4. Mise en vente : la checklist complète

Tant que `billing.enabled` vaut `false`, **tout est gratuit** et rien de ce qui suit n’est nécessaire. Le test `check` refuse volontairement `enabled: true` si les informations légales, l’adresse d’assistance ou l’URL du relais manquent.

### A. Légal (obligatoire avant d’encaisser)
1. Avoir un statut pour vendre (par exemple micro-entrepreneur : SIRET). Choisir le régime de TVA.
2. Remplir `legal` dans `config.js` : vendeur, forme, adresse, SIRET, e-mail, directeur de publication, TVA, **médiateur de la consommation** (obligatoire pour vendre à des particuliers : adhérer à un médiateur).
3. Relire les pages **Conditions de vente, Confidentialité, Mentions** (menu Plus → Informations légales, générées par `business.js`). **Ce sont des modèles rédigés de bonne foi, pas un avis juridique : faites-les valider** (juriste, expert-comptable, ou organismes d’aide aux entrepreneurs). Points à valider en particulier : la formule « à vie » (engagement de préavis d’arrêt du service : `shutdownNoticeDays`), la renonciation au droit de rétractation (case à cocher avant paiement, art. L221-28 13° du Code de la consommation), le remboursement facultatif (`legal.refund`).
4. Décider votre politique de remboursement (le modèle n’en promet aucune au-delà de la loi ; un « satisfait ou remboursé 30 jours » est un bon argument de vente, à écrire dans `legal.refund`).

### B. Stripe
1. Créer le compte, compléter la vérification d’identité et l’IBAN.
2. Produits → **Nouveau produit « Wouf Plus »** → prix **paiement unique** de 19,99 € en EUR. Copier l’identifiant du prix (`price_…`).
3. Paramètres → Reçus clients : activer l’envoi de reçus par e-mail.
4. **Toujours tester en mode test d’abord** (clé `sk_test_…`, carte `4242 4242 4242 4242`), puis refaire avec la clé de production.
5. Remboursement : Stripe → Paiements → choisir le paiement → Rembourser. L’accès Plus est retiré automatiquement (au prochain contrôle de l’app, sous 6 heures) et les données de l’utilisateur restent intactes.

### C. Firebase (connexion Google) — déjà en place pour QuenTools
Vérifier une fois : Authentication → Google activé ; domaines autorisés : `ikeupods-del.github.io` ; Firestore → règles : l’utilisateur peut lire et écrire `users/{uid}/apps/**` (déjà le cas si Infikit et Freelance Kit fonctionnent). Wouf écrit dans `users/{uid}/apps/wouf/main`.

### D. Relais Cloudflare
1. Compte Cloudflare gratuit.
2. `cd wouf/billing-worker` puis `npx wrangler login`.
3. Ouvrir `wrangler.toml` et remplacer les valeurs `A-REMPLACER` (prix Stripe, adresses e-mail).
4. `npx wrangler secret put STRIPE_SECRET_KEY` (coller la clé), puis `npx wrangler secret put RESEND_API_KEY`.
5. `npx wrangler deploy` : la commande affiche l’URL du relais (`https://wouf-billing.….workers.dev`).
6. Recommandé : dans Cloudflare, ajouter une règle de limitation de débit (rate limiting) sur ce Worker.

### E. Resend (e-mails d’assistance)
Créer un compte (gratuit jusqu’à 3 000 e-mails/mois), vérifier votre domaine d’expédition, créer la clé API. Sans Resend, le formulaire ouvre le mail de l’utilisateur vers `support.email` : ça marche, mais sans vérification serveur de la priorité.

### F. Ouvrir la vente
Dans `config.js` : `billing.api` = URL du relais ; `support.email` ; `legal.*` ; `billing.enabled: true`. Puis `npm test`, pull request, fusion. Vérifiez ensuite **un achat réel** (mode test puis production), un remboursement, et un message d’assistance depuis un compte acheteur : il doit arriver avec `[PRIORITAIRE]` dans l’objet.

## 5. Assistance client

- Les messages arrivent dans la boîte `SUPPORT_TO`. Ceux des acheteurs vérifiés portent `[PRIORITAIRE]` dans l’objet et « MEMBRE PLUS VÉRIFIÉ » dans le corps : **répondez-y d’abord**, dans le délai annoncé (`support.priorityDelay`, aujourd’hui « sous 24 h ouvrées »). Ne promettez que ce que vous pouvez tenir : modifiez ce texte dans `config.js` si besoin.
- Chaque message contient (si l’utilisateur l’a coché) la version, le navigateur et les dernières erreurs techniques : très utile pour reproduire un bug.
- **Suppression de compte (RGPD)** : dans la console Firebase, supprimer le document `users/{uid}/apps/wouf` de l’utilisateur (et son compte d’authentification s’il le demande). L’achat reste dans Stripe (obligation comptable).
- **Achat non reconnu** : demander à l’utilisateur de se connecter avec le **même compte Google** que l’achat, puis « Restaurer mon achat » (Plus → Wouf Plus). Dans Stripe, le paiement porte l’identifiant Google dans ses métadonnées (`uid`).

## 6. Coûts

| Service | Gratuit jusqu’à | Ensuite |
|---|---|---|
| GitHub Pages | usage courant | — |
| Firebase (connexion + sauvegarde) | ~50 000 lectures/jour | offre à l’usage |
| Cloudflare Workers | 100 000 requêtes/jour | 5 $/mois |
| Resend | 3 000 e-mails/mois | à partir de 20 $/mois |
| Stripe | pas d’abonnement | commission par paiement (environ 1,5 % + 0,25 € sur les cartes européennes : à vérifier sur stripe.com) |

Sur 19,99 €, il reste environ 19,4 € par vente avant impôts et charges.

## 7. Limites techniques à connaître (et à dire aux clients)

- **Suivi GPS** : une application web ne peut suivre le GPS que lorsque l’écran est allumé. Wouf garde l’écran allumé quand le téléphone le permet, et retrouve une balade interrompue. Une application native (App Store / Google Play) lèverait cette limite, mais c’est un autre projet.
- **Notifications** : pas de notification poussée app fermée sur le web. La solution proposée est l’export des rappels vers l’agenda du téléphone.
- **Vétérinaires de garde** : les données viennent d’OpenStreetMap (gratuit, sans clé). Ce service gratuit limite le volume : si Wouf grossit beaucoup, il faudra un fournisseur payant ou un cache (à traiter à ce moment-là).
- **Protection de Plus** : le contrôle d’accès est côté application (modèle « freemium »). Un utilisateur très technique peut le contourner sur son propre appareil. Le paiement, lui, est vérifié côté serveur, et l’assistance prioritaire aussi.
- **Documents (photos, PDF)** : gardés sur l’appareil, pas dans la sauvegarde Google (limite de taille). Ils sont dans la sauvegarde chiffrée manuelle.

## 8. Contenu médical et éducatif

Les fiches santé, premiers secours, toxiques, leçons et calculs (ration, plan de poids) sont **indicatifs**. Comme ils justifient le prix de Plus, faites-les **relire par un vétérinaire et un éducateur canin ou félin diplômé** avant la vente, puis à chaque ajout important. Les textes sont dans des fichiers simples : une relecture peut se faire en corrigeant directement les phrases.

## 9. Sécurité

- **Aucun secret dans le dépôt** : les clés Stripe et Resend ne vivent que dans Cloudflare (`wrangler secret put`). Le test `check` échoue si une clé Stripe est écrite dans un fichier.
- Les clés Firebase de `config.js` sont publiques par conception ; la sécurité vient des règles Firestore.
- Le relais vérifie la signature du jeton Google (tests inclus : jeton falsifié, expiré, d’un autre projet), n’accepte que vos adresses (`ALLOWED_ORIGIN`) et ne stocke aucune donnée.
