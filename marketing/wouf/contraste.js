'use strict';
/* Carrousels « Subissent ça… / Choisissez ça… » (format très visuel : deux moitiés, gros texte, logo Wouf en haut à gauche).
   Contenu tiré des guides de l'app (contenu indicatif). Visuels : emoji géants sur fond dégradé ; si vous déposez vos propres photos
   dans marketing/wouf/photos/<serie>-<n>-a.jpg (« subissent ») et <serie>-<n>-b.jpg (« choisissez »), elles remplacent l’emoji (n = 1, 2, 3) ; la couverture reprend la photo indiquée par `cover`. Photos libres de droits : workflow « Photos libres » (photos-libres.js), crédits dans photos/credits.json.
   Sortie : images/contraste-<serie>-XX.png (Instagram 1080×1350), -tt- (TikTok 1080×1920), JPEG dans images-jpg/, légendes dans contraste.json.
   node marketing/wouf/contraste.js */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require(path.resolve(__dirname, '../../wouf/node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const OUT = path.join(__dirname, 'images'), JPG = path.join(__dirname, 'images-jpg'), PH = path.join(__dirname, 'photos'), LOGO = fs.readFileSync(path.resolve(__dirname, '../../wouf/icons/icon.svg'), 'utf8');
const SETS = [
  { id: 'chiens', e: '🐶', cover: [3, 'a'], hook: 'DANS UN MONDE OÙ LES CHIENS…', tags: '#chien #chiot #santeanimale #conseilschien',
    pairs: [
      { bad: ['🍫', 'Restes de table, chocolat, raisins'], good: ['🥕', 'Des friandises adaptées, en petite quantité'] },
      { bad: ['🚗', 'Enfermés dans la voiture, même 5 minutes'], good: ['🌳', 'À l’ombre, avec de l’eau, tôt le matin'] },
      { bad: ['😰', 'Laissés seuls d’un coup, trop longtemps'], good: ['🧸', 'Habitués à la solitude, petit à petit'] }] },
  { id: 'chats', e: '🐱', cover: [3, 'b'], hook: 'DANS UN MONDE OÙ LES CHATS…', tags: '#chat #chaton #santeanimale #conseilschat',
    pairs: [
      { bad: ['💐', 'Un bouquet de lys sur la table'], good: ['🌱', 'De l’herbe à chat, sans danger'] },
      { bad: ['🧴', 'La pipette antiparasitaire du chien'], good: ['🩺', 'Le produit conseillé par le vétérinaire'] },
      { bad: ['🚽', 'Une litière sale, une seule pour tous'], good: ['✨', 'Une litière par chat, plus une, nettoyée chaque jour'] }] },
  { id: 'sante', e: '🐾', cover: [1, 'a'], hook: 'DANS UN MONDE OÙ LES ANIMAUX…', tags: '#chien #chat #santeanimale #veterinaire',
    pairs: [
      { bad: ['💉', 'Vaccins et vermifuges oubliés'], good: ['📅', 'Rappels notés, prévenus à temps'] },
      { bad: ['🍖', 'Ration au jugé, poids jamais vérifié'], good: ['⚖️', 'Pesée régulière et ration mesurée'] },
      { bad: ['🤞', 'On attend que ça passe tout seul'], good: ['🩺', 'Un appel au vétérinaire au moindre doute'] }] },
  { id: 'seniors-chiens', e: '👴', cover: [1, 'a'], hook: 'DANS UN MONDE OÙ LES CHIENS SENIORS…', tags: '#chien #chiensenior #vieuxchien #santeanimale',
    pairs: [
      { bad: ['🦴', 'Raideurs au lever : « c’est l’âge »'], good: ['🩺', 'Un avis vétérinaire : l’arthrose se soulage'] },
      { bad: ['🥵', 'Une grande balade d’un coup, comme avant'], good: ['🌳', 'Deux ou trois petites balades douces'] },
      { bad: ['📅', 'Une visite par an… quand on y pense'], good: ['✅', 'Deux bilans par an, notés dans Wouf'] }] },
  { id: 'seniors-chats', e: '🐈', cover: [2, 'b'], hook: 'DANS UN MONDE OÙ LES CHATS SENIORS…', tags: '#chat #chatsenior #vieuxchat #santeanimale',
    pairs: [
      { bad: ['💧', 'Il boit plus ? On n’y prête pas attention'], good: ['🩺', 'On en parle au vétérinaire (reins, thyroïde)'] },
      { bad: ['📦', 'Un bac à litière haut, dur à enjamber'], good: ['✨', 'Un bac à bord bas, facile d’accès'] },
      { bad: ['😿', 'Il saute moins : « il vieillit, c’est tout »'], good: ['🪜', 'Une marche vers ses coins en hauteur et un avis vétérinaire'] }] }
];
const photo = (id, n, ab) => { for (const ext of ['jpg', 'jpeg', 'png']) { const f = path.join(PH, `${id}-${n}-${ab}.${ext}`); if (fs.existsSync(f)) return `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,` + fs.readFileSync(f).toString('base64'); } return ''; };
const css = h => `*{box-sizing:border-box}body{margin:0;font-family:"DejaVu Sans","Liberation Sans",system-ui,sans-serif;font-weight:900}.e{font-family:"Noto Color Emoji",sans-serif}.cv{width:1080px;height:${h}px;position:relative;overflow:hidden;color:#fff}
.half{position:absolute;left:0;right:0;height:50%;display:flex;flex-direction:column;justify-content:flex-end;padding:0 60px 60px}.half.b{bottom:0}.half.a{top:0}.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.emo{position:absolute;left:0;right:0;top:${h > 1500 ? '14%' : '6%'};text-align:center;font-size:${h > 1500 ? 380 : 300}px;line-height:1;filter:drop-shadow(0 18px 30px rgba(0,0,0,.35))}
.shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,0) 62%)}
.t{font-weight:900;-webkit-text-stroke:2px #fff;position:relative;font-size:${h > 1500 ? 100 : 92}px;line-height:.98;text-transform:uppercase;letter-spacing:-1px;text-shadow:0 5px 20px rgba(0,0,0,.6)}.s{position:relative;font:700 ${h > 1500 ? 42 : 38}px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;margin-top:14px;text-shadow:0 3px 12px rgba(0,0,0,.7);max-width:820px}
.logo{position:absolute;left:44px;top:${h > 1500 ? 170 : 40}px;z-index:5;display:flex;align-items:center;gap:14px;font:900 44px system-ui,sans-serif;text-shadow:0 3px 14px rgba(0,0,0,.6)}.logo svg{width:64px;height:64px;border-radius:16px}
.mid{position:absolute;left:0;right:0;top:50%;height:8px;margin-top:-4px;background:#fff;z-index:4}
.full{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:${h > 1500 ? '230px 80px 420px' : '120px 80px 80px'};gap:34px}`;
const logo = `<div class="logo">${LOGO}<span>Wouf</span></div>`;
const half = (cls, grad, emo, ph, title, sub) => `<div class="half ${cls}" style="background:${grad}">${ph ? `<div class="bg" style="background-image:url(${ph})"></div>` : `<div class="emo e">${emo}</div>`}<div class="shade"></div><div class="t">${title}</div><div class="s">${sub}</div></div>`;
(async () => {
  fs.mkdirSync(JPG, { recursive: true });
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), caps = {};
  for (const s of SETS) {
    const sl = [];
    // Couverture : si une photo est fournie (s.cover), elle remplit le fond, assombrie ; sinon, l'emoji géant
    const cph = photo(s.id, ...s.cover);
    sl.push(`<div class="cv" style="background:linear-gradient(160deg,#2b2320,#0f0c0b)">${cph ? `<div class="bg" style="background-image:url(${cph})"></div><div class="bg" style="background:linear-gradient(to bottom,rgba(0,0,0,.35),rgba(0,0,0,.78))"></div>` : ''}${logo}<div class="full" style="z-index:2">${cph ? '' : `<div class="e" style="font-size:260px;line-height:1">${s.e}</div>`}<div style="font-size:112px;font-weight:900;-webkit-text-stroke:2px #fff;line-height:1;text-transform:uppercase;text-shadow:0 6px 24px rgba(0,0,0,.6)">${s.hook}</div><div style="font:700 44px system-ui,sans-serif;opacity:.85">Glissez 👉</div></div></div>`);
    s.pairs.forEach((p, i) => sl.push(`<div class="cv">${logo}${half('a', 'linear-gradient(160deg,#7a2a25,#c04a3a)', p.bad[0], photo(s.id, i + 1, 'a'), 'Subissent ça…', p.bad[1])}<div class="mid"></div>${half('b', 'linear-gradient(160deg,#1f7a4a,#5cc28a)', p.good[0], photo(s.id, i + 1, 'b'), 'Choisissez ça…', p.good[1])}</div>`));
    sl.push(`<div class="cv" style="background:linear-gradient(160deg,#ffab5c,#ee6a1c)">${logo}<div class="full"><div style="font-size:104px;font-weight:900;-webkit-text-stroke:2px #fff;line-height:1.02;text-transform:uppercase;text-shadow:0 5px 18px rgba(0,0,0,.25)">Choisissez le bon côté 🐾</div><div style="font:700 46px/1.3 system-ui,sans-serif">Carnet de santé, rappels, urgences et guides pour votre chien et votre chat.</div><div style="font:800 52px system-ui,sans-serif">woufapp.fr</div></div></div>`);
    for (const [pre, h] of [['contraste-' + s.id + '-', 1350], ['contraste-' + s.id + '-tt-', 1920]]) {
      const p = await b.newPage({ viewport: { width: 1080, height: h } });
      for (let i = 0; i < sl.length; i++) { await p.setContent(`<style>${css(h)}</style>${sl[i]}`); const n = pre + String(i + 1).padStart(2, '0'); await p.screenshot({ path: path.join(OUT, n + '.png') }); await p.screenshot({ path: path.join(JPG, n + '.jpg'), type: 'jpeg', quality: 90 }); }
      await p.close();
    }
    const lines = s.pairs.map(p => `❌ ${p.bad[1]}\n✅ ${p.good[1]}`).join('\n\n');
    caps[s.id] = { slides: sl.length, caption: `${s.hook.charAt(0) + s.hook.slice(1).toLowerCase()} ${s.e}\n\n${lines}\n\nDe quel côté êtes-vous ? 👇\n📌 Enregistrez et envoyez à un propriétaire d’animal.\nContenu indicatif : votre vétérinaire reste la référence.\n\n#woufapp ${s.tags}`,
      tiktok: `${s.hook.charAt(0) + s.hook.slice(1).toLowerCase()} ${s.e} De quel côté êtes-vous ? 👇 Lien en bio 💛\n#pourtoi #fyp #woufapp ${s.tags}` };
    console.log('  ✓', s.id, sl.length + ' images');
  }
  fs.writeFileSync(path.join(__dirname, 'contraste.json'), JSON.stringify(caps, null, 1)); await b.close();
})();
