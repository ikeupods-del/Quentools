'use strict';
/* Wouf Plus — suivi GPS des balades : chrono, distance, allure, tracé, objectif du jour, historique, export GPX.
   Limite technique honnête : une application web ne peut suivre le GPS que lorsque l'écran reste allumé et l'app
   ouverte au premier plan (le suivi est gardé actif avec le « verrou d'écran » quand le navigateur le permet).
   Un traceur GPS matériel (collier connecté) n'est pas concerné : ce suivi utilise le GPS du téléphone du promeneur. */

const WALK = { on: false, paused: false, dogId: null, pts: [], dist: 0, t0: 0, acc: 0, tick: 0, watch: null, wake: null, gps: '', iv: null, gap: false, saveAt: 0, steps: 0, motion: 'off', t1: 0 };
const WALK_KEY = 'wouf:walk';

const distM = (a, b) => haversine(a.lat, a.lon, b.lat, b.lon) * 1000;
const fmtDur = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} h ${pad(m)}` : `${m}:${pad(s % 60)}`; };
const fmtKm = m => (m / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km';
const walkElapsed = () => WALK.acc + (WALK.on && !WALK.paused ? Date.now() - WALK.tick : 0);
const fmtPace = (durS, m) => { if (m < 50) return '—'; const p = durS / 60 / (m / 1000); return `${Math.floor(p)}:${pad(Math.round((p % 1) * 60) % 60)} /km`; };

function walkPersist(force) {
  if (!WALK.on) return;
  if (!force && Date.now() - WALK.saveAt < 8000) return;
  WALK.saveAt = Date.now();
  try { localStorage.setItem(WALK_KEY, JSON.stringify({ dogId: WALK.dogId, pts: WALK.pts, dist: WALK.dist, steps: WALK.steps, t0: WALK.t0, acc: walkElapsed(), paused: WALK.paused })); } catch (e) { /* quota */ }
}
async function wakeLock(on) {
  try {
    if (on && 'wakeLock' in navigator && !WALK.wake) { WALK.wake = await navigator.wakeLock.request('screen'); WALK.wake.addEventListener('release', () => { WALK.wake = null; }); }
    else if (!on && WALK.wake) { await WALK.wake.release(); WALK.wake = null; }
  } catch (e) { /* non supporté ou refusé */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && WALK.on && !WALK.paused) wakeLock(true); else if (document.visibilityState === 'hidden') walkPersist(true); });

/* ---------- Compteur de pas (accéléromètre du téléphone) ----------
   Détection de pics sur l'accélération sans la gravité. Sert aussi de secours pour la distance quand le GPS est faible. */
function stepCounter(thr = 0.9) {
  let g = 9.81, s = 0, armed = true, last = 0, n = 0;
  return { get n() { return n; }, set n(v) { n = v; },
    push(m, t) {
      g += (m - g) * 0.08; s = s * 0.55 + (m - g) * 0.45;
      if (armed && s > thr && t - last > 280) { n++; last = t; armed = false; return true; }
      if (s < thr * 0.3) armed = true; return false;
    } };
}
const STEP = stepCounter();
const strideM = () => (S.settings && S.settings.stride) || 0.72;
const walkStepDist = () => WALK.steps * strideM();
/* Distance retenue : le GPS s'il est cohérent, sinon l'estimation par les pas (GPS faible, intérieur, ville dense). */
const walkDist = () => WALK.dist < walkStepDist() * 0.5 ? walkStepDist() : WALK.dist;
function onMotion(e) {
  if (!WALK.on || WALK.paused) return;
  const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
  WALK.motion = 'on';
  if (STEP.push(Math.hypot(a.x, a.y, a.z), Date.now())) { WALK.steps = STEP.n; }
}
async function motionStart() {
  STEP.n = WALK.steps || 0;
  if (typeof DeviceMotionEvent === 'undefined') { WALK.motion = 'none'; return; }
  try { if (typeof DeviceMotionEvent.requestPermission === 'function') { const r = await DeviceMotionEvent.requestPermission(); if (r !== 'granted') { WALK.motion = 'denied'; return; } } } catch (e) { WALK.motion = 'denied'; return; }
  WALK.motion = 'wait'; window.removeEventListener('devicemotion', onMotion); window.addEventListener('devicemotion', onMotion);
}
function motionStop() { window.removeEventListener('devicemotion', onMotion); }

function onPos(p) {
  if (!WALK.on || WALK.paused) return;
  const c = p.coords;
  WALK.gps = c.accuracy > 60 ? 'weak' : 'ok';
  if (c.accuracy > 100) return liveRefresh();
  const pt = { lat: c.latitude, lon: c.longitude, t: p.timestamp, acc: c.accuracy }, last = WALK.pts[WALK.pts.length - 1];
  if (last && !WALK.gap) {
    const d = distM(last, pt), dt = (pt.t - last.t) / 1000;
    if (d < Math.max(4, c.accuracy * 0.4)) return liveRefresh();      // bruit du GPS à l'arrêt
    if (dt > 0 && d / dt > 12) return liveRefresh();                   // saut irréaliste (> 43 km/h)
    WALK.dist += d;
  }
  WALK.gap = false; WALK.pts.push(pt); walkPersist(); liveRefresh();
}
function onPosErr(e) {
  WALK.gps = e.code === 1 ? 'denied' : 'lost';
  liveRefresh();
}
function watchStart() { if (navigator.geolocation && WALK.watch == null) WALK.watch = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }); }
function watchStop() { if (WALK.watch != null) navigator.geolocation.clearWatch(WALK.watch); WALK.watch = null; }

function walkStart(resume) {
  if (!navigator.geolocation) return toast('Le GPS n’est pas disponible sur cet appareil.');
  if (!resume) Object.assign(WALK, { on: true, paused: false, dogId: dog().id, pts: [], dist: 0, t0: Date.now(), acc: 0, tick: Date.now(), gps: 'wait', gap: false, steps: 0, t1: Date.now() });
  else { WALK.on = true; WALK.tick = Date.now(); WALK.gap = true; WALK.gps = 'wait'; }
  watchStart(); motionStart(); wakeLock(true); walkPersist(true); render(true);
}
function walkPause() { WALK.acc = walkElapsed(); WALK.paused = true; walkPersist(true); render(true); }
function walkResume() { WALK.paused = false; WALK.tick = Date.now(); WALK.gap = true; watchStart(); motionStart(); wakeLock(true); render(true); }

/* Réduit à 200 points maximum : [lat, lon, secondes depuis le départ] */
function simplify(pts, t0) {
  const step = Math.max(1, Math.ceil(pts.length / 200)), out = [];
  pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) out.push([Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5, Math.round((p.t - t0) / 1000)]); });
  return out;
}
function walkFinish() {
  const dur = Math.round(walkElapsed() / 1000), dist = Math.round(walkDist()), viaSteps = WALK.dist < walkStepDist() * 0.5 && WALK.steps > 20;
  const rec = { id: uid(), dogId: WALK.dogId, date: iso(new Date(WALK.t0)), start: WALK.t0, dur, dist, pts: simplify(WALK.pts, WALK.t0), manual: false, steps: WALK.steps, src: viaSteps ? 'steps' : 'gps' };
  watchStop(); motionStop(); wakeLock(false); WALK.on = false; clearInterval(WALK.iv); try { localStorage.removeItem(WALK_KEY); } catch (e) { /* rien */ }
  if (dur < 30 && dist < 30 && WALK.steps < 20) { toast('Balade trop courte : non enregistrée'); return render(); }
  S.walks = S.walks || []; S.walks.push(rec); save(); toast('Balade enregistrée ✓'); location.hash = '#/balade-detail?id=' + rec.id; render();
}
async function walkAbort() {
  if (!(await ask('Abandonner cette balade sans l’enregistrer ?', 'Abandonner'))) return;
  watchStop(); motionStop(); wakeLock(false); WALK.on = false; clearInterval(WALK.iv); try { localStorage.removeItem(WALK_KEY); } catch (e) { /* rien */ } render();
}
function walkRecover() {   // balade interrompue (rechargement, batterie…) : proposer de reprendre
  let r; try { r = JSON.parse(localStorage.getItem(WALK_KEY)); } catch (e) { return; }
  if (!r || !r.pts || WALK.on) return;
  Object.assign(WALK, { dogId: r.dogId, pts: r.pts, dist: r.dist, steps: r.steps || 0, t0: r.t0, acc: r.acc, paused: true, on: true, tick: Date.now(), gps: 'wait' });
  toast('Balade en cours retrouvée : reprenez ou terminez-la');
}

/* ---------- Tracé SVG ---------- */
function traceSVG(pts, { w = 340, h = 220 } = {}) {
  if (pts.length < 2) return `<div class="trace empty-trace" style="height:${h}px"><span>Le tracé apparaîtra dès que vous avancez</span></div>`;
  const P = pts.map(p => (Array.isArray(p) ? { lat: p[0], lon: p[1] } : p)), lat0 = P.reduce((s, p) => s + p.lat, 0) / P.length, k = Math.cos(lat0 * Math.PI / 180);
  const xs = P.map(p => p.lon * k), ys = P.map(p => p.lat), pad = 16;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), sc = Math.min((w - 2 * pad) / ((x1 - x0) || 1e-6), (h - 2 * pad) / ((y1 - y0) || 1e-6));
  const ox = (w - (x1 - x0) * sc) / 2, oy = (h - (y1 - y0) * sc) / 2;
  const X = v => (ox + (v * k - x0) * sc).toFixed(1), Y = v => (h - oy - (v - y0) * sc).toFixed(1);
  const d = P.map((p, i) => `${i ? 'L' : 'M'}${X(p.lon)},${Y(p.lat)}`).join(' '), a = P[0], b = P[P.length - 1];
  return `<svg class="trace" viewBox="0 0 ${w} ${h}" role="img" aria-label="Tracé de la balade"><path d="${d}" class="route-halo"/><path d="${d}" class="route"/><circle cx="${X(a.lon)}" cy="${Y(a.lat)}" r="6" class="r-start"/><circle cx="${X(b.lon)}" cy="${Y(b.lat)}" r="6" class="r-end"/></svg>`;
}

/* ---------- Objectif quotidien ---------- */
function dailyGoal(d) {
  if (d.goalMin) return d.goalMin;
  if (spOf(d).id === 'cat') return 20;
  const m = d.birth ? ageMonths(d.birth) : 36, size = dogSize(d);
  if (m < 12) return Math.max(15, Math.min(60, m * 10));
  const base = { S: 45, M: 60, L: 90, XL: 60 }[size] || 60;
  return lifeStage(d) === 'Senior' ? Math.round(base * 0.7) : base;
}
const dogWalks = id => (S.walks || []).filter(w => w.dogId === id).sort((a, b) => b.start - a.start);
const walksOn = (id, date) => dogWalks(id).filter(w => w.date === date);
const walkMinutes = list => Math.round(sum(list.map(w => w.dur)) / 60);

/* ---------- Écrans ---------- */
function liveRefresh() {
  const set = (id, v) => { const e = $('#' + id); if (e) e.textContent = v; };
  const el = walkElapsed() / 1000;
  set('w-time', fmtDur(el)); const D = walkDist(); set('w-dist', fmtKm(D)); set('w-pace', fmtPace(el, D)); set('w-steps', WALK.steps.toLocaleString('fr-FR'));
  set('w-gps', (WALK.gps === 'wait' && WALK.t1 && Date.now() - WALK.t1 > 20000 ? '🔎 Toujours pas de signal GPS : sortez à l’air libre et activez la localisation précise. Les pas prennent le relais.' : null) || { ok: '🟢 GPS bon', weak: '🟠 Signal faible', wait: '🔎 Recherche du signal…', denied: '🔴 Localisation refusée', lost: '🟠 Signal perdu' }[WALK.gps] || '');
  const t = $('#w-trace'); if (t && (WALK.pts.length !== t.dataset.n)) { t.innerHTML = traceSVG(WALK.pts); t.dataset.n = WALK.pts.length; }
}
ROUTES.balade = function balade() {
  const d = dog(), sp = spOf(d);
  if (!allowed('tracker')) return `<div class="page-h"><a class="back" href="#/suivi">‹</a><h1>🦮 Balades</h1></div><section class="card"><p>Suivez chaque sortie de <b>${esc(d.name)}</b> au GPS : distance, durée, allure, tracé sur la carte, objectif du jour et historique.</p>
    <ul class="bul"><li>Tracé de l’itinéraire et statistiques</li><li>Objectif quotidien adapté à ${esc(d.name)}</li><li>Historique, série de jours actifs, export GPX</li></ul><button class="btn primary big" data-act="paywall" data-f="tracker">⭐ Débloquer avec Wouf Plus</button></section>`;
  if (WALK.on) {
    return `<div class="page-h"><h1>🦮 Balade en cours</h1></div>
    <section class="card live"><div class="live-time" id="w-time">0:00</div><div class="kv-line live-kv"><span>Distance<b id="w-dist">0,00 km</b></span><span>Allure<b id="w-pace">—</b></span><span>Pas<b id="w-steps">0</b></span></div>
    <p class="center mut" id="w-gps"></p><div id="w-trace" data-n="-1" class="trace-wrap">${traceSVG(WALK.pts)}</div>
    <div class="score-row">${WALK.paused ? '<button class="btn primary big" data-act="w-resume">▶ Reprendre</button>' : '<button class="btn big" data-act="w-pause">⏸ Pause</button>'}<button class="btn ok-fill big" data-act="w-finish">🏁 Terminer</button></div>
    <button class="btn danger" data-act="w-abort">Abandonner</button>
    <p class="mut small">Gardez l’écran allumé et l’app ouverte : une application web ne peut suivre ni le GPS ni les pas quand le téléphone est verrouillé. Les pas sont comptés par le capteur de mouvement du téléphone (gardez-le sur vous) et remplacent le GPS quand celui-ci est faible.</p></section>`;
  }
  const goal = dailyGoal(d), todayMin = walkMinutes(walksOn(d.id, today())), pct = Math.min(100, Math.round(100 * todayMin / goal));
  const days = []; for (let i = 6; i >= 0; i--) { const dt = addDays(today(), -i); days.push({ l: parseD(dt).toLocaleDateString('fr-FR', { weekday: 'narrow' }), v: walkMinutes(walksOn(d.id, dt)), cls: dt === today() ? '' : '' }); }
  const week = dogWalks(d.id).filter(w => diffDays(today(), w.date) < 7), all = dogWalks(d.id);
  let streak = 0, cur = today(); if (!walksOn(d.id, cur).length) cur = addDays(cur, -1); while (walksOn(d.id, cur).length) { streak++; cur = addDays(cur, -1); }
  const R = 34, C = 2 * Math.PI * R;
  return `<div class="page-h"><a class="back" href="#/suivi">‹</a><h1>🦮 Balades</h1><button class="btn sm" data-act="w-manual">＋ Manuel</button></div>
  <section class="card"><div class="score"><svg viewBox="0 0 80 80" class="ring"><circle cx="40" cy="40" r="${R}" class="trk"/><circle cx="40" cy="40" r="${R}" class="val ${pct >= 100 ? 'ok' : pct >= 50 ? 'warn' : 'bad'}" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}"/><text x="40" y="46" text-anchor="middle">${pct}%</text></svg>
    <div><b>${todayMin} / ${goal} min</b> aujourd’hui<br><small class="mut">${streak ? '🔥 ' + streak + ' jour' + (streak > 1 ? 's' : '') + ' d’affilée' : 'Aucune sortie enregistrée aujourd’hui'}</small><br><button class="lnk" data-act="w-goal">Modifier l’objectif</button></div></div>
    <button class="btn primary big" data-act="w-start">▶ Démarrer une ${sp.id === 'cat' ? 'sortie' : 'balade'}</button><p class="mut small center">GPS + compteur de pas · longueur de pas : ${strideM().toFixed(2).replace('.', ',')} m <button class="lnk" data-act="w-stride">modifier</button></p></section>
  <section class="card"><h2>7 derniers jours (minutes)</h2>${barChart(days, { fmt: v => v + ' min' })}<div class="kv-line"><span>Sorties<b>${week.length}</b></span><span>Distance<b>${fmtKm(sum(week.map(w => w.dist)))}</b></span><span>Temps<b>${walkMinutes(week)} min</b></span></div></section>
  <div class="list card">${all.slice(0, 30).map(w => `<a class="row" href="#/balade-detail?id=${w.id}"><span class="ico">${w.manual ? '✍️' : '📍'}</span><span class="grow"><b>${fmtDate(w.date)} · ${fmtDur(w.dur)}</b><small>${w.dist ? fmtKm(w.dist) + ' · ' + fmtPace(w.dur, w.dist) + (w.steps ? ' · ' + w.steps + ' pas' : '') : 'Distance non renseignée'}</small></span><span class="chev">›</span></a>`).join('') || '<p class="empty">Aucune balade enregistrée. Démarrez-en une !</p>'}</div>`;
};
ROUTES.balade.after = () => { clearInterval(WALK.iv); if (WALK.on) { liveRefresh(); WALK.iv = setInterval(liveRefresh, 1000); } };
ROUTES['balade-detail'] = function baladeDetail() {
  const w = (S.walks || []).find(x => x.id === routeParam('id'));
  if (!w) return '<p class="empty">Balade introuvable.</p><a class="btn" href="#/balade">Retour</a>';
  const d = S.dogs.find(x => x.id === w.dogId) || dog();
  return `<div class="page-h"><a class="back" href="#/balade">‹</a><h1>${esc(fmtDate(w.date))}</h1></div>
  <section class="card">${w.pts && w.pts.length > 1 ? `<div class="trace-wrap">${traceSVG(w.pts)}</div>` : ''}
    <div class="kv-line big-kv"><span>Durée<b>${fmtDur(w.dur)}</b></span><span>Distance<b>${w.dist ? fmtKm(w.dist) : '—'}</b></span><span>Allure<b>${fmtPace(w.dur, w.dist)}</b></span>${w.steps ? `<span>Pas<b>${w.steps.toLocaleString('fr-FR')}</b></span>` : ''}<span>Vitesse moy.<b>${w.dist ? (w.dist / 1000 / (w.dur / 3600)).toFixed(1).replace('.', ',') + ' km/h' : '—'}</b></span></div>
    <p class="mut">${esc(d.name)} · départ à ${new Date(w.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${w.note ? ' · ' + esc(w.note) : ''}</p>
    <div class="btn-row">${w.pts && w.pts.length > 1 ? `<button class="btn" data-act="w-gpx" data-id="${w.id}">⬇️ Exporter GPX</button>` : ''}<button class="btn danger" data-act="w-del" data-id="${w.id}">Supprimer</button></div></section>`;
};
ACT['w-start'] = () => gate('tracker', () => walkStart(false));
ACT['w-pause'] = walkPause; ACT['w-resume'] = walkResume; ACT['w-finish'] = walkFinish; ACT['w-abort'] = walkAbort;
ACT['w-del'] = async ({ id }) => { if (await ask('Supprimer cette balade ?', 'Supprimer')) { S.walks = S.walks.filter(w => w.id !== id); save(); location.hash = '#/balade'; } };
ACT['w-gpx'] = ({ id }) => {
  const w = S.walks.find(x => x.id === id), d = S.dogs.find(x => x.id === w.dogId) || dog();
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Wouf" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${esc(d.name)} – ${w.date}</name><trkseg>\n${w.pts.map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"><time>${new Date(w.start + p[2] * 1000).toISOString()}</time></trkpt>`).join('\n')}\n</trkseg></trk></gpx>`;
  download(`balade-${d.name}-${w.date}.gpx`, gpx, 'application/gpx+xml');
};
ACT['w-goal'] = () => {
  const d = dog();
  openForm({ title: 'Objectif quotidien', fields: [{ n: 'goal', l: 'Minutes de sortie par jour', t: 'number', v: dailyGoal(d), min: 5, req: true, hint: `Suggestion selon l’âge et la taille : ${(() => { const g = d.goalMin; d.goalMin = 0; const r = dailyGoal(d); d.goalMin = g; return r; })()} min.` }],
    onSubmit(v) { d.goalMin = Math.round(v.goal); save(); render(true); } });
};
ACT['w-manual'] = () => gate('tracker', () => {
  openForm({ title: 'Ajouter une balade', fields: [{ n: 'date', l: 'Date', t: 'date', v: today(), req: true, cls: 'half' }, { n: 'min', l: 'Durée (minutes)', t: 'number', req: true, min: 1, cls: 'half' }, { n: 'km', l: 'Distance (km) — facultatif', t: 'number', min: 0 }, { n: 'note', l: 'Note', v: '' }],
    onSubmit(v) { S.walks = S.walks || []; S.walks.push({ id: uid(), dogId: dog().id, date: v.date, start: parseD(v.date).getTime() + 9 * 36e5, dur: Math.round(v.min * 60), dist: Math.round((v.km || 0) * 1000), pts: [], manual: true, note: v.note }); save(); render(true); toast('Balade ajoutée ✓'); } });
});
ACT['w-stride'] = () => openForm({ title: 'Longueur de votre pas', fields: [{ n: 'cm', l: 'Longueur de pas (cm)', t: 'number', v: Math.round(strideM() * 100), min: 30, max: 120, req: true, hint: 'Environ 72 cm en moyenne (taille × 0,43). Sert à estimer la distance quand le GPS est faible.' }],
  onSubmit(v) { S.settings.stride = Math.round(v.cm) / 100; save(); render(true); } });
