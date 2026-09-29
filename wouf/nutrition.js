'use strict';
/* Wouf — nutrition : calculs purs (sans écran ni état) du comparateur de croquettes.

   HONNÊTETÉ : Wouf n'embarque AUCUNE base de produits inventée. Il analyse la composition RÉELLE lue sur l'étiquette
   (saisie à la main ou récupérée sur Open Pet Food Facts) et la compare aux besoins de l'animal.
   Les repères sont des valeurs simplifiées inspirées des recommandations européennes (FEDIAF) et américaines (AAFCO) ;
   ils orientent un choix, ils ne remplacent ni l'étiquette, ni l'avis d'un vétérinaire (surtout en cas de maladie :
   rein, cœur, diabète, allergies confirmées, régimes d'exclusion…).

   Vocabulaire : « MS » = matière sèche (on retire l'eau pour comparer croquettes et pâtées à armes égales). */

const FOOD_TYPES = { dry: { label: 'Croquettes', moisture: 10 }, semi: { label: 'Semi-humide', moisture: 25 }, wet: { label: 'Pâtée / boîte', moisture: 78 } };
const FOOD_STAGES = { all: 'Tous âges', growth: 'Croissance (chiot / chaton)', adult: 'Adulte', senior: 'Senior', light: 'Allégé / stérilisé' };
const ACTIVITY = { low: 'Sédentaire', normal: 'Normale', high: 'Active', sport: 'Sportive' };

const nuNum = v => (v === '' || v == null || !isFinite(+v)) ? null : +v;
const nuR1 = v => Math.round(v * 10) / 10;
const nuNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');

/* ---------- Composition : matière sèche, glucides, énergie ---------- */
const foodMoisture = f => nuNum(f.moisture) ?? (FOOD_TYPES[f.type] || FOOD_TYPES.dry).moisture;
const toDM = (v, f) => (nuNum(v) == null ? null : nuNum(v) * 100 / (100 - foodMoisture(f)));
function nfeAsFed(f) {   // extractif non azoté (« glucides ») estimé par différence, sur produit tel que vendu
  const a = [f.protein, f.fat, f.fiber, f.ash].map(nuNum); if (a.some(x => x == null)) return null;
  return Math.max(0, 100 - a[0] - a[1] - a[2] - a[3] - foodMoisture(f));
}
/* kcal d'énergie métabolisable pour 100 g de produit : valeur de l'étiquette sinon estimation (Atwater modifié 3,5 / 8,5 / 3,5). */
function foodKcal100(f) {
  const k = nuNum(f.kcalKg); if (k) return { v: k / 10, src: 'étiquette' };
  const nfe = nfeAsFed(f); if (nfe == null) return null;
  return { v: 3.5 * nuNum(f.protein) + 8.5 * nuNum(f.fat) + 3.5 * nfe, src: 'estimée' };
}
const foodPricePerKg = f => (nuNum(f.price) && nuNum(f.bagKg)) ? nuNum(f.price) / nuNum(f.bagKg) : null;

/* ---------- Besoins énergétiques ---------- */
const dailyKcal = (kg, factor) => 70 * Math.pow(kg, 0.75) * factor;   // RER × coefficient (WSAVA / NRC)
const rationGrams = (kcalDay, kcal100) => kcalDay / kcal100 * 100;
const costPerDay = (grams, pricePerKg) => grams / 1000 * pricePerKg;

/* ---------- Repères nutritionnels selon le profil ---------- */
/* profil : { species:'dog'|'cat', stage:'growth'|'adult'|'senior', size:'S'|'M'|'L'|'XL'|'CAT', activity, neutered, overweight }
   sortie : plages [souhaitable min, souhaitable max, plancher] en % de MS ; énergie en kcal / 100 g (produit sec). */
function nutTargets(p) {
  const cat = p.species === 'cat', big = p.size === 'L' || p.size === 'XL', small = p.size === 'S';
  const calm = p.activity === 'low' || p.neutered || p.overweight;
  let t;
  if (cat) {
    if (p.stage === 'growth') t = { protein: [34, 45, 30], fat: [18, 26, 9], fiber: [1, 4], energy: [400, 480], ca: [1.0, 1.8] };
    else if (p.stage === 'senior') t = { protein: [34, 45, 26], fat: [10, 18, 9], fiber: [2, 7], energy: [350, 410], ca: [0.6, 1.6] };
    else t = calm ? { protein: [32, 45, 26], fat: [10, 16, 9], fiber: [3, 8], energy: [330, 390], ca: [0.6, 1.6] } : { protein: [32, 45, 26], fat: [12, 22, 9], fiber: [1, 5], energy: [380, 440], ca: [0.6, 1.6] };
    t.nfeMax = 40;
  } else if (p.stage === 'growth') {
    t = { protein: [25, 32, 22.5], fat: [10, 18, 8.5], fiber: [1, 5], energy: [360, 430], ca: big ? [1.0, 1.5, 1.8] : [1.0, 1.8, 2.5] };
  } else if (p.stage === 'senior') {
    t = { protein: [24, 32, 18], fat: [8, 13, 5.5], fiber: [2, 7], energy: [320, 370], ca: [0.5, 1.8] };
  } else if (p.activity === 'sport') {
    t = { protein: [28, 36, 18], fat: [18, 24, 5.5], fiber: [1, 4], energy: [420, 500], ca: [0.6, 1.8] };
  } else if (p.activity === 'high') {
    t = { protein: [26, 34, 18], fat: [14, 20, 5.5], fiber: [1, 5], energy: [380, 440], ca: [0.6, 1.8] };
  } else if (calm) {
    t = { protein: [24, 32, 18], fat: [7, 12, 5.5], fiber: [3, 9], energy: [300, 360], ca: [0.6, 1.8] };
  } else {
    t = { protein: [22, 30, 18], fat: [10, 16, 5.5], fiber: [1, 5], energy: [340, 400], ca: [0.6, 1.8] };
  }
  if (small && !cat) t.energy = [t.energy[0] + 20, t.energy[1] + 20];   // les petits chiens ont besoin d'aliments plus concentrés
  t.caRatio = [1, 2];
  t.largeGrowth = !cat && p.stage === 'growth' && big;
  return t;
}

/* ---------- Liste d'ingrédients ---------- */
const MEATS = 'viande|poulet|volaille|boeuf|agneau|dinde|canard|saumon|poisson|thon|lapin|porc|gibier|veau|cerf|sanglier|oie|truite|hareng|sardine|maquereau|cabillaud|foie';
const CEREALS = 'ble|mais|riz|orge|avoine|cereale|sorgho|seigle|son |gluten';
const LEGUMES = 'pois|lentille|feverole|pois chiche|pomme de terre|patate|manioc|soja|haricot|luzerne';
const ALLERGENS = {
  boeuf: 'boeuf|veau', poulet: 'poulet|volaille', dinde: 'dinde', agneau: 'agneau|mouton', porc: 'porc', poisson: 'poisson|saumon|thon|truite|hareng|sardine|maquereau|cabillaud',
  oeuf: 'oeuf', lait: 'lait|laitier|lactose|lactoserum|caseine|fromage', ble: 'ble|gluten|froment|seigle|orge', mais: 'mais', soja: 'soja', riz: 'riz'
};
const ALLERGEN_LABEL = { boeuf: 'bœuf', poulet: 'poulet / volaille', dinde: 'dinde', agneau: 'agneau', porc: 'porc', poisson: 'poisson', oeuf: 'œuf', lait: 'lait / produits laitiers', ble: 'blé / gluten', mais: 'maïs', soja: 'soja', riz: 'riz' };
function splitIngredients(text) {   // découpe sur les virgules hors parenthèses
  const out = []; let d = 0, cur = '';
  for (const ch of String(text || '')) { if (ch === '(') d++; if (ch === ')') d = Math.max(0, d - 1); if ((ch === ',' || ch === ';') && !d) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}
const nuHas = (s, re) => new RegExp(`(^|[^a-z])(${re})s?(?![a-z])`).test(s);
function analyseIngredients(text) {
  const items = splitIngredients(text), first = items[0] ? nuNorm(items[0]) : '';
  const flags = []; let q = 0.6, cat = 'inconnu';
  if (!items.length) return { items, flags: [{ lvl: 'na', msg: 'Liste d’ingrédients non renseignée : recopiez-la depuis le sac pour une analyse complète.' }], quality: null, first: '', cat, allergens: [] };
  const all = nuNorm(text), byProd = /sous-produits?|derives? (d.origine )?animaux|matieres? premieres? d.origine animale/.test(all);
  const unspecified = /(viandes? et (sous-produits|derives)|sous-produits animaux|derives d.origine animale|matieres? premieres? d.origine animale)/.test(all);
  const isMeal = /(farine|deshydrat|poudre|hydrolysat)/.test(first), meatFirst = nuHas(first, MEATS);
  if (meatFirst && !/sous-produit/.test(first)) { cat = isMeal ? 'viande déshydratée nommée' : 'viande nommée'; q = 1; flags.push({ lvl: 'ok', msg: `Premier ingrédient : ${items[0]} (source animale nommée).` }); }
  else if (/sous-produit|derive/.test(first)) { cat = 'sous-produits'; q = 0.35; flags.push({ lvl: 'warn', msg: 'Premier ingrédient : sous-produits ou dérivés animaux, sans origine précise.' }); }
  else if (nuHas(first, CEREALS)) { cat = 'céréale'; q = 0.45; flags.push({ lvl: 'warn', msg: `Premier ingrédient : ${items[0]} (céréale). La source de protéines principale n’est pas animale.` }); }
  else if (nuHas(first, LEGUMES)) { cat = 'légumineuse'; q = 0.5; flags.push({ lvl: 'warn', msg: `Premier ingrédient : ${items[0]} (végétal). À examiner avec la teneur en protéines.` }); }
  else flags.push({ lvl: 'na', msg: `Premier ingrédient : ${items[0]}.` });
  // Attention : une viande « fraîche » contient ~70 % d'eau ; l'ordre reflète le poids AVANT cuisson.
  if (unspecified) { q -= 0.25; flags.push({ lvl: 'warn', msg: 'Mention « viandes et sous-produits animaux » : l’origine et la proportion des viandes ne sont pas précisées.' }); }
  else if (byProd) { q -= 0.1; flags.push({ lvl: 'warn', msg: 'Contient des sous-produits animaux (à distinguer des abats nommés comme « foie de poulet », qui sont nutritifs).' }); }
  if (/(colorant|tartrazine|\be ?1[0-9]{2}\b|caramel)/.test(all) && !/sans[^.;]{0,25}colorant/.test(all)) { q -= 0.15; flags.push({ lvl: 'warn', msg: 'Colorants : inutiles pour l’animal (ils servent à séduire l’acheteur).' }); }
  if (/(\bbha\b|\bbht\b|ethoxyquine|\be ?320\b|\be ?321\b|\be ?324\b)/.test(all)) { q -= 0.15; flags.push({ lvl: 'warn', msg: 'Antioxydants de synthèse (BHA, BHT, éthoxyquine) : préférez des tocophérols (vitamine E) ou du romarin.' }); }
  if (/(sucre|sirop|glucose|fructose|melasse)/.test(all)) { q -= 0.1; flags.push({ lvl: 'warn', msg: 'Sucres ajoutés : inutiles et à éviter (surpoids, dents).' }); }
  const nLeg = items.slice(0, 8).filter(i => nuHas(nuNorm(i), LEGUMES)).length;
  if (nLeg >= 3) flags.push({ lvl: 'warn', msg: 'Beaucoup de légumineuses (pois, lentilles, pomme de terre) parmi les premiers ingrédients : recette « sans céréales » à base végétale. Sans preuve de bénéfice, et une enquête américaine a étudié un lien possible avec des atteintes cardiaques chez certains chiens : demandez conseil à votre vétérinaire.' });
  const allergens = Object.keys(ALLERGENS).filter(k => nuHas(all, ALLERGENS[k]));
  return { items, flags, quality: Math.max(0, Math.min(1, q)), first: items[0], cat, allergens };
}
/* Allergènes du produit qui correspondent aux allergies déclarées de l'animal (texte libre). */
function allergyHits(allergiesText, allergens) {
  const a = nuNorm(allergiesText); if (!a) return [];
  return allergens.filter(k => nuHas(a, ALLERGENS[k]) || nuHas(a, nuNorm(ALLERGEN_LABEL[k]).split(/[ /]/)[0]));
}

/* ---------- Note d'adéquation (0-100) ---------- */
function rangeScore(v, lo, hi, floor, max, overTol = 0.5) {
  if (v == null) return null;
  if (floor != null && v < floor) return 0;
  if (v >= lo && v <= hi) return max;
  if (v < lo) { const fl = floor != null ? floor : lo * 0.7; return max * Math.max(0.35, (v - fl) / (lo - fl || 1)); }
  return max * Math.max(overTol, 1 - ((v - hi) / hi) * 1.2);
}
function stageFit(food, p) {
  const s = food.stage || 'all';
  if (p.stage === 'growth') return s === 'growth' ? [10, 'ok', 'Aliment conçu pour la croissance.'] : s === 'all' ? (p.size === 'L' || p.size === 'XL' ? [5, 'warn', 'Aliment « tous âges » : pour un chiot de grande race, choisissez un aliment « croissance grandes races » (calcium et énergie maîtrisés).'] : [8, 'ok', 'Aliment tous âges, convient à la croissance.']) : [0, 'bad', 'Aliment non prévu pour la croissance : risque de carences en énergie, calcium et protéines.'];
  if (p.stage === 'senior') return s === 'senior' ? [10, 'ok', 'Aliment conçu pour les seniors.'] : s === 'adult' || s === 'light' || s === 'all' ? [7, 'ok', 'Convient à un adulte âgé en bonne santé ; vérifiez énergie et fibres.'] : [3, 'warn', 'Aliment de croissance : trop riche en énergie pour un senior.'];
  if (p.overweight) return s === 'light' ? [10, 'ok', 'Aliment allégé : adapté au contrôle du poids.'] : [6, 'warn', 'Animal en surpoids : un aliment allégé ou à énergie contrôlée est préférable.'];
  return s === 'adult' || s === 'light' ? [10, 'ok', 'Aliment conçu pour l’adulte.'] : s === 'all' ? [7, 'ok', 'Aliment tous âges : convient, souvent plus riche en énergie.'] : s === 'senior' ? [6, 'warn', 'Aliment senior : moins énergétique, à réserver aux animaux âgés.'] : [4, 'warn', 'Aliment de croissance : trop énergétique pour un adulte, risque de surpoids.'];
}
function scoreFood(food, p) {
  const t = nutTargets(p), parts = [], flags = [];
  const P = toDM(food.protein, food), F = toDM(food.fat, food), Fb = toDM(food.fiber, food), ca = toDM(food.ca, food), ph = toDM(food.p, food), kc = foodKcal100(food);
  const eqDry = kc ? kc.v * 100 / (100 - foodMoisture(food)) * 0.9 : null;   // ramené à un équivalent « croquettes à 90 % de MS » pour comparer aux plages
  const add = (key, label, max, val, msgFn) => { const na = val == null; const pts = na ? max * 0.6 : val; parts.push({ key, label, max, pts: Math.round(pts * 10) / 10, na, ...msgFn(na, pts / max) }); };
  add('protein', 'Protéines', 22, rangeScore(P, t.protein[0], t.protein[1], t.protein[2], 22, 0.75), (na, r) => na ? { lvl: 'na', msg: 'Teneur non renseignée.' } : { lvl: r >= 0.99 ? 'ok' : r < 0.5 ? 'bad' : 'warn', msg: `${nuR1(P)} % de la MS (repère ${t.protein[0]}–${t.protein[1]} %${P < t.protein[2] ? ' ; en dessous du minimum recommandé de ' + t.protein[2] + ' %' : ''}).` });
  add('fat', 'Matières grasses', 14, rangeScore(F, t.fat[0], t.fat[1], t.fat[2], 14), (na, r) => na ? { lvl: 'na', msg: 'Teneur non renseignée.' } : { lvl: r >= 0.99 ? 'ok' : r < 0.5 ? 'bad' : 'warn', msg: `${nuR1(F)} % de la MS (repère ${t.fat[0]}–${t.fat[1]} %).` });
  add('energy', 'Énergie', 12, eqDry == null ? null : rangeScore(eqDry, t.energy[0], t.energy[1], null, 12, 0.35), (na, r) => na ? { lvl: 'na', msg: 'Énergie inconnue (composition incomplète).' } : { lvl: r >= 0.99 ? 'ok' : 'warn', msg: `${Math.round(kc.v)} kcal/100 g (${kc.src}) ; repère ${t.energy[0]}–${t.energy[1]} kcal/100 g pour du sec${food.type === 'wet' ? ' (comparé en équivalent matière sèche)' : ''}.` });
  add('fiber', 'Fibres', 8, Fb == null ? null : rangeScore(Fb, t.fiber[0], t.fiber[1], null, 8, 0.4), (na, r) => na ? { lvl: 'na', msg: 'Teneur non renseignée.' } : { lvl: r >= 0.99 ? 'ok' : 'warn', msg: `${nuR1(Fb)} % de la MS (repère ${t.fiber[0]}–${t.fiber[1]} %).` });
  // Minéraux : calcium et rapport Ca/P
  let minPts = null, minMsg = 'Calcium et phosphore non renseignés' + (t.largeGrowth ? ' : indispensables pour un chiot de grande race, à vérifier sur l’étiquette.' : '.'), minLvl = t.largeGrowth ? 'warn' : 'na';
  if (ca != null) {
    minPts = 14; minLvl = 'ok'; const bits = [`calcium ${nuR1(ca)} % MS`];
    if (t.ca && ca < t.ca[0]) { minPts = 6; minLvl = 'warn'; bits.push(`inférieur au repère (${t.ca[0]} %)`); }
    if (t.ca && t.ca[2] && ca > t.ca[2]) { minPts = 0; minLvl = 'bad'; bits.push(`AU-DESSUS du maximum sûr (${t.ca[2]} %${t.largeGrowth ? ' pour un chiot de grande race : risque de troubles osseux et articulaires' : ''})`); }
    else if (t.ca && ca > t.ca[1]) { minPts = Math.min(minPts, 9); minLvl = minLvl === 'ok' ? 'warn' : minLvl; bits.push(`au-dessus du repère (${t.ca[1]} %)`); }
    if (ph != null) { const ratio = ca / ph; bits.push(`Ca/P ${nuR1(ratio)}`); if (ratio < t.caRatio[0] || ratio > t.caRatio[1]) { minPts = Math.min(minPts, 7); if (minLvl !== 'bad') minLvl = 'warn'; bits.push('rapport hors de 1–2'); } }
    minMsg = bits.join(', ') + '.';
  }
  add('minerals', 'Minéraux', 14, minPts, () => ({ lvl: minLvl, msg: minMsg }));
  const ing = analyseIngredients(food.ingredients), nfe = nfeAsFed(food);
  add('ingredients', 'Ingrédients', 20, ing.quality == null ? null : ing.quality * 20, (na) => na ? { lvl: 'na', msg: ing.flags[0].msg } : { lvl: ing.quality >= 0.8 ? 'ok' : ing.quality < 0.5 ? 'bad' : 'warn', msg: ing.cat === 'inconnu' ? 'Qualité estimée d’après la liste.' : `Source principale : ${ing.cat}.` });
  const sf = stageFit(food, p); parts.push({ key: 'stage', label: 'Adapté à l’âge', max: 10, pts: sf[0], na: false, lvl: sf[1], msg: sf[2] });
  if (t.nfeMax && nfe != null) { const nd = toDM(nfe, food); if (nd > t.nfeMax + 5) flags.push({ lvl: 'warn', msg: `Glucides estimés à ${Math.round(nd)} % de la MS : élevés pour un carnivore strict (repère ≤ ${t.nfeMax} %).` }); }
  if (food.type === 'wet' && p.species === 'cat') flags.push({ lvl: 'ok', msg: 'Alimentation humide : excellent pour l’hydratation et la protection des reins et des voies urinaires du chat.' });
  if (p.species === 'cat' && food.stage !== 'adult' && food.stage !== 'growth' && food.stage !== 'senior' && food.stage !== 'light' && food.stage !== 'all') flags.push({ lvl: 'warn', msg: 'Vérifiez que l’aliment est « complet » (taurine incluse) et non « complémentaire ».' });
  const total = Math.round(parts.reduce((a, x) => a + x.pts, 0));
  const label = total >= 80 ? ['Très bien adapté', 'ok'] : total >= 65 ? ['Bien adapté', 'ok'] : total >= 50 ? ['Acceptable, à compléter', 'warn'] : ['Peu adapté', 'bad'];
  const missing = parts.filter(x => x.na).length;
  return { total, label, parts, flags: [...ing.flags, ...flags], ingredients: ing, targets: t, kcal: kc, dm: { protein: P, fat: F, fiber: Fb, ca, p: ph, nfe: nfe == null ? null : toDM(nfe, food) }, missing };
}

/* ---------- Devinette du type / de l'âge visé d'après le nom d'un produit (données Open Pet Food Facts) ---------- */
function guessFoodStage(name) {
  const n = nuNorm(name);
  if (/tous (les )?ages|all life ?stages?|toutes? etapes/.test(n)) return 'all';   // « chiot tous âges » n'est PAS un aliment de croissance strict
  if (nuHas(n, 'chiot|puppy|junior|kitten|chaton|croissance|growth|starter')) return 'growth';
  if (nuHas(n, 'senior|mature|vieux|ageing|aging|age|7\\+|8\\+')) return 'senior';
  if (nuHas(n, 'light|sterili[a-z]*|leger|allege|minceur|weight|obesity|neutered|castre')) return 'light';
  if (nuHas(n, 'adulte?')) return 'adult';
  return 'all';
}
function guessFoodType(name, moisture) {
  const m = nuNum(moisture);
  if (m != null) return m >= 60 ? 'wet' : m >= 20 ? 'semi' : 'dry';
  return nuHas(nuNorm(name), 'patee|terrine|mousse|emince|gelee|sauce|boite|sachet|pouch|wet|humide') ? 'wet' : 'dry';
}

/* ---------- Recommandation personnalisée : type d'aliment adapté au profil (jamais une marque) ---------- */
/* p : profil (voir nutTargets) + months ; ctx : { allergies:'texte libre', breed:'nom de race' } */
function recommendFood(p, ctx = {}) {
  const cat = p.species === 'cat', big = p.size === 'L' || p.size === 'XL', small = p.size === 'S', t = nutTargets(p);
  const calm = p.activity === 'low' || p.neutered || p.overweight, animal = cat ? 'chat' : 'chien';
  let headline, why, searches;
  if (cat) {
    if (p.stage === 'growth') { headline = 'Croquettes chaton, complétées de pâtée'; why = 'Le chaton grandit vite : il lui faut un aliment concentré en énergie et en protéines, plusieurs petits repas, et de l’eau (pâtée).'; searches = ['croquettes chaton', 'pâtée chaton']; }
    else if (p.stage === 'senior') { headline = 'Aliment senior pour chat, humide de préférence'; why = 'Le chat âgé a besoin de protéines de qualité, d’eau (reins) et d’un poids stable : privilégiez la pâtée, en plusieurs petits repas.'; searches = ['croquettes chat senior', 'pâtée chat senior']; }
    else if (calm) { headline = 'Croquettes chat stérilisé, associées à de la pâtée'; why = 'Après stérilisation (ou en vie d’appartement), l’énergie doit être contrôlée sans baisser les protéines ; l’humide protège reins et voies urinaires.'; searches = ['croquettes chat stérilisé', 'pâtée chat stérilisé']; }
    else { headline = 'Croquettes chat adulte, associées à de la pâtée'; why = 'Le chat est un carnivore strict : protéines animales élevées, peu de glucides, et beaucoup d’eau grâce à l’alimentation humide.'; searches = ['croquettes chat adulte', 'pâtée chat adulte']; }
  } else if (p.stage === 'growth') {
    headline = big ? 'Croquettes croissance grandes races' : small ? 'Croquettes chiot petite race' : 'Croquettes chiot';
    why = big ? 'Un chiot de grande race doit grandir lentement : énergie maîtrisée et calcium strictement limité protègent ses articulations et ses os.' : 'Le chiot a besoin d’énergie, de protéines et de minéraux adaptés à sa croissance.';
    searches = [big ? 'croquettes chiot grande race' : small ? 'croquettes chiot petite race' : 'croquettes chiot', 'pâtée chiot'];
  } else if (p.stage === 'senior') {
    headline = 'Croquettes senior'; why = 'Le chien âgé garde besoin de protéines de qualité pour préserver ses muscles, avec une énergie modérée pour éviter la prise de poids.';
    searches = ['croquettes chien senior', big ? 'croquettes chien senior grande race' : 'croquettes chien senior petite race'];
  } else if (p.overweight) {
    headline = 'Croquettes allégées (contrôle du poids)'; why = 'Le surpoids se corrige avec une énergie contrôlée, des fibres plus élevées et des protéines maintenues pour garder les muscles.';
    searches = ['croquettes chien light', 'croquettes chien stérilisé'];
  } else if (p.activity === 'sport' || p.activity === 'high') {
    headline = p.activity === 'sport' ? 'Croquettes sport, riches en protéines et en graisses' : 'Croquettes adulte actif, plus énergétiques'; why = 'Un chien actif dépense beaucoup : il lui faut une énergie dense, des protéines et des graisses de qualité, et des repas répartis autour de l’effort.';
    searches = ['croquettes chien actif', big ? 'croquettes chien adulte grande race' : 'croquettes chien adulte'];
  } else if (p.neutered || p.activity === 'low') {
    headline = 'Croquettes adulte stérilisé, énergie modérée'; why = 'Après stérilisation ou avec peu d’activité, les besoins en énergie baissent : mieux vaut un aliment moins gras et plus riche en fibres.';
    searches = ['croquettes chien stérilisé', big ? 'croquettes chien adulte grande race' : 'croquettes chien adulte'];
  } else {
    headline = big ? 'Croquettes adulte grandes races' : small ? 'Croquettes adulte petites races' : 'Croquettes adulte'; why = 'Un aliment complet d’entretien, adapté à la taille : protéines animales nommées, énergie modérée.';
    searches = [big ? 'croquettes chien adulte grande race' : small ? 'croquettes chien adulte petite race' : 'croquettes chien adulte', 'pâtée chien adulte'];
  }
  const kibble = cat ? (nuHas(nuNorm(ctx.breed || ''), 'persan|exotic') ? 'Croquettes à forme adaptée aux museaux plats (persans, exotics)' : 'Petites croquettes adaptées à la mâchoire du chat')
    : small ? 'Petites croquettes (moins de 10 mm), faciles à croquer et à digérer' : big ? 'Grosses croquettes, qui incitent à mâcher (gamelle anti-glouton si besoin)' : 'Croquettes de taille moyenne';
  const m = p.months;
  const meals = cat ? (p.stage === 'growth' ? '4 repas par jour' : '3 à 5 petits repas, ou nourriture cachée dans des jouets')
    : p.stage === 'growth' ? (m != null && m < 4 ? '4 repas par jour' : m != null && m < 6 ? '3 repas par jour' : '2 à 3 repas par jour')
    : big ? '2 à 3 repas par jour (limite le risque de torsion d’estomac)' : '2 repas par jour';
  const format = cat ? 'Mélange sec + humide (hydratation, reins, voies urinaires)' : (p.stage === 'growth' && !small ? 'Croquettes, éventuellement humidifiées les premières semaines' : 'Croquettes, pâtée en complément possible');
  const must = [`Protéines ${t.protein[0]} à ${t.protein[1]} % de la matière sèche (minimum ${t.protein[2]} %)`, `Matières grasses ${t.fat[0]} à ${t.fat[1]} %`, `Énergie ${t.energy[0]} à ${t.energy[1]} kcal/100 g`, `Fibres ${t.fiber[0]} à ${t.fiber[1]} %`];
  if (t.largeGrowth) must.push('Calcium entre 1,0 et 1,5 % de la matière sèche (maximum strict 1,8 %)');
  must.push('Mention « aliment complet » adaptée à ' + (cat ? 'un chat (taurine incluse)' : 'un chien'), 'Première source de protéines animale et nommée (poulet, saumon…)');
  const avoid = [];
  if (ctx.allergies) avoid.push(`Tout produit contenant vos allergènes déclarés (« ${String(ctx.allergies).slice(0, 60)} »)`);
  if (t.largeGrowth) avoid.push('Les aliments « tous âges » et les aliments adulte pour un chiot de grande race');
  if (p.stage === 'growth' && !t.largeGrowth) avoid.push('Les aliments adulte (carences en énergie, calcium et protéines)');
  if (p.overweight) avoid.push('Les aliments très énergétiques (plus de 400 kcal/100 g) et les friandises à volonté');
  if (p.stage === 'senior') avoid.push('Les aliments de croissance, trop riches en énergie');
  avoid.push('Colorants, sucres ajoutés, BHA / BHT / éthoxyquine, et mentions vagues (« viandes et sous-produits animaux »)');
  return { headline, why, kibble, meals, format, must, avoid, searches: searches.map(q => ({ q, label: q.replace(/^./, c => c.toUpperCase()) })), animal };
}
