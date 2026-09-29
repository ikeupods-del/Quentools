/* Wouf — relais d'abonnement Stripe (Cloudflare Worker, gratuit). NON TESTÉ contre un vrai compte Stripe : à essayer en mode test avant la prod.
   Sans état : aucune base de données. Stripe est la source de vérité.

   Variables (Settings → Variables du Worker) :
     STRIPE_SECRET_KEY   (secret)  clé secrète Stripe (sk_test_… puis sk_live_…)
     PRICE_MONTHLY       id du prix mensuel (price_…)
     PRICE_YEARLY        id du prix annuel  (price_…)
     ALLOWED_ORIGIN      ex. https://ikeupods-del.github.io
   Stripe : activer le « Portail client » (Settings → Billing → Customer portal) pour permettre la résiliation à tout moment.

   Routes :
     POST /checkout {plan:'monthly'|'yearly', returnUrl}  → {url}   (Stripe Checkout, mode abonnement)
     GET  /status?session_id=cs_…  ou  ?customer=cus_…    → {active, plan, until, customer}
     POST /portal {customer, returnUrl}                    → {url}   (gérer / résilier)
   Wouf : renseigner `billing.api` dans wouf/config.js avec l'URL du Worker. */

const json = (o, s, origin) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } });
const form = o => { const p = new URLSearchParams(); const add = (k, v) => { if (v && typeof v === 'object') Object.entries(v).forEach(([a, b]) => add(`${k}[${a}]`, b)); else p.append(k, v); }; Object.entries(o).forEach(([k, v]) => add(k, v)); return p; };

async function stripe(env, method, path, body) {
  const r = await fetch('https://api.stripe.com/v1' + path, { method, headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: body ? form(body) : undefined });
  const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'Stripe ' + r.status); return j;
}
const okUrl = (u, origin) => { try { return new URL(u).origin === origin; } catch (e) { return false; } };

async function statusFor(env, customer) {
  const subs = await stripe(env, 'GET', `/subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=10`);
  const live = subs.data.filter(s => ['active', 'trialing', 'past_due'].includes(s.status)).sort((a, b) => b.current_period_end - a.current_period_end)[0];
  if (!live) return { active: false, customer };
  const item = live.items.data[0], interval = item && item.price && item.price.recurring && item.price.recurring.interval;
  // 3 jours de grâce hors ligne / en cas de retard de paiement
  return { active: true, customer, plan: interval === 'year' ? 'annuel' : 'mensuel', until: new Date((live.current_period_end + 3 * 86400) * 1000).toISOString() };
}

export default {
  async fetch(req, env) {
    const origin = env.ALLOWED_ORIGIN, url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    if (req.headers.get('Origin') && req.headers.get('Origin') !== origin) return json({ error: 'origin' }, 403, origin);
    try {
      if (url.pathname === '/checkout' && req.method === 'POST') {
        const { plan, returnUrl } = await req.json();
        const price = plan === 'yearly' ? env.PRICE_YEARLY : env.PRICE_MONTHLY;
        if (!price || !okUrl(returnUrl, origin)) return json({ error: 'requête invalide' }, 400, origin);
        const s = await stripe(env, 'POST', '/checkout/sessions', {
          mode: 'subscription', 'line_items': { 0: { price, quantity: 1 } }, allow_promotion_codes: 'true', billing_address_collection: 'auto',
          success_url: returnUrl + '?session_id={CHECKOUT_SESSION_ID}', cancel_url: returnUrl + '#/abo', locale: 'fr'
        });
        return json({ url: s.url }, 200, origin);
      }
      if (url.pathname === '/status' && req.method === 'GET') {
        let customer = url.searchParams.get('customer');
        const sid = url.searchParams.get('session_id');
        if (sid) { const s = await stripe(env, 'GET', '/checkout/sessions/' + encodeURIComponent(sid)); customer = s.customer; }
        if (!customer || !/^cus_\w+$/.test(customer)) return json({ error: 'client inconnu' }, 400, origin);
        return json(await statusFor(env, customer), 200, origin);
      }
      if (url.pathname === '/portal' && req.method === 'POST') {
        const { customer, returnUrl } = await req.json();
        if (!/^cus_\w+$/.test(customer || '') || !okUrl(returnUrl, origin)) return json({ error: 'requête invalide' }, 400, origin);
        const s = await stripe(env, 'POST', '/billing_portal/sessions', { customer, return_url: returnUrl });
        return json({ url: s.url }, 200, origin);
      }
      return json({ error: 'not found' }, 404, origin);
    } catch (e) { return json({ error: e.message }, 500, origin); }
  }
};
