#!/usr/bin/env node
/* Contrôle du Pack Commerçant (demo/pack-commercant/, mode démonstration) dans un vrai navigateur :
   règles (créneaux, acompte, liens de paiement et de messages), réservation complète, double réservation refusée,
   administration (acompte reçu, annulation qui libère le créneau, client venu, demande d'avis), carte de fidélité
   (création, tampon par le lien du QR code, récompense), affiche, pas de défilement horizontal ni d'erreur JavaScript.
   Usage : node tools/verifier-pack-commercant.js   (PW=chemin de playwright si besoin) */
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const racine = path.join(__dirname, '..');
const PW = [process.env.PW, '/opt/node-tools/node_modules/playwright', '/opt/node22/lib/node_modules/playwright', path.join(racine, 'wouf/node_modules/playwright')].find(p => p && fs.existsSync(p));
const { chromium } = require(PW);
const erreurs = [], ok = (c, m) => { if (!c) erreurs.push(m); };

/* ---------- 1. Règles (sans navigateur) ---------- */
const ctx = { window: {}, crypto: require('crypto').webcrypto, URLSearchParams, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(ctx);
for (const f of ['config.js', 'store.js']) vm.runInContext(fs.readFileSync(path.join(racine, 'demo/pack-commercant', f), 'utf8'), ctx);
const S = ctx.window.PACKS, R = S.regles, P = ctx.window.PACK;
ok(!S.reel, 'la démonstration doit fonctionner sans Firebase');
ok(R.acompte(35) === 10 && R.acompte(5) === 5, 'acompte fixe plafonné au prix');
P.acompte = { type: 'pourcent', valeur: 30, lien: 'https://paypal.me/Commerce' };
ok(R.acompte(55) === 16.5, 'acompte en pourcentage');
ok(R.lienPaiement(16.5) === 'https://paypal.me/Commerce/16.5EUR', 'lien paypal.me avec montant : ' + R.lienPaiement(16.5));
P.acompte.lien = 'https://buy.stripe.com/test_123'; ok(R.lienPaiement(10) === 'https://buy.stripe.com/test_123', 'lien Stripe gardé tel quel');
P.acompte.lien = 'javascript:alert(1)'; ok(R.lienPaiement(10) === '', 'lien non https refusé');
P.acompte = { type: 'fixe', valeur: 10, lien: '' };
// Mardi 6 octobre 2026 : plages 09:30-12:30 et 14:00-19:00, pas de 30 min
const lundi = new Date('2026-10-05T08:00:00'), mardi = '2026-10-06';
const c60 = R.creneauxDuJour(mardi, 60, [], lundi);
ok(c60[0] === '09:30' && c60.includes('11:30') && !c60.includes('12:00') && c60.includes('14:00') && c60[c60.length - 1] === '18:00', 'créneaux de 60 min : ' + c60.join(' '));
const pris = R.casesDe('10:00', 90).map(h => ({ date: mardi, heure: h }));
const c30 = R.creneauxDuJour(mardi, 30, pris, lundi);
ok(!c30.includes('10:00') && !c30.includes('11:00') && c30.includes('09:30') && c30.includes('11:30'), 'un rendez-vous de 90 min bloque 3 cases');
ok(!R.creneauxDuJour(mardi, 60, pris, lundi).includes('09:30'), '09:30 + 60 min chevauche 10:00');
ok(R.creneauxDuJour('2026-10-05', 30, [], lundi).length === 0, 'lundi fermé');
ok(R.creneauxDuJour(mardi, 30, [], new Date('2026-10-06T13:00:00'))[0] === '15:00', 'délai minimum de 2 h respecté');
ok(R.joursOuverts(lundi).length === 15 && !R.joursOuverts(lundi).includes('2026-10-05'), 'jours ouverts sur 21 jours : ' + R.joursOuverts(lundi).length);
const r0 = { nom: 'Léa', prestation: 'Soin', date: mardi, heure: '14:30', acompte: 10, tel: '06 12 34 56 78' };
ok(S.whatsapp(r0.tel, 'a b').startsWith('https://wa.me/33612345678?text=a%20b'), 'lien WhatsApp au format international');
ok(S.sms('06 12 34 56 78', 'x') === 'sms:0612345678?&body=x', 'lien SMS');
ok(S.messages.rappel(r0).includes('mardi 6 octobre à 14h30'), 'message de rappel : ' + S.messages.rappel(r0));
ok(S.messages.avis(r0).includes(P.avis.lien), 'message d’avis avec le lien');
const regles = require(path.join(racine, 'demo/pack-commercant/regles-firestore.js'))(['Pro@Exemple.fr']);
ok(regles.includes("'pro@exemple.fr'") && regles.includes('existsAfter') && !regles.includes('allow read, write: if true'), 'règles Firestore');

/* ---------- 2. Parcours dans le navigateur ---------- */
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const serveur = http.createServer((q, s) => {
  let f = path.join(racine, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(racine) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
});
(async () => {
  await new Promise(r => serveur.listen(0, r));
  const base = `http://localhost:${serveur.address().port}/demo/pack-commercant/`;
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const page = await b.newContext({ viewport: { width: 390, height: 844 } }).then(c => c.newPage());
  page.on('pageerror', e => erreurs.push('erreur JavaScript : ' + e.message));
  page.on('dialog', d => d.accept());
  const largeur = async nom => ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), nom + ' : défilement horizontal');

  async function reserver(prest, nom) {
    await page.goto(base); await page.check(`input[name=p][value=${prest}]`);
    await page.locator('#jours button').first().click(); await page.locator('#heures button').first().click();
    const jour = await page.locator('#jours button[aria-pressed=true]').getAttribute('data-j'), heure = await page.locator('#heures button[aria-pressed=true]').getAttribute('data-h');
    if (nom === 'Camille Martin') await page.screenshot({ path: path.join(process.env.CAPTURES || require('os').tmpdir(), 'pack-resa.png'), fullPage: true });
    await page.fill('#nom', nom); await page.fill('#tel', '06 12 34 56 78'); await page.check('#ok'); await page.click('#go');
    return { jour, heure };
  }
  await page.goto(base); await largeur('accueil');
  ok(!(await page.isVisible('#e-jour')) && !(await page.isVisible('#e-coord')), 'étapes suivantes masquées avant le choix de la prestation');
  ok(await page.locator('.demo-bandeau').count() === 1, 'bandeau « exemple fictif »');
  ok((await page.title()).includes('Atelier Lila'), 'titre avec le nom du commerce');
  const r1 = await reserver('gel', 'Camille Martin');
  await page.waitForSelector('#fin:not([hidden])');
  ok((await page.textContent('#fin')).includes('Merci Camille'), 'confirmation affichée');
  await page.click('#payer'); ok((await page.textContent('#fin')).includes('page de paiement'), 'bouton d’acompte (démonstration)');
  await largeur('confirmation');
  // Le même créneau ne doit plus être proposé (90 min = 3 cases)
  await page.goto(base); await page.check('input[name=p][value=soin]');
  await page.locator(`#jours button[data-j="${r1.jour}"]`).click().catch(() => {});
  const restantes = await page.locator('#heures button').evaluateAll(bs => bs.map(x => x.dataset.h));
  ok(!restantes.includes(r1.heure), 'créneau réservé retiré de la liste');
  // Double réservation : écriture directe sur un créneau pris
  const double = await page.evaluate(async ([j, h]) => { try { await PACKS.reserver({ id: 'X1', date: j, heure: h, duree: 30 }); return 'accepté'; } catch (e) { return e.message; } }, [r1.jour, r1.heure]);
  ok(double === 'pris', 'double réservation refusée : ' + double);
  const r2 = await reserver('soin', 'Inès Bernard'); await page.waitForSelector('#fin:not([hidden])');

  // Administration
  await page.goto(base + 'admin/'); await page.click('#entrer'); await page.waitForSelector('#app:not([hidden])'); await largeur('administration');
  const t = await page.textContent('#t-rdv');
  ok(t.includes('Camille Martin') && t.includes('Inès Bernard') && t.includes('Acompte attendu'), 'rendez-vous visibles dans l’administration');
  await page.locator('.pk-rdv', { hasText: 'Camille Martin' }).locator('[data-a=acompte]').click();
  const carteCamille = page.locator('.pk-rdv', { hasText: 'Camille Martin' });
  ok((await carteCamille.textContent()).includes('Confirmé'), 'acompte reçu → confirmé');
  const wa = await carteCamille.locator('a[href^="https://wa.me/"]').first().getAttribute('href');
  ok(wa.includes('33612345678') && decodeURIComponent(wa).includes('acompte de 10 €'), 'message WhatsApp « acompte reçu »');
  await page.locator('.pk-rdv', { hasText: 'Inès Bernard' }).locator('[data-a=annuler]').click();
  ok((await page.locator('.pk-rdv', { hasText: 'Inès Bernard' }).textContent()).includes('Annulé'), 'annulation');
  await page.goto(base); await page.check('input[name=p][value=soin]'); await page.locator(`#jours button[data-j="${r2.jour}"]`).click();
  ok((await page.locator('#heures button').evaluateAll(bs => bs.map(x => x.dataset.h))).includes(r2.heure), 'créneau libéré après annulation');
  // Rendez-vous du jour passé : client venu puis demande d'avis
  await page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('pack:')), d = JSON.parse(localStorage[k]); const r = Object.values(d.rdv).find(x => x.nom === 'Camille Martin'); r.date = new Date().toISOString().slice(0, 10); localStorage[k] = JSON.stringify(d); });
  await page.goto(base + 'admin/'); await page.click('#entrer'); await page.waitForSelector('#app:not([hidden])');
  await page.locator('.pk-rdv', { hasText: 'Camille Martin' }).locator('[data-a=fait]').click();
  const avis = await page.locator('.pk-rdv', { hasText: 'Camille Martin' }).locator('a[href^="https://wa.me/"]').first().getAttribute('href');
  ok(decodeURIComponent(avis).includes('votre avis'), 'demande d’avis après la visite');

  // Carte de fidélité
  await page.goto(base + 'carte/'); await page.fill('#prenom', 'Camille'); await page.click('#f button'); await page.waitForSelector('.pk-carte'); await largeur('carte');
  await page.screenshot({ path: path.join(process.env.CAPTURES || require('os').tmpdir(), 'pack-carte.png'), fullPage: true });
  ok(await page.locator('.pk-carte span').count() === 8 && await page.locator('.pk-carte span.on').count() === 0, 'carte vierge de 8 cases');
  const id = await page.evaluate(() => localStorage.getItem('pack-carte:' + PACK.nom));
  ok(await page.locator('.pk-qr svg path').count() === 1, 'QR code de la carte');
  for (let i = 0; i < 8; i++) {
    await page.goto(base + 'admin/?tampon=' + id); await page.click('#entrer'); await page.waitForSelector('#carte-scan');
    await page.click('[data-f=tampon]'); await page.waitForSelector('#carte-scan .notice');
  }
  ok((await page.textContent('#carte-scan')).includes('Carte complète'), 'carte complète après 8 tampons');
  await page.screenshot({ path: path.join(process.env.CAPTURES || require('os').tmpdir(), 'pack-admin.png'), fullPage: true });
  await page.click('[data-f=recompense]'); await page.waitForSelector('#carte-scan .notice');
  await page.goto(base + 'carte/'); await page.waitForSelector('.pk-carte');
  ok(await page.locator('.pk-carte span.on').count() === 0 && (await page.textContent('#vue')).includes('1 récompense'), 'récompense enregistrée, carte remise à zéro');
  await page.goto(base + 'admin/?tampon=' + id); await page.click('#entrer'); await page.waitForSelector('#carte-scan'); await page.click('[data-f=tampon]'); await page.waitForSelector('#carte-scan .notice');
  await page.goto(base + 'carte/'); await page.click('#maj'); ok(await page.locator('.pk-carte span.on').count() === 1, 'tampon visible sur la carte du client');

  // Affiche d'avis
  await page.goto(base + 'affiche/'); ok(await page.locator('#qr svg').count() === 1, 'affiche avec QR code'); await largeur('affiche');
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto(base); await largeur('accueil (ordinateur)');
  await page.screenshot({ path: path.join(process.env.CAPTURES || require('os').tmpdir(), 'pack-accueil.png'), fullPage: true });

  // Site d'un client généré par tools/pack-commercant.js : chemins réécrits, sans bandeau, réservation possible
  const { execFileSync } = require('child_process'), tmp = path.join(require('os').tmpdir(), 'fiche-pack-essai.json');
  const fiche = JSON.parse(execFileSync('node', [path.join(__dirname, 'pack-commercant.js'), '--exemple'], { encoding: 'utf8' }));
  Object.assign(fiche, { dossier: 'essai-pack-controle', acompte: { type: 'fixe', valeur: 10, lien: 'https://paypal.me/EssaiPack' }, avis: { lien: 'https://g.page/r/ESSAI/review' } });
  fs.writeFileSync(tmp, JSON.stringify(fiche)); execFileSync('node', [path.join(__dirname, 'pack-commercant.js'), tmp]);
  const genere = `http://localhost:${serveur.address().port}/clients/essai-pack-controle/site/`;
  const echecs = []; page.on('requestfailed', q => echecs.push(q.url())); page.on('response', q => { if (q.status() >= 400) echecs.push(q.url()); });
  for (const p of ['', 'carte/', 'admin/', 'affiche/']) await page.goto(genere + p);
  ok(!echecs.length, 'site généré : fichiers introuvables ' + echecs.join(', '));
  await page.goto(genere); ok(await page.locator('.demo-bandeau').count() === 0, 'site généré sans bandeau de démonstration');
  await page.check('input[name=p][value=semi]'); await page.locator('#jours button').first().click(); await page.locator('#heures button').first().click();
  await page.fill('#nom', 'Essai'); await page.fill('#tel', '0612345678'); await page.check('#ok'); await page.click('#go'); await page.waitForSelector('#fin:not([hidden])');
  ok((await page.getAttribute('#payer', 'href')) === 'https://paypal.me/EssaiPack/10EUR', 'site généré : lien d’acompte réel');
  fs.rmSync(path.join(racine, 'clients', 'essai-pack-controle'), { recursive: true, force: true }); fs.unlinkSync(tmp);

  await b.close(); serveur.close();
  if (erreurs.length) { console.error('✗ Pack Commerçant :\n - ' + erreurs.join('\n - ')); process.exit(1); }
  console.log('✓ Pack Commerçant : règles, réservation, acompte, administration, fidélité et affiche contrôlés.');
})().catch(e => { console.error(e); process.exit(1); });
