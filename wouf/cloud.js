'use strict';
/* Wouf — connexion Google (Firebase) et sauvegarde automatique dans le cloud.
   Même projet Firebase que les autres apps QuenTools : un compte Google pour tout, données rangées à part
   dans users/{uid}/apps/wouf. Clés Firebase publiques par conception : la sécurité vient des règles Firestore.
   Synchronisation : « la plus récente gagne » (avec choix explicite si les deux appareils ont des données).
   Les documents (photos / PDF) restent sur l'appareil : ils sont dans la sauvegarde chiffrée manuelle. */

const FBV = '10.14.1', APP_ID = 'wouf', CHUNK = 250000;
const CLOUD = { user: null, st: 'off', at: 0, msg: '' };   // st : off | sync | ok | err
let FBP = null;

function fb() {   // charge Firebase à la demande : aucun coût tant qu'on ne se connecte pas
  if (!(CFG.firebase && CFG.firebase.apiKey)) return Promise.reject(new Error('Connexion Google non configurée (config.js)'));
  if (!FBP) FBP = (async () => {
    const B = `https://www.gstatic.com/firebasejs/${FBV}/`;
    const [A, Au, Fs] = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js'), import(B + 'firebase-firestore.js')]);
    const app = A.initializeApp(CFG.firebase);
    return { Au, Fs, auth: Au.getAuth(app), db: Fs.getFirestore(app) };
  })().catch(() => { FBP = null; throw new Error('Impossible de joindre Google (connexion internet ?)'); });
  return FBP;
}
const gInfo = u => ({ email: u.email || '', name: u.displayName || '', picture: u.photoURL || '' });

/* Adaptateur : remplaçable (tests). */
const CloudApi = {
  // Firebase Auth exige https et un domaine autorisé : indisponible en local (file://) ou dans l'aperçu claude.ai
  available: () => !!(CFG.firebase && CFG.firebase.apiKey) && (location.protocol === 'https:' || location.hostname === 'localhost') &&
    !/(^|\.)claude\.ai$|claudeusercontent|anthropic/.test(location.hostname),
  async restore() { const F = await fb(); await F.auth.authStateReady(); return F.auth.currentUser ? gInfo(F.auth.currentUser) : null; },
  async signIn() {
    const F = await fb(); await F.auth.authStateReady();
    if (F.auth.currentUser) return gInfo(F.auth.currentUser);
    try { return gInfo((await F.Au.signInWithPopup(F.auth, new F.Au.GoogleAuthProvider())).user); }
    catch (e) {
      const m = { 'auth/popup-closed-by-user': 'Connexion annulée', 'auth/cancelled-popup-request': 'Connexion annulée', 'auth/popup-blocked': 'Autorisez les pop-ups pour ce site puis réessayez',
        'auth/unauthorized-domain': 'Domaine non autorisé dans Firebase (voir README)', 'auth/operation-not-allowed': 'Connexion Google non activée dans Firebase (voir README)' };
      throw new Error(m[e && e.code] || 'Connexion Google impossible');
    }
  },
  async token() { const F = await fb(); await F.auth.authStateReady(); if (!F.auth.currentUser) throw new Error('Session Google expirée, reconnectez-vous'); return F.auth.currentUser.getIdToken(); },
  async signOut() { const F = await fb(); await F.Au.signOut(F.auth); },
  async _col(F) {
    await F.auth.authStateReady();
    const u = F.auth.currentUser; if (!u) throw new Error('Session Google expirée, reconnectez-vous');
    return (id) => F.Fs.doc(F.db, 'users', u.uid, 'apps', APP_ID, 'main', id);
  },
  async load() {   // -> { text, at } | null
    const F = await fb(), ref = await this._col(F), meta = await F.Fs.getDoc(ref('current'));
    if (!meta.exists()) return null;
    const m = meta.data(), parts = [];
    if (m.n == null) return { text: m.text, at: m.at };
    for (let i = 0; i < m.n; i++) parts.push((await F.Fs.getDoc(ref('p' + i))).data().t);
    return { text: parts.join(''), at: m.at };
  },
  async save(text, at) {
    const F = await fb(), ref = await this._col(F), n = Math.ceil(text.length / CHUNK);
    for (let i = 0; i < n; i++) await F.Fs.setDoc(ref('p' + i), { t: text.slice(i * CHUNK, (i + 1) * CHUNK) });
    await F.Fs.setDoc(ref('current'), { n, at });   // le pointeur est écrit en dernier : lecture toujours cohérente
  }
};

const cloudLabel = () => ({ sync: 'Synchronisation…', ok: 'Sauvegardé dans Google', err: 'Erreur de synchronisation', off: '' }[CLOUD.st] || '');
function setCloud(st, msg) { CLOUD.st = st; CLOUD.msg = msg || ''; if (['reglages', 'home', 'sauvegarde'].includes(routeName())) render(true); }

/* Contenu synchronisé : tout sauf ce qui est propre à l'appareil (préférences de notification, abonnement local géré à part). */
function cloudPayload() { const c = JSON.parse(JSON.stringify(S)); delete c.settings; return JSON.stringify(c); }
function applyRemote(text, at) {
  const r = migrate(JSON.parse(text)), keepSettings = S.settings, keepSub = S.sub, keepInstall = S.installedAt;
  S = Object.assign(blank(), r, { settings: keepSettings, installedAt: keepInstall < (r.installedAt || keepInstall) ? keepInstall : (r.installedAt || keepInstall) });
  S.sub = [keepSub, r.sub].filter(Boolean).sort((a, b) => Date.parse(b.until || 0) - Date.parse(a.until || 0))[0] || null;
  S.updatedAt = at; flush();
}
const hasData = () => S.dogs.length > 0;

let pushT, pushing = false;
function cloudQueue() { if (!CLOUD.user) return; clearTimeout(pushT); pushT = setTimeout(cloudPush, 2500); }
async function cloudPush() {
  if (!CLOUD.user || pushing) return;
  pushing = true; setCloud('sync');
  try { const at = S.updatedAt || Date.now(); S.updatedAt = at; await CloudApi.save(cloudPayload(), at); CLOUD.at = at; setCloud('ok'); }
  catch (e) { setCloud('err', e.message); }
  pushing = false;
}
async function cloudPull(first) {
  setCloud('sync');
  try {
    const remote = await CloudApi.load(), local = S.updatedAt || 0;
    if (!remote) { if (hasData()) await cloudPush(); else setCloud('ok'); return; }
    if (remote.at === local) { CLOUD.at = remote.at; return setCloud('ok'); }
    if (!hasData()) { applyRemote(remote.text, remote.at); CLOUD.at = remote.at; setCloud('ok'); render(); toast('Données récupérées depuis Google ✓'); return; }
    if (remote.at > local) {
      // Données des deux côtés : à la première connexion on demande, ensuite « la plus récente gagne »
      const keepCloud = first ? await ask2('Des données existent déjà dans votre compte Google (' + new Date(remote.at).toLocaleDateString('fr-FR') + ') et sur cet appareil. Lesquelles garder ?', 'Celles de Google', 'Celles de cet appareil') : true;
      if (keepCloud) { applyRemote(remote.text, remote.at); CLOUD.at = remote.at; setCloud('ok'); render(); toast('Données mises à jour depuis Google ✓'); return; }
    }
    S.updatedAt = Date.now(); await cloudPush();
  } catch (e) { setCloud('err', e.message); }
}
function ask2(msg, a, b) {
  return new Promise(res => {
    const el = sheet(`<p class="ask">${esc(msg)}</p><div class="form-actions"><button class="btn" data-b>${esc(b)}</button><button class="btn primary" data-a>${esc(a)}</button></div>`, 'dlg');
    const done = v => { el.remove(); if (!$('.sheet-wrap')) document.body.classList.remove('noscroll'); res(v); };
    $('[data-a]', el).onclick = () => done(true); $('[data-b]', el).onclick = () => done(false);
  });
}

ACT['g-signin'] = async () => {
  if (!CloudApi.available()) return toast('Connexion Google : disponible sur la version publiée (https)');
  try { toast('Connexion à Google…'); CLOUD.user = await CloudApi.signIn(); try { localStorage.setItem('wouf:google', '1'); } catch (e) { /* ignore */ } await cloudPull(true); refreshSub(true).then(() => render(true)); accountSync(); }
  catch (e) { toast(e.message); }
  render(true);
};
ACT['g-sync'] = async () => { if (!CLOUD.user) return; S.updatedAt = Date.now(); await cloudPush(); toast(CLOUD.st === 'ok' ? 'Synchronisé ✓' : 'Échec de la synchronisation'); };
ACT['g-signout'] = async () => {
  if (!(await ask('Se déconnecter de Google ? Vos données restent sur cet appareil et dans votre compte.', 'Se déconnecter', false))) return;
  try { await CloudApi.signOut(); } catch (e) { /* ignore */ }
  CLOUD.user = null; S.grant = null; save(); setCloud('off'); try { localStorage.removeItem('wouf:google'); } catch (e) { /* ignore */ } render(true);
};
async function cloudInit() {   // session Google déjà ouverte (ici ou dans une autre app QuenTools) ?
  let on = false; try { on = localStorage.getItem('wouf:google') === '1'; } catch (e) { /* ignore */ }
  if (!on || !CloudApi.available()) return;
  try { const u = await CloudApi.restore(); if (u) { CLOUD.user = u; await cloudPull(false); await refreshSub(false); accountSync(); } } catch (e) { /* hors ligne */ }
}
