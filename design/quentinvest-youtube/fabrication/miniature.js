// Miniature YouTube 1280×720 d'un épisode : titre en gros à gauche, Pico en grand à droite (SVG, net à toute taille).
// Usage : node miniature.js <episode.json> [expression, ex. surpris-ouvert] [sortie.png]
'use strict';
const fs = require('fs'), path = require('path');
let pw; try { pw = require(process.env.PW || 'playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const EP = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const expr = process.argv[3] || 'surpris-ouvert', sortie = path.resolve(process.argv[4] || path.join(path.dirname(process.argv[2]), path.basename(process.argv[2], '.json') + '-miniature.png'));
const RACINE = path.join(__dirname, '..', '..', '..'), svg = fs.readFileSync(path.join(__dirname, '..', 'personnage', 'svg', `pico-${expr}.svg`), 'utf8');
const police = 'data:font/woff2;base64,' + fs.readFileSync(path.join(RACINE, 'assets', 'fonts', 'inter.woff2')).toString('base64');
const MOTS = (EP.miniature && EP.miniature.lignes) || EP.titre.replace(/\s*\?$/, '').toUpperCase().split(/(?<=\s)(?=LES |DES |LE |LA )|(?<=^POURQUOI )/).filter(Boolean);
const accent = (EP.miniature && EP.miniature.accent) || 'PRIX';
const ligne = l => `<div>${l.trim().split(' ').map(m => m === accent ? `<span style="color:#FBBF24">${m}</span>` : m).join(' ')}</div>`;
const html = `<html><head><style>@font-face{font-family:Inter;src:url(${police});font-weight:100 900}*{margin:0;box-sizing:border-box}
body{width:1280px;height:720px;overflow:hidden;position:relative;font-family:Inter,sans-serif;color:#F4F2EE;background:radial-gradient(760px 620px at 82% 70%,rgba(16,185,129,.50),transparent 65%),radial-gradient(700px 400px at 0% 0%,rgba(251,191,36,.14),transparent 60%),#151311}
.t{position:absolute;left:62px;top:118px;font-weight:900;font-size:118px;line-height:1.0;letter-spacing:-3px;text-shadow:0 6px 0 rgba(0,0,0,.45)}
.q{position:absolute;left:62px;bottom:70px;font-size:50px;font-weight:800;color:#6EE7B7;display:flex;gap:18px;align-items:center}
.q b{background:#FBBF24;color:#151311;border-radius:14px;padding:6px 20px}
.m{position:absolute;left:62px;top:46px;display:flex;align-items:center;gap:12px;font-weight:800;font-size:30px}.m i{width:24px;height:24px;background:#10B981;transform:rotate(45deg);border-radius:5px}
.p{position:absolute;right:-40px;bottom:-28px;width:620px;height:775px}.p svg{width:100%;height:100%}</style></head><body>
<div class="m"><i></i>${EP.chaine}</div>
<div class="t">${MOTS.map(ligne).join('')}</div>
${EP.miniature && EP.miniature.bas ? `<div class="q"><b>${EP.miniature.bas[0]}</b>${EP.miniature.bas[1]}</div>` : ''}
<div class="p">${svg.replace(/<svg [^>]*?(viewBox="[^"]*")/, '<svg $1 xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round"')}</div></body></html>`;
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.QS_CHROMIUM || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: sortie }); await b.close(); console.log(sortie);
})();
