// Passe les photos de courriers dans la vraie chaîne de lecture (Tesseract local) et compare type, montant et date à l'attendu.
// Prérequis (hors dépôt) : npm install --no-save tesseract.js@6.0.1 @tesseract.js-data/fra sharp ; Playwright (variable PW). Lancer : node tools/essai-photos.js
// Photos de courriers/tickets → lecture réelle (tesseract local) → analyse ; compare à l'attendu
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '..', '..'), NM = process.env.NM || require('path').join(ROOT, 'node_modules'), PH = process.env.PHOTOS || require('path').join(require('os').tmpdir(), 'qt-photos-essai');
const EXP = JSON.parse(fs.readFileSync(PH + '/attendu.json', 'utf8'));
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(PH).filter(f => /^(caf|impots|facture|amende)-/.test(f));
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { if (f.endsWith('decodeur-courrier.html')) d = Buffer.from(d.toString().replace('let current = null;', 'window.__C = () => current; window.__T = () => document.querySelector("#letter-input").value; let current = null;')); r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); } }); }).listen(8780);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('PAGEERR', e.message));
  await pg.route(/googlesyndication|gstatic/, r => r.abort());
  await pg.route(/jsdelivr/, async r => { const u = r.request().url(); let f = null, type = 'application/javascript';
    if (/tesseract\.min\.js/.test(u)) f = NM + '/tesseract.js/dist/tesseract.min.js'; else if (/worker\.min\.js/.test(u)) f = NM + '/tesseract.js/dist/worker.min.js'; else if (/tesseract-core/.test(u)) f = NM + '/tesseract.js-core/' + u.split('/').pop(); else if (/fra\.traineddata/.test(u)) { f = NM + '/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz'; type = 'application/gzip'; }
    if (!f || !fs.existsSync(f)) return r.abort(); r.fulfill({ body: fs.readFileSync(f), contentType: type, headers: { 'access-control-allow-origin': '*' } }); });
  await pg.goto('http://localhost:8780/decodeur-courrier.html');
  let okAll = 0;
  for (const f of files) {
    const k = f.split('-')[0], e = Object.assign({}, EXP[k], { type: { caf: 'indu', impots: 'impot' }[k] || EXP[k].type }), t0 = Date.now();
    await pg.evaluate(() => { document.querySelector('#clear-btn').click(); window.__C = window.__C; });
    await pg.setInputFiles('#file-input', PH + '/' + f);
    await pg.waitForFunction(() => { const c = window.__C(); return c && document.querySelector('#result.on'); }, null, { timeout: 20000 }).catch(() => {});
    const a = await pg.evaluate(() => { const c = window.__C(); return c ? { type: c.type.id, amount: c.amount ? c.amount.value : null, date: c.deadline ? c.deadline.date.toISOString().slice(0, 10) : null, conf: c.type.label } : null; });
    const txt = await pg.evaluate(() => window.__T());
    const good = a && a.type === e.type && a.amount === e.amount && a.date === e.date; if (good) okAll++;
    console.log((good ? '✓ ' : '✗ ') + f.padEnd(18) + JSON.stringify(a) + ' attendu ' + JSON.stringify(e) + ' (' + Math.round((Date.now() - t0) / 1000) + ' s, ' + txt.length + ' car.)');
    if (!good && process.env.V) console.log('   TEXTE: ' + txt.replace(/\n+/g, ' / ').slice(0, 700));
  }
  console.log(okAll + '/' + files.length + ' courriers correctement compris');
  await b.close(); srv.close();
})();
