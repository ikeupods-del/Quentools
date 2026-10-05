// Génère le flyer A5 recto-verso (design/flyer/flyer.html) : PDF avec fond perdu de 3 mm (154 × 216 mm) et aperçus PNG.
// Sortie : design/flyer/QuenTools-flyer-A5.pdf, recto.png, verso.png.   node tools/flyer.js
const path = require('path'), fs = require('fs');
const { chromium } = require('../wouf/node_modules/playwright');
(async () => {
  const dir = path.join(__dirname, '../design/flyer'), url = 'file://' + path.join(dir, 'flyer.html');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 582, height: 816 }, deviceScaleFactor: 4 });
  await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.pdf({ path: path.join(dir, 'QuenTools-flyer-A5.pdf'), width: '154mm', height: '216mm', printBackground: true, preferCSSPageSize: true });
  for (const id of ['recto', 'verso']) await (await p.$('#' + id)).screenshot({ path: path.join(dir, id + '.png') });
  await b.close(); console.log('flyer généré');
})();
