/* Studio Sites : fonctions ajoutées au site (réservation, demande de devis, assistant de questions, espace professionnel, WhatsApp, annonce, questions fréquentes)
   et direction artistique (couleur, police, arrondi, densité). Tout est écrit par le programme, jamais par l'IA : le code est fixe et contrôlé,
   les textes viennent uniquement de la fiche du professionnel. Aucun service externe n'est chargé : le site n'appelle que la base Firebase du
   professionnel (si ses clés sont renseignées), sinon les demandes partent par e-mail. Ce fichier tourne dans la fenêtre de l'application (DOM). */
(function (racine) {
  'use strict';
  const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const e164 = t => { const d = String(t || '').replace(/\D/g, ''); return d.startsWith('33') ? '+' + d : d.startsWith('0') ? '+33' + d.slice(1) : d ? '+' + d : ''; };
  const jsonSur = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  /* ───────── Catalogue ───────── */
  const CATALOGUE = [
    { id: 'reservation', nom: 'Réservation en ligne', desc: 'Formulaire de réservation ou de rendez-vous (date, créneau, personnes ou prestation) ; les demandes arrivent dans l’espace professionnel ou par e-mail.' },
    { id: 'devis', nom: 'Demande de devis', desc: 'Formulaire de demande de devis (besoin, délai, coordonnées).' },
    { id: 'chatbot', nom: 'Assistant de questions', desc: 'Bulle de discussion qui répond aux questions fréquentes (horaires, adresse, services, réservation…) à partir de la fiche. Ce n’est pas une IA : des réponses fixes, sans invention.' },
    { id: 'panel', nom: 'Espace professionnel (panel)', desc: 'Page /admin protégée par mot de passe : voir, confirmer ou refuser les demandes, modifier l’annonce du site. Demande une base Firebase gratuite.' },
    { id: 'whatsapp', nom: 'Bouton WhatsApp', desc: 'Bouton flottant qui ouvre une conversation WhatsApp avec le numéro du professionnel.' },
    { id: 'annonce', nom: 'Bandeau d’annonce', desc: 'Bandeau en haut du site (congés, promotion, info) ; modifiable depuis l’espace professionnel.' },
    { id: 'galerie', nom: 'Galerie photos', desc: 'Photos du professionnel (réalisations, lieu, produits) en grille, agrandies au toucher ; ajoute-les dans « Style et fonctions → Photos ».' },
    { id: 'faq', nom: 'Questions fréquentes', desc: 'Section de questions et réponses construite avec la fiche (horaires, adresse, contact, services) et tes propres questions.' }
  ];
  const IDS = CATALOGUE.map(m => m.id);
  const AMBIANCES = { sobre: 'Sobre et rassurant', chaleureux: 'Chaleureux', luxe: 'Luxe et élégance', moderne: 'Moderne et épuré', nature: 'Nature et douceur', ludique: 'Ludique et coloré', energique: 'Énergique et sportif', pro: 'Professionnel et technique' };
  const POLICES = {
    elegante: { nom: 'Élégante (serif)', famille: 'Fraunces', fichier: 'fraunces-normal.woff2', repli: 'Georgia,serif' },
    raffinee: { nom: 'Raffinée (fine)', famille: 'Cormorant', fichier: 'cormorant-normal.woff2', repli: 'Georgia,serif' },
    affichage: { nom: 'Affichage (gros titres)', famille: 'DM Serif Display', fichier: 'dm-serif-display.woff2', repli: 'Georgia,serif' },
    moderne: { nom: 'Moderne (géométrique)', famille: 'Space Grotesk', fichier: 'space-grotesk-normal.woff2', repli: 'system-ui,sans-serif' },
    neutre: { nom: 'Neutre (lisible)', famille: 'Inter', fichier: 'inter.woff2', repli: 'system-ui,sans-serif' },
    arrondie: { nom: 'Arrondie (conviviale)', famille: 'Nunito', fichier: 'nunito-normal.woff2', repli: 'system-ui,sans-serif' },
    sport: { nom: 'Condensée (sport, énergie)', famille: 'Oswald', fichier: 'oswald-normal.woff2', repli: 'Impact,"Arial Narrow",sans-serif' },
    manuscrite: { nom: 'Manuscrite (touche perso)', famille: 'Caveat', fichier: 'caveat-normal.woff2', repli: 'cursive' }
  };
  const ARRONDIS = { carre: 'Angles droits', doux: 'Coins doux', rond: 'Très arrondi' };
  const DENSITES = { aere: 'Aérée', normal: 'Normale', compact: 'Compacte' };
  const COULEURS = { rouge: '#c62828', bordeaux: '#7b1e2b', rose: '#e8588d', fuchsia: '#d81b78', orange: '#ef6c00', jaune: '#f5b800', or: '#c9a15b', dore: '#c9a15b', beige: '#c8b08a', marron: '#7a4b2a', brun: '#7a4b2a', vert: '#2e7d32', 'vert fonce': '#1f5a3a', 'vert sapin': '#1f5a3a', kaki: '#6b7a3a', turquoise: '#13a3a3', bleu: '#1f4fbf', 'bleu nuit': '#14284b', 'bleu marine': '#14284b', 'bleu ciel': '#3b9be0', violet: '#6a3fd1', mauve: '#8a63c7', noir: '#1a1a1a', gris: '#5f6672', blanc: '#ffffff' };
  const couleurDepuis = t => { const s = String(t || '').trim(); if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase(); if (/^#[0-9a-f]{3}$/i.test(s)) return '#' + [...s.slice(1)].map(c => c + c).join('').toLowerCase(); const n = sansAccents(s).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); if (COULEURS[n]) return COULEURS[n]; const k = Object.keys(COULEURS).sort((a, b) => b.length - a.length).find(c => (' ' + n + ' ').includes(' ' + c + ' ')); return k ? COULEURS[k] : ''; };

  /* ───────── Couleurs ───────── */
  const rgbDe = h => { h = String(h || '').trim(); if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + [...h.slice(1)].map(c => c + c).join(''); return /^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : null; };
  const hexDe = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  function hslDe(h) { const [r, g, b] = rgbDe(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let t = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(t * 60 + 360) % 360, s, l]; }
  function rgbDeHsl(h, s, l) { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; }

  /* ───────── Direction artistique ───────── */
  // Recolore le design d'un exemple : la teinte principale devient la couleur choisie, les autres couleurs vives suivent (même écart de teinte), les neutres restent.
  function recolorer(doc, cible) {
    const styles = [...doc.querySelectorAll('style')], texte = styles.map(s => s.textContent).join('\n');
    const racines = [...texte.matchAll(/:root\s*\{([^}]*)\}/g)].map(m => m[1]).join(';');
    const vars = [...racines.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/g)].map(m => ({ nom: m[1], hex: m[2].toLowerCase() }));
    const vives = vars.filter(v => { const [, s, l] = hslDe(v.hex); return s >= 0.28 && l > 0.1 && l < 0.92; });
    if (!vives.length) return false;
    const note = v => { const [, s, l] = hslDe(v.hex); return s * (1 - Math.abs(l - 0.5) * 1.3) + (/accent|primary|brand|main|cta/.test(v.nom) ? 1 : 0); };
    const principal = vives.reduce((a, b) => (note(b) > note(a) ? b : a));
    const delta = hslDe(cible)[0] - hslDe(principal.hex)[0], carte = new Map();
    for (const v of vives) { if (carte.has(v.hex)) continue; if (v.hex === principal.hex) carte.set(v.hex, cible); else { const [h, s, l] = hslDe(v.hex); carte.set(v.hex, hexDe(rgbDeHsl((h + delta + 360) % 360, s, l))); } }
    const rempl = t => { let x = t; for (const [de, par] of carte) x = x.replace(new RegExp(de + '(?![0-9a-fA-F])', 'gi'), par); const [r, g, b] = rgbDe(principal.hex), [R, G, B] = rgbDe(cible); return x.replace(new RegExp('rgba\\(\\s*' + r + '\\s*,\\s*' + g + '\\s*,\\s*' + b + '\\s*,', 'g'), `rgba(${R},${G},${B},`); };
    styles.forEach(s => { s.textContent = rempl(s.textContent); });
    doc.querySelectorAll('[style]').forEach(e => e.setAttribute('style', rempl(e.getAttribute('style'))));
    doc.querySelectorAll('[fill],[stroke],[stop-color]').forEach(e => ['fill', 'stroke', 'stop-color'].forEach(a => { const v = e.getAttribute(a); if (v && carte.has(v.toLowerCase())) e.setAttribute(a, carte.get(v.toLowerCase())); }));
    const tc = doc.querySelector('meta[name="theme-color"]'); if (tc && carte.has(String(tc.getAttribute('content')).toLowerCase())) tc.setAttribute('content', carte.get(tc.getAttribute('content').toLowerCase()));
    return true;
  }
  function appliquerDA(doc, da, modele) {
    const notes = []; da = da || {};
    const couleur = couleurDepuis(da.couleur), css = [];
    if (modele && modele.type === 'modele') {
      if (da.mode === 'sombre') doc.documentElement.setAttribute('data-theme', 'dark'); else if (da.mode === 'clair') doc.documentElement.setAttribute('data-theme', 'light');
    } else if (couleur) {
      if (!recolorer(doc, couleur)) notes.push('La couleur choisie n’a pas pu être appliquée à ce design : elle sert seulement aux fonctions ajoutées.');
      else if (hslDe(couleur)[2] > 0.78) notes.push('La couleur choisie est très claire : vérifie la lisibilité des boutons et des titres.');
    }
    const p = POLICES[da.police];
    if (p) {
      css.push(`@font-face{font-family:"QS Titre";src:url(assets/fonts/${p.fichier}) format("woff2");font-weight:100 900;font-display:swap}`);
      css.push(`h1,h2,h3,h4,.logo,.brand,.qs-titre,[class*="title"],[class*="titre"]{font-family:"QS Titre",${p.repli} !important}`);
    }
    const r = { carre: [0, 0, 0], doux: [10, 10, 16], rond: [999, 16, 28] }[da.arrondi];
    if (r) css.push(`button,.btn,[class*="btn"],a[class*="button"]{border-radius:${r[0]}px !important}input,select,textarea{border-radius:${r[1]}px !important}[class*="card"],[class*="carte"],.qs-box{border-radius:${r[2]}px !important}`);
    if (da.densite === 'aere') css.push('section,.section{padding-top:clamp(72px,9vw,120px) !important;padding-bottom:clamp(72px,9vw,120px) !important}');
    if (da.densite === 'compact') css.push('section,.section{padding-top:clamp(36px,5vw,64px) !important;padding-bottom:clamp(36px,5vw,64px) !important}');
    if (css.length) { const st = doc.createElement('style'); st.id = 'qs-da'; st.textContent = css.join('\n'); doc.head.appendChild(st); }
    return notes;
  }

  /* ───────── Horaires : jours et créneaux déduits du texte de la fiche (sinon champ libre) ───────── */
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  function joursOuverts(h) {
    const t = sansAccents(h); if (!t) return null;
    if (/7\s*j(ours)?\s*(\/|sur)\s*7|tous les jours|7j7/.test(t)) return [true, true, true, true, true, true, true];
    const idx = x => JOURS.findIndex(j => j.startsWith(x.slice(0, 3)));
    const plage = /(lun|mar|mer|jeu|ven|sam|dim)[a-z]*\s*(?:au|a|-|–|—)\s*(lun|mar|mer|jeu|ven|sam|dim)[a-z]*/.exec(t);
    if (plage) { const a = idx(plage[1]), b = idx(plage[2]), o = new Array(7).fill(false); for (let i = a; ; i = (i + 1) % 7) { o[i] = true; if (i === b) break; } return o; }
    const ferme = /ferme[^.;,]*?\b(lun|mar|mer|jeu|ven|sam|dim)[a-z]*/.exec(t);
    if (ferme) { const o = new Array(7).fill(true); o[idx(ferme[1])] = false; return o; }
    return null;
  }
  function creneaux(h, pas, finMarge) {
    const t = sansAccents(h).replace(/\s+/g, ' '), out = [], re = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*(?:-|–|—|a|jusqu'a)\s*(\d{1,2})\s*(?:h|:)?\s*(\d{2})?/g; let m;
    while ((m = re.exec(t))) {
      const d = +m[1] * 60 + (+m[2] || 0), f = +m[3] * 60 + (+m[4] || 0);
      if (!(f > d) || d > 24 * 60 || f > 24 * 60) continue;
      for (let x = d; x <= f - finMarge && out.length < 48; x += pas) out.push(String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'));
    }
    return [...new Set(out)].sort();
  }
  const MODE_TABLE = /restaur|bar\b|brasserie|bistro|pizz|snack|kebab|traiteur|cafe|crepe|burger|tacos|sushi|boulang/;
  const modeReservation = (metier, choix) => (choix === 'table' || choix === 'rdv') ? choix : (MODE_TABLE.test(sansAccents(metier)) ? 'table' : 'rdv');

  /* ───────── Configuration publique embarquée dans le site ───────── */
  function configPublique(fiche, brief) {
    const ids = (brief && brief.modules) || [], mode = modeReservation(fiche.metier, brief && brief.options && brief.options.reservation);
    const fb = brief && brief.options && brief.options.firebaseApiKey && brief.options.firebaseProjectId ? { k: String(brief.options.firebaseApiKey).trim(), p: String(brief.options.firebaseProjectId).trim() } : null;
    const adresse = [fiche.adresse, [fiche.codePostal, fiche.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const wa = String((brief && brief.options && brief.options.whatsapp) || fiche.telephone || '');
    return {
      nom: fiche.nom, metier: fiche.metier, tel: fiche.telephone, telLien: e164(fiche.telephone), email: fiche.email, adresse, horaires: fiche.horaires, zone: fiche.zone, services: fiche.services,
      tarifs: /€|euro/i.test(fiche.tarifs || '') ? fiche.tarifs : '', couleur: couleurDepuis((brief && brief.da && brief.da.couleur) || fiche.couleur) || '',
      mode, jours: joursOuverts(fiche.horaires), creneaux: creneaux(fiche.horaires, 30, mode === 'table' ? 60 : 30), fb,
      modules: ids, annonce: String((brief && brief.annonce) || ''), faq: ((brief && brief.faq) || []).filter(x => x && x.q && x.a).slice(0, 12).map(x => ({ q: String(x.q), a: String(x.a) })),
      wa: e164(wa).replace(/\D/g, ''),
      photos: ((brief && brief.photos) || []).filter(p => p && /^photo-\d{1,2}\.jpg$/.test(p.f || '')).slice(0, 12).map(p => ({ f: p.f, l: String(p.legende || '').slice(0, 100) }))
    };
  }

  /* ───────── Code exécuté dans le site (une fonction normale, vérifiée, puis recopiée telle quelle dans la page) ───────── */
  function runtimeSite() {
    var d = document, C;
    try { C = JSON.parse(d.getElementById('qs-config').textContent); } catch (e) { return; }
    var q = function (s, r) { return (r || d).querySelector(s); }, qa = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
    var norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
    var rgb = function (c) { var m = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?/.exec(c || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
    var lum = function (c) { return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };
    var sat = function (c) { var mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx ? (mx - mn) / mx : 0; };
    var css = function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
    var mixer = function (a, b, t) { return [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t, a[2] * (1 - t) + b[2] * t].map(Math.round); };
    // couleurs de la page : fond, texte et accent du design (lus à l'affichage, valables pour tous les exemples)
    (function () {
      var cs = getComputedStyle(d.body), bg = rgb(cs.backgroundColor);
      if (!bg || bg[3] < 0.5) bg = rgb(getComputedStyle(d.documentElement).backgroundColor);
      if (!bg || bg[3] < 0.5) bg = [255, 255, 255, 1];
      var fg = rgb(cs.color) || [20, 20, 20, 1], ac = null, cand = qa('.btn,.btn-primary,.button,.cta,a[class*="btn"],button[class*="btn"],header a,nav a,a[class*="cta"]');
      for (var i = 0; i < cand.length && !ac; i++) { var c = rgb(getComputedStyle(cand[i]).backgroundColor); if (c && c[3] > 0.9 && sat(c) > 0.25) ac = c; }
      if (!ac && C.couleur) { var h = C.couleur; ac = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
      if (!ac) ac = [47, 91, 234];
      var r = d.documentElement.style, sombre = lum(bg) < 0.5;
      r.setProperty('--qs-bg', css(bg)); r.setProperty('--qs-fg', css(fg)); r.setProperty('--qs-ac', css(ac)); r.setProperty('--qs-on', lum(ac) > 0.6 ? '#111' : '#fff');
      r.setProperty('--qs-card', css(mixer(bg, fg, sombre ? 0.08 : 0.04))); r.setProperty('--qs-line', css(mixer(bg, fg, 0.2)));
      var f = getComputedStyle(d.body).fontFamily; if (f) r.setProperty('--qs-font', f);
    })();
    var tel = function () { return C.tel ? '<a href="tel:' + C.telLien + '">' + C.tel + '</a>' : ''; };
    // ── bandeau d'annonce : texte de la fiche, remplacé par celui de l'espace professionnel si la base est branchée
    var bandeau = q('.qs-annonce');
    var urlBase = C.fb ? 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(C.fb.p) + '/databases/(default)/documents' : '';
    var montrerAnnonce = function (t, actif) {
      if (!bandeau && t && actif) { bandeau = d.createElement('div'); bandeau.className = 'qs-annonce'; bandeau.setAttribute('role', 'status'); d.body.insertBefore(bandeau, d.body.firstChild); }
      if (!bandeau) return;
      if (!t || !actif) { bandeau.hidden = true; return; }
      bandeau.hidden = false; bandeau.textContent = t;
    };
    if (C.fb && C.modules.indexOf('annonce') >= 0) {
      fetch(urlBase + '/site/config?key=' + encodeURIComponent(C.fb.k)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j || !j.fields) return; var f = j.fields;
        montrerAnnonce(f.annonce && f.annonce.stringValue || '', f.annonceActive ? !!f.annonceActive.booleanValue : true);
      }).catch(function () { /* la base n'est pas joignable : l'annonce de la fiche reste affichée */ });
    }
    // ── formulaires : réservation et devis
    var envoyer = function (type, champs) {
      if (!C.fb) return Promise.reject(new Error('sans-base'));
      var f = { type: { stringValue: type }, statut: { stringValue: 'nouvelle' }, envoye: { stringValue: new Date().toISOString() } };
      Object.keys(champs).forEach(function (k) { if (champs[k]) f[k] = { stringValue: String(champs[k]).slice(0, 1500) }; });
      return fetch(urlBase + '/demandes?key=' + encodeURIComponent(C.fb.k), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: f }) }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); });
    };
    var libelles = { nom: 'Nom', telephone: 'Téléphone', email: 'E-mail', date: 'Date', heure: 'Heure', couverts: 'Personnes', prestation: 'Prestation', delai: 'Délai souhaité', message: 'Message' };
    qa('form[data-qs]').forEach(function (form) {
      var type = form.getAttribute('data-qs'), msg = q('.qs-msg', form), date = q('[name=date]', form), heure = q('[name=heure]', form);
      var dire = function (t, erreur) { msg.textContent = t; msg.className = 'qs-msg' + (erreur ? ' qs-err' : ' qs-ok'); };
      if (date) { var a = new Date(); date.min = a.getFullYear() + '-' + String(a.getMonth() + 1).padStart(2, '0') + '-' + String(a.getDate()).padStart(2, '0'); }
      if (heure && heure.tagName === 'SELECT' && !heure.options.length) { heure.innerHTML = '<option value="">Choisir un créneau</option>' + C.creneaux.map(function (h) { return '<option>' + h + '</option>'; }).join(''); }
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var v = {}; qa('input,select,textarea', form).forEach(function (x) { if (x.name && x.type !== 'submit') v[x.name] = String(x.value || '').trim(); });
        if (v.site) return; // champ piège réservé aux robots
        var manque = [];
        if (!v.nom) manque.push('votre nom');
        if (!/\d[\d .-]{7,}/.test(v.telephone || '') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email || '')) manque.push('un téléphone ou un e-mail valide');
        if (type === 'reservation' && !v.date) manque.push('la date');
        if (type === 'reservation' && heure && !v.heure) manque.push('l’heure');
        if (type === 'devis' && !v.message) manque.push('votre besoin');
        if (manque.length) return dire('Merci d’indiquer ' + manque.join(', ') + '.', true);
        if (type === 'reservation' && v.date && C.jours) { var j = new Date(v.date + 'T12:00:00').getDay(); if (C.jours[j] === false) return dire('Nous sommes fermés ce jour-là : choisissez une autre date.', true); }
        try { var t0 = +localStorage.getItem('qs-dernier') || 0; if (Date.now() - t0 < 15000) return dire('Un instant avant d’envoyer une nouvelle demande.', true); localStorage.setItem('qs-dernier', String(Date.now())); } catch (e) { /* stockage indisponible */ }
        var bouton = q('button[type=submit]', form); bouton.disabled = true; dire('Envoi en cours…');
        var corps = Object.keys(libelles).filter(function (k) { return v[k]; }).map(function (k) { return libelles[k] + ' : ' + v[k]; }).join('\n');
        var parMail = function () {
          if (C.email) { location.href = 'mailto:' + C.email + '?subject=' + encodeURIComponent((type === 'devis' ? 'Demande de devis' : 'Demande de réservation') + ' - ' + (v.nom || '')) + '&body=' + encodeURIComponent(corps); dire('Votre messagerie s’ouvre avec la demande : envoyez le message pour la valider.'); }
          else dire('L’envoi en ligne n’est pas disponible' + (C.tel ? ' : appelez-nous au ' + C.tel + '.' : '.'), true);
        };
        envoyer(type, v).then(function () {
          form.reset(); dire('Merci ' + v.nom + ', votre demande est bien envoyée. ' + (C.tel || C.email ? 'Nous vous recontactons pour la confirmer.' : ''));
        }).catch(function (e) { if (e && e.message === 'sans-base') parMail(); else { parMail(); } }).then(function () { bouton.disabled = false; });
      });
    });
    // ── galerie : visionneuse (dialogue natif), flèches, Échap
    (function () {
      var liens = qa('.qs-galerie a'); if (!liens.length || !d.createElement('dialog').showModal) return;
      var dlg = d.createElement('dialog'), idx = 0; dlg.className = 'qs-zoom'; dlg.setAttribute('aria-label', 'Photo agrandie');
      dlg.innerHTML = '<button class="x" type="button" aria-label="Fermer">×</button><button class="p" type="button" aria-label="Photo précédente">‹</button><img alt=""><button class="n" type="button" aria-label="Photo suivante">›</button>'; d.body.appendChild(dlg);
      var img = q('img', dlg), voir = function (i) { idx = (i + liens.length) % liens.length; var m = q('img', liens[idx]); img.src = liens[idx].getAttribute('href'); img.alt = m ? m.alt : ''; };
      liens.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); voir(i); dlg.showModal(); }); });
      q('.x', dlg).addEventListener('click', function () { dlg.close(); }); q('.p', dlg).addEventListener('click', function () { voir(idx - 1); }); q('.n', dlg).addEventListener('click', function () { voir(idx + 1); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') voir(idx - 1); else if (e.key === 'ArrowRight') voir(idx + 1); });
    })();
    // ── assistant de questions : réponses fixes tirées de la fiche (aucune invention)
    if (C.modules.indexOf('chatbot') >= 0) (function () {
      var rep = function (texte, actions) { return { texte: texte, actions: actions || [] }; };
      var appel = C.tel ? [{ l: 'Appeler ' + C.tel, h: 'tel:' + C.telLien }] : [], mail = C.email ? [{ l: 'Écrire un e-mail', h: 'mailto:' + C.email }] : [];
      var cible = q('#qs-reservation') ? [{ l: C.mode === 'table' ? 'Réserver une table' : 'Prendre rendez-vous', h: '#qs-reservation' }] : [], cibleDevis = q('#qs-devis') ? [{ l: 'Demander un devis', h: '#qs-devis' }] : [];
      var contact = rep(C.tel || C.email ? 'Le plus simple : ' + (C.tel ? 'appelez-nous au ' + C.tel : '') + (C.tel && C.email ? ' ou ' : '') + (C.email ? 'écrivez-nous à ' + C.email : '') + '.' : 'Je n’ai pas cette information pour le moment.', appel.concat(mail));
      var intents = [
        { m: ['horaire', 'ouvert', 'ouverture', 'ferme', 'fermeture', 'heure', 'quand', 'jours'], r: C.horaires ? rep('Nos horaires : ' + C.horaires + '.', cible) : null },
        { m: ['adresse', 'situe', 'trouver', 'venir', 'acces', 'plan', 'localisation', 'parking', 'ou etes'], r: C.adresse ? rep('Nous sommes au ' + C.adresse + '.', [{ l: 'Voir sur le plan', h: 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(C.adresse) }]) : null },
        { m: ['telephone', 'appeler', 'appel', 'numero', 'joindre', 'contact', 'mail', 'email', 'ecrire'], r: contact },
        { m: ['service', 'prestation', 'propose', 'faites', 'activite', 'offre', 'carte', 'menu'], r: C.services.length ? rep('Nous proposons : ' + C.services.join(', ') + '.', cible.concat(cibleDevis)) : null },
        { m: ['tarif', 'prix', 'combien', 'cout', 'cher'], r: C.tarifs ? rep('Nos tarifs : ' + C.tarifs, cibleDevis.concat(cible)) : rep('Les tarifs dépendent de votre demande.' + (cibleDevis.length ? ' Faites une demande de devis, nous vous répondons.' : (C.tel ? ' Appelez-nous, nous vous renseignons.' : '')), cibleDevis.concat(appel)) },
        { m: ['reserver', 'reservation', 'rendez', 'rdv', 'table', 'creneau', 'disponible', 'disponibilite'], r: cible.length ? rep(C.mode === 'table' ? 'Vous pouvez réserver votre table en ligne.' : 'Vous pouvez demander un rendez-vous en ligne.', cible) : (C.tel ? rep('Pour réserver, appelez-nous au ' + C.tel + '.', appel) : null) },
        { m: ['devis', 'estimation'], r: cibleDevis.length ? rep('Vous pouvez demander un devis en ligne.', cibleDevis) : contact },
        { m: ['zone', 'deplace', 'livraison', 'secteur', 'intervenez', 'alentours', 'region'], r: C.zone ? rep('Notre zone : ' + C.zone + '.', appel) : null },
        { m: ['bonjour', 'salut', 'bonsoir', 'hello', 'coucou'], r: rep('Bonjour ! Posez-moi votre question : horaires, adresse, services, réservation…') },
        { m: ['merci', 'parfait', 'super'], r: rep('Avec plaisir ! Une autre question ?') }
      ];
      var mots = function (t) { return norm(t).split(' ').filter(function (x) { return x.length > 3; }); };
      var chercher = function (texte) {
        var n = ' ' + norm(texte) + ' ', ts = mots(texte), meilleur = null, note = 0;
        C.faq.forEach(function (f) { var mq = mots(f.q), com = mq.filter(function (x) { return ts.some(function (t) { return t.indexOf(x.slice(0, 5)) === 0 || x.indexOf(t.slice(0, 5)) === 0; }); }).length; if (com >= Math.min(2, mq.length) && com > note) { note = com; meilleur = rep(f.a, appel); } });
        if (meilleur) return meilleur;
        intents.forEach(function (it) { var s = it.m.filter(function (x) { return n.indexOf(' ' + x) >= 0; }).length; if (s > note && it.r) { note = s; meilleur = it.r; } });
        return meilleur || rep('Je n’ai pas la réponse à cette question.' + (C.tel || C.email ? ' ' + contact.texte : ''), appel.concat(mail));
      };
      var bulle = d.createElement('button'); bulle.type = 'button'; bulle.className = 'qs-bulle'; bulle.setAttribute('aria-expanded', 'false'); bulle.setAttribute('aria-controls', 'qs-chat'); bulle.innerHTML = '<span aria-hidden="true">💬</span> Une question ?';
      var fen = d.createElement('div'); fen.id = 'qs-chat'; fen.className = 'qs-chat'; fen.hidden = true; fen.setAttribute('role', 'dialog'); fen.setAttribute('aria-label', 'Assistant du site ' + C.nom);
      fen.innerHTML = '<div class="qs-chat-tete"><strong></strong><button type="button" class="qs-x" aria-label="Fermer">×</button></div><div class="qs-chat-fil" aria-live="polite"></div><div class="qs-chat-sug"></div><form class="qs-chat-form"><input type="text" aria-label="Votre question" placeholder="Votre question…" maxlength="200" autocomplete="off"><button type="submit">Envoyer</button></form>';
      q('strong', fen).textContent = 'Assistant · ' + C.nom;
      d.body.appendChild(fen); d.body.appendChild(bulle);
      var fil = q('.qs-chat-fil', fen), champ = q('input', fen);
      var ajouter = function (texte, moi, actions) {
        var b = d.createElement('div'); b.className = 'qs-m ' + (moi ? 'qs-moi' : 'qs-bot'); var p = d.createElement('p'); p.textContent = texte; b.appendChild(p);
        (actions || []).forEach(function (a) { var l = d.createElement('a'); l.textContent = a.l; l.href = a.h; if (/^https?:/.test(a.h)) { l.target = '_blank'; l.rel = 'noopener'; } l.addEventListener('click', function () { if (a.h.charAt(0) === '#') ouvrir(false); }); b.appendChild(l); });
        fil.appendChild(b); fil.scrollTop = fil.scrollHeight;
      };
      var sug = q('.qs-chat-sug', fen);
      [C.horaires && 'Quels sont vos horaires ?', C.adresse && 'Où êtes-vous ?', C.services.length && 'Que proposez-vous ?', (cible.length || C.tel) && (C.mode === 'table' ? 'Comment réserver ?' : 'Comment prendre rendez-vous ?')].filter(Boolean).forEach(function (t) {
        var b = d.createElement('button'); b.type = 'button'; b.textContent = t; b.addEventListener('click', function () { demander(t); }); sug.appendChild(b);
      });
      var demander = function (t) { ajouter(t, true); var r = chercher(t); setTimeout(function () { ajouter(r.texte, false, r.actions); }, 250); };
      var ouvert = false, ouvrir = function (o) {
        ouvert = o; fen.hidden = !o; bulle.setAttribute('aria-expanded', String(o));
        if (o) { if (!fil.children.length) ajouter('Bonjour ! Je réponds aux questions fréquentes sur ' + C.nom + '. Que voulez-vous savoir ?', false); champ.focus(); } else bulle.focus();
      };
      bulle.addEventListener('click', function () { ouvrir(!ouvert); });
      q('.qs-x', fen).addEventListener('click', function () { ouvrir(false); });
      fen.addEventListener('keydown', function (e) { if (e.key === 'Escape') ouvrir(false); });
      q('form', fen).addEventListener('submit', function (e) { e.preventDefault(); var t = champ.value.trim(); if (!t) return; champ.value = ''; demander(t); });
    })();
  }

  /* ───────── Style des fonctions (s'adapte aux couleurs du design grâce aux variables lues par le code) ───────── */
  const CSS_MODULES = `.qs-sec{padding:clamp(48px,7vw,88px) 0;background:var(--qs-bg,#fff);color:var(--qs-fg,#1a1a1a);font-family:var(--qs-font,inherit)}
.qs-wrap{width:min(100% - 32px,760px);margin:0 auto}.qs-sec h2{margin:0 0 6px;font-size:clamp(26px,4vw,38px);line-height:1.15}.qs-sec p.qs-intro{margin:0 0 22px;opacity:.78}
.qs-box{background:var(--qs-card,#f4f4f6);border:1px solid var(--qs-line,#ddd);border-radius:16px;padding:clamp(16px,3vw,28px)}
.qs-form{display:grid;gap:14px}.qs-duo{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:560px){.qs-duo{grid-template-columns:1fr}}
.qs-form label{display:grid;gap:6px;font-size:14px;font-weight:600}.qs-form input,.qs-form select,.qs-form textarea{font:inherit;font-weight:400;color:inherit;background:var(--qs-bg,#fff);border:1px solid var(--qs-line,#ccc);border-radius:10px;padding:11px 12px;width:100%;min-width:0}
.qs-form textarea{min-height:92px;resize:vertical}.qs-form input:focus-visible,.qs-form select:focus-visible,.qs-form textarea:focus-visible,.qs-bulle:focus-visible,.qs-chat button:focus-visible,.qs-chat input:focus-visible{outline:3px solid var(--qs-ac,#2f5bea);outline-offset:2px}
.qs-form button[type=submit]{font:inherit;font-weight:700;cursor:pointer;border:0;border-radius:999px;padding:13px 22px;background:var(--qs-ac,#2f5bea);color:var(--qs-on,#fff)}.qs-form button[disabled]{opacity:.6;cursor:wait}
.qs-piege{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}
.qs-msg{margin:0;min-height:1.3em;font-size:14px}.qs-err{color:#c62828}.qs-ok{color:inherit;font-weight:600}.qs-sec details{border-bottom:1px solid var(--qs-line,#ddd);padding:14px 2px}.qs-sec summary{cursor:pointer;font-weight:700}.qs-sec details p{margin:10px 0 0;opacity:.85}
.qs-large{width:min(100% - 32px,1100px)}.qs-galerie{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}.qs-galerie a{display:block;border-radius:var(--qs-r,12px);overflow:hidden;aspect-ratio:4/3;background:var(--qs-card,#eee)}.qs-galerie img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s}.qs-galerie a:hover img,.qs-galerie a:focus-visible img{transform:scale(1.04)}
.qs-zoom{border:0;padding:0;background:rgba(0,0,0,.92);max-width:100vw;max-height:100vh;width:100vw;height:100vh}.qs-zoom::backdrop{background:#000}.qs-zoom img{position:absolute;inset:0;margin:auto;max-width:94vw;max-height:88vh;object-fit:contain}.qs-zoom button{position:absolute;top:12px;z-index:2;border:0;border-radius:999px;background:#fff;color:#111;font:700 18px/1 system-ui,sans-serif;width:44px;height:44px;cursor:pointer}.qs-zoom .x{right:12px}.qs-zoom .p{left:12px;top:50%}.qs-zoom .n{right:12px;top:50%}
.qs-annonce{position:relative;z-index:50;background:var(--qs-ac,#2f5bea);color:var(--qs-on,#fff);text-align:center;padding:9px 16px;font:600 14px/1.35 system-ui,sans-serif}.qs-annonce[hidden]{display:none}
.qs-bulle,.qs-wa{position:fixed;right:16px;z-index:60;border:0;border-radius:999px;font:700 15px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.28)}
.qs-bulle{bottom:16px;background:var(--qs-ac,#2f5bea);color:var(--qs-on,#fff);padding:14px 18px}.qs-wa{bottom:78px;background:#25d366;color:#08331a;padding:13px 17px;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
.qs-chat{position:fixed;right:16px;bottom:78px;z-index:70;width:min(360px,100vw - 32px);max-height:min(70vh,520px);display:flex;flex-direction:column;background:var(--qs-bg,#fff);color:var(--qs-fg,#1a1a1a);border:1px solid var(--qs-line,#ccc);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;font:15px/1.4 system-ui,sans-serif}.qs-chat[hidden]{display:none}
.qs-chat-tete{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--qs-ac,#2f5bea);color:var(--qs-on,#fff)}.qs-x{background:none;border:0;color:inherit;font-size:24px;line-height:1;cursor:pointer}
.qs-chat-fil{flex:1;overflow:auto;padding:12px;display:grid;gap:8px;align-content:start}.qs-m{max-width:88%;padding:9px 12px;border-radius:14px;display:grid;gap:6px}.qs-m p{margin:0}.qs-bot{background:var(--qs-card,#f1f1f3);justify-self:start}.qs-moi{background:var(--qs-ac,#2f5bea);color:var(--qs-on,#fff);justify-self:end}
.qs-m a{color:inherit;font-weight:700;text-decoration:underline}.qs-chat-sug{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}.qs-chat-sug button{font:inherit;font-size:13px;cursor:pointer;border:1px solid var(--qs-line,#ccc);background:transparent;color:inherit;border-radius:999px;padding:6px 10px}
.qs-chat-form{display:flex;gap:6px;padding:10px;border-top:1px solid var(--qs-line,#ddd)}.qs-chat-form input{flex:1;min-width:0;font:inherit;border:1px solid var(--qs-line,#ccc);border-radius:10px;padding:9px 10px;background:var(--qs-bg,#fff);color:inherit}.qs-chat-form button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:0 14px;background:var(--qs-ac,#2f5bea);color:var(--qs-on,#fff);cursor:pointer}`;

  /* ───────── Injection dans la page ───────── */
  function formReservation(C) {
    const table = C.mode === 'table', heure = C.creneaux.length ? '<select name="heure" required></select>' : '<input type="time" name="heure" required>';
    const prest = C.services.length ? `<label>Prestation<select name="prestation"><option value="">À préciser</option>${C.services.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>` : '';
    return `<section class="qs-sec" id="qs-reservation" aria-labelledby="qs-t-res"><div class="qs-wrap"><h2 id="qs-t-res" class="qs-titre">${table ? 'Réserver une table' : 'Prendre rendez-vous'}</h2>
<p class="qs-intro">Indiquez vos coordonnées et la date souhaitée : ${esc(C.nom)} vous recontacte pour confirmer.</p>
<div class="qs-box"><form class="qs-form" data-qs="reservation" novalidate><div class="qs-duo"><label>Votre nom<input name="nom" autocomplete="name" required></label><label>Téléphone<input name="telephone" type="tel" autocomplete="tel"></label></div>
<label>E-mail (facultatif)<input name="email" type="email" autocomplete="email"></label>
<div class="qs-duo"><label>Date<input name="date" type="date" required></label><label>Heure${heure}</label></div>
${table ? '<label>Nombre de personnes<input name="couverts" type="number" min="1" max="30" value="2"></label>' : prest}
<label>Précisions (facultatif)<textarea name="message" maxlength="600"></textarea></label><div class="qs-piege" aria-hidden="true"><label>Ne pas remplir<input name="site" tabindex="-1" autocomplete="off"></label></div>
<button type="submit">${table ? 'Envoyer ma demande de réservation' : 'Envoyer ma demande de rendez-vous'}</button><p class="qs-msg" role="status" aria-live="polite"></p></form></div></div></section>`;
  }
  function formDevis(C) {
    const prest = C.services.length ? `<label>Besoin concerné<select name="prestation"><option value="">À préciser</option>${C.services.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>` : '';
    return `<section class="qs-sec" id="qs-devis" aria-labelledby="qs-t-dev"><div class="qs-wrap"><h2 id="qs-t-dev" class="qs-titre">Demander un devis</h2>
<p class="qs-intro">Décrivez votre besoin : ${esc(C.nom)} vous répond avec une proposition.</p>
<div class="qs-box"><form class="qs-form" data-qs="devis" novalidate><div class="qs-duo"><label>Votre nom<input name="nom" autocomplete="name" required></label><label>Téléphone<input name="telephone" type="tel" autocomplete="tel"></label></div>
<label>E-mail<input name="email" type="email" autocomplete="email"></label>${prest}<label>Délai souhaité (facultatif)<input name="delai" maxlength="80"></label>
<label>Votre besoin<textarea name="message" maxlength="1200" required></textarea></label><div class="qs-piege" aria-hidden="true"><label>Ne pas remplir<input name="site" tabindex="-1" autocomplete="off"></label></div>
<button type="submit">Envoyer ma demande</button><p class="qs-msg" role="status" aria-live="polite"></p></form></div></div></section>`;
  }
  function sectionGalerie(C) {
    if (!C.photos.length) return '';
    return `<section class="qs-sec" id="qs-galerie" aria-labelledby="qs-t-gal"><div class="qs-wrap qs-large"><h2 id="qs-t-gal" class="qs-titre">En images</h2><ul class="qs-galerie">${C.photos.map((p, i) => `<li><a href="assets/img/${esc(p.f)}" data-i="${i}" aria-label="Agrandir la photo ${i + 1}"><img src="assets/img/${esc(p.f)}" alt="${esc(p.l || (C.nom + ' : photo ' + (i + 1)))}" loading="lazy" decoding="async"></a></li>`).join('')}</ul></div></section>`;
  }
  function sectionFaq(C) {
    const l = [];
    if (C.horaires) l.push([`Quels sont vos horaires ?`, C.horaires + '.']);
    if (C.adresse) l.push([`Où se trouve ${C.nom} ?`, C.adresse + '.']);
    if (C.services.length) l.push(['Que proposez-vous ?', C.services.join(', ') + '.']);
    if (C.zone) l.push(['Quelle est votre zone d’intervention ?', C.zone + '.']);
    if (C.modules.includes('reservation')) l.push([C.mode === 'table' ? 'Comment réserver une table ?' : 'Comment prendre rendez-vous ?', 'Remplissez le formulaire de réservation de cette page : nous vous recontactons pour confirmer.']);
    if (C.tel || C.email) l.push(['Comment vous contacter ?', [C.tel && 'Par téléphone au ' + C.tel, C.email && 'par e-mail à ' + C.email].filter(Boolean).join(', ') + '.']);
    for (const f of C.faq) l.push([f.q, f.a]);
    if (!l.length) return '';
    return `<section class="qs-sec" id="qs-faq" aria-labelledby="qs-t-faq"><div class="qs-wrap"><h2 id="qs-t-faq" class="qs-titre">Questions fréquentes</h2>${l.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>`;
  }
  // brief : { modules: [ids], options: {...}, faq: [{q, a}], annonce, da: {...} } ; retourne { notes }
  function appliquerModules(doc, fiche, brief, modele) {
    const notes = [], ids = ((brief && brief.modules) || []).filter(x => IDS.includes(x));
    if (!ids.length) return notes;
    const C = configPublique(fiche, { ...brief, modules: ids }), corps = doc.body, pied = doc.querySelector('footer');
    const poser = html => { const t = doc.createElement('template'); t.innerHTML = html; const n = t.content.firstElementChild; if (pied) pied.parentNode.insertBefore(n, pied); else corps.appendChild(n); return n; };
    if (ids.includes('galerie')) { const h = sectionGalerie(C); if (h) poser(h); }
    if (ids.includes('faq')) { const h = sectionFaq(C); if (h) poser(h); }
    if (ids.includes('devis')) poser(formDevis(C));
    if (ids.includes('reservation')) poser(formReservation(C));
    if (ids.includes('annonce') && C.annonce) { const b = doc.createElement('div'); b.className = 'qs-annonce'; b.setAttribute('role', 'status'); b.textContent = C.annonce; corps.insertBefore(b, corps.firstChild); }
    if (ids.includes('whatsapp')) {
      if (C.wa) { const a = doc.createElement('a'); a.className = 'qs-wa'; a.href = 'https://wa.me/' + C.wa; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'Écrire sur WhatsApp'); a.textContent = '💬 WhatsApp'; corps.appendChild(a); } else notes.push('Le bouton WhatsApp n’est pas affiché : aucun numéro dans la fiche.');
    }
    // lien dans le menu ; les boutons « réserver » / « devis » du design mènent au formulaire qui fonctionne
    const cibles = [ids.includes('reservation') && ['qs-reservation', /r[ée]serv|rendez-vous|\brdv\b/i], ids.includes('devis') && ['qs-devis', /\bdevis\b/i]].filter(Boolean);
    if (cibles.length) {
      const nav = doc.querySelector('header nav, nav'), liens = nav ? [...nav.querySelectorAll('a')] : [];
      if (nav && liens.length && !liens.some(a => /r[ée]serv|rendez-vous|devis/i.test(a.textContent))) { const dernier = liens[liens.length - 1], a = dernier.cloneNode(false), [id, re] = cibles[0]; a.setAttribute('href', '#' + id); a.textContent = id === 'qs-devis' ? 'Devis' : (C.mode === 'table' ? 'Réserver' : 'Rendez-vous'); void re; dernier.parentNode.insertBefore(a, dernier.nextSibling); }
      doc.querySelectorAll('a[href^="#"]').forEach(a => { const t = a.textContent.trim(); if (t.length > 40 || a.closest('.qs-sec')) return; for (const [id, re] of cibles) if (re.test(t)) { a.setAttribute('href', '#' + id); break; } });
    }
    if (ids.some(x => ['reservation', 'devis'].includes(x)) && !C.fb) notes.push(C.email ? 'Réservation et devis : sans base Firebase, les demandes s’envoient par e-mail (le visiteur doit valider l’envoi dans sa messagerie).' : 'Réservation et devis : ni base Firebase ni e-mail dans la fiche, les demandes ne pourront pas être transmises.');
    if (ids.includes('panel') && !C.fb) notes.push('Espace professionnel : renseigne les clés Firebase pour que les demandes arrivent dans le panel (le dossier admin/ est en mode démonstration).');
    const st = doc.createElement('style'); st.id = 'qs-modules'; st.textContent = CSS_MODULES; doc.head.appendChild(st);
    const cfg = doc.createElement('script'); cfg.type = 'application/json'; cfg.id = 'qs-config'; cfg.textContent = jsonSur(C); corps.appendChild(cfg);
    const run = doc.createElement('script'); run.id = 'qs-runtime'; run.textContent = '(' + runtimeSite.toString() + ')();'; corps.appendChild(run);
    void modele;
    return notes;
  }

  /* ───────── Espace professionnel (admin/index.html) ───────── */
  function runtimeAdmin() {
    var d = document, C = JSON.parse(d.getElementById('cfg').textContent), app = d.getElementById('app');
    var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var demo = !C.fb || /[?&]demo\b/.test(location.search), TOK = null, emailSaisi = '', donnees = [], filtre = { statut: '', type: '', q: '' }, config = { annonce: '', annonceActive: true }, vue = 'demandes', erreur = '';
    var STATUTS = { nouvelle: 'Nouvelle', confirmee: 'Confirmée', refusee: 'Refusée', terminee: 'Terminée' };
    var BASE = C.fb ? 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(C.fb.p) + '/databases/(default)/documents' : '';
    var jour = function (s) { try { return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return s; } };
    var neutre = function (t) { t = String(t == null ? '' : t); return /^[=+\-@\t\r]/.test(t) ? "'" + t : t; };
    // données de démonstration (fictives, signalées comme telles)
    var DEMO = function () { try { var s = JSON.parse(localStorage.getItem('qs-demo') || 'null'); if (s) return s; } catch (e) { /* première ouverture */ }
      var n = new Date(); n.setDate(n.getDate() + 2); var iso = n.toISOString().slice(0, 10);
      return { d: [{ id: 'a1', type: 'reservation', statut: 'nouvelle', nom: 'Camille Exemple', telephone: '06 00 00 00 01', email: '', date: iso, heure: '19:30', couverts: '4', message: 'Demande d’exemple (fictive).', envoye: new Date().toISOString() },
        { id: 'a2', type: 'devis', statut: 'confirmee', nom: 'Sam Exemple', telephone: '', email: 'sam@exemple.invalid', message: 'Demande d’exemple (fictive).', envoye: new Date(Date.now() - 864e5).toISOString() }], c: { annonce: '', annonceActive: true } }; };
    var sauverDemo = function () { try { localStorage.setItem('qs-demo', JSON.stringify({ d: donnees, c: config })); } catch (e) { /* stockage indisponible */ } };
    var champs = function (o) { var f = {}; Object.keys(o).forEach(function (k) { f[k] = typeof o[k] === 'boolean' ? { booleanValue: o[k] } : { stringValue: String(o[k]) }; }); return f; };
    var depuis = function (doc) { var o = { id: doc.name.split('/').pop() }; Object.keys(doc.fields || {}).forEach(function (k) { var v = doc.fields[k]; o[k] = v.stringValue !== undefined ? v.stringValue : v.booleanValue; }); return o; };
    var saveTok = function (t) { TOK = t; try { sessionStorage.setItem('qs-tok', JSON.stringify(t)); } catch (e) { /* session indisponible */ } };
    var tokenValide = function () {
      if (TOK && TOK.exp > Date.now() + 30000) return Promise.resolve(TOK.id);
      if (!TOK || !TOK.refresh) return Promise.reject(new Error('Connexion expirée : reconnectez-vous.'));
      return fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(C.fb.k), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(TOK.refresh) })
        .then(function (r) { if (!r.ok) throw new Error('Connexion expirée : reconnectez-vous.'); return r.json(); }).then(function (j) { saveTok({ id: j.id_token, refresh: j.refresh_token, exp: Date.now() + (+j.expires_in || 3600) * 1000 }); return TOK.id; });
    };
    var appel = function (chemin, opt) {
      return tokenValide().then(function (t) { opt = opt || {}; opt.headers = Object.assign({ Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, opt.headers || {}); return fetch(BASE + chemin, opt); })
        .then(function (r) { if (r.status === 403) throw new Error('Accès refusé : vérifiez les règles Firestore et le compte utilisé.'); if (!r.ok && r.status !== 404) throw new Error('Erreur du serveur (' + r.status + ').'); return r.status === 404 ? null : r.json(); });
    };
    var lister = function () {
      if (demo) { var s = DEMO(); donnees = s.d; config = s.c; return Promise.resolve(); }
      return appel(':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'demandes' }], orderBy: [{ field: { fieldPath: 'envoye' }, direction: 'DESCENDING' }], limit: 300 } }) })
        .then(function (j) { donnees = (j || []).filter(function (x) { return x.document; }).map(function (x) { return depuis(x.document); }); return appel('/site/config'); })
        .then(function (c) { if (c && c.fields) { var o = depuis({ name: 'x/config', fields: c.fields }); config = { annonce: o.annonce || '', annonceActive: o.annonceActive !== false }; } });
    };
    var modifier = function (id, o) {
      if (demo) { donnees.forEach(function (x) { if (x.id === id) Object.assign(x, o); }); sauverDemo(); return Promise.resolve(); }
      var masque = Object.keys(o).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
      return appel('/demandes/' + encodeURIComponent(id) + '?' + masque, { method: 'PATCH', body: JSON.stringify({ fields: champs(o) }) });
    };
    var supprimer = function (id) { if (demo) { donnees = donnees.filter(function (x) { return x.id !== id; }); sauverDemo(); return Promise.resolve(); } return appel('/demandes/' + encodeURIComponent(id), { method: 'DELETE' }); };
    var ecrireConfig = function () {
      if (demo) { sauverDemo(); return Promise.resolve(); }
      return appel('/site/config?updateMask.fieldPaths=annonce&updateMask.fieldPaths=annonceActive', { method: 'PATCH', body: JSON.stringify({ fields: champs({ annonce: config.annonce, annonceActive: !!config.annonceActive }) }) });
    };
    var recharger = function () { return lister().then(function () { erreur = ''; }).catch(function (e) { erreur = e.message; }).then(dessiner); };
    var csv = function () {
      var cols = ['envoye', 'type', 'statut', 'nom', 'telephone', 'email', 'date', 'heure', 'couverts', 'prestation', 'delai', 'message'];
      var l = [cols.join(';')].concat(donnees.map(function (x) { return cols.map(function (c) { return '"' + neutre(x[c]).replace(/"/g, '""') + '"'; }).join(';'); }));
      var a = d.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + l.join('\r\n')], { type: 'text/csv' })); a.download = 'demandes.csv'; d.body.appendChild(a); a.click(); a.remove();
    };
    var visibles = function () { var t = filtre.q.toLowerCase(); return donnees.filter(function (x) { return (!filtre.statut || x.statut === filtre.statut) && (!filtre.type || x.type === filtre.type) && (!t || JSON.stringify(x).toLowerCase().indexOf(t) >= 0); }); };
    var carte = function (x) {
      var rep = x.email ? 'mailto:' + x.email + '?subject=' + encodeURIComponent('Votre demande - ' + C.nom) + '&body=' + encodeURIComponent('Bonjour ' + (x.nom || '') + ',\n\nNous avons bien reçu votre demande' + (x.date ? ' pour le ' + x.date + (x.heure ? ' à ' + x.heure : '') : '') + '.\n\nCordialement,\n' + C.nom) : '';
      var det = [x.date && 'Le ' + x.date + (x.heure ? ' à ' + x.heure : ''), x.couverts && x.couverts + ' pers.', x.prestation, x.delai && 'Délai : ' + x.delai].filter(Boolean).map(esc).join(' · ');
      return '<article class="carte s-' + esc(x.statut) + '"><header><b>' + esc(x.nom || 'Sans nom') + '</b><span class="puce">' + esc(x.type === 'devis' ? 'Devis' : x.type === 'message' ? 'Message' : 'Réservation') + '</span><span class="puce st">' + esc(STATUTS[x.statut] || x.statut) + '</span></header>' +
        (det ? '<p>' + det + '</p>' : '') + (x.message ? '<p class="msg">' + esc(x.message) + '</p>' : '') +
        '<p class="pet">Reçue le ' + esc(jour(x.envoye)) + (x.telephone ? ' · <a href="tel:' + esc(String(x.telephone).replace(/[^\d+]/g, '')) + '">' + esc(x.telephone) + '</a>' : '') + (x.email ? ' · <a href="' + esc(rep) + '">' + esc(x.email) + '</a>' : '') + '</p>' +
        '<div class="act">' + (x.statut !== 'confirmee' ? '<button data-a="statut" data-id="' + esc(x.id) + '" data-v="confirmee">Confirmer</button>' : '') + (x.statut !== 'refusee' ? '<button data-a="statut" data-id="' + esc(x.id) + '" data-v="refusee">Refuser</button>' : '') + (x.statut !== 'terminee' ? '<button data-a="statut" data-id="' + esc(x.id) + '" data-v="terminee">Terminée</button>' : '') + '<button class="danger" data-a="suppr" data-id="' + esc(x.id) + '">Supprimer</button></div></article>';
    };
    var dessiner = function () {
      if (!demo && !TOK) {
        app.innerHTML = '<main class="centre"><form id="co" class="boite"><h1>Espace professionnel</h1><p class="doux">' + esc(C.nom) + '</p><label>Adresse e-mail<input type="email" name="email" autocomplete="username" value="' + esc(emailSaisi) + '" required></label><label>Mot de passe<input type="password" name="mdp" autocomplete="current-password" required></label><button type="submit" class="pri">Se connecter</button><p class="err" role="alert">' + esc(erreur) + '</p></form></main>';
        d.getElementById('co').addEventListener('submit', function (e) {
          e.preventDefault(); var f = e.target, b = f.querySelector('button'); b.disabled = true; erreur = ''; emailSaisi = f.email.value.trim();
          fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + encodeURIComponent(C.fb.k), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email.value.trim(), password: f.mdp.value, returnSecureToken: true }) })
            .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(/PASSWORD|EMAIL|CREDENTIAL/.test(JSON.stringify(j)) ? 'Adresse e-mail ou mot de passe incorrect.' : /TOO_MANY/.test(JSON.stringify(j)) ? 'Trop d’essais : réessayez dans quelques minutes.' : 'Connexion impossible.'); return j; }); })
            .then(function (j) { saveTok({ id: j.idToken, refresh: j.refreshToken, exp: Date.now() + (+j.expiresIn || 3600) * 1000 }); return recharger(); })
            .catch(function (er) { erreur = er.message; dessiner(); });
        });
        return;
      }
      var n = function (s) { return donnees.filter(function (x) { return x.statut === s; }).length; }, liste = visibles();
      app.innerHTML = '<header class="haut"><b>' + esc(C.nom) + '</b><span class="doux">Espace professionnel' + (demo ? ' · mode démonstration' : '') + '</span><span class="esp"></span><button data-a="maj">Actualiser</button><button data-a="csv">Exporter (CSV)</button>' + (demo ? '' : '<button data-a="sortir">Se déconnecter</button>') + '</header>' +
        (demo ? '<p class="bandeau">Mode démonstration : ces demandes sont fictives et restent dans ce navigateur. Renseigne les clés Firebase (voir LISEZMOI-FIREBASE.txt) pour recevoir les vraies demandes.</p>' : '') +
        (erreur ? '<p class="bandeau err" role="alert">' + esc(erreur) + '</p>' : '') +
        '<nav class="onglets"><button data-a="vue" data-v="demandes" class="' + (vue === 'demandes' ? 'on' : '') + '">Demandes</button><button data-a="vue" data-v="annonce" class="' + (vue === 'annonce' ? 'on' : '') + '">Annonce du site</button></nav>' +
        (vue === 'demandes' ? '<section class="chiffres"><div><b>' + n('nouvelle') + '</b>nouvelles</div><div><b>' + n('confirmee') + '</b>confirmées</div><div><b>' + donnees.length + '</b>au total</div></section>' +
          '<section class="filtres"><input type="search" id="rech" placeholder="Rechercher un nom, un numéro…" value="' + esc(filtre.q) + '"><select id="fs"><option value="">Tous les statuts</option>' + Object.keys(STATUTS).map(function (k) { return '<option value="' + k + '"' + (filtre.statut === k ? ' selected' : '') + '>' + STATUTS[k] + '</option>'; }).join('') + '</select><select id="ft"><option value="">Tous les types</option><option value="reservation"' + (filtre.type === 'reservation' ? ' selected' : '') + '>Réservations</option><option value="devis"' + (filtre.type === 'devis' ? ' selected' : '') + '>Devis</option></select></section>' +
          '<section class="liste">' + (liste.length ? liste.map(carte).join('') : '<p class="doux">Aucune demande pour le moment.</p>') + '</section>'
          : '<section class="boite large"><h2>Annonce affichée en haut du site</h2><p class="doux">Congés, promotion, information : le bandeau apparaît sur toutes les pages du site.</p><label>Texte<textarea id="an" maxlength="200">' + esc(config.annonce) + '</textarea></label><label class="ligne"><input type="checkbox" id="aa"' + (config.annonceActive ? ' checked' : '') + '> Afficher le bandeau</label><button class="pri" data-a="annonce">Enregistrer</button><p class="ok" id="anm" role="status"></p></section>');
      var r = d.getElementById('rech'); if (r) { r.addEventListener('input', function () { filtre.q = r.value; var p = r.selectionStart; dessiner(); var r2 = d.getElementById('rech'); r2.focus(); r2.setSelectionRange(p, p); }); d.getElementById('fs').addEventListener('change', function (e) { filtre.statut = e.target.value; dessiner(); }); d.getElementById('ft').addEventListener('change', function (e) { filtre.type = e.target.value; dessiner(); }); }
    };
    app.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'), id = b.getAttribute('data-id');
      var fin = function (p) { return p.catch(function (er) { erreur = er.message; }).then(function () { return recharger(); }); };
      if (a === 'statut') fin(modifier(id, { statut: b.getAttribute('data-v') }));
      else if (a === 'suppr') { if (confirm('Supprimer définitivement cette demande ?')) fin(supprimer(id)); }
      else if (a === 'maj') recharger(); else if (a === 'csv') csv();
      else if (a === 'sortir') { TOK = null; try { sessionStorage.removeItem('qs-tok'); } catch (er) { /* rien */ } donnees = []; dessiner(); }
      else if (a === 'vue') { vue = b.getAttribute('data-v'); dessiner(); }
      else if (a === 'annonce') { config.annonce = d.getElementById('an').value.trim(); config.annonceActive = d.getElementById('aa').checked; ecrireConfig().then(function () { d.getElementById('anm').textContent = 'Enregistré.'; }).catch(function (er) { d.getElementById('anm').textContent = er.message; d.getElementById('anm').className = 'err'; }); }
    });
    try { var s = JSON.parse(sessionStorage.getItem('qs-tok') || 'null'); if (s && !demo) TOK = s; } catch (e) { /* pas de session */ }
    if (demo || TOK) recharger(); else dessiner();
    setInterval(function () { if ((demo || TOK) && vue === 'demandes' && !d.activeElement.matches('input,textarea,select')) recharger(); }, 60000);
  }
  const CSS_ADMIN = `:root{color-scheme:light dark;--f:#f6f6f8;--c:#fff;--t:#16161c;--d:#62626f;--l:#dcdce3;--a:#2f5bea;--o:#fff;--r:#c62828;--v:#1b7a43}@media(prefers-color-scheme:dark){:root{--f:#101015;--c:#191920;--t:#f1f1f5;--d:#a2a2b0;--l:#2c2c37;--a:#7d97ff;--o:#101015;--r:#ff8a8a;--v:#6fd49a}}
*{box-sizing:border-box}body{margin:0;background:var(--f);color:var(--t);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;border:1px solid var(--l);background:var(--c);border-radius:8px;padding:8px 12px}button.pri{background:var(--a);border-color:var(--a);color:var(--o);font-weight:700}button.danger{color:var(--r)}button[disabled]{opacity:.6}
input,select,textarea{background:var(--c);border:1px solid var(--l);border-radius:8px;padding:9px 10px;width:100%}label{display:grid;gap:5px;font-size:13px;color:var(--d)}.ligne{display:flex;align-items:center;gap:8px}.ligne input{width:auto}
.centre{min-height:100vh;display:grid;place-items:center;padding:16px}.boite{background:var(--c);border:1px solid var(--l);border-radius:16px;padding:24px;display:grid;gap:14px;width:min(100%,380px)}.boite.large{width:min(100%,640px);margin:16px auto}.boite h1,.boite h2{margin:0}
.haut{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 16px;background:var(--c);border-bottom:1px solid var(--l)}.esp{flex:1}.doux{color:var(--d)}.err{color:var(--r)}.ok{color:var(--v)}
.bandeau{margin:0;padding:10px 16px;background:#fff4d6;color:#4a3b00;font-size:14px}.bandeau.err{background:#ffe3e3;color:#7a0b0b}
.onglets{display:flex;gap:6px;padding:12px 16px 0}.onglets button.on{background:var(--a);border-color:var(--a);color:var(--o)}
.chiffres{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 16px}.chiffres div{background:var(--c);border:1px solid var(--l);border-radius:12px;padding:12px;color:var(--d)}.chiffres b{display:block;font-size:24px;color:var(--t)}
.filtres{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;padding:0 16px}@media(max-width:640px){.filtres{grid-template-columns:1fr}}
.liste{display:grid;gap:10px;padding:12px 16px 40px;max-width:900px}.carte{background:var(--c);border:1px solid var(--l);border-left:4px solid var(--l);border-radius:12px;padding:12px 14px;display:grid;gap:6px}.carte.s-nouvelle{border-left-color:var(--a)}.carte.s-confirmee{border-left-color:var(--v)}.carte.s-refusee{border-left-color:var(--r)}
.carte header{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.carte p{margin:0}.carte .pet{font-size:13px;color:var(--d)}.carte a{color:var(--a)}.msg{white-space:pre-wrap}.puce{font-size:12px;border:1px solid var(--l);border-radius:999px;padding:1px 9px;color:var(--d)}.act{display:flex;flex-wrap:wrap;gap:6px}`;
  function pageAdmin(fiche, brief) {
    const C = configPublique(fiche, brief), cfg = { nom: C.nom, fb: C.fb };
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com; base-uri 'none'; form-action 'none'">
<title>Espace professionnel · ${esc(C.nom)}</title><style>${CSS_ADMIN}</style></head><body><div id="app"></div>
<script type="application/json" id="cfg">${jsonSur(cfg)}</script>
<script>(${runtimeAdmin.toString()})();</script></body></html>
`;
  }
  // Règles Firestore à coller dans la console : le public peut seulement ENVOYER une demande (champs et tailles contrôlés) et lire l'annonce ; seul le compte du professionnel lit et gère.
  function reglesFirestore(fiche) {
    const mail = String(fiche.email || 'adresse-du-professionnel@exemple.fr').replace(/[^\w.+@-]/g, '');
    return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function proprietaire() { return request.auth != null && request.auth.token.email == '${mail}'; }
    function court(k, n) { return request.resource.data.get(k, '') is string && request.resource.data.get(k, '').size() <= n; }
    match /demandes/{id} {
      allow create: if request.resource.data.keys().hasOnly(['type','statut','envoye','nom','telephone','email','date','heure','couverts','prestation','delai','message'])
        && request.resource.data.type in ['reservation','devis','message'] && request.resource.data.statut == 'nouvelle'
        && court('nom', 120) && court('telephone', 40) && court('email', 120) && court('date', 12) && court('heure', 8) && court('couverts', 4) && court('prestation', 120) && court('delai', 80) && court('message', 1500) && court('envoye', 40);
      allow read, update, delete: if proprietaire();
    }
    match /site/config {
      allow read: if true;
      allow write: if proprietaire();
    }
  }
}
`;
  }
  function notesFirebase(fiche, brief) {
    const C = configPublique(fiche, brief);
    return `RÉSERVATIONS, DEVIS ET ESPACE PROFESSIONNEL : MISE EN SERVICE (${C.nom})

Sans base de données, le site envoie les demandes par e-mail (le visiteur valide l'envoi dans sa messagerie). Pour recevoir les demandes directement dans
l'espace professionnel (admin/index.html), il faut une base Firebase gratuite, au nom du professionnel :

1. Aller sur https://console.firebase.google.com, créer un projet (sans Google Analytics).
2. Ajouter une application Web (icône </>) : copier « apiKey » et « projectId ». Ces deux valeurs ne sont pas secrètes (elles sont dans le site) : elles se
   saisissent dans Studio Sites, onglet « Style et fonctions », puis on régénère le site.
3. Authentication → Méthode de connexion → activer « E-mail/Mot de passe ». Dans Paramètres → Actions de l'utilisateur, désactiver « Autoriser la création de comptes ».
   Ajouter un utilisateur : l'adresse e-mail du professionnel (${fiche.email || 'à renseigner dans la fiche'}) et un mot de passe solide.
4. Firestore Database → créer la base (mode production, région Europe) → onglet « Règles » → coller le contenu de REGLES-FIRESTORE.txt → Publier.
5. Authentication → Paramètres → Domaines autorisés : ajouter le domaine du site.
6. Ouvrir /admin/ sur le site publié : connexion avec l'e-mail et le mot de passe créés à l'étape 3.

Limites à connaître : le formulaire public peut recevoir des demandes indésirables (un champ piège et un délai entre deux envois limitent les robots, sans les éliminer) ;
la disponibilité réelle (créneaux déjà pris) n'est pas gérée : le professionnel confirme ou refuse chaque demande ; aucune demande n'est confirmée automatiquement.
Pour limiter l'usage de la clé, la restreindre aux domaines du site dans Google Cloud → API et services → Identifiants.
`;
  }
  function fichiers(fiche, brief) {
    const ids = (brief && brief.modules) || [], out = [];
    if (ids.includes('panel')) out.push({ chemin: 'admin/index.html', contenu: pageAdmin(fiche, brief) });
    if (ids.includes('panel') || ids.includes('reservation') || ids.includes('devis') || ids.includes('annonce')) { out.push({ chemin: 'REGLES-FIRESTORE.txt', contenu: reglesFirestore(fiche) }); out.push({ chemin: 'LISEZMOI-FIREBASE.txt', contenu: notesFirebase(fiche, brief) }); }
    return out;
  }

  const api = { CATALOGUE, IDS, AMBIANCES, POLICES, ARRONDIS, DENSITES, COULEURS, couleurDepuis, appliquerDA, appliquerModules, joursOuverts, creneaux, modeReservation, configPublique, pageAdmin, reglesFirestore, notesFirebase, fichiers, runtimeSite, runtimeAdmin, CSS_MODULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else racine.Modules = api;
})(typeof window !== 'undefined' ? window : globalThis);
