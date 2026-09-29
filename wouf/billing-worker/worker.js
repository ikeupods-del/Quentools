/* Wouf — relais d'achat « à vie » et d'assistance prioritaire (Cloudflare Worker, gratuit, sans base de données).

   Principe : l'achat est lié au COMPTE GOOGLE de l'acheteur (uid Firebase, vérifié côté serveur par la signature du jeton).
   Stripe est la source de vérité : le statut est relu à la demande (aucune donnée n'est stockée ici).

   Variables du Worker (Cloudflare → Workers → Settings → Variables) :
     STRIPE_SECRET_KEY   (secret)  clé secrète Stripe (sk_test_… puis sk_live_…)
     PRICE_LIFETIME      id du prix Stripe à paiement UNIQUE de 19,99 € (price_…)
     PRICE_LIFETIME_REWARD (facultatif) id du prix Stripe réduit de l’offre récompense (9,99 €), accordé seulement si la
                         progression sauvegardée du compte montre TOUTES les leçons gratuites terminées
     ALLOWED_ORIGIN      origines autorisées, séparées par des virgules. Ex. https://ikeupods-del.github.io
     FIREBASE_PROJECT_ID (facultatif) défaut : quentools-adca1
     RESEND_API_KEY      (secret, facultatif) envoi des e-mails d'assistance via Resend (resend.com)
     SUPPORT_TO          adresse qui reçoit les demandes d'assistance
     SUPPORT_FROM        expéditeur vérifié dans Resend (ex. Wouf <support@votre-domaine.fr>)

   Routes (toutes en JSON) :
     POST /checkout {returnUrl, offer?:'lecons'}   → {url}                       Authorization: Bearer <jeton Firebase>
     GET  /status[?session_id=cs_…]                → {active, lifetime, plan, since}   Authorization: Bearer <jeton Firebase>
     POST /support {category,message,email,diagnostics} → {ok, priority}         jeton facultatif (donne la priorité si achat vérifié)
   Documentation : wouf/docs/MAINTENANCE.md */

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let JWKS = null, JWKS_AT = 0;

const b64uBytes = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const b64uJson = s => JSON.parse(new TextDecoder().decode(b64uBytes(s)));
const origins = env => String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const cors = (env, origin) => ({ 'Access-Control-Allow-Origin': origins(env).includes(origin) ? origin : (origins(env)[0] || ''), 'Vary': 'Origin' });
const reply = (env, req, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors(env, req.headers.get('Origin')) } });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

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
  return { uid: payload.sub, email: payload.email || '', name: payload.name || '' };
}
async function authed(req, env) {
  const h = req.headers.get('Authorization') || ''; if (!h.startsWith('Bearer ')) throw new HttpError(401, 'Connexion requise');
  return verifyToken(h.slice(7), env);
}

/* ---------- Stripe ---------- */
const form = o => { const p = new URLSearchParams(); const add = (k, v) => { if (v && typeof v === 'object') Object.entries(v).forEach(([a, b]) => add(`${k}[${a}]`, b)); else p.append(k, v); }; Object.entries(o).forEach(([k, v]) => add(k, v)); return p; };
async function stripe(env, method, path, body) {
  const r = await fetch('https://api.stripe.com/v1' + path, { method, headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body ? form(body) : undefined });
  const j = await r.json(); if (!r.ok) throw new HttpError(502, (j.error && j.error.message) || 'Erreur de paiement (' + r.status + ')'); return j;
}
const safeUid = uid => /^[A-Za-z0-9_-]{6,128}$/.test(uid);
/* Achat actif = paiement réussi pour ce compte, non remboursé, non contesté. */
async function paidFor(env, uid) {
  if (!safeUid(uid)) return { active: false };
  const q = `metadata['uid']:'${uid}' AND metadata['product']:'wouf-plus' AND status:'succeeded'`;
  const res = await stripe(env, 'GET', '/payment_intents/search?' + new URLSearchParams({ query: q, limit: '10' }).toString() + '&expand[]=data.latest_charge');
  const pi = (res.data || []).find(p => p.latest_charge && typeof p.latest_charge === 'object' && !p.latest_charge.refunded && !p.latest_charge.disputed);
  return pi ? { active: true, lifetime: true, plan: 'lifetime', since: new Date(pi.created * 1000).toISOString() } : { active: false };
}
/* ---------- Offre récompense : lecture de la progression sauvegardée (Firestore, avec le jeton de l'utilisateur) ---------- */
// Doit rester identique aux leçons « free: true » de l'app (le test `check` compare les deux listes).
const FREE_LESSONS = { dog: ['marqueur', 'assis', 'proprete', 'coucher', 'rappel', 'laisse'], cat: ['c-litiere', 'c-griffoir', 'c-jeu', 'c-transport'] };
function rewardEligible(st) {
  const pets = (st && st.dogs) || [], sps = [...new Set(pets.map(p => p.species || 'dog'))];
  if (!sps.length || sps.some(sp => !FREE_LESSONS[sp])) return false;
  return sps.every(sp => pets.filter(p => (p.species || 'dog') === sp).some(p => FREE_LESSONS[sp].every(id => ((((st.edu || {})[p.id] || {})[id]) || {}).done)));
}
async function savedState(env, token, uid) {
  const project = env.FIREBASE_PROJECT_ID || 'quentools-adca1', base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${uid}/apps/wouf/main/`;
  const get = async id => { const r = await fetch(base + id, { headers: { Authorization: 'Bearer ' + token } }); if (!r.ok) throw new HttpError(403, 'Progression introuvable : connectez-vous et synchronisez Wouf, puis réessayez'); return (await r.json()).fields || {}; };
  const n = parseInt(((await get('current')).n || {}).integerValue || '0', 10);
  if (!(n >= 1 && n <= 40)) throw new HttpError(403, 'Progression introuvable : synchronisez Wouf, puis réessayez');
  let text = ''; for (let i = 0; i < n; i++) text += (((await get('p' + i)).t) || {}).stringValue || '';
  try { return JSON.parse(text); } catch (e) { throw new HttpError(403, 'Progression illisible : synchronisez Wouf, puis réessayez'); }
}
const goodReturn = (u, env) => { try { return origins(env).includes(new URL(u).origin); } catch (e) { return false; } };

/* ---------- Routes ---------- */
async function handle(req, env) {
  const url = new URL(req.url), path = url.pathname;
  if (path === '/checkout' && req.method === 'POST') {
    const user = await authed(req, env), { returnUrl, offer } = await req.json().catch(() => ({}));
    if (!env.PRICE_LIFETIME || !goodReturn(returnUrl, env) || (offer !== undefined && offer !== 'lecons')) throw new HttpError(400, 'Requête invalide');
    if ((await paidFor(env, user.uid)).active) throw new HttpError(409, 'Wouf Plus est déjà actif sur ce compte');
    let price = env.PRICE_LIFETIME;
    if (offer === 'lecons') {
      if (!env.PRICE_LIFETIME_REWARD) throw new HttpError(400, 'Offre indisponible');
      const token = (req.headers.get('Authorization') || '').slice(7);
      if (!rewardEligible(await savedState(env, token, user.uid))) throw new HttpError(403, 'Offre réservée aux comptes qui ont terminé toutes les leçons gratuites (synchronisez Wouf si c’est le cas)');
      price = env.PRICE_LIFETIME_REWARD;
    }
    const meta = { uid: user.uid, product: 'wouf-plus', ...(offer === 'lecons' ? { offer: 'lecons' } : {}) };
    const s = await stripe(env, 'POST', '/checkout/sessions', {
      mode: 'payment', line_items: { 0: { price, quantity: 1 } }, client_reference_id: user.uid, ...(user.email ? { customer_email: user.email } : {}),
      metadata: meta, payment_intent_data: { metadata: meta }, allow_promotion_codes: 'true', locale: 'fr',
      success_url: returnUrl + '?paid=1&session_id={CHECKOUT_SESSION_ID}', cancel_url: returnUrl + '#/abo'
    });
    return { url: s.url };
  }
  if (path === '/status' && req.method === 'GET') {
    const user = await authed(req, env), sid = url.searchParams.get('session_id');
    if (sid) {   // confirmation immédiate au retour du paiement (la recherche Stripe peut avoir ~1 min de retard)
      if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) throw new HttpError(400, 'Requête invalide');
      const s = await stripe(env, 'GET', '/checkout/sessions/' + sid);
      if (s.metadata && s.metadata.uid === user.uid && s.metadata.product === 'wouf-plus' && s.payment_status === 'paid') return { active: true, lifetime: true, plan: 'lifetime', since: new Date(s.created * 1000).toISOString() };
    }
    return paidFor(env, user.uid);
  }
  if (path === '/support' && req.method === 'POST') {
    const b = await req.json().catch(() => ({})), message = String(b.message || '').trim(), email = String(b.email || '').trim();
    if (message.length < 10 || message.length > 4000 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 200) throw new HttpError(400, 'Message ou e-mail invalide');
    if (!env.RESEND_API_KEY || !env.SUPPORT_TO || !env.SUPPORT_FROM) throw new HttpError(501, 'Assistance par formulaire non configurée');
    let priority = false, uid = '';
    if ((req.headers.get('Authorization') || '').startsWith('Bearer ')) { try { const u = await authed(req, env); uid = u.uid; priority = (await paidFor(env, u.uid)).active; } catch (e) { /* jeton absent ou invalide : demande standard */ } }
    const category = String(b.category || 'Question').slice(0, 60), diag = String(b.diagnostics || '').slice(0, 4000);
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.SUPPORT_FROM, to: [env.SUPPORT_TO], reply_to: email, subject: `${priority ? '[PRIORITAIRE] ' : ''}Wouf – ${category}`, text: `${message}\n\n--- ${priority ? 'MEMBRE PLUS VÉRIFIÉ' : 'Demande standard'} ---\nE-mail : ${email}\nCompte : ${uid || 'non connecté'}\n${diag}` }) });
    if (!r.ok) throw new HttpError(502, 'Envoi impossible pour le moment');
    return { ok: true, priority };
  }
  throw new HttpError(404, 'Introuvable');
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors(env, origin), 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Max-Age': '86400' } });
    if (origin && !origins(env).includes(origin)) return reply(env, req, { error: 'Origine non autorisée' }, 403);
    try { return reply(env, req, await handle(req, env)); }
    catch (e) { return reply(env, req, { error: e.status ? e.message : 'Erreur interne' }, e.status || 500); }
  }
};
