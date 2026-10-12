# Studio Posts — publications Instagram et TikTok (images)

Outil privé (jamais publié sur le site) pour créer des carrousels et des images aux couleurs du **Parvis** et de **QuenTools**.

## Ouvrir
- **Application Mac** : le `.dmg` de la dernière version « Studio Posts » dans les Releases du dépôt (ouvrir, glisser dans Applications ; au premier lancement, clic droit → Ouvrir). Construite et essayée sur un vrai Mac par le workflow « Studio Posts — application Mac » (`.github/workflows/studio-posts.yml`) à chaque modification de ce dossier ; nouvelle version publiée = changer `version` dans `package.json`. Fenêtre Electron : `main.js` (menus en français, ⌘Z de la publication via `studioAnnuler`).
- Ou double-cliquer sur `index.html` (Chrome ou Safari). Aucun serveur, aucune connexion, aucune ressource externe.
- Version en un seul fichier, à copier où l'on veut : `node tools/generateur-posts.js --fichier-unique ~/Desktop/Studio-Posts.html`.

## Générer en un clic (✨ Générer, touche G)
Choisir la marque et le thème (Le Parvis : verset du jour, encouragement, prière, histoire biblique, liste ; QuenTools : carrousel 5 images par métier, conseil, liste, astuces), éventuellement un sujet ou un métier, puis **Générer** : la publication est écrite, mise en page (le texte trop long est raccourci), légende et hashtags compris, prête à exporter (« Exporter tout de suite » = ZIP direct).
- **IA locale** (application Mac) : modèle Qwen3 4B téléchargé une seule fois dans `~/Movies/QuentMovie/modeles` (partagé avec QuentMovie et Studio Sites), aucune connexion ensuite. Code partagé : `marketing/ia-locale/` copié dans chaque outil par `node tools/synchro-ia-locale.js` (ne jamais modifier les copies).
- **Sans IA** (page ouverte dans un navigateur, ou IA non installée) : une publication déjà écrite est proposée, la génération marche donc toujours.
- **Règles contrôlées par le programme** (`generation.js`), pas par l'IA : versets du Parvis pris uniquement dans la bibliothèque (Louis Segond 1910, mot pour mot, l'IA ne choisit qu'un numéro et écrit la méditation) ; références d'histoires bibliques seulement si l'histoire est connue ; QuenTools sans prix, lien, pourcentage, chiffre inventé, faux avis ni mention de l'IA. Un texte refusé est redemandé deux fois, puis la publication déjà écrite est proposée.
- Carrousels QuenTools : la capture du téléphone est celle du site d'exemple du métier (`marketing/generateur-posts/captures/`, refaites par `node tools/captures-exemples.js`).

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
- `generation.js` : génération par l'IA (thèmes, consignes, règles de contenu, repli) ; `preload.js` + `main.js` : pont vers l'IA locale ; `ia-locale.js`, `ia-worker.js` : copies de `marketing/ia-locale/`.
- `captures/` : captures sur téléphone des sites d'exemple.
- Contrôle : `node tools/verifier-generateur-posts.js` (modèles dans les 3 formats, bibliothèque, export ZIP, alertes, annulation, enregistrement ; `--captures dossier` pour des planches de relecture).

## Envoi par AirDrop
Bouton « AirDrop » (⇧⌘A, menu Fichier) et bouton dans le résultat de « Générer » : les images JPG et la légende sont déposées dans un dossier temporaire puis la feuille de partage de macOS s'ouvre (`partage:envoyer` dans `main.js`, `studioPartage` dans `preload.js`). Bouton masqué hors de l'application Mac.

## Assistant (tchat)
Bouton « 💬 Assistant » (touche C) : on explique en français la publication voulue (« une story pour un plombier à Nantes, ton rassurant ») ou une retouche (« raccourcis le titre de l'image 2 »). L'IA locale choisit marque, thème, sujet, format et consignes (`Generation.comprendre`) ; la publication est ensuite écrite et contrôlée par les mêmes règles que « Générer » (les consignes ne permettent ni prix, ni lien, ni verset inventé). Retouches : champs de texte existants seulement, jamais un verset, mêmes règles de contenu (`Generation.verifierModifs`), annulables par ⌘Z. Sans IA installée, une analyse par mots-clés comprend les demandes de création. Un bandeau signale une nouvelle version publiée (`nouvelle-version.js`, copie de `marketing/ia-locale/`) : le bouton ouvre la page de téléchargement, rien ne s'installe tout seul.
