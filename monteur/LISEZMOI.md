# QuenTools Monteur

Logiciel de montage vidéo personnel, local (aucune donnée envoyée sur internet). Il s'ouvre dans le navigateur, et FFmpeg fait le travail en coulisses.

## Installation (une seule fois)
1. Ouvrir le **Terminal** (Cmd + Espace, taper « Terminal »).
2. Si Homebrew n'est pas installé, coller la commande donnée sur https://brew.sh puis suivre les instructions affichées.
3. Coller : `brew install node ffmpeg`

## Utilisation
Double-cliquer sur **Lancer le monteur.command** (la première fois : clic droit → Ouvrir, puis confirmer). La page s'ouvre sur http://localhost:4173.

1. **Ajouter des fichiers** : vidéos, photos, musiques (ou les glisser dans la fenêtre).
2. **+ Timeline** pour poser un clip. Cliquer sur un clip pour régler ses effets à droite.
3. **Exporter la vidéo** : le fichier MP4 est enregistré dans `Films/QuenMonteur/exports`.

## Fonctions
- Découpe (début/fin, « Couper ici » à la position du curseur), ordre des clips, suppression.
- Vitesse de 0,25× à 4×, volume, fondu d'entrée et de sortie.
- Couleurs : luminosité, contraste, saturation, noir et blanc.
- Texte avec retour à la ligne automatique (haut, milieu, bas, couleur, taille).
- **Fond vert** : choisir la couleur à enlever avec la pipette, régler la sensibilité et la douceur des bords, retirer le reflet vert, puis remplacer par une couleur, une photo ou une vidéo.
- Musique de fond avec réglage du volume.
- Formats vertical 9:16, horizontal 16:9 et carré.

## Limites
- Le fond vert enlève une couleur unie (mur vert, bleu, etc.). Il ne détoure pas une personne devant un décor quelconque.
- Chaque réglage de fond vert s'applique à un clip entier.
- L'aperçu est une image fixe avec les effets ; « Lire l'original » joue la vidéo sans effets.

## Dossiers
- Médias importés : `~/Movies/QuenMonteur/medias`
- Exports : `~/Movies/QuenMonteur/exports`
- Le projet en cours est mémorisé dans le navigateur.

## Technique
`server.js` (serveur local sans dépendance, Node 18+) et `index.html` (interface). Variables : `QM_PORT` (port), `QM_DIR` (dossier de travail).
