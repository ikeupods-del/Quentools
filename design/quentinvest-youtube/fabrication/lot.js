// Pico — fabrique plusieurs épisodes à la suite, sans surveillance : chaque fiche sans résultat est fabriquée, les autres sont ignorées
// (on peut donc relancer la commande après une coupure : elle reprend où elle s'était arrêtée). Une ligne par épisode, un échec n'arrête pas le lot.
//   node lot.js                      toutes les fiches de fiches/ qui n'ont pas encore de texte de publication dans le dossier de sortie
//   node lot.js 04 05 06             seulement ces numéros
//   options : --sortie <dossier racine> (défaut ~/Movies/QuentInvest) · --modeles <dossier des voix> · --sans-tiktok · --sans-youtube
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const FICHES = path.join(__dirname, '..', 'fiches'), arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const RACINE = path.resolve(arg('sortie', path.join(os.homedir(), 'Movies', 'QuentInvest')));
const numeros = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(a => a.padStart(2, '0'));
const drapeaux = ['sans-tiktok', 'sans-youtube'].filter(d => process.argv.includes('--' + d)).map(d => '--' + d);
const fiches = fs.readdirSync(FICHES).filter(n => /^\d+-.*\.json$/.test(n)).filter(n => !numeros.length || numeros.includes(n.slice(0, 2))).sort();
let ok = 0, ignores = 0, echecs = 0; const t0 = Date.now();
for (const nom of fiches) {
  const base = nom.replace(/\.json$/, ''), dossier = path.join(RACINE, base);
  if (fs.existsSync(path.join(dossier, base + '-publication.md')) && !numeros.length) { ignores++; continue; }
  const argv = [path.join(__dirname, 'episode.js'), path.join(FICHES, nom), '--sortie', dossier, ...(arg('modeles') ? ['--modeles', arg('modeles')] : []), ...drapeaux];
  const t = Date.now(), r = spawnSync('node', argv, { encoding: 'utf8', maxBuffer: 1e9, env: process.env });
  const min = ((Date.now() - t) / 60000).toFixed(1);
  if (r.status === 0) { ok++; const alertes = (r.stdout.match(/ · [^\n]*/g) || []).filter(l => !/Rien à signaler/.test(l)); console.log(`✓ ${base} (${min} min)${alertes.length ? ' · ' + alertes.length + ' avertissement(s) : ' + alertes.map(a => a.trim()).join(' ') : ''}`); }
  else { echecs++; console.log(`✗ ${base} : ${(r.stderr || r.stdout).split('\n').filter(l => l && !/csrc/.test(l)).slice(-3).join(' | ')}`); }
}
console.log(`\n${ok} fabriqué(s), ${ignores} déjà fait(s), ${echecs} échec(s) en ${((Date.now() - t0) / 60000).toFixed(0)} min. Dossier : ${RACINE}`);
process.exit(echecs ? 1 : 0);
