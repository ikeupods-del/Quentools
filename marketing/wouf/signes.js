'use strict';
/* Séries « signes que ton animal est heureux » : contenu positif et relatable (formats qui plaisent aux propriétaires), carrousels de 9 images (couverture, 7 signes, appel final).
   Formats : Instagram 1080×1350 (signes-<id>-XX.png) et TikTok photo 1080×1920 (signes-<id>-tt-XX.png). Contenu indicatif, comportement général (chaque animal est différent).
   node marketing/wouf/signes.js */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const LOGO = fs.readFileSync(path.resolve(__dirname, '../../wouf/icons/icon.svg'), 'utf8'), OUT = path.join(__dirname, 'images');
const SERIES = {
  chat: { animal: 'chat', e: '🐱', title: '7 signes que ton chat est heureux chez toi', sub: 'Tu en reconnais combien ? 👇', tone: ['#ffab5c', '#ee6a1c'], items: [
    ['🐈', 'La queue bien droite', 'Quand il vient te voir la queue dressée, c’est sa façon de te dire bonjour. Il est content de te retrouver.'],
    ['😌', 'Le clignement lent des yeux', 'Des yeux à moitié fermés, qui se ferment doucement : c’est un « je t’aime » de chat. Cligne lentement en retour !'],
    ['🍞', 'Il pétrit avec ses pattes', 'Les « biscuits », c’est un geste de bébé chat. Quand il le fait sur toi, il se sent en sécurité et heureux.'],
    ['🫶', 'Il frotte sa tête contre toi', 'Il te marque avec son odeur : pour lui, tu fais partie de la famille.'],
    ['😴', 'Il dort près de toi, à découvert', 'Un chat qui s’endort tranquillement à côté de toi se sent en confiance et protégé.'],
    ['🐾', 'Il te suit et t’accueille', 'Il t’attend à la porte, te suit de pièce en pièce : tu es son repère préféré.'],
    ['🍽️', 'Il mange, joue et se toilette bien', 'Un bon appétit, l’envie de jouer et une toilette régulière : c’est le signe d’un chat bien dans sa vie.']
  ], note: 'Un changement qui dure (appétit, cachette, litière) ? Consulte ton vétérinaire.', cta: 'Ton chat en fait combien ?' },
  chien: { animal: 'chien', e: '🐶', title: '7 signes que ton chien est heureux', sub: 'Tu en reconnais combien ? 👇', tone: ['#5fbfff', '#2a7de1'], items: [
    ['🐕', 'Il remue tout le corps', 'Pas seulement la queue : quand tout l’arrière-train se trémousse, c’est de la vraie joie.'],
    ['👂', 'Oreilles et visage détendus', 'Des oreilles souples, une gueule entrouverte, un regard doux : il est serein.'],
    ['🙇', 'Il fait la révérence pour jouer', 'Les pattes avant baissées, l’arrière en l’air : c’est l’invitation à jouer.'],
    ['🎾', 'Il t’apporte ses jouets', 'Il partage ce qu’il a de plus précieux avec toi. C’est un cadeau.'],
    ['😴', 'Il dort sur le dos ou en boule contre toi', 'S’endormir à découvert, c’est se sentir totalement en sécurité.'],
    ['👀', 'Il te regarde avec des yeux doux', 'Un contact visuel calme et qui cherche ton regard : il t’adore.'],
    ['🚪', 'Il te fait la fête à ton retour', 'Sauts, gémissements de joie, corps tout mou : tu es le meilleur moment de sa journée.']
  ], note: 'Un changement qui dure (appétit, énergie, comportement) ? Consulte ton vétérinaire.', cta: 'Ton chien en fait combien ?' }
};
const css = h => `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}.cv{width:1080px;height:${h}px;display:flex;flex-direction:column;padding:${h > 1500 ? '230px 150px 520px 80px' : '84px 80px'};position:relative;overflow:hidden}
.logo{display:flex;align-items:center;gap:16px;font-weight:900;font-size:44px}.logo svg{width:64px;height:64px;border-radius:16px}.tag{font-size:32px;font-weight:800;letter-spacing:3px;text-transform:uppercase;opacity:.8;margin-top:44px}
h1{font-size:104px;line-height:1.03;margin:30px 0 0;font-weight:900;letter-spacing:-2px}.big{font-size:230px;line-height:1;margin-top:26px}.sub{font-size:46px;line-height:1.28;margin-top:26px;font-weight:650}
.foot{position:absolute;left:80px;right:80px;bottom:${h > 1500 ? 470 : 60}px;font-size:30px;font-weight:700;opacity:.85;display:flex;justify-content:space-between}`;
const logo = c => `<div class="logo" style="color:${c}">${LOGO}<span>Wouf</span></div>`;
function slides(S) {
  const g = `linear-gradient(160deg,${S.tone[0]},${S.tone[1]})`, out = [];
  out.push(`<div class="cv" style="background:${g};color:#fff">${logo('#fff')}<div class="big" style="margin-top:60px">${S.e}</div><h1>${S.title}</h1><div class="sub">${S.sub}</div><div class="foot"><span>À enregistrer 📌</span><span>1/9</span></div></div>`);
  S.items.forEach(([e, t, d], i) => out.push(`<div class="cv" style="background:${i % 2 ? '#fff7ee' : '#f8f4ef'};color:#231f1b">${logo(S.tone[1])}<div class="tag" style="color:${S.tone[1]}">Signe ${i + 1} sur 7</div><div class="big">${e}</div><h1 style="font-size:86px">${t}</h1><div class="sub" style="font-size:44px">${d}</div><div class="foot"><span>🔗 woufapp.fr</span><span>${i + 2}/9</span></div></div>`));
  out.push(`<div class="cv" style="background:${g};color:#fff">${logo('#fff')}<h1 style="margin-top:70px">${S.cta} 🏆</h1><div class="sub">Dis-le en commentaire 👇 et envoie ce post à quelqu’un qui adore son ${S.animal}.</div><div class="sub" style="font-size:36px;opacity:.92">${S.note}</div><div class="foot"><span>🔗 Son carnet de santé : woufapp.fr</span><span>9/9</span></div></div>`);
  return out;
}
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const [id, S] of Object.entries(SERIES)) {
    const sl = slides(S);
    for (const [pre, h] of [['signes-' + id + '-', 1350], ['signes-' + id + '-tt-', 1920]]) {
      const p = await b.newPage({ viewport: { width: 1080, height: h } });
      for (let i = 0; i < sl.length; i++) { await p.setContent(`<style>${css(h)}</style>${sl[i]}`); await p.screenshot({ path: path.join(OUT, pre + String(i + 1).padStart(2, '0') + '.png') }); }
      await p.close();
    }
  }
  await b.close(); console.log('✓ 2 séries × 9 images × 2 formats');
})();
