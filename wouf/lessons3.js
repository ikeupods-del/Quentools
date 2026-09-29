/* Wouf Éducation — leçons chien supplémentaires (Wouf Plus), 3ᵉ série. Même méthode : renforcement positif, aucune
   contrainte physique. Chaque leçon : étapes, programme d'entraînement jour par jour, erreurs, dépannage, test. */
LESSONS.push(

{ id: 'stop', free: false, icon: '🛑', cat: 'Sécurité', title: 'Stop et demi-tour d’urgence', from: 12, dur: '5 min × 2 par jour', span: '4 à 8 semaines', level: 'Avancé',
  goal: 'Votre chien s’arrête net au mot « Stop » (assis ou couché, même à distance) et fait demi-tour à côté de vous sur « Demi-tour », pour éviter un danger.',
  why: 'Le rappel demande de venir ; le « Stop » demande de figer. Les deux se complètent : « Stop » quand le chien est loin et qu’une voiture, une route ou un animal approche ; « Demi-tour » quand vous voulez changer de direction sans conflit. Ces réflexes de sécurité doivent être appris à froid, très souvent, et récompensés à chaque fois.',
  need: ['Friandises de haute valeur', 'Longe de 5 à 10 mètres', 'Un espace clos pour commencer', 'Assis et Couché acquis'],
  steps: [
    { t: 'Le demi-tour en laisse', min: 3, b: 'En marchant, dites joyeusement « Demi-tour ! », tournez à 180° et encouragez le chien à vous suivre. Dès qu’il vous a rejoint : « Oui ! » et friandise. Répétez dix fois en variant le moment. Le chien apprend que ce mot annonce un changement de direction agréable.', crit: 'Il tourne avec vous sans tirer, 8 fois sur 10.' },
    { t: 'Le « Stop » à côté de vous', min: 3, b: 'Marchez, dites « Stop » et arrêtez-vous en donnant le signal « Assis » ou « Couché » (au choix, restez constant). Récompensez immédiatement. Après quelques jours, dites « Stop » sans le signal du corps : il doit se figer dans la position choisie.', crit: 'Il s’assoit ou se couche dès le mot « Stop », 8 fois sur 10.' },
    { t: 'Le « Stop » à distance', min: 5, b: 'En espace clos, laissez le chien s’éloigner de 2 mètres, dites « Stop », puis approchez-vous pour récompenser (ne l’appelez pas). Augmentez : 5, 10 mètres. Toujours aller le récompenser en position, puis dire « Libre ! ».', crit: 'Il se fige à 5 mètres, 8 fois sur 10.' },
    { t: 'Le « Stop » en mouvement et en jeu', min: 5, b: 'Demandez « Stop » en pleine course, pendant un jeu, puis pendant qu’il renifle. Récompensez avec un jackpot (plusieurs friandises ou un jeu). Le mot doit être plus payant que tout ce qui l’excite.', crit: 'Il se fige en pleine course, 8 fois sur 10.' },
    { t: 'Sécurité réelle sur longe', min: 10, b: 'En promenade, longe au sol : « Stop » dès que vous voyez un cycliste, un chien lointain ou un obstacle, puis « Demi-tour » si besoin. Faites-le souvent sans danger réel pour que le réflexe reste solide.', crit: 'Il obéit à 10 mètres en présence d’une distraction moyenne.' }
  ],
  plan: [['Jours 1 à 3', 'Demi-tour en laisse : 10 répétitions, 2 fois par jour, à la maison puis au jardin.'], ['Jours 4 à 7', 'Stop à côté de vous, 3 fois par jour, puis à 1 mètre.'], ['Semaines 2 et 3', 'Stop à distance, 2 à 10 mètres en espace clos, avec jackpot.'], ['Semaine 4 et suivantes', 'Sur longe en promenade : un Stop ou un Demi-tour par balade sans raison, récompensé.']],
  next: ['Combiner « Stop » puis « Ici » : figer, puis rappeler.', 'Travailler avec un signal visuel (bras levé) pour les distances où il n’entend pas.', 'Utiliser un sifflet comme signal d’arrêt ou de rappel dans les grands espaces.'],
  mistakes: ['Ne l’entraîner qu’en cas de danger : le réflexe doit être appris à froid.', 'Répéter « Stop, stop, STOP ! » : dites-le une fois, aidez ensuite.', 'Rappeler le chien après le « Stop » sans le récompenser en position.', 'Se fâcher quand il ne s’arrête pas : la distance ou la distraction est trop grande, reculez d’un cran.'],
  faq: [['Il s’arrête mais se relève tout de suite.', 'Récompensez plus vite, et étirez la durée par petits paliers avant de dire « Libre ! ».'], ['Il ignore le Stop quand il court.', 'Vous êtes allé trop vite : recommencez à faible distance et avec des distractions faibles, avec de meilleures récompenses.']],
  test: 'À 10 mètres, sur longe, il se fige au mot « Stop » 8 fois sur 10 en présence d’une distraction moyenne.', safety: 'Un réflexe d’arrêt n’est jamais infaillible : près d’une route, gardez toujours votre chien en laisse.' },

{ id: 'attente', free: false, icon: '🚪', cat: 'Savoir-vivre', title: 'Attendre : la porte, la gamelle, la voiture', from: 10, dur: '3 min × 3 par jour', span: '2 à 4 semaines', level: 'Intermédiaire',
  goal: 'Votre chien attend calmement avant de franchir une porte, de manger ou de sortir de la voiture, jusqu’à ce que vous le libériez.',
  why: 'Ces situations sont pleines d’excitation et de danger : porte d’entrée ouverte, voiture garée près d’une route. L’attente enseigne au chien à se maîtriser à l’instant précis où il en a le plus envie, et lui donne un rituel clair.',
  need: ['Assis et Reste acquis', 'Un mot de libération (« Libre ! »)', 'Friandises, gamelle'],
  steps: [
    { t: 'La gamelle', min: 3, b: 'Tenez la gamelle. Demandez « Assis ». Baissez la gamelle petit à petit : s’il se lève, remontez-la. Quand il reste assis, posez-la, comptez 1 seconde, puis « Libre ! ». Allongez à 5, 10 secondes.', crit: 'Il attend 5 secondes devant la gamelle, 8 fois sur 10.' },
    { t: 'La porte de la maison', min: 3, b: 'Main sur la poignée : s’il se lève, arrêtez. Ouvrez de 5 cm ; s’il avance, refermez. Quand il reste assis porte ouverte, « Libre ! » et passez ensemble. Il apprend que le calme fait ouvrir la porte.', crit: 'Il reste assis porte ouverte, 8 fois sur 10.' },
    { t: 'La voiture', min: 5, b: 'Ouvrez le coffre ou la portière : « Attends ». Dès qu’il reste, « Libre ! » puis laisse. Il ne doit jamais sauter avant votre signal (sécurité près d’une route).', crit: 'Il attend dans la voiture portière ouverte, 8 fois sur 10.' },
    { t: 'Les portes et passages imprévus', min: 5, b: 'Portail, escalier, barrière, ascenseur : « Attends », puis « Libre ! ». Généralisez avec plusieurs personnes de la famille, dans plusieurs lieux.', crit: 'Il attend à 3 endroits différents et avec 2 personnes.' }
  ],
  plan: [['Jours 1 à 3', 'Gamelle : 3 repas par jour avec attente de 1 à 5 secondes.'], ['Jours 4 à 7', 'Porte de la maison : 5 répétitions à chaque sortie.'], ['Semaine 2', 'Voiture et portail, avec la laisse.'], ['Semaine 3', 'Tous les seuils du quotidien, sans friandise mais avec « Libre ! » comme récompense.']],
  next: ['Augmenter l’attente à 30 secondes.', 'Attendre pendant que vous posez la gamelle ailleurs.', 'Faire attendre avec une distraction (enfant qui passe, jouet).'],
  mistakes: ['Laisser sortir le chien dès que la porte s’ouvre « juste cette fois ».', 'Utiliser « Non ! » à la place de récompenser l’attente.', 'Oublier le mot de libération : il ne sait pas quand c’est fini.', 'Exiger l’attente sans avoir travaillé le « Reste ».'],
  faq: [['Il se jette sur la gamelle.', 'Reprenez à l’étape 1 en la retirant dès qu’il bouge. La récompense (la nourriture) arrive uniquement s’il reste calme.'], ['Il saute de la voiture.', 'Commencez à l’arrêt, moteur éteint, sur un sol sûr, et gardez la laisse jusqu’à ce qu’il attende à coup sûr.']],
  test: 'Il attend avant de manger, de passer la porte d’entrée et de sortir de la voiture, 8 fois sur 10.', safety: 'Un chien qui saute de voiture peut se blesser : gardez la laisse tenue tant que l’attente n’est pas fiable.' },

{ id: 'debout', free: false, icon: '🧍', cat: 'Soins', title: 'Debout : un chien facile à examiner', from: 12, dur: '3 min × 2 par jour', span: '2 à 4 semaines', level: 'Utile',
  goal: 'Votre chien se met debout sur signal et reste immobile pendant que vous le touchez, le brossez ou que le vétérinaire l’examine.',
  why: 'Un examen clinique, un toilettage ou une pesée se font debout. Un chien qui sait rester debout, calme, facilite énormément les soins. C’est aussi la base du « travail coopératif » : le chien participe plutôt que de subir.',
  need: ['Friandises', 'Un sol non glissant', 'Assis et Couché acquis'],
  steps: [
    { t: 'Passer de « Assis » à « Debout »', min: 3, b: 'Chien assis, tenez une friandise devant son museau et éloignez-la lentement en avant : il se lève pour la suivre. Marquez dès que les fesses quittent le sol, puis récompensez à hauteur de sa poitrine.', crit: 'Il se lève en suivant la main, 8 fois sur 10.' },
    { t: 'Rester debout', min: 3, b: 'Donnez plusieurs petites friandises à la suite tant qu’il reste debout, puis espacez : toutes les 2, 5, 10 secondes. Ajoutez le mot « Debout ».', crit: 'Il reste debout 10 secondes.' },
    { t: 'Toucher debout', min: 5, b: 'Caressez le dos, les flancs, le ventre, les pattes, tout en le récompensant. Soulevez une patte arrière une seconde, puis regardez sous la queue et sous les oreilles, comme un examen.', crit: 'Il reste debout pendant 5 manipulations.' },
    { t: 'Sur une table ou une balance', min: 5, b: 'Habituez-le à monter sur une balance ou une plateforme basse en restant debout. Jouez au vétérinaire : examen rapide puis grande récompense.', crit: 'Il reste debout sur la balance 10 secondes.' }
  ],
  plan: [['Jours 1 à 3', 'Assis vers debout, 10 répétitions par jour.'], ['Jours 4 à 7', 'Tenir debout 10 secondes avec friandises.'], ['Semaine 2', 'Manipulations debout : dos, pattes, ventre.'], ['Semaine 3', 'Balance et visite « pour rien » chez le vétérinaire.']],
  next: ['Debout à distance : vous vous éloignez de 2 mètres.', 'Debout sur des surfaces instables (coussin) : en lien avec la leçon « Gym du chien ».', 'Poser le menton sur une main comme signal de coopération.'],
  mistakes: ['Le tenir ou le contraindre : il tire pour s’échapper.', 'Exiger un examen long dès le début.', 'Sol glissant : il n’osera pas se tenir stable.', 'Oublier de récompenser l’immobilité.'],
  faq: [['Il se rassoit tout le temps.', 'Récompensez plus tôt, plus souvent, à hauteur de poitrine ; allongez très progressivement.'], ['Il a peur de la balance.', 'Laissez-la posée au sol avec des friandises dessus plusieurs jours avant de lui demander de monter.']],
  test: 'Il reste debout 20 secondes pendant que vous le manipulez comme lors d’un examen.', safety: 'Si un examen provoque de la douleur (dos, hanches), n’insistez pas : consultez.' },

{ id: 'gym', free: false, icon: '🏋️', cat: 'Bien-être', title: 'La gym du chien : équilibre, force et conscience du corps', from: 26, dur: '5 à 10 min × 3 par semaine', span: 'En continu', level: 'Utile',
  goal: 'Votre chien renforce ses muscles, améliore son équilibre et sa coordination avec des exercices simples, sûrs et ludiques.',
  why: 'Un chien musclé et coordonné se blesse moins, vieillit mieux et supporte mieux les balades. Ces exercices « à faible impact » conviennent aux chiens actifs, aux chiens en surpoids et aux seniors, à condition de rester doux et progressifs.',
  need: ['Un coussin d’équilibre ou un oreiller ferme', 'Une planche stable ou un petit escabeau', 'Perches ou bâtons posés au sol (cavaletti)', 'Friandises'],
  steps: [
    { t: 'Échauffement', min: 3, b: 'Cinq minutes de marche au pas, quelques assis-debout, puis des cercles lents à droite et à gauche. Jamais d’exercice sur un chien « froid ».', crit: 'Le chien est actif, détendu, sans boiterie.' },
    { t: 'Les pattes avant sur un support', min: 3, b: 'Guidez le chien à poser les pattes avant sur une planche basse ou un petit coussin, puis récompensez. Ensuite, deux, puis quatre pattes sur le coussin stable.', crit: 'Il monte volontairement sur le support, 8 fois sur 10.' },
    { t: 'Équilibre sur surface instable', min: 5, b: 'Une patte, puis deux, sur un coussin d’équilibre. Récompensez la stabilité. Comptez 5, puis 10 secondes de maintien.', crit: 'Il garde l’équilibre 10 secondes.' },
    { t: 'Cavaletti et slalom', min: 5, b: 'Posez 4 perches au sol à 30 à 60 cm d’écart selon sa taille, et guidez-le au pas pour qu’il lève bien les pattes. Puis slalom lent entre des plots.', crit: 'Il franchit 4 perches sans les toucher, 8 fois sur 10.' },
    { t: 'Reculer et pivoter', min: 5, b: 'Guidez-le à reculer de quelques pas, puis à pivoter sur les pattes arrière autour d’un plot. Exercice très utile pour la conscience du corps.', crit: 'Il recule de 3 pas en ligne droite.' }
  ],
  plan: [['Semaine 1', 'Échauffement + pattes avant sur support, 5 minutes, 3 fois.'], ['Semaine 2', 'Ajouter le coussin d’équilibre, 10 secondes.'], ['Semaine 3', 'Cavaletti à faible hauteur.'], ['Semaine 4 et après', 'Un circuit de 10 minutes, 3 fois par semaine, en alternant les exercices.']],
  next: ['Marcher en arrière sur une pente douce.', 'Ajouter des exercices de force douce (assis-debout répétés).', 'Consulter un physiothérapeute canin pour un programme adapté à une pathologie précise.'],
  mistakes: ['Faire sauter ou courir sur des surfaces glissantes.', 'Commencer sans échauffement.', 'Exercices trop longs ou trop difficiles : une douleur ou un refus est un signal d’arrêt.', 'Pratiquer sur un chiot avant la fin de sa croissance sans avis vétérinaire.'],
  faq: [['Convient-il à un chien âgé ?', 'Oui, avec des exercices très doux (transferts de poids, coussin stable) et l’avis de votre vétérinaire.'], ['Il boite après la séance.', 'Arrêtez, reposez-le et consultez si cela persiste : l’exercice était trop intense.']],
  test: 'Il enchaîne un circuit de 5 exercices en 10 minutes sans stress ni boiterie.', safety: 'Chiot : évitez les sauts et les exercices à fort impact jusqu’à la fin de la croissance (12 à 18 mois selon la race). En cas de pathologie, suivez l’avis de votre vétérinaire.' },

{ id: 'jouets', free: false, icon: '🧸', cat: 'Jeu', title: 'Le nom des jouets : « apporte-moi… » et « range »', from: 12, dur: '5 min × 2 par jour', span: '3 à 8 semaines', level: 'Avancé',
  goal: 'Votre chien connaît le nom de plusieurs jouets, vous apporte celui que vous demandez et sait les ranger dans un panier.',
  why: 'Les chiens peuvent apprendre le nom de nombreux objets. Cet apprentissage stimule le cerveau, renforce la relation et produit un jeu passionnant. Il faut aller très progressivement, un objet à la fois.',
  need: ['Deux ou trois jouets très différents', 'Friandises', 'Un panier ou une caisse', 'Rapport acquis'],
  steps: [
    { t: 'Un seul objet, un seul mot', min: 3, b: 'Choisissez un jouet. Dès que le chien le touche ou le regarde : « Oui ! ». Nommez-le (par exemple « Ours ») en le présentant, puis récompensez. Répétez 20 fois en une semaine, toujours avec le même mot.', crit: 'Il touche le jouet nommé, 8 fois sur 10.' },
    { t: 'Apporter le jouet nommé', min: 3, b: 'Posez le jouet à 1 mètre, dites son nom : « Apporte l’ours ». Récompensez quand il l’apporte, puis donne. Augmentez la distance.', crit: 'Il rapporte le jouet nommé, 8 fois sur 10.' },
    { t: 'Choisir entre deux objets', min: 5, b: 'Posez deux jouets ; répétez le nom du premier ; récompensez le bon choix, ignorez le mauvais. Le chien doit choisir, pas deviner : aidez-le au début.', crit: 'Il choisit le bon jouet parmi 2, 8 fois sur 10.' },
    { t: 'Ranger', min: 5, b: 'Tenez le panier, dites « Range » quand il vous tend un jouet et lâche dans le panier. Récompensez généreusement. Puis éloignez le panier de 1, 2, 3 mètres.', crit: 'Il dépose 3 jouets dans le panier sur signal.' }
  ],
  plan: [['Semaines 1 à 2', 'Un seul jouet, un seul mot : 20 répétitions au total.'], ['Semaines 3 à 4', 'Apporter le jouet nommé, à distance croissante.'], ['Semaines 5 à 6', 'Choisir entre deux jouets.'], ['Semaines 7 et 8', 'Range, puis ajout d’un 3ᵉ et 4ᵉ jouet.']],
  next: ['Apprendre 10 noms d’objets.', 'Ajouter un objet inconnu : « Trouve le nouveau ».', 'Chercher un objet dans une autre pièce (voir Cherche !).'],
  mistakes: ['Changer le mot pour un même jouet.', 'Ajouter trop vite un deuxième jouet.', 'Le gronder quand il se trompe : recommencez plus facilement.', 'Utiliser des jouets qui se ressemblent trop au début.'],
  faq: [['Il apporte toujours le même jouet.', 'Il préfère celui-là : ajoutez le mot différent en pointant du doigt et récompensez seulement le bon choix.'], ['Il mord ou abîme les objets.', 'Utilisez des jouets solides, apprenez « Donne » avant.']],
  test: 'Il apporte 3 jouets différents sur leur nom, 8 fois sur 10.', safety: 'Surveillez les jouets abîmés ou avalables : risque d’obstruction.' },

{ id: 'ressources', free: false, icon: '🍖', cat: 'Émotions', title: 'Partage serein : prévenir la garde de ressources', from: 8, dur: '3 min × 3 par jour', span: '4 à 8 semaines', level: 'Important',
  goal: 'Votre chien accepte qu’on s’approche de sa gamelle, de ses jouets ou de son os, sans tension, et apprend qu’un humain qui approche est une bonne nouvelle.',
  why: 'La garde de ressources (grogner, se raidir, mordre pour garder nourriture, jouet ou endroit) est fréquente et peut être dangereuse, surtout avec des enfants. Elle se prévient en enseignant que l’approche d’une personne fait arriver des choses encore meilleures, jamais l’inverse.',
  need: ['Friandises de haute valeur', 'Gamelle, jouets, os à mâcher', 'Patience et calme'],
  steps: [
    { t: 'Observer les signaux', min: 0, b: 'Regard fixe, corps raide, bouche fermée, chien qui se penche sur la gamelle, grognement : ce sont des signaux d’alerte à respecter. Ne les punissez pas : ils préviennent avant la morsure.', crit: 'Vous savez reconnaître les signaux de votre chien.' },
    { t: 'Approcher en donnant', min: 3, b: 'Pendant qu’il mange, approchez de loin (à la distance où il reste détendu) et lancez une friandise très appétissante dans sa gamelle ou à côté, puis partez. Répétez sur plusieurs jours en réduisant lentement la distance.', crit: 'Il est content de vous voir approcher.' },
    { t: 'Échanger', min: 3, b: 'Proposez une friandise de valeur supérieure contre son jouet ou son os, puis rendez l’objet. Il apprend que donner n’est pas perdre.', crit: 'Il lâche l’objet à l’échange, 8 fois sur 10.' },
    { t: 'Avec plusieurs personnes', min: 5, b: 'Faites participer la famille, un adulte à la fois, en gardant la même consigne. Les enfants ne s’approchent jamais du chien qui mange ou mâche.', crit: 'Il accepte l’approche de 2 personnes, détendu.' }
  ],
  plan: [['Semaine 1', 'Observation des signaux, approche à grande distance avec friandise lancée.'], ['Semaine 2', 'Réduction progressive de la distance, gamelle puis jouets.'], ['Semaines 3 à 4', 'Échange de jouets et d’os.'], ['Semaines 5 à 8', 'Répéter avec toute la famille, en variant les lieux et les objets.']],
  next: ['Consulter un comportementaliste si le chien grogne déjà.', 'Sécuriser la gamelle avec un tapis de fouille.', 'Enseigner « Laisse-le » et « Donne » (leçon dédiée).'],
  mistakes: ['Prendre la gamelle ou l’os de force « pour lui apprendre ».', 'Punir un grognement : il apprendra à mordre sans avertir.', 'Laisser un enfant s’approcher d’un chien qui mange.', 'Ne rien faire en espérant que « ça passe ».'],
  faq: [['Il a déjà mordu pour garder un objet.', 'Consultez sans attendre un vétérinaire comportementaliste ; en attendant, séparez-le pendant les repas et les mastications.'], ['Il garde aussi le canapé ou le lit.', 'Même approche : invitez-le à descendre avec une friandise, ne le tirez jamais ; et limitez l’accès au canapé si nécessaire.']],
  test: 'Il reste détendu quand deux personnes différentes s’approchent de sa gamelle et de son jouet préféré.', safety: 'La garde de ressources peut mener à des morsures : en cas de grognement, de raideur ou de morsure, consultez un professionnel qualifié.' },

{ id: 'bain', free: false, icon: '🛁', cat: 'Soins', title: 'Bain, séchage et toilettage sans stress', from: 8, dur: '3 min × 3 par jour puis séances courtes', span: '3 à 6 semaines', level: 'Utile',
  goal: 'Votre chien accepte le bain, le séchage, le brossage et la tondeuse dans le calme.',
  why: 'Un chien qui a peur de l’eau, du sèche-cheveux ou de la tondeuse vit le toilettage comme une épreuve. En associant chaque étape à des friandises et en avançant très progressivement, on transforme ces soins en moments agréables.',
  need: ['Baignoire ou bac avec tapis antidérapant', 'Shampooing pour chien', 'Sèche-cheveux à faible puissance, tondeuse', 'Friandises, tapis de léchage'],
  steps: [
    { t: 'Le lieu', min: 3, b: 'Placez un tapis antidérapant dans la baignoire à sec. Jetez des friandises dedans : le chien monte, mange, ressort. Puis tapis de léchage fixé au mur avec de la pâtée.', crit: 'Il monte dans la baignoire volontairement.' },
    { t: 'L’eau', min: 5, b: 'Quelques centimètres d’eau tiède, puis le jet doux sur les pattes, sans visage. Récompensez chaque étape. Évitez l’eau dans les oreilles et les yeux.', crit: 'Il reste calme pendant un rinçage de 1 minute.' },
    { t: 'Shampooing et rinçage', min: 5, b: 'Massez doucement, sans frotter fort. Rincez à fond. Le tapis de léchage occupe le chien pendant ce temps.', crit: 'Il supporte un bain complet.' },
    { t: 'Séchage et brosse', min: 5, b: 'Allumez le sèche-cheveux à distance, éteint, puis à faible puissance, air tiède, en récompensant. Rapprochez lentement. Brossez pendant qu’il mange une friandise.', crit: 'Il supporte le séchage 2 minutes.' },
    { t: 'La tondeuse', min: 5, b: 'Présentez-la éteinte, puis allumée à distance, puis sur le manche de la pointe de la patte. Une zone à la fois. En cas de difficulté, passez par un toiletteur formé aux approches douces.', crit: 'Il accepte 1 minute de tondeuse sur le dos.' }
  ],
  plan: [['Jours 1 à 3', 'Baignoire à sec avec friandises.'], ['Semaine 1', 'Un peu d’eau tiède sur les pattes.'], ['Semaine 2', 'Bain complet court et séchage à faible puissance.'], ['Semaine 3 à 6', 'Brossage, tondeuse, séances courtes et régulières.']],
  next: ['Habituer à un toiletteur professionnel (visites de familiarisation).', 'Introduire le nettoyage des oreilles et des yeux.', 'Faire de la baignoire un lieu « pour se détendre » avec un tapis de léchage.'],
  mistakes: ['Jet d’eau froide ou dans la face.', 'Bain trop long dès la première fois.', 'Sèche-cheveux trop chaud ou trop fort.', 'Forcer un chien terrifié : il aura de plus en plus peur.'],
  faq: [['Il s’enfuit dès qu’il voit la baignoire.', 'Retournez à l’étape 1 : la baignoire doit d’abord signifier « friandises ».'], ['Il tremble au sèche-cheveux.', 'Utilisez le mode froid, éteint puis lointain, et allongez lentement.']],
  test: 'Bain complet, séchage et brossage sans stress, avec tapis de léchage.', safety: 'Ne laissez jamais un chien seul dans la baignoire ; pas d’eau dans les oreilles ; vérifiez la température.' },

{ id: 'enfants', free: false, icon: '👨‍👩‍👧', cat: 'Cohabitation', title: 'Chien et enfants : cohabiter en sécurité', from: 8, dur: 'Règles à appliquer chaque jour', span: 'En continu', level: 'Essentiel',
  goal: 'Enfants et chien vivent ensemble dans le respect, sous surveillance, avec des règles simples que chacun comprend.',
  why: 'La plupart des morsures sur enfants viennent du chien de la famille, dans des situations évitables : enfant qui embrasse, serre, réveille ou dérange un chien qui mange. La prévention repose sur des règles claires, la surveillance d’un adulte et le respect des signaux du chien.',
  need: ['Un espace de repos réservé au chien', 'Barrière de sécurité', 'Friandises', 'Un adulte présent'],
  steps: [
    { t: 'Les règles des enfants', min: 0, b: 'Ne pas déranger le chien qui mange, dort ou est dans son coin. Ne pas lui courir après, ne pas grimper dessus, ne pas le serrer ou l’embrasser sur la tête. Caresser doucement sur le dos ou les épaules, après avoir demandé la permission à l’adulte.', crit: 'Les enfants connaissent et appliquent les règles.' },
    { t: 'Les signaux du chien', min: 5, b: 'Apprenez aux enfants à reconnaître : bâillements, léchage de truffe, oreilles en arrière, tête détournée, corps raide, grognement. Le chien qui se détourne veut de l’espace : on le laisse.', crit: 'Un enfant sait citer 3 signaux.' },
    { t: 'Un refuge inviolable', min: 0, b: 'Un panier, une caisse ou une pièce où le chien peut se retirer et où les enfants ne vont jamais. Ce lieu est sacré.', crit: 'Le chien se réfugie spontanément quand il en a besoin.' },
    { t: 'Jeux encadrés', min: 5, b: 'Jeux calmes : rapport, cache-cache de friandises, tours. Pas de jeux de lutte. L’adulte interrompt dès que l’excitation monte. Les enfants donnent les friandises main ouverte, en position assise.', crit: '3 jeux calmes réussis sans excitation excessive.' },
    { t: 'Surveillance et séparation', min: 0, b: 'Un adulte présent à tout moment quand un enfant et le chien sont ensemble, surtout pour les moins de 10 ans. En l’absence de l’adulte, chacun dans son espace, séparés par une barrière.', crit: 'Aucune interaction sans surveillance.' }
  ],
  plan: [['Jour 1', 'Réunion familiale : règles et signaux, affichez-les.'], ['Semaine 1', 'Refuge du chien et barrière installés.'], ['Semaine 2', 'Jeux calmes avec un adulte, séances courtes.'], ['Semaines suivantes', 'Rappel régulier des règles, ajustement selon l’âge des enfants.']],
  next: ['Faire participer l’enfant aux soins : brossage, friandises, rapport.', 'Apprendre à l’enfant à donner des ordres simples au chien.', 'Consulter un comportementaliste si le chien grogne ou se raidit face à un enfant.'],
  mistakes: ['Laisser un jeune enfant seul avec un chien, même très docile.', 'Punir un chien qui grogne : il cachera son signal.', 'Laisser l’enfant embrasser, serrer ou porter le chien.', 'Ne pas offrir de refuge inviolable.'],
  faq: [['Mon chien est très doux : cela suffit-il ?', 'Non : tout chien peut mordre s’il a peur, mal ou est dérangé. La surveillance reste indispensable.'], ['Mon enfant a peur du chien.', 'Ne forcez pas le contact. Laissez-le observer, puis donner une friandise à distance, avec un adulte.']],
  test: 'Les règles sont respectées pendant une semaine, sans situation à risque ni intervention.', safety: 'Ne laissez jamais un nourrisson ou un jeune enfant seul avec un chien. En cas de morsure ou de menace, consultez immédiatement.' },

{ id: 'chat-chien', free: false, icon: '🐱', cat: 'Cohabitation', title: 'Présenter son chien à un chat', from: 12, dur: '10 min × 2-3 par jour', span: '2 à 6 semaines', level: 'Intermédiaire',
  goal: 'Votre chien reste calme en présence du chat et le laisse tranquille, dans la maison comme dehors.',
  why: 'Pour un chien, un chat qui fuit est une proie : le poursuivre est instinctif. Il faut d’abord apprendre au chien à se maîtriser à distance, puis lui donner des récompenses pour le calme. Le chat doit toujours pouvoir s’échapper vers les hauteurs.',
  need: ['Laisse et harnais', 'Barrière, hauteurs pour le chat', 'Friandises, Assis et Place acquis', 'Voir aussi la leçon du chat « Présenter deux animaux »'],
  steps: [
    { t: 'Séparer et échanger les odeurs', min: 0, b: 'Deux espaces distincts. Échangez des couvertures, laissez chaque animal explorer l’odeur de l’autre. Nourrissez de part et d’autre d’une porte fermée.', crit: 'Ils mangent tranquillement de chaque côté.' },
    { t: 'Se voir à travers une barrière', min: 5, b: 'Chien en laisse, assis, derrière une barrière ou une porte vitrée. Récompensez chaque regard calme puis détournement. Le chat garde une porte de sortie.', crit: 'Il regarde le chat sans fixer ni tirer.' },
    { t: 'Rencontre en laisse', min: 5, b: 'Chien en laisse à distance, « Assis » ou « Place », récompenses en continu pour le calme. Le chat peut partir à tout moment. Séances courtes.', crit: 'Il reste calme 5 minutes dans la même pièce.' },
    { t: 'Le « Laisse-le »', min: 5, b: 'Entraînez « Laisse-le » et « Demi-tour » au moindre mouvement du chat. Jamais de poursuite autorisée.', crit: 'Il obéit à « Laisse-le » face au chat en mouvement.' },
    { t: 'Vie commune progressive', min: 0, b: 'Sans laisse, uniquement sous surveillance directe, et jamais seuls ensemble tant que le comportement n’est pas totalement sûr. Le chat dispose de hauteurs et de zones interdites au chien.', crit: 'Cohabitation calme 24 heures sous surveillance.' }
  ],
  plan: [['Semaine 1', 'Séparation et échanges d’odeurs, repas de chaque côté de la porte.'], ['Semaine 2', 'Vue à travers la barrière, chien en laisse.'], ['Semaines 3 à 4', 'Rencontres en laisse, Assis et Place.'], ['Semaines 5 et 6', 'Vie commune progressive et surveillée.']],
  next: ['Renforcer la leçon « Stop et demi-tour d’urgence ».', 'Ajouter des zones hautes pour le chat dans chaque pièce.', 'Consulter un comportementaliste si le chien poursuit ou mord.'],
  mistakes: ['Laisser le chien poursuivre : chaque course renforce le comportement.', 'Coincer le chat dans une pièce sans issue.', 'Punir le chien sans lui apprendre l’alternative.', 'Laisser les deux seuls trop tôt.'],
  faq: [['Il a un très fort instinct de chasse.', 'Ne prenez aucun risque : barrière permanente, sécurité du chat d’abord, et travail avec un éducateur ou comportementaliste.'], ['Le chat est terrorisé.', 'Reprenez à la séparation totale ; le chat doit avoir des hauteurs, des cachettes et le temps de s’habituer.']],
  test: 'Le chien reste calme et ignore le chat pendant 10 minutes, sous surveillance, sans laisse.', safety: 'Un chien qui poursuit ou saisit un chat peut le tuer : surveillance permanente jusqu’à la sécurité prouvée.' },

{ id: 'adolescence', free: false, icon: '🌪️', cat: 'Chiot', title: 'Traverser l’adolescence (6 à 18 mois)', from: 26, dur: 'Quelques minutes, plusieurs fois par jour', span: '6 à 12 mois', level: 'Essentiel',
  goal: 'Vous traversez sans casse la période où le chien « oublie tout » : rappel, propreté, obéissance, énergie.',
  why: 'Comme un adolescent humain, le chien connaît une réorganisation cérébrale entre 6 et 18 mois : hormones, énergie et indépendance en hausse, attention en baisse. Beaucoup de familles abandonnent à cet âge. Ce n’est pas un échec : il faut gérer, simplifier, renforcer et attendre.',
  need: ['Longe', 'Friandises de haute valeur', 'Activités quotidiennes de flair et de jeu', 'Patience'],
  steps: [
    { t: 'Comprendre ce qui se passe', min: 0, b: 'Le chien teste, se disperse, réagit plus fort, redevient parfois « chiot ». C’est normal et temporaire. Il n’est ni têtu ni méchant : son cerveau est en travaux.', crit: 'Vous ne prenez plus ses écarts comme personnels.' },
    { t: 'Revenir aux bases', min: 5, b: 'Reprenez les exercices connus (assis, rappel, laisse) à des niveaux plus faciles, dans des endroits calmes, avec de bonnes récompenses. Réussir sans erreur reconstruit la fiabilité.', crit: 'Il réussit 8 fois sur 10 dans un endroit calme.' },
    { t: 'Sécuriser', min: 0, b: 'Utilisez la longe pour les balades : ne lâchez pas votre chien dans les endroits dangereux pendant cette période, même s’il rappelait bien à 4 mois.', crit: 'Aucun incident de fugue.' },
    { t: 'Dépenser sans surexciter', min: 10, b: 'Reniflage, jeux d’odorat, marches variées, mastication, séances courtes de travail. Évitez les jeux qui excitent (balles répétées) : ils augmentent l’énergie sans fatiguer le cerveau.', crit: 'Il est calme après une activité de flair.' },
    { t: 'Rester régulier et positif', min: 0, b: 'Mêmes règles, mêmes récompenses, aucune punition. Marquez le calme spontané. Cette phase dure quelques mois : les efforts payent ensuite.', crit: 'Progrès visibles après 4 à 6 semaines.' }
  ],
  plan: [['Semaine 1', 'Faites le point : ce qui a régressé. Reprenez à un niveau plus facile.'], ['Semaines 2 à 4', 'Séances courtes quotidiennes de rappel et de laisse, sur longe.'], ['Mois 2 à 3', 'Retour progressif aux distractions moyennes.'], ['Mois 4 et suivants', 'Reprise de la liberté par petites étapes, avec longe en zone risquée.']],
  next: ['Inscrire à un cours pour adolescents.', 'Ajouter un sport canin adapté (pistage, agility léger).', 'Consulter si les comportements deviennent agressifs ou destructeurs.'],
  mistakes: ['Le punir car il « fait exprès » : cela dégrade la relation.', 'Le lâcher trop tôt parce qu’il rappelait bien avant.', 'Augmenter l’exercice au point de créer un chien « accro à l’adrénaline ».', 'Abandonner l’éducation « puisque ça ne marche plus ».'],
  faq: [['Il est stérilisé ou pas : cela change-t-il ?', 'La décision se prend avec le vétérinaire selon la race, la taille et le comportement. Ce n’est pas une solution miracle à l’adolescence.'], ['Combien de temps cela dure-t-il ?', 'Souvent de 6 à 18 mois, parfois plus pour les grandes races.']],
  test: 'Après un mois, il revient sur longe à 10 mètres avec distraction moyenne, 8 fois sur 10.', safety: 'Si l’adolescence s’accompagne de morsures, d’agressivité ou de peurs intenses, consultez un vétérinaire comportementaliste.' },

{ id: 'senior', free: false, icon: '👴', cat: 'Bien-être', title: 'Chien senior : rester en forme et serein', from: 300, dur: '10 min par jour', span: 'En continu', level: 'Essentiel',
  goal: 'Votre chien âgé garde sa mobilité, sa curiosité et son confort, avec un quotidien adapté.',
  why: 'Le vieillissement s’accompagne d’arthrose, de baisse de la vue et de l’ouïe et parfois de troubles cognitifs. Adapter l’environnement, les balades et les activités préserve la qualité de vie. Beaucoup de signes attribués à « l’âge » sont en réalité de la douleur, qui se soigne.',
  need: ['Couchage épais et antidérapant', 'Rampes, tapis antidérapants', 'Activités de flair', 'Suivi vétérinaire régulier'],
  steps: [
    { t: 'Adapter la maison', min: 0, b: 'Tapis sur les sols glissants, rampe pour la voiture ou le canapé, couchage orthopédique, gamelles surélevées si besoin, éclairage la nuit. Un chien qui glisse a peur de bouger.', crit: 'Il se déplace sans glisser.' },
    { t: 'Balades courtes et fréquentes', min: 0, b: 'Deux à trois sorties de 15 à 20 minutes valent mieux qu’une longue. Laissez-le renifler : c’est son activité principale.', crit: 'Il revient de balade détendu, sans boiter.' },
    { t: 'Stimulation mentale douce', min: 5, b: 'Jeux d’odorat, puzzle à friandises, nouveaux petits tours. Le cerveau se conserve comme un muscle.', crit: 'Il participe avec plaisir à 3 activités de flair.' },
    { t: 'Dépister les signes', min: 0, b: 'Boiterie, raideur au lever, essoufflement, soif accrue, perte de poids, désorientation, aboiement nocturne, malpropreté nouvelle : consultez. Beaucoup de solutions existent (antidouleurs, régime, compléments).', crit: 'Bilan vétérinaire tous les 6 mois.' },
    { t: 'Garder les routines', min: 0, b: 'Repas et sorties à heures fixes, mêmes lieux de couchage. Les changements brusques désorientent un chien âgé.', crit: 'Routine quotidienne stable.' }
  ],
  plan: [['Semaine 1', 'Faire le tour de la maison : tapis, rampes, couchage.'], ['Semaine 2', 'Adapter les balades : plus courtes, plus nombreuses.'], ['Semaine 3', 'Ajouter 3 jeux de flair par semaine.'], ['Tous les 6 mois', 'Bilan vétérinaire complet, prise de poids et douleurs.']],
  next: ['Physiothérapie ou hydrothérapie canine.', 'Compléments articulaires sur avis vétérinaire.', 'Aménager un espace de repos au plus près de la famille.'],
  mistakes: ['Attribuer à l’âge une boiterie ou un essoufflement.', 'Réduire trop l’exercice : la fonte musculaire accélère le déclin.', 'Le laisser prendre du poids.', 'Ne pas adapter le sol glissant.'],
  faq: [['Il ne répond plus quand je l’appelle.', 'Une baisse de l’audition est fréquente : utilisez des signaux visuels (main, lumière) et testez la vibration au sol.'], ['Il tourne en rond ou semble perdu.', 'Signes possibles d’un trouble cognitif : consultez, des traitements et des conseils existent.']],
  test: 'Le quotidien est adapté et le bilan vétérinaire des 6 mois est fait.', safety: 'Toute douleur ou changement brutal justifie une consultation, pas d’attente.' },

{ id: 'adoption', free: false, icon: '🏠', cat: 'Adoption', title: 'Adopter un chien adulte : les 3 premières semaines', from: 26, dur: 'Quelques minutes, plusieurs fois par jour', span: '3 semaines à 3 mois', level: 'Essentiel',
  goal: 'Votre chien adopté (refuge, particulier) prend ses marques, se sent en sécurité et révèle progressivement sa personnalité.',
  why: 'Un chien adulte qui arrive dans un nouveau foyer est submergé. On parle souvent de la règle « 3-3-3 » : environ 3 jours pour décompresser, 3 semaines pour comprendre la routine, 3 mois pour se sentir vraiment chez soi. Le respecter évite bien des malentendus et des retours en refuge.',
  need: ['Un espace calme et sûr', 'Le dossier de santé', 'Friandises, patience', 'Un rendez-vous chez le vétérinaire'],
  steps: [
    { t: 'Les 3 premiers jours : décompresser', min: 0, b: 'Peu de visites, peu de sorties nouvelles, un espace calme avec eau, couchage et jouet à mâcher. Ne le forcez à rien. Laissez-le venir. Promenades courtes dans un cadre calme.', crit: 'Il mange, boit et dort.' },
    { t: 'Fixer la routine', min: 0, b: 'Repas, sorties et repos à heures régulières. Une routine rassure. Commencez à utiliser le marqueur « Oui ! » et son nouveau prénom si vous en changez (associé à du positif).', crit: 'Il se repère dans la routine.' },
    { t: 'Sécuriser', min: 0, b: 'Longe et harnais bien ajusté pendant les premières semaines : un chien adopté peut fuguer par peur. Médaille avec vos coordonnées, puce mise à jour à votre nom.', crit: 'Aucune fugue possible.' },
    { t: 'Bilan de santé', min: 0, b: 'Visite chez le vétérinaire dans la première semaine : vaccins, puce, parasites, dents, poids.', crit: 'Bilan de santé effectué.' },
    { t: 'Observer sans juger', min: 0, b: 'Notez ses peurs, ses préférences, ses réactions. Les vrais comportements apparaissent après quelques semaines. Ne le comparez pas à un autre chien.', crit: 'Vous avez un carnet de comportement à jour.' },
    { t: 'Éduquer en douceur', min: 5, b: 'Commencez par les bases : marqueur, attention, laisse, place. Mieux vaut peu, bien et sans pression.', crit: 'Il répond à 3 signaux de base.' }
  ],
  plan: [['Jours 1 à 3', 'Décompression : calme, espace sûr, peu de stimulation.'], ['Semaine 1', 'Routine, bilan vétérinaire, marqueur.'], ['Semaines 2 et 3', 'Bases d’éducation, promenades progressives.'], ['Mois 2 et 3', 'Socialisation douce, solitude, activités.']],
  next: ['Consulter un comportementaliste en cas de peur intense ou d’agressivité.', 'Faire le programme « Nouvel arrivant » de Wouf.', 'Prendre le temps de construire la confiance avant d’élargir les sorties.'],
  mistakes: ['Enchaîner visites, sorties et présentations dès le premier jour.', 'Lâcher le chien sans longe trop tôt.', 'Le comparer à d’autres chiens.', 'Le gronder pour ses peurs.'],
  faq: [['Il ne veut pas manger.', 'Normal les premiers jours. Si cela dure plus de 48 heures, consultez.'], ['Il a des comportements que le refuge ne signalait pas.', 'Fréquent : le stress du refuge masque la personnalité. Accompagnez-le et faites-vous aider si besoin.']],
  test: 'Après 3 semaines : routine installée, bilan de santé fait, 3 signaux de base connus.', safety: 'Un chien adopté avec un passé inconnu doit être présenté prudemment aux enfants et aux autres animaux.' },

{ id: 'vacances', free: false, icon: '🏖️', cat: 'Voyage', title: 'Partir en vacances avec son chien', from: 12, dur: 'Préparation avant le départ', span: '2 à 4 semaines avant', level: 'Utile',
  goal: 'Vous partez en vacances avec votre chien dans de bonnes conditions : papiers, santé, hébergement, chaleur, tiques, sécurité.',
  why: 'Les vacances exposent le chien à de nouveaux risques : chaleur, tiques et maladies, eau salée, foule, hébergements inconnus. Une bonne préparation évite l’urgence vétérinaire en pleine nature.',
  need: ['Passeport européen à jour, puce', 'Trousse de premiers secours', 'Eau, gamelle pliante, tapis', 'Antiparasitaires adaptés'],
  steps: [
    { t: 'Les papiers et les vaccins', min: 0, b: 'Vérifiez identification, vaccin antirabique valide et éventuelles exigences du pays. Renseignez-vous auprès de votre vétérinaire au moins un mois avant un départ à l’étranger.', crit: 'Papiers et vaccins conformes.' },
    { t: 'La santé', min: 0, b: 'Visite avant le départ : antiparasitaires adaptés à la région (tiques, moustiques), traitement contre la piroplasmose ou la leishmaniose selon la zone, médicaments habituels, coordonnées d’une clinique sur place.', crit: 'Visite de départ effectuée.' },
    { t: 'L’hébergement', min: 0, b: 'Vérifiez que les chiens sont admis, avec ou sans supplément. Apportez son couchage et ses jouets. Habituez-le à un lieu inconnu : sorties courtes au début, aucune solitude prolongée.', crit: 'Il dort calmement dans le lieu.' },
    { t: 'Chaleur, eau et plage', min: 0, b: 'Promenades tôt le matin et tard le soir, eau fraîche en permanence, ombre, jamais de voiture fermée. À la plage, rincez à l’eau douce, empêchez-le de boire l’eau de mer, et évitez le sable brûlant.', crit: 'Aucun signe de coup de chaleur.' },
    { t: 'La montagne et la campagne', min: 0, b: 'Vérifiez pattes, oreilles et poil après chaque sortie : tiques, épillets, vipères. Attention aux troupeaux (laisse) et aux chiens de protection.', crit: 'Inspection quotidienne effectuée.' },
    { t: 'Le voyage', min: 0, b: 'Harnais ou caisse attachée, pauses toutes les 2 heures, eau fraîche, jamais laissé seul dans la voiture. Pour l’avion ou le train, vérifiez les conditions de la compagnie.', crit: 'Trajet sans stress ni nausée.' }
  ],
  plan: [['1 mois avant', 'Papiers, vaccins, choix de l’hébergement.'], ['2 semaines avant', 'Visite vétérinaire, antiparasitaires, trousse de secours.'], ['Veille', 'Sac : eau, gamelle, couchage, médicaments, papiers.'], ['Sur place', 'Routine, inspections quotidiennes, sorties adaptées à la chaleur.']],
  next: ['Prévoir un gardien ou une pension si le séjour n’est pas adapté à un chien.', 'Habituer le chien à une pension avec une journée d’essai.', 'Enregistrer une clinique vétérinaire à proximité (voir l’onglet SOS).'],
  mistakes: ['Emmener un chien sans anticiper la chaleur ou les tiques.', 'Le laisser seul dans la voiture ou sur une terrasse en plein soleil.', 'Oublier ses médicaments.', 'Le laisser boire l’eau de mer ou les flaques.'],
  faq: [['Que faire en cas de morsure de tique ?', 'Retirez la tique avec un tire-tique, désinfectez, notez la date et surveillez ; consultez si fièvre, abattement, perte d’appétit.'], ['Mon chien vomit en voiture.', 'Voir la leçon « Voyager en voiture sereinement » et parlez de traitements anti-nausée à votre vétérinaire.']],
  test: 'Le voyage se passe sans incident de santé, avec inspection quotidienne des tiques.', safety: 'Coup de chaleur, morsure de vipère, ingestion toxique : appelez immédiatement un vétérinaire (voir l’onglet SOS).' }

);

PROGRAMS.push(
  { id: 'adopte4', sp: 'dog', icon: '🏠', title: 'Programme nouvel arrivant : 4 semaines', sub: 'Chien adulte adopté : bien démarrer ensemble', weeks: [
    ['Semaine 1', 'Décompresser et sécuriser', ['adoption', 'caisse']],
    ['Semaine 2', 'Créer le lien', ['marqueur', 'manipulations']],
    ['Semaine 3', 'Cadre et calme', ['place', 'attente']],
    ['Semaine 4', 'S’ouvrir au monde', ['laisse', 'ressources']]
  ] },
  { id: 'ado8', sp: 'dog', icon: '🌪️', title: 'Programme adolescence : 8 semaines', sub: 'Garder le cap entre 6 et 18 mois', weeks: [
    ['Semaines 1 à 2', 'Comprendre et sécuriser', ['adolescence', 'stop']],
    ['Semaines 3 à 4', 'Maîtrise de soi', ['attente', 'reste']],
    ['Semaines 5 à 6', 'Sortir sereinement', ['rappel', 'congeneres']],
    ['Semaines 7 à 8', 'Dépenser intelligemment', ['nosework', 'gym']]
  ] },
  { id: 'senior4', sp: 'dog', icon: '👴', title: 'Programme chien senior : 4 semaines', sub: 'Confort, mobilité et complicité après 6 ans', weeks: [
    ['Semaine 1', 'Adapter le quotidien', ['senior']],
    ['Semaine 2', 'Doux entretien du corps', ['gym', 'debout']],
    ['Semaine 3', 'Stimuler l’esprit', ['nosework', 'jouets']],
    ['Semaine 4', 'Soins sans stress', ['manipulations', 'bain']]
  ] }
);
