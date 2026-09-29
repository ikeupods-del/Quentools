// Tests du moteur de nutrition (calculs purs) : matière sèche, énergie, repères, note, ingrédients, allergènes, ration, coût.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../nutrition.js'), 'utf8'), ctx);
const N = n => vm.runInContext(n, ctx);
const near = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

const KIBBLE = { type: 'dry', stage: 'adult', protein: 26, fat: 14, fiber: 2.5, ash: 7, moisture: 10, ca: 1.2, p: 0.9, ingredients: 'Poulet déshydraté (30 %), riz, graisse de poulet, pulpe de betterave, huile de saumon, minéraux, tocophérols' };
const CHEAP = { type: 'dry', stage: 'adult', protein: 18, fat: 8, fiber: 4, ash: 8, moisture: 10, ca: 1.0, p: 0.8, ingredients: 'Céréales (maïs, blé), viandes et sous-produits animaux, colorants, sucre, BHA' };
const dog = (o = {}) => ({ species: 'dog', stage: 'adult', size: 'M', activity: 'normal', neutered: false, overweight: false, ...o });
const cat = (o = {}) => ({ species: 'cat', stage: 'adult', size: 'CAT', activity: 'normal', neutered: true, overweight: false, ...o });

test('matière sèche et glucides', () => {
  near(N('toDM')(26, { moisture: 10 }), 28.89); near(N('toDM')(8, { type: 'wet' }), 36.36);
  near(N('nfeAsFed')(KIBBLE), 40.5); assert.equal(N('nfeAsFed')({ protein: 26 }), null);
});
test('énergie : étiquette prioritaire, sinon estimation Atwater modifiée (3,5 / 8,5 / 3,5)', () => {
  const e = N('foodKcal100')(KIBBLE); near(e.v, 351.75, 0.01); assert.equal(e.src, 'estimée');
  const l = N('foodKcal100')({ ...KIBBLE, kcalKg: 3800 }); assert.equal(l.v, 380); assert.equal(l.src, 'étiquette');
  assert.equal(N('foodKcal100')({ protein: 26 }), null);
});
test('ration et coût : 30 kg, coefficient 1,6, produit à 351,75 kcal/100 g, 3 €/kg', () => {
  const kcal = N('dailyKcal')(30, 1.6); near(kcal, 1436, 2);
  const g = N('rationGrams')(kcal, 351.75); near(g, 408, 1); near(N('costPerDay')(g, 3), 1.225, 0.01);
  near(N('foodPricePerKg')({ price: 45, bagKg: 15 }), 3); assert.equal(N('foodPricePerKg')({ price: 45 }), null);
});
test('repères : dépendent de l’âge, de l’activité, de l’espèce et de la taille', () => {
  const T = N('nutTargets');
  assert.ok(T(dog({ activity: 'sport' })).fat[0] > T(dog()).fat[0] && T(dog({ activity: 'sport' })).energy[0] > T(dog()).energy[0]);
  assert.ok(T(dog({ neutered: true })).fat[1] < T(dog()).fat[1] && T(dog({ overweight: true })).fiber[0] > T(dog()).fiber[0], 'stérilisé ou en surpoids : moins gras, plus de fibres');
  assert.equal(T(dog({ stage: 'growth', size: 'XL' })).ca[2], 1.8); assert.equal(T(dog({ stage: 'growth', size: 'XL' })).largeGrowth, true); assert.equal(T(dog({ stage: 'growth', size: 'S' })).largeGrowth, false);
  assert.ok(T(dog({ stage: 'growth' })).protein[2] === 22.5 && T(dog()).protein[2] === 18, 'planchers AAFCO du chien');
  assert.ok(T(cat()).protein[2] === 26 && T(cat()).protein[0] > T(dog()).protein[0], 'le chat a des besoins en protéines plus élevés');
  assert.ok(T(dog({ size: 'S' })).energy[0] > T(dog({ size: 'M' })).energy[0], 'petits chiens : aliment plus concentré');
});
test('note : un produit riche et bien composé bat un produit pauvre, pour un chien actif', () => {
  const S = N('scoreFood'), p = dog({ activity: 'high' });
  const a = S(KIBBLE, p), b = S(CHEAP, p);
  assert.ok(a.total >= 80 && b.total <= 55 && a.total - b.total >= 25, `${a.total} vs ${b.total}`);
  assert.equal(b.parts.find(x => x.key === 'protein').lvl, 'bad', 'protéines sous le plancher');
  assert.ok(b.flags.some(f => /Colorants/.test(f.msg)) && b.flags.some(f => /BHA/.test(f.msg)) && b.flags.some(f => /Sucres/.test(f.msg)) && b.flags.some(f => /sous-produits/.test(f.msg)));
});
test('chiot de grande race : calcium au-dessus du maximum = alerte, aliment adulte = refusé', () => {
  const S = N('scoreFood'), p = dog({ stage: 'growth', size: 'XL' });
  const good = S({ ...KIBBLE, stage: 'growth', protein: 28, fat: 15, ca: 1.3, p: 1.0 }, p), high = S({ ...KIBBLE, stage: 'growth', protein: 28, fat: 15, ca: 2.2, p: 1.2 }, p);
  assert.equal(good.parts.find(x => x.key === 'minerals').lvl, 'ok'); const m = high.parts.find(x => x.key === 'minerals');
  assert.equal(m.lvl, 'bad'); assert.equal(m.pts, 0); assert.match(m.msg, /grande race/); assert.ok(good.total - high.total >= 10);
  const adult = S({ ...KIBBLE, stage: 'adult' }, p).parts.find(x => x.key === 'stage'); assert.equal(adult.lvl, 'bad'); assert.equal(adult.pts, 0);
  const all = S({ ...KIBBLE, stage: 'all' }, p).parts.find(x => x.key === 'stage'); assert.equal(all.lvl, 'warn', '« tous âges » : mise en garde pour les grandes races');
  const noCa = S({ ...KIBBLE, stage: 'growth', ca: '', p: '' }, p).parts.find(x => x.key === 'minerals'); assert.equal(noCa.lvl, 'warn', 'calcium absent : à vérifier pour un grand chiot');
});
test('senior, surpoids et chat', () => {
  const S = N('scoreFood');
  assert.equal(S({ ...KIBBLE, stage: 'growth' }, dog({ stage: 'senior' })).parts.find(x => x.key === 'stage').lvl, 'warn');
  assert.equal(S({ ...KIBBLE, stage: 'light' }, dog({ overweight: true })).parts.find(x => x.key === 'stage').pts, 10);
  assert.equal(S(KIBBLE, dog({ overweight: true })).parts.find(x => x.key === 'stage').lvl, 'warn');
  const catFood = { type: 'dry', stage: 'adult', protein: 36, fat: 16, fiber: 3, ash: 7, moisture: 8, ingredients: 'Poulet déshydraté, riz, graisse de volaille, huile de poisson' };
  const poor = S({ ...catFood, protein: 20, fat: 10 }, cat()); assert.ok(S(catFood, cat()).total >= 75 && poor.total < S(catFood, cat()).total - 20, 'protéines insuffisantes pour un chat'); assert.equal(poor.parts.find(x => x.key === 'protein').lvl, 'bad');
  assert.ok(S({ ...catFood, protein: 24, fat: 10 }, cat()).total >= poor.total, 'au minimum réglementaire : pas disqualifié');
  const wet = S({ type: 'wet', stage: 'adult', protein: 9, fat: 5, fiber: 0.5, ash: 2, moisture: 80, ingredients: 'Poulet, bouillon, foie de poulet' }, cat());
  assert.ok(wet.flags.some(f => /hydratation/.test(f.msg)), 'pâtée pour chat : bonus d’hydratation'); assert.ok(wet.dm.protein > 40);
});
test('données manquantes : notes partielles signalées, jamais de fausse précision', () => {
  const r = N('scoreFood')({ type: 'dry', stage: 'adult', protein: 26, fat: 14 }, dog());
  assert.ok(r.missing >= 3 && r.parts.filter(x => x.na).every(x => Math.abs(x.pts - x.max * 0.6) < 0.06 && x.lvl !== 'ok'));
  assert.equal(r.kcal, null); assert.match(r.flags[0].msg, /non renseignée/);
});
test('ingrédients : premier ingrédient, sous-produits, sans colorant, pois ≠ poisson', () => {
  const A = N('analyseIngredients');
  assert.equal(A('Poulet frais (20 %), riz').cat, 'viande nommée'); assert.equal(A('Farine de saumon, pomme de terre').cat, 'viande déshydratée nommée');
  assert.equal(A('Maïs, gluten, viande').cat, 'céréale'); assert.equal(A('Viandes et sous-produits animaux (dont 4 % de poulet), riz').cat, 'sous-produits');
  assert.ok(A('Poulet, riz, sans colorants ni conservateurs artificiels').flags.every(f => !/Colorants/.test(f.msg)), '« sans colorants » n’alerte pas');
  assert.equal(A('Pois, lentilles, poulet').cat, 'légumineuse'); assert.equal(A('Poisson déshydraté, pois').cat, 'viande déshydratée nommée', 'poisson n’est pas un pois');
  assert.ok(A('Poulet, pois, lentilles, pomme de terre, fève').flags.some(f => /légumineuses/.test(f.msg)));
  assert.equal(A('').quality, null); assert.deepEqual(A('Poulet (20 % dont foie), riz (10 %, complet), maïs').items.length, 3, 'virgules entre parenthèses ignorées');
  assert.ok(A('Poulet, œufs, lait écrémé, blé').allergens.includes('oeuf') && A('Poulet, œufs, lait écrémé, blé').allergens.includes('lait') && A('Poulet, blé').allergens.includes('ble'));
});
test('allergies déclarées : détection dans la liste d’ingrédients', () => {
  const H = N('allergyHits'), ing = N('analyseIngredients')('Poulet, riz, gluten de blé, œuf en poudre').allergens;
  const L = (a) => [...H(a, ing)].sort();
  assert.deepEqual(L('Allergique au poulet'), ['poulet']); assert.deepEqual(L('blé et œufs'), ['ble', 'oeuf']);
  assert.deepEqual(L(''), []); assert.deepEqual(L('poisson'), []); assert.deepEqual(L('allergie au riz et à la dinde'), ['riz']);
});
