#!/usr/bin/env node
'use strict';
/* Génère CARTE.md : une carte compacte du dépôt (fichiers, fonctions, écrans, actions, qui utilise quoi)
   pour retrouver le bon fichier sans tout lire. Aucune dépendance. Usage : node tools/carte.js  (ou : cd wouf && npm run carte)
   `--verifie` : échoue si CARTE.md n'est pas à jour. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), W = path.join(root, 'wouf');
const order = (fs.readFileSync(path.join(W, 'index.html'), 'utf8').match(/<script src="([^"?]+)/g) || []).map(x => x.replace('<script src="', ''));
const extra = ['billing-worker/worker.js', 'sw.js'];
const files = [...order, ...extra].filter(f => fs.existsSync(path.join(W, f)));
const src = {}, defs = {}, info = {};
for (const f of files) {
  const t = fs.readFileSync(path.join(W, f), 'utf8'); src[f] = t;
  const names = new Set(), routes = [], acts = [];
  for (const m of t.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of t.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) names.add(m[1]);
  for (const m of t.matchAll(/^ROUTES\.([A-Za-z_$][\w$]*)\s*=|^ROUTES\[['"]([^'"]+)['"]\]\s*=/gm)) routes.push(m[1] || m[2]);
  for (const m of t.matchAll(/ACT(?:\.([A-Za-z_$][\w$]*)|\[['"]([^'"]+)['"]\])\s*=/g)) acts.push(m[1] || m[2]);
  info[f] = { lines: t.split('\n').length, names: [...names], routes, acts, doc: (t.match(/\/\*\s*([^]*?)\*\//) || [, ''])[1].replace(/\s+/g, ' ').trim().slice(0, 190) };
  if (order.includes(f)) for (const n of names) if (!defs[n]) defs[n] = f;
}
const used = {};
for (const f of order) if (src[f]) for (const [n, def] of Object.entries(defs)) {
  if (def === f || n.length < 4) continue;
  if (new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(src[f])) (used[f] = used[f] || new Set()).add(def);
}
let out = '# CARTE du dépôt (générée : `node tools/carte.js`, ne pas éditer à la main)\n\nLire ceci AVANT de chercher dans le code. `dépend de` = fichiers dont les fonctions/constantes sont utilisées.\n\n';
out += '## Wouf : ordre de chargement\n' + order.join(' → ') + '\n\n';
for (const f of [...order, ...extra].filter(x => info[x])) {
  const i = info[f], nm = i.names.filter(n => !n.startsWith('_')).slice(0, 60);
  out += `### wouf/${f} (${i.lines} l.)\n${i.doc ? i.doc + '\n' : ''}`;
  if (i.routes.length) out += `- écrans : ${i.routes.map(r => '#/' + r).join(' ')}\n`;
  if (i.acts.length) out += `- actions : ${i.acts.join(' ')}\n`;
  if (nm.length) out += `- définit : ${nm.join(' ')}${i.names.length > 60 ? ' …' : ''}\n`;
  if (used[f]) out += `- dépend de : ${[...used[f]].join(' ')}\n`;
  out += '\n';
}
const mk = path.join(root, 'marketing/wouf');
if (fs.existsSync(mk)) { out += '## marketing/wouf\n'; for (const f of fs.readdirSync(mk).filter(x => /\.(js|json|md|html)$/.test(x)).sort()) out += `- ${f} (${fs.statSync(path.join(mk, f)).size >> 10} Ko)\n`; out += '\n'; }
const wf = path.join(root, '.github/workflows');
if (fs.existsSync(wf)) out += '## Workflows\n' + fs.readdirSync(wf).map(x => `- ${x}`).join('\n') + '\n';
const dest = path.join(root, 'CARTE.md');
if (process.argv.includes('--verifie')) { if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== out) { console.error('CARTE.md n’est pas à jour : lancez `node tools/carte.js`.'); process.exit(1); } console.log('CARTE.md à jour ✓'); }
else { fs.writeFileSync(dest, out); console.log('CARTE.md écrit (' + (out.length >> 10) + ' Ko, ~' + Math.round(out.length / 4) + ' jetons)'); }
