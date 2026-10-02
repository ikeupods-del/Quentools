/* Moteur Naw Fruity : plateaux, options, calendrier et capacité, commandes, acompte et solde, comptes clients, e-mails.
   Démonstration : tout est gardé dans le navigateur (localStorage). Pour de vrai : base de données (Firestore) à la place de load()/save(),
   paiement par prestataire (Stripe) avec confirmation côté serveur ; le reste du code ne change pas. */
(function () {
  'use strict';
  const CFG = window.NF_CONFIG || {};
  const KEY = 'naw-fruity:v1', SESSION = 'naw-fruity:session', CART = 'naw-fruity:cart';
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => new Date(s + 'T12:00:00');
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const today = () => ymd(new Date());
  const norm = e => String(e || '').trim().toLowerCase();
  const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const money = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const frDate = s => { const d = parse(s); return DAYS[d.getDay()].toLowerCase() + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  const STATUS = ['confirmée', 'en préparation', 'prête', 'remise', 'annulée'];

  /* ---------- Données de départ ---------- */
  function seed() {
    const t = today();
    const sizes = (a, b, c) => [{ id: 'S', label: '4 à 6 personnes', price: a, load: 1 }, { id: 'M', label: '8 à 10 personnes', price: b, load: 2 }, { id: 'L', label: '12 à 15 personnes', price: c, load: 3 }];
    const products = [
      { id: 'decouverte', name: 'Le Découverte', desc: 'Fruits de saison variés, découpés et dressés à la main : le plateau qui plaît à tout le monde.', type: 'tray', sizes: sizes(39, 69, 99), art: 'saison', tag: 'Le classique', active: true },
      { id: 'tropical', name: 'Le Tropical', desc: 'Ananas, mangue, kiwi, fruit de la passion et litchi : un voyage, sans quitter la table.', type: 'tray', sizes: sizes(45, 79, 115), art: 'tropical', tag: 'Exotique', active: true },
      { id: 'gourmand', name: 'Le Gourmand', desc: 'Fruits frais, fraises enrobées de chocolat et brochettes : pour les gourmands.', type: 'tray', sizes: sizes(49, 85, 125), art: 'gourmand', tag: 'Chocolat', active: true },
      { id: 'vitamine', name: 'Le Vitaminé', desc: 'Agrumes, grenade, baies et raisin : frais, acidulé, coloré.', type: 'tray', sizes: sizes(42, 72, 105), art: 'vitamine', tag: 'Frais', active: true },
      { id: 'fete', name: 'Le Fête', desc: 'Fruits en brochettes et formes amusantes, pensé pour les anniversaires et les enfants.', type: 'tray', sizes: sizes(44, 76, 110), art: 'fete', tag: 'Anniversaires', active: true },
      { id: 'mini', name: 'La Mini-box', desc: 'Une barquette individuelle de fruits frais, avec sa fourchette : idéale pour une équipe ou un buffet.', type: 'unit', unitPrice: 6.5, minUnits: 6, loadPerUnit: .25, art: 'mini', tag: 'Individuelle', active: true },
      { id: 'entreprise', name: 'La Corbeille d’entreprise', desc: 'Corbeille de fruits pour réunions, séminaires et accueil : composition et fréquence sur mesure.', type: 'quote', art: 'corbeille', tag: 'Sur devis', active: true }
    ];
    const options = [
      { id: 'choco', name: 'Fraises enrobées de chocolat', price: 9, per: 'tray', active: true },
      { id: 'coulis', name: 'Coulis de fruits rouges (pot)', price: 4, per: 'tray', active: true },
      { id: 'brochettes', name: 'Brochettes de fruits (12)', price: 14, per: 'order', active: true },
      { id: 'jus', name: 'Jus de fruits pressé (1 L)', price: 7, per: 'order', active: true },
      { id: 'vaisselle', name: 'Assiettes et piques compostables', price: 3, per: 'order', active: true }
    ];
    const settings = {
      open: true, card: true, cash: true, email: true,
      depositPct: 30, minNoticeH: 48, horizonDays: 60, cancelH: 72,
      capacity: 12, closedWeekdays: [0, 1], closedDates: [], capOverride: {},
      pickup: { from: 10, to: 18, perSlot: 3 },
      delivery: { slots: ['9 h – 12 h', '14 h – 18 h'], perSlot: 3, minOrder: 40, freeFrom: 120, zones: [{ id: 'centre', name: 'Centre-ville', fee: 5 }, { id: 'peri', name: 'Périphérie (jusqu’à 10 km)', fee: 9 }, { id: 'ext', name: 'Zone étendue (jusqu’à 20 km)', fee: 15 }] }
    };
    /* Dates de démonstration : toujours des jours ouverts (od = n-ième jour ouvert à venir, pastOpen = jour ouvert précédent) */
    const od = k => { let n = 0; for (let i = 1; i < 40; i++) { const d = addDays(t, i); if (!settings.closedWeekdays.includes(parse(d).getDay()) && ++n === k) return d; } return addDays(t, k); };
    const pastOpen = off => { let d = addDays(t, off); while (settings.closedWeekdays.includes(parse(d).getDay())) d = addDays(d, -1); return d; };
    const mk = (n, who, off, mode, slot, items, extra) => {
      const it = items.map(([pid, size, qty, opts]) => lineOf(products, options, { pid, size, qty, opts: opts || [] }));
      const subtotal = it.reduce((a, b) => a + b.lineTotal, 0), zone = settings.delivery.zones[0], fee = mode === 'livraison' ? (subtotal >= settings.delivery.freeFrom ? 0 : zone.fee) : 0, total = subtotal + fee;
      const load = it.reduce((a, b) => a + b.load, 0);
      return Object.assign({ id: 'seed' + n, ref: 'NF' + (2000 + n), status: 'confirmée', createdAt: Date.now() - 86400000 * 4, customer: who, mode, zone: mode === 'livraison' ? zone.id : '', address: mode === 'livraison' ? '8 rue Exemple' : '', date: typeof off === 'string' ? off : pastOpen(off), slot, items: it, exclude: '', card: '', notes: '', subtotal, fee, total, load, payMode: 'deposit', payments: [], source: 'web' }, extra || {});
    };
    const pay = (o, how) => { const dep = Math.ceil(o.total * settings.depositPct / 100); o.payments = [{ at: o.createdAt, amount: dep, how: how || 'carte', label: 'Acompte' }]; return o; };
    const full = (o) => { o.payMode = 'full'; o.payments = [{ at: o.createdAt, amount: o.total, how: 'carte', label: 'Paiement total' }]; return o; };
    const cam = { name: 'Camille Durand', email: 'camille@exemple.fr', phone: '06 00 00 00 01' };
    const orders = [
      ...[[-84, 'decouverte', 'M'], [-56, 'tropical', 'S'], [-28, 'gourmand', 'M'], [-14, 'vitamine', 'S']].map(([off, p, s], i) => { const o = full(mk(10 + i, cam, off, i % 2 ? 'livraison' : 'retrait', i % 2 ? '14 h – 18 h' : '16:00', [[p, s, 1, i === 2 ? ['choco'] : []]])); o.status = 'remise'; return o; }),
      pay(mk(1, cam, od(5), 'retrait', '15:00', [['gourmand', 'M', 1, ['choco', 'coulis']], ['mini', '', 6, []]], { exclude: 'Pas de kiwi, merci.', card: 'Bon anniversaire Léa !' })),
      pay(mk(2, { name: 'Sophie Martin', email: 'sophie@exemple.fr', phone: '' }, od(2), 'livraison', '9 h – 12 h', [['tropical', 'L', 2, []]])),
      full(mk(3, { name: 'Marc Leroy', email: 'marc@exemple.fr', phone: '' }, od(2), 'retrait', '11:00', [['decouverte', 'L', 3, ['vaisselle']]])),
      pay(mk(4, { name: 'Association Les Tilleuls', email: 'tilleuls@exemple.fr', phone: '' }, od(3), 'retrait', '10:00', [['mini', '', 20, []], ['vitamine', 'M', 2, []]])),
      pay(mk(5, { name: 'Inès Bernard', email: 'ines@exemple.fr', phone: '' }, od(3), 'livraison', '14 h – 18 h', [['fete', 'M', 1, ['brochettes']]])),
      full(mk(6, { name: 'Cabinet Rivière', email: 'riviere@exemple.fr', phone: '' }, od(4), 'retrait', '12:00', [['decouverte', 'L', 3, []], ['tropical', 'L', 2, []]])),
      pay(mk(7, { name: 'Paul Girard', email: 'paul@exemple.fr', phone: '' }, od(4), 'retrait', '16:00', [['gourmand', 'S', 1, []]]))
    ];
    return { v: 1, settings, products, options, orders, accounts: [{ email: 'camille@exemple.fr', name: 'Camille Durand', phone: '06 00 00 00 01', pass: 'c5e34aa90d3c746e995aed00d8c05d9f5604163ec0febb91434f91c920c76d17', address: '8 rue Exemple', allergies: 'Allergique aux noix (pas de fruits à coque).', notify: true, created: Date.now() - 86400000 * 120 }], outbox: [] };
  }

  /* Ligne de commande : prix selon la taille, la quantité et les options */
  function lineOf(products, options, l) {
    const p = products.find(x => x.id === l.pid);
    if (!p) return null;
    const qty = Math.max(1, +l.qty || 1), opts = (l.opts || []).map(id => options.find(o => o.id === id)).filter(o => o && o.active !== false);
    let unit = 0, load = 0, sizeLabel = '';
    if (p.type === 'unit') { unit = p.unitPrice; load = p.loadPerUnit * qty; sizeLabel = qty + ' barquette' + (qty > 1 ? 's' : ''); }
    else { const s = (p.sizes || []).find(x => x.id === l.size) || (p.sizes || [])[0]; unit = s ? s.price : 0; load = s ? s.load * qty : 0; sizeLabel = s ? s.label : ''; l.size = s ? s.id : ''; }
    const base = p.type === 'unit' ? unit * qty : unit * qty;
    let extra = 0;
    opts.forEach(o => { extra += o.per === 'tray' ? o.price * qty : o.price; });
    return { pid: p.id, name: p.name, type: p.type, size: l.size || '', sizeLabel, qty, unit, opts: opts.map(o => o.id), optsLabel: opts.map(o => o.name).join(', '), note: l.note || '', load, lineTotal: Math.round((base + extra) * 100) / 100 };
  }

  let D;
  function load() {
    try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) { D = null; }
    if (!D || !D.settings) { D = seed(); save(true); }
    if (!D.accounts) D.accounts = [];
  }
  function save(quiet) { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* stockage indisponible */ } if (!quiet) emit(); }
  const listeners = [];
  function emit() { listeners.forEach(f => f()); }
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === SESSION || e.key === CART) { if (e.key === KEY) load(); emit(); } });

  /* ---------- Panier (gardé entre les pages et les propositions) ---------- */
  const getCart = () => { try { return JSON.parse(localStorage.getItem(CART)) || []; } catch (e) { return []; } };
  const setCart = c => { try { localStorage.setItem(CART, JSON.stringify(c)); } catch (e) { /* ignoré */ } emit(); };
  const cartLines = () => getCart().map(l => Object.assign({ cid: l.cid }, lineOf(D.products, D.options, Object.assign({}, l)))).filter(l => l.pid);
  function cartAdd(l) { const c = getCart(); c.push(Object.assign({ cid: uid() }, l)); setCart(c); }
  const cartRemove = cid => setCart(getCart().filter(l => l.cid !== cid));
  const cartQty = (cid, d) => setCart(getCart().map(l => l.cid === cid ? Object.assign(l, { qty: Math.max(1, Math.min(60, (+l.qty || 1) + d)) }) : l));
  const cartClear = () => setCart([]);

  /* ---------- Calendrier et capacité ---------- */
  const capOf = date => (D.settings.capOverride && D.settings.capOverride[date] != null) ? +D.settings.capOverride[date] : D.settings.capacity;
  const loadOf = date => D.orders.filter(o => o.date === date && o.status !== 'annulée').reduce((a, o) => a + (o.load || 0), 0);
  const earliest = () => ymd(new Date(Date.now() + D.settings.minNoticeH * 3600000));
  function dayState(date) {
    const S = D.settings, d = parse(date), cap = capOf(date), load = loadOf(date);
    if (S.closedWeekdays.includes(d.getDay())) return { state: 'closed', reason: 'Fermé ce jour-là', cap, load, left: 0 };
    if (S.closedDates.includes(date)) return { state: 'closed', reason: 'Jour de fermeture', cap, load, left: 0 };
    if (date < earliest()) return { state: 'early', reason: 'Délai de commande : ' + S.minNoticeH + ' h minimum', cap, load, left: 0 };
    if (date > addDays(today(), S.horizonDays)) return { state: 'far', reason: 'Pas encore ouvert', cap, load, left: 0 };
    const left = cap - load;
    return { state: left <= 0 ? 'full' : left <= cap * .3 ? 'busy' : 'free', reason: left <= 0 ? 'Complet' : left <= cap * .3 ? 'Presque complet' : 'Disponible', cap, load, left: Math.max(0, left) };
  }
  function slotList(mode) {
    const S = D.settings;
    if (mode === 'livraison') return S.delivery.slots.map(s => ({ id: s, label: s }));
    const out = []; for (let h = S.pickup.from; h < S.pickup.to; h++) out.push({ id: pad(h) + ':00', label: h + ' h – ' + (h + 1) + ' h' });
    return out;
  }
  const slotFree = (date, mode, slotId) => {
    const per = mode === 'livraison' ? D.settings.delivery.perSlot : D.settings.pickup.perSlot;
    return D.orders.filter(o => o.date === date && o.mode === mode && o.slot === slotId && o.status !== 'annulée').length < per;
  };
  const slotsFor = (date, mode) => slotList(mode).map(s => Object.assign({ free: slotFree(date, mode, s.id) }, s));

  /* ---------- Prix, acompte ---------- */
  const zoneOf = id => D.settings.delivery.zones.find(z => z.id === id);
  function quote(lines, mode, zoneId) {
    const subtotal = Math.round(lines.reduce((a, l) => a + l.lineTotal, 0) * 100) / 100, load = lines.reduce((a, l) => a + l.load, 0), S = D.settings;
    let fee = 0, note = '';
    if (mode === 'livraison') { const z = zoneOf(zoneId); fee = z ? (subtotal >= S.delivery.freeFrom ? 0 : z.fee) : 0; if (z && !fee) note = 'Livraison offerte dès ' + money(S.delivery.freeFrom) + '.'; }
    const total = subtotal + fee, deposit = Math.min(total, Math.ceil(total * S.depositPct / 100));
    return { subtotal, fee, total, deposit, load, balance: total - deposit, note, minOrderOk: mode !== 'livraison' || subtotal >= S.delivery.minOrder };
  }
  const paidOf = o => Math.round(o.payments.reduce((a, p) => a + p.amount, 0) * 100) / 100;
  const dueOf = o => Math.max(0, Math.round((o.total - paidOf(o)) * 100) / 100);

  /* ---------- E-mails ---------- */
  function sendMail(to, subject, body) {
    if (!D.settings.email || !to) return false;
    const ac = D.accounts.find(a => norm(a.email) === norm(to));
    if (ac && ac.notify === false) return false;
    D.outbox.unshift({ id: uid(), to, subject, body, at: Date.now(), real: !!CFG.formEndpoint });
    D.outbox = D.outbox.slice(0, 200);
    if (CFG.formEndpoint) { try { fetch(CFG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, body }) }).catch(() => {}); } catch (e) { /* relais injoignable */ } }
    return true;
  }
  const sign = '\n\n' + (CFG.name || 'Naw Fruity') + (CFG.address ? '\n' + CFG.address : '') + (CFG.phone ? '\n' + CFG.phone : '');
  const recap = o => o.items.map(i => '- ' + i.name + (i.sizeLabel ? ' (' + i.sizeLabel + ')' : '') + (i.type !== 'unit' && i.qty > 1 ? ' × ' + i.qty : '') + (i.optsLabel ? ' + ' + i.optsLabel : '')).join('\n') + '\n' + (o.mode === 'livraison' ? 'Livraison le ' : 'Retrait le ') + frDate(o.date) + ' · ' + (o.mode === 'livraison' ? o.slot : o.slot.replace(':00', ' h')) + '\nTotal : ' + money(o.total) + '\nRéglé : ' + money(paidOf(o)) + (dueOf(o) ? ' · reste ' + money(dueOf(o)) + ' à régler à la remise ou en ligne' : ' · soldé');
  const mailOrder = o => sendMail(o.customer.email, 'Commande confirmée · ' + o.ref, 'Bonjour ' + o.customer.name + ',\n\nMerci ! Votre commande ' + o.ref + ' est confirmée.\n' + recap(o) + (o.exclude ? '\nÀ éviter : ' + o.exclude : '') + '\n\nUne question ? Répondez à ce message ou appelez-nous.' + sign);
  const mailCancel = o => sendMail(o.customer.email, 'Commande annulée · ' + o.ref, 'Bonjour ' + o.customer.name + ',\n\nVotre commande ' + o.ref + ' du ' + frDate(o.date) + ' est annulée.' + (o.refund ? '\nL’acompte de ' + money(o.refund) + ' vous sera remboursé.' : '') + sign);
  const mailStatus = o => sendMail(o.customer.email, o.status === 'prête' ? 'Votre commande est prête · ' + o.ref : 'Commande ' + o.status + ' · ' + o.ref, 'Bonjour ' + o.customer.name + ',\n\n' + (o.status === 'prête' ? 'Votre commande ' + o.ref + ' est prête' + (o.mode === 'livraison' ? ' et part en livraison.' : ' : vous pouvez venir la retirer.') : 'Votre commande ' + o.ref + ' est maintenant : ' + o.status + '.') + (dueOf(o) ? '\nReste à régler : ' + money(dueOf(o)) + '.' : '') + sign);
  const mailRemind = o => sendMail(o.customer.email, 'Rappel : commande ' + o.ref + ' le ' + frDate(o.date), 'Bonjour ' + o.customer.name + ',\n\nUn petit rappel de votre commande :\n' + recap(o) + sign);

  /* ---------- Commande ---------- */
  function placeOrder(p, admin) {
    const S = D.settings;
    if (!admin && !S.open) return { error: 'Les commandes en ligne sont fermées pour le moment.' };
    const lines = p.lines || cartLines();
    if (!lines.length) return { error: 'Votre panier est vide.' };
    if (lines.some(l => l.type === 'quote')) return { error: 'La corbeille d’entreprise se commande sur devis.' };
    const mode = p.mode === 'livraison' ? 'livraison' : 'retrait';
    if (!p.date || !p.slot) return { error: 'Choisissez une date et un créneau.' };
    const ds = dayState(p.date);
    if (!admin && ds.state !== 'free' && ds.state !== 'busy') return { error: 'Cette date n’est pas disponible : ' + ds.reason.toLowerCase() + '.' };
    const q = quote(lines, mode, p.zone), load = q.load;
    if (!admin && load > ds.left) return { error: 'Il ne reste pas assez de place ce jour-là pour cette commande (' + (Math.round(ds.left * 10) / 10) + ' restant). Choisissez une autre date.' };
    if (!slotFree(p.date, mode, p.slot) && !admin) return { error: 'Ce créneau vient d’être pris. Choisissez-en un autre.' };
    if (mode === 'livraison') {
      if (!zoneOf(p.zone)) return { error: 'Choisissez votre zone de livraison.' };
      if (!String(p.address || '').trim()) return { error: 'Indiquez l’adresse de livraison.' };
      if (!q.minOrderOk && !admin) return { error: 'Commande minimale pour la livraison : ' + money(S.delivery.minOrder) + '.' };
    }
    const c = p.customer || {};
    if (!String(c.name || '').trim()) return { error: 'Indiquez votre nom.' };
    if (!admin && !/^\S+@\S+\.\S+$/.test(String(c.email || '').trim())) return { error: 'Indiquez un e-mail valide pour la confirmation.' };
    let payMode = p.payMode;
    if (!admin) {
      if ((payMode === 'deposit' || payMode === 'full') && !S.card) return { error: 'Le paiement par carte est désactivé : réglez à la remise.' };
      if (payMode === 'cash' && !(S.cash && mode === 'retrait')) return { error: 'Le paiement sur place n’est possible que pour un retrait.' };
    }
    payMode = ['deposit', 'full', 'cash'].includes(payMode) ? payMode : 'deposit';
    const now = Date.now(), o = {
      id: 'o' + uid() + now.toString(36), ref: 'NF' + uid(), status: 'confirmée', createdAt: now, customer: { name: c.name.trim(), email: norm(c.email), phone: String(c.phone || '').trim() },
      mode, zone: mode === 'livraison' ? p.zone : '', address: mode === 'livraison' ? String(p.address).trim() : '', date: p.date, slot: p.slot,
      items: lines.map(l => { const x = Object.assign({}, l); delete x.cid; return x; }), exclude: String(p.exclude || '').slice(0, 300), card: String(p.card || '').slice(0, 120), notes: String(p.notes || '').slice(0, 300),
      subtotal: q.subtotal, fee: q.fee, total: q.total, load, payMode, payments: [], source: admin ? 'boutique' : 'web'
    };
    if (payMode === 'deposit') o.payments.push({ at: now, amount: q.deposit, how: 'carte', label: 'Acompte' });
    if (payMode === 'full') o.payments.push({ at: now, amount: q.total, how: 'carte', label: 'Paiement total' });
    D.orders.push(o);
    if (!p.lines) setCartSilent([]);
    mailOrder(o);
    save();
    return { order: o };
  }
  const setCartSilent = c => { try { localStorage.setItem(CART, JSON.stringify(c)); } catch (e) { /* ignoré */ } };

  function setStatus(id, status) {
    const o = D.orders.find(x => x.id === id);
    if (!o || o.status === status) return;
    if (status === 'annulée') { const p = paidOf(o); o.refund = p > 0 ? p : 0; mailCancel(o); }
    if (status === 'remise' && dueOf(o) > 0) o.payments.push({ at: Date.now(), amount: dueOf(o), how: 'à la remise', label: 'Solde' });
    o.status = status;
    if (status === 'prête' || status === 'en préparation') mailStatus(o);
    save();
  }
  function addPayment(id, amount, how, label) { const o = D.orders.find(x => x.id === id); if (!o) return; o.payments.push({ at: Date.now(), amount: Math.min(dueOf(o), amount), how: how || 'carte', label: label || 'Solde' }); save(); }
  const removeOrder = id => { D.orders = D.orders.filter(o => o.id !== id); save(); };

  /* Production du jour : plateaux à préparer */
  function production(date) {
    const rows = {}, list = D.orders.filter(o => o.date === date && o.status !== 'annulée');
    list.forEach(o => o.items.forEach(i => { const k = i.name + '|' + i.sizeLabel; rows[k] = rows[k] || { name: i.name, size: i.sizeLabel, qty: 0, opts: {} }; rows[k].qty += i.qty; (i.optsLabel ? i.optsLabel.split(', ') : []).forEach(x => { rows[k].opts[x] = (rows[k].opts[x] || 0) + 1; }); }));
    return { rows: Object.values(rows), orders: list };
  }

  /* ---------- Comptes clients (démonstration : mot de passe haché dans le navigateur) ---------- */
  const sha = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mb:' + s)))).map(b => b.toString(16).padStart(2, '0')).join('');
  const setSession = e => { try { e ? localStorage.setItem(SESSION, e) : localStorage.removeItem(SESSION); } catch (x) { /* ignoré */ } };
  const account = () => { let e = ''; try { e = localStorage.getItem(SESSION) || ''; } catch (x) { /* ignoré */ } return D.accounts.find(a => norm(a.email) === e) || null; };
  async function signup(o) {
    const email = norm(o.email);
    if (!String(o.name || '').trim()) return { error: 'Indiquez votre nom.' };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Indiquez un e-mail valide.' };
    if (String(o.password || '').length < 6) return { error: 'Le mot de passe doit faire au moins 6 caractères.' };
    if (D.accounts.some(a => norm(a.email) === email)) return { error: 'Un compte existe déjà avec cet e-mail : connectez-vous.' };
    const a = { email, name: o.name.trim(), phone: String(o.phone || '').trim(), pass: await sha(o.password), address: '', allergies: '', notify: true, created: Date.now() };
    D.accounts.push(a); setSession(email); save();
    sendMail(email, 'Bienvenue chez ' + (CFG.name || 'Naw Fruity'), 'Bonjour ' + a.name + ',\n\nVotre espace client est créé : retrouvez vos commandes, vos préférences et recommandez en un clic.' + sign);
    return { account: a };
  }
  async function login(email, password) {
    const a = D.accounts.find(x => norm(x.email) === norm(email));
    if (!a || a.pass !== await sha(password)) return { error: 'E-mail ou mot de passe incorrect.' };
    setSession(a.email); emit();
    return { account: a };
  }
  /* Démonstration : ouvre le compte existant sans mot de passe (liens « Vue client » et « Voir ma commande ») */
  const demoLogin = email => { const a = D.accounts.find(x => norm(x.email) === norm(email)); if (a) { setSession(a.email); emit(); } return a || null; };
  const logout = () => { setSession(''); emit(); };
  async function updateAccount(patch) {
    const a = account();
    if (!a) return { error: 'Session expirée.' };
    if (patch.name != null) { if (!String(patch.name).trim()) return { error: 'Indiquez votre nom.' }; a.name = patch.name.trim(); }
    ['phone', 'address'].forEach(k => { if (patch[k] != null) a[k] = String(patch[k]).trim(); });
    if (patch.allergies != null) a.allergies = String(patch.allergies).slice(0, 300);
    if (patch.notify != null) a.notify = !!patch.notify;
    if (patch.password) { if (patch.password.length < 6) return { error: 'Le mot de passe doit faire au moins 6 caractères.' }; a.pass = await sha(patch.password); }
    save();
    return { account: a };
  }
  function deleteAccount() { const a = account(); if (a) { D.accounts = D.accounts.filter(x => x !== a); setSession(''); save(); } }
  const myOrders = a => D.orders.filter(o => norm(o.customer.email) === norm(a.email)).sort((x, y) => (y.date + y.slot).localeCompare(x.date + x.slot));
  /* Annulation par le client : gratuite jusqu'à X heures avant, l'acompte est alors remboursé */
  function clientCancel(id) {
    const o = D.orders.find(x => x.id === id), me = account();
    if (!o || !me || norm(o.customer.email) !== norm(me.email)) return { error: 'Commande introuvable.' };
    if (o.status !== 'confirmée') return { error: 'Cette commande est déjà en préparation : appelez-nous pour la modifier.' };
    if (new Date(o.date + 'T09:00') - Date.now() < D.settings.cancelH * 3600000) return { error: 'Moins de ' + D.settings.cancelH + ' h avant la date : appelez-nous pour l’annuler.' };
    setStatus(id, 'annulée');
    return { ok: true };
  }
  function payBalanceOnline(id) {
    const o = D.orders.find(x => x.id === id), me = account();
    if (!o || !me || norm(o.customer.email) !== norm(me.email) || !dueOf(o) || !D.settings.card) return { error: 'Paiement impossible.' };
    addPayment(id, dueOf(o), 'carte', 'Solde en ligne'); sendMail(o.customer.email, 'Solde réglé · ' + o.ref, 'Bonjour ' + o.customer.name + ',\n\nMerci, le solde de votre commande ' + o.ref + ' est réglé.' + sign);
    return { ok: true };
  }
  function ics(o) {
    const slot = o.mode === 'retrait' ? o.slot : (o.slot.indexOf('9') === 0 ? '09:00' : '14:00'), f = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00', h = +slot.slice(0, 2);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Naw Fruity//FR', 'BEGIN:VEVENT', 'UID:' + o.id + '@naw-fruity', 'DTSTAMP:' + f(today(), '00:00'), 'DTSTART:' + f(o.date, slot), 'DTEND:' + f(o.date, pad(h + 1) + ':' + slot.slice(3)), 'SUMMARY:' + (o.mode === 'livraison' ? 'Livraison' : 'Retrait') + ' ' + o.ref + ' · ' + (CFG.name || ''), 'LOCATION:' + (o.mode === 'livraison' ? o.address : CFG.address || ''), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  load();
  window.NF = {
    CFG, get data() { return D; }, save, reset() { D = seed(); save(); }, onChange: f => listeners.push(f),
    esc, money, ymd, parse, addDays, today, norm, uid, frDate, DAYS, MONTHS, STATUS,
    lineOf: l => lineOf(D.products, D.options, l), cartLines, cartAdd, cartRemove, cartQty, cartClear, getCart,
    dayState, slotsFor, slotList, capOf, loadOf, earliest, zoneOf, quote, paidOf, dueOf,
    placeOrder, setStatus, addPayment, removeOrder, production, mailRemind, sendMail,
    signup, login, demoLogin, logout, account, updateAccount, deleteAccount, myOrders, clientCancel, payBalanceOnline, ics
  };
})();
