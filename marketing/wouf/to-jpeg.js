'use strict';
/* Convertit des images du kit en JPEG (Instagram n'accepte que le JPEG via son API) : node marketing/wouf/to-jpeg.js fiche-chat-10 fiche-chien-11 …
   Sortie : marketing/wouf/images-jpg/<nom>.jpg */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const name of process.argv.slice(2)) {
    const src = path.join(__dirname, 'images', name + '.png'), buf = fs.readFileSync(src);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(`<body style="margin:0"><img src="data:image/png;base64,${buf.toString('base64')}" style="display:block;width:${w}px;height:${h}px"></body>`);
    await page.screenshot({ path: path.join(__dirname, 'images-jpg', name + '.jpg'), type: 'jpeg', quality: 92 }); await page.close(); console.log('✓', name, w + '×' + h);
  }
  await browser.close();
})();
