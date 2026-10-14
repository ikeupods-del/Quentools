#!/usr/bin/env node
/* Pack Commerçant en abonnement : écrit les pages hébergées pro/ (réservation, carte, espace commerçant, affiche) à partir de celles
   de demo/pack-commercant/, pour n'avoir qu'un seul code. Les scripts de la page attendent la fiche du commerce, lue par pro/pro.js
   (type « text/x-pk », lancés dans l'ordre une fois la fiche chargée). pro/inscription/ et pro/conditions/ sont écrites à la main.
   Usage : node tools/pack-pro.js            (régénère)
           node tools/pack-pro.js --verifier (échoue si les pages ne sont plus à jour ; utilisé par tools/verifier-pack-pro.js) */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), P = path.posix;
const PAGES = ['index.html', 'carte/index.html', 'admin/index.html', 'affiche/index.html'];

function page(rel) {
  const src = P.join('demo/pack-commercant', rel), dest = P.join('pro', rel), dir = P.dirname(dest);
  const vers = cible => { const r = P.relative(dir, cible); return r || '.'; };
  const local = u => !/^([a-z]+:|\/\/|#|\?)/i.test(u);
  let h = fs.readFileSync(path.join(racine, src), 'utf8');
  // Chemins des feuilles de style et des scripts recalculés depuis pro/
  h = h.replace(/(<(?:link|script)\b[^>]*\s(?:href|src)=")([^"]+)(")/g, (m, a, u, b) => local(u) ? a + vers(P.normalize(P.join(P.dirname(src), u))) + b : m);
  // La fiche vient de Firestore : config.js remplacé par la configuration QuenTools et le chargeur
  const cfg = /<script src="([^"]*)config\.js"><\/script>/;
  if (!cfg.test(h)) throw new Error(src + ' : config.js introuvable');
  h = h.replace(/<script\b(?![^>]*\bsrc="[^"]*config\.js")([^>]*)>/g, (m, attrs) => /type=/.test(attrs) ? m : `<script type="text/x-pk"${attrs}>`);
  h = h.replace(cfg, `<script src="${vers('assets/qt-config.js')}"></script>\n<script src="${vers('assets/qt-templates.js')}"></script>\n<link rel="stylesheet" href="${vers('pro/pro.css')}">\n<script src="${vers('pro/pro.js')}" data-charger></script>`);
  h = h.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, nofollow">');
  h = h.replace(/<!doctype html>\n/i, m => m + `<!-- Page générée par tools/pack-pro.js depuis ${src} : modifier la page d'origine puis relancer le script. -->\n`);
  return [dest, h];
}

const sorties = PAGES.map(page), verifier = process.argv.includes('--verifier');
let differences = 0;
for (const [dest, h] of sorties) {
  const f = path.join(racine, dest);
  if (verifier) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== h) { differences++; console.error('✗ ' + dest + ' : pas à jour (node tools/pack-pro.js)'); } continue; }
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, h);
}
if (verifier) process.exit(differences ? 1 : 0);
console.log('✓ Pages hébergées écrites : ' + sorties.map(s => s[0]).join(', '));
