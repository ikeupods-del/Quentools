'use strict';
/* Post « héros » : quiz en carrousel « dangereux ou OK pour ton chien ? » (10 images), version Instagram 1080×1350 et TikTok 1080×1920.
   Contenu tiré des données de l'app (raisins, pâte à pain crue, avocat) + deux aliments courants sans danger en petite quantité. Aucune statistique inventée.
   node marketing/wouf/hero-quiz.js → images/hero-quiz-XX.png et images/hero-quiz-tt-XX.png */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const LOGO = fs.readFileSync(path.resolve(__dirname, '../../wouf/icons/icon.svg'), 'utf8');
const Q = [
  { e: '🍇', name: 'Raisins', v: 'no', label: 'DANGER', why: 'Peuvent provoquer une insuffisance rénale aiguë, même à petite dose. Les raisins secs aussi.' },
  { e: '🥕', name: 'Carotte crue', v: 'ok', label: 'OK', why: 'En petits morceaux, c’est une friandise croquante et légère. Comme tout : avec modération.' },
  { e: '🍞', name: 'Pâte à pain crue', v: 'no', label: 'DANGER', why: 'Elle gonfle dans l’estomac (risque de torsion) et fermente en produisant de l’alcool.' },
  { e: '🥑', name: 'Avocat', v: 'mid', label: 'À ÉVITER', why: 'La persine (surtout dans la peau et le noyau) irrite le tube digestif, et le noyau peut obstruer.' }
];
const V = !!process.env.VIDEO;   // version vidéo : pas de « glisse », compte à rebours à la place
const COL = { no: ['#c62f2f', '⛔'], ok: ['#1f8f4e', '✅'], mid: ['#d98a00', '⚠️'] };
const css = h => `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}.cv{width:1080px;height:${h}px;display:flex;flex-direction:column;padding:${h > 1500 ? '230px 150px 520px 80px' : '84px 80px'};position:relative;overflow:hidden}
.logo{display:flex;align-items:center;gap:16px;font-weight:900;font-size:44px}.logo svg{width:64px;height:64px;border-radius:16px}
.tag{font-size:32px;font-weight:800;letter-spacing:3px;text-transform:uppercase;opacity:.8;margin-top:50px}h1{font-size:104px;line-height:1.02;margin:30px 0 0;font-weight:900;letter-spacing:-2px}
.big{font-size:250px;line-height:1;margin-top:30px}.sub{font-size:44px;line-height:1.28;margin-top:28px;font-weight:650}.foot{position:absolute;left:80px;right:80px;bottom:${h > 1500 ? 470 : 60}px;font-size:30px;font-weight:700;opacity:.85;display:flex;justify-content:space-between}
.pill{display:inline-block;font-weight:900;font-size:64px;padding:18px 44px;border-radius:99px;margin-top:30px;align-self:flex-start;color:#fff}`;
const logo = c => `<div class="logo" style="color:${c}">${LOGO}<span>Wouf</span></div>`;
const slides = [];
slides.push(`<div class="cv" style="background:linear-gradient(160deg,#ffab5c,#ee6a1c);color:#fff">${logo('#fff')}<div class="tag">Quiz 🐶</div><h1>Dangereux ou OK pour ton chien ?</h1><div class="sub">${V ? 'Réponds dans ta tête, la réponse arrive juste après ⏱️' : 'Réponds dans ta tête avant de glisser 👉'}</div><div class="foot"><span>4 aliments</span><span>📌 À garder</span></div></div>`);
Q.forEach((q, i) => {
  slides.push(`<div class="cv" style="background:#f8f4ef;color:#231f1b">${logo('#ee6a1c')}<div class="tag" style="color:#ee6a1c">Question ${i + 1}/4</div><div class="big">${q.e}</div><h1 style="font-size:120px">${q.name} ?</h1><div class="sub">Dangereux, OK, ou à éviter ? ${V ? 'Réponse dans quelques secondes ⏱️' : 'Glisse pour la réponse 👉'}</div><div class="foot"><span>🔗 woufapp.fr</span><span>${i + 1}/4</span></div></div>`);
  const [c, ic] = COL[q.v];
  slides.push(`<div class="cv" style="background:#231f1b;color:#fff">${logo('#fff')}<div class="tag">Réponse ${i + 1}/4</div><div class="big" style="font-size:190px">${q.e}</div><div class="pill" style="background:${c}">${ic} ${q.label}</div><div class="sub">${q.why}</div><div class="foot"><span>🔗 woufapp.fr</span><span>${i + 1}/4</span></div></div>`);
});
slides.push(`<div class="cv" style="background:linear-gradient(160deg,#ffab5c,#ee6a1c);color:#fff">${logo('#fff')}<h1 style="margin-top:80px">Tu as tout bon ? 🏆</h1><div class="sub">Envoie ce quiz à quelqu’un qui a un chien, et dis-nous ton score en commentaire 👇</div><div class="sub" style="font-size:36px;opacity:.9">⚠️ Information indicative : Wouf ne remplace jamais un vétérinaire. Il en a avalé ? Appelle-le tout de suite.</div><div class="foot"><span>🔗 Tous les aliments toxiques : woufapp.fr</span></div></div>`);
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), out = path.join(__dirname, 'images');
  for (const [pre, h] of (V ? [['hero-quiz-vid-', 1920]] : [['hero-quiz-', 1350], ['hero-quiz-tt-', 1920]])) {
    const p = await b.newPage({ viewport: { width: 1080, height: h } });
    for (let i = 0; i < slides.length; i++) { await p.setContent(`<style>${css(h)}</style>${slides[i]}`); await p.screenshot({ path: path.join(out, pre + String(i + 1).padStart(2, '0') + '.png') }); }
    await p.close();
  }
  await b.close(); console.log('✓ ' + slides.length + ' images × 2 formats');
})();
