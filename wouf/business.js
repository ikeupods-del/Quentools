'use strict';
/* Wouf — exploitation et vente : achat unique « à vie », assistance prioritaire, pages légales, nouveautés,
   alerte de mise à jour, diagnostics. Les tarifs se règlent dans config.js ET dans Stripe (voir docs/MAINTENANCE.md). */

const LEGAL = CFG.legal || {}, SUP = CFG.support || {};
const planOf = () => (BILL.plans || [])[0] || { label: 'Wouf Plus', price: '', per: '' };
const isPriority = () => subActive();
const ctaLabel = () => subActive() ? '⭐ Wouf Plus actif' : BILL.enabled ? `⭐ Souscrire à Wouf+ · ${planOf().price} ${planOf().per === 'paiement unique' ? 'à vie' : ''}`.trim() : '⭐ Découvrir Wouf+ (gratuit pour le moment)';
const nDog = (free) => LESSONS.filter(l => (l.sp || 'dog') === 'dog' && (free === undefined || !!l.free === free)).length, nCat = (free) => LESSONS.filter(l => l.sp === 'cat' && (free === undefined || !!l.free === free)).length;
const legalReady = () => !!(LEGAL.seller && LEGAL.address && LEGAL.email && LEGAL.mediator);

const CHANGELOG = [
  { v: '1.9.2', date: '2026-09-29', items: ['✏️ Corrections de textes.'] },
  { v: '1.9.1', date: '2026-09-29', items: ['🏷️ Générateur de noms : un même nom n’apparaît plus deux fois dans les propositions.'] },
  { v: '1.9.0', date: '2026-09-29', items: ['🎓 110 leçons : 100 leçons Wouf Plus et 10 leçons gratuites (le coucher, le rappel, la marche en laisse, le jeu du chat et la caisse de transport deviennent gratuits). 33 nouvelles leçons détaillées : soins, médicaments, griffes, canicross, agility, langage du chien et du chat, fugues, chien sourd, convalescence, voyages…', '🗺️ Nouveau parcours ludique : unités par thème, étapes à débloquer, points d’expérience, niveaux, objectif du jour, série de jours et célébrations.', '✅ Chaque leçon se valide par un quiz de 3 questions de compréhension (330 questions écrites pour Wouf), avec une explication après chaque réponse.', '🐶 Un chien (ou un chat) qui réagit à chaque réponse du quiz : il réfléchit, saute de joie, baisse les oreilles, fait la fête en fin de leçon.', '🏅 Offre récompense : terminez toutes les leçons gratuites et Wouf Plus passe à 9,99 € à vie au lieu de 19,99 €.', '🔎 Recherche et filtres par thème dans l’écran Éducation, 6 nouveaux programmes guidés.'] },
  { v: '1.8.0', date: '2026-09-29', items: ['🏷️ Nouveau : générateur de noms pour chien et chat (styles, sexe, initiale), avec la lettre de l’année des pedigrees LOF/LOOF calculée automatiquement, test d’un nom (facile à retenir ? ressemble-t-il à un ordre ?), écoute du nom et favoris.', '🏠 Accueil réorganisé : « À faire » juste après la fiche, une seule invitation à la fois, raccourcis vers « Que faire ? », la météo et les noms.', '🗂️ Menu Plus classé par rubriques (Santé, Éduquer et bouger, Alimentation, Pratique, Wouf) avec 4 accès rapides.', '🎓 11 nouvelles leçons Wouf Plus : chien (vétérinaire sans stress, baignade, premières nuits du chiot, jeux d’intelligence, arrivée d’un bébé, chien craintif, deux chiens) et chat (bébé, hydratation, surpoids, sorties en sécurité), et 3 nouveaux programmes.'] },
  { v: '1.7.0', date: '2026-09-29', items: ['👣 Balades : compteur de pas (capteur de mouvement du téléphone). Quand le GPS est faible ou absent, la distance est estimée à partir des pas ; longueur de pas réglable.', '🐶 Météo balade : un chien illustré selon le temps (lunettes et parasol au soleil, il boude sous la pluie, oreilles au vent, écharpe par grand froid, sous la couette pendant l’orage…), vent et UV pris en compte, conseils du jour.', '🎓 14 nouvelles leçons Wouf Plus : 9 chien (regard, maîtrise de soi, chien réactif, mâchouillage, instinct de chasse, vie en ville, randonnée, dents, vols de nourriture) et 5 chat (jeu qui mord, pipi hors litière, déménagement, absences, dents), et 4 nouveaux programmes.'] },
  { v: '1.6.0', date: '2026-09-29', items: ['🩺 Nouveau : « Que faire ? », un guide pour évaluer un symptôme (urgence immédiate, vétérinaire sous 24 h ou surveillance), adapté à l’âge de l’animal, avec ajout au journal de santé.', '🌦️ Nouveau : météo des balades (Wouf Plus) : chaleur, froid, pluie et orage adaptés à la race, à l’âge et au gabarit, et meilleures heures pour sortir.', '🔎 Nouveau : recherche dans toute l’app (aliments dangereux, leçons, carnet, journal, documents).'] },
  { v: '1.5.0', date: '2026-09-29', items: ['🎯 Croquettes : recommandation personnalisée selon le chien (gamme adaptée, taille des croquettes, nombre de repas, critères à exiger et à éviter, selon âge, taille, race, activité, poids et allergies).', '🔎 Suggestions de vrais produits : Wouf cherche dans Open Pet Food Facts et classe les résultats selon le profil de votre animal, en signalant les données incomplètes et les allergènes.', '❤️ Le bouton de don pointe vers la page de don de la SPA (campagne Stop abandon 2026).'] },
  { v: '1.4.0', date: '2026-09-29', items: ['🥣 Nouveau : comparateur de croquettes intelligent. Il analyse la composition réelle de l’étiquette selon l’âge, la race, l’activité, le poids et les allergies de votre animal : note d’adéquation, ration, coût par jour et par mois, comparaison côte à côte.', '🔎 Recherche de produits dans Open Pet Food Facts et guide pour bien lire une étiquette.', '❤️ Nouveau : bouton de don à la SPA, en lien direct avec le site officiel de l’association.', '🗑️ Le comparateur d’assurances est retiré (Wouf ne peut pas comparer de vraies offres). Le rappel de renouvellement reste dans la fiche de l’animal.'] },
  { v: '1.3.0', date: '2026-09-29', items: ['🎓 Éducation nettement plus complète : 38 leçons pour chiens (35 avec Wouf Plus) et 14 pour chats (12 avec Wouf Plus).', '📅 Chaque leçon détaille maintenant un programme d’entraînement, les erreurs fréquentes, le dépannage, le test de validation et des pistes pour aller plus loin.', '🆕 Nouvelles leçons : stop d’urgence, attendre à la porte, chien et enfants, adolescence, chien senior, adoption d’un adulte, vacances, gym du chien, chat craintif, harnais, miaulements nocturnes, chat senior, aménagement, alimentation…', '🗓️ 9 programmes guidés (dont nouvel arrivant, adolescence, senior, chat serein).', '⭐ Bouton « Wouf+ » toujours visible pour découvrir l’offre à 19,99 € à vie.'] },
  { v: '1.2.1', date: '2026-09-29', items: ['🔄 Mises à jour instantanées : la nouvelle version s’installe dès l’ouverture de l’app.', '🛠️ Lien de secours …/wouf/?maj=1 : force la mise à jour sans toucher à vos données.'] },
  { v: '1.2.0', date: '2026-09-29', items: ['🐱 Les chats sont accueillis : 1 chien + 1 chat gratuits, animaux illimités avec Wouf Plus.', '🎓 Éducation : 28 leçons (dont 22 pour chiens et 6 pour chats), 4 programmes guidés.', '🦮 Suivi GPS des balades avec tracé, allure, objectif du jour et export GPX (Plus).', '🧠 Bilan santé intelligent, fiche gardien, plan de perte de poids (Plus).', '⭐ Wouf Plus devient un achat unique à vie, avec assistance prioritaire.'] },
  { v: '1.1.0', date: '2026-09-29', items: ['☁️ Connexion Google et sauvegarde automatique.', '🎓 Éducation : 13 leçons, séances guidées, programme chiot.'] },
  { v: '1.0.0', date: '2026-09-29', items: ['🐾 Carnet de santé, rappels, poids, SOS vétérinaires, assurance, dépenses, documents.'] }
];

/* ---------- Diagnostics (jamais envoyés sans action de l'utilisateur) ---------- */
function errorLog() { try { return JSON.parse(localStorage.getItem('wouf:errors') || '[]'); } catch (e) { return []; } }
function diagnostics() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return ['Wouf ' + (CFG.version || '?'), 'Navigateur : ' + navigator.userAgent, 'Écran : ' + screen.width + 'x' + screen.height + (standalone ? ' (app installée)' : ' (navigateur)'),
    'Animaux : ' + S.dogs.map(d => spOf(d).noun).join(', '), 'Plus : ' + (plus() ? 'oui' : 'non') + (subActive() ? ' (achat)' : '') + (BILL.enabled ? '' : ' (gratuit pour tous)'),
    'Compte Google : ' + (CLOUD.user ? CLOUD.user.email : 'non connecté') + ' · synchro : ' + CLOUD.st, 'Dernières erreurs : ' + (errorLog().map(e => new Date(e.t).toISOString() + ' ' + e.m + ' @' + e.s).join(' | ') || 'aucune')].join('\n');
}

/* ---------- Appels au relais ---------- */
async function api(path, opt = {}) {
  const r = await fetch(BILL.api.replace(/\/$/, '') + path, opt); const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Erreur ' + r.status); e.status = r.status; throw e; } return j;
}
async function authHeaders() { const tok = CLOUD.user ? await CloudApi.token().catch(() => null) : null; return { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }; }
function applySub(j) {
  S.sub = j && j.active ? { active: true, lifetime: !!j.lifetime, plan: j.plan || 'lifetime', since: j.since || '', checked: Date.now() } : { active: false, checked: Date.now() };
  save();
}
async function refreshSub(force) {
  if (!BILL.enabled || !BILL.api) return;
  const sid = new URLSearchParams(location.search).get('session_id');
  try {
    if (!CLOUD.user) { const u = await CloudApi.restore().catch(() => null); if (u) CLOUD.user = u; }
    if (!CLOUD.user) return;
    if (sid) {
      applySub(await api('/status?session_id=' + encodeURIComponent(sid), { headers: await authHeaders() }));
      history.replaceState(null, '', location.pathname + '#/abo'); toast(subActive() ? 'Merci ! Wouf Plus est activé à vie ⭐' : 'Paiement en cours de validation… actualisez dans un instant');
    } else if (force || !S.sub || Date.now() - (S.sub.checked || 0) > 6 * 36e5) applySub(await api('/status', { headers: await authHeaders() }));
  } catch (e) { /* hors ligne : on garde l'état connu */ }
}

/* ---------- Fonctions Plus : description commerciale ---------- */
const FEATURES = {
  multiDogs: ['🐾', 'Animaux illimités', 'Tous vos chiens et chats, chacun avec son carnet, ses rappels et sa progression. (Gratuit : 1 chien + 1 chat.)'],
  lessons: ['🎓', `${nDog(false)} leçons chien + ${nCat(false)} leçons chat avancées`, 'Rappel, stop d’urgence, laisse, solitude, réactivité, enfants, adolescence, senior, adoption, vacances, chaton craintif, alimentation… étapes détaillées, programme d’entraînement, dépannage, suivi de séances.'],
  programs: ['🗓️', `${PROGRAMS.length} programmes guidés`, 'Chiot, balade parfaite, chien serein, adolescence, nouvel arrivant, senior, chaton, chat serein : les leçons enchaînées dans le bon ordre.'],
  tracker: ['🦮', 'Suivi GPS des balades', 'Distance, durée, allure, tracé sur la carte, objectif quotidien adapté, historique et export GPX.'],
  bilan: ['🧠', 'Bilan santé intelligent', 'Poids, visites, dents, activité, budget : des conseils personnalisés selon l’âge et la race.'],
  weightplan: ['⚖️', 'Plan de perte de poids', 'Ration quotidienne, étapes toutes les 4 semaines, date d’objectif et suivi réel.'],
  sitter: ['🧳', 'Fiche gardien', 'Repas, traitements, habitudes, contacts : à imprimer ou envoyer à la personne qui garde votre animal.'],
  report: ['📄', 'Carnet PDF pour le vétérinaire', 'Vaccins, traitements, poids et consultations dans un document propre.'],
  calendar: ['📅', 'Rappels dans votre agenda', 'Export vers Google / Apple Calendar avec alertes.'],
  documents: ['📎', 'Documents illimités', 'Ordonnances, résultats, cartes : sans limite. (Gratuit : 3.)'],
  stats: ['📊', 'Statistiques de dépenses', 'Graphiques par catégorie et par mois, export CSV.'],
  weather: ['🌦️', 'Météo des balades', 'Chaleur, froid, pluie et orage adaptés à la race, à l’âge et au gabarit de votre animal, et les meilleures heures pour sortir.'],
  support: ['💬', 'Assistance prioritaire', 'Vos demandes sont traitées en premier, ' + (SUP.priorityDelay || 'sous 24 h ouvrées') + '.']
};
const planLine = () => { const p = planOf(); return `${p.price} ${p.per}`; };

function buySheet() {
  const p = planOf(), rw = rewardActive(), price = rw ? REWARD.price : p.price, el = sheet(`<div class="sheet-head"><h2>⭐ ${esc(p.label)}</h2><button class="x" data-close>✕</button></div>
    ${rw ? `<p class="center reward-tag">🏅 Offre récompense : toutes les leçons gratuites terminées</p><div class="price-cut center"><s>${esc(p.price)}</s> <b>${esc(price)}</b></div>` : `<div class="big-n center">${esc(p.price)}<small> ${esc(p.per)}</small></div>`}
    <p class="center mut">Un seul paiement, pour toujours. Aucun abonnement, aucune reconduction.</p>
    <ul class="bul">${Object.values(FEATURES).map(x => `<li><b>${esc(x[1])}</b></li>`).join('')}</ul>
    <label class="chk consent"><input type="checkbox" id="buy-consent"> <span>J’ai lu les <a href="#/legal?doc=cgv" data-close>conditions de vente</a>. Je demande l’accès immédiat à Wouf Plus et je reconnais perdre mon droit de rétractation de 14 jours dès que l’accès est fourni.</span></label>
    <div class="form-actions"><button class="btn primary big" data-act="buy-go">Payer ${esc(price)} par carte</button></div>
    <p class="mut small center">Paiement sécurisé par Stripe. Votre achat est lié à votre compte Google : il vous suit sur tous vos appareils.</p>`);
  return el;
}
ACT.checkout = async () => {
  if (!BILL.api) return toast('Paiement non configuré');
  if (!legalReady()) return toast('Vente non ouverte : informations légales à compléter');
  if (!CLOUD.user) { toast('Connectez-vous avec Google : votre achat sera lié à votre compte'); await ACT['g-signin'](); if (!CLOUD.user) return; }
  closeAllSheets(); buySheet();
};
ACT['buy-go'] = async () => {
  if (!$('#buy-consent').checked) return toast('Cochez la case pour continuer');
  if (rewardActive() && CLOUD.user) await cloudPush().catch(() => {});   // l'offre est vérifiée sur la sauvegarde : on l'envoie à jour
  try { toast('Redirection vers le paiement sécurisé…'); const j = await api('/checkout', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ returnUrl: location.origin + location.pathname, ...(rewardActive() ? { offer: 'lecons' } : {}) }) }); location.href = j.url; }
  catch (e) { toast(e.message); }
};
function soonSheet() {
  sheet(`<div class="sheet-head"><h2>⭐ Wouf+ : ${esc(planLine())}</h2><button class="x" data-close>✕</button></div>
    <p><b>🎉 Bonne nouvelle : pour le moment, tout est offert.</b> Toutes les fonctions de Wouf Plus sont déjà débloquées sur votre appareil, sans limite.</p>
    <p>La souscription à <b>${esc(planLine())}</b>, sans abonnement et avec assistance prioritaire, ouvrira bientôt. Vos données resteront toujours accessibles.</p>
    <ul class="bul">${Object.values(FEATURES).map(x => `<li>${esc(x[1])}</li>`).join('')}</ul><div class="form-actions"><button class="btn primary" data-close>Super, je découvre</button></div>`);
}
/* Bouton « Souscrire » : paiement réel si la vente est ouverte, sinon présentation de l'offre (tout est gratuit). */
ACT.subscribe = () => (BILL.enabled && BILL.api) ? ACT.checkout() : soonSheet();
ACT.restore = async () => {
  if (!BILL.api) return toast('Paiement non configuré');
  if (!CLOUD.user) { await ACT['g-signin'](); if (!CLOUD.user) return; }
  await refreshSub(true); toast(subActive() ? 'Achat retrouvé : Wouf Plus est actif ⭐' : 'Aucun achat trouvé pour ce compte Google'); render(true);
};
function paywall(f) {
  const info = FEATURES[f] || ['⭐', 'Wouf Plus', ''];
  sheet(`<div class="sheet-head"><h2>${info[0]} ${esc(info[1])}</h2><button class="x" data-close>✕</button></div><p>${esc(info[2])}</p><p>Cette fonction fait partie de <b>Wouf Plus</b> : <b>${esc(planLine())}</b>, sans abonnement.</p>
    <ul class="bul">${Object.values(FEATURES).map(x => `<li>${esc(x[1])}</li>`).join('')}</ul>
    <div class="form-actions"><a class="btn" href="#/abo" data-close>Voir l’offre</a><button class="btn primary" data-act="subscribe">${ctaLabel()}</button></div>`);
}
ACT.paywall = ({ f }) => paywall(f);

ROUTES.abo = function abo() {
  const on = BILL.enabled, p = planOf();
  let status;
  if (!on) status = `<section class="card plus-hero"><h2>🎉 Tout est gratuit pour le moment</h2><p>Toutes les fonctions Plus sont incluses, sans limite. Wouf Plus sera proposé à <b>${esc(planLine())}</b> : profitez-en gratuitement pendant l’offre de lancement. Quoi qu’il arrive, <b>vos données resteront toujours accessibles</b>.</p><button class="btn primary big" data-act="subscribe">${ctaLabel()}</button></section>`;
  else if (subActive()) status = `<section class="card plus-hero"><h2>⭐ Wouf Plus actif à vie</h2><p>Merci de votre confiance ! Votre achat${S.sub.since ? ' du ' + fmtDate(String(S.sub.since).slice(0, 10)) : ''} est lié à votre compte Google.</p><p><b>💬 Assistance prioritaire incluse</b> : ${esc(SUP.priorityDelay || '')}.</p><a class="btn" href="#/support">Contacter l’assistance</a></section>`;
  else if (grandfathered()) status = `<section class="card plus-hero"><h2>⭐ Wouf Plus offert</h2><p>Merci d’être là depuis le début : Plus vous est offert ${!BILL.grandfatherUntil || BILL.grandfatherUntil === 'lifetime' ? 'à vie' : 'jusqu’au ' + fmtDate(BILL.grandfatherUntil)}.</p></section>`;
  else if (isFreeWindow()) status = `<section class="card plus-hero"><h2>⭐ Offre de lancement</h2><p>Wouf Plus est offert jusqu’au ${fmtDate(BILL.freeUntil)}. Ensuite : ${esc(planLine())}.</p></section>`;
  else status = `<section class="card plus-hero"><h2>${esc(p.label)}</h2><div class="big-n">${esc(p.price)}<small> ${esc(p.per)}</small></div><p>Un seul paiement, pour toujours. Toutes les nouveautés Plus incluses, assistance prioritaire comprise.</p>
    <button class="btn primary big" data-act="subscribe">${ctaLabel()}</button>${BILL.api ? '<button class="lnk" data-act="restore">J’ai déjà acheté : restaurer mon achat</button>' : ''}</section>`;
  const rw = rewardOn() && !subActive() ? (rewardEligible() ? `<section class="card reward-card"><b>🏅 Offre récompense débloquée</b><p>Vous avez terminé toutes les leçons gratuites : Wouf Plus à vie pour <b>${esc(REWARD.price)}</b> au lieu de ${esc(p.price)}${on ? '' : ' (dès l’ouverture de la vente)'}.</p>${on ? '<button class="btn primary" data-act="subscribe">Profiter de l’offre</button>' : ''}</section>` : `<section class="card note"><b>🏅 Une récompense vous attend</b><p>Terminez toutes les leçons gratuites (quiz compris) et débloquez Wouf Plus à vie pour <b>${esc(REWARD.price)}</b> au lieu de ${esc(p.price)}.</p><a class="btn sm" href="#/educ">Voir mon parcours</a></section>`) : '';
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>⭐ Wouf Plus</h1></div>${status}${rw}
  <section class="card"><h2>Ce que comprend Plus</h2>${Object.values(FEATURES).map(x => `<div class="row"><span class="ico">${x[0]}</span><span class="grow"><b>${esc(x[1])}</b><small>${esc(x[2])}</small></span>${plus() ? '<span class="pill ok">Inclus</span>' : '<span class="pill plus">Plus</span>'}</div>`).join('')}</section>
  <section class="card"><h2>Toujours gratuit</h2><ul class="bul"><li>Carnet de santé, rappels, poids, traitements, journal</li><li>1 chien + 1 chat</li><li>SOS : vétérinaires ouverts / de garde, premiers secours, toxiques</li><li>Comparateur de croquettes, dépenses, ration, sauvegarde Google et chiffrée</li><li>Éducation : les principes, ${nDog(true)} leçons chien et ${nCat(true)} leçons chat</li></ul></section>`;
};

/* ---------- Assistance ---------- */
const NAV = { mail: u => { location.href = u; } };   // indirection : remplaçable dans les tests
const FAQ = [
  ['Mes données sont-elles en sécurité ?', 'Elles restent sur votre appareil. Si vous vous connectez avec Google, elles sont aussi sauvegardées dans votre espace privé. La sauvegarde manuelle est chiffrée avec votre phrase secrète.'],
  ['Comment retrouver mon carnet sur un nouveau téléphone ?', 'Ouvrez Wouf, puis « Continuer avec Google » : tout revient automatiquement. Les documents (photos, PDF) se restaurent avec la sauvegarde chiffrée.'],
  ['Wouf Plus : est-ce un abonnement ?', 'Non, c’est un paiement unique à vie. Il est lié à votre compte Google et fonctionne sur tous vos appareils. Utilisez « Restaurer mon achat » sur un nouvel appareil.'],
  ['Le suivi GPS s’arrête quand je verrouille mon téléphone.', 'Une application web ne peut suivre le GPS que lorsque l’écran est allumé. Gardez Wouf ouvert pendant la balade ; l’écran reste allumé automatiquement quand le téléphone le permet.'],
  ['Les rappels n’arrivent pas quand l’app est fermée.', 'Une application web ne peut pas envoyer de notification app fermée. Utilisez « Ajouter les rappels à mon agenda » (Plus) : votre agenda vous alertera.'],
  ['Les horaires des vétérinaires sont-ils fiables ?', 'Ils viennent d’OpenStreetMap, une base collaborative : ils peuvent être incomplets. Appelez toujours avant de vous déplacer.'],
  ['Comment supprimer mes données ?', 'Réglages → « Supprimer toutes mes données » efface l’appareil. Pour effacer aussi votre espace Google, écrivez-nous : nous supprimons votre compte de données.'],
  ['Puis-je demander un remboursement ?', 'Consultez les conditions de vente. Écrivez-nous depuis cette page : la demande est traitée en priorité pour les membres Plus.'],
  ['Wouf remplace-t-il le vétérinaire ?', 'Non. Les conseils sont indicatifs. En cas d’urgence, contactez immédiatement un vétérinaire.']
];
ROUTES.support = function support() {
  const pr = isPriority(), email = CLOUD.user ? CLOUD.user.email : '';
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>💬 Assistance</h1></div>
  <section class="card ${pr ? 'plus-hero' : ''}"><h2>${pr ? '⭐ Assistance prioritaire' : 'Assistance'}</h2><p>${pr ? `Vos demandes sont traitées en premier : objectif de réponse <b>${esc(SUP.priorityDelay || '')}</b>.` : `Objectif de réponse : <b>${esc(SUP.standardDelay || '')}</b>. ${BILL.enabled ? 'Les membres Wouf Plus bénéficient de l’assistance prioritaire.' : 'L’assistance prioritaire est réservée aux membres Wouf Plus.'}`}</p></section>
  <section class="card"><h2>Questions fréquentes</h2>${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  <section class="card"><h2>Nous écrire</h2><div class="field"><label>Sujet</label><select id="sp-cat"><option>Problème technique</option><option>Question</option><option>Facturation / achat</option><option>Suggestion</option></select></div>
    <div class="field"><label>Votre e-mail (pour la réponse)</label><input id="sp-email" type="email" value="${esc(email)}" autocomplete="email"></div>
    <div class="field"><label>Votre message</label><textarea id="sp-msg" rows="5" placeholder="Décrivez ce qui se passe, sur quel écran…"></textarea></div>
    <label class="chk"><input type="checkbox" id="sp-diag" checked> <span>Joindre des informations techniques (version, navigateur, dernières erreurs) pour accélérer le diagnostic</span></label>
    <button class="btn primary big" data-act="support-send">Envoyer</button><p class="mut small">Aucune donnée de santé n’est jointe. ${errorLog().length ? errorLog().length + ' erreur(s) technique(s) récente(s) seront incluses.' : ''}</p></section>`;
};
ACT['support-send'] = async () => {
  const cat = $('#sp-cat').value, msg = $('#sp-msg').value.trim(), email = $('#sp-email').value.trim(), diag = $('#sp-diag').checked ? diagnostics() : '';
  if (msg.length < 10) return toast('Décrivez votre demande (10 caractères minimum)');
  if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Indiquez une adresse e-mail valide pour recevoir la réponse');
  if (BILL.api) {
    try { const j = await api('/support', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ category: cat, message: msg, email, diagnostics: diag }) }); toast(j.priority ? 'Message reçu : traitement prioritaire ⭐' : 'Message reçu, merci !'); $('#sp-msg').value = ''; return; }
    catch (e) { if (e.status && e.status !== 501 && e.status !== 404) return toast(e.message); }
  }
  const tag = isPriority() ? '[PRIORITAIRE] ' : '', body = msg + (diag ? '\n\n--- Informations techniques ---\n' + diag : '');
  if (!SUP.email) { try { await navigator.clipboard.writeText(body); } catch (e) { /* ignore */ } return toast('Assistance non configurée : message copié dans le presse-papiers'); }
  NAV.mail(`mailto:${SUP.email}?subject=${encodeURIComponent(tag + 'Wouf – ' + cat)}&body=${encodeURIComponent(body)}`);
};

/* ---------- Pages légales ---------- */
const orTbd = v => v ? esc(v) : '<em>[à compléter]</em>';
function legalDoc(kind) {
  const L = LEGAL, p = planOf();
  if (kind === 'cgv') return `<h1>Conditions générales de vente</h1><p class="mut">Wouf Plus — achat unique</p>
  <h2>1. Vendeur</h2><p>${orTbd(L.seller)} — ${orTbd(L.form)}, ${orTbd(L.address)}. SIRET : ${orTbd(L.siret)}. Contact : ${orTbd(L.email)}. ${esc(L.vat || '')}</p>
  <h2>2. Objet</h2><p>Les présentes conditions régissent la vente de l’accès à « Wouf Plus », ensemble de fonctions supplémentaires de l’application Wouf (${Object.values(FEATURES).map(f => esc(f[1])).join(', ')}). La version gratuite reste disponible sans engagement.</p>
  <h2>3. Prix et paiement</h2><p>Le prix est de <b>${esc(p.price)} TTC</b>, en un paiement unique. Il n’y a ni abonnement ni reconduction. Le paiement s’effectue par carte bancaire via la plateforme sécurisée Stripe ; le vendeur ne conserve pas vos données bancaires.</p>
  <h2>4. Accès « à vie »</h2><p>L’accès à Wouf Plus est acquis pour toute la durée d’exploitation du service. En cas d’arrêt définitif, le vendeur s’engage à informer les utilisateurs au moins ${esc(String(L.shutdownNoticeDays || 90))} jours à l’avance et à leur permettre d’exporter leurs données. Le contenu de Plus peut être enrichi ; le vendeur ne retirera pas de façon substantielle les fonctions Plus achetées.</p>
  <h2>5. Livraison et compte</h2><p>L’accès est fourni immédiatement après le paiement et est lié au compte Google utilisé lors de l’achat. Il fonctionne sur tous les appareils connectés à ce compte.</p>
  <h2>6. Droit de rétractation</h2><p>Vous disposez en principe d’un délai de 14 jours pour vous rétracter d’un achat à distance. Toutefois, pour un contenu numérique fourni sans support matériel, dont l’exécution commence immédiatement avec votre accord préalable exprès, vous renoncez à ce droit (art. L221-28 du Code de la consommation). Cet accord est recueilli avant le paiement par une case à cocher. ${esc(L.refund || '')}</p>
  <h2>7. Assistance</h2><p>Les membres Wouf Plus bénéficient de l’assistance prioritaire (objectif de réponse : ${esc(SUP.priorityDelay || '')} ; standard : ${esc(SUP.standardDelay || '')}). Il s’agit d’un objectif et non d’un délai garanti.</p>
  <h2>8. Responsabilité</h2><p>Les informations de santé et d’éducation sont fournies à titre indicatif et ne remplacent ni l’avis d’un vétérinaire ni celui d’un éducateur ou comportementaliste. En cas d’urgence, contactez immédiatement un vétérinaire. Le suivi GPS et les horaires de cliniques dépendent de sources tierces et peuvent être inexacts.</p>
  <h2>9. Données personnelles</h2><p>Voir la <a href="#/legal?doc=confidentialite">politique de confidentialité</a>.</p>
  <h2>10. Médiation et droit applicable</h2><p>Médiateur de la consommation : ${orTbd(L.mediator)}. Les présentes conditions sont soumises au droit français.</p>`;
  if (kind === 'confidentialite') return `<h1>Politique de confidentialité</h1>
  <h2>Responsable du traitement</h2><p>${orTbd(L.seller)}, ${orTbd(L.address)} — ${orTbd(L.email)}.</p>
  <h2>Données traitées</h2><ul class="bul"><li><b>Données de votre animal et du carnet</b> (fiche, soins, poids, notes, balades) : stockées sur votre appareil ; sauvegardées dans votre espace privé Google (Firebase) uniquement si vous vous connectez.</li><li><b>Compte Google</b> (adresse e-mail, nom, photo) : utilisé pour l’authentification et pour lier votre achat.</li><li><b>Paiement</b> : traité par Stripe ; nous recevons seulement la confirmation d’achat, pas votre carte.</li><li><b>Position</b> : utilisée uniquement lorsque vous lancez une recherche de vétérinaire ou une balade, et envoyée à OpenStreetMap (Overpass / Nominatim) pour la recherche de cliniques ; le tracé des balades reste dans vos données.</li><li><b>Assistance</b> : le message, l’adresse e-mail et, si vous le cochez, des informations techniques.</li></ul>
  <h2>Finalités et bases légales</h2><p>Fournir le service (exécution du contrat), sécuriser et améliorer l’application (intérêt légitime), répondre à vos demandes et gérer l’achat (contrat, obligations légales comptables).</p>
  <h2>Sous-traitants</h2><p>Google (Firebase Authentication et Firestore), Stripe (paiement), Cloudflare (relais de paiement et d’assistance), GitHub (hébergement du site), ${'OpenStreetMap Foundation (cartes / recherche)'}. Certains peuvent impliquer des transferts hors Union européenne encadrés par des garanties appropriées.</p>
  <h2>Publicité et suivi</h2><p>Aucun suivi publicitaire, aucune revente de données. Seul le stockage technique nécessaire au fonctionnement est utilisé (stockage local de l’appareil).</p>
  <h2>Durée de conservation</h2><p>Les données restent sur votre appareil jusqu’à leur suppression. Les données synchronisées sont conservées tant que votre compte de données existe ; vous pouvez demander leur suppression à tout moment. Les justificatifs d’achat sont conservés selon les obligations légales.</p>
  <h2>Vos droits</h2><p>Accès, rectification, effacement, limitation, portabilité, opposition : écrivez à ${orTbd(L.email)}. Vous pouvez saisir la CNIL (cnil.fr).</p>`;
  return `<h1>Mentions légales</h1><h2>Éditeur</h2><p>${orTbd(L.seller)} — ${orTbd(L.form)}<br>${orTbd(L.address)}<br>SIRET : ${orTbd(L.siret)}<br>Contact : ${orTbd(L.email)}<br>Directeur de la publication : ${orTbd(L.director || L.seller)}</p>
  <h2>Hébergement</h2><p>Site hébergé par GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis).</p>
  <h2>Propriété intellectuelle</h2><p>Les textes, leçons et l’identité de Wouf sont protégés. Toute reproduction sans autorisation est interdite.</p>
  <h2>Avertissement</h2><p>Wouf ne fournit pas de conseil vétérinaire.</p>`;
}
ROUTES.legal = function legal() {
  const doc = routeParam('doc') || 'mentions';
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>Informations légales</h1></div><div class="seg">${[['mentions', 'Mentions'], ['cgv', 'CGV'], ['confidentialite', 'Confidentialité']].map(([k, l]) => `<a class="${doc === k ? 'on' : ''}" href="#/legal?doc=${k}">${l}</a>`).join('')}</div><section class="card legal">${legalDoc(doc)}</section>`;
};

/* ---------- Nouveautés et mises à jour ---------- */
ROUTES.nouveautes = function nouveautes() {
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🆕 Nouveautés</h1></div>${CHANGELOG.map(c => `<section class="card"><div class="card-h"><h2>Version ${esc(c.v)}</h2><span class="mut small">${fmtDate(c.date)}</span></div><ul class="bul">${c.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></section>`).join('')}
  <div class="actions-row"><button class="btn" data-act="check-update">Rechercher une mise à jour</button></div>`;
};
function showUpdateBanner() {
  if ($('#upd')) return;
  const b = document.createElement('div'); b.id = 'upd'; b.innerHTML = '<span>✨ Nouvelle version de Wouf disponible</span><button class="btn sm primary" id="upd-go">Actualiser</button>';
  document.body.appendChild(b); $('#upd-go').onclick = () => location.reload();
}
ACT['check-update'] = async () => { try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); toast('Vous avez la dernière version (' + (CFG.version || '') + ')'); } catch (e) { toast('Impossible de vérifier (hors connexion ?)'); } };
function initUpdates() {
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) showUpdateBanner(); });
  navigator.serviceWorker.getRegistration().then(reg => { if (reg) { setInterval(() => reg.update().catch(() => {}), 3600e3); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); }); } });
  const seen = S.settings.seenVersion; if (seen && seen !== CFG.version) toast('Wouf a été mis à jour : voir les nouveautés dans « Plus »');
  if (seen !== CFG.version) { S.settings.seenVersion = CFG.version; flush(); }
}
