/* Le Parvis — génère les carrousels TikTok : node marketing/parvis/generate.js [id-partiel]
   Lit posts.js, écrit visuels/<id>/NN.jpg (1080×1350) et PUBLICATIONS.md (titres, légendes, ordre des images).
   Nécessite Playwright (voir tools/audit-express.js pour le chemin). */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const root = path.join(__dirname, '..', '..'), fonts = path.join(root, 'assets', 'fonts');
const posts = require('./posts.js');
const filtre = process.argv[2];

const C = { nuit: '#161f38', nuit2: '#1d2848', or: '#c9a45c', orClair: '#e3c785', creme: '#f8f4ec', cremeInk: '#f4efe3', navy: '#1e2d5a' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/ ([:?!»;])/g, ' $1').replace(/« /g, '« ');
const titre = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');

/* Logo : porche en arche avec croix */
const arche = (w, col, fine) => `<svg width="${w}" viewBox="0 0 120 150" fill="none" stroke="${col}" stroke-width="${fine ? 3 : 5}" stroke-linecap="round"><path d="M12 142V62C12 30 34 8 60 8s48 22 48 54v80"/><path d="M2 142h116"/><path d="M60 40v66M38 62h44" stroke-width="${fine ? 8 : 12}"/></svg>`;
const logoH = col => `<div class="logo">${arche(46, col, true)}<span>LE PARVIS</span></div>`;

const css = `
@font-face{font-family:P;src:url("file://${fonts}/ex/playfair-display-normal.woff2");font-weight:400 900}
@font-face{font-family:P;font-style:italic;src:url("file://${fonts}/ex/playfair-display-italic.woff2");font-weight:400 900}
@font-face{font-family:I;src:url("file://${fonts}/inter.woff2");font-weight:100 900}
*{box-sizing:border-box}
body{margin:0;width:1080px;height:1350px;overflow:hidden;position:relative;font-family:I,sans-serif}
.nuit{background:radial-gradient(120% 80% at 50% 0%,${C.nuit2},${C.nuit} 70%);color:${C.cremeInk}}
.creme{background:${C.creme};color:${C.navy}}
em{font-style:normal;color:${C.or}}
.fit{position:absolute;left:96px;right:96px;display:flex;flex-direction:column;justify-content:center}
.rule{width:130px;height:5px;border-radius:3px;background:${C.or};margin:44px auto}
.logo{display:flex;align-items:center;gap:18px;font-family:P;font-weight:600;letter-spacing:.2em;font-size:30px}
.mark{display:flex;flex-direction:column;align-items:center;gap:26px;font-family:I;font-weight:700;letter-spacing:.14em;font-size:34px;color:${C.cremeInk}}
.cover .mark{position:absolute;top:100px;left:0;right:0}
.cover .fit{top:330px;height:760px;text-align:center}
.cover h1{font-family:P;font-weight:800;line-height:1.14;margin:0;color:${C.cremeInk}}
.cover .sous{font-size:44px;line-height:1.35;color:rgba(244,239,227,.78);margin:0}
.point .head{position:absolute;top:92px;left:96px}
.point .fit{top:230px;height:900px}
.point .num{font-family:P;font-weight:800;font-size:150px;line-height:1;color:${C.or};margin-bottom:10px}
.point h2{font-family:P;font-weight:800;line-height:1.14;margin:0 0 40px;color:${C.cremeInk}}
.point p{font-size:50px;line-height:1.4;margin:0;color:rgba(244,239,227,.86)}
.point .ref{font-family:P;font-style:italic;font-weight:600;font-size:46px;color:${C.or};margin-top:36px}
.foot{position:absolute;bottom:70px;left:0;right:0;text-align:center;font-size:30px;letter-spacing:.06em;color:rgba(244,239,227,.5)}
.verse .cadre{position:absolute;inset:40px;border:2px solid rgba(201,164,92,.55);border-radius:44px}
.verse .arche{position:absolute;left:150px;right:150px;top:150px;bottom:210px;border:4px solid ${C.or};border-bottom:0;border-radius:380px 380px 0 0}
.verse .arche::after{content:"";position:absolute;inset:22px 22px 0;border:2px solid rgba(201,164,92,.5);border-bottom:0;border-radius:360px 360px 0 0}
.verse .fit{left:210px;right:210px;top:385px;height:600px;text-align:center}
.verse .label{font-size:42px;font-weight:500;color:#8b6f35;margin-bottom:34px}
.verse blockquote{font-family:P;font-style:italic;font-weight:500;line-height:1.28;margin:0;color:${C.navy}}
.verse .vref{font-size:40px;font-weight:500;color:#8b6f35;margin-top:44px}
.verse .vref::before{content:"";display:block;width:110px;height:3px;background:${C.or};margin:0 auto 34px}
.verse .logo{position:absolute;bottom:92px;left:0;right:0;justify-content:center;color:${C.navy};font-size:32px}
.verse .croix{position:absolute;top:215px;left:0;right:0;display:flex;justify-content:center}
.cta .mark{position:absolute;top:110px;left:0;right:0}
.cta .fit{top:360px;height:800px;text-align:center}
.cta h1{font-family:P;font-weight:800;line-height:1.16;margin:0;color:${C.cremeInk};font-size:84px}
.cta .sous{font-size:42px;line-height:1.4;color:rgba(244,239,227,.78);margin:0}
.cta .btn{margin:64px auto 0;width:820px;border-radius:999px;background:linear-gradient(180deg,${C.orClair},${C.or});color:${C.nuit};padding:40px 20px;text-align:center}
.cta .btn b{display:block;font-family:P;font-weight:800;font-size:92px;line-height:1.05}
.cta .btn span{display:block;font-weight:700;font-size:40px;margin-top:10px}
.cta .petit{font-size:34px;color:rgba(244,239,227,.55);margin-top:46px}
`;

const croixSvg = `<svg width="64" viewBox="0 0 60 100" fill="none" stroke="${C.navy}" stroke-width="9" stroke-linecap="round"><path d="M30 6v88M8 34h44"/></svg>`;

const slide = (s, i, total) => {
  const nuit = s.kind !== 'verse';
  let body = '';
  if (s.kind === 'cover') {
    body = `<div class="mark">${arche(110, C.or)}<div>LE PARVIS</div></div>
<div class="fit"><h1 data-fit="104">${titre(s.titre)}</h1><div class="rule"></div><p class="sous">${esc(s.sous || '')}</p></div>`;
  } else if (s.kind === 'point') {
    body = `<div class="head">${logoH(C.or)}</div><div class="fit">${s.n ? `<div class="num">${String(s.n).padStart(2, '0')}</div>` : ''}<h2 data-fit="${s.n ? 78 : 84}">${titre(s.titre)}</h2><p data-fit2>${esc(s.texte)}</p>${s.ref ? `<div class="ref">${esc(s.ref)}</div>` : ''}</div>
<div class="foot">${i + 1} / ${total}</div>`;
  } else if (s.kind === 'verse') {
    body = `<div class="cadre"></div><div class="arche"></div><div class="croix">${croixSvg}</div>
<div class="fit"><div class="label">${esc(s.label)}</div><blockquote data-fit="64">${esc(s.texte)}</blockquote><div class="vref">${esc(s.ref)}</div></div>${logoH(C.navy)}`;
  } else {
    body = `<div class="mark">${arche(110, C.or)}<div>LE PARVIS</div></div>
<div class="fit"><h1 data-fit="84">${titre(s.titre)}</h1><div class="rule" style="margin:36px auto"></div><p class="sous">${esc(s.sous)}</p>
<div class="btn"><b>Abonne-toi</b><span>pour ne rien rater</span></div><div class="petit">Le Parvis · communauté chrétienne</div></div>`;
  }
  return `<!doctype html><meta charset="utf-8"><style>${css}</style><body class="${nuit ? 'nuit' : 'creme'} ${s.kind}">${body}</body>`;
};

/* Réduit la taille des textes jusqu'à ce que le bloc tienne dans son cadre. */
const ajuster = async pg => pg.evaluate(() => {
  const fit = document.querySelector('.fit'); if (!fit) return;
  const els = [...fit.querySelectorAll('[data-fit]')], max = els.map(e => +e.dataset.fit);
  let k = 1;
  const apply = () => els.forEach((e, j) => e.style.fontSize = Math.round(max[j] * k) + 'px');
  const p = fit.querySelector('[data-fit2]'); const pMax = p ? 50 : 0;
  const applyAll = () => { apply(); if (p) p.style.fontSize = Math.round(pMax * k) + 'px'; };
  applyAll();
  while (fit.scrollHeight > fit.clientHeight + 1 && k > 0.45) { k -= 0.03; applyAll(); }
});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  const tmp = path.join(__dirname, '_tmp.html');
  let md = '# Le Parvis — 30 publications TikTok prêtes à poster\n\nChaque dossier de `visuels/` est un carrousel photo : poster les images dans l’ordre (`01.jpg`, `02.jpg`…). La dernière image invite à s’abonner. Textes bibliques : Louis Segond 1910.\n\n';
  for (const [n, p] of posts.entries()) {
    if (filtre && !p.id.includes(filtre)) continue;
    const dir = path.join(__dirname, 'visuels', p.id); fs.mkdirSync(dir, { recursive: true });
    for (const [i, s] of p.slides.entries()) {
      fs.writeFileSync(tmp, slide(s, i, p.slides.length));
      await pg.goto('file://' + tmp); await pg.evaluate(() => document.fonts.ready); await ajuster(pg);
      const trop = await pg.evaluate(() => { const f = document.querySelector('.fit'); return f.scrollHeight > f.clientHeight + 1; });
      await pg.screenshot({ path: path.join(dir, String(i + 1).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 88 });
      if (trop) console.log('TROP LONG', p.id, i + 1);
    }
    console.log(p.id, p.slides.length + ' images');
  }
  fs.unlinkSync(tmp); await b.close();
  posts.forEach((p, n) => {
    md += `## ${n + 1}. ${p.tiktok}\n*${p.format} · ${p.slides.length} images · visuels/${p.id}/*\n\n**Titre TikTok :** ${p.tiktok}\n\n**Légende :**\n\n${p.legende.split('\n').map(l => '> ' + l).join('\n')}\n\n`;
  });
  fs.writeFileSync(path.join(__dirname, 'PUBLICATIONS.md'), md);
})();
