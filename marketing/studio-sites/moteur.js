/* Studio Sites : moteur de génération d'un site à partir d'un exemple QuenTools (page autonome) ou d'un modèle de design/templates/.
   Principe : le design de l'exemple est gardé tel quel ; chaque texte visible devient un « emplacement ». Les coordonnées viennent de la fiche
   du professionnel (substitution exacte, jamais écrite par l'IA) ; l'IA locale réécrit les autres textes pour ce métier, section par section ;
   le programme refuse tout texte qui ne respecte pas les règles (prix, lien, chiffre ou promesse inventés, mention de l'IA, reste de l'exemple).
   Sans IA, l'exemple est repris avec les coordonnées du professionnel. Ce fichier tourne dans la fenêtre de l'application (DOMParser). */
(function (racine) {
  'use strict';
  const SKIP = new Set(['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'TEXTAREA', 'TEMPLATE', 'HEAD', 'CODE', 'PRE', 'TITLE']);
  const INLINE = new Set(['SPAN', 'EM', 'STRONG', 'B', 'I', 'MARK', 'SMALL', 'A', 'SUP', 'SUB', 'U', 'TIME', 'S']);
  const VILLES = 'Lyon|Paris|Marseille|Toulouse|Nice|Nantes|Montpellier|Strasbourg|Bordeaux|Lille|Rennes|Reims|Toulon|Grenoble|Dijon|Angers|Nîmes|Villeurbanne|Annecy|Tours|Clermont-Ferrand|Metz|Rouen|Caen|Nancy|Perpignan|Avignon|Valence|Chambéry|Brest|Limoges|Poitiers|Amiens|Orléans|Besançon|Saint-Étienne|Le Mans|Aix-en-Provence';
  const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const maj = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const lettres = t => /\p{L}/u.test(t) || /\d[\d\s.,]*\s?€|€\s?\d|\[\d+\]\s?€/.test(t) || /(?:\+33\s?|0)[1-9](?:[\s.]?\d{2}){4}/.test(t); // un texte, un prix (« 89 € ») ou un numéro de téléphone à traiter

  /* ───────── Fiche du professionnel ───────── */
  const FICHE_VIDE = { nom: '', metier: '', ville: '', zone: '', telephone: '', email: '', adresse: '', codePostal: '', horaires: '', services: [], atouts: '', description: '', ton: 'chaleureux', couleur: '', domaine: '', siret: '', responsable: '', tarifs: '' };
  const nettoyerFiche = f => {
    const o = { ...FICHE_VIDE, ...(f || {}) };
    for (const k of Object.keys(FICHE_VIDE)) if (typeof FICHE_VIDE[k] === 'string') o[k] = String(o[k] || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    o.services = (Array.isArray(o.services) ? o.services : String(o.services || '').split(/[\n,;]+/)).map(s => String(s).replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8);
    return o;
  };
  const e164 = t => { const d = String(t || '').replace(/\D/g, ''); return d.startsWith('33') ? '+' + d : d.startsWith('0') ? '+33' + d.slice(1) : d ? '+' + d : ''; };
  const slugDe = s => sansAccents(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'site';

  // modèle le plus proche du métier (mots clés de modeles/index.json)
  // da : { ambiance, mode } facultatif. Le métier compte le plus ; l'ambiance et le mode (clair/sombre) départagent et servent seuls quand le métier est inconnu.
  function modeleConseille(metier, modeles, da) {
    const t = sansAccents(metier), d = da || {};
    if (!t.trim() && !d.ambiance && !d.mode) return null;
    let meilleur = null, note = 0;
    for (const m of modeles) {
      let n = String(m.mots || '').split(/\s+/).filter(x => x && t.includes(x)).length * 10;
      if (d.ambiance && String(m.style || '').split(/\s+/).includes(d.ambiance)) n += 4;
      if (d.mode && (m.mode === d.mode || m.mode === 'au choix')) n += 3; else if (d.mode && m.mode && m.mode !== 'au choix') n -= 6;
      if (n > note) { note = n; meilleur = m; }
    }
    return meilleur || modeles.find(m => m.id === 'modele-vitrine') || modeles[0] || null;
  }

  /* ───────── Préparation de la page ───────── */
  function parser(html) { return new DOMParser().parseFromString(html, 'text/html'); }
  const textePropre = el => (el.textContent || '').replace(/\s+/g, ' ').trim();

  // Supprime ce qui n'a rien à faire sur le site d'un vrai professionnel : bandeau « exemple », publicités, scripts de démonstration,
  // sections remplies par ces scripts, faux avis ; garde le design.
  function preparer(html, modele, interactives) {
    const type = modele && modele.type;
    html = String(html).replace(/\.\.\/\.\.\/assets\/fonts\/ex\//g, 'assets/fonts/').replace(/\.\.\/\.\.\/assets\//g, 'assets/');
    const doc = parser(html), notes = [];
    doc.__sections = [...doc.querySelectorAll('section')];
    const idsScripts = new Set();
    doc.querySelectorAll('script:not([src])').forEach(s => { for (const m of s.textContent.matchAll(/getElementById\(['"]([\w-]+)['"]\)|\$\(['"]#([\w-]+)['"]|querySelector\(['"]#([\w-]+)['"]/g)) idsScripts.add(m[1] || m[2] || m[3]); });
    // scripts : ceux du design (assets/qt.js) sont gardés pour les modèles, les autres retirés
    doc.querySelectorAll('script').forEach(s => { const src = s.getAttribute('src') || ''; if (type === 'modele' && /^assets\/qt\.js/.test(src)) return; s.remove(); });
    doc.querySelectorAll('.qt-ex, ins.adsbygoogle, [class*="adsbygoogle"], meta[name="robots"], link[href*="ex.css"], link[rel="icon"], link[href*="logo.svg"], meta[name="google-adsense-account"]').forEach(e => e.remove());
    doc.querySelectorAll('a[href*="devis/"], a[href^="../"]').forEach(a => { const li = a.closest('li'); (li || a).remove(); });
    // éléments remplis par un script retiré : ils seraient vides (ou « … »)
    const vides = [];
    for (const id of idsScripts) { const e = doc.getElementById(id); if (!e) continue; if (!e.children.length && (!textePropre(e) || /^[….\s]+$/.test(textePropre(e)))) vides.push(e); }
    for (const e of vides) {
      const sec = e.closest('section');
      e.remove();
      if (sec && textePropre(sec).length < 160) { sec.remove(); notes.push('Une section interactive de l’exemple a été retirée (elle dépendait d’un programme propre à l’exemple).'); }
    }
    // sections dont le texte est fabriqué par les scripts de l'exemple (calculettes, quiz, panier, planning…) : inutiles sans eux
    if (interactives && interactives.length) {
      const toutes = [...parser(html).querySelectorAll('section')], vraies = [...doc.querySelectorAll('section')];
      void toutes;
      for (const i of interactives) { const sec = (doc.__sections || [])[i]; if (sec && sec.isConnected && !sec.querySelector('h1') && sec.id !== 'contact' && !/hero/i.test(sec.id + ' ' + sec.className)) { sec.remove(); if (!notes.some(n => /interactive/.test(n))) notes.push('Des sections interactives propres à l’exemple (calculette, quiz, panier…) ont été retirées.'); } }
      void vraies;
      if (interactives.includes(0) || interactives.some(i => doc.__sections[i] && doc.__sections[i].isConnected && /hero/i.test(doc.__sections[i].id + ' ' + doc.__sections[i].className))) notes.push('L’en-tête de l’exemple contient un outil (calcul, réservation, choix…) qui ne fonctionne pas sans l’exemple : retire-le ou adapte-le.');
    }
    doc.querySelectorAll('.dispo, [id="dispo"]').forEach(e => e.remove());
    // faux avis : jamais sur le site d'un vrai professionnel
    doc.querySelectorAll('[class*="avis" i],[id*="avis" i],[class*="temoign" i],[id*="temoign" i],[class*="review" i],[class*="testimonial" i]').forEach(e => {
      if (!e.isConnected) return; const sec = e.closest('section');
      if (sec && (/avis|temoign|review|testimonial/i.test(sec.className + ' ' + sec.id))) sec.remove(); else e.remove();
      if (!notes.some(n => /avis/.test(n))) notes.push('Les avis de l’exemple ont été retirés : ajoute de vrais avis de clients quand tu en as.');
    });
    doc.querySelectorAll('section').forEach(s => { if (!textePropre(s)) s.remove(); });
    return { doc, notes };
  }

  // Exécute l'exemple dans une page cachée et repère les sections dont le texte change (fabriqué par ses scripts) : indices dans l'ordre des <section>
  async function sectionsInteractives(html) {
    if (typeof document === 'undefined') return [];
    const longueur = s => (s.textContent || '').replace(/\s+/g, ' ').trim().length;
    const stat = [...parser(html).querySelectorAll('section')].map(longueur);
    const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-scripts allow-same-origin'); f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1280px;height:800px;border:0';
    document.body.appendChild(f);
    try {
      await new Promise(ok => { f.onload = ok; f.srcdoc = String(html).replace(/<script[^>]+src=["']https?:[^>]*><\/script>/g, ''); setTimeout(ok, 4000); });
      await new Promise(r => setTimeout(r, 450));
      const run = [...f.contentDocument.querySelectorAll('section')].map(longueur);
      return stat.map((l, i) => (Math.abs((run[i] || 0) - l) > Math.max(25, l * 0.12) ? i : -1)).filter(i => i >= 0);
    } catch (e) { return []; } finally { f.remove(); }
  }

  /* ───────── Emplacements (textes visibles) ───────── */
  // un bloc (titre, paragraphe, bouton…) = un emplacement ; les mises en valeur (span, em, strong, a…) s'écrivent entre *astérisques*
  function collecter(doc) {
    const slots = [], sections = new Map();
    const sectionDe = el => { const s = el.closest('section, header, footer, nav, aside, main > div') || doc.body; if (!sections.has(s)) sections.set(s, sections.size); return sections.get(s); };
    const visite = el => {
      if (SKIP.has(el.tagName.toUpperCase())) return;
      const enfants = [...el.childNodes];
      const aTexte = enfants.some(n => n.nodeType === 3 && /\S/.test(n.nodeValue) && lettres(n.nodeValue));
      const enLigne = enfants.every(n => n.nodeType === 3 || n.nodeType === 8 || (n.nodeType === 1 && (n.tagName === 'BR' || (INLINE.has(n.tagName) && !n.children.length))));
      if (aTexte && enLigne) { slots.push({ type: 'bloc', el, section: sectionDe(el), tag: el.tagName.toLowerCase() }); return; }
      for (const n of enfants) {
        if (n.nodeType === 1) visite(n);
        else if (n.nodeType === 3 && /\S/.test(n.nodeValue) && lettres(n.nodeValue)) slots.push({ type: 'texte', node: n, section: sectionDe(el), tag: el.tagName.toLowerCase() });
      }
    };
    visite(doc.body);
    doc.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(e => { if (lettres(e.getAttribute('placeholder'))) slots.push({ type: 'attr', el: e, attr: 'placeholder', section: sectionDe(e), tag: 'placeholder' }); });
    slots.forEach((s, i) => { s.i = i; s.original = lire(s); });
    return slots;
  }
  function lire(s) {
    if (s.type === 'texte') return s.node.nodeValue.replace(/\s+/g, ' ').trim();
    if (s.type === 'attr') return s.el.getAttribute(s.attr);
    let t = '';
    for (const n of s.el.childNodes) { if (n.nodeType === 3) t += n.nodeValue; else if (n.nodeType === 1) t += n.tagName === 'BR' ? '\n' : (/\S/.test(n.textContent) ? `*${n.textContent.replace(/\*/g, '')}*` : ''); }
    return t.replace(/[ \t\r\n]+/g, m => (m.includes('\n') && /\n/.test(m) && s.el.querySelector('br') ? ' ' : ' ')).trim();
  }
  function ecrire(s, texte) {
    texte = String(texte);
    if (s.type === 'texte') { const m = /^(\s*).*?(\s*)$/s.exec(s.node.nodeValue); s.node.nodeValue = (m ? m[1] : '') + texte.replace(/\*/g, '') + (m ? m[2] : ''); return; }
    if (s.type === 'attr') { s.el.setAttribute(s.attr, texte.replace(/\*/g, '')); return; }
    // bloc : on reconstruit le texte en réutilisant les éléments en ligne d'origine (même balise, mêmes attributs) pour les passages en *astérisques*
    const modeles = [...s.el.children].filter(c => c.tagName !== 'BR').map(c => c.cloneNode(false)), brs = s.el.querySelector('br');
    const parts = texte.split('*'); if (parts.length % 2 === 0) { parts.splice(0, parts.length, parts.join('')); }
    while (s.el.firstChild) s.el.removeChild(s.el.firstChild);
    let k = 0;
    parts.forEach((p, idx) => {
      if (!p) return;
      if (idx % 2 === 0) s.el.appendChild(s.el.ownerDocument.createTextNode(p));
      else { const m = (modeles[k++] || modeles[modeles.length - 1] || s.el.ownerDocument.createElement('span')).cloneNode(false); m.textContent = p; s.el.appendChild(m); }
    });
    if (!s.el.firstChild) s.el.appendChild(s.el.ownerDocument.createTextNode(texte.replace(/\*/g, '')));
    void brs;
  }

  /* ───────── Coordonnées et restes de l'exemple : substitution exacte ───────── */
  function substituer(t, fiche, modele) {
    let s = String(t);
    if (modele && modele.marque) s = s.replace(new RegExp(esc(modele.marque).replace(/&/g, '(?:&|&amp;)'), 'gi'), fiche.nom || modele.marque);
    if (fiche.telephone) s = s.replace(/(?:\+33\s?|0)[1-9](?:[\s.]?\d{2}){4}/g, fiche.telephone);
    if (fiche.email) s = s.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, fiche.email);
    if (fiche.ville) s = s.replace(new RegExp(`\\b(?:${VILLES})\\b`, 'g'), fiche.ville);
    // modèles du design : champs entre crochets connus de la fiche
    if (s.includes('[')) {
      const c = x => maj(x), sv = fiche.services, adr = [fiche.adresse, [fiche.codePostal, fiche.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      const T = [['[Nom de l’entreprise]', fiche.nom], ['[Nom]', fiche.nom], ['[Votre métier]', c(fiche.metier)], ['[Métier]', c(fiche.metier)], ['[métier]', fiche.metier], ['[ville]', fiche.ville], ['[Ville]', fiche.ville],
        ['[service 1]', sv[0]], ['[service 2]', sv[1]], ['[service 3]', sv[2]], ['[Service 1]', c(sv[0])], ['[Service 2]', c(sv[1])], ['[Service 3]', c(sv[2])], ['[Adresse]', adr], ['[Horaires]', fiche.horaires],
        ['[e-mail]', fiche.email], ['[téléphone]', fiche.telephone], ['[Téléphone]', fiche.telephone], ['[promesse courte]', (fiche.atouts || '').split(/[,;.]/)[0].trim()]];
      for (const [de, par] of T) if (par) s = s.split(de).join(par);
      if (fiche.telephone) s = s.replace(/\[((?:\+33\s?|0)[1-9](?:[\s.]?\d{2}){4})\]/g, fiche.telephone);
    }
    if (!/€|euro/i.test(fiche.tarifs || '')) s = s.replace(/\[\d+\]\s?€/g, 'sur devis');
    // prix de l'exemple : jamais repris (sauf si le professionnel a donné ses tarifs, que l'IA peut alors citer)
    if (!/€|euro/i.test(fiche.tarifs || '')) s = s.replace(/(?:à partir d[e’']\s?|dès\s)?\d[\d\s.,]*\s?(?:€|euros?)(?:\s?(?:\/|par|la|le|l’)\s?\w+)?(?:\s?(?:TTC|HT))?/gi, 'sur devis').replace(/(sur devis)(?:[\s,·]*sur devis)+/gi, '$1');
    s = s.replace(/\b\d+(?:\s?bis)?\s+(?:rue|place|chemin|avenue|route|boulevard|impasse|allée|quai)\s[^,\n]*?\bExemple\b/gi, fiche.adresse || 'Adresse à compléter').replace(/\b(?:rue|place|chemin|avenue|route|boulevard)\s+Exemple\b/gi, fiche.adresse || 'adresse à compléter');
    s = s.replace(/SIRET\s*0{3}\s?0{3}\s?0{3}\s?0{5}/gi, fiche.siret ? 'SIRET ' + fiche.siret : 'SIRET à compléter').replace(/^Exemple\s*:\s*/i, '');
    // morceaux « prix d'exemple », « tarifs fictifs »… (séparés par · ; ou ,)
    if (/\b(?:exemple|fictif|fictive|fictifs|fictives|démonstration)\b/i.test(s)) { const m = s.split(/(\s[·•|]\s|;\s)/); const g = m.filter((x, i) => i % 2 === 1 || !/\b(?:exemple|exemples|fictif|fictive|fictifs|fictives|démonstration)\b/i.test(x)); s = g.join('').replace(/^(\s[·•|]\s|;\s)+|(\s[·•|]\s|;\s)+$/g, ''); }
    s = s.replace(/\s*\((?:[^)]*\b(?:exemple|fictif|fictive|démonstration|à confirmer)\b[^)]*)\)/gi, '').replace(/\s*[–—-]\s*exemple (?:fictif|de site)[^.]*\.?/gi, '').replace(/\s{2,}/g, ' ').trim();
    return s;
  }

  /* ───────── Contrôles des textes écrits par l'IA ───────── */
  // mots qu'aucun site de professionnel ne doit contenir sans que l'original ou la fiche les contienne (erreurs typiques d'un petit modèle)
  const ABSURDE = /\b(rats?|souris|cafards?|punaises?|vomi\w*|poisons?|toxiques?|cadavres?|vermine|moisi\w*)\b/i;
  const nombresFiche = fiche => new Set((JSON.stringify(fiche).match(/\d+/g) || []));
  function controleTexte(texte, slot, fiche, modele) {
    const t = String(texte || '').trim(), p = [];
    if (!t) return ['texte vide'];
    const ref = slot.base || slot.original, ph = /^\[[^\]]*\]\.?$/.test(ref.trim()), tag = slot.tag || '';
    const max = ph ? ({ h1: 80, h2: 80, h3: 56, h4: 56, p: 190, li: 110, button: 40, a: 40 }[tag] || 100) : Math.max(30, Math.round(ref.length * 1.5) + 12);
    if (/[\[\]]/.test(t)) p.push('crochets restés');
    if (/[{}]|"\s*:\s*"|\\n/.test(t)) p.push('code recopié');
    if (ABSURDE.test(t) && !ABSURDE.test(ref) && !ABSURDE.test(JSON.stringify(fiche))) p.push('mot absurde');
    for (const c of [fiche.telephone, fiche.email]) if (c && ref.includes(c) && !t.includes(c)) p.push('coordonnées modifiées');
    if (t.length > max) p.push('trop long');
    if (t.length < Math.min(3, ref.length)) p.push('trop court');
    if (/€|\beuros?\b/i.test(t) && !/€|euro/i.test(fiche.tarifs || '')) p.push('un prix est écrit');
    if (/https?:\/\/|www\./i.test(t)) p.push('un lien est écrit');
    if (/\bIA\b|intelligence artificielle|chatgpt/i.test(t)) p.push('l’IA est mentionnée');
    const nb = nombresFiche(fiche), orig = new Set((ref.match(/\d+/g) || []));
    for (const m of t.matchAll(/\d+/g)) if (!nb.has(m[0]) && !orig.has(m[0]) && !(+m[0] <= 12 && !/^\s*(h|heures?|min|minutes?|jours?|ans?|%)/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 8)))) { p.push(`le chiffre ${m[0]} est inventé`); break; }
    if (modele && modele.marque && new RegExp(esc(modele.marque), 'i').test(t) && modele.marque !== fiche.nom) p.push('reste de l’exemple');
    if (/\bexemple (fictif|de site)|fictif\b/i.test(t)) p.push('mention d’exemple');
    return p;
  }
  // mots qui engagent le professionnel : acceptés mais signalés à relire
  const A_RELIRE = /\b(gratuit|gratuite|garanti|garantie|assuré|assurance|décennale|certifié|agréé|label|qualifié|expert|n°\s?1|meilleur|leader|24 ?h|sous \d+ ?h|urgence|disponible|toute l’année|depuis \d+)/i;

  /* ───────── Appels à l'IA : une section à la fois ───────── */
  const SYSTEME = 'Tu rédiges les textes du site internet d’un professionnel indépendant (artisan, commerçant, indépendant), en français. Ton clair, concret et chaleureux, phrases courtes, pas de jargon. ' +
    'Tu adaptes les textes d’un site d’exemple à CE professionnel, avec UNIQUEMENT les informations de sa fiche : aucun prix, aucun chiffre, aucune durée, aucune garantie, aucun avis de client, aucune certification, aucun nom de personne ni de lieu qui ne soit pas dans la fiche. Si une information manque, formule de façon générale. Tu ne parles jamais d’IA.';
  const resume = f => [`Entreprise : ${f.nom}`, `Métier : ${f.metier}`, f.ville && `Ville : ${f.ville}`, f.zone && `Zone d’intervention : ${f.zone}`, f.services.length && `Services : ${f.services.join(' ; ')}`, f.atouts && `Points forts : ${f.atouts}`, f.description && `Présentation : ${f.description}`,
    f.horaires && `Horaires : ${f.horaires}`, f.tarifs && `Tarifs donnés : ${f.tarifs}`, `Ton : ${f.ton || 'chaleureux'}`].filter(Boolean).join('\n');
  function lots(slots, nbMax = 12, carMax = 1700) {
    const out = []; let cur = [], car = 0, sec = null;
    for (const s of slots) {
      if (cur.length && (cur.length >= nbMax || car + s.base.length > carMax || (sec !== null && s.section !== sec && cur.length >= 6))) { out.push(cur); cur = []; car = 0; }
      cur.push(s); car += s.base.length; sec = s.section;
    }
    if (cur.length) out.push(cur);
    return out;
  }
  // Texte rendu par l'IA → texte simple : retire une enveloppe JSON ({"texte": "…"}), une numérotation ou des guillemets recopiés de la consigne
  function deballer(t) {
    let x = String(t == null ? '' : t).trim();
    for (let k = 0; k < 3 && /^[\[{]/.test(x); k++) {
      try { const v = JSON.parse(x); const f = v && typeof v === 'object' ? Object.values(Array.isArray(v) ? v : v).find(y => typeof y === 'string') : null; if (typeof f === 'string') { x = f.trim(); continue; } } catch (e) { /* pas du JSON valide */ }
      const m = /^[\[{]\s*"?[\w-]+"?\s*:\s*"([\s\S]*?)"?\s*[\]}]\s*$/.exec(x); if (m) { x = m[1].trim(); continue; }
      break;
    }
    return x.replace(/^\s*\d{1,2}[.)]\s+/, '').replace(/^[«"“]\s*|\s*[»"”]$/g, '').replace(/\s+/g, ' ').trim();
  }
  const ROLES = { h1: 'titre principal', h2: 'titre de section', h3: 'sous-titre', h4: 'sous-titre', p: 'paragraphe', li: 'élément de liste', button: 'bouton', a: 'lien', small: 'petite mention', span: 'mot court', b: 'mot en gras', strong: 'mot en gras', label: 'étiquette de champ', placeholder: 'texte d’aide d’un champ', summary: 'question', figcaption: 'légende', blockquote: 'citation', td: 'case de tableau', th: 'titre de colonne' };
  const rolede = s => ROLES[s.tag] || 'texte';
  async function reecrireLot(lot, fiche, modele, ecrireIA, systeme = SYSTEME) {
    const liste = lot.map((s, i) => `${i + 1}. (${rolede(s)}, ${s.base.length} caractères) ${s.base}`).join('\n');
    const demande = `Fiche du professionnel :\n${resume(fiche)}\n\nVoici des textes d’un site d’exemple (${modele.nom || 'exemple'}), dans l’ordre de la page. Réécris-les pour ce professionnel :\n${liste}\n\n` +
      'Règles : même nombre de textes, même ordre, même rôle (titre, bouton, paragraphe…), longueur proche de l’original (jamais plus de 1,4 fois). Les passages entre *astérisques* sont mis en valeur : garde-en un au même endroit. ' +
      'Un texte entre [crochets] est un emplacement à remplir : écris un vrai texte adapté, sans crochets. Un texte qui est un nom de service reprend les services de la fiche dans l’ordre. Un numéro de téléphone, une adresse, une adresse e-mail restent tels quels. Les boutons restent des verbes d’action courts. ' +
      'N’écris aucun prix, chiffre, délai, garantie ni avis qui ne soit pas dans la fiche : si l’original en contient, remplace par une formule générale (« sur devis », « selon votre besoin »). ' +
      'Dans chaque « texte », écris uniquement la phrase finale : ni numéro, ni guillemets, ni accolades, ni nom de balise. Reste vraisemblable : décris des choses réelles pour ce métier, sans mot absurde.';
    const schema = { type: 'object', properties: { textes: { type: 'array', minItems: lot.length, maxItems: lot.length, items: { type: 'object', properties: { n: { type: 'integer' }, texte: { type: 'string', maxLength: 420 } }, required: ['n', 'texte'] } } }, required: ['textes'] };
    const r = await ecrireIA({ systeme, demande, schema, maxTokens: Math.min(1900, 160 + lot.reduce((a, s) => a + Math.ceil(s.base.length * 0.9), 0) + lot.length * 14), temperature: 0.45 });
    const L = Array.isArray(r && r.textes) ? r.textes : [];
    const out = new Array(lot.length).fill(null);
    L.forEach((x, k) => { const v = x && typeof x === 'object' ? x.texte : x; const n = x && typeof x === 'object' && Number.isInteger(x.n) && x.n >= 1 && x.n <= lot.length ? x.n - 1 : k; if (out[n] == null) out[n] = deballer(v); });
    return L.length === lot.length ? out.map(x => x == null ? '' : x) : [];
  }
  // Un seul texte refusé par les contrôles : nouvelle tentative ciblée avec la raison du refus
  async function reecrireUn(slot, fiche, modele, ecrireIA, raison, systeme = SYSTEME) {
    const demande = `Fiche du professionnel :\n${resume(fiche)}\n\nTexte d’un site d’exemple (${rolede(slot)}, ${slot.base.length} caractères) : ${slot.base}\n\nRéécris-le pour ce professionnel, en une seule phrase simple et vraisemblable, de longueur proche (jamais plus de 1,4 fois). ` +
      `Ta version précédente a été refusée : ${raison}. Ni prix, ni chiffre, ni garantie, ni lien inventés ; ni numéro, ni guillemets, ni accolades. Si tu n’as pas assez d’informations, reste général.`;
    const r = await ecrireIA({ systeme, demande, schema: { type: 'object', properties: { texte: { type: 'string', maxLength: 420 } }, required: ['texte'] }, maxTokens: Math.min(400, 60 + slot.base.length), temperature: 0.3 });
    return deballer(r && r.texte);
  }

  /* ───────── Assemblage final ───────── */
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hexe = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
  function jetonsCouleur(couleur) {
    const A = rgb(couleur), BL = [255, 255, 255], NO = [13, 12, 18];
    return `:root{--accent:${couleur};--accent-soft:${hexe(mix(A, BL, 0.88))};--lime:#b45309}\n  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--accent:${hexe(mix(A, BL, 0.45))};--accent-soft:${hexe(mix(A, NO, 0.85))};--lime:#fbbf24}}\n  :root[data-theme="dark"]{--accent:${hexe(mix(A, BL, 0.45))};--accent-soft:${hexe(mix(A, NO, 0.85))};--lime:#fbbf24}`;
  }
  const RUNTIME = `(function(){var q=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
q('.reveal,.rv,.rev,[data-reveal]').forEach(function(e){e.classList.add('in','is-in','visible','on','shown')});
q('[data-year]').forEach(function(n){n.textContent=new Date().getFullYear()});
q('form[data-mailto]:not([data-qs])').forEach(function(f){f.addEventListener('submit',function(ev){ev.preventDefault();var t=[],l=f.querySelectorAll('input,select,textarea');for(var i=0;i<l.length;i++){var x=l[i];if(x.type==='submit'||!x.value)continue;var b=x.id&&f.querySelector('label[for="'+x.id+'"]');t.push(((b&&b.textContent)||x.name||x.placeholder||'').trim()+' : '+x.value)}location.href='mailto:'+f.getAttribute('data-mailto')+'?subject='+encodeURIComponent(document.title)+'&body='+encodeURIComponent(t.join('\\n'))})})})();`;

  function finaliser(doc, fiche, modele, description, brief) {
    const notes = [];
    const head = doc.head, d = doc.documentElement; d.setAttribute('lang', 'fr');
    const titre = [fiche.nom, [maj(fiche.metier), fiche.ville].filter(Boolean).join(' à ')].filter(Boolean).join(' · ');
    let t = head.querySelector('title'); if (!t) { t = doc.createElement('title'); head.appendChild(t); } t.textContent = titre.slice(0, 70);
    let m = head.querySelector('meta[name="description"]'); if (!m) { m = doc.createElement('meta'); m.setAttribute('name', 'description'); head.appendChild(m); }
    m.setAttribute('content', String(description || `${maj(fiche.metier)}${fiche.ville ? ' à ' + fiche.ville : ''}${fiche.services.length ? ' : ' + fiche.services.slice(0, 3).join(', ') : ''}.`).slice(0, 160));
    const fav = doc.createElement('link'); fav.setAttribute('rel', 'icon'); fav.setAttribute('type', 'image/svg+xml');
    const lettre = (fiche.nom || 'S').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 1).toUpperCase() || 'S';
    fav.setAttribute('href', 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${fiche.couleur || '#1f3a68'}"/><text x="32" y="44" font-family="Arial,sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="#fff">${lettre}</text></svg>`));
    head.appendChild(fav);
    if (fiche.domaine) { const c = doc.createElement('link'); c.setAttribute('rel', 'canonical'); c.setAttribute('href', 'https://' + fiche.domaine.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/'); head.appendChild(c); }
    // partage sur les réseaux (Facebook, WhatsApp, Google) : titre, description, adresse et première photo
    {
      const racineSite = fiche.domaine ? 'https://' + fiche.domaine.replace(/^https?:\/\//, '').replace(/\/.*$/, '') + '/' : '';
      const og = (k, v) => { if (!v) return; const m = doc.createElement('meta'); m.setAttribute('property', k); m.setAttribute('content', v); head.appendChild(m); };
      og('og:type', 'website'); og('og:locale', 'fr_FR'); og('og:site_name', fiche.nom); og('og:title', titre.slice(0, 70)); og('og:description', (head.querySelector('meta[name="description"]') || {}).content || ''); og('og:url', racineSite);
      const photo = ((brief && brief.photos) || []).find(p => /^photo-\d{1,2}\.jpg$/.test(p.f || '')); if (photo && racineSite) og('og:image', racineSite + 'assets/img/' + photo.f);
    }
    const sec = doc.createElement('style'); sec.textContent = 'img,svg{max-width:100%}table{max-width:100%}td,th{overflow-wrap:anywhere}header .wrap,.top .wrap,.nav .wrap{flex-wrap:wrap;row-gap:8px}.logo,.brand{min-width:0;overflow-wrap:anywhere}'; head.appendChild(sec);
    // couleur de marque (modèles du design seulement : chaque exemple a sa propre palette)
    const couleurMarque = (racine.Modules ? racine.Modules.couleurDepuis((brief && brief.da && brief.da.couleur) || '') : '') || (/^#[0-9a-f]{6}$/i.test(fiche.couleur) ? fiche.couleur : '');
    if (modele && modele.type === 'modele' && couleurMarque) { const st = doc.createElement('style'); st.textContent = jetonsCouleur(couleurMarque); head.appendChild(st); }
    // liens téléphone et e-mail, formulaire vers l'e-mail du professionnel
    doc.querySelectorAll('a[href^="tel:"]').forEach(a => { if (fiche.telephone) a.setAttribute('href', 'tel:' + e164(fiche.telephone)); else a.remove(); });
    doc.querySelectorAll('a[href^="mailto:"]').forEach(a => { if (fiche.email) a.setAttribute('href', 'mailto:' + fiche.email); else a.removeAttribute('href'); });
    doc.querySelectorAll('form').forEach(f => { if (fiche.email) f.setAttribute('data-mailto', fiche.email); f.removeAttribute('action'); });
    // liens vers la page de mentions légales
    doc.querySelectorAll('a[href="legal.html"],a[href="./legal.html"],a[href*="mentions"]').forEach(a => a.setAttribute('href', 'mentions-legales.html'));
    // données structurées de l'entreprise locale : seulement ce que la fiche contient
    const ld = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: fiche.nom };
    if (fiche.metier) ld.description = `${maj(fiche.metier)}${fiche.ville ? ' à ' + fiche.ville : ''}`;
    if (fiche.telephone) ld.telephone = e164(fiche.telephone); if (fiche.email) ld.email = fiche.email;
    if (fiche.adresse || fiche.ville) ld.address = { '@type': 'PostalAddress', ...(fiche.adresse && { streetAddress: fiche.adresse }), ...(fiche.codePostal && { postalCode: fiche.codePostal }), ...(fiche.ville && { addressLocality: fiche.ville }), addressCountry: 'FR' };
    if (fiche.domaine) ld.url = 'https://' + fiche.domaine.replace(/^https?:\/\//, '');
    const s = doc.createElement('script'); s.setAttribute('type', 'application/ld+json'); s.textContent = JSON.stringify(ld); head.appendChild(s);
    const r = doc.createElement('script'); r.textContent = RUNTIME; doc.body.appendChild(r);
    // direction artistique et fonctions choisies (modules.js)
    if (racine.Modules && brief) { notes.push(...racine.Modules.appliquerDA(doc, brief.da, modele)); notes.push(...racine.Modules.appliquerModules(doc, fiche, brief, modele)); }
    nettoyerFinal(doc, fiche, notes, brief);
    return notes;
  }
  const versHtml = doc => '<!doctype html>\n' + doc.documentElement.outerHTML.replace(/<script>\(function\(\)\{var q=/, m => m);

  /* ───────── Nettoyage final : ce qui ne doit jamais rester dans un site livré ───────── */
  // Retire les blocs de chiffres, de questions et d'avis dont les valeurs sont restées entre crochets (jamais de faux chiffre ni de faux avis),
  // répare les liens morts et ajoute ce que tout site professionnel doit avoir (mentions légales, lien d'appel, protections des liens externes).
  function nettoyerFinal(doc, fiche, notes, brief) {
    const aCrochets = el => /\[[^\]\n]{1,80}\]/.test((el.textContent || '').replace(/\[\d{1,3}\]\s?€/g, ''));
    let retires = 0;
    const retirer = el => { if (el && el.parentNode) { el.remove(); retires++; } };
    doc.querySelectorAll('.stat,[class*="stat-"],[class*="kpi"],[class*="chiffre"],details').forEach(el => { if (el.isConnected && aCrochets(el)) retirer(el); });
    doc.querySelectorAll('section,div').forEach(sec => { if (!sec.isConnected) return; const t = ((sec.querySelector('.eyebrow,h2,h3') || {}).textContent || '') + ' ' + (sec.id || ''); if (/avis|t[ée]moignage|ils m.ont fait confiance|ce que disent/i.test(t) && /^(section|div)$/i.test(sec.tagName) && sec.querySelector('h2,h3') && aCrochets(sec)) retirer(sec); });
    // éléments dont tout le texte est resté entre crochets (« [★ 4,9 sur Google · 120 avis] · [Assurance décennale] ») : promesses non remplies, retirées
    doc.querySelectorAll('span,p,li,small,b,strong,div').forEach(el => {
      if (!el.isConnected || el.querySelector('p,div,ul,section,h1,h2,h3,h4,form,a,button')) return;
      const t = (el.textContent || '').trim(); if (t.length > 160 || !t) return;
      if (/^(?:\[[^\]]{1,80}\]\s*[·|•–—,/-]?\s*)+$/.test(t) && /★|avis|google|assurance|garantie|certifi|d[ée]cennale|devis|ouvert|disponib|délai|sous \d|label|agréé|qualif/i.test(t)) retirer(el);
    });
    if (retires) notes.push(`${retires} bloc(s) non rempli(s) retiré(s) (chiffres, questions ou avis à valeurs entre crochets) : rien d’inventé n’est affiché.`);
    // liens vers une partie de la page qui n'existe pas (section retirée) : lien de menu supprimé, bouton renvoyé vers le formulaire ou le contact
    const cible = doc.getElementById('qs-reservation') ? '#qs-reservation' : doc.getElementById('qs-devis') ? '#qs-devis' : doc.getElementById('contact') ? '#contact' : '';
    doc.querySelectorAll('a[href^="#"]').forEach(a => {
      const h = a.getAttribute('href'); if (h.length < 2 || doc.getElementById(h.slice(1)) || doc.getElementsByName(h.slice(1)).length) return;
      if (a.closest('nav,header,ul,ol,footer')) { const li = a.parentElement && a.parentElement.tagName === 'LI' && a.parentElement.children.length === 1 ? a.parentElement : a; li.remove(); }
      else a.setAttribute('href', cible || (fiche.telephone && e164(fiche.telephone) ? 'tel:' + e164(fiche.telephone) : fiche.email ? 'mailto:' + fiche.email : '#'));
    });
    // mentions légales
    if (!doc.querySelector('a[href*="mentions"]')) {
      const pied = doc.querySelector('footer'), a = doc.createElement('a'); a.setAttribute('href', 'mentions-legales.html'); a.textContent = 'Mentions légales';
      if (pied) { const cont = pied.querySelector('.wrap,.container,div') || pied; cont.appendChild(doc.createTextNode(' · ')); cont.appendChild(a); } else { const p = doc.createElement('p'); p.style.cssText = 'text-align:center;padding:16px;font-size:14px'; p.appendChild(a); doc.body.insertBefore(p, doc.body.querySelector('script') || null); }
    }
    // numéro de téléphone du professionnel : touchable pour appeler (les occurrences en texte simple, hors liens)
    if (fiche.telephone && e164(fiche.telephone)) {
      const chiffres = fiche.telephone.replace(/\D/g, ''), motif = new RegExp(fiche.telephone.split(/\s+/).map(esc).join('[\\s.]*').replace(/\\\./g, '.'));
      let n = 0; const marcheur = doc.createTreeWalker(doc.body, 4), noeuds = []; while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
      for (const t of noeuds) {
        if (n >= 3 || !t.parentElement || t.parentElement.closest('a,script,style,button,textarea,select,.qs-chat')) continue;
        const m = motif.exec(t.nodeValue); if (!m || m[0].replace(/\D/g, '') !== chiffres) continue;
        const a = doc.createElement('a'); a.setAttribute('href', 'tel:' + e164(fiche.telephone)); a.style.color = 'inherit'; a.textContent = m[0];
        const apres = t.splitText(m.index); apres.nodeValue = apres.nodeValue.slice(m[0].length); t.parentNode.insertBefore(a, apres); n++;
      }
    }
    // aucun lien d'appel dans le design : barre « Appeler » fixée en bas des téléphones
    if (fiche.telephone && e164(fiche.telephone) && !doc.querySelector('a[href^="tel:"]')) {
      const a = doc.createElement('a'); a.className = 'qs-appel'; a.setAttribute('href', 'tel:' + e164(fiche.telephone)); a.textContent = '📞 Appeler ' + fiche.telephone; doc.body.appendChild(a);
      const st = doc.createElement('style'); st.textContent = '.qs-appel{display:none}@media(max-width:700px){.qs-appel{display:flex;position:fixed;left:12px;right:12px;bottom:12px;z-index:55;justify-content:center;padding:14px;border-radius:999px;background:var(--qs-ac,#1f3a68);color:var(--qs-on,#fff);font:700 16px/1 system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 22px rgba(0,0,0,.3)}.qs-appel~.qs-bulle,.qs-appel~.qs-wa{bottom:76px}.qs-appel~.qs-chat{bottom:140px}body{padding-bottom:70px}}'; doc.head.appendChild(st);
    }
    // contrastes corrigés par le contrôle qualité (brief.contrastes : { t: balise, x: début du texte, c: couleur })
    for (const k of (brief && brief.contrastes) || []) {
      if (!k || !/^#[0-9a-f]{6}$/i.test(k.c || '') || !k.x) continue;
      for (const el of doc.querySelectorAll(String(k.t || '*').toLowerCase())) if ((el.textContent || '').trim().startsWith(k.x)) { el.style.setProperty('color', k.c, 'important'); break; }
    }
    doc.querySelectorAll('img:not([alt])').forEach(i => i.setAttribute('alt', ''));
    doc.querySelectorAll('a[target="_blank"]').forEach(a => { if (!/noopener/.test(a.getAttribute('rel') || '')) a.setAttribute('rel', ((a.getAttribute('rel') || '') + ' noopener noreferrer').trim()); });
  }

  /* ───────── Génération complète ───────── */
  // o : { html, modele, fiche, ecrire (null sans IA), surEtape(texte, avancement 0-1) }
  async function generer(o) {
    const fiche = nettoyerFiche(o.fiche), modele = o.modele || {}, etape = o.surEtape || (() => {});
    const interactives = o.interactives || await sectionsInteractives(o.html);
    const { doc, notes } = preparer(o.html, modele, interactives), slots = collecter(doc);
    if (!fiche.nom) throw new Error('Il manque le nom de l’entreprise.');
    for (const s of slots) { s.base = substituer(s.original, fiche, modele); s.final = s.base; s.etat = 'exemple'; }
    let description = '';
    const sys = SYSTEME + (o.memoire ? '\n' + String(o.memoire).slice(0, 900) : '');
    if (o.ecrire) {
      const parties = lots(slots.filter(s => s.type !== 'attr' || s.base.length > 3));
      let faits = 0;
      for (const lot of parties) {
        etape(`Réécriture : partie ${faits + 1} sur ${parties.length}`, faits / (parties.length + 1)); faits++;
        let textes = [], raison = '';
        for (let essai = 0; essai < 2; essai++) {
          try { textes = await reecrireLot(lot, fiche, modele, o.ecrire, sys); } catch (e) { textes = []; raison = e.message; }
          if (textes.length === lot.length) break;
        }
        if (textes.length !== lot.length) { lot.forEach(s => { s.etat = 'exemple'; s.raison = 'L’IA n’a pas répondu correctement : texte de l’exemple repris'; }); continue; }
        for (let i = 0; i < lot.length; i++) {
          const s = lot[i]; let refus = controleTexte(textes[i], s, fiche, modele), t = textes[i];
          for (let essai = 0; refus.length && essai < 2 && s.base.length > 3; essai++) { // nouvelle tentative ciblée, avec la raison du refus
            try { t = await reecrireUn(s, fiche, modele, o.ecrire, refus.join(', '), sys); refus = controleTexte(t, s, fiche, modele); } catch (e) { break; }
          }
          if (refus.length) { s.etat = 'exemple'; s.raison = 'Texte de l’IA refusé (' + refus.join(', ') + ') : texte de l’exemple repris'; }
          else { s.final = t; s.etat = 'ia'; if (A_RELIRE.test(t)) s.relire = true; }
        }
        void raison;
      }
      try {
        etape('Description pour Google', parties.length / (parties.length + 1));
        const r = await o.ecrire({ systeme: sys, demande: `Fiche :\n${resume(fiche)}\n\nÉcris la description du site pour les moteurs de recherche : une ou deux phrases, 150 caractères maximum, qui disent qui est ce professionnel, où et pour quoi. Aucun prix, chiffre, délai ni garantie.`, schema: { type: 'object', properties: { description: { type: 'string', maxLength: 170 } }, required: ['description'] }, maxTokens: 120, temperature: 0.3 });
        if (r && r.description && !controleTexte(r.description, { original: '' , base: 'x'.repeat(120) }, fiche, modele).length) description = String(r.description).trim();
      } catch (e) { /* description simple */ }
    }
    for (const s of slots) ecrire(s, s.final);
    notes.push(...finaliser(doc, fiche, modele, description, o.brief));
    return { interactives, html: versHtml(doc), slots: slots.map(s => ({ i: s.i, tag: s.tag, section: s.section, original: s.original, texte: s.final, etat: s.etat, raison: s.raison || '', relire: !!s.relire })), notes, description, aRevoir: slots.filter(s => s.etat === 'exemple' && !!o.ecrire).length };
  }
  // Reconstruit la page avec des textes modifiés à la main (même ordre d'emplacements) : aucun appel à l'IA
  function reassembler(html, modele, fiche, textes, description, interactives, brief) {
    fiche = nettoyerFiche(fiche);
    const { doc } = preparer(html, modele, interactives), slots = collecter(doc);
    slots.forEach(s => { const t = textes[s.i]; ecrire(s, t == null ? substituer(s.original, fiche, modele) : t); });
    finaliser(doc, fiche, modele, description, brief);
    return versHtml(doc);
  }

  /* ───────── Mentions légales et notes de livraison ───────── */
  function mentionsLegales(html, fiche) {
    fiche = nettoyerFiche(fiche);
    const adresse = [fiche.adresse, [fiche.codePostal, fiche.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    let h = String(html).replace(/\.\.\/\.\.\/assets\//g, 'assets/');
    const rep = [['[Nom et prénom ou raison sociale]', fiche.responsable || fiche.nom], ['[Nom]', fiche.nom], ['[nom]', fiche.nom], ['[e-mail]', fiche.email], ['[téléphone]', fiche.telephone], ['[Adresse professionnelle]', adresse], ['[000 000 000 00000]', fiche.siret]];
    for (const [de, par] of rep) if (par) h = h.split(de).join(par);
    return h.replace(/<a[^>]*href="\.\.\/\.\.\/"[^>]*>.*?<\/a>/g, '');
  }
  function restesACompleter(html) { return [...new Set((String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').match(/\[[^\]\n<]{2,120}\]/g) || []).filter(x => !/^\[\d/.test(x)))]; }
  function notesLivraison(fiche, resultat, legal, brief) {
    const l = [`LIVRAISON DU SITE : ${fiche.nom}`, '', 'Contenu du dossier : index.html (le site), mentions-legales.html, assets/ (polices et styles). Ouvrir index.html pour voir le site.', ''];
    const exemple = (resultat.slots || []).filter(s => s.etat === 'exemple' && s.raison);
    if (exemple.length) { l.push('TEXTES À RELIRE OU À RÉÉCRIRE (repris de l’exemple) :'); exemple.slice(0, 40).forEach(s => l.push(`- « ${s.texte} » : ${s.raison}`)); l.push(''); }
    const relire = (resultat.slots || []).filter(s => s.relire);
    if (relire.length) { l.push('TEXTES QUI ENGAGENT LE PROFESSIONNEL (à valider avec lui : gratuit, garantie, délai, assurance…) :'); relire.slice(0, 40).forEach(s => l.push(`- « ${s.texte} »`)); l.push(''); }
    const rest = restesACompleter(resultat.html);
    if (rest.length) { l.push('CHAMPS ENTRE CROCHETS À COMPLÉTER DANS index.html :'); rest.forEach(x => l.push('- ' + x)); l.push(''); }
    const restL = restesACompleter(legal || '');
    if (restL.length) { l.push('MENTIONS LÉGALES À COMPLÉTER (statut, SIRET, hébergeur, médiateur…) :'); restL.forEach(x => l.push('- ' + x)); l.push(''); }
    (resultat.notes || []).forEach(n => l.push('- ' + n));
    if (racine.Modules && brief && brief.modules && brief.modules.length) {
      l.push('', 'FONCTIONS AJOUTÉES AU SITE :'); brief.modules.forEach(id => { const m = racine.Modules.CATALOGUE.find(x => x.id === id); if (m) l.push('- ' + m.nom + ' : ' + m.desc); });
      if (racine.Modules.fichiers(fiche, brief).length) l.push('Mise en service des demandes et du panel : lire LISEZMOI-FIREBASE.txt (règles dans REGLES-FIRESTORE.txt).');
      if (brief.modules.includes('chatbot')) l.push('L’assistant de questions répond avec les informations de la fiche (horaires, adresse, services…) : relire ses réponses en posant quelques questions sur le site.');
    }
    l.push('', 'À FAIRE AVANT LA MISE EN LIGNE : ajouter les vraies photos et de vrais avis de clients, vérifier les coordonnées, tester sur téléphone, compléter les mentions légales.');
    l.push('Publication : déposer ce dossier sur l’hébergement choisi (GitHub Pages, par exemple) ; le formulaire ouvre le logiciel de messagerie du visiteur vers ' + (fiche.email || 'l’adresse e-mail à renseigner') + '.');
    return l.join('\n') + '\n';
  }

  const api = { sectionsInteractives, FICHE_VIDE, nettoyerFiche, modeleConseille, preparer, collecter, substituer, controleTexte, deballer, generer, reassembler, mentionsLegales, notesLivraison, restesACompleter, slugDe, e164, lots };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else racine.Moteur = api;
})(typeof window !== 'undefined' ? window : globalThis);
