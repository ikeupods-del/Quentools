'use strict';
/* Construit queue.json : la file des publications Instagram, dans l'ordre (1 par jour).
   Légendes des posts et carrousels = celles du kit (kit.html) ; fiches « toxique du jour » = textes de l'app (fiches.json, écrit par generate.js).
   Lancer :  node marketing/wouf/build-queue.js   (après generate.js). Les publications déjà faites restent mémorisées dans state.json. */
const fs = require('fs'), path = require('path');
const kit = fs.readFileSync(path.join(__dirname, 'kit.html'), 'utf8');
const src = kit.slice(kit.indexOf('const TAGS'), kit.indexOf('const CAL'));
const { TAGS, POSTS, CARR } = new Function(src + ';return { TAGS, POSTS, CARR };')();
const fiches = JSON.parse(fs.readFileSync(path.join(__dirname, 'fiches.json'), 'utf8'));
const withTags = (cap, key) => cap.trim() + '\n\n' + TAGS[key];

const posts = POSTS.map(([img, cap, key]) => ({ id: img.replace(/\.png$/, ''), type: 'image', images: [img], caption: withTags(cap, key) }));
const carr = CARR.map(([imgs, cap, key]) => ({ id: imgs[0].replace(/-1\.png$/, ''), type: 'carousel', images: imgs, caption: withTags(cap, key) }));
const fiche = (sp, f) => ({ id: f.file.replace(/\.png$/, ''), type: 'image', images: [f.file], caption: withTags(
  `⛔ ${f.title}${f.more ? ' (' + f.more + ')' : ''} : danger pour ton ${sp} !\n\n${f.why}\n\nUn doute ? Appelle tout de suite ton vétérinaire ou un centre antipoison vétérinaire.\n\n📌 Enregistre ce post pour t’en souvenir et envoie-le à un propriétaire de ${sp}.\n\n⚠️ Information indicative : Wouf ne remplace jamais un vétérinaire. Retrouve tous les aliments toxiques et les premiers secours dans Wouf (lien dans la bio).`, sp === 'chat' ? 'cat' : 'dog') });
const fl = []; for (let i = 0; i < Math.max(fiches.chien.length, fiches.chat.length); i++) { if (fiches.chien[i]) fl.push(fiche('chien', fiches.chien[i])); if (fiches.chat[i]) fl.push(fiche('chat', fiches.chat[i])); }

// Ordre : lancement d'abord, puis 1 post produit pour 2 fiches ; un carrousel toutes les 8 publications.
const q = [posts.shift()]; const pool = { p: posts, f: fl, c: carr };
let n = 0; while (pool.p.length || pool.f.length || pool.c.length) {
  n++; let it;
  if (n % 8 === 0 && pool.c.length) it = pool.c.shift();
  else if (n % 3 === 1 && pool.p.length) it = pool.p.shift();
  else it = pool.f.shift() || pool.p.shift() || pool.c.shift();
  q.push(it);
}
const ids = new Set(); for (const it of q) { if (ids.has(it.id)) throw new Error('doublon ' + it.id); ids.add(it.id); if (it.caption.length > 2200) throw new Error('légende trop longue ' + it.id); if ((it.caption.match(/#\w+/g) || []).length > 5) throw new Error('plus de 5 hashtags ' + it.id); for (const f of it.images) if (!fs.existsSync(path.join(__dirname, 'images', f))) throw new Error('image absente ' + f); }
fs.writeFileSync(path.join(__dirname, 'queue.json'), JSON.stringify(q, null, 1) + '\n');
console.log(`✓ queue.json : ${q.length} publications (${q.length} jours)`);

/* ===================== Séries (conseils, premiers secours, leçons) + catalogue numéroté + file de Make ===================== */
const series = JSON.parse(fs.readFileSync(path.join(__dirname, 'series.json'), 'utf8'));
const tagsOf = sp => sp === 'chat' ? TAGS.cat : TAGS.dog, DISC = '⚠️ Information indicative : Wouf ne remplace jamais un vétérinaire.';
const tipPosts = series.tips.map(t => ({ id: t.file.replace('.png', ''), type: 'image', images: [t.file], kind: 'conseil', sp: t.sp, caption: `💡 Conseil santé pour ton ${t.sp} :\n\n${t.text}\n\n📌 Enregistre ce post et envoie-le à un propriétaire de ${t.sp}.\n\n${DISC}\n\n${tagsOf(t.sp)}` }));
const aidPosts = series.aid.map(a => ({ id: a.file.replace('.png', ''), type: 'image', images: [a.file], kind: 'secours', sp: a.sp, caption: `🚑 Premiers secours (${a.sp}) : ${a.title}\n\n${a.steps.map((x, i) => (i + 1) + '. ' + x).join('\n')}\n\n📌 Enregistre ce post, il peut servir un jour.\n\n${DISC} En cas de doute ou d’urgence, appelle immédiatement ton vétérinaire.\n\n${tagsOf(a.sp)}` }));
const lessonPosts = series.lessons.map(l => ({ id: l.file.replace('.png', ''), type: 'image', images: [l.file], kind: 'leçon', sp: l.sp, caption: `🎓 Éducation positive (${l.sp}) : ${l.title}\n\n🎯 ${l.goal}\n⏱️ ${[l.level, l.dur].filter(Boolean).join(' · ')}\n\nDans Wouf, chaque leçon a son plan pas à pas et un petit quiz. Uniquement des méthodes positives : zéro punition.\n\nLien dans la bio 👆 Tu commences par quelle leçon ? 👇\n\n${tagsOf(l.sp)}` }));
// Tout ce qui a déjà été programmé chez Metricool (11 premières publications) ou est réservé à ses prochains lots (fichier queue.json, index 1 à 30)
const inter = arr => { const a = arr.filter(x => x.sp === 'chien'), b = arr.filter(x => x.sp === 'chat'), out = []; while (a.length || b.length) { if (a.length) out.push(a.shift()); if (b.length) out.push(b.shift()); } return out; };   // chien / chat en alternance
const metricoolPart = q.slice(0, 31), alreadyPosted = q[31], fichesTail = q.slice(32).map(x => ({ ...x, sp: /chat/.test(x.id) ? 'chat' : 'chien' }));
const rot = []; const rotPool = { L: inter(lessonPosts), T: inter(tipPosts), A: inter(aidPosts), F: inter(fichesTail) };
const pattern = ['L', 'T', 'L', 'A', 'L', 'F'];
let guard = 0; while ((rotPool.L.length || rotPool.T.length || rotPool.A.length || rotPool.F.length) && guard++ < 2000) {
  for (const k of pattern) { const it = rotPool[k].shift() || (k !== 'L' && rotPool.L.shift()); if (it) rot.push(it); }
}
const makeQueue = rot.filter(it => !it.kind ? true : true);
// Catalogue numéroté (pour relire et dire « je n'aime pas le n°X ») : Metricool d'abord, puis Make dans l'ordre de publication
const catalogue = []; let num = 0;
for (const it of metricoolPart) catalogue.push({ num: ++num, source: 'metricool', ...it });
catalogue.push({ num: ++num, source: 'make', status: 'déjà publié (test)', kind: 'fiche', ...alreadyPosted });
for (const it of makeQueue) catalogue.push({ num: ++num, source: 'make', kind: it.kind || (it.id.startsWith('fiche') ? 'fiche' : 'post'), ...it });
for (const it of catalogue) { if ((it.caption.match(/#\w+/g) || []).length > 5) throw new Error('hashtags ' + it.id); if (it.caption.length > 2200) throw new Error('trop long ' + it.id); for (const f of it.images) if (!fs.existsSync(path.join(__dirname, 'images', f))) throw new Error('image absente ' + f); }
const BASE = 'https://raw.githubusercontent.com/ikeupods-del/Quentools/claude/infirmiere-ordonnances-upload-26nl16/marketing/wouf/';
fs.writeFileSync(path.join(__dirname, 'catalogue.json'), JSON.stringify(catalogue, null, 1) + '\n');
fs.writeFileSync(path.join(__dirname, 'queue-make.json'), JSON.stringify(catalogue.filter(c => c.source === 'make' && !c.status).map(c => ({ num: c.num, id: c.id, imageUrl: BASE + 'images-jpg/' + c.images[0].replace('.png', '.jpg'), caption: c.caption })), null, 1) + '\n');
console.log(`✓ catalogue.json : ${catalogue.length} posts numérotés (${metricoolPart.length} Metricool, ${makeQueue.length} Make) ; queue-make.json`);
