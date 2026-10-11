// Scripts d'exemple écrits par l'IA locale (Mac, réseau) : sujets libres et article Wikipédia, avec les photos choisies.
// Sert à juger la qualité des textes et des images ; aucun contrôle bloquant en dehors d'un script vide.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { create } = require('../server');
const { resolveFfmpeg } = require('../ffmpeg-path');

const CAS = [
  { titre: '5 astuces pour faire du vélo en ville en sécurité', duree: 30, style: 'dynamique', consigne: '5 astuces pour faire du vélo en ville en sécurité. Pas d’intro, tutoie-moi.' },
  { titre: 'Michelin', article: 'Michelin', duree: 30, style: 'documentaire', consigne: 'L’histoire de Michelin' }
];
const BUDGET = Date.now() + (+process.env.QM_BUDGET_MIN || 20) * 60e3;

(async () => {
  const bins = await resolveFfmpeg();
  const base = process.env.QM_BASE || fs.mkdtempSync(path.join(os.tmpdir(), 'qm-ia-'));
  const app = create({ port: 0, base, ...bins });
  const port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const attendre = async id => { for (let i = 0; i < 3600 && Date.now() < BUDGET; i++) { await new Promise(r => setTimeout(r, 500)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) return j; } return { error: 'trop long' }; };
  let ko = 0;
  for (const c of CAS) {
    if (Date.now() > BUDGET) { console.log('Budget de temps atteint : cas suivants ignorés.'); break; }
    const t0 = Date.now();
    const j = await attendre((await (await fetch(U('/api/generer/ia'), { method: 'POST', body: JSON.stringify({ article: c.article || '', titre: c.titre, duree: c.duree, style: c.style, consigne: c.consigne, medias: true, options: { qualite: process.env.QM_MODELE || 'standard' } }) })).json()).id);
    console.log(`\n===== ${c.titre} (${c.style}, ${c.duree} s) — ${j.error ? 'ERREUR : ' + j.error : Math.round((Date.now() - t0) / 1000) + ' s'}`);
    if (j.error || !j.resultat) { ko++; continue; }
    const r = j.resultat;
    console.log(`Titre : ${r.titre} | règles : ${JSON.stringify(r.regles)}${r.scenes.some(s => s.repris) ? ' | scènes reprises de la source : ' + r.scenes.filter(s => s.repris).length : ''}`);
    r.scenes.forEach((s, i) => {
      const im = s.image >= 0 ? r.images[s.image] : null;
      console.log(`${i + 1}. [${s.section}] ${s.texte}\n     photo : ${im ? `${im.nom} (${im.largeur}×${im.hauteur})` : 'aucune (carte de titre)'} | sujet : ${s.sujet} | recherche : ${s.recherche}`);
    });
    if (!r.scenes.length) ko++;
  }
  app.stop(); if (!process.env.QM_BASE) fs.rmSync(base, { recursive: true, force: true });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
