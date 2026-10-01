'use strict';
/* Wouf — les 2 e-books (hors éducation) : un gratuit (« Le guide de survie du propriétaire ») et un complet avec Wouf Plus
   (« Le grand guide santé et bien-être », fonction « guides »). Chaque e-book = des chapitres ({e, t, intro, items}),
   un point = [titre, texte] ou [titre, texte, [liste]]. Les chapitres urgences / premiers secours / toxiques reprennent
   les données de l'app (URGENT_SIGNS, FIRST_AID, TOXICS… dans data.js et species.js) : une seule source à corriger.
   Lecture uniquement dans l'app (sommaire + chapitres dépliables) : volontairement pas d'export PDF ni d'impression. Contenu indicatif : ne remplace jamais un vétérinaire. Route #/guides. */
const GD_NOTE = 'Contenu indicatif : il ne remplace jamais l’avis de votre vétérinaire, qui connaît votre animal.';
const gdLevel = t => `${t.level === 'danger' ? '⛔ Danger' : '⚠️ Attention'} · ${t.why}`;
const GUIDES = [
  { id: 'survie', free: true, e: '🚨', title: 'Le guide de survie du propriétaire', sub: 'Urgences, premiers secours, dangers de la maison : chien et chat',
    intro: 'Ce guide rassemble tout ce qu’il faut savoir le jour où ça ne va pas : reconnaître une urgence, les bons gestes en attendant le vétérinaire, ceux à éviter, et les dangers à écarter de la maison. Lisez-le une fois au calme : il reste toujours disponible dans Wouf, même sans connexion.',
    chapters: () => [
      { e: '🚦', t: 'Reconnaître une urgence', intro: 'Certains signes ne peuvent pas attendre le lendemain. S’ils apparaissent, appelez tout de suite votre vétérinaire, ou le vétérinaire de garde la nuit et le week-end.',
        items: [
          ['Chez le chien', 'Appelez sans attendre si vous observez :', URGENT_SIGNS],
          ['Chez le chat', 'Le chat cache très bien sa douleur : quand un signe se voit, c’est souvent déjà sérieux. Appelez sans attendre si vous observez :', URGENT_CAT],
          ['La règle d’or : au moindre doute, appelez', 'Un vétérinaire vous dira par téléphone s’il faut venir tout de suite, dans la journée, ou simplement surveiller. Un appel de trop ne coûte rien ; une consultation trop tardive peut coûter cher à votre animal.'],
          ['Ce qu’il faut dire au téléphone', 'Pour gagner du temps, préparez ces informations :', ['L’espèce, l’âge, le poids approximatif et les maladies ou traitements en cours', 'Ce qui se passe, depuis quand, et comment cela évolue', 'En cas d’ingestion : quoi, quelle quantité, à quelle heure (gardez l’emballage ou un échantillon)', 'Votre adresse et le temps qu’il vous faut pour venir']]
        ] },
      { e: '🚫', t: 'Les 8 gestes à ne pas faire', intro: 'En cas de problème, la panique pousse à agir vite. Certains gestes, bien intentionnés, font plus de mal que de bien.',
        items: [
          ['Faire vomir sans avis', 'Après une ingestion de produit ou d’aliment dangereux, ne provoquez pas de vomissement (sel, eau salée, doigts…) : cela peut brûler, faire fausse route ou empirer les choses. Appelez d’abord un vétérinaire ou un centre antipoison vétérinaire.'],
          ['Donner un médicament « pour humains »', 'Paracétamol, ibuprofène, aspirine et bien d’autres sont dangereux pour le chien et surtout pour le chat, même à faible dose. Ne donnez jamais un médicament sans prescription vétérinaire.'],
          ['Attendre « pour voir » quand la respiration est difficile', 'Respiration bruyante, bouche ouverte chez le chat, gencives pâles ou bleutées, effondrement : c’est une urgence immédiate, pas un motif d’attendre le lendemain.'],
          ['Laisser dans une voiture, même « 5 minutes »', 'L’habitacle chauffe très vite, même par temps doux ou fenêtre entrouverte. Un coup de chaleur peut être mortel en peu de temps.'],
          ['Donner à boire ou à manger de force', 'Un animal en détresse, très fatigué ou qui convulse peut s’étouffer. Ne forcez rien : gardez-le au calme et appelez le vétérinaire.'],
          ['Refroidir brutalement lors d’un coup de chaleur', 'L’eau glacée peut provoquer un choc. Mieux vaut de l’eau tiède ou fraîche, sans excès, à l’ombre, en direction de la clinique vétérinaire.'],
          ['Retirer un objet planté ou déplacer un animal blessé sans précaution', 'Retirer un objet planté peut aggraver le saignement. Un animal qui souffre peut mordre ou griffer, même son propre maître : protégez-vous, immobilisez doucement et transportez avec précaution.'],
          ['Ne pas appeler parce que « ça va mieux »', 'Certains poisons agissent avec retard : l’animal peut sembler normal avant de s’aggraver. En cas de doute sur une ingestion, appelez sans attendre les symptômes.']
        ] },
      { e: '🩹', t: 'Premiers secours du chien', intro: 'Ces gestes servent à limiter les dégâts en attendant le vétérinaire. Ils ne remplacent jamais la consultation.',
        items: FIRST_AID.map(([e, t, steps]) => [`${e} ${t}`, '', steps]) },
      { e: '🩹', t: 'Premiers secours du chat', intro: 'Le chat supporte mal les manipulations : restez calme, parlez doucement, et enveloppez-le dans une serviette épaisse si vous devez le porter.',
        items: FIRST_AID_CAT.map(([e, t, steps]) => [`${e} ${t}`, '', steps]) },
      { e: '☠️', t: 'Aliments, plantes et produits dangereux pour le chien', intro: '« Danger » : appelez tout de suite, même sans symptôme. « Attention » : à éviter, et appelez en cas de grande quantité ou de symptôme.',
        items: TOXICS.map(t => [t.name, gdLevel(t)]) },
      { e: '☠️', t: 'Aliments, plantes et produits dangereux pour le chat', intro: 'Le chat est plus sensible que le chien à de nombreux produits, en particulier les lys, certains médicaments et les antiparasitaires pour chien.',
        items: TOXICS_CAT.map(t => [t.name, gdLevel(t)]) },
      { e: '🏠', t: 'Une maison sans danger', intro: 'La plupart des accidents arrivent à la maison. Quelques habitudes simples suffisent à les éviter.',
        items: [
          ['Médicaments et produits ménagers rangés', 'Rangez médicaments (y compris les vôtres), produits ménagers, engrais, anti-limaces et raticides dans un placard fermé. Un comprimé tombé par terre peut suffire à intoxiquer un petit animal.'],
          ['Fenêtres et balcons sécurisés pour le chat', 'Les chutes de balcon et de fenêtre sont fréquentes, même chez les chats d’intérieur calmes. Un filet ou une moustiquaire solide protège bien. Une fenêtre oscillo-battante entrouverte peut aussi piéger un chat.'],
          ['Fils, ficelles, élastiques, aiguilles', 'Très attirants pour le chat et le chiot, ils peuvent bloquer ou couper l’intestin. Rangez-les après usage, surtout la ficelle du rôti et les rubans de cadeaux.'],
          ['Plantes et bouquets vérifiés', 'Avant d’installer une plante ou un bouquet, vérifiez qu’il n’est pas toxique. Pas de lys dans une maison avec un chat.'],
          ['Poubelle fermée', 'Os cuits, restes gras, emballages, noyaux : la poubelle est une source fréquente d’intoxications et d’occlusions.'],
          ['Machines, placards et portes', 'Avant de lancer le lave-linge ou le sèche-linge, et avant de fermer un placard ou un garage, vérifiez que le chat ne s’y est pas glissé.'],
          ['Câbles et petits objets', 'Chiots et chatons mâchonnent tout : cachez les câbles électriques, et ne laissez pas traîner piles, jouets d’enfants ou chaussettes.'],
          ['Fêtes et invités', 'Chocolats, alcool, restes du repas, décorations et guirlandes : pendant les fêtes, prévoyez un coin calme et prévenez les invités de ne rien donner à manger.']
        ] },
      { e: '☀️', t: 'Chaleur, froid et balades', intro: 'Le temps qu’il fait change les risques. Wouf vous aide avec la météo des balades sur l’accueil.',
        items: [
          ['Le coup de chaleur', 'Les chiens à museau court (bouledogues, carlins…), âgés, en surpoids ou très jeunes sont les plus fragiles. En été, sortez tôt le matin et tard le soir, emportez de l’eau et évitez l’effort aux heures chaudes. Jamais d’animal seul dans une voiture.'],
          ['Le bitume brûlant', 'Posez le dos de votre main sur le sol pendant quelques secondes : si c’est trop chaud pour vous, c’est trop chaud pour ses coussinets. Préférez l’herbe et l’ombre.'],
          ['Le froid', 'Les petits chiens, les chiens à poil ras, les seniors et les chiots craignent le froid : raccourcissez les sorties et séchez-les en rentrant. Rincez les pattes après un trottoir salé.'],
          ['L’eau et la baignade', 'À la plage, prévoyez de l’eau douce (l’eau de mer ne désaltère pas). Méfiez-vous des courants, des algues en décomposition et des eaux stagnantes.'],
          ['Les orages et les feux d’artifice', 'Beaucoup d’animaux en ont peur. Restez à la maison, fermez les volets, laissez-le se cacher s’il le souhaite et vérifiez que son identification est à jour : les fugues sont fréquentes ces soirs-là.']
        ] },
      { e: '🧰', t: 'La trousse de secours et les numéros utiles', intro: 'Préparez-la une bonne fois pour toutes, et emportez-la en voyage.',
        items: [
          ['Dans la trousse', 'Le minimum utile :', ['Compresses stériles, bande extensible et sparadrap', 'Sérum physiologique en unidoses (yeux, plaies)', 'Un antiseptique conseillé par votre vétérinaire', 'Ciseaux à bouts ronds et pince à épiler', 'Un tire-tique', 'Un thermomètre (usage exclusif de l’animal)', 'Des gants jetables', 'Une couverture de survie ou une serviette épaisse', 'Pour le chien, une muselière adaptée à sa taille (un animal qui a mal peut mordre)']],
          ['Les numéros à enregistrer', 'Dans votre téléphone et sur la porte du frigo :', ['Votre vétérinaire habituel', 'Le vétérinaire de garde le plus proche (liste « SOS » dans Wouf)', ...POISON_LINES.map(([n, p]) => `Centre antipoison vétérinaire ${n} : ${p.replace(/(\d{2})(?=\d)/g, '$1 ')}`)]],
          ['Le carnet de santé à jour', 'Vaccins, traitements, poids, allergies et antécédents : en urgence, le vétérinaire de garde gagne un temps précieux. Wouf garde tout cela et le montre en un instant.']
        ] }
    ],
    outro: 'Dans Wouf : la fiche « Que faire ? » pour savoir s’il faut consulter, la liste des vétérinaires de garde autour de vous, et le carnet de santé à montrer au vétérinaire.' },

  { id: 'sante', e: '📘', title: 'Le grand guide santé et bien-être', sub: 'Du premier jour à la vieillesse : tout pour prendre soin de votre compagnon, chien ou chat',
    intro: 'Le guide complet pour prendre soin de votre compagnon toute sa vie : l’arrivée à la maison, les vaccins, les parasites, l’alimentation et le poids, l’hygiène, le comportement, les saisons, les années senior et les voyages, avec les erreurs les plus courantes à éviter pour le chien et pour le chat.',
    chapters: () => [
      { e: '🍼', t: 'Le premier mois : chiot ou chaton', intro: 'L’arrivée d’un jeune animal est un moment merveilleux, mais fragile. Voici ce qu’il vaut mieux surveiller dès les premiers jours.',
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
        ] },
      { e: '💉', t: 'Vaccins, identification et visites', intro: 'La prévention évite la plupart des maladies graves. Votre vétérinaire adapte le programme au mode de vie de votre animal.',
        items: [
          ['L’identification', 'La puce électronique est obligatoire pour le chien et pour le chat. Pensez à mettre à jour vos coordonnées au fichier national (I-CAD) après un déménagement ou un changement de numéro : c’est ce qui permet de vous retrouver.'],
          ['Les vaccins du chien', 'Ils protègent notamment contre la maladie de Carré, l’hépatite de Rubarth, la parvovirose et la leptospirose ; la toux du chenil et la rage selon le mode de vie et les voyages. Votre vétérinaire vous indique lesquels et à quel rythme.'],
          ['Les vaccins du chat', 'Ils protègent notamment contre le typhus et le coryza ; la leucose selon le mode de vie (accès à l’extérieur, contacts avec d’autres chats) ; la rage pour voyager. Même un chat d’appartement a besoin d’une protection de base.'],
          ['Primovaccination puis rappels', 'Le jeune animal reçoit plusieurs injections à quelques semaines d’intervalle, puis des rappels réguliers. Un rappel oublié trop longtemps peut obliger à tout recommencer : notez chaque date dans Wouf pour être prévenu à temps.'],
          ['La visite annuelle', 'Même en pleine forme, une visite par an permet de vérifier le cœur, les dents, la peau, le poids, et de détecter tôt les maladies silencieuses. À partir de l’âge senior, deux visites par an sont souvent conseillées.'],
          ['La stérilisation', 'Elle a des avantages (pas de portées non désirées, moins de marquage et de fugues, prévention de certaines maladies) et des conséquences (appétit, poids). Parlez-en avec votre vétérinaire pour choisir le bon moment.']
        ] },
      { e: '🦟', t: 'Puces, tiques et vers', intro: 'Les parasites sont fréquents toute l’année, même en ville et même pour un chat qui ne sort pas.',
        items: [
          ['Les puces', 'Démangeaisons, petits grains noirs dans le pelage : la plupart des puces vivent dans la maison (œufs et larves dans les tapis, les paniers). Traitez l’animal, lavez les couchages à chaud et passez l’aspirateur. Traitez tous les animaux du foyer en même temps.'],
          ['Les tiques', 'Elles transmettent des maladies graves (comme la piroplasmose chez le chien). Après chaque balade en nature, inspectez la tête, les oreilles, le cou, les aisselles et entre les doigts. Retirez-la avec un tire-tique en tournant, sans l’écraser ni mettre de produit dessus.'],
          ['Les vers', 'Ils passent souvent inaperçus. La fréquence du vermifuge dépend de l’âge et du mode de vie (chasse, contact avec des enfants, alimentation crue) : demandez à votre vétérinaire le bon rythme.'],
          ['La leishmaniose (sud de la France)', 'Transmise par un petit moucheron (le phlébotome), surtout du printemps à l’automne au crépuscule, elle touche le chien. Dans les régions concernées, parlez de la prévention (répulsifs, vaccin) avec votre vétérinaire.'],
          ['Jamais de produit pour chien sur un chat', 'Certains antiparasitaires pour chien (à base de perméthrine) sont très toxiques pour le chat, même par simple contact avec un chien fraîchement traité. Utilisez uniquement des produits prévus pour chaque espèce, au bon poids.'],
          ['Noter les traitements', 'Enregistrez chaque traitement dans Wouf (« Antipuces », « Vermifuge ») : vous saurez quand refaire le suivant sans y penser.']
        ] },
      { e: '🥣', t: 'Alimentation, ration et poids', intro: 'Bien nourrir, c’est surtout la bonne quantité d’un aliment adapté. Le surpoids est aujourd’hui l’un des problèmes de santé les plus fréquents.',
        items: [
          ['Peser la ration', 'La quantité indiquée sur le paquet est un point de départ, à ajuster selon l’âge, l’activité, la stérilisation et le poids. Utilisez une balance de cuisine plutôt qu’un verre doseur approximatif.'],
          ['Compter les friandises', 'Les friandises, restes et récompenses d’éducation comptent dans la ration. Les vétérinaires conseillent généralement de ne pas dépasser environ 10 % des apports de la journée ; utilisez une partie de sa ration comme récompense.'],
          ['Évaluer sa silhouette', 'Chez un animal au bon poids, on sent les côtes facilement sous la main sans les voir, et la taille se dessine vue de dessus. Pesez-le régulièrement (tous les mois, plus souvent chez le jeune) et suivez la courbe dans Wouf.'],
          ['Changer d’aliment en douceur', 'Toute transition se fait sur environ une semaine à dix jours, en mélangeant de plus en plus de nouvel aliment à l’ancien. Un changement brutal provoque souvent diarrhée ou refus.'],
          ['L’eau, toujours', 'Eau fraîche et propre en permanence. Beaucoup de chats boivent peu : plusieurs points d’eau, éloignés de la gamelle et de la litière, une fontaine et une part d’aliment humide les aident.'],
          ['Le chat ne doit pas jeûner', 'Un chat qui ne mange plus pendant plus d’un à deux jours risque une maladie grave du foie. Ne le mettez jamais à la diète vous-même et consultez s’il boude sa gamelle.'],
          ['Choisir un aliment', 'Préférez un aliment « complet » adapté à l’espèce, à l’âge et à l’activité. Le comparateur de croquettes de Wouf vous aide à comparer les étiquettes (protéines, prix au kilo, ration du jour).']
        ] },
      { e: '🪥', t: 'Hygiène et soins du quotidien', intro: 'Quelques minutes par semaine suffisent, et ces moments renforcent votre complicité.',
        items: [
          ['Les dents', 'Le tartre est très fréquent et douloureux. Le brossage (idéalement plusieurs fois par semaine) avec un dentifrice pour animaux, jamais celui des humains, est le moyen le plus efficace. Faites contrôler la bouche à chaque visite.'],
          ['Les oreilles', 'Regardez-les chaque semaine : rougeur, odeur, cérumen abondant, tête secouée ou penchée méritent une consultation. Nettoyez seulement avec un produit conseillé, sans coton-tige au fond du conduit.'],
          ['Les griffes', 'Des griffes trop longues gênent la marche. Coupez seulement la pointe transparente, sans toucher la partie rose (vivante). En cas de doute, demandez une démonstration à votre vétérinaire ou toiletteur. Un griffoir est indispensable au chat.'],
          ['Le pelage et la peau', 'Le brossage régulier enlève le poil mort, limite les nœuds et, chez le chat, les boules de poils. C’est aussi l’occasion de repérer une puce, une tique, une grosseur ou une plaie.'],
          ['Le bain', 'Rarement nécessaire chez le chat. Pour le chien, utilisez un shampooing pour chien et rincez très bien ; un bain trop fréquent assèche la peau.'],
          ['Les yeux et les coussinets', 'Nettoyez les yeux avec une compresse et du sérum physiologique. Après la balade, vérifiez les coussinets et l’espace entre les doigts (épillets, coupures), surtout en été.']
        ] },
      { e: '🐶', t: 'Chien : 10 erreurs qui abîment sa santé', intro: 'La plupart de ces erreurs viennent de bonnes intentions. Les connaître permet de les éviter facilement.',
        items: [
          ['Donner des restes de table', 'Gras, sel, épices, oignon, ail, chocolat, raisins : plusieurs aliments courants sont dangereux pour le chien. Préférez ses croquettes et de petites friandises adaptées.'],
          ['Trop nourrir', 'Un chien un peu rond est un chien en moins bonne santé (articulations, cœur, espérance de vie). Pesez la ration, comptez les friandises et surveillez son poids régulièrement.'],
          ['Ignorer les dents', 'Tartre et gencives enflammées font mal et peuvent toucher d’autres organes. Le brossage régulier et le contrôle chez le vétérinaire valent mieux qu’un détartrage tardif.'],
          ['Oublier ou repousser les rappels de vaccin et les antiparasitaires', 'Les rappels et les traitements contre puces, tiques et vers protègent le chien, mais aussi votre foyer. Notez les dates dans Wouf pour être prévenu à temps.'],
          ['Sortir en pleine chaleur', 'Trottoir brûlant, midi en été, effort intense : le coup de chaleur guette, surtout chez les chiens à museau court, âgés ou en surpoids. Sortez tôt le matin ou tard le soir et emportez de l’eau.'],
          ['Laisser jouer ou courir juste après le repas', 'Chez certains chiens, surtout les grands gabarits à poitrine profonde, l’effort après un gros repas augmente le risque de torsion d’estomac, une urgence. Laissez un temps de calme avant et après le repas.'],
          ['Se passer de la visite annuelle', 'Beaucoup de problèmes (cœur, reins, dents, articulations) commencent en silence. Un bilan par an, plus fréquent pour un chien senior, permet d’agir tôt.'],
          ['Négliger le poids et les articulations du chiot en croissance', 'Escaliers, sauts répétés et longues courses pendant la croissance sollicitent des articulations encore fragiles. Adaptez l’effort à l’âge et à la race, avec l’avis de votre vétérinaire.'],
          ['Ne jamais vérifier oreilles, pattes et peau', 'Un coup d’œil hebdomadaire aux oreilles, aux coussinets, entre les doigts et sur la peau permet de repérer tôt rougeurs, épillets, plaies ou grosseurs.'],
          ['Attendre trop longtemps devant un symptôme', 'Vomissements répétés, apathie, refus de manger, boiterie qui dure, soif inhabituelle : mieux vaut un appel de trop qu’une consultation trop tardive.']
        ] },
      { e: '🐱', t: 'Chat : 10 erreurs qui abîment sa santé', intro: 'Le chat cache très bien sa douleur : les erreurs passent souvent inaperçues. Voici celles à éviter en priorité.',
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
        ] },
      { e: '🧠', t: 'Comportement et bien-être', intro: 'Un animal épanoui est un animal en meilleure santé. L’éducation se fait uniquement avec des méthodes positives : on récompense ce qui est bien, on ne punit jamais.',
        items: [
          ['Récompenser plutôt que punir', 'Friandise, jeu ou caresse au bon moment : l’animal répète ce qui lui réussit. La punition crée de la peur et abîme la confiance, sans lui apprendre quoi faire à la place. Les leçons de Wouf suivent toutes ce principe.'],
          ['Dépenser le corps et la tête', 'Un chien a besoin de sorties quotidiennes où il peut renifler (le flair le fatigue et l’apaise), jouer et rencontrer. Un chat a besoin de jeux de chasse (plumeau, balle), de hauteur (arbre à chat) et de cachettes.'],
          ['Reconnaître le stress du chien', 'Bâillements répétés, léchage des babines, tête détournée, queue basse, oreilles plaquées, halètement sans chaleur : il se sent mal à l’aise. Éloignez-le calmement de la situation.'],
          ['Reconnaître le stress du chat', 'Cachette prolongée, pipi hors de la litière, toilette excessive (zones sans poils), griffades inhabituelles, perte d’appétit : cherchez ce qui a changé (déménagement, nouvel animal, bruit).'],
          ['Un changement de comportement peut être médical', 'Agressivité soudaine, malpropreté, apathie : la douleur est une cause fréquente. Consultez d’abord le vétérinaire avant de penser « caprice » ou « vieillesse ».'],
          ['La solitude s’apprend', 'Habituez votre animal à rester seul petit à petit, avec des départs courts et sans grandes effusions. Un jouet d’occupation (à remplir de friandises) aide beaucoup.']
        ] },
      { e: '🗓️', t: 'Au fil des saisons', intro: 'Chaque saison apporte ses risques particuliers. Les connaître, c’est déjà les éviter.',
        items: [
          ['Printemps', 'Retour des tiques et des puces : reprenez les traitements. Chenilles processionnaires (pins, chênes) : tenez le chien à l’écart et ne le laissez pas les renifler. Attention aux bulbes et aux engrais du jardin.'],
          ['Été', 'Chaleur et coup de chaleur, bitume brûlant, épillets (graines d’herbes sèches qui se plantent dans les oreilles, le nez, entre les doigts), baignades et eau de mer. Sortez aux heures fraîches et inspectez-le au retour.'],
          ['Automne', 'Champignons sauvages, glands et châtaignes (bogues), pièges à rongeurs installés à cette période. Les journées raccourcissent : un collier lumineux ou réfléchissant rend le chien visible.'],
          ['Hiver', 'Antigel (goût sucré, très toxique), sel de déneigement sur les pattes, froid pour les petits et les seniors. Le chat cherche la chaleur : vérifiez sous le capot de la voiture avant de démarrer.'],
          ['Les fêtes', 'Chocolats, foie gras, restes gras, os de volaille, alcool, guirlandes et rubans : prévenez vos invités. Pour le Nouvel An et le 14 juillet, préparez la maison contre la peur des pétards.']
        ] },
      { e: '👴', t: 'L’animal senior', intro: 'Grâce aux soins, nos compagnons vivent de plus en plus longtemps. Les grands chiens vieillissent plus tôt que les petits ; le chat est souvent considéré comme senior vers 10 ans.',
        items: [
          ['Des visites plus fréquentes', 'Deux bilans par an permettent de détecter tôt les maladies fréquentes du senior (reins, cœur, thyroïde chez le chat, diabète, arthrose) et d’adapter le traitement.'],
          ['Les signes à signaler', 'Boire ou uriner davantage, maigrir en mangeant bien, raideurs au lever, hésitation à sauter ou à monter les escaliers, désorientation, mauvaise haleine : parlez-en à votre vétérinaire.'],
          ['La douleur se soigne', 'L’arthrose n’est pas une fatalité « normale » : des traitements et des aménagements soulagent vraiment. Un animal qui dort plus ou joue moins a peut-être mal.'],
          ['Adapter le quotidien', 'Balades plus courtes et plus fréquentes, tapis antidérapants, rampes, couchage épais et au chaud, litière à bord bas pour le chat, gamelles surélevées si besoin.'],
          ['Adapter l’alimentation', 'Les besoins changent avec l’âge : demandez à votre vétérinaire s’il faut passer à un aliment adapté, surtout en cas de maladie des reins ou de perte de poids.'],
          ['Garder le moral', 'Continuez à jouer et à lui apprendre de petites choses, à son rythme : la stimulation garde l’esprit vif.']
        ] },
      { e: '✈️', t: 'Voyages, garde et déménagement', intro: 'Bien préparé, un changement se passe beaucoup mieux, pour lui comme pour vous.',
        items: [
          ['En voiture', 'Attachez le chien (harnais relié à la ceinture, ou caisse) et transportez le chat en caisse fermée. Faites des pauses toutes les deux heures avec de l’eau, et ne laissez jamais l’animal seul dans la voiture au soleil.'],
          ['Voyager à l’étranger', 'Dans l’Union européenne, votre animal doit être identifié, avoir un passeport européen et un vaccin contre la rage valide. Certains pays ont d’autres exigences : vérifiez les règles de la destination plusieurs semaines à l’avance avec votre vétérinaire.'],
          ['Habituer à la caisse', 'Laissez la caisse ouverte à la maison, avec un plaid et des friandises, pour qu’elle devienne un lieu rassurant bien avant le départ.'],
          ['Faire garder son animal', 'Laissez à la personne ses habitudes, sa nourriture, les coordonnées de votre vétérinaire et son carnet de santé (Wouf l’exporte en PDF). Prévenez votre vétérinaire si besoin.'],
          ['Déménager', 'Le jour J, isolez-le dans une pièce calme. Dans le nouveau logement, gardez le chat quelques jours dans une pièce avec ses affaires avant de lui ouvrir la maison, et mettez à jour l’adresse au fichier d’identification.']
        ] },
      { e: '💶', t: 'Budget et prévention', intro: 'Anticiper les dépenses évite de devoir renoncer à un soin le jour où il est nécessaire.',
        items: [
          ['Les dépenses régulières', 'Alimentation, vaccins, antiparasitaires, visite annuelle, accessoires, garde pendant les vacances : notez-les dans Wouf (« Dépenses ») pour connaître votre vrai budget sur l’année.'],
          ['Les imprévus', 'Accident, maladie, chirurgie : une réserve d’argent mise de côté chaque mois, ou une assurance santé animale, permet de faire face. Avant de souscrire une assurance, comparez les plafonds, les franchises, les exclusions et l’âge limite d’adhésion.'],
          ['La prévention coûte moins cher', 'Vaccins à jour, poids maîtrisé, dents entretenues et visite annuelle évitent une grande partie des soins lourds.']
        ] }
    ],
    outro: 'Dans Wouf : les rappels de vaccins et de traitements, la courbe de poids, le comparateur de croquettes, les leçons d’éducation positive et le carnet de santé à exporter en PDF.' },
  { id: 'secours', e: '🩹', title: 'Les gestes de premiers secours pour son chien', sub: 'Réagir vite et bien en attendant le vétérinaire : étouffement, chaleur, plaies, poison, massage cardiaque',
    intro: 'Les bons gestes, pas à pas, pour les situations où chaque minute compte. Lisez ce guide au calme, avant d’en avoir besoin : le jour J, vous saurez quoi faire. Dans tous les cas, prévenez le vétérinaire au plus vite : ces gestes servent à tenir jusqu’à lui, jamais à le remplacer. Une formation pratique aux premiers secours canins reste le meilleur investissement.',
    chapters: () => [
      { e: '🧭', t: 'Avant tout : se protéger et appeler', intro: 'Un animal qui souffre peut mordre, même le plus doux. Votre sécurité passe en premier.',
        items: [
          ['Sécuriser les lieux', 'Éloignez le danger (route, eau, produit, câble électrique : coupez le courant avant de toucher l’animal). Ne vous mettez jamais en danger.'],
          ['Appeler le vétérinaire ou les urgences vétérinaires', 'Décrivez ce qui se passe, l’âge, le poids et les signes observés. Prévenez de votre arrivée : l’équipe se prépare. L’onglet SOS de Wouf liste les vétérinaires ouverts et de garde autour de vous.'],
          ['Poser une muselière si nécessaire', 'Une muselière, ou une bande ou une laisse nouée autour du museau, évite une morsure de douleur. Jamais en cas de vomissement, de difficulté à respirer ou chez un chien au museau très court.'],
          ['Rester calme et parler doucement', 'Votre calme rassure l’animal et vous aide à faire les bons gestes dans le bon ordre.']
        ] },
      { e: '🩺', t: 'Vérifier les signes vitaux', intro: 'Prenez ces repères au calme, chez vous, sur un animal en bonne santé : vous saurez ce qui est normal pour lui.',
        items: [
          ['La respiration', 'Comptez les mouvements de la cage thoracique pendant 15 secondes et multipliez par 4. Au repos, un chien adulte respire en général entre 10 et 30 fois par minute.'],
          ['Le pouls', 'Placez les doigts à l’intérieur de la cuisse, en haut (artère fémorale), ou contre le thorax derrière le coude. Au repos, il est le plus souvent entre 60 et 140 battements par minute chez l’adulte : plus lent chez les grands chiens, plus rapide chez les petits et les chiots.'],
          ['La température', 'Prise au thermomètre rectal, elle se situe normalement entre 38 °C et 39,2 °C environ. Au-dessus de 40 °C ou en dessous de 37,5 °C : appelez le vétérinaire.'],
          ['Les gencives', 'Elles doivent être roses et humides. Pâles, blanches, bleutées ou rouge vif : urgence. Appuyez une seconde avec le doigt : la couleur doit revenir en moins de 2 secondes.']
        ] },
      { e: '😮‍💨', t: 'Étouffement et corps étranger', intro: 'Signes : le chien panique, se frotte la gueule, tousse, bave, respire avec difficulté ou bruyamment.',
        items: [
          ['Regarder dans la gueule', 'Ouvrez doucement la gueule en tenant la mâchoire du haut. Si l’objet est visible et facile à saisir, retirez-le délicatement. Ne poussez jamais à l’aveugle : vous risquez de l’enfoncer.'],
          ['Petit chien', 'Tenez-le par les cuisses, tête vers le bas, et secouez doucement, ou donnez quelques tapes fermes entre les omoplates.'],
          ['Grand chien', 'Placez-vous derrière lui, entourez son ventre juste sous les côtes avec vos bras, poings fermés, et donnez plusieurs poussées fermes vers le haut et vers l’avant.'],
          ['Ensuite, chez le vétérinaire', 'Même si l’objet est sorti, faites contrôler la gorge et les poumons : des lésions ou un morceau restant sont possibles.']
        ] },
      { e: '🥵', t: 'Coup de chaleur', intro: 'Halètement intense, langue très rouge, bave épaisse, faiblesse, vomissements, chute : c’est une urgence vitale, en particulier pour les chiens au museau court, âgés ou en surpoids.',
        items: [
          ['Mettre à l’ombre et ventiler', 'Installez-le immédiatement au frais, à l’ombre ou dans une pièce climatisée, avec un courant d’air.'],
          ['Refroidir progressivement', 'Mouillez le corps avec de l’eau fraîche, pas glacée, en insistant sur le ventre, l’intérieur des cuisses, les coussinets et le cou. Pas de serviette mouillée posée sur le dos : elle garde la chaleur.'],
          ['Proposer de l’eau, sans forcer', 'S’il est conscient, laissez-le boire de petites quantités d’eau fraîche. Ne versez jamais d’eau dans la gueule d’un chien affaibli.'],
          ['Partir chez le vétérinaire', 'Même s’il semble aller mieux : un coup de chaleur peut abîmer les organes dans les heures qui suivent. Continuez à le rafraîchir pendant le trajet.']
        ] },
      { e: '🩸', t: 'Saignements et plaies', intro: 'L’objectif : arrêter le saignement et éviter l’infection jusqu’à la consultation.',
        items: [
          ['Comprimer', 'Appuyez fermement sur la plaie avec une compresse ou un linge propre, pendant au moins 5 à 10 minutes, sans regarder toutes les 30 secondes.'],
          ['Ne pas retirer la compresse imbibée', 'Si le sang traverse, ajoutez une compresse par-dessus et continuez d’appuyer. Retirer la première rouvrirait la plaie.'],
          ['Bander sans serrer', 'Maintenez la compresse avec une bande, assez serrée pour tenir mais sans couper la circulation : vous devez pouvoir glisser un doigt dessous. Un garrot est réservé aux personnes formées.'],
          ['Petites plaies', 'Rincez abondamment au sérum physiologique ou à l’eau propre. Évitez l’alcool et les produits colorés. Une plaie profonde, une morsure ou une plaie qui saigne encore doit être vue par le vétérinaire.']
        ] },
      { e: '🦴', t: 'Chute, fracture, accident', intro: 'Boiterie soudaine, patte déformée, cri de douleur, impossibilité de se lever.',
        items: [
          ['Ne pas remettre en place', 'N’essayez jamais de réaligner un membre : vous aggraveriez la blessure et la douleur.'],
          ['Limiter les mouvements', 'Gardez le chien au calme. Pour un membre, vous pouvez maintenir une attelle improvisée (journal roulé, carton) avec une bande, sans serrer, si cela ne fait pas souffrir l’animal.'],
          ['Transporter à plat', 'Pour un dos ou un bassin touché, glissez le chien sur une planche, une couverture tendue ou une porte, et déplacez-le le moins possible.'],
          ['Après un choc avec une voiture', 'Consultez même sans blessure visible : les hémorragies internes ne se voient pas tout de suite.']
        ] },
      { e: '☠️', t: 'Empoisonnement', intro: 'Chocolat, raisin, xylitol, médicaments humains, raticide, plantes, produits ménagers : la rapidité change tout.',
        items: [
          ['Ne pas le faire vomir sans avis', 'Faire vomir peut être dangereux (produits corrosifs, objets pointus, animal somnolent). Seul le vétérinaire ou un centre antipoison vétérinaire peut le conseiller.'],
          ['Appeler immédiatement', 'Les numéros des centres antipoison vétérinaires sont dans l’onglet SOS de Wouf. Indiquez le produit, la quantité estimée, l’heure et le poids du chien.'],
          ['Garder l’emballage', 'Apportez l’emballage, la plante ou un échantillon au vétérinaire.'],
          ['Produit sur le pelage ou les yeux', 'Rincez abondamment à l’eau tiède, en vous protégeant les mains, puis appelez.']
        ] },
      { e: '🐍', t: 'Morsures, piqûres et vipères', intro: 'Les gestes diffèrent selon l’origine : restez simple et rapide.',
        items: [
          ['Morsure de vipère', 'Gardez le chien au calme et portez-le si possible pour limiter ses mouvements. Pas de garrot, pas d’incision, pas d’aspiration. Direction le vétérinaire, en urgence.'],
          ['Piqûre de guêpe ou d’abeille', 'Retirez le dard d’abeille en grattant avec une carte, sans pincer. Posez une compresse froide. Gonflement de la tête ou de la gorge, difficulté à respirer : urgence.'],
          ['Morsure d’un autre animal', 'Même petite en surface, elle peut être profonde et s’infecter : rincez, comprimez si elle saigne, et consultez.'],
          ['Tiques', 'Retirez-la avec un tire-tique en tournant, sans écraser le corps. Surveillez fièvre, fatigue ou boiterie dans les jours suivants.']
        ] },
      { e: '⚡', t: 'Convulsions', intro: 'Raideur, pédalage, perte de conscience, bave : c’est impressionnant, mais vos gestes doivent rester simples.',
        items: [
          ['Ne pas mettre la main dans la gueule', 'Le chien ne peut pas avaler sa langue, et il pourrait vous mordre sans le vouloir.'],
          ['Protéger', 'Écartez les meubles et les objets, éloignez-le des escaliers, baissez la lumière et le bruit.'],
          ['Chronométrer', 'Notez l’heure de début et la durée, ou filmez : ces informations aident beaucoup le vétérinaire.'],
          ['Urgence immédiate', 'Si la crise dure plus de 5 minutes, si plusieurs crises se suivent ou s’il ne reprend pas conscience entre elles : partez tout de suite.']
        ] },
      { e: '🎈', t: 'Ventre gonflé : la torsion d’estomac', intro: 'Une urgence absolue, surtout chez les grands chiens au thorax profond (dogue, berger, braque…).',
        items: [
          ['Les signes', 'Ventre qui gonfle et se tend, efforts pour vomir sans rien rejeter, salive abondante, agitation, respiration difficile, faiblesse.'],
          ['Partir immédiatement', 'N’attendez pas que « ça passe » et ne donnez rien à manger ni à boire : seule une intervention vétérinaire rapide peut le sauver. Prévenez la clinique en route.'],
          ['Prévenir', 'Fractionnez les repas, évitez l’exercice intense juste avant et juste après le repas, et parlez-en à votre vétérinaire pour les races à risque.']
        ] },
      { e: '❤️', t: 'Inconscient : vérifier et masser le cœur', intro: 'Ces gestes ne s’improvisent pas bien : une formation pratique est vivement conseillée. Pendant que vous agissez, qu’une autre personne appelle le vétérinaire et prépare le départ.',
        items: [
          ['Vérifier', 'Appelez-le, touchez-le. Regardez si la poitrine se soulève et cherchez le pouls à l’intérieur de la cuisse. Ouvrez la gueule : dégagez ce qui l’encombre et tirez la langue vers l’avant.'],
          ['Position', 'Allongez-le sur le côté, sur une surface ferme. Pour un chien au thorax en tonneau (bouledogue), il peut être placé sur le dos.'],
          ['Les compressions', 'Mains l’une sur l’autre, bras tendus, sur la partie la plus large de la poitrine (au-dessus du cœur, juste derrière le coude, pour un petit chien). Rythme : 100 à 120 compressions par minute, en enfonçant d’un tiers à la moitié de la largeur de la poitrine et en laissant bien remonter.'],
          ['Les insufflations', 'Seul : après 30 compressions, fermez la gueule, soufflez deux fois dans la truffe jusqu’à voir la poitrine se soulever, puis reprenez. Continuez jusqu’à l’arrivée chez le vétérinaire ou la reprise de la respiration.']
        ] },
      { e: '🧰', t: 'La trousse de secours du chien', intro: 'Rangée au même endroit à la maison, et une version réduite dans la voiture pour les balades.',
        items: [
          ['L’essentiel', '', ['Compresses stériles et bandes (dont une bande cohésive)', 'Sérum physiologique en dosettes', 'Antiseptique adapté aux animaux (demandez conseil à votre vétérinaire)', 'Tire-tique et pince à épiler', 'Ciseaux à bouts ronds', 'Thermomètre et gants jetables']],
          ['Pour les urgences', '', ['Muselière à sa taille', 'Couverture de survie', 'Laisse supplémentaire', 'Lampe de poche']],
          ['Les informations', 'Le numéro de votre vétérinaire, celui des urgences de garde et d’un centre antipoison vétérinaire, son poids et ses traitements en cours : tout est dans Wouf, même sans connexion.']
        ] }
    ],
    outro: 'Dans Wouf : l’onglet SOS (vétérinaires ouverts et de garde, toxiques, premiers secours), « Que faire ? » pour évaluer un symptôme, et la fiche d’urgence de votre animal à partager. Ces gestes sont indicatifs et ne remplacent ni le vétérinaire ni une formation pratique.' }
];
const GD = { open: '' };
const guideById = id => GUIDES.find(g => g.id === id);
const gdCount = g => g.chapters().reduce((n, c) => n + c.items.length, 0);
const gdItem = it => `<b>${esc(it[0])}</b>${it[1] ? `<p>${esc(it[1])}</p>` : ''}${it[2] ? `<ul>${it[2].map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
ROUTES.guides = function guides() {
  const back = '<a class="back" href="#/plus">‹</a>', g = guideById(GD.open);
  if (g && (g.free || allowed('guides'))) {
    const ch = g.chapters();
    return `<div class="page-h"><a class="back" href="#/guides" data-act="guide-close">‹</a><h1>${g.e} ${esc(g.title)}</h1></div>
      <section class="card gd"><p>${esc(g.intro)}</p><p class="mut small">${ch.length} chapitres · ${gdCount(g)} fiches · touchez un chapitre pour l’ouvrir</p>
        ${ch.map((c, i) => `<details class="acc-in gd-ch"${i === 0 ? ' open' : ''}><summary><b>${i + 1}. ${c.e} ${esc(c.t)}</b><small class="mut">${c.items.length}</small></summary>${c.intro ? `<p class="mut">${esc(c.intro)}</p>` : ''}<ol class="gd-list">${c.items.map(it => `<li>${gdItem(it)}</li>`).join('')}</ol></details>`).join('')}
        <p>${esc(g.outro)}</p></section>
      <div class="ta-btns"><button class="btn" data-act="guide-close">‹ Les e-books</button></div>
      <p class="mut center small">${GD_NOTE}</p>`;
  }
  return `<div class="page-h">${back}<h1>📚 E-books</h1></div>
    <p class="mut">Trois e-books complets, à lire dans Wouf (même sans connexion) : le guide de survie est gratuit pour tous ; le grand guide santé et les gestes de premiers secours sont inclus dans Wouf Plus.</p>
    <div class="list card menu">${GUIDES.map(x => `<button class="row" data-act="guide-open" data-id="${x.id}"><span class="ico">${x.e}</span><span class="grow"><b>${esc(x.title)}</b><small>${esc(x.sub)} · ${x.chapters().length} chapitres · ${x.free ? 'Gratuit' : allowed('guides') ? 'Wouf Plus ✓' : 'Wouf Plus'}</small></span><span class="chev">${x.free || allowed('guides') ? '›' : '🔒'}</span></button>`).join('')}</div>
    <p class="mut center small">${GD_NOTE}</p>`;
};
/* Accueil : menu déroulant « E-books » (le gratuit, puis celui de Wouf Plus) ; un appui ouvre l'e-book. */
function homeEbooks() {
  const ok = allowed('guides');
  const row = g => `<button class="row" data-act="guide-open" data-id="${g.id}"><span class="ico">${g.e}</span><span class="grow"><b>${esc(g.title)}</b><small>${esc(g.sub)} · ${g.chapters().length} chapitres</small></span><span class="chev">${g.free || ok ? '›' : '🔒'}</span></button>`;
  return `<details class="card acc" id="h-ebooks"${HOME.eb ? ' open' : ''}><summary><b class="grow">📚 E-books</b><small class="mut">1 gratuit · ${GUIDES.filter(g => !g.free).length} Wouf Plus</small></summary>
    <p class="eb-h">🎁 E-book gratuit</p><div class="list menu">${GUIDES.filter(g => g.free).map(row).join('')}</div>
    <p class="eb-h">⭐ E-books Wouf Plus ${ok ? '<span class="pill ok">Débloqué</span>' : '<span class="pill plus">Plus</span>'}</p><div class="list menu">${GUIDES.filter(g => !g.free).map(row).join('')}</div>
    <p class="mut small">À lire dans Wouf, même sans connexion. Contenu indicatif.</p></details>`;
}
document.addEventListener('toggle', e => { if (e.target && e.target.id === 'h-ebooks') HOME.eb = e.target.open; }, true);
ACT['guide-open'] = d => { const g = guideById(d.id); if (!g) return; if (!g.free && !allowed('guides')) return paywall('guides'); GD.open = g.id; track('guide-ouvert', true); if (routeName() !== 'guides') location.hash = '#/guides'; else render(); window.scrollTo(0, 0); };
ACT['guide-close'] = () => { GD.open = ''; render(); window.scrollTo(0, 0); };
