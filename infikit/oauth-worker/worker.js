/* Infikit — petit relais OAuth GitHub (Cloudflare Workers, offre gratuite).
   GitHub exige un « client secret » pour échanger le code de connexion contre
   un jeton : ce secret ne peut pas vivre dans une page web publique, d'où ce relais.
   Il ne voit passer aucune donnée de santé : uniquement le code de connexion.

   Variables à définir dans Cloudflare (Settings → Variables) :
     GITHUB_CLIENT_ID      identifiant de l'OAuth App GitHub
     GITHUB_CLIENT_SECRET  secret de l'OAuth App (type « Secret »)
     ALLOWED_ORIGIN        ex. https://ikeupods-del.github.io
*/
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/token') return new Response('Not found', { status: 404, headers: cors });
    if (req.headers.get('Origin') !== env.ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403, headers: cors });
    let code;
    try { ({ code } = await req.json()); } catch (e) { }
    if (!code || typeof code !== 'string' || code.length > 100) return Response.json({ error: 'bad_request' }, { status: 400, headers: cors });
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.access_token) return Response.json({ error: j.error || 'exchange_failed' }, { status: 400, headers: cors });
    return Response.json({ access_token: j.access_token, scope: j.scope }, { headers: cors });
  },
};
