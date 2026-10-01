// Génère les vignettes de la galerie des exemples (assets/ex-<secteur>.jpg) et contrôle chaque page (erreurs, défilement horizontal).
// Chaque exemple est une page autonome (exemples/<secteur>/index.html) avec son propre design : les modifier à la main.
// Prérequis : un serveur statique à la racine du dépôt (ex. python3 -m http.server 8765) et Playwright (wouf/node_modules).
const { chromium } = require('../wouf/node_modules/playwright');
const fs = require('fs');
const base = process.argv[2] || 'http://localhost:8765';
(async () => {
  const dir = __dirname + '/../exemples';
  const list = fs.readdirSync(dir).filter(d => fs.existsSync(`${dir}/${d}/index.html`)).map(slug => ({ slug }));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  let bad = 0;
  for (const s of list) {
    for (const [w, dark] of [[1280, false], [390, true]]) {
      const p = await b.newPage({ viewport: { width: w, height: w === 1280 ? 800 : 844 }, colorScheme: dark ? 'dark' : 'light' }); const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(`${base}/exemples/${s.slug}/`);
      await p.evaluate(() => document.querySelectorAll('.reveal').forEach(x => { x.style.transition = 'none'; x.classList.add('is-in'); }));
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w || errs.length) { bad++; console.log('PROBLÈME', s.slug, w, sw, errs.join('|')); }
      if (w === 1280) { await p.waitForTimeout(300); await p.screenshot({ path: `${__dirname}/../assets/ex-${s.slug}.jpg`, type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 1280, height: 800 } }); }
      await p.close();
    }
  }
  await b.close(); console.log(list.length, 'exemples contrôlés,', bad, 'problème(s)');
})();
