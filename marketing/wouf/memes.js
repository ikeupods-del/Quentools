'use strict';
/* Mèmes Wouf (format du mème « Moi, pendant ce temps : ») : texte en haut sur fond blanc, photo libre de droits en dessous,
   filigrane Wouf en bas à droite. Textes et légendes : memes.json. Photos : photos/meme-<id>.jpg (workflow « Photos libres »).
   Sortie : memes/meme-<id>.jpg (Instagram 1080×1350) et memes/meme-<id>-tt.jpg (TikTok 1080×1920).
   node marketing/wouf/memes.js [id…] */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const OUT = path.join(__dirname, 'memes'), PH = path.join(__dirname, 'photos'), LOGO = fs.readFileSync(path.resolve(__dirname, '../../wouf/icons/icon.svg'), 'utf8');
const only = process.argv.slice(2), list = require('./memes.json').filter(m => !only.length || only.includes(m.id));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/« /g, '«\u00a0').replace(/ ([»:?!])/g, '\u00a0$1').replace(/\n/g, '<br>');
const page = (m, img, h) => `<style>*{box-sizing:border-box}body{margin:0;width:1080px;height:${h}px;background:#fff;font-family:"DejaVu Sans",system-ui,sans-serif;display:flex;flex-direction:column;padding:${h > 1500 ? '150px' : '48px'} 40px ${h > 1500 ? '260px' : '40px'}}
  .top{font-weight:900;font-size:58px;line-height:1.15;text-align:center;color:#111;letter-spacing:-.5px}.sub{font-size:44px;text-align:center;color:#222;margin:22px 0 30px;line-height:1.2}
  .ph{flex:1;border-radius:28px;background:#000 center/cover url(${img});position:relative;overflow:hidden}
  .wm{position:absolute;bottom:28px;right:28px;display:flex;align-items:center;gap:12px;padding:10px 20px 10px 10px;border-radius:999px;background:rgba(0,0,0,.45);color:#fff}
  .wm svg{width:54px;height:54px;border-radius:14px}.wm b{font-size:34px;font-weight:900;line-height:1}.wm small{display:block;font-size:17px;opacity:.85;font-weight:700;margin-top:3px}</style>
  <div class="top">${esc(m.top)}</div><div class="sub">${esc(m.sub)}</div><div class="ph"><div class="wm">${LOGO}<div><b>Wouf</b><small>woufapp.fr</small></div></div></div>`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const m of list) {
    const f = path.join(PH, `meme-${m.id}.jpg`); if (!fs.existsSync(f)) { console.log('  (photo manquante)', m.id); continue; }
    const img = 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
    for (const [suf, h] of [['', 1350], ['-tt', 1920]]) {
      const p = await b.newPage({ viewport: { width: 1080, height: h } }); await p.setContent(page(m, img, h));
      await p.screenshot({ path: path.join(OUT, `meme-${m.id}${suf}.jpg`), type: 'jpeg', quality: 90 }); await p.close();
    }
    console.log('  ✓', m.id);
  }
  await b.close();
})();
