'use strict';
/* Wouf — « Que faire ? » (triage des symptômes) et météo des balades.
   Règles simples et transparentes : elles orientent (urgence / vétérinaire sous 24 h / surveiller), elles ne diagnostiquent pas.
   Contenu à faire relire par un vétérinaire avant une communication commerciale. */

/* ---------- Triage des symptômes ---------- */
// red = signes qui imposent une consultation immédiate ; amber = signes qui imposent un vétérinaire sous 24 h.
const TRIAGE = [
  { id: 'vomit', icon: '🤮', label: 'Vomissements', sp: 'both',
    red: ['Du sang dans les vomissements (rouge ou marron « marc de café »)', 'Ventre gonflé, dur ou très douloureux', 'A avalé un objet, un poison ou une plante toxique', 'Très abattu, tremblant ou n’arrive plus à se lever', 'Tente de vomir sans rien produire (surtout un grand chien)'],
    amber: ['Plus de 3 vomissements en 24 h', 'Vomit aussi de l’eau ou refuse de boire', 'Diarrhée en même temps', 'Ne mange plus depuis plus de 24 h'],
    watch: 'Un vomissement isolé chez un animal adulte qui reste joyeux est souvent bénin : retirez la nourriture quelques heures (jamais l’eau), puis reprenez de petites portions.' },
  { id: 'diarrhea', icon: '💩', label: 'Diarrhée', sp: 'both',
    red: ['Du sang noir (goudron) ou beaucoup de sang rouge', 'Très abattu ou fièvre au toucher', 'Gencives pâles ou ventre douloureux', 'Chiot ou chaton non vacciné'],
    amber: ['Dure depuis plus de 48 h', 'Vomissements en même temps', 'Perte d’appétit ou de poids', 'Selles très liquides et répétées (plus de 5 fois par jour)'],
    watch: 'Une diarrhée sans autre signe, chez un adulte en forme, se surveille 24 à 48 h : eau à volonté, repas légers et réguliers.' },
  { id: 'appetite', icon: '🍽️', label: 'Ne mange plus / ne boit plus', sp: 'both',
    red: ['Ne boit plus du tout depuis 24 h', 'Chat qui ne mange plus depuis 24 h (risque pour le foie)', 'Abattement important ou gencives pâles ou jaunes', 'Bave abondante ou difficulté à avaler'],
    amber: ['Ne mange plus depuis plus de 48 h (chien)', 'Boit beaucoup plus que d’habitude depuis plusieurs jours', 'Perte de poids récente', 'Mauvaise haleine forte ou gencive douloureuse'],
    watch: 'Un repas refusé ponctuellement (chaleur, stress, changement de croquettes) n’est pas inquiétant si l’animal reste actif et boit.' },
  { id: 'breath', icon: '😮‍💨', label: 'Respiration difficile, toux', sp: 'both',
    red: ['Respire la bouche ouverte au repos (surtout un chat)', 'Gencives ou langue bleutées, violacées ou très pâles', 'Respiration très rapide ou avec effort visible du ventre', 'S’étouffe, tousse de façon incessante ou s’est évanoui', 'Après une forte chaleur ou un effort'],
    amber: ['Tousse depuis plus de 2 jours', 'Éternuements avec écoulement épais ou jaunâtre', 'Fatigue à l’effort inhabituelle'],
    watch: 'Quelques éternuements ou une toux brève après avoir tiré sur la laisse peuvent se surveiller un jour ou deux.' },
  { id: 'limp', icon: '🦴', label: 'Boiterie, douleur', sp: 'both',
    red: ['Ne pose plus la patte du tout', 'Membre déformé, gonflé ou pendant', 'Après un choc, une chute ou un accident de la route', 'Crie de douleur, paralysie ou arrière-train qui lâche'],
    amber: ['Boite depuis plus de 48 h', 'Boiterie qui revient régulièrement', 'Articulation chaude ou gonflée', 'Refuse de sauter ou de monter les escaliers'],
    watch: 'Une boiterie légère après une grosse balade se surveille 24 à 48 h avec du repos strict, sans médicament humain (dangereux).' },
  { id: 'urine', icon: '🚽', label: 'Problème d’urine', sp: 'both',
    red: ['Va à la litière ou tente d’uriner sans rien produire (chat, surtout un mâle)', 'Crie ou se lèche sans cesse la région génitale', 'Ventre dur avec abattement ou vomissements'],
    amber: ['Du sang dans les urines', 'Urine très souvent en petites quantités', 'Malpropreté soudaine', 'Boit et urine beaucoup plus que d’habitude'],
    watch: 'Une envie d’uriner un peu plus fréquente peut se surveiller 24 h, à condition de vérifier que l’urine sort bien et que l’animal reste actif.' },
  { id: 'eyes', icon: '👁️', label: 'Œil, oreille', sp: 'both',
    red: ['Œil fermé, très douloureux ou qui paraît avoir un trou', 'Œil qui gonfle ou sort de l’orbite', 'Après une bagarre, une griffure ou un corps étranger visible', 'Perte de la vue soudaine'],
    amber: ['Œil rouge, larmoyant ou avec écoulement', 'Se gratte ou secoue la tête sans arrêt', 'Oreille rouge, qui sent mauvais ou avec sécrétions foncées', 'Tête penchée'],
    watch: 'Un léger larmoiement sans rougeur se nettoie avec du sérum physiologique : consultez si cela dure plus de 24 h.' },
  { id: 'skin', icon: '🧴', label: 'Peau, démangeaisons', sp: 'both',
    red: ['Gonflement du museau ou du visage, urticaire brutale (allergie)', 'Plaie profonde ou qui saigne', 'Morsure d’insecte, de serpent ou d’un autre animal'],
    amber: ['Se gratte ou se lèche sans arrêt', 'Zones sans poils, croûtes ou plaies', 'Puces ou tiques visibles', 'Grosseur qui apparaît ou grossit'],
    watch: 'Une petite plaque rouge isolée se surveille : nettoyez, empêchez de se lécher et consultez si elle s’étend.' },
  { id: 'seizure', icon: '⚡', label: 'Convulsions, chute, malaise', sp: 'both',
    red: ['Convulsions ou tremblements violents', 'Perte de connaissance ou évanouissement', 'Marche en titubant, désorienté, tourne en rond', 'Paralysie ou incapacité de se lever'],
    amber: [], watch: 'Toute convulsion, même brève, justifie un avis vétérinaire. Ne touchez pas la bouche, éloignez les objets et chronométrez la crise.' },
  { id: 'heat', icon: '🥵', label: 'Coup de chaleur', sp: 'both',
    red: ['Halète très fort, bave, langue très rouge ou violacée', 'Est resté dans une voiture, au soleil ou a couru par forte chaleur', 'Vomit, titube ou s’effondre', 'Gencives très rouges ou très pâles'],
    amber: [], watch: 'Le coup de chaleur est une urgence vitale : mouillez à l’eau tiède (jamais glacée), ventilez et partez chez le vétérinaire.' },
  { id: 'toxic', icon: '☠️', label: 'A avalé quelque chose', sp: 'both',
    red: ['Chocolat, raisin, oignon/ail, xylitol, produit ménager, médicament ou raticide', 'Plante toxique (lys pour un chat !), champignon', 'Objet qui peut bloquer (chaussette, os cuit, fil, aiguille)'],
    amber: [], watch: 'Ne faites pas vomir sans avis. Gardez l’emballage ou l’échantillon et appelez un vétérinaire ou le centre antipoison vétérinaire.' }
];
const TRI = { sym: null, flags: {} };
const TRI_LVL = {
  red: { cls: 'bad', icon: '🚨', title: 'Consultez tout de suite', txt: 'Appelez un vétérinaire ou une clinique de garde maintenant. Ne tardez pas et ne donnez aucun médicament humain.' },
  amber: { cls: 'warn', icon: '📞', title: 'Vétérinaire sous 24 h', txt: 'Prenez rendez-vous dans la journée ou demain. Si l’état s’aggrave, passez en urgence.' },
  green: { cls: 'ok', icon: '👀', title: 'Surveillez de près', txt: '' }
};
/* Fonction pure : renvoie le niveau (red/amber/green) et les raisons. L'âge fragile (jeune ou senior) monte d'un cran pour les troubles digestifs. */
function triageResult(sym, flags, d) {
  const reasons = [], has = k => !!flags[k];
  sym.red.forEach((t, i) => { if (has('r' + i)) reasons.push(t); });
  const redHit = reasons.length > 0;
  const amberHits = sym.amber.filter((t, i) => has('a' + i));
  let lvl = redHit ? 'red' : amberHits.length ? 'amber' : 'green';
  const fragile = d && d.birth && (ageMonths(d.birth) < 6 || ageYears(d.birth) >= SENIOR_AGE[dogSize(d)]);
  let note = '';
  if (fragile && ['vomit', 'diarrhea', 'appetite'].includes(sym.id) && lvl !== 'red') {
    lvl = lvl === 'green' ? 'amber' : 'red'; note = `${d.name} est ${ageMonths(d.birth) < 6 ? 'très jeune' : 'âgé' + (spOf(d).id === 'cat' ? '' : '')} : chez ${ageMonths(d.birth) < 6 ? 'les jeunes' : 'les seniors'}, ces troubles s’aggravent vite, le seuil d’alerte est abaissé.`;
  }
  return { lvl, reasons: reasons.concat(amberHits), note };
}
ROUTES.triage = function triage() {
  const d = dog(), sym = TRIAGE.find(s => s.id === TRI.sym);
  const head = `<div class="page-h"><a class="back" href="${sym ? '#/triage' : '#/plus'}" ${sym ? 'data-act="tri-back"' : ''}>‹</a><h1>🩺 Que faire ?</h1></div>`;
  const warn = `<p class="mut small center">Cet outil oriente, il ne remplace pas un vétérinaire. En cas de doute, appelez-le : c’est gratuit et rassurant.</p>`;
  if (!sym) return `${head}<section class="card warnbox"><b>Danger immédiat ?</b><p>Difficulté à respirer, convulsions, gencives bleues ou pâles, accident, coup de chaleur, poison avalé : n’attendez pas.</p><a class="btn primary" href="#/sos">🚨 Trouver un vétérinaire de garde</a></section>
    <section class="card"><h2>Quel est le problème de ${esc(d.name)} ?</h2><div class="list">${TRIAGE.map(s => `<button class="row" data-act="tri-pick" data-id="${s.id}"><span class="ico">${s.icon}</span><span class="grow"><b>${esc(s.label)}</b></span><span class="chev">›</span></button>`).join('')}</div></section>${warn}`;
  const res = triageResult(sym, TRI.flags, d), L = TRI_LVL[res.lvl];
  const chk = (k, t) => `<label class="chk"><input type="checkbox" data-act="tri-flag" data-k="${k}" ${TRI.flags[k] ? 'checked' : ''}> <span>${esc(t)}</span></label>`;
  return `${head}<section class="card"><h2>${sym.icon} ${esc(sym.label)} · ${esc(d.name)}</h2><p class="mut">Cochez ce qui correspond :</p>
    <div class="form-grid">${sym.red.map((t, i) => chk('r' + i, t)).join('')}${sym.amber.map((t, i) => chk('a' + i, t)).join('')}</div></section>
    <section class="card insight ${L.cls}"><span class="ico">${L.icon}</span><span><b>${esc(L.title)}</b><small>${esc(res.lvl === 'green' ? sym.watch : L.txt)}</small></span></section>
    ${res.reasons.length ? `<section class="card"><h2>Pourquoi</h2><ul class="bul">${res.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
    ${res.note ? `<p class="mut small">${esc(res.note)}</p>` : ''}
    ${res.lvl !== 'green' ? `<a class="btn primary big" href="#/sos">🏥 Vétérinaires ouverts près de moi</a>` : `<p class="mut">Si l’état n’a pas nettement progressé après 24 h, ou si un nouveau signe apparaît, refaites ce test ou consultez.</p>`}
    <div class="actions-row"><button class="btn" data-act="tri-note">📝 Noter dans le journal</button></div>${warn}`;
};
ACT['tri-pick'] = ({ id }) => { TRI.sym = id; TRI.flags = {}; render(); scrollTo(0, 0); };
ACT['tri-back'] = () => { TRI.sym = null; TRI.flags = {}; };
ACT['tri-flag'] = ({ k }, el) => { TRI.flags[k] = el.checked; render(true); };
ACT['tri-note'] = () => {
  const sym = TRIAGE.find(s => s.id === TRI.sym), d = dog(); if (!sym) return;
  const res = triageResult(sym, TRI.flags, d), sev = res.lvl === 'red' ? '3' : res.lvl === 'amber' ? '2' : '1';
  S.journal = S.journal || []; S.journal.push({ id: uid(), dogId: d.id, date: today(), kind: 'symptom', sev, note: sym.label + (res.reasons.length ? ' : ' + res.reasons.join(' ; ') : '') });
  save(); toast('Ajouté au journal de santé ✓');
};

/* ---------- Météo des balades (Open-Meteo : gratuit, sans clé) ---------- */
const METEO = { st: 'idle', data: null, err: '', label: '' };
const FLAT_FACE = /bouledogue|bulldog|carlin|pug|boxer|shih|pékinois|pekinois|griffon|cavalier|persan|exotic|himalayen|british|dogue|boston|lhassa/i;
/* Fonction pure : niveau de risque d'une balade selon la température ressentie et le profil de l'animal. */
function walkRisk(t, d, o = {}) {
  const b = (d && d.breed) || '', flat = FLAT_FACE.test(b), young = d && d.birth && ageMonths(d.birth) < 6, senior = d && d.birth && ageYears(d.birth) >= SENIOR_AGE[dogSize(d)];
  const fragile = flat || senior || young, sz = d ? dogSize(d) : 'M';
  const hotWarn = fragile ? 20 : 25, hotBad = fragile ? 25 : 30, coldWarn = (sz === 'S' || fragile) ? 5 : 0, coldBad = (sz === 'S' || fragile) ? -3 : -10;
  let lvl = 'ok', why = 'Conditions agréables pour sortir.';
  if (t >= hotBad) { lvl = 'bad'; why = 'Trop chaud : risque de coup de chaleur. Sortez très tôt ou tard le soir, ou restez au frais.'; }
  else if (t >= hotWarn) { lvl = 'warn'; why = 'Chaud : balade courte, à l’ombre, avec de l’eau. Testez le sol avec le dos de la main 5 secondes.'; }
  else if (t <= coldBad) { lvl = 'bad'; why = 'Très froid : sorties brèves, manteau conseillé, surveillez les coussinets.'; }
  else if (t <= coldWarn) { lvl = 'warn'; why = 'Frais : balade active, manteau pour un petit gabarit, un jeune ou un senior.'; }
  if (o.storm) { lvl = 'bad'; why = 'Orage : restez à l’abri, beaucoup d’animaux en ont peur.'; }
  else if (o.rain >= 70 && lvl === 'ok') { lvl = 'warn'; why = 'Pluie probable : imperméable et séchage au retour.'; }
  return { lvl, why, flat, fragile };
}
/* Fonction pure : meilleures heures (jour, sans orage) parmi les prochaines heures. */
function bestHours(hours, d) {
  return hours.filter(h => h.day && !h.storm).map(h => ({ ...h, r: walkRisk(h.t, d, { rain: h.rain, storm: h.storm }) }))
    .filter(h => h.r.lvl === 'ok').slice(0, 24);
}
const WCODE = c => c === 0 ? ['☀️', 'Dégagé'] : c <= 3 ? ['⛅', 'Nuageux'] : c <= 48 ? ['🌫️', 'Brouillard'] : c <= 57 ? ['🌦️', 'Bruine'] : c <= 67 ? ['🌧️', 'Pluie'] : c <= 77 ? ['❄️', 'Neige'] : c <= 82 ? ['🌧️', 'Averses'] : c <= 86 ? ['❄️', 'Averses de neige'] : ['⛈️', 'Orage'];
async function loadMeteo(lat, lon, label) {
  METEO.st = 'loading'; METEO.label = label || ''; render(true);
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,apparent_temperature,weather_code&hourly=apparent_temperature,precipitation_probability,weather_code,is_day&timezone=auto&forecast_days=2`);
    if (!r.ok) throw new Error('http ' + r.status); const j = await r.json();
    const now = j.current, H = j.hourly, cur = now.time ? now.time.slice(0, 13) : '', start = Math.max(0, H.time.findIndex(t => t.slice(0, 13) >= cur));
    const hours = H.time.slice(start, start + 24).map((t, i) => ({ time: t, t: H.apparent_temperature[start + i], rain: H.precipitation_probability[start + i] || 0, code: H.weather_code[start + i], day: !!H.is_day[start + i], storm: H.weather_code[start + i] >= 95 }));
    METEO.data = { temp: now.temperature_2m, feels: now.apparent_temperature, code: now.weather_code, hours }; METEO.st = 'done';
  } catch (e) { METEO.st = 'error'; METEO.err = 'Météo indisponible (pas de connexion ?). Réessayez dans un instant.'; }
  render(true);
}
function meteoLocate() {
  const h = S.settings.home, fallback = () => h ? loadMeteo(h.lat, h.lon, h.label) : (METEO.st = 'error', METEO.err = 'Localisation refusée. Enregistrez votre ville dans « SOS vétérinaires » pour l’utiliser ici.', render(true));
  if (!navigator.geolocation) return fallback();
  METEO.st = 'loading'; render(true);
  navigator.geolocation.getCurrentPosition(p => loadMeteo(p.coords.latitude, p.coords.longitude, 'Ma position'), fallback, { timeout: 10000, maximumAge: 300000 });
}
ACT['meteo-go'] = () => gate('weather', meteoLocate);
ROUTES.meteo = function meteo() {
  const d = dog(), head = `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🌦️ Météo balade</h1></div>`;
  if (!allowed('weather')) return `${head}<section class="card"><p>Chaleur, froid, pluie, orage : Wouf calcule si la balade est adaptée à <b>${esc(d.name)}</b> (race, âge, gabarit) et vous donne les meilleures heures pour sortir.</p><button class="btn primary big" data-act="paywall" data-f="weather">⭐ Débloquer avec Wouf Plus</button></section>`;
  if (METEO.st === 'idle') return `${head}<section class="card center"><div class="big-heart">🌦️</div><h2>Sortir au bon moment</h2><p>Wouf utilise votre position pour lire la météo locale et l’adapter à ${esc(d.name)}${FLAT_FACE.test(d.breed || '') ? ' (museau court : très sensible à la chaleur)' : ''}.</p><button class="btn primary big" data-act="meteo-go">📍 Voir la météo de la balade</button><p class="mut small">La position n’est envoyée qu’au service météo Open-Meteo, sans compte ni suivi.</p></section>`;
  if (METEO.st === 'loading') return `${head}<p class="loading">Chargement de la météo…</p>`;
  if (METEO.st === 'error') return `${head}<section class="card warnbox"><b>${esc(METEO.err)}</b></section><button class="btn" data-act="meteo-go">Réessayer</button>`;
  const M = METEO.data, r = walkRisk(M.feels, d, { storm: M.code >= 95 }), w = WCODE(M.code), best = bestHours(M.hours, d);
  const fmtH = t => t.slice(11, 13) + ' h', ranges = [];
  best.forEach(h => { const last = ranges[ranges.length - 1]; if (last && diffDays(h.time.slice(0, 10), last.endDay) <= 1 && (parseInt(h.time.slice(11, 13), 10) - last.endH === 1 || (last.endH === 23 && h.time.slice(11, 13) === '00'))) { last.end = h.time; last.endH = parseInt(h.time.slice(11, 13), 10); last.endDay = h.time.slice(0, 10); } else ranges.push({ start: h.time, end: h.time, endH: parseInt(h.time.slice(11, 13), 10), endDay: h.time.slice(0, 10) }); });
  return `${head}<section class="card insight ${r.lvl}"><span class="ico">${w[0]}</span><span><b>${Math.round(M.temp)} °C · ressenti ${Math.round(M.feels)} °C · ${esc(w[1])}</b><small>${esc(r.why)}</small></span></section>
    ${r.fragile ? `<p class="mut small">Seuils abaissés pour ${esc(d.name)} : ${FLAT_FACE.test(d.breed || '') ? 'museau court' : 'âge ou gabarit sensible'}.</p>` : ''}
    <section class="card"><h2>Meilleures heures pour sortir</h2>${ranges.length ? `<ul class="bul">${ranges.slice(0, 4).map(x => `<li><b>${fmtH(x.start)} – ${String((x.endH + 1) % 24).padStart(2, '0')} h</b>${x.start.slice(0, 10) !== today() ? ' (demain)' : ''}</li>`).join('')}</ul>` : `<p class="mut">Aucun créneau vraiment confortable dans les 24 h : privilégiez des sorties très courtes.</p>`}</section>
    <section class="card"><h2>Les prochaines heures</h2><div class="hours">${M.hours.filter((h, i) => i % 3 === 0).map(h => { const hr = walkRisk(h.t, d, { rain: h.rain, storm: h.storm }); return `<div class="hr ${hr.lvl}"><small>${fmtH(h.time)}</small><span>${WCODE(h.code)[0]}</span><b>${Math.round(h.t)}°</b></div>`; }).join('')}</div></section>
    <div class="actions-row"><button class="btn" data-act="meteo-go">🔄 Actualiser</button></div>
    <p class="mut small center">Températures ressenties fournies par Open-Meteo. Le bitume peut dépasser l’air de 20 °C ou plus : testez toujours le sol avec le dos de la main.</p>`;
};

/* ---------- Recherche globale ---------- */
function searchAll(q, d) {
  q = (q || '').trim().toLowerCase(); if (q.length < 2) return [];
  const has = (...t) => t.join(' ').toLowerCase().includes(q), out = [];
  const add = (sec, icon, title, sub, href) => out.push({ sec, icon, title, sub, href });
  toxicsOf(d).filter(t => has(t.name, t.why)).forEach(t => add('Aliments et produits dangereux', t.level === 'danger' ? '⛔' : '⚠️', t.name, t.why, '#/sos'));
  lessonsFor(d).filter(l => has(l.title, l.sum || '', l.goal || '')).forEach(l => add('Leçons', l.icon || '🎓', l.title, l.sum || '', '#/lecon?id=' + l.id));
  TRIAGE.filter(s => has(s.label, s.red.join(' '), s.amber.join(' '))).forEach(s => add('Que faire ?', s.icon, s.label, 'Évaluer l’urgence', '#/triage'));
  dogEvents(d.id).filter(e => has(e.title || '', e.note || '', (TYPES[e.type] || {}).label || '')).slice(0, 8).forEach(e => add('Carnet de ' + d.name, (TYPES[e.type] || {}).icon || '📋', e.title, fmtDate(e.date) + (e.note ? ' · ' + e.note : ''), '#/carnet'));
  (S.journal || []).filter(j => j.dogId === d.id && has(j.note || '')).slice(0, 5).forEach(j => add('Journal de santé', '📝', j.note, fmtDate(j.date), '#/suivi'));
  (S.docs || []).filter(x => x.dogId === d.id && has(x.title || '')).forEach(x => add('Documents', '📎', x.title, fmtDate(x.date), '#/documents'));
  return out;
}
function searchHTML(q) {
  const r = searchAll(q, dog()); if ((q || '').trim().length < 2) return '<p class="empty">Tapez au moins 2 lettres : chocolat, rappel, vaccin, assis, ordonnance…</p>';
  if (!r.length) return '<p class="empty">Aucun résultat. En cas de doute sur la santé de votre animal, appelez un vétérinaire.</p>';
  const secs = [...new Set(r.map(x => x.sec))];
  return secs.map(s => `<section class="card"><h2>${esc(s)}</h2><div class="list">${r.filter(x => x.sec === s).map(x => `<a class="row" href="${x.href}"><span class="ico">${x.icon}</span><span class="grow"><b>${esc(x.title)}</b><small>${esc((x.sub || '').slice(0, 110))}</small></span><span class="chev">›</span></a>`).join('')}</div></section>`).join('');
}
ROUTES.recherche = function recherche() {
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🔎 Rechercher</h1></div><input id="gs-q" class="search" type="search" placeholder="Aliment, vaccin, leçon, document…" autocomplete="off" autofocus><div id="gs-res">${searchHTML('')}</div>`;
};
document.addEventListener('input', e => { if (e.target.id === 'gs-q') $('#gs-res').innerHTML = searchHTML(e.target.value); });
