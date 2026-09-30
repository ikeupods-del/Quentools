# QuenTools — notes pour Claude

Dépôt de plusieurs petites apps web statiques publiées sur GitHub Pages : `infikit/` (infirmières), `freelance/` (TJM/devis), **`wouf/`** (carnet de santé chien et chat — le projet commercial). Le propriétaire n'est pas développeur : réponds en français simple, agis (ne demande pas de faire soi-même ce que tu peux faire), et explique le résultat, pas la technique.

## Wouf — repères rapides
- **Aucune compilation.** Scripts classiques chargés dans l'ordre de `wouf/index.html` (variables globales partagées). Ajouter un fichier JS = l'ajouter à `index.html` **et** à `SHELL` dans `wouf/sw.js` (le test `check` le vérifie).
- Ordre : `config → data → species → core → health → screens → sos → nutrition → croquettes → lessons → lessons2 → lessons_cat → educ → parcours → cloud → tracker → plusfeatures → guide → noms → business → admin → extras → main`.
- `S` = l'état de l'utilisateur (localStorage `wouf:data`). **`S.dogs` contient tous les animaux (chiens ET chats)**, champ `species` (`dog`|`cat`) ; le nom est historique, ne pas le renommer (données existantes et synchronisation). Toute nouvelle donnée : l'ajouter à `blank()`, et si la structure change, augmenter `SCHEMA` + étape dans `migrate()` (core.js).
- Écrans = `ROUTES.nom = () => html` ; actions = `ACT['nom']` déclenchées par `data-act="nom"` ; `render(true)` réaffiche en gardant le défilement. Toujours échapper le texte utilisateur avec `esc()`.
- Vocabulaire selon l'espèce : `spOf(d)`, `presetsFor(type, d)`, `toxicsOf(d)`, `firstAidOf(d)`, `nutFactorsOf(d)`, `lessonsFor(d)`. Ne jamais écrire « chien » en dur dans un texte visible d'un animal quelconque.
- **Droits Plus** : `plus()`, `allowed('fonction')`, `gate('fonction', fn)`, `paywall('fonction')` ; liste dans `config.js` → `billing.premium` ; description commerciale dans `business.js` → `FEATURES` (chaque fonction Plus doit y figurer, test `check`).
- **Interrupteur d'abonnement** : `billing.enabled` (config.js). Faux = tout gratuit. Ne l'active jamais sans que le propriétaire l'ait demandé : le test refuse si les infos légales manquent.
- Vente : achat unique « à vie » lié au compte Google, **PayPal uniquement** (Stripe et le relais Cloudflare ont été retirés). L'acheteur remplit un dossier de paiement (`wouf_orders`, admin.js) puis paie via le lien PayPal (`billing.paymentLink`, réglable dans l'administration) ; le propriétaire vérifie dans PayPal et active dans Plus → Administration (`wouf_grants`). Prix affiché dans `config.js` = montant du lien PayPal. Sécurité par les règles Firestore (MAINTENANCE, « Administration »).
- Comparateur de croquettes : `nutrition.js` = calculs purs (sans DOM, testés en vm dans `tests/unit/nutrition.test.mjs`), `croquettes.js` = écrans. Aucune donnée produit inventée : l'utilisateur saisit l'étiquette (ou importe depuis Open Pet Food Facts). Ne jamais ajouter de « produits recommandés » codés en dur ni de faux tarifs. Pas de comparateur d'assurances (retiré : impossible à comparer en vrai).
- Don : `config.js` → `donation` (lien direct, Wouf n'encaisse rien, non affilié).
- Données de référence : `data.js` (chien), `species.js` (chat + helpers), leçons dans `lessons*.js` (chaque leçon exige `plan` et `next`, contrôlé par les tests ; `lessons_plans.js` complète les leçons de base). Méthode d'éducation : **renforcement positif uniquement** (jamais de punition, collier de contrainte, etc.).

## Avant de livrer une modification de Wouf
1. `cd wouf && npm install && npm test` — doit être entièrement vert (contrôles statiques + nutrition + scénarios navigateur). Sandbox : Chromium est dans `/opt/pw-browsers` (détecté automatiquement).
2. Nouvelle version visible → `cd wouf && npm run release -- X.Y.Z "nouveauté 1" "nouveauté 2"` : met à jour d'un coup config.js, package.json, package-lock.json, le cache de sw.js, les `?v=` d'index.html et le CHANGELOG (business.js). Ne jamais éditer ces numéros à la main ; `npm run check` signale les oublis. Après une publication, si un utilisateur voit l'ancienne version : lien `…/wouf/?maj=1` (vide le cache de l'app, jamais les données).
3. Toute nouvelle fonction utilisateur = un scénario dans `wouf/tests/e2e.js`.
4. Mettre à jour `wouf/docs/MAINTENANCE.md` si une procédure change.

## Git et publication
- L’adresse racine `https://ikeupods-del.github.io/Quentools/` redirige vers `wouf/` (`index.html` à la racine).
- **Adresse officielle de Wouf : https://woufapp.fr**, publiée par le dépôt `ikeupods-del/woufapp` (workflow « Publier Wouf » : récupère `wouf/` de la branche par défaut, relance les tests, publie ; toutes les 3 h ou à la main via `actions_run_trigger`). Après chaque fusion, déclencher ce workflow. `config.js → site.moved: true` fait basculer l’ancienne adresse (redirection sans carnet, bandeau « Transférer mon carnet » sinon).
- Branche par défaut : `claude/infirmiere-ordonnances-upload-26nl16` ; la publication (GitHub Pages) se déclenche à chaque push dessus, **après** les tests (`.github/workflows/pages.yml`). Les branches de travail passent par une pull request (le workflow « Wouf — tests » tourne dessus).
- Ne jamais écrire de clé secrète dans le dépôt (aucune n'est nécessaire : PayPal par simple lien).
- Contenu santé / juridique : indicatif. Signale au propriétaire ce qui mériterait une relecture professionnelle ; n'invente jamais de tarifs d'assureurs ni de faits juridiques.
