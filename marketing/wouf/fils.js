'use strict';
/* Carrousels « fil » (format « Personne ne te l'a dit ») : couverture photo + accroche, un point par image (emoji, titre, texte,
   source vérifiable si chiffre), image finale d'appel au commentaire. Fond sombre, filigrane Wouf.
   Règle : aucun chiffre ni étude inventés ; chaque source citée doit exister (auteur, revue, année).
   Contenu : fils.json. Photos : photos/<photo>.jpg. Sortie : fils/<id>-XX.jpg (Instagram 1080×1350) et <id>-tt-XX.jpg (TikTok 1080×1920).
   node marketing/wouf/fils.js [id…] */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const OUT = path.join(__dirname, 'fils'), PH = path.join(__dirname, 'photos'), LOGO = fs.readFileSync(path.resolve(__dirname, '../../wouf/icons/icon.svg'), 'utf8');
const only = process.argv.slice(2), list = require('./fils.json').filter(f => !only.length || only.includes(f.id));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/« /g, '« ').replace(/ ([»:?!])/g, ' $1').replace(/\n/g, '<br>');
const css = h => `*{box-sizing:border-box}body{margin:0;width:1080px;height:${h}px;background:#0f0d0c;color:#fff;font-family:"DejaVu Sans",system-ui,sans-serif;position:relative;overflow:hidden}
  .wm{position:absolute;right:40px;bottom:${h > 1500 ? 250 : 40}px;display:flex;align-items:center;gap:12px;opacity:.9}.wm svg{width:54px;height:54px;border-radius:14px}.wm b{font-size:34px;font-weight:900}.wm small{display:block;font-size:17px;opacity:.8;font-weight:700}
  .num{position:absolute;left:44px;top:${h > 1500 ? 170 : 44}px;font-size:30px;font-weight:800;opacity:.6}
  .bg{position:absolute;inset:0;background-size:cover;background-position:center 35%}.shade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.15),rgba(0,0,0,.2) 40%,rgba(0,0,0,.85))}
  .cover{position:absolute;left:60px;right:60px;bottom:${h > 1500 ? 380 : 150}px}.cover h1{font-size:78px;line-height:1.08;margin:0 0 22px;font-weight:900;text-shadow:0 4px 18px rgba(0,0,0,.6)}.cover p{font-size:36px;font-style:italic;opacity:.9;margin:0}
  .pt{position:absolute;left:70px;right:70px;top:50%;transform:translateY(-50%)}.pt .e{font-family:"Noto Color Emoji",sans-serif;font-size:130px;line-height:1;margin-bottom:34px}.pt h2{font-size:66px;line-height:1.1;margin:0 0 26px;font-weight:900;color:#ffb46b}.pt p{font-size:44px;line-height:1.35;margin:0}.pt .src{font-size:28px;opacity:.65;margin-top:28px;font-style:italic}
  .dots{position:absolute;left:0;right:0;bottom:${h > 1500 ? 330 : 120}px;display:flex;justify-content:center;gap:12px}.dots i{width:14px;height:14px;border-radius:50%;background:#fff;opacity:.3}.dots i.on{opacity:1;background:#ffb46b}
  .cta h2{color:#fff}.cta p{font-size:48px}.cta .save{margin-top:40px;font-size:42px;color:#ffb46b;font-weight:800}`;
const wm = `<div class="wm">${LOGO}<div><b>Wouf</b><small>woufapp.fr</small></div></div>`;
const dots = (i, n) => `<div class="dots">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const f of list) {
    const img = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(PH, f.photo + '.jpg')).toString('base64'), n = f.points.length + 2;
    const slides = [`<div class="bg" style="background-image:url(${img})"></div><div class="shade"></div><div class="cover"><h1>${esc(f.hook)}</h1><p>${esc(f.tag)} · glisse 👉</p></div>${wm}`];
    f.points.forEach(([e, t, x, src], i) => slides.push(`<div class="num">${i + 1}/${f.points.length}</div><div class="pt"><div class="e">${e}</div><h2>${esc(t)}</h2><p>${esc(x)}</p>${src ? `<div class="src">${esc(src)}</div>` : ''}</div>${dots(i + 1, n)}${wm}`));
    slides.push(`<div class="pt cta"><div class="e">💬</div><h2>${esc(f.cta[0])}</h2><p>${esc(f.cta[1])}</p><div class="save">${esc(f.cta[2])}</div></div>${dots(n - 1, n)}${wm}`);
    for (const [suf, h] of [['', 1350], ['-tt', 1920]]) {
      const p = await b.newPage({ viewport: { width: 1080, height: h } });
      for (let i = 0; i < slides.length; i++) { await p.setContent(`<style>${css(h)}</style>${slides[i]}`); await p.screenshot({ path: path.join(OUT, `${f.id}${suf}-${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 90 }); }
      await p.close();
    }
    console.log('  ✓', f.id, slides.length, 'images');
  }
  await b.close();
})();
