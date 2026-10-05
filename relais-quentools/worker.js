/* QuenTools — rappels automatiques de fin d'offre (Cloudflare Worker gratuit).

   Principe : l'administration (onglet « Sites clients ») envoie à ce relais la liste des clients avec la date de fin de leur offre gratuite
   (mise en ligne + 3 mois). Chaque jour, un déclencheur Cron envoie un e-mail de rappel aux clients dont la fin d'offre approche
   (14 jours avant), une seule fois par date de fin. Aucune donnée sensible : prénom, e-mail, identifiant du site, date.

   Réglages du Worker (Cloudflare → Workers → Settings) :
     Liaison KV (Bindings → KV namespace)  nom : CLIENTS
     Variables : ALLOWED_ORIGIN  origine de l'administration, ex. https://quentools.fr
                 MAIL_FROM       expéditeur d'un domaine vérifié chez Resend, ex. QuenTools <bonjour@quentools.fr>
                 REPLY_TO        adresse qui reçoit les réponses des clients
                 PRICE           (facultatif) prix du suivi affiché dans l'e-mail, défaut « 69,99 € par mois »
                 DAYS_BEFORE     (facultatif) nombre de jours avant la fin d'offre, défaut 14
     Secrets :   ADMIN_KEY       clé choisie par le propriétaire, saisie une fois dans l'administration
                 RESEND_API_KEY  clé d'API resend.com
     Déclencheur Cron : « 0 8 * * * » (tous les jours à 8 h UTC)

   Routes :
     PUT /clients  {clients: [{id, prenom, email, site, finOffre: 'AAAA-MM-JJ'}]}   Authorization: Bearer <ADMIN_KEY>  → {ok, count}
     GET /clients                                                                    idem → {clients: [{…, rappel: date d'envoi ou null}]}
   Documentation : design/RAPPELS-FIN-OFFRE.md */

const KEY = 'clients';
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const cors = (env, req) => ({ 'Access-Control-Allow-Origin': String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).includes(req.headers.get('Origin')) ? req.headers.get('Origin') : (String(env.ALLOWED_ORIGIN || '').split(',')[0] || ''), 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS', 'Vary': 'Origin' });
const reply = (env, req, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors(env, req) } });
const authorized = (env, req) => !!env.ADMIN_KEY && (req.headers.get('Authorization') || '') === 'Bearer ' + env.ADMIN_KEY;
const load = async env => { try { const l = JSON.parse((await env.CLIENTS.get(KEY)) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
const clean = c => ({ id: String(c.id || '').slice(0, 40), prenom: String(c.prenom || '').slice(0, 60), email: String(c.email || '').trim().slice(0, 160), site: String(c.site || '').slice(0, 40), finOffre: String(c.finOffre || '') });
const valid = c => c.id && /^\S+@\S+\.\S+$/.test(c.email) && /^\d{4}-\d{2}-\d{2}$/.test(c.finOffre);
const fr = s => new Date(s + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function message(c, env) {
  const prix = env.PRICE || '69,99 € par mois';
  return {
    subject: 'Votre assistance offerte se termine le ' + fr(c.finOffre),
    text: `Bonjour${c.prenom ? ' ' + c.prenom : ''},\n\nVotre site${c.site ? ' (' + c.site + ')' : ''} est en ligne depuis bientôt trois mois, et l’assistance offerte à la livraison se termine le ${fr(c.finOffre)}.\n\n` +
      `Si vous souhaitez continuer à en profiter (hébergement, sauvegardes, mises à jour et modifications simples, réponse sous 48 h ouvrées), le suivi mensuel est à ${prix}. Répondez simplement à cet e-mail pour le mettre en place.\n\n` +
      `Si vous ne souhaitez pas de suivi, vous n’avez rien à faire. Pour toute question, répondez à ce message.\n\nCordialement,\nQuenTools`
  };
}

async function send(env, c) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return 'off';
  const m = message(c, env);
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [c.email], ...(env.REPLY_TO ? { reply_to: env.REPLY_TO } : {}), subject: m.subject, text: m.text }) });
    return r.ok ? 'sent' : 'error ' + r.status;
  } catch (e) { return 'error réseau'; }
}

/* Envoie les rappels dus : aujourd'hui >= fin d'offre - DAYS_BEFORE et <= fin d'offre ; une seule fois par date de fin. */
export async function reminders(env, now = new Date()) {
  const today = iso(now), before = Math.max(1, parseInt(env.DAYS_BEFORE || '14', 10) || 14), list = await load(env), out = [];
  for (const c of list) {
    if (c.rappel || !valid(c) || today < addDays(c.finOffre, -before) || today > c.finOffre) continue;
    const r = await send(env, c);
    if (r === 'sent') c.rappel = today;
    out.push({ id: c.id, result: r });
  }
  if (out.some(x => x.result === 'sent')) await env.CLIENTS.put(KEY, JSON.stringify(list));
  return out;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, req) });
    if (url.pathname !== '/clients') return reply(env, req, { error: 'introuvable' }, 404);
    if (!authorized(env, req)) return reply(env, req, { error: 'non autorisé' }, 401);
    if (req.method === 'GET') return reply(env, req, { clients: await load(env) });
    if (req.method === 'PUT') {
      let body; try { body = await req.json(); } catch (e) { return reply(env, req, { error: 'JSON invalide' }, 400); }
      if (!body || !Array.isArray(body.clients) || body.clients.length > 500) return reply(env, req, { error: 'liste invalide' }, 400);
      const old = new Map((await load(env)).map(c => [c.id, c]));
      const list = body.clients.map(clean).filter(valid).map(c => { const o = old.get(c.id); return { ...c, rappel: o && o.finOffre === c.finOffre ? (o.rappel || null) : null }; });
      await env.CLIENTS.put(KEY, JSON.stringify(list));
      return reply(env, req, { ok: true, count: list.length });
    }
    return reply(env, req, { error: 'méthode non autorisée' }, 405);
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(reminders(env)); }
};
