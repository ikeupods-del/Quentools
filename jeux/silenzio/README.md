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

## Chapitre I — Conca d'Oro, Sicile, 1861-1877 (jouable)

**1861.** Turi, cueilleur au baglio Sant'Anna près de Palerme : cueillette, livraison en carretto contre la montre, poursuite d'un voleur, visite nocturne des campieri de Don Gaspare. Payer ou aller voir les carabiniers (traversée de nuit à éviter les patrouilles) ; signer chez le brigadier mène à la fin « Le témoin ». Sinon, Don Gaspare convoque Turi à la masseria : initiation (« punciuta »), Turi devient homme d'honneur.

**1877, fête de Santa Lucia.** Turi est gabellotto de Sant'Anna, marié à Concetta, père de Saro. Village pavoisé (drapeaux à la Trinacria, guirlandes rouges et jaunes, arche de lumières, statue de la sainte). Travaux honnêtes pour gagner des lires (points verts sur la carte) : cueillette (8 lire), livraisons en carretto vers le marché ou le port (10 lire + 2 par cagette intacte), pêche au bout de la jetée (3 lire par poisson, mini-jeu). L'argent de la famille (l'enveloppe de Don Gaspare) est compté à part et ne paie pas le passage. Récupérer la part de Mastro Nunzio (ou la payer de sa poche), rafle des carabiniers, fuite par les ruelles, puis **choix final** : partir pour la Nouvelle-Orléans (passage 120 lire d'argent propre ; s'il en manque, quelques jours de travail en plus) ou rester en Sicile. Fins : « Le témoin », « L'autre rive », « Le capo ».

Faits historiques cités dans les cartons : expédition des Mille (1860), royaume d'Italie (1861), *I mafiusi di la Vicaria* (1863), enquête Franchetti (1876), rituel d'initiation décrit par la police dans les années 1870 (Stuppagghieri de Monreale, Fratuzzi de Bagheria), émigration sicilienne vers la Nouvelle-Orléans et lynchage de 1891, assassinat de Notarbartolo (1893), drapeau à la Trinacria (couleurs des Vêpres de 1282, drapeau officiel de la Région depuis 2000). À faire relire par un historien avant toute diffusion publique.

## Les familles (menu « Les familles »)

Galerie de quatorze personnages : les dix de la saga, de 1880 à aujourd'hui (Don Calogero, Carmela « La Lupa », Efisio, Vittorio « Le Baron », Rocco « Il Vangelo », Totuccio, Gavino « Su Ferru », Isabella « La Dottoressa », Matteo « Ghost », Angelo « L'Ombre »), et quatre du chapitre I (Turi, Concetta, Saro l'enfant, Donna Rosa la grand-mère) : plateau éclairé, personnage qui tourne, gros plan sur le visage. Chaque personnage est une recette dans `FAMILLES` (jeu.js) : silhouette, visage (`visage` : nez cassé, joues creuses, visage rond, mâchoire, traits anguleux ; `rides`, `sueur`, `tatouage`), coiffure (`recul`, `carre`, `gomine`, `chignon`, `rase`), étoffes (`tex` : velours, laine, camouflage, rayures, tricot, technique, cire), chaussures (`bottes`) et accessoires (`ACC`). Ils serviront dans les chapitres suivants.

## Chapitres prévus (affichés « Bientôt » dans le menu)

II Les mines de Buggerru (Sardaigne, 1904) · III Le Préfet de fer (Sicile, 1926) · IV L'été 1943 (Sicile) · V Aspromonte (Calabre, 1977) · VI L'été 1992 (Palerme) · VII Gioia Tauro (Calabre, aujourd'hui). Liste dans `CHAPITRES` (jeu.js).

## Fichiers

- `index.html` : écrans (chargement, titre, cartons, dialogues, interface, commandes tactiles) et style ; charge `jeu.js` comme module (carte d'import vers `vendor/`).
- `textures.js` : matières fabriquées par le programme, raccordables, avec couleur, relief (normales) et rugosité : enduit à la chaux, pierre de taille dorée, tuiles canal, pavés, terre, bois peint écaillé, écorce, tissu, mèches de cheveux, peau des visages (`texVisage` : homme, femme, vieux), raquettes de figuier, feuillages et fleurs (citronnier, olivier, cyprès, herbes, bougainvillier, géranium, vigne), image pieuse des autels.
- `jeu.js` : tout le jeu. Sections dans l'ordre : qualité (`QUALITES`), rendu et post-traitements (`compo` : occlusion ambiante GTAO, halo, sortie ACES, étalonnage `ETALON` : chaud/froid, vignette, grain, légère aberration), matériaux (`M('famille:couleur')`), constructeur de décors fusionnés par matière (`piece`, `poser`, `construireLots`), ciel physique + nuages + nuit étoilée et éclairage d'ambiance tiré du ciel (`majEnvironnement`), mer, relief (`H(x, z)`), obstacles, bâtiments (`maison`, `fenetre`, `porte`, `toit`, `muret`, église, baglio, masseria), végétation en instances au vent (`auVent`, `couronne`, `foret`, herbe autour du joueur `majHerbe`), lanternes, décor sicilien (`pot`, `bougainvillier`, `autel`, `meule`, `linge`, `banc`, `lanterneMurale`, treille du baglio, maisons du second rang), personnages articulés à tête sculptée (`formeTete`, yeux et paupières qui clignent, gestes quand ils parlent : `humain`, `animer`, `pnj`), animaux (`VIE`, `majVie` : hirondelles, poules, chien, chat), drapeaux qui flottent (`drapeau`, `banniere`, `texDrapeau`), port et barques, décor de fête (`FESTA`), monde selon l'acte (`monde(1|2)`, Turi vieilli `habillerTuri`), travaux honnêtes (`lancerCueillette`, `lancerLivraison`, `lancerPeche`, argent `SAUVE.lire` / `SAUVE.sale`, `decision`), carretto, joueur, caméra d'épaule, heure du jour (`heure(0 → 2)` : jour, crépuscule, nuit ; réglages dans `AMBIANCES`), interface et dialogues filmés (`cadrer` : champ-contrechamp par-dessus l'épaule au téléobjectif, flou d'arrière-plan `passeFlou`), rayons de soleil (`RAYONS`), son fabriqué (`SON`), histoire (`TXT`, `FINS`, `ETAPES`), patrouilles, boucle.
- **Personnages** : tous tirés d'un seul modèle photoréaliste fourni par le propriétaire (`modeles/promptplay/`, PromptPlay, licence à vérifier avant diffusion ; squelette ajouté par `outils/promptplay.js`), décliné par `variantes.js` : silhouettes (`SILHOUETTES` : homme, fort, gros, mince, vieux, femme, vieille, enfant, ado) qui changent proportions et traits du visage (`deformer`), peau repeinte selon le personnage (`peindreTete` : teint, rides et taches de l'âge, cheveux gris, crâne dégarni ou rasé, barbe naissante ou pleine, moustache, maquillage, joues d'enfant ; `peindreCorps`, `peindreOeil`), guidée par la carte des positions du visage `tete-pos.png` (`outils/carte-visage.js`). Dans `jeu.js`, `humainPP` habille le personnage : chemise, gilet et veste taillés dans la tenue d'origine avec encolures découpées net (`decoupe`), manches longues, robe longue (`jupePP`), châle, coiffures et chapeaux ajustés au crâne (`enveloppeTete`, `rayonTete`), barbe et moustache en relief, bottes, accessoires. Les gros plans (galerie, joueur) sont peints tout de suite en 1024 px, les passants en 512 px en tâche de fond. Les corps MakeHuman (`modeles/corps/`, `humainReel`) ne servent plus qu'en secours si ce modèle manque.
- `modeles/anim/anims.json` : animations Quaternius (CC0) transférées sur les squelettes (`outils/animations.mjs`) ; le jeu les enchaîne selon la vitesse (repos, marche, course, assis dans le carretto) et ajoute par-dessus les gestes de la parole et le regard (`animerAvecClips`, `animerOs`).
- `vendor/` : three.js r169 et ses modules (ciel, post-traitements, flou de profondeur, fusion de géométries), MIT ; `textures/waternormals.jpg` (eau, exemples three.js, MIT) ; `fonts/` (Cormorant, Bitter, Oswald, OFL). Tout est hébergé ici, aucun service externe.
- Essais automatiques : ajouter `?essai` à l'adresse fait tourner la logique sans dessiner l'image (utile dans un navigateur sans carte graphique).

## Ajouter ou modifier une étape

Une étape = une entrée de `ETAPES` : `obj()` (texte de l'objectif), `cible()` (repère doré et mini-carte), `setup()` (positions quand on reprend à cette étape), `prep()` (préparation à chaque entrée), `debut()`, `maj(dt)` (appelée à chaque image). Passer à la suivante : `aller('nom')` ; échec : `echec('message', 'étape de reprise')`. Une interaction (« E — … ») : `inter({ pos, r, si, lib, faire })`. Un dialogue : `dire([['Nom', 'texte'], …, { question, choix: [[libellé, action], …] }], suite)`.

## Limites

Rendu d'un jeu indépendant soigné, pas d'un jeu de grand studio : un seul visage d'origine pour tous (les variantes changent l'âge, le sexe et la carrure, mais on reconnaît un air de famille ; les femmes restent tirées d'un modèle masculin), modèle sans corps sous sa tenue (vêtements taillés dans le tee-shirt et le pantalon d'origine), animations transférées d'un personnage animé à la main (pas de capture de mouvement), visages sans expressions, vêtements tirés du corps et lissés (pas de tissu simulé : ils restent près du corps), pas de doublage, pas de combat ni d'armes à feu jouables, un seul chapitre jouable. Le navigateur doit accepter WebGL 2 ; en qualité Haute, un Mac récent est recommandé.
