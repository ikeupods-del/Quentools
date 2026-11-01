# Outils du jeu

## `corps.js` : corps humains réalistes (MakeHuman, CC0)

Produit `modeles/corps/corps.json` (silhouettes homme, fort, gros, vieux, femme, vieille, enfant, ado ; squelette de 163 os ; poids de peau ; zones du visage). À relancer seulement pour ajouter une silhouette (tableau `SILHOUETTES`) ou changer les zones du visage.

```
mkdir -p /tmp/mh/targets && cd /tmp/mh
R=https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data
curl -sO $R/3dobjs/base.obj; curl -sO $R/rigs/default.mhskel; curl -sO $R/rigs/default_weights.mhw
for r in caucasian african asian; do for g in male female; do for a in baby child young old; do curl -s -o targets/$r-$g-$a.target $R/targets/macrodetails/$r-$g-$a.target; done; done; done
for n in universal-male-young-maxmuscle-averageweight universal-male-young-averagemuscle-maxweight universal-male-old-averagemuscle-maxweight universal-male-young-minmuscle-minweight; do curl -s -o targets/$n.target $R/targets/macrodetails/$n.target; done
cd - && node outils/corps.js /tmp/mh
```

## `promptplay.js` : personnage de base photoréaliste

`node outils/promptplay.js <fichier.glb>` : ajoute au modèle PromptPlay (posé bras en croix, sans squelette) un squelette aux mêmes noms que MakeHuman, des poids de peau calculés par proximité des os (épaules adoucies sur une douzaine de centimètres), fusionne les sommets en double et convertit les textures en JPEG (ImageMagick `convert`). Sortie : `modeles/promptplay/`. Ce modèle n'a pas de corps sous sa tenue (torse et jambes retirés) : le jeu taille les vêtements d'époque dans son tee-shirt et son pantalon (`humainPP`).

## `carte-visage.js` : carte des positions du visage

`node outils/carte-visage.js` (après `promptplay.js`) : écrit `modeles/promptplay/tete-pos.png`, où chaque point de la texture de la tête donne sa position sur le visage. `variantes.js` s'en sert pour peindre rides, barbe, cheveux gris et maquillage au bon endroit.

## `animations.mjs` : animations transférées (Quaternius, CC0)

`node outils/animations.mjs <quaternius.glb>` (après `corps.js` et `promptplay.js`) : pour chaque image des clips Man_Idle, Man_Walk, Man_Run, Man_Sitting, Man_Clapping et Man_Standing, l'orientation de chaque os source est appliquée à l'os correspondant des deux squelettes du jeu, corrigée de la différence de pose de repos (bras en croix ou en A ; le bassin n'est pas réaligné). Sortie : `modeles/anim/anims.json`.
