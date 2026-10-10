// Passe les photos de tickets de caisse dans le formulaire de garantie et compare produit, magasin, date et prix.
// Prérequis (hors dépôt) : npm install --no-save tesseract.js@6.0.1 @tesseract.js-data/fra sharp ; Playwright (variable PW). Lancer : node tools/essai-photos.js
// Photos de tickets de caisse → lecture réelle → champs du formulaire de garantie
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '..', '..'), NM = process.env.NM || require('path').join(ROOT, 'node_modules'), PH = process.env.PHOTOS || require('path').join(require('os').tmpdir(), 'qt-photos-essai');
const files = fs.readdirSync(PH).filter(f => /^ticket-/.test(f));
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); } }); }).listen(8781);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('PAGEERR', e.message));
  await pg.route(/googlesyndication|gstatic/, r => r.abort());
  await pg.route(/jsdelivr/, async r => { const u = r.request().url(); let f = null, type = 'application/javascript';
    if (/tesseract\.min\.js/.test(u)) f = NM + '/tesseract.js/dist/tesseract.min.js'; else if (/worker\.min\.js/.test(u)) f = NM + '/tesseract.js/dist/worker.min.js'; else if (/tesseract-core/.test(u)) f = NM + '/tesseract.js-core/' + u.split('/').pop(); else if (/fra\.traineddata/.test(u)) { f = NM + '/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz'; type = 'application/gzip'; }
    if (!f || !fs.existsSync(f)) return r.abort(); r.fulfill({ body: fs.readFileSync(f), contentType: type, headers: { 'access-control-allow-origin': '*' } }); });
  let ok = 0;
  for (const f of files) {
    await pg.goto('http://localhost:8781/decodeur-courrier.html'); await pg.click('#tab-warranty'); await pg.click('#w-add');
    await pg.setInputFiles('#wf-photo', PH + '/' + f);
    await pg.waitForFunction(() => /Lu sur le document|rien pu lire|Remplis les infos/.test(document.querySelector('#wf-photo-state').textContent), null, { timeout: 90000 }).catch(() => {});
    const v = await pg.evaluate(() => ({ nom: document.querySelector('#wf-name').value, magasin: document.querySelector('#wf-store').value, date: document.querySelector('#wf-date').value, prix: document.querySelector('#wf-prix').value, extra: document.querySelector('#wf-extra').value, etat: document.querySelector('#wf-photo-state').textContent }));
    const good = v.date === '2026-09-12' && +v.prix === 349 && /darty/i.test(v.magasin) && /lave/i.test(v.nom);
    if (good) ok++; console.log((good ? '✓ ' : '✗ ') + f.padEnd(18) + JSON.stringify(v));
  }
  console.log(ok + '/' + files.length + ' tickets bien lus'); await b.close(); srv.close();
})();
