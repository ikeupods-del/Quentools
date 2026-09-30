'use strict';
/* Carrousels « erreurs à ne pas faire » tirés des guides de l'app (wouf/guides.js) : mêmes textes, mêmes réserves (contenu indicatif).
   Sortie : images/erreurs-<id>-XX.png (Instagram 1080×1350) et -tt- (TikTok 1080×1920), JPEG dans images-jpg/, légendes dans erreurs.json.
   node marketing/wouf/erreurs.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const W = path.resolve(__dirname, '../../wouf'), OUT = path.join(__dirname, 'images'), JPG = path.join(__dirname, 'images-jpg'), LOGO = fs.readFileSync(path.join(W, 'icons/icon.svg'), 'utf8');
const ctx = { ROUTES: {}, ACT: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(W, 'guides.js'), 'utf8'), ctx);
const GUIDES = vm.runInContext('GUIDES', ctx), g = id => GUIDES.find(x => x.id === id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SETS = [
  { id: 'chat-1', g: 'chat-erreurs', from: 0, to: 5, e: '🐱', hook: '5 erreurs que vous faites peut-être avec votre chat', part: 'Partie 1/2', tags: '#chat #chaton #santeanimale #conseilschat' },
  { id: 'chat-2', g: 'chat-erreurs', from: 5, to: 10, e: '🐱', hook: '5 autres erreurs qui abîment la santé de votre chat', part: 'Partie 2/2', tags: '#chat #chaton #santeanimale #conseilschat' },
  { id: 'chien-1', g: 'chien-erreurs', from: 0, to: 5, e: '🐶', hook: '5 erreurs que vous faites peut-être avec votre chien', part: 'Partie 1/2', tags: '#chien #chiot #santeanimale #conseilschien' },
  { id: 'chien-2', g: 'chien-erreurs', from: 5, to: 10, e: '🐶', hook: '5 autres erreurs qui abîment la santé de votre chien', part: 'Partie 2/2', tags: '#chien #chiot #santeanimale #conseilschien' },
  { id: 'urgences', g: 'urgences', from: 0, to: 8, e: '🚨', hook: '8 gestes à ne JAMAIS faire en cas d’urgence', part: '', tags: '#urgenceveterinaire #chien #chat #premiersecours #santeanimale' },
  { id: 'arrivee-1', g: 'arrivee', from: 0, to: 6, e: '🍼', hook: 'Un chiot ou un chaton arrive ? 6 points d’attention', part: 'Partie 1/2', tags: '#chiot #chaton #nouveauchiot #nouveauchaton #santeanimale' },
  { id: 'arrivee-2', g: 'arrivee', from: 6, to: 12, e: '🍼', hook: 'Chiot ou chaton : 6 autres points d’attention', part: 'Partie 2/2', tags: '#chiot #chaton #nouveauchiot #nouveauchaton #santeanimale' }
];
const css = h => `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}.cv{width:1080px;height:${h}px;display:flex;flex-direction:column;padding:${h > 1500 ? '230px 150px 520px 80px' : '84px 80px'};position:relative}
.logo{display:flex;align-items:center;gap:16px;font-weight:900;font-size:44px}.logo svg{width:64px;height:64px;border-radius:16px}.tag{font-size:32px;font-weight:800;letter-spacing:3px;text-transform:uppercase;opacity:.8;margin-top:44px}
h1{font-size:96px;line-height:1.04;margin:28px 0 0;font-weight:900;letter-spacing:-2px}h2{font-size:80px;line-height:1.08;margin:18px 0 0;font-weight:900;letter-spacing:-1px}.sub{font-size:44px;line-height:1.3;margin-top:24px;font-weight:650}
.n{font-size:150px;line-height:1;font-weight:900;margin-top:20px}p{font-size:54px;line-height:1.3;margin:34px 0 0;font-weight:600}.foot{position:absolute;left:80px;right:80px;bottom:${h > 1500 ? 470 : 60}px;font-size:30px;font-weight:700;opacity:.85;display:flex;justify-content:space-between}`;
const logo = c => `<div class="logo" style="color:${c}">${LOGO}<span>Wouf</span></div>`, G = 'linear-gradient(160deg,#ffab5c,#ee6a1c)';
(async () => {
  fs.mkdirSync(JPG, { recursive: true });
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), caps = {};
  for (const s of SETS) {
    const gd = g(s.g), items = gd.items.slice(s.from, s.to), total = items.length + 2, sl = [];
    sl.push(`<div class="cv" style="background:${G};color:#fff">${logo('#fff')}<div class="tag">${s.e} ${s.part || 'À savoir'}</div><h1 style="margin-top:60px">${esc(s.hook)}</h1><div class="sub">Glissez pour les voir 👉</div><div class="foot"><span>À enregistrer 📌</span><span>1/${total}</span></div></div>`);
    items.forEach((it, i) => sl.push(`<div class="cv" style="background:${i % 2 ? '#fff7ee' : '#f8f4ef'};color:#231f1b">${logo('#ee6a1c')}<div class="tag" style="color:#ee6a1c">${s.id === 'urgences' ? 'Geste' : s.id.startsWith('arrivee') ? 'Point' : 'Erreur'} ${s.from + i + 1}</div><h2>${esc(it[0])}</h2><p>${esc(it[1])}</p><div class="foot"><span>🔗 woufapp.fr</span><span>${i + 2}/${total}</span></div></div>`));
    sl.push(`<div class="cv" style="background:${G};color:#fff">${logo('#fff')}<h1 style="margin-top:70px;font-size:88px">Le guide complet est dans Wouf 🐾</h1><div class="sub">Carnet de santé, rappels, urgences et guides pour votre chien et votre chat. Gratuit pour commencer. Contenu indicatif : demandez toujours conseil à votre vétérinaire.</div><div class="foot"><span>🔗 woufapp.fr</span><span>${total}/${total}</span></div></div>`);
    for (const [pre, h] of [['erreurs-' + s.id + '-', 1350], ['erreurs-' + s.id + '-tt-', 1920]]) {
      const p = await b.newPage({ viewport: { width: 1080, height: h } });
      for (let i = 0; i < sl.length; i++) { await p.setContent(`<style>${css(h)}</style>${sl[i]}`); const n = pre + String(i + 1).padStart(2, '0'); await p.screenshot({ path: path.join(OUT, n + '.png') }); await p.screenshot({ path: path.join(JPG, n + '.jpg'), type: 'jpeg', quality: 88 }); }
      await p.close();
    }
    caps[s.id] = { hook: s.hook, slides: sl.length,
      caption: `${s.hook} ${s.e} (glissez 👉)\n\n${items.map((it, i) => (s.from + i + 1) + '. ' + it[0]).join('\n')}\n\n📌 Enregistrez ce post et envoyez-le à un propriétaire d’animal.\nContenu indicatif : votre vétérinaire reste la référence.\n\n#woufapp ${s.tags}`,
      tiktok: `${s.hook} ${s.e} Lequel vous faisiez ? 👇 Lien en bio 💛\n#pourtoi #fyp #woufapp ${s.tags}` };
    console.log('  ✓', s.id, sl.length + ' images');
  }
  fs.writeFileSync(path.join(__dirname, 'erreurs.json'), JSON.stringify(caps, null, 1)); await b.close();
})();
