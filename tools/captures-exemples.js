/* Captures sur téléphone des sites d'exemple (exemples/<secteur>/) pour Studio Posts : node tools/captures-exemples.js [secteur…]
   Écrit marketing/generateur-posts/captures/<secteur>.jpg (390×844, ×1,5). Ces captures remplissent le téléphone des carrousels générés ;
   tools/generateur-posts.js les met dans donnees.js. Prérequis : un serveur statique à la racine du dépôt (python3 -m http.server 8765) et Playwright
   (PW=chemin du module, CHROME=chemin du navigateur). À relancer quand un exemple change. */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const racine = path.join(__dirname, '..'), sortie = path.join(racine, 'marketing', 'generateur-posts', 'captures');
const base = process.env.BASE || 'http://localhost:8765/';
(async () => {
  fs.mkdirSync(sortie, { recursive: true });
  let ids = fs.readdirSync(path.join(racine, 'exemples')).filter(d => fs.existsSync(path.join(racine, 'exemples', d, 'index.html')));
  if (process.argv.length > 2) ids = ids.filter(d => process.argv.slice(2).includes(d));
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
  for (const id of ids) {
    const p = await ctx.newPage();
    await p.goto(`${base}exemples/${id}/`, { waitUntil: 'load' }); await p.waitForTimeout(900);
    await p.evaluate(() => document.querySelectorAll('.reveal,[data-reveal]').forEach(e => e.classList.add('in', 'is-in', 'visible', 'on')));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400); // le haut de la page : l'accroche et le bouton d'appel
    await p.screenshot({ path: path.join(sortie, id + '.jpg'), type: 'jpeg', quality: 62 });
    await p.close(); console.log(id, Math.round(fs.statSync(path.join(sortie, id + '.jpg')).size / 1024) + ' Ko');
  }
  await b.close();
})();
