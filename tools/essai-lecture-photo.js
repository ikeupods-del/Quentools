// Lecture de la fiche de janvier 2025 à partir d'IMAGES (vraie lecture optique Tesseract, boîtes de mots comprises), propres puis dégradées.
// Prérequis (sinon le test est ignoré) : npm install --no-save tesseract.js@5 @tesseract.js-data/fra ; pdftoppm et convert (ImageMagick) installés.
// Ce que le test garantit : une lecture déclarée « fiable » a TOUS ses totaux justes. Une lecture ratée doit être déclarée incertaine, jamais affichée comme sûre.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { layout, writePdf, T, run, c } = require('./essai-lecture-paie.js');
const dirs = [process.env.TESS_DIR, path.join(__dirname, '..'), '/tmp/claude-0/pdfjs'].filter(Boolean);
const base = dirs.find(d => fs.existsSync(path.join(d, 'node_modules', 'tesseract.js')) && fs.existsSync(path.join(d, 'node_modules', '@tesseract.js-data', 'fra')));
const ok = n => cp.spawnSync('which', [n]).status === 0;
if (!base || !ok('pdftoppm') || !ok('convert')) { console.log('· lecture de photos : ignorée (tesseract.js, @tesseract.js-data/fra, pdftoppm ou convert introuvable)'); process.exit(0); }
const { createWorker } = require(path.join(base, 'node_modules', 'tesseract.js'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'paie-'));
const sh = (cmd, args) => { const r = cp.spawnSync(cmd, args, { encoding: 'utf8' }); if (r.status) throw new Error(cmd + ' : ' + r.stderr); };
fs.writeFileSync(path.join(tmp, 'f.pdf'), writePdf(layout()));
const VAR = {
  'propre (300 dpi)': { dpi: 300, ops: [] },
  'photo penchée, floue, bruitée': { dpi: 200, ops: ['-background', 'white', '-rotate', '2.5', '-blur', '0x1.2', '-attenuate', '0.3', '+noise', 'Gaussian', '-brightness-contrast', '-10x-25'] },
  'basse résolution (110 dpi)': { dpi: 110, ops: [] },
  'froissée et penchée': { dpi: 220, ops: ['-background', 'white', '-wave', '1.5x140', '-rotate', '-4', '-blur', '0x0.8', '-brightness-contrast', '-5x-15'] },
  'sombre et contrastée': { dpi: 220, ops: ['-brightness-contrast', '-35x-30', '-blur', '0x0.9'] }
};
let ko = 0, nb = 0;
(async () => {
  const w = await createWorker('fra', 1, { langPath: path.join(base, 'node_modules', '@tesseract.js-data', 'fra', '4.0.0_best_int'), gzip: true, cachePath: path.join(tmp, 'cache') });
  await w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
  for (const [nom, v] of Object.entries(VAR)) {
    sh('pdftoppm', ['-r', String(v.dpi), '-png', path.join(tmp, 'f.pdf'), path.join(tmp, 'p')]);
    const words = [];
    for (const pg of [1, 2]) {
      const src = path.join(tmp, 'p-' + pg + '.png'), dst = path.join(tmp, 'q-' + pg + '.png');
      sh('convert', [src, ...v.ops, dst]);
      const d = (await w.recognize(dst, {}, { blocks: true })).data;
      c.__d = d; words.push(...run('ocrWords(__v, ' + pg + ')', d));
    }
    const res = run('readPayslipWords(__v)', words), t = res.totals;
    const faux = Object.keys(T).filter(k => t[k] !== null && t[k] !== T[k]), justes = Object.keys(T).filter(k => t[k] === T[k]).length;
    nb++;
    const verdict = res.fiable ? (faux.length ? 'FAUX CHIFFRE DÉCLARÉ FIABLE' : 'fiable et juste') : 'lecture incertaine (' + (res.checks.filter(k => k.status === 'ko').map(k => k.id).concat(res.manquants.map(m => 'manque ' + m))).join(', ') + ')';
    console.log((res.fiable && faux.length ? '✗ ' : '· ') + nom.padEnd(32) + justes + '/' + Object.keys(T).length + ' totaux justes' + (faux.length ? ', faux : ' + faux.map(k => k + '=' + t[k]).join(' ') : '') + ' → ' + verdict);
    if (res.fiable && faux.length) ko++;
    if (nom.startsWith('propre')) { nb++; if (!res.fiable || faux.length) { ko++; console.log('✗ la version propre devrait être lue sans erreur'); } }
  }
  await w.terminate();
  console.log(ko ? '✗ ' + ko + ' échec(s) : un faux chiffre a été présenté comme sûr' : '✓ lecture de photos : aucun faux chiffre présenté comme sûr (' + Object.keys(VAR).length + ' qualités d\'image)');
  process.exit(ko ? 1 : 0);
})();
