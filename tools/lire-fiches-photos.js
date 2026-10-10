// Lecture optique (Tesseract) de photos de fiches de paie → mots positionnés enregistrés dans tools/fixtures/fiches-reelles.json, pour entraîner le petit modèle.
// Seuls les nombres et les mots de libellé de paie sont conservés : noms, adresses, numéros et employeurs sont écartés.
// Usage : node tools/lire-fiches-photos.js dossier_des_images   (images 01.jpg, 02.jpg… ; attendus dans tools/fixtures/fiches-reelles-attendus.json)
const fs = require('fs'), path = require('path');
const { c, run } = require('./essai-lecture-paie.js');
const dirs = [process.env.TESS_DIR, path.join(__dirname, '..'), '/tmp/claude-0/pdfjs'].filter(Boolean);
const base = dirs.find(d => fs.existsSync(path.join(d, 'node_modules', 'tesseract.js')));
const { createWorker } = require(path.join(base, 'node_modules', 'tesseract.js'));
const dossier = process.argv[2], att = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'fiches-reelles-attendus.json'), 'utf8'));
const VOCAB = /^(total|brut|net|cotisations?|contributions?|imp[oô]ts?|revenu|payer|pay[eé]|social|imposable|avant|salaire|salarie|sal|base|taux|montant|avantage|transport|titre|remboursement|frais|panier|repas|prelev[eé]?|source|pas|au|du|des|de|la|le|et|sur|par|a|d[uû]|reporter|ir|retenues?|solde|report|mois|pr[eé]c[eé]dent|abattement|csg|crds|exon[eé]rations?|employeur|part|patronale|salariale|dont|[eé]volution|r[eé]mun[eé]ration|li[eé]e|suppression|ch[oô]mage|maladie|fiscal|reint[eé]gration|indemnit[eé]|g[eé]n[eé]ral|en|euros?)$/i;
(async () => {
  const w = await createWorker('fra', 1, { langPath: path.join(base, 'node_modules', '@tesseract.js-data', 'fra', '4.0.0_best_int'), gzip: true, cachePath: '/tmp/claude-0/ocr-cache' });
  await w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
  const out = [];
  for (const a of att) {
    let img = path.join(dossier, a.fichier);
    const dim = require('child_process').spawnSync('identify', ['-format', '%w', img], { encoding: 'utf8' }).stdout;
    if (+dim < 1300) { const g = img.replace(/\.jpg$/, '-x2.png'); require('child_process').spawnSync('convert', [img, '-resize', '200%', g]); img = g; }   // petites images : agrandies avant la lecture
    const d = (await w.recognize(img, {}, { blocks: true })).data;
    c.__d = d; const mots = run('ocrWords(__v, 1)', d);
    const gardes = mots.filter(m => /\d/.test(m.t) ? /^[-−(]?[\d\s.,]+[-)]?€?$/.test(m.t.trim()) : VOCAB.test(m.t.replace(/[^A-Za-zÀ-ÿ]/g, '')));
    out.push({ fichier: a.fichier, attendu: a.attendu, words: gardes });
    console.log(a.fichier, mots.length, '→', gardes.length);
  }
  await w.terminate();
  fs.writeFileSync(path.join(__dirname, 'fixtures', 'fiches-reelles.json'), JSON.stringify(out));
})();
