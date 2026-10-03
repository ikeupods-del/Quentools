/* QuenTools — carrousels de publications (5 visuels 4:5 par sujet, 1080×1350) : node tools/carrousels.js [id…]
   Lit tools/carrousels.json, photographie le site d'exemple sur téléphone (serveur local sur le port 8765 à la racine du dépôt),
   écrit assets/social/c-<id>-1.jpg … -5.jpg. Nécessite Playwright (voir tools/audit-express.js). */
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const root = path.join(__dirname, '..'), fonts = path.join(root, 'assets', 'fonts'), out = path.join(root, 'assets', 'social');
const base = process.env.BASE || 'http://localhost:8765/';
let data = JSON.parse(fs.readFileSync(path.join(__dirname, 'carrousels.json'), 'utf8'));
if (process.argv.length > 2) data = data.filter(d => process.argv.slice(2).includes(d.id));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/ ([:?!»;])/g, ' $1').replace(/« /g, '« ');
const mark = '<svg width="52" height="52" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="17" fill="#5b3df5" stroke="rgba(255,255,255,.5)" stroke-width="2"/><circle cx="30" cy="30" r="14" fill="none" stroke="#fff" stroke-width="7"/><path d="M37 37l12 12" stroke="#d7f24a" stroke-width="8" stroke-linecap="round"/></svg>';
const css = d => `@font-face{font-family:B;src:url("file://${fonts}/bricolage.woff2")}@font-face{font-family:I;src:url("file://${fonts}/inter.woff2")}
*{box-sizing:border-box}body{margin:0;width:1080px;height:1350px;overflow:hidden;position:relative;color:#f6f1e8;font-family:I,sans-serif;background:radial-gradient(900px 700px at 78% 38%,${d.c2}2e,transparent 70%),radial-gradient(700px 600px at 0% 100%,${d.c1}18,transparent 70%),#0b0a10;padding:84px 80px}
.pill{display:inline-block;border:2px solid ${d.c1};color:${d.c1};border-radius:999px;padding:12px 28px;font-weight:700;font-size:28px;position:relative}
.grad{background:linear-gradient(90deg,${d.c1},${d.c2});-webkit-background-clip:text;background-clip:text;color:transparent}
h1,h2{font-family:B;font-weight:800;margin:0;letter-spacing:-.03em;line-height:1.02}
.foot{position:absolute;left:80px;right:80px;bottom:64px;display:flex;align-items:center;justify-content:space-between;font-family:B;font-weight:700;font-size:34px}.foot span{display:flex;align-items:center;gap:16px}
.dots{display:flex;gap:14px;background:rgba(10,9,16,.72);padding:14px 20px;border-radius:999px}.dots i{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.25)}.dots i.on{background:#fff}
.hint{position:absolute;left:80px;bottom:150px;font-weight:700;font-size:32px;color:${d.c1}}
.phone{position:absolute;border:12px solid #1c1b24;border-radius:70px;background:#000;overflow:hidden;box-shadow:0 40px 90px -20px #000,0 0 0 2px #35333f}.phone img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
ul{list-style:none;padding:0;margin:48px 0 0;display:grid;gap:30px}li{font-size:46px;line-height:1.22;font-weight:600;display:flex;gap:22px}li b{color:${d.c1};font-family:B}`;
const dots = n => '<div class="dots">' + [1, 2, 3, 4, 5].map(i => `<i class="${i === n ? 'on' : ''}"></i>`).join('') + '</div>';
const foot = n => `<div class="foot"><span>${mark}QuenTools</span>${dots(n)}</div>`;
const slides = (d, shots) => [
`<div class="pill">${esc(d.pill || 'Modèle de démonstration')}</div><h1 style="font-size:92px;margin-top:64px;width:520px">${esc(d.hook[0])}</h1><h2 style="font-size:62px;margin-top:30px;width:500px">${esc(d.hook[1])}</h2><h2 class="grad" style="font-size:58px;margin-top:30px;width:500px">${esc(d.accent)}</h2><div class="phone" style="left:640px;top:520px;width:500px;height:960px;transform:rotate(-5deg)"><img src="${shots[0]}"></div><div class="hint">Glissez pour voir comment →</div>${foot(1)}`,
`<div class="pill">Le constat</div><h2 style="font-size:84px;margin-top:190px">${esc(d.prob)}</h2><ul>${d.pb.map(x => `<li><b>✕</b><span>${esc(x)}</span></li>`).join('')}</ul>${foot(2)}`,
`<div class="pill">La solution</div><h2 class="grad" style="font-size:76px;margin-top:70px;width:620px">${esc(d.sol)}</h2><ul style="width:560px;gap:26px"><li style="font-size:40px"><b>✓</b><span>${esc(d.sb[0])}</span></li><li style="font-size:40px"><b>✓</b><span>${esc(d.sb[1])}</span></li><li style="font-size:40px"><b>✓</b><span>${esc(d.sb[2])}</span></li></ul><div class="phone" style="left:700px;top:560px;width:470px;height:900px;transform:rotate(4deg)"><img src="${shots[1]}"></div>${foot(3)}`,
`<div class="pill">Sur téléphone</div><h2 style="font-size:70px;margin-top:50px;text-align:center">Tout est à portée de pouce</h2><div class="phone" style="left:290px;top:290px;width:500px;height:900px"><img src="${shots[2]}"></div>${foot(4)}`,
`<div class="pill">${esc(d.ctaPill || 'Et vous ?')}</div><h1 style="font-size:104px;margin-top:240px">${esc(d.ctaTitle || 'Et votre *métier*, c’est quoi ?').replace(/\*(.+?)\*/g, '<span class="grad">$1</span>')}</h1><p style="font-size:50px;line-height:1.35;margin-top:64px;color:rgba(246,241,232,.82);font-weight:500">${esc(d.ctaText || 'Dites-le en commentaire : je vous réponds avec une idée précise pour votre site.')}</p>${(d.note === undefined ? 'Exemple fictif réalisé par QuenTools' : d.note) ? `<p style="font-size:30px;margin-top:40px;color:rgba(246,241,232,.55)">${esc(d.note === undefined ? 'Exemple fictif réalisé par QuenTools' : d.note)}</p>` : ''}${foot(5)}`
];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'carr-'));
  const mob = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const d of data) {
    const sp = await mob.newPage(); await sp.goto(base + d.site, { waitUntil: 'load' }); await sp.waitForTimeout(d.wait || 900);
    await sp.evaluate(() => document.querySelectorAll('.reveal,[data-reveal]').forEach(e => e.classList.add('in', 'is-in', 'visible', 'on')));
    if (d.hidePrices) await sp.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const t = []; while (w.nextNode()) t.push(w.currentNode); t.forEach(n => { n.nodeValue = n.nodeValue.replace(/\s*[·,]?\s*d[èe]s\s+\d[\d\s.,]*\s?€/gi, '').replace(/\s*·\s*\d[\d\s.,]*\s?€/g, '').replace(/\d[\d\s.,]*\s?€/g, 'Prix fixe');}); });
    const shots = [];
    for (const [i, y] of [0, 900, 1900].entries()) { await sp.evaluate(y => window.scrollTo(0, y), y); await sp.waitForTimeout(500); const f = path.join(tmp, d.id + i + '.png'); await sp.screenshot({ path: f }); shots.push('file://' + f); }
    await sp.close();
    for (const [i, s] of slides(d, shots).entries()) {
      const f = path.join(tmp, 'slide.html'); fs.writeFileSync(f, `<!doctype html><meta charset="utf-8"><style>${css(d)}</style>${s}`);
      await pg.goto('file://' + f); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(150);
      await pg.screenshot({ path: path.join(out, `c-${d.id}-${i + 1}.jpg`), type: 'jpeg', quality: 90 });
    }
    console.log(d.id, 'ok');
  }
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
})();
