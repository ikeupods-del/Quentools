'use strict';
/* Ajoute le filigrane Wouf (logo + « Wouf » + woufapp.fr) sur une image.
   node marketing/wouf/watermark.js entree.png sortie.jpg [bas-droite|bas-gauche|haut-droite|haut-gauche] [marge-basse-px]
   Sortie : JPEG (ou PNG si l'extension est .png), mêmes dimensions que l'image d'origine. */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const [, , src, out, pos = 'bas-droite', bottom = '40'] = process.argv;
if (!src || !out) { console.error('Usage : node watermark.js entree.png sortie.jpg [bas-droite|bas-gauche|haut-droite|haut-gauche] [marge-basse-px]'); process.exit(1); }
const LOGO = fs.readFileSync(path.resolve(__dirname, '../../wouf/icons/icon.svg'), 'utf8');
const buf = fs.readFileSync(src), type = /\.png$/i.test(src) ? 'png' : 'jpeg';
const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20); // PNG : largeur/hauteur dans l'en-tête IHDR
const [v, hz] = { 'bas-droite': ['bottom', 'right'], 'bas-gauche': ['bottom', 'left'], 'haut-droite': ['top', 'right'], 'haut-gauche': ['top', 'left'] }[pos] || ['bottom', 'right'];
const s = Math.max(0.6, w / 1080); // taille du filigrane proportionnelle à l'image
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<style>body{margin:0}img{display:block;width:${w}px;height:${h}px}
    .wm{position:absolute;${v}:${v === 'bottom' ? +bottom * s : 40 * s}px;${hz}:${36 * s}px;display:flex;align-items:center;gap:${12 * s}px;padding:${10 * s}px ${20 * s}px ${10 * s}px ${10 * s}px;border-radius:${999}px;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);color:#fff;font-family:"DejaVu Sans",system-ui,sans-serif}
    .wm svg{width:${54 * s}px;height:${54 * s}px;border-radius:${14 * s}px}.wm b{font-size:${34 * s}px;font-weight:900;line-height:1}.wm small{display:block;font-size:${17 * s}px;opacity:.85;font-weight:700;margin-top:${3 * s}px}</style>
    <img src="data:image/${type};base64,${buf.toString('base64')}"><div class="wm">${LOGO}<div><b>Wouf</b><small>woufapp.fr</small></div></div>`);
  await p.screenshot({ path: out, type: /\.png$/i.test(out) ? 'png' : 'jpeg', quality: /\.png$/i.test(out) ? undefined : 92 });
  await b.close(); console.log('✓', out, w + '×' + h);
})();
