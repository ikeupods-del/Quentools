# QuentMovie

Logiciel de montage vidéo pour Mac, local (aucune donnée envoyée sur internet). Interface en français, moteur FFmpeg.

## Installer l'application
1. Sur GitHub : onglet **Releases** du dépôt → télécharger le fichier `QuentMovie-….dmg` de la dernière version.
2. Ouvrir le `.dmg`, glisser **QuentMovie** dans **Applications**.
3. Premier lancement : **clic droit sur QuentMovie → Ouvrir → Ouvrir** (l'application n'est pas signée par Apple). Si macOS refuse encore, Terminal : `xattr -cr /Applications/QuentMovie.app`, puis rouvrir.

L'application est construite pour les Mac à puce Apple (M1 et suivants). Pour un Mac Intel, utiliser la version « sans installation » ci-dessous.

## Version sans installation (Terminal)
`brew install node ffmpeg`, puis double-clic sur **Lancer QuentMovie (sans installation).command** (la première fois : clic droit → Ouvrir). La fenêtre s'ouvre dans le navigateur, sur http://localhost:4173.

## Utilisation
1. **Médias** : ajouter vidéos, photos, musiques (bouton, ou glisser dans la fenêtre).
2. Glisser les médias dans la **timeline** (ou clic sur « + »). Cliquer un clip pour régler ses effets à droite.
3. **Effets** : 42 effets image avec vignette de prévisualisation sur ton image (ambiances, flou, stylisés, mouvement, lumière). Clic ou glisser sur un clip ; plusieurs effets possibles, réordonnables, réglables.
4. **Transitions** : 18 types. Cliquer le rond entre deux clips, puis choisir.
5. **Titres** : 8 styles prêts, animations d'apparition, texte avec début et durée.
6. **Sons** : voix grave/aiguë/robot, écho, cathédrale, téléphone, réduction du bruit, normalisation, basses, voix claire.
7. **Fond vert** : pipette pour choisir la couleur, sensibilité, bords doux, reflet vert, puis remplacement par une couleur, une photo ou une vidéo.
8. **Incrustation** : image ou vidéo dans l'image (logo, réaction), 9 positions, taille, opacité.
9. Pistes audio : musique, voix off, positionnables par glisser, volume, fondu, boucle.
10. **Aperçu avec effets** : rendu rapide de toute la timeline, lu dans la fenêtre. **Exporter** : MP4 en 720p, 1080p ou 4K, 24/30/60 images/s.

Raccourcis : S couper à la tête de lecture, Suppr supprimer, Espace lire, ← → déplacer la tête de lecture (Maj = 1 s), ⌘Z / ⇧⌘Z annuler et rétablir.
Projets : « Enregistrer… » et « Ouvrir… » ; le projet en cours est aussi sauvegardé automatiquement.

## Limites
- Une seule piste vidéo (les clips se suivent) plus l'incrustation par clip ; pas de multicam, de suivi de mouvement ni d'étalonnage par courbes.
- Le fond vert enlève une couleur unie ; il ne détoure pas une personne devant un décor quelconque.
- L'aperçu fixe affiche le résultat d'une image ; l'aperçu avec effets est un rendu (quelques secondes selon la durée).

## Dossiers
`~/Movies/QuentMovie` : `medias`, `exports`, `projets`.

## Pour les développeurs
- `server.js` (moteur HTTP + FFmpeg, sans dépendance), `effects.js` (banque d'effets, transitions, titres), `ffmpeg-path.js`, `index.html`, `main.js` (fenêtre Electron).
- `npm test` : contrôle chaque effet (valeurs par défaut, minimales, maximales), chaque transition, le texte, l'incrustation, le fond vert, l'export, l'aperçu animé.
- Nouvel effet : l'ajouter dans `effects.js` (`fx(...)`), le test le prend automatiquement.
- Application : workflow GitHub « QuentMovie — application Mac » (macOS, `npm run dist`).
