/* QuenTools — visuel d'annonce « bientôt » de Paperdecrypt (LinkedIn, 1080×1350) : node tools/pub/teaser-linkedin.js → assets/social/linkedin-paperdecrypt-bientot.jpg */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), fonts = path.join(root, 'assets', 'fonts');
const mark = '<svg width="64" height="64" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="17" fill="#5b3df5" stroke="rgba(255,255,255,.5)" stroke-width="2"/><circle cx="30" cy="30" r="14" fill="none" stroke="#fff" stroke-width="7"/><path d="M37 37l12 12" stroke="#d7f24a" stroke-width="8" stroke-linecap="round"/></svg>';
const chips = ['Courriers et factures', 'Fiche de paie et heures supp', 'État des lieux daté et géolocalisé', 'Rappels, coffre, abonnements'];
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;src:url("file://${fonts}/bricolage.woff2")}@font-face{font-family:I;src:url("file://${fonts}/inter.woff2")}
*{box-sizing:border-box}body{margin:0;width:1080px;height:1350px;overflow:hidden;position:relative;color:#f6f1e8;font-family:I,sans-serif;padding:96px 88px;background:radial-gradient(900px 700px at 80% 30%,#7aa5ff38,transparent 70%),radial-gradient(700px 600px at 0% 100%,#ffe14d1f,transparent 70%),#0b0a10}
.pill{display:inline-block;border:3px solid #ffe14d;color:#ffe14d;border-radius:999px;padding:14px 34px;font-weight:700;font-size:34px}
h1{font:800 150px/.98 B;letter-spacing:-.035em;margin:56px 0 0}
.g{background:linear-gradient(90deg,#ffe14d,#7aa5ff);-webkit-background-clip:text;background-clip:text;color:transparent}
p{font:600 52px/1.25 B;margin:44px 0 0;color:rgba(246,241,232,.9);max-width:850px}
ul{list-style:none;padding:0;margin:52px 0 0;display:grid;gap:22px}li{display:flex;gap:20px;align-items:center;font:600 38px I}li b{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:#ffe14d;color:#111;font-size:28px;flex:none}
.foot{position:absolute;left:88px;right:88px;bottom:70px;display:flex;align-items:center;justify-content:space-between;font:700 40px B}.foot span{display:flex;align-items:center;gap:20px}.foot small{font:500 28px I;color:#f6f1e8a0}
</style><div class="pill">Bientôt</div><h1><span class="g">Paper</span><br>decrypt</h1>
<p>Vos courriers, fiches de paie et états des lieux, enfin compréhensibles.</p>
<ul>${chips.map(c => `<li><b>✓</b>${c}</li>`).join('')}</ul>
<div class="foot"><span>${mark}QuenTools</span><small>Un outil gratuit</small></div>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  const f = path.join(require('os').tmpdir(), 'teaser.html'); fs.writeFileSync(f, html);
  await pg.goto('file://' + f); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(200);
  await pg.screenshot({ path: path.join(root, 'assets', 'social', 'linkedin-paperdecrypt-bientot.jpg'), type: 'jpeg', quality: 92 });
  await b.close(); console.log('ok');
})();
