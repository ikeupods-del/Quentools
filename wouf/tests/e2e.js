'use strict';
/* Tests de bout en bout : un vrai navigateur (Chromium) pilote l'app comme un utilisateur.
   Lancer : `npm run test:e2e` (ou `npm test` pour tout). Variables : PW_CHROMIUM = chemin d'un Chromium déjà installé. */
const assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const { start } = require('./serve');

const BASE = () => `http://localhost:${PORT}/wouf/`;
let PORT, browser, srv;
const results = [];
const T = [];
const test = (name, fn) => T.push([name, fn]);

const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dogRec = (o = {}) => ({ id: 'd1', name: 'Nala', species: 'dog', breed: 'Golden Retriever', sex: 'F', birth: '2022-05-10', insurance: {}, ...o });
const seed = (over = {}) => ({ v: 1, schema: 2, dogs: [dogRec()], events: [], weights: [], meds: [], medLog: {}, journal: [], expenses: [], docs: [], quotes: [], contacts: [], walks: [], owner: { name: 'Quentin', phone: '0600000000' }, settings: { notif: false, lastNotif: '', lastBackup: day(0), home: null, seenVersion: '1.2.0' }, sub: null, current: 'd1', installedAt: '2026-01-01', edu: {}, updatedAt: 1000, ...over });

/* Ouvre une page neuve. seed=null : premier lancement. */
async function boot({ data = seed(), geo = false, hash = '#/home', query = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, locale: 'fr-FR', acceptDownloads: true, ...(geo ? { geolocation: { latitude: 48.8566, longitude: 2.3522, accuracy: 5 }, permissions: ['geolocation'] } : {}) });
  if (data) await ctx.addInitScript(s => { if (!localStorage.getItem('wouf:data')) localStorage.setItem('wouf:data', JSON.stringify(s)); }, data);
  await ctx.route(/gstatic\.com/, r => r.abort());
  await ctx.route(/overpass/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: [
    { type: 'node', id: 1, lat: 48.86, lon: 2.35, tags: { name: 'Clinique du Marais', phone: '+33 1 42 00 00 00', opening_hours: '24/7', 'addr:street': 'Rue de Rivoli', 'addr:postcode': '75004', 'addr:city': 'Paris' } },
    { type: 'way', id: 2, center: { lat: 48.87, lon: 2.36 }, tags: { name: 'Cabinet Bastille', opening_hours: 'Mo-Sa 00:00-24:00; Su off' } },
    { type: 'node', id: 3, lat: 48.9, lon: 2.4, tags: { name: 'Vét Nord', opening_hours: 'Mo-Fr 09:00-12:00,14:00-19:00' } }] }) }));
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  await page.goto(BASE() + query + hash);
  await page.waitForSelector('#view > *');
  return { page, ctx, errors, ev: (f, a) => page.evaluate(f, a), go: async h => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(120); } };
}
const fakeCloud = page => page.evaluate(() => {
  window.__store = null;
  Object.assign(CloudApi, { available: () => true, restore: async () => null, signIn: async () => ({ email: 'q@test.fr', name: 'Quentin', picture: '' }), signOut: async () => {}, token: async () => 'tok123', load: async () => window.__store, save: async (t, a) => { window.__store = { text: t, at: a }; } });
});
/* Vente PayPal : lien de paiement + dossier enregistré (Firestore simulé), redirection capturée. */
const fakeSale = page => page.evaluate(() => {
  window.__orders = []; window.__go = null; NAV.go = u => { window.__go = u; };
  Object.assign(AdminApi, { createOrder: async o => { window.__orders.push(o); return 'ord' + window.__orders.length; } });
  Object.assign(BILL, { enabled: true, freeUntil: null, payee: 'vendeur@test.fr', paymentLink: '', rewardLink: '' });
  Object.assign(LEGAL, { seller: 'Vendeur Test', form: 'EI', address: '1 rue Test', siret: '123', email: 'v@test.fr', mediator: 'Médiateur Test' });
});
const noErrors = b => assert.deepEqual(b.errors, [], 'erreurs console : ' + b.errors.join(' | '));
const text = (page, sel) => page.textContent(sel).then(t => t.replace(/\s+/g, ' ').trim());

/* ================= 1. Premier lancement, chien ================= */
test('premier lancement : ajout d’un chien, accueil, données enregistrées', async () => {
  const b = await boot({ data: null }), p = b.page;
  await p.waitForSelector('.welcome'); await p.click('[data-act=first-dog]');
  await p.selectOption('select[name=species]', 'dog'); await p.fill('input[name=name]', 'Nala'); await p.fill('input[name=breed]', 'Golden Retriever');
  await p.fill('input[name=birth]', '2022-05-10'); await p.fill('input[name=weight]', '29'); await p.fill('input[name=vetPhone]', '0102030405');
  await p.click('form [type=submit]'); await p.waitForSelector('.hero');
  assert.match(await text(p, '.hero h1'), /Nala/);
  await p.waitForTimeout(400);
  const st = await b.ev(() => JSON.parse(localStorage.getItem('wouf:data')));
  assert.equal(st.dogs[0].species, 'dog'); assert.equal(st.schema, 2); assert.equal(st.weights[0].kg, 29);
  noErrors(b); await b.ctx.close();
});

/* ================= 2. Carnet et rappels ================= */
test('carnet : vaccin, rappel automatique, retard, « Fait »', async () => {
  const b = await boot(), p = b.page;
  await p.click('.tile[data-type=vaccine]'); await p.waitForSelector('#f_title');
  assert.match(await p.inputValue('#f_title'), /^CHPPiL/); assert.equal(await p.inputValue('#f_next'), day(0).replace(/^(\d{4})/, y => +y + 1));
  await p.fill('#f_date', '2025-01-15'); assert.equal(await p.inputValue('#f_next'), '2026-01-15'); await p.fill('#f_cost', '65');
  await p.click('form [type=submit]'); await p.waitForSelector('[data-act=renew]');
  assert.match(await text(p, '.row [class*=bad]'), /en retard/);
  await p.click('[data-act=renew]'); await p.waitForSelector('#f_title'); assert.equal(await p.inputValue('#f_date'), day(0)); await p.click('form [type=submit]');
  assert.equal(await b.ev(() => S.events.length), 2); assert.equal(await b.ev(() => reminders('d1').filter(r => r.days < 0).length), 0, 'après renouvellement plus de retard');
  noErrors(b); await b.ctx.close();
});

/* ================= 3. Chat gratuit et limites ================= */
test('chat : gratuit avec le chien (1 chien + 1 chat), au-delà = Plus', async () => {
  const b = await boot({ data: seed() }), p = b.page;
  await b.ev(() => { BILL.enabled = true; });
  assert.equal(await b.ev(() => canAddPet('dog')), false, '2ᵉ chien bloqué en gratuit'); assert.equal(await b.ev(() => canAddPet('cat')), true, 'un chat est autorisé en gratuit');
  await p.click('.dogchip'); await p.click('[data-act=new-dog]'); await p.waitForSelector('select[name=species]');
  await p.selectOption('select[name=species]', 'cat'); await p.fill('input[name=name]', 'Miso');
  assert.equal(await p.getAttribute('input[name=breed]', 'list'), 'breeds_cat'); assert.ok((await b.ev(() => document.querySelectorAll('#breeds_cat option').length)) >= 15);
  await p.fill('input[name=breed]', 'Maine Coon'); await p.fill('input[name=birth]', '2024-03-01'); await p.click('form [type=submit]'); await p.waitForSelector('.hero');
  const pets = await b.ev(() => S.dogs.map(d => d.species)); assert.deepEqual(pets, ['dog', 'cat']);
  assert.equal(await b.ev(() => canAddAnyPet()), false, 'plus de place en gratuit'); await p.click('.dogchip'); await p.click('[data-act=new-dog]'); await p.waitForSelector('.sheet .bul');
  assert.match(await text(p, '.sheet'), /Animaux illimités/); await p.click('.sheet [data-close]');
  await b.ev(() => { BILL.enabled = false; }); assert.equal(await b.ev(() => canAddPet('dog')), true, 'en mode gratuit tout est permis');
  noErrors(b); await b.ctx.close();
});
test('chat : vocabulaire, vaccins, toxiques et premiers secours propres à l’espèce', async () => {
  const b = await boot({ data: seed({ dogs: [dogRec(), dogRec({ id: 'c1', name: 'Miso', species: 'cat', breed: 'Maine Coon', birth: '2024-03-01' })], current: 'c1' }) }), p = b.page;
  assert.match(await text(p, '.hero'), /Maine Coon/); assert.match(await text(p, '.av'), /🐱/);
  await p.click('.tile[data-type=vaccine]'); await p.waitForSelector('#f_title'); assert.match(await p.inputValue('#f_title'), /Typhus/); await p.click('.sheet [data-close]');
  await b.go('#/sos'); await p.waitForSelector('#tox-q'); await p.fill('#tox-q', 'lys'); assert.ok((await p.locator('.tox').count()) >= 1); assert.match(await text(p, '#tox-list'), /Lys/);
  assert.match(await text(p, 'body'), /Blocage urinaire/); assert.match(await text(p, 'body'), /uriner sans y parvenir/);
  assert.ok((await b.ev(() => humanAgeOf(dog()))) > 0);
  await b.go('#/nutrition'); await p.waitForSelector('#nut-out'); assert.match(await p.locator('[data-nut=f] option').first().textContent(), /stérilisé/);
  await b.go('#/plan'); assert.match(await text(p, 'h1'), /Plan chaton/);
  noErrors(b); await b.ctx.close();
});

/* ================= 4. Éducation ================= */
test('éducation : leçons par espèce (22 Plus pour le chien), contenu complet, séance guidée', async () => {
  const b = await boot({ data: seed({ dogs: [dogRec({ birth: '2026-05-10' }), dogRec({ id: 'c1', name: 'Miso', species: 'cat', birth: '2025-01-01' })] }), hash: '#/educ' }), p = b.page;
  await p.waitForSelector('.edu-hero');
  const n = await b.ev(() => ({ dogPlus: lessonsFor(dog()).filter(l => !l.free).length, dogFree: lessonsFor(dog()).filter(l => l.free).length, catAll: LESSONS.filter(l => l.sp === 'cat').length }));
  assert.ok(n.dogPlus >= 20, 'au moins 20 leçons Plus pour le chien'); assert.equal(n.dogFree, 6); assert.ok(n.catAll >= 6);
  assert.equal(await p.locator('a.lesson').count(), n.dogPlus + n.dogFree);
  await b.ev(() => { S.current = 'c1'; save(); render(); }); assert.equal(await p.locator('a.lesson').count(), n.catAll, 'la liste suit l’espèce du chat');
  await b.ev(() => { S.current = 'd1'; save(); render(); });
  await b.go('#/lecon?id=marqueur'); await p.waitForSelector('.step'); await p.click('.step input[data-i="0"]'); assert.equal(await b.ev(() => eduGet('d1', 'marqueur').steps[0]), 1);
  await p.click('a[href="#/seance?id=marqueur"]'); await p.waitForSelector('.marker'); assert.equal(await b.ev(() => SEANCE.step), 1, 'la séance reprend à la 1ʳᵉ étape non validée');
  for (let i = 0; i < 9; i++) await p.click('[data-act=s-ok]'); await p.click('[data-act=s-ko]'); await p.waitForTimeout(1100); assert.notEqual(await text(p, '#tmr'), '0:00');
  await p.click('[data-act=s-end]'); await p.waitForSelector('.step');
  assert.deepEqual(await b.ev(() => { const e = eduGet('d1', 'marqueur'); return [e.sessions.length, e.sessions[0].ok, e.sessions[0].n, e.steps[1]]; }), [1, 9, 10, 1]);
  await p.click('[data-act=lesson-done]'); await p.waitForSelector('.sheet.quiz'); for (let k = 0; k < 3; k++) { await b.ev(() => ACT['quiz-pick']({ k: QUIZ.qs[QUIZ.i].ok })); await p.click('[data-act=quiz-next]'); } await p.click('[data-act=quiz-finish]'); await p.click('.celebrate [data-cel]');
  assert.equal(await b.ev(() => eduGet('d1', 'marqueur').done), true); await b.go('#/educ'); await p.waitForSelector('.badges'); assert.ok((await p.locator('.badge.on').count()) >= 2);
  await b.go('#/programme?id=balade6'); assert.match(await text(p, 'h1'), /balade parfaite/); await p.click('[data-act=prog-start]'); assert.ok(await b.ev(() => S.edu.d1._progs.balade6.start));
  noErrors(b); await b.ctx.close();
});
test('éducation : leçons Plus verrouillées pour un utilisateur gratuit', async () => {
  const b = await boot({ query: '?preview=free', hash: '#/educ' }), p = b.page;
  await p.waitForSelector('.edu-hero'); assert.ok((await p.locator('a.lesson .pill.plus').count()) >= 20);
  await b.go('#/lecon?id=stop'); await p.waitForSelector('[data-act=subscribe]'); assert.doesNotMatch(await text(p, '#view'), /Erreurs fréquentes/, 'le contenu payant n’est pas affiché');
  await b.go('#/seance?id=stop'); assert.match(await text(p, '#view'), /indisponible/);
  await b.go('#/lecon?id=rappel'); await p.waitForSelector('.step'); assert.match(await text(p, '#view'), /Erreurs fréquentes/, 'le rappel est désormais gratuit');
  await b.go('#/lecon?id=assis'); await p.waitForSelector('.step'); assert.match(await text(p, '#view'), /Erreurs fréquentes/, 'une leçon gratuite reste accessible');
  await b.go('#/programme?id=chiot8'); assert.match(await text(p, '#view'), /Débloquer/);
  noErrors(b); await b.ctx.close();
});

/* ================= 5. Suivi GPS des balades ================= */
test('balades : suivi GPS réel (positions simulées), enregistrement, détail, GPX, objectif', async () => {
  const b = await boot({ geo: true, hash: '#/balade' }), p = b.page;
  await p.waitForSelector('[data-act=w-start]'); await p.click('[data-act=w-start]'); await p.waitForSelector('#w-time');
  await p.waitForTimeout(600);
  for (let i = 1; i <= 8; i++) { await b.ctx.setGeolocation({ latitude: 48.8566 + i * 0.0001, longitude: 2.3522 + i * 0.00005, accuracy: 5 }); await p.waitForTimeout(1150); }
  const live = await b.ev(() => ({ d: WALK.dist, n: WALK.pts.length, gps: WALK.gps }));
  assert.ok(live.n >= 5, 'points GPS enregistrés : ' + live.n); assert.ok(live.d > 60 && live.d < 140, 'distance plausible : ' + live.d);
  assert.match(await text(p, '#w-dist'), /0,[0-9]{2} km/); assert.ok((await p.locator('#w-trace svg path.route').count()) === 1, 'tracé affiché');
  await p.click('[data-act=w-pause]'); await p.waitForSelector('[data-act=w-resume]'); const frozen = await b.ev(() => Math.round(walkElapsed() / 1000)); await p.waitForTimeout(1300); assert.equal(await b.ev(() => Math.round(walkElapsed() / 1000)), frozen, 'le chrono est figé en pause');
  await p.click('[data-act=w-resume]'); await p.click('[data-act=w-finish]'); await p.waitForSelector('svg.trace');
  const w = await b.ev(() => S.walks[0]); assert.ok(w.dist > 60 && w.pts.length >= 3 && w.dur >= 8 && w.dogId === 'd1' && !w.manual);
  const dl = p.waitForEvent('download'); await p.click('[data-act=w-gpx]'); const f = await dl; assert.match(f.suggestedFilename(), /\.gpx$/);
  await b.go('#/balade'); await p.waitForSelector('.ring'); assert.match(await text(p, '#view'), /min aujourd/);
  await p.click('[data-act=w-manual]'); await p.fill('#f_min', '40'); await p.fill('#f_km', '2.5'); await p.click('form [type=submit]'); await p.waitForTimeout(100);
  assert.equal(await b.ev(() => S.walks.length), 2); assert.equal(await b.ev(() => S.walks[1].dist), 2500);
  await p.click('[data-act=w-goal]'); await p.fill('#f_goal', '75'); await p.click('form [type=submit]'); assert.equal(await b.ev(() => dailyGoal(dog())), 75);
  noErrors(b); await b.ctx.close();
});
test('balades : reprise après interruption, abandon, réservé à Plus', async () => {
  const b = await boot({ geo: true, hash: '#/balade' }), p = b.page;
  await p.click('[data-act=w-start]'); await p.waitForSelector('#w-time'); await b.ev(() => walkPersist(true));
  await p.reload(); await p.waitForSelector('#view > *'); assert.equal(await b.ev(() => WALK.on && WALK.paused), true, 'balade retrouvée en pause'); await b.ev(() => { location.hash = '#/balade'; render(); });
  await p.waitForSelector('[data-act=w-resume]'); await p.click('[data-act=w-abort]'); await p.click('.sheet-wrap.dlg [data-ok]'); await p.waitForSelector('[data-act=w-start]'); assert.equal(await b.ev(() => localStorage.getItem('wouf:walk')), null);
  await b.ctx.close();
  const f = await boot({ query: '?preview=free', hash: '#/balade' }); await f.page.waitForSelector('[data-act=paywall]'); assert.doesNotMatch(await text(f.page, '#view'), /Démarrer/); noErrors(f); await f.ctx.close();
});

/* ================= 6. Bilan, gardien, plan de poids ================= */
test('bilan santé, fiche gardien, plan de perte de poids', async () => {
  const b = await boot({ data: seed({ weights: [{ id: 'w1', dogId: 'd1', date: day(-100), kg: 30 }, { id: 'w2', dogId: 'd1', date: day(-40), kg: 32 }, { id: 'w3', dogId: 'd1', date: day(-2), kg: 34 }], events: [{ id: 'e1', dogId: 'd1', type: 'vaccine', title: 'Rage', date: day(-400), next: day(-35), cost: 0 }] }), hash: '#/bilan' }), p = b.page;
  await p.waitForSelector('.insight'); const t = await text(p, '#view'); assert.match(t, /Poids : \+13 %/); assert.match(t, /rappel.* en retard/); assert.match(t, /Points de vigilance/);
  await b.go('#/gardien'); await p.click('[data-act=sitter-edit]'); await p.fill('#f_food', 'Croquettes 2 fois par jour'); await p.click('form [type=submit]');
  await b.ev(() => { window.print = () => { window.__printed = document.getElementById('print-root').textContent; }; }); await p.click('[data-act=sitter-print]'); await p.waitForTimeout(500);
  const printed = await b.ev(() => window.__printed); assert.match(printed, /Fiche gardien : Nala/); assert.match(printed, /Croquettes 2 fois/); assert.match(printed, /06 00 00 00 00/);
  await b.go('#/plan-poids'); await p.waitForSelector('#wp-cur'); await p.fill('#wp-target', '30'); await p.dispatchEvent('#wp-target', 'change'); await p.waitForSelector('.big-n');
  const plan = await b.ev(() => weightPlanCalc(dog(), 34, 30, 0.015)); assert.ok(plan.kcal > 700 && plan.kcal < 1100 && plan.weeks > 5 && plan.weeks < 15, JSON.stringify(plan));
  assert.match(await text(p, '.big-n'), new RegExp(String(plan.kcal))); await p.click('[data-act=wp-save]'); assert.equal(await b.ev(() => dog().wplan.target), 30);
  noErrors(b); await b.ctx.close();
});
test('fonctions Plus verrouillées en formule gratuite (tracker, bilan, gardien, plan de poids)', async () => {
  const b = await boot({ query: '?preview=free' }), p = b.page;
  for (const r of ['bilan', 'gardien', 'plan-poids', 'balade']) { await b.go('#/' + r); await p.waitForSelector('[data-act=paywall]'); }
  await b.ev(() => { window.print = () => {}; }); await b.go('#/carnet'); await p.click('[data-act=report]'); await p.waitForSelector('.sheet .bul'); assert.match(await text(p, '.sheet'), /Fiche|PDF|Plus/); await p.click('.sheet [data-close]');
  noErrors(b); await b.ctx.close();
});

/* ================= Que faire ? et météo ================= */
test('triage : urgence, vétérinaire sous 24 h, surveillance, âge fragile, note au journal', async () => {
  const b = await boot({ hash: '#/triage' }), p = b.page;
  await p.waitForSelector('[data-act=tri-pick]');
  assert.ok((await p.$$('[data-act=tri-pick]')).length >= 10);
  await p.click('[data-id=vomit]'); await p.waitForSelector('[data-act=tri-flag]');
  assert.match(await text(p, '.insight'), /Surveillez/);               // rien coché : adulte en forme
  await p.click('[data-k=a0]'); assert.match(await text(p, '.insight'), /Vétérinaire sous 24 h/);
  await p.click('[data-k=r0]'); assert.match(await text(p, '.insight'), /tout de suite/);
  assert.ok(await p.$('a[href="#/sos"].btn'), 'lien vers les vétérinaires de garde');
  await p.click('[data-act=tri-note]'); assert.equal(await b.ev(() => S.journal.filter(j => j.kind === 'symptom' && j.sev === '3').length), 1);
  // chiot : le seuil d'alerte est abaissé
  const r = await b.ev(() => { const pup = { name: 'P', species: 'dog', breed: 'Labrador', birth: new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10) }, sym = TRIAGE.find(s => s.id === 'diarrhea');
    return { none: triageResult(sym, {}, pup).lvl, amber: triageResult(sym, { a0: true }, pup).lvl, adultNone: triageResult(sym, {}, { name: 'A', species: 'dog', breed: 'Labrador', birth: '2020-01-01' }).lvl }; });
  assert.deepEqual(r, { none: 'amber', amber: 'red', adultNone: 'green' });
  // chaque symptôme : au moins un signe d'urgence, texte de surveillance, pas de « chien » codé en dur pour un chat
  assert.ok(await b.ev(() => TRIAGE.every(s => s.red.length && s.watch && s.label)));
  noErrors(b); await b.ctx.close();
});

test('météo balade : seuils selon la race et l’âge, meilleures heures, données simulées, erreur réseau', async () => {
  const mk = (hot) => { const h = { time: [], apparent_temperature: [], precipitation_probability: [], weather_code: [], is_day: [] }, t0 = new Date(); t0.setMinutes(0, 0, 0);
    for (let i = 0; i < 48; i++) { const d = new Date(t0.getTime() + i * 36e5), H = d.getHours(); h.time.push(new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16)); h.apparent_temperature.push(hot ? (H >= 11 && H <= 19 ? 33 : 18) : 15); h.precipitation_probability.push(0); h.weather_code.push(0); h.is_day.push(H >= 7 && H <= 21 ? 1 : 0); }
    return { current: { time: h.time[0], temperature_2m: hot ? 33 : 15, apparent_temperature: hot ? 33 : 15, weather_code: 0 }, hourly: h }; };
  const b = await boot({ geo: true, hash: '#/meteo', data: seed({ dogs: [dogRec({ breed: 'Bouledogue Français' })] }) }), p = b.page;
  await p.route(/open-meteo/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(mk(true)) }));
  await p.waitForSelector('[data-act=meteo-go]'); await p.click('[data-act=meteo-go]'); await p.waitForSelector('.insight');
  assert.match(await text(p, '.insight'), /33 °C.*Trop chaud/); assert.match(await text(p, '#view'), /museau court/);
  assert.ok(await p.$('.hours .hr'), 'grille horaire'); assert.match(await text(p, '#view'), /Meilleures heures/);
  const r = await b.ev(() => { const lab = { name: 'L', species: 'dog', breed: 'Labrador', birth: '2020-01-01' }, bull = { name: 'B', species: 'dog', breed: 'Bulldog Anglais', birth: '2020-01-01' };
    return [walkRisk(22, lab).lvl, walkRisk(22, bull).lvl, walkRisk(27, lab).lvl, walkRisk(27, bull).lvl, walkRisk(31, lab).lvl, walkRisk(15, lab, { storm: true }).lvl, walkRisk(15, lab, { rain: 90 }).lvl, walkRisk(-5, { name: 'x', species: 'dog', breed: 'Chihuahua', birth: '2020-01-01' }).lvl]; });
  assert.deepEqual(r, ['ok', 'warn', 'warn', 'bad', 'bad', 'bad', 'warn', 'bad']);
  await p.unroute(/open-meteo/); await p.route(/open-meteo/, r => r.abort());
  await p.click('[data-act=meteo-go]'); await p.waitForSelector('.warnbox'); assert.match(await text(p, '.warnbox'), /indisponible/);
  noErrors(b); await b.ctx.close();
  const f = await boot({ query: '?preview=free', hash: '#/meteo' }); await f.page.waitForSelector('[data-act=paywall]'); noErrors(f); await f.ctx.close();
});

test('recherche globale : aliments toxiques, leçons, carnet, journal, documents', async () => {
  const data = seed({ events: [{ id: 'e1', dogId: 'd1', type: 'vaccine', title: 'Rage annuelle', date: '2026-01-10', next: '2027-01-10' }], journal: [{ id: 'j1', dogId: 'd1', date: '2026-02-01', kind: 'symptom', sev: '1', note: 'Boite après la balade' }], docs: [{ id: 'x1', dogId: 'd1', kind: 'rx', title: 'Ordonnance antibiotique', date: '2026-02-02' }] });
  const b = await boot({ data, hash: '#/recherche' }), p = b.page;
  await p.waitForSelector('#gs-q'); assert.match(await text(p, '#gs-res'), /Tapez au moins/);
  await p.fill('#gs-q', 'chocolat'); assert.match(await text(p, '#gs-res'), /Aliments et produits dangereux/);
  await p.fill('#gs-q', 'rage'); assert.match(await text(p, '#gs-res'), /Rage annuelle/);
  await p.fill('#gs-q', 'boite'); assert.match(await text(p, '#gs-res'), /Journal de santé/);
  await p.fill('#gs-q', 'ordonnance'); assert.match(await text(p, '#gs-res'), /Documents/);
  await p.fill('#gs-q', 'vomissement'); assert.match(await text(p, '#gs-res'), /Que faire/);
  await p.fill('#gs-q', 'zzzzqq'); assert.match(await text(p, '#gs-res'), /Aucun résultat/);
  noErrors(b); await b.ctx.close();
});

test('balades : compteur de pas (capteur de mouvement) et distance de secours quand le GPS est faible', async () => {
  const b = await boot({ geo: true, hash: '#/balade' }), p = b.page;
  await p.click('[data-act=w-start]'); await p.waitForSelector('#w-steps'); await p.waitForTimeout(300);
  // 40 pas simulés : pics d'accélération réguliers autour de la gravité
  await b.ev(async () => { for (let i = 0; i < 40; i++) { for (const z of [9.8, 13.2, 9.8, 7.0]) { window.dispatchEvent(Object.assign(new Event('devicemotion'), { accelerationIncludingGravity: { x: 0.2, y: 0.3, z } })); await new Promise(r => setTimeout(r, 75)); } } });
  const steps = await b.ev(() => WALK.steps); assert.ok(steps >= 30 && steps <= 45, 'pas comptés : ' + steps);
  // le GPS ne bouge pas : la distance vient des pas
  assert.ok(await b.ev(() => walkDist()) > steps * 0.6, 'distance de secours'); await p.waitForTimeout(1100); assert.match(await text(p, '#w-steps'), /\d/);
  await p.click('[data-act=w-finish]'); await p.waitForSelector('.big-kv');
  const w = await b.ev(() => S.walks[0]); assert.ok(w.steps >= 30 && w.src === 'steps' && w.dist > 20, JSON.stringify({ s: w.steps, src: w.src, d: w.dist }));
  assert.match(await text(p, '.big-kv'), /Pas/);
  // un promeneur immobile ne compte rien
  assert.equal(await b.ev(() => { const c = stepCounter(); for (let i = 0; i < 200; i++) c.push(9.81 + Math.sin(i) * 0.1, i * 20); return c.n; }), 0);
  await b.go('#/balade'); await p.click('[data-act=w-stride]'); await p.fill('input[name=cm]', '80'); await p.click('.sheet button[type=submit], .sheet .primary'); assert.equal(await b.ev(() => S.settings.stride), 0.8);
  noErrors(b); await b.ctx.close();
});

test('météo : scène illustrée (soleil, pluie, vent, froid, orage, neige, nuit), conseils et vent', async () => {
  const b = await boot({ hash: '#/home' }), p = b.page;
  const r = await b.ev(() => { const lab = { name: 'L', species: 'dog', breed: 'Labrador', birth: '2020-01-01' }, M = (o) => ({ code: 0, feels: 22, wind: 5, day: true, uv: 3, hours: [], ...o });
    return [weatherScene(M({}), lab), weatherScene(M({ code: 63 }), lab), weatherScene(M({ wind: 50 }), lab), weatherScene(M({ feels: -6 }), lab), weatherScene(M({ code: 96 }), lab), weatherScene(M({ code: 73, feels: 0 }), lab), weatherScene(M({ day: false }), lab), weatherScene(M({ feels: 33 }), lab), weatherScene(M({ code: 3, feels: 12 }), lab)]; });
  assert.deepEqual(r, ['sun', 'rain', 'wind', 'cold', 'storm', 'snow', 'night', 'hot', 'calm']);
  const svg = await b.ev(() => Object.keys(SCENE_TXT).every(k => dogScene(k, { name: 'X', species: 'dog' }).includes('<svg') && dogScene(k, { name: 'X', species: 'cat' }).includes('<svg')));
  assert.ok(svg); assert.ok(await b.ev(() => { const sun = dogScene('sun', { name: 'X', species: 'dog' }), rain = dogScene('rain', { name: 'X', species: 'dog' }); return sun.includes('#151b2b') && sun.includes('#ff5d73') && !rain.includes('#151b2b') && rain.includes('dg-rain') && dogScene('wind', { name: 'X', species: 'dog' }).includes('flap'); }), 'lunettes + parasol au soleil, pluie qui tombe, oreilles au vent');
  const tips = await b.ev(() => ({ hot: walkTips({ feels: 32, uv: 8, wind: 0, code: 0, day: true }, { name: 'B', breed: 'Bulldog Anglais' }).map(x => x[1]).join('|'), rain: walkTips({ feels: 10, uv: 0, wind: 0, code: 63, day: true }, { name: 'L', breed: 'Labrador' }).length, wind: walkRisk(15, { name: 'L', breed: 'Labrador', birth: '2020-01-01', species: 'dog' }, { wind: 65 }).lvl }));
  assert.match(tips.hot, /bitume/); assert.match(tips.hot, /museau court/); assert.match(tips.hot, /UV/); assert.ok(tips.rain >= 1); assert.equal(tips.wind, 'bad');
  noErrors(b); await b.ctx.close();
});

test('nouvelles leçons Plus : 16 chien + 9 chat, 7 nouveaux programmes, pages qui s’affichent', async () => {
  const data = seed({ dogs: [dogRec(), dogRec({ id: 'c1', name: 'Miso', species: 'cat', breed: 'Européen', birth: '2024-03-01' })] });
  const b = await boot({ data }), p = b.page;
  const ids = { d1: ['veto', 'eau', 'nuits', 'cerveau', 'bebe', 'craintif', 'deux-chiens', 'focus', 'impulsions', 'reactivite', 'destruction', 'poursuite', 'ville', 'randonnee', 'dents', 'vol'], c1: ['c-bebe', 'c-eau', 'c-poids', 'c-dehors', 'c-mord', 'c-pipi', 'c-demenagement', 'c-solitude', 'c-dents'] };
  for (const cur of ['d1', 'c1']) { await b.ev(c => { S.current = c; save(); }, cur);
    for (const id of ids[cur]) { await b.go('#/lecon?id=' + id); await p.waitForSelector('.lesson-h, h1'); const h = await text(p, '#view'); assert.ok(h.length > 900, id + ' trop court'); assert.match(h, /Programme|programme/); }
    assert.equal(await b.ev(id => lessonsFor(dog()).filter(l => !l.free).length >= (id === 'd1' ? 40 : 15), cur), true); }
  for (const id of ['ville4', 'reactif8', 'maison4', 'famille4', 'chiot-nuit3', 'chat-sante3', 'chat-detente4']) { await b.ev(c => { S.current = c; save(); }, /^chat/.test(id) ? 'c1' : 'd1'); await b.go('#/programme?id=' + id); await p.waitForSelector('h1'); assert.match(await text(p, '#view'), /Semaine/); }
  noErrors(b); await b.ctx.close();
});

test('noms : lettre de l’année LOF/LOOF, filtres, test d’un nom, favoris, utilisation', async () => {
  const b = await boot({ hash: '#/noms' }), p = b.page;
  await p.waitForSelector('#nm-letter');
  const r = await b.ev(() => ({ years: [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2045, 2046].map(lofLetter).join(''), noKQW: [...Array(60)].every((_, i) => !/[KQWXYZ]/.test(lofLetter(2000 + i))),
    n: NAME_POOL.length, dup: pickNames({}, 1000).some(x => confusedWith(x.name)) || pickNames({}, 1000).some(x => ['Ninon', 'Sauge', 'Patate', 'Ouistiti'].includes(x.name)),
    b: pickNames({ sp: 'dog', sex: 'f', letter: 'B' }, 50).every(x => x.name[0] === 'B' && x.sex !== 'm'), cat: pickNames({ sp: 'cat' }, 500).every(x => x.sp !== 'd'), dog: pickNames({ sp: 'dog' }, 500).every(x => x.sp !== 'c'),
    short: pickNames({ short: true }, 500).every(x => syllables(x.name) <= 2), uniq: (l => new Set(l.map(x => x.name)).size === l.length)(pickNames({}, 1000)), style: pickNames({ style: 'gourmand' }, 500).every(x => x.style === 'gourmand'), none: pickNames({ letter: 'X' }).length,
    seeded: JSON.stringify(pickNames({}, 3, () => 0.1)) === JSON.stringify(pickNames({}, 3, () => 0.1)) }));
  assert.equal(r.years, 'PRSTUVABCAB', 'lettres par année (cycle de 20, sans K Q W X Y Z)');
  assert.ok(r.noKQW && r.n >= 300 && !r.dup && r.b && r.cat && r.dog && r.short && r.uniq && r.style && r.none === 0 && r.seeded, JSON.stringify(r));
  const ck = await b.ev(() => ({ nala: nameCheck('Nala').score, viens: nameCheck('Viens').notes.some(n => /ordre/.test(n[1])), nono: !!confusedWith('Nono'), long: nameCheck('Maximilien').notes.some(n => n[0] === 'bad'), twin: nameCheck('Lala', ['Nala']).notes.some(n => /Sonne comme/.test(n[1])), same: nameCheck('Nala', ['Nala']).notes.some(n => /déjà/.test(n[1])), empty: nameCheck('').score }));
  assert.ok(ck.nala >= 80 && ck.viens && ck.nono && ck.long && ck.twin && ck.same && ck.empty === 0, JSON.stringify(ck));
  await p.fill('#nm-year', '2026'); assert.equal(await text(p, '.big-letter'), 'B');
  await p.fill('#nm-year', '2024'); assert.equal(await text(p, '.big-letter'), 'V'); await p.fill('#nm-year', '2026');
  await p.click('[data-act=nm-lof]'); await p.waitForSelector('.name-card'); assert.ok((await p.$$('.name-card')).length >= 5); assert.ok(await b.ev(() => NOMS.list.every(x => x.name[0] === 'B')));
  await p.click('[data-k=sp][data-v=cat]'); await p.click('[data-k=style][data-v=gourmand]'); await p.fill('#nm-letter', ''); await p.click('[data-act=nm-go]'); await p.waitForSelector('.name-card');
  assert.ok(await b.ev(() => NOMS.list.length >= 6 && NOMS.list.every(x => x.style === 'gourmand')));
  await p.fill('#nm-test', 'Assis'); assert.match(await text(p, '#nm-test-res'), /ordre « assis »/); await p.fill('#nm-test', 'Nala'); assert.match(await text(p, '#nm-test-res'), /Deux syllabes/);
  const first = await b.ev(() => NOMS.list[0].name); await p.click('.name-card [data-act=nm-fav]'); assert.deepEqual(await b.ev(() => S.names), [first]); await p.waitForSelector('[data-act=nm-use]');
  await p.click('[data-act=nm-use]'); await p.waitForSelector('.sheet input[name=name]'); await p.waitForTimeout(250); assert.equal(await p.inputValue('.sheet input[name=name]'), first);
  noErrors(b); await b.ctx.close();
});

test('accueil et menu Plus : « À faire » en premier, une seule invitation à la fois, menu par rubriques', async () => {
  const b = await boot({ data: seed({ events: [{ id: 'e1', dogId: 'd1', type: 'vaccine', title: 'Rage annuelle', date: day(-300), next: day(-3) }] }) }), p = b.page;
  await p.waitForSelector('.hero'); const order = await b.ev(() => [...document.querySelectorAll('#view > section, #view > a')].map(e => e.querySelector('h2') ? e.querySelector('h2').textContent : e.className.split(' ')[1] || e.className));
  assert.equal(order[0], 'hero'); assert.equal(order[1], 'À faire', 'la liste À faire vient juste après la fiche : ' + order.join('|'));
  assert.ok(await p.$('.grid3 a[href="#/noms"]'));
  await b.go('#/plus'); await p.waitForSelector('.grid4'); const h = await b.ev(() => [...document.querySelectorAll('.grp')].map(e => e.textContent)); assert.deepEqual(h, ['Santé', 'Éduquer et bouger', 'Alimentation', 'Pratique', 'Wouf']);
  assert.equal(await p.locator('.grid4 a').count(), 4);
  // les liens du menu mènent tous à une page existante
  const bad = await b.ev(() => [...document.querySelectorAll('.menu a, .grid4 a')].map(a => a.getAttribute('href').slice(2)).filter(r => !ROUTES[r])); assert.deepEqual(bad, []);
  noErrors(b); await b.ctx.close();
});

test('éducation : 110 leçons (100 Plus + 10 gratuites), recherche sans accents et filtres par catégorie', async () => {
  const b = await boot({ hash: '#/educ' }), p = b.page;
  const tot = await b.ev(() => ({ all: LESSONS.length, plus: LESSONS.filter(l => !l.free).length, free: LESSONS.filter(l => l.free).length }));
  assert.deepEqual(tot, { all: 110, plus: 100, free: 10 });
  await p.waitForSelector('#edu-q'); const n0 = await p.locator('#edu-list a.lesson').count(); assert.ok(n0 >= 60);
  await p.fill('#edu-q', 'griffes'); assert.ok((await p.locator('#edu-list a.lesson').count()) >= 1); assert.match(await text(p, '#edu-list'), /griffes/i);
  await p.fill('#edu-q', 'bebe'); assert.match(await text(p, '#edu-list'), /bébé/);
  await p.fill('#edu-q', 'zzzz'); assert.match(await text(p, '#edu-list'), /Aucune leçon/);
  await p.fill('#edu-q', ''); await b.ev(() => { EDU.q = ''; });
  await p.click('[data-act=edu-cat][data-c="Soins"]'); const cats = await b.ev(() => [...document.querySelectorAll('#edu-list a.lesson small')].map(s => s.textContent.split(' · ')[0])); assert.ok(cats.length >= 5 && cats.every(c => c === 'Soins'), cats.join('|'));
  assert.ok((await p.locator('a.row[href^="#/programme"]').count()) >= 10, 'programmes listés');
  await b.ev(() => { EDU.cat = ''; }); noErrors(b); await b.ctx.close();
});

test('parcours ludique : unités, XP, niveaux, objectif du jour, quiz de validation, célébration', async () => {
  const b = await boot({ hash: '#/educ' }), p = b.page;
  assert.deepEqual(await b.ev(() => [0, 99, 100, 299, 300, 600].map(x => levelOf(x).n)), [1, 1, 2, 2, 3, 4]);
  const qz = await b.ev(() => LESSONS.every(l => { const qs = lessonQuiz(l); return qs.length === 3 && qs.every((q, k) => q.opts.length === 3 && new Set(q.opts).size === 3 && q.opts[q.ok] === QUIZZES[l.id][k][1] && q.why === QUIZZES[l.id][k][4]); }));
  assert.ok(qz, 'chaque leçon a ses 3 questions écrites à la main, bonne réponse et explication correctes');
  const mixed = await b.ev(() => { const seen = new Set(); for (let i = 0; i < 40; i++) seen.add(lessonQuiz(lessonOf('assis'))[0].ok); return seen.size; }); assert.ok(mixed >= 2, 'la bonne réponse change de place');
  await p.waitForSelector('.lvl'); assert.match(await text(p, '.lvl'), /Débutant curieux/); assert.match(await text(p, '.edu-hero'), /objectif du jour/);
  assert.ok((await p.locator('.path .pnode').count()) >= 6, 'unité « Les bases » ouverte'); assert.equal(await p.locator('.pnode.cur').count(), 1); assert.ok((await p.locator('.path .pnode .paw svg').count()) >= 6, 'étapes en empreintes de pattes'); assert.match(await text(p, '.lvl'), /🦴/); assert.doesNotMatch(await text(p, '#view'), /\bXP\b/);
  assert.ok((await p.locator('.unit-h').count()) >= 8, 'unités par thème');
  await p.click('.unit-h >> nth=1'); assert.ok((await p.locator('.path .pnode').count()) >= 1); assert.ok(await p.$('.unit-h.on >> nth=0'));
  // valider une leçon : quiz (une erreur → réessayer), puis sans faute → XP + célébration
  await b.go('#/lecon?id=assis'); await p.click('[data-act=lesson-done]'); await p.waitForSelector('.qopt');
  assert.ok(await p.$('.sheet .mascot.m-think'), 'le chien réfléchit avant la réponse');
  await b.ev(() => ACT['quiz-pick']({ k: (QUIZ.qs[0].ok + 1) % QUIZ.qs[0].opts.length })); assert.match(await text(p, '.quiz-fb'), /Pas tout à fait/); assert.ok((await text(p, '.quiz-why')).length > 15, 'explication affichée après la réponse'); assert.match(await text(p, '.quiz-lesson'), /Assis/); assert.ok(await p.$('.sheet .mascot.m-bad'), 'le chien est triste après une erreur');
  for (let k = 0; k < 2; k++) { await p.click('[data-act=quiz-next]'); await b.ev(() => ACT['quiz-pick']({ k: QUIZ.qs[QUIZ.i].ok })); } await p.click('[data-act=quiz-next]');
  assert.match(await text(p, '.sheet.quiz'), /2\/3/); assert.equal(await b.ev(() => eduGet('d1', 'assis').done), false, 'pas validée avec une erreur');
  assert.ok(await p.$('.sheet .mascot.m-fail'), 'encouragement en fin de quiz raté');
  await p.click('[data-act=quiz-retry]'); for (let k = 0; k < 3; k++) { await b.ev(() => ACT['quiz-pick']({ k: QUIZ.qs[QUIZ.i].ok })); assert.ok(await p.$('.sheet .mascot.m-good'), 'le chien saute de joie'); if (k === 2) assert.match(await text(p, '.sheet .bubble'), /🔥/, 'série de bonnes réponses'); await p.click('[data-act=quiz-next]'); }
  assert.ok(await p.$('.sheet .mascot.m-win')); assert.ok(await b.ev(() => MASCOT_TXT.cat.good.length && mascot('good', true, 'x').includes('M54 52')), 'un chat pour les leçons de chat');
  await p.click('[data-act=quiz-finish]'); await p.waitForSelector('.celebrate'); assert.match(await text(p, '.cel-card'), /\+70 🦴/); assert.ok(await p.$('.cel-card .mascot.m-win')); await p.click('.celebrate [data-cel]');
  assert.deepEqual(await b.ev(() => [eduGet('d1', 'assis').done, eduGet('d1', 'assis').quiz, xpOf(dog())]), [true, 3, 70]);
  await b.go('#/lecon?id=assis'); await p.click('[data-act=lesson-done]'); assert.equal(await b.ev(() => eduGet('d1', 'assis').done), false, 'second appui : annule');
  noErrors(b); await b.ctx.close();
});

test('offre récompense : popup uniquement quand TOUTES les leçons gratuites sont faites, prix réduit au paiement', async () => {
  const b = await boot({ query: '?preview=none', hash: '#/educ' }), p = b.page;
  const pure = await b.ev(() => { const d = (ids, sp = 'dog') => ({ dogs: [{ id: 'a', species: sp }], edu: { a: Object.fromEntries(ids.map(i => [i, { done: true }])) } }), dogIds = freeIdsOf('dog'), catIds = freeIdsOf('cat');
    return { n: [dogIds.length, catIds.length], dogAll: rewardEligible(d(dogIds)), dogMissing: rewardEligible(d(dogIds.slice(1))), catAll: rewardEligible(d(catIds, 'cat')), both: rewardEligible({ dogs: [{ id: 'a', species: 'dog' }, { id: 'b', species: 'cat' }], edu: { a: Object.fromEntries(dogIds.map(i => [i, { done: true }])) } }), none: rewardEligible({ dogs: [] }) }; });
  assert.deepEqual(pure, { n: [6, 4], dogAll: true, dogMissing: false, catAll: true, both: false, none: false });
  await fakeCloud(p); await fakeSale(p);
  await b.ev(() => {
    freeIdsOf('dog').slice(0, 5).forEach(id => { const q = eduSet('d1', id); q.done = true; }); save(); });
  await b.go('#/abo'); assert.match(await text(p, '#view'), /Une récompense vous attend/); assert.doesNotMatch(await text(p, '#view'), /Offre récompense débloquée/);
  // les 5 premières ne déclenchent rien ; la 6ᵉ via le quiz ouvre la récompense
  assert.equal(await b.ev(() => (rewardCheck(), document.querySelectorAll('.sheet-wrap').length)), 0);
  const last = await b.ev(() => freeIdsOf('dog')[5]);
  await b.go('#/lecon?id=' + last); await p.click('[data-act=lesson-done]'); for (let k = 0; k < 3; k++) { await b.ev(() => ACT['quiz-pick']({ k: QUIZ.qs[QUIZ.i].ok })); await p.click('[data-act=quiz-next]'); }
  await p.click('[data-act=quiz-finish]'); await p.click('.celebrate [data-cel]'); await p.waitForSelector('.reward');
  assert.match(await text(p, '.reward'), /19,99 €\s*9,99 €/); assert.ok(await b.ev(() => S.reward.shown));
  await p.click('[data-act=reward-buy]'); await p.waitForSelector('#buy-consent'); assert.match(await text(p, '.sheet'), /Offre récompense/); assert.match(await text(p, '.sheet [data-act=buy-go]'), /9,99 €/);
  await p.fill('#buy-last', 'Dupont'); await p.check('#buy-consent'); await p.click('[data-act=buy-go]'); await p.waitForFunction(() => window.__go);
  const rg = new URL(await b.ev(() => window.__go)); assert.equal(rg.searchParams.get('amount'), '9.99'); assert.match(rg.searchParams.get('item_name'), /récompense/);
  const ord = await b.ev(() => window.__orders[0]); assert.equal(ord.offer, 'reward'); assert.equal(ord.price, '9,99 €'); assert.equal(ord.lessons >= 6, true); assert.equal(ord.ref, rg.searchParams.get('invoice'));
  noErrors(b); await b.ctx.close();
  // une seule fois : pas de nouvelle popup ; et gratuit pour tous → message sans paiement
  const c = await boot({ hash: '#/educ' }); await c.ev(() => { freeIdsOf('dog').forEach(id => { eduSet('d1', id).done = true; }); rewardCheck(); });
  await c.page.waitForSelector('.sheet'); assert.match(await text(c.page, '.sheet'), /Bases acquises/); assert.match(await text(c.page, '.sheet'), /9,99 €/);
  assert.equal(await c.ev(() => { closeAllSheets(); rewardCheck(); return document.querySelectorAll('.sheet-wrap').length; }), 0, 'la popup ne revient pas'); noErrors(c); await c.ctx.close();
});

/* ================= 7. Achat à vie (PayPal + dossier, activation par l'administration) ================= */
test('achat à vie PayPal : connexion Google, dossier de paiement, consentement, retour, activation et retrait par l’administration', async () => {
  const b = await boot({ query: '?preview=none', hash: '#/abo' }), p = b.page;
  await fakeCloud(p); await fakeSale(p); await b.ev(() => render());
  await p.waitForSelector('[data-act=subscribe]'); assert.match(await text(p, '.plus-hero'), /19,99 €/); assert.equal(await b.ev(() => plus()), false);
  await p.click('[data-act=subscribe]'); await p.waitForSelector('#buy-consent'); assert.equal(await b.ev(() => !!CLOUD.user), true, 'connexion Google déclenchée avant l’achat');
  assert.match(await text(p, '.sheet'), /19,99 €/); assert.match(await text(p, '.sheet'), /droit de rétractation/); assert.match(await text(p, '.sheet'), /dossier de paiement/); assert.match(await text(p, '.sheet'), /activé manuellement/); assert.match(await text(p, '.sheet'), /n’est pas instantanée/);
  assert.equal(await p.inputValue('#buy-paypal'), 'q@test.fr'); assert.equal(await p.inputValue('#buy-first'), 'Quentin');
  await p.click('[data-act=buy-go]'); assert.match(await text(p, '#toast'), /prénom et le nom/);
  await p.fill('#buy-last', 'Martin'); await p.fill('#buy-paypal', 'pas-un-mail'); await p.click('[data-act=buy-go]'); assert.match(await text(p, '#toast'), /adresses e-mail/);
  await p.fill('#buy-paypal', 'q.paypal@test.fr'); await p.click('[data-act=buy-go]'); assert.match(await text(p, '#toast'), /Cochez la case/);
  assert.equal(await b.ev(() => window.__orders.length), 0, 'aucun dossier sans consentement');
  await p.check('#buy-consent'); await p.click('[data-act=buy-go]'); await p.waitForFunction(() => window.__go);
  const g = new URL(await b.ev(() => window.__go)); assert.equal(g.origin + g.pathname, 'https://www.paypal.com/cgi-bin/webscr');
  assert.deepEqual(['cmd', 'business', 'amount', 'currency_code'].map(k => g.searchParams.get(k)), ['_xclick', 'vendeur@test.fr', '19.99', 'EUR']);
  assert.match(g.searchParams.get('invoice'), /^WOUF-[A-Z0-9]+$/); assert.match(g.searchParams.get('return'), /#\/merci$/);
  const o = await b.ev(() => window.__orders[0]); assert.equal(o.ref, g.searchParams.get('invoice')); assert.equal(o.payee, 'vendeur@test.fr');
  assert.deepEqual([o.firstName, o.lastName, o.paypalEmail, o.contactEmail, o.googleEmail, o.offer, o.price, o.status], ['Quentin', 'Martin', 'q.paypal@test.fr', 'q@test.fr', 'q@test.fr', 'lifetime', '19,99 €', 'pending']);
  // retour de PayPal
  await b.go('#/merci'); assert.match(await text(p, '#view'), /manuellement.*24 h.*q@test\.fr.*q\.paypal@test\.fr.*référence WOUF-/);
  // l'adresse PayPal change dans l'administration : le paiement suivant part vers la nouvelle ; sans adresse, lien fixe
  assert.deepEqual(await b.ev(() => { BILL.payee = 'autre@test.fr'; const a = new URL(paypalUrl(BILL.payee, '19,99 €', 'WOUF-X')).searchParams.get('business'); BILL.payee = ''; const r1 = payReady(); BILL.paymentLink = 'https://www.paypal.com/ncp/payment/L1'; const r2 = payReady(); BILL.paymentLink = ''; BILL.payee = 'vendeur@test.fr'; return [a, r1, r2]; }), ['autre@test.fr', false, true]);
  // l'administration active : Plus à vie, assistance prioritaire ; puis retrait : données intactes
  await b.ev(async () => { Object.assign(AdminApi, { myGrant: async () => window.__grant || null, touch: async () => {} }); window.__grant = { until: 'lifetime' }; await accountSync(); });
  assert.equal(await b.ev(() => subActive() && plus() && canAddPet('dog') && allowed('tracker')), true);
  await b.go('#/abo'); assert.match(await text(p, '.plus-hero'), /actif à vie/); assert.match(await text(p, '.plus-hero'), /prioritaire/);
  await b.ev(async () => { window.__grant = null; await accountSync(); }); assert.equal(await b.ev(() => plus()), false, 'accès retiré');
  assert.equal(await b.ev(() => dog().name), 'Nala', 'les données restent accessibles');
  // lien non PayPal refusé par le format
  assert.equal(await b.ev(() => PAY_LINK.test('https://buy.stripe.com/abc') || PAY_LINK.test('https://evil.example/paypal.com') || PAY_LINK.test('https://www.paypal.biz.evil.fr/x')), false);
  assert.equal(await b.ev(() => PAY_LINK.test('https://www.paypal.biz/alimnight')), true);
  noErrors(b); await b.ctx.close();
});
test('interrupteur : gratuit pour tous, offre de lancement, anciens utilisateurs', async () => {
  const b = await boot({ query: '?preview=none' });
  const r = await b.ev(() => { const o = { ...BILL }; const out = {}; BILL.enabled = false; out.off = plus();
    BILL.enabled = true; BILL.freeUntil = null; BILL.grandfatherBefore = null; out.on = plus();
    BILL.freeUntil = '2999-01-01'; out.launch = plus(); BILL.freeUntil = '2000-01-01'; out.launchOver = plus();
    BILL.grandfatherBefore = '2999-01-01'; BILL.grandfatherUntil = 'lifetime'; out.old = plus(); S.installedAt = '2999-06-01'; out.newUser = plus(); S.installedAt = '2026-01-01';
    S.grant = { until: 'lifetime' }; BILL.grandfatherBefore = null; out.paid = plus(); S.grant = null; Object.assign(BILL, o); return out; });
  assert.deepEqual(r, { off: true, on: false, launch: true, launchOver: false, old: true, newUser: false, paid: true });
  noErrors(b); await b.ctx.close();
});

/* ================= 8. Assistance et pages légales ================= */
test('assistance : prioritaire pour les acheteurs, mail préparé, FAQ', async () => {
  const b = await boot({ hash: '#/support' }), p = b.page;
  await p.waitForSelector('#sp-msg'); assert.ok((await p.locator('details').count()) >= 8);
  await fakeCloud(p); await b.ev(() => { BILL.enabled = true; CLOUD.user = { email: 'q@test.fr' }; S.grant = { until: 'lifetime' }; window.__mail = null; NAV.mail = u => { window.__mail = u; }; SUP.email = 'support@test.fr'; render(); });
  await p.waitForSelector('#sp-msg'); assert.match(await text(p, '.plus-hero'), /prioritaire/);
  await p.fill('#sp-msg', 'court'); await p.click('[data-act=support-send]'); assert.match(await text(p, '#toast'), /10 caractères/);
  await p.fill('#sp-msg', 'Bonjour, mon suivi ne démarre pas.'); await p.click('[data-act=support-send]'); await p.waitForTimeout(200);
  const mail = decodeURIComponent(await b.ev(() => window.__mail)); assert.match(mail, /^mailto:support@test\.fr\?subject=\[PRIORITAIRE\] Wouf – Problème technique/); assert.match(mail, /Wouf 1\./); assert.match(mail, /Plus : oui \(achat\)/);
  // sans e-mail d'assistance : l'e-mail de contact des mentions légales sert (plus jamais « assistance non configurée » tant qu'un contact existe)
  await b.ev(() => { window.__mail = null; SUP.email = ''; LEGAL.email = 'contact@test.fr'; });
  await p.fill('#sp-msg', 'Bonjour, ceci est un troisième message.'); await p.click('[data-act=support-send]'); await p.waitForTimeout(200);
  assert.match(await b.ev(() => window.__mail), /^mailto:contact@test\.fr\?subject=/);
  await b.ev(() => { window.__mail = null; LEGAL.email = ''; }); await p.fill('#sp-msg', 'Bonjour, ceci est un quatrième message.'); await p.click('[data-act=support-send]'); await p.waitForTimeout(200);
  assert.match(await text(p, '#toast'), /Assistance non configurée/); assert.equal(await b.ev(() => window.__mail), null);
  noErrors(b); await b.ctx.close();
});
test('pages légales, nouveautés et alerte de mise à jour', async () => {
  const b = await boot({ hash: '#/legal?doc=cgv' }), p = b.page;
  await p.waitForSelector('.legal'); let t = await text(p, '.legal'); assert.match(t, /Conditions générales de vente/); assert.match(t, /19,99 €/); assert.match(t, /rétractation/); assert.match(t, /à vie/);
  await b.go('#/legal?doc=confidentialite'); assert.match(await text(p, '.legal'), /Sous-traitants/); await b.go('#/legal?doc=mentions'); assert.match(await text(p, '.legal'), /GitHub Pages/);
  await b.go('#/nouveautes'); assert.match(await text(p, '#view'), /Version 1\.2\.0/);
  await b.ev(() => showUpdateBanner()); assert.equal(await p.locator('#upd').isVisible(), true);
  noErrors(b); await b.ctx.close();
  // nouvelle version publiée pendant que l'app est ouverte : bandeau « Actualiser » (jamais pour la même version ni une plus ancienne)
  const nv = await boot(); let pub = '99.0.0';
  await nv.ctx.route(/config\.js\?ts=/, r => r.fulfill({ contentType: 'application/javascript', body: `window.WOUF_CONFIG = { version: '${pub}' };` }));
  await nv.ev(() => checkVersion()); await nv.page.waitForSelector('#upd'); assert.match(await text(nv.page, '#upd'), /Nouvelle version de Wouf disponible/);
  await nv.ev(() => { document.querySelector('#upd').remove(); }); pub = await nv.ev(() => CFG.version); await nv.ev(() => checkVersion()); await nv.page.waitForTimeout(200); assert.equal(await nv.page.$('#upd'), null, 'même version : rien');
  pub = '0.0.1'; await nv.ev(() => checkVersion()); await nv.page.waitForTimeout(200); assert.equal(await nv.page.$('#upd'), null, 'version plus ancienne (cache du serveur) : rien'); await nv.ctx.close();
  const u = await boot({ data: seed({ settings: { ...seed().settings, seenVersion: '1.0.0' } }) }); await u.page.waitForTimeout(400); assert.equal(await u.ev(() => S.settings.seenVersion), await u.ev(() => CHANGELOG[0].v)); assert.match(await text(u.page, '#toast'), /mis à jour/); await u.ctx.close();
  // version purement technique : aucun message si les nouveautés n'ont pas changé
  const tq = await boot({ data: seed({ settings: { ...seed().settings, seenVersion: '9.9.9' } }) }); await tq.page.waitForTimeout(400); assert.doesNotMatch(await tq.ev(() => document.querySelector('#toast').className), /show/); await tq.ctx.close();
});
test('migration : anciennes données (sans espèce ni schéma) chargées sans perte', async () => {
  const old = { v: 1, dogs: [{ id: 'd9', name: 'Vieux', breed: 'Beagle', birth: '2018-01-01', insurance: {} }], events: [{ id: 'e', dogId: 'd9', type: 'vaccine', title: 'Rage', date: '2025-01-01', next: '2026-01-01' }], weights: [{ id: 'w', dogId: 'd9', date: '2025-01-01', kg: 12 }], meds: [], medLog: {}, journal: [], expenses: [], docs: [], quotes: [], contacts: [], owner: {}, settings: {}, current: 'd9', installedAt: '2025-01-01' };
  const b = await boot({ data: old }); await b.page.waitForSelector('.hero');
  assert.deepEqual(await b.ev(() => [S.dogs[0].species, S.schema, S.walks.length, S.events.length, S.weights[0].kg]), ['dog', 2, 0, 1, 12]);
  noErrors(b); await b.ctx.close();
});

test('mises à jour : fichiers versionnés, lien de secours ?maj=1 (vide le cache, garde les données)', async () => {
  const b = await boot(), p = b.page;
  const html = await b.ev(() => document.documentElement.outerHTML); const v = await b.ev(() => CFG.version);
  assert.ok((html.match(new RegExp('\\.js\\?v=' + v.replace(/\./g, '\\.'), 'g')) || []).length >= 15, 'scripts versionnés');
  await b.ev(async () => { await navigator.serviceWorker.ready; await caches.open('dummy-ancien-cache'); });
  assert.ok((await b.ev(() => caches.keys())).includes('dummy-ancien-cache'));
  await p.goto(BASE() + '?maj=1#/home'); await p.waitForFunction(() => !location.search.includes('maj')); await p.waitForSelector('.hero');
  assert.equal(await b.ev(() => S.dogs.length), 1, 'les données sont intactes'); assert.equal((await b.ev(() => caches.keys())).includes('dummy-ancien-cache'), false, 'ancien cache supprimé');
  noErrors(b); await b.ctx.close();
});

test('bouton Wouf+ : visible pour les non-abonnés, présentation de l’offre tant que tout est gratuit, paiement quand la vente est ouverte', async () => {
  const b = await boot({ query: '?preview=none' }), p = b.page;
  assert.equal(await p.locator('.plusbtn').isVisible(), true, 'bouton dans l’en-tête'); assert.match(await text(p, '.plus-cta'), /Wouf\+ · 19,99 € paiement unique/); assert.match(await text(p, '.plus-cta'), /Offert pendant le lancement/);
  await p.click('.plus-cta [data-act=subscribe]'); await p.waitForSelector('.sheet'); assert.match(await text(p, '.sheet'), /tout est offert/); assert.match(await text(p, '.sheet'), /19,99 €/); await p.click('.sheet [data-close]');
  await p.click('.plusbtn'); await p.waitForSelector('.plus-hero'); assert.match(await text(p, '#view'), /Toutes les fonctions Plus sont incluses/); assert.match(await text(p, '[data-act=subscribe]'), /Découvrir Wouf\+/);
  // vente ouverte, utilisateur non abonné : libellé d'achat partout
  await b.ev(() => { BILL.enabled = true; BILL.paymentLink = 'https://www.paypal.com/ncp/payment/X1'; render(); });
  assert.match(await text(p, '[data-act=subscribe]'), /Souscrire à Wouf\+ · 19,99 € à vie/); await b.go('#/educ'); await p.waitForSelector('.cta-plus'); assert.match(await text(p, '.cta-plus'), /Souscrire à Wouf\+/);
  await b.go('#/lecon?id=stop'); assert.match(await text(p, '[data-act=subscribe]'), /Souscrire/);
  // abonné : plus de bouton
  await b.ev(() => { S.sub = { active: true, lifetime: true }; render(); }); assert.equal(await p.locator('.plusbtn').count(), 0);
  noErrors(b); await b.ctx.close();
});
test('leçons complètes : programme d’entraînement, erreurs, dépannage, pistes sur chacune des leçons', async () => {
  const b = await boot({ hash: '#/educ' }), p = b.page;
  const ids = await b.ev(() => LESSONS.map(l => l.id)); assert.ok(ids.length >= 50, 'leçons : ' + ids.length);
  for (const id of ids) { await b.go('#/lecon?id=' + id); const t = await text(p, '#view'); for (const s of ['Objectif', 'Les étapes', 'Programme d’entraînement', 'Erreurs fréquentes', 'Dépannage', 'Test de validation', 'Pour aller plus loin']) assert.ok(t.includes(s), `${id} : section « ${s} » absente`); }
  const n = await b.ev(() => [LESSONS.filter(l => (l.sp || 'dog') === 'dog' && !l.free).length, LESSONS.filter(l => l.sp === 'cat' && !l.free).length, PROGRAMS.length]);
  assert.ok(n[0] >= 30 && n[1] >= 10 && n[2] >= 8, JSON.stringify(n)); noErrors(b); await b.ctx.close();
});

/* ================= 8b. Croquettes, don ================= */
const KIB_GOOD = { type: 'dry', stage: 'adult', name: 'Adulte poulet riz', brand: 'Marque A', price: '48', bagKg: '12', protein: '27', fat: '15', fiber: '2.5', ash: '7', moisture: '9', ca: '1.2', p: '0.9', ingredients: 'Poulet déshydraté (30 %), riz, graisse de poulet, pulpe de betterave, huile de saumon, tocophérols' };
const KIB_LOW = { type: 'dry', stage: 'adult', name: 'Menu économique', brand: 'Marque B', price: '20', bagKg: '15', protein: '18', fat: '7', fiber: '4', ash: '8', moisture: '10', ingredients: 'Céréales (maïs, blé), viandes et sous-produits animaux, colorants, sucre, BHA' };
async function addFood(b, f) {
  const p = b.page; await p.click('[data-act=food-add]'); await p.waitForSelector('#f_name');
  await p.selectOption('#f_type', f.type); await p.selectOption('#f_stage', f.stage);
  for (const k of ['name', 'brand', 'price', 'bagKg', 'protein', 'fat', 'fiber', 'ash', 'moisture', 'ca', 'p', 'ingredients']) if (f[k] != null) await p.fill('#f_' + (k === 'bagKg' ? 'bagKg' : k), f[k]);
  await p.click('form [type=submit]'); await p.waitForSelector('.food');
}
test('croquettes : profil, classement, coût, comparaison, allergies, détail', async () => {
  const b = await boot({ data: seed({ weights: [{ id: 'w1', dogId: 'd1', date: day(-3), kg: 30 }], dogs: [dogRec({ activity: 'high', allergies: 'allergique au blé' })] }), hash: '#/croquettes' }), p = b.page;
  await p.waitForSelector('.tgt'); assert.match(await text(p, '#view'), /Besoin énergétique : \d+ kcal par jour/); assert.match(await text(p, '.tgt'), /Protéines26 à 34 %/);
  await addFood(b, KIB_LOW); await addFood(b, KIB_GOOD);
  assert.equal(await p.locator('a.food').count(), 2); assert.match(await text(p, 'a.food:first-of-type'), /Adulte poulet riz/, 'le meilleur produit est classé premier');
  const sc = await p.locator('.score-badge').allTextContents(); assert.ok(+sc[0] >= 80 && +sc[1] <= 55, sc.join('/'));
  assert.match(await text(p, '#view'), /Meilleur choix parmi vos produits/); assert.match(await text(p, '.food:last-of-type'), /Contient : blé \/ gluten/, 'allergie détectée');
  await p.waitForSelector('table.cmp'); const cmp = await text(p, 'table.cmp'); assert.match(cmp, /Coût par mois/); assert.match(cmp, /Alerte allergie/);
  const calc = await b.ev(() => { const d = dog(), prof = foodProfile(d), need = foodKcalNeed(d, prof), r = evalFood(d, prof, S.foods.find(f => f.name === 'Adulte poulet riz'), need); return { kcal: need.kcal, g: r.g, day: r.day, ppk: r.ppk }; });
  assert.equal(calc.ppk, 4); assert.ok(calc.kcal > 1800 && calc.kcal < 2100, 'besoin chien actif 30 kg : ' + calc.kcal); assert.ok(Math.abs(calc.day - calc.g / 1000 * 4) < 0.001, 'coût = grammes × prix au kg');
  await p.click('a.food:first-of-type'); await p.waitForSelector('.part'); assert.match(await text(p, '#view'), /Détail de la note/); assert.match(await text(p, '#view'), /Ration et coût pour Nala/);
  await p.click('[data-act=food-edit]'); await p.fill('#f_protein', '40'); await p.fill('#f_fat', '60'); await p.click('form [type=submit]'); assert.match(await text(p, '#toast'), /dépassent 100/);
  await p.click('.sheet [data-close]'); await p.click('[data-act=food-del]'); await p.click('.sheet-wrap.dlg [data-ok]'); await p.waitForSelector('.food'); assert.equal(await b.ev(() => S.foods.length), 1);
  await b.go('#/croquettes-guide'); assert.ok((await p.locator('details').count()) >= 10); assert.match(await text(p, '#view'), /matière sèche/);
  noErrors(b); await b.ctx.close();
});
test('croquettes : chiot de grande race (calcium), chat, activité modifiable', async () => {
  const b = await boot({ data: seed({ dogs: [dogRec({ birth: day(-150), breed: 'Dogue Allemand' }), dogRec({ id: 'c1', name: 'Miso', species: 'cat', breed: 'Persan', birth: '2022-03-01', neutered: true })], weights: [{ id: 'w1', dogId: 'd1', date: day(-2), kg: 20 }, { id: 'w2', dogId: 'c1', date: day(-2), kg: 5 }] }), hash: '#/croquettes' }), p = b.page;
  await p.waitForSelector('.tgt'); assert.match(await text(p, '.tgt'), /maximum strict pour les grands chiots/); assert.match(await text(p, '#view'), /grande race/);
  await addFood(b, { ...KIB_GOOD, name: 'Croissance calcium haut', stage: 'growth', ca: '2.3', p: '1.3' }); await addFood(b, { ...KIB_GOOD, name: 'Croissance grandes races', stage: 'growth', ca: '1.2', p: '0.9' });
  assert.match(await text(p, 'a.food:first-of-type'), /Croissance grandes races/); await p.click('a.food:last-of-type'); await p.waitForSelector('.part'); assert.match(await text(p, '#view'), /AU-DESSUS du maximum sûr/); await b.go('#/croquettes');
  await b.ev(() => { S.current = 'c1'; save(); render(); }); await p.waitForSelector('.tgt'); assert.match(await text(p, '.tgt'), /Protéines32 à 45 %/); assert.equal(await p.locator('a.food').count(), 0, 'les produits sont propres à chaque espèce');
  await addFood(b, { type: 'wet', stage: 'adult', name: 'Pâtée poulet', brand: 'C', price: '30', bagKg: '10', protein: '9', fat: '5', fiber: '0.5', ash: '2', moisture: '80', ingredients: 'Poulet, bouillon, foie de poulet' });
  await p.click('a.food'); await p.waitForSelector('.part'); assert.match(await text(p, '#view'), /hydratation/); await b.go('#/croquettes');
  await p.click('[data-act=food-act][data-v=sport]'); assert.equal(await b.ev(() => S.dogs.find(d => d.id === 'c1').activity), 'sport');
  noErrors(b); await b.ctx.close();
});
test('croquettes : recherche Open Pet Food Facts (simulée) et import pré-rempli', async () => {
  const b = await boot({ data: seed({ weights: [{ id: 'w1', dogId: 'd1', date: day(-3), kg: 30 }] }), hash: '#/croquettes' }), p = b.page; const asked = [];
  await b.ctx.route(/openpetfoodfacts/, r => { asked.push(r.request().url()); const u = r.request().url(), cors = { 'access-control-allow-origin': '*' };
    if (/api\/v2\/product\/3760123456789/.test(u)) return r.fulfill({ headers: cors, contentType: 'application/json', body: JSON.stringify({ status: 1, product: { code: '3760123456789', product_name: 'Croquettes test code', brands: 'MarqueX', nutriments: { proteins_100g: 25 } } }) });
    return r.fulfill({ headers: cors, contentType: 'application/json', body: JSON.stringify({ products: [{ code: '1', product_name: 'Croquettes adulte poulet', brands: 'MarqueX,Autre', quantity: '12 kg', ingredients_text_fr: 'Poulet, riz, maïs', nutriments: { proteins_100g: 26, fat_100g: 14, fiber_100g: 3, 'energy-kcal_100g': 375 } }, { code: '2', product_name: '' }] }) }); });
  await p.click('[data-act=food-search]'); await p.fill('#food-q input', 'poulet'); await p.click('#food-q button'); await p.waitForSelector('[data-act=food-pick]');
  assert.equal(await p.locator('[data-act=food-pick]').count(), 1, 'les produits sans nom sont ignorés'); assert.match(asked[0], /search_terms=poulet/);
  await p.click('[data-act=food-pick]'); await p.waitForSelector('#f_name'); assert.equal(await p.inputValue('#f_name'), 'Croquettes adulte poulet'); assert.equal(await p.inputValue('#f_brand'), 'MarqueX');
  assert.equal(await p.inputValue('#f_protein'), '26'); assert.equal(await p.inputValue('#f_kcalKg'), '3750'); assert.match(await text(p, '.note-import'), /Vérifiez chaque valeur/); assert.match(await text(p, '.note-import'), /manquante/);
  await p.fill('#f_ash', '7'); await p.click('form [type=submit]'); await p.waitForSelector('.food'); assert.equal(await b.ev(() => S.foods[0].ingredients), 'Poulet, riz, maïs');
  await p.click('[data-act=food-search]'); await p.fill('#food-q input', '3760123456789'); await p.click('#food-q button'); await p.waitForSelector('[data-act=food-pick]'); assert.ok(asked.some(u => /api\/v2\/product\/3760123456789/.test(u)), 'code-barres : recherche exacte');
  await p.click('.sheet [data-close]'); await b.ctx.unroute(/openpetfoodfacts/); await b.ctx.route(/openpetfoodfacts/, r => r.abort()); await p.click('[data-act=food-search]'); await p.fill('#food-q input', 'x'); await p.click('#food-q button'); await p.waitForSelector('#food-res .warn'); assert.match(await text(p, '#food-res'), /Recherche impossible/);
  noErrors(b); await b.ctx.close();
});
test('croquettes : recommandation selon le chien et suggestions de vrais produits classés', async () => {
  const b = await boot({ data: seed({ weights: [{ id: 'w1', dogId: 'd1', date: day(-3), kg: 30 }], dogs: [dogRec({ activity: 'high', allergies: 'allergique au blé' })] }), hash: '#/croquettes' }), p = b.page; const asked = [];
  await p.waitForSelector('.reco'); assert.match(await text(p, '.reco h2'), /Croquettes adulte actif/); assert.match(await text(p, '.reco'), /Grosses croquettes|Croquettes de taille moyenne/); assert.match(await text(p, '.reco'), /À exiger sur l’étiquette/); assert.match(await text(p, '.reco'), /allergènes déclarés/);
  const OFF = [
    { code: '1', product_name: 'Adulte actif poulet', brands: 'MarqueA', quantity: '12 kg', ingredients_text_fr: 'Poulet déshydraté, riz, graisse de poulet, tocophérols', nutriments: { proteins_100g: 27, fat_100g: 16, fiber_100g: 2.5, ash_100g: 7, moisture_100g: 9 } },
    { code: '2', product_name: 'Croquettes économiques', brands: 'MarqueB', ingredients_text_fr: 'Céréales, viandes et sous-produits animaux, colorants', nutriments: { proteins_100g: 18, fat_100g: 7, fiber_100g: 4, ash_100g: 8, moisture_100g: 10 } },
    { code: '3', product_name: 'Sans composition', brands: 'MarqueC', nutriments: {} },
    { code: '4', product_name: 'Adult au blé', brands: 'MarqueD', ingredients_text_fr: 'Blé, poulet', nutriments: { proteins_100g: 27, fat_100g: 16, fiber_100g: 2.5, ash_100g: 7, moisture_100g: 9 } },
    { code: '5', product_name: 'Adulte actif poulet', brands: 'MarqueA', nutriments: { proteins_100g: 27, fat_100g: 16 } }];
  await b.ctx.route(/openpetfoodfacts/, r => { asked.push(decodeURIComponent(r.request().url())); r.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify({ products: OFF }) }); });
  await p.click('[data-act=sugg-run]'); await p.waitForSelector('#sugg [data-act=sugg-add]'); assert.match(asked[0], /search_terms=croquettes chien actif/); assert.match(asked[0], /page_size=40/);
  const rows = await p.locator('#sugg [data-act=sugg-add]').count(); assert.equal(rows, 3, 'doublon et produit sans composition écartés');
  assert.match(await text(p, '#sugg [data-act=sugg-add]:first-of-type'), /Adulte actif poulet/); assert.match(await text(p, '#sugg [data-act=sugg-add]:last-of-type'), /Contient : blé/, 'produit avec l’allergène en dernier');
  assert.match(await text(p, '#sugg'), /sans composition ignorés/); assert.match(await text(p, '#sugg'), /pas une recommandation de marque/);
  await p.click('#sugg [data-act=sugg-add]:first-of-type'); await p.waitForSelector('#f_name'); assert.equal(await p.inputValue('#f_name'), 'Adulte actif poulet'); assert.equal(await p.inputValue('#f_stage'), 'adult'); assert.match(await text(p, '.note-import'), /Vérifiez chaque valeur/);
  await p.fill('#f_price', '48'); await p.fill('#f_bagKg', '12'); await p.click('form [type=submit]'); await p.waitForSelector('a.food'); assert.equal(await b.ev(() => S.foods[0].name), 'Adulte actif poulet');
  // changement de profil : chiot de grande race → recommandation différente
  await b.ev(() => { const d = dog(); d.birth = new Date(Date.now() - 150 * 864e5).toISOString().slice(0, 10); d.breed = 'Dogue Allemand'; save(); render(); }); await p.waitForSelector('.reco');
  assert.match(await text(p, '.reco h2'), /croissance grandes races/); assert.match(await text(p, '.reco'), /Calcium entre 1,0 et 1,5/); assert.match(await text(p, '.reco'), /tous âges/);
  await b.ctx.unroute(/openpetfoodfacts/); await b.ctx.route(/openpetfoodfacts/, r => r.abort()); await p.click('[data-act=sugg-run]'); await p.waitForSelector('#sugg .warn'); assert.match(await text(p, '#sugg'), /Recherche impossible/);
  noErrors(b); await b.ctx.close();
});
test('don à la SPA : lien direct sécurisé vers le site officiel, transparence', async () => {
  const b = await boot(), p = b.page;
  const home = await b.ev(() => { const a = document.querySelector('.don-card a'); return { href: a.href, target: a.target, rel: a.rel }; });
  assert.equal(home.href, 'https://soutenir.la-spa.fr/P_StopAbandon2026_site/~mon-don'); assert.equal(home.target, '_blank'); assert.match(home.rel, /noopener/); assert.match(home.rel, /noreferrer/);
  await b.go('#/plus'); assert.match(await text(p, '#view'), /Faire un don à la SPA`?/); await b.go('#/don'); await p.waitForSelector('.big-heart');
  const btn = await b.ev(() => { const a = document.querySelector('#view a.btn.primary'); return { href: a.href, text: a.textContent, target: a.target }; });
  assert.equal(btn.href, 'https://soutenir.la-spa.fr/P_StopAbandon2026_site/~mon-don'); assert.match(btn.text, /Faire un don à la SPA/); assert.equal(btn.target, '_blank');
  assert.match(await text(p, '#view'), /n’est pas affilié/); assert.match(await text(p, '#view'), /ne collecte aucun don/);
  await b.ev(() => { CFG.donation.name = 'une autre association'; CFG.donation.url = 'https://exemple.org/don'; render(); }); assert.equal(await b.ev(() => document.querySelector('#view a.btn.primary').href), 'https://exemple.org/don');
  noErrors(b); await b.ctx.close();
});

/* ================= 9. Google : sauvegarde cloud ================= */
test('cloud : envoi, envoi automatique, restauration, conflit dans les deux sens, achat qui suit le compte', async () => {
  const b = await boot({ hash: '#/reglages' }), p = b.page; await fakeCloud(p);
  await p.waitForSelector('[data-act=g-signin]'); await p.click('[data-act=g-signin]'); await p.waitForFunction(() => window.__store && CLOUD.st === 'ok');
  assert.equal(await b.ev(() => 'settings' in JSON.parse(__store.text)), false, 'préférences propres à l’appareil non synchronisées');
  await b.ev(() => { S.weights.push({ id: 'w1', dogId: 'd1', date: '2026-09-01', kg: 12 }); save(); }); await p.waitForFunction(() => JSON.parse(__store.text).weights.length === 1, null, { timeout: 8000 });
  const r = await b.ev(async () => { const keep = S.settings; S = blank(); S.settings = keep; await cloudPull(true); return [S.dogs.length, S.weights.length]; }); assert.deepEqual(r, [1, 1]);
  await b.ev(() => { const x = JSON.parse(__store.text); x.dogs[0].name = 'Remote'; window.__store = { text: JSON.stringify(x), at: Date.now() + 5000 }; S.dogs[0].name = 'Local'; S.updatedAt = 2000; window.__pr = cloudPull(true); });
  await p.waitForSelector('.sheet-wrap.dlg [data-a]'); await p.click('[data-a]'); await b.ev(() => window.__pr); assert.equal(await b.ev(() => S.dogs[0].name), 'Remote');
  await b.ev(() => { window.__store = { text: __store.text, at: Date.now() + 9000 }; S.dogs[0].name = 'LocalKeep'; S.updatedAt = 3000; window.__pr = cloudPull(true); });
  await p.waitForSelector('.sheet-wrap.dlg [data-b]'); await p.click('[data-b]'); await b.ev(() => window.__pr); assert.equal(await b.ev(() => JSON.parse(__store.text).dogs[0].name), 'LocalKeep');
  await b.ev(() => { S.sub = { active: true, lifetime: true, checked: Date.now() }; save(); }); await p.waitForFunction(() => JSON.parse(__store.text).sub && JSON.parse(__store.text).sub.lifetime, null, { timeout: 8000 });
  noErrors(b); await b.ctx.close();
});

/* ================= 10. Parcours santé historique ================= */
test('SOS vétérinaires, sauvegarde chiffrée, agenda, fiche véto', async () => {
  const b = await boot({ geo: true, data: seed({ weights: [{ id: 'w1', dogId: 'd1', date: day(-5), kg: 30 }], events: [{ id: 'e1', dogId: 'd1', type: 'vaccine', title: 'Rage', date: day(-300), next: day(65), cost: 60 }] }), hash: '#/sos' }), p = b.page;
  await p.click('[data-act=locate]'); await p.waitForSelector('.vet'); assert.equal(await p.locator('.vet').count(), 3);
  await p.click('[data-f="24"]'); assert.equal(await p.locator('.vet').count(), 1); await p.click('[data-f=all]');
  await p.fill('#tox-q', 'raisin'); assert.equal(await p.locator('.tox').count(), 1);
  await b.go('#/assurance'); await p.waitForSelector('.hero'); assert.equal(await p.locator('.ins').count(), 0, 'le comparateur d’assurance n’existe plus');
  await b.go('#/plus'); assert.doesNotMatch(await text(p, '#view'), /Assurance santé|Comparateur et simulateur/);
  const rt = await b.ev(async () => { const blob = await makeBackup('secret123', true), j = await readBackup(await blob.text(), 'secret123'); let bad; try { await readBackup(await blob.text(), 'wrong'); } catch (e) { bad = e.message; } return { dogs: j.state.dogs.length, bad }; });
  assert.deepEqual(rt, { dogs: 1, bad: 'Phrase secrète incorrecte.' });
  assert.equal(await b.ev(() => (buildICS().match(/BEGIN:VEVENT/g) || []).length), 1);
  await b.ev(() => { window.print = () => { window.__p = document.getElementById('print-root').textContent; }; }); await b.go('#/carnet'); await p.click('[data-act=report]'); await p.waitForTimeout(400); assert.match(await b.ev(() => window.__p), /Carnet de santé de Nala/);
  await b.go('#/depenses'); await p.waitForSelector('.big-n'); await b.go('#/nutrition'); await p.waitForSelector('#nut-out .big-n'); await b.go('#/race'); assert.match(await text(p, '#view'), /Golden Retriever/);
  noErrors(b); await b.ctx.close();
});
test('toutes les pages s’affichent sans erreur (chien et chat)', async () => {
  const data = seed({ dogs: [dogRec(), dogRec({ id: 'c1', name: 'Miso', species: 'cat', breed: 'Persan', birth: '2024-03-01' })] });
  const b = await boot({ data }), p = b.page; const routes = Object.keys(await b.ev(() => Object.fromEntries(Object.keys(ROUTES).map(k => [k, 1]))));
  for (const cur of ['d1', 'c1']) { await b.ev(c => { S.current = c; save(); }, cur);
    for (const r of routes) { await b.go('#/' + r + (r === 'lecon' || r === 'seance' ? (cur === 'c1' ? '?id=c-jeu' : '?id=assis') : r === 'programme' ? (cur === 'c1' ? '?id=chaton4' : '?id=chiot8') : r === 'balade-detail' ? '?id=none' : '')); const html = await b.ev(() => document.querySelector('#view').innerHTML), txt = await b.ev(() => document.querySelector('#view').innerText); assert.ok(html.length > 30, `page ${r} vide pour ${cur}`);
      assert.doesNotMatch(txt, /undefined|NaN|\[object |\bnull\b|\$\{/, `texte cassé sur la page ${r} (${cur}) : ` + (txt.match(/.{0,40}(undefined|NaN|\[object |\bnull\b|\$\{).{0,40}/) || [''])[0]);
      if (cur === 'c1') assert.doesNotMatch(txt.replace(/chiens? (et|ou) (de )?chats?|chats? (et|ou) (de )?chiens?|chien de garde|Wouf/gi, ''), /\bvotre chien\b|\bton chien\b/i, `« votre chien » affiché pour un chat sur la page ${r}`); } }
  assert.ok(routes.length >= 25, 'routes : ' + routes.length); noErrors(b); await b.ctx.close();
});

test('statistiques anonymes : désactivées par défaut, provenance, adresse, refus dans Réglages', async () => {
  const b = await boot({ query: '?src=tiktok' }), p = b.page;
  assert.equal(await b.ev(() => statsCode()), 'woufapp');
  await b.go('#/plus'); assert.equal(await p.$('a[href="https://woufapp.goatcounter.com"]'), null, 'lien statistiques caché aux utilisateurs');
  await b.ev(() => { WOUF_CONFIG.stats.goatcounter = ''; }); assert.equal(await b.ev(() => statsCode()), '', 'aucune mesure sans code');
  assert.equal(await b.ev(() => STATS_SRC), 'tiktok');
  await b.go('#/reglages'); assert.equal(await p.$('[data-act=stats-opt]'), null, 'pas de case sans code');
  await b.ev(() => { WOUF_CONFIG.stats.goatcounter = 'wouf-test'; });
  const u = new URL(await b.ev(() => statsUrl('/home', false, 'tiktok')));
  assert.equal(u.origin, 'https://wouf-test.goatcounter.com'); assert.equal(u.pathname, '/count');
  assert.equal(u.searchParams.get('p'), '/home'); assert.equal(u.searchParams.get('r'), 'tiktok'); assert.equal(u.searchParams.get('e'), 'false');
  assert.equal(new URL(await b.ev(() => statsUrl('lecon-acquise', true))).searchParams.get('e'), 'true');
  await b.go('#/home'); await b.go('#/reglages'); await p.click('[data-act=stats-opt]');
  assert.equal(await b.ev(() => S.settings.noStats), true);
  await b.go('#/legal?doc=confidentialite'); assert.match(await text(p, '#view'), /GoatCounter/);
  await b.ev(() => { WOUF_CONFIG.stats.goatcounter = 'Pas Valide!'; }); assert.equal(await b.ev(() => statsCode()), '');
  noErrors(b); await b.ctx.close();
  const o = await boot({ query: '?proprio=1', hash: '#/plus' });
  assert.equal(await o.ev(() => OWNER), true); assert.ok(await o.page.$('a[href="https://woufapp.goatcounter.com"]'), 'lien « Mes statistiques » pour le propriétaire');
  noErrors(o); await o.ctx.close();
  const g = await boot({ hash: '#/plus' }); await fakeCloud(g.page);
  await g.ev(() => { CloudApi.signIn = async () => ({ email: 'Storacequentin@gmail.com ', name: 'Q', picture: '' }); });
  await g.page.click('a[href="#/reglages"]'); await g.page.click('[data-act=g-signin]'); await g.page.waitForTimeout(300); await g.go('#/plus');
  await g.page.waitForSelector('a[href="https://woufapp.goatcounter.com"]', { timeout: 3000 }); assert.equal(await g.ev(() => OWNER), true, 'propriétaire reconnu par son compte Google');
  const x = await boot({ hash: '#/plus' }); await fakeCloud(x.page); await x.page.click('a[href="#/reglages"]'); await x.page.click('[data-act=g-signin]'); await x.page.waitForTimeout(300); await x.go('#/plus'); await x.page.waitForTimeout(200);
  assert.equal(await x.page.$('a[href="https://woufapp.goatcounter.com"]'), null, 'un autre compte Google ne voit pas les statistiques');
  noErrors(g); noErrors(x); await g.ctx.close(); await x.ctx.close();
});

test('nouvelle adresse : redirection sans carnet, transfert du carnet et des documents vers la nouvelle adresse', async () => {
  const fs = require('fs'), path = require('path'), NEW = `http://127.0.0.1:${PORT}/wouf/`, OLD = `http://localhost:${PORT}`;
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
  assert.match(cfg, /site: \{ home: 'https:\/\/woufapp\.fr\/', moved: (true|false) \}/, 'réglage site introuvable');
  const conf = cfg.replace(/site: \{[^}]*\}/, `site: { home: '${NEW}', moved: true, old: ['${OLD}'] }`);
  const mk = async data => {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, locale: 'fr-FR' });
    await ctx.route(/config\.js/, r => r.fulfill({ contentType: 'application/javascript', body: conf }));
    await ctx.route(/gstatic\.com/, r => r.abort());
    if (data) await ctx.addInitScript(s => { if (location.hostname === 'localhost' && !localStorage.getItem('wouf:data')) localStorage.setItem('wouf:data', JSON.stringify(s)); }, data);
    return ctx;
  };
  // 1) ancienne adresse, aucun carnet : redirection immédiate (le lien ?src est conservé)
  let ctx = await mk(null), p = await ctx.newPage();
  await p.goto(BASE() + '?src=tiktok#/home'); await p.waitForURL(u => u.href.startsWith(NEW)); assert.ok(p.url().includes('src=tiktok'));
  await ctx.close();
  // 2) ancienne adresse avec un carnet : bandeau, transfert en un geste
  ctx = await mk(seed()); p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE() + '#/home'); await p.waitForSelector('.move-card'); assert.match(await text(p, '.move-card'), /127\.0\.0\.1/);
  await p.evaluate(async () => { await fput('doc1', new Blob(['bonjour'])); S.docs.push({ id: 'doc1', dogId: 'd1', name: 'Ordonnance', type: 'text/plain', date: today() }); save(); flush(); });
  const [np] = await Promise.all([ctx.waitForEvent('page'), p.click('[data-act=move-go]')]);
  np.on('pageerror', e => errs.push('nouvelle adresse : ' + e.message));
  await np.waitForFunction(() => typeof S !== 'undefined' && S.dogs.length === 1, null, { timeout: 15000 });
  assert.equal(await np.evaluate(() => S.dogs[0].name), 'Nala');
  assert.equal(await np.evaluate(async () => (await fget('doc1')).text()), 'bonjour');
  assert.equal(await np.evaluate(() => JSON.parse(localStorage.getItem('wouf:data')).dogs[0].name), 'Nala', 'carnet enregistré sur la nouvelle adresse');
  assert.equal(await np.evaluate(() => location.hash), '#/home'); assert.equal(await np.$('.move-card'), null, 'pas de bandeau sur la nouvelle adresse');
  await p.waitForFunction(() => !!S.settings.movedAt); assert.match(await text(p, '.move-card'), /transféré/);
  assert.equal(await p.evaluate(() => S.dogs.length), 1, 'rien n’est supprimé sur l’ancienne adresse');
  assert.deepEqual(errs, []); await ctx.close();
  // 3) sans « moved », aucune redirection ni bandeau
  const b = await boot(); assert.equal(await b.page.$('.move-card'), null); assert.ok(b.page.url().startsWith(BASE())); noErrors(b); await b.ctx.close();
});

test('administration : réservée au propriétaire, comptes, Plus offert, retrait, interrupteur de vente', async () => {
  const b = await boot({ hash: '#/admin' }), p = b.page;
  assert.match(await text(p, '#view'), /Réservé au propriétaire/);
  await b.ev(() => { OWNER = true; BILL.paymentLink = ''; }); await fakeCloud(p);
  await b.ev(() => {
    CloudApi.signIn = async () => ({ email: 'patron@test.fr', name: 'Patron', picture: '' });
    window.__adm = { grants: {}, cfg: null };
    Object.assign(AdminApi, {
      listUsers: async () => [{ uid: 'u1', name: 'Alice', email: 'alice@test.fr', lastSeen: today(), firstSeen: today(), dogs: 1, cats: 0, lessons: 4, grant: window.__adm.grants.u1 || null },
        { uid: 'u2', name: 'Bob', email: 'bob@test.fr', lastSeen: '2026-01-01', firstSeen: '2025-12-01', dogs: 0, cats: 2, lessons: 0, grant: null }],
      setGrant: async (uid, g) => { window.__adm.grants[uid] = g; }, setConfig: async c => { window.__adm.cfg = c; },
      listOrders: async () => [{ id: 'o1', uid: 'u2', firstName: 'Bob', lastName: 'Durand', paypalEmail: 'bob.pp@test.fr', googleEmail: 'bob@test.fr', contactEmail: 'bob@test.fr', offer: 'lifetime', price: '19,99 €', status: 'pending', at: Date.now() },
        { id: 'o2', uid: 'u1', firstName: 'Alice', lastName: 'M', paypalEmail: 'a@pp.fr', googleEmail: 'alice@test.fr', contactEmail: 'alice@test.fr', offer: 'lifetime', price: '19,99 €', status: 'pending', at: Date.now() - 1000 }],
      setOrder: async (id, patch) => { (window.__adm.orders = window.__adm.orders || {})[id] = patch; },
      myGrant: async () => window.__adm.mine || null, touch: async pr => { window.__adm.profile = pr; } });
    render();
  });
  assert.match(await text(p, '#view'), /Connectez-vous avec le compte Google/);
  await p.click('[data-act=g-signin]'); await p.waitForSelector('.adm-u');
  assert.equal(await p.$$eval('.adm-u', l => l.length), 2); assert.match(await text(p, '.adm-tiles'), /2 comptes Google/);
  // dossiers de paiement PayPal : affichés, activation = Plus à vie sur le bon compte, refus
  assert.match(await text(p, '#adm-orders'), /Paiements à vérifier \(2\)/); assert.match(await text(p, '#adm-orders'), /Bob Durand.*bob\.pp@test\.fr.*19,99 €.*bob@test\.fr/);
  await p.click('[data-act=adm-order-ok][data-id=o1]'); await p.click('.sheet [data-ok]');
  await p.waitForFunction(() => window.__adm.orders && window.__adm.orders.o1 && window.__adm.orders.o1.status === 'done');
  assert.equal(await b.ev(() => window.__adm.grants.u2.until), 'lifetime'); assert.equal(await b.ev(() => window.__adm.grants.u2.order), 'o1');
  await p.click('[data-act=adm-order-no][data-id=o2]'); await p.click('.sheet [data-ok]'); await p.waitForFunction(() => window.__adm.orders.o2 && window.__adm.orders.o2.status === 'refused');
  assert.match(await text(p, '#adm-orders'), /Paiements à vérifier \(0\)/); assert.match(await text(p, '#adm-orders'), /Dossiers traités \(2\)/);
  await b.ev(() => { window.__adm.grants = {}; });
  // recherche
  await p.fill('#adm-q', 'bob'); assert.deepEqual(await p.$$eval('.adm-u', l => l.map(e => e.hidden)), [true, false]); await p.fill('#adm-q', '');
  // Plus offert à vie puis retrait
  await p.click('[data-act=adm-grant][data-uid=u1][data-until=lifetime]'); await p.click('.sheet [data-ok]');
  await p.waitForFunction(() => window.__adm.grants.u1 && window.__adm.grants.u1.until === 'lifetime');
  assert.match(await text(p, '.adm-u'), /Plus offert à vie/);
  await p.click('[data-act=adm-revoke][data-uid=u1]'); await p.click('.sheet [data-ok]');
  await p.waitForFunction(() => window.__adm.grants.u1 === null);
  // vente : bloquée tant que rien n'est prêt
  assert.equal(await p.$eval('[data-act=adm-sale]', e => e.disabled), true); assert.match(await text(p, '#view'), /Adresse PayPal \(ou lien PayPal\) à renseigner/);
  // choix du propriétaire : dès qu'un moyen de paiement existe, l'interrupteur marche, même si les mentions légales sont incomplètes (simple avertissement)
  await b.ev(() => { BILL.payee = 'p@pp.fr'; render(true); }); assert.equal(await p.$eval('[data-act=adm-sale]', e => e.disabled), false);
  assert.match(await text(p, '#view'), /Mentions légales incomplètes/); assert.match(await text(p, '[data-act=adm-sale]'), /Ventes OFF/);
  await b.ev(() => { BILL.payee = ''; render(true); });
  await p.fill('#adm-pay [name=paymentLink]', 'pas-un-lien'); await p.click('[data-act=adm-save-pay]'); assert.equal(await b.ev(() => window.__adm.cfg), null, 'lien invalide refusé');
  await p.fill('#adm-pay [name=paymentLink]', ''); for (const [k, v] of Object.entries({ payee: 'moi@paypal.test', seller: 'Q', form: 'EI', siret: '123', address: 'Paris', email: 'q@q.fr', mediator: 'Médiateur', supportEmail: 'aide@q.fr' })) await p.fill(`#adm-pay [name=${k}]`, v);
  await p.click('[data-act=adm-save-pay]'); await p.waitForFunction(() => window.__adm.cfg && window.__adm.cfg.payee);
  assert.deepEqual(await b.ev(() => [BILL.payee, LEGAL.siret, SUP.email, JSON.parse(localStorage.getItem('wouf:remote')).seller]), ['moi@paypal.test', '123', 'aide@q.fr', 'Q']);
  await b.go('#/legal?doc=mentions'); assert.match(await text(p, '#view'), /SIRET : 123/); await b.go('#/admin'); await p.waitForSelector('[data-act=adm-sale]');
  assert.equal(await p.$eval('[data-act=adm-sale]', e => e.disabled), false);
  await p.click('[data-act=adm-sale]'); await p.click('.sheet [data-ok]');
  await p.waitForFunction(() => window.__adm.cfg && window.__adm.cfg.billingEnabled === true); assert.equal(await b.ev(() => BILL.enabled), true);
  await p.click('[data-act=adm-sale]'); await p.click('.sheet [data-ok]');
  await p.waitForFunction(() => window.__adm.cfg.billingEnabled === false); assert.equal(await b.ev(() => BILL.enabled), false);
  // côté utilisateur : un Plus offert est pris en compte à la connexion, et retiré avec lui
  await b.ev(async () => { BILL.enabled = true; BILL.freeUntil = null; window.__adm.mine = { until: 'lifetime' }; await accountSync(); });
  assert.equal(await b.ev(() => plus()), true, 'Plus offert actif'); assert.equal(await b.ev(() => window.__adm.profile.email), 'patron@test.fr');
  await b.ev(async () => { window.__adm.mine = null; await accountSync(); }); assert.equal(await b.ev(() => plus()), false, 'Plus retiré');
  await b.ev(() => { S.grant = { until: '2020-01-01' }; }); assert.equal(await b.ev(() => plus()), false, 'offre expirée');
  await b.ev(() => { BILL.enabled = false; });
  noErrors(b); await b.ctx.close();
});

test('activation automatique PayPal : notify_url et compte transmis, page d’attente qui s’active toute seule, administration', async () => {
  const b = await boot({ query: '?preview=none', hash: '#/abo' }), p = b.page; await fakeCloud(p); await fakeSale(p);
  let active = false; const seen = [];
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  await b.ctx.route('https://relais.test/**', async r => { const u = new URL(r.request().url()); if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: cors });
    seen.push([u.pathname, r.request().headers().authorization]);
    if (u.pathname === '/status') return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(active ? { active: true, lifetime: true, plan: 'lifetime', since: '2026-09-30T10:00:00Z' } : { active: false }) });
    if (u.pathname === '/admin/paid') return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ paid: { uidAuto123: { active: true, payerEmail: 'jean@paypal.test', payerName: 'Jean Client', amount: '19.99' } } }) });
    return r.fulfill({ status: 404, headers: cors, body: '{}' }); });
  await b.ev(() => { BILL.api = 'https://relais.test'; CloudApi.signIn = async () => ({ uid: 'uidAuto123', email: 'jean@test.fr', name: 'Jean Client', picture: '' }); render(); });
  await p.click('[data-act=subscribe]'); await p.waitForSelector('#buy-consent');
  assert.match(await text(p, '.sheet'), /Activation automatique/); assert.match(await text(p, '.sheet'), /dès que PayPal confirme/); assert.doesNotMatch(await text(p, '.sheet'), /n’est pas instantanée/);
  await p.check('#buy-consent'); await p.click('[data-act=buy-go]'); await p.waitForFunction(() => window.__go);
  const g = new URL(await b.ev(() => window.__go)); assert.equal(g.searchParams.get('notify_url'), 'https://relais.test/ipn');
  assert.match(g.searchParams.get('custom'), /^uidAuto123\|WOUF-[A-Z0-9]+$/); assert.equal(await b.ev(() => window.__orders[0].auto), true);
  // page de remerciement : attente, puis activation quand le relais confirme (sans recharger)
  await b.go('#/merci'); assert.match(await text(p, '#view'), /PayPal confirme votre paiement/); assert.equal(await b.ev(() => plus()), false);
  active = true; await p.waitForFunction(() => document.querySelector('#view').innerText.includes('Wouf Plus est actif'), null, { timeout: 15000 });
  assert.equal(await b.ev(() => subActive() && plus()), true); assert.ok(seen.some(([path, auth]) => path === '/status' && auth === 'Bearer tok123'), 'statut demandé avec le jeton Google');
  // remboursement côté relais : l’accès est retiré au prochain contrôle
  active = false; await b.ev(() => refreshSub(true)); assert.equal(await b.ev(() => plus()), false);
  // RÉGRESSION : « pas actif » vérifié récemment ne bloque plus la vérification suivante (paiement arrivé entre-temps, app rouverte sans repasser par la page Merci)
  assert.equal(await b.ev(() => S.sub && S.sub.active === false && Date.now() - S.sub.checked < 5000), true);
  active = true; await b.ev(() => refreshSub(false)); assert.equal(await b.ev(() => plus()), true, 'l’app rouverte voit le paiement sans attendre 6 h');
  // RÉGRESSION 2 : l'adresse du relais arrive APRÈS le démarrage (réglages de vente lus en ligne) → le statut est demandé quand même
  await b.ev(() => { window.__cfgSent = false; BILL.api = ''; S.sub = { active: false, checked: Date.now() }; save(); AdminApi.remoteConfig = async () => { await new Promise(r => setTimeout(r, 150)); window.__cfgSent = true; return { api: 'https://relais.test', payee: 'vendeur@test.fr', billingEnabled: true }; }; });
  active = true; await b.ev(async () => { const early = refreshSub(false); remoteRefresh(); await early; await remoteRefresh.p; });
  assert.deepEqual(await b.ev(() => [BILL.api, plus(), window.__cfgSent]), ['https://relais.test', true, true], 'statut demandé dès que le relais est connu');
  // bouton « J’ai déjà payé » et retour dans l’app
  active = false; await b.ev(() => refreshSub(true)); await b.go('#/abo'); await p.waitForSelector('[data-act=restore]');
  // pas de paiement pour CE compte : message précis avec le compte connecté ; relais en panne : message d'erreur (jamais « aucun paiement » à tort)
  await p.click('[data-act=restore]'); await p.waitForSelector('.sheet h2'); assert.match(await text(p, '.sheet'), /Aucun paiement trouvé.*jean@test\.fr.*autre compte Google/); await p.click('.sheet button[data-close]');
  await b.ctx.route('https://relais.test/status', r => r.fulfill({ status: 500, headers: cors, contentType: 'application/json', body: '{"error":"Erreur interne"}' }), { times: 1 });
  await p.click('[data-act=restore]'); await p.waitForSelector('.sheet h2'); assert.match(await text(p, '.sheet'), /Vérification impossible.*Erreur interne/); await p.click('.sheet button[data-close]');
  active = true; await p.click('[data-act=restore]'); await p.waitForFunction(() => subActive()); assert.match(await text(p, '#toast'), /Accès retrouvé/);
  // un accès accordé par l'administration est repris par le même bouton (sans passer par le relais)
  active = false; await b.ev(() => { S.sub = { active: false, checked: Date.now() }; S.grant = null; Object.assign(AdminApi, { myGrant: async () => ({ until: 'lifetime' }), touch: async () => {} }); });
  await b.ev(() => ACT.restore()); await p.waitForFunction(() => grantActive() && plus()); assert.match(await text(p, '#toast'), /Accès retrouvé/);
  await b.ev(() => { S.grant = null; });
  active = false; await b.ev(() => refreshSub(true)); assert.equal(await b.ev(() => plus()), false);
  active = true; await b.ev(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForFunction(() => subActive(), null, { timeout: 5000 });
  // sans compte identifiable ou sans relais : retour à la validation manuelle, texte honnête
  await b.ev(() => { BILL.api = ''; }); assert.equal(await b.ev(() => autoOn()), false);
  await b.ev(() => { BILL.api = 'https://relais.test'; CLOUD.user.uid = ''; }); assert.equal(await b.ev(() => autoOn()), false);
  await b.ev(() => { CLOUD.user.uid = 'uidAuto123'; BILL.payee = ''; BILL.paymentLink = 'https://www.paypal.com/ncp/payment/X'; }); assert.equal(await b.ev(() => autoOn()), false, 'lien fixe : pas de notification possible');
  // administration : le paiement détecté est classé « activé automatiquement » avec l’identité PayPal
  await b.ev(() => { OWNER = true; BILL.payee = 'vendeur@test.fr'; Object.assign(AdminApi, { listUsers: async () => [{ uid: 'uidAuto123', name: 'Jean', email: 'jean@test.fr', lastSeen: today() }], setGrant: async () => {},
    listOrders: async () => [{ id: 'o9', uid: 'uidAuto123', firstName: 'Jean', lastName: 'Client', paypalEmail: 'jean@paypal.test', googleEmail: 'jean@test.fr', contactEmail: 'jean@test.fr', offer: 'lifetime', price: '19,99 €', status: 'pending', at: Date.now() },
      { id: 'o10', uid: 'autre', firstName: 'Zoé', lastName: 'Lenta', paypalEmail: 'zoe@paypal.test', googleEmail: 'zoe@test.fr', contactEmail: 'zoe@test.fr', offer: 'lifetime', price: '19,99 €', status: 'pending', at: Date.now() - 500 }] }); });
  await b.go('#/admin'); await p.waitForSelector('#adm-orders .adm-o');
  assert.match(await text(p, '#adm-orders'), /Paiements à vérifier \(1\)/); assert.match(await text(p, '#adm-orders'), /Zoé Lenta/);
  assert.match(await text(p, '#adm-orders details'), /Activé automatiquement.*Jean Client.*jean@paypal\.test.*19\.99/);
  assert.match(await text(p, '.adm-list'), /acheté/);
  // paiement reçu par le relais sans dossier correspondant (client connecté avec un autre compte) : signalé au propriétaire
  await b.ev(() => { AdminApi.paidList = async () => ({ uidAuto123: { active: true, payerEmail: 'jean@paypal.test', payerName: 'Jean Client', amount: '19.99' }, autreUid999: { active: true, payerEmail: 'marie@paypal.test', payerName: 'Marie Autre', amount: '19.99', ref: 'WOUF-XYZ' }, uidRembourse1: { active: false, payerEmail: 'x@paypal.test', payerName: 'X', amount: '19.99' } }); ADM.users = null; });
  await b.go('#/home'); await b.go('#/admin'); await p.waitForSelector('#adm-orders summary');
  assert.match(await text(p, '#adm-orders'), /Paiements PayPal reçus sans dossier \(2\)/); assert.match(await text(p, '#adm-orders'), /Marie Autre.*marie@paypal\.test.*WOUF-XYZ.*Compte Google qui a payé.*…rbe999|Marie Autre.*Compte Google qui a payé/); assert.match(await text(p, '#adm-orders'), /Remboursé \/ annulé/);
  noErrors(b); await b.ctx.close();
});

test('contact : vrai envoi depuis l’app (aucune messagerie ouverte), repli e-mail si le relais est en panne, messages lus dans l’administration', async () => {
  const b = await boot({ hash: '#/support' }), p = b.page; await fakeCloud(p);
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }; const got = []; let mode = 'ok';
  await b.ctx.route('https://relais.test/**', async r => { const u = new URL(r.request().url()); if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: cors });
    if (u.pathname === '/support') { got.push({ auth: r.request().headers().authorization, body: JSON.parse(r.request().postData()) });
      return mode === 'ok' ? r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, priority: true }) })
        : mode === '429' ? r.fulfill({ status: 429, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'Trop de messages : réessayez dans une heure' }) })
        : r.fulfill({ status: 502, headers: cors, contentType: 'application/json', body: '{"error":"panne"}' }); }
    if (u.pathname === '/admin/support') return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ messages: [{ id: '1790000000000-abc12', at: '2026-09-30T10:00:00Z', category: 'Facturation / achat', message: 'Bonjour,\nje ne vois pas mon accès.', email: 'cliente@test.fr', diagnostics: 'Wouf 1.14', priority: false }] }) });
    if (u.pathname === '/admin/support/delete') { mode = 'deleted'; return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '{"ok":true}' }); }
    return r.fulfill({ status: 404, headers: cors, body: '{}' }); });
  await b.ev(() => { BILL.api = 'https://relais.test'; CLOUD.user = { uid: 'u1', email: 'q@test.fr', name: 'Q' }; window.__mail = null; NAV.mail = u => { window.__mail = u; }; SUP.email = 'wouf-contact@proton.me'; render(); });
  await p.waitForSelector('#sp-msg');
  await p.fill('#sp-msg', 'Bonjour, mon suivi ne démarre pas.'); await p.click('[data-act=support-send]'); await p.waitForTimeout(400);
  assert.equal(got.length, 1); assert.equal(got[0].body.email, 'q@test.fr'); assert.equal(got[0].body.category, 'Problème technique'); assert.equal(got[0].auth, 'Bearer tok123');
  assert.match(await text(p, '#toast'), /Message envoyé.*prioritaire/); assert.equal(await b.ev(() => window.__mail), null, 'aucune messagerie ouverte'); assert.equal(await p.inputValue('#sp-msg'), '', 'formulaire vidé');
  mode = '429'; await p.fill('#sp-msg', 'Bonjour, ceci est un second message.'); await p.click('[data-act=support-send]'); await p.waitForTimeout(400);
  assert.match(await text(p, '#toast'), /Trop de messages/); assert.equal(await b.ev(() => window.__mail), null, 'limite atteinte : pas de repli qui contournerait la limite');
  mode = '502'; await p.click('[data-act=support-send]'); await p.waitForTimeout(500);
  assert.match(decodeURIComponent(await b.ev(() => window.__mail)), /^mailto:wouf-contact@proton\.me\?subject=/, 'relais en panne : repli sur la messagerie'); 
  // administration : le message est lu, on peut répondre (lien mailto) et le supprimer
  mode = 'ok'; await b.ev(() => { OWNER = true; Object.assign(AdminApi, { listUsers: async () => [], listOrders: async () => [], paidList: async () => ({}) }); });
  await b.go('#/admin'); await p.waitForSelector('#adm-msgs .adm-m');
  assert.match(await text(p, '#adm-msgs'), /Messages \(1\).*Facturation \/ achat.*cliente@test\.fr.*je ne vois pas mon accès/);
  assert.equal(await b.ev(() => SUP.replyUrl), 'https://mail.proton.me/compose?mailto=%s');
  const rl = await p.getAttribute('#adm-msgs a.btn', 'href'); assert.match(rl, /^https:\/\/mail\.proton\.me\/compose\?mailto=mailto%3Acliente%40test\.fr%3Fsubject%3DRe%253A/, 'Répondre ouvre Proton Mail');
  assert.equal(new URL(rl).searchParams.get('mailto').startsWith('mailto:cliente@test.fr?subject=Re%3A'), true);
  assert.equal(await b.ev(() => { const sv = SUP.replyUrl; SUP.replyUrl = ''; const r = replyLink({ email: 'x@y.fr', category: 'Q' }); SUP.replyUrl = sv; return r.startsWith('mailto:x@y.fr'); }), true, 'sans modèle : messagerie du téléphone');
  await p.click('[data-act=adm-msg-del]'); await p.click('.sheet [data-ok]'); await p.waitForSelector('#adm-msgs .mut:has-text("Aucun message")'); assert.match(await text(p, '#adm-msgs'), /Messages \(0\)/);
  noErrors(b); await b.ctx.close();
});

test('administration : statistiques visibles dans le panneau, ou consigne claire si la clé manque', async () => {
  const b = await boot({ hash: '#/plus' }), p = b.page;
  await b.ev(() => { BILL.api = 'https://relais.test'; OWNER = true; CLOUD.user = { uid: 'u1', email: 'q@test.fr', name: 'Q' }; const d = []; for (let i = 0; i < 30; i++) d.push({ day: '2026-09-' + String(i + 1).padStart(2, '0'), visits: i }); window.__st = { days: 30, total: 435, totalEvents: 9, perDay: d,
    pages: [{ path: '/', count: 300 }], events: [{ path: 'animal-ajoute-chat', count: 4 }, { path: 'truc-inconnu', count: 1 }], refs: [{ name: 'tiktok.com', count: 120 }] };
    Object.assign(AdminApi, { listUsers: async () => [], listOrders: async () => [], paidList: async () => ({}), supportList: async () => { ADM.mailOn = true; return []; }, statsGet: async () => window.__st }); });
  await b.go('#/admin'); await p.waitForSelector('#adm-stats .adm-bars');
  const t = await text(p, '#adm-stats'); assert.match(t, /29.*Aujourd’hui.*182.*7 jours.*435.*30 jours/); assert.match(t, /tiktok\.com.*120/); assert.match(t, /🐱 Chats ajoutés.*4/); assert.match(t, /truc-inconnu/);
  assert.equal(await p.locator('#adm-stats .adm-bars > div').count(), 14); assert.match(await text(p, '#adm-msgs'), /Chaque message est aussi envoyé sur votre boîte mail/);
  await b.ev(() => { window.__off = true; AdminApi.statsGet = async () => ({ off: true }); admLoad(); }); await p.waitForSelector('#adm-stats:has-text("GOATCOUNTER_TOKEN")');
  await b.ev(() => { AdminApi.statsGet = async () => { throw new Error('GoatCounter refuse la clé'); }; admLoad(); }); await p.waitForSelector('#adm-stats .bad:has-text("refuse la clé")');
  noErrors(b); await b.ctx.close();
});

/* ================= exécution ================= */
(async () => {
  srv = await start(0); PORT = srv.address().port;
  const exe = process.env.PW_CHROMIUM || (require('fs').existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null);
  browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const only = process.argv[2];
  for (const [name, fn] of T) {
    if (only && !name.includes(only)) continue;
    const t0 = Date.now();
    try { await fn(); results.push([name, true]); console.log(`  ✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`); }
    catch (e) { results.push([name, false]); console.log(`  ✗ ${name}\n      ${String(e.message).split('\n').slice(0, 6).join('\n      ')}`); }
  }
  await browser.close(); srv.close();
  const bad = results.filter(r => !r[1]).length;
  console.log(bad ? `\n✗ ${bad} scénario(s) en échec sur ${results.length}` : `\n✓ ${results.length} scénarios de bout en bout réussis`);
  process.exit(bad ? 1 : 0);
})();
