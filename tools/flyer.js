// Génère le flyer A5 recto (design/flyer/flyer.html) : PDF avec fond perdu de 3 mm (154 × 216 mm) et aperçu PNG.
// Les trois téléphones sont de vraies captures mobiles (390 × 844) des exemples du site, refaites à chaque génération.
// Sortie : design/flyer/QuenTools-flyer-A5.pdf, recto.png, tel-*.jpg.   node tools/flyer.js
const path = require('path'), fs = require('fs');
const { chromium } = require('../wouf/node_modules/playwright');
const PHONES = ['plombier', 'fleuriste', 'coach'];
(async () => {
  const root = path.join(__dirname, '..'), dir = path.join(root, 'design/flyer');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  for (const s of PHONES) {
    const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await m.goto('file://' + path.join(root, 'exemples', s, 'index.html')); await m.evaluate(() => document.fonts.ready); await m.addStyleTag({ content: '.qt-ex{display:none!important}' }); await m.evaluate(() => { const f = document.getElementById('free'); if (f) f.textContent = 'Commande avant 15 h, livraison le jour même (exemple)'; }); await m.waitForTimeout(500);
    await m.screenshot({ path: path.join(dir, `tel-${s}.jpg`), type: 'jpeg', quality: 86 }); await m.close();
  }
  const p = await b.newPage({ viewport: { width: 582, height: 816 }, deviceScaleFactor: 4 });
  await p.goto('file://' + path.join(dir, 'flyer.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.pdf({ path: path.join(dir, 'QuenTools-flyer-A5.pdf'), width: '154mm', height: '216mm', printBackground: true, preferCSSPageSize: true });
  await (await p.$('#recto')).screenshot({ path: path.join(dir, 'recto.png') });
  await b.close(); console.log('flyer généré');
})();
