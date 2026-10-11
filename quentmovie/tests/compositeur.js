// Contrôle du nettoyage du masque de détourage (compositeur.js) : morceaux isolés retirés, petits trous bouchés.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const fen = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'compositeur.js'), 'utf8'), { window: fen });
const { nettoyer } = fen.Compositeur;
let ok = 0, ko = 0;
const check = (nom, cond) => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom); } };
const W = 64, H = 64, p = new Float32Array(W * H), at = (x, y) => y * W + x;
for (let y = 20; y < 64; y++) for (let x = 16; x < 48; x++) p[at(x, y)] = 0.95;   // la personne (touche le bas de l'image)
for (let y = 30; y < 33; y++) for (let x = 30; x < 33; x++) p[at(x, y)] = 0.1;     // petit trou dans la silhouette
for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) p[at(x, y)] = 0.9;          // main d'une autre personne au loin
for (let y = 50; y < 64; y++) for (let x = 0; x < 6; x++) p[at(x, y)] = 0;          // vrai fond qui touche le bord
nettoyer(p, W, H, true);
check('morceau isolé retiré', p[at(3, 3)] < 0.5);
check('petit trou bouché', p[at(31, 31)] > 0.5);
check('silhouette conservée', p[at(30, 50)] > 0.9);
check('fond conservé', p[at(1, 60)] < 0.5);
const q = new Float32Array(W * H).fill(0); for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) q[at(x, y)] = 0.9;
for (let y = 20; y < 64; y++) for (let x = 16; x < 48; x++) q[at(x, y)] = 0.95;
nettoyer(q, W, H, false);
check('« ne garder que moi » désactivé : rien n’est retiré', q[at(3, 3)] > 0.5);
console.log(`Détourage : ${ok} contrôles réussis, ${ko} échecs`);
process.exit(ko ? 1 : 0);
