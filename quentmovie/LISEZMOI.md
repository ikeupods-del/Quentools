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
- **Studio caméra + prompteur** (bouton « 🎥 Me filmer », ⇧⌘R) : la caméra et le micro du MacBook, ton texte qui défile juste sous la caméra (vitesse, taille, miroir), compte à rebours 3-2-1, niveau du micro. **Fond derrière toi en direct, sans fond vert** : mur noir au logo QuenTools en LED (choisi au départ), décors, arrière-plan flou ou tes photos ; la silhouette est détourée en direct (module MediaPipe local, sans internet) et la prise est enregistrée avec le fond. Chaque prise arrive automatiquement dans la timeline. La première fois, macOS demande l'autorisation pour la caméra et le micro.
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
- **Export** : MP4, MOV ProRes, WebM, GIF animé, MP3, M4A, WAV ; 720p, 1080p ou 4K ; 24/30/60 images/s ; égalisation du volume.

## Raccourcis clavier
Touche **?** dans l'application pour la liste complète. Principaux : ⇧⌘R studio caméra et prompteur, Espace lire/pause avec les effets, ⌥Espace lire le clip sans effets, J/K/L, ←/→ image par image, ↑/↓ clip précédent/suivant, S ou ⌘B couper, I/O début/fin du clip à la tête de lecture, ⌘D dupliquer, ⌘C/⌘V copier/coller, ⌥⌘V coller les effets, M repère, ⌘Z/⇧⌘Z, ⌘S/⌘O/⌘N, ⌘I importer, ⌘E exporter, +/− zoom, ⇧Z tout afficher, 1 à 9 onglets.
À la souris : glisser un clip pour changer l'ordre, tirer ses bords pour le raccourcir, glisser un effet sur un clip.

## Limites
- Une piste vidéo principale (les clips se suivent) plus des calques par clip ; pas de multicam, de suivi de mouvement ni d'étalonnage par courbes.
- Pas de sous-titres automatiques (reconnaissance de la parole) : ils se saisissent ou s'importent en .srt.
- Le fond vert enlève une couleur unie : pour mettre un décor derrière soi (par exemple le mur noir au logo QuenTools), il faut se filmer devant un fond uni et bien éclairé, vert de préférence (tissu ou carton). QuentMovie ne détoure pas une personne devant un mur quelconque.
- L'aperçu avec effets est un rendu rapide (quelques secondes selon la durée), pas une lecture instantanée.

## Dossiers
`~/Movies/QuentMovie` : `medias`, `exports`, `projets`.

## Pour les développeurs
- `server.js` (moteur HTTP + FFmpeg, sans dépendance), `effects.js` (effets, transitions, titres), `ffmpeg-path.js`, `index.html` (interface), `main.js` (fenêtre Electron), `maj.js` (mises à jour automatiques depuis les Releases GitHub, testées par `tests/maj.js`).
- `bibliotheque/` : générée par `node scripts/generer-bibliotheque.js` (sons et musiques, synthèse), `python3 scripts/generer-stickers.py` (stickers), `python3 scripts/generer-pack.py` (looks LUT, effets animés, cadres) et `python3 scripts/generer-fonds.py` (décors, animations sur fond vert, enseignes QuenTools ; police de `assets/fonts/`). Chaque script ne remplace que ses propres listes de `index.json` ; un argument limite la génération (ex. `python3 scripts/generer-fonds.py fonds`). Fichiers versionnés ; régénérer seulement pour les modifier. Numpy, Pillow et FFmpeg requis.
- `npm test` : contrôle chaque effet (valeurs par défaut, minimales, maximales), transition, titre, calque, format d'import et d'export, le podcast et l'aperçu animé.
- Nouvel effet : une ligne `fx(...)` dans `effects.js`, le test le contrôle automatiquement.
- Application : workflow GitHub « QuentMovie — application Mac » (macOS, `npm run dist`), publiée dans Releases.
