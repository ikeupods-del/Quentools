// Contrôle de la parole : mots reconnus → sous-titres, passages à garder (blancs et hésitations coupés).
// Avec QM_RESEAU=1 (Mac de construction) : téléchargement réel d'une voix et de la reconnaissance,
// phrase lue par la voix puis réécoutée, sous-titres et coupe sur ce vrai enregistrement.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const P = require('../parole');

let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

(async () => {
  // morceaux comme ceux de la reconnaissance (début de mot = « ▁ »)
  const M = (t, s, d = 0.2, fin = 9) => ({ t, s, d, fin });
  const mots = P.motsDe([M('▁Bon', 0.5), M('jour', 0.7), M('▁à', 1.0, 0.1), M('▁tous', 1.15), M('▁!', 1.4, 0.05), M('▁euh', 2.6, 0.3), M('▁Aujourd', 4.0), M('\'hui', 4.2), M('▁on', 4.45, 0.1), M('▁parle', 4.6, 0.3), M('▁de', 4.95, 0.1), M('▁sites', 5.1, 0.3), M('.', 5.4, 0.05)]);
  check('mots recollés', mots.map(w => w.m).join(' ') === 'Bonjour à tous ! euh Aujourd\'hui on parle de sites.', mots.map(w => w.m).join(' '));
  check('heures des mots', mots[0].s === 0.5 && mots[0].e <= 1.0 && mots[1].s === 1.0, JSON.stringify(mots.slice(0, 2)));
  check('hésitation reconnue', P.estHesitation(mots.find(w => /euh/.test(w.m))) && !P.estHesitation(mots[0]));
  const st = P.sousTitres(mots, 'phrase');
  check('sous-titres sans « euh »', st.every(x => !/euh/i.test(x.t)), JSON.stringify(st));
  check('coupure à la fin de phrase', st.length === 2 && st[0].t === 'Bonjour à tous !' && /^Aujourd/.test(st[1].t), JSON.stringify(st));
  const tk = P.sousTitres(mots, 'mots');
  check('style TikTok : 3 mots maximum, en capitales', tk.every(x => x.t.split(' ').length <= 3 && x.t === x.t.toUpperCase()), JSON.stringify(tk));
  check('sous-titres dans l’ordre et sans chevauchement', st.concat([]).every((x, i, l) => x.e > x.s && (!l[i + 1] || x.e <= l[i + 1].s + 1e-6)));
  const g = P.aGarder(mots, 9);
  check('blanc et hésitation coupés', g.length === 2 && g[0][1] < 2.6 && g[1][0] > 2.9, JSON.stringify(g));
  check('marges autour de la parole', g[0][0] === 0.38 && g[1][1] >= 5.45, JSON.stringify(g));

  if (process.env.QM_RESEAU) {
    const { create } = require('../server');
    const { resolveFfmpeg } = require('../ffmpeg-path');
    const bins = await resolveFfmpeg();
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-parole-'));
    const app = create({ port: 0, base, ...bins });
    const port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
    const attendre = async id => { for (let i = 0; i < 3000; i++) { await new Promise(r => setTimeout(r, 500)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) return j; } return { error: 'trop long' }; };
    const e0 = await (await fetch(U('/api/parole'))).json();
    check('moteur de voix présent', e0.dispo, JSON.stringify(e0));
    for (const v of e0.voix) {
      const t0 = Date.now(), j = await attendre((await (await fetch(U('/api/parole/installer'), { method: 'POST', body: JSON.stringify({ quoi: 'voix:' + v.id }) })).json()).id);
      check('voix installée : ' + v.id, j.done, j.error); console.log(`Voix ${v.id} : ${j.done ? 'installée' : j.error} (${Math.round((Date.now() - t0) / 1000)} s)`);
    }
    const t1 = Date.now(), je = await attendre((await (await fetch(U('/api/parole/installer'), { method: 'POST', body: JSON.stringify({ quoi: 'ecoute' }) })).json()).id);
    check('reconnaissance installée', je.done, je.error); console.log(`Reconnaissance : ${je.done ? 'installée' : je.error} (${Math.round((Date.now() - t1) / 1000)} s)`);
    const phrase = 'Bonjour à tous. Aujourd’hui, je vous présente QuenTools, une agence qui crée des sites internet pour les artisans.';
    const r = await (await fetch(U('/api/parole/essai'), { method: 'POST', body: JSON.stringify({ voix: 'siwis', texte: phrase }) })).json();
    check('voix Siwis : fichier créé', r.file && fs.existsSync(path.join(base, 'medias', r.file)), JSON.stringify(r));
    for (const v of ['tom', 'upmc-pierre']) { const x = await (await fetch(U('/api/parole/essai'), { method: 'POST', body: JSON.stringify({ voix: v, texte: 'Une autre voix pour essayer.' }) })).json(); check('voix ' + v, x.file, JSON.stringify(x)); }
    if (r.file) {
      // un blanc de 2 s au milieu, pour la coupe
      const avecBlanc = path.join(base, 'medias', 'phrase-blanc.m4a');
      const src = path.join(base, 'medias', r.file);
      require('child_process').execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-i', src, '-i', src, '-filter_complex', '[0:a]adelay=delays=1500:all=1,apad=pad_dur=2[a];[a][1:a]concat=n=2:v=0:a=1', avecBlanc]);
      const t2 = Date.now(), ja = await attendre((await (await fetch(U('/api/parole/ecouter'), { method: 'POST', body: JSON.stringify({ file: 'phrase-blanc.m4a', in: 0, out: 0 }) })).json()).id);
      check('écoute terminée', ja.done && ja.resultat, ja.error);
      const res = ja.resultat || { mots: [] }, texte = res.mots.map(w => w.m).join(' ');
      console.log(`Entendu en ${Math.round((Date.now() - t2) / 1000)} s : ${texte}`);
      const attendus = ['bonjour', 'présente', 'agence', 'sites', 'internet', 'artisans'];
      const n = attendus.filter(a => texte.toLowerCase().includes(a)).length;
      check('phrase bien reconnue', n >= 5, `${n}/6 : ${texte}`);
      check('premier mot après le blanc du début', res.mots[0] && res.mots[0].s > 1.2 && res.mots[0].s < 2.2, JSON.stringify(res.mots[0]));
      const g2 = P.aGarder(res.mots, res.duree);
      console.log('Passages gardés :', JSON.stringify(g2), 'sur', res.duree.toFixed(1), 's');
      check('blanc du milieu coupé', g2.length >= 2 && g2.reduce((a, [s, e]) => a + e - s, 0) < res.duree - 3, JSON.stringify(g2));
    }
    // voix off du générateur avec une voix naturelle
    const jg = await attendre((await (await fetch(U('/api/generer/creer'), { method: 'POST', body: JSON.stringify({ titre: 'Essai', scenes: [{ texte: 'Michelin est une entreprise française fondée en 1889 à Clermont-Ferrand.', image: -1 }], images: [], voix: 'piper:tom', vitesse: 175 }) })).json()).id);
    check('générateur avec voix naturelle', jg.done && jg.resultat && jg.resultat.synthese && jg.resultat.scenes[0].duree > 2, jg.error || JSON.stringify(jg.resultat));
    const vx = await (await fetch(U('/api/generer/voix'))).json();
    check('voix naturelle proposée par défaut', /^piper:/.test(vx.defaut), vx.defaut);
    app.stop(); if (!process.env.QM_GARDER) fs.rmSync(base, { recursive: true, force: true });
  }
  console.log(`Parole : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
