/* QuenTools — catalogue des templates et de leurs options, partagé par le formulaire de devis public (/devis/) et l'administration (/admin/).
   Aucun prix d'option ici : seul le prix de départ des templates est public (399 €) ; le prix des options est fixé dans le devis.
   QTT.templates : [{ id, name, demo, base, resume }]
   QTT.options   : [{ id, name, hint, qty?, monthly?, for: [id de template] | null (tous) }]
   QTT.included  : ce qui est compris dans le prix de départ (texte repris sur le devis)
   QTT.optionsFor(templateId) : options proposées pour un template
   QTT.find(nom)              : template d'après son nom (insensible à la casse), ou null
   QTT.parse(texte)           : lit « Template souhaité : … » et « Options souhaitées : … » dans une demande → { template, options[] } */
(() => {
  const templates = [
    { id: 'barbier-luxe', name: 'Barbier de luxe', demo: 'demo/maison-blade/', base: 399, resume: 'Réservation en trois choix, paiement, abonnement, fidélité, boutique, espace client et administration.' },
    { id: 'plateaux', name: 'Plateaux et commandes', demo: 'demo/naw-fruity/', base: 399, resume: 'Catalogue, calendrier avec capacité par jour, acompte, retrait ou livraison, espace client et administration.' },
    { id: 'vitrines', name: 'Sites vitrines par métier', demo: 'exemples/', base: 399, resume: 'Un univers graphique par métier, adapté au téléphone, formulaire de contact ou de devis.' }
  ];
  const app = ['barbier-luxe', 'plateaux'];
  const options = [
    { id: 'bdd', name: 'Réservations et comptes réellement enregistrés', hint: 'Base de données : les demandes, comptes et commandes sont conservés (les démonstrations ne gardent rien).', for: app },
    { id: 'paiement', name: 'Paiement en ligne réel (PayPal ou Stripe)', hint: 'Le client paie vraiment ; les démonstrations simulent le paiement.', for: app },
    { id: 'emails', name: 'E-mails de confirmation et de rappel réellement envoyés', hint: 'Confirmation de rendez-vous ou de commande, rappels.', for: app },
    { id: 'pages', name: 'Pages supplémentaires', hint: 'Au-delà de celles du modèle.', qty: true, for: ['vitrines'] },
    { id: 'textes', name: 'Rédaction des textes', hint: 'Je rédige les textes à partir de vos informations.', for: null },
    { id: 'priseenmain', name: 'Prise en main (1 h en visio)', hint: 'Pour apprendre à modifier vos textes, prix et horaires.', for: null },
    { id: 'modifs', name: 'Modifications importantes ou nouvelle fonction', hint: 'Au-delà de la série de retouches comprise.', qty: true, for: null },
    { id: 'suivi', name: 'Suivi mensuel après les 6 mois offerts', hint: 'Hébergement, sauvegardes, mises à jour et modifications simples.', monthly: true, for: null }
  ];
  const included = ['Personnalisation : nom, couleurs, textes, photos, prix, horaires',
    'Adapté au téléphone, sans cookie ni traceur',
    'Mise en ligne sur votre nom de domaine, offert la première année',
    'Assistance et maintenance offertes pendant 6 mois (hébergement, sauvegardes, mises à jour, modifications simples, réponse sous 48 h ouvrées)',
    'Une série de retouches et une notice d’utilisation'];
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const find = name => templates.find(t => norm(t.name) === norm(name)) || null;
  const optionsFor = id => options.filter(o => !o.for || o.for.includes(id));
  function parse(text) {
    const t = String(text || ''), m = t.match(/Template souhait[ée]\s*:\s*([^\n]+)/i), out = { template: m ? find(m[1].trim()) : null, options: [] };
    const o = t.match(/Options souhait[ée]es\s*:\s*([^\n]+)/i);
    if (o) o[1].split(';').forEach(p => {
      const x = p.trim(), q = x.match(/^(.*?)(?:\s*×\s*(\d+))?$/), n = norm(q[1]), opt = options.find(z => norm(z.name) === n);
      if (opt) out.options.push({ id: opt.id, qty: q[2] ? Math.max(1, +q[2]) : 1 });
    });
    return out;
  }
  window.QTT = { templates, options, included, find, optionsFor, parse };
})();
