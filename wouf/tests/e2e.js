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
  assert.ok(n.dogPlus >= 20, 'au moins 20 leçons Plus pour le chien'); assert.equal(n.dogFree, 3); assert.ok(n.catAll >= 6);
  assert.equal(await p.locator('a.lesson').count(), n.dogPlus + n.dogFree);
  await b.ev(() => { S.current = 'c1'; save(); render(); }); assert.equal(await p.locator('a.lesson').count(), n.catAll, 'la liste suit l’espèce du chat');
  await b.ev(() => { S.current = 'd1'; save(); render(); });
  await b.go('#/lecon?id=marqueur'); await p.waitForSelector('.step'); await p.click('.step input[data-i="0"]'); assert.equal(await b.ev(() => eduGet('d1', 'marqueur').steps[0]), 1);
  await p.click('a[href="#/seance?id=marqueur"]'); await p.waitForSelector('.marker'); assert.equal(await b.ev(() => SEANCE.step), 1, 'la séance reprend à la 1ʳᵉ étape non validée');
  for (let i = 0; i < 9; i++) await p.click('[data-act=s-ok]'); await p.click('[data-act=s-ko]'); await p.waitForTimeout(1100); assert.notEqual(await text(p, '#tmr'), '0:00');
  await p.click('[data-act=s-end]'); await p.waitForSelector('.step');
  assert.deepEqual(await b.ev(() => { const e = eduGet('d1', 'marqueur'); return [e.sessions.length, e.sessions[0].ok, e.sessions[0].n, e.steps[1]]; }), [1, 9, 10, 1]);
  await p.click('[data-act=lesson-done]'); await b.go('#/educ'); await p.waitForSelector('.badges'); assert.ok((await p.locator('.badge.on').count()) >= 2);
  await b.go('#/programme?id=balade6'); assert.match(await text(p, 'h1'), /balade parfaite/); await p.click('[data-act=prog-start]'); assert.ok(await b.ev(() => S.edu.d1._progs.balade6.start));
  noErrors(b); await b.ctx.close();
});
test('éducation : leçons Plus verrouillées pour un utilisateur gratuit', async () => {
  const b = await boot({ query: '?preview=free', hash: '#/educ' }), p = b.page;
  await p.waitForSelector('.edu-hero'); assert.ok((await p.locator('a.lesson .pill.plus').count()) >= 20);
  await b.go('#/lecon?id=rappel'); await p.waitForSelector('[data-act=paywall]'); assert.doesNotMatch(await text(p, '#view'), /Erreurs fréquentes/, 'le contenu payant n’est pas affiché');
  await b.go('#/seance?id=rappel'); assert.match(await text(p, '#view'), /indisponible/);
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
  await p.waitForSelector('[data-act=checkout]'); assert.match(await text(p, '.plus-hero'), /19,99 €/); assert.equal(await b.ev(() => plus()), false);
  await b.ev(() => { LEGAL.mediator = ''; }); await p.click('[data-act=checkout]'); assert.match(await text(p, '#toast'), /informations légales/); await b.ev(() => { LEGAL.mediator = 'Médiateur Test'; });
  await p.click('[data-act=checkout]'); await p.waitForSelector('#buy-consent'); assert.equal(await b.ev(() => !!CLOUD.user), true, 'connexion Google déclenchée avant l’achat');
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
test('SOS vétérinaires, assurance, sauvegarde chiffrée, agenda, fiche véto', async () => {
  const b = await boot({ geo: true, data: seed({ weights: [{ id: 'w1', dogId: 'd1', date: day(-5), kg: 30 }], events: [{ id: 'e1', dogId: 'd1', type: 'vaccine', title: 'Rage', date: day(-300), next: day(65), cost: 60 }] }), hash: '#/sos' }), p = b.page;
  await p.click('[data-act=locate]'); await p.waitForSelector('.vet'); assert.equal(await p.locator('.vet').count(), 3);
  await p.click('[data-f="24"]'); assert.equal(await p.locator('.vet').count(), 1); await p.click('[data-f=all]');
  await p.fill('#tox-q', 'raisin'); assert.equal(await p.locator('.tox').count(), 1);
  await b.go('#/assurance'); await p.waitForSelector('.ins'); assert.equal(await p.locator('.ins').count(), 5); assert.match(await text(p, 'h1'), /Assurance chien/);
  await p.click('[data-act=add-quote]'); await p.fill('#f_insurer', 'Testo'); await p.fill('#f_monthly', '30'); await p.fill('#f_taux', '80'); await p.fill('#f_plafond', '2500'); await p.click('form [type=submit]'); await p.waitForSelector('.row .side b');
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
    for (const r of routes) { await b.go('#/' + r + (r === 'lecon' || r === 'seance' ? '?id=assis' : r === 'programme' ? '?id=chiot8' : r === 'balade-detail' ? '?id=none' : '')); const html = await b.ev(() => document.querySelector('#view').innerHTML); assert.ok(html.length > 30, `page ${r} vide pour ${cur}`); } }
  assert.ok(routes.length >= 25, 'routes : ' + routes.length); noErrors(b); await b.ctx.close();
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
