#!/usr/bin/env node
'use strict';
/* Matières photographiques (ambientCG, domaine public CC0) : réduction, désaturation partielle (le jeu teinte chaque
   matière par sa couleur), luminosité moyenne ramenée à une valeur commune, cartes de relief et de rugosité.
   Usage : node outils/matieres.js <dossier des fichiers ambientCG téléchargés>   →  matieres/<famille>_c|_n|_r.jpg
   Fichiers attendus : <Nom>_Color.jpg, <Nom>_Normal.jpg (OpenGL), <Nom>_Roughness.jpg. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const src = process.argv[2]; if (!src) { console.error('Usage : node outils/matieres.js <dossier>'); process.exit(1); }
const dest = path.join(__dirname, '..', 'matieres'); fs.mkdirSync(dest, { recursive: true });
// famille du jeu : [source ambientCG, saturation gardée (%), luminosité moyenne visée (0-1)]
const MATIERES = {
  enduit: ['Plaster001', 35, .8], pierre: ['Bricks019', 55, .74], moellon: ['Bricks040', 55, .62], tuiles: ['RoofingTiles014A', 45, .66],
  paves: ['PavingStones054', 40, .7], sol: ['Ground037', 45, .62], bois: ['Wood043', 35, .7], roche: ['Rock029', 45, .6], gravier: ['Gravel011', 40, .66]
};
const moyenne = f => +execFileSync('convert', [f, '-colorspace', 'Gray', '-resize', '64x64!', '-format', '%[fx:mean]', 'info:']).toString();
for (const [fam, [nom, sat, cible]] of Object.entries(MATIERES)) {
  const c = path.join(src, nom + '_Color.jpg'); if (!fs.existsSync(c)) { console.warn('absent :', nom); continue; }
  const tmp = path.join(dest, '_tmp.png');
  execFileSync('convert', [c, '-resize', '1024x1024!', '-modulate', '100,' + sat, tmp]);
  const m = moyenne(tmp), gain = (cible / m * 100).toFixed(1);
  execFileSync('convert', [tmp, '-evaluate', 'multiply', (cible / m).toFixed(3), '-quality', '84', path.join(dest, fam + '_c.jpg')]); fs.unlinkSync(tmp);
  execFileSync('convert', [path.join(src, nom + '_Normal.jpg'), '-resize', '1024x1024!', '-quality', '85', path.join(dest, fam + '_n.jpg')]);
  execFileSync('convert', [path.join(src, nom + '_Roughness.jpg'), '-resize', '512x512!', '-colorspace', 'Gray', '-quality', '88', path.join(dest, fam + '_r.jpg')]);
  console.log(fam, '←', nom, 'luminosité', m.toFixed(2), '→', cible, '(' + gain + ' %)');
}
fs.writeFileSync(path.join(dest, 'LICENCE.txt'), 'Matières photographiques : ambientCG (ambientcg.com), domaine public (CC0 1.0).\n' + Object.entries(MATIERES).map(([f, [n]]) => `${f} : ${n}`).join('\n') + '\nRéduites, désaturées et égalisées par outils/matieres.js.\n');
