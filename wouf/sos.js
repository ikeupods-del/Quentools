'use strict';
/* Wouf — SOS : vétérinaires ouverts / de garde autour de soi (données OpenStreetMap), contacts, premiers secours, toxiques. */

const VETS = { st: 'idle', list: [], lat: null, lon: null, label: '', ts: 0, live: false, filter: 'all', err: '' };
try { const c = JSON.parse(localStorage.getItem('wouf:vets')); if (c && c.list) Object.assign(VETS, c, { st: 'done', live: false }); } catch (e) { /* pas de cache */ }

/* --- Horaires OSM (opening_hours) : analyse volontairement prudente, « inconnu » en cas de doute --- */
const OSM_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
function openNow(str, now = new Date()) {
  if (!str) return null;
  str = str.trim();
  if (str === '24/7') return true;
  const dn = (now.getDay() + 6) % 7, mins = now.getHours() * 60 + now.getMinutes();
  let res = false, any = false;
  for (const raw of str.split(';')) {
    const rule = raw.trim(); if (!rule) continue;
    const m = rule.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:\s*,\s*(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)?\s*(off|closed|\d{1,2}:\d{2}-\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}-\d{1,2}:\d{2})*)$/i);
    if (!m) return null;
    let match = true;
    if (m[1]) {
      match = false;
      for (const part of m[1].split(',')) {
        const [a, b] = part.trim().split('-'), ia = OSM_DAYS.indexOf(a), ib = b ? OSM_DAYS.indexOf(b) : ia;
        if (ia <= ib ? dn >= ia && dn <= ib : dn >= ia || dn <= ib) match = true;
      }
    }
    if (!match) continue;
    any = true;
    if (/^(off|closed)$/i.test(m[2])) { res = false; continue; }
    res = m[2].split(',').some(iv => {
      const [s, e] = iv.trim().split('-').map(t => { const [h, mi] = t.split(':').map(Number); return h * 60 + mi; });
      return e > s ? mins >= s && mins < e : mins >= s || mins < e;
    });
  }
  return any ? res : false;
}
const haversine = (a, b, c, d) => { const r = x => x * Math.PI / 180, dl = r(c - a), dg = r(d - b), h = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };

async function overpass(lat, lon, radius) {
  const q = `[out:json][timeout:25];nwr["amenity"="veterinary"](around:${radius},${lat},${lon});out center tags;`;
  let lastErr;
  for (const url of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return (await r.json()).elements || [];
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
async function searchVets(lat, lon, label) {
  VETS.st = 'loading'; VETS.err = ''; renderVets();
  try {
    let els = [];
    for (const r of [8000, 20000, 50000]) { els = await overpass(lat, lon, r); if (els.length >= 6) break; }
    const list = els.map(e => {
      const t = e.tags || {}, la = e.lat ?? (e.center || {}).lat, lo = e.lon ?? (e.center || {}).lon;
      if (la == null) return null;
      const hours = t.opening_hours || '', o = openNow(hours);
      return {
        id: e.type + e.id, name: t.name || 'Cabinet vétérinaire', lat: la, lon: lo, phone: t.phone || t['contact:phone'] || '', hours, open: o,
        h24: hours.trim() === '24/7' || t.emergency === 'yes', web: t.website || t['contact:website'] || '',
        addr: [[t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '), [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ')].filter(Boolean).join(', '),
        dist: haversine(lat, lon, la, lo)
      };
    }).filter(Boolean).sort((a, b) => a.dist - b.dist);
    Object.assign(VETS, { st: 'done', list, lat, lon, label, ts: Date.now(), live: true });
    try { localStorage.setItem('wouf:vets', JSON.stringify({ list: list.slice(0, 60), lat, lon, label, ts: VETS.ts })); } catch (e) { /* quota */ }
  } catch (e) {
    VETS.err = VETS.list.length ? 'Pas de connexion : dernière recherche affichée.' : 'Impossible de charger les cliniques (réseau indisponible). Utilisez la recherche Google Maps ci-dessous.';
    VETS.st = VETS.list.length ? 'done' : 'error';
  }
  renderVets();
}
function locate() {
  if (!navigator.geolocation) { VETS.st = 'error'; VETS.err = 'La localisation n’est pas disponible sur cet appareil : saisissez une ville.'; return renderVets(); }
  VETS.st = 'loading'; VETS.err = ''; renderVets();
  navigator.geolocation.getCurrentPosition(
    p => searchVets(p.coords.latitude, p.coords.longitude, 'Ma position'),
    () => { VETS.st = 'error'; VETS.err = 'Localisation refusée : autorisez-la dans le navigateur ou saisissez une ville.'; renderVets(); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
async function geocode(q) {
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=' + encodeURIComponent(q));
  const j = await r.json(); if (!j.length) throw new Error('introuvable');
  return { lat: +j[0].lat, lon: +j[0].lon, label: j[0].display_name.split(',').slice(0, 2).join(',') };
}
ACT.locate = locate;
ACT['locate-home'] = () => { const h = S.settings.home; if (h) searchVets(h.lat, h.lon, h.label); };
ACT['vet-filter'] = ({ f }) => { VETS.filter = f; renderVets(); };
document.addEventListener('submit', async e => {
  if (e.target.id !== 'city-form') return;
  e.preventDefault();
  const q = e.target.city.value.trim(); if (!q) return;
  try { const g = await geocode(q); if (e.target.savehome && e.target.savehome.checked) { S.settings.home = g; save(); } searchVets(g.lat, g.lon, g.label); }
  catch (err) { VETS.st = 'error'; VETS.err = 'Adresse introuvable ou réseau indisponible.'; renderVets(); }
});

function vetsHTML() {
  const g = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('vétérinaire urgence 24h')}`;
  let out = `<div class="btn-row"><button class="btn primary big" data-act="locate">📍 Trouver un vétérinaire près de moi</button></div>
  <form id="city-form" class="inline"><input name="city" placeholder="…ou une ville / une adresse" autocomplete="off"><button class="btn">Chercher</button>
  <label class="chk"><input type="checkbox" name="savehome"><span>Mémoriser</span></label></form>
  ${S.settings.home ? `<p class="mut"><button class="lnk" data-act="locate-home">↩ Utiliser « ${esc(S.settings.home.label)} »</button></p>` : ''}`;
  if (VETS.st === 'loading') out += '<p class="loading">🔎 Recherche des cliniques…</p>';
  if (VETS.err) out += `<p class="warn">${esc(VETS.err)}</p>`;
  if (VETS.st === 'done' || (VETS.st === 'error' && VETS.list.length)) {
    const now = new Date();
    const list = VETS.list.map(v => ({ ...v, open: openNow(v.hours, now) })), f = VETS.filter;
    const shown = list.filter(v => f === 'all' || (f === 'open' && (v.open === true)) || (f === '24' && v.h24)).slice(0, 40);
    out += `<div class="chips">${[['all', 'Toutes'], ['open', '🟢 Ouvertes maintenant'], ['24', '24 h/24']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="vet-filter" data-f="${k}">${l}</button>`).join('')}</div>
    <p class="mut">${list.length} cliniques autour de ${esc(VETS.label || 'vous')}${VETS.live ? '' : ' (recherche du ' + new Date(VETS.ts).toLocaleDateString('fr-FR') + ')'}. Horaires issus d’OpenStreetMap : <b>appelez avant de vous déplacer</b>.</p>
    <div class="list card">${shown.length ? shown.map(v => {
      const dirs = `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lon}`;
      return `<div class="vet"><div class="vet-h"><b>${esc(v.name)}</b><span class="dist">${v.dist < 10 ? v.dist.toFixed(1) : Math.round(v.dist)} km</span></div>
        <p class="mut">${esc(v.addr || 'Adresse non renseignée')}</p>
        <p>${v.h24 ? '<span class="pill ok">24 h/24</span>' : v.open === true ? '<span class="pill ok">Ouvert maintenant</span>' : v.open === false ? '<span class="pill">Fermé</span>' : '<span class="pill">Horaires inconnus</span>'}${v.hours && !v.h24 ? ` <small class="mut">${esc(v.hours)}</small>` : ''}</p>
        <div class="btn-row">${v.phone ? `<a class="btn primary sm" href="${phoneLink(v.phone)}">📞 ${esc(fmtPhone(v.phone.split(';')[0]))}</a>` : '<span class="mut">Téléphone non renseigné</span>'}<a class="btn sm" href="${dirs}" target="_blank" rel="noopener">🧭 Itinéraire</a>${safeUrl(v.web) ? `<a class="btn sm" href="${esc(safeUrl(v.web))}" target="_blank" rel="noopener">Site</a>` : ''}</div></div>`;
    }).join('') : '<p class="empty">Aucune clinique pour ce filtre. Essayez « Toutes » ou la recherche Google Maps.</p>'}</div>`;
  }
  out += `<p class="mut"><a class="btn sm" href="${g}" target="_blank" rel="noopener">🗺️ Chercher « urgence vétérinaire » sur Google Maps</a></p>
    <p class="mut small">Les gardes de nuit / week-end sont organisées localement : le répondeur de votre vétérinaire habituel indique généralement la clinique de garde. Appelez toujours avant de vous déplacer.</p>`;
  return out;
}
function renderVets() { const el = $('#vets'); if (el) el.innerHTML = vetsHTML(); }

/* --- Contacts favoris --- */
function contactForm(c = {}, editing = false) {
  openForm({
    title: editing ? 'Modifier le contact' : 'Nouveau contact d’urgence',
    fields: [{ n: 'label', l: 'Nom', v: c.label, req: true, ph: 'Clinique de garde, voisin, propriétaire…' }, { n: 'phone', l: 'Téléphone', t: 'tel', v: c.phone, req: true }],
    onSubmit(v) { const rec = { id: editing ? c.id : uid(), ...v }; if (editing) S.contacts[S.contacts.findIndex(x => x.id === c.id)] = rec; else S.contacts.push(rec); save(); render(true); },
    onDelete: editing ? () => { S.contacts = S.contacts.filter(x => x.id !== c.id); save(); render(true); } : null
  });
}
ACT['add-contact'] = () => contactForm();
ACT['edit-contact'] = ({ id }) => contactForm(S.contacts.find(c => c.id === id), true);

/* --- Fiche d'urgence --- */
function emergencyHTML(d) {
  const lw = lastWeight(d.id), latest = new Map();
  for (const e of dogEvents(d.id).filter(e => e.type === 'vaccine')) if (!latest.has(e.title)) latest.set(e.title, e);
  return `<div class="em"><div class="em-h">${avatar(d, 'lg')}<div><h2>${esc(d.name)}</h2><p>${esc(d.breed || '')} · ${d.sex === 'F' ? 'Femelle' : 'Mâle'}${d.neutered ? ' stérilisé(e)' : ''} · ${esc(ageText(d.birth))}</p></div></div>
    <table class="kv"><tr><th>Puce / tatouage</th><td>${esc(d.chip || '—')}</td></tr><tr><th>Poids</th><td>${lw ? fmtKg(lw.kg) + ' (' + fmtDate(lw.date) + ')' : '—'}</td></tr>
    <tr><th>Robe</th><td>${esc(d.color || '—')}</td></tr><tr><th>Allergies / maladies</th><td>${esc(d.allergies || 'Aucune connue')}</td></tr>
    <tr><th>Traitements en cours</th><td>${esc(S.meds.filter(m => m.dogId === d.id && medActive(m)).map(m => m.name + (m.dose ? ' (' + m.dose + ')' : '')).join(', ') || 'Aucun')}</td></tr>
    <tr><th>Vaccins</th><td>${[...latest.values()].map(e => esc(e.title.split(' (')[0]) + ' : ' + fmtDate(e.date)).join('<br>') || '—'}</td></tr>
    <tr><th>Vétérinaire</th><td>${esc(d.vetName || '—')} ${d.vetPhone ? esc(fmtPhone(d.vetPhone)) : ''}</td></tr>
    <tr><th>Propriétaire</th><td>${esc(S.owner.name || '—')} ${esc(fmtPhone(S.owner.phone))}</td></tr></table></div>`;
}
ACT.emergency = () => {
  const d = dog(); sheet(`<div class="sheet-head"><h2>Fiche d’urgence</h2><button class="x" data-close>✕</button></div>${emergencyHTML(d)}
    <div class="form-actions"><button class="btn" data-act="share-em">Partager</button><button class="btn primary" data-act="print-em">Imprimer / PDF</button></div>`);
};
ACT['print-em'] = () => printHTML(`<h1>Fiche d’urgence</h1>${emergencyHTML(dog())}`);
ACT['share-em'] = async () => {
  const d = dog(), lw = lastWeight(d.id), t = `🐾 ${d.name} — ${d.breed || spOf(d).noun}, ${ageText(d.birth)}${lw ? ', ' + fmtKg(lw.kg) : ''}\nPuce : ${d.chip || '—'}\nAllergies : ${d.allergies || 'aucune connue'}\nVétérinaire : ${d.vetName || '—'} ${d.vetPhone || ''}\nPropriétaire : ${S.owner.name || ''} ${S.owner.phone || ''}`;
  try { if (navigator.share) return await navigator.share({ title: 'Fiche d’urgence ' + d.name, text: t }); await navigator.clipboard.writeText(t); toast('Copié dans le presse-papiers'); } catch (e) { /* annulé */ }
};

/* --- Écran SOS --- */
ROUTES.sos = function sos() {
  const d = dog(), cts = [];
  if (d.vetPhone) cts.push({ label: 'Vétérinaire habituel' + (d.vetName ? ' – ' + d.vetName : ''), phone: d.vetPhone, fixed: true });
  S.contacts.forEach(c => cts.push(c));
  return `<div class="page-h"><h1>🚨 SOS</h1></div>
  <section class="card sos-hero"><b>Urgence pour ${esc(d.name)} ?</b><p>Gardez votre calme, appelez d’abord la clinique : elle vous guidera et préparera votre arrivée.</p>
    ${d.vetPhone ? `<a class="btn danger-fill big" href="${phoneLink(d.vetPhone)}">📞 Appeler ${esc(d.vetName || 'mon vétérinaire')}</a>` : `<button class="btn big danger-fill" data-act="edit-dog" data-id="${d.id}">Ajouter mon vétérinaire</button>`}</section>
  <section class="card"><h2>Vétérinaires ouverts / de garde près de moi</h2><div id="vets">${vetsHTML()}</div></section>
  <section class="card"><div class="card-h"><h2>Mes contacts d’urgence</h2><button class="lnk" data-act="add-contact">＋ Ajouter</button></div>
    ${cts.map(c => `<div class="row"><span class="ico">📞</span><span class="grow"><b>${esc(c.label)}</b><small>${esc(fmtPhone(c.phone))}</small></span><a class="btn sm primary" href="${phoneLink(c.phone)}">Appeler</a>${c.fixed ? '' : `<button class="btn sm" data-act="edit-contact" data-id="${c.id}">✎</button>`}</div>`).join('') || '<p class="empty">Ajoutez la clinique de garde de votre secteur, un voisin, un proche…</p>'}</section>
  <section class="card"><div class="card-h"><h2>Fiche d’urgence</h2></div><p class="mut">Identité, puce, allergies, vaccins, contacts : prête à montrer, imprimer ou envoyer.</p><button class="btn primary" data-act="emergency">Afficher la fiche de ${esc(d.name)}</button></section>
  <section class="card"><h2>Consulter sans attendre si…</h2><ul class="bul">${urgentOf(d).map(s => `<li>${s}</li>`).join('')}</ul></section>
  <section class="card"><h2>Premiers secours</h2><p class="mut">Ces gestes ne remplacent jamais un avis vétérinaire.</p>${firstAidOf(d).map(([i, t, steps]) => `<details><summary>${i} ${t}</summary><ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol></details>`).join('')}</section>
  <section class="card"><h2>Aliments et produits dangereux</h2><input id="tox-q" class="search" type="search" placeholder="${spOf(d).id === 'cat' ? 'Lys, plante, médicament, pipette…' : 'Chocolat, raisin, oignon, plante…'}" autocomplete="off"><div id="tox-list">${toxHTML('')}</div>
    <h3>Centres antipoison vétérinaires</h3><p class="mut small">Consultation généralement payante ; vérifiez les numéros à jour.</p>${POISON_LINES.map(([n, p]) => `<div class="row"><span class="ico">☠️</span><span class="grow"><b>${n}</b><small>${fmtPhone(p)}</small></span><a class="btn sm primary" href="${phoneLink(p)}">Appeler</a></div>`).join('')}</section>`;
};
function toxHTML(q) {
  q = q.trim().toLowerCase();
  const l = toxicsOf(dog()).filter(t => !q || (t.name + ' ' + t.why).toLowerCase().includes(q));
  return l.map(t => `<div class="tox ${t.level}"><b>${t.level === 'danger' ? '⛔' : '⚠️'} ${esc(t.name)}</b><p>${esc(t.why)}</p></div>`).join('') || '<p class="empty">Aucun résultat : en cas de doute, appelez un vétérinaire.</p>';
}
document.addEventListener('input', e => { if (e.target.id === 'tox-q') $('#tox-list').innerHTML = toxHTML(e.target.value); });
