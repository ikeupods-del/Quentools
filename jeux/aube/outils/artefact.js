'use strict';
/* Prépare la version « page partagée » du jeu : le contenu de index.html entre <!--JEU-DEBUT--> et <!--JEU-FIN-->
   (sans <html>, <head>, <body>) plus les scripts à publier à côté.
   node jeux/aube/outils/artefact.js <dossier-de-sortie> */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..');
const sortie = process.argv[2];
if (!sortie) { console.error('Usage : node jeux/aube/outils/artefact.js <dossier-de-sortie>'); process.exit(1); }
const html = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');
const m = html.match(/<!--JEU-DEBUT-->([^]*)<!--JEU-FIN-->/);
if (!m) { console.error('Marqueurs JEU-DEBUT / JEU-FIN introuvables'); process.exit(1); }
const corps = m[1].replace('</head>\n<body>\n', '\n');
fs.mkdirSync(sortie, { recursive: true });
fs.writeFileSync(path.join(sortie, 'aube-des-nations.html'), corps.trim() + '\n');
const scripts = [...corps.matchAll(/<script src="([^"]+)"/g), ...corps.matchAll(/from '\.\/([^']+)'/g)].map(x => x[1]);
for (const s of scripts) { fs.mkdirSync(path.dirname(path.join(sortie, s)), { recursive: true }); fs.copyFileSync(path.join(racine, s), path.join(sortie, s)); }
const mat = path.join(racine, 'matieres');
if (fs.existsSync(mat)) { fs.mkdirSync(path.join(sortie, 'matieres'), { recursive: true }); for (const f of fs.readdirSync(mat)) { fs.copyFileSync(path.join(mat, f), path.join(sortie, 'matieres', f)); scripts.push('matieres/' + f); } }
console.log(`Page : ${path.join(sortie, 'aube-des-nations.html')}\nScripts : ${scripts.join(', ')}`);
