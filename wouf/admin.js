'use strict';
/* Wouf — administration (propriétaire uniquement) : comptes Google, Wouf Plus offert, interrupteur de vente.
   La SÉCURITÉ est assurée par les règles Firestore (docs/MAINTENANCE.md, « Administration ») : seul le compte Google
   du propriétaire peut lire la liste des comptes et écrire les droits. Ce fichier n'est que l'interface.
   Firestore : wouf_users/{uid}  résumé du compte, écrit par l'app de l'utilisateur (1 fois par jour au plus) ;
               wouf_orders/{id}  dossier de paiement PayPal créé par l'acheteur avant de payer (statut pending → done / refused) ;
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
  async createOrder(o) { const F = await this._F(); return (await F.Fs.addDoc(F.Fs.collection(F.db, 'wouf_orders'), { ...o, uid: F.auth.currentUser.uid })).id; },
  async listOrders() { const F = await this._F(), q = await F.Fs.getDocs(F.Fs.collection(F.db, 'wouf_orders')), out = []; q.forEach(d => out.push({ ...d.data(), id: d.id })); return out; },
  async paidList() {   // paiements détectés automatiquement par le relais (réservé au propriétaire : le relais vérifie le jeton)
    if (!BILL.api) return {}; const r = await fetch(BILL.api.replace(/\/$/, '') + '/admin/paid', { headers: await authHeaders() });
    if (!r.ok) throw new Error('relais ' + r.status); return (await r.json()).paid || {};
  },
  async supportList() { if (!BILL.api) return []; const r = await fetch(BILL.api.replace(/\/$/, '') + '/admin/support', { headers: await authHeaders() }); if (!r.ok) throw new Error('relais ' + r.status); const j = await r.json(); ADM.mailOn = !!j.mailOn; return j.messages || []; },
  async statsGet() { if (!BILL.api) return null; const r = await fetch(BILL.api.replace(/\/$/, '') + '/admin/stats?days=30', { headers: await authHeaders() }); if (r.status === 501) return { off: true }; if (!r.ok) { let m = ''; try { m = (await r.json()).error || ''; } catch (e) {} throw new Error(m || 'relais ' + r.status); } return r.json(); },
  async supportDelete(id) { const r = await fetch(BILL.api.replace(/\/$/, '') + '/admin/support/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ id }) }); if (!r.ok) throw new Error('relais ' + r.status); },
  async setOrder(id, patch) { const F = await this._F(); await F.Fs.setDoc(F.Fs.doc(F.db, 'wouf_orders', id), patch, { merge: true }); },
  async remoteConfig() {   // lecture publique, sans charger Firebase : un simple appel
    const f = CFG.firebase || {}; if (!f.projectId || !f.apiKey || location.protocol !== 'https:') return null;
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${f.projectId}/databases/(default)/documents/wouf_admin/config?key=${f.apiKey}`);
    if (r.status === 404) return {}; if (!r.ok) return null;
    const fl = (await r.json()).fields || {}, c = {};
    if (fl.billingEnabled) c.billingEnabled = !!fl.billingEnabled.booleanValue;
    for (const k of Object.keys(REMOTE_FIELDS)) if (fl[k] && typeof fl[k].stringValue === 'string') c[k] = fl[k].stringValue;
    return c;
  }
};

/* ---------- Réglages de vente modifiables depuis l'administration ----------
   Liens de paiement PayPal et informations légales : saisis dans l'administration (wouf_admin/config, public comme
   les mentions légales), ils remplacent ceux de config.js. La vente ne s'ouvre que si tout est prêt : sinon l'interrupteur est ignoré. */
const SALE_DEFAULT = !!BILL.enabled;
const RELAY_URL = /^https:\/\/[\w.-]+(\/[\w./-]*)?$/;
const REMOTE_FIELDS = { api: [BILL, 'api', 'Adresse du relais d’activation automatique (facultatif)'], payee: [BILL, 'payee', 'Adresse e-mail PayPal qui reçoit les paiements'], paymentLink: [BILL, 'paymentLink', 'OU lien de paiement PayPal fixe (facultatif)'], rewardLink: [BILL, 'rewardLink', 'Lien PayPal fixe pour l’offre récompense (facultatif)'],
  seller: [LEGAL, 'seller', 'Nom et prénom (ou raison sociale)'], form: [LEGAL, 'form', 'Statut (ex. Entrepreneur individuel, micro-entreprise)'], siret: [LEGAL, 'siret', 'SIRET'],
  address: [LEGAL, 'address', 'Adresse'], email: [LEGAL, 'email', 'E-mail de contact'], mediator: [LEGAL, 'mediator', 'Médiateur de la consommation (nom et site)'], supportEmail: [SUP, 'email', 'E-mail d’assistance'] };
const REMOTE_DEF = Object.fromEntries(Object.entries(REMOTE_FIELDS).map(([k, [o, p]]) => [k, o[p] || '']));
const remoteCached = () => { try { return JSON.parse(localStorage.getItem('wouf:remote') || 'null') || {}; } catch (e) { return {}; } };
function remoteStore(c) { const next = { ...remoteCached(), ...c }; try { localStorage.setItem('wouf:remote', JSON.stringify(next)); } catch (e) { /* ignore */ } return applySaleConfig(next); }
const legalFull = () => ['seller', 'form', 'address', 'siret', 'email', 'mediator'].every(k => LEGAL[k]) && !!supportTo();
// Interrupteur libre (choix du propriétaire) : seule condition, un moyen de paiement PayPal, sinon le bouton « Payer » ne mènerait nulle part.
const saleReady = () => !!(payReady() && (BILL.plans || []).length);
const saleMissing = () => [!payReady() && 'Adresse PayPal (ou lien PayPal) à renseigner'].filter(Boolean);
const legalMissing = () => [['seller', 'nom'], ['form', 'statut'], ['address', 'adresse'], ['siret', 'SIRET'], ['email', 'e-mail'], ['mediator', 'médiateur de la consommation']].filter(([k]) => !LEGAL[k]).map(([, l]) => l).concat(supportTo() ? [] : ['e-mail d’assistance']);
function applySaleConfig(c) {
  if (!c) return false;
  let changed = false;
  for (const [k, [o, p]] of Object.entries(REMOTE_FIELDS)) {
    if (c[k] === undefined) continue;
    let v = String(c[k] || '').trim().slice(0, 300); if (/Link$/.test(k) && v && !PAY_LINK.test(v)) v = ''; if (k === 'payee' && v && !PAYEE.test(v)) v = ''; if (k === 'api' && v && !RELAY_URL.test(v)) v = '';
    v = v || REMOTE_DEF[k]; if (o[p] !== v) { o[p] = v; changed = true; }
  }
  const on = c.billingEnabled === undefined ? SALE_DEFAULT : !!(c.billingEnabled && saleReady());
  if (BILL.enabled !== on) { BILL.enabled = on; changed = true; }
  return changed;
}
try { applySaleConfig(JSON.parse(localStorage.getItem('wouf:remote') || 'null')); } catch (e) { /* stockage indisponible */ }
function remoteRefresh() {
  remoteRefresh.p = AdminApi.remoteConfig().then(c => {
    if (!c) return; try { localStorage.setItem('wouf:remote', JSON.stringify(c)); } catch (e) { /* ignore */ }
    if (applySaleConfig(c)) render(true);
    // L'adresse du relais vient peut-être d'arriver : on peut enfin demander le statut d'achat (sinon un paiement déjà fait resterait invisible).
    if (BILL.api && CLOUD.user && !subActive()) return refreshSub(true).then(() => { if (subActive()) render(true); });
  }).catch(() => { /* hors ligne : on garde le dernier état connu */ });
  return remoteRefresh.p;
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

/* « Répondre » : ouvre Proton Mail (config.support.replyUrl) avec le destinataire et l'objet prêts ; sans modèle, la messagerie du téléphone. */
function replyLink(m) {
  const mt = `mailto:${m.email || ''}?subject=${encodeURIComponent('Re: Wouf – ' + (m.category || 'Question'))}`, tpl = SUP.replyUrl || '';
  return /^https:\/\/[^\s]+%s/.test(tpl) ? tpl.replace('%s', encodeURIComponent(mt)) : mt;
}
ACT['adm-copy'] = async ({ mail }) => { try { await navigator.clipboard.writeText(mail); toast('Adresse copiée ✓'); } catch (e) { toast(mail); } };

/* ---------- Écran d'administration ---------- */
const ADM = { users: null, orders: [], paid: {}, msgs: [], mailOn: false, stats: null, serr: '', loading: false, err: '', oerr: '', perr: '', merr: '' };
const grantLabel = g => !g ? '' : g.until === 'lifetime' ? 'Plus offert à vie' : (today() <= g.until ? 'Plus offert jusqu’au ' + fmtDate(g.until) : 'Plus offert (expiré le ' + fmtDate(g.until) + ')');
const admErr = e => e && /permission|insufficient/i.test(String(e.code || e.message)) ? 'Accès refusé par Firebase : les règles d’administration ne sont pas encore installées (voir le guide).' : (e && e.message) || 'Erreur';
async function admLoad() {
  ADM.loading = true; ADM.err = '';
  const [u, o, pd, ms, st] = await Promise.allSettled([AdminApi.listUsers(), AdminApi.listOrders(), AdminApi.paidList(), AdminApi.supportList(), AdminApi.statsGet()]);
  if (st.status === 'fulfilled') { ADM.stats = st.value; ADM.serr = ''; } else { ADM.stats = null; ADM.serr = st.reason && st.reason.message || 'erreur'; }
  if (ms.status === 'fulfilled') { ADM.msgs = ms.value; ADM.merr = ''; } else { ADM.msgs = []; ADM.merr = BILL.api ? 'Messages illisibles : le relais est-il à jour ? (' + (ms.reason && ms.reason.message || 'erreur') + ')' : ''; }
  if (pd.status === 'fulfilled') { ADM.paid = pd.value; ADM.perr = ''; } else { ADM.paid = {}; ADM.perr = BILL.api ? 'Relais automatique injoignable : validez à la main (' + (pd.reason && pd.reason.message || 'erreur') + ')' : ''; }
  if (u.status === 'fulfilled') ADM.users = u.value.sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || ''))); else ADM.err = admErr(u.reason);
  if (o.status === 'fulfilled') { ADM.orders = o.value.sort((a, b) => (b.at || 0) - (a.at || 0)); ADM.oerr = ''; } else { ADM.orders = []; ADM.oerr = admErr(o.reason); }
  ADM.loading = false; if (routeName() === 'admin') render(true);
}
const STAT_EVT = { 'animal-ajoute-chien': '🐶 Chiens ajoutés', 'animal-ajoute-chat': '🐱 Chats ajoutés', 'lecon-acquise': '🎓 Leçons acquises', 'balade-enregistree': '🦮 Balades', 'offre-recompense-vue': '🏅 Offre récompense vue', 'installation': '📲 Installations' };
function statsCard() {
  if (!BILL.api) return '';
  const st = ADM.stats, head = '<section class="card" id="adm-stats"><h2>📊 Statistiques (30 jours)</h2>';
  if (ADM.serr) return head + `<p class="bad">${esc(ADM.serr)}</p></section>`;
  if (!st) return head + '<p class="mut">Chargement…</p></section>';
  if (st.off) return head + '<p class="mut">Pas encore branchées : dans Cloudflare, ajoutez le secret <b>GOATCOUNTER_TOKEN</b> (clé « lecture des statistiques » créée dans GoatCounter, Paramètres → Clés API). Guide : MAINTENANCE.md.</p></section>';
  const pd = st.perDay || [], sum = n => pd.slice(-n).reduce((a, d) => a + d.visits, 0), last = pd.slice(-14);
  const max = Math.max(1, ...last.map(d => d.visits));
  const list = (arr, lab) => arr.length ? arr.map(x => `<div class="row"><span class="grow">${esc(lab(x))}</span><b>${x.count}</b></div>`).join('') : '<p class="mut small">Rien pour l’instant.</p>';
  return head + `<div class="adm-tiles"><div><b>${sum(1)}</b><small>Aujourd’hui</small></div><div><b>${sum(7)}</b><small>7 jours</small></div><div><b>${st.total}</b><small>30 jours</small></div></div>
    <div class="adm-bars" style="display:flex;align-items:flex-end;gap:3px;height:80px;margin:10px 0" aria-label="Visites des 14 derniers jours">${last.map(d => `<div title="${esc(d.day)} : ${d.visits}" style="flex:1;background:var(--accent,#e8743b);border-radius:3px 3px 0 0;height:${Math.max(3, Math.round(d.visits / max * 100))}%"></div>`).join('')}</div>
    <h3>D’où viennent les visiteurs</h3>${list(st.refs || [], x => x.name)}
    <h3>Pages les plus vues</h3>${list(st.pages || [], x => x.path)}
    <h3>Actions dans l’app</h3>${list(st.events || [], x => STAT_EVT[x.path] || x.path)}</section>`;
}
ROUTES.admin = function admin() {
  const head = '<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🛠️ Administration</h1></div>';
  if (!OWNER) return head + '<section class="card"><p>Réservé au propriétaire de Wouf.</p></section>';
  if (!CLOUD.user) return head + '<section class="card"><p>Connectez-vous avec le compte Google du propriétaire pour gérer les comptes.</p><button class="btn primary" data-act="g-signin">Continuer avec Google</button></section>';
  if (!ADM.users && !ADM.loading && !ADM.err) admLoad();
  const us = ADM.users || [], wk = addDays(today(), -7), gOn = u => u.grant && (u.grant.until === 'lifetime' || today() <= u.grant.until);
  const tiles = [['👤', us.length, 'comptes Google'], ['⭐', us.filter(gOn).length, 'Plus offerts'], ['🟢', us.filter(u => (u.lastSeen || '') >= wk).length, 'actifs (7 j)'], ['🧾', ADM.orders.filter(o => o.status === 'pending').length, 'paiements à vérifier']];
  const sale = BILL.enabled, miss = saleMissing();
  const autoPaid = o => o.status === 'pending' && ADM.paid[o.uid] && ADM.paid[o.uid].active;
  const acct = uid => { const u = (ADM.users || []).find(x => x.uid === uid); return u ? (u.email || u.name) : '…' + String(uid).slice(-6); };
  const orphans = Object.entries(ADM.paid).filter(([uid]) => !ADM.orders.some(o => o.uid === uid));
  const pend = ADM.orders.filter(o => o.status === 'pending' && !autoPaid(o)), done = ADM.orders.filter(o => o.status !== 'pending' || autoPaid(o));
  const orderRow = o => `<div class="adm-o"><div class="grow"><b>${esc(o.firstName || '')} ${esc(o.lastName || '')}</b> <span class="pill-s ${o.status === 'done' || autoPaid(o) ? 'ok' : ''}">${autoPaid(o) ? '✅ Activé automatiquement' : o.status === 'done' ? 'Activé' : o.status === 'refused' ? 'Refusé' : 'À vérifier'}</span>
      <small>💳 PayPal : <b>${esc(o.paypalEmail || '')}</b> · ${esc(o.price || '')}${o.offer === 'reward' ? ' (offre récompense, ' + (+o.lessons || 0) + ' leçons)' : ''}${o.ref ? ' · réf. <b>' + esc(o.ref) + '</b>' : ''}</small>${o.payee ? `<small>📥 Payé à : ${esc(o.payee)}</small>` : ''}${ADM.paid[o.uid] && !ADM.paid[o.uid].active ? `<small class="bad">⚠️ Paiement PayPal annulé ou remboursé : l’accès a été retiré automatiquement.</small>` : ''}${autoPaid(o) ? `<small>💳 PayPal a confirmé : ${esc(ADM.paid[o.uid].payerName || '')} · ${esc(ADM.paid[o.uid].payerEmail || '')} · ${esc(ADM.paid[o.uid].amount || '')} €</small>` : ''}
      <small>👤 Compte Google : ${esc(o.googleEmail || '')} · ✉️ Contact : ${esc(o.contactEmail || '')}</small>
      <small>🕒 ${o.at ? esc(new Date(o.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })) : ''}</small></div>
      ${o.status === 'pending' ? `<div class="btn-row sm"><button class="btn sm primary" data-act="adm-order-ok" data-id="${esc(o.id)}">✅ Paiement reçu : activer</button><button class="btn sm danger" data-act="adm-order-no" data-id="${esc(o.id)}">Refuser</button></div>` : ''}</div>`;
  const row = u => `<div class="adm-u" data-q="${esc(((u.name || '') + ' ' + (u.email || '')).toLowerCase())}">
      <div class="grow"><b>${esc(u.name || u.email || u.uid)}</b><small>${esc(u.email || '')}</small>
      <small>Vu le ${esc(fmtDate(u.lastSeen) || '?')} · 🐶 ${+u.dogs || 0} · 🐱 ${+u.cats || 0} · 🎓 ${+u.lessons || 0}${u.bought || (ADM.paid[u.uid] && ADM.paid[u.uid].active) ? ' · 💳 acheté' : ''}${u.version ? ' · v' + esc(u.version) : ''}</small>
      ${u.grant ? `<span class="pill-s ${gOn(u) ? 'ok' : ''}">${esc(grantLabel(u.grant))}</span>` : ''}</div>
      <div class="btn-row sm"><button class="btn sm" data-act="adm-grant" data-uid="${esc(u.uid)}" data-until="lifetime">⭐ À vie</button><button class="btn sm" data-act="adm-grant" data-uid="${esc(u.uid)}" data-until="${addDays(today(), 31)}">1 mois</button>${u.grant ? `<button class="btn sm danger" data-act="adm-revoke" data-uid="${esc(u.uid)}">Retirer</button>` : ''}</div></div>`;
  return head + `
  <section class="grid4 adm-tiles">${tiles.map(([i, n, l]) => `<div class="tile sm"><span>${i}</span> <b>${ADM.users ? n : '…'}</b> ${l}</div>`).join('')}</section>
  <section class="card"><h2>🔗 Raccourcis</h2><div class="btn-row">
    ${statsCode() ? `<a class="btn" href="https://${statsCode()}.goatcounter.com" target="_blank" rel="noopener">📊 Visites</a>` : ''}
    <a class="btn" href="https://www.paypal.com/myaccount/activities" target="_blank" rel="noopener">💳 PayPal</a>
    <a class="btn" href="https://console.firebase.google.com/project/${esc((CFG.firebase || {}).projectId || '')}" target="_blank" rel="noopener">🔥 Firebase</a></div></section>
  <section class="card"><h2>💶 Vente de Wouf Plus</h2>
    <p><b>${sale ? '🟢 Vente ouverte' : '⚪ Tout est gratuit pour le moment'}</b> · prix : ${esc(planLine())}</p>
    <p class="mut small">Paiement : ${esc(BILL.payee ? 'adresse PayPal ' + BILL.payee : BILL.paymentLink ? 'lien PayPal' : 'aucun')}${BILL.payee || BILL.rewardLink ? ' · offre récompense ' + esc(REWARD.price || '') + ' ✓' : REWARD.enabled ? ' · offre récompense : ajoutez un 2ᵉ lien' : ''}</p>
    ${miss.length ? `<p class="bad">❌ ${esc(miss.join(' ; '))}</p>` : ''}
    ${legalMissing().length ? `<p class="mut small">⚠️ Mentions légales incomplètes (${esc(legalMissing().join(', '))}) : elles s’affichent « à compléter » dans les conditions de vente.</p>` : ''}
    <button class="btn big ${sale ? 'danger' : 'primary'}" data-act="adm-sale" ${!sale && miss.length ? 'disabled' : ''}>${sale ? '⏸️ Ventes ON : appuyer pour arrêter' : '▶️ Ventes OFF : appuyer pour ouvrir'}</button>
    <p class="mut small">Le changement arrive chez les utilisateurs à leur prochaine ouverture de l’app. Ce qu’ils ont saisi reste toujours accessible.</p></section>
  <section class="card" id="adm-pay"><h2>💳 Paiement et informations légales</h2>
    <p class="mut small">Indiquez l’<b>adresse e-mail de votre compte PayPal</b> (compte <b>professionnel</b> conseillé) : chaque acheteur est envoyé vers une page PayPal qui paie <b>${esc(planOf().price)}</b>${REWARD.enabled ? ` (ou <b>${esc(REWARD.price)}</b> pour l’offre récompense)` : ''} à cette adresse, avec la référence de son dossier (WOUF-…) visible dans PayPal. Vous pouvez la changer à tout moment : elle s’applique au paiement suivant. Les champs « lien fixe » ne servent que si vous préférez un lien créé dans PayPal (validation manuelle). <b>Activation automatique</b> : renseignez aussi l’adresse du relais (Cloudflare) ; elle ne fonctionne qu’avec l’adresse PayPal ci-dessus, pas avec un lien fixe.</p>
    ${Object.entries(REMOTE_FIELDS).map(([k, [o, p, l]]) => `<div class="field"><label>${esc(l)}</label><input name="${k}" value="${esc(o[p] || '')}" ${/Link$/.test(k) ? 'type="url" placeholder="https://www.paypal.com/…"' : k === 'api' ? 'type="url" placeholder="https://wouf-billing.votrecompte.workers.dev"' : k === 'payee' ? 'type="email" placeholder="vous@exemple.fr"' : /mail/i.test(k) ? 'type="email"' : ''}></div>`).join('')}
    <button class="btn primary" data-act="adm-save-pay">Enregistrer</button>
    <p class="mut small">Ces informations apparaissent dans les mentions légales et les conditions de vente : faites-les relire avant d’ouvrir la vente.</p></section>
  <section class="card" id="adm-orders"><h2>🧾 Paiements à vérifier (${pend.length})</h2>
    <p class="mut small">Chaque acheteur remplit ce dossier juste avant de payer sur PayPal. ${BILL.api ? 'Les paiements confirmés par PayPal sont activés automatiquement (dossiers « traités »). Ceux qui restent ici n’ont pas été détectés : vérifiez dans PayPal' : 'Vérifiez dans PayPal'} (e-mail « Vous avez reçu un paiement ») que le nom, l’e-mail et le montant correspondent, puis activez.</p>
    ${ADM.perr ? `<p class="bad">${esc(ADM.perr)}</p>` : ''}
    ${ADM.oerr ? `<p class="bad">${esc(ADM.oerr)}</p>` : pend.map(orderRow).join('') || '<p class="mut">Aucun paiement en attente.</p>'}
    ${orphans.length ? `<details open><summary>💳 Paiements PayPal reçus sans dossier (${orphans.length})</summary><p class="mut small">Le relais a reçu ces paiements mais aucun dossier ne correspond à ce compte : le client est probablement connecté avec un autre compte Google que celui de l’achat.</p>${orphans.map(([uid, r]) => `<div class="adm-o"><div class="grow"><b>${esc(r.payerName || '')}</b> <span class="pill-s ${r.active ? 'ok' : ''}">${r.active ? 'Accès actif' : 'Remboursé / annulé'}</span><small>💳 ${esc(r.payerEmail || '')} · ${esc(r.amount || '')} € · réf. ${esc(r.ref || '')}</small><small>👤 Compte Google qui a payé : <b>${esc(acct(uid))}</b></small></div></div>`).join('')}</details>` : ''}
    ${done.length ? `<details><summary>Dossiers traités (${done.length})</summary>${done.slice(0, 30).map(orderRow).join('')}</details>` : ''}</section>
  ${statsCard()}
  ${BILL.api ? `<section class="card" id="adm-msgs"><h2>📨 Messages (${ADM.msgs.length})</h2>
    <p class="mut small">Les messages envoyés depuis le formulaire de contact de l’app. « Répondre » ouvre votre messagerie vers le client, seulement quand vous le décidez.</p>
    ${ADM.mailOn ? '<p class="mut small">📧 Chaque message est aussi envoyé sur votre boîte mail.</p>' : '<p class="mut small">📧 Pas de copie par e-mail : ajoutez RESEND_API_KEY, SUPPORT_TO et SUPPORT_FROM dans Cloudflare (guide : MAINTENANCE.md).</p>'}
    ${ADM.merr ? `<p class="bad">${esc(ADM.merr)}</p>` : ADM.msgs.map(m => `<div class="adm-o adm-m"><div class="grow"><b>${esc(m.category || 'Question')}</b> ${m.priority ? '<span class="pill-s ok">⭐ Membre Plus</span>' : ''}
      ${m.auto ? `<small class="${m.auto === 'found' ? 'warn' : 'ok'}">${m.auto === 'activated' ? '✅ Paiement retrouvé : compte activé automatiquement (' + esc(m.autoInfo || '') + ') · mail de confirmation : ' + (m.confirm === 'sent' ? 'envoyé' : m.confirm === 'off' || !m.confirm ? 'non envoyé (expéditeur CONFIRM_FROM absent)' : esc(m.confirm)) : m.auto === 'found' ? '💳 Paiement PayPal trouvé pour cet e-mail (' + esc(m.autoInfo || '') + ') mais le compte n’a pas pu être relié tout seul : Comptes → « ⭐ À vie »' : '✅ Ce compte a déjà Wouf Plus'}</small>` : ''}
      <small>${m.mail === 'sent' ? '📧 copie envoyée · ' : /^error/.test(m.mail || '') ? '⚠️ e-mail non envoyé (' + esc(m.mail) + ') · ' : ''}✉️ ${esc(m.email || '')} · 🕒 ${m.at ? esc(new Date(m.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })) : ''}</small>
      <p class="adm-txt">${esc(m.message || '')}</p>${m.diagnostics ? `<details><summary>Informations techniques</summary><pre class="adm-txt">${esc(m.diagnostics)}</pre></details>` : ''}</div>
      <div class="btn-row sm"><a class="btn sm primary" href="${esc(replyLink(m))}" target="_blank" rel="noopener">✉️ Répondre</a><button class="btn sm" data-act="adm-copy" data-mail="${esc(m.email || '')}">Copier l’e-mail</button><button class="btn sm danger" data-act="adm-msg-del" data-id="${esc(m.id)}">Supprimer</button></div></div>`).join('') || '<p class="mut">Aucun message.</p>'}</section>` : ''}
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
    remoteStore({ billingEnabled: on }); toast(on ? 'Vente ouverte ✓' : 'Wouf est de nouveau gratuit ✓'); render(true);
  } catch (e) { toast(admErr(e)); }
};
ACT['adm-save-pay'] = async () => {
  const c = {}, bad = [];
  for (const k of Object.keys(REMOTE_FIELDS)) { const v = ($(`#adm-pay [name=${k}]`) || {}).value; if (v === undefined) continue; c[k] = v.trim(); if (/Link$/.test(k) && c[k] && !PAY_LINK.test(c[k])) bad.push(k); }
  if (c.payee && !PAYEE.test(c.payee)) return toast('Adresse PayPal invalide');
  if (c.api && !RELAY_URL.test(c.api)) return toast('Adresse du relais invalide (https://…)');
  if (bad.length) return toast('Lien invalide : collez le lien PayPal (https://www.paypal.com/…)');
  try { await AdminApi.setConfig({ ...c, at: Date.now(), by: CLOUD.user.email }); remoteStore(c); toast('Enregistré ✓'); render(true); } catch (e) { toast(admErr(e)); }
};
ACT['adm-order-ok'] = async ({ id }) => {
  const o = ADM.orders.find(x => x.id === id); if (!o) return;
  if (!(await ask(`Avez-vous bien reçu ${o.price} de ${o.firstName} ${o.lastName} (${o.paypalEmail}) sur PayPal ? Wouf Plus à vie sera activé sur ${o.googleEmail}.`, 'Oui, activer', false))) return;
  try {
    const g = { until: 'lifetime', by: CLOUD.user.email, at: Date.now(), order: id };
    await AdminApi.setGrant(o.uid, g); await AdminApi.setOrder(id, { status: 'done', doneAt: Date.now(), by: CLOUD.user.email });
    o.status = 'done'; const u = (ADM.users || []).find(x => x.uid === o.uid); if (u) u.grant = g;
    toast('Wouf Plus activé ✓'); render(true);
  } catch (e) { toast(admErr(e)); }
};
ACT['adm-order-no'] = async ({ id }) => {
  const o = ADM.orders.find(x => x.id === id); if (!o) return;
  if (!(await ask(`Refuser le dossier de ${o.firstName} ${o.lastName} ? (paiement introuvable). Pensez à lui écrire : ${o.contactEmail}`, 'Refuser'))) return;
  try { await AdminApi.setOrder(id, { status: 'refused', doneAt: Date.now(), by: CLOUD.user.email }); o.status = 'refused'; toast('Dossier refusé'); render(true); } catch (e) { toast(admErr(e)); }
};
ACT['adm-msg-del'] = async ({ id }) => {
  if (!(await ask('Supprimer ce message ? (après réponse, par exemple)', 'Supprimer'))) return;
  try { await AdminApi.supportDelete(id); ADM.msgs = ADM.msgs.filter(m => m.id !== id); toast('Message supprimé'); render(true); } catch (e) { toast(admErr(e)); }
};
