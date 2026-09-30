'use strict';
/* Wouf — « Test express : dangereux ou OK ? » : 8 aliments tirés au hasard, accessible SANS carnet (porte d'entrée depuis les réseaux sociaux), avec partage du score.
   Les aliments dangereux reprennent les textes de SOS (TOXICS / TOXICS_CAT) ; les aliments « OK » sont des classiques sans danger en petite quantité.
   Contenu indicatif : ne remplace jamais un vétérinaire. Route #/test, aucune donnée enregistrée. */
const TA_POOL = {
  dog: [
    { e: '🍇', name: 'Raisins', v: 'no', key: 'Raisins' }, { e: '🍫', name: 'Chocolat', v: 'no', key: 'Chocolat' },
    { e: '🥕', name: 'Carotte crue', v: 'ok', why: 'En petits morceaux, c’est une friandise croquante et légère. Comme tout : avec modération.' },
    { e: '🍞', name: 'Pâte à pain crue', v: 'no', key: 'Pâte à pain' }, { e: '🥑', name: 'Avocat', v: 'mid', key: 'Avocat' },
    { e: '🍎', name: 'Pomme (sans pépins ni trognon)', v: 'ok', why: 'En petits morceaux, c’est une friandise appréciée. Retirez toujours les pépins et le trognon.' },
    { e: '🧅', name: 'Oignon', v: 'no', key: 'Oignon' }, { e: '🥒', name: 'Concombre', v: 'ok', why: 'Croquant, très riche en eau et peu calorique : une friandise sans danger en petits morceaux.' },
    { e: '🍬', name: 'Chewing-gum « sans sucre »', v: 'no', key: 'Xylitol' }, { e: '🍌', name: 'Banane (un petit morceau)', v: 'ok', why: 'Sans danger en petite quantité, mais riche en sucre : une friandise, pas un repas.' },
    { e: '🥜', name: 'Noix de macadamia', v: 'no', key: 'Noix de macadamia' }, { e: '🍄', name: 'Champignons sauvages', v: 'no', key: 'Champignons sauvages' },
    { e: '🦴', name: 'Os de volaille cuits', v: 'mid', key: 'Os cuits' }
  ],
  cat: [
    { e: '🌷', name: 'Lys (bouquet, pollen)', v: 'no', key: 'Lys' }, { e: '🧅', name: 'Oignon', v: 'no', key: 'Oignon' }, { e: '🍫', name: 'Chocolat', v: 'no', key: 'Chocolat' },
    { e: '🥛', name: 'Lait de vache', v: 'mid', key: 'Lait de vache' }, { e: '🌱', name: 'Herbe à chat', v: 'ok', why: 'L’herbe à chat (cataire) ne présente pas de danger et amuse beaucoup de chats.' },
    { e: '🍗', name: 'Poulet cuit nature, sans os', v: 'ok', why: 'Une petite portion de poulet cuit, sans sel, sans assaisonnement et sans os, est sans danger en complément.' },
    { e: '🍇', name: 'Raisins', v: 'mid', key: 'Raisins' }, { e: '🧴', name: 'Pipette antiparasitaire pour chien', v: 'no', key: 'Pipette' },
    { e: '☕', name: 'Café, thé, alcool', v: 'no', key: 'Alcool, café' }, { e: '🍖', name: 'Croquettes pour chien (en usage exclusif)', v: 'mid', key: 'Aliments pour chien' }
  ]
};
const TA_LABEL = { no: '⛔ Dangereux', mid: '⚠️ À éviter', ok: '✅ OK' }, TA_N = 8;
const TEST = { sp: '', q: [], i: 0, score: 0, picked: '' };

function taWhy(sp, it) {
  if (it.why) return it.why;
  const list = sp === 'cat' ? TOXICS_CAT : TOXICS, t = list.find(x => x.name.startsWith(it.key));
  return t ? t.why : 'Mieux vaut l’éviter : demandez conseil à votre vétérinaire.';
}
function taShuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function taStart(sp) {
  const pool = taShuffle(TA_POOL[sp]), ok = pool.filter(x => x.v === 'ok').slice(0, 3), rest = pool.filter(x => !ok.includes(x)).slice(0, TA_N - ok.length);
  Object.assign(TEST, { sp, q: taShuffle(ok.concat(rest)), i: 0, score: 0, picked: '' });
}
ROUTES.test = function test() {
  const T = TEST, animal = T.sp === 'cat' ? 'chat' : 'chien';
  if (!T.sp) return `<div class="page-h"><h1>🧠 Test express</h1></div><section class="card ta"><h2>Dangereux ou OK ?</h2>
    <p>${TA_N} aliments, 1 minute. Sans compte et sans rien à installer. Saurez-vous ce qui est dangereux pour votre compagnon ?</p>
    <div class="ta-btns"><button class="btn primary big" data-act="ta-start" data-sp="dog">🐶 Pour mon chien</button><button class="btn primary big" data-act="ta-start" data-sp="cat">🐱 Pour mon chat</button></div>
    <p class="mut small">Contenu indicatif : ne remplace jamais un vétérinaire.</p></section>`;
  if (T.i >= T.q.length) {
    const n = T.q.length, msg = T.score === n ? 'Sans faute, bravo ! 🏆' : T.score >= n - 2 ? 'Très bien, vous connaissez l’essentiel. 👏' : T.score >= n / 2 ? 'Pas mal, mais quelques pièges à retenir. 🙂' : 'Bonne nouvelle : vous venez de les apprendre. 💡';
    return `<div class="page-h"><h1>🧠 Votre score</h1></div><section class="card ta center"><div class="ta-score">${T.score}<small>/${n}</small></div><p><b>${msg}</b></p>
      <div class="ta-btns"><button class="btn primary big" data-act="ta-share">📤 Partager mon score</button>
      ${S.dogs.length ? '<a class="btn big" href="#/sos">🚨 Voir tous les aliments toxiques</a>' : '<button class="btn big" data-act="first-dog">Ajouter mon compagnon 🐶🐱</button>'}
      <button class="btn" data-act="ta-restart">Refaire le test</button></div>
      <p class="mut small">Retrouvez la liste complète des aliments, plantes et produits toxiques, et les premiers secours, dans Wouf.</p></section>`;
  }
  const it = T.q[T.i], done = !!T.picked, good = T.picked === it.v;
  return `<div class="page-h"><h1>🧠 Question ${T.i + 1}/${T.q.length}</h1></div><section class="card ta center"><div class="ta-e" aria-hidden="true">${it.e}</div><h2>${esc(it.name)} ?</h2><p class="mut">Pour un ${animal} : dangereux, à éviter, ou OK ?</p>
    ${done ? `<div class="ta-res ${good ? 'ok' : 'bad'}" role="status"><b>${good ? '✅ Bonne réponse' : '❌ Pas tout à fait'}</b> · réponse : <b>${TA_LABEL[it.v]}</b><p>${esc(taWhy(T.sp, it))}</p></div>
      <button class="btn primary big" data-act="ta-next">${T.i + 1 >= T.q.length ? 'Voir mon score →' : 'Question suivante →'}</button>`
      : `<div class="ta-btns">${['no', 'mid', 'ok'].map(k => `<button class="btn big ta-${k}" data-act="ta-answer" data-v="${k}">${TA_LABEL[k]}</button>`).join('')}</div>`}</section>`;
};
ACT['ta-start'] = d => { taStart(d.sp); track('test-aliments-commence', true); render(); };
ACT['ta-answer'] = d => { const it = TEST.q[TEST.i]; if (!it || TEST.picked) return; TEST.picked = d.v; if (d.v === it.v) TEST.score++; render(true); };
ACT['ta-next'] = () => { TEST.i++; TEST.picked = ''; if (TEST.i >= TEST.q.length) track('test-aliments-termine', true); render(); window.scrollTo(0, 0); };
ACT['ta-restart'] = () => { Object.assign(TEST, { sp: '', q: [], i: 0, score: 0, picked: '' }); render(); };
ACT['ta-share'] = async () => {
  const animal = TEST.sp === 'cat' ? 'chat' : 'chien', url = 'https://woufapp.fr/?src=partage#/test', text = `J’ai eu ${TEST.score}/${TEST.q.length} au test Wouf « dangereux ou OK pour ton ${animal} ? » ${TEST.sp === 'cat' ? '🐱' : '🐶'} Et toi ?`;
  try { if (navigator.share) { await navigator.share({ title: 'Test Wouf', text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); toast('Message copié : collez-le où vous voulez'); } catch (e) { toast(text + ' ' + url); }
};
