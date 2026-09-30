'use strict';
/* Carrousels « Ton chat … ? » (problème → solution) tirés des leçons de chat de l'app (étapes, erreurs à éviter, mention de sécurité). 
   Formats : Instagram 1080×1350 (probleme-<id>-XX.png) et TikTok photo 1080×1920 (probleme-<id>-tt-XX.png) ; légendes dans problemes.json.
   node marketing/wouf/problemes.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const W = path.resolve(__dirname, '../../wouf'), OUT = path.join(__dirname, 'images'), LOGO = fs.readFileSync(path.join(W, 'icons/icon.svg'), 'utf8');
const ctx = { console, localStorage: { getItem() { return null }, setItem() {} }, document: {} }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['config', 'data', 'species', 'core', 'health', 'screens', 'sos', 'nutrition', 'croquettes', 'lessons', 'lessons2', 'lessons3', 'lessons4', 'lessons5', 'lessons6', 'lessons7', 'lessons_cat', 'lessons_cat2', 'lessons_cat3', 'lessons_cat4', 'lessons_cat5', 'lessons_plans']) { try { vm.runInContext(fs.readFileSync(path.join(W, f + '.js'), 'utf8'), ctx, { filename: f }); } catch (e) { /* fichier sans effet ici */ } }
const LESSONS = vm.runInContext('LESSONS', ctx).filter(l => l.sp === 'cat');
const HOOKS = { 'c-nuit': 'Votre chat miaule la nuit ?', 'c-pipi': 'Votre chat fait pipi hors de sa litière ?', 'c-griffoir': 'Votre chat détruit vos meubles ?', 'c-peur': 'Votre chat a peur de tout ?', 'c-mord': 'Votre chat vous mord en jouant ?',
  'c-eau': 'Votre chat ne boit presque pas ?', 'c-poids': 'Votre chat est en surpoids ?', 'c-brossage': 'Votre chat a des boules de poils ?', 'c-transport': 'Votre chat panique chez le véto ?', 'c-plans': 'Votre chat monte sur la table ?', 'c-solitude': 'Votre chat reste seul toute la journée ?', 'c-comprimes': 'Impossible de donner un comprimé à votre chat ?' };
const clean = t => String(t).replace(/\s+/g, ' ').trim(), first = (t, n) => { t = clean(t); const s = t.match(/^.*?[.!?](\s|$)/); let r = s ? s[0].trim() : t; if (r.length > n) r = t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; return r; };
const css = h => `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}.cv{width:1080px;height:${h}px;display:flex;flex-direction:column;padding:${h > 1500 ? '230px 150px 520px 80px' : '84px 80px'};position:relative;overflow:hidden}
.logo{display:flex;align-items:center;gap:16px;font-weight:900;font-size:44px}.logo svg{width:64px;height:64px;border-radius:16px}.tag{font-size:32px;font-weight:800;letter-spacing:3px;text-transform:uppercase;opacity:.8;margin-top:44px}
h1{font-size:100px;line-height:1.03;margin:28px 0 0;font-weight:900;letter-spacing:-2px}.sub{font-size:44px;line-height:1.3;margin-top:24px;font-weight:650}.n{font-size:150px;line-height:1;font-weight:900;margin-top:20px}
li{margin-bottom:22px}ul{padding-left:1.1em;margin:24px 0 0;font-size:46px;line-height:1.28;font-weight:650}.foot{position:absolute;left:80px;right:80px;bottom:${h > 1500 ? 470 : 60}px;font-size:30px;font-weight:700;opacity:.85;display:flex;justify-content:space-between}`;
const logo = c => `<div class="logo" style="color:${c}">${LOGO}<span>Wouf</span></div>`, G = 'linear-gradient(160deg,#ffab5c,#ee6a1c)';
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), caps = {};
  for (const [id, hook] of Object.entries(HOOKS)) {
    const l = LESSONS.find(x => x.id === id); if (!l) continue;
    const steps = l.steps.filter(s => !/^Exclure la santé/i.test(s.t)).slice(0, 4), sl = [];
    const total = 1 + steps.length + 2;
    sl.push(`<div class="cv" style="background:${G};color:#fff">${logo('#fff')}<div class="tag">Chat 🐱</div><h1 style="font-size:112px;margin-top:70px">${hook}</h1><div class="sub">Voilà quoi faire 👇</div><div class="foot"><span>À enregistrer 📌</span><span>1/${total}</span></div></div>`);
    steps.forEach((s, i) => sl.push(`<div class="cv" style="background:${i % 2 ? '#fff7ee' : '#f8f4ef'};color:#231f1b">${logo('#ee6a1c')}<div class="tag" style="color:#ee6a1c">Astuce ${i + 1}</div><div class="n" style="color:#ee6a1c">${i + 1}</div><h1 style="font-size:78px">${clean(s.t)}</h1><div class="sub" style="font-size:42px">${first(s.b, 190)}</div><div class="foot"><span>🔗 woufapp.fr</span><span>${i + 2}/${total}</span></div></div>`));
    const mist = (l.mistakes || []).slice(0, 3).map(clean);
    sl.push(`<div class="cv" style="background:#231f1b;color:#fff">${logo('#fff')}<div class="tag">À éviter ⚠️</div><ul>${mist.map(m => `<li>${m}</li>`).join('')}</ul><div class="foot"><span>🔗 woufapp.fr</span><span>${steps.length + 2}/${total}</span></div></div>`);
    sl.push(`<div class="cv" style="background:${G};color:#fff">${logo('#fff')}<h1 style="margin-top:70px;font-size:92px">Le plan complet est dans Wouf 🐾</h1><div class="sub">Pas à pas, avec un petit quiz : « ${clean(l.title)} ». Gratuit pour commencer.</div><div class="sub" style="font-size:34px;opacity:.92">⚠️ ${clean(l.safety || 'Un changement qui dure ? Consultez votre vétérinaire.')} Wouf ne remplace jamais un vétérinaire.</div><div class="foot"><span>🔗 woufapp.fr</span><span>${total}/${total}</span></div></div>`);
    for (const [pre, h] of [['probleme-' + id + '-', 1350], ['probleme-' + id + '-tt-', 1920]]) {
      const p = await b.newPage({ viewport: { width: 1080, height: h } });
      for (let i = 0; i < sl.length; i++) { await p.setContent(`<style>${css(h)}</style>${sl[i]}`); await p.screenshot({ path: path.join(OUT, pre + String(i + 1).padStart(2, '0') + '.png') }); }
      await p.close();
    }
    caps[id] = { hook, slides: sl.length, caption: `${hook} 🐱 Voilà quoi faire (glissez 👉)\n\n${steps.map((s, i) => (i + 1) + '. ' + clean(s.t)).join('\n')}\n\n⚠️ À éviter : ${mist.slice(0, 2).join(' ')}\n\n📌 Enregistrez ce post. Le plan complet, pas à pas, est dans Wouf (lien dans la bio).\n\n${clean(l.safety || 'Un changement qui dure ? Consultez votre vétérinaire.')} Wouf ne remplace jamais un vétérinaire.\n\n#woufapp #chat #chaton #comportementfelin #santeanimale` };
    console.log('  ✓', id, sl.length + ' images');
  }
  fs.writeFileSync(path.join(__dirname, 'problemes.json'), JSON.stringify(caps, null, 1)); await b.close();
})();
