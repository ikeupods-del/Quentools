'use strict';
/* Motion design QuenTools (logo animé, 9 s) : page HTML animée en CSS, rendue image par image (horloge maîtrisée
   via l'API Web Animations), puis assemblée en MP4 par ffmpeg. Aucune image ni police externe : assets/ du site.
   node marketing/quentools/motion.js [vertical|horizontal|carre]   → marketing/quentools/quentools-<format>.mp4 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const FF = process.env.FFMPEG || (() => { try { return require('ffmpeg-static'); } catch (e) { return 'ffmpeg'; } })();
const A = path.resolve(__dirname, '../../assets'), b64 = f => fs.readFileSync(path.join(A, f)).toString('base64');
const FORMATS = { vertical: [1080, 1920], horizontal: [1920, 1080], carre: [1080, 1080] };
const FPS = 30, DUR = 9;
const page = (w, h) => {
  const v = h > w, s = Math.min(w, h) / 1080;   // échelle
  return `<style>
@font-face{font-family:B;src:url(data:font/woff2;base64,${b64('fonts/bricolage.woff2')}) format("woff2");font-weight:200 800}
@font-face{font-family:I;src:url(data:font/woff2;base64,${b64('fonts/inter.woff2')}) format("woff2");font-weight:100 900}
*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px;overflow:hidden;background:#0d0c12;color:#f4f2fb;font-family:I,sans-serif;position:relative}
.grid{position:absolute;inset:-2px;background-image:linear-gradient(#26232f 1px,transparent 1px),linear-gradient(90deg,#26232f 1px,transparent 1px);background-size:${72*s}px ${72*s}px;mask-image:radial-gradient(ellipse 60% 55% at 50% 45%,#000 10%,transparent 75%);animation:fade 1.2s ease-out both}
.glow{position:absolute;width:${900*s}px;height:${900*s}px;left:50%;top:${v?38:45}%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(91,61,245,.55),transparent 62%);filter:blur(${40*s}px);animation:glow 9s ease-in-out both}
@keyframes glow{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}20%{opacity:1}100%{opacity:.9;transform:translate(-50%,-50%) scale(1.15)}}
@keyframes fade{from{opacity:0}}
.logo{position:absolute;left:50%;top:${v?30:36}%;width:${260*s}px;height:${260*s}px;transform:translate(-50%,-50%)}
.logo .sq{animation:pop .9s cubic-bezier(.34,1.56,.64,1) .2s both;transform-origin:50% 50%;transform-box:fill-box}
@keyframes pop{from{transform:scale(0) rotate(-20deg)}}
.logo .ring{stroke-dasharray:90;stroke-dashoffset:90;animation:draw .8s cubic-bezier(.65,0,.35,1) .8s forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.logo .tail{stroke-dasharray:18;stroke-dashoffset:18;animation:draw .45s cubic-bezier(.65,0,.35,1) 1.45s forwards}
.logo-move{position:absolute;inset:0;animation:up 1s cubic-bezier(.65,0,.35,1) 5.6s forwards}
@keyframes up{to{transform:translateY(${v?-150*s:-175*s}px) scale(.62)}}
.name{position:absolute;left:0;right:0;top:${v?41:54}%;text-align:center;font:800 ${150*s}px/1 B;letter-spacing:-.05em}
.name span{display:inline-block;animation:rise .7s cubic-bezier(.16,1,.3,1) both}
@keyframes rise{from{transform:translateY(60%);opacity:0;filter:blur(8px)}}
.name-out{position:absolute;inset:0;animation:out .5s ease-in 3.4s forwards}
@keyframes out{to{opacity:0;transform:translateY(-${40*s}px)}}
.tag{position:absolute;left:${v?70*s:0}px;right:${v?70*s:0}px;top:${v?40:53}%;text-align:center;font:700 ${(v?118:112)*s}px/1.02 B;letter-spacing:-.045em;opacity:0;animation:fadein .01s linear 3.9s forwards,out .5s ease-in 5.4s forwards}
@keyframes fadein{to{opacity:1}}
.tag .l{display:block;padding-bottom:.06em}.tag .l>span{display:inline-block;animation:rise .8s cubic-bezier(.16,1,.3,1) both}
.tag em{font-style:normal;position:relative;white-space:nowrap}
.tag em{padding:0 .12em;margin:0 -.12em;border-radius:.14em;background:linear-gradient(#d7f24a,#d7f24a) 0 50%/0% 100% no-repeat;animation:hl .7s cubic-bezier(.16,1,.3,1) 4.6s forwards,ink .35s linear 4.7s both}
@keyframes hl{to{background-size:100% 100%}}
@keyframes ink{from{color:#f4f2fb}to{color:#0d0c12}}
.phones{position:absolute;left:50%;top:${v?47:43}%;width:${(v?820:980)*s}px;height:${(v?760:560)*s}px;transform:translateX(-50%)}
.ph{position:absolute;width:${(v?270:190)*s}px;aspect-ratio:9/17.5;border-radius:${34*s}px;border:${7*s}px solid #f4f2fb;overflow:hidden;background:#fff;box-shadow:0 ${40*s}px ${90*s}px -${20*s}px rgba(0,0,0,.8);opacity:0}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top}
.ph:nth-child(1){left:${v?30*s:120*s}px;top:${60*s}px;animation:ph1 1s cubic-bezier(.16,1,.3,1) 6s forwards}
.ph:nth-child(2){left:50%;margin-left:-${(v?135:95)*s}px;top:0;z-index:2;animation:ph2 1s cubic-bezier(.16,1,.3,1) 6.15s forwards}
.ph:nth-child(3){right:${v?30*s:120*s}px;top:${70*s}px;animation:ph3 1s cubic-bezier(.16,1,.3,1) 6.3s forwards}
@keyframes ph1{from{opacity:0;transform:translateY(${220*s}px) rotate(0)}to{opacity:1;transform:rotate(-9deg)}}
@keyframes ph2{from{opacity:0;transform:translateY(${260*s}px)}to{opacity:1;transform:none}}
@keyframes ph3{from{opacity:0;transform:translateY(${220*s}px) rotate(0)}to{opacity:1;transform:rotate(9deg)}}
.chips{position:absolute;left:0;right:0;top:${v?40:35}%;display:flex;justify-content:center;gap:${18*s}px;flex-wrap:wrap;padding:0 ${60*s}px}
.chip{font:600 ${34*s}px/1 I;padding:${16*s}px ${26*s}px;border-radius:999px;background:#1b1826;border:1px solid #34303f;opacity:0;animation:chip .6s cubic-bezier(.16,1,.3,1) both}
.chip.lime{background:#d7f24a;color:#0d0c12;border-color:#d7f24a}
@keyframes chip{from{opacity:0;transform:translateY(${30*s}px) scale(.9)}to{opacity:1;transform:none}}
.end{position:absolute;left:0;right:0;bottom:${v?7:3}%;text-align:center;opacity:0;animation:chip .7s cubic-bezier(.16,1,.3,1) 7.6s forwards}
.end b{display:block;font:800 ${64*s}px/1 B;letter-spacing:-.03em}.end span{display:block;margin-top:${14*s}px;font:500 ${32*s}px/1 I;color:#9a95ad}
</style>
<div class="grid"></div><div class="glow"></div>
<div class="logo-move"><svg class="logo" viewBox="0 0 64 64"><rect class="sq" width="64" height="64" rx="18" fill="#5b3df5"/><circle class="ring" cx="30" cy="30" r="14" fill="none" stroke="#fff" stroke-width="7" pathLength="90" transform="rotate(-90 30 30)"/><path class="tail" d="M37 37l12 12" stroke="#d7f24a" stroke-width="8" stroke-linecap="round" pathLength="18"/></svg></div>
<div class="name-out"><div class="name">${[...'QuenTools'].map((c, i) => `<span style="animation-delay:${1.7 + i * .05}s">${c}</span>`).join('')}</div></div>
<div class="tag"><span class="l"><span style="animation-delay:3.9s">Des outils simples</span></span><span class="l"><span style="animation-delay:4.05s">qui font</span></span><span class="l"><span style="animation-delay:4.2s"><em>gagner du temps</em>.</span></span></div>
<div class="chips">${[['Outils gratuits', 5.9], ['Sur mesure', 6.05], ['Cartes cadeaux', 6.2, 1]].map(([t, d, l]) => `<span class="chip${l ? ' lime' : ''}" style="animation-delay:${d}s">${t}</span>`).join('')}</div>
<div class="phones">${['patrimoine', 'infikit', 'gourmet'].map(n => `<div class="ph"><img src="data:image/jpeg;base64,${b64('ecran-' + n + '.jpg')}"></div>`).join('')}</div>
<div class="end"><b>QuenTools</b><span>@quentools · outils gratuits et sur mesure</span></div>`;
};
(async () => {
  const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FORMATS);
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const f of which) {
    const [w, h] = FORMATS[f], tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qtm-'));
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(page(w, h)); await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
    for (let i = 0; i < FPS * DUR; i++) {
      await p.evaluate(t => document.getAnimations().forEach(a => { a.currentTime = t; }), i * 1000 / FPS);
      await p.screenshot({ path: path.join(tmp, String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 92 });
    }
    await p.close();
    const out = path.join(__dirname, `quentools-${f}.mp4`);
    execFileSync(FF, ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, '%04d.jpg'), '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-movflags', '+faststart', out]);
    fs.rmSync(tmp, { recursive: true, force: true }); console.log('  ✓', path.relative(process.cwd(), out));
  }
  await b.close();
})();
