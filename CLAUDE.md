# QuenTools — notes pour Claude

Dépôt de plusieurs petites apps web statiques publiées sur GitHub Pages : `infikit/` (infirmières), `freelance/` (TJM/devis), **`wouf/`** (carnet de santé chien et chat — le projet commercial). Le propriétaire n'est pas développeur : réponds en français simple, agis (ne demande pas de faire soi-même ce que tu peux faire), et explique le résultat, pas la technique.

## Wouf — repères rapides
- **Aucune compilation.** Scripts classiques chargés dans l'ordre de `wouf/index.html` (variables globales partagées). Ajouter un fichier JS = l'ajouter à `index.html` **et** à `SHELL` dans `wouf/sw.js` (le test `check` le vérifie).
- Ordre : `config → data → species → core → health → screens → sos → assurance → lessons → lessons2 → lessons_cat → educ → cloud → tracker → plusfeatures → business → extras → main`.
- `S` = l'état de l'utilisateur (localStorage `wouf:data`). **`S.dogs` contient tous les animaux (chiens ET chats)**, champ `species` (`dog`|`cat`) ; le nom est historique, ne pas le renommer (données existantes et synchronisation). Toute nouvelle donnée : l'ajouter à `blank()`, et si la structure change, augmenter `SCHEMA` + étape dans `migrate()` (core.js).
- Écrans = `ROUTES.nom = () => html` ; actions = `ACT['nom']` déclenchées par `data-act="nom"` ; `render(true)` réaffiche en gardant le défilement. Toujours échapper le texte utilisateur avec `esc()`.
- Vocabulaire selon l'espèce : `spOf(d)`, `presetsFor(type, d)`, `toxicsOf(d)`, `firstAidOf(d)`, `nutFactorsOf(d)`, `lessonsFor(d)`. Ne jamais écrire « chien » en dur dans un texte visible d'un animal quelconque.
- **Droits Plus** : `plus()`, `allowed('fonction')`, `gate('fonction', fn)`, `paywall('fonction')` ; liste dans `config.js` → `billing.premium` ; description commerciale dans `business.js` → `FEATURES` (chaque fonction Plus doit y figurer, test `check`).
- **Interrupteur d'abonnement** : `billing.enabled` (config.js). Faux = tout gratuit. Ne l'active jamais sans que le propriétaire l'ait demandé : le test refuse si les infos légales manquent.
- Vente : achat unique « à vie » lié au compte Google, relais Cloudflare `wouf/billing-worker/` (vérifie le jeton Firebase, lit Stripe, envoie l'assistance par e-mail). Prix affiché dans `config.js` doit égaler le prix Stripe.
- Données de référence : `data.js` (chien), `species.js` (chat + helpers), leçons dans `lessons*.js`. Méthode d'éducation : **renforcement positif uniquement** (jamais de punition, collier de contrainte, etc.).

## Avant de livrer une modification de Wouf
1. `cd wouf && npm install && npm test` — doit être entièrement vert (contrôles statiques + relais + 18 scénarios navigateur). Sandbox : Chromium est dans `/opt/pw-browsers` (détecté automatiquement).
2. Nouvelle version visible → mettre à jour `version` dans `config.js` et `package.json`, ajouter une entrée en tête de `CHANGELOG` (business.js), changer `CACHE` dans `sw.js` (`wouf-vX.Y`). `npm run check` signale les oublis.
3. Toute nouvelle fonction utilisateur = un scénario dans `wouf/tests/e2e.js`. Tout changement du relais = un test dans `wouf/tests/unit/worker.test.mjs`.
4. Mettre à jour `wouf/docs/MAINTENANCE.md` si une procédure change.

## Git et publication
- Branche par défaut : `claude/infirmiere-ordonnances-upload-26nl16` ; la publication (GitHub Pages) se déclenche à chaque push dessus, **après** les tests (`.github/workflows/pages.yml`). Les branches de travail passent par une pull request (le workflow « Wouf — tests » tourne dessus).
- Ne jamais écrire de clé secrète dans le dépôt (Stripe, Resend) : elles vivent dans Cloudflare.
- Contenu santé / juridique : indicatif. Signale au propriétaire ce qui mériterait une relecture professionnelle ; n'invente jamais de tarifs d'assureurs ni de faits juridiques.
