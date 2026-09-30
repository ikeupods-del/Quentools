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
  const b = await boot({ query: '?preview=none', hash: '#/educ' }), p = b.page; let body = null;
  await b.ctx.route('https://api.wouf.test/**', async r => { const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: cors }); if (new URL(r.request().url()).pathname === '/checkout') body = JSON.parse(r.request().postData());
    return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ url: 'https://checkout.example/pay' }) }); });
  await b.ctx.route('https://checkout.example/**', r => r.fulfill({ contentType: 'text/html', body: '<h1>stripe</h1>' }));
  const pure = await b.ev(() => { const d = (ids, sp = 'dog') => ({ dogs: [{ id: 'a', species: sp }], edu: { a: Object.fromEntries(ids.map(i => [i, { done: true }])) } }), dogIds = freeIdsOf('dog'), catIds = freeIdsOf('cat');
    return { n: [dogIds.length, catIds.length], dogAll: rewardEligible(d(dogIds)), dogMissing: rewardEligible(d(dogIds.slice(1))), catAll: rewardEligible(d(catIds, 'cat')), both: rewardEligible({ dogs: [{ id: 'a', species: 'dog' }, { id: 'b', species: 'cat' }], edu: { a: Object.fromEntries(dogIds.map(i => [i, { done: true }])) } }), none: rewardEligible({ dogs: [] }) }; });
  assert.deepEqual(pure, { n: [6, 4], dogAll: true, dogMissing: false, catAll: true, both: false, none: false });
  await fakeCloud(p);
  await b.ev(() => { BILL.enabled = true; BILL.api = 'https://api.wouf.test'; BILL.freeUntil = null; Object.assign(LEGAL, { seller: 'V', form: 'EI', address: '1 rue', siret: '1', email: 'v@t.fr', mediator: 'M' });
    freeIdsOf('dog').slice(0, 5).forEach(id => { const q = eduSet('d1', id); q.done = true; }); save(); });
  await b.go('#/abo'); assert.match(await text(p, '#view'), /Une récompense vous attend/); assert.doesNotMatch(await text(p, '#view'), /Offre récompense débloquée/);
  // les 5 premières ne déclenchent rien ; la 6ᵉ via le quiz ouvre la récompense
  assert.equal(await b.ev(() => (rewardCheck(), document.querySelectorAll('.sheet-wrap').length)), 0);
  const last = await b.ev(() => freeIdsOf('dog')[5]);
  await b.go('#/lecon?id=' + last); await p.click('[data-act=lesson-done]'); for (let k = 0; k < 3; k++) { await b.ev(() => ACT['quiz-pick']({ k: QUIZ.qs[QUIZ.i].ok })); await p.click('[data-act=quiz-next]'); }
  await p.click('[data-act=quiz-finish]'); await p.click('.celebrate [data-cel]'); await p.waitForSelector('.reward');
  assert.match(await text(p, '.reward'), /19,99 €\s*9,99 €/); assert.ok(await b.ev(() => S.reward.shown));
  await p.click('[data-act=reward-buy]'); await p.waitForSelector('#buy-consent'); assert.match(await text(p, '.sheet'), /Offre récompense/); assert.match(await text(p, '.sheet [data-act=buy-go]'), /9,99 €/);
  await p.check('#buy-consent'); await Promise.all([p.waitForURL('https://checkout.example/**'), p.click('[data-act=buy-go]')]); assert.equal(body.offer, 'lecons');
  noErrors(b); await b.ctx.close();
  // une seule fois : pas de nouvelle popup ; et gratuit pour tous → message sans paiement
  const c = await boot({ hash: '#/educ' }); await c.ev(() => { freeIdsOf('dog').forEach(id => { eduSet('d1', id).done = true; }); rewardCheck(); });
  await c.page.waitForSelector('.sheet'); assert.match(await text(c.page, '.sheet'), /Bases acquises/); assert.match(await text(c.page, '.sheet'), /9,99 €/);
  assert.equal(await c.ev(() => { closeAllSheets(); rewardCheck(); return document.querySelectorAll('.sheet-wrap').length; }), 0, 'la popup ne revient pas'); noErrors(c); await c.ctx.close();
});

/* ================= 7. Achat à vie (relais simulé) ================= */
test('achat à vie : connexion Google requise, consentement, paiement, retour, activation, remboursement', async () => {
  const b = await boot({ query: '?preview=none', hash: '#/abo' }), p = b.page; let seen = {};
  await b.ctx.route('https://api.wouf.test/**', async r => {
    const u = new URL(r.request().url()), h = r.request().headers();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: cors });
    if (u.pathname === '/checkout') { seen.checkout = { auth: h.authorization, body: JSON.parse(r.request().postData()) }; return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ url: 'https://checkout.example/pay' }) }); }
    if (u.pathname === '/status') { seen.status = { auth: h.authorization, sid: u.searchParams.get('session_id') }; return r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(seen.answer || { active: false }) }); }
    return r.fulfill({ status: 404, headers: cors, body: '{}' });
  });
  await b.ctx.route('https://checkout.example/**', r => r.fulfill({ contentType: 'text/html', body: '<h1>stripe</h1>' }));
  await fakeCloud(p);
  await b.ev(() => { BILL.enabled = true; BILL.api = 'https://api.wouf.test'; BILL.freeUntil = null; Object.assign(LEGAL, { seller: 'Vendeur Test', form: 'EI', address: '1 rue Test', siret: '123', email: 'v@test.fr', mediator: 'Médiateur Test' }); render(); });
  await p.waitForSelector('[data-act=subscribe]'); assert.match(await text(p, '.plus-hero'), /19,99 €/); assert.equal(await b.ev(() => plus()), false);
  await b.ev(() => { LEGAL.mediator = ''; }); await p.click('[data-act=subscribe]'); assert.match(await text(p, '#toast'), /informations légales/); await b.ev(() => { LEGAL.mediator = 'Médiateur Test'; });
  await p.click('[data-act=subscribe]'); await p.waitForSelector('#buy-consent'); assert.equal(await b.ev(() => !!CLOUD.user), true, 'connexion Google déclenchée avant l’achat');
  assert.match(await text(p, '.sheet'), /19,99 €/); assert.match(await text(p, '.sheet'), /droit de rétractation/);
  await p.click('[data-act=buy-go]'); assert.match(await text(p, '#toast'), /Cochez la case/); assert.equal(seen.checkout, undefined, 'aucun appel sans consentement');
  await p.check('#buy-consent'); await Promise.all([p.waitForURL('https://checkout.example/**'), p.click('[data-act=buy-go]')]);
  assert.equal(seen.checkout.auth, 'Bearer tok123'); assert.match(seen.checkout.body.returnUrl, /\/wouf\/$/);
  // retour du paiement
  seen.answer = { active: true, lifetime: true, plan: 'lifetime', since: '2026-09-29T10:00:00Z' };
  await p.goto(BASE() + '?paid=1&session_id=cs_test_1#/abo'); await p.waitForSelector('#view > *'); await fakeCloud(p);
  await b.ev(() => { CloudApi.restore = async () => ({ email: 'q@test.fr', name: 'Quentin', picture: '' }); });
  await b.ev(() => { BILL.enabled = true; BILL.api = 'https://api.wouf.test'; return refreshSub(); }); await p.waitForTimeout(200);
  assert.equal(seen.status.sid, 'cs_test_1'); assert.equal(seen.status.auth, 'Bearer tok123'); assert.equal(await b.ev(() => subActive() && plus()), true);
  assert.equal(await b.ev(() => location.search), '', 'paramètres de retour nettoyés'); await b.ev(() => render());
  assert.match(await text(p, '.plus-hero'), /actif à vie/); assert.match(await text(p, '.plus-hero'), /prioritaire/);
  assert.equal(await b.ev(() => canAddPet('dog') && allowed('tracker')), true);
  // remboursement côté Stripe : le prochain contrôle révoque l'accès
  seen.answer = { active: false }; await b.ev(() => refreshSub(true)); assert.equal(await b.ev(() => plus()), false, 'achat remboursé = Plus retiré');
  assert.equal(await b.ev(() => dog().name), 'Nala', 'les données restent accessibles');
  noErrors(b); await b.ctx.close();
});
test('interrupteur : gratuit pour tous, offre de lancement, anciens utilisateurs', async () => {
  const b = await boot({ query: '?preview=none' });
  const r = await b.ev(() => { const o = { ...BILL }; const out = {}; BILL.enabled = false; out.off = plus();
    BILL.enabled = true; BILL.freeUntil = null; BILL.grandfatherBefore = null; out.on = plus();
    BILL.freeUntil = '2999-01-01'; out.launch = plus(); BILL.freeUntil = '2000-01-01'; out.launchOver = plus();
    BILL.grandfatherBefore = '2999-01-01'; BILL.grandfatherUntil = 'lifetime'; out.old = plus(); S.installedAt = '2999-06-01'; out.newUser = plus(); S.installedAt = '2026-01-01';
    S.sub = { active: true, lifetime: true }; BILL.grandfatherBefore = null; out.paid = plus(); Object.assign(BILL, o); return out; });
  assert.deepEqual(r, { off: true, on: false, launch: true, launchOver: false, old: true, newUser: false, paid: true });
  noErrors(b); await b.ctx.close();
});

/* ================= 8. Assistance et pages légales ================= */
test('assistance : prioritaire pour les acheteurs, repli mail sinon, FAQ', async () => {
  const b = await boot({ hash: '#/support' }), p = b.page; let sent;
  await p.waitForSelector('#sp-msg'); assert.ok((await p.locator('details').count()) >= 8);
  await b.ctx.route('https://api.wouf.test/**', async r => { const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: cors });
    sent = { auth: r.request().headers().authorization, body: JSON.parse(r.request().postData()) }; return r.fulfill({ status: sent.fail ? 501 : 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, priority: !!sent.auth }) }); });
  await fakeCloud(p); await b.ev(async () => { BILL.enabled = true; BILL.api = 'https://api.wouf.test'; CLOUD.user = { email: 'q@test.fr' }; S.sub = { active: true, lifetime: true }; render(); });
  await p.waitForSelector('#sp-msg'); assert.match(await text(p, '.plus-hero'), /prioritaire/);
  await p.fill('#sp-msg', 'Bonjour, mon suivi ne démarre pas.'); await p.click('[data-act=support-send]'); await p.waitForTimeout(300);
  assert.equal(sent.auth, 'Bearer tok123'); assert.equal(sent.body.category, 'Problème technique'); assert.match(sent.body.diagnostics, /Wouf 1\./); assert.match(sent.body.diagnostics, /Plus : oui \(achat\)/); assert.match(await text(p, '#toast'), /prioritaire/);
  await p.fill('#sp-msg', 'court'); await p.click('[data-act=support-send]'); assert.match(await text(p, '#toast'), /10 caractères/);
  // repli : relais non configuré → mail préparé
  await b.ctx.unroute('https://api.wouf.test/**'); await b.ctx.route('https://api.wouf.test/**', r => r.fulfill({ status: r.request().method() === 'OPTIONS' ? 200 : 501, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, contentType: 'application/json', body: '{"error":"non configuré"}' }));
  await b.ev(() => { window.__mail = null; NAV.mail = u => { window.__mail = u; }; SUP.email = 'support@test.fr'; });
  await p.fill('#sp-msg', 'Bonjour, ceci est un second message.'); await p.click('[data-act=support-send]'); await p.waitForTimeout(300);
  const mail = await b.ev(() => window.__mail); assert.match(mail, /^mailto:support@test\.fr\?subject=/); assert.match(decodeURIComponent(mail), /\[PRIORITAIRE\]/);
  noErrors(b); await b.ctx.close();
});
test('pages légales, nouveautés et alerte de mise à jour', async () => {
  const b = await boot({ hash: '#/legal?doc=cgv' }), p = b.page;
  await p.waitForSelector('.legal'); let t = await text(p, '.legal'); assert.match(t, /Conditions générales de vente/); assert.match(t, /19,99 €/); assert.match(t, /rétractation/); assert.match(t, /à vie/);
  await b.go('#/legal?doc=confidentialite'); assert.match(await text(p, '.legal'), /Sous-traitants/); await b.go('#/legal?doc=mentions'); assert.match(await text(p, '.legal'), /GitHub Pages/);
  await b.go('#/nouveautes'); assert.match(await text(p, '#view'), /Version 1\.2\.0/);
  await b.ev(() => showUpdateBanner()); assert.equal(await p.locator('#upd').isVisible(), true);
  noErrors(b); await b.ctx.close();
  const u = await boot({ data: seed({ settings: { ...seed().settings, seenVersion: '1.0.0' } }) }); await u.page.waitForTimeout(400); assert.equal(await u.ev(() => S.settings.seenVersion), await u.ev(() => CFG.version)); await u.ctx.close();
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
  await b.ev(() => { BILL.enabled = true; BILL.api = 'https://api.wouf.test'; render(); });
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
  await b.ev(() => { OWNER = true; }); await fakeCloud(p);
  await b.ev(() => {
    CloudApi.signIn = async () => ({ email: 'patron@test.fr', name: 'Patron', picture: '' });
    window.__adm = { grants: {}, cfg: null };
    Object.assign(AdminApi, {
      listUsers: async () => [{ uid: 'u1', name: 'Alice', email: 'alice@test.fr', lastSeen: today(), firstSeen: today(), dogs: 1, cats: 0, lessons: 4, grant: window.__adm.grants.u1 || null },
        { uid: 'u2', name: 'Bob', email: 'bob@test.fr', lastSeen: '2026-01-01', firstSeen: '2025-12-01', dogs: 0, cats: 2, lessons: 0, grant: null }],
      setGrant: async (uid, g) => { window.__adm.grants[uid] = g; }, setConfig: async c => { window.__adm.cfg = c; },
      myGrant: async () => window.__adm.mine || null, touch: async pr => { window.__adm.profile = pr; } });
    render();
  });
  assert.match(await text(p, '#view'), /Connectez-vous avec le compte Google/);
  await p.click('[data-act=g-signin]'); await p.waitForSelector('.adm-u');
  assert.equal(await p.$$eval('.adm-u', l => l.length), 2); assert.match(await text(p, '.adm-tiles'), /2 comptes Google/);
  // recherche
  await p.fill('#adm-q', 'bob'); assert.deepEqual(await p.$$eval('.adm-u', l => l.map(e => e.hidden)), [true, false]); await p.fill('#adm-q', '');
  // Plus offert à vie puis retrait
  await p.click('[data-act=adm-grant][data-uid=u1][data-until=lifetime]'); await p.click('.sheet [data-ok]');
  await p.waitForFunction(() => window.__adm.grants.u1 && window.__adm.grants.u1.until === 'lifetime');
  assert.match(await text(p, '.adm-u'), /Plus offert à vie/);
  await p.click('[data-act=adm-revoke][data-uid=u1]'); await p.click('.sheet [data-ok]');
  await p.waitForFunction(() => window.__adm.grants.u1 === null);
  // vente : bloquée tant que rien n'est prêt
  assert.equal(await p.$eval('[data-act=adm-sale]', e => e.disabled), true); assert.match(await text(p, '#view'), /Lien de paiement PayPal à renseigner/);
  await p.fill('#adm-pay [name=paymentLink]', 'pas-un-lien'); await p.click('[data-act=adm-save-pay]'); assert.equal(await b.ev(() => window.__adm.cfg), null, 'lien invalide refusé');
  for (const [k, v] of Object.entries({ paymentLink: 'https://buy.stripe.com/test_abc', seller: 'Q', form: 'EI', siret: '123', address: 'Paris', email: 'q@q.fr', mediator: 'Médiateur', supportEmail: 'aide@q.fr' })) await p.fill(`#adm-pay [name=${k}]`, v);
  await p.click('[data-act=adm-save-pay]'); await p.waitForFunction(() => window.__adm.cfg && window.__adm.cfg.paymentLink);
  assert.deepEqual(await b.ev(() => [BILL.paymentLink, LEGAL.siret, SUP.email, JSON.parse(localStorage.getItem('wouf:remote')).seller]), ['https://buy.stripe.com/test_abc', '123', 'aide@q.fr', 'Q']);
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

test('vente par lien de paiement Stripe : e-mail pré-rempli, page merci, activation par l’administration', async () => {
  const b = await boot({ hash: '#/abo' }), p = b.page; await fakeCloud(p);
  await b.ctx.route(/buy\.stripe\.com/, r => r.fulfill({ contentType: 'text/html', body: '<h1>Stripe</h1>' }));
  await b.ev(() => { CloudApi.signIn = async () => ({ email: 'client@test.fr', name: 'Client', picture: '' });
    Object.assign(BILL, { enabled: true, freeUntil: null, paymentLink: 'https://buy.stripe.com/test_abc', api: '' });
    Object.assign(LEGAL, { seller: 'Q', form: 'EI', siret: '123', address: 'Paris', email: 'q@q.fr', mediator: 'Médiateur' }); render(); });
  await p.click('[data-act=subscribe]'); await p.waitForSelector('#buy-consent');
  assert.match(await text(p, '.sheet'), /Paiement sécurisé par Stripe.*activé sur votre compte \(client@test\.fr\) sous 24 h/);
  await p.check('#buy-consent');
  await Promise.all([p.waitForURL(/buy\.stripe\.com/), p.click('[data-act=buy-go]')]);
  const u = new URL(p.url()); assert.equal(u.pathname, '/test_abc'); assert.equal(u.searchParams.get('prefilled_email'), 'client@test.fr');
  await p.goto(`http://localhost:${PORT}/wouf/#/merci`); await p.waitForSelector('#view > *');
  assert.match(await text(p, '#view'), /sous 24 h.*client@test\.fr/);
  noErrors(b); await b.ctx.close();
  // PayPal : lien tel quel (pas de paramètre ajouté), « PayPal » affiché dans l'achat et les conditions de vente
  const c = await boot({ hash: '#/abo' }), q = c.page; await fakeCloud(q);
  await c.ctx.route(/paypal\.com/, r => r.fulfill({ contentType: 'text/html', body: '<h1>PayPal</h1>' }));
  await c.ev(() => { CloudApi.signIn = async () => ({ email: 'client@test.fr', name: 'Client', picture: '' });
    Object.assign(BILL, { enabled: true, freeUntil: null, paymentLink: 'https://www.paypal.com/ncp/payment/ABC123', api: '' });
    Object.assign(LEGAL, { seller: 'Q', form: 'EI', siret: '123', address: 'Paris', email: 'q@q.fr', mediator: 'Médiateur' }); render(); });
  assert.equal(await c.ev(() => PAY_LINK.test(BILL.paymentLink)), true);
  await q.click('[data-act=subscribe]'); await q.waitForSelector('#buy-consent'); assert.match(await text(q, '.sheet'), /Paiement sécurisé par PayPal/);
  await q.check('#buy-consent'); await Promise.all([q.waitForURL(/paypal\.com/), q.click('[data-act=buy-go]')]);
  assert.equal(q.url(), 'https://www.paypal.com/ncp/payment/ABC123');
  await q.goto(`http://localhost:${PORT}/wouf/#/legal?doc=cgv`); await q.waitForSelector('#view > *'); await q.evaluate(() => { BILL.paymentLink = 'https://www.paypal.com/ncp/payment/ABC123'; render(); });
  assert.match(await text(q, '#view'), /plateforme sécurisée PayPal/);
  noErrors(c); await c.ctx.close();
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
