/* QuenTools — contrôle de la démonstration « site cinématique » : node tools/verifier-cinematique.js
   Serveur local requis à la racine du dépôt (python3 -m http.server 8768). Vérifie, sur ordinateur, téléphone et « mouvement réduit » :
   défilement du canvas, chapitres, diaporama (verrou aux clics rapides, aucun élément fantôme), absence d'erreur et de défilement horizontal. */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const S = require('os').tmpdir(), BASE = process.env.BASE || 'http://localhost:8768/';
(async () => {
  const b = await chromium.launch();
  for (const [name, opt] of [['desk', { viewport: { width: 1280, height: 800 } }], ['mob', { viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true }], ['reduced', { viewport: { width: 390, height: 780 }, reducedMotion: 'reduce' }]]) {
    const p = await b.newPage(opt), errs = [];
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(BASE + 'demo/cinematique/'); await p.waitForTimeout(1500);
    const res = {};
    res.stat = await p.$eval('#stat', n => n.textContent);
    // positions de défilement dans #hero
    const top = await p.$eval('#hero', n => n.getBoundingClientRect().top + scrollY), h = await p.$eval('#hero', n => n.offsetHeight), vh = await p.evaluate(() => innerHeight);
    const sums = [];
    for (const pr of [0.02, 0.2, 0.5, 0.8, 0.98]) {
      await p.evaluate(y => scrollTo(0, y), top + pr * (h - vh)); await p.waitForTimeout(350);
      sums.push(await p.$eval('#cv', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 97) s += d[i] + d[i + 1] + d[i + 2]; return s; }));
      if (name !== 'reduced' && pr === 0.5) await p.screenshot({ path: S + '/h_' + name + '.png' });
    }
    res.canvasSums = sums.join(','); res.chap = await p.$$eval('.chap.is-on', n => n.map(x => x.id));
    res.canvasSize = await p.$eval('#cv', c => c.width + 'x' + c.height);
    // diaporama
    await p.evaluate(() => document.getElementById('qd').scrollIntoView()); await p.waitForTimeout(300);
    const t0 = await p.$eval('[data-qd-title]', n => n.textContent);
    await p.click('[data-qd-dir="1"]'); await p.click('[data-qd-dir="1"]'); // 2e clic ignoré (verrou)
    await p.waitForTimeout(500); if (name === 'desk') await p.screenshot({ path: S + '/s_mid.png' });
    await p.waitForTimeout(1800);
    const t1 = await p.$eval('[data-qd-title]', n => n.textContent);
    await p.click('[data-qd-dir="-1"]'); await p.waitForTimeout(2200);
    const t2 = await p.$eval('[data-qd-title]', n => n.textContent);
    res.slider = [t0, t1, t2].join(' > '); res.nodes = await p.evaluate(() => ({ prod: document.querySelectorAll('.qd-product').length, word: document.querySelectorAll('.qd-word').length, fl: document.querySelectorAll('.qd-float').length, ghost: document.querySelectorAll('.qd-ghost').length }));
    if (name === 'desk') await p.screenshot({ path: S + '/s_end.png' });
    res.overflowX = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    res.letters = await p.$eval('#t1', n => n.getAttribute('aria-label') + ' / ' + n.children.length);
    console.log(name, JSON.stringify(res), errs);
    const ok = !errs.length && !res.overflowX && res.nodes.prod === 1 && res.nodes.ghost === 0 && (name === 'reduced' || new Set(res.canvasSums.split(',')).size > 3);
    if (!ok) { console.error('ÉCHEC', name); process.exitCode = 1; }
    await p.close();
  }
  await b.close();
})();
