/* QuenTools — bannières des réseaux sociaux : node tools/bannieres.js
   Écrit design/reseaux/banniere-facebook.png (1640×624, zone sûre centrale pour le téléphone)
   et design/reseaux/banniere-linkedin.png (1128×191 en double résolution, logo de la page en bas à gauche).
   Textes des bios : design/reseaux/BIOS.md. Nécessite Playwright (voir tools/visuels-social.js). */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const root = path.join(__dirname, '..'), fonts = path.join(root, 'assets', 'fonts'), sortie = path.join(root, 'design', 'reseaux');
const url = f => 'file://' + path.join(root, 'assets', f);
const mark = '<svg viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#fff"/><circle cx="30" cy="30" r="14" fill="none" stroke="#5b3df5" stroke-width="7"/><path d="M37 37l12 12" stroke="#d7f24a" stroke-width="8" stroke-linecap="round"/></svg>';
const base = (w, h) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;src:url("file://${fonts}/bricolage.woff2");font-weight:200 800}
@font-face{font-family:I;src:url("file://${fonts}/inter.woff2");font-weight:100 900}
*{box-sizing:border-box}body{margin:0;width:${w}px;height:${h}px;overflow:hidden;position:relative;font-family:I,sans-serif;color:#fff;
  background:radial-gradient(circle at 85% 20%,#7a62ff 0,transparent 45%),linear-gradient(120deg,#4527d6,#5b3df5 55%,#3a22b8)}
.grille{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:48px 48px}
h1{font-family:B;font-weight:800;letter-spacing:-.035em;line-height:.98;margin:0}
h1 em{font-style:normal;background:linear-gradient(transparent 60%,#d7f24a 60% 92%,transparent 92%);color:#fff;padding:0 .05em;white-space:nowrap}
.chips{display:flex;flex-wrap:wrap;gap:10px}.chips span{border:1.5px solid rgba(255,255,255,.35);border-radius:999px;padding:.35em .9em;font-weight:600;background:rgba(255,255,255,.08)}
.marque{display:flex;align-items:center;gap:.45em;font-family:B;font-weight:800}.marque svg{width:1.4em;height:1.4em}
.tel{position:absolute;border-radius:28px;border:6px solid #121019;background:#121019;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.6)}
.tel img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
</style><div class="grille"></div>`;

const facebook = base(1640, 624) + `<style>
.txt{position:absolute;left:250px;top:110px;width:760px}
h1{font-size:76px;margin:22px 0 28px}.chips{font-size:22px}.eyebrow{font-size:22px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#d7f24a}
.marque{position:absolute;left:250px;bottom:56px;font-size:30px}.site{position:absolute;right:250px;bottom:62px;font-size:24px;font-weight:600;opacity:.85}
.t1{width:190px;height:380px;left:1050px;top:150px;transform:rotate(-8deg)}.t2{width:210px;height:420px;left:1170px;top:90px;z-index:2}.t3{width:190px;height:380px;left:1300px;top:160px;transform:rotate(8deg)}
</style><div class="txt"><div class="eyebrow">Studio de création d’apps et d’outils</div>
<h1>Votre outil, <em>sur mesure</em>, prêt en quelques semaines.</h1>
<div class="chips"><span>Applications web</span><span>Réservation</span><span>Commandes</span><span>Espace client</span></div></div>
<div class="tel t1"><img src="${url('ecran-infikit.jpg')}"></div><div class="tel t2"><img src="${url('ecran-wouf.jpg')}"></div><div class="tel t3"><img src="${url('ecran-gourmet.jpg')}"></div>
<div class="marque">${mark}QuenTools</div><div class="site">quentools.fr</div>`;

const linkedin = base(2256, 382) + `<style>
.txt{position:absolute;left:700px;top:70px;width:1100px}
h1{font-size:84px}.chips{font-size:26px;margin-top:30px}
.t1{width:150px;height:300px;left:1880px;top:60px;transform:rotate(-7deg)}.t2{width:150px;height:300px;left:2020px;top:40px;transform:rotate(5deg);z-index:2}
</style><div class="txt"><h1>Des apps et des outils <em>faits pour votre métier</em>.</h1>
<div class="chips"><span>Applications web</span><span>Outils métier</span><span>Réservation et commandes</span><span>quentools.fr</span></div></div>
<div class="tel t1"><img src="${url('ecran-infikit.jpg')}"></div><div class="tel t2"><img src="${url('ecran-wouf.jpg')}"></div>`;

(async () => {
  fs.mkdirSync(sortie, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  for (const [nom, html, w, h] of [['banniere-facebook', facebook, 1640, 624], ['banniere-linkedin', linkedin, 2256, 382]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } }), tmp = path.join(sortie, '_tmp.html');
    fs.writeFileSync(tmp, html); await pg.goto('file://' + tmp); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
    await pg.screenshot({ path: path.join(sortie, nom + '.png') }); fs.unlinkSync(tmp); await pg.close();
    console.log(nom + '.png', w + '×' + h);
  }
  await b.close();
})();
