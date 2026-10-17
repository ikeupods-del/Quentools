// Miniature d'un épisode : YouTube 1280×720 (titre à gauche, Pico à droite) ou TikTok 1080×1920 avec --tiktok (titre en haut, Pico au centre).
// TikTok : tout le message tient dans la zone centrale 3:4 (la grille du profil recadre) et loin des boutons et de la légende (haut et bas).
// Usage : node miniature.js <episode.json> [expression, ex. surpris-ouvert] [sortie.png] [--tiktok]
'use strict';
const fs = require('fs'), path = require('path');
let pw; try { pw = require(process.env.PW || 'playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const TIKTOK = process.argv.includes('--tiktok'), ARGS = process.argv.filter(a => a !== '--tiktok');
const EP = JSON.parse(fs.readFileSync(ARGS[2], 'utf8'));
const expr = ARGS[3] || 'surpris-ouvert', sortie = path.resolve(ARGS[4] || path.join(path.dirname(ARGS[2]), path.basename(ARGS[2], '.json') + (TIKTOK ? '-miniature-tiktok.png' : '-miniature.png')));
const RACINE = path.join(__dirname, '..', '..', '..'), svg = fs.readFileSync(path.join(__dirname, '..', 'personnage', 'svg', `pico-${expr}.svg`), 'utf8');
const police = 'data:font/woff2;base64,' + fs.readFileSync(path.join(RACINE, 'assets', 'fonts', 'inter.woff2')).toString('base64');
const MOTS = (EP.miniature && EP.miniature.lignes) || EP.titre.replace(/\s*\?$/, '').toUpperCase().split(/(?<=\s)(?=LES |DES |LE |LA )|(?<=^POURQUOI )/).filter(Boolean);
const accent = (EP.miniature && EP.miniature.accent) || 'PRIX';
const ligne = l => `<div>${l.trim().split(' ').map(m => m === accent ? `<span style="color:#FBBF24">${m}</span>` : m).join(' ')}</div>`;
const COULEURS = 'radial-gradient(900px 900px at 50% 78%,rgba(16,185,129,.50),transparent 65%),radial-gradient(800px 500px at 0% 0%,rgba(251,191,36,.14),transparent 60%),#151311';
const htmlTikTok = `<html><head><style>@font-face{font-family:Inter;src:url(${police});font-weight:100 900}*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;position:relative;font-family:Inter,sans-serif;color:#F4F2EE;background:${COULEURS}}
.t{position:absolute;left:0;right:0;top:330px;text-align:center;font-weight:900;font-size:150px;line-height:1.02;letter-spacing:-4px;text-shadow:0 7px 0 rgba(0,0,0,.45)}
.q{position:absolute;left:0;right:0;top:1470px;display:flex;justify-content:center;gap:22px;align-items:center;font-size:64px;font-weight:800;color:#6EE7B7}.q b{background:#FBBF24;color:#151311;border-radius:18px;padding:8px 28px}
.m{position:absolute;left:0;right:0;top:262px;display:flex;justify-content:center;align-items:center;gap:14px;font-weight:800;font-size:36px}.m i{width:28px;height:28px;background:#10B981;transform:rotate(45deg);border-radius:6px}
.p{position:absolute;left:50%;margin-left:-450px;top:800px;width:900px;height:1125px}.p svg{width:100%;height:100%}</style></head><body>
<div class="m"><i></i>${EP.chaine}</div><div class="t">${MOTS.map(ligne).join('')}</div>
<div class="p">${svg.replace(/<svg [^>]*?(viewBox="[^"]*")/, '<svg $1 xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round"')}</div></body></html>`;
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
  const p = await b.newPage({ viewport: TIKTOK ? { width: 1080, height: 1920 } : { width: 1280, height: 720 } });
  await p.setContent(TIKTOK ? htmlTikTok : html); await p.waitForTimeout(300); await p.screenshot({ path: sortie }); await b.close(); console.log(sortie);
})();
