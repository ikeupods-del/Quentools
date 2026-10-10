/* QuenTools — contrôle de la certification des photos d'état des lieux (sceau serveur) : node tools/verifier-decodeur-sceau.js
   Simule Firebase et le site https://quentools.fr pour tester la connexion, le scellement, la vérification et l'e-mail. Nécessite Playwright. */
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const FAKE = {
  'firebase-app.js': 'export const initializeApp = c => ({ c });',
  'firebase-auth.js': 'export const getAuth = () => ({ currentUser: { uid: "u1", email: "loc@example.com", displayName: "Loc Ataire" }, authStateReady: async () => {} }); export const onAuthStateChanged = () => () => {}; export const GoogleAuthProvider = class {}; export const signInWithPopup = async () => {}; export const signOut = async () => {};',
  'firebase-firestore.js': 'const S = (window.__seals = window.__seals || []); export const getFirestore = () => ({}); export const collection = (_, n) => ({ n }); export const doc = (...a) => ({ p: a.slice(1).join("/") }); export const serverTimestamp = () => ({ __ts: true }); export const addDoc = async (c, d) => { const id = "S" + String(S.length + 1).padStart(19, "0"); S.push({ id, ...d, at: new Date().toISOString() }); return { id }; }; export const getDoc = async r => { const s = S.find(x => x.id === r.id); return { exists: () => !!s, data: () => s ? { ...s, at: { toDate: () => new Date(s.at) } } : {} }; }; export const setDoc = async () => {};'
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  await ctx.route('https://quentools.fr/**', r => { let f = path.join(ROOT, new URL(r.request().url()).pathname); if (f.endsWith('/')) f += 'index.html'; try { r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); } catch (e) { r.fulfill({ status: 404, body: '' }); } });
  await ctx.route(/gstatic\.com\/firebasejs/, r => { const n = r.request().url().split('/').pop(); r.fulfill({ body: FAKE[n] || '', contentType: 'text/javascript' }); });
  await ctx.route(/googlesyndication|jsdelivr/, r => r.abort());
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); if (process.env.DEBUG) pg.on('console', m => console.log('[page]', m.text()));
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
  await pg.goto('https://quentools.fr/decodeur-courrier.html#etat-des-lieux'); await pg.waitForSelector('[data-edl-new=entree]');
  await pg.click('[data-edl-new=entree]'); await pg.fill('#en-adr', '1 rue Test'); await pg.fill('#en-mail', 'proprio@example.com'); await pg.click('#en-go');
  await pg.click('[data-ii="0"] [data-cam]'); await pg.waitForSelector('#cam-snap:not([disabled])', { timeout: 8000 }); await pg.click('#cam-snap');
  await pg.waitForSelector('[data-ii="0"] .th .ok', { timeout: 8000 });
  const seal = await pg.evaluate(() => { const it = JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux'))[0].rooms[0].items[0]; return { s: it.seals[0], server: window.__seals }; });
  ok(seal.s.id && /^[a-f0-9]{64}$/.test(seal.s.hash) && seal.server.length === 1 && seal.server[0].hash === seal.s.hash && seal.server[0].uid === 'u1', 'photo scellée : empreinte et heure du serveur enregistrées (' + seal.s.id + ')');
  // vérification : le bon fichier, puis un fichier modifié
  const key = await pg.evaluate(() => JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux'))[0].rooms[0].items[0].photos[0]);
  const jpg = await pg.evaluate(async k => { const db = await new Promise(r => { const q = indexedDB.open('qt-paperasse', 1); q.onsuccess = () => r(q.result); }); const src = await new Promise(r => { const g = db.transaction('images').objectStore('images').get(k); g.onsuccess = () => r(g.result); }); return src.split(',')[1]; }, key);
  const good = Buffer.from(jpg, 'base64'), bad = Buffer.concat([good, Buffer.from([0])]);
  await ctx.route(/firestore\.googleapis\.com.*qt_seals/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ fields: { hash: { stringValue: seal.s.hash }, at: { timestampValue: seal.s.at } } }) }));
  await pg.click('#edl-back'); await pg.waitForSelector('#edl-verify'); await pg.click('#edl-verify');
  await pg.fill('#vf-code', seal.s.id); await pg.setInputFiles('#vf-file', { name: 'p.jpg', mimeType: 'image/jpeg', buffer: good }); await pg.click('#vf-go');
  await pg.waitForFunction(() => /authentique|Attention/.test(document.querySelector('#vf-out').textContent));
  ok(/authentique/.test(await pg.innerText('#vf-out')), 'photo d\'origine reconnue comme authentique');
  await pg.setInputFiles('#vf-file', { name: 'p.jpg', mimeType: 'image/jpeg', buffer: bad }); await pg.click('#vf-go');
  await pg.waitForFunction(() => /Attention/.test(document.querySelector('#vf-out').textContent), null, { timeout: 5000 }).catch(() => {});
  ok(/Attention/.test(await pg.innerText('#vf-out')), 'photo modifiée détectée');
  await pg.click('#vf-close');
  // résumé, PDF et e-mail
  await pg.click('[data-edl-sum]'); ok(/1 sur 1 certifiées/.test(await pg.innerText('#tools')), 'résumé : 1 photo sur 1 certifiée');
  const html = await pg.evaluate(async () => { const e = JSON.parse(localStorage.getItem('qt-paperasse:etats-des-lieux'))[0]; return await window.__decodeur.buildEdlHTML(e); });
  ok(/Code de contrôle : S0+1/.test(html) && /certifiée par serveur/.test(html), 'PDF : code de contrôle et date certifiée sur la photo');
  await pg.click('#edl-mail'); ok(true, 'bouton e-mail sans erreur');
  console.log(errs.length ? errs.join('\n') : '✓ aucune erreur JavaScript'); if (errs.length) process.exitCode = 1;
  await b.close();
})().catch(e => { console.error('ECHEC', e); process.exit(1); });
