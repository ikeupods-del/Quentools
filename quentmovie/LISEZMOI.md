# QuentMovie

Logiciel de montage vidéo pour Mac, local (aucune donnée envoyée sur internet). Interface en français, moteur FFmpeg. Pour le vlog, le podcast, les réseaux sociaux et les reportages.

## Installer l'application
1. Sur GitHub : onglet **Releases** du dépôt → télécharger le fichier `QuentMovie-….dmg` de la dernière version.
2. Ouvrir le `.dmg`, glisser **QuentMovie** dans **Applications** (remplacer l'ancienne version si besoin).
3. Premier lancement : si macOS bloque l'application, **Réglages Système → Confidentialité et sécurité → Ouvrir quand même**, ou dans le Terminal : `xattr -cr /Applications/QuentMovie.app`.

Construite pour les Mac à puce Apple (M1 et suivants). Pour un Mac Intel : version « sans installation » ci-dessous.

## Version sans installation (Terminal)
`brew install node ffmpeg`, puis double-clic sur **Lancer QuentMovie (sans installation).command** (la première fois : clic droit → Ouvrir). La page s'ouvre sur http://localhost:4173.

## Ce que contient QuentMovie
- **Tous les formats** : vidéos .mov (iPhone HEVC, ProRes), .mp4, .mkv, .avi, .webm, .mts… ; photos JPG, PNG, HEIC (iPhone), TIFF, WebP ; sons MP3, WAV, M4A, FLAC, OGG. Les formats que la fenêtre ne sait pas lire sont convertis automatiquement en copie légère pour la lecture.
- **64 effets image** avec vignette de prévisualisation sur ton image : ambiances (ciné, vintage, teal et orange, HDR, duotone…), vlog (stabilisation, peau douce, gros plan, contraste TikTok…), flou, stylisés (VHS, glitch, dessin animé, vieux film, écran en 4…), mouvement (zooms, panoramiques, secousse, zoom éclair…), lumière.
- **22 effets de son et de voix** : voix podcast pro, porte de bruit, de-esser, réduction du bruit, normalisation, voix radio, mégaphone, sous l'eau, robot, écho…
- **29 transitions**.
- **Titres** : 12 titres de reportage animés (bandeau de journaliste, flash info défilant, lieu et date, chapitre, citation, machine à écrire, titre souligné, barre de progression, compte à rebours, générique de fin…), titres simples, polices du Mac, sous-titres (saisie ou import .srt).
- **Bibliothèque libre de droits**, créée pour QuentMovie : 39 bruitages (clavier, machine à écrire, whoosh, impacts, notifications, applaudissements, pluie, vagues…), 9 musiques (électro, lo-fi, vlog, hip-hop, piano, épique, suspense…), 30 stickers (flèches, bulles, étiquettes LIVE/NEW, boutons S'ABONNER…).
- **Calques** : images, vidéos et stickers posés sur un clip, avec position, taille, rotation, opacité et animation d'apparition.
- **Podcast** : clip audio avec pochette et visualiseur animé, voix off enregistrée au micro, musique qui baisse automatiquement quand la voix parle, export MP3/M4A/WAV.
- **Outils** : couper les silences automatiquement, diaporama express, écrans prêts (titre, générique, compte à rebours, flash info).
- **Export** : MP4, MOV ProRes, WebM, GIF animé, MP3, M4A, WAV ; 720p, 1080p ou 4K ; 24/30/60 images/s ; égalisation du volume.

## Raccourcis clavier
Touche **?** dans l'application pour la liste complète. Principaux : Espace lire/pause avec les effets, ⌥Espace lire le clip sans effets, J/K/L, ←/→ image par image, ↑/↓ clip précédent/suivant, S ou ⌘B couper, I/O début/fin du clip à la tête de lecture, ⌘D dupliquer, ⌘C/⌘V copier/coller, ⌥⌘V coller les effets, M repère, ⌘Z/⇧⌘Z, ⌘S/⌘O/⌘N, ⌘I importer, ⌘E exporter, +/− zoom, ⇧Z tout afficher, 1 à 9 onglets.
À la souris : glisser un clip pour changer l'ordre, tirer ses bords pour le raccourcir, glisser un effet sur un clip.

## Limites
- Une piste vidéo principale (les clips se suivent) plus des calques par clip ; pas de multicam, de suivi de mouvement ni d'étalonnage par courbes.
- Pas de sous-titres automatiques (reconnaissance de la parole) : ils se saisissent ou s'importent en .srt.
- Le fond vert enlève une couleur unie ; il ne détoure pas une personne devant un décor quelconque.
- L'aperçu avec effets est un rendu rapide (quelques secondes selon la durée), pas une lecture instantanée.

## Dossiers
`~/Movies/QuentMovie` : `medias`, `exports`, `projets`.

## Pour les développeurs
- `server.js` (moteur HTTP + FFmpeg, sans dépendance), `effects.js` (effets, transitions, titres), `ffmpeg-path.js`, `index.html` (interface), `main.js` (fenêtre Electron).
- `bibliotheque/` : générée par `node scripts/generer-bibliotheque.js` (sons et musiques, synthèse) puis `python3 scripts/generer-stickers.py` (stickers, Pillow). Fichiers versionnés ; régénérer seulement pour les modifier.
- `npm test` : contrôle chaque effet (valeurs par défaut, minimales, maximales), transition, titre, calque, format d'import et d'export, le podcast et l'aperçu animé.
- Nouvel effet : une ligne `fx(...)` dans `effects.js`, le test le contrôle automatiquement.
- Application : workflow GitHub « QuentMovie — application Mac » (macOS, `npm run dist`), publiée dans Releases.
