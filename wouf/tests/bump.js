'use strict';
/* Publier une nouvelle version en UNE commande :
     npm run release -- 1.3.0 "Nouveauté 1" "Nouveauté 2"
     npm run release -- 1.3.1 --interne      (version technique : rien dans « Nouveautés », pas de message aux utilisateurs)
   Met à jour d'un coup : config.js, package.json, package-lock.json, nom du cache (sw.js), numéros de version des fichiers
   (index.html) et ajoute l'entrée du CHANGELOG (business.js). Ensuite : npm test, pull request, fusion. */
const fs = require('fs'), path = require('path');
const W = path.resolve(__dirname, '..');
const args = process.argv.slice(2), internal = args.includes('--interne'), [v, ...items] = args.filter(a => a !== '--interne');
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('Usage : npm run release -- X.Y.Z "nouveauté" ["autre nouveauté"…]'); process.exit(1); }
const rd = f => fs.readFileSync(path.join(W, f), 'utf8'), wr = (f, s) => fs.writeFileSync(path.join(W, f), s);
const must = (s, re, what) => { if (!re.test(s)) { console.error('Introuvable : ' + what); process.exit(1); } };

let s = rd('config.js'); must(s, /version: '[\d.]+'/, 'version dans config.js'); wr('config.js', s.replace(/version: '[\d.]+'/, `version: '${v}'`));
s = rd('package.json'); wr('package.json', s.replace(/"version": "[\d.]+"/, `"version": "${v}"`));
if (fs.existsSync(path.join(W, 'package-lock.json'))) { const l = JSON.parse(rd('package-lock.json')); l.version = v; if (l.packages && l.packages['']) l.packages[''].version = v; wr('package-lock.json', JSON.stringify(l, null, 2) + '\n'); }
s = rd('sw.js'); must(s, /const CACHE = 'wouf-v[\d.]+'/, 'CACHE dans sw.js'); wr('sw.js', s.replace(/const CACHE = 'wouf-v[\d.]+'/, `const CACHE = 'wouf-v${v.split('.').slice(0, 2).join('.')}'`));
s = rd('index.html'); wr('index.html', s.replace(/(src|href)="([a-z0-9_]+\.(?:js|css))(?:\?v=[\d.]+)?"/g, `$1="$2?v=${v}"`));
s = rd('business.js'); must(s, /const CHANGELOG = \[\n/, 'CHANGELOG dans business.js');
if (!internal && !s.includes(`v: '${v}'`)) {
  const list = (items.length ? items : ['Améliorations et corrections.']).map(t => `'${t.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ');
  wr('business.js', s.replace('const CHANGELOG = [\n', `const CHANGELOG = [\n  { v: '${v}', date: '${new Date().toISOString().slice(0, 10)}', items: [${list}] },\n`));
}
console.log(`✓ Version ${v} préparée. Étapes suivantes : npm test → pull request → fusion.`);
