'use strict';
/* Wouf — quiz de validation des leçons, écrits à la main (3 questions par leçon, fidèles au contenu de la leçon).
   Format : [question, BONNE réponse, mauvaise réponse, mauvaise réponse, explication affichée après la réponse].
   Les réponses sont mélangées à l'affichage. Règles (contrôlées par `npm run check`) : une seule bonne réponse sans ambiguïté,
   des mauvaises réponses clairement fausses selon la leçon, jamais de méthode punitive présentée comme bonne.
   Série 1 : leçons chien des fichiers lessons.js, lessons2.js, lessons3.js. */
const QUIZZES = {
  marqueur: [
    ['Que doit toujours suivre le « Oui ! » ?', 'Une friandise, donnée aussitôt', 'Une caresse, seulement si le chien est calme', 'Rien : le mot suffit une fois appris', 'Le « Oui ! » annonce toujours une récompense : c’est ce qui lui donne sa valeur.'],
    ['Votre chien ne réagit pas à son prénom. Que faire ?', 'Ne pas répéter : faire un petit bruit ou s’éloigner, puis récompenser le regard', 'Répéter son prénom de plus en plus fort jusqu’à ce qu’il se retourne', 'Le gronder fermement pour qu’il comprenne qu’il doit vous écouter', 'Répéter le prénom lui apprend à l’ignorer. On le dit une fois, puis on l’aide.'],
    ['Pourquoi ne jamais utiliser le prénom pour gronder ?', 'Il doit rester associé au positif pour devenir un signal d’attention fiable', 'Parce qu’un chien ne reconnaît pas vraiment son prénom avant ses 2 ans', 'Parce que le prénom ne doit servir que pour le rappel en balade', 'Un prénom associé à du positif devient la base du rappel.']
  ],
  assis: [
    ['Comment guider le chien vers l’assis ?', 'Monter lentement la friandise au-dessus de sa tête, vers l’arrière', 'Appuyer doucement sur sa croupe pour l’aider à comprendre la position', 'Tenir la friandise très haut pour qu’il se dresse sur ses pattes', 'La tête se lève, l’arrière-train descend naturellement : pas besoin de toucher le chien.'],
    ['Quand ajouter le mot « Assis » ?', 'Quand il s’assoit déjà bien en suivant le geste', 'Dès la toute première séance, en le répétant plusieurs fois', 'Jamais : le geste suffit toute sa vie', 'On associe le mot à un comportement déjà acquis, en le disant une seule fois.'],
    ['Qu’est-ce qui fait perdre le lien entre l’assis et la récompense ?', 'Donner la friandise trop tard', 'Dire « Oui ! » au moment où les fesses touchent le sol', 'Récompenser près du museau', 'La récompense doit arriver dans la seconde pour que le chien comprenne ce qui est récompensé.']
  ],
  proprete: [
    ['Quand sortir un chiot pour ses besoins ?', 'Au réveil, après les repas, les siestes et le jeu', 'Uniquement trois fois par jour, à heures fixes', 'Seulement quand il gratte à la porte', 'Le chiot ne sait pas encore « demander » : c’est la routine de sorties qui évite les accidents.'],
    ['Quand le récompenser ?', 'Dans les 3 secondes, sur place, dès qu’il a fini', 'Une fois rentré à la maison, pour ne pas le distraire dehors', 'Le soir, s’il n’a eu aucun accident de toute la journée', 'Une récompense tardive ou à la maison n’est pas reliée au besoin fait dehors.'],
    ['Vous découvrez un accident après coup. Que faire ?', 'Nettoyer sans un mot avec un nettoyant enzymatique', 'Lui mettre le nez dedans pour qu’il comprenne', 'Le gronder en lui montrant l’endroit', 'Punir après coup lui apprend seulement à se cacher pour faire ses besoins.']
  ],
  coucher: [
    ['Où donner la friandise quand il se couche ?', 'Au sol, entre ses pattes', 'En hauteur, devant son museau', 'Dans sa gamelle, après la séance', 'Récompenser au sol évite qu’il se relève pour attraper la friandise.'],
    ['Votre chien ne se couche pas en suivant la main. Quelle astuce ?', 'Le « tunnel » : le faire passer sous vos genoux', 'Appuyer doucement sur son dos', 'Tirer ses pattes avant vers l’avant', 'Pour atteindre la friandise sous vos genoux, il rampe, puis se couche : c’est lui qui choisit la position.'],
    ['Un chien qui a soudain du mal à se coucher…', 'Peut avoir mal : il faut consulter', 'Est têtu : il faut insister', 'Doit être entraîné plus longtemps', 'Une difficulté soudaine peut venir des hanches, des coudes ou du dos.']
  ],
  reste: [
    ['Que sont les « trois D » du Reste ?', 'Durée, distance, distraction : une seule à la fois', 'Douceur, discipline et détermination du maître', 'Départ, destination et demi-tour pendant la marche', 'On augmente un seul critère à la fois, sinon le chien échoue.'],
    ['Pendant un Reste, comment récompenser ?', 'Revenir jusqu’au chien et le récompenser en position', 'L’appeler vers vous pour lui donner la friandise', 'Lui lancer la friandise de loin', 'L’appeler lui apprend à se lever : on va le récompenser sur place, puis « Libre ! ».'],
    ['Votre chien se lève pendant le Reste. Qu’en conclure ?', 'Vous êtes allé trop vite : recommencez plus court', 'Il vous défie : il faut le gronder pour se faire respecter', 'Il faut répéter « Reste » plus fort jusqu’à ce qu’il obéisse', 'Une erreur signale une difficulté trop grande, pas de la désobéissance.']
  ],
  rappel: [
    ['Votre chien revient enfin, après plusieurs minutes. Que faire ?', 'Le féliciter et le récompenser généreusement', 'Le gronder pour le retard', 'L’ignorer pour lui montrer votre mécontentement', 'Punir au retour apprend que revenir est désagréable : le rappel s’effondre.'],
    ['Pourquoi utiliser une longe au début ?', 'Pour qu’il n’apprenne pas à ignorer le rappel', 'Pour le tirer vers vous à chaque appel', 'Parce qu’un chien ne doit jamais être libre', 'La longe évite les échecs ; si vous devez tirer, l’exercice est trop difficile.'],
    ['Le rappel doit-il toujours signifier la fin de la balade ?', 'Non : après la récompense, on le relâche souvent', 'Oui, sinon il croit que la balade continue sans fin', 'Non, mais il faut éviter de le récompenser à l’arrivée', 'Si revenir met toujours fin au plaisir, le chien hésitera à revenir.']
  ],
  laisse: [
    ['La laisse se tend. Que faire ?', 'S’arrêter complètement et repartir quand elle se détend', 'Donner un petit coup sec pour corriger', 'Continuer à avancer pour ne pas s’énerver', 'Laisse tendue = on s’arrête, laisse détendue = on avance : tirer ne fonctionne plus.'],
    ['Pourquoi le chien tire-t-il en laisse ?', 'Parce que tirer le fait avancer : ça marche', 'Parce qu’il veut dominer son maître', 'Parce qu’il manque de fermeté', 'Le chien répète ce qui fonctionne. On inverse la règle.'],
    ['Quel matériel éviter pour apprendre la marche détendue ?', 'La laisse à enrouleur', 'Le harnais bien ajusté', 'Une laisse fixe de 2 mètres', 'Avec l’enrouleur, la laisse est toujours tendue : le chien apprend à tirer.']
  ],
  'laisse-le': [
    ['Votre chien renifle votre poing fermé. Quand récompenser ?', 'Dès qu’il s’écarte, même une seconde', 'Quand il arrête de lécher pendant une minute', 'Jamais : il doit comprendre seul', 'On marque l’instant où il se détourne, avec une friandise de l’autre main.'],
    ['Il s’enfuit avec une chaussette. Que faire ?', 'Proposer un échange, sans lui courir après', 'Le poursuivre pour la récupérer au plus vite', 'Le gronder fermement', 'Courir après lui transforme la scène en jeu ; l’échange évite la course et la garde.'],
    ['Pourquoi rendre parfois l’objet après « Donne » ?', 'Pour qu’il comprenne que donner n’est pas perdre', 'Pour qu’il le garde plus longtemps la prochaine fois', 'Parce qu’on ne peut rien lui prendre', 'Un chien qui craint de perdre l’objet le garde plus fermement, voire mord.']
  ],
  place: [
    ['Où déposer la friandise quand il est sur son tapis ?', 'Sur le tapis', 'À côté du tapis, pour qu’il en sorte', 'Dans votre main, en l’appelant', 'Le chien apprend que c’est le tapis qui « paie ».'],
    ['Comment utiliser le tapis ?', 'Comme un endroit agréable, jamais comme une punition', 'Comme un coin de pénitence quand il fait une bêtise', 'Uniquement quand il y a des visiteurs', 'Un tapis associé à la punition devient source de stress.'],
    ['Comment le chien sait-il que la Place est finie ?', 'Grâce au mot de libération « Libre ! »', 'Quand vous quittez la pièce sans rien dire', 'Quand il décide lui-même qu’il en a assez', 'Sans signal de fin clair, il ne sait pas quand il peut bouger.']
  ],
  solitude: [
    ['Comment augmenter la durée de solitude ?', 'Par petits paliers, en revenant avant qu’il stresse', 'D’un coup : il s’habituera', 'En partant en cachette pour éviter les adieux', 'L’objectif est qu’il ne se stresse jamais ; si c’est le cas, on revient au palier d’avant.'],
    ['Vous rentrez et découvrez des dégâts. Que faire ?', 'Ne pas punir : il associerait votre retour à la peur', 'Le gronder en lui montrant les dégâts', 'L’enfermer dans une pièce pour qu’il réfléchisse', 'La punition au retour aggrave l’anxiété de séparation.'],
    ['Quel signe montre que vous allez trop vite ?', 'Gémissements, halètement, salivation', 'Il dort pendant votre absence', 'Il vous accueille calmement', 'Ces signes de détresse imposent de revenir à la durée précédente.']
  ],
  socialisation: [
    ['Votre chiot se fige devant un objet nouveau. Que faire ?', 'Augmenter la distance et le laisser observer', 'Le porter jusqu’à l’objet pour qu’il s’habitue', 'Le forcer à le toucher', 'Socialiser, c’est offrir des expériences positives à son rythme, jamais le confronter.'],
    ['Faut-il attendre la fin des vaccins pour socialiser ?', 'Non : on socialise en sécurité (dans les bras, à la maison, en voiture)', 'Oui, sinon il risque d’attraper des maladies graves', 'Non, mais uniquement avec des chiens inconnus au parc', 'La période sensible est en cours dès les premières semaines : on agit sans prendre de risque sanitaire.'],
    ['Quels chiens choisir pour les premières rencontres ?', 'Des adultes connus, équilibrés et vaccinés', 'Le plus de chiens inconnus possible au parc', 'Des chiens très joueurs qui le bousculent', 'Une mauvaise rencontre peut créer une peur durable.']
  ],
  manipulations: [
    ['Que faire si le chien se raidit pendant un toucher ?', 'Revenir à une étape plus facile', 'Le tenir fermement jusqu’à ce qu’il se calme', 'Continuer pour qu’il s’habitue', 'Le raidissement signale que vous êtes allé trop vite.'],
    ['À quoi sert le « menton dans la main » ?', 'À lui donner le choix : s’il retire la tête, on s’arrête', 'À l’empêcher de bouger la tête pendant tout le soin', 'À vérifier rapidement l’état de ses dents et de sa gueule', 'Donner du contrôle au chien le rend plus coopératif.'],
    ['Quel dentifrice utiliser ?', 'Un dentifrice spécial chien', 'Un dentifrice pour enfants', 'N’importe quel dentifrice sans menthe', 'Le dentifrice humain est toxique pour le chien.']
  ],
  sauter: [
    ['Il saute sur vous. Réaction recommandée ?', 'Tourner le dos sans parler, jusqu’aux 4 pattes au sol', 'Le repousser fermement avec les deux mains', 'Lever le genou pour le décourager de recommencer', 'Repousser ou crier, c’est de l’attention ; le genou peut blesser.'],
    ['Quelle alternative lui apprendre ?', 'S’asseoir pour obtenir l’attention', 'Aboyer une fois pour saluer poliment', 'Se coucher sur le dos devant la personne', 'Un chien qui sait que l’assis fait venir l’attention l’essaiera d’abord.'],
    ['Pourquoi toute la famille doit-elle appliquer la règle ?', 'L’incohérence entretient le saut', 'Pour que le chien obéisse à un seul maître', 'Ce n’est pas nécessaire', 'Si certains récompensent le saut, il continue de sauter.']
  ],
  mordillements: [
    ['Les dents du chiot touchent votre main trop fort. Que faire ?', 'Dire « Aïe » calmement et arrêter le jeu quelques secondes', 'Lui tenir la gueule fermée quelques secondes', 'Lui donner une petite tape sur le bout du nez', 'On reprend la règle de la fratrie : le jeu trop fort s’arrête.'],
    ['Un chiot mord beaucoup le soir. Cause fréquente ?', 'Il manque de sommeil', 'Il cherche à dominer', 'Il a trop mangé', 'Un chiot dort 18 à 20 heures par jour ; fatigué, il mord davantage.'],
    ['Quelle règle de jeu retenir ?', 'Des dents sur le jouet, jamais sur la peau', 'Les jeux de lutte avec les mains sont conseillés', 'On le laisse mordiller jusqu’à 1 an', 'Rediriger vers un jouet donne une alternative claire.']
  ],
  caisse: [
    ['Comment rendre la caisse agréable ?', 'Friandises et repas dedans, porte ouverte au début', 'L’y enfermer quand il fait une bêtise', 'L’y mettre pour la première fois le jour du voyage', 'La caisse doit être un refuge, jamais une punition.'],
    ['Il aboie dans la caisse. Quand ouvrir ?', 'Après un court moment de calme', 'Tout de suite, pour qu’il se calme', 'Jamais avant le lendemain', 'Ouvrir pendant les aboiements lui apprend que crier ouvre la porte.'],
    ['Pour un chiot, combien de temps en caisse au maximum ?', 'Environ 1 heure par mois d’âge', 'Toute la journée si besoin', 'Aucune limite s’il est calme', 'La caisse ne remplace pas la présence ni les sorties.']
  ],
  voiture: [
    ['Par où commencer l’habituation ?', 'Voiture à l’arrêt, moteur éteint, avec des friandises', 'Un long trajet d’emblée, pour qu’il s’y fasse vite', 'Un premier trajet directement chez le vétérinaire', 'On commence par l’étape la plus facile pour éviter l’association voiture = stress.'],
    ['Comment le transporter en sécurité ?', 'Harnais attaché à la ceinture ou caisse arrimée', 'Libre sur la banquette arrière, fenêtre ouverte', 'Sur les genoux du passager avant, pour le rassurer', 'Un chien non attaché est un danger pour lui et pour les passagers.'],
    ['Pour limiter le mal des transports ?', 'Pas de gros repas 2 à 3 heures avant le trajet', 'Un bon repas juste avant de partir, pour le caler', 'Fermer toutes les fenêtres pendant tout le trajet', 'Un estomac plein favorise les nausées ; aérez et faites des pauses.']
  ],
  aboiements: [
    ['Première étape pour réduire les aboiements ?', 'Identifier ce qui les déclenche et ce qu’il obtient', 'Crier « Tais-toi ! » dès le premier aboiement', 'Acheter un collier anti-aboiement pour aller plus vite', 'La stratégie dépend de la cause : alerte, exigence, ennui, peur…'],
    ['Comment apprendre « Chut » ?', 'Récompenser les secondes de silence, puis ajouter le mot', 'Lui tenir la gueule fermée quand il aboie', 'Répéter « Chut » en boucle pendant qu’il aboie', 'On capture le silence et on l’étire progressivement.'],
    ['Il aboie pour réclamer. Que faire ?', 'Ne pas répondre et récompenser le silence', 'Céder de temps en temps pour avoir la paix', 'Le gronder à chaque aboiement', 'Céder parfois est le meilleur moyen de renforcer l’aboiement d’exigence.']
  ],
  visiteurs: [
    ['Comment « vider » l’effet de la sonnette ?', 'Sonnette = friandise, sans rien demander', 'Gronder dès qu’il aboie à la sonnette', 'Débrancher la sonnette pour toujours', 'On associe la sonnette à du positif avant de lui demander autre chose.'],
    ['Quel rôle donner au chien quand on sonne ?', 'Aller sur sa Place', 'Courir à la porte', 'Aboyer pour prévenir', 'Un comportement clair et incompatible avec le saut et l’aboiement.'],
    ['Quand ouvrir la porte au visiteur ?', 'Quand le chien est calme', 'Pendant qu’il aboie, pour aller vite', 'Seulement après l’avoir enfermé à clé', 'Ouvrir pendant qu’il aboie ou saute le récompense.']
  ],
  pied: [
    ['Où récompenser pendant la marche au pied ?', 'À hauteur de votre cuisse, du côté choisi', 'Derrière votre jambe, pour qu’il reste en retrait', 'Devant vous, à un bon mètre de distance', 'Récompenser au bon endroit lui apprend où se placer.'],
    ['Quand exiger le pied ?', 'Par courtes séances, pas pendant toute la balade', 'Pendant toute la promenade, sans exception', 'Uniquement en courant, pour qu’il reste concentré', 'C’est un exercice intense : le reste de la balade reste détendu.'],
    ['Par quoi commencer les tournants ?', 'À petite vitesse', 'En courant pour le surprendre', 'Sans laisse dans la rue', 'La vitesse vient après la précision.']
  ],
  rapport: [
    ['Il revient avec le jouet mais ne le lâche pas. Que faire ?', 'Proposer un second jouet ou une friandise en échange', 'Lui arracher le jouet de la gueule d’un coup', 'Lui courir après jusqu’à ce qu’il le lâche', 'Donner mène à jouer davantage : il lâchera volontiers.'],
    ['Pourquoi limiter le nombre de lancers ?', 'Pour éviter l’usure articulaire et la surexcitation', 'Parce que le chien se lasse toujours vite', 'Parce qu’il faut toujours le fatiguer au maximum', 'Trop de lancers peut aussi créer une obsession de la balle.'],
    ['Il ne rapporte pas. C’est parce qu’il…', 'N’a pas encore compris que revenir est payant', 'Est têtu et cherche à vous tester', 'Veut garder le jouet pour vous dominer', 'On construit chaque maillon : prendre, tenir, revenir, donner.']
  ],
  nosework: [
    ['Pourquoi les jeux d’odorat sont-ils précieux ?', 'Ils fatiguent le cerveau et apaisent', 'Ils remplacent toutes les balades', 'Ils rendent le chien plus excité', 'Le flair est son sens principal : 5 à 10 minutes suffisent.'],
    ['L’exercice est trop dur et il abandonne. Que faire ?', 'Simplifier pour qu’il réussisse', 'Lui montrer la cachette du doigt', 'Arrêter les jeux d’odorat', 'Il doit toujours réussir ; en lui montrant la cachette, il n’apprend pas à chercher.'],
    ['Quelle friandise choisir ?', 'Une friandise très odorante', 'Une friandise sans odeur', 'Un aliment interdit, pour la motivation', 'Plus l’odeur est forte, plus la recherche est facile au début.']
  ],
  tours: [
    ['Pour « Donne la patte », quand dire « Oui ! » ?', 'Dès que la patte décolle', 'Quand vous avez soulevé la patte vous-même', 'Après 10 secondes patte levée', 'On marque le premier mouvement, sans forcer la patte.'],
    ['Sur quel sol apprendre « Roule » ?', 'Un tapis moelleux', 'Un carrelage bien lisse', 'Du gravier ou du béton', 'Un sol dur ou glissant rend l’exercice inconfortable.'],
    ['Quand éviter « Roule » ?', 'Chien âgé, arthrosique, ou grand chien juste après le repas', 'Le matin, avant la première balade de la journée', 'Quand le chien est parfaitement calme et détendu', 'Rotation et repas copieux ne font pas bon ménage chez les grands chiens.']
  ],
  bruits: [
    ['Comment désensibiliser au bruit ?', 'Volume presque inaudible, associé à des friandises', 'Volume fort d’emblée, pour qu’il s’habitue plus vite', 'Le laisser seul dans une pièce avec l’enregistrement', 'Le bruit doit prédire les bonnes choses, sans jamais faire peur.'],
    ['Il halète et tremble pendant la séance. Que faire ?', 'Revenir au volume précédent', 'Monter le son', 'Le gronder pour qu’il se calme', 'Ces signes montrent que le seuil est dépassé.'],
    ['Soir de feu d’artifice : que faire ?', 'Rester avec lui, volets fermés, refuge accessible', 'Le laisser dans le jardin', 'Le sortir de sa cachette pour le rassurer', 'Un chien paniqué peut fuguer ou se blesser.']
  ],
  congeneres: [
    ['Qu’est-ce que la « distance-seuil » ?', 'La distance où il voit l’autre chien en restant calme', 'La distance maximale que permet la laisse', 'La distance à partir de laquelle il se met à aboyer', 'On travaille là où il peut encore manger et réfléchir.'],
    ['Comment croiser un autre chien ?', 'En courbe, à distance, jamais de face', 'De face, pour qu’il s’habitue', 'Laisse tendue, pour garder le contrôle', 'L’approche de face et la laisse tendue augmentent la tension.'],
    ['Il aboie après un chien. Que faire ?', 'Reculer sans un mot : vous étiez trop près', 'Le punir pour qu’il comprenne', 'Le rapprocher pour qu’ils se disent bonjour', 'Punir associe l’autre chien à quelque chose de désagréable et aggrave le problème.']
  ],
  museliere: [
    ['Quelle muselière choisir ?', 'Une muselière panier, qui permet de haleter et boire', 'Une muselière en tissu qui ferme la gueule', 'N’importe laquelle, du moment qu’elle tient', 'Un chien qui ne peut pas haleter risque le coup de chaleur.'],
    ['Comment faire entrer le museau ?', 'En glissant une friandise par l’avant', 'En la mettant de force, rapidement', 'En attachant d’abord la sangle', 'Le chien doit y mettre le museau volontairement.'],
    ['Quand l’utiliser pour la première fois ?', 'Après l’avoir conditionnée, jamais au dernier moment', 'Le jour du vétérinaire, sans préparation', 'Seulement quand il a mordu', 'Mise de force au dernier moment, elle devient un symbole de stress.']
  ],
  stop: [
    ['Quelle différence entre « Stop » et le rappel ?', 'Le rappel fait venir, le Stop fait figer', 'Aucune, ce sont deux mots pour la même chose', 'Le Stop ne sert qu’à la maison', 'Le Stop sert quand le chien est loin et qu’un danger approche.'],
    ['Après un Stop à distance, comment récompenser ?', 'Aller le récompenser en position', 'L’appeler vers vous', 'Attendre la fin de la balade', 'L’appeler lui apprendrait à ne pas rester figé.'],
    ['Quand entraîner le Stop ?', 'Souvent, à froid, sans danger réel', 'Uniquement en cas de danger', 'Une fois par mois', 'Un réflexe de sécurité s’apprend à froid, très souvent.']
  ],
  attente: [
    ['À la porte, il se lève quand vous ouvrez. Que faire ?', 'Refermer calmement la porte', 'Le laisser sortir pour cette fois', 'Dire « Non ! » plusieurs fois', 'Il apprend que c’est le calme qui fait ouvrir la porte.'],
    ['Pourquoi l’attente en voiture est-elle importante ?', 'Sauter avant le signal peut être dangereux près d’une route', 'Pour qu’il apprenne à bien garder la voiture', 'Pour éviter qu’il salisse le coffre avec ses pattes', 'Il ne sort qu’après « Libre ! », laisse tenue.'],
    ['Que faut-il avoir travaillé avant ?', 'Le « Reste »', 'Le rapport', 'Les tours', 'L’attente s’appuie sur la maîtrise de soi du « Reste ».']
  ],
  debout: [
    ['Comment faire lever le chien de l’assis ?', 'Éloigner lentement la friandise vers l’avant', 'Le soulever doucement par le ventre', 'Tirer légèrement sur le collier vers l’avant', 'Il se lève pour suivre la friandise.'],
    ['À quoi sert le « Debout » ?', 'À faciliter l’examen, le toilettage et la pesée', 'À le préparer aux sauts et aux obstacles', 'À le faire marcher plus vite en balade', 'Un chien qui reste debout calmement participe aux soins.'],
    ['Un examen semble douloureux. Que faire ?', 'Ne pas insister et consulter', 'Le tenir pour terminer', 'Continuer avec plus de friandises', 'La douleur au toucher (dos, hanches) mérite un avis vétérinaire.']
  ],
  gym: [
    ['Que faire avant les exercices ?', 'Un échauffement de quelques minutes', 'Rien : il faut commencer fort', 'Un grand repas', 'Jamais d’exercice sur un chien « froid ».'],
    ['Pour un chiot en croissance, que faut-il éviter ?', 'Les sauts et exercices à fort impact', 'Les exercices lents d’équilibre', 'La marche au pas', 'Les articulations sont fragiles jusqu’à 12 à 18 mois selon la race.'],
    ['Un refus ou une douleur pendant l’exercice signifie…', 'Qu’il faut s’arrêter', 'Qu’il faut insister', 'Qu’il faut augmenter la difficulté', 'La douleur est un signal d’arrêt.']
  ],
  jouets: [
    ['Comment apprendre le nom d’un jouet ?', 'Un seul jouet, toujours le même mot', 'Plusieurs jouets en même temps', 'Changer de mot chaque jour', 'On avance très progressivement, un objet à la fois.'],
    ['Il se trompe de jouet. Que faire ?', 'Recommencer plus facilement, sans gronder', 'Le gronder', 'Arrêter définitivement l’exercice', 'Une erreur signifie que la difficulté est trop haute.'],
    ['Quels jouets éviter au début ?', 'Des jouets qui se ressemblent trop', 'Des jouets de formes différentes', 'Des jouets qu’il aime', 'Des objets bien différents facilitent la distinction.']
  ],
  ressources: [
    ['Il grogne près de sa gamelle. Que faire ?', 'Ne pas punir et consulter si besoin', 'Lui prendre la gamelle pour montrer qui décide', 'Le gronder fermement', 'Punir un grognement supprime l’avertissement, pas l’envie de mordre.'],
    ['Comment approcher pendant qu’il mange ?', 'De loin, en lançant une friandise meilleure, puis repartir', 'En mettant la main dans sa gamelle pendant qu’il mange', 'En lui retirant la gamelle quelques secondes puis en la rendant', 'Il apprend qu’un humain qui approche est une bonne nouvelle.'],
    ['Quelle règle pour les enfants face à un chien qui mange ?', 'Ils ne s’approchent jamais d’un chien qui mange ou mâche', 'Ils peuvent lui retirer son os pour lui apprendre à partager', 'Ils doivent le nourrir à la main pour se faire respecter', 'La garde de ressources peut mener à des morsures, surtout sur les enfants.']
  ],
  bain: [
    ['Première étape pour le bain ?', 'La baignoire à sec, avec des friandises', 'Un bain complet dès le premier jour', 'Le jet d’eau sur la tête', 'Le lieu doit devenir agréable avant l’eau.'],
    ['Quelle eau utiliser ?', 'Tiède, sans viser la face', 'Froide, pour aller vite', 'Très chaude', 'Évitez l’eau dans les yeux et les oreilles.'],
    ['Comment introduire le sèche-cheveux ?', 'À distance, puissance faible, air tiède, avec récompenses', 'Directement près de la peau, puissance forte', 'En le tenant fermement', 'On rapproche lentement, en récompensant.']
  ],
  enfants: [
    ['Qui doit surveiller enfant et chien ?', 'Un adulte présent en permanence', 'L’enfant le plus âgé', 'Personne si le chien est gentil', 'La plupart des morsures d’enfants viennent du chien de la famille.'],
    ['Un chien détourne la tête et se lèche la truffe. Il dit…', '« J’ai besoin d’espace »', '« Je veux jouer »', '« Je veux un câlin »', 'Ce sont des signaux d’inconfort : on le laisse tranquille.'],
    ['Que faut-il offrir au chien ?', 'Un refuge où les enfants ne vont jamais', 'Aucune pièce à lui, pour qu’il reste avec tout le monde', 'Un accès libre au lit des enfants pour la nuit', 'Ce refuge est sacré.']
  ],
  'chat-chien': [
    ['Pourquoi le chien poursuit-il le chat ?', 'Un chat qui fuit est une proie pour lui', 'Il veut simplement jouer à cache-cache', 'Il est jaloux de l’attention que reçoit le chat', 'C’est instinctif : chaque poursuite renforce le comportement.'],
    ['Première étape de la présentation ?', 'Séparer et échanger les odeurs', 'Les mettre face à face tout de suite', 'Laisser le chien entrer dans la pièce du chat', 'On procède par étapes : odeurs, vue, puis contact.'],
    ['Que doit toujours avoir le chat ?', 'Une échappatoire en hauteur', 'Un collier à clochette', 'Une gamelle près de celle du chien', 'Coincé, le chat panique ; libre, il se sent en sécurité.']
  ],
  adolescence: [
    ['Votre chien de 10 mois « oublie tout ». C’est…', 'Normal et temporaire', 'Un signe qu’il est têtu', 'La preuve que l’éducation a échoué', 'Son cerveau se réorganise entre 6 et 18 mois.'],
    ['Que faire du rappel pendant cette période ?', 'Garder la longe dans les lieux risqués', 'Le lâcher partout, il connaît', 'Arrêter les balades', 'Même s’il rappelait bien à 4 mois, la prudence s’impose.'],
    ['Comment dépenser son énergie ?', 'Reniflage, flair et mastication', 'Uniquement des lancers de balle répétés', 'Des jeux très excitants', 'Les jeux excitants augmentent l’énergie sans fatiguer le cerveau.']
  ],
  senior: [
    ['Votre vieux chien boite. Il faut…', 'Consulter : c’est souvent de la douleur', 'Accepter, c’est simplement l’effet de l’âge', 'Supprimer toutes les balades pour qu’il se repose', 'Beaucoup de signes attribués à l’âge sont soignables.'],
    ['Quelles balades pour un senior ?', 'Courtes et fréquentes, avec reniflage', 'Une seule longue balade par jour', 'Aucune balade', 'Réduire trop l’exercice accélère la fonte musculaire.'],
    ['Quel aménagement aide beaucoup ?', 'Des tapis antidérapants', 'Un sol bien ciré', 'Des escaliers sans rampe', 'Un chien qui glisse a peur de bouger.']
  ],
  adoption: [
    ['Que dit la règle « 3-3-3 » ?', '3 jours pour décompresser, 3 semaines pour la routine, 3 mois pour se sentir chez soi', '3 promenades, 3 repas et 3 heures de jeu par jour dès l’arrivée', '3 ordres de base à lui apprendre dès la première semaine', 'Respecter ce rythme évite bien des malentendus.'],
    ['Pourquoi la longe les premières semaines ?', 'Un chien adopté peut fuguer par peur', 'Pour le punir', 'Parce qu’il ne connaît pas son nom', 'Médaille et puce à jour sont aussi indispensables.'],
    ['Quand voir le vétérinaire ?', 'Dans la première semaine', 'Après 6 mois', 'Seulement s’il est malade', 'Vaccins, puce, parasites, dents, poids : un bilan de départ.']
  ],
  vacances: [
    ['Quand préparer un départ à l’étranger ?', 'Au moins un mois avant, avec le vétérinaire', 'La veille du départ, chez n’importe quel vétérinaire', 'Une fois sur place, auprès d’un vétérinaire local', 'Certaines exigences (vaccin, traitements) demandent du temps.'],
    ['À la plage, que faut-il éviter ?', 'Qu’il boive l’eau de mer', 'Qu’il se repose à l’ombre', 'Qu’il boive de l’eau douce', 'L’eau de mer déshydrate et irrite le système digestif.'],
    ['Après une balade en campagne, que vérifier ?', 'Tiques et épillets (pattes, oreilles, poil)', 'Rien de particulier si le chien semble en forme', 'Seulement la longueur de ses griffes', 'Tiques et épillets peuvent causer des maladies ou des abcès.']
  ]
};
