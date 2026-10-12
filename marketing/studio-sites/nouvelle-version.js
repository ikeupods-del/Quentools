// Outils privés (Studio Posts, Studio Sites) : recherche discrète d'une version plus récente dans les Releases GitHub (étiquette « <préfixe>X.Y.Z »).
// N'installe rien : l'application propose d'ouvrir la page de téléchargement. Source unique : marketing/ia-locale/ ; copies par `node tools/synchro-ia-locale.js`.
'use strict';
const https = require('https');

const DEPOT = 'ikeupods-del/Quentools';
const nombres = v => String(v || '').split('.').map(n => parseInt(n, 10) || 0);
function plusRecente(a, b) { const x = nombres(a), y = nombres(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; }

function chercher(prefixe, actuelle, api = 'https://api.github.com') {
  return new Promise(ok => {
    const r = https.get(`${api}/repos/${DEPOT}/releases?per_page=40`, { headers: { 'User-Agent': 'QuenTools-outils', Accept: 'application/vnd.github+json' }, timeout: 15000 }, res => {
      if (res.statusCode !== 200) { res.resume(); return ok(null); }
      let s = ''; res.setEncoding('utf8'); res.on('data', d => { s += d; });
      res.on('end', () => {
        try {
          let meilleure = null;
          for (const rel of JSON.parse(s)) {
            if (rel.draft || rel.prerelease || !String(rel.tag_name || '').startsWith(prefixe)) continue;
            const v = rel.tag_name.slice(prefixe.length);
            if (/^\d+\.\d+\.\d+$/.test(v) && plusRecente(v, actuelle) && (!meilleure || plusRecente(v, meilleure.version))) meilleure = { version: v, url: rel.html_url, notes: String(rel.body || '').slice(0, 1200) };
          }
          ok(meilleure);
        } catch (e) { ok(null); }
      });
    });
    r.on('timeout', () => r.destroy()); r.on('error', () => ok(null));
  });
}
module.exports = { chercher, plusRecente };
