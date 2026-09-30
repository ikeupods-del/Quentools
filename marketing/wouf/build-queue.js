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
