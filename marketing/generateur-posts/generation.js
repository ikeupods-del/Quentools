/* Studio Posts : génération d'une publication complète par l'IA locale (« Générer » : thème choisi, publication prête à exporter).
   Ce fichier ne contient que la logique : l'IA est appelée par deps.ecrire({ systeme, demande, schema, maxTokens, temperature }) → objet JSON.
   Principes (règles du propriétaire, contrôlées par le programme et non par l'IA) :
   - Le Parvis : les versets viennent UNIQUEMENT de la bibliothèque (Louis Segond 1910, recopiés mot pour mot) ; l'IA choisit un numéro et écrit la méditation.
   - QuenTools : ni prix, ni lien, ni IA présentée comme moyen de création, ni chiffre inventé, ni faux avis (voir design/POSITIONNEMENT.md).
   - Sans IA ou en cas d'échec : une publication déjà écrite de la bibliothèque est proposée, la génération marche donc toujours. */
(function (racine) {
  'use strict';
  const nettoie = t => String(t == null ? '' : t).replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim();
  const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const coupe = (t, n) => { t = nettoie(t); if (t.length <= n) return t; const c = t.slice(0, n); const i = Math.max(c.lastIndexOf('. '), c.lastIndexOf(' ')); return (i > n * 0.5 ? c.slice(0, i) : c).replace(/[,;:\s]+$/, ''); };
  const mots = t => sansAccents(t).split(/[^a-z0-9]+/).filter(m => m.length > 3);
  const uniq = l => [...new Set(l)];

  /* ───────── Thèmes proposés dans la fenêtre « Générer » ───────── */
  const HISTOIRES = { // histoires connues → passage biblique (jamais inventé : sans correspondance, la référence reste vide)
    'david et goliath': '1 Samuel 17', 'jonas': 'Jonas 1-4', 'daniel dans la fosse aux lions': 'Daniel 6', 'noé': 'Genèse 6-9', 'moïse et la mer rouge': 'Exode 14',
    'le fils prodigue': 'Luc 15:11-32', 'le bon samaritain': 'Luc 10:25-37', 'zachée': 'Luc 19:1-10', 'joseph et ses frères': 'Genèse 37-45', 'ruth': 'Ruth 1-4',
    'esther': 'Esther 1-10', 'jésus calme la tempête': 'Marc 4:35-41', 'la multiplication des pains': 'Jean 6:1-13', 'la femme samaritaine': 'Jean 4:1-30',
    'les trois amis dans la fournaise': 'Daniel 3', 'abraham et isaac': 'Genèse 22', 'josué et jéricho': 'Josué 6', 'gédéon': 'Juges 6-7', 'samson': 'Juges 13-16', 'job': 'Job 1-42'
  };
  const SUJETS_VERSET = ['courage', 'paix', 'fatigue', 'espérance', 'confiance', 'gratitude', 'pardon', 'peur', 'solitude', 'famille', 'travail', 'patience'];
  const SECTEURS = { plombier: 'Plombier', restaurant: 'Restaurant', fleuriste: 'Fleuriste', bois: 'Menuisier', climatisation: 'Climatisation', coach: 'Coach sportif', formation: 'Formateur',
    osteopathe: 'Ostéopathe', paysagiste: 'Paysagiste', petsitter: 'Pet-sitter', photographe: 'Photographe', alimentation: 'Épicerie' };
  const ANGLES = ['l’urgence : le client cherche vite un numéro', 'la confiance : on rassure avant le premier contact', 'le téléphone : tout se passe sur un petit écran', 'le devis ou la réservation en deux minutes',
    'être trouvé quand on cherche près de chez soi', 'les informations pratiques (horaires, zone, tarifs clairs) qu’on ne trouve nulle part', 'montrer le travail réalisé (photos, résultats)'];
  const THEMES = {
    parvis: [
      { id: 'verset', nom: 'Verset du jour', modele: 'Verset du jour', sujets: SUJETS_VERSET, aide: 'Sujet : courage, paix, fatigue… (ou ce que tu veux)' },
      { id: 'encouragement', nom: 'Encouragement (3 versets)', modele: 'Encouragement', sujets: ['fatigue', 'peur', 'doute', 'solitude', 'attente'], aide: 'Pour qui ? fatigué(e), découragé(e)…' },
      { id: 'priere', nom: 'Prière', modele: 'Prière', sujets: ['ce soir', 'le matin', 'pour une décision', 'pour la famille', 'pour la paix'], aide: 'Pour quel moment ?' },
      { id: 'histoire', nom: 'Histoire biblique', modele: 'Histoire biblique', sujets: Object.keys(HISTOIRES), aide: 'Quelle histoire ?' },
      { id: 'liste', nom: 'Liste « seuls les chrétiens comprennent »', modele: 'Liste', sujets: ['les dimanches', 'la prière', 'la communauté', 'la vie de tous les jours'], aide: 'Sur quel thème ?' }
    ],
    quentools: [
      { id: 'carrousel', nom: 'Carrousel 5 images (situation → solution)', modele: 'Carrousel 5 images', secteurs: SECTEURS, aide: 'Quel métier ? (liste ou à écrire)' },
      { id: 'conseil', nom: 'Conseil en une image', modele: 'Conseil', secteurs: SECTEURS, aide: 'Quel métier ?' },
      { id: 'liste', nom: 'Liste en une image (3 signes…)', modele: 'Liste', secteurs: SECTEURS, aide: 'Quel métier ?' },
      { id: 'astuces', nom: 'Astuces en carrousel', modele: 'Astuces en carrousel', secteurs: SECTEURS, aide: 'Quel métier ?' }
    ]
  };

  /* ───────── Contrôles de contenu (les mêmes règles que les alertes de l'application) ───────── */
  function problemesQuenTools(texte, sujet) {
    const p = [], t = String(texte), s = sansAccents(sujet || '');
    if (/€|\beuros?\b|\bprix\b.*\d|\d+\s?(eur|e)\b/i.test(t)) p.push('un prix est écrit');
    if (/https?:\/\/|www\.|\.(fr|com|net)\b/i.test(t)) p.push('un lien est écrit');
    if (/\bIA\b|intelligence artificielle|chatgpt|\bgpt\b|\brobot\b/i.test(t)) p.push('l’IA est mentionnée');
    if (/%|pour cent/i.test(t)) p.push('un pourcentage est écrit');
    for (const m of t.matchAll(/\b(\d{2,})\b/g)) if (+m[1] > 12 && !s.includes(m[1])) { p.push(`le chiffre ${m[1]} est inventé`); break; }
    if (/\b(garanti|garantie|n°\s?1|numéro 1|meilleur du|le meilleur|100 ?%)\b/i.test(t)) p.push('une promesse non vérifiable');
    if (/\b(témoignage|avis (de|d’)|client satisfait|ils nous font confiance|déjà \d+)/i.test(t)) p.push('un faux avis ou une fausse preuve sociale');
    return p;
  }
  function problemesParvis(texte) {
    const p = [], t = String(texte);
    if (/«[^»]{25,}»/.test(t.replace(/« *Amen *»/gi, ''))) p.push('une citation entre guillemets (les versets ne viennent que de la bibliothèque)');
    if (/\b(Jean|Matthieu|Marc|Luc|Psaumes?|Proverbes|Genèse|Exode|Romains|Esaïe|Ésaïe|Jérémie|Philippiens|Éphésiens|Corinthiens)\s+\d+\s*[:,.]\s*\d+/i.test(t)) p.push('une référence biblique inventée');
    if (/https?:\/\/|www\./i.test(t)) p.push('un lien est écrit');
    if (/\b(garanti|guérison assurée|tu seras guéri|miracle garanti)\b/i.test(t)) p.push('une promesse que personne ne peut tenir');
    return p;
  }

  /* ───────── Versets : uniquement ceux de la bibliothèque ───────── */
  // [{ texte, ref }] : versets uniques des publications du Parvis (Louis Segond 1910, recopiés mot pour mot)
  function banqueVersets(bibliotheque) {
    const vus = new Map();
    for (const p of (bibliotheque && bibliotheque.parvis) || []) for (const s of p.slides || []) {
      const ref = nettoie(s.ref); if (!ref || !s.texte) continue;
      if (s.type === 'verset' || s.type === 'point') { const texte = String(s.texte).trim(); if (texte.length > 20 && !vus.has(ref)) vus.set(ref, { texte, ref }); }
    }
    return [...vus.values()];
  }
  // classement simple par mots communs (repli sans IA) : le verset qui parle le plus du sujet
  function classerVersets(versets, sujet) {
    const m = new Set(mots(sujet));
    return versets.map((v, i) => ({ i, note: mots(v.texte + ' ' + v.ref).filter(x => m.has(x)).length })).sort((a, b) => b.note - a.note || a.i - b.i).map(x => x.i);
  }

  /* ───────── Mise en valeur d'un mot (*mot*) ───────── */
  function colore(titre, mot) {
    titre = nettoie(titre); mot = nettoie(mot);
    if (!titre) return titre;
    if (mot) { const i = sansAccents(titre).indexOf(sansAccents(mot)); if (i >= 0) return `${titre.slice(0, i)}*${titre.slice(i, i + mot.length)}*${titre.slice(i + mot.length)}`; }
    const w = titre.split(' '); if (w.length < 2) return titre;
    const k = w.length - 1; w[k] = `*${w[k].replace(/[.?!…]+$/, '')}*${(w[k].match(/[.?!…]+$/) || [''])[0]}`; return w.join(' ');
  }

  /* ───────── Appels à l'IA ───────── */
  const SYSTEME_QT = 'Tu écris des publications Instagram et TikTok en français pour QuenTools, une agence qui crée des sites internet pour les indépendants, artisans et commerçants. Ton direct, concret et chaleureux, vouvoiement, phrases courtes. ' +
    'Interdits absolus : prix, euros, liens, pourcentages, chiffres inventés, avis ou témoignages de clients, promesses (garanti, n°1), mention de l’IA, du code ou de la technique. Tu parles du quotidien du client du professionnel.';
  const SYSTEME_PARVIS = 'Tu écris pour Le Parvis, une communauté chrétienne sur TikTok et Instagram, en français. Ton chaleureux, simple et vrai, tutoiement. ' +
    'Tu n’écris AUCUN verset et aucune citation biblique entre guillemets, tu n’inventes aucune référence : les versets sont fournis. Tu ne promets rien (pas de guérison ni de résultat garanti) et tu ne juges personne.';
  const chaine = n => ({ type: 'string', maxLength: n });
  const liste = (n, min, max) => ({ type: 'array', minItems: min, maxItems: max, items: chaine(n) });

  // appelle l'IA et contrôle le résultat ; en cas de défaut, deux nouveaux essais en lui disant ce qui a été refusé
  async function demander(deps, { systeme, demande, schema, maxTokens, controle }) {
    let raison = '';
    for (const temperature of [0.6, 0.4, 0.25]) {
      try {
        const o = await deps.ecrire({ systeme, demande: raison ? `${demande}\n(Ta version précédente a été refusée : ${raison}. Corrige ce défaut.)` : demande, schema, maxTokens, temperature });
        const r = controle(o || {}); if (!r.length) return o; raison = r.join(' ; ');
      } catch (e) { raison = 'réponse inutilisable'; }
    }
    return null;
  }

  /* ───────── Le Parvis ───────── */
  async function genererParvis(o, deps) {
    const { theme, sujet } = o, notes = [], versets = banqueVersets(deps.bibliotheque), HASH = deps.hashtags.parvis, CTA = deps.ctaParvis;
    if (!versets.length) throw new Error('Aucun verset dans la bibliothèque');
    const catalogue = classerVersets(versets, sujet).slice(0, 16).map(i => `${i + 1}. ${versets[i].ref} : ${coupe(versets[i].texte, 90)}`).join('\n');
    const numero = n => versets[(+n || 0) - 1] || null;
    if (theme.id === 'verset') {
      const r = await demander(deps, {
        systeme: SYSTEME_PARVIS, maxTokens: 260, schema: { type: 'object', properties: { numero: { type: 'integer' }, meditation: chaine(230), titre_tiktok: chaine(70) }, required: ['numero', 'meditation', 'titre_tiktok'] },
        demande: `Sujet du jour : ${sujet || 'un encouragement pour aujourd’hui'}.\nVersets disponibles :\n${catalogue}\n\nChoisis le verset qui correspond le mieux (« numero »), puis écris « meditation » : deux phrases simples (230 caractères maximum) qui relient ce verset à la vie de tous les jours, sans citer d’autre verset. « titre_tiktok » : « Verset du jour : » suivi de la référence.`,
        controle: x => (numero(x.numero) ? [] : ['numéro de verset inconnu']).concat(nettoie(x.meditation).length < 30 ? ['méditation trop courte'] : [], problemesParvis(x.meditation))
      });
      if (!r) return null;
      const v = numero(r.numero), med = coupe(r.meditation, 230);
      return { nom: `Verset du jour : ${v.ref}`, notes, slides: [{ type: 'verset', label: 'Verset du jour', texte: v.texte, ref: v.ref }, { type: 'point', titre: 'Pour méditer', texte: med }, CTA('Cette parole est pour toi ?', 'Reçois un verset chaque jour avec Le Parvis.')],
        legende: { titre: `Verset du jour : ${v.ref}`, texte: `Verset du jour 🙏\n\n« ${v.texte} »\n${v.ref}\n\n${med}\n\nÉcris « Amen » si cette parole te parle.\n\n${HASH} #versetdujour` } };
    }
    if (theme.id === 'encouragement') {
      const r = await demander(deps, {
        systeme: SYSTEME_PARVIS, maxTokens: 420, schema: { type: 'object', properties: { titre: chaine(48), mot: chaine(20), sous: chaine(50), choix: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { numero: { type: 'integer' }, titre: chaine(48) }, required: ['numero', 'titre'] } }, legende: chaine(220) }, required: ['titre', 'mot', 'sous', 'choix', 'legende'] },
        demande: `Publication d’encouragement pour quelqu’un qui vit : ${sujet || 'un moment difficile'}.\nVersets disponibles :\n${catalogue}\n\n« titre » : titre de couverture commençant par « Si tu es… » ou « Quand… » (48 caractères maximum), « mot » : le mot à mettre en valeur dans ce titre, « sous » : une courte phrase de couverture. « choix » : 3 versets différents (numéros) avec pour chacun un titre court qui l’annonce (« Tu n’as pas à tout porter seul(e) »). « legende » : 2 phrases chaleureuses pour la description.`,
        controle: x => { const ns = (x.choix || []).map(c => +c.numero); return (ns.length === 3 && uniq(ns).length === 3 && ns.every(n => numero(n)) ? [] : ['choisis 3 versets différents de la liste']).concat(problemesParvis([x.titre, x.sous, x.legende, ...(x.choix || []).map(c => c.titre)].join(' '))); }
      });
      if (!r) return null;
      const pts = r.choix.map(c => { const v = numero(c.numero); return { type: 'point', titre: coupe(c.titre, 48), texte: v.texte, ref: v.ref }; });
      return { nom: nettoie(r.titre), notes, slides: [{ type: 'couverture', titre: colore(coupe(r.titre, 48), r.mot), sous: coupe(r.sous, 50) }, ...pts, CTA('Quelqu’un a besoin de lire ça.', 'Partage-lui et abonne-toi pour d’autres encouragements.')],
        legende: { titre: nettoie(r.titre), texte: `${coupe(r.legende, 220)} 🤍\n\nÉcris « Amen » si tu en avais besoin.\n\n${HASH} #encouragement` } };
    }
    if (theme.id === 'priere') {
      const r = await demander(deps, {
        systeme: SYSTEME_PARVIS, maxTokens: 420, schema: { type: 'object', properties: { titre: chaine(44), mot: chaine(20), sous: chaine(40), priere: chaine(230), fin: chaine(150), legende: chaine(160) }, required: ['titre', 'mot', 'sous', 'priere', 'fin', 'legende'] },
        demande: `Écris une prière courte pour : ${sujet || 'ce soir'}.\n« titre » : titre de couverture (44 caractères maximum, contient le mot « prière »), « mot » : le mot à mettre en valeur, « sous » : une courte invitation (« Lis-la à voix basse. »). « priere » : la prière, à la première personne, commençant par « Seigneur, », phrases simples et vraies (230 caractères maximum). « fin » : la dernière phrase avant « Amen » (remerciement, 150 caractères maximum). « legende » : une phrase pour la description.`,
        controle: x => (nettoie(x.priere).length < 40 ? ['prière trop courte'] : []).concat(problemesParvis([x.priere, x.fin, x.legende, x.titre].join(' ')))
      });
      if (!r) return null;
      return { nom: nettoie(r.titre), notes, slides: [{ type: 'couverture', titre: colore(coupe(r.titre, 44), r.mot), sous: coupe(r.sous, 40) }, { type: 'point', titre: 'Seigneur,', texte: coupe(r.priere.replace(/^\s*Seigneur[,\s]*/i, ''), 230) }, { type: 'point', titre: 'Amen.', texte: coupe(r.fin, 150) }, CTA('Tu as prié avec nous ?', 'Écris « Amen » en commentaire et abonne-toi.')],
        legende: { titre: nettoie(r.titre), texte: `${coupe(r.legende, 160)} 🙏\n\nÉcris « Amen » si tu t’associes à cette prière.\n\n${HASH} #priere` } };
    }
    if (theme.id === 'histoire') {
      const cle = sansAccents(sujet || '').trim(), connue = Object.keys(HISTOIRES).find(k => sansAccents(k) === cle || (cle && sansAccents(k).includes(cle)));
      const ref = connue ? HISTOIRES[connue] : '', nomHistoire = connue ? connue.replace(/\b\w/g, c => c.toUpperCase()) : nettoie(sujet || 'une histoire de la Bible');
      if (!connue) notes.push('Histoire hors de la liste : relis-la attentivement, aucune référence n’a été ajoutée.');
      const r = await demander(deps, {
        systeme: SYSTEME_PARVIS, maxTokens: 560, schema: { type: 'object', properties: { mot: chaine(24), sous: chaine(30), etapes: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { titre: chaine(40), texte: chaine(170) }, required: ['titre', 'texte'] } }, lecon: chaine(170), legende: chaine(160) }, required: ['mot', 'sous', 'etapes', 'lecon', 'legende'] },
        demande: `Raconte l’histoire biblique « ${nomHistoire} » en 3 étapes (le début, le moment clé, la fin). Reste fidèle à ce que dit la Bible, sans rien inventer ni ajouter de détail incertain ; si tu n’es pas sûr d’un détail, n’en parle pas.\n« mot » : le mot le plus fort du titre « L’histoire de… » à mettre en valeur, « sous » : « En 5 images. » ou équivalent. « etapes » : 3 étapes, chacune avec un titre court (40 caractères) et 2 phrases (170 caractères maximum). « lecon » : ce que cette histoire nous apprend aujourd’hui (170 caractères). « legende » : un résumé pour la description.`,
        controle: x => problemesParvis([x.lecon, x.legende, ...(x.etapes || []).map(e => e.titre + ' ' + e.texte)].join(' '))
      });
      if (!r) return null;
      notes.push('Relis l’histoire avant de publier : l’IA peut se tromper sur un détail.');
      return { nom: `L’histoire de ${nomHistoire}`, notes, slides: [{ type: 'couverture', titre: `L’histoire de *${nomHistoire}*`, sous: coupe(r.sous, 30) },
        ...r.etapes.map((e, i) => ({ type: 'point', n: i + 1, titre: coupe(e.titre, 40), texte: coupe(e.texte, 170), ref })), { type: 'point', titre: 'Ce que ça nous apprend', texte: coupe(r.lecon, 170) }, CTA('Quelle histoire veux-tu la prochaine fois ?', 'Dis-le en commentaire et abonne-toi.')],
        legende: { titre: `L’histoire de ${nomHistoire}`, texte: `${coupe(r.legende, 160)} 📖\n\nQuelle histoire veux-tu la prochaine fois ? Dis-le en commentaire 👇\n\n${HASH} #histoirebiblique` } };
    }
    // liste « seuls les chrétiens comprennent »
    const r = await demander(deps, {
      systeme: SYSTEME_PARVIS, maxTokens: 560, schema: { type: 'object', properties: { titre: chaine(56), mot: chaine(20), points: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'object', properties: { titre: chaine(42), texte: chaine(120) }, required: ['titre', 'texte'] } }, legende: chaine(120) }, required: ['titre', 'mot', 'points', 'legende'] },
      demande: `Liste de 5 situations que seuls les chrétiens comprennent, sur le thème : ${sujet || 'la vie de tous les jours'}. Elles sont drôles ou touchantes, jamais moqueuses envers personne.\n« titre » : « 5 choses que seuls les chrétiens comprennent » ou une variante (56 caractères maximum), « mot » : le mot à mettre en valeur. « points » : 5 situations, chacune avec un titre court (42 caractères) et une phrase (120 caractères maximum). « legende » : une phrase pour la description.`,
      controle: x => problemesParvis([x.titre, x.legende, ...(x.points || []).map(e => e.titre + ' ' + e.texte)].join(' '))
    });
    if (!r) return null;
    return { nom: nettoie(r.titre), notes, slides: [{ type: 'couverture', titre: colore(coupe(r.titre, 56), r.mot), sous: 'Swipe.' }, ...r.points.map((e, i) => ({ type: 'point', n: i + 1, titre: coupe(e.titre, 42), texte: coupe(e.texte, 120) })), CTA('Tu t’es reconnu dans combien ?', 'Dis-le en commentaire, puis abonne-toi.')],
      legende: { titre: nettoie(r.titre), texte: `${nettoie(r.titre)} 🙌\n\n${coupe(r.legende, 120)}\n\nTu t’es reconnu dans combien ? Dis-le en commentaire 👇\n\n${HASH} #chretiens #priere #eglise` } };
  }

  /* ───────── QuenTools ───────── */
  // métier écrit librement → secteur d'exemple le plus proche (pour la capture du téléphone et les exemples donnés à l'IA)
  const VOISINS = { plombier: 'plomb|chauff|electric|serrur|depann|artisan|batiment|macon|peintre|carreleur', restaurant: 'restaur|cafe|bar|boulang|patiss|pizz|traiteur|brasserie|snack|boucher', fleuriste: 'fleur|jardin|bouquet', bois: 'menuis|bois|ebenis|charpent|meuble|cuisine|agenc', climatisation: 'clim|ventil|froid|pompe a chaleur',
    coach: 'coach|sport|fitness|yoga|pilates|danse|musculation|bien-etre|naturo', formation: 'format|cours|ecole|enseign|prof|stage|atelier', osteopathe: 'osteo|kine|therap|sophro|dieteti|infirm|medec|dentiste|psycho|sante|massage', paysagiste: 'paysag|jardin|elagu|espaces verts|piscine',
    petsitter: 'pet|animal|chien|chat|toilettage|veterin|garde', photographe: 'photo|video|mariage|film|graph|design', alimentation: 'epicerie|alimentation|primeur|commerce|boutique|magasin|vente|marche' };
  function secteurDe(sujet, secteurs) {
    const t = sansAccents(sujet);
    if (secteurs[t]) return t;
    for (const [id, motif] of Object.entries(VOISINS)) if (new RegExp(motif).test(t) && secteurs[id]) return id;
    return null;
  }
  const exemplePourIA = e => JSON.stringify({ hook1: e.hook[0], hook2: e.hook[1], accent: e.accent, prob: e.prob, pb: e.pb, sol: e.sol, sb: e.sb, question_titre: 'Et votre *métier*, c’est quoi ?', question_texte: 'Dites-le en commentaire : je vous réponds avec une idée pour votre site.', legende: String(e.cap).split('\n\n')[0], hashtags: String(e.tags || '').split(/\s+/).map(h => h.replace('#', '')).slice(0, 5) });

  // une publication QuenTools complète depuis une entrée « exemple » déjà écrite (repli sans IA, ou contenu donné par l'IA)
  function carrouselDe(c, deps, source) {
    const HASH = deps.hashtags.quentools, capture = c.image || '';
    const tags = (c.tags || []).map(h => '#' + sansAccents(h).replace(/[^a-z0-9]/g, '')).filter(h => h.length > 2);
    return { nom: coupe(c.tiktok || c.hook1, 80), notes: c.notes || [], source,
      slides: [
        { type: 'accroche', theme: 'nuit', etiquette: c.exemple ? 'Modèle de démonstration' : 'À méditer', titre: `${coupe(c.hook1, 40)} *${coupe(c.hook2, 40)}*`, sous: coupe(c.accent, 70), appel: 'Glissez pour voir comment →' },
        { type: 'liste', theme: 'nuit', etiquette: 'Le constat', titre: colore(coupe(c.prob, 80), c.mot_prob), items: c.pb.map(x => coupe(x, 60)).join('\n'), puce: 'croix' },
        { type: 'liste', theme: 'nuit', etiquette: 'La solution', titre: colore(coupe(c.sol, 70), c.mot_sol), items: c.sb.map(x => coupe(x, 62)).join('\n'), puce: 'coche' },
        { type: 'telephone', theme: 'nuit', etiquette: 'Sur téléphone', titre: 'Tout est à portée de *pouce*', sous: '', position: 'centre', image: capture },
        { type: 'question', theme: 'violet', etiquette: 'Et vous ?', titre: colore(coupe(c.question_titre || 'Et votre métier, c’est quoi ?', 60), 'métier'), texte: coupe(c.question_texte || 'Dites-le en commentaire : je vous réponds avec une idée pour votre site.', 130) }
      ],
      legende: { titre: coupe(c.tiktok || c.hook1, 80), texte: `${String(c.legende || '').trim()}${c.exemple ? '\n\n(Modèle de démonstration, exemple fictif)' : ''}\n\n${tags.length ? [...new Set([...tags])].slice(0, 5).join(' ') : HASH}` } };
  }
  function carrouselDepuisExemple(e, deps) {
    return carrouselDe({ hook1: e.hook[0], hook2: e.hook[1], accent: e.accent, prob: e.prob, pb: e.pb, sol: e.sol, sb: e.sb, legende: String(e.cap).split('\n\n(Modèle')[0], tiktok: e.tt, tags: String(e.tags || '').split(/\s+/), image: (deps.captures || {})[e.id] || '', exemple: true }, deps, 'bibliotheque');
  }

  async function genererQuenTools(o, deps) {
    const { theme, sujet } = o, notes = [], exemples = deps.exemplesQT || [], secteur = secteurDe(sujet, SECTEURS) || o.secteur || '';
    const ex = exemples.find(e => e.id === secteur) || exemples[0], autre = exemples.find(e => e !== ex && e.id !== 'exemples') || null;
    const metier = nettoie(sujet) || SECTEURS[secteur] || 'artisan';
    const capture = (deps.captures || {})[secteur] || '';
    const angle = o.angle || ANGLES[Math.floor((deps.hasard ? deps.hasard() : Math.random()) * ANGLES.length)];
    const regle = x => problemesQuenTools(x, metier);
    if (theme.id === 'carrousel') {
      const schema = { type: 'object', properties: { hook1: chaine(30), hook2: chaine(34), accent: chaine(64), prob: chaine(72), mot_prob: chaine(20), pb: liste(50, 3, 3), sol: chaine(62), mot_sol: chaine(20), sb: liste(54, 3, 3), question_titre: chaine(52), question_texte: chaine(120), legende: chaine(420), titre_tiktok: chaine(72), hashtags: liste(24, 4, 5) },
        required: ['hook1', 'hook2', 'accent', 'prob', 'pb', 'sol', 'sb', 'question_titre', 'question_texte', 'legende', 'titre_tiktok', 'hashtags'] };
      const r = await demander(deps, { systeme: SYSTEME_QT, maxTokens: 700, schema,
        demande: `Écris un carrousel Instagram de 5 images pour un site de ${metier}. Angle : ${angle}.\nStructure : image 1 = accroche en deux lignes (hook1 pose une situation précise de la vie du client du ${metier}, hook2 pose la question « Qui… ? » ou le constat) et une phrase d’accent ; image 2 = le constat (prob + 3 problèmes concrets que vit le client sur un mauvais site) ; image 3 = la solution (sol + 3 bénéfices concrets d’un bon site) ; image 4 = le site sur téléphone ; image 5 = une question pour faire réagir. « mot_prob » et « mot_sol » : le mot à mettre en valeur dans prob et sol. « legende » : 3 phrases pour la description (le problème vécu, ce que fait un bon site, une question aux abonnés) ; « titre_tiktok » : le titre court de la publication ; « hashtags » : 4 à 5 mots-clés sans #.\nExemple d’un carrousel réussi pour un ${ex ? SECTEURS[ex.id] || ex.id : 'plombier'} (même forme, autre métier, ne recopie pas) :\n${ex ? exemplePourIA(ex) : ''}${autre ? `\nAutre exemple (${SECTEURS[autre.id] || autre.id}) :\n${exemplePourIA(autre)}` : ''}`,
        controle: x => regle([x.hook1, x.hook2, x.accent, x.prob, ...(x.pb || []), x.sol, ...(x.sb || []), x.question_titre, x.question_texte, x.legende, x.titre_tiktok].join(' ')).concat(nettoie(x.hook1).length < 8 ? ['accroche trop courte'] : []) });
      if (!r) return null;
      const p = carrouselDe({ hook1: r.hook1, hook2: r.hook2, accent: r.accent, prob: r.prob, mot_prob: r.mot_prob, pb: r.pb, sol: r.sol, mot_sol: r.mot_sol, sb: r.sb, question_titre: r.question_titre, question_texte: r.question_texte, legende: r.legende, tiktok: r.titre_tiktok, tags: r.hashtags, image: capture, exemple: !!capture }, deps, 'ia');
      if (!capture) p.notes.push('Ajoute une capture d’écran de site dans le téléphone (image 4).'); else p.notes.push('Le téléphone montre un site d’exemple fictif de QuenTools : la mention « modèle de démonstration » est ajoutée.');
      return p;
    }
    if (theme.id === 'conseil') {
      const r = await demander(deps, { systeme: SYSTEME_QT, maxTokens: 300, schema: { type: 'object', properties: { titre: chaine(70), mot: chaine(22), sous: chaine(130), legende: chaine(300), titre_tiktok: chaine(70), hashtags: liste(24, 4, 5) }, required: ['titre', 'mot', 'sous', 'legende', 'titre_tiktok', 'hashtags'] },
        demande: `Écris un conseil en une image sur le site internet d’un ${metier}. Angle : ${angle}.\n« titre » : le conseil en une phrase (70 caractères maximum, ex. « Votre numéro doit se voir en 3 secondes »), « mot » : le mot à mettre en valeur, « sous » : pourquoi, en une phrase concrète (130 caractères maximum). « legende » : 2 à 3 phrases pour la description qui finissent par une question aux abonnés. « hashtags » : 4 à 5 mots-clés sans #.`,
        controle: x => regle([x.titre, x.sous, x.legende, x.titre_tiktok].join(' ')) });
      if (!r) return null;
      return { nom: coupe(r.titre_tiktok, 80), notes, source: 'ia', slides: [{ type: 'accroche', theme: 'creme', etiquette: 'Conseil', titre: colore(coupe(r.titre, 70), r.mot), sous: coupe(r.sous, 130) }],
        legende: { titre: coupe(r.titre_tiktok, 80), texte: `${coupe(r.legende, 300)} 💡\n\n${r.hashtags.map(h => '#' + sansAccents(h).replace(/[^a-z0-9]/g, '')).filter(h => h.length > 2).slice(0, 5).join(' ') || deps.hashtags.quentools}` } };
    }
    if (theme.id === 'liste') {
      const r = await demander(deps, { systeme: SYSTEME_QT, maxTokens: 360, schema: { type: 'object', properties: { titre: chaine(64), mot: chaine(22), items: liste(58, 3, 5), legende: chaine(260), titre_tiktok: chaine(70), hashtags: liste(24, 4, 5) }, required: ['titre', 'mot', 'items', 'legende', 'titre_tiktok', 'hashtags'] },
        demande: `Écris une checklist en une image pour un ${metier} : « 3 signes qu’il faut refaire votre site » ou « 4 choses qu’un client cherche sur votre site » (au choix, 64 caractères maximum, avec un nombre de 3 à 5 qui correspond au nombre de points). « mot » : mot à mettre en valeur dans le titre. « items » : les points, concrets et courts (58 caractères maximum chacun). « legende » : 2 phrases pour la description. « hashtags » : 4 à 5 mots-clés sans #.`,
        controle: x => regle([x.titre, ...(x.items || []), x.legende, x.titre_tiktok].join(' ')) });
      if (!r) return null;
      return { nom: coupe(r.titre_tiktok, 80), notes, source: 'ia', slides: [{ type: 'liste', theme: 'violet', etiquette: 'Checklist', titre: colore(coupe(r.titre, 64), r.mot), items: r.items.map(x => coupe(x, 58)).join('\n'), puce: 'numero' }],
        legende: { titre: coupe(r.titre_tiktok, 80), texte: `${coupe(r.legende, 260)} 👇\n\n${r.hashtags.map(h => '#' + sansAccents(h).replace(/[^a-z0-9]/g, '')).filter(h => h.length > 2).slice(0, 5).join(' ') || deps.hashtags.quentools}` } };
    }
    // astuces : accroche, 3 astuces, question
    const r = await demander(deps, { systeme: SYSTEME_QT, maxTokens: 620, schema: { type: 'object', properties: { titre: chaine(60), mot: chaine(22), sous: chaine(40), astuces: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { titre: chaine(44), texte: chaine(150) }, required: ['titre', 'texte'] } }, question_texte: chaine(120), legende: chaine(260), titre_tiktok: chaine(70), hashtags: liste(24, 4, 5) }, required: ['titre', 'mot', 'sous', 'astuces', 'question_texte', 'legende', 'titre_tiktok', 'hashtags'] },
      demande: `Écris 3 astuces concrètes et faciles à appliquer pour que le site internet d’un ${metier} attire des clients. Angle : ${angle}.\n« titre » : « 3 astuces pour… » (60 caractères maximum), « mot » : mot à mettre en valeur, « sous » : une courte accroche (« Sans rien payer » est interdit : ne parle pas d’argent). « astuces » : 3 astuces, chacune avec un titre (44 caractères) et 1 à 2 phrases (150 caractères maximum). « question_texte » : une question aux abonnés. « legende » : 2 phrases pour la description. « hashtags » : 4 à 5 mots-clés sans #.`,
      controle: x => regle([x.titre, x.sous, ...(x.astuces || []).map(a => a.titre + ' ' + a.texte), x.question_texte, x.legende].join(' ')) });
    if (!r) return null;
    return { nom: coupe(r.titre_tiktok, 80), notes, source: 'ia', slides: [{ type: 'accroche', theme: 'violet', etiquette: 'Astuces', titre: colore(coupe(r.titre, 60), r.mot), sous: coupe(r.sous, 40), appel: 'Glissez →' },
      ...r.astuces.map((a, i) => ({ type: 'point', theme: 'nuit', etiquette: 'Astuce ' + (i + 1), n: i + 1, titre: coupe(a.titre, 44), texte: coupe(a.texte, 150) })),
      { type: 'question', theme: 'lime', etiquette: 'Et vous ?', titre: 'Laquelle *testez-vous* ?', texte: coupe(r.question_texte, 120) }],
      legende: { titre: coupe(r.titre_tiktok, 80), texte: `${coupe(r.legende, 260)} 👇\n\n${r.hashtags.map(h => '#' + sansAccents(h).replace(/[^a-z0-9]/g, '')).filter(h => h.length > 2).slice(0, 5).join(' ') || deps.hashtags.quentools}` } };
  }

  /* ───────── Repli : une publication déjà écrite de la bibliothèque ───────── */
  function depuisBibliotheque(o, deps) {
    const { marque, theme, sujet } = o, lib = ((deps.bibliotheque || {})[marque]) || [], utilisees = new Set(o.deja || []);
    if (marque === 'quentools' && theme.id === 'carrousel') {
      const secteur = secteurDe(sujet, SECTEURS) || o.secteur, ex = (deps.exemplesQT || []).filter(e => e.id !== 'exemples');
      const choix = ex.find(e => e.id === secteur && !utilisees.has('ex:' + e.id)) || ex.find(e => e.id === secteur) || ex.find(e => !utilisees.has('ex:' + e.id)) || ex[0];
      if (choix) { const p = carrouselDepuisExemple(choix, deps); p.cle = 'ex:' + choix.id; return p; }
    }
    const cat = { verset: 'Verset du jour', encouragement: 'Encouragement', priere: 'Prière', histoire: 'Histoire biblique', liste: 'Liste', conseil: 'Conseil', astuces: 'Astuces' }[theme.id];
    const cands = lib.filter(p => (p.categorie || '').toLowerCase().includes(String(cat).toLowerCase()) || (theme.id === 'liste' && /liste/i.test(p.categorie || '')));
    const m = new Set(mots(sujet)), note = p => mots(JSON.stringify(p.slides) + p.nom).filter(x => m.has(x)).length;
    const tri = (cands.length ? cands : lib).slice().sort((a, b) => (utilisees.has(a.nom) ? 1 : 0) - (utilisees.has(b.nom) ? 1 : 0) || note(b) - note(a));
    const p = tri[0]; if (!p) return null;
    return { nom: p.nom, notes: [], source: 'bibliotheque', cle: p.nom, slides: JSON.parse(JSON.stringify(p.slides)), legende: JSON.parse(JSON.stringify(p.legende)) };
  }

  /* ───────── Point d'entrée ───────── */
  // o : { marque, themeId, sujet, secteur, format, deja: [clés déjà utilisées] } ; deps : { ecrire, bibliotheque, exemplesQT, captures, hashtags, ctaParvis, ia (booléen) }
  async function generer(o, deps) {
    const theme = (THEMES[o.marque] || []).find(t => t.id === o.themeId); if (!theme) throw new Error('Thème inconnu');
    const ctx = { ...o, theme, sujet: nettoie(o.sujet) };
    let p = null, raison = '';
    if (deps.ia && deps.ecrire) {
      try { p = o.marque === 'parvis' ? await genererParvis(ctx, deps) : await genererQuenTools(ctx, deps); if (!p) raison = 'L’IA n’a pas produit un texte conforme aux règles.'; }
      catch (e) { raison = 'L’IA locale a échoué : ' + e.message; }
    } else raison = 'IA locale non installée : publication déjà écrite proposée.';
    if (p && !p.source) p.source = 'ia';
    if (!p) { p = depuisBibliotheque(ctx, deps); if (!p) throw new Error(raison || 'Rien à proposer'); p.notes = [...(p.notes || []), raison]; p.source = 'bibliotheque'; }
    p.marque = o.marque; p.format = o.format || '45';
    p.theme = theme.nom; p.sujet = ctx.sujet; p.notes = (p.notes || []).filter(Boolean);
    return p;
  }

  // Si une image déborde, on raccourcit son texte (jamais coupé au milieu d'un mot) : rendre(projet, i) → { trop }
  function ajuster(projet, rendre) {
    const champs = ['texte', 'sous', 'items', 'titre'];
    let touche = 0;
    projet.slides.forEach((s, i) => {
      for (let essai = 0; essai < 8 && rendre(projet, i).trop; essai++) {
        const k = champs.find(c => s[c] && String(s[c]).length > 30); if (!k) break;
        if (k === 'items') { const l = String(s.items).split('\n'); s.items = l.map(x => coupe(x, Math.max(24, Math.floor(x.length * 0.85)))).join('\n'); } else s[k] = coupe(s[k], Math.max(24, Math.floor(String(s[k]).length * 0.85)));
        touche++;
      }
    });
    return touche;
  }

  const api = { THEMES, SECTEURS, HISTOIRES, SUJETS_VERSET, generer, ajuster, banqueVersets, classerVersets, problemesQuenTools, problemesParvis, colore, secteurDe, depuisBibliotheque, carrouselDepuisExemple };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else racine.Generation = api;
})(typeof window !== 'undefined' ? window : globalThis);
