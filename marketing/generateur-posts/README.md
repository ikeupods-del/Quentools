# Studio Posts — publications Instagram et TikTok (images)

Outil privé (jamais publié sur le site) pour créer des carrousels et des images aux couleurs du **Parvis** et de **QuenTools**.

## Ouvrir
- Double-cliquer sur `index.html` (Chrome ou Safari). Aucun serveur, aucune connexion, aucune ressource externe.
- Version en un seul fichier, à copier où l'on veut : `node tools/generateur-posts.js --fichier-unique ~/Desktop/Studio-Posts.html`.

## Utiliser
1. **Nouveau** : partir d'un modèle (Le Parvis : verset du jour, liste, encouragement, histoire biblique, prière, verset seul ; QuenTools : carrousel 5 images « situation → constat → solution → téléphone → question », conseil, liste, astuces, avant/après).
2. **Bibliothèque** : mes publications (enregistrées dans le navigateur), les 31 publications du Parvis et les 15 publications QuenTools déjà écrites.
3. Modifier les textes à droite. `*mot*` met le mot en couleur (or pour Le Parvis, lime ou violet pour QuenTools). Le texte trop long rétrécit tout seul ; une alerte s'affiche s'il ne tient vraiment pas.
4. Format : 4:5 Instagram (1080×1350), 1:1 (1080×1080), 9:16 Story, Reels, TikTok (1080×1920, avec affichage des zones masquées par TikTok).
5. **Image JPG** (⌘E) ou **Tout exporter** (⇧⌘E) : un .zip avec `01.jpg`, `02.jpg`… et `legende.txt`.

Raccourcis : ← → changer d'image, ⌘Z annuler, ⇧⌘Z rétablir, ⌘D dupliquer, N nouveau, B bibliothèque. Les vignettes se réordonnent par glisser-déposer. Le bouton Le Parvis / QuenTools convertit le carrousel d'un style à l'autre en gardant les textes.

## Règles de contenu (rappelées par des alertes)
- Le Parvis : versets en Louis Segond 1910 uniquement, recopiés mot pour mot, jamais inventés ; référence obligatoire.
- QuenTools (voir `design/POSITIONNEMENT.md`) : jamais de prix ni de lien dans une publication, jamais l'IA présentée comme moyen de création, pas de faux avis ni de chiffres inventés.

## Fichiers
- `index.html` : l'application (rendu sur canvas : l'aperçu est exactement l'image exportée).
- `donnees.js` : polices en base64 et bibliothèque, **généré** par `node tools/generateur-posts.js` (à relancer après une modification de `parvis-posts.js` ou de `tools/publications.json`).
- `parvis-posts.js` : textes des publications du Parvis.
- Contrôle : `node tools/verifier-generateur-posts.js` (modèles dans les 3 formats, bibliothèque, export ZIP, alertes, annulation, enregistrement ; `--captures dossier` pour des planches de relecture).
