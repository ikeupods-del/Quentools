// Contrôle du paquet de l'application : tout fichier local chargé par le programme (require('./…'), <script src="/…">)
// doit figurer dans build.files de package.json, sinon l'application installée s'arrête sur « Cannot find module ».
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const fichiers = require('../package.json').build.files.filter(g => !g.startsWith('!'));
const motif = g => new RegExp('^' + g.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
const livre = f => fichiers.some(g => motif(g).test(f));
let ok = 0, ko = 0;
function verifier(f, depuis) { if (livre(f)) ok++; else { ko++; console.log(`✗ ${f} (chargé par ${depuis}) absent de build.files`); } }
const vus = new Set(), file = fichiers.filter(g => !g.includes('*') && g.endsWith('.js'));
while (file.length) {
  const f = file.shift(); if (vus.has(f)) continue; vus.add(f);
  let src; try { src = fs.readFileSync(path.join(RACINE, f), 'utf8'); } catch (e) { ko++; console.log(`✗ ${f} listé mais introuvable`); continue; }
  for (const m of src.matchAll(/require\(\s*'\.\/([^']+)'\s*\)/g)) {
    let r = m[1]; if (!/\.(js|json)$/.test(r)) r += '.js';
    if (!fs.existsSync(path.join(RACINE, r))) continue; // module facultatif absent du dépôt
    verifier(r, f); if (r.endsWith('.js')) file.push(r);
  }
}
for (const m of fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8').matchAll(/<script src="\/([\w.-]+\.js)"/g)) verifier(m[1], 'index.html');
console.log(`Paquet : ${ok} contrôles réussis, ${ko} échecs`);
process.exit(ko ? 1 : 0);
