/* Studio Sites : contrôle qualité d'un site généré (accessibilité, référencement, restes de l'exemple, lisibilité, téléphone).
   Fonction asynchrone qui s'exécute dans la fenêtre de l'application : le site est affiché dans une page cachée pour mesurer les contrastes et le défilement
   horizontal, puis analysé. Retourne { problemes: [{ niveau: 'bloquant' | 'conseil', code, message, exemple }], note }. */
(function (racine) {
  'use strict';
  var mauvais; // contrastes insuffisants relevés par le dernier passage à 390 px
  const hexe = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const plusClair = (a, b) => (a > b ? [a, b] : [b, a]);
  function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
  const contraste = (a, b) => { const [h, l] = plusClair(lum(a), lum(b)); return (h + 0.05) / (l + 0.05); };
  const rgba = s => { const m = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?/.exec(s || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };

  // page cachée : le site est rendu pour de bon (polices et styles comme à l'affichage)
  function ouvrir(html, largeur) {
    return new Promise(ok => {
      const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-same-origin allow-scripts'); f.style.cssText = `position:fixed;left:-99999px;top:0;width:${largeur}px;height:900px;border:0`;
      f.onload = () => setTimeout(() => ok(f), 500); f.srcdoc = html; document.body.appendChild(f);
    });
  }
  // fond réel d'un élément : premier ancêtre au fond opaque (les dégradés et images ne sont pas évalués)
  function fondDe(el, win) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = win.getComputedStyle(e), c = rgba(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // image ou dégradé : on ne juge pas
      if (c && c[3] > 0.95) return c;
    }
    return [255, 255, 255, 1];
  }
  const visible = (el, win) => { const cs = win.getComputedStyle(el), r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.1 && r.width > 2 && r.height > 2; };

  // couleur de texte lisible sur ce fond : la couleur d'origine assombrie (ou éclaircie) peu à peu, sinon noir ou blanc
  function corrigerCouleur(fg, bg, seuil) {
    fg = fg.slice(0, 3); const noir = [17, 17, 17], blanc = [255, 255, 255], vers = lum(fg) < lum(bg) ? noir : blanc;
    for (let t = 0.1; t <= 1; t += 0.1) { const c = fg.map((v, i) => v + (vers[i] - v) * t); if (contraste(c, bg) >= seuil) return hexe(c); }
    return contraste(noir, bg) >= contraste(blanc, bg) ? hexe(noir) : hexe(blanc);
  }
  async function analyser(html, opts = {}) {
    const p = [], ajoute = (niveau, code, message, exemple) => { if (!p.some(x => x.code === code)) p.push({ niveau, code, message, exemple: exemple ? String(exemple).slice(0, 80) : '' }); };
    const doc = new DOMParser().parseFromString(html, 'text/html'), fiche = opts.fiche || {};
    // référencement et structure
    const titre = (doc.title || '').trim(); if (!titre) ajoute('bloquant', 'titre', 'La page n’a pas de titre (onglet du navigateur et Google).'); else if (titre.length > 70) ajoute('conseil', 'titre-long', 'Le titre dépasse 70 caractères : Google le coupera.', titre);
    const desc = (doc.querySelector('meta[name="description"]') || {}).content || ''; if (desc.length < 50) ajoute('conseil', 'description', 'La description pour Google est absente ou trop courte (50 à 160 caractères).', desc); else if (desc.length > 170) ajoute('conseil', 'description-longue', 'La description pour Google dépasse 170 caractères.', desc);
    if (!doc.documentElement.getAttribute('lang')) ajoute('conseil', 'lang', 'La langue de la page n’est pas indiquée.');
    if (!doc.querySelector('meta[name="viewport"]')) ajoute('bloquant', 'viewport', 'La page ne s’adapte pas au téléphone (balise « viewport » absente).');
    const h1 = doc.querySelectorAll('h1'); if (h1.length !== 1) ajoute('conseil', 'h1', h1.length ? 'Il y a plusieurs titres principaux (h1) : un seul est recommandé.' : 'Aucun titre principal (h1) sur la page.');
    // textes restés à compléter
    const sansScripts = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ''), crochets = [...new Set((sansScripts.replace(/<[^>]+>/g, ' ').match(/\[[^\]\n]{2,60}\]/g) || []).filter(x => !/^\[\d/.test(x)))];
    if (crochets.length) ajoute('bloquant', 'crochets', `Des champs entre crochets sont restés à compléter (${crochets.length}).`, crochets[0]);
    if (/\b(?:lorem ipsum|exemple fictif|à compléter)\b/i.test(sansScripts.replace(/<[^>]+>/g, ' '))) ajoute('bloquant', 'texte-provisoire', 'Un texte provisoire (« lorem ipsum », « à compléter », « exemple fictif ») est resté sur la page.');
    // contact
    if (fiche.telephone && !doc.querySelector('a[href^="tel:"]')) ajoute('conseil', 'tel', 'Aucun lien « appeler » : sur téléphone, le numéro doit se toucher pour appeler.');
    if (!fiche.telephone && !fiche.email) ajoute('bloquant', 'contact', 'Ni téléphone ni e-mail : les visiteurs ne pourront pas contacter le professionnel.');
    // accessibilité
    const sansAlt = [...doc.querySelectorAll('img')].filter(i => !i.hasAttribute('alt') && i.getAttribute('role') !== 'presentation' && i.getAttribute('aria-hidden') !== 'true'); if (sansAlt.length) ajoute('bloquant', 'alt', `${sansAlt.length} image(s) sans texte alternatif (lecteurs d’écran et Google).`, sansAlt[0].getAttribute('src'));
    const champs = [...doc.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea')].filter(c => !c.closest('.qs-piege')), sansEtiquette = champs.filter(c => !(c.getAttribute('aria-label') || c.getAttribute('aria-labelledby') || (c.id && doc.querySelector(`label[for="${CSS.escape(c.id)}"]`)) || c.closest('label')));
    if (sansEtiquette.length) ajoute('conseil', 'etiquettes', `${sansEtiquette.length} champ(s) de formulaire sans étiquette.`, sansEtiquette[0].name || sansEtiquette[0].placeholder);
    const vides = [...doc.querySelectorAll('a')].filter(a => !(a.textContent || '').trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])') && !a.querySelector('svg[aria-label],svg title')); if (vides.length) ajoute('conseil', 'liens-vides', `${vides.length} lien(s) sans texte (non lisibles par un lecteur d’écran).`, vides[0].getAttribute('href'));
    const dangereux = [...doc.querySelectorAll('a[target="_blank"]')].filter(a => !/noopener|noreferrer/.test(a.getAttribute('rel') || '')); if (dangereux.length) ajoute('conseil', 'noopener', `${dangereux.length} lien(s) ouvrant un nouvel onglet sans protection (rel="noopener").`);
    const ancres = [...doc.querySelectorAll('a[href^="#"]')].filter(a => a.getAttribute('href').length > 1 && !doc.getElementById(a.getAttribute('href').slice(1))); if (ancres.length) ajoute('conseil', 'ancres', `${ancres.length} lien(s) vers une partie de la page qui n’existe pas.`, ancres[0].getAttribute('href'));
    const ids = {}; for (const e of doc.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1; const doublons = Object.keys(ids).filter(k => ids[k] > 1); if (doublons.length) ajoute('conseil', 'ids', `Identifiants en double : ${doublons.slice(0, 3).join(', ')}.`);
    if (!doc.querySelector('a[href*="mentions"]')) ajoute('conseil', 'mentions', 'Aucun lien vers les mentions légales (obligatoires pour un site professionnel).');
    // rendu réel : défilement horizontal et contrastes
    if (typeof document !== 'undefined' && document.body) {
      for (const larg of [390, 1280]) {
        const f = await ouvrir(opts.rendu || html, larg);
        try {
          const w = f.contentWindow, d = f.contentDocument, sw = d.documentElement.scrollWidth;
          if (sw > larg + 1) ajoute('bloquant', 'defilement-' + larg, `La page déborde sur le côté à ${larg} px de large : un défilement horizontal apparaît.`);
          if (larg === 390) {
            var mauvais = [];
            for (const el of d.querySelectorAll('h1,h2,h3,h4,p,li,a,button,label,small,span,td,th,summary')) {
              if ([...el.childNodes].every(n => n.nodeType !== 3 || !n.nodeValue.trim())) continue; // pas de texte propre
              if ((el.textContent || '').trim().length < 4) continue; // numéros et puces décoratifs
              if (!visible(el, w) || el.closest('.qs-piege,[hidden]')) continue;
              const cs = w.getComputedStyle(el), fg = rgba(cs.color), bg = fondDe(el, w); if (!fg || !bg) continue;
              const taille = parseFloat(cs.fontSize) || 16, gras = (+cs.fontWeight || 400) >= 700, grand = taille >= 24 || (taille >= 18.66 && gras), seuil = grand ? 3 : 4.5;
              const fgOpaque = fg[3] < 1 ? [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])) : fg, r = contraste(fgOpaque, bg);
              if (r < seuil - 0.01) mauvais.push({ r, t: (el.textContent || '').trim().slice(0, 40), seuil, tag: el.tagName, c: corrigerCouleur(fgOpaque, bg, seuil + 0.2), dbg: `${el.tagName}.${el.className} fg=${cs.color} bg=${bg.join(',')}` });
            }
            if (mauvais.length) { const pire = mauvais.sort((a, b) => a.r - b.r)[0]; ajoute(pire.r < 2 ? 'bloquant' : 'conseil', 'contraste', `${mauvais.length} texte(s) peu lisibles (contraste insuffisant, le pire : ${pire.r.toFixed(1)} pour ${pire.seuil} attendu).`, pire.t + (opts.debug ? ' ' + pire.dbg : '')); }
          }
        } finally { f.remove(); }
      }
    }
    const contrastes = typeof mauvais !== 'undefined' ? mauvais.slice(0, 60).map(m => ({ t: m.tag, x: m.t, c: m.c })) : [];
    const bloquants = p.filter(x => x.niveau === 'bloquant').length;
    return { contrastes, problemes: p.sort((a, b) => (a.niveau === 'bloquant' ? 0 : 1) - (b.niveau === 'bloquant' ? 0 : 1)), note: Math.max(0, 100 - bloquants * 15 - (p.length - bloquants) * 4) };
  }
  const api = { analyser, contraste };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else racine.Qualite = api;
})(typeof window !== 'undefined' ? window : globalThis);
