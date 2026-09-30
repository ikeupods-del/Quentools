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
       MIN_EUR          (facultatif) montant minimum accepté, défaut 9.99 (offre récompense)
       GOATCOUNTER_TOKEN (SECRET, facultatif) clé d'API GoatCounter « lecture des statistiques » → statistiques dans l'administration
       GOATCOUNTER_SITE (facultatif) code du site GoatCounter, défaut woufapp
       FIREBASE_PROJECT_ID, FIREBASE_API_KEY  (facultatifs) défaut : projet quentools

   Routes :
     POST /ipn            notification PayPal (serveur à serveur)
     GET  /status         → {active, lifetime, since}                 Authorization: Bearer <jeton Google de l'utilisateur>
     POST /support        {category, message, email, diagnostics}     jeton facultatif (priorité si Wouf Plus actif) → {ok, priority}
     GET  /admin/paid     → {paid: {uid: {…}}}                        Authorization: Bearer <jeton Google du PROPRIÉTAIRE>
     GET  /admin/support  → {messages: [...]}                         idem
     GET  /admin/stats?days=30 → visites par jour, sources, écrans, actions (GoatCounter)   idem (secret GOATCOUNTER_TOKEN)
     POST /admin/support/delete {id}                                  idem
   Facultatif : RESEND_API_KEY (secret), SUPPORT_TO, SUPPORT_FROM → chaque message est aussi transmis par e-mail (resend.com).
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

/* ---------- Notification PayPal (IPN) ---------- */
async function handleIpn(req, env) {
  const raw = await req.text();
  if (!raw || raw.length > 8000) throw new HttpError(400, 'Requête invalide');
  const v = await fetch(IPN_VERIFY, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'wouf-relay' }, body: 'cmd=_notify-validate&' + raw });
  if (!v.ok) throw new HttpError(503, 'Vérification PayPal indisponible');   // PayPal réessaiera
  if ((await v.text()).trim() !== 'VERIFIED') return { ok: false, reason: 'non vérifié' };
  const p = Object.fromEntries(new URLSearchParams(raw)), status = String(p.payment_status || '');
  const [uid, ref] = String(p.custom || '').split('|');
  // Remboursement / litige : on retire l'accès du compte qui avait payé la transaction d'origine.
  if (['Refunded', 'Reversed'].includes(status)) {
    const orig = p.parent_txn_id ? await env.PAID.get('tx:' + p.parent_txn_id) : null, who = orig || (safeUid(uid) ? uid : '');
    if (who) { const cur = JSON.parse((await env.PAID.get('paid:' + who)) || 'null'); if (cur) await env.PAID.put('paid:' + who, JSON.stringify({ ...cur, active: false, revokedAt: new Date().toISOString(), revokedBy: status })); }
    return { ok: true, revoked: !!who };
  }
  if (status !== 'Completed' || p.txn_type !== 'web_accept') return { ok: false, reason: 'ignoré' };
  if (!safeUid(uid) || !p.txn_id) return { ok: false, reason: 'compte inconnu' };
  const to = mail(p.receiver_email || p.business), ok = (await payees(env)).includes(to);
  if (!ok) return { ok: false, reason: 'bénéficiaire inattendu' };
  if (p.mc_currency !== 'EUR' || !(parseFloat(p.mc_gross) >= parseFloat(env.MIN_EUR || '9.99'))) return { ok: false, reason: 'montant' };
  if (await env.PAID.get('tx:' + p.txn_id)) return { ok: true, duplicate: true };
  await env.PAID.put('tx:' + p.txn_id, uid);
  await env.PAID.put('paid:' + uid, JSON.stringify({ active: true, since: new Date().toISOString(), txn: p.txn_id, amount: p.mc_gross, currency: p.mc_currency, ref: ref || '', payerEmail: mail(p.payer_email), payerName: [p.first_name, p.last_name].filter(Boolean).join(' '), paidTo: to }));
  return { ok: true };
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
  let uid = '', priority = false;
  if ((req.headers.get('Authorization') || '').startsWith('Bearer ')) { try { const u = await authed(req, env); uid = u.uid; priority = !!(JSON.parse((await env.PAID.get('paid:' + u.uid)) || 'null') || {}).active; } catch (e) { /* jeton absent ou invalide : message standard */ } }
  const id = String(Date.now()).padStart(13, '0') + '-' + Math.random().toString(36).slice(2, 7);
  const rec = { id, at: new Date().toISOString(), category: String(b.category || 'Question').slice(0, 60), message, email, diagnostics: String(b.diagnostics || '').slice(0, 4000), uid, priority, mail: 'off' };
  if (env.RESEND_API_KEY && env.SUPPORT_TO && env.SUPPORT_FROM) {   // copie par e-mail (facultative) : l'état est gardé avec le message, un échec ne bloque jamais l'enregistrement
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.SUPPORT_FROM, to: [env.SUPPORT_TO], reply_to: email, subject: `${priority ? '[PRIORITAIRE] ' : ''}Wouf – ${rec.category}`, text: `${message}\n\n--- ${priority ? 'MEMBRE PLUS' : 'Demande standard'} ---\nE-mail : ${email}\n${rec.diagnostics}` }) });
      rec.mail = r.ok ? 'sent' : ('error ' + r.status + ' ' + String(await r.text().catch(() => '')).slice(0, 140));
    } catch (e) { rec.mail = 'error réseau'; }
  }
  await env.PAID.put('msg:' + id, JSON.stringify(rec));
  return { ok: true, priority };
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
    return rec && rec.active ? { active: true, lifetime: true, plan: 'lifetime', since: rec.since } : { active: false };
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
    if (path === '/ipn' && req.method === 'POST') {   // serveur PayPal : ni Origin ni CORS ; toujours répondre 200 sauf panne temporaire
      try { await handleIpn(req, env); return new Response('OK', { status: 200 }); }
      catch (e) { return new Response(e.status === 503 ? 'retry' : 'OK', { status: e.status === 503 ? 503 : 200 }); }
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors(env, origin), 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Max-Age': '86400' } });
    if (origin && !origins(env).includes(origin)) return reply(env, req, { error: 'Origine non autorisée' }, 403);
    try { return reply(env, req, await handle(req, env)); }
    catch (e) { return reply(env, req, { error: e.status ? e.message : 'Erreur interne' }, e.status || 500); }
  }
};
