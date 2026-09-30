'use strict';
/* Post « Le saviez-vous ? Wouf est né à Nîmes » : 1 image Instagram 1080×1350 + 1 image 1080×1920 (TikTok/Stories).
   Aucune donnée inventée. node marketing/wouf/nimes.js → images/nimes-1.png, images/nimes-tt-1.png (+ JPEG dans images-jpg/) */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const LOGO = fs.readFileSync(path.resolve(__dirname, '../../wouf/icons/icon.svg'), 'utf8');
const html = h => `<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.cv{width:1080px;height:${h}px;background:linear-gradient(160deg,#ffab5c,#ee6a1c);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:${h > 1500 ? '230px 90px' : '90px'};gap:28px;position:relative}
.logo{display:flex;align-items:center;gap:16px;font-weight:900;font-size:48px}.logo svg{width:72px;height:72px;border-radius:18px}
.tag{font-size:36px;font-weight:800;letter-spacing:3px;text-transform:uppercase;opacity:.85}h1{font-size:90px;line-height:1.03;margin:0;font-weight:900;letter-spacing:-2px}
.sub{font-size:48px;line-height:1.3;font-weight:650}.card{background:#fff;color:#231f1b;border-radius:36px;padding:38px 44px;font-size:44px;line-height:1.3;font-weight:700}.card b{color:#ee6a1c}
.foot{font-size:34px;font-weight:700;opacity:.9}</style>
<div class="cv"><div class="logo">${LOGO}<span>Wouf</span></div><div class="tag">Le saviez-vous ?</div>
<h1>Wouf a été conçu dans le sud de la France, à Nîmes 🇫🇷</h1>
<div class="card">Une petite application <b>faite avec le coeur</b> pour le carnet de santé, les rappels et les conseils de votre chien et de votre chat.</div>
<div class="sub">Un produit QuenTools · woufapp.fr</div><div class="foot">Enregistrez ce post 🔖 et envoyez-le à un propriétaire d’animal 🐶🐱</div></div>`;
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), out = path.join(__dirname, 'images');
  for (const [pre, h] of [['nimes-', 1350], ['nimes-tt-', 1920]]) {
    const p = await b.newPage({ viewport: { width: 1080, height: h } }); await p.setContent(html(h));
    await p.screenshot({ path: path.join(out, pre + '1.png') });
    fs.mkdirSync(path.join(__dirname, 'images-jpg'), { recursive: true }); await p.screenshot({ path: path.join(__dirname, 'images-jpg', pre + '1.jpg'), type: 'jpeg', quality: 90 }); await p.close();
  }
  await b.close(); console.log('✓ images Nîmes');
})();
