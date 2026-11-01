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
