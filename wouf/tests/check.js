'use strict';
/* Contrôles statiques : syntaxe, intégrité du contenu (leçons, races…), cohérence de la configuration et du déploiement.
   Lancé par `npm test` et par la CI avant toute publication. Un échec ici = ne pas publier. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const W = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(W, f), 'utf8');
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.error('  ✗ ' + msg); } };
const section = t => console.log('• ' + t);

section('Syntaxe des scripts');
const jsFiles = fs.readdirSync(W).filter(f => f.endsWith('.js'));
for (const f of jsFiles) { try { new vm.Script(read(f), { filename: f }); passes++; } catch (e) { fails++; console.error(`  ✗ ${f}: ${e.message}`); } }

section('Chargement des données');
const ctx = vm.createContext({ window: {}, console });
for (const f of ['config.js', 'data.js', 'species.js', 'lessons.js', 'lessons2.js', 'lessons_cat.js', 'lessons3.js', 'lessons_cat2.js', 'lessons4.js', 'lessons_cat3.js', 'lessons5.js', 'lessons_cat4.js', 'lessons6.js', 'lessons7.js', 'lessons_cat5.js', 'lessons_plans.js', 'quiz.js', 'quiz2.js', 'quiz_chat.js']) vm.runInContext(read(f), ctx, { filename: f });
const get = e => vm.runInContext(e, ctx);
const QUIZZES = get('QUIZZES'), LESSONS = get('LESSONS'), PROGRAMS = get('PROGRAMS'), BREEDS = get('BREEDS.concat(CAT_BREEDS)'), CFG = get('window.WOUF_CONFIG');

section('Leçons');
const ids = new Set();
for (const l of LESSONS) {
  ok(!ids.has(l.id), `id de leçon en double : ${l.id}`); ids.add(l.id);
  ok(['dog', 'cat'].includes(l.sp || 'dog'), `${l.id} : espèce inconnue`);
  for (const k of ['title', 'cat', 'goal', 'why', 'test', 'dur', 'span', 'level']) ok(typeof l[k] === 'string' && l[k].length > 2, `${l.id} : champ « ${k} » manquant`);
  ok(typeof l.icon === 'string' && l.icon.length >= 1, `${l.id} : icône manquante`);
  ok(typeof l.from === 'number' && l.from >= 2 && l.from <= 800, `${l.id} : âge minimum invalide`);
  ok(Array.isArray(l.need) && l.need.length >= 1, `${l.id} : matériel manquant`);
  ok(Array.isArray(l.steps) && l.steps.length >= 3, `${l.id} : au moins 3 étapes`);
  (l.steps || []).forEach((s, i) => { ok(s.t && s.b && s.b.length > 40 && s.crit && s.crit.length > 10, `${l.id} étape ${i + 1} : titre, texte (40+ car.) et critère de réussite requis`); });
  ok((l.mistakes || []).length >= 3, `${l.id} : au moins 3 erreurs fréquentes`);
  ok(Array.isArray(l.plan) && l.plan.length >= 3 && l.plan.every(x => x.length === 2 && x[0] && x[1].length > 15), `${l.id} : programme d’entraînement (« plan ») de 3 étapes minimum requis`);
  ok(Array.isArray(l.next) && l.next.length >= 2 && l.next.every(x => x.length > 10), `${l.id} : au moins 2 pistes « pour aller plus loin » (« next »)`);
  ok((l.faq || []).length >= 2 && l.faq.every(x => x.length === 2 && x[0] && x[1]), `${l.id} : au moins 2 questions de dépannage`);
  ok(l.why.length > 80 && l.goal.length > 30, `${l.id} : textes trop courts`);
}
const dog = LESSONS.filter(l => (l.sp || 'dog') === 'dog'), cat = LESSONS.filter(l => l.sp === 'cat');
ok(LESSONS.filter(l => l.free).length === 10, `10 leçons gratuites attendues au total (${LESSONS.filter(l => l.free).length})`);
ok(LESSONS.filter(l => !l.free).length >= 100, `au moins 100 leçons Plus attendues (${LESSONS.filter(l => !l.free).length})`);
ok(dog.filter(l => !l.free).length >= 30, `chien : au moins 30 leçons Plus (${dog.filter(l => !l.free).length})`);
ok(cat.filter(l => l.free).length >= 2 && cat.filter(l => !l.free).length >= 10, 'chat : au moins 2 leçons gratuites et 10 Plus');
console.log(`  ${dog.length} leçons chien (${dog.filter(l => !l.free).length} Plus), ${cat.length} leçons chat (${cat.filter(l => !l.free).length} Plus)`);

section('Quiz');
{ const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const BAD = /(punir|punition|gronder|taper|frapper|collier (étrangleur|à pointes|électrique)|jet d.eau|lui mettre le nez)/i;
  let longest = 0, total = 0;
  for (const l of LESSONS) {
    const qz = QUIZZES[l.id];
    ok(Array.isArray(qz) && qz.length === 3, `${l.id} : 3 questions de quiz écrites à la main attendues (quiz*.js)`);
    (qz || []).forEach((x, i) => {
      const [q, good, w1, w2, why] = x, tag = `${l.id} quiz ${i + 1}`;
      ok(x.length === 5 && [q, good, w1, w2, why].every(t => typeof t === 'string' && t.trim().length >= 2), `${tag} : format [question, bonne, mauvaise, mauvaise, explication]`);
      ok(/\?\s*$/.test(q) || /…\s*$/.test(q) || /:\s*$/.test(q), `${tag} : la question doit finir par « ? », « … » ou « : »`);
      ok(new Set([good, w1, w2].map(norm)).size === 3, `${tag} : réponses en double`);
      ok(!BAD.test(good) || /jamais|ne pas|non|sans/i.test(good) || /(éviter|proscrire|interdit|danger)/i.test(q), `${tag} : la bonne réponse ne doit pas recommander une punition`);
      ok(why.length >= 20, `${tag} : explication trop courte`);
      ok(!(/^(Non|Jamais)\b/.test(good) && /^Oui\b/.test(w1) && /^Oui\b/.test(w2)), `${tag} : la seule réponse négative est la bonne (trop facile à deviner)`);
      ok(!(/^Oui\b/.test(good) && /^(Non|Jamais)\b/.test(w1) && /^(Non|Jamais)\b/.test(w2)), `${tag} : la seule réponse positive est la bonne (trop facile à deviner)`);
      ok(q.length >= 18 && !/^Et /.test(q), `${tag} : question trop elliptique`);
      total++; if (good.length > 1.35 * Math.max(w1.length, w2.length)) longest++;
    });
  }
  for (const id of Object.keys(QUIZZES)) ok(LESSONS.some(l => l.id === id), `quiz pour une leçon inconnue : ${id}`);
  ok(longest / total <= 0.25, `quiz : la bonne réponse est nettement la plus longue dans ${longest}/${total} questions (trop facile à deviner, 25 % max)`);
  console.log(`  ${total} questions · bonne réponse nettement la plus longue : ${longest} (${Math.round(100 * longest / total)} %)`); }

section('Programmes');
for (const p of PROGRAMS) {
  ok(p.id && p.title && p.sp && p.weeks.length >= 3, `programme ${p.id} incomplet`);
  for (const w of p.weeks) for (const id of w[2]) { const l = LESSONS.find(x => x.id === id); ok(!!l, `programme ${p.id} : leçon inconnue « ${id} »`); if (l) ok((l.sp || 'dog') === p.sp, `programme ${p.id} : « ${id} » n’est pas de la bonne espèce`); }
}

section('Races');
const names = new Set();
for (const b of BREEDS) {
  ok(!names.has(b.name), `race en double : ${b.name}`); names.add(b.name);
  ok(b.w[0] > 0 && b.w[0] < b.w[1] && b.life[0] < b.life[1] && b.risk >= 0.8 && b.risk <= 2 && b.pred.length >= 1, `race invalide : ${b.name}`);
}

section('Configuration');
const B = CFG.billing;
ok(B && typeof B.enabled === 'boolean', 'billing.enabled doit être un booléen');
ok(B.plans && B.plans.length === 1 && /\d/.test(B.plans[0].price), 'un plan à paiement unique avec un prix affiché est attendu');
const bizFeatures = (read('business.js').match(/const FEATURES = \{([\s\S]*?)\n\};/) || [, ''])[1];
for (const f of B.premium) ok(new RegExp('\\b' + f + ':').test(bizFeatures), `fonction Plus « ${f} » sans description dans business.js (FEATURES)`);
const RW = B.rewardOffer || {};
ok(!RW.enabled || /\d/.test(RW.price || ''), 'billing.rewardOffer.enabled = true mais aucun prix affiché');
ok(!B.api || /^https:\/\/[\w.-]+(\/[\w./-]*)?$/.test(B.api), 'billing.api doit être une adresse https://…');
ok(!B.payee || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(B.payee), 'billing.payee doit être une adresse e-mail');
for (const k of ['paymentLink', 'rewardLink']) ok(!B[k] || /^https:\/\/(www\.)?paypal\.(com|me|biz)\/[\w./-]+$/i.test(B[k]), `billing.${k} doit être un lien PayPal (https://www.paypal.com/…)`);
const cl = read('business.js').match(/const CHANGELOG = \[\s*\{ v: '([\d.]+)'/);
{ const n = x => x.split('.').map(Number).reduce((a, k) => a * 1000 + k, 0);
  ok(cl && n(cl[1]) <= n(CFG.version), `dernière entrée du CHANGELOG (${cl && cl[1]}) plus récente que config.js (${CFG.version})`); }
ok(read('package.json').includes(`"version": "${CFG.version}"`), 'package.json : version différente de config.js');
ok(JSON.parse(read('package-lock.json')).version === CFG.version, 'package-lock.json : version différente de config.js');
ok(read('sw.js').includes(`wouf-v${CFG.version.split('.').slice(0, 2).join('.')}`), 'sw.js : le nom du cache doit suivre la version (wouf-vX.Y) pour forcer la mise à jour');
ok(CFG.donation && /^https:\/\/[^ ]+$/.test(CFG.donation.url) && CFG.donation.name, 'config.js : donation.url (https) et donation.name requis');
if (B.enabled) {
  const L = CFG.legal, S = CFG.support;
  for (const k of ['seller', 'form', 'address', 'siret', 'email', 'mediator']) ok(L[k], `billing.enabled = true mais legal.${k} est vide : complétez config.js avant de vendre`);
  ok(S.email, 'billing.enabled = true mais support.email est vide');
  ok(B.payee || B.paymentLink, 'billing.enabled = true mais ni adresse PayPal (billing.payee) ni lien PayPal (billing.paymentLink)');
}

section('Fichiers et déploiement');
const html = read('index.html');
const versioned = [...html.matchAll(/(?:src|href)="([a-z0-9_]+\.(?:js|css))(\?v=[\d.]+)?"/g)];
for (const [, f, q] of versioned) ok(q === `?v=${CFG.version}`, `index.html : ${f} doit porter ?v=${CFG.version} (lancez npm run release -- ${CFG.version})`);
const scripts = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
for (const s of scripts) ok(fs.existsSync(path.join(W, s)), `script référencé introuvable : ${s}`);
// Scripts partagés (variables globales) : un même nom déclaré deux fois écrase silencieusement le premier.
const declared = {};
for (const s of scripts) if (fs.existsSync(path.join(W, s))) for (const m of read(s).matchAll(/^(?:async\s+)?(?:function\s+|const\s+|let\s+|var\s+)([A-Za-z_$][\w$]*)/gm)) (declared[m[1]] = declared[m[1]] || []).push(s);
for (const [n, fl] of Object.entries(declared)) ok(fl.length === 1, `nom global déclaré plusieurs fois : ${n} (${fl.join(', ')})`);
const sw = read('sw.js'), shell = (sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ''])[1];
for (const f of [...scripts, 'style.css', 'index.html', 'manifest.webmanifest']) ok(shell.includes(`./${f}'`), `sw.js : ${f} absent du cache hors ligne (SHELL)`);
for (const m of shell.matchAll(/'\.\/([^']+)'/g)) ok(fs.existsSync(path.join(W, m[1])), `sw.js : fichier inexistant ${m[1]}`);
const manifest = JSON.parse(read('manifest.webmanifest'));
for (const i of manifest.icons) ok(fs.existsSync(path.join(W, i.src)), `manifest : icône introuvable ${i.src}`);
for (const f of fs.readdirSync(W).filter(f => /\.(js|html|md)$/.test(f))) ok(!/sk_(live|test)_[A-Za-z0-9]{10,}/.test(read(f)), `${f} contient une clé secrète Stripe !`);
ok(!/console\.log\(/.test(jsFiles.map(read).join('\n')), 'console.log oublié dans le code de l’app');

console.log(fails ? `\n✗ ${fails} contrôle(s) en échec (${passes} réussis)` : `\n✓ ${passes} contrôles réussis`);
process.exit(fails ? 1 : 0);
