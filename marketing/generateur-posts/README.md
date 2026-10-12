# Studio Posts — publications Instagram et TikTok (images)

Outil privé (jamais publié sur le site) pour créer des carrousels et des images aux couleurs du **Parvis** et de **QuenTools**.

## Ouvrir
- **Application Mac** : le `.dmg` de la dernière version « Studio Posts » dans les Releases du dépôt (ouvrir, glisser dans Applications ; au premier lancement, clic droit → Ouvrir). Construite et essayée sur un vrai Mac par le workflow « Studio Posts — application Mac » (`.github/workflows/studio-posts.yml`) à chaque modification de ce dossier ; nouvelle version publiée = changer `version` dans `package.json`. Fenêtre Electron : `main.js` (menus en français, ⌘Z de la publication via `studioAnnuler`).
- Ou double-cliquer sur `index.html` (Chrome ou Safari). Aucun serveur, aucune connexion, aucune ressource externe.
- Version en un seul fichier, à copier où l'on veut : `node tools/generateur-posts.js --fichier-unique ~/Desktop/Studio-Posts.html`.

## Générer automatiquement (application Mac)
**✨ Générer** (touche G, ⌘G) : l'IA locale écrit une publication complète (images + légende + hashtags) pour la marque et le format choisis en haut, puis l'ouvre ; tout reste modifiable. Le petit **▾** à côté règle le type (au hasard ou un type précis), un sujet facultatif et le nombre (1 à 10 d'un coup, rangées dans Bibliothèque → Mes publications).
- IA locale : Qwen3 4B Instruct (licence Apache 2.0), sur la puce du Mac, rien n'est envoyé sur internet. Téléchargée une seule fois (≈ 2,5 Go) au premier clic, **sauf si QuentMovie l'a déjà** (`~/Movies/QuentMovie/modeles`) : elle est alors reprise telle quelle. Sinon rangée dans le stockage de l'application.
- Le Parvis : verset du jour, liste en 5 points, encouragement (3 versets), prière. L'IA n'écrit jamais de verset : elle choisit une référence dans la liste vérifiée (Louis Segond 1910, versets déjà publiés dans `parvis-posts.js`) et le programme recopie le texte exact. Toute citation entre guillemets ou référence dans ses textes est refusée.
- QuenTools : carrousel 5 images (avec la capture sur téléphone d'un site d'exemple : `captures/`, métiers dans `secteurs.js`), conseil, liste, astuces. Refusés par le programme : prix, liens, chiffres et statistiques, mention de l'IA, tutoiement.
- Une réponse refusée est redemandée avec la raison (3 essais) ; les publications déjà faites sont transmises pour varier les sujets et les versets.
- Fichiers : `generer.js` (formulaires, règles, construction), `ia.js` + `ia-worker.js` (modèle, processus séparé), `preload.js` (passerelle de la page). Captures : `node tools/captures-posts.js` puis `node tools/generateur-posts.js`.
- Contrôles : `node tools/verifier-generation-posts.js` (IA simulée, textes au maximum, bouton dans la page) ; essai avec le vrai modèle sur Mac : `tests/ia-reel.js` (workflow). Dans un navigateur, le bouton n'apparaît pas.

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
