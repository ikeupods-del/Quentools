/* QuenTools — échanges légers avec Firestore par son API web (sans bibliothèque, sans cookie).
   QTC.config()  : réglages publics (qt_admin/config) fusionnés dans window.QT, mis en cache 10 min dans la session.
   QTC.devis(d)  : enregistre une demande de devis (qt_devis), lue uniquement par le propriétaire dans /admin/. */
(() => {
  const C = window.QT || {}, F = C.firebase || {};
  const base = `https://firestore.googleapis.com/v1/projects/${F.projectId}/databases/(default)/documents/`;
  const ok = () => !!(F.projectId && F.apiKey);
  const val = v => v == null ? null : 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue
    : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'timestampValue' in v ? v.timestampValue : null;
  const enc = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k,
    typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(Math.round(v)) }
      : v instanceof Date ? { timestampValue: v.toISOString() } : { stringValue: String(v) }]));
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('délai')), ms))]);
  const KEY = 'qt:config';
  async function config() {
    if (!ok()) return C;
    let data = null;
    try { const c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c && Date.now() - c.t < 600e3) data = c.d; } catch (e) { /* stockage indisponible */ }
    if (!data) {
      try {
        const r = await withTimeout(fetch(base + 'qt_admin/config?key=' + F.apiKey), 4000);
        data = {};
        if (r.ok) { const j = await r.json(); for (const [k, v] of Object.entries(j.fields || {})) data[k] = val(v); }
        try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: data })); } catch (e) { /* ignore */ }
      } catch (e) { return C; }
    }
    for (const k of ['email', 'tiktok', 'formEndpoint']) if (typeof data[k] === 'string' && data[k]) C[k] = data[k];
    C.site = data;
    return C;
  }
  async function devis(d) {
    if (!ok()) throw new Error('indisponible');
    const r = await withTimeout(fetch(base + 'qt_devis?key=' + F.apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: enc({ ...d, status: 'nouveau', at: new Date() }) })
    }), 8000);
    if (!r.ok) throw new Error('refusé');
    return true;
  }
  window.QTC = { config, devis };
})();
