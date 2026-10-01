'use strict';
/* Vidéo verticale « mon histoire » pour TikTok (≈ 23 s, 1080×1920, sans son : ajouter le son tendance dans l'application).
   Scènes : « Pas développeur », « C'est décidé / Je deviens pro », haut de l'accueil, exemples de sites, applications, carte finale.
   Prérequis : serveur local à la racine du dépôt (python3 -m http.server 8123) et ffmpeg.
   node marketing/quentools/video-histoire.js [dossier-de-sortie] [exemples]  → quentools-histoire.mp4
   exemples : liste séparée par des virgules (défaut : climatisation,boulangerie). */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const BASE = process.env.BASE || 'http://localhost:8123', FF = process.env.FFMPEG || 'ffmpeg';
const OUT = path.resolve(process.argv[2] || __dirname), TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qt-histoire-'));
const EXEMPLES = (process.argv[3] || 'climatisation,boulangerie').split(',');
const LABEL = { climatisation: 'climatisation', boulangerie: 'boulangerie', plombier: 'plombier', coiffeuse: 'coiffeuse', coach: 'coach', paysagiste: 'paysagiste', fleuriste: 'fleuriste', restaurant: 'restaurant', photographe: 'photographe', osteopathe: 'ostéopathe' };
const W = 1080, H = 1920, FPS = 30, FADE = 0.3;
const fonts = `@font-face{font-family:Bricolage;src:url(${BASE}/assets/fonts/bricolage.woff2);font-weight:200 800}
@font-face{font-family:Inter;src:url(${BASE}/assets/fonts/inter.woff2);font-weight:100 900}`;
const base = `<!doctype html><meta charset=utf-8><style>${fonts}body{margin:0;width:${W}px;height:${H}px;overflow:hidden;font-family:Bricolage,Arial;--t:0;`;

const intro = `${base}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;background:#0d0c12;color:#f4f2fb;text-align:center}
h1{font-size:156px;line-height:1;margin:0;letter-spacing:-5px;padding:0 60px}p{font:600 64px Inter,Arial;margin:0;color:#cfcbe0}em{font-style:normal;font-weight:800;color:#d7f24a}</style>
<h1>Pas<br>développeur.</h1><p>Juste une <em>idée</em>.</p>`;
const carte = (l1, l2) => `${base}display:grid;place-items:center;background:linear-gradient(160deg,#5b3df5,#2a1a8a);color:#fff;text-align:center}
div{font-weight:800;font-size:150px;line-height:1;letter-spacing:-5px;padding:0 70px}em{font-style:normal;color:#d7f24a}</style><div>${l1}${l2 ? `<br><em>${l2}</em>` : ''}</div>`;
const appli = (nom, accroche, img, puce) => `${base}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px;background:radial-gradient(circle at 50% 30%,#2b2358,#0d0c12 70%);color:#f4f2fb;text-align:center}
h1{font-size:132px;line-height:1;margin:0;letter-spacing:-4px;color:#d7f24a}p{font:600 52px/1.2 Inter,Arial;margin:0;color:#cfcbe0;padding:0 80px}
.ph{width:560px;height:1120px;border:16px solid #121019;border-radius:84px;overflow:hidden;box-shadow:0 60px 120px -30px rgba(0,0,0,.7);background:#fff;transform:translateY(calc((1 - var(--t)) * 50px)) scale(calc(1 + var(--t) * .04))}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}.chip{font:700 46px Inter,Arial;background:#d7f24a;color:#121019;padding:14px 38px;border-radius:99px}</style>
<h1>${nom}</h1><p>${accroche}</p><div class=ph><img src="${BASE}/assets/${img}" alt=""></div><span class=chip>${puce}</span>`;
const fin = `${base}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;background:#0d0c12;color:#f4f2fb;text-align:center}
img{width:210px;height:210px;border-radius:50px}h1{font-size:132px;line-height:1;margin:0;letter-spacing:-4px;padding:0 60px}em{font-style:normal;color:#d7f24a}
p{font:600 56px Inter,Arial;margin:0;color:#cfcbe0}b{display:inline-block;background:#d7f24a;color:#121019;padding:20px 50px;border-radius:99px;font:800 66px Bricolage,Arial}</style>
<img src="${BASE}/assets/apple-touch-icon.png" alt=""><h1>Quen<em>Tools</em></h1><p>Votre site ou votre outil sur mesure</p><p>Devis gratuit</p><b>quentools.fr</b><p>Lien dans la bio</p>`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const clips = [];
  const encode = (name, dur) => {   // images numérotées <name>/%04d.png → clip
    const f = path.join(TMP, name + '.mp4');
    execFileSync(FF, ['-y', '-framerate', String(FPS), '-i', path.join(TMP, name, '%04d.png'), '-vf', `scale=${W}:${H},format=yuv420p`, '-c:v', 'libx264', '-crf', '20', f], { stdio: 'ignore' });
    clips.push([f, dur]);
  };
  // Scène à décor HTML : --t va de 0 à 1 (mouvement doux des téléphones)
  const html = async (name, code, dur, animate) => {
    const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
    await p.setContent(code, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    fs.mkdirSync(path.join(TMP, name));
    const n = Math.round(dur * FPS);
    for (let i = 0; i < n; i++) {
      if (animate) { const t = i / (n - 1); await p.evaluate(v => document.body.style.setProperty('--t', v), t * t * (3 - 2 * t)); }
      await p.screenshot({ path: path.join(TMP, name, String(i).padStart(4, '0') + '.png') });
    }
    await p.close(); encode(name, dur);
  };
  // Scène « page du site » : défilement très court (haut de page seulement), calculé image par image
  const site = async (name, url, label, dur, scroll) => {
    const c = await b.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 2.7692, isMobile: true, hasTouch: true, colorScheme: 'light' });
    const p = await c.newPage();
    await p.goto(BASE + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await p.addStyleTag({ content: 'html,body{scroll-behavior:auto!important}*{scroll-behavior:auto!important;animation:none!important;transition:none!important}' });
    await p.evaluate(txt => {
      document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'));
      const t = document.createElement('div'); t.textContent = txt; t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;background:#121019;color:#d7f24a;font:700 13px Arial;padding:8px 14px;border-radius:99px;white-space:nowrap'; document.body.appendChild(t);
    }, label);
    await p.waitForTimeout(500);
    fs.mkdirSync(path.join(TMP, name));
    const n = Math.round(dur * FPS);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), e = t * t * (3 - 2 * t);
      await p.evaluate(y => new Promise(r => { window.scrollTo(0, y); requestAnimationFrame(() => requestAnimationFrame(r)); }), Math.round(scroll * e));
      await p.screenshot({ path: path.join(TMP, name, String(i).padStart(4, '0') + '.png') });
    }
    await c.close(); encode(name, dur);
  };

  await html('a', intro, 3);
  await html('b1', carte('C’est décidé.'), 1.3);
  await html('b2', carte('Je deviens', 'pro.'), 1.7);
  await site('home', '/', 'quentools.fr', 3, 330);
  for (const ex of EXEMPLES) await site('ex-' + ex, `/exemples/${ex}/`, 'Exemple fictif · ' + (LABEL[ex] || ex), 3, 520);
  await html('wouf', appli('Wouf', 'Le carnet de santé du chien et du chat', 'ecran-wouf.jpg', 'woufapp.fr'), 2.4, true);
  await html('infikit', appli('Infikit', 'L’assistant des infirmières à domicile', 'ecran-infikit.jpg', 'Gratuit · quentools.fr/outils'), 2.4, true);
  await html('patrimoine', appli('Patrimoine AI', 'Suivez votre patrimoine au même endroit', 'ecran-patrimoine.jpg', 'Gratuit · quentools.fr/outils'), 2.4, true);
  await html('fin', fin, 3.5);
  await b.close();

  let inputs = [], filter = '', off = 0, last = '[0:v]';
  clips.forEach(([f]) => inputs.push('-i', f));
  for (let i = 1; i < clips.length; i++) {
    off += clips[i - 1][1] - FADE; const out = i === clips.length - 1 ? '[v]' : `[x${i}]`;
    filter += `${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${off.toFixed(2)}${out};`; last = out;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const dest = path.join(OUT, 'quentools-histoire.mp4');
  execFileSync(FF, ['-y', ...inputs, '-filter_complex', filter.slice(0, -1), '-map', '[v]', '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dest], { stdio: 'ignore' });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('Vidéo créée :', dest);
})();
