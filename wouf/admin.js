'use strict';
/* Wouf — administration (propriétaire uniquement) : comptes Google, Wouf Plus offert, interrupteur de vente.
   La SÉCURITÉ est assurée par les règles Firestore (docs/MAINTENANCE.md, « Administration ») : seul le compte Google
   du propriétaire peut lire la liste des comptes et écrire les droits. Ce fichier n'est que l'interface.
   Firestore : wouf_users/{uid}  résumé du compte, écrit par l'app de l'utilisateur (1 fois par jour au plus) ;
               wouf_grants/{uid} Wouf Plus offert ({ until: 'lifetime' | 'AAAA-MM-JJ' }), écrit par le propriétaire ;
               wouf_admin/config vente ouverte ou non ({ billingEnabled }), lisible par tous, écrit par le propriétaire. */

/* Adaptateur : remplaçable (tests). */
const AdminApi = {
  async _F() { const F = await fb(); await F.auth.authStateReady(); if (!F.auth.currentUser) throw new Error('Connectez-vous avec Google'); return F; },
  async listUsers() {
    const F = await this._F(), [u, g] = await Promise.all([F.Fs.getDocs(F.Fs.collection(F.db, 'wouf_users')), F.Fs.getDocs(F.Fs.collection(F.db, 'wouf_grants'))]);
    const grants = {}; g.forEach(d => { grants[d.id] = d.data(); });
    const out = []; u.forEach(d => out.push({ ...d.data(), uid: d.id, grant: grants[d.id] || null })); return out;
  },
  async setGrant(uid, grant) { const F = await this._F(), ref = F.Fs.doc(F.db, 'wouf_grants', uid); if (grant) await F.Fs.setDoc(ref, grant); else await F.Fs.deleteDoc(ref); },
  async setConfig(c) { const F = await this._F(); await F.Fs.setDoc(F.Fs.doc(F.db, 'wouf_admin', 'config'), c, { merge: true }); },
  async myGrant() { const F = await this._F(), s = await F.Fs.getDoc(F.Fs.doc(F.db, 'wouf_grants', F.auth.currentUser.uid)); return s.exists() ? s.data() : null; },
  async touch(p) { const F = await this._F(); await F.Fs.setDoc(F.Fs.doc(F.db, 'wouf_users', F.auth.currentUser.uid), p, { merge: true }); },
  async remoteConfig() {   // lecture publique, sans charger Firebase : un simple appel
    const f = CFG.firebase || {}; if (!f.projectId || !f.apiKey || location.protocol !== 'https:') return null;
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${f.projectId}/databases/(default)/documents/wouf_admin/config?key=${f.apiKey}`);
    if (r.status === 404) return {}; if (!r.ok) return null;
    const fl = (await r.json()).fields || {}; return fl.billingEnabled ? { billingEnabled: !!fl.billingEnabled.booleanValue } : {};
  }
};

/* ---------- Interrupteur de vente à distance ----------
   La vente ne s'ouvre que si tout est prêt (infos légales + relais de paiement) : sinon l'interrupteur est ignoré. */
const SALE_DEFAULT = !!BILL.enabled;
const saleReady = () => !!(legalReady() && BILL.api && (BILL.plans || []).length);
const saleMissing = () => [!legalReady() && 'Informations légales (vendeur, adresse, e-mail, médiateur) à compléter', !BILL.api && 'Relais de paiement Stripe à installer'].filter(Boolean);
function applySaleConfig(c) {
  if (!c) return false;
  const on = c.billingEnabled === undefined ? SALE_DEFAULT : (c.billingEnabled && saleReady());
  if (BILL.enabled === on) return false; BILL.enabled = on; return true;
}
try { applySaleConfig(JSON.parse(localStorage.getItem('wouf:remote') || 'null')); } catch (e) { /* stockage indisponible */ }
function remoteRefresh() {
  AdminApi.remoteConfig().then(c => {
    if (!c) return; try { localStorage.setItem('wouf:remote', JSON.stringify(c)); } catch (e) { /* ignore */ }
    if (applySaleConfig(c)) render(true);
  }).catch(() => { /* hors ligne : on garde le dernier état connu */ });
}

/* ---------- Côté utilisateur connecté : droits offerts + résumé du compte ---------- */
const lessonsDone = () => Object.values(S.edu || {}).reduce((n, m) => n + Object.entries(m || {}).filter(([k, p]) => !k.startsWith('_') && p && p.done).length, 0);
async function accountSync() {
  if (!CLOUD.user) return;
  try {
    const g = await AdminApi.myGrant(), was = grantActive();
    S.grant = g && g.until ? { until: g.until } : null; save();
    if (was !== grantActive()) render(true);
  } catch (e) { /* règles pas encore installées ou hors ligne */ }
  if (S.settings.profileAt === today()) return;
  try {
    await AdminApi.touch({ email: CLOUD.user.email || '', name: CLOUD.user.name || '', firstSeen: S.installedAt || today(), lastSeen: today(), version: CFG.version || '',
      dogs: petsOf('dog').length, cats: petsOf('cat').length, lessons: lessonsDone(), bought: !!(S.sub && S.sub.active) });
    S.settings.profileAt = today(); save();
  } catch (e) { /* idem */ }
}

/* ---------- Écran d'administration ---------- */
const ADM = { users: null, loading: false, err: '' };
const grantLabel = g => !g ? '' : g.until === 'lifetime' ? 'Plus offert à vie' : (today() <= g.until ? 'Plus offert jusqu’au ' + fmtDate(g.until) : 'Plus offert (expiré le ' + fmtDate(g.until) + ')');
const admErr = e => e && /permission|insufficient/i.test(String(e.code || e.message)) ? 'Accès refusé par Firebase : les règles d’administration ne sont pas encore installées (voir le guide).' : (e && e.message) || 'Erreur';
async function admLoad() {
  ADM.loading = true; ADM.err = '';
  try { ADM.users = (await AdminApi.listUsers()).sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || ''))); }
  catch (e) { ADM.err = admErr(e); }
  ADM.loading = false; if (routeName() === 'admin') render(true);
}
ROUTES.admin = function admin() {
  const head = '<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🛠️ Administration</h1></div>';
  if (!OWNER) return head + '<section class="card"><p>Réservé au propriétaire de Wouf.</p></section>';
  if (!CLOUD.user) return head + '<section class="card"><p>Connectez-vous avec le compte Google du propriétaire pour gérer les comptes.</p><button class="btn primary" data-act="g-signin">Continuer avec Google</button></section>';
  if (!ADM.users && !ADM.loading && !ADM.err) admLoad();
  const us = ADM.users || [], wk = addDays(today(), -7), gOn = u => u.grant && (u.grant.until === 'lifetime' || today() <= u.grant.until);
  const tiles = [['👤', us.length, 'comptes Google'], ['⭐', us.filter(gOn).length, 'Plus offerts'], ['🟢', us.filter(u => (u.lastSeen || '') >= wk).length, 'actifs (7 j)'], ['🆕', us.filter(u => (u.firstSeen || '') >= wk).length, 'nouveaux (7 j)']];
  const sale = BILL.enabled, miss = saleMissing();
  const row = u => `<div class="adm-u" data-q="${esc(((u.name || '') + ' ' + (u.email || '')).toLowerCase())}">
      <div class="grow"><b>${esc(u.name || u.email || u.uid)}</b><small>${esc(u.email || '')}</small>
      <small>Vu le ${esc(fmtDate(u.lastSeen) || '?')} · 🐶 ${+u.dogs || 0} · 🐱 ${+u.cats || 0} · 🎓 ${+u.lessons || 0}${u.bought ? ' · 💳 acheté' : ''}${u.version ? ' · v' + esc(u.version) : ''}</small>
      ${u.grant ? `<span class="pill-s ${gOn(u) ? 'ok' : ''}">${esc(grantLabel(u.grant))}</span>` : ''}</div>
      <div class="btn-row sm"><button class="btn sm" data-act="adm-grant" data-uid="${esc(u.uid)}" data-until="lifetime">⭐ À vie</button><button class="btn sm" data-act="adm-grant" data-uid="${esc(u.uid)}" data-until="${addDays(today(), 31)}">1 mois</button>${u.grant ? `<button class="btn sm danger" data-act="adm-revoke" data-uid="${esc(u.uid)}">Retirer</button>` : ''}</div></div>`;
  return head + `
  <section class="grid4 adm-tiles">${tiles.map(([i, n, l]) => `<div class="tile sm"><span>${i}</span> <b>${ADM.users ? n : '…'}</b> ${l}</div>`).join('')}</section>
  <section class="card"><h2>🔗 Raccourcis</h2><div class="btn-row">
    ${statsCode() ? `<a class="btn" href="https://${statsCode()}.goatcounter.com" target="_blank" rel="noopener">📊 Visites</a>` : ''}
    <a class="btn" href="https://dashboard.stripe.com" target="_blank" rel="noopener">💳 Stripe</a>
    <a class="btn" href="https://console.firebase.google.com/project/${esc((CFG.firebase || {}).projectId || '')}" target="_blank" rel="noopener">🔥 Firebase</a></div></section>
  <section class="card"><h2>💶 Vente de Wouf Plus</h2>
    <p><b>${sale ? '🟢 Vente ouverte' : '⚪ Tout est gratuit pour le moment'}</b> · prix : ${esc(planLine())}</p>
    ${miss.length ? `<p class="mut">Avant d’ouvrir la vente :</p><ul class="bul">${miss.map(m => `<li>❌ ${esc(m)}</li>`).join('')}</ul>` : '<p class="ok">✅ Tout est prêt pour vendre.</p>'}
    <button class="btn ${sale ? 'danger' : 'primary'}" data-act="adm-sale" ${!sale && miss.length ? 'disabled' : ''}>${sale ? 'Repasser en gratuit' : 'Ouvrir la vente'}</button>
    <p class="mut small">Le changement arrive chez les utilisateurs à leur prochaine ouverture de l’app. Ce qu’ils ont saisi reste toujours accessible.</p></section>
  <section class="card"><h2>👥 Comptes (${us.length})</h2>
    <p class="mut small">Seuls les utilisateurs connectés avec Google apparaissent ici. Pour tous les visiteurs, voir « Visites ».</p>
    ${ADM.err ? `<p class="bad">${esc(ADM.err)}</p><button class="btn" data-act="adm-reload">Réessayer</button>` : ADM.loading && !ADM.users ? '<p class="mut">Chargement…</p>'
      : `<div class="field"><input id="adm-q" type="search" placeholder="Rechercher un nom ou un e-mail"></div><div class="adm-list">${us.map(row).join('') || '<p class="mut">Aucun compte pour le moment.</p>'}</div>
         <button class="btn" data-act="adm-reload">↻ Actualiser</button>`}</section>`;
};
ROUTES.admin.after = () => {
  const q = $('#adm-q'); if (!q) return;
  q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); $$('.adm-u').forEach(el => { el.hidden = !!v && !el.dataset.q.includes(v); }); });
};
ACT['adm-reload'] = () => { ADM.users = null; ADM.err = ''; render(true); };
ACT['adm-grant'] = async ({ uid, until }) => {
  const u = (ADM.users || []).find(x => x.uid === uid); if (!u) return;
  if (!(await ask(`Offrir Wouf Plus ${until === 'lifetime' ? 'à vie' : 'jusqu’au ' + fmtDate(until)} à ${u.name || u.email} ?`, 'Offrir', false))) return;
  const g = { until, by: CLOUD.user.email, at: Date.now() };
  try { await AdminApi.setGrant(uid, g); u.grant = g; toast('Wouf Plus offert ✓ (actif à sa prochaine ouverture de l’app)'); render(true); } catch (e) { toast(admErr(e)); }
};
ACT['adm-revoke'] = async ({ uid }) => {
  const u = (ADM.users || []).find(x => x.uid === uid); if (!u) return;
  if (!(await ask(`Retirer Wouf Plus offert à ${u.name || u.email} ? Ses données restent intactes.`, 'Retirer'))) return;
  try { await AdminApi.setGrant(uid, null); u.grant = null; toast('Accès retiré'); render(true); } catch (e) { toast(admErr(e)); }
};
ACT['adm-sale'] = async () => {
  const on = !BILL.enabled;
  if (on && !saleReady()) return toast('Vente impossible : ' + saleMissing().join(' ; '));
  if (!(await ask(on ? `Ouvrir la vente ? Les nouvelles fonctions Plus deviendront payantes (${planLine()}). Les données de chacun restent accessibles.` : 'Repasser Wouf en gratuit pour tout le monde ?', on ? 'Ouvrir la vente' : 'Repasser en gratuit', !on))) return;
  try {
    const c = { billingEnabled: on, at: Date.now(), by: CLOUD.user.email }; await AdminApi.setConfig(c);
    try { localStorage.setItem('wouf:remote', JSON.stringify({ billingEnabled: on })); } catch (e) { /* ignore */ }
    applySaleConfig({ billingEnabled: on }); toast(on ? 'Vente ouverte ✓' : 'Wouf est de nouveau gratuit ✓'); render(true);
  } catch (e) { toast(admErr(e)); }
};
