'use strict';
/* Wouf — exploitation et vente : achat unique « à vie » et abonnement annuel (facultatif), assistance prioritaire, pages légales,
   nouveautés, alerte de mise à jour, diagnostics. Paiement : PayPal + dossier de paiement vérifié dans l'administration (docs/MAINTENANCE.md). */

const LEGAL = CFG.legal || {}, SUP = CFG.support || {};
const planOf = () => (BILL.plans || [])[0] || { label: 'Wouf Plus', price: '', per: '' };
/* Abonnement annuel : proposé seulement s'il est activé dans config.js (billing.yearly.enabled). */
const yearlyPlan = () => BILL.yearly && BILL.yearly.enabled && /\d/.test(BILL.yearly.price || '') ? BILL.yearly : null;
const subPlan = () => S.sub && S.sub.active && S.sub.plan === 'yearly' && !grantActive() ? S.sub : null;   // abonnement annuel en cours (pas un accès offert)
const isPriority = () => subActive();
/* Adresse qui reçoit les demandes d'assistance : celle d'assistance si elle est renseignée, sinon l'e-mail de contact (mentions légales). */
const supportTo = () => SUP.email || LEGAL.email || '';
const ctaLabel = () => subActive() ? '⭐ Wouf Plus actif' : BILL.enabled ? (yearlyPlan() ? `⭐ Souscrire à Wouf+ · dès ${yearlyPlan().price} ${yearlyPlan().per}` : `⭐ Souscrire à Wouf+ · ${planOf().price} ${planOf().per === 'paiement unique' ? 'à vie' : ''}`.trim()) : '⭐ Découvrir Wouf+ (gratuit pour le moment)';
const nDog = (free) => LESSONS.filter(l => (l.sp || 'dog') === 'dog' && (free === undefined || !!l.free === free)).length, nCat = (free) => LESSONS.filter(l => l.sp === 'cat' && (free === undefined || !!l.free === free)).length;

const CHANGELOG = [
  { v: '1.19.0', date: '2026-09-30', items: ['👴 Nouvelle carte « Bien vieillir » sur l’accueil pour les chiens et chats seniors : points à surveiller, rappel des 2 bilans par an, leçon et programme dédiés', '💡 Pour un animal senior, une astuce du jour sur deux lui est consacrée', '📚 Les e-books se lisent directement dans Wouf, même sans connexion'] },
  { v: '1.18.0', date: '2026-09-30', items: ['📚 Deux e-books complets : « Le guide de survie du propriétaire » (gratuit : urgences, premiers secours, dangers de la maison) et « Le grand guide santé et bien-être » (Wouf Plus : 12 chapitres, du premier jour aux années senior)', '📖 Lecture par chapitres avec sommaire, et enregistrement en PDF'] },
  { v: '1.17.1', date: '2026-09-30', items: ['📚 Nouveau menu « E-books » sur l’accueil : e-books gratuits et e-books Wouf Plus, ouverture en un appui'] },
  { v: '1.17.0', date: '2026-09-30', items: ['🏠 Accueil plus clair : astuce du jour, rappels en bandeaux, score et poids en widgets dépliables, raccourcis compacts', '📍 Météo des balades : votre ville ou votre position est retenue, mise à jour automatique', '🎓 Leçons Plus rangées par catégorie en menu déroulant, accès direct aux guides PDF', '💡 50 astuces « Le saviez-vous ? » pour le chien et 50 pour le chat'] },
  { v: '1.16.0', date: '2026-09-30', items: ['🌦️ Météo des balades sur l’accueil : verdict du moment, alertes (orage, chaleur, bitume brûlant, froid, vent) et meilleure heure pour sortir'] },
  { v: '1.15.0', date: '2026-09-30', items: ['📚 Nouveau : Guides (erreurs à éviter, points d’attention, urgences), à lire dans l’app ou en PDF', '🔒 Synchronisation Google chiffrée avec une phrase secrète (optionnel)'] },
  { v: '1.14.0', date: '2026-09-30', items: ['Nouveau : le test express « dangereux ou OK ? » : 8 aliments, 1 minute, sans compte, avec partage de votre score'] },
  { v: '1.11.0', date: '2026-09-30', items: ['🌐 Nouvelle adresse : woufapp.fr', '📦 Transfert du carnet depuis l’ancienne adresse'] },
  { v: '1.10.0', date: '2026-09-29', items: ['🐾 Le parcours d’éducation devient un chemin d’empreintes de pattes : chaque leçon validée dore une empreinte.', '🦴 Les points deviennent des os à gagner : +10 par séance, +70 par leçon validée au quiz.', '✏️ Nouveau style des réponses du quiz (A, B, C).'] },
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

/* Achats : Wouf Plus est activé par l'administration (wouf_grants, relu à chaque connexion Google : admin.js). */

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
  guides: ['📚', 'E-book « Le grand guide santé et bien-être »', 'Le guide complet, à lire dans Wouf : arrivée d’un chiot ou d’un chaton, vaccins, parasites, alimentation et poids, hygiène, comportement, saisons, années senior, voyages, et les erreurs à éviter (chien et chat). Le « Guide de survie du propriétaire » (urgences, premiers secours, dangers) reste gratuit.'],
  support: ['💬', 'Assistance prioritaire', 'Vos demandes sont traitées en premier, ' + (SUP.priorityDelay || 'sous 24 h ouvrées') + '.']
};
const planLine = () => { const p = planOf(), y = yearlyPlan(); return y ? `${y.price} ${y.per} ou ${p.price} à vie` : `${p.price} ${p.per}`; };
const noSubText = () => yearlyPlan() ? '' : ', sans abonnement';

/* ---------- Relais d'activation automatique (billing-worker) : statut d'achat lu avec le jeton Google ---------- */
async function api(path, opt = {}) {
  const r = await fetch(BILL.api.replace(/\/$/, '') + path, opt); const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Erreur ' + r.status); e.status = r.status; throw e; } return j;
}
async function authHeaders() { const tok = CLOUD.user ? await CloudApi.token().catch(() => null) : null; return tok ? { Authorization: 'Bearer ' + tok } : {}; }
function applySub(j) {
  // Abonnement : `until` = fin de l'accès (période payée + tolérance du relais), `periodEnd` = date de renouvellement affichée.
  S.sub = j && j.active ? { active: true, lifetime: !!j.lifetime, plan: j.plan || 'lifetime', since: j.since || '', ...(j.lifetime ? {} : { until: (j.accessUntil || j.until || '') + 'T23:59:59Z', periodEnd: j.until || '', cancelled: !!j.cancelled }), checked: Date.now() } : { active: false, checked: Date.now() };
  save();
}
async function refreshSub(force) {
  if (!BILL.api && typeof remoteRefresh === 'function' && remoteRefresh.p) await remoteRefresh.p;   // réglages de vente (adresse du relais) pas encore arrivés
  refreshSub.err = '';
  if (!BILL.api) return;
  try {
    if (!CLOUD.user) { const u = await CloudApi.restore().catch(() => null); if (u) CLOUD.user = u; }
    if (!CLOUD.user) return;
    // Tant que l'accès n'est pas actif on revérifie à CHAQUE demande (un paiement peut arriver à tout moment) ; une fois actif, toutes les heures (remboursement).
    if (force || !S.sub || !S.sub.active || Date.now() - (S.sub.checked || 0) > 36e5) applySub(await api('/status', { headers: await authHeaders() }));
  } catch (e) { refreshSub.err = e && e.message || 'erreur réseau'; /* hors ligne ou relais indisponible : on garde l'état connu */ }
}
/* Retour dans l'app (onglet ou application rouverte) : si l'accès n'est pas actif, on redemande au relais (au plus toutes les 20 s). */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !BILL.api || !CLOUD.user || subActive() || Date.now() - (refreshSub.last || 0) < 20e3) return;
  refreshSub.last = Date.now(); refreshSub(true).then(() => { if (subActive()) render(true); });
});
ACT.restore = async () => {
  if (!BILL.api) return toast('Vérification automatique indisponible : écrivez-nous depuis « Une question ? »');
  if (!CLOUD.user) { await ACT['g-signin'](); if (!CLOUD.user) return; }
  await Promise.all([refreshSub(true), typeof accountSync === 'function' ? accountSync() : null]);   // achat détecté par le relais ET accès accordé par l'éditeur
  if (subActive()) { toast('Accès retrouvé : Wouf Plus est actif ⭐'); return render(true); }
  render(true);
  // Message précis : erreur de vérification, ou « aucun paiement pour CE compte Google » (cas d'un paiement fait avec un autre compte).
  sheet(refreshSub.err
    ? `<div class="sheet-head"><h2>Vérification impossible</h2><button class="x" data-close>✕</button></div><p>Le service de vérification n’a pas répondu (<b>${esc(refreshSub.err)}</b>). Vérifiez votre connexion internet puis réessayez dans un instant.</p><div class="form-actions"><button class="btn primary" data-close>OK</button></div>`
    : `<div class="sheet-head"><h2>Aucun paiement trouvé</h2><button class="x" data-close>✕</button></div><p>Aucun paiement Wouf Plus n’est enregistré pour le compte Google <b>${esc(CLOUD.user.email || '')}</b>.</p>
       <ul class="bul"><li>Vous avez payé <b>il y a moins de 5 minutes</b> ? Patientez un instant puis réessayez.</li><li>Vous avez payé avec <b>un autre compte Google</b> ? Déconnectez-vous (Réglages), puis reconnectez-vous avec le compte utilisé lors de l’achat.</li><li>Toujours rien ? Écrivez-nous depuis « Une question ? » avec l’e-mail de ce compte et celui de votre compte PayPal.</li></ul>
       <div class="form-actions"><a class="btn" href="#/reglages" data-close>Réglages</a><button class="btn primary" data-close>OK</button></div>`);
};
/* Activation automatique possible : relais + compte Google identifié + paiement construit par l'app (adresse PayPal, pas un lien fixe). */
const autoOn = () => !!(BILL.api && CLOUD.user && CLOUD.user.uid && PAYEE.test(BILL.payee || ''));

/* Paiement PayPal, de préférence vers l'adresse PayPal choisie dans l'administration (BILL.payee, modifiable à tout moment) :
   l'app construit elle-même la page de paiement PayPal (montant, référence du dossier, retour sur #/merci). À défaut : lien PayPal fixe.
   Avant d'être redirigé, l'acheteur remplit un « dossier de paiement » (nom, prénom et e-mail PayPal,
   e-mail de contact) enregistré dans wouf_orders : l'administration compare avec l'e-mail de PayPal puis active Wouf Plus. */
const PAY_LINK = /^https:\/\/(www\.)?paypal\.(com|me|biz)\/[\w./-]+$/i;
const PAYEE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const payReady = () => !!(PAYEE.test(BILL.payee || '') || BILL.paymentLink);
const rewardBuyable = () => rewardActive() && !!(PAYEE.test(BILL.payee || '') || BILL.rewardLink);
function paypalUrl(payee, price, ref, reward, uid) {
  const home = (typeof SITE !== 'undefined' && SITE.home) || location.origin + location.pathname, auto = !!(uid && BILL.api);
  const q = new URLSearchParams({ cmd: '_xclick', business: payee, item_name: 'Wouf Plus à vie' + (reward ? ' (offre récompense)' : ''), item_number: ref, invoice: ref, custom: auto ? uid + '|' + ref : ref, ...(auto ? { notify_url: BILL.api.replace(/\/$/, '') + '/ipn' } : {}),
    amount: String(price).replace(/[^\d,.]/g, '').replace(',', '.'), currency_code: 'EUR', no_shipping: '1', lc: 'FR', charset: 'utf-8', return: home + '#/merci', cancel_return: home + '#/abo' });
  return 'https://www.paypal.com/cgi-bin/webscr?' + q;
}
/* Abonnement annuel PayPal (bouton « _xclick-subscriptions ») : prélevé chaque année jusqu'à résiliation.
   custom = « compte|référence|y » : le relais prolonge l'accès d'un an à chaque paiement (voir billing-worker). */
function paypalSubUrl(payee, price, ref, uid) {
  const home = (typeof SITE !== 'undefined' && SITE.home) || location.origin + location.pathname, auto = !!(uid && BILL.api);
  const q = new URLSearchParams({ cmd: '_xclick-subscriptions', business: payee, item_name: 'Wouf Plus annuel', item_number: ref, invoice: ref, custom: auto ? uid + '|' + ref + '|y' : ref, ...(auto ? { notify_url: BILL.api.replace(/\/$/, '') + '/ipn' } : {}),
    a3: String(price).replace(/[^\d,.]/g, '').replace(',', '.'), p3: '1', t3: 'Y', src: '1', sra: '1', no_note: '1', no_shipping: '1', currency_code: 'EUR', lc: 'FR', charset: 'utf-8', return: home + '#/merci', cancel_return: home + '#/abo' });
  return 'https://www.paypal.com/cgi-bin/webscr?' + q;
}
const yearlyBuyable = () => !!(yearlyPlan() && PAYEE.test(BILL.payee || ''));   // l'abonnement exige l'adresse PayPal (pas de lien fixe)
const pickedPlan = () => { const r = document.querySelector('input[name=buy-plan]:checked'); return r ? r.value : 'lifetime'; };
function consentText(plan) {
  const act = autoOn() ? 'Je comprends que Wouf Plus est activé dès que PayPal confirme mon paiement (en général en quelques instants ; en cas de souci, à la main par l’éditeur, au plus tard sous 24 h).' : 'Je comprends que Wouf Plus est activé <b>manuellement</b> par l’éditeur après vérification de mon paiement (au plus tard sous 24 h).';
  const y = yearlyPlan();
  return `J’ai lu les <a href="#/legal?doc=cgv" data-close>conditions de vente</a>. ${plan === 'yearly' && y ? `Je souscris un <b>abonnement annuel à ${esc(y.price)}</b>, reconduit automatiquement chaque année jusqu’à résiliation. Je peux résilier à tout moment depuis Wouf (Wouf Plus → « Gérer mon abonnement ») ou mon compte PayPal ; l’accès reste actif jusqu’à la fin de l’année payée. ` : ''}${act} Je demande l’exécution du service dès cette activation et je reconnais perdre mon droit de rétractation de 14 jours dès que l’accès est fourni.`;
}
function buySheet() {
  const p = planOf(), rw = rewardBuyable(), price = rw ? REWARD.price : p.price, u = CLOUD.user || {}, nm = String(u.name || '').split(' '), y = yearlyBuyable() ? yearlyPlan() : null;
  const def = y && !rw ? 'yearly' : 'lifetime';
  const el = sheet(`<div class="sheet-head"><h2>⭐ ${esc(y ? 'Wouf Plus' : p.label)}</h2><button class="x" data-close>✕</button></div>
    ${y ? `<div class="plan-pick" role="radiogroup" aria-label="Formule">
      <label class="plan-opt"><input type="radio" name="buy-plan" value="yearly" ${def === 'yearly' ? 'checked' : ''}><span class="grow"><b>Annuel</b><small>Renouvelé chaque année, résiliable à tout moment</small></span><b class="pp">${esc(y.price)}<small> ${esc(y.per)}</small></b></label>
      <label class="plan-opt"><input type="radio" name="buy-plan" value="lifetime" ${def === 'lifetime' ? 'checked' : ''}><span class="grow"><b>À vie</b><small>${rw ? '🏅 Offre récompense · ' : ''}Un seul paiement, pour toujours</small></span><b class="pp">${rw ? `<s>${esc(p.price)}</s> ` : ''}${esc(price)}</b></label></div>`
    : `${rw ? `<p class="center reward-tag">🏅 Offre récompense : toutes les leçons gratuites terminées</p><div class="price-cut center"><s>${esc(p.price)}</s> <b>${esc(price)}</b></div>` : `<div class="big-n center">${esc(p.price)}<small> ${esc(p.per)}</small></div>`}
    <p class="center mut">Un seul paiement, pour toujours. Aucun abonnement, aucune reconduction.</p>`}
    <ul class="bul">${Object.values(FEATURES).map(x => `<li><b>${esc(x[1])}</b></li>`).join('')}</ul>
    <h3>🧾 Votre dossier de paiement</h3><p class="mut small">Ces informations nous permettent de retrouver votre paiement PayPal et d’activer Wouf Plus sur votre compte Google <b>${esc(u.email || '')}</b>.</p>
    <div class="field"><label>Prénom (tel qu’affiché sur PayPal)</label><input id="buy-first" autocomplete="given-name" value="${esc(nm[0] || '')}"></div>
    <div class="field"><label>Nom (tel qu’affiché sur PayPal)</label><input id="buy-last" autocomplete="family-name" value="${esc(nm.slice(1).join(' '))}"></div>
    <div class="field"><label>E-mail de votre compte PayPal</label><input id="buy-paypal" type="email" autocomplete="email" value="${esc(u.email || '')}"></div>
    <div class="field"><label>E-mail pour vous répondre</label><input id="buy-contact" type="email" autocomplete="email" value="${esc(u.email || '')}"></div>
    <label class="chk consent"><input type="checkbox" id="buy-consent"> <span id="buy-terms">${consentText(def)}</span></label>
    <div class="form-actions"><button class="btn primary big" data-act="buy-go" id="buy-btn">${def === 'yearly' ? `S’abonner : ${esc(y.price)} ${esc(y.per)} avec PayPal` : `Payer ${esc(price)} avec PayPal`}</button></div>
    <p class="mut small center">Paiement sécurisé par PayPal (compte PayPal ou carte bancaire). ${autoOn() ? '<b>Activation automatique</b> sur votre compte Google dès que PayPal confirme le paiement, en général en quelques instants.' : '<b>L’activation n’est pas instantanée</b> : elle est faite à la main après vérification de votre paiement, au plus tard sous 24 h, sur votre compte Google.'}</p>`);
  if (y) el.addEventListener('change', e => {   // changement de formule : texte d'engagement et bouton adaptés (la case doit être recochée)
    if (e.target.name !== 'buy-plan') return; const pl = pickedPlan();
    $('#buy-terms').innerHTML = consentText(pl); $('#buy-consent').checked = false;
    $('#buy-btn').textContent = pl === 'yearly' ? `S’abonner : ${y.price} ${y.per} avec PayPal` : `Payer ${price} avec PayPal`;
  });
  return el;
}
ACT.checkout = async () => {
  await remoteRefresh();   // toujours la dernière adresse PayPal choisie par l'administration
  if (!payReady()) return toast('Paiement non configuré');
  if (!CLOUD.user) { toast('Connectez-vous avec Google : votre achat sera lié à votre compte'); await ACT['g-signin'](); if (!CLOUD.user) return; }
  closeAllSheets(); buySheet();
};
ACT['buy-go'] = async () => {
  const v = id => ($('#' + id).value || '').trim(), mail = x => /^\S+@\S+\.\S+$/.test(x);
  const o = { firstName: v('buy-first').slice(0, 80), lastName: v('buy-last').slice(0, 80), paypalEmail: v('buy-paypal').slice(0, 160), contactEmail: v('buy-contact').slice(0, 160) };
  if (!o.firstName || !o.lastName) return toast('Indiquez le prénom et le nom de votre compte PayPal');
  if (!mail(o.paypalEmail) || !mail(o.contactEmail)) return toast('Vérifiez les adresses e-mail');
  if (!$('#buy-consent').checked) return toast('Cochez la case pour continuer');
  await remoteRefresh();
  const yearly = pickedPlan() === 'yearly' && yearlyBuyable(), reward = !yearly && rewardBuyable();
  const price = yearly ? yearlyPlan().price : reward ? REWARD.price : planOf().price, payee = PAYEE.test(BILL.payee || '') ? BILL.payee : '';
  const ref = 'WOUF-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  const auto = !!(payee && autoOn()), uid = auto ? CLOUD.user.uid : '';
  const link = yearly ? paypalSubUrl(payee, price, ref, uid) : payee ? paypalUrl(payee, price, ref, reward, uid) : (reward ? BILL.rewardLink : BILL.paymentLink);
  Object.assign(o, { ref, payee, auto, googleEmail: CLOUD.user.email || '', name: CLOUD.user.name || '', offer: yearly ? 'yearly' : reward ? 'reward' : 'lifetime', price, lessons: lessonsDone(), status: 'pending', at: Date.now(), version: CFG.version || '' });
  let id; try { toast('Enregistrement de votre dossier…'); id = await AdminApi.createOrder(o); } catch (e) { return toast('Impossible d’enregistrer votre dossier (connexion internet ?). Réessayez.'); }
  try { localStorage.setItem('wouf:paid', JSON.stringify({ id, ref, at: o.at, email: o.googleEmail, paypal: o.paypalEmail, price: o.price })); } catch (e) { /* ignore */ }
  toast('Redirection vers PayPal…'); NAV.go(link);
};
function soonSheet() {
  sheet(`<div class="sheet-head"><h2>⭐ Wouf+ : ${esc(planLine())}</h2><button class="x" data-close>✕</button></div>
    <p><b>🎉 Bonne nouvelle : pour le moment, tout est offert.</b> Toutes les fonctions de Wouf Plus sont déjà débloquées sur votre appareil, sans limite.</p>
    <p>La souscription à <b>${esc(planLine())}</b>${noSubText()}, avec assistance prioritaire, ouvrira bientôt. Vos données resteront toujours accessibles.</p>
    <ul class="bul">${Object.values(FEATURES).map(x => `<li>${esc(x[1])}</li>`).join('')}</ul><div class="form-actions"><button class="btn primary" data-close>Super, je découvre</button></div>`);
}
/* Bouton « Souscrire » : paiement si la vente est ouverte, sinon présentation de l'offre (tout est gratuit). */
ACT.subscribe = () => (BILL.enabled && payReady()) ? ACT.checkout() : soonSheet();
/* Retour de PayPal : l'activation est faite par l'administration après vérification du dossier. */
ROUTES.merci = function merci() {
  let p = null; try { p = JSON.parse(localStorage.getItem('wouf:paid') || 'null'); } catch (e) { /* ignore */ }
  const who = `${p && p.email ? ` (<b>${esc(p.email)}</b>)` : ''}`, ref = p && p.ref ? `, référence <b>${esc(p.ref)}</b>` : '';
  const wait = autoOn()
    ? `<p>⏳ <b>PayPal confirme votre paiement…</b> Wouf Plus s’active <b>automatiquement</b> sur votre compte Google${who}, en général en quelques secondes. Cette page se met à jour toute seule.</p><p class="mut">Rien au bout de quelques minutes ? L’activation sera alors faite à la main, au plus tard sous 24 h${ref}. Écrivez-nous depuis « Une question ? » avec le nom ou l’e-mail utilisé pour payer.</p>`
    : `<p>Merci ! <b>Votre activation est faite manuellement</b> : Wouf Plus sera activé <b>au plus tard sous 24 h</b> sur votre compte Google${who}, après vérification de votre paiement PayPal${p && p.paypal ? ` (<b>${esc(p.paypal)}</b>)` : ''}${ref}. PayPal vous envoie un reçu par e-mail.</p><p class="mut">Restez connecté(e) avec ce compte : l’activation apparaît à l’ouverture de l’app. Pas activé après 24 h ? Écrivez-nous depuis « Une question ? » en indiquant le nom ou l’e-mail utilisé pour payer.</p>`;
  return `<div class="page-h"><a class="back" href="#/home">‹</a><h1>🎉 Merci !</h1></div><section class="card plus-hero"><h2>${subActive() ? 'Wouf Plus est activé' : 'Paiement en cours'}</h2>
    ${subActive() ? '<p><b>Wouf Plus est actif ⭐</b> Merci et bonne découverte !</p>' : wait}
    ${!subActive() && BILL.api ? '<button class="btn" data-act="restore">🔄 Vérifier mon accès maintenant</button>' : ''}
    <a class="btn primary" href="#/home">Retour à l’accueil</a> <a class="btn" href="#/support">Une question ?</a></section>`;
};
/* Attente de la confirmation PayPal : on interroge le relais toutes les 4 s pendant 3 minutes, la page se met à jour toute seule. */
ROUTES.merci.after = () => {
  if (subActive() || !BILL.api || ROUTES.merci.timer) return;
  let n = 0; ROUTES.merci.timer = setInterval(async () => {
    if (routeName() !== 'merci' || ++n > 45) { clearInterval(ROUTES.merci.timer); ROUTES.merci.timer = null; return; }
    await refreshSub(true); if (subActive()) { clearInterval(ROUTES.merci.timer); ROUTES.merci.timer = null; render(true); celebrate && celebrate('⭐ Wouf Plus est activé !', 'Merci pour votre soutien'); }
  }, 4000);
};
function paywall(f) {
  const info = FEATURES[f] || ['⭐', 'Wouf Plus', ''];
  sheet(`<div class="sheet-head"><h2>${info[0]} ${esc(info[1])}</h2><button class="x" data-close>✕</button></div><p>${esc(info[2])}</p><p>Cette fonction fait partie de <b>Wouf Plus</b> : <b>${esc(planLine())}</b>${noSubText()}.</p>
    <ul class="bul">${Object.values(FEATURES).map(x => `<li>${esc(x[1])}</li>`).join('')}</ul>
    <div class="form-actions"><a class="btn" href="#/abo" data-close>Voir l’offre</a><button class="btn primary" data-act="subscribe">${ctaLabel()}</button></div>`);
}
ACT.paywall = ({ f }) => paywall(f);

/* ---------- Abonnement annuel : gestion et résiliation (depuis l'app, en quelques appuis) ----------
   La résiliation enregistre une demande auprès de l'éditeur (relais d'assistance, ou e-mail) ET propose de l'arrêter
   aussitôt dans PayPal. L'accès reste actif jusqu'à la fin de la période payée. */
const paypalCancelUrl = () => PAYEE.test(BILL.payee || '') ? 'https://www.paypal.com/cgi-bin/webscr?cmd=_subscr-find&alias=' + encodeURIComponent(BILL.payee) : 'https://www.paypal.com/myaccount/autopay/';
ACT['sub-manage'] = () => {
  const s = subPlan(); if (!s) return;
  const end = s.periodEnd ? fmtDate(s.periodEnd) : '', y = yearlyPlan();
  sheet(`<div class="sheet-head"><h2>Mon abonnement</h2><button class="x" data-close>✕</button></div>
    <p><b>Wouf Plus annuel</b>${y ? ' · ' + esc(y.price) + ' ' + esc(y.per) : ''}</p>
    <p>${s.cancelled ? `Résilié : Wouf Plus reste actif jusqu’au <b>${esc(end)}</b>, sans nouveau prélèvement.` : `Prochain renouvellement : <b>${esc(end)}</b>. Vous recevrez un rappel par e-mail avant cette date.`}</p>
    ${s.cancelled ? '' : `<h3>Résilier</h3><p class="mut">La résiliation arrête les prochains prélèvements. Wouf Plus reste actif jusqu’au ${esc(end)}, et vos données ne sont jamais supprimées.</p>
    <div class="form-actions"><button class="btn danger" data-act="sub-cancel">Résilier mon abonnement</button></div>`}
    <p class="mut small">Vous pouvez aussi gérer l’abonnement dans votre compte PayPal : Paramètres → Paiements → Gérer les paiements automatiques.</p>`);
};
ACT['sub-cancel'] = async () => {
  const s = subPlan(); if (!s) return;
  const end = s.periodEnd ? fmtDate(s.periodEnd) : '';
  if (!(await ask(`Résilier votre abonnement Wouf Plus annuel ? Il restera actif jusqu’au ${end}.`, 'Résilier', true))) return;
  const email = (CLOUD.user && CLOUD.user.email) || '', msg = `Demande de résiliation de l’abonnement Wouf Plus annuel.\nCompte Google : ${email}\nFin de la période payée : ${end}`;
  let sent = false;
  if (BILL.api && /^\S+@\S+\.\S+$/.test(email)) { try { await api('/support', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ category: 'Résiliation', message: msg, email, diagnostics: '' }) }); sent = true; } catch (e) { sent = false; } }
  if (!sent && supportTo()) NAV.mail(`mailto:${supportTo()}?subject=${encodeURIComponent('Wouf – Résiliation de mon abonnement')}&body=${encodeURIComponent(msg)}`);
  closeAllSheets();
  sheet(`<div class="sheet-head"><h2>Résiliation enregistrée</h2><button class="x" data-close>✕</button></div>
    <p>${sent ? '✅ Votre demande de résiliation est enregistrée : l’éditeur arrête le prélèvement et vous confirme la résiliation par e-mail.' : 'Votre messagerie s’ouvre avec la demande de résiliation : envoyez-la pour qu’elle soit enregistrée.'}</p>
    <p><b>Pour l’arrêter tout de suite vous-même</b>, confirmez aussi dans PayPal (bouton ci-dessous). Wouf Plus reste actif jusqu’au <b>${esc(end)}</b>.</p>
    <div class="form-actions"><a class="btn primary" href="${esc(paypalCancelUrl())}" target="_blank" rel="noopener">Arrêter le prélèvement dans PayPal</a><button class="btn" data-close>Fermer</button></div>`);
};

ROUTES.abo = function abo() {
  const on = BILL.enabled, p = planOf();
  let status;
  if (!on) status = `<section class="card plus-hero"><h2>🎉 Tout est gratuit pour le moment</h2><p>Toutes les fonctions Plus sont incluses, sans limite. Wouf Plus sera proposé à <b>${esc(planLine())}</b> : profitez-en gratuitement pendant l’offre de lancement. Quoi qu’il arrive, <b>vos données resteront toujours accessibles</b>.</p><button class="btn primary big" data-act="subscribe">${ctaLabel()}</button></section>`;
  else if (subPlan()) { const s = subPlan(), end = s.periodEnd ? fmtDate(s.periodEnd) : '';
    status = `<section class="card plus-hero"><h2>⭐ Wouf Plus annuel</h2><p>${s.cancelled ? `<b>Abonnement résilié</b> : aucun nouveau prélèvement. Wouf Plus reste actif jusqu’au <b>${esc(end)}</b>.` : `Actif jusqu’au <b>${esc(end)}</b>, puis renouvelé automatiquement pour un an${yearlyPlan() ? ' (' + esc(yearlyPlan().price) + ')' : ''}.`}</p><p>Votre accès est lié à votre compte Google : il vous suit sur tous vos appareils. <b>💬 Assistance prioritaire incluse.</b></p>
      <button class="btn" data-act="sub-manage">Gérer mon abonnement</button> <a class="btn" href="#/support">Contacter l’assistance</a></section>`; }
  else if (subActive()) status = `<section class="card plus-hero"><h2>⭐ Wouf Plus actif à vie</h2><p>Merci de votre confiance ! Votre accès est lié à votre compte Google : il vous suit sur tous vos appareils.</p><p><b>💬 Assistance prioritaire incluse</b> : ${esc(SUP.priorityDelay || '')}.</p><a class="btn" href="#/support">Contacter l’assistance</a></section>`;
  else if (grandfathered()) status = `<section class="card plus-hero"><h2>⭐ Wouf Plus offert</h2><p>Merci d’être là depuis le début : Plus vous est offert ${!BILL.grandfatherUntil || BILL.grandfatherUntil === 'lifetime' ? 'à vie' : 'jusqu’au ' + fmtDate(BILL.grandfatherUntil)}.</p></section>`;
  else if (isFreeWindow()) status = `<section class="card plus-hero"><h2>⭐ Offre de lancement</h2><p>Wouf Plus est offert jusqu’au ${fmtDate(BILL.freeUntil)}. Ensuite : ${esc(planLine())}.</p></section>`;
  else if (yearlyPlan()) status = `<section class="card plus-hero"><h2>Wouf Plus</h2><div class="plan-duo"><div><b>Annuel</b><div class="big-n">${esc(yearlyPlan().price)}<small> ${esc(yearlyPlan().per)}</small></div><small>Résiliable à tout moment</small></div><div><b>À vie</b><div class="big-n">${esc(p.price)}</div><small>Un seul paiement</small></div></div><p>Toutes les nouveautés Plus incluses, assistance prioritaire comprise.</p>
    <button class="btn primary big" data-act="subscribe">${ctaLabel()}</button>${BILL.api ? '<button class="lnk" data-act="restore">J’ai déjà payé : vérifier mon accès</button>' : ''}</section>`;
  else status = `<section class="card plus-hero"><h2>${esc(p.label)}</h2><div class="big-n">${esc(p.price)}<small> ${esc(p.per)}</small></div><p>Un seul paiement, pour toujours. Toutes les nouveautés Plus incluses, assistance prioritaire comprise.</p>
    <button class="btn primary big" data-act="subscribe">${ctaLabel()}</button>${BILL.api ? '<button class="lnk" data-act="restore">J’ai déjà payé : vérifier mon accès</button>' : ''}</section>`;
  const rw = rewardOn() && !subActive() ? (rewardEligible() ? `<section class="card reward-card"><b>🏅 Offre récompense débloquée</b><p>Vous avez terminé toutes les leçons gratuites : Wouf Plus à vie pour <b>${esc(REWARD.price)}</b> au lieu de ${esc(p.price)}${on ? '' : ' (dès l’ouverture de la vente)'}.</p>${on ? '<button class="btn primary" data-act="subscribe">Profiter de l’offre</button>' : ''}</section>` : `<section class="card note"><b>🏅 Une récompense vous attend</b><p>Terminez toutes les leçons gratuites (quiz compris) et débloquez Wouf Plus à vie pour <b>${esc(REWARD.price)}</b> au lieu de ${esc(p.price)}.</p><a class="btn sm" href="#/educ">Voir mon parcours</a></section>`) : '';
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>⭐ Wouf Plus</h1></div>${status}${rw}
  <section class="card"><h2>Ce que comprend Plus</h2>${Object.values(FEATURES).map(x => `<div class="row"><span class="ico">${x[0]}</span><span class="grow"><b>${esc(x[1])}</b><small>${esc(x[2])}</small></span>${plus() ? '<span class="pill ok">Inclus</span>' : '<span class="pill plus">Plus</span>'}</div>`).join('')}</section>
  <section class="card"><h2>Toujours gratuit</h2><ul class="bul"><li>Carnet de santé, rappels, poids, traitements, journal</li><li>1 chien + 1 chat</li><li>SOS : vétérinaires ouverts / de garde, premiers secours, toxiques</li><li>Comparateur de croquettes, dépenses, ration, sauvegarde Google et chiffrée</li><li>Éducation : les principes, ${nDog(true)} leçons chien et ${nCat(true)} leçons chat</li></ul></section>`;
};

/* ---------- Assistance ---------- */
const NAV = { mail: u => { location.href = u; }, go: u => { location.href = u; } };   // indirection : remplaçable dans les tests
const FAQ = [
  ['Mes données sont-elles en sécurité ?', 'Elles restent sur votre appareil. Si vous vous connectez avec Google, elles sont aussi sauvegardées dans votre espace privé. La sauvegarde manuelle est chiffrée avec votre phrase secrète.'],
  ['Comment retrouver mon carnet sur un nouveau téléphone ?', 'Ouvrez Wouf, puis « Continuer avec Google » : tout revient automatiquement. Les documents (photos, PDF) se restaurent avec la sauvegarde chiffrée.'],
  ['Wouf Plus : est-ce un abonnement ?', 'Non, c’est un paiement unique à vie. Il est lié à votre compte Google et fonctionne sur tous vos appareils. Sur un nouvel appareil, connectez-vous avec le même compte Google.'],
  ['J’ai payé : quand Wouf Plus sera-t-il actif ?', 'L’activation est faite à la main après vérification de votre paiement PayPal, au plus tard sous 24 h (souvent bien plus vite). Restez connecté avec le même compte Google : l’accès apparaît à l’ouverture de l’app. Toujours rien après 24 h ? Écrivez-nous ci-dessous avec le nom et l’e-mail utilisés pour payer.'],
  ['Le suivi GPS s’arrête quand je verrouille mon téléphone.', 'Une application web ne peut suivre le GPS que lorsque l’écran est allumé. Gardez Wouf ouvert pendant la balade ; l’écran reste allumé automatiquement quand le téléphone le permet.'],
  ['Les rappels n’arrivent pas quand l’app est fermée.', 'Une application web ne peut pas envoyer de notification app fermée. Utilisez « Ajouter les rappels à mon agenda » (Plus) : votre agenda vous alertera.'],
  ['Les horaires des vétérinaires sont-ils fiables ?', 'Ils viennent d’OpenStreetMap, une base collaborative : ils peuvent être incomplets. Appelez toujours avant de vous déplacer.'],
  ['Comment supprimer mes données ?', 'Réglages → « Supprimer toutes mes données » efface l’appareil. Pour effacer aussi votre espace Google, écrivez-nous : nous supprimons votre compte de données.'],
  ['Puis-je demander un remboursement ?', 'Consultez les conditions de vente. Écrivez-nous depuis cette page : la demande est traitée en priorité pour les membres Plus.'],
  ['Wouf remplace-t-il le vétérinaire ?', 'Non. Les conseils sont indicatifs. En cas d’urgence, contactez immédiatement un vétérinaire.']
];
/* FAQ : la réponse sur l'abonnement suit l'offre réellement proposée. */
const faqList = () => FAQ.map(([q, a]) => q.startsWith('Wouf Plus : est-ce un abonnement') && yearlyPlan()
  ? [q, `Au choix : un abonnement annuel (${yearlyPlan().price} par an, résiliable à tout moment depuis Wouf Plus → « Gérer mon abonnement ») ou un paiement unique à vie (${planOf().price}). Dans les deux cas, l’accès est lié à votre compte Google et fonctionne sur tous vos appareils.`] : [q, a]);
ROUTES.support = function support() {
  const pr = isPriority(), email = CLOUD.user ? CLOUD.user.email : '';
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>💬 Assistance</h1></div>
  <section class="card ${pr ? 'plus-hero' : ''}"><h2>${pr ? '⭐ Assistance prioritaire' : 'Assistance'}</h2><p>${pr ? `Vos demandes sont traitées en premier : objectif de réponse <b>${esc(SUP.priorityDelay || '')}</b>.` : `Objectif de réponse : <b>${esc(SUP.standardDelay || '')}</b>. ${BILL.enabled ? 'Les membres Wouf Plus bénéficient de l’assistance prioritaire.' : 'L’assistance prioritaire est réservée aux membres Wouf Plus.'}`}</p></section>
  <section class="card"><h2>Questions fréquentes</h2>${faqList().map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
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
  if (BILL.api) {   // vrai envoi depuis l'app (aucune messagerie à ouvrir) ; en cas de panne du relais, repli sur l'e-mail
    try {
      const j = await api('/support', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ category: cat, message: msg, email, diagnostics: diag }) });
      $('#sp-msg').value = ''; if (j.activated) { try { await refreshSub(true); } catch (e) { /* le statut se mettra à jour à la prochaine ouverture */ } render(true); return toast('Paiement retrouvé : Wouf Plus est activé sur votre compte ✅'); }
      return toast(j.priority ? 'Message envoyé : traitement prioritaire ⭐ Réponse par e-mail.' : 'Message envoyé ✓ Nous vous répondons par e-mail.');
    } catch (e) { if (e.status === 400 || e.status === 429) return toast(e.message); toast('Envoi impossible pour le moment : votre messagerie va s’ouvrir à la place'); }
  }
  const tag = isPriority() ? '[PRIORITAIRE] ' : '', body = msg + (diag ? '\n\n--- Informations techniques ---\n' + diag : '');
  if (!supportTo()) { try { await navigator.clipboard.writeText(body); } catch (e) { /* ignore */ } return toast('Assistance non configurée : message copié dans le presse-papiers'); }
  NAV.mail(`mailto:${supportTo()}?subject=${encodeURIComponent(tag + 'Wouf – ' + cat)}&body=${encodeURIComponent(body)}`);
};

/* ---------- Pages légales ---------- */
const orTbd = v => v ? esc(v) : '<em>[à compléter]</em>';
function legalDoc(kind) {
  const L = LEGAL, p = planOf();
  const y = yearlyPlan();
  if (kind === 'cgv') return `<h1>Conditions générales de vente</h1><p class="mut">Wouf Plus — ${y ? 'abonnement annuel ou achat unique' : 'achat unique'}</p>
  <h2>1. Vendeur</h2><p>${orTbd(L.seller)} — ${orTbd(L.form)}, ${orTbd(L.address)}. SIRET : ${orTbd(L.siret)}. Contact : ${orTbd(L.email)}. ${esc(L.vat || '')}</p>
  <h2>2. Objet</h2><p>Les présentes conditions régissent la vente de l’accès à « Wouf Plus », ensemble de fonctions supplémentaires de l’application Wouf (${Object.values(FEATURES).map(f => esc(f[1])).join(', ')}). La version gratuite reste disponible sans engagement.</p>
  <h2>3. Prix et paiement</h2><p>${y ? `Deux formules : l’<b>abonnement annuel</b> à <b>${esc(y.price)} TTC par an</b>, ou l’<b>accès à vie</b> à <b>${esc(p.price)} TTC</b> en un paiement unique, sans abonnement ni reconduction.` : `Le prix est de <b>${esc(p.price)} TTC</b>, en un paiement unique. Il n’y a ni abonnement ni reconduction.`} Le paiement s’effectue via la plateforme sécurisée PayPal (compte PayPal ou carte bancaire) ; le vendeur ne reçoit pas vos données bancaires. Wouf Plus est activé <b>manuellement</b> par le vendeur, sur le compte Google de l’acheteur, après vérification du paiement et au plus tard 24 h après celui-ci : l’accès n’est donc pas instantané.</p>
  <h2>4. Accès « à vie »</h2><p>L’accès à Wouf Plus est acquis pour toute la durée d’exploitation du service. En cas d’arrêt définitif, le vendeur s’engage à informer les utilisateurs au moins ${esc(String(L.shutdownNoticeDays || 90))} jours à l’avance et à leur permettre d’exporter leurs données. Le contenu de Plus peut être enrichi ; le vendeur ne retirera pas de façon substantielle les fonctions Plus achetées.</p>
  ${y ? `<h2>4 bis. Abonnement annuel</h2><p>L’abonnement est conclu pour une durée d’un an à compter du paiement, au prix de ${esc(y.price)} TTC, puis <b>reconduit tacitement</b> par périodes d’un an, prélevées automatiquement par PayPal. Le vendeur vous informe par e-mail, au plus tôt trois mois et au plus tard un mois avant chaque échéance, de la date de reconduction et de la possibilité de ne pas la reconduire (art. L215-1 du Code de la consommation). Vous pouvez <b>résilier à tout moment, sans frais</b>, depuis l’application (Wouf Plus → « Gérer mon abonnement ») ou depuis votre compte PayPal ; la résiliation prend effet à la fin de la période payée, pendant laquelle l’accès reste actif. Si un prélèvement échoue, l’accès prend fin quelques jours après la fin de la période payée ; vos données restent accessibles dans la version gratuite.</p>` : ''}
  <h2>5. Livraison et compte</h2><p>L’accès est fourni immédiatement après le paiement et est lié au compte Google utilisé lors de l’achat. Il fonctionne sur tous les appareils connectés à ce compte.</p>
  <h2>6. Droit de rétractation</h2><p>Vous disposez en principe d’un délai de 14 jours pour vous rétracter d’un achat à distance. Toutefois, pour un contenu numérique fourni sans support matériel, dont l’exécution commence immédiatement avec votre accord préalable exprès, vous renoncez à ce droit (art. L221-28 du Code de la consommation). Cet accord est recueilli avant le paiement par une case à cocher. ${esc(L.refund || '')}</p>
  <h2>7. Assistance</h2><p>Les membres Wouf Plus bénéficient de l’assistance prioritaire (objectif de réponse : ${esc(SUP.priorityDelay || '')} ; standard : ${esc(SUP.standardDelay || '')}). Il s’agit d’un objectif et non d’un délai garanti.</p>
  <h2>8. Responsabilité</h2><p>Les informations de santé et d’éducation sont fournies à titre indicatif et ne remplacent ni l’avis d’un vétérinaire ni celui d’un éducateur ou comportementaliste. En cas d’urgence, contactez immédiatement un vétérinaire. Le suivi GPS et les horaires de cliniques dépendent de sources tierces et peuvent être inexacts.</p>
  <h2>9. Données personnelles</h2><p>Voir la <a href="#/legal?doc=confidentialite">politique de confidentialité</a>.</p>
  <h2>10. Médiation et droit applicable</h2><p>Médiateur de la consommation : ${orTbd(L.mediator)}. Les présentes conditions sont soumises au droit français.</p>`;
  if (kind === 'confidentialite') return `<h1>Politique de confidentialité</h1>
  <h2>Responsable du traitement</h2><p>${orTbd(L.seller)}, ${orTbd(L.address)} — ${orTbd(L.email)}.</p>
  <h2>Données traitées</h2><ul class="bul"><li><b>Données de votre animal et du carnet</b> (fiche, soins, poids, notes, balades) : stockées sur votre appareil ; sauvegardées dans votre espace privé Google (Firebase) uniquement si vous vous connectez.</li><li><b>Compte Google</b> (adresse e-mail, nom, photo) : utilisé pour l’authentification et pour lier votre achat.</li><li><b>Paiement</b> : traité par PayPal, qui ne nous transmet pas vos données bancaires. Pour activer Wouf Plus, votre dossier de paiement (prénom, nom et e-mail du compte PayPal, e-mail de contact, compte Google, date et montant) est conservé et consulté par l’éditeur.</li><li><b>Position</b> : utilisée uniquement lorsque vous lancez une recherche de vétérinaire ou une balade, et envoyée à OpenStreetMap (Overpass / Nominatim) pour la recherche de cliniques ; le tracé des balades reste dans vos données.</li><li><b>Assistance</b> : le message, l’adresse e-mail et, si vous le cochez, des informations techniques, enregistrés sur notre relais (Cloudflare) et consultés par l’éditeur pour vous répondre.</li><li><b>Compte (si vous vous connectez avec Google)</b> : un résumé (nom, adresse e-mail, dates de première et dernière utilisation, nombre d’animaux et de leçons acquises, version de l’app, achat éventuel) est visible par l’éditeur pour l’assistance et la gestion des accès Wouf Plus. Le contenu de votre carnet n’y figure pas.</li>${statsCode() ? '<li><b>Mesure d’audience</b> : nom de l’écran ouvert, principales actions (animal ajouté, leçon acquise, balade enregistrée), taille d’écran et site de provenance, via GoatCounter, sans cookie, sans identifiant et sans aucune donnée saisie. Désactivable dans Réglages.</li>' : ''}</ul>
  <h2>Finalités et bases légales</h2><p>Fournir le service (exécution du contrat), sécuriser et améliorer l’application (intérêt légitime), répondre à vos demandes et gérer l’achat (contrat, obligations légales comptables).</p>
  <h2>Sous-traitants</h2><p>Google (Firebase Authentication et Firestore), PayPal (paiement), Cloudflare (relais : paiement et messages d’assistance), GitHub (hébergement du site),${statsCode() ? ' GoatCounter (mesure d’audience anonyme),' : ''} ${'OpenStreetMap Foundation (cartes / recherche)'}. Certains peuvent impliquer des transferts hors Union européenne encadrés par des garanties appropriées.</p>
  <h2>Publicité et suivi</h2><p>Aucun suivi publicitaire, aucune revente de données. Seul le stockage technique nécessaire au fonctionnement est utilisé (stockage local de l’appareil).${statsCode() ? ' La mesure d’audience anonyme ne dépose aucun cookie et peut être désactivée dans Réglages.' : ''}</p>
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
const vNewer = (x, y) => { const a = String(x).split('.').map(Number), b = String(y || '0').split('.').map(Number); for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0); return false; };
/* Nouvelle version pendant que l'app reste ouverte (ou en arrière-plan) : on compare la version chargée à celle publiée (config.js, jamais en cache)
   et on propose « Actualiser ». Sans cela, un utilisateur qui ne ferme jamais l'app garde l'ancienne version indéfiniment. */
async function checkVersion() {
  if (checkVersion.busy || location.protocol === 'file:') return; checkVersion.busy = true;
  try { const r = await fetch('config.js?ts=' + Date.now(), { cache: 'no-store' }); const m = r.ok && (await r.text()).match(/version:\s*'(\d+\.\d+\.\d+)'/); if (m && vNewer(m[1], CFG.version)) showUpdateBanner(); }
  catch (e) { /* hors connexion */ } finally { checkVersion.busy = false; }
}
function showUpdateBanner() {
  if ($('#upd')) return;
  const b = document.createElement('div'); b.id = 'upd'; b.innerHTML = '<span>✨ Nouvelle version de Wouf disponible</span><button class="btn sm primary" id="upd-go">Actualiser</button>';
  document.body.appendChild(b); $('#upd-go').onclick = () => location.reload();
}
ACT['check-update'] = async () => { try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); toast('Vous avez la dernière version (' + (CFG.version || '') + ')'); } catch (e) { toast('Impossible de vérifier (hors connexion ?)'); } };
function initUpdates() {
  setTimeout(checkVersion, 4000); setInterval(checkVersion, 30 * 60e3); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
  if (!('serviceWorker' in navigator)) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) showUpdateBanner(); });
  navigator.serviceWorker.getRegistration().then(reg => { if (reg) { setInterval(() => reg.update().catch(() => {}), 3600e3); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); }); } });
  // « Nouveautés » ne liste que ce qui change pour l'utilisateur : pas de message pour une version purement technique.
  const top = CHANGELOG[0].v, seen = S.settings.seenVersion, newer = vNewer;
  if (seen && newer(top, seen)) toast('Wouf a été mis à jour : voir les nouveautés dans « Plus »');
  if (seen !== top) { S.settings.seenVersion = top; flush(); }
}
