/* QuenTools — catalogue des offres (apps et outils) et de leurs options, partagé par le formulaire de devis public (/devis/) et l'administration (/admin/).
   Les prix des options sont publics (affichés dans le formulaire de devis et sur la page templates) : source unique, reprise par l'administration pour préremplir le devis (lignes toujours modifiables).
   QTT.templates : [{ id, name, demo, base, monthly?, resume, inclus }] (offres)
   QTT.options   : [{ id, name, hint, price (€), qty? (au choix, prix à l'unité), monthly? (par mois), for: [id de template] | null (tous) }]
   QTT.included  : ce qui est compris dans le prix de départ (texte repris sur le devis)
   QTT.optionsFor(templateId) : options proposées pour un template
   QTT.find(nom)              : template d'après son nom (insensible à la casse), ou null
   QTT.parse(texte)           : lit « Template souhaité : … » et « Options souhaitées : … » dans une demande → { template, options[] } */
(() => {
  // Offres (le nom « templates » est gardé pour l'administration et les anciennes demandes) ; monthly = abonnement compris dans l'offre
  const templates = [
    { id: 'pack', name: 'Pack Commerçant', demo: 'demo/pack-commercant/', base: 290, monthly: 39, resume: 'Réservation avec acompte, carte de fidélité sur téléphone, demandes d’avis Google et espace commerçant, à votre nom.',
      inclus: 'Mise en place à vos couleurs (prestations, prix, horaires, acompte, fidélité), mise en ligne, prise en main ; l’abonnement couvre l’hébergement, les données, les mises à jour et les modifications simples.' },
    { id: 'outil', name: 'Outil métier sur mesure', demo: 'demo/naw-fruity/', base: 1490, resume: 'Devis, planning, suivi des clients, commandes, calculs : un outil conçu pour votre façon de travailler.',
      inclus: 'Analyse du besoin, conception, première version à valider, mise en ligne, notice, 3 mois d’assistance.' },
    { id: 'appli', name: 'Application web installable', demo: 'demo/maison-blade/', base: 2490, resume: 'Votre application sur l’écran d’accueil du téléphone de vos clients : comptes, espace client, notifications, administration.',
      inclus: 'Conception, application installable sur iPhone et Android (sans magasin d’applications), espace d’administration, mise en ligne, notice, 3 mois d’assistance.' }
  ];
  const surMesure = ['outil', 'appli'];
  const options = [
    { id: 'paiement', name: 'Paiement en ligne réel (PayPal ou Stripe)', hint: 'Vos clients paient directement dans l’outil.', price: 99.99, for: surMesure },
    { id: 'emails', name: 'E-mails de confirmation et de rappel automatiques', hint: 'Confirmation immédiate puis rappel avant le rendez-vous ou la livraison, envoyés tout seuls.', price: 150, for: null },
    { id: 'anglais', name: 'Version en anglais', hint: 'Seconde langue avec bouton de changement de langue.', price: 120, for: null },
    { id: 'logo', name: 'Logo simple et couleurs', hint: 'Un logo typographique (SVG et PNG) et trois couleurs de marque, si vous n’en avez pas encore.', price: 60, for: null },
    { id: 'priseenmain', name: 'Prise en main (1 h en visio)', hint: 'Une heure en visio pour apprendre à utiliser et modifier votre outil.', price: 50, for: null },
    { id: 'modifs', name: 'Nouvelle fonction ou modification importante', hint: 'Au-delà de la série de retouches comprise.', price: 150, qty: true, for: null },
    { id: 'suivi', name: 'Suivi mensuel après les 3 mois offerts', hint: 'Hébergement, sauvegardes, mises à jour et modifications simples.', price: 49, monthly: true, for: surMesure }
  ];
  const included = ['Prix fixé dans le devis avant de commencer', 'Première version montrée et ajustée avant la mise en ligne',
    'Adapté au téléphone, sans cookie ni traceur', 'Données de vos clients chez vous, jamais revendues', 'Notice d’utilisation et quelqu’un de joignable après la livraison'];
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const find = name => templates.find(t => norm(t.name) === norm(name)) || null;
  const optionsFor = id => options.filter(o => !o.for || o.for.includes(id));
  function parse(text) {
    const t = String(text || ''), m = t.match(/(?:Template|Offre) souhait[ée]+\s*:\s*([^\n]+)/i), out = { template: m ? find(m[1].trim()) : null, options: [] };
    const o = t.match(/Options souhait[ée]es\s*:\s*([^\n]+)/i);
    if (o) o[1].split(';').forEach(p => {
      const x = p.trim(), q = x.match(/^(.*?)(?:\s*×\s*(\d+))?$/), n = norm(q[1]), opt = options.find(z => norm(z.name) === n);
      if (opt) out.options.push({ id: opt.id, qty: q[2] ? Math.max(1, +q[2]) : 1 });
    });
    return out;
  }
  const fmt = n => n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  /* Texte du prix d'une option : « 249,99 € », « 150 € l'unité », « 69,99 € par mois » */
  const priceText = o => fmt(o.price) + (o.monthly ? ' par mois' : o.qty ? ' l’unité' : '');
  /* Total indicatif d'un template et de ses options : { once, rec } (rec = montant mensuel) ; chosen = { idOption: quantité } */
  function total(templateId, chosen) {
    const t = templates.find(x => x.id === templateId); let once = t ? t.base : 0, rec = t ? t.monthly || 0 : 0;
    optionsFor(templateId).forEach(o => { const q = chosen[o.id]; if (q) { const v = o.price * (o.qty ? q : 1); if (o.monthly) rec += v; else once += v; } });
    return { once: Math.round(once * 100) / 100, rec: Math.round(rec * 100) / 100 };
  }
  window.QTT = { templates, options, included, find, optionsFor, parse, fmt, priceText, total };
})();
