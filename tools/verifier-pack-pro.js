#!/usr/bin/env node
/* Contrôle du Pack Commerçant en abonnement (pro/) avec l'émulateur Firestore (vraies règles de sécurité, copiées de l'administration) :
   1. règles : un commerce ne lit ni ne modifie les données d'un autre, adresse unique, essai de 14 jours puis réservation coupée,
      abonnement écrit seulement par QuenTools, double réservation impossible ;
   2. parcours dans un navigateur : inscription, page de réservation, réservation, espace commerçant, réglages modifiés, essai terminé,
      page introuvable, fiche piégée (aucun script ni lien étranger affiché), pas de défilement horizontal ; onglet Abonnés de l'administration ;
   3. pages pro/ à jour par rapport à demo/pack-commercant/ (tools/pack-pro.js).
   Émulateur : cloud-firestore-emulator-*.jar (npx firebase-tools setup:emulators:firestore, ou QT_EMULATEUR=chemin du .jar) et Java.
   Sans émulateur, le contrôle est sauté (refusé si QT_EXIGER_EMULATEUR=1, comme avant chaque publication).
   Usage : node tools/verifier-pack-pro.js   (PW=chemin de playwright si besoin) */
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), { spawn, execFileSync } = require('child_process');
const racine = path.join(__dirname, '..');
const erreurs = [], ok = (c, m) => { if (!c) erreurs.push(m); };
const fin = code => { if (erreurs.length) { console.error('✗ Pack Commerçant en abonnement :\n - ' + erreurs.join('\n - ')); process.exit(1); } if (code === 0) console.log('✓ Pack Commerçant en abonnement : règles, inscription, réservation, réglages, essai et sécurité des pages contrôlés.'); process.exit(code || 0); };

// 3. Pages générées à jour
try { execFileSync(process.execPath, [path.join(racine, 'tools/pack-pro.js'), '--verifier'], { stdio: 'pipe' }); } catch (e) { erreurs.push('pages pro/ pas à jour : node tools/pack-pro.js'); }

const dossierJar = path.join(os.homedir(), '.cache/firebase/emulators');
const jar = process.env.QT_EMULATEUR || (fs.existsSync(dossierJar) && fs.readdirSync(dossierJar).filter(f => /^cloud-firestore-emulator-.*\.jar$/.test(f)).sort().map(f => path.join(dossierJar, f)).pop());
if (!jar || !fs.existsSync(jar)) {
  if (process.env.QT_EXIGER_EMULATEUR) { erreurs.push('émulateur Firestore introuvable (npx firebase-tools setup:emulators:firestore)'); fin(1); }
  console.log('! Pack Commerçant en abonnement : émulateur Firestore absent, contrôle des règles et du parcours sauté (npx firebase-tools setup:emulators:firestore).');
  if (erreurs.length) fin(1); process.exit(0);
}

const QT = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(racine, 'assets/qt-config.js'), 'utf8'))(w); return w.QT; })();
const PROJET = QT.firebase.projectId, PATRON = 'patron@quentools.test';
// Règles de l'administration (même texte que celui à coller dans Firebase)
const adminHtml = fs.readFileSync(path.join(racine, 'admin/index.html'), 'utf8');
const corps = adminHtml.slice(adminHtml.indexOf('function rulesText() {'), adminHtml.indexOf('\nfunction viewRules() {'));
const REGLES = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n${new Function('user', corps + '\nreturn rulesText();')({ email: PATRON })}\n  }\n}\n`;

const PORT = 18000 + Math.floor(Math.random() * 2000), EMU = `http://127.0.0.1:${PORT}`, DOCS = `${EMU}/v1/projects/${PROJET}/databases/(default)/documents`;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jeton = (uid, email) => b64({ alg: 'none', kid: 'essai', typ: 'JWT' }) + '.' + b64({ iss: 'https://securetoken.google.com/' + PROJET, aud: PROJET, sub: uid, user_id: uid, email, email_verified: true,
  iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, auth_time: Math.floor(Date.now() / 1000), firebase: { sign_in_provider: 'google.com', identities: {} } }) + '.';
const A = jeton('u-lila', 'lila@exemple.test'), B = jeton('u-autre', 'autre@exemple.test'), PAT = jeton('u-patron', PATRON);
async function req(meth, chemin, corps, tok) {
  const h = { 'Content-Type': 'application/json' }; if (tok) h.Authorization = 'Bearer ' + tok;
  const r = await fetch((chemin.startsWith('http') ? '' : DOCS) + chemin, { method: meth, headers: h, body: corps ? JSON.stringify(corps) : undefined });
  let j = null; try { j = await r.json(); } catch (e) { /* vide */ }
  return { s: r.status, j };
}
const val = v => typeof v === 'boolean' ? { booleanValue: v } : Number.isInteger(v) ? { integerValue: String(v) } : typeof v === 'number' ? { doubleValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(val) } } : v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'object' ? { mapValue: { fields: enc(v) } } : { stringValue: String(v) };
const enc = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)]));
const FICHE = { nom: 'Atelier Essai', metier: 'onglerie', ville: 'Nantes', accroche: 'Bienvenue', couleur: '#b4436c', telephone: '06 00 00 00 00', email: 'contact@exemple.test', adresse: '',
  horaires: { 1: ['09:00-18:00'], 2: ['09:00-18:00'], 3: ['09:00-18:00'], 4: ['09:00-18:00'], 5: ['09:00-18:00'], 6: ['09:00-18:00'], 7: ['09:00-18:00'] }, pas: 30, delaiMin: 0, jours: 21,
  prestations: [{ id: 'pose', nom: 'Pose', duree: 60, prix: 35 }], acompte: { type: 'fixe', valeur: 10, lien: '' }, annulation: 'Annulation 24 h avant.', fidelite: { tampons: 4, recompense: 'un soin offert' }, avis: { lien: '' } };
const creerFiche = (adresse, fiche, uid, tok, cree) => req('POST', ':commit', { writes: [{ update: { name: `projects/${PROJET}/databases/(default)/documents/qt_pack/${adresse}`, fields: enc({ ...fiche, uid, ...(cree ? { cree } : {}) }) },
  ...(cree ? {} : { updateTransforms: [{ fieldPath: 'cree', setToServerValue: 'REQUEST_TIME' }] }), currentDocument: { exists: false } }] }, tok);
const demain = () => { const d = new Date(Date.now() + 864e5); return d.toISOString().slice(0, 10); };
const reserver = (adresse, rid, heure, tok) => req('POST', ':commit', { writes: [
  { update: { name: `projects/${PROJET}/databases/(default)/documents/qt_pack/${adresse}/creneaux/${demain()}_${heure.replace(':', '')}`, fields: enc({ date: demain(), heure, rdv: rid }) }, currentDocument: { exists: false } },
  { update: { name: `projects/${PROJET}/databases/(default)/documents/qt_pack/${adresse}/rdv/${rid}`, fields: enc({ prestationId: 'pose', prestation: 'Pose', prix: 35, duree: 30, date: demain(), heure, nom: 'Client', tel: '0600000000', email: '', note: '', acompte: 10, acompteRecu: false, statut: 'attente', at: new Date().toISOString() }) }, currentDocument: { exists: false } }] }, tok);

(async () => {
  const emu = spawn('java', ['-jar', jar, '--host=127.0.0.1', '--port=' + PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
  let journal = ''; emu.stdout.on('data', d => { journal += d; }); emu.stderr.on('data', d => { journal += d; });
  const arret = () => { try { emu.kill(); } catch (e) { /* déjà arrêté */ } };
  process.on('exit', arret);
  for (let i = 0; i < 120 && !/Dev App Server is now running|is now running/.test(journal); i++) await new Promise(r => setTimeout(r, 500));
  if (!/running/.test(journal)) { erreurs.push('l’émulateur Firestore ne démarre pas : ' + journal.slice(-300)); arret(); fin(1); }
  const pr = await fetch(`${EMU}/emulator/v1/projects/${PROJET}:securityRules`, { method: 'PUT', body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: REGLES }] } }) });
  if (!pr.ok) { erreurs.push('règles refusées par l’émulateur : ' + (await pr.text()).slice(0, 600)); arret(); fin(1); }

  /* ---------- 1. Règles ---------- */
  ok((await creerFiche('atelier-essai', FICHE, 'u-lila', A)).s === 200, 'un commerçant connecté crée sa fiche');
  ok((await creerFiche('atelier-essai', FICHE, 'u-autre', B)).s !== 200, 'adresse déjà prise : création refusée');
  ok((await creerFiche('vol-identite', FICHE, 'u-lila', B)).s !== 200, 'fiche au nom d’un autre compte refusée');
  ok((await creerFiche('sans-compte', FICHE, 'u-lila', null)).s !== 200, 'création sans connexion refusée');
  ok((await creerFiche('Majuscules', FICHE, 'u-lila', A)).s !== 200, 'adresse invalide refusée');
  ok((await creerFiche('cle-en-trop', { ...FICHE, admin: true }, 'u-lila', A)).s !== 200, 'champ inconnu refusé');
  ok((await creerFiche('date-truquee', FICHE, 'u-lila', A, new Date(Date.now() + 365 * 864e5))).s !== 200, 'date de création truquée refusée (essai prolongé)');
  ok((await creerFiche('couleur-piege', { ...FICHE, couleur: 'red;x' }, 'u-lila', A)).s !== 200, 'couleur invalide refusée');
  ok((await req('GET', '/qt_pack/atelier-essai')).s === 200, 'fiche lisible par le public');
  const maj = (tok, champs, masque) => req('PATCH', '/qt_pack/atelier-essai?' + masque.map(k => 'updateMask.fieldPaths=' + k).join('&'), { fields: enc(champs) }, tok);
  ok((await maj(A, { nom: 'Atelier Modifié' }, ['nom'])).s === 200, 'le commerçant modifie sa fiche');
  ok((await maj(B, { nom: 'Piraté' }, ['nom'])).s !== 200, 'un autre compte ne modifie pas la fiche');
  ok((await maj(A, { uid: 'u-autre' }, ['uid'])).s !== 200, 'propriétaire de la fiche non modifiable');
  ok((await maj(A, { cree: new Date(Date.now() + 365 * 864e5) }, ['cree'])).s !== 200, 'date de création non modifiable');
  const liste = (tok, filtre) => req('POST', ':runQuery', { structuredQuery: { from: [{ collectionId: 'qt_pack' }], ...(filtre ? { where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: filtre } } } } : {}) } }, tok);
  ok((await liste(A, 'u-lila')).s === 200, 'le commerçant liste ses fiches');
  ok((await liste(A)).s !== 200, 'un commerçant ne liste pas toutes les fiches');
  ok((await liste(PAT)).s === 200, 'QuenTools liste toutes les fiches');
  ok((await reserver('atelier-essai', 'RDV1AAAAAAAA', '10:00', null)).s === 200, 'réservation publique pendant l’essai');
  ok((await reserver('atelier-essai', 'RDV2AAAAAAAA', '10:00', null)).s !== 200, 'double réservation refusée');
  ok((await req('GET', '/qt_pack/atelier-essai/rdv/RDV1AAAAAAAA')).s !== 200, 'rendez-vous illisible par le public');
  ok((await req('GET', '/qt_pack/atelier-essai/rdv/RDV1AAAAAAAA', null, B)).s !== 200, 'rendez-vous illisible par un autre commerçant');
  ok((await req('GET', '/qt_pack/atelier-essai/rdv/RDV1AAAAAAAA', null, A)).s === 200, 'rendez-vous lisible par son commerçant');
  ok((await req('PATCH', '/qt_pack/atelier-essai/rdv/RDV1AAAAAAAA?updateMask.fieldPaths=statut', { fields: enc({ statut: 'confirme' }) }, B)).s !== 200, 'un autre commerçant ne confirme pas un rendez-vous');
  ok((await req('PATCH', '/qt_pack/atelier-essai/rdv/RDV1AAAAAAAA?updateMask.fieldPaths=statut', { fields: enc({ statut: 'confirme' }) }, A)).s === 200, 'le commerçant confirme un rendez-vous');
  ok((await req('DELETE', `/qt_pack/atelier-essai/creneaux/${demain()}_1000`, null, B)).s !== 200, 'un autre commerçant ne libère pas un créneau');
  const carte = 'CARTEAAAAAAAAAAA';
  ok((await req('POST', '/qt_pack/atelier-essai/cartes?documentId=' + carte, { fields: enc({ prenom: 'Léa', tampons: 0, recompenses: 0, at: 'x' }) })).s === 200, 'carte créée par le client');
  ok((await req('POST', '/qt_pack/atelier-essai/cartes?documentId=CARTEBBBBBBBBBBB', { fields: enc({ prenom: 'Léa', tampons: 5, recompenses: 0, at: 'x' }) })).s !== 200, 'carte déjà tamponnée refusée');
  ok((await req('PATCH', `/qt_pack/atelier-essai/cartes/${carte}?updateMask.fieldPaths=tampons`, { fields: enc({ tampons: 3 }) })).s !== 200, 'le client ne se tamponne pas sa carte');
  ok((await req('PATCH', `/qt_pack/atelier-essai/cartes/${carte}?updateMask.fieldPaths=tampons`, { fields: enc({ tampons: 3 }) }, B)).s !== 200, 'un autre commerçant ne tamponne pas la carte');
  ok((await req('PATCH', `/qt_pack/atelier-essai/cartes/${carte}?updateMask.fieldPaths=tampons`, { fields: enc({ tampons: 1 }) }, A)).s === 200, 'le commerçant tamponne la carte');
  // Essai terminé (fiche posée par l'administrateur de l'émulateur, créée il y a 20 jours)
  await creerFiche('essai-fini', FICHE, 'u-lila', 'owner', new Date(Date.now() - 20 * 864e5));
  ok((await reserver('essai-fini', 'RDV3AAAAAAAA', '11:00', null)).s !== 200, 'essai terminé : réservation refusée');
  ok((await req('POST', '/qt_pack/essai-fini/cartes?documentId=' + carte, { fields: enc({ prenom: 'Léa', tampons: 0, recompenses: 0, at: 'x' }) })).s !== 200, 'essai terminé : carte refusée');
  ok((await req('GET', '/qt_pack/essai-fini/rdv/RDV1AAAAAAAA', null, A)).s !== 403, 'essai terminé : le commerçant garde l’accès à ses données');
  const abo = jusqu => ({ fields: enc({ jusquau: jusqu, plan: 'mensuel', note: '' }) });
  ok((await req('PATCH', '/qt_pack_abos/essai-fini', abo(new Date(Date.now() + 30 * 864e5)), A)).s !== 200, 'le commerçant ne s’offre pas d’abonnement');
  ok((await req('PATCH', '/qt_pack_abos/essai-fini', abo(new Date(Date.now() + 30 * 864e5)), PAT)).s === 200, 'QuenTools active un abonnement');
  ok((await reserver('essai-fini', 'RDV3AAAAAAAA', '11:00', null)).s === 200, 'abonnement actif : réservation rouverte');
  ok((await req('DELETE', '/qt_pack/essai-fini', null, A)).s !== 200, 'le commerçant ne supprime pas sa fiche lui-même');

  /* ---------- 2. Parcours dans le navigateur ---------- */
  const PW = [process.env.PW, '/opt/node-tools/node_modules/playwright', '/opt/node22/lib/node_modules/playwright', path.join(racine, 'wouf/node_modules/playwright')].find(p => p && fs.existsSync(p));
  const { chromium } = require(PW);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const serveur = http.createServer((q, s) => {
    let f = path.join(racine, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
    if (!f.startsWith(racine) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
  });
  await new Promise(r => serveur.listen(0, r));
  const base = `http://localhost:${serveur.address().port}/`;
  const br = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  async function contexte(uid, email) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
    // Firestore → émulateur ; connexion Google simulée (jeton non signé accepté par l'émulateur)
    await ctx.route('https://firestore.googleapis.com/**', async route => {
      const q = route.request(), u = new URL(q.url());
      const r = await fetch(EMU + u.pathname + u.search, { method: q.method(), headers: { 'Content-Type': 'application/json', ...(q.headers().authorization ? { Authorization: q.headers().authorization } : {}) }, body: q.postData() || undefined });
      await route.fulfill({ status: r.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: await r.text() });
    });
    const tok = jeton(uid, email);
    await ctx.route('https://www.gstatic.com/firebasejs/**', route => {
      const u = route.request().url(), js = /firebase-app\.js$/.test(u) ? 'export const initializeApp = () => ({});'
        : /firebase-auth\.js$/.test(u) ? `export const getAuth = () => ({ currentUser: null }); export class GoogleAuthProvider {}; export const signInWithPopup = async () => ({ user: { uid: ${JSON.stringify(uid)}, email: ${JSON.stringify(email)}, getIdToken: async () => ${JSON.stringify(tok)} } });` : 'export {};';
      return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' }, body: js });
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => erreurs.push('erreur JavaScript : ' + e.message));
    page.on('dialog', d => { if (/piege/i.test(d.message())) erreurs.push('script de la fiche exécuté : ' + d.message()); d.accept(); });
    return page;
  }
  const capture = async (page, nom) => { if (process.env.QT_CAPTURES) await page.screenshot({ path: path.join(process.env.QT_CAPTURES, nom + '.png'), fullPage: true }); };
  const largeur = async (page, nom) => ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), nom + ' : défilement horizontal');
  const page = await contexte('u-nouveau', 'nouveau@exemple.test');

  // Inscription
  await page.goto(base + 'pro/inscription/'); await largeur(page, 'inscription');
  await page.click('#connexion'); await page.waitForSelector('#etape-fiche:not([hidden])');
  await page.fill('#pro-nom', 'Barber Test'); ok(await page.inputValue('#pro-adresse') === 'barber-test', 'adresse proposée d’après le nom : ' + await page.inputValue('#pro-adresse'));
  await page.fill('#pro-tel', '06 11 22 33 44');
  await page.fill('.pro-prest [data-k=nom]', 'Coupe homme'); await page.fill('.pro-prest [data-k=prix]', '25'); await page.selectOption('.pro-prest [data-k=duree]', '30');
  await page.selectOption('#pro-at', 'fixe'); await page.fill('#pro-av', '5'); await page.fill('#pro-al', 'https://evil.example/payer');
  await capture(page, '1-inscription'); await page.click('#creer'); ok(await page.isVisible('#err'), 'création refusée sans accord et avec un lien de paiement étranger');
  ok(/PayPal|Stripe/.test(await page.textContent('#err')), 'message sur le lien de paiement');
  await page.fill('#pro-al', 'https://paypal.me/BarberTest'); await page.check('#accord');
  await page.click('#creer'); await page.waitForSelector('#etape-fin:not([hidden])', { timeout: 15000 });
  ok(/essai gratuit/.test(await page.textContent('#etape-fin')), 'écran de fin avec l’essai');
  await largeur(page, 'inscription terminée'); await capture(page, '2-fin');

  // Page de réservation du nouveau commerce
  await page.click('#etape-fin a.btn-ghost'); await page.waitForSelector('#prest label');
  ok(/Barber Test/.test(await page.textContent('.brand')), 'nom du commerce sur sa page');
  ok(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()) === '#b4436c', 'couleur du commerce appliquée');
  await largeur(page, 'page de réservation'); await capture(page, '3-page');
  await page.check('#prest input'); await page.waitForSelector('#jours button'); await page.click('#jours button'); await page.waitForSelector('#heures button'); await page.click('#heures button');
  await page.fill('#nom', 'Paul Client'); await page.fill('#tel', '06 99 88 77 66'); await page.check('#ok'); await page.click('#go');
  await page.waitForSelector('#fin:not([hidden])', { timeout: 15000 });
  ok(/paypal\.me\/BarberTest\/5EUR/.test(await page.getAttribute('#payer', 'href') || ''), 'lien d’acompte PayPal avec le montant');
  // La carte de fidélité garde l'adresse du commerce
  await page.click('#fin a[href="carte/"]'); await page.waitForURL(/\/pro\/carte\/\?c=barber-test/);
  await page.fill('#prenom', 'Paul'); await page.click('#f button'); await page.waitForSelector('.pk-qr svg');

  // Espace commerçant : rendez-vous, bandeau d'essai, réglages modifiés
  await page.goto(base + 'pro/admin/?c=barber-test'); await page.click('#entrer'); await page.waitForSelector('#app:not([hidden])');
  ok(/Paul Client/.test(await page.textContent('#t-rdv')), 'le rendez-vous apparaît dans l’espace commerçant');
  ok(/Essai gratuit : encore 14 jours/.test(await page.textContent('#pro-bandeau')), 'bandeau d’essai : ' + (await page.textContent('#pro-bandeau')).trim().slice(0, 80));
  await capture(page, '4-espace'); await page.click('[data-t=reglages]'); await capture(page, '5-reglages'); await page.fill('#pro-nom', 'Barber Test Nîmes'); await page.click('[data-r=enregistrer]');
  await page.waitForFunction(() => /Nîmes/.test(document.querySelector('.brand') && document.querySelector('.brand').textContent), null, { timeout: 15000 });
  await largeur(page, 'espace commerçant');
  // Un autre compte Google n'entre pas dans cet espace
  const intrus = await contexte('u-intrus', 'intrus@exemple.test');
  await intrus.goto(base + 'pro/admin/?c=barber-test'); await intrus.click('#entrer'); await intrus.waitForSelector('#err:not([hidden])');
  ok(/pas accès/.test(await intrus.textContent('#err')), 'un autre compte Google est refusé dans l’espace commerçant');

  // Essai terminé : page visible, réservation suspendue
  await page.goto(base + 'pro/?c=essai-fini'); await page.waitForSelector('main');
  await creerFiche('essai-termine', FICHE, 'u-lila', 'owner', new Date(Date.now() - 20 * 864e5));
  await page.goto(base + 'pro/?c=essai-termine'); await page.waitForSelector('#reserver .notice');
  ok(/momentanément indisponible/.test(await page.textContent('#reserver')), 'essai terminé : réservation suspendue sur la page');
  // Page inconnue, adresse absente
  await page.goto(base + 'pro/?c=nexiste-pas'); await page.waitForSelector('h1'); ok(/introuvable/.test(await page.textContent('h1')), 'commerce inconnu : page introuvable');
  await page.goto(base + 'pro/'); await page.waitForURL(/inscription/); ok(true, '');
  // Fiche piégée écrite directement dans la base : rien ne s'exécute, aucun lien étranger
  await creerFiche('fiche-piege', { ...FICHE, nom: '<img src=x onerror=alert("piege nom")>', accroche: '<script>alert("piege")</script>',
    horaires: { 1: ['<img src=x onerror=alert("piege horaires")>'], 2: ['09:00-18:00'] }, prestations: [{ id: '"><img src=x onerror=alert("piege id")>', nom: '<b>x</b>', duree: '"><img src=x onerror=alert("piege duree")>', prix: 'abc' }],
    acompte: { type: 'fixe', valeur: 10, lien: 'https://evil.example/' }, avis: { lien: 'javascript:alert("piege avis")' } }, 'u-lila', 'owner');
  await page.goto(base + 'pro/?c=fiche-piege'); await page.waitForSelector('#prest label');
  ok(!(await page.$('img[src="x"]')), 'aucune image injectée par la fiche');
  ok(!(await page.evaluate(() => [...document.querySelectorAll('a[href]')].some(a => /evil\.example|^javascript:/i.test(a.getAttribute('href'))))), 'aucun lien étranger ou javascript: affiché');
  await page.check('#prest input'); await page.waitForSelector('#jours button');

  // Administration QuenTools (démonstration) : onglet Abonnés
  const adm = await contexte('u-patron', PATRON);
  await adm.goto(base + 'admin/?demo'); await adm.waitForSelector('[data-tab=abonnes]'); await adm.click('[data-tab=abonnes]'); await adm.waitForSelector('[data-ab]');
  ok(/39 €/.test(await adm.textContent('.kpis')), 'onglet Abonnés : revenus mensuels');
  await adm.click('[data-ab="atelier-lila"] [data-do=ab-mois]'); await adm.waitForFunction(() => /Abonné jusqu’au/.test(document.querySelector('[data-ab="atelier-lila"]').textContent));
  await largeur(adm, 'administration, onglet Abonnés');

  await br.close(); serveur.close(); arret();
  fin(0);
})().catch(e => { erreurs.push('contrôle interrompu : ' + e.message); fin(1); });
