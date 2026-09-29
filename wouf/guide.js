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
  else if (o.wind >= 60) { lvl = 'bad'; why = 'Vent violent : risque de chutes de branches et d’objets. Sortie très courte, loin des arbres.'; }
  else if (o.wind >= 40 && lvl === 'ok') { lvl = 'warn'; why = 'Vent fort : évitez les zones arborées et gardez un animal peureux en laisse courte.'; }
  else if (o.rain >= 70 && lvl === 'ok') { lvl = 'warn'; why = 'Pluie probable : imperméable et séchage au retour.'; }
  return { lvl, why, flat, fragile };
}
/* Fonction pure : meilleures heures (jour, sans orage) parmi les prochaines heures. */
function bestHours(hours, d) {
  return hours.filter(h => h.day && !h.storm).map(h => ({ ...h, r: walkRisk(h.t, d, { rain: h.rain, storm: h.storm, wind: h.wind }) }))
    .filter(h => h.r.lvl === 'ok').slice(0, 24);
}
const WCODE = c => c === 0 ? ['☀️', 'Dégagé'] : c <= 3 ? ['⛅', 'Nuageux'] : c <= 48 ? ['🌫️', 'Brouillard'] : c <= 57 ? ['🌦️', 'Bruine'] : c <= 67 ? ['🌧️', 'Pluie'] : c <= 77 ? ['❄️', 'Neige'] : c <= 82 ? ['🌧️', 'Averses'] : c <= 86 ? ['❄️', 'Averses de neige'] : ['⛈️', 'Orage'];
async function loadMeteo(lat, lon, label) {
  METEO.st = 'loading'; METEO.label = label || ''; render(true);
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&hourly=apparent_temperature,precipitation_probability,weather_code,is_day,wind_speed_10m,uv_index&timezone=auto&forecast_days=2`);
    if (!r.ok) throw new Error('http ' + r.status); const j = await r.json();
    const now = j.current, H = j.hourly, cur = now.time ? now.time.slice(0, 13) : '', start = Math.max(0, H.time.findIndex(t => t.slice(0, 13) >= cur));
    const hours = H.time.slice(start, start + 24).map((t, i) => ({ time: t, t: H.apparent_temperature[start + i], rain: H.precipitation_probability[start + i] || 0, code: H.weather_code[start + i], day: !!H.is_day[start + i], storm: H.weather_code[start + i] >= 95, wind: (H.wind_speed_10m || [])[start + i] || 0, uv: (H.uv_index || [])[start + i] || 0 }));
    METEO.data = { temp: now.temperature_2m, feels: now.apparent_temperature, code: now.weather_code, wind: now.wind_speed_10m || 0, day: now.is_day == null ? (hours[0] ? hours[0].day : true) : !!now.is_day, uv: hours.length ? Math.max(...hours.slice(0, 8).map(h => h.uv)) : 0, hours }; METEO.st = 'done';
  } catch (e) { METEO.st = 'error'; METEO.err = 'Météo indisponible (pas de connexion ?). Réessayez dans un instant.'; }
  render(true);
}
function meteoLocate() {
  const h = S.settings.home, fallback = () => h ? loadMeteo(h.lat, h.lon, h.label) : (METEO.st = 'error', METEO.err = 'Localisation refusée. Enregistrez votre ville dans « SOS vétérinaires » pour l’utiliser ici.', render(true));
  if (!navigator.geolocation) return fallback();
  METEO.st = 'loading'; render(true);
  navigator.geolocation.getCurrentPosition(p => loadMeteo(p.coords.latitude, p.coords.longitude, 'Ma position'), fallback, { timeout: 10000, maximumAge: 300000 });
}

/* ---------- Le chien de la météo : scène illustrée selon le temps ---------- */
/* Fonction pure : choisit la scène (priorité au plus important pour la sécurité). */
function weatherScene(M, d) {
  const c = M.code, feels = M.feels, flat = FLAT_FACE.test((d && d.breed) || '');
  if (c >= 95) return 'storm';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  const risk = walkRisk(feels, d, {});
  if (feels >= (risk.fragile ? 25 : 30)) return 'hot';
  if (M.wind >= 40) return 'wind';
  if (feels <= (risk.fragile ? 3 : -3) || (feels <= 5 && flat)) return 'cold';
  if (M.day === false) return 'night';
  if (c <= 2 && feels >= 17) return 'sun';
  if (M.wind >= 25) return 'wind';
  return 'calm';
}
const SCENE_TXT = {
  sun: ['😎 Grand soleil : lunettes, parasol, et on y va !', 'Sortez, mais cherchez l’ombre et emportez de l’eau.'],
  hot: ['🥵 Il fait vraiment trop chaud…', 'Langue pendante, halètements : restez au frais et sortez à l’aube ou tard le soir.'],
  rain: ['😒 Il pleut… il boude.', 'Certains chiens détestent l’eau : une balade courte, un imperméable et une bonne serviette au retour.'],
  wind: ['💨 Ça souffle fort dehors !', 'Oreilles au vent : laisse courte, loin des arbres, et attention aux objets qui volent.'],
  cold: ['🥶 Brrr, il fait froid !', 'Écharpe et manteau pour les petits gabarits, les jeunes et les seniors.'],
  storm: ['😱 L’orage gronde…', 'Restez à l’intérieur, rassurez-le avec un coin calme et une couverture.'],
  snow: ['❄️ Il neige !', 'Rincez les coussinets au retour (sel, neige tassée) et limitez la durée.'],
  night: ['🌙 Il fait nuit.', 'Sortez avec un harnais ou un collier lumineux et une laisse courte.'],
  calm: ['🙂 Temps calme et agréable.', 'Une belle sortie en perspective.']
};
function dogScene(kind, d) {
  const cat = d && spOf(d).id === 'cat', coat = cat ? '#b9b3ad' : '#d9a066', coat2 = cat ? '#a19a93' : '#b9803f', muzzle = cat ? '#eee9e4' : '#f3d9b6';
  const sad = ['rain', 'storm', 'cold'].includes(kind), hot = kind === 'hot';
  const bg = { sun: '#ffe9a8', hot: '#ffd1a0', rain: '#c9d6e4', wind: '#d7ecec', cold: '#d5e6f5', storm: '#9aa3b8', snow: '#e3eefa', night: '#243055', calm: '#e6f1e3' }[kind] || '#e6f1e3';
  const earL = cat ? `<path d="M68 62 L74 30 L95 52 Z" fill="${coat2}"/><path d="M132 62 L126 30 L105 52 Z" fill="${coat2}"/>`
    : `<g class="dg-ear l ${kind === 'wind' ? 'flap' : ''}" style="transform:rotate(${sad ? 22 : kind === 'wind' ? -18 : 0}deg)"><path d="M70 58 C50 52 42 82 52 100 C60 108 72 96 74 78 Z" fill="${coat2}"/></g><g class="dg-ear r ${kind === 'wind' ? 'flap' : ''}" style="transform:rotate(${sad ? -22 : kind === 'wind' ? -30 : 0}deg)"><path d="M130 58 C150 52 158 82 148 100 C140 108 128 96 126 78 Z" fill="${coat2}"/></g>`;
  const shades = kind === 'sun';
  const eyes = kind === 'night' ? '<path d="M82 82 q6 6 12 0 M106 82 q6 6 12 0" stroke="#3a2a1a" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : shades ? `<g><rect x="76" y="73" width="20" height="14" rx="6" fill="#151b2b"/><rect x="104" y="73" width="20" height="14" rx="6" fill="#151b2b"/><path d="M96 79 h8" stroke="#151b2b" stroke-width="3"/><path d="M80 76 l6 0 M108 76 l6 0" stroke="#7fb4ff" stroke-width="2" stroke-linecap="round"/></g>`
    : kind === 'rain' ? '<g><ellipse cx="88" cy="82" rx="5" ry="6" fill="#3a2a1a"/><ellipse cx="112" cy="82" rx="5" ry="6" fill="#3a2a1a"/><circle cx="90" cy="80" r="1.6" fill="#fff"/><circle cx="114" cy="80" r="1.6" fill="#fff"/><path d="M78 70 l14 5 M122 70 l-14 5" stroke="#3a2a1a" stroke-width="3" stroke-linecap="round"/><path d="M76 78 q12 -6 24 0 M100 78 q12 -6 24 0" stroke="none"/></g>'
    : kind === 'storm' ? '<g><circle cx="88" cy="82" r="8" fill="#fff"/><circle cx="112" cy="82" r="8" fill="#fff"/><circle cx="88" cy="83" r="3.2" fill="#3a2a1a"/><circle cx="112" cy="83" r="3.2" fill="#3a2a1a"/><path d="M78 68 l14 -3 M122 68 l-14 -3" stroke="#3a2a1a" stroke-width="3" stroke-linecap="round"/></g>'
    : `<g><ellipse cx="88" cy="82" rx="5" ry="6.5" fill="#3a2a1a"/><ellipse cx="112" cy="82" rx="5" ry="6.5" fill="#3a2a1a"/><circle cx="90" cy="80" r="1.8" fill="#fff"/><circle cx="114" cy="80" r="1.8" fill="#fff"/></g>`;
  const mouth = hot ? `<path d="M90 106 q10 8 20 0" stroke="#3a2a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M96 107 q4 22 8 0 Z" fill="#ef6f86" class="dg-tongue"/>`
    : kind === 'rain' ? '<path d="M91 110 q9 -8 18 0" stroke="#3a2a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="76" cy="99" r="7" fill="#f0b98c" opacity=".7"/><circle cx="124" cy="99" r="7" fill="#f0b98c" opacity=".7"/>'
    : kind === 'storm' ? '<path d="M92 108 q8 -6 16 0" stroke="#3a2a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : kind === 'night' ? '<path d="M93 106 q7 4 14 0" stroke="#3a2a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    : '<path d="M89 104 q11 11 22 0" stroke="#3a2a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  const deco = {
    sun: '<g class="dg-spin"><circle cx="168" cy="30" r="14" fill="#ffc21a"/><g stroke="#ffc21a" stroke-width="3" stroke-linecap="round"><path d="M168 8v6M168 46v6M146 30h6M184 30h6M152 14l4 4M180 42l4 4M184 14l-4 4M156 42l-4 4"/></g></g><g><path d="M150 152 L150 62" stroke="#7a5a3a" stroke-width="3"/><path d="M114 64 A36 26 0 0 1 186 64 Z" fill="#ff5d73"/><path d="M132 64 A18 26 0 0 1 150 38 A18 26 0 0 1 168 64 Z" fill="#fff" opacity=".85"/><path d="M114 64 q9 7 18 0 q9 7 18 0 q9 7 18 0 q9 7 18 0" fill="#ff5d73"/></g>',
    hot: '<circle cx="168" cy="30" r="20" fill="#ff9d1a"/><g fill="#5bc0ff" class="dg-sweat"><path d="M62 70 q-5 8 0 12 q5 -4 0 -12z"/><path d="M140 62 q-5 8 0 12 q5 -4 0 -12z"/></g><ellipse cx="34" cy="156" rx="22" ry="8" fill="#5bc0ff" opacity=".8"/><ellipse cx="34" cy="152" rx="18" ry="5" fill="#a9defc"/>',
    rain: '<g><ellipse cx="60" cy="26" rx="30" ry="14" fill="#7b8797"/><ellipse cx="88" cy="20" rx="24" ry="14" fill="#8a96a6"/><ellipse cx="116" cy="28" rx="28" ry="13" fill="#7b8797"/></g><g stroke="#4d8fd6" stroke-width="3" stroke-linecap="round" class="dg-rain"><path d="M52 44 l-3 10 M72 46 l-3 10 M94 44 l-3 10 M116 46 l-3 10 M138 44 l-3 10 M160 50 l-3 10 M40 60 l-3 10 M170 70 l-3 10"/></g><ellipse cx="100" cy="164" rx="60" ry="6" fill="#7fa9d6" opacity=".6"/><text x="150" y="60" font-size="14" font-weight="700" fill="#3a4a5e">Pff…</text>',
    wind: '<g stroke="#7ab8b8" stroke-width="4" stroke-linecap="round" fill="none" class="dg-wind"><path d="M6 40 h50 q10 0 10 -8 q0 -8 -9 -8"/><path d="M0 70 h34 q9 0 9 7 q0 7 -8 7"/><path d="M140 44 h48 q9 0 9 -7 q0 -7 -8 -7"/><path d="M150 110 h40"/></g><g class="dg-leaf"><path d="M40 100 q8 -12 18 -4 q-6 12 -18 4z" fill="#7aa64a"/><path d="M160 90 q8 -12 18 -4 q-6 12 -18 4z" fill="#d1893a"/></g>',
    cold: '<g fill="#fff" class="dg-snow"><circle cx="30" cy="30" r="3"/><circle cx="60" cy="18" r="2.5"/><circle cx="150" cy="24" r="3"/><circle cx="178" cy="50" r="2.5"/><circle cx="20" cy="80" r="2"/><circle cx="182" cy="96" r="3"/></g><g class="dg-breath" fill="#fff" opacity=".8"><circle cx="128" cy="106" r="4"/><circle cx="138" cy="102" r="5"/><circle cx="150" cy="98" r="6"/></g>',
    storm: '<g><ellipse cx="60" cy="24" rx="34" ry="16" fill="#4e5568"/><ellipse cx="96" cy="18" rx="28" ry="15" fill="#5a6176"/><ellipse cx="132" cy="26" rx="32" ry="14" fill="#4e5568"/></g><path d="M112 34 l-14 26 h12 l-10 26 l28 -34 h-14 l10 -18z" fill="#ffd93b" class="dg-bolt"/>',
    snow: '<g fill="#fff" stroke="#b7cde6" class="dg-snow"><circle cx="30" cy="30" r="5"/><circle cx="62" cy="14" r="4"/><circle cx="150" cy="22" r="5"/><circle cx="178" cy="52" r="4"/><circle cx="22" cy="84" r="4"/><circle cx="180" cy="98" r="5"/><circle cx="100" cy="12" r="4"/></g><ellipse cx="100" cy="166" rx="86" ry="10" fill="#fff"/>',
    night: '<path d="M160 22 a18 18 0 1 0 14 30 a14 14 0 1 1 -14 -30z" fill="#ffe9a8"/><g fill="#fff" class="dg-twinkle"><circle cx="40" cy="26" r="2"/><circle cx="70" cy="14" r="1.6"/><circle cx="34" cy="60" r="1.6"/><circle cx="184" cy="72" r="2"/></g><text x="128" y="66" font-size="16" font-weight="700" fill="#cfd8ff" class="dg-zzz">z Z</text>',
    calm: '<ellipse cx="40" cy="30" rx="24" ry="10" fill="#fff"/><ellipse cx="60" cy="24" rx="18" ry="10" fill="#fff"/><ellipse cx="160" cy="40" rx="24" ry="10" fill="#fff" opacity=".9"/>'
  }[kind] || '';
  const ground = `<ellipse cx="100" cy="168" rx="70" ry="6" fill="#000" opacity=".12"/>`;
  return `<svg class="dg dg-${kind}" viewBox="0 0 200 175" role="img" aria-label="${esc(SCENE_TXT[kind][0])}"><rect width="200" height="175" rx="22" fill="${bg}"/>${deco}${ground}
    <g class="dg-body ${kind === 'cold' ? 'shiver' : ''}"><ellipse cx="100" cy="140" rx="46" ry="26" fill="${coat}"/><rect x="66" y="150" width="14" height="18" rx="7" fill="${coat2}"/><rect x="120" y="150" width="14" height="18" rx="7" fill="${coat2}"/>
    ${cat ? `<path d="M144 140 q30 -8 26 -36" stroke="${coat2}" stroke-width="9" fill="none" stroke-linecap="round" class="dg-tail"/>` : `<path d="M142 132 q26 -10 22 -32" stroke="${coat2}" stroke-width="9" fill="none" stroke-linecap="round" class="dg-tail ${sad ? 'low' : ''}"/>`}
    ${earL}<circle cx="100" cy="86" r="38" fill="${coat}"/><ellipse cx="100" cy="100" rx="21" ry="15" fill="${muzzle}"/><ellipse cx="100" cy="93" rx="6.5" ry="4.8" fill="#3a2a1a"/>${eyes}${mouth}
    ${kind === 'cold' ? '<path d="M70 118 q30 18 60 0 l5 15 q-35 18 -70 0z" fill="#e2453c"/><path d="M116 128 l12 26 l-13 2 l-5 -24z" fill="#c8362e"/>' : ''}${cat ? '<path d="M64 98 h-16 M64 104 l-14 4 M136 98 h16 M136 104 l14 4" stroke="#7a6a5a" stroke-width="1.6" stroke-linecap="round"/>' : ''}</g></svg>`;
}
/* Fonction pure : conseils concrets selon la météo et l'animal. */
function walkTips(M, d) {
  const t = [], flat = FLAT_FACE.test((d && d.breed) || ''), cat = d && spOf(d).id === 'cat', who = d ? d.name : 'votre animal';
  if (M.feels >= 25) t.push(['💧', 'Emportez de l’eau fraîche et un bol : proposez à boire toutes les 15 à 20 minutes.']);
  if (M.feels >= 25) t.push(['🖐️', 'Test du bitume : posez le dos de la main 5 secondes. Si vous ne tenez pas, c’est trop chaud pour ses coussinets.']);
  if (flat && M.feels >= 20) t.push(['⚠️', `${who} a le museau court : il évacue mal la chaleur. Sorties courtes, à l’aube ou tard le soir.`]);
  if (M.uv >= 6) t.push(['🧴', 'Indice UV élevé : les zones sans poils (ventre, museau, oreilles claires) brûlent. Préférez l’ombre et évitez le milieu de journée.']);
  if (M.feels <= 5) t.push(['🧥', 'Manteau conseillé pour un petit gabarit, un poil ras, un jeune ou un senior. Séchez bien au retour.']);
  if (M.feels <= 0) t.push(['🐾', 'Rincez les coussinets au retour (sel de déneigement, glace) et vérifiez qu’ils ne sont pas gercés.']);
  if (M.wind >= 40) t.push(['🌳', 'Vent fort : évitez les forêts et les zones à arbres, gardez la laisse courte.']);
  if (M.code >= 51 && M.code < 95) t.push(['☔', 'Pluie : imperméable pour les poils courts, serviette à l’arrivée, et séchez bien les plis et les oreilles.']);
  if (M.code >= 95) t.push(['🏠', `Orage : ${who} peut être terrifié. Restez à la maison, fermez les volets, mettez de la musique douce.`]);
  if (M.day === false) t.push(['🔦', 'Nuit : collier ou harnais lumineux et gilet réfléchissant, laisse courte.']);
  if (!t.length) t.push(['👍', `Conditions idéales : profitez-en pour faire une sortie plus longue avec ${who}, et travaillez un rappel ou un « au pied ».`]);
  if (cat) t.push(['🐱', 'Pour un chat qui sort : vérifiez qu’il peut rentrer à l’abri et qu’il a de l’eau à disposition.']);
  return t;
}
ACT['meteo-go'] = () => gate('weather', meteoLocate);
ROUTES.meteo = function meteo() {
  const d = dog(), head = `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🌦️ Météo balade</h1></div>`;
  if (!allowed('weather')) return `${head}<section class="card"><p>Chaleur, froid, pluie, orage : Wouf calcule si la balade est adaptée à <b>${esc(d.name)}</b> (race, âge, gabarit) et vous donne les meilleures heures pour sortir.</p><button class="btn primary big" data-act="paywall" data-f="weather">⭐ Débloquer avec Wouf Plus</button></section>`;
  if (METEO.st === 'idle') return `${head}<section class="card center"><div class="big-heart">🌦️</div><h2>Sortir au bon moment</h2><p>Wouf utilise votre position pour lire la météo locale et l’adapter à ${esc(d.name)}${FLAT_FACE.test(d.breed || '') ? ' (museau court : très sensible à la chaleur)' : ''}.</p><button class="btn primary big" data-act="meteo-go">📍 Voir la météo de la balade</button><p class="mut small">La position n’est envoyée qu’au service météo Open-Meteo, sans compte ni suivi.</p></section>`;
  if (METEO.st === 'loading') return `${head}<p class="loading">Chargement de la météo…</p>`;
  if (METEO.st === 'error') return `${head}<section class="card warnbox"><b>${esc(METEO.err)}</b></section><button class="btn" data-act="meteo-go">Réessayer</button>`;
  const M = METEO.data, r = walkRisk(M.feels, d, { storm: M.code >= 95, wind: M.wind }), w = WCODE(M.code), best = bestHours(M.hours, d);
  const fmtH = t => t.slice(11, 13) + ' h', ranges = [];
  best.forEach(h => { const last = ranges[ranges.length - 1]; if (last && diffDays(h.time.slice(0, 10), last.endDay) <= 1 && (parseInt(h.time.slice(11, 13), 10) - last.endH === 1 || (last.endH === 23 && h.time.slice(11, 13) === '00'))) { last.end = h.time; last.endH = parseInt(h.time.slice(11, 13), 10); last.endDay = h.time.slice(0, 10); } else ranges.push({ start: h.time, end: h.time, endH: parseInt(h.time.slice(11, 13), 10), endDay: h.time.slice(0, 10) }); });
  const sc = weatherScene(M, d);
  return `${head}<section class="card scene">${dogScene(sc, d)}<b>${esc(SCENE_TXT[sc][0])}</b><small>${esc(SCENE_TXT[sc][1])}</small></section><section class="card insight ${r.lvl}"><span class="ico">${w[0]}</span><span><b>${Math.round(M.temp)} °C · ressenti ${Math.round(M.feels)} °C · ${esc(w[1])} · vent ${Math.round(M.wind)} km/h</b><small>${esc(r.why)}</small></span></section>
    ${r.fragile ? `<p class="mut small">Seuils abaissés pour ${esc(d.name)} : ${FLAT_FACE.test(d.breed || '') ? 'museau court' : 'âge ou gabarit sensible'}.</p>` : ''}
    <section class="card"><h2>Meilleures heures pour sortir</h2>${ranges.length ? `<ul class="bul">${ranges.slice(0, 4).map(x => `<li><b>${fmtH(x.start)} – ${String((x.endH + 1) % 24).padStart(2, '0')} h</b>${x.start.slice(0, 10) !== today() ? ' (demain)' : ''}</li>`).join('')}</ul>` : `<p class="mut">Aucun créneau vraiment confortable dans les 24 h : privilégiez des sorties très courtes.</p>`}</section>
    <section class="card"><h2>Les prochaines heures</h2><div class="hours">${M.hours.filter((h, i) => i % 3 === 0).map(h => { const hr = walkRisk(h.t, d, { rain: h.rain, storm: h.storm, wind: h.wind }); return `<div class="hr ${hr.lvl}"><small>${fmtH(h.time)}</small><span>${WCODE(h.code)[0]}</span><b>${Math.round(h.t)}°</b><small>${Math.round(h.wind || 0)} km/h</small></div>`; }).join('')}</div></section>
    <section class="card"><h2>Nos conseils pour aujourd’hui</h2><div class="list">${walkTips(M, d).map(x => `<div class="row"><span class="ico">${x[0]}</span><span class="grow">${esc(x[1])}</span></div>`).join('')}</div></section>
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
