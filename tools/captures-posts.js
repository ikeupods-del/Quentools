/* Studio Posts — captures sur téléphone des sites d'exemple (exemples/<secteur>/), utilisées par la génération automatique
   des carrousels QuenTools (image « Sur téléphone ») : node tools/captures-posts.js
   Écrit marketing/generateur-posts/captures/<secteur>.jpg ; relancer après une modification d'un exemple, puis node tools/generateur-posts.js.
   Nécessite Playwright (voir tools/audit-express.js) ; aucun serveur : les pages sont ouvertes depuis le disque. */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const root = path.join(__dirname, '..'), out = path.join(root, 'marketing', 'generateur-posts', 'captures');
const SECTEURS = require(path.join(root, 'marketing', 'generateur-posts', 'secteurs.js'));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  for (const s of SECTEURS) {
    const p = await ctx.newPage();
    await p.goto('file://' + path.join(root, 'exemples', s.id, 'index.html'), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(900);
    const f = path.join(out, s.id + '.jpg');
    await p.screenshot({ path: f, type: 'jpeg', quality: 72 });
    console.log(`${s.id}.jpg : ${Math.round(fs.statSync(f).size / 1024)} Ko`);
    await p.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
