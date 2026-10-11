# QuentMovie

Logiciel de montage vidéo pour Mac, local (aucune donnée envoyée sur internet). Interface en français, moteur FFmpeg. Pour le vlog, le podcast, les réseaux sociaux et les reportages.

## Installer l'application
1. Sur GitHub : onglet **Releases** du dépôt → télécharger le fichier `QuentMovie-….dmg` de la dernière version.
2. Ouvrir le `.dmg`, glisser **QuentMovie** dans **Applications** (remplacer l'ancienne version si besoin).
3. Premier lancement : si macOS bloque l'application, **Réglages Système → Confidentialité et sécurité → Ouvrir quand même**, ou dans le Terminal : `xattr -cr /Applications/QuentMovie.app`.

Construite pour les Mac à puce Apple (M1 et suivants). Pour un Mac Intel : version « sans installation » ci-dessous.

## Mises à jour automatiques (à partir de la 1.3)
QuentMovie vérifie au démarrage (puis toutes les 6 heures) s'il existe une nouvelle version. Si oui, il la télécharge en arrière-plan, vérifie qu'elle est intacte (empreinte SHA-256), puis propose « Redémarrer et installer » ; sinon elle s'installe toute seule à la fermeture. Plus besoin de retélécharger le `.dmg`. Vérification à la main : menu QuentMovie → « Rechercher les mises à jour… » ou onglet Outils. L'application doit se trouver dans le dossier Applications.

Publier une nouvelle version : changer `version` dans `package.json`, ajouter ses nouveautés dans `NOUVEAUTES.md`, puis fusionner sur la branche par défaut : le workflow construit et publie l'application, et les Mac la reçoivent tout seuls.

## Version sans installation (Terminal)
`brew install node ffmpeg`, puis double-clic sur **Lancer QuentMovie (sans installation).command** (la première fois : clic droit → Ouvrir). La page s'ouvre sur http://localhost:4173.

## Ce que contient QuentMovie
- **Tous les formats** : vidéos .mov (iPhone HEVC, ProRes), .mp4, .mkv, .avi, .webm, .mts… ; photos JPG, PNG, HEIC (iPhone), TIFF, WebP ; sons MP3, WAV, M4A, FLAC, OGG. Les formats que la fenêtre ne sait pas lire sont convertis automatiquement en copie légère pour la lecture.
- **Studio caméra + prompteur** (bouton « 🎥 Me filmer », ⇧⌘R) : la caméra et le micro du MacBook, ton texte qui défile juste sous la caméra (vitesse, taille, miroir), compte à rebours 3-2-1, niveau du micro. **Fond derrière toi en direct, sans fond vert** : mur noir au logo QuenTools en LED (choisi au départ), décors, arrière-plan flou ou tes photos ; la silhouette est détourée en direct (MediaPipe, modèle « multiclasse » précis ou « rapide », en local) calculée dans un fil séparé (`detoureur.js`, image recadrée autour de la personne, chaque image affichée avec sa découpe ; mode fluide automatique si le Mac ne suit pas, vitesse affichée) puis mélangée au décor sur la carte graphique (`compositeur.js` : masque lissé, affiné sur les couleurs, autres personnes effacées, halo de lumière) ; mode « vrai fond vert » ; la prise est enregistrée avec le fond. **Lumière LED de l'écran** (touche L) pour éclairer le visage. **Animations en direct** : touches 1 à 9 (S'abonner, J'aime, cloche, flèche, confettis…) et N (bandeau avec ton nom), ajoutées à la prise comme calques. Une prise impossible à convertir est gardée dans `~/Movies/QuentMovie/prises-a-verifier`. Chaque prise arrive automatiquement dans la timeline. La première fois, macOS demande l'autorisation pour la caméra et le micro.
- **Générateur de vidéos** (bouton « ✨ Générer », ⇧⌘G) : un sujet (« L'histoire de Michelin ») → texte tiré de l'article Wikipédia en français (introduction et sections historiques, à la durée choisie, modifiable scène par scène), images libres de Wikimedia Commons (celles de l'article d'abord, logos et petites images écartées), voix off avec une voix naturelle intégrée (téléchargée au premier usage) ou une voix du Mac (commande `say` ; les voix « Premium » sont repérées par ★), puis montage automatique : écran titre, une scène par image avec zoom ou panoramique lent, sous-titres au rythme de la voix, fondus, musique qui baisse sous la voix, générique avec la source et les auteurs des images (à garder si la vidéo est publiée : licence CC BY-SA du texte). Internet est nécessaire pour Wikipédia et les images.
- **Voix et parole** (Outils → Voix ; sans internet une fois installées, modèles dans `~/Movies/QuentMovie/modeles`) : voix naturelles Piper (Siwis, Tom, Jessica, Pierre, environ 65 à 80 Mo chacune ; licences des données : Siwis CC BY 4.0, Jessica et Pierre CC BY-SA 4.0, Tom AGPL v3) ; reconnaissance de la voix Parakeet (environ 660 Mo, une fois) pour les **sous-titres automatiques** (phrases ou mot à mot façon TikTok ; sur un clip, toute la vidéo ou chaque prise du studio) et la **coupe des blancs et des « euh »** (seuls les moments parlés sont gardés ; sous-titres, calques et titres suivent). Bouton qui ouvre les réglages du Mac pour télécharger les voix Premium d'Apple.
- **Miniature** (Outils) : image à la tête de lecture ou photo, gros titre en capitales, sous-titre, pastille, fond flou ou couleur, personne détourée avec contour ; JPEG 1280 × 720 (horizontal) ou 1080 × 1920 (vertical) rangé dans les exports.
- **Piste vidéo 2** (au-dessus de la piste principale) : image dans l'image (taille, place, rond ou coins arrondis, bordure, opacité, fondu) et plans de coupe plein écran, avec ou sans leur son ; bouton ⧉ d'un média ou glisser-déposer sur la piste.
- **34 looks pro** (étalonnages LUT : cinéma, argentique, saisons, noir et blanc…) avec intensité réglable, et import de tes propres looks `.cube`.
- **64 effets image** avec vignette de prévisualisation sur ton image : ambiances (ciné, vintage, teal et orange, HDR, duotone…), vlog (stabilisation, peau douce, gros plan, contraste TikTok…), flou, stylisés (VHS, glitch, dessin animé, vieux film, écran en 4…), mouvement (zooms, panoramiques, secousse, zoom éclair…), lumière.
- **22 effets de son et de voix** : voix podcast pro, porte de bruit, de-esser, réduction du bruit, normalisation, voix radio, mégaphone, sous l'eau, robot, écho…
- **32 transitions**.
- **Titres** : 12 titres de reportage animés (bandeau de journaliste, flash info défilant, lieu et date, chapitre, citation, machine à écrire, titre souligné, barre de progression, compte à rebours, générique de fin…), titres simples, polices du Mac, sous-titres (saisie ou import .srt).
- **Bibliothèque libre de droits**, créée pour QuentMovie (l'équivalent des packs vendus en ligne) :
  - 67 bruitages (clavier, whoosh, impacts, jeu vidéo, jeu télé, rembobinage, compte à rebours…) et 12 musiques (électro, lo-fi, trap, house, synthwave, piano, épique…) ;
  - 17 effets animés à superposer : fuites de lumière, brûlure de pellicule, reflet d'objectif, bokeh, neige, pluie, étincelles, confettis, cœurs, vieux film, VHS, fumée ;
  - 9 animations sur fond vert (bouton S'abonner avec clic et cloche, J'aime, cloche, flèche, cercle rouge, compte à rebours, lien en bio, glisse vers le haut, confettis), le vert est retiré automatiquement ;
  - 19 décors pour le fond vert, dont le **mur noir avec le logo QuenTools en LED** (fixe, sur le côté ou animé), plateau télé, studio podcast, ville de nuit, espace, coucher de soleil rétro… ;
  - 10 cadres (VHS, viseur REC, bandes cinéma, polaroid, pellicule, vieux téléviseur, en direct…), 30 stickers et 2 enseignes QuenTools.
- **Mes packs** : range dans `~/Movies/QuentMovie/packs` les packs gratuits trouvés sur internet (sons, images, vidéos, looks `.cube`), un sous-dossier par pack ; QuentMovie les classe dans les bons onglets. Sources gratuites : Pixabay, Mixkit, Freesound (licence CC0), bibliothèque audio de YouTube Studio, FreshLUTs. Vérifier la licence de chaque pack.
- **Calques** : images, vidéos et stickers posés sur un clip, avec position, taille, rotation, opacité, animation d'apparition, plein écran, retrait du fond vert et modes de mélange (écran pour les vidéos sur fond noir, produit, incrustation…).
- **Podcast** : clip audio avec pochette et visualiseur animé, voix off enregistrée au micro, musique qui baisse automatiquement quand la voix parle, export MP3/M4A/WAV.
- **Outils** : couper les silences automatiquement, diaporama express, écrans prêts (titre, générique, compte à rebours, flash info).
- **Export** : encodage par la puce vidéo du Mac (VideoToolbox, par défaut) ou par le processeur ; MP4, MOV ProRes, WebM, GIF animé, MP3, M4A, WAV ; 720p, 1080p ou 4K ; 24/30/60 images/s ; égalisation du volume.

## Raccourcis clavier
Touche **?** dans l'application pour la liste complète. Principaux : ⇧⌘R studio caméra et prompteur, Espace lire/pause avec les effets, ⌥Espace lire le clip sans effets, J/K/L, ←/→ image par image, ↑/↓ clip précédent/suivant, S ou ⌘B couper, I/O début/fin du clip à la tête de lecture, ⌘D dupliquer, ⌘C/⌘V copier/coller, ⌥⌘V coller les effets, M repère, ⌘Z/⇧⌘Z, ⌘S/⌘O/⌘N, ⌘I importer, ⌘E exporter, +/− zoom, ⇧Z tout afficher, 1 à 9 onglets.
À la souris : glisser un clip pour changer l'ordre, tirer ses bords pour le raccourcir, glisser un effet sur un clip.

## Limites
- Une piste vidéo principale (les clips se suivent), une piste vidéo 2 au-dessus et des calques par clip ; pas de multicam, de suivi de mouvement ni d'étalonnage par courbes.
- Les sous-titres automatiques et la coupe des « euh » dépendent de la reconnaissance : relire les sous-titres (noms propres) avant de publier. Une hésitation non reconnue comme mot est coupée comme un blanc.
- Le détourage sans fond vert (studio, miniature) est très bon dans une pièce éclairée ; un vrai fond vert reste plus net pour les cheveux fins.
- L'aperçu avec effets est un rendu rapide (quelques secondes selon la durée), pas une lecture instantanée.

## Dossiers
`~/Movies/QuentMovie` : `medias`, `exports`, `projets`.

## Pour les développeurs
- `server.js` (moteur HTTP + FFmpeg, sans dépendance), `effects.js` (effets, transitions, titres), `ffmpeg-path.js`, `index.html` (interface), `main.js` (fenêtre Electron), `maj.js` (mises à jour automatiques depuis les Releases GitHub, testées par `tests/maj.js`), `compositeur.js` (fond virtuel du studio en WebGL, nettoyage du masque testé par `tests/compositeur.js`), `generateur.js` (générateur de vidéos, testé par `tests/generateur.js` avec un faux Wikipédia et, sur le Mac de construction, par `tests/generateur-reel.js` avec le vrai), `detoureur.js` (détourage du studio dans un Web Worker). Le ffprobe de `ffprobe-static` pour puce Apple est en réalité un programme Intel : il n'est plus livré, le moteur lit les fichiers avec FFmpeg seul quand ffprobe manque (`QM_SANS_FFPROBE=1` pour tester ce cas), et le workflow refuse tout programme livré non compatible puce Apple. `modeles/` : modèles de détourage MediaPipe (Apache 2.0). `parole.js` (voix, reconnaissance, sous-titres et passages à garder, testés par `tests/parole.js` ; réel avec `QM_RESEAU=1`, lancé par le workflow) et `parole-worker.js` (sherpa-onnx, Apache 2.0, dans un processus séparé lancé avec `ELECTRON_RUN_AS_NODE`) ; modèles téléchargés depuis les Releases de k2-fsa/sherpa-onnx : voix Piper françaises, Parakeet TDT 0.6B v3 (NVIDIA, CC BY 4.0), Silero VAD (MIT). Piste vidéo 2 : `poserPistes` dans `server.js`, testée par `tests/pistes.js`.
- `bibliotheque/` : générée par `node scripts/generer-bibliotheque.js` (sons et musiques, synthèse), `python3 scripts/generer-stickers.py` (stickers), `python3 scripts/generer-pack.py` (looks LUT, effets animés, cadres) et `python3 scripts/generer-fonds.py` (décors, animations sur fond vert, enseignes QuenTools ; police de `assets/fonts/`). Chaque script ne remplace que ses propres listes de `index.json` ; un argument limite la génération (ex. `python3 scripts/generer-fonds.py fonds`). Fichiers versionnés ; régénérer seulement pour les modifier. Numpy, Pillow et FFmpeg requis.
- `npm test` : contrôle chaque effet (valeurs par défaut, minimales, maximales), transition, titre, calque, format d'import et d'export, le podcast et l'aperçu animé.
- Nouvel effet : une ligne `fx(...)` dans `effects.js`, le test le contrôle automatiquement.
- Application : workflow GitHub « QuentMovie — application Mac » (macOS, `npm run dist`), publiée dans Releases.
