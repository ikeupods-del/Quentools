/* Studio Sites : assistant de conversation. On explique en français ce que l'on veut (le professionnel, l'ambiance, les fonctions) ; l'assistant remplit la fiche
   et le « cahier des charges » (direction artistique + fonctions). Principes :
   - l'IA locale propose, le programme valide : une information de la fiche n'est acceptée que si elle figure dans ce que la personne a écrit (jamais d'invention) ;
     couleurs, polices, fonctions : uniquement les valeurs du catalogue ;
   - sans IA (ou si elle échoue), une analyse du texte par mots-clés fait le même travail pour les demandes courantes. */
(function (racine) {
  'use strict';
  const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const M = () => racine.Modules || (typeof require !== 'undefined' ? require('./modules.js') : null);
  const BRIEF_VIDE = () => ({ da: { ambiance: '', mode: '', couleur: '', police: '', arrondi: '', densite: '' }, modules: [], options: { reservation: '', firebaseApiKey: '', firebaseProjectId: '', whatsapp: '' }, faq: [], annonce: '' });
  const normaliserBrief = b => { const v = BRIEF_VIDE(), o = b || {}; return { da: { ...v.da, ...(o.da || {}) }, modules: [...new Set((o.modules || []).filter(x => M().IDS.includes(x)))], options: { ...v.options, ...(o.options || {}) }, faq: (o.faq || []).filter(x => x && x.q && x.a).slice(0, 12), annonce: String(o.annonce || '') }; };
  const CHAMPS_FICHE = ['nom', 'metier', 'ville', 'zone', 'telephone', 'email', 'adresse', 'codePostal', 'horaires', 'atouts', 'tarifs', 'ton'];

  /* ───────── Analyse sans IA : mots-clés ───────── */
  const FONCTIONS_MOTS = {
    reservation: /r[ée]serv|rendez-?vous|\brdv\b|prise de rdv|book|table en ligne|prendre (une )?table/,
    devis: /\bdevis\b|estimation|demande de prix/,
    chatbot: /chat ?bot|assistant|bulle de discussion|robot de discussion|r[ée]pond(re|e)? (aux )?questions|tchat|chat\b/,
    panel: /\bpanel\b|panneau|espace (pro|propri[ée]taire|admin|gestion)|\badmin|tableau de bord|g[ée]rer (les )?(r[ée]serv|demandes|rendez)|back ?office|dashboard/,
    whatsapp: /whats ?app/,
    annonce: /annonce|banni[èe]re|bandeau|promo|cong[ée]s? affich/,
    faq: /\bfaq\b|questions? fr[ée]quentes|questions et r[ée]ponses/
  };
  const STYLE_MOTS = {
    ambiance: [['luxe', /luxe|[ée]l[ée]gan|chic|raffin|haut de gamme|premium|gastronomi/], ['chaleureux', /chaleur|convivial|cosy|accueillant|familial|authentique/], ['moderne', /moderne|[ée]pur|minimal|contemporain|tech|startup/], ['nature', /nature|zen|doux|bio|v[ée]g[ée]tal|apaisant|naturel/], ['ludique', /ludique|color[ée]|fun|joyeux|enfant|rigolo|pop/], ['energique', /[ée]nergi|sport|dynamique|puissant|punchy|intense/], ['pro', /professionnel|s[ée]rieux|technique|industriel|corporate|fiable/], ['sobre', /sobre|simple|rassurant|classique|discret|neutre/]],
    mode: [['sombre', /sombre|dark|noir (et|avec)|fond noir|(th[èe]me|mode|ambiance) (noir|nuit)/], ['clair', /\bclair\b|lumineux|blanc|fond blanc|a[ée]r[ée]/]],
    police: [['elegante', /serif|[ée]l[ée]gante?|classique chic/], ['raffinee', /fin(e|s)\b|raffin[ée]e? (police|typo)|cormorant/], ['affichage', /gros titres?|affichage|dm serif/], ['moderne', /g[ée]om[ée]trique|police moderne|space grotesk/], ['neutre', /police (neutre|lisible)|inter\b/], ['arrondie', /arrondie|conviviale/], ['sport', /condens[ée]e|oswald|police (sport|[ée]nergi)/], ['manuscrite', /manuscrit|script|\bmain\b|caveat/]],
    arrondi: [['carre', /angles? droits?|carr[ée]s?|coins? droits?|sans arrondi|anguleux/], ['rond', /tr[èe]s arrondi|bien arrondi|boutons? (ronds|pilule)|pilule|arrondis? (marqu|fort)/], ['doux', /coins? (doux|arrondis)|arrondi(s|e)?\b/]],
    densite: [['aere', /a[ée]r[ée]|beaucoup d'espace|espac[ée]|respire/], ['compact', /compact|dense|serr[ée]/]]
  };
  function analyseSimple(texte) {
    const t = String(texte || ''), n = sansAccents(t).replace(/['’]/g, "'"), brief = BRIEF_VIDE(), fiche = {};
    for (const [id, re] of Object.entries(FONCTIONS_MOTS)) {
      const re2 = new RegExp(re.source.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'i');
      if (re2.test(n) && !new RegExp("(sans|pas de|pas besoin d'?|enleve|retire|supprime)\\s+(le |la |les |un |une |l')?(" + re2.source + ')', 'i').test(n)) brief.modules.push(id);
    }
    for (const [cle, liste] of Object.entries(STYLE_MOTS)) for (const [val, re] of liste) { if (new RegExp(re.source.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'i').test(n)) { brief.da[cle] = val; break; } }
    // couleur : première couleur vive citée (« noir et or » → or) ; les neutres (noir, gris, blanc) ne servent que s'il n'y en a pas d'autre
    const mots = [...n.matchAll(/(?:^|[^a-z])((?:bleu|vert|bordeaux|rouge|rose|fuchsia|orange|jaune|dore|beige|marron|brun|kaki|turquoise|violet|mauve)(?: (?:nuit|marine|ciel|fonce|sapin))?)(?![a-z])|(?:\b(?:et|en|de|d'|noir|couleur|ton|teinte|accent|avec) )(or)(?![a-z])|(#[0-9a-f]{6})\b/g)].map(m => m[1] || m[2] || m[3]);
    const neutres = [...n.matchAll(/(?:^|[^a-z])(noir|gris|blanc)(?![a-z])/g)].map(m => m[1]);
    const c = M().couleurDepuis(mots[0] || (!brief.da.mode && neutres[0]) || '');
    if (c) brief.da.couleur = c;
    const tel = (t.match(/(?:\+33\s?|0)[1-9](?:[\s.]?\d{2}){4}/) || [])[0]; if (tel) fiche.telephone = tel;
    const mail = (t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0]; if (mail) fiche.email = mail;
    const ville = (t.match(/(?:^|[\s,(])(?:à|sur|vers|près de)\s+([A-ZÉÈ][\p{L}'’-]+(?:[ -][A-ZÉÈ][\p{L}'’-]+)?)/u) || [])[1]; if (ville && !/^(Studio|Sites|QuenTools)$/i.test(ville)) fiche.ville = ville;
    const nom = (t.match(/(?:s'appelle|nomm[ée]e?|nom (?:est|:)|enseigne|appel[ée]e?)\s*[:«"“]?\s*([^,.;\n"»”]{2,50})/i) || [])[1]; if (nom) fiche.nom = nom.trim();
    if (!fiche.nom) { const m = t.match(/\bsite (?:internet )?(?:pour|de)\s+(?:le |la |les |l['’])?([A-ZÉÈ][\p{L}0-9'’&-]*(?: [A-ZÉÈ][\p{L}0-9'’&-]*){0,4})(?=[,.;:]| un | une | à | qui | avec |$)/u); if (m) fiche.nom = m[1].trim(); }
    if (!fiche.metier) { const m = t.match(/(?:,|\bsite (?:internet )?(?:pour|de))\s*(?:[A-ZÉÈ][\p{L}0-9'’&-]*(?: [A-ZÉÈ][\p{L}0-9'’&-]*){0,4}\s*,\s*)?(?:un|une|le|la)\s+([\p{L}'’-]{4,24}(?: [\p{L}'’-]{3,16})?)(?=\s+(?:à|a|sur|qui|avec|de|du)\s|[,.;])/u); if (m && !/^(site|chatbot|assistant|panel|devis|bandeau)/i.test(m[1])) fiche.metier = m[1].trim().toLowerCase(); }
    return { fiche, brief };
  }

  /* ───────── Appel à l'IA locale ───────── */
  const E = (liste) => ({ type: 'string', enum: ['', ...liste] });
  const S = n => ({ type: 'string', maxLength: n });
  function schema() {
    const m = M();
    return { type: 'object', properties: {
      reponse: S(620),
      fiche: { type: 'object', properties: { nom: S(80), metier: S(80), ville: S(60), zone: S(100), telephone: S(30), email: S(100), adresse: S(120), codePostal: S(10), horaires: S(140), services: { type: 'array', items: S(70), maxItems: 8 }, atouts: S(240), tarifs: S(240) },
        required: ['nom', 'metier', 'ville', 'zone', 'telephone', 'email', 'adresse', 'codePostal', 'horaires', 'services', 'atouts', 'tarifs'] },
      style: { type: 'object', properties: { ambiance: E(Object.keys(m.AMBIANCES)), mode: E(['clair', 'sombre']), couleur: S(30), police: E(Object.keys(m.POLICES)), arrondi: E(Object.keys(m.ARRONDIS)), densite: E(Object.keys(m.DENSITES)) }, required: ['ambiance', 'mode', 'couleur', 'police', 'arrondi', 'densite'] },
      ajouter: { type: 'array', items: { type: 'string', enum: m.IDS }, maxItems: 7 },
      retirer: { type: 'array', items: { type: 'string', enum: m.IDS }, maxItems: 7 },
      faq: { type: 'array', items: { type: 'object', properties: { q: S(120), a: S(300) }, required: ['q', 'a'] }, maxItems: 5 },
      annonce: S(160),
      questions: { type: 'array', items: S(150), maxItems: 3 }
    }, required: ['reponse', 'fiche', 'style', 'ajouter', 'retirer', 'faq', 'annonce', 'questions'] };
  }
  const SYSTEME = 'Tu es l’assistant de Studio Sites, un outil qui crée le site internet d’un professionnel (artisan, commerçant, indépendant). Tu discutes en français avec la personne qui crée le site pour comprendre ce qu’elle veut : le professionnel, la direction artistique (ambiance, couleurs, police, arrondi) et les fonctions du site. ' +
    'Tu remplis UNIQUEMENT ce que la personne a dit : tout champ non mentionné reste vide (« » ou liste vide). Tu n’inventes jamais un téléphone, une adresse, un prix, un horaire, un nom ni un avis. ' +
    'Fonctions possibles : reservation (réservation de table ou prise de rendez-vous en ligne), devis (formulaire de demande de devis), chatbot (assistant du site qui répond aux questions fréquentes à partir de la fiche, sans IA), panel (espace professionnel protégé par mot de passe pour voir et gérer les demandes, nécessite une base Firebase gratuite), whatsapp (bouton WhatsApp), annonce (bandeau d’annonce modifiable), faq (questions fréquentes). ' +
    'Ce qui n’existe pas (boutique en ligne avec paiement, application mobile, espace client complexe, vidéo, base de clients) : dis-le honnêtement dans ta réponse et propose l’alternative la plus proche. ' +
    'Pour la direction artistique, traduis les envies (« luxueux, noir et or » → ambiance luxe, mode sombre, couleur or) avec les valeurs autorisées. ' +
    'Ta réponse (« reponse ») fait 2 à 4 phrases simples : dis ce que tu as compris et ce que tu as réglé, sans jargon. Ne parle pas d’IA. Dans « questions », pose 1 à 3 questions courtes sur ce qui manque vraiment (téléphone, horaires, couleur préférée…), jamais une question dont la réponse est déjà donnée.';
  const resumeFiche = f => CHAMPS_FICHE.filter(c => f && f[c]).map(c => `${c} : ${f[c]}`).concat(f && f.services && f.services.length ? ['services : ' + f.services.join(' ; ')] : []).join('\n') || '(vide)';
  const resumeBrief = b => [`ambiance : ${b.da.ambiance || '-'}`, `mode : ${b.da.mode || '-'}`, `couleur : ${b.da.couleur || '-'}`, `police : ${b.da.police || '-'}`, `arrondi : ${b.da.arrondi || '-'}`, `fonctions : ${b.modules.join(', ') || 'aucune'}`].join(' | ');

  // Validation : ce que l'IA a renvoyé n'est retenu que s'il est justifié par ce que la personne a écrit
  function valider(sortie, conversation) {
    const m = M(), conv = sansAccents(conversation), convNum = String(conversation).replace(/\D/g, ''), out = { fiche: {}, da: {}, ajouter: [], retirer: [], faq: [], annonce: '' }, f = (sortie && sortie.fiche) || {};
    const present = v => { const x = sansAccents(v).replace(/\s+/g, ' ').trim(); return x.length > 1 && conv.replace(/\s+/g, ' ').includes(x); };
    const nombresOk = v => (String(v).match(/\d+/g) || []).every(n => conv.includes(n)); // aucun chiffre qui ne soit pas dans le message (prix, horaires, numéros)
    for (const c of ['nom', 'ville', 'zone', 'adresse', 'horaires', 'atouts', 'tarifs']) { const v = String(f[c] || '').trim(); if (v && nombresOk(v) && (present(v) || sansAccents(v).split(/[^a-z0-9]+/).filter(w => w.length > 3).every(w => conv.includes(w)) && v.split(/\s+/).length <= 14)) out.fiche[c] = v; }
    if (f.metier && String(f.metier).trim()) out.fiche.metier = String(f.metier).trim().toLowerCase();
    if (f.telephone) { const d = String(f.telephone).replace(/\D/g, ''); if (d.length >= 9 && convNum.includes(d.slice(-9))) out.fiche.telephone = String(f.telephone).trim(); }
    if (f.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email) && conv.includes(sansAccents(f.email))) out.fiche.email = String(f.email).trim();
    if (f.codePostal && /^\d{5}$/.test(f.codePostal) && convNum.includes(f.codePostal)) out.fiche.codePostal = f.codePostal;
    if (Array.isArray(f.services)) { const s = f.services.map(x => String(x).trim()).filter(x => x && sansAccents(x).split(/[^a-z0-9]+/).filter(w => w.length > 3).some(w => conv.includes(w))); if (s.length) out.fiche.services = s.slice(0, 8); }
    const st = (sortie && sortie.style) || {};
    if (st.ambiance && m.AMBIANCES[st.ambiance]) out.da.ambiance = st.ambiance;
    if (st.mode === 'clair' || st.mode === 'sombre') out.da.mode = st.mode;
    if (st.police && m.POLICES[st.police]) out.da.police = st.police;
    if (st.arrondi && m.ARRONDIS[st.arrondi]) out.da.arrondi = st.arrondi;
    if (st.densite && m.DENSITES[st.densite]) out.da.densite = st.densite;
    const c = m.couleurDepuis(st.couleur); if (c) out.da.couleur = c;
    out.ajouter = (sortie.ajouter || []).filter(x => m.IDS.includes(x)); out.retirer = (sortie.retirer || []).filter(x => m.IDS.includes(x));
    out.faq = (sortie.faq || []).filter(x => x && x.q && x.a && present(String(x.a).slice(0, 18)) ).map(x => ({ q: String(x.q).trim(), a: String(x.a).trim() })).slice(0, 5);
    if (sortie.annonce && present(String(sortie.annonce).slice(0, 18))) out.annonce = String(sortie.annonce).trim();
    return out;
  }

  // Fusion d'un résultat validé (ou d'une analyse simple) dans le cahier des charges ; retourne ce qui a changé (pour le dire à la personne)
  function fusionner(brief, fiche, delta) {
    const b = normaliserBrief(brief), changes = [], f = { ...fiche };
    for (const [k, v] of Object.entries(delta.fiche || {})) { if (k === 'services') { const s = [...new Set([...(f.services || []), ...v])]; if (JSON.stringify(s) !== JSON.stringify(f.services || [])) { f.services = s.slice(0, 8); changes.push('services'); } } else if (v && f[k] !== v) { f[k] = v; changes.push(k); } }
    for (const [k, v] of Object.entries(delta.da || {})) if (v && b.da[k] !== v) { b.da[k] = v; changes.push('da.' + k); }
    for (const id of delta.ajouter || []) if (!b.modules.includes(id)) { b.modules.push(id); changes.push('+' + id); }
    for (const id of delta.retirer || []) if (b.modules.includes(id)) { b.modules = b.modules.filter(x => x !== id); changes.push('-' + id); }
    for (const x of delta.faq || []) if (!b.faq.some(y => sansAccents(y.q) === sansAccents(x.q))) { b.faq.push(x); changes.push('faq'); }
    if (delta.annonce && delta.annonce !== b.annonce) { b.annonce = delta.annonce; if (!b.modules.includes('annonce')) b.modules.push('annonce'); changes.push('annonce'); }
    if (b.modules.includes('panel') && !b.modules.includes('reservation') && !b.modules.includes('devis') && !(delta.retirer || []).includes('reservation')) { b.modules.push('reservation'); changes.push('+reservation'); }
    return { brief: b, fiche: f, changes };
  }

  // Questions utiles toujours posées par le programme (jamais inventées par l'IA)
  function manques(fiche, brief) {
    const q = [], b = normaliserBrief(brief), f = fiche || {};
    if (!f.nom) q.push('Comment s’appelle l’entreprise ?'); if (!f.metier) q.push('Quel est son métier ?');
    if (b.modules.some(x => ['reservation', 'devis', 'chatbot', 'whatsapp'].includes(x)) && !f.telephone && !f.email) q.push('Quel est son numéro de téléphone ou son e-mail ? (les demandes et les réponses en ont besoin)');
    if (b.modules.includes('reservation') && !f.horaires) q.push('Quels sont ses horaires ? (ils servent à proposer les créneaux de réservation)');
    if (b.modules.includes('panel') && !(b.options.firebaseApiKey && b.options.firebaseProjectId)) q.push('Pour le panel : crée une base Firebase gratuite et colle les deux clés dans « Style et fonctions » (LISEZMOI-FIREBASE.txt explique tout). Sans elles, le panel reste une démonstration.');
    if (b.modules.includes('whatsapp') && !f.telephone) q.push('Quel numéro pour le bouton WhatsApp ?');
    return q;
  }
  const NOMS_CHANGES = { nom: 'le nom', metier: 'le métier', ville: 'la ville', zone: 'la zone', telephone: 'le téléphone', email: 'l’e-mail', adresse: 'l’adresse', codePostal: 'le code postal', horaires: 'les horaires', atouts: 'les points forts', tarifs: 'les tarifs', services: 'les services', faq: 'les questions fréquentes', annonce: 'l’annonce', 'da.ambiance': 'l’ambiance', 'da.mode': 'le mode clair/sombre', 'da.couleur': 'la couleur', 'da.police': 'la police', 'da.arrondi': 'l’arrondi', 'da.densite': 'la densité' };
  const nomModule = id => (M().CATALOGUE.find(m => m.id === id) || { nom: id }).nom.toLowerCase();
  // « C'est noté : le métier, l'ambiance ; ajouté : réservation en ligne ; retiré : … »
  function decrire(changes) {
    const notes = changes.filter(c => c[0] !== '+' && c[0] !== '-').map(c => NOMS_CHANGES[c] || c), plus = changes.filter(c => c[0] === '+').map(c => nomModule(c.slice(1))), moins = changes.filter(c => c[0] === '-').map(c => nomModule(c.slice(1)));
    return [notes.length && 'noté : ' + notes.join(', '), plus.length && 'ajouté : ' + plus.join(', '), moins.length && 'retiré : ' + moins.join(', ')].filter(Boolean);
  }

  /* ───────── Un tour de conversation ───────── */
  // o : { message, historique: [{role:'moi'|'assistant', texte}], fiche, brief, ecrire (null sans IA) } → { reponse, fiche, brief, changes, questions, source, necessiteRegeneration }
  async function tour(o) {
    const message = String(o.message || '').trim().slice(0, 1500), brief = normaliserBrief(o.brief), fiche = { ...(o.fiche || {}) };
    const conversation = (o.historique || []).filter(h => h.role === 'moi').map(h => h.texte).concat(message).join('\n');
    let delta = null, reponse = '', source = 'mots', questionsIA = [];
    if (o.ecrire) {
      try {
        const hist = (o.historique || []).slice(-6).map(h => `${h.role === 'moi' ? 'Personne' : 'Assistant'} : ${h.texte}`).join('\n');
        const demande = `Fiche actuelle :\n${resumeFiche(fiche)}\n\nCahier des charges actuel : ${resumeBrief(brief)}\n\n${hist ? 'Conversation récente :\n' + hist + '\n\n' : ''}Nouveau message de la personne :\n« ${message} »\n\n` +
          'Mets à jour uniquement ce que ce message change ou précise. Dans « ajouter » mets les fonctions demandées, dans « retirer » celles dont elle ne veut plus.';
        const r = await o.ecrire({ systeme: SYSTEME, demande, schema: schema(), maxTokens: 900, temperature: 0.35 });
        if (r && typeof r === 'object') { delta = valider(r, conversation); reponse = String(r.reponse || '').replace(/\s+/g, ' ').trim(); questionsIA = (r.questions || []).map(x => String(x).trim()).filter(Boolean); source = 'ia'; }
      } catch (e) { delta = null; }
    }
    // l'analyse par mots-clés complète toujours l'IA (téléphone, e-mail, fonctions évidentes) et la remplace si elle a échoué
    const simple = analyseSimple(message);
    const dSimple = { fiche: simple.fiche, da: Object.fromEntries(Object.entries(simple.brief.da).filter(([, v]) => v)), ajouter: simple.brief.modules, retirer: [], faq: [], annonce: '' };
    if (!delta) delta = dSimple;
    else { delta.fiche = { ...dSimple.fiche, ...delta.fiche }; delta.da = { ...dSimple.da, ...delta.da }; delta.ajouter = [...new Set([...delta.ajouter, ...dSimple.ajouter.filter(x => !delta.retirer.includes(x))])]; }
    // « sans chatbot » : l'analyse simple ne sait que retirer ce qui est déjà choisi
    const n = sansAccents(message);
    for (const [id, re] of Object.entries(FONCTIONS_MOTS)) { const re2 = new RegExp("(sans|enleve|retire|supprime|plus de|pas de|pas besoin d'?)\\s+(le |la |les |un |une |l')?(" + re.source.normalize('NFD').replace(/[̀-ͯ]/g, '') + ')', 'i'); if (re2.test(n) && !delta.retirer.includes(id)) { delta.retirer.push(id); delta.ajouter = delta.ajouter.filter(x => x !== id); } }
    const f = fusionner(brief, fiche, delta), manque = manques(f.fiche, f.brief);
    const vus = decrire(f.changes);
    if (!reponse) reponse = vus.length ? `C’est réglé — ${vus.join(' ; ')}.` : 'Je n’ai rien de nouveau à régler avec ce message. Dis-moi par exemple l’ambiance voulue, une couleur ou les fonctions souhaitées (réservation, devis, assistant, panel…).';
    const questions = [...new Set([...manque, ...questionsIA.filter(x => !manque.some(m => sansAccents(m).slice(0, 18) === sansAccents(x).slice(0, 18)))])].slice(0, 3);
    return { reponse, fiche: f.fiche, brief: f.brief, changes: f.changes, questions, source, necessiteRegeneration: f.changes.some(c => ['da.ambiance', 'da.mode', 'metier'].includes(c)) };
  }

  const api = { BRIEF_VIDE, normaliserBrief, analyseSimple, schema, valider, fusionner, manques, decrire, tour, SYSTEME };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else racine.Conseiller = api;
})(typeof window !== 'undefined' ? window : globalThis);
