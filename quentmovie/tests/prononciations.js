// Contrôle de prononciation : comparaison du texte écrit et du texte réécouté (pure), route sans modèles installés.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const { comparer } = require('../prononciation-controle'), { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  let r = comparer('Warren Buffett pense que le krach de 1637 et le PEA chez Goldgar.', 'Warren Buffet pense que le crac de 1637 et le pa chez Golgar');
  check('mots mal compris signalés', r.suspects.map(x => x.ecrit).join() === 'krach,PEA', JSON.stringify(r.suspects));
  check('orthographe voisine et nombres ignorés', !r.suspects.some(x => /Buffett|Goldgar|1637/.test(x.ecrit)));
  r = comparer('Une phrase simple sur les intérêts composés.', 'une phrase simple sur les intérêts composés');
  check('texte bien lu : rien à signaler', r.suspects.length === 0 && r.mots === 7);
  r = comparer('Le taux est de 5 % par an, soit cinquante euros.', 'Le taux est de cinq pour cent par an soit cinquante euros');
  check('nombres lus en toutes lettres : pas de faux positif', r.suspects.length === 0, JSON.stringify(r.suspects));
  r = comparer('Les florins et le subprime', 'Les flo et le sous primes');
  check('mots insérés ou perdus sans planter', Array.isArray(r.suspects));
  // route : sans modèles, un message compréhensible
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-pron2-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const { id } = await (await fetch(U('/api/prononciations/controle'), { method: 'POST', body: JSON.stringify({ texte: 'Warren Buffett dirige Berkshire Hathaway.' }) })).json();
  let j; for (let k = 0; k < 40; k++) { await new Promise(x => setTimeout(x, 200)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) break; }
  check('contrôle sans reconnaissance installée : message clair', j.error && /Installe d’abord/.test(j.error), JSON.stringify(j).slice(0, 160));
  const c = await fetch(U('/api/prononciations/controle'), { method: 'POST', body: JSON.stringify({ texte: 'court' }) });
  check('texte trop court refusé', c.status >= 400);
  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Contrôle de prononciation : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
