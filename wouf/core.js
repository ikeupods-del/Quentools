'use strict';
/* Wouf — noyau : outils, stockage, fenêtres, formulaires, abonnement. */

const CFG = window.WOUF_CONFIG || {};
const BILL = CFG.billing || { enabled: false };
const KEY = 'wouf:data';
const SCHEMA = 2;   // version du format des données : incrémentez + ajoutez une étape dans migrate() quand la structure change

/* Journal d'erreurs local (jamais envoyé sans action de l'utilisateur : voir Assistance) */
function logError(msg, src) { try { const a = JSON.parse(localStorage.getItem('wouf:errors') || '[]'); a.push({ t: Date.now(), m: String(msg).slice(0, 300), s: String(src || '').slice(0, 120) }); localStorage.setItem('wouf:errors', JSON.stringify(a.slice(-10))); } catch (e) { /* ignore */ } }
addEventListener('error', e => logError(e.message, (e.filename || '').split('/').pop() + ':' + e.lineno));
addEventListener('unhandledrejection', e => logError((e.reason && e.reason.message) || e.reason, 'promise'));

/* ---------- Outils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const addMonths = (s, n) => { const d = parseD(s); d.setMonth(d.getMonth() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
const fmtDate = s => s ? parseD(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtMoney = n => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(Number(n || 0)) ? 0 : 2, maximumFractionDigits: 2 });
const fmtKg = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR') + ' kg';
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const sum = a => a.reduce((x, y) => x + y, 0);

function ageMonths(birth) {
  const b = parseD(birth), t = parseD(today());
  let m = (t.getFullYear() - b.getFullYear()) * 12 + t.getMonth() - b.getMonth();
  if (t.getDate() < b.getDate()) m--;
  return Math.max(0, m);
}
const ageYears = birth => Math.max(0, diffDays(today(), birth)) / 365.25;
function ageText(birth) {
  if (!birth) return 'âge inconnu';
  const days = diffDays(today(), birth);
  if (days < 0) return 'pas encore né';
  if (days < 14) return days + ' j';
  if (days < 84) return Math.floor(days / 7) + ' semaines';
  const m = ageMonths(birth);
  if (m < 24) return m + ' mois';
  const y = Math.floor(m / 12), r = m % 12;
  return y + ' ans' + (r ? ' ' + r + ' mois' : '');
}
const humanAge = birth => { const a = ageYears(birth); return a < 0.2 ? null : Math.round(16 * Math.log(a) + 31); };

/* ---------- État ---------- */
function blank() {
  return {
    v: 1, dogs: [], events: [], weights: [], meds: [], medLog: {}, journal: [], expenses: [], docs: [], foods: [], contacts: [],
    owner: { name: '', phone: '' }, grant: null, settings: { notif: false, lastNotif: '', lastMeteoNotif: '', lastBackup: '', home: null, noStats: false }, sub: null,
    current: null, installedAt: today(), edu: {}, walks: [], names: [], updatedAt: 0, schema: SCHEMA
  };
}
/* Migrations : chaque étape est idempotente et ne détruit jamais de données. */
function migrate(r) {
  if (!r.schema || r.schema < 2) { (r.dogs || []).forEach(d => { if (!d.species) d.species = 'dog'; }); r.walks = r.walks || []; r.edu = r.edu || {}; r.schema = 2; }
  // if (r.schema < 3) { … ; r.schema = 3; }
  return r;
}
function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.v) return Object.assign(blank(), migrate(r)); } catch (e) { /* stockage indisponible */ }
  return blank();
}
let S = load();
let saveT;
function flush() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Stockage plein : faites une sauvegarde, puis supprimez des éléments.'); } }
function save() { S.updatedAt = Date.now(); clearTimeout(saveT); saveT = setTimeout(flush, 120); if (typeof cloudQueue === 'function') cloudQueue(); }
addEventListener('pagehide', flush);
const dog = () => S.dogs.find(d => d.id === S.current) || S.dogs[0] || null;

/* ---------- Fichiers (IndexedDB) ---------- */
const idb = new Promise((res, rej) => {
  const r = indexedDB.open('wouf', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('files');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
function idbOp(mode, fn) {
  return idb.then(d => new Promise((res, rej) => {
    const t = d.transaction('files', mode), r = fn(t.objectStore('files'));
    t.oncomplete = () => res(r && r.result);
    t.onerror = () => rej(t.error);
  }));
}
const fput = (id, blob) => idbOp('readwrite', s => s.put(blob, id));
const fget = id => idbOp('readonly', s => s.get(id));
const fdel = id => idbOp('readwrite', s => s.delete(id));

function loadImage(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(u); res(im); };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image illisible')); };
    im.src = u;
  });
}
async function imageBlob(file, max = 1800, q = 0.82) {
  const im = await loadImage(file), r = Math.min(1, max / Math.max(im.width, im.height));
  const c = document.createElement('canvas'); c.width = Math.round(im.width * r); c.height = Math.round(im.height * r);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/jpeg', q));
}
async function squarePhoto(file, size = 320) {
  const im = await loadImage(file), s = Math.min(im.width, im.height);
  const c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.8);
}
const blobToDataURL = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

/* ---------- Statistiques anonymes (config.stats) ----------
   Aucun cookie, aucun identifiant, aucune donnée saisie : seulement le nom de l'écran ou de l'action.
   Provenance : ?src=tiktok / ?src=insta dans le lien (liens de bio), sinon le site d'origine. Désactivable dans Réglages. */
const STATS_SRC = (() => {
  try {
    const q = new URLSearchParams(location.search).get('src'); if (q) return q.replace(/[^\w.-]/g, '').slice(0, 30);
    const r = document.referrer && new URL(document.referrer); return r && r.hostname !== location.hostname ? r.hostname : '';
  } catch (e) { return ''; }
})();
/* Mode propriétaire : connexion Google avec un compte de config.ownerHashes, ou ?proprio=1 ouvert une fois sur l'appareil
   → « Mes statistiques » dans Plus, et ses propres visites ne sont plus comptées (?proprio=0 pour annuler).
   Aucun droit : le tableau de bord reste protégé par son mot de passe. */
let OWNER = (() => {
  try { const q = new URLSearchParams(location.search).get('proprio'); if (q === '1') localStorage.setItem('wouf:owner', '1'); if (q === '0') localStorage.removeItem('wouf:owner'); return localStorage.getItem('wouf:owner') === '1'; } catch (e) { return false; }
})();
async function ownerCheck(email) {
  if (OWNER || !email || ownerCheck.last === email || !(window.crypto && crypto.subtle)) return;
  ownerCheck.last = email;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(email).trim().toLowerCase()));
  const h = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (((window.WOUF_CONFIG || {}).ownerHashes || []).includes(h)) { OWNER = true; try { localStorage.setItem('wouf:owner', '1'); } catch (e) { /* ignore */ } render(true); }
}
const statsCode = () => { const c = ((window.WOUF_CONFIG || {}).stats || {}).goatcounter || ''; return /^[a-z0-9-]{2,50}$/.test(c) ? c : ''; };
function statsUrl(name, event, ref) {
  const q = new URLSearchParams({ p: name, t: event ? name : 'Wouf', e: event ? 'true' : 'false', s: `${screen.width}x${screen.height}`, rnd: Math.random().toString(36).slice(2) });
  if (ref) q.set('r', ref);
  return `https://${statsCode()}.goatcounter.com/count?${q}`;
}
function track(name, event) {
  if (!statsCode() || OWNER || (S.settings && S.settings.noStats) || location.protocol !== 'https:') return;
  try { new Image().src = statsUrl(name, event, !event && !track.sent ? STATS_SRC : ''); track.sent = true; } catch (e) { /* rien */ }
}

/* ---------- Interface : toast, feuilles, confirmation ---------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800);
}
function sheet(html, cls = '') {
  const el = document.createElement('div');
  el.className = 'sheet-wrap ' + cls;
  el.innerHTML = `<div class="sheet-bg"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('open'));
  $('.sheet-bg', el).onclick = () => closeSheet(el);
  $('.sheet', el).addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(el); });
  document.body.classList.add('noscroll');
  return el;
}
function closeSheet(el) {
  el = el || [...document.querySelectorAll('.sheet-wrap:not(.dlg)')].pop();
  if (el) el.remove();
  if (!$('.sheet-wrap')) document.body.classList.remove('noscroll');
}
const closeAllSheets = () => { $$('.sheet-wrap').forEach(e => e.remove()); document.body.classList.remove('noscroll'); };
function ask(msg, ok = 'Confirmer', danger = true) {
  return new Promise(res => {
    const el = sheet(`<p class="ask">${esc(msg)}</p><div class="form-actions"><button class="btn" data-no>Annuler</button><button class="btn ${danger ? 'danger-fill' : 'primary'}" data-ok>${esc(ok)}</button></div>`, 'dlg');
    $('[data-no]', el).onclick = () => { el.remove(); if (!$('.sheet-wrap')) document.body.classList.remove('noscroll'); res(false); };
    $('[data-ok]', el).onclick = () => { el.remove(); if (!$('.sheet-wrap')) document.body.classList.remove('noscroll'); res(true); };
    $('.sheet-bg', el).onclick = () => $('[data-no]', el).click();
  });
}

/* ---------- Constructeur de formulaires ---------- */
function fieldHTML(f) {
  const id = 'f_' + f.n, v = f.v ?? '', t = f.t || 'text';
  if (t === 'checkbox') return `<label class="chk ${f.cls || ''}"><input type="checkbox" id="${id}" name="${f.n}" ${v ? 'checked' : ''}> <span>${esc(f.l)}</span></label>`;
  const lab = `<label for="${id}">${esc(f.l)}${f.req ? ' *' : ''}</label>`;
  let inp;
  if (t === 'select') inp = `<select id="${id}" name="${f.n}">${f.opts.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}"${String(ov) === String(v) ? ' selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  else if (t === 'textarea') inp = `<textarea id="${id}" name="${f.n}" rows="3" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''}>${esc(v)}</textarea>`;
  else if (t === 'multi') inp = `<div class="chips">${f.opts.map(([ov, ol]) => `<label class="chip-chk"><input type="checkbox" name="${f.n}" value="${esc(ov)}" ${(v || []).includes(ov) ? 'checked' : ''}><span>${esc(ol)}</span></label>`).join('')}</div>`;
  else if (t === 'file') inp = `<input type="file" id="${id}" name="${f.n}" accept="${f.accept || 'image/*'}">`;
  else if (t === 'number') inp = `<input id="${id}" name="${f.n}" type="number" inputmode="decimal" step="${f.step || 'any'}" ${f.min != null ? `min="${f.min}"` : ''} value="${esc(v)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.req ? 'required' : ''}>`;
  else inp = `<input id="${id}" name="${f.n}" type="${t}" value="${esc(v)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.req ? 'required' : ''} ${f.list ? `list="${f.list}"` : ''} ${t === 'date' && f.max ? `max="${f.max}"` : ''} autocomplete="off">`;
  return `<div class="field ${f.cls || ''}">${lab}${inp}${f.hint ? `<small>${f.hint}</small>` : ''}</div>`;
}
function readForm(form, fields) {
  const v = {};
  for (const f of fields) {
    const x = form.elements[f.n];
    if (f.t === 'checkbox') v[f.n] = x.checked;
    else if (f.t === 'multi') v[f.n] = $$(`[name="${f.n}"]:checked`, form).map(i => i.value);
    else if (f.t === 'file') v[f.n] = x.files[0] || null;
    else if (f.t === 'number') v[f.n] = x.value === '' ? null : num(x.value);
    else v[f.n] = x.value.trim();
  }
  return v;
}
function openForm({ title, fields, submit = 'Enregistrer', onSubmit, onDelete, extra = '', mount, intro = '' }) {
  const el = sheet(`<div class="sheet-head"><h2>${esc(title)}</h2><button class="x" data-close aria-label="Fermer">✕</button></div>${intro}
    <form>${fields.map(fieldHTML).join('')}${extra}<div class="form-actions">${onDelete ? '<button type="button" class="btn danger" data-del>Supprimer</button>' : ''}<button class="btn primary" type="submit">${esc(submit)}</button></div></form>`);
  const form = $('form', el);
  if (onDelete) $('[data-del]', el).onclick = async () => { if (await ask('Supprimer définitivement cet élément ?', 'Supprimer')) { closeSheet(el); onDelete(); } };
  form.onsubmit = async e => {
    e.preventDefault();
    const btn = $('[type=submit]', form); btn.disabled = true;
    try { const r = await onSubmit(readForm(form, fields), form); if (r !== false) closeSheet(el); } catch (err) { console.error(err); toast('Une erreur est survenue.'); }
    btn.disabled = false;
  };
  if (mount) mount(form, el);
  return el;
}

/* ---------- Graphiques SVG ---------- */
function lineChart(points, { band, unit = '', height = 170 } = {}) {
  if (!points.length) return '';
  const W = 340, H = height, L = 34, R = 10, T = 12, B = 22;
  const xs = points.map(p => parseD(p.x).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5 * 15; x1 += 864e5 * 15; }
  const ys = points.map(p => p.y).concat(band || []);
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const pd = (y1 - y0 || 1) * 0.15; y0 = Math.max(0, y0 - pd); y1 += pd;
  const X = t => L + (t - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const ticks = [y0, (y0 + y1) / 2, y1].map(v => `<text x="${L - 5}" y="${Y(v) + 3}" text-anchor="end">${Math.round(v * 10) / 10}</text><line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/>`).join('');
  const bandR = band ? `<rect x="${L}" y="${Y(band[1])}" width="${W - L - R}" height="${Math.max(2, Y(band[0]) - Y(band[1]))}" class="band"/>` : '';
  const fd = t => new Date(t).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Évolution ${unit}">${bandR}${ticks}
    <path d="${path}" class="ln"/>${points.map((p, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.5" class="dot"><title>${fmtDate(p.x)} : ${p.y} ${unit}</title></circle>`).join('')}
    <text x="${L}" y="${H - 5}">${fd(x0)}</text><text x="${W - R}" y="${H - 5}" text-anchor="end">${fd(x1)}</text></svg>`;
}
function barChart(items, { height = 150, fmt = fmtMoney } = {}) {
  const max = Math.max(1, ...items.map(i => i.v)), W = 340, H = height, B = 22, T = 14, bw = (W - 10) / items.length;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${items.map((it, i) => {
    const h = (H - B - T) * it.v / max, x = 5 + i * bw + bw * 0.15;
    return `<rect x="${x.toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${Math.max(h, it.v ? 1.5 : 0).toFixed(1)}" rx="4" class="bar ${it.cls || ''}"><title>${esc(it.l)} : ${fmt(it.v)}</title></rect>
      <text x="${(x + bw * 0.35).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(it.l)}</text>`;
  }).join('')}</svg>`;
}

/* ---------- Abonnement / droits ---------- */
const PREVIEW = (() => { try { const q = new URLSearchParams(location.search).get('preview'); if (q) sessionStorage.setItem('wouf:preview', q); return sessionStorage.getItem('wouf:preview'); } catch (e) { return null; } })();
const isFreeWindow = () => !BILL.enabled || (BILL.freeUntil && today() <= BILL.freeUntil);
function grandfathered() {
  if (!BILL.enabled || !BILL.grandfatherBefore || S.installedAt >= BILL.grandfatherBefore) return false;
  const u = BILL.grandfatherUntil; return !u || u === 'lifetime' || today() <= u;
}
/* Wouf Plus offert par le propriétaire (admin.js) : relu à chaque connexion Google. */
const grantActive = () => !!(S.grant && (S.grant.until === 'lifetime' || (S.grant.until && today() <= S.grant.until)));
const subActive = () => grantActive() || !!(S.sub && S.sub.active && (S.sub.lifetime || (S.sub.until && Date.now() < Date.parse(S.sub.until))));
function plus() { if (PREVIEW === 'free') return false; if (PREVIEW === 'plus') return true; return isFreeWindow() || grandfathered() || subActive(); }
const isPremium = f => (BILL.premium || []).includes(f);
const allowed = f => plus() || !isPremium(f);
/* Formule gratuite : 1 chien + 1 chat. Plus : autant d'animaux que l'on veut. */
const petsOf = sp => S.dogs.filter(d => (d.species || 'dog') === sp);
function canAddPet(sp) { return plus() || !isPremium('multiDogs') || petsOf(sp).length < ((BILL.limits || {}).perSpecies || 1); }
const canAddAnyPet = () => canAddPet('dog') || canAddPet('cat');
function canAddDoc() { return plus() || !isPremium('documents') || S.docs.filter(d => d.dogId === (dog() || {}).id).length < ((BILL.limits || {}).documents || 3); }
function gate(f, fn) { if (allowed(f)) return fn(); paywall(f); }

/* ---------- Petits utilitaires d'export ---------- */
function download(name, data, type = 'application/octet-stream') {
  const b = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function shareOrDownload(file, text) {
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  download(file.name, file);
}
const phoneLink = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
const fmtPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? d.replace(/(\d{2})(?=\d)/g, '$1 ') : (p || ''); };
