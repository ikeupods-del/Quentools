// Lecture de fiche de paie par positions : parseur de nombres, colonnes, totaux, contrôles de cohérence.
// Fiche de test : janvier 2025 (valeurs relevées sur la vraie fiche). Lancer : node tools/essai-lecture-paie.js
// Le tableau est reconstitué à partir de ces valeurs (mise en page type Sage) puis lu de deux façons :
//   A. à partir des mots positionnés directement ; B. à partir d'un vrai PDF lu par pdf.js (si disponible :
//   npm install --no-save pdfjs-dist@3.11.174, ou variable PDFJS_DIR vers le dossier du paquet).
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'decodeur-courrier.html'), 'utf8');
const norm = s => String(s).toLowerCase().replace(/[’`´]/g, "'").normalize('NFD').replace(/[̀-ͯ]/g, '');
const c = { norm }; vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('/*TABLE-DEB*/'), src.indexOf('/*TABLE-FIN*/')).replace(/^const /gm, 'var '), c);
const run = (code, v) => { c.__v = v; return vm.runInContext(code, c); };
let ko = 0, nb = 0;
const eq = (nom, a, b) => { nb++; if (JSON.stringify(a) !== JSON.stringify(b)) { ko++; console.log('✗ ' + nom + ' = ' + JSON.stringify(a) + ' (attendu ' + JSON.stringify(b) + ')'); } };

// ---- 1. Parseur de nombres ----
[['1 835,61', 1835.61], ['1 835,61', 1835.61], ['1 835,61', 1835.61], ['9 673,00', 9673], ['96,73', 96.73], ['-480,40', -480.4], ['−480,40', -480.4],
 ['480,40-', -480.4], ['(480,40)', -480.4], ['0,00', 0], ['1.835,61', 1835.61], ['151.67', 151.67], ['15,1291', 15.1291], ['2 330,93', 2330.93], ['+4,00', 4], ['12', 12],
 ['1.835', null], ['12/2024', null], ['9 6 73', null], ['--5', null], ['-5-', null], ['1,2,3', null], ['', null], ['abc', null], ['6,90%', null], ['1 83,61', null], [null, null]]
  .forEach(([s, v]) => eq('parseFR(' + JSON.stringify(s) + ')', run('parseFR(__v)', s), v));

// ---- 2. Fiche de janvier 2025 ----
const f2 = v => v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, m => m).replace(/^(-?)(\d+),/, (m, s, a) => s + a.replace(/\B(?=(\d{3})+$)/g, ' ') + ',');
const GAIN = (label, nb_, taux, g) => ({ label, nombre: nb_, tauxSal: taux, gain: g });
const COT = (label, base, taux, ret, emp) => ({ label, base, tauxSal: taux, retenue: ret, partEmp: emp });
const P1 = [
  GAIN('Salaire de base', 151.67, 12.6615, 1920.33),
  GAIN('Heures supp. 125 %', 17.85, 15.1291, 270.05),
  GAIN('Heures de nuit', 43.33, 3.0258, 131.11),
  GAIN('Absence maladie', 7, 12.1029, -84.72),
  GAIN('Maintien maladie 100 %', 7, 12.1029, 84.72),
  GAIN('Absence congés payés', 7, 12.47, -87.29),
  GAIN('Indemnité de congés payés', 7.76, 12.4651, 96.73),
  { total: 'Total brut', gain: 2330.93 },
  COT('Sécurité sociale maladie', 2330.93, 0, 0, 163.17),
  COT('Sécurité sociale vieillesse plafonnée', 2330.93, 6.9, 160.84, null),
  COT('Sécurité sociale vieillesse déplafonnée', 2330.93, 0.4, 9.32, null),
  COT('Retraite complémentaire T1', 2330.93, 4.01, 93.47, 140.09),
  COT('Contribution d\'équilibre général T1', 2330.93, 0.58, 13.63, null),
  COT('Contribution d\'équilibre technique T1', 2330.93, 0.14, 3.26, null),
  COT('CSG déductible', 2041.76, 6.8, 138.84, null),
  COT('CSG non déductible', 2041.76, 2.9, 59.21, null),
  COT('CSG/CRDS sur heures supplémentaires', 265.3, 9.7, 25.74, null),
  COT('Réduction cotisations salariales sur HS', null, null, -30.54, null),
  COT('Autres cotisations patronales (nettes de réduction)', null, null, null, 72.69),
  { total: 'Total des cotisations et contributions', retenue: 473.77, partEmp: 375.95 },
  GAIN('Remboursement titre de transport', null, null, 4)
];
const P2 = [
  { solo: 'Net à payer avant impôt sur le revenu', col: 'gain', v: 1861.16 },
  { solo: 'Montant net social', col: 'gain', v: 1857.16 },
  { solo: 'Montant net imposable', col: 'gain', v: 1672.06 },
  { pas: true },
  { solo: 'Net à payer au salarié (en euros)', col: 'gain', v: 1861.16 }
];
// Colonnes : abscisse du bord droit des nombres (alignés à droite) ; l'en-tête est centré 20 pt avant
const X = { nombre: 235, base: 290, tauxSal: 335, gain: 395, retenue: 450, partEmp: 545 }, LAB = 40;
const HEAD = { nombre: 'Nombre', base: 'Base', tauxSal: 'Taux salarial', gain: 'Gain', retenue: 'Retenue', partEmp: 'Part employeur' };
// Largeurs Helvetica (millièmes d'em) : chiffres 556, virgule/point/espace 278, moins 333, % 889
const wch = ch => /\d/.test(ch) ? 556 : /[,. ]/.test(ch) ? 278 : ch === '-' ? 333 : ch === '%' ? 889 : /[A-Z]/.test(ch) ? 667 : /[ilIjtf']/.test(ch) ? 250 : /[mw]/.test(ch) ? 800 : 520;
const width = (s, fs_) => [...s].reduce((a, ch) => a + wch(ch), 0) * fs_ / 1000;
// Mise en page → éléments {text, x (bord gauche), y (du haut), size, page}
function layout(opts = {}) {
  const el = [], S = 8; let y;
  const put = (text, x, yy, page, size = S) => el.push({ text, x, y: yy, size, page });
  const right = (text, xr, yy, page) => put(text, xr - width(text, S), yy, page);
  put('BULLETIN DE PAIE', 40, 50, 1, 12); put('Période : du 01/01/2025 au 31/01/2025', 40, 70, 1); put('Janvier 2025', 400, 50, 1, 12);
  y = 120;
  if (opts.deuxLignes) {
    const mid = (k) => X[k] - 20;
    put('Désignation', LAB, y + 10, 1);
    Object.keys(HEAD).forEach(k => { const [a, b] = k === 'tauxSal' ? ['Taux', 'salarial'] : k === 'partEmp' ? ['Part', 'employeur'] : [HEAD[k], null]; put(a, mid(k) - width(a, S) / 2, y, 1); if (b) put(b, mid(k) - width(b, S) / 2, y + 10, 1); });
    y += 26;
  } else {
    put('Désignation', LAB, y, 1);
    Object.keys(HEAD).forEach(k => put(HEAD[k], X[k] - 20 - width(HEAD[k], S) / 2, y, 1));
    y += 16;
  }
  const rowsOut = [];
  P1.forEach(r => {
    put(r.label || r.total, LAB, y, 1);
    ['nombre', 'base', 'tauxSal', 'gain', 'retenue', 'partEmp'].forEach(k => { if (r[k] !== undefined && r[k] !== null) right(f2(r[k]), X[k], y, 1); });
    y += 13;
  });
  y = 90;
  P2.forEach(r => {
    if (r.pas) { put('Impôt prélevé à la source', LAB, y, 2); right(f2(1861.16), X.base, y, 2); right('0,00', X.tauxSal - 12, y, 2); put('%', X.tauxSal - 8, y, 2); right('0,00', X.retenue, y, 2); }
    else { put(r.solo, LAB, y, 2); right(f2(r.v), X[r.col], y, 2); }
    y += 16;
  });
  return el;
}
// A. éléments → mots (comme le ferait pdf.js)
const toItems = el => el.map(e => ({ str: e.text, transform: [e.size, 0, 0, e.size, e.x, 842 - e.y], width: width(e.text, e.size), height: e.size, page: e.page }));
const wordsA = el => { const out = []; [1, 2].forEach(p => { const items = toItems(el.filter(e => e.page === p)); run('1', 0); c.__items = items; out.push(...vm.runInContext('pdfWords(__items, ' + p + ', (x, y) => [x, 842 - y])', c)); }); return out; };

// B. PDF réel (écrit à la main, sans bibliothèque)
function writePdf(el) {
  const enc = s => Buffer.from(s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'), 'latin1');
  const parts = [], offs = []; let len = 0;
  const w = b => { b = Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1'); parts.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; w(n + ' 0 obj\n'); w(body); w('\nendobj\n'); };
  w('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>');
  const streams = [1, 2].map(p => Buffer.concat(el.filter(e => e.page === p).map(e => Buffer.concat([Buffer.from('BT /F1 ' + e.size + ' Tf ' + e.x.toFixed(2) + ' ' + (842 - e.y).toFixed(2) + ' Td ('), enc(e.text), Buffer.from(') Tj ET\n')]))));
  obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 5 0 R >>');
  obj(4, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>');
  [5, 6].forEach((n, i) => { offs[n] = len; w(n + ' 0 obj\n<< /Length ' + streams[i].length + ' >>\nstream\n'); w(streams[i]); w('\nendstream\nendobj\n'); });
  obj(7, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const x = len; w('xref\n0 8\n0000000000 65535 f \n'); for (let i = 1; i <= 7; i++) w(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  w('trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n');
  return Buffer.concat(parts);
}
function findPdfjs() {
  for (const d of [process.env.PDFJS_DIR, path.join(__dirname, '..', 'node_modules', 'pdfjs-dist'), '/tmp/claude-0/pdfjs/node_modules/pdfjs-dist']) {
    if (d && fs.existsSync(path.join(d, 'legacy', 'build', 'pdf.js'))) return require(path.join(d, 'legacy', 'build', 'pdf.js'));
  }
  return null;
}

// ---- 3. Attendus (fiche réelle) ----
const T = { brut: 2330.93, cotSal: 473.77, cotPat: 375.95, netAvant: 1861.16, netSocial: 1857.16, netImposable: 1672.06, netPayer: 1861.16 };
function verifier(nom, res) {
  const t = res.totals;
  Object.keys(T).forEach(k => eq(nom + ' total ' + k, t[k], T[k]));
  eq(nom + ' impôt prélevé', t.pas && t.pas.amount, 0); eq(nom + ' taux impôt', t.pas && t.pas.taux, 0);
  eq(nom + ' lecture fiable', res.fiable, true);
  eq(nom + ' contrôles', res.checks.map(k => k.id + ':' + k.status).join(' '), 'net:ok gains:ok pas:ok colSal:ok colPat:ok cases:ok');
  const row = re => res.rows.find(r => re.test(r.n));
  const cells = (re, o) => { const r = row(re); eq(nom + ' ligne ' + re, r ? Object.fromEntries(Object.keys(o).map(k => [k, r.cells[k]])) : null, o); };
  cells(/^heures supp/, { nombre: 17.85, gain: 270.05 }); cells(/^heures de nuit/, { nombre: 43.33, gain: 131.11 });
  cells(/^absence maladie/, { gain: -84.72 }); cells(/^maintien maladie/, { gain: 84.72 });
  cells(/^absence conges/, { gain: -87.29 }); cells(/^indemnite de conges/, { gain: 96.73 });
  cells(/^securite sociale maladie/, { retenue: 0, partEmp: 163.17 });          // le défaut signalé : 163,17 est la part employeur
  cells(/^retraite complementaire t1/, { retenue: 93.47, partEmp: 140.09 });
  cells(/^csg deductible/, { retenue: 138.84 }); cells(/^csg non deductible/, { retenue: 59.21 }); cells(/^csg\/crds sur heures/, { retenue: 25.74 });
  cells(/^reduction cotisations salariales/, { retenue: -30.54 }); cells(/^remboursement titre/, { gain: 4 });
  eq(nom + ' aucune prime d\'ancienneté inventée', res.rows.some(r => /anciennete/.test(r.n)), false);
  eq(nom + ' lignes du tableau', res.rows.filter(r => r.hasCols && r.label).length, P1.length + P2.length);
  eq(nom + ' aucune valeur ronde inventée', res.rows.some(r => [2, 5, 23, 700].some(v => Object.values(r.cells).includes(v))), false);
}
const variantes = { 'A (une ligne d\'en-tête)': {}, 'A (en-tête sur deux lignes)': { deuxLignes: true } };
Object.entries(variantes).forEach(([nom, o]) => verifier(nom, run('readPayslipWords(__v)', wordsA(layout(o)))));

const pdfjs = findPdfjs();
(async () => {
  if (!pdfjs) console.log('· PDF réel : ignoré (pdfjs-dist introuvable ; npm install --no-save pdfjs-dist@3.11.174)');
  else for (const [nom, o] of Object.entries(variantes)) {
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(writePdf(layout(o))), verbosity: 0, disableFontFace: true }).promise;
    c.__pdf = pdf; c.__out = null;
    const words = await vm.runInContext('pdfToWords(__pdf)', c);
    verifier('B PDF réel ' + nom.slice(2), run('readPayslipWords(__v)', words));
  }

  // ---- 4. Cas défavorables : jamais de faux chiffre, la lecture est déclarée incertaine ----
  const base = layout();
  const changer = (re, nouveau, page = 1) => base.map(e => (e.page === page && re.test(e.text) ? Object.assign({}, e, { text: nouveau }) : e));
  { // le brut est faux : les contrôles le voient
    const r = run('readPayslipWords(__v)', wordsA(changer(/^2 330,93$/, '2 130,93').filter((e, i, a) => true)));
    eq('brut faux → lecture incertaine', r.fiable, false);
  }
  { // le net à payer est faux
    const r = run('readPayslipWords(__v)', wordsA(base.map(e => e.page === 2 && e.text === '1 861,16' && e.y > 130 ? Object.assign({}, e, { text: '700,00' }) : e)));
    eq('net à payer faux → contrôle impôt en échec', r.checks.find(k => k.id === 'pas').status, 'ko'); eq('net à payer faux → incertain', r.fiable, false);
  }
  { // un nombre à cheval sur deux colonnes n'est attribué à aucune
    const dec = base.map(e => (e.page === 1 && e.text === '163,17' ? Object.assign({}, e, { x: e.x - 55 }) : e));
    const r = run('readPayslipWords(__v)', wordsA(dec)), l = r.rows.find(x => /^securite sociale maladie/.test(x.n));
    eq('nombre entre deux colonnes → case vide', l.cells.partEmp === 163.17, false); eq('… et signalé', l.amb.length > 0 && r.fiable === false, true);
  }
  { // total absent : jamais inventé
    const r = run('readPayslipWords(__v)', wordsA(base.filter(e => !(e.page === 2 && /imposable/.test(e.text) || e.page === 2 && e.text === '1 672,06'))));
    eq('net imposable absent → null', r.totals.netImposable, null); eq('… donc lecture incomplète', r.fiable, false);
  }
  { // « 1 » et « 835,61 » lus comme deux mots se rejoignent ; deux colonnes voisines ne fusionnent pas
    const w = [{ t: '1', x0: 100, x1: 105, y: 10, h: 8, page: 1 }, { t: '835,61', x0: 108, x1: 138, y: 10, h: 8, page: 1 }, { t: '17,85', x0: 200, x1: 225, y: 10, h: 8, page: 1 }, { t: '270,05', x0: 230, x1: 260, y: 10, h: 8, page: 1 }];
    eq('milliers séparés', run('groupRows(__v)[0].words.map(x => x.t)', w), ['1 835,61', '17,85', '270,05']);
  }
  console.log(ko ? '✗ ' + ko + ' écarts sur ' + nb + ' contrôles' : '✓ ' + nb + ' contrôles de lecture de fiche de paie');
  process.exit(ko ? 1 : 0);
})();
