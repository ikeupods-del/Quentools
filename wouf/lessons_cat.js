/* Wouf Éducation — leçons pour chats. Principes : environnement adapté, renforcement positif, respect du rythme du chat,
   aucune punition (elle augmente le stress et les comportements indésirables). Pour un problème de comportement
   (marquage urinaire, agressivité, malpropreté soudaine), consultez d'abord un vétérinaire : la douleur et les
   maladies (cystite, maladie rénale, hyperthyroïdie) sont des causes fréquentes. */

const PRINCIPLES_CAT = [
  ['Un environnement adapté : les 5 piliers', 'Un chat équilibré a : un endroit sûr où se cacher et se reposer, plusieurs ressources séparées (gamelles, eau, litières, couchages, griffoirs), des occasions de jouer et de chasser, des interactions positives avec vous, et le respect de son odorat (évitez parfums et produits ménagers forts, gardez ses odeurs). C’est la base de sa santé et de son comportement.'],
  ['Ne jamais punir', 'Crier, asperger d’eau ou secouer un chat ne lui apprend rien d’autre que la peur : il ne fait pas le lien avec l’acte, se cache et devient méfiant. Redirigez vers ce qui est permis (griffoir, jouet) et récompensez.'],
  ['Récompenser ce qu’on veut revoir', 'Petites friandises, jeu, caresses (s’il les aime). Le chat s’entraîne très bien avec un marqueur (clicker) et des récompenses de valeur (thon, poulet, pâtée) : séances de 2 à 3 minutes, avant les repas.'],
  ['Lire son langage', 'Queue haute = confiance ; oreilles en arrière, pupilles dilatées, queue qui fouette = tension. Un chat qui vous regarde en clignant lentement des yeux est détendu ; il s’en va quand il n’en peut plus : respectez-le.'],
  ['Le jeu est vital', 'Le chat est un chasseur : il a besoin de séquences complètes (guetter, poursuivre, bondir, attraper). Deux à trois séances de 5 à 10 minutes par jour avec une canne à pêche évitent l’ennui, l’obésité et les comportements destructeurs.'],
  ['Les changements se font doucement', 'Déménagement, nouveau meuble, nouveau bac, nouvel animal : introduisez-les progressivement et gardez ses repères (odeurs, routines). Les chats détestent l’imprévu.'],
  ['Surveillez la santé', 'Toute modification du comportement (litière, appétit, toilettage, agressivité, cachette) peut être un signe de douleur ou de maladie. Consultez avant d’attribuer cela à un « caprice ».']
];

LESSONS.push(

/* ------------ gratuites ------------ */
{ id: 'c-litiere', sp: 'cat', free: true, icon: '🚽', cat: 'Bases', title: 'Litière : les bons réglages', from: 4, dur: 'Réglages une fois, entretien quotidien', span: '1 à 2 semaines', level: 'Essentiel',
  goal: 'Votre chat utilise sa litière de façon fiable, et vous savez repérer les signes de problème urinaire.',
  why: 'Un chat est naturellement propre : la malpropreté est presque toujours liée à un problème de litière (emplacement, propreté, texture) ou à un problème de santé ou de stress. Ajuster les conditions est plus efficace que toute « éducation ».',
  need: ['Un bac par chat, plus un', 'Litière minérale agglomérante non parfumée', 'Une pelle, un endroit calme'],
  steps: [
    { t: 'Le bon bac, la bonne litière', min: 0, b: 'Un bac grand (environ 1,5 fois la longueur du chat), à bords bas pour un chaton ou un chat âgé, découvert pour commencer (beaucoup de chats préfèrent). Litière agglomérante non parfumée, sur 5 à 7 cm d’épaisseur. Évitez de changer de marque brutalement.', crit: 'Le chat entre facilement dans le bac.' },
    { t: 'Le bon emplacement', min: 0, b: 'Un endroit calme, accessible en permanence, loin de la gamelle et de l’eau, sans passage ni bruit (machine à laver). Avec plusieurs chats : bacs à des endroits différents, pas côte à côte.', crit: 'Aucun refus d’utiliser le bac.' },
    { t: 'Présenter le bac', min: 0, b: 'Après les repas, le réveil ou le jeu, déposez le chaton dans le bac et laissez-le gratter. Ne le forcez pas ; ne lui tenez pas les pattes. Félicitez calmement quand il utilise le bac.', crit: 'Il utilise le bac sans aide 8 fois sur 10.' },
    { t: 'L’entretien qui compte', min: 0, b: 'Retirez les selles et les boulettes urinaires une à deux fois par jour, complétez la litière, videz et lavez à l’eau chaude et au savon doux toutes les 1 à 2 semaines. N’utilisez jamais d’eau de Javel ni de produits parfumés.', crit: 'Le bac est propre en permanence.' },
    { t: 'Nettoyer les accidents', min: 0, b: 'Nettoyez les accidents avec un produit enzymatique (pas d’ammoniaque : l’urine en contient). Ne le grondez pas. Placez un bac à cet endroit ou protégez la zone pendant quelques jours.', crit: 'Plus aucun accident pendant 2 semaines.' }
  ],
  mistakes: ['Punir ou mettre le nez dans l’urine : le chat ne fait pas le lien et devient craintif.', 'Utiliser un bac couvert trop petit ou une litière parfumée.', 'Un seul bac pour deux chats.', 'Ne pas consulter quand le problème est soudain.'],
  faq: [['Il urine hors du bac soudainement.', 'Consultez sans tarder : cystite, calculs, infection, maladie rénale ou diabète en sont des causes fréquentes.'], ['Mon chat mâle va souvent dans la litière sans rien faire.', 'Urgence : un blocage urinaire peut être mortel en quelques heures. Voir l’onglet SOS.'], ['Il gratte autour du bac.', 'Le bac est peut-être sale, trop petit ou la litière ne lui convient pas. Essayez une autre texture.']],
  test: 'Deux semaines sans accident, avec un bac propre et facile d’accès.', safety: 'Tout changement soudain de miction (fréquence, effort, sang, cris) est une urgence potentielle.' },

{ id: 'c-griffoir', sp: 'cat', free: true, icon: '🐾', cat: 'Bases', title: 'Griffoir : préserver les meubles', from: 8, dur: '5 min × 2 par jour au début', span: '1 à 3 semaines', level: 'Essentiel',
  goal: 'Votre chat utilise ses griffoirs plutôt que le canapé.',
  why: 'Griffer est un besoin vital : le chat entretient ses griffes, s’étire, marque son territoire (par les glandes des coussinets) et se détend. On ne peut pas l’empêcher, mais on peut lui offrir de meilleures options que vos meubles. La griffe (onyxectomie) est interdite en France, et douloureuse : la solution est le griffoir.',
  need: ['Plusieurs griffoirs stables de matières différentes (sisal, carton, bois)', 'Une friandise ou une canne à jouer', 'Ruban adhésif double face ou film pour protéger temporairement'],
  steps: [
    { t: 'Un griffoir haut, stable, bien placé', min: 0, b: 'Vertical, assez haut (80 cm ou plus) pour s’étirer de tout son long, si stable qu’il ne bouge pas. Placez-le là où il griffe déjà, près de son couchage et dans les lieux de passage. Ajoutez un griffoir horizontal si besoin.', crit: 'Le griffoir ne bouge pas quand il s’y appuie.' },
    { t: 'L’encourager', min: 3, b: 'Frottez ou grattez le griffoir devant lui, glissez une friandise dans la texture, jouez avec une canne à jouer autour. Félicitez dès qu’il griffe, ou récompensez.', crit: 'Il griffe le griffoir spontanément.' },
    { t: 'Rendre le canapé moins attractif', min: 0, b: 'Placez le griffoir devant l’endroit abîmé, couvrez temporairement le meuble (ruban adhésif double face, film ou tissu épais). Ne retirez la protection que lorsque l’habitude est prise.', crit: 'Il n’abîme plus le meuble.' },
    { t: 'Multiplier les options', min: 0, b: 'Un griffoir par pièce de vie, différents supports. Les chats aiment griffer au réveil : placez-en un près de leur lieu de sommeil.', crit: 'Il utilise 2 griffoirs différents chaque jour.' },
    { t: 'Entretenir les griffes', min: 3, b: 'Coupez les pointes des griffes toutes les 2 à 3 semaines si besoin (voir la leçon des soins).', crit: 'Griffes régulièrement entretenues.' }
  ],
  mistakes: ['Un griffoir trop petit, léger ou qui bascule.', 'Le gronder ou l’asperger d’eau.', 'Retirer le griffoir usé : les chats aiment qu’il porte leur odeur.', 'Envisager l’ablation des griffes : c’est interdit et cruel.'],
  faq: [['Il griffe les meubles de nuit.', 'C’est un signe d’ennui ou de besoin de jeu : jouez le soir et laissez des griffoirs près de son couchage.'], ['Il ignore le griffoir en carton.', 'Essayez le sisal ou le bois, vertical et plus grand.']],
  test: 'Une semaine sans nouveau dégât, avec au moins un griffoir utilisé chaque jour.', safety: '' },

/* ------------ Plus ------------ */
{ id: 'c-accueil', sp: 'cat', free: false, icon: '🏡', cat: 'Chaton', title: 'Arrivée du chaton : les 7 premiers jours', from: 7, dur: 'Quelques minutes, plusieurs fois par jour', span: '1 à 3 semaines', level: 'Essentiel',
  goal: 'Votre chaton se sent en sécurité, mange, utilise sa litière, explore et apprend à aimer la vie avec vous.',
  why: 'Entre 2 et 9 semaines environ, le chaton est très réceptif : ce qu’il vit positivement (manipulations, bruits, visiteurs, transport) le rend plus serein toute sa vie. Une arrivée réussie repose sur un espace réduit et sûr au début, et un rythme calme.',
  need: ['Une pièce « sas » avec litière, eau, nourriture, couchage, cachette', 'Jouets variés', 'Le carnet de santé et la puce (obligatoire)'],
  steps: [
    { t: 'Une pièce-refuge', min: 0, b: 'Installez le chaton dans une seule pièce au début : bac (loin des gamelles), eau, nourriture, couchage, cachette (boîte, panier couvert). Laissez-le sortir de la caisse de transport à son rythme.', crit: 'Il mange, boit et utilise le bac.' },
    { t: 'Le rythme des jours 1 à 3', min: 0, b: 'Restez près de lui sans le forcer. Laissez-le venir. Parlez doucement. Gardez la nourriture qu’il connaissait, faites une transition sur 7 jours si vous changez.', crit: 'Il vient vers vous de lui-même.' },
    { t: 'Explorer la maison', min: 0, b: 'Après 2 à 4 jours, ouvrez la porte et laissez-le explorer, sous surveillance. Sécurisez : câbles, plantes toxiques (lys), fenêtres et balcons, petits objets, sacs en plastique, ficelles.', crit: 'Il explore la maison sans stress.' },
    { t: 'Manipulations et socialisation douce', min: 5, b: 'Chaque jour, quelques minutes : caresses, patte prise 1 seconde, oreille effleurée, brosse, transport. Associez chaque geste à une friandise. Invitez des visiteurs calmes ; faites entendre les bruits du quotidien à faible volume.', crit: 'Il accepte d’être manipulé calmement.' },
    { t: 'Le premier rendez-vous chez le vétérinaire', min: 0, b: 'Dans les premiers jours : contrôle de santé, vermifuge, vaccins selon le protocole, puce. Habituez-le à la caisse avant : voir la leçon « Caisse de transport ».', crit: 'Consultation faite dans les 7 jours.' }
  ],
  mistakes: ['Le laisser dans toute la maison dès le premier jour.', 'Le forcer à câliner ou le sortir de sa cachette.', 'Le laisser jouer avec les mains : il apprendra à mordre et griffer.', 'Oublier de sécuriser fenêtres et balcons.'],
  faq: [['Il se cache et ne mange pas.', 'C’est fréquent les premières heures. S’il ne mange rien après 24 heures (chaton), consultez.'], ['Il pleure la nuit.', 'Il cherche la chaleur et la compagnie : bouillotte tiède enveloppée, vêtement à votre odeur, veilleuse. Ne le punissez pas.']],
  test: 'Au bout de 7 jours : il mange, utilise le bac, explore, vient chercher des câlins et a été vu par le vétérinaire.', safety: 'Chaton non vacciné : pas de contact avec des chats inconnus ni sorties tant que le protocole n’est pas terminé.' },

{ id: 'c-transport', sp: 'cat', free: true, icon: '🧳', cat: 'Soins', title: 'Caisse de transport et vétérinaire sans stress', from: 8, dur: '3 min × 2 par jour', span: '2 à 4 semaines', level: 'Essentiel',
  goal: 'Votre chat entre dans sa caisse sans résistance et supporte le trajet et la consultation avec un stress réduit.',
  why: 'Beaucoup de chats détestent la caisse parce qu’elle n’apparaît que pour aller chez le vétérinaire. En la laissant en permanence à disposition, comme un couchage, elle devient un abri familier, et les visites deviennent bien plus simples pour tout le monde.',
  need: ['Une caisse rigide, ouvrable par le dessus, avec fermeture solide', 'Une serviette ou couverture à son odeur', 'Friandises, spray à phéromones (facultatif)'],
  steps: [
    { t: 'La caisse fait partie de la maison', min: 0, b: 'Sortez la caisse en permanence dans une pièce de vie, porte ouverte (ou dessus retiré). Mettez un tissu à son odeur, quelques friandises, un jouet. Il doit s’y coucher spontanément.', crit: 'Il entre et s’y détend.' },
    { t: 'Repas dans la caisse', min: 3, b: 'Placez sa gamelle près, puis dedans. Ensuite, fermez la porte quelques secondes pendant qu’il mange.', crit: 'Il mange porte fermée.' },
    { t: 'Fermer et soulever', min: 3, b: 'Fermez la porte, soulevez la caisse 1 seconde, reposez, ouvrez et récompensez. Puis marchez quelques pas, puis d’une pièce à l’autre.', crit: 'Il est calme quand on le porte.' },
    { t: 'La voiture', min: 5, b: 'Attachez la caisse sur la banquette avec la ceinture, couvrez-la d’un tissu. Faites des trajets courts (1 à 5 minutes) suivis d’un moment agréable (jeu, friandise) à la maison.', crit: 'Il supporte 10 minutes de trajet sans stress.' },
    { t: 'Chez le vétérinaire', min: 0, b: 'Demandez une clinique « cat friendly » si possible. Gardez le chat dans la caisse en salle d’attente, couverte, hors de vue des chiens. Laissez-le sortir de lui-même dans la salle de consultation. Faites des visites de familiarisation (pesée, friandises).', crit: 'Consultation calme.' }
  ],
  mistakes: ['Sortir la caisse seulement pour le vétérinaire.', 'Attraper le chat par la peau du cou ou le pousser de force.', 'Le laisser se promener libre en voiture.', 'Choisir une caisse dont il faut le sortir de force par le dessus sans pouvoir l’ouvrir.'],
  faq: [['Il se cache à la vue de la caisse.', 'Elle est associée aux mauvais souvenirs. Rangez-la à nouveau en place, laissez-la ouverte plusieurs semaines avec friandises et couchage.'], ['Il miaule tout le trajet.', 'Couvrez la caisse, roulez doucement, utilisez des phéromones ; si le stress est intense, parlez à votre vétérinaire de solutions adaptées.']],
  test: 'Il entre seul dans la caisse et supporte 10 minutes de voiture sans stress.', safety: 'Jamais de chat libre en voiture : risque d’accident pour tous.' },

{ id: 'c-jeu', sp: 'cat', free: true, icon: '🪶', cat: 'Bien-être', title: 'Jeu et enrichissement : la chasse simulée', from: 8, dur: '5 à 10 min × 2-3 par jour', span: 'En continu', level: 'Essentiel',
  goal: 'Votre chat dépense son énergie de chasseur chaque jour, est moins destructeur, moins gras et plus équilibré.',
  why: 'Le chat est un prédateur : guetter, traquer, poursuivre, bondir, attraper, manger. Un chat d’appartement qui ne peut jamais accomplir cette séquence s’ennuie, grossit, griffe les meubles et peut devenir agressif ou anxieux. Le jeu avec une canne à pêche est le meilleur moyen de la compléter.',
  need: ['Canne à pêche à plumes ou fils', 'Petites proies (souris, balles), tunnel, boîtes', 'Distributeurs de nourriture ludiques, friandises'],
  steps: [
    { t: 'Simuler la proie', min: 5, b: 'Faites bouger le jouet comme une proie : se cacher, s’enfuir, s’arrêter, courir au sol, ne jamais venir vers lui. Laissez-le guetter, bondir, rater, réessayer.', crit: 'Il chasse avec entrain.' },
    { t: 'Finir par une capture et un repas', min: 5, b: 'À la fin, laissez-le attraper la proie. Puis offrez une petite friandise ou un repas. Cela conclut la séquence de chasse et l’apaise.', crit: 'Il s’apaise et se toilette après la séance.' },
    { t: 'Au moins 2 à 3 séances par jour', min: 0, b: 'Matin, soir, avant le coucher. 5 à 10 minutes. Le soir, jouez avant le repas pour que la digestion suive l’effort.', crit: 'Séances quotidiennes régulières.' },
    { t: 'Nourrir en le faisant travailler', min: 0, b: 'Distribuez une partie des croquettes dans des balles à croquettes, tapis de fouille, boîtes en carton. Cachez-les à différents endroits. Le chat chasse, mange de plusieurs petits repas.', crit: 'Il cherche sa nourriture.' },
    { t: 'Varier et sécuriser', min: 0, b: 'Roulez les jouets, alternez-les chaque semaine. Rangez les cannes à pêche après le jeu (ficelles dangereuses). Proposez des hauteurs (arbre à chat, étagères) et des fenêtres avec vue.', crit: 'Environnement stimulant et sûr.' }
  ],
  mistakes: ['Utiliser vos mains ou pieds comme jouets : il apprend à mordre et griffer les gens.', 'Laisser la canne à pêche ou les ficelles en libre accès.', 'Utiliser un pointeur laser sans jamais l’achever sur un objet à attraper : source de frustration.', 'Toujours les mêmes jouets : il s’en lasse.'],
  faq: [['Il n’est pas intéressé.', 'Essayez d’autres matières (plumes, papier, ficelle courte), de nouvelles vitesses, ou jouez à un autre moment de la journée. Un chat âgé apprécie des mouvements plus lents.'], ['Il devient agressif pendant le jeu.', 'Il est trop excité ou vous utilisez vos mains. Passez à une canne plus longue, arrêtez le jeu, et n’enseignez jamais à mordre.']],
  test: 'Deux séances par jour depuis une semaine, avec une conclusion en capture et récompense.', safety: 'Surveillez les chats qui ingèrent des fils ou des rubans : chirurgie possible.' },

{ id: 'c-cible', sp: 'cat', free: false, icon: '🎯', cat: 'Complicité', title: 'Clicker et cible : viens, assis, touche', from: 10, dur: '2 à 3 min × 2 par jour', span: '2 à 4 semaines', level: 'Débutant',
  goal: 'Votre chat vient à l’appel, touche une cible avec le nez et s’assoit sur demande, avec plaisir.',
  why: 'Contrairement à une idée reçue, les chats s’entraînent très bien avec un marqueur (clicker) et des récompenses de valeur. Ces jeux stimulent son intelligence, renforcent votre complicité et facilitent les soins (caisse, pesée, déplacement).',
  need: ['Un clicker (ou le mot « Oui »)', 'Friandises minuscules et très appétissantes (thon, poulet, pâtée)', 'Une cible (baguette, cuillère en bois)'],
  steps: [
    { t: 'Charger le clicker', min: 2, b: 'Cliquez, donnez une friandise immédiatement. 10 à 15 fois, sans rien demander. Il doit se tourner vers la friandise au clic.', crit: 'Il regarde vers la friandise dès le clic.' },
    { t: 'Toucher la cible avec le nez', min: 2, b: 'Présentez la cible à quelques centimètres de son nez. Il la renifle : clic, friandise. Répétez, éloignez de quelques centimètres, puis déplacez la cible pour qu’il la suive.', crit: 'Il touche la cible 8 fois sur 10.' },
    { t: 'Viens : le rappel', min: 2, b: 'Choisissez un son (« Viens » ou un tintement). Appelez à 1 mètre, récompensez à l’arrivée. Augmentez : autre pièce, autre étage. Ne l’appelez jamais pour un soin désagréable sans récompense.', crit: 'Il vient de l’autre pièce, 8 fois sur 10.' },
    { t: 'Assis avec la cible', min: 3, b: 'Montez la cible au-dessus de sa tête : il s’assoit naturellement pour la suivre. Clic, récompense. Ajoutez le mot.', crit: 'Il s’assoit à la demande.' },
    { t: 'Utiliser la cible dans la vie réelle', min: 0, b: 'Guidez-le vers la caisse, sur la balance, vers un autre lieu, à l’aide de la cible. Facilite tous les soins.', crit: 'Il suit la cible dans une autre pièce.' }
  ],
  mistakes: ['Séances trop longues : 2 à 3 minutes suffisent.', 'Récompenses peu intéressantes : utilisez la nourriture qu’il préfère.', 'S’entraîner juste après un repas.', 'Le forcer à participer : s’il s’éloigne, arrêtez.'],
  faq: [['Il n’aime pas le bruit du clicker.', 'Utilisez le mot « Oui » ou un clic plus doux (stylo), ou couvrez le clicker d’un tissu.'], ['Il est distrait ou passif.', 'Entraînez-vous avant un repas, dans une pièce calme, avec de meilleures friandises.']],
  test: 'Il vient à l’appel, touche la cible et s’assoit à la demande, 8 fois sur 10.', safety: '' },

{ id: 'c-soins', sp: 'cat', free: false, icon: '🪮', cat: 'Soins', title: 'Soins et manipulations : brossage, griffes, comprimé', from: 8, dur: '3 min × 2 par jour', span: '3 à 6 semaines', level: 'Essentiel',
  goal: 'Votre chat accepte d’être brossé, d’avoir les griffes coupées, d’être examiné et de prendre un comprimé sans stress.',
  why: 'Un chat habitué tôt aux manipulations, avec des récompenses, supporte bien mieux les soins et les visites chez le vétérinaire. C’est aussi indispensable pour donner un traitement le jour où il sera malade.',
  need: ['Brosse adaptée à son poil', 'Coupe-griffes pour chat', 'Friandises très appétissantes', 'Éventuellement une serviette'],
  steps: [
    { t: 'Les caresses ciblées', min: 2, b: 'Chat détendu, caressez les zones qu’il aime (joues, menton), puis progressivement le dos, les pattes, le ventre s’il l’accepte. Chaque geste est suivi d’une friandise.', crit: 'Il accepte le toucher des pattes 3 secondes.' },
    { t: 'Le brossage', min: 3, b: 'Présentez la brosse, laissez-la renifler. Un coup de brosse : friandise. Puis 3, 5, 10 coups. Chat à poil long : brossage quotidien pour éviter les nœuds.', crit: 'Il accepte 1 minute de brossage.' },
    { t: 'Les griffes', min: 3, b: 'Prenez une patte, appuyez doucement sur le coussinet pour sortir la griffe. Ne coupez que la pointe transparente (évitez la partie rosée où passent vaisseaux et nerfs). Une griffe à la fois, friandise après chaque.', crit: 'Il laisse couper 2 à 3 griffes calmement.' },
    { t: 'Le comprimé', min: 3, b: 'Entraînez-vous à vide : ouvrir doucement la gueule (pouce et index de chaque côté), poser une friandise sur la langue, refermer, caresser la gorge, récompenser. Puis avec une friandise-support (pâte à comprimé) ou un applicateur si votre vétérinaire le conseille.', crit: 'Il avale une friandise-test sans résistance.' },
    { t: 'Yeux, oreilles, dents', min: 3, b: 'Nettoyez le coin des yeux avec une compresse humide, les oreilles avec le produit adapté (sans coton-tige), brossez les dents avec un dentifrice pour chat sur le doigt ou une brosse douce.', crit: 'Il accepte les 3 soins en 1 minute.' }
  ],
  mistakes: ['Le tenir de force : il associe les soins à la contrainte et griffe ou mord.', 'Couper trop près de la partie rose des griffes.', 'Attendre qu’il soit malade pour lui donner un comprimé.', 'Utiliser de la nourriture qu’il n’aime pas comme récompense.'],
  faq: [['Il griffe ou mord lors des soins.', 'Arrêtez, revenez à un palier plus facile. S’il est agressif de façon inhabituelle, il a peut-être mal : consultez.'], ['Il crache les comprimés.', 'Demandez à votre vétérinaire un format liquide, injectable ou en pâtée adaptée.']],
  test: 'Il accepte brossage, coupe d’une griffe et examen de la gueule sans stress.', safety: 'Un chat qui se laisse faire subitement moins, ou qui ne se toilette plus, peut souffrir : consultez.' },

{ id: 'c-cohabitation', sp: 'cat', free: false, icon: '🤝', cat: 'Cohabitation', title: 'Présenter deux animaux : chat/chat, chat/chien', from: 12, dur: '10 min × 2-3 par jour', span: '2 à 6 semaines', level: 'Intermédiaire',
  goal: 'Deux animaux apprennent à cohabiter dans le calme, sans bagarre ni stress.',
  why: 'Le chat est territorial : une rencontre brusque provoque peur et agressivité. Une introduction progressive, par les odeurs d’abord, puis la vue, puis le contact, multiplie les chances d’entente. Il n’existe pas de règle de durée : on avance au rythme de l’animal le plus craintif.',
  need: ['Une pièce séparée pour le nouvel arrivant', 'Deux bacs, deux gamelles, des cachettes et des hauteurs', 'Barrière ou porte entrouverte, friandises', 'Une laisse pour le chien'],
  steps: [
    { t: 'Séparer et échanger les odeurs', min: 0, b: 'Nouvel arrivant dans une pièce à part, avec toutes ses ressources. Échangez les couvertures ou frottez un tissu sur les joues de chacun puis présentez-le à l’autre. Nourrissez-les de chaque côté de la porte fermée, à distance qu’ils tolèrent.', crit: 'Ils mangent calmement de part et d’autre de la porte.' },
    { t: 'Se voir à travers une barrière', min: 5, b: 'Ouvrez la porte de quelques centimètres ou installez une barrière haute ou une porte vitrée. Chat/chien : le chien est en laisse, assis, récompensé pour son calme. Séances de quelques minutes, terminez avant tout signe de tension.', crit: 'Ils se voient sans souffler, ni grogner, ni fixer.' },
    { t: 'Premiers contacts contrôlés', min: 10, b: 'Laissez-les se rencontrer sous surveillance, avec de la place pour fuir, des hauteurs et deux issues. Distrayez avec le jeu ou des friandises. Séparez calmement à la moindre tension, sans crier.', crit: 'Rencontre de 10 minutes sans tension.' },
    { t: 'Alterner les territoires', min: 0, b: 'Chacun explore l’espace de l’autre à tour de rôle. Multipliez ressources (bacs, gamelles, couchages, perchoirs) pour éviter la compétition.', crit: 'Ils se croisent sans conflit.' },
    { t: 'Vie commune progressive', min: 0, b: 'Augmentez peu à peu le temps commun. Ne les laissez pas seuls ensemble tant que vous n’êtes pas sûr. Chien : renforcez « Laisse-le » et « Place », ne le laissez jamais poursuivre le chat.', crit: 'Ils cohabitent seuls 10 minutes sans souci.' }
  ],
  mistakes: ['Forcer la rencontre « pour qu’ils s’arrangent entre eux ».', 'Punir celui qui souffle ou grogne : c’est un avertissement normal.', 'Un seul bac, une seule gamelle : source de conflits.', 'Laisser un chien qui poursuit le chat sans intervenir.'],
  faq: [['Ils se battent.', 'Séparez-les calmement (bruit fort, planche), reprenez à l’étape précédente, et consultez un comportementaliste si cela se répète.'], ['Le chat urine hors du bac depuis l’arrivée.', 'Stress ou territoire menacé : ajoutez des bacs, des cachettes, et consultez votre vétérinaire.']],
  test: 'Ils partagent la maison sans tension pendant 24 heures sous surveillance.', safety: 'Ne laissez jamais un chien et un chat seuls ensemble tant que la cohabitation n’est pas prouvée sûre.' }

);

PROGRAMS.push(
  { id: 'chaton4', sp: 'cat', icon: '🐱', title: 'Programme chaton : 4 semaines', sub: 'Un chaton confiant, propre et équilibré', weeks: [
    ['Semaine 1', 'Bien arriver', ['c-accueil', 'c-litiere']],
    ['Semaine 2', 'Griffes et jeu', ['c-griffoir', 'c-jeu']],
    ['Semaine 3', 'Soins et voyages', ['c-transport', 'c-soins']],
    ['Semaine 4', 'Complicité et vie à plusieurs', ['c-cible', 'c-cohabitation']]
  ] }
);
