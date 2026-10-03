/* QuenTools — visuels des publications (format 4:5, 1080×1350) : node tools/visuels-social.js
   Lit tools/publications.json, écrit assets/social/<id>.jpg. Nécessite Playwright (voir tools/audit-express.js). */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const root = path.join(__dirname, '..'), fonts = path.join(root, 'assets', 'fonts');
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'publications.json'), 'utf8'));
const themes = {
  violet: { bg: '#5b3df5', ink: '#ffffff', hi: '#d7f24a', soft: 'rgba(255,255,255,.78)', chip: 'rgba(255,255,255,.16)' },
  nuit:   { bg: '#121019', ink: '#f4f2fb', hi: '#d7f24a', soft: 'rgba(244,242,251,.72)', chip: 'rgba(255,255,255,.10)' },
  creme:  { bg: '#f6f4ee', ink: '#121019', hi: '#5b3df5', soft: '#4a4658', chip: 'rgba(91,61,245,.10)' },
  lime:   { bg: '#d7f24a', ink: '#121019', hi: '#5b3df5', soft: '#2c2a36', chip: 'rgba(18,16,25,.10)' }
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/ ([:?!»;])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
const mark = '<svg width="64" height="64" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="17" fill="#5b3df5" stroke="rgba(255,255,255,.55)" stroke-width="2"/><circle cx="30" cy="30" r="14" fill="none" stroke="#fff" stroke-width="7"/><path d="M37 37l12 12" stroke="#d7f24a" stroke-width="8" stroke-linecap="round"/></svg>';
const html = (p, t) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;src:url("file://${fonts}/bricolage.woff2");font-weight:200 800}
@font-face{font-family:I;src:url("file://${fonts}/inter.woff2");font-weight:100 900}
*{box-sizing:border-box}body{margin:0;width:1080px;height:1350px;background:${t.bg};color:${t.ink};font-family:I,sans-serif;display:flex;flex-direction:column;padding:96px 88px 80px;overflow:hidden;position:relative}
.glow{position:absolute;right:-220px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,${t.hi}33,transparent 65%)}
.chip{align-self:flex-start;background:${t.chip};color:${t.ink};font-weight:700;font-size:30px;letter-spacing:.06em;text-transform:uppercase;padding:14px 28px;border-radius:999px;position:relative}
main{margin:auto 0;position:relative}
h1{font-family:B;font-weight:800;font-size:${p.taille || 112}px;line-height:1.0;letter-spacing:-.03em;margin:56px 0 0;position:relative;text-wrap:balance}
h1 em{font-style:normal;color:${t.hi}}
ul{list-style:none;margin:56px 0 0;padding:0;display:grid;gap:26px;position:relative}
li{font-size:44px;line-height:1.25;font-weight:500;display:flex;gap:24px;color:${t.ink}}
li b{font-family:B;color:${t.hi};font-weight:800;min-width:48px}
.sub{font-size:44px;line-height:1.35;color:${t.soft};margin-top:48px;position:relative;font-weight:500}
.foot{margin-top:auto;display:flex;align-items:center;gap:20px;font-family:B;font-weight:700;font-size:40px;position:relative}
</style><div class="glow"></div><div class="chip">${esc(p.etiquette)}</div>
<main><h1>${p.titre.replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/&/g, '&amp;')}</h1>
${p.liste ? '<ul>' + p.liste.map((x, i) => `<li><b>${p.numero === false ? '•' : i + 1}</b><span>${esc(x)}</span></li>`).join('') + '</ul>' : ''}
${p.sous ? `<div class="sub">${esc(p.sous)}</div>` : ''}
</main><div class="foot">${mark}<span>QuenTools</span></div>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' }), pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const p of posts) {
    const tmp = path.join(root, 'assets', 'social', '_tmp.html'); fs.writeFileSync(tmp, html(p, themes[p.theme] || themes.violet)); await pg.goto('file://' + tmp); await pg.evaluate(() => document.fonts.ready);
    const over = await pg.evaluate(() => document.body.scrollHeight > 1350);
    await pg.screenshot({ path: path.join(root, 'assets', 'social', p.id + '.jpg'), type: 'jpeg', quality: 90 });
    console.log(p.id, over ? 'TROP LONG' : 'ok');
  }
  fs.unlinkSync(path.join(root, 'assets', 'social', '_tmp.html')); await b.close();
})();
