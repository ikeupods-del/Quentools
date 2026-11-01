# Il Prezzo del Silenzio

Jeu d'aventure en 3D dans le navigateur, à la troisième personne, ambiance de film d'époque (image sépia, grain, bandes noires pendant les dialogues). Histoire d'une famille du sud de l'Italie, de 1861 à aujourd'hui, en sept chapitres : Sicile, Sardaigne, Calabre. Personnages et villages inventés, contexte historique réel.

Projet personnel : **pas publié sur le site** (dossier absent des `rsync` de `.github/workflows/pages.yml`, page en `noindex`).

## Jouer

Ouvrir `index.html` par un petit serveur local (les navigateurs refusent les modules et les polices depuis un simple fichier) :

```
cd jeux/silenzio && python3 -m http.server 8765
```

puis http://localhost:8765. Fonctionne sur ordinateur (clavier + souris) et sur téléphone (joystick tactile).

| Clavier | Action |
|---|---|
| ZQSD, WASD ou flèches | marcher, conduire le carretto |
| Souris (clic pour la capturer) | regarder |
| Maj | sprinter (jauge d'endurance) |
| E | parler, cueillir, agir |
| F | monter ou descendre du carretto |
| Espace, 1, 2 | dialogues et choix |
| Échap | pause (recommencer l'étape, effet pellicule, qualité graphique, son) |

**Qualité graphique** (menu ou pause) : Haute (ombres 4096, occlusion ambiante, halo, herbe dense), Moyenne, Basse (téléphones). Par défaut : Haute sur ordinateur, Basse sur écran tactile. Si l'image saccade pendant les 12 premières secondes, le jeu propose de baisser la qualité.

La progression (dernière étape, fins découvertes, qualité) est gardée dans le navigateur (`localStorage`, clé `silenzio:v1`).

## Chapitre I — Conca d'Oro, Sicile, 1861 (jouable)

Turi, cueilleur au baglio Sant'Anna près de Palerme. Étapes : parler au contremaître, cueillir 8 citrons, livrer 6 cagettes au marché en carretto contre la montre (chaque choc en fait tomber une), rentrer au crépuscule, poursuivre un voleur dans les rangées, scène de nuit avec les campieri de Don Gaspare, choix. Trois fins : « Le silence » (payer), « Le témoin » (signer chez les carabiniers), « La peur » (ne pas signer) ; la branche des carabiniers passe par une traversée de nuit à éviter les patrouilles (cônes de lumière, jauge de soupçon). Chaque échec renvoie au dernier point de passage.

Faits historiques cités (carton final) : expédition des Mille (1860), royaume d'Italie (1861), pièce *I mafiusi di la Vicaria* (1863), enquête de Leopoldo Franchetti (1876) sur l'« industrie de la violence » dans les jardins d'agrumes de Palerme. À faire relire par un historien avant toute diffusion publique.

## Chapitres prévus (affichés « Bientôt » dans le menu)

II Les mines de Buggerru (Sardaigne, 1904) · III Le Préfet de fer (Sicile, 1926) · IV L'été 1943 (Sicile) · V Aspromonte (Calabre, 1977) · VI L'été 1992 (Palerme) · VII Gioia Tauro (Calabre, aujourd'hui). Liste dans `CHAPITRES` (jeu.js).

## Fichiers

- `index.html` : écrans (chargement, titre, cartons, dialogues, interface, commandes tactiles) et style ; charge `jeu.js` comme module (carte d'import vers `vendor/`).
- `textures.js` : matières fabriquées par le programme, raccordables, avec couleur, relief (normales) et rugosité : enduit à la chaux, pierre de taille dorée, tuiles canal, pavés, terre, bois peint écaillé, écorce, tissu, mèches de cheveux, peau des visages (`texVisage` : homme, femme, vieux), raquettes de figuier, feuillages et fleurs (citronnier, olivier, cyprès, herbes, bougainvillier, géranium, vigne), image pieuse des autels.
- `jeu.js` : tout le jeu. Sections dans l'ordre : qualité (`QUALITES`), rendu et post-traitements (`compo` : occlusion ambiante GTAO, halo, sortie ACES, étalonnage `ETALON` : chaud/froid, vignette, grain, légère aberration), matériaux (`M('famille:couleur')`), constructeur de décors fusionnés par matière (`piece`, `poser`, `construireLots`), ciel physique + nuages + nuit étoilée et éclairage d'ambiance tiré du ciel (`majEnvironnement`), mer, relief (`H(x, z)`), obstacles, bâtiments (`maison`, `fenetre`, `porte`, `toit`, `muret`, église, baglio, masseria), végétation en instances au vent (`auVent`, `couronne`, `foret`, herbe autour du joueur `majHerbe`), lanternes, décor sicilien (`pot`, `bougainvillier`, `autel`, `meule`, `linge`, `banc`, `lanterneMurale`, treille du baglio, maisons du second rang), personnages articulés à tête sculptée (`formeTete`, yeux et paupières qui clignent, gestes quand ils parlent : `humain`, `animer`, `pnj`), animaux (`VIE`, `majVie` : hirondelles, poules, chien, chat), carretto, joueur, caméra d'épaule, heure du jour (`heure(0 → 2)` : jour, crépuscule, nuit ; réglages dans `AMBIANCES`), interface et dialogues filmés (`cadrer` : champ-contrechamp par-dessus l'épaule au téléobjectif, flou d'arrière-plan `passeFlou`), rayons de soleil (`RAYONS`), son fabriqué (`SON`), histoire (`TXT`, `FINS`, `ETAPES`), patrouilles, boucle.
- `vendor/` : three.js r169 et ses modules (ciel, post-traitements, fusion de géométries), MIT ; `textures/waternormals.jpg` (eau, exemples three.js, MIT) ; `fonts/` (Cormorant, Bitter, Oswald, OFL). Tout est hébergé ici, aucun service externe.
- Essais automatiques : ajouter `?essai` à l'adresse fait tourner la logique sans dessiner l'image (utile dans un navigateur sans carte graphique).

## Ajouter ou modifier une étape

Une étape = une entrée de `ETAPES` : `obj()` (texte de l'objectif), `cible()` (repère doré et mini-carte), `setup()` (positions quand on reprend à cette étape), `prep()` (préparation à chaque entrée), `debut()`, `maj(dt)` (appelée à chaque image). Passer à la suivante : `aller('nom')` ; échec : `echec('message', 'étape de reprise')`. Une interaction (« E — … ») : `inter({ pos, r, si, lib, faire })`. Un dialogue : `dire([['Nom', 'texte'], …, { question, choix: [[libellé, action], …] }], suite)`.

## Limites

Rendu d'un jeu indépendant soigné, pas d'un jeu de grand studio : personnages modelés par le programme (pas de visages scannés ni de capture de mouvement), pas de doublage, pas de combat ni d'armes à feu jouables, un seul chapitre jouable. Le navigateur doit accepter WebGL 2 ; en qualité Haute, un Mac récent est recommandé.
