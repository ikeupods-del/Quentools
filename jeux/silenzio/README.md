# Il Prezzo del Silenzio

Jeu d'aventure en 3D dans le navigateur, à la troisième personne, ambiance de film d'époque (image sépia, grain, bandes noires pendant les dialogues). Histoire d'une famille du sud de l'Italie, de 1861 à aujourd'hui, en sept chapitres : Sicile, Sardaigne, Calabre. Personnages et villages inventés, contexte historique réel.

Projet personnel : **pas publié sur le site** (dossier absent des `rsync` de `.github/workflows/pages.yml`, page en `noindex`).

## Jouer

Ouvrir `index.html` par un petit serveur local (les navigateurs refusent WebGL et les polices depuis un simple fichier) :

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
| Échap | pause (recommencer l'étape, effet pellicule, son) |

La progression (dernière étape, fins découvertes) est gardée dans le navigateur (`localStorage`, clé `silenzio:v1`).

## Chapitre I — Conca d'Oro, Sicile, 1861 (jouable)

Turi, cueilleur au baglio Sant'Anna près de Palerme. Étapes : parler au contremaître, cueillir 8 citrons, livrer 6 cagettes au marché en carretto contre la montre (chaque choc en fait tomber une), rentrer au crépuscule, poursuivre un voleur dans les rangées, scène de nuit avec les campieri de Don Gaspare, choix. Trois fins : « Le silence » (payer), « Le témoin » (signer chez les carabiniers), « La peur » (ne pas signer) ; la branche des carabiniers passe par une traversée de nuit à éviter les patrouilles (cônes de lumière, jauge de soupçon). Chaque échec renvoie au dernier point de passage.

Faits historiques cités (carton final) : expédition des Mille (1860), royaume d'Italie (1861), pièce *I mafiusi di la Vicaria* (1863), enquête de Leopoldo Franchetti (1876) sur l'« industrie de la violence » dans les jardins d'agrumes de Palerme. À faire relire par un historien avant toute diffusion publique.

## Chapitres prévus (affichés « Bientôt » dans le menu)

II Les mines de Buggerru (Sardaigne, 1904) · III Le Préfet de fer (Sicile, 1926) · IV L'été 1943 (Sicile) · V Aspromonte (Calabre, 1977) · VI L'été 1992 (Palerme) · VII Gioia Tauro (Calabre, aujourd'hui). Liste dans `CHAPITRES` (jeu.js).

## Fichiers

- `index.html` : écrans (titre, cartons, dialogues, interface, commandes tactiles) et style.
- `jeu.js` : tout le jeu. Sections dans l'ordre : rendu, ciel et mer, relief (`H(x, z)` donne la hauteur du sol), obstacles (`CERCLES`, `BOITES`, `resoudre`), bâtiments (`maison`, `muret`), végétation en instances, personnages (`humain`, `animer`, `pnj`), carretto, joueur, caméra, heure du jour (`heure(0 → 2)` : jour, crépuscule, nuit), interface et dialogues (`dire`, `carton`), son fabriqué (`SON`), histoire (`TXT`, `FINS`, `ETAPES`), patrouilles, boucle.
- `vendor/three-r128.min.js` (three.js, MIT) et `fonts/` (Cormorant, Bitter, Oswald, OFL) : hébergés ici, aucun service externe.

## Ajouter ou modifier une étape

Une étape = une entrée de `ETAPES` : `obj()` (texte de l'objectif), `cible()` (repère doré et mini-carte), `setup()` (positions quand on reprend à cette étape), `prep()` (préparation à chaque entrée), `debut()`, `maj(dt)` (appelée à chaque image). Passer à la suivante : `aller('nom')` ; échec : `echec('message', 'étape de reprise')`. Une interaction (« E — … ») : `inter({ pos, r, si, lib, faire })`. Un dialogue : `dire([['Nom', 'texte'], …, { question, choix: [[libellé, action], …] }], suite)`.

## Limites

Personnages et décors en formes simples (pas de modèles 3D importés ni de doublage), pas de combat ni d'armes à feu jouables, un seul chapitre jouable. Le navigateur doit accepter WebGL.
