'use strict';
/* Vidéo verticale « avant / après » pour TikTok (≈ 20 s, 1080×1920, sans son : ajouter le son tendance dans l'application).
   Scènes : « avant » (ancien site fictif), « c'est décidé », défilement d'un exemple de site, carte finale.
   Prérequis : serveur local à la racine du dépôt (python3 -m http.server 8123) et ffmpeg.
   node marketing/quentools/video-avant-apres.js [dossier-de-sortie] [exemple]  → quentools-avant-apres-<exemple>.mp4
   Exemples pris en charge : climatisation (par défaut), plombier.
   Vidéo « mon histoire » : voir video-histoire.js. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const BASE = process.env.BASE || 'http://localhost:8123', FF = process.env.FFMPEG || 'ffmpeg';
const OUT = path.resolve(process.argv[2] || __dirname), TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qt-video-'));
const W = 1080, H = 1920, FPS = 30, FADE = 0.3, SCROLL_S = 14;
const EX = { climatisation: { titre: 'Clim Services Martin', metier: 'climatisation', label: 'site de climatisation' }, plombier: { titre: 'Plomberie Martin', metier: 'plombier', label: 'site de plombier' } };
const HISTOIRE = process.argv[3] === 'histoire', SLUG = HISTOIRE ? 'histoire' : (process.argv[3] || 'climatisation'), CFG = EX[SLUG] || {}; if (!HISTOIRE && !EX[SLUG]) throw new Error('Exemple inconnu : ' + SLUG);

const fonts = `@font-face{font-family:Bricolage;src:url(${BASE}/assets/fonts/bricolage.woff2);font-weight:200 800}
@font-face{font-family:Inter;src:url(${BASE}/assets/fonts/inter.woff2);font-weight:100 900}`;
const avant = `<!doctype html><meta charset=utf-8><style>${fonts}
body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#d9d9d9 repeating-linear-gradient(45deg,#cfcfcf 0 6px,#e4e4e4 6px 12px);font-family:"Times New Roman",serif;color:#000}
.old{position:absolute;inset:150px 60px 330px;background:#fff;border:6px ridge #888;padding:30px}
.ban{background:#ff0;color:#c00;font:700 44px Arial;text-align:center;border:4px dashed #c00;padding:14px}
h1{font:700 52px "Comic Sans MS",cursive;color:#00f;text-align:center;margin:22px 0}
p{font-size:30px;margin:12px 0}a{color:#00e}.small{font-size:20px;color:#555}.cnt{background:#000;color:#0f0;font:30px monospace;display:inline-block;padding:4px 14px}
.tag{position:absolute;top:60px;left:0;right:0;text-align:center;font:800 70px Bricolage,Arial;color:#fff;-webkit-text-stroke:3px #121019;paint-order:stroke fill}
.tag span{background:#e5484d;padding:6px 30px;border-radius:14px;-webkit-text-stroke:0}
.q{position:absolute;bottom:90px;left:50px;right:50px;text-align:center;font:800 78px/1.05 Bricolage,Arial;color:#121019}</style>
<div class=tag><span>AVANT</span></div>
<div class=old><div class=ban>★ BIENVENUE SUR NOTRE SITE ★</div><h1>${CFG.titre} - Site officiel</h1>
<p>Nous faisons de la ${CFG.metier} depuis longtemps. <a href=#>Cliquez ici</a> pour nous contacter. Site optimisé pour Internet Explorer.</p>
<p class=small>Horaires : voir page 3. Tarifs : nous appeler. Contact : <a href=#>formulaire (bientôt)</a>.</p>
<p>Vous êtes le visiteur n° <span class=cnt>004127</span></p>
<p class=small>Dernière mise à jour : 2014. Site fictif pour l'exemple.</p></div>
<div class=q>Votre site aujourd'hui ?</div>`;
const carte = (l1, l2) => `<!doctype html><meta charset=utf-8><style>${fonts}
body{margin:0;width:${W}px;height:${H}px;display:grid;place-items:center;background:linear-gradient(160deg,#5b3df5,#2a1a8a);color:#fff;text-align:center;font-family:Bricolage,Arial}
div{font-weight:800;font-size:150px;line-height:1;letter-spacing:-5px;padding:0 70px}em{font-style:normal;color:#d7f24a}</style><div>${l1}${l2 ? `<br><em>${l2}</em>` : ''}</div>`;
const fin = `<!doctype html><meta charset=utf-8><style>${fonts}
body{margin:0;width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:50px;background:#0d0c12;color:#f4f2fb;text-align:center;font-family:Bricolage,Arial}
img{width:210px;height:210px;border-radius:50px}h1{font-size:128px;line-height:1;margin:0;letter-spacing:-4px;padding:0 70px}em{font-style:normal;color:#d7f24a}
p{font:600 58px Inter,Arial;margin:0;color:#cfcbe0}b{display:inline-block;background:#d7f24a;color:#121019;padding:20px 50px;border-radius:99px;font:800 66px Bricolage,Arial}</style>
<img src="${BASE}/assets/apple-touch-icon.png" alt=""><h1>Votre site <em>pro</em>,<br>sur devis gratuit</h1><p>Prix fixé avant de commencer</p><b>quentools.fr</b><p>Lien dans la bio</p>`;

const intro = `<!doctype html><meta charset=utf-8><style>${fonts}
body{margin:0;width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;background:#0d0c12;color:#f4f2fb;text-align:center;font-family:Bricolage,Arial}
h1{font-size:156px;line-height:1;margin:0;letter-spacing:-5px;padding:0 60px}em{font-style:normal;color:#d7f24a}p{font:600 64px Inter,Arial;margin:0;color:#cfcbe0}</style>
<h1>Pas<br>développeur.</h1><p>Juste une <em style="font-weight:800">idée</em>.</p>`;
const finH = `<!doctype html><meta charset=utf-8><style>${fonts}
body{margin:0;width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;background:#0d0c12;color:#f4f2fb;text-align:center;font-family:Bricolage,Arial}
img{width:210px;height:210px;border-radius:50px}h1{font-size:132px;line-height:1;margin:0;letter-spacing:-4px;padding:0 60px}em{font-style:normal;color:#d7f24a}
p{font:600 56px Inter,Arial;margin:0;color:#cfcbe0}b{display:inline-block;background:#d7f24a;color:#121019;padding:20px 50px;border-radius:99px;font:800 66px Bricolage,Arial}</style>
<img src="${BASE}/assets/apple-touch-icon.png" alt=""><h1>Quen<em>Tools</em></h1><p>Votre site ou votre outil sur mesure</p><p>Devis gratuit</p><b>quentools.fr</b><p>Lien dans la bio</p>`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const still = async (name, html) => {
    const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(TMP, name + '.png') }); await p.close();
  };
  await still('a', HISTOIRE ? intro : avant); await still('b1', carte('C’est décidé.')); await still('b2', carte('Je deviens', 'pro.')); await still('d', HISTOIRE ? finH : fin);

  // Scène de défilement : l'exemple « plombier » du site, rendu en mobile puis mis à l'échelle 1080×1920
  const c = await b.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 2.7692, isMobile: true, hasTouch: true, colorScheme: 'light' });
  const p = await c.newPage();
  await p.goto(BASE + (HISTOIRE ? '/' : '/exemples/' + SLUG + '/'), { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  // Rendu image par image : pas de défilement animé du navigateur (cause des saccades), pas d'animation CSS en cours de route
  await p.addStyleTag({ content: 'html,body{scroll-behavior:auto!important}*{scroll-behavior:auto!important;animation:none!important;transition:none!important}' + (HISTOIRE ? '' : '#qt-announce,.announce{display:none!important}') });
  await p.evaluate(label => { const t = document.createElement('div'); t.textContent = label; t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;background:#121019;color:#d7f24a;font:700 13px Arial;padding:8px 14px;border-radius:99px;white-space:nowrap'; document.body.appendChild(t); }, HISTOIRE ? 'quentools.fr' : 'Exemple fictif · ' + CFG.label);
  const max = Math.min(await p.evaluate(() => document.documentElement.scrollHeight - innerHeight), HISTOIRE ? 5200 : 3600), N = SCROLL_S * FPS;
  // Préparation : tout est visible (pas d'apparition au défilement) et les images différées sont chargées
  await p.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in')));
  for (let y = 0; y <= max; y += 700) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(120); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  fs.mkdirSync(path.join(TMP, 's'));
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), sm = t * t * (3 - 2 * t), e = .7 * t + .3 * sm;   // vitesse presque constante, départ et arrivée adoucis
    await p.evaluate(y => new Promise(r => { window.scrollTo(0, y); requestAnimationFrame(() => requestAnimationFrame(r)); }), Math.round(max * e));
    await p.screenshot({ path: path.join(TMP, 's', String(i).padStart(4, '0') + '.png') });
  }
  await b.close();

  // Assemblage : chaque scène devient un clip, puis fondus enchaînés
  const clip = (name, args, dur) => { const f = path.join(TMP, name + '.mp4'); execFileSync(FF, ['-y', ...args, '-t', String(dur), '-r', String(FPS), '-vf', `scale=${W}:${H},format=yuv420p`, '-c:v', 'libx264', '-crf', '20', f], { stdio: 'ignore' }); return [f, dur]; };
  const still_ = (n, d) => clip(n, ['-loop', '1', '-framerate', String(FPS), '-i', path.join(TMP, n + '.png')], d);
  const clips = [still_('a', 3.2), still_('b1', 1.3), still_('b2', 1.7), clip('s', ['-framerate', String(FPS), '-i', path.join(TMP, 's', '%04d.png')], SCROLL_S), still_('d', 4)];
  let inputs = [], filter = '', off = 0, last = '[0:v]';
  clips.forEach(([f]) => inputs.push('-i', f));
  for (let i = 1; i < clips.length; i++) {
    off += clips[i - 1][1] - FADE; const out = i === clips.length - 1 ? '[v]' : `[x${i}]`;
    filter += `${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${off.toFixed(2)}${out};`; last = out;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const dest = path.join(OUT, HISTOIRE ? 'quentools-histoire.mp4' : `quentools-avant-apres-${SLUG}.mp4`);
  execFileSync(FF, ['-y', ...inputs, '-filter_complex', filter.slice(0, -1), '-map', '[v]', '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dest], { stdio: 'ignore' });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('Vidéo créée :', dest);
})();
