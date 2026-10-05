# Flyer QuenTools (A5 recto-verso)

- `flyer.html` : la maquette (recto : accroche et exemples ; verso : offres, contenu, étapes, contact). Polices et couleurs du système de design (`assets/fonts/`, `assets/qt.css`).
- `QuenTools-flyer-A5.pdf` : fichier d'impression, **154 × 216 mm** = A5 (148 × 210) + **3 mm de fond perdu** par côté. Zone sûre : 10 mm à l'intérieur du trait de coupe. `recto.png` et `verso.png` : aperçus.
- `qr.svg` : QR code vers `https://quentools.fr/` (régénérer avec la bibliothèque `qrcode` si l'adresse change).
- Régénération : `node tools/flyer.js` après toute modification de `flyer.html`.

## Avant d'envoyer à l'imprimeur
- Vérifier que **quentools.fr** répond bien (le fichier `CNAME` le déclare, mais l'adresse doit être branchée chez l'hébergeur de domaine), puis scanner le QR code avec un téléphone.
- Ajouter le **SIRET** (ligne de mentions au verso) dès que la micro-entreprise existe : un flyer commercial doit identifier l'entreprise.
- Le PDF est en RVB. Demander à l'imprimeur une conversion CMYK : le violet et surtout le vert citron seront un peu moins vifs à l'impression ; demander une épreuve (BAT) avant le tirage.
- Papier conseillé : 135 à 170 g couché mat. Les prix sont ceux du catalogue `assets/qt-templates.js` : à mettre à jour ici s'ils changent.
