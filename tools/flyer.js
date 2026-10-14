// Génère le flyer A5 recto (design/flyer/flyer.html) : PDF avec fond perdu de 3 mm (154 × 216 mm) et aperçu PNG.
// Flyer du Pack Commerçant : les trois téléphones sont de vraies captures de sa démonstration, refaites à chaque génération ; prix lu dans le catalogue.
// Sortie : design/flyer/QuenTools-flyer-A5.pdf, recto.png, tel-*.jpg.   node tools/flyer.js
const path = require('path'), fs = require('fs');
const { chromium } = require([process.env.PW, path.join(__dirname, '../wouf/node_modules/playwright'), '/opt/node22/lib/node_modules/playwright'].find(x => x && fs.existsSync(x)));
const http = require('http');
// Les trois téléphones sont de vraies captures du Pack Commerçant (démonstration), et le prix vient du catalogue (assets/qt-templates.js).
(async () => {
  const root = path.join(__dirname, '..'), dir = path.join(root, 'design/flyer');
  const w = {}; new Function('window', fs.readFileSync(path.join(root, 'assets/qt-templates.js'), 'utf8'))(w); const pk = w.QTT.templates.find(t => t.id === 'pack');
  const f = path.join(dir, 'flyer.html'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/<div class="price" id="prix">.*?<\/div>/, `<div class="price" id="prix">${w.QTT.fmt(pk.base)}<small style="margin-left:1.6mm">+ ${w.QTT.fmt(pk.monthly)}/mois</small></div>`));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
  const srv = http.createServer((q, s) => { let x = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (x.endsWith('/')) x += 'index.html'; if (!x.startsWith(root) || !fs.existsSync(x)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(x)] || 'application/octet-stream' }); fs.createReadStream(x).pipe(s); }).listen(0);
  const B = `http://localhost:${srv.address().port}/demo/pack-commercant/`;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
  const sans = () => m.evaluate(() => { const x = document.querySelector('.demo-bandeau'); if (x) x.remove(); });
  await m.goto(B); await m.evaluate(() => localStorage.clear()); await m.goto(B);
  await m.check('input[name=p][value=gel]'); await m.locator('#jours button').nth(1).click(); await m.locator('#heures button').nth(2).click(); await sans();
  await m.evaluate(() => { const e = document.querySelector('#reserver h2'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 80); }); await m.waitForTimeout(300);
  await m.screenshot({ path: path.join(dir, 'tel-reservation.jpg'), type: 'jpeg', quality: 86 });
  await m.fill('#nom', 'Camille Martin'); await m.fill('#tel', '06 12 34 56 78'); await m.check('#ok'); await m.click('#go'); await m.waitForSelector('#fin:not([hidden])');
  await m.goto(B + 'carte/'); await m.fill('#prenom', 'Camille'); await m.click('#f button'); await m.waitForSelector('.pk-carte');
  await m.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('pack:')), d = JSON.parse(localStorage[k]); Object.values(d.cartes)[0].tampons = 3; localStorage[k] = JSON.stringify(d); });
  await m.goto(B + 'carte/'); await m.waitForSelector('.pk-carte'); await sans(); await m.screenshot({ path: path.join(dir, 'tel-fidelite.jpg'), type: 'jpeg', quality: 86 });
  await m.goto(B + 'admin/'); await m.click('#entrer'); await m.waitForSelector('#app:not([hidden])'); await sans(); await m.screenshot({ path: path.join(dir, 'tel-commercant.jpg'), type: 'jpeg', quality: 86 });
  srv.close();
  const p = await b.newPage({ viewport: { width: 582, height: 816 }, deviceScaleFactor: 4 });
  await p.goto('file://' + path.join(dir, 'flyer.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.pdf({ path: path.join(dir, 'QuenTools-flyer-A5.pdf'), width: '154mm', height: '216mm', printBackground: true, preferCSSPageSize: true });
  await (await p.$('#recto')).screenshot({ path: path.join(dir, 'recto.png') });
  await b.close(); console.log('flyer généré');
})();
