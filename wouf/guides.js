'use strict';
/* Wouf — bibliothèque de guides « erreurs à éviter et points d'attention » (hors éducation).
   Lecture dans l'app, export PDF. Un guide gratuit (urgences), les autres avec Wouf Plus (fonction « guides »).
   Contenu indicatif : ne remplace jamais un vétérinaire. Route #/guides. */
const GUIDES = [
  { id: 'urgences', free: true, sp: 'all', e: '🚨', title: 'Urgences : 8 gestes à ne pas faire', sub: 'Les réflexes qui aggravent la situation',
    intro: 'En cas de problème, la panique pousse à agir vite. Certains gestes, bien intentionnés, font plus de mal que de bien. Voici ceux à éviter, en attendant l’avis d’un vétérinaire.',
    items: [
      ['Faire vomir sans avis', 'Après une ingestion de produit ou d’aliment dangereux, ne provoquez pas de vomissement (sel, eau salée, doigts…) : cela peut brûler, faire fausser route ou empirer les choses. Appelez d’abord un vétérinaire ou un centre antipoison vétérinaire.'],
      ['Donner un médicament « pour humains »', 'Paracétamol, ibuprofène, aspirine et bien d’autres sont dangereux pour le chien et surtout pour le chat, même à faible dose. Ne donnez jamais un médicament sans prescription vétérinaire.'],
      ['Attendre « pour voir » quand la respiration est difficile', 'Respiration bruyante, bouche ouverte chez le chat, gencives pâles ou bleutées, effondrement : c’est une urgence immédiate, pas un motif d’attendre le lendemain.'],
      ['Laisser dans une voiture, même « 5 minutes »', 'L’habitacle chauffe très vite, même par temps doux ou fenêtre entrouverte. Un coup de chaleur peut être mortel en peu de temps.'],
      ['Donner à boire ou à manger de force', 'Un animal en détresse, très fatigué ou qui convulse peut s’étouffer. Ne forcez rien : gardez-le au calme et appelez le vétérinaire.'],
      ['Refroidir brutalement lors d’un coup de chaleur', 'L’eau glacée peut provoquer un choc. Mieux vaut de l’eau tiède ou fraîche, sans excès, à l’ombre, en direction de la clinique vétérinaire.'],
      ['Retirer un objet planté ou déplacer un animal blessé sans précaution', 'Retirer un objet planté peut aggraver le saignement. Un animal qui souffre peut mordre ou griffer, même son propre maître : protégez-vous, immobilisez doucement et transportez avec précaution.'],
      ['Ne pas appeler parce que « ça va mieux »', 'Certains poisons agissent avec retard : l’animal peut sembler normal avant de s’aggraver. En cas de doute sur une ingestion, appelez sans attendre les symptômes.']
    ], outro: 'Retrouvez aussi dans Wouf la fiche « Que faire ? », la liste des aliments toxiques et les vétérinaires de garde (SOS).' },
  { id: 'chien-erreurs', sp: 'dog', e: '🐶', title: 'Chien : 10 erreurs qui abîment sa santé', sub: 'Les erreurs les plus courantes, et quoi faire à la place',
    intro: 'La plupart de ces erreurs viennent de bonnes intentions. Les connaître permet de les éviter facilement.',
    items: [
      ['Donner des restes de table', 'Gras, sel, épices, oignon, ail, chocolat, raisins : plusieurs aliments courants sont dangereux pour le chien. Préférez ses croquettes et de petites friandises adaptées.'],
      ['Trop nourrir', 'Un chien un peu rond est un chien en moins bonne santé (articulations, cœur, espérance de vie). Pesez la ration, comptez les friandises et surveillez son poids régulièrement.'],
      ['Ignorer les dents', 'Tartre et gencives enflammées font mal et peuvent toucher d’autres organes. Le brossage régulier et le contrôle chez le vétérinaire valent mieux qu’un détartrage tardif.'],
      ['Oublier ou repousser les rappels de vaccin et les antiparasitaires', 'Les rappels et les traitements contre puces, tiques et vers protègent votre chien, mais aussi votre foyer. Notez les dates dans Wouf pour être prévenu à temps.'],
      ['Sortir en pleine chaleur', 'Trottoir brûlant, midi en été, effort intense : le coup de chaleur guette, surtout chez les chiens à museau court, âgés ou en surpoids. Sortez tôt le matin ou tard le soir et emportez de l’eau.'],
      ['Laisser jouer ou courir juste après le repas', 'Chez certains chiens, surtout les grands gabarits à poitrine profonde, l’effort après un gros repas augmente le risque de torsion d’estomac, une urgence. Laissez un temps de calme avant et après le repas.'],
      ['Se passer de la visite annuelle', 'Beaucoup de problèmes (cœur, reins, dents, articulations) commencent en silence. Un bilan par an, plus fréquent pour un chien senior, permet d’agir tôt.'],
      ['Négliger le poids et les articulations du chiot en croissance', 'Escaliers, sauts répétés et longues courses pendant la croissance sollicitent des articulations encore fragiles. Adaptez l’effort à l’âge et à la race, avec l’avis de votre vétérinaire.'],
      ['Ne jamais vérifier oreilles, pattes et peau', 'Un coup d’œil hebdomadaire aux oreilles, aux coussinets, entre les doigts et sur la peau permet de repérer tôt rougeurs, épillets, plaies ou grosseurs.'],
      ['Attendre trop longtemps devant un symptôme', 'Vomissements répétés, apathie, refus de manger, boiterie qui dure, soif inhabituelle : mieux vaut un appel de trop qu’une consultation trop tardive.']
    ], outro: 'Contenu indicatif : demandez toujours conseil à votre vétérinaire pour votre animal.' },
  { id: 'chat-erreurs', sp: 'cat', e: '🐱', title: 'Chat : 10 erreurs qui abîment sa santé', sub: 'Les erreurs les plus courantes, et quoi faire à la place',
    intro: 'Le chat cache très bien sa douleur : les erreurs passent souvent inaperçues. Voici celles à éviter en priorité.',
    items: [
      ['Croire que le chat se soigne tout seul', 'Le chat masque ses maux. Une baisse d’appétit, une toilette négligée, une planque inhabituelle ou un changement de comportement sont des signaux à prendre au sérieux.'],
      ['Donner un médicament ou une pipette pour chien', 'Certaines pipettes antiparasitaires pour chien sont très dangereuses pour le chat. Utilisez uniquement un produit prescrit ou conseillé pour le chat, à la bonne dose de poids.'],
      ['Laisser des plantes dangereuses à portée', 'Les lys, en particulier, sont très dangereux pour le chat (même le pollen ou l’eau du vase). Vérifiez chaque plante et bouquet avant de l’installer à la maison.'],
      ['Ne pas surveiller sa façon d’uriner', 'Efforts dans la litière, allées et venues répétées, miaulements, absence d’urine : surtout chez le mâle, c’est une urgence. Appelez le vétérinaire sans attendre.'],
      ['Changer de croquettes brutalement', 'Un changement brusque provoque des troubles digestifs et des refus. Mélangez progressivement l’ancien et le nouvel aliment sur une dizaine de jours.'],
      ['Ne pas assez le faire boire', 'Beaucoup de chats boivent peu. Plusieurs points d’eau, éloignés de la gamelle et de la litière, et une part d’alimentation humide aident à limiter les problèmes urinaires.'],
      ['Litière mal placée, mal entretenue ou en nombre insuffisant', 'Une litière sale, bruyante ou dans un endroit passant peut mener à la malpropreté et au stress. Comptez une litière par chat, plus une, à nettoyer chaque jour.'],
      ['Le laisser prendre du poids', 'Un chat en surpoids risque diabète et douleurs articulaires. Pesez la ration, limitez les friandises et surveillez son poids dans Wouf.'],
      ['Sous-estimer les dents et la bouche', 'Bave, mauvaise haleine, mastication gênée : les problèmes dentaires sont fréquents et douloureux. Faites vérifier la bouche à chaque visite.'],
      ['Oublier les rappels de vaccin et les antiparasitaires, même pour un chat d’appartement', 'Un chat d’intérieur peut aussi être touché (puces ramenées par vous ou un autre animal, virus). Suivez le calendrier conseillé par votre vétérinaire.']
    ], outro: 'Contenu indicatif : demandez toujours conseil à votre vétérinaire pour votre animal.' },
  { id: 'arrivee', sp: 'all', e: '🍼', title: 'Chiot ou chaton : 12 points d’attention', sub: 'Le premier mois à la maison',
    intro: 'L’arrivée d’un jeune animal est un moment merveilleux, mais fragile. Voici ce qu’il vaut mieux surveiller dès les premiers jours.',
    items: [
      ['Prévoir une visite chez le vétérinaire rapidement', 'Un contrôle de départ permet de vérifier l’état de santé, de faire le point sur les vaccins, les vermifuges et l’identification, et de poser toutes vos questions.'],
      ['Respecter le calendrier des vaccins', 'Tant que le protocole n’est pas terminé, demandez à votre vétérinaire ce qui est possible pour les sorties et les contacts avec les autres animaux.'],
      ['Ne pas changer d’aliment d’un coup', 'Gardez celui donné par l’éleveur ou le refuge au début, puis changez progressivement, avec un aliment adapté à la croissance.'],
      ['Répartir les repas', 'Les jeunes animaux mangent plusieurs petits repas par jour. Demandez à votre vétérinaire la quantité et le nombre de repas selon l’âge et la race attendue.'],
      ['Sécuriser la maison', 'Câbles électriques, plantes, produits ménagers, médicaments, petits objets avalables : mettez tout hors de portée, comme pour un enfant en bas âge.'],
      ['Ne pas le laisser seul trop longtemps trop tôt', 'Habituez-le à la solitude par petites étapes. Un jeune animal laissé seul plusieurs heures dès les premiers jours vit très mal la séparation.'],
      ['Ne pas multiplier les personnes et les stimulations le premier jour', 'Le premier jour, laissez-le découvrir calmement, sans visite en série ni sorties longues. Le calme aide à créer la confiance.'],
      ['Assurer le repos', 'Un chiot ou un chaton dort beaucoup. Ne le réveillez pas sans cesse et laissez-lui un endroit calme où il n’est pas dérangé.'],
      ['Ne pas porter ni faire sauter sans précaution', 'Un jeune animal est fragile. Portez-le en soutenant bien le corps, et évitez les sauts de canapé ou d’escaliers répétés.'],
      ['Ne pas laisser jouer les enfants sans surveillance', 'Les enfants et les jeunes animaux doivent apprendre à se respecter. Restez présent, expliquez les gestes doux et les moments où on laisse tranquille.'],
      ['Ne pas oublier l’identification', 'Puce électronique et inscription à votre nom : elles sont obligatoires pour le chien et pour le chat et facilitent les retrouvailles en cas de fugue.'],
      ['Noter la date et le poids', 'Le poids suit la croissance. Notez-le dans Wouf, ainsi que les vaccins et les vermifuges : le carnet se remplit tout seul au fil du temps.']
    ], outro: 'Contenu indicatif : demandez toujours conseil à votre vétérinaire pour votre animal.' }
];
const GD = { open: '' };
const guideById = id => GUIDES.find(g => g.id === id);
function guideHTML(g) {
  return `<h1>${g.e} ${esc(g.title)}</h1><p class="mut">Guide Wouf · contenu indicatif</p><p>${esc(g.intro)}</p>
    ${g.items.map((it, i) => `<h2>${i + 1}. ${esc(it[0])}</h2><p>${esc(it[1])}</p>`).join('')}
    <p>${esc(g.outro)}</p><p class="mut">Les informations de santé sont indicatives et ne remplacent pas l’avis d’un vétérinaire.</p>`;
}
ROUTES.guides = function guides() {
  const back = '<a class="back" href="#/plus">‹</a>', g = guideById(GD.open);
  if (g && (g.free || allowed('guides'))) {
    return `<div class="page-h"><a class="back" href="#/guides" data-act="guide-close">‹</a><h1>${g.e} ${esc(g.title)}</h1></div>
      <section class="card gd"><p>${esc(g.intro)}</p><ol class="gd-list">${g.items.map(it => `<li><b>${esc(it[0])}</b><p>${esc(it[1])}</p></li>`).join('')}</ol><p>${esc(g.outro)}</p></section>
      <div class="ta-btns"><button class="btn primary big" data-act="guide-print">🖨️ Enregistrer en PDF / imprimer</button><button class="btn" data-act="guide-close">‹ Tous les guides</button></div>
      <p class="mut center small">Les informations de santé sont indicatives et ne remplacent pas l’avis d’un vétérinaire.</p>`;
  }
  const spLbl = { dog: '🐶 Chien', cat: '🐱 Chat', all: '🐶🐱 Chien et chat' };
  return `<div class="page-h">${back}<h1>📚 E-books et guides</h1></div>
    <p class="mut">Les erreurs à éviter et les points d’attention, expliqués simplement. Les e-books gratuits sont ouverts à tous, les autres sont inclus dans Wouf Plus. À lire ici ou à enregistrer en PDF.</p>
    <div class="list card menu">${GUIDES.map(x => `<button class="row" data-act="guide-open" data-id="${x.id}"><span class="ico">${x.e}</span><span class="grow"><b>${esc(x.title)}</b><small>${esc(x.sub)} · ${spLbl[x.sp]} · ${x.free ? 'Gratuit' : allowed('guides') ? `${x.items.length} points` : 'Plus'}</small></span><span class="chev">›</span></button>`).join('')}</div>
    <p class="mut center small">Les informations de santé sont indicatives et ne remplacent pas l’avis d’un vétérinaire.</p>`;
};
/* Accueil : menu déroulant « E-books » (gratuits puis Wouf Plus), ceux de l'espèce de l'animal en premier ; un appui ouvre l'e-book. */
function homeEbooks(d) {
  const sp = spOf(d).id, rank = g => (g.sp === sp || g.sp === 'all' ? 0 : 1), list = GUIDES.slice().sort((a, b) => rank(a) - rank(b));
  const free = list.filter(g => g.free), paid = list.filter(g => !g.free), ok = allowed('guides');
  const row = g => `<button class="row" data-act="guide-open" data-id="${g.id}"><span class="ico">${g.e}</span><span class="grow"><b>${esc(g.title)}</b><small>${esc(g.sub)}</small></span><span class="chev">${g.free || ok ? '›' : '🔒'}</span></button>`;
  return `<details class="card acc" id="h-ebooks"${HOME.eb ? ' open' : ''}><summary><b class="grow">📚 E-books</b><small class="mut">${free.length} gratuit${free.length > 1 ? 's' : ''} · ${paid.length} Wouf Plus</small></summary>
    <p class="eb-h">🎁 E-books gratuits</p><div class="list menu">${free.map(row).join('')}</div>
    <p class="eb-h">⭐ E-books Wouf Plus ${ok ? '<span class="pill ok">Débloqués</span>' : '<span class="pill plus">Plus</span>'}</p><div class="list menu">${paid.map(row).join('')}</div>
    <p class="mut small">À lire dans l’appli ou à enregistrer en PDF. Contenu indicatif.</p></details>`;
}
document.addEventListener('toggle', e => { if (e.target && e.target.id === 'h-ebooks') HOME.eb = e.target.open; }, true);
ACT['guide-open'] = d => { const g = guideById(d.id); if (!g) return; if (!g.free && !allowed('guides')) return paywall('guides'); GD.open = g.id; track('guide-ouvert', true); if (routeName() !== 'guides') location.hash = '#/guides'; else render(); window.scrollTo(0, 0); };
ACT['guide-close'] = () => { GD.open = ''; render(); window.scrollTo(0, 0); };
ACT['guide-print'] = () => { const g = guideById(GD.open); if (g && (g.free || allowed('guides'))) printHTML(guideHTML(g)); };
