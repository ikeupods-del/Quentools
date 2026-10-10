// Entraîne le petit modèle local qui choisit les totaux d'une fiche de paie parmi les montants lus (région TABLE de decodeur-courrier.html).
// Usage : node tools/entrainer-paie.js           → affiche les résultats, n'écrit rien
//         node tools/entrainer-paie.js --ecrire  → réécrit la ligne « const RC_MINI = … » de la page
// Données : la fiche de janvier 2025 mise en page de plusieurs façons, et sa vraie photo (tools/fixtures/fiche-photo-janvier-2025.json), abîmées au hasard
// (mots de libellé perdus, lignes décalées). Pour apprendre davantage, ajouter des fiches réelles (noms et adresses retirés) dans les jeux d'essai ci-dessous.
const fs = require('fs'), path = require('path');
const { layout, T, run, c, wordsA } = require('./essai-lecture-paie.js');
const page = path.join(__dirname, '..', 'decodeur-courrier.html');
const vm = require('vm');
const FIELDS = ['brut', 'cotSal', 'netAvant', 'netPayer', 'netImposable'], TRUTH = { brut: T.brut, cotSal: T.cotSal, netAvant: T.netAvant, netPayer: T.netPayer, netImposable: T.netImposable };
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const photo = (() => { const pg = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fiche-photo-janvier-2025.json'), 'utf8')); let off = 0; const all = []; pg.forEach(p => { p.words.forEach(w => all.push(Object.assign({}, w, { page: w.page + off }))); off += p.np || 1; }); return all; })();
const isNum = t => /\d/.test(t);
function abimer(words, force) {   // perd des mots de libellé et décale des lignes
  return words.filter(w => isNum(w.t) || rnd() > force).map(w => (!isNum(w.t) && rnd() < force * 0.6 ? Object.assign({}, w, { y: w.y + (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 14) }) : w));
}
const OPTS = [{}, { deuxLignes: 1 }, { suite: 1 }, { suite: 1, doublon: 1 }, { cumul: 1 }, { inverse: 1 }, { sansBrut: 1 }, { suite: 1, cumul: 1 }];
const { generer } = require('./fixtures/generateur-paie.js');
// Fiches fabriquées par le générateur (sept mises en page, montants tirés au hasard) : le texte de chaque ligne devient des mots positionnés
function motsDuTexte(texte) {
  const mots = []; let page = 1;
  texte.split('\n').forEach((ligne, i) => {
    if (i && i % 48 === 0) page++;
    const y = 40 + (i % 48) * 13; let x = 40;
    (ligne.match(/-?\d{1,3}(?: \d{3})*,\d{2,3}-?|\S+/g) || []).forEach(t => { const w = t.length * 4.6; mots.push({ t, x0: x, x1: x + w, y, h: 8, page }); x += w + 8 + (/\d/.test(t) ? 14 : 0); });
  });
  return mots;
}
const fabriquees = (n, graine) => generer(n, graine).map(f => ({ words: abimer(motsDuTexte(f.texte), rnd() * 0.5), truth: { brut: f.attendu.brut, cotSal: f.attendu.cotSal, netAvant: f.attendu.netAvant, netPayer: f.attendu.netFinal, netImposable: f.attendu.netImposable } }));
const vraies = fs.existsSync(path.join(__dirname, 'fixtures', 'fiches-reelles.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fiches-reelles.json'), 'utf8')).map(f => ({ nom: f.fichier, words: f.words, truth: f.attendu })) : [];
const synth = [], reel = [];
const T0 = { ...TRUTH };
OPTS.forEach(o => { const w = wordsA(layout(o)); for (let i = 0; i < 25; i++) synth.push({ words: abimer(w, i === 0 ? 0 : 0.1 + rnd() * 0.5), truth: T0 }); });
for (let i = 0; i < 25; i++) reel.push({ words: abimer(photo, i === 0 ? 0 : 0.05 + rnd() * 0.4), truth: T0 });
// Essai du 10/10 : ajouter 1 400 fiches fabriquées dégrade la lecture de la vraie photo (la géométrie du texte fabriqué est trop éloignée d'une vraie fiche) : à n'activer qu'avec --fabriquees
const avecGen = process.argv.includes('--fabriquees'), gen = avecGen ? fabriquees(1400, 2024) : [], genEssai = avecGen ? fabriquees(350, 777) : [];

// La région de la page, chargée comme dans les essais (sans le jeu de poids actuel : il est remplacé)
const src = fs.readFileSync(page, 'utf8');
const ctx = { norm: c.norm }; vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('/*TABLE-DEB*/'), src.indexOf('/*TABLE-FIN*/')).replace(/^const /gm, 'var '), ctx);
ctx.__w = null;
const exec = (code, v) => { ctx.__v = v; return vm.runInContext(code, ctx); };
const NF = exec('RC_FEAT');
function exemples(sets) {   // une liste d'exemples par total : [{ features de chaque candidat, indice du bon }]
  const out = {}; FIELDS.forEach(f => { out[f] = []; });
  sets.forEach(({ words, truth }) => {
    ctx.__words = words;
    vm.runInContext('var __x = rcMiniContext(__words);', ctx);
    const pk = {};
    FIELDS.forEach(f => {
      const cands = exec(`__x.cands.filter(c => '${f}' === 'brut' ? c.v >= 100 : !c.base && c.v > 0).map(c => c.v)`);
      const bon = truth[f] === undefined ? -1 : cands.findIndex(v => Math.abs(v - truth[f]) <= 0.021);
      if (bon >= 0) { out[f].push({ X: cands.map(v => exec(`rcMiniFeat(__x, '${f}', __v, ${JSON.stringify(pk)})`, v)), bon }); }
      if (truth[f] !== undefined) pk[f] = truth[f];
    });
  });
  return out;
}
const sm = z => { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
function entrainer(ex) {
  const W = {};
  FIELDS.forEach(f => {
    const w = new Array(NF).fill(0); let lr = 0.5;
    for (let ep = 0; ep < 600; ep++) {
      const g = new Array(NF).fill(0);
      ex[f].forEach(e => { const p = sm(e.X.map(x => x.reduce((a, v, i) => a + v * w[i], 0))); e.X.forEach((x, k) => { const d = p[k] - (k === e.bon ? 1 : 0); x.forEach((v, i) => { g[i] += d * v; }); }); });
      for (let i = 0; i < NF; i++) w[i] -= lr * (g[i] / Math.max(ex[f].length, 1) + 0.002 * w[i]);
      if (ep % 200 === 199) lr *= 0.5;
    }
    W[f] = w.map(v => Math.round(v * 1000) / 1000);
  });
  return W;
}
function evaluer(W, sets, nom) {
  exec('RC_MINI = ' + JSON.stringify(W) + ';');
  const ok = Object.fromEntries(FIELDS.map(f => [f, 0])), vide = Object.fromEntries(FIELDS.map(f => [f, 0])), faux = Object.fromEntries(FIELDS.map(f => [f, 0]));
  sets.forEach(({ words, truth }) => { const r = exec('rcMini(__v)', words); FIELDS.forEach(f => { if (truth[f] === undefined) return; if (r[f] === undefined) vide[f]++; else if (Math.abs(r[f] - truth[f]) <= 0.021) ok[f]++; else faux[f]++; }); });
  console.log(nom + ' (' + sets.length + ' fiches) : ' + FIELDS.map(f => f + ' ' + ok[f] + ' juste, ' + faux[f] + ' faux, ' + vide[f] + ' vide').join(' | '));
  return { ok, faux, vide };
}
// Contrôle honnête : entraînement sur les mises en page fabriquées et la photo de référence, essai sur de vraies fiches jamais vues
// (validation croisée : chaque vraie fiche est lue par un modèle qui ne l'a jamais vue), puis entraînement sur tout
const POIDS = +process.env.POIDS || 12, base = [...gen, ...synth.filter((_, i) => i % 4 === 0), ...reel.filter((_, i) => i % 4 === 0)], lourd = l => [].concat(...Array(POIDS).fill(l));   // les vraies fiches pèsent plus : elles sont rares et ce sont elles qu'on veut lire
exec('RC_MINI = {};');
if (vraies.length) {
  const tot = { ok: 0, faux: 0, vide: 0 }, parFiche = [];
  vraies.forEach((v, i) => {
    const Wi = entrainer(exemples([...base, ...lourd(vraies.filter((_, j) => j !== i))]));
    const r = evaluer(Wi, [v], 'vraie fiche ' + v.nom + ' (jamais vue)');
    FIELDS.forEach(f => { tot.ok += r.ok[f]; tot.faux += r.faux[f]; tot.vide += r.vide[f]; });
  });
  console.log('TOTAL validation croisée sur ' + vraies.length + ' vraies fiches : ' + tot.ok + ' justes, ' + tot.faux + ' faux, ' + tot.vide + ' vides');
}
const W = entrainer(exemples([...base, ...lourd(vraies)]));
if (avecGen) evaluer(W, genEssai, 'final, fiches fabriquées'); evaluer(W, reel, 'final, vraie photo de référence'); if (vraies.length) evaluer(W, vraies, 'final, vraies fiches');
if (process.argv.includes('--ecrire')) {
  const s = fs.readFileSync(page, 'utf8'), n = s.replace(/^const RC_MINI = .*;$/m, 'const RC_MINI = ' + JSON.stringify(W) + ';');
  if (n === s) { console.log('rien à écrire'); } else { fs.writeFileSync(page, n); console.log('✓ poids écrits dans la page'); }
}
