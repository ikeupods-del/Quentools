/* QuenTools — captures d'écran de Paperdecrypt pour les visuels (données fictives) : node tools/captures-paperdecrypt.js
   Écrit assets/social/shots/pd-*.jpg (390×844 @2x). Utilisées par tools/carrousels.js (champ "shots"). Nécessite Playwright. */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'assets', 'social', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }).listen(8768);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route(/googlesyndication|gstatic|jsdelivr/, r => r.abort());
  const pg = await ctx.newPage(), shot = n => pg.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 88 });
  await pg.goto('http://localhost:8768/decodeur-courrier.html');
  await pg.addStyleTag({ content: '.ad,.disclaimer{display:none!important}' });
  // Courrier décodé + abonnement + garantie pour les rappels
  await pg.click('#sample-btn'); await pg.click('#save-btn');
  await pg.evaluate(() => { const d = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10); localStorage.setItem('qt-paperasse:abonnements', JSON.stringify([{ id: 'a1', name: 'Box internet', amount: 29.99, period: 'mois', next: d(40), notice: 30, updatedAt: new Date().toISOString() }, { id: 'a2', name: 'Assurance habitation', amount: 18.5, period: 'mois', next: d(26), notice: 15, updatedAt: new Date().toISOString() }, { id: 'a3', name: 'Salle de sport', amount: 39, period: 'mois', next: d(5), notice: 0, updatedAt: new Date().toISOString() }])); });
  await pg.reload(); await pg.addStyleTag({ content: '.ad,.disclaimer{display:none!important}' });
  await pg.evaluate(() => window.scrollTo(0, 0)); await shot('pd-rappels');
  await pg.click('#sample-btn'); await pg.evaluate(() => document.querySelector('.stamp').scrollIntoView({ block: 'start' })); await pg.evaluate(() => window.scrollBy(0, -20)); await shot('pd-decode');
  // Outils
  await pg.click('#tab-tools'); await pg.evaluate(() => window.scrollTo(0, 0)); await shot('pd-outils');
  await pg.click('[data-tool=tva]'); await pg.fill('#tv-montant', '1200'); await pg.fill('#tv-acompte', '30'); await pg.evaluate(() => { document.activeElement.blur(); document.querySelector('#tv-montant').scrollIntoView({ block: 'start' }); window.scrollBy(0, -60); }); await shot('pd-tva');
  await pg.click('#tool-back'); await pg.click('[data-tool=abos]'); await pg.evaluate(() => window.scrollTo(0, 0)); await shot('pd-abos');
  // État des lieux : entrée puis sortie comparée
  await pg.goto('http://localhost:8768/decodeur-courrier.html#etat-des-lieux'); await pg.reload(); await pg.addStyleTag({ content: '.ad,.disclaimer{display:none!important}' });
  await pg.click('[data-edl-new=entree]'); await pg.fill('#en-adr', '12 rue des Lilas, Lyon'); await pg.fill('#en-bail', 'Agence du Parc'); await pg.click('#en-go');
  const fill = async (states) => { for (const [i, st, note] of states) { await pg.click(`[data-ii="${i}"] [data-st=${st}]`); if (note) { await pg.fill(`[data-ii="${i}"] [data-note]`, note); await pg.press(`[data-ii="${i}"] [data-note]`, 'Tab'); } } };
  await fill([[0, 'bon', ''], [1, 'use', 'rayures près de la fenêtre'], [2, 'bon', ''], [3, 'bon', ''], [4, 'neuf', ''], [5, 'bon', '']]);
  await pg.evaluate(() => window.scrollTo(0, 0)); await shot('pd-edl-piece');
  // on remplit tout le reste avec « bon » pour que l'entrée soit complète
  await pg.evaluate(() => { const l = JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux')); l[0].rooms.forEach(r => r.items.forEach(i => { if (!i.state) i.state = 'bon'; })); localStorage.setItem('qt-paperasse:etats-des-lieux', JSON.stringify(l)); });
  await pg.reload(); await pg.click('[data-edl-new=sortie]'); await pg.selectOption('#en-ref', { index: 1 }); await pg.fill('#en-adr', '12 rue des Lilas, Lyon'); await pg.fill('#en-bail', 'Agence du Parc'); await pg.click('#en-go');
  await fill([[0, 'bon', ''], [1, 'mauvais', 'tache et trous de chevilles'], [2, 'bon', ''], [3, 'use', '']]);
  await pg.evaluate(() => window.scrollTo(0, 0)); await shot('pd-edl-comparaison');
  await pg.evaluate(() => { const l = JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux')); const s = l.find(x => x.type === 'sortie'); s.rooms.forEach(r => r.items.forEach(i => { if (!i.state) i.state = 'bon'; })); localStorage.setItem('qt-paperasse:etats-des-lieux', JSON.stringify(l)); });
  await pg.reload(); await pg.click('[data-edl-sum]:last-of-type').catch(async () => { await pg.locator('[data-edl-sum]').first().click(); });
  await pg.evaluate(() => window.scrollTo(0, 0)); await shot('pd-edl-resume');
  // Fiche de paie (exemple fictif)
  await pg.goto('http://localhost:8768/decodeur-courrier.html#fiche-de-paie'); await pg.reload(); await pg.addStyleTag({ content: '.ad,.disclaimer{display:none!important}' });
  await pg.click('#paie-sample'); await pg.waitForSelector('.paie-t');
  await pg.evaluate(() => document.querySelector('#paie-res .verdict').scrollIntoView({ block: 'start' })); await shot('pd-paie-resume');
  await pg.fill('#paie-declared', '14');
  await pg.evaluate(() => { document.activeElement.blur(); const h = [...document.querySelectorAll('#paie-res h3')].find(x => /heures supp/i.test(x.textContent)); document.querySelector('#paie-declared').scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); }); await shot('pd-paie-heures');
  await pg.evaluate(() => { const h = [...document.querySelectorAll('#paie-res h3')].find(x => /Ligne par ligne/i.test(x.textContent)); h.scrollIntoView({ block: 'start' }); document.querySelectorAll('.paie-lines details')[1].open = true; window.scrollBy(0, -10); }); await shot('pd-paie-lignes');
  console.log('captures ok'); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
