/* Maison Blade : rituels, galerie, barbiers, réservation en 3 choix, animations au défilement. Sans dépendance.
   Les disponibilités sont simulées (déterministes) et les rendez-vous gardés dans le navigateur : à brancher sur la base de données pour un vrai salon. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = n => n.toLocaleString('fr-FR') + '\u00a0€';
  const pad = n => String(n).padStart(2, '0');

  /* ---------- Contenu (à adapter) ---------- */
  const SERVICES = [
    { id: 'coupe', name: 'Coupe signature', desc: 'Consultation, coupe aux ciseaux, finitions à la lame, coiffage.', price: 85, dur: 60, icon: 'scissors' },
    { id: 'barbe', name: 'Taille de barbe', desc: 'Dessin des contours, taille au peigne, huile et baume.', price: 55, dur: 30, icon: 'razor' },
    { id: 'serviette', name: 'Soin du visage à la serviette chaude', desc: 'Gommage doux, vapeur, massage, masque, serviettes chaudes.', price: 75, dur: 60, icon: 'towel' },
    { id: 'maison', name: 'Le Rituel Maison', desc: 'Coupe, barbe et soin du visage : l’expérience complète.', price: 190, dur: 120, icon: 'brush', star: true }
  ];
  const BARBERS = [
    { id: 'matteo', name: 'Matteo Rossi', role: 'Maître barbier · fondateur', bio: 'Vingt ans de ciseaux, formé à Milan. La coupe signature, c’est lui.', does: ['coupe', 'barbe', 'serviette', 'maison'] },
    { id: 'julien', name: 'Julien Marchand', role: 'Barbe & rasage', bio: 'Le rasage d’autrefois, la lame droite et la patience.', does: ['barbe', 'serviette', 'maison', 'coupe'] },
    { id: 'elias', name: 'Elias Kaddour', role: 'Soin du visage & finitions', bio: 'Mains douces, œil précis : le rituel bien-être.', does: ['serviette', 'barbe', 'maison'] }
  ];
  const PLATES = [
    { t: 'La coupe signature', k: 'Ciseaux & peigne', icon: 'scissors', cls: 'col-span-2 row-span-2 md:col-span-7', bg: 'radial-gradient(75% 75% at 28% 18%,#6a4a31,#251912 70%)' },
    { t: 'Finitions à la lame', k: 'Détail', icon: 'razor', cls: 'md:col-span-5', bg: 'radial-gradient(80% 80% at 70% 15%,#45423e,#131211 72%)' },
    { t: 'Serviette chaude', k: 'Rituel', icon: 'towel', cls: 'md:col-span-5', bg: 'radial-gradient(80% 80% at 25% 20%,#7a5d3b,#1b1511 72%)' },
    { t: 'L’atelier', k: 'Le salon', icon: 'brush', cls: 'md:col-span-4', bg: 'radial-gradient(80% 80% at 60% 20%,#3a352f,#12100e 72%)' },
    { t: 'Huiles & baumes', k: 'Produits', icon: 'bottle', cls: 'md:col-span-4', bg: 'radial-gradient(80% 80% at 30% 20%,#5b4630,#17120e 72%)' },
    { t: 'Peigne en corne', k: 'Accessoires', icon: 'comb', cls: 'col-span-2 md:col-span-4', bg: 'radial-gradient(80% 80% at 70% 20%,#4a4035,#141210 72%)' }
  ];
  const ico = (n, c) => `<svg class="${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  /* ---------- Rituels, galerie, barbiers ---------- */
  $('#rituals').innerHTML = SERVICES.map((s, i) => `<article class="glass glass-hover rv flex flex-col p-7${s.star ? ' !border-bronze/50' : ''}" style="--i:${i}">
      <div class="flex items-start justify-between">${ico(s.icon, 'h-11 w-11 text-bronze')}${s.star ? '<span class="eyebrow">La signature</span>' : ''}</div>
      <h3 class="mt-8 text-[1.85rem]">${esc(s.name)}</h3>
      <p class="mt-3 flex-1 text-sm text-mist">${esc(s.desc)}</p>
      <div class="mt-8 flex items-baseline justify-between border-t border-white/10 pt-5"><span class="font-serif text-4xl text-champagne">${eur(s.price)}</span><span class="text-xs uppercase tracking-wide2 text-mist">${s.dur >= 60 ? s.dur / 60 + ' h' : s.dur + ' min'}${s.dur % 60 && s.dur > 60 ? '' : ''}</span></div>
      <button type="button" class="link mt-5 self-start text-[.72rem] uppercase tracking-wide2" data-book="${s.id}">Réserver ce rituel <span class="arrow">→</span></button></article>`).join('');

  $('#gallery').innerHTML = PLATES.map((p, i) => `<figure class="plate rv ${p.cls}" tabindex="0" role="button" aria-label="Agrandir : ${esc(p.t)}" data-i="${i}" style="--bg:${p.bg};--i:${i % 3}">
      <div class="art absolute inset-0">${ico(p.icon, 'absolute left-1/2 top-1/2 aspect-square h-[58%] -translate-x-1/2 -translate-y-1/2 text-champagne/35')}<div class="absolute inset-0" style="background:radial-gradient(60% 40% at 50% 0%,rgba(255,255,255,.08),transparent)"></div></div>
      <div class="sk"></div><figcaption><span class="eyebrow">${esc(p.k)}</span><h3 class="mt-1 font-serif text-2xl md:text-3xl">${esc(p.t)}</h3></figcaption></figure>`).join('');

  $('#team').innerHTML = BARBERS.map((b, i) => `<article class="rv bg-coal p-8 transition duration-700 ease-lux hover:bg-graphite md:p-10" style="--i:${i}">
      <div class="grid h-20 w-20 place-items-center rounded-full border border-bronze/50 font-serif text-3xl text-champagne">${esc(b.name.split(' ').map(x => x[0]).join(''))}</div>
      <h3 class="mt-8 text-3xl">${esc(b.name)}</h3><p class="eyebrow mt-3">${esc(b.role)}</p><p class="mt-5 text-sm text-mist">${esc(b.bio)}</p>
      <button type="button" class="link mt-6 text-[.72rem] uppercase tracking-wide2" data-barber="${b.id}">Réserver avec ${esc(b.name.split(' ')[0])} <span class="arrow">→</span></button></article>`).join('');

  /* ---------- Réservation : rituel → barbier → créneau ---------- */
  const KEY = 'maison-blade:rdv';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const store = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* stockage indisponible */ } };
  const hash = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967295; };
  const st = { svc: null, barber: null, date: null, time: null, step: 1 };
  const svcOf = id => SERVICES.find(s => s.id === id), barOf = id => BARBERS.find(b => b.id === id);
  const slotsOf = d => { const w = new Date(d + 'T12:00').getDay(); if (w === 0 || w === 1) return []; const end = w === 6 ? 18 : 20, out = []; for (let m = (w === 6 ? 9 : 10) * 60; m < end * 60; m += 30) out.push(pad(Math.floor(m / 60)) + ':' + pad(m % 60)); return out; };
  const addMin = (t, n) => { const m = +t.slice(0, 2) * 60 + +t.slice(3) + n; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const days = () => { const out = [], d = new Date(); for (let i = 0; out.length < 10 && i < 30; i++) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i); if (slotsOf(ymd(x)).length) out.push(x); } return out; };
  const fr = (s, o) => new Date(s + 'T12:00').toLocaleDateString('fr-FR', o);
  const eligible = () => BARBERS.filter(b => !st.svc || b.does.includes(st.svc));

  function free(date, time, barberId) {
    const n = Math.ceil(svcOf(st.svc).dur / 30), all = slotsOf(date), at = all.indexOf(time), mine = load();
    if (at < 0 || at + n > all.length) return false;
    for (let k = 0; k < n; k++) {
      const t = all[at + k];
      if (hash(date + barberId + t) < 0.22) return false;
      if (mine.some(r => r.date === date && r.barber === barberId && r.slots.includes(t))) return false;
      if (date === ymd(new Date())) { const now = new Date(); if (+t.slice(0, 2) * 60 + +t.slice(3) < now.getHours() * 60 + now.getMinutes() + 60) return false; }
    }
    return true;
  }
  const barberFor = (date, time) => (st.barber ? [barOf(st.barber)] : eligible()).find(b => free(date, time, b.id)) || null;

  function setStep(n) {
    st.step = n;
    $$('#bk .step').forEach((el, i) => {
      el.classList.toggle('open', i + 1 === n);
      el.classList.toggle('done', i + 1 < n);
      $('.step-h', el).setAttribute('aria-expanded', i + 1 === n);
    });
  }

  function renderSvc() {
    $('#bk-svc').innerHTML = SERVICES.map(s => `<button type="button" class="opt" data-svc="${s.id}" aria-pressed="${st.svc === s.id}"><span class="flex items-baseline justify-between gap-4"><span class="font-serif text-xl">${esc(s.name)}</span><span class="font-serif text-xl text-champagne">${eur(s.price)}</span></span><span class="mt-1 block text-xs text-mist">${s.dur >= 60 ? s.dur / 60 + ' h' : s.dur + ' min'}</span></button>`).join('');
  }
  function renderBar() {
    const list = eligible();
    $('#bk-bar').innerHTML = `<button type="button" class="opt" data-bar="any" aria-pressed="${st.barber === null && st.step > 2}"><span class="font-serif text-xl">Sans préférence</span><span class="mt-1 block text-xs text-mist">Le premier barbier disponible</span></button>` +
      list.map(b => `<button type="button" class="opt" data-bar="${b.id}" aria-pressed="${st.barber === b.id}"><span class="font-serif text-xl">${esc(b.name)}</span><span class="mt-1 block text-xs text-mist">${esc(b.role)}</span></button>`).join('');
  }
  let skTimer;
  function renderDays() {
    $('#bk-days').innerHTML = days().map(d => { const k = ymd(d); return `<button type="button" class="chip shrink-0" data-day="${k}" aria-pressed="${st.date === k}"><span class="block text-[.62rem] uppercase tracking-wide2 opacity-70">${d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span><span class="font-serif text-xl">${d.getDate()}</span><span class="block text-[.62rem] uppercase tracking-wide2 opacity-70">${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span></button>`; }).join('');
  }
  function renderSlots(withSkeleton) {
    const box = $('#bk-slots');
    clearTimeout(skTimer);
    if (!st.date) { box.innerHTML = '<p class="text-sm text-mist">Choisissez un jour pour voir les heures disponibles.</p>'; return; }
    const paint = () => {
      const all = slotsOf(st.date).map(t => [t, !!barberFor(st.date, t)]);
      box.innerHTML = all.some(x => x[1]) ? all.map(x => `<button type="button" class="chip" data-time="${x[0]}" aria-pressed="${st.time === x[0]}"${x[1] ? '' : ' disabled'}>${x[0]}</button>`).join('') : '<p class="text-sm text-mist">Complet ce jour-là : essayez un autre jour ou « Sans préférence ».</p>';
    };
    if (withSkeleton && !reduced) {
      box.innerHTML = Array.from({ length: 10 }, () => '<span class="sk h-[46px] w-[76px]"></span>').join('');
      skTimer = setTimeout(paint, 520);
    } else paint();
  }
  function renderSum() {
    const s = st.svc && svcOf(st.svc), b = st.time && barberFor(st.date, st.time);
    const row = (k, v) => `<div class="flex items-baseline justify-between gap-4 border-b border-white/[.07] pb-3"><span class="text-xs uppercase tracking-wide2 text-mist">${k}</span><span class="text-right">${v}</span></div>`;
    $('#sum').innerHTML = row('Rituel', s ? esc(s.name) : '<span class="text-mist">À choisir</span>') +
      row('Barbier', st.step > 2 || st.barber ? (st.barber ? esc(barOf(st.barber).name) : (b ? esc(b.name) : 'Sans préférence')) : '<span class="text-mist">À choisir</span>') +
      row('Créneau', st.time ? esc(fr(st.date, { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + st.time : '<span class="text-mist">À choisir</span>') +
      `<div class="flex items-baseline justify-between pt-2"><span class="text-xs uppercase tracking-wide2 text-mist">Total</span><span class="font-serif text-4xl text-champagne">${s ? eur(s.price) : '—'}</span></div>`;
    $('#bk-form').hidden = !(st.time && !$('#bk-done').innerHTML);
    $('#v1').textContent = s ? s.name : 'Choisir';
    $('#v2').textContent = st.step > 2 || st.barber ? (st.barber ? barOf(st.barber).name : 'Sans préférence') : 'Choisir';
    $('#v3').textContent = st.time ? fr(st.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + st.time : 'Choisir';
  }
  function refresh(skeleton) { renderSvc(); renderBar(); renderDays(); renderSlots(skeleton); renderSum(); setStep(st.step); }

  function pick(kind, v) {
    if (kind === 'svc') {
      st.svc = v; if (st.barber && !barOf(st.barber).does.includes(v)) st.barber = null; st.time = null; refresh(); setStep(2);
    } else if (kind === 'bar') {
      st.barber = v === 'any' ? null : v; st.time = null; st.step = 3; refresh(); setStep(3);
    } else if (kind === 'day') { st.date = v; st.time = null; renderDays(); renderSlots(true); renderSum(); }
    else if (kind === 'time') { st.time = v; renderSlots(); renderSum(); $('#bk-form').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }); }
    renderSum();
  }
  $('#bk').addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.svc) pick('svc', t.dataset.svc);
    else if (t.dataset.bar) pick('bar', t.dataset.bar);
    else if (t.dataset.day) pick('day', t.dataset.day);
    else if (t.dataset.time) pick('time', t.dataset.time);
    else if (t.dataset.step) { if (+t.dataset.step === 1 || st.svc) { setStep(+t.dataset.step); refresh(); } }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book],[data-barber]');
    if (!b) return;
    if (b.dataset.book) { st.svc = b.dataset.book; st.barber = null; st.time = null; st.step = 2; }
    else { st.barber = b.dataset.barber; if (!st.svc) st.step = 1; else if (!barOf(st.barber).does.includes(st.svc)) { st.svc = null; st.step = 1; } else st.step = 3; }
    refresh(); setStep(st.step);
    $('#reserver').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  const ics = r => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maison Blade//FR', 'BEGIN:VEVENT', 'UID:' + r.id + '@maison-blade', 'DTSTAMP:' + r.date.replace(/-/g, '') + 'T000000', 'DTSTART:' + r.date.replace(/-/g, '') + 'T' + r.time.replace(':', '') + '00', 'DTEND:' + r.date.replace(/-/g, '') + 'T' + addMin(r.time, r.dur).replace(':', '') + '00', 'SUMMARY:' + r.svcName + ' · Maison Blade', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  $('#bk-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target), name = String(f.get('name') || '').trim(), mail = String(f.get('email') || '').trim(), err = $('#bk-err');
    err.hidden = true;
    if (!name || !/^\S+@\S+\.\S+$/.test(mail)) { err.textContent = 'Indiquez votre nom et un e-mail valide.'; err.hidden = false; return; }
    const b = barberFor(st.date, st.time), s = svcOf(st.svc);
    if (!b) { err.textContent = 'Ce créneau vient d’être pris. Choisissez-en un autre.'; err.hidden = false; renderSlots(); return; }
    const all = slotsOf(st.date), at = all.indexOf(st.time), n = Math.ceil(s.dur / 30);
    const r = { id: Math.random().toString(36).slice(2, 8).toUpperCase(), date: st.date, time: st.time, dur: s.dur, barber: b.id, slots: all.slice(at, at + n), svc: s.id, svcName: s.name, name, mail };
    store(load().concat(r));
    $('#bk-form').hidden = true; $('#bk-form').reset();
    const d = $('#bk-done');
    d.hidden = false;
    d.innerHTML = `<div class="mt-8 border-t border-white/10 pt-8"><p class="eyebrow">Rendez-vous confirmé</p><p class="mt-4 font-serif text-3xl">À très bientôt, ${esc(name.split(' ')[0])}.</p>
      <p class="mt-3 text-sm text-mist">${esc(s.name)} avec ${esc(b.name)}<br>${esc(fr(r.date, { weekday: 'long', day: 'numeric', month: 'long' }))} à ${esc(r.time)}<br>Référence ${r.id}</p>
      <div class="mt-6 flex flex-wrap gap-3"><button class="btn-line !min-h-[44px] !px-5" id="icsBtn" type="button">Ajouter à l’agenda</button><button class="link text-[.72rem] uppercase tracking-wide2" id="again" type="button">Nouveau rendez-vous</button></div></div>`;
    $('#icsBtn').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics(r)], { type: 'text/calendar' })); a.download = 'maison-blade.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
    $('#again').onclick = () => { d.innerHTML = ''; d.hidden = true; st.svc = st.barber = st.date = st.time = null; st.step = 1; refresh(); };
    refresh();
  });
  st.date = null;
  refresh(); setStep(1);

  /* ---------- Galerie : squelettes, lightbox ---------- */
  const plates = $$('.plate');
  const ioPlate = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { ioPlate.unobserve(en.target); setTimeout(() => en.target.classList.add('ready'), reduced ? 0 : 350 + Math.random() * 600); } }), { threshold: .15 });
  plates.forEach(p => ioPlate.observe(p));
  const lb = $('#lb'); let cur = 0;
  function showLb(i) {
    cur = (i + plates.length) % plates.length;
    const p = plates[cur], d = PLATES[cur];
    $('#lbm').style.background = p.style.getPropertyValue('--bg');
    $('#lbm').className = 'relative h-full w-full overflow-hidden rounded-[4px] border border-white/10';
    $('#lbm').innerHTML = $('.art', p).outerHTML;
    $('#lbt').textContent = d.t; $('#lbc').textContent = (cur + 1) + ' / ' + plates.length + ' · ' + d.k;
  }
  const open = i => { showLb(i); if (!lb.open) lb.showModal(); };
  plates.forEach(p => { p.addEventListener('click', () => open(+p.dataset.i)); p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(+p.dataset.i); } }); });
  $('#lbx').onclick = () => lb.close(); $('#lbp').onclick = () => showLb(cur - 1); $('#lbn').onclick = () => showLb(cur + 1);
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showLb(cur - 1); if (e.key === 'ArrowRight') showLb(cur + 1); });
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });

  /* ---------- Ambiance : rideau, apparitions, manifeste, en-tête ---------- */
  const curtain = $('#curtain');
  let seen = false; try { seen = sessionStorage.getItem('mb-intro') === '1'; sessionStorage.setItem('mb-intro', '1'); } catch (e) { /* ignoré */ }
  if (seen || reduced) curtain.classList.add('gone'); else setTimeout(() => curtain.classList.add('gone'), 1900);
  curtain.addEventListener('click', () => curtain.classList.add('gone'));

  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.rv').forEach(n => io.observe(n));
  setTimeout(() => $$('#hero .rv').forEach(n => n.classList.add('in')), seen || reduced ? 50 : 1500);

  const words = $('[data-words]');
  if (words) { words.innerHTML = words.textContent.trim().split(/\s+/).map(w => `<span class="w" style="opacity:.18;transition:opacity .5s">${esc(w)}</span>`).join(' '); }
  const ws = words ? $$('.w', words) : [];
  const hdr = $('#hdr'), prog = $('#prog');
  function onScroll() {
    const y = scrollY;
    hdr.classList.toggle('solid', y > 40);
    prog.style.transform = 'scaleX(' + Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - innerHeight)) + ')';
    if (ws.length) { const r = words.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .3))); ws.forEach((w, i) => { w.style.opacity = i / ws.length < p * 1.1 ? 1 : .18; }); }
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const hero = $('#hero');
  if (!reduced) hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); });

  const mb = $('#menuBtn'), mn = $('#menu');
  mb.addEventListener('click', () => { mn.hidden = !mn.hidden; mb.setAttribute('aria-expanded', !mn.hidden); });
  mn.addEventListener('click', e => { if (e.target.closest('a')) { mn.hidden = true; mb.setAttribute('aria-expanded', 'false'); } });
  $('#yr').textContent = new Date().getFullYear();
})();
