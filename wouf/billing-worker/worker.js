/* Wouf — relais d'activation automatique de Wouf Plus après un paiement PayPal (Cloudflare Worker gratuit).

   Principe : PayPal prévient ce relais à chaque paiement (IPN, « notify_url » ajouté par l'app). Le relais RE-VÉRIFIE le message
   auprès de PayPal, contrôle le bénéficiaire, la devise, le montant, puis enregistre « ce compte Google a payé ». L'app demande ensuite
   son statut avec le jeton Google de l'utilisateur. Aucune clé secrète : rien à protéger dans le code.

   Réglages du Worker (Cloudflare → Workers → Settings) :
     Liaison KV (Bindings → KV namespace)  nom : PAID       (mémorise les paiements)
     Variables :
       ALLOWED_ORIGIN   origines autorisées, séparées par des virgules. Ex. https://woufapp.fr,https://ikeupods-del.github.io
       OWNER_EMAIL      adresse Google du propriétaire (pour la liste des paiements dans l'administration)
       PAYEE            (facultatif) adresse(s) PayPal acceptées en plus de celle choisie dans l'administration, séparées par des virgules
       MIN_EUR          (facultatif) montant minimum accepté pour l'achat à vie, défaut 9.99 (offre récompense)
       MIN_MONTH_EUR, MIN_YEAR_EUR (facultatifs) montant minimum d'un paiement d'abonnement mensuel / annuel, défaut 2.49 / 14.99
       GRACE_DAYS       (facultatif) jours de tolérance après la fin d'une période d'abonnement (retard de prélèvement), défaut 3
       GOATCOUNTER_TOKEN (SECRET, facultatif) clé d'API GoatCounter « lecture des statistiques » → statistiques dans l'administration
       GOATCOUNTER_SITE (facultatif) code du site GoatCounter, défaut woufapp
       FIREBASE_PROJECT_ID, FIREBASE_API_KEY  (facultatifs) défaut : projet quentools

   Routes :
     POST /ipn            notification PayPal (serveur à serveur) : achat à vie (web_accept) et abonnements (subscr_*)
     GET  /status         → {active, lifetime, plan, since, until, accessUntil, cancelled}   Authorization: Bearer <jeton Google de l'utilisateur>
     POST /support        {category, message, email, diagnostics}     jeton facultatif (priorité si Wouf Plus actif) → {ok, priority}
     GET  /admin/paid     → {paid: {uid: {…}}}                        Authorization: Bearer <jeton Google du PROPRIÉTAIRE>
     GET  /admin/support  → {messages: [...]}                         idem
     GET  /admin/stats?days=30 → visites par jour, sources, écrans, actions (GoatCounter)   idem (secret GOATCOUNTER_TOKEN)
     POST /admin/support/delete {id}                                  idem
   Facultatif : RESEND_API_KEY (secret), SUPPORT_TO, SUPPORT_FROM → chaque message est aussi transmis par e-mail (resend.com).
   Stripe (facultatif) : STRIPE_WEBHOOK_SECRET (SECRET, « whsec_… ») → route POST /stripe à déclarer dans Stripe (Développeurs → Webhooks,
   événements checkout.session.completed, invoice.paid, customer.subscription.updated, customer.subscription.deleted, charge.refunded).
   MIN_STRIPE_LIFETIME / MIN_STRIPE_YEAR (centimes, défaut 2999 / 1499).
   Abonnement annuel : déclencheur Cron (Cloudflare → Worker → Settings → Triggers → Cron, ex. « 0 8 * * * ») → rappel par e-mail
   entre 30 et 60 jours avant chaque reconduction (obligation d'information, Code de la consommation art. L215-1). Nécessite RESEND_API_KEY et CONFIRM_FROM.
   Documentation : wouf/docs/MAINTENANCE.md */

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const IPN_VERIFY = 'https://ipnpb.paypal.com/cgi-bin/webscr';
const DEFAULT_KEY = 'AIzaSyA-JS7hnSQXeNXnAPqbF3MV8rkPQ5_JVY8';   // clé web Firebase : publique par conception (voir config.js)
let JWKS = null, JWKS_AT = 0, CONF = null, CONF_AT = 0;

const b64uBytes = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const b64uJson = s => JSON.parse(new TextDecoder().decode(b64uBytes(s)));
const origins = env => String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const cors = (env, origin) => ({ 'Access-Control-Allow-Origin': origins(env).includes(origin) ? origin : (origins(env)[0] || ''), 'Vary': 'Origin' });
const reply = (env, req, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors(env, req.headers.get('Origin')) } });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const safeUid = uid => /^[A-Za-z0-9_-]{6,128}$/.test(uid || '');
const mail = s => String(s || '').trim().toLowerCase();
const day = d => d.toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return day(d); };
const addPeriod = (iso, per) => { const d = new Date(iso + 'T12:00:00Z'), m = d.getUTCMonth() + (per === 'y' ? 12 : 1), dd = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(m); d.setUTCDate(Math.min(dd, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate())); return day(d); };
const grace = env => Math.max(0, parseInt(env.GRACE_DAYS || '3', 10) || 0);
const isLifetime = rec => !rec.plan || rec.plan === 'lifetime';
/* Accès en cours : achat à vie actif, ou abonnement payé jusqu'à `until` (plus quelques jours de tolérance). */
const recActive = (rec, env) => !!(rec && rec.active && (isLifetime(rec) || (rec.until && addDays(rec.until, grace(env)) >= day(new Date()))));

/* ---------- Vérification du jeton Firebase (RS256) ---------- */
async function getJwks() {
  if (JWKS && Date.now() - JWKS_AT < 3600e3) return JWKS;
  const r = await fetch(JWKS_URL); if (!r.ok) throw new HttpError(503, 'Vérification d’identité indisponible');
  JWKS = (await r.json()).keys || []; JWKS_AT = Date.now(); return JWKS;
}
async function verifyToken(token, env) {
  const project = env.FIREBASE_PROJECT_ID || 'quentools-adca1', parts = String(token || '').split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Connexion requise');
  let header, payload; try { header = b64uJson(parts[0]); payload = b64uJson(parts[1]); } catch (e) { throw new HttpError(401, 'Jeton invalide'); }
  if (header.alg !== 'RS256' || !header.kid) throw new HttpError(401, 'Jeton invalide');
  const jwk = (await getJwks()).find(k => k.kid === header.kid); if (!jwk) { JWKS = null; throw new HttpError(401, 'Jeton inconnu'); }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  const now = Math.floor(Date.now() / 1000);
  if (!ok || payload.aud !== project || payload.iss !== 'https://securetoken.google.com/' + project || !payload.sub || payload.exp <= now || payload.iat > now + 60) throw new HttpError(401, 'Jeton invalide ou expiré');
  return { uid: payload.sub, email: payload.email || '', verified: payload.email_verified === true, name: payload.name || '' };
}
async function authed(req, env) {
  const h = req.headers.get('Authorization') || ''; if (!h.startsWith('Bearer ')) throw new HttpError(401, 'Connexion requise');
  return verifyToken(h.slice(7), env);
}

/* ---------- Réglages publics de l'administration (adresse PayPal choisie), lus chez Firebase ---------- */
async function siteConfig(env) {
  if (CONF && Date.now() - CONF_AT < Number(env.CONF_TTL_MS || 60e3)) return CONF;
  const project = env.FIREBASE_PROJECT_ID || 'quentools-adca1', key = env.FIREBASE_API_KEY || DEFAULT_KEY;
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/wouf_admin/config?key=${key}`);
    const f = r.ok ? ((await r.json()).fields || {}) : {};
    CONF = { payee: mail((f.payee || {}).stringValue) }; CONF_AT = Date.now();
  } catch (e) { CONF = CONF || { payee: '' }; }
  return CONF;
}
async function payees(env) {
  const list = String(env.PAYEE || '').split(',').map(mail).filter(Boolean), c = await siteConfig(env);
  if (c.payee) list.push(c.payee); return list;
}

/* ---------- E-mail de confirmation au client (Resend ; expéditeur CONFIRM_FROM = adresse d'un domaine vérifié chez Resend) ---------- */
async function confirmMail(env, to, name, plan) {
  if (!env.RESEND_API_KEY || !env.CONFIRM_FROM) return 'off';
  if (!/^\S+@\S+\.\S+$/.test(to || '')) return 'error adresse';
  const hello = name ? 'Bonjour ' + String(name).split(' ')[0] + ',' : 'Bonjour,';
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.CONFIRM_FROM, to: [to], ...(env.SUPPORT_TO ? { reply_to: env.SUPPORT_TO } : {}), subject: 'Wouf Plus est activé ✅',
        text: `${hello}\n\nMerci ! Votre accès Wouf Plus (${plan === 'monthly' ? 'abonnement mensuel' : plan === 'yearly' ? 'abonnement annuel' : 'à vie'}) est activé sur votre compte Google.${plan === 'monthly' || plan === 'yearly' ? '\nVous pouvez résilier à tout moment depuis Wouf (Wouf Plus → Gérer mon abonnement) ou depuis votre compte PayPal.' : ''}\n\nSi l’app est déjà ouverte, touchez « Actualiser » ou rouvrez-la : toutes les fonctions Plus sont disponibles.\nUn souci ? Répondez simplement à ce message.\n\nL’équipe Wouf\nhttps://woufapp.fr` }) });
    return r.ok ? 'sent' : 'error ' + r.status;
  } catch (e) { return 'error réseau'; }
}
async function hasGrant(env, idToken, uid) {   // Plus offert depuis l'administration (Firestore wouf_grants) : lu avec le jeton du client lui-même (les règles le lui permettent)
  try {
    const project = env.FIREBASE_PROJECT_ID || 'quentools-adca1', r = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/wouf_grants/${uid}`, { headers: { Authorization: 'Bearer ' + idToken } });
    if (!r.ok) return false;
    const until = (((await r.json()).fields || {}).until || {}).stringValue || '';
    return until === 'lifetime' || (/^\d{4}-\d{2}-\d{2}$/.test(until) && until >= new Date().toISOString().slice(0, 10));
  } catch (e) { return false; }
}
async function findPayments(env, emails) {   // paiements PayPal (actifs ou non) dont l'adresse PayPal du payeur correspond à l'une de ces adresses
  const wanted = emails.map(mail).filter(Boolean), out = [];
  if (!wanted.length) return out;
  const list = await env.PAID.list({ prefix: 'paid:', limit: 1000 });
  for (const k of list.keys) { const r = JSON.parse((await env.PAID.get(k.name)) || 'null'); if (r && !r.linkedFrom && wanted.includes(mail(r.payerEmail))) out.push({ uid: k.name.slice(5), rec: r }); }
  return out;
}

/* ---------- Notification PayPal (IPN) ---------- */
async function handleIpn(req, env) {
  const raw = await req.text();
  if (!raw || raw.length > 8000) throw new HttpError(400, 'Requête invalide');
  const v = await fetch(IPN_VERIFY, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'wouf-relay' }, body: 'cmd=_notify-validate&' + raw });
  if (!v.ok) throw new HttpError(503, 'Vérification PayPal indisponible');   // PayPal réessaiera
  if ((await v.text()).trim() !== 'VERIFIED') return { ok: false, reason: 'non vérifié' };
  const p = Object.fromEntries(new URLSearchParams(raw)), status = String(p.payment_status || '');
  const [uid, ref, per] = String(p.custom || '').split('|');
  // Remboursement / litige : on retire l'accès du compte qui avait payé la transaction d'origine.
  if (['Refunded', 'Reversed'].includes(status)) {
    const orig = p.parent_txn_id ? await env.PAID.get('tx:' + p.parent_txn_id) : null, who = orig || (safeUid(uid) ? uid : '');
    if (who) {
      const cur = JSON.parse((await env.PAID.get('paid:' + who)) || 'null'); if (cur) await env.PAID.put('paid:' + who, JSON.stringify({ ...cur, active: false, revokedAt: new Date().toISOString(), revokedBy: status }));
      for (const k of (await env.PAID.list({ prefix: 'paid:', limit: 1000 })).keys) {   // comptes reliés à ce paiement par le formulaire de contact
        const l = JSON.parse((await env.PAID.get(k.name)) || 'null'); if (l && l.linkedFrom === who && l.active) await env.PAID.put(k.name, JSON.stringify({ ...l, active: false, revokedAt: new Date().toISOString(), revokedBy: status }));
      }
    }
    return { ok: true, revoked: !!who };
  }
  if (String(p.txn_type || '').startsWith('subscr_')) return handleSubscription(p, env, uid, ref, per);
  if (status !== 'Completed' || p.txn_type !== 'web_accept') return { ok: false, reason: 'ignoré' };
  if (!safeUid(uid) || !p.txn_id) return { ok: false, reason: 'compte inconnu' };
  const to = mail(p.receiver_email || p.business), ok = (await payees(env)).includes(to);
  if (!ok) return { ok: false, reason: 'bénéficiaire inattendu' };
  if (p.mc_currency !== 'EUR' || !(parseFloat(p.mc_gross) >= parseFloat(env.MIN_EUR || '9.99'))) return { ok: false, reason: 'montant' };
  if (await env.PAID.get('tx:' + p.txn_id)) return { ok: true, duplicate: true };
  await env.PAID.put('tx:' + p.txn_id, uid);
  await env.PAID.put('paid:' + uid, JSON.stringify({ active: true, plan: 'lifetime', since: new Date().toISOString(), txn: p.txn_id, amount: p.mc_gross, currency: p.mc_currency, ref: ref || '', payerEmail: mail(p.payer_email), payerName: [p.first_name, p.last_name].filter(Boolean).join(' '), paidTo: to }));
  const rec = JSON.parse(await env.PAID.get('paid:' + uid)), state = await confirmMail(env, rec.payerEmail, rec.payerName, 'lifetime');
  await env.PAID.put('paid:' + uid, JSON.stringify({ ...rec, confirmMail: state }));
  return { ok: true };
}

/* ---------- Abonnements PayPal (bouton « _xclick-subscriptions ») ----------
   custom = « uid|référence|m » (mensuel) ou « uid|référence|y » (annuel). Chaque paiement prolonge l'accès d'une période ;
   la résiliation (subscr_cancel) laisse l'accès jusqu'à la fin de la période payée. Un achat à vie n'est jamais remplacé. */
async function handleSubscription(p, env, uid, ref, per) {
  const sid = String(p.subscr_id || ''), t = String(p.txn_type);
  if (!/^[A-Za-z0-9-]{3,40}$/.test(sid)) return { ok: false, reason: 'abonnement inconnu' };
  if (t === 'subscr_cancel' || t === 'subscr_eot') {   // on retrouve le compte par l'identifiant d'abonnement enregistré au paiement (jamais par « custom »)
    const who = await env.PAID.get('sub:' + sid), cur = who ? JSON.parse((await env.PAID.get('paid:' + who)) || 'null') : null;
    if (!cur || cur.subscrId !== sid) return { ok: false, reason: 'abonnement inconnu' };
    await env.PAID.put('paid:' + who, JSON.stringify({ ...cur, cancelled: true, [t === 'subscr_cancel' ? 'cancelledAt' : 'endedAt']: new Date().toISOString() }));
    return { ok: true, cancelled: true };
  }
  if (t !== 'subscr_payment' || String(p.payment_status || '') !== 'Completed') return { ok: false, reason: 'ignoré' };   // inscription, échec (PayPal réessaie), modification
  if (!safeUid(uid) || !p.txn_id || !['m', 'y'].includes(per)) return { ok: false, reason: 'compte inconnu' };
  const to = mail(p.receiver_email || p.business);
  if (!(await payees(env)).includes(to)) return { ok: false, reason: 'bénéficiaire inattendu' };
  const min = per === 'y' ? (env.MIN_YEAR_EUR || '14.99') : (env.MIN_MONTH_EUR || '2.49');
  if (p.mc_currency !== 'EUR' || !(parseFloat(p.mc_gross) >= parseFloat(min))) return { ok: false, reason: 'montant' };
  if (await env.PAID.get('tx:' + p.txn_id)) return { ok: true, duplicate: true };
  await env.PAID.put('tx:' + p.txn_id, uid);
  const cur = JSON.parse((await env.PAID.get('paid:' + uid)) || 'null');
  if (cur && cur.active && isLifetime(cur)) { await env.PAID.put('sub:' + sid, uid); return { ok: true, lifetime: true }; }   // déjà à vie : rien à prolonger
  const today = day(new Date()), same = cur && cur.subscrId === sid && recActive(cur, env);
  const base = same && cur.until > today ? cur.until : today, until = addPeriod(base, per), first = !same;
  const rec = { active: true, plan: per === 'y' ? 'yearly' : 'monthly', since: same ? cur.since : new Date().toISOString(), until, subscrId: sid, cancelled: false,
    txn: p.txn_id, amount: p.mc_gross, currency: p.mc_currency, ref: ref || (cur && cur.ref) || '', payerEmail: mail(p.payer_email), payerName: [p.first_name, p.last_name].filter(Boolean).join(' '), paidTo: to, lastPaymentAt: new Date().toISOString() };
  await env.PAID.put('sub:' + sid, uid);
  if (first) rec.confirmMail = await confirmMail(env, rec.payerEmail, rec.payerName, rec.plan);
  await env.PAID.put('paid:' + uid, JSON.stringify(rec));
  return { ok: true, until };
}

/* ---------- Stripe : paiements par carte (liens de paiement), signature vérifiée avec le secret du webhook ---------- */
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function stripeVerify(raw, header, secret) {
  const parts = Object.fromEntries(String(header || '').split(',').map(x => x.split('=').map(y => y.trim())).filter(x => x.length === 2 && x[0] !== 'v1'));
  const sigs = String(header || '').split(',').map(x => x.trim()).filter(x => x.startsWith('v1=')).map(x => x.slice(3)), t = parseInt(parts.t, 10);
  if (!secret || !t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const want = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(t + '.' + raw)));
  const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };   // comparaison à temps constant
  return sigs.some(s => same(s, want));
}
const unixDay = s => day(new Date(s * 1000));
async function handleStripe(req, env) {
  const raw = await req.text();
  if (!raw || raw.length > 200000) throw new HttpError(400, 'Requête invalide');
  if (!(await stripeVerify(raw, req.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET))) throw new HttpError(400, 'Signature invalide');
  const ev = JSON.parse(raw), o = (ev.data || {}).object || {};
  if (await env.PAID.get('evt:' + ev.id)) return { ok: true, duplicate: true };
  const done = async r => { await env.PAID.put('evt:' + ev.id, '1', { expirationTtl: 60 * 864e2 }); return r; };
  const get = async uid => JSON.parse((await env.PAID.get('paid:' + uid)) || 'null');
  if (ev.type === 'checkout.session.completed') {
    const uid = o.client_reference_id, amount = +o.amount_total || 0, mail0 = mail((o.customer_details || {}).email || o.customer_email), name = (o.customer_details || {}).name || '';
    if (!safeUid(uid) || o.payment_status !== 'paid' || String(o.currency).toLowerCase() !== 'eur') return done({ ok: false, reason: 'ignoré' });
    const cur = await get(uid), base = { amount: (amount / 100).toFixed(2), currency: 'EUR', payerEmail: mail0, payerName: name, provider: 'stripe', txn: o.id, since: new Date().toISOString() };
    if (o.mode === 'subscription') {
      if (amount < +(env.MIN_STRIPE_YEAR || 1499) || !o.subscription) return done({ ok: false, reason: 'montant' });
      await env.PAID.put('sub:' + o.subscription, uid);
      if (cur && cur.active && isLifetime(cur)) return done({ ok: true, lifetime: true });
      const until = cur && cur.subscrId === o.subscription && cur.until > addDays(day(new Date()), 300) ? cur.until : addPeriod(day(new Date()), 'y');
      const rec = { ...base, active: true, plan: 'yearly', until, subscrId: o.subscription, cancelled: false };
      rec.confirmMail = await confirmMail(env, mail0, name, 'yearly'); await env.PAID.put('paid:' + uid, JSON.stringify(rec)); return done({ ok: true, until });
    }
    if (amount < +(env.MIN_STRIPE_LIFETIME || 2999)) return done({ ok: false, reason: 'montant' });
    if (o.payment_intent) await env.PAID.put('pi:' + o.payment_intent, uid);
    const rec = { ...base, active: true, plan: 'lifetime' }; rec.confirmMail = await confirmMail(env, mail0, name, 'lifetime');
    await env.PAID.put('paid:' + uid, JSON.stringify(rec)); return done({ ok: true });
  }
  if (ev.type === 'invoice.paid' && o.subscription) {   // renouvellement (et premier paiement) : accès jusqu'à la fin de la période facturée
    const uid = await env.PAID.get('sub:' + o.subscription), cur = uid ? await get(uid) : null;
    const end = Math.max(0, ...((o.lines || {}).data || []).map(l => +((l.period || {}).end) || 0)); if (!cur || !end || isLifetime(cur)) return done({ ok: false, reason: 'ignoré' });
    const until = unixDay(end); await env.PAID.put('paid:' + uid, JSON.stringify({ ...cur, active: true, until: until > (cur.until || '') ? until : cur.until, lastPaymentAt: new Date().toISOString() }));
    return done({ ok: true, until });
  }
  if ((ev.type === 'customer.subscription.updated' || ev.type === 'customer.subscription.deleted') && o.id) {
    const uid = await env.PAID.get('sub:' + o.id), cur = uid ? await get(uid) : null; if (!cur || cur.subscrId !== o.id) return done({ ok: false, reason: 'ignoré' });
    const cancelled = ev.type === 'customer.subscription.deleted' || !!o.cancel_at_period_end;
    await env.PAID.put('paid:' + uid, JSON.stringify({ ...cur, cancelled, ...(o.current_period_end && !cancelled ? { until: unixDay(o.current_period_end) } : {}) })); return done({ ok: true, cancelled });
  }
  if (ev.type === 'charge.refunded' && o.payment_intent) {
    const uid = await env.PAID.get('pi:' + o.payment_intent), cur = uid ? await get(uid) : null;
    if (cur && o.refunded) await env.PAID.put('paid:' + uid, JSON.stringify({ ...cur, active: false, revokedAt: new Date().toISOString(), revokedBy: 'Refunded' }));
    return done({ ok: true, revoked: !!(cur && o.refunded) });
  }
  return done({ ok: true, ignored: ev.type });
}

/* ---------- Rappel avant la reconduction d'un abonnement annuel (tâche planifiée quotidienne) ---------- */
const frDate = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
async function renewalReminders(env) {
  if (!env.RESEND_API_KEY || !env.CONFIRM_FROM) return { sent: 0, off: true };
  const today = day(new Date()), from = addDays(today, 30), to = addDays(today, 60); let sent = 0;
  for (const k of (await env.PAID.list({ prefix: 'paid:', limit: 1000 })).keys) {
    const rec = JSON.parse((await env.PAID.get(k.name)) || 'null');
    if (!rec || !rec.active || rec.plan !== 'yearly' || rec.cancelled || !rec.until || rec.until < from || rec.until > to || rec.remindedFor === rec.until) continue;
    let state = 'error adresse';
    if (/^\S+@\S+\.\S+$/.test(rec.payerEmail || '')) {
      const hello = rec.payerName ? 'Bonjour ' + String(rec.payerName).split(' ')[0] + ',' : 'Bonjour,';
      try {
        const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.CONFIRM_FROM, to: [rec.payerEmail], ...(env.SUPPORT_TO ? { reply_to: env.SUPPORT_TO } : {}), subject: 'Votre abonnement Wouf Plus sera renouvelé le ' + frDate(rec.until),
            text: `${hello}\n\nVotre abonnement annuel Wouf Plus sera reconduit automatiquement le ${frDate(rec.until)}${rec.amount ? ', pour ' + String(rec.amount).replace('.', ',') + ' €' : ''}, sauf si vous le résiliez avant cette date.\n\nPour résilier : dans Wouf, Wouf Plus → « Gérer mon abonnement », ou dans votre compte PayPal (Paramètres → Paiements → Gérer les paiements automatiques). Votre accès reste actif jusqu’au ${frDate(rec.until)}.\n\nUne question ? Répondez simplement à ce message.\n\nL’équipe Wouf\nhttps://woufapp.fr` }) });
        state = r.ok ? 'sent' : 'error ' + r.status;
      } catch (e) { state = 'error réseau'; }
    }
    if (state === 'sent') sent++;
    await env.PAID.put(k.name, JSON.stringify({ ...rec, remindedFor: rec.until, reminderMail: state }));
  }
  return { sent };
}

/* ---------- Formulaire de contact : messages rangés dans le KV, lus dans l'administration ---------- */
const ownerOnly = async (req, env) => {
  const u = await authed(req, env);
  if (!u.verified || !env.OWNER_EMAIL || mail(u.email) !== mail(env.OWNER_EMAIL)) throw new HttpError(403, 'Réservé au propriétaire');
  return u;
};
async function handleSupport(req, env) {
  const b = await req.json().catch(() => ({})), message = String(b.message || '').trim(), email = String(b.email || '').trim();
  if (message.length < 10 || message.length > 4000 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 200) throw new HttpError(400, 'Message ou e-mail invalide');
  // Anti-spam : 5 messages par heure et par adresse IP
  const ip = req.headers.get('CF-Connecting-IP') || 'inconnue', hour = Math.floor(Date.now() / 3600e3), rk = `rl:${ip}:${hour}`, n = parseInt((await env.PAID.get(rk)) || '0', 10);
  if (n >= 5) throw new HttpError(429, 'Trop de messages : réessayez dans une heure');
  await env.PAID.put(rk, String(n + 1), { expirationTtl: 7200 });
  let uid = '', priority = false, who = null;
  if ((req.headers.get('Authorization') || '').startsWith('Bearer ')) { try { who = await authed(req, env); uid = who.uid; priority = recActive(JSON.parse((await env.PAID.get('paid:' + who.uid)) || 'null'), env) || (who.verified && !!env.OWNER_EMAIL && mail(who.email) === mail(env.OWNER_EMAIL)) || await hasGrant(env, (req.headers.get('Authorization') || '').slice(7), who.uid); } catch (e) { /* jeton absent ou invalide : message standard */ } }
  // Contrôle automatique du paiement : si l'adresse Google vérifiée du client est celle de son paiement PayPal, son compte est activé tout de suite
  let auto = '', autoInfo = '', confirm = '';
  try {
    if (priority) auto = 'already';
    else {
      const found = await findPayments(env, [who && who.verified ? who.email : '', email]), hit = found.find(f => recActive(f.rec, env));
      if (hit && who && who.verified && mail(hit.rec.payerEmail) === mail(who.email)) {
        await env.PAID.put('paid:' + uid, JSON.stringify({ ...hit.rec, active: true, since: new Date().toISOString(), linkedFrom: hit.uid, via: 'contact' }));
        auto = 'activated'; priority = true; confirm = await confirmMail(env, who.email, hit.rec.payerName, hit.rec.plan);
        autoInfo = `${hit.rec.amount || ''} € · réf. ${hit.rec.ref || ''}`;
      } else if (found.length) { auto = 'found'; const f = found[0]; autoInfo = `${f.rec.payerName || ''} · ${f.rec.amount || ''} € · réf. ${f.rec.ref || ''} · ${recActive(f.rec, env) ? 'actif' : 'remboursé, annulé ou expiré'}`; }
    }
  } catch (e) { auto = ''; }
  const id = String(Date.now()).padStart(13, '0') + '-' + Math.random().toString(36).slice(2, 7);
  const rec = { id, at: new Date().toISOString(), category: String(b.category || 'Question').slice(0, 60), message, email, diagnostics: String(b.diagnostics || '').slice(0, 4000), uid, priority, mail: 'off', ...(auto ? { auto, autoInfo, ...(confirm ? { confirm } : {}) } : {}) };
  if (env.RESEND_API_KEY && env.SUPPORT_TO && env.SUPPORT_FROM) {   // copie par e-mail (facultative) : l'état est gardé avec le message, un échec ne bloque jamais l'enregistrement
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.SUPPORT_FROM, to: [env.SUPPORT_TO], reply_to: email, subject: `${priority ? '[PRIORITAIRE] ' : ''}Wouf – ${rec.category}`, text: `${message}\n\n--- ${priority ? 'MEMBRE PLUS' : 'Demande standard'} ---\nE-mail : ${email}\n${auto === 'activated' ? '✅ Paiement retrouvé : compte activé automatiquement (' + autoInfo + ')\n' : auto === 'found' ? '💳 Paiement trouvé pour cet e-mail (' + autoInfo + ') : compte à relier à la main\n' : ''}${rec.diagnostics}` }) });
      rec.mail = r.ok ? 'sent' : ('error ' + r.status + ' ' + String(await r.text().catch(() => '')).slice(0, 140));
    } catch (e) { rec.mail = 'error réseau'; }
  }
  await env.PAID.put('msg:' + id, JSON.stringify(rec));
  return { ok: true, priority, activated: auto === 'activated' };
}

/* ---------- Statistiques de visite : lues chez GoatCounter avec une clé qui reste ici (secret Cloudflare) ---------- */
let STATS = null, STATS_AT = 0, STATS_KEY = '';
async function handleStats(req, env) {
  await ownerOnly(req, env);
  if (!env.GOATCOUNTER_TOKEN) throw new HttpError(501, 'Statistiques non configurées : ajoutez le secret GOATCOUNTER_TOKEN dans Cloudflare');
  const days = Math.min(90, Math.max(1, parseInt(new URL(req.url).searchParams.get('days') || '30', 10) || 30)), site = /^[a-z0-9-]{2,50}$/.test(env.GOATCOUNTER_SITE || 'woufapp') ? (env.GOATCOUNTER_SITE || 'woufapp') : 'woufapp';
  const key = site + ':' + days + ':' + new Date().toISOString().slice(0, 13);   // mémoire d'une heure : ménage l'API de GoatCounter
  if (STATS && STATS_KEY === key && Date.now() - STATS_AT < 60e3) return STATS;
  const end = new Date(), start = new Date(Date.now() - (days - 1) * 864e5); start.setUTCHours(0, 0, 0, 0); end.setUTCHours(23, 59, 59, 0);
  const q = `start=${encodeURIComponent(start.toISOString().slice(0, 19) + 'Z')}&end=${encodeURIComponent(end.toISOString().slice(0, 19) + 'Z')}`, base = `https://${site}.goatcounter.com/api/v0/stats/`;
  const call = async (p, extra = '') => {
    const r = await fetch(base + p + '?' + q + extra, { headers: { Authorization: 'Bearer ' + env.GOATCOUNTER_TOKEN, Accept: 'application/json' } });
    if (r.status === 401 || r.status === 403) throw new HttpError(502, 'GoatCounter refuse la clé (droit « lecture des statistiques » ?)');
    if (!r.ok) throw new HttpError(502, 'GoatCounter indisponible (' + r.status + ')');
    return r.json();
  };
  const [t, h, rf] = await Promise.all([call('total'), call('hits', '&limit=40'), call('toprefs', '&limit=10')]);
  const num = x => Number(x) || 0;
  const perDay = (t.stats || []).map(d => ({ day: String(d.day || '').slice(0, 10), visits: num(d.daily != null ? d.daily : (d.hourly || []).reduce((a, b) => a + num(b), 0)) })).filter(d => d.day);
  const hits = (h.hits || []).map(x => ({ path: String(x.path || ''), count: num(x.count), event: !!x.event }));
  STATS = { days, from: start.toISOString().slice(0, 10), total: num(t.total), totalEvents: num(t.total_events), perDay,
    pages: hits.filter(x => !x.event).sort((a, b) => b.count - a.count).slice(0, 10), events: hits.filter(x => x.event).sort((a, b) => b.count - a.count).slice(0, 12),
    refs: (rf.stats || []).map(x => ({ name: String(x.name || x.ref || '(direct)'), count: num(x.count) })).filter(x => x.count).sort((a, b) => b.count - a.count).slice(0, 8) };
  STATS_KEY = key; STATS_AT = Date.now(); return STATS;
}

/* ---------- Routes ---------- */
async function handle(req, env) {
  const path = new URL(req.url).pathname;
  if (path === '/admin/stats' && req.method === 'GET') return handleStats(req, env);
  if (path === '/support' && req.method === 'POST') return handleSupport(req, env);
  if (path === '/admin/support' && req.method === 'GET') {
    await ownerOnly(req, env);
    const list = await env.PAID.list({ prefix: 'msg:', limit: 200 }), out = [];
    for (const k of list.keys) { const r = JSON.parse((await env.PAID.get(k.name)) || 'null'); if (r) out.push(r); }
    return { mailOn: !!(env.RESEND_API_KEY && env.SUPPORT_TO && env.SUPPORT_FROM), messages: out.sort((a, c) => String(c.id).localeCompare(String(a.id))) };
  }
  if (path === '/admin/support/delete' && req.method === 'POST') {
    await ownerOnly(req, env); const { id } = await req.json().catch(() => ({}));
    if (!/^\d{13}-[a-z0-9]{1,8}$/.test(id || '')) throw new HttpError(400, 'Requête invalide');
    await env.PAID.delete('msg:' + id); return { ok: true };
  }
  if (path === '/status' && req.method === 'GET') {
    const u = await authed(req, env), rec = JSON.parse((await env.PAID.get('paid:' + u.uid)) || 'null');
    if (!recActive(rec, env)) return rec && rec.active && rec.until ? { active: false, plan: rec.plan, expired: rec.until } : { active: false };
    return isLifetime(rec) ? { active: true, lifetime: true, plan: 'lifetime', since: rec.since }
      : { active: true, lifetime: false, plan: rec.plan, since: rec.since, until: rec.until, accessUntil: addDays(rec.until, grace(env)), cancelled: !!rec.cancelled };
  }
  if (path === '/admin/paid' && req.method === 'GET') {
    await ownerOnly(req, env);
    const out = {}, list = await env.PAID.list({ prefix: 'paid:', limit: 1000 });
    for (const k of list.keys) { const r = JSON.parse((await env.PAID.get(k.name)) || 'null'); if (r) out[k.name.slice(5)] = r; }
    return { paid: out };
  }
  throw new HttpError(404, 'Introuvable');
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin'), path = new URL(req.url).pathname;
    if (path === '/stripe' && req.method === 'POST') {   // serveur Stripe : signature obligatoire ; 400 = Stripe réessaiera
      try { return new Response(JSON.stringify(await handleStripe(req, env)), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
      catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: e.status || 500, headers: { 'Content-Type': 'application/json' } }); }
    }
    if (path === '/ipn' && req.method === 'POST') {   // serveur PayPal : ni Origin ni CORS ; toujours répondre 200 sauf panne temporaire
      try { await handleIpn(req, env); return new Response('OK', { status: 200 }); }
      catch (e) { return new Response(e.status === 503 ? 'retry' : 'OK', { status: e.status === 503 ? 503 : 200 }); }
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors(env, origin), 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Max-Age': '86400' } });
    if (origin && !origins(env).includes(origin)) return reply(env, req, { error: 'Origine non autorisée' }, 403);
    try { return reply(env, req, await handle(req, env)); }
    catch (e) { return reply(env, req, { error: e.status ? e.message : 'Erreur interne' }, e.status || 500); }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(renewalReminders(env)); }
};
