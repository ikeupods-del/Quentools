/* Wouf Éducation — leçons chien supplémentaires (Wouf Plus). Même méthode que lessons.js : renforcement positif,
   aucune contrainte physique. Pour un problème sérieux (agressivité, peur intense, anxiété marquée), consultez
   un vétérinaire comportementaliste. */
LESSONS.push(

{ id: 'mordillements', free: false, icon: '🦷', cat: 'Chiot', title: 'Mordillements du chiot : apprendre la douceur', from: 8, dur: 'À chaque jeu, 5 min de séances dédiées', span: '3 à 8 semaines', level: 'Essentiel',
  goal: 'Votre chiot contrôle la force de sa mâchoire, arrête de mordiller les mains et les vêtements, et mâche des objets adaptés.',
  why: 'Le chiot explore avec la gueule et fait ses dents (de 3 à 6 mois environ). Chez ses frères et sœurs, un jeu trop fort finit par un cri et l’arrêt du jeu : il apprend ainsi à doser sa force (« inhibition de la morsure »). On reprend ce principe : le jeu s’arrête quand les dents touchent la peau, il reprend quand la bouche est douce, et on lui offre des alternatives à mâcher.',
  need: ['Plusieurs jouets à mâcher de textures différentes', 'Une carotte ou un jouet congelé pour les poussées dentaires', 'Une zone de « pause » (parc, pièce sûre)'],
  steps: [
    { t: 'Le jeu s’arrête quand les dents touchent', min: 3, b: 'Jouez avec les mains. À la première pression de dents un peu forte, dites « Aïe ! » calmement (sans crier, cela pourrait l’exciter), retirez vos mains, croisez les bras et ignorez-le 10 à 20 secondes. Dès qu’il se calme, reprenez. Répétez à chaque mordillement.', crit: 'Il freine sa bouche quand vous dites « Aïe ! » (5 fois de suite).' },
    { t: 'Rediriger vers un jouet', min: 3, b: 'Ayez toujours un jouet à portée. Quand il attrape la main ou le vêtement, tendez le jouet et félicitez quand il le prend. La règle : « des dents sur le jouet, jamais sur la peau ».', crit: 'Il prend le jouet plutôt que la main, 8 fois sur 10.' },
    { t: 'Baisser le seuil de tolérance', min: 5, b: 'Quand la pression forte a disparu, arrêtez le jeu à la moindre pression, même légère. L’objectif final : aucune dent sur la peau. Faites-le progressivement, sur plusieurs semaines.', crit: 'Jeu de 2 minutes sans aucune dent sur la peau.' },
    { t: 'Éviter les pics de fatigue', min: 0, b: 'Un chiot fatigué mord beaucoup plus. Organisez des siestes obligatoires (dans le parc, la caisse ou une pièce calme) toutes les 1 à 2 heures. Beaucoup de « mauvais comportements » du soir sont simplement du sommeil qui manque.', crit: 'Le chiot dort 18 à 20 heures par jour.' },
    { t: 'Offrir de quoi mâcher', min: 0, b: 'Jouets de mastication, carotte congelée, Kong garni : plusieurs par jour, surtout pendant la poussée dentaire. Renouvelez régulièrement pour éviter l’ennui.', crit: 'Il va spontanément vers ses jouets à mâcher.' }
  ],
  mistakes: ['Lui tenir la gueule fermée, lui donner des tapes sur le nez ou crier : cela peut l’exciter ou le rendre méfiant, et la morsure devient un jeu plus fort.', 'Jouer à des jeux de lutte avec les mains : il apprend que les mains sont des jouets.', 'Laisser les enfants l’exciter (courir, crier) sans surveillance.', 'Ne jamais rediriger : sans alternative, il mordra autre chose.'],
  faq: [['Il mord encore plus quand je dis « Aïe ! ».', 'Certains chiots s’excitent : baissez la voix, ne criez pas et arrêtez simplement le jeu en vous levant sans un mot ; ou sortez de la pièce 20 secondes.'], ['Il s’en prend à mes chaussures et à mes vêtements.', 'Détournez avec un jouet, rangez les chaussures, ou tenez-le en laisse à la maison pour l’aider à choisir. Une laisse traînante peut aider à l’interrompre sans le toucher.'], ['Il grogne et se raidit quand j’ôte un objet.', 'Ce n’est plus du jeu : c’est de la garde de ressource. Voir la leçon « Laisse-le et Donne » et consultez un comportementaliste si cela se répète.']],
  test: 'Il joue 2 minutes avec vous sans aucune dent sur la peau, et va chercher un jouet quand il s’excite.', safety: 'Une morsure qui perce la peau, un chiot qui grogne en se raidissant ou qui mord pour se défendre sont des signaux à ne pas ignorer : consultez.' },

{ id: 'caisse', free: false, icon: '📦', cat: 'Calme', title: 'La caisse : une « chambre à soi »', from: 8, dur: '5 min × 4 par jour', span: '2 à 4 semaines', level: 'Essentiel',
  goal: 'Votre chien entre de lui-même dans sa caisse, s’y détend, et y reste calmement quelques heures.',
  why: 'Utilisée correctement, la caisse est un refuge sûr, une aide pour la propreté, le voyage et les visites chez le vétérinaire. Elle ne doit jamais être une punition ni une solution pour laisser un chien seul très longtemps.',
  need: ['Une caisse à la bonne taille (il doit pouvoir se lever, se retourner et s’allonger)', 'Un tapis confortable', 'Friandises et jouet de mastication'],
  steps: [
    { t: 'Un endroit agréable', min: 3, b: 'Laissez la caisse ouverte, dans une pièce de vie. Jetez des friandises à l’intérieur ; le chien entre, mange, ressort. Ne le poussez pas. Donnez-lui un jouet à ronger dedans.', crit: 'Il entre spontanément pour chercher les friandises.' },
    { t: 'Les repas dans la caisse', min: 5, b: 'Donnez ses repas au fond de la caisse, porte ouverte. Puis, quand il est à l’aise, fermez la porte pendant le repas et rouvrez avant la fin.', crit: 'Il mange tranquillement, porte fermée.' },
    { t: 'Fermer la porte, quelques secondes', min: 3, b: 'Il est dedans, en train de mâcher : fermez la porte 5 secondes, rouvrez, félicitez. Puis 10, 30 secondes, 1 minute, 5 minutes. Restez à côté puis éloignez-vous, revenez avant qu’il proteste.', crit: 'Il reste calme 5 minutes, vous étant dans la pièce.' },
    { t: 'Ajouter la distance et la durée', min: 5, b: 'Sortez de la pièce 1 minute, puis 5, 15. La caisse est toujours associée à un jouet à ronger. Ne laissez pas le chien en caisse plus longtemps que ce qu’il peut supporter : environ 1 heure par mois d’âge pour un chiot, et jamais toute la journée.', crit: 'Il reste 30 minutes dedans sans stress.' },
    { t: 'La nuit et le transport', min: 0, b: 'Le chiot peut dormir près de votre lit dans sa caisse (il se sent en sécurité), avec sorties nocturnes régulières. Habituez-le aussi à la caisse en voiture.', crit: 'Il dort dans sa caisse, calme.' }
  ],
  mistakes: ['Utiliser la caisse comme punition : elle devient un lieu de stress.', 'Le laisser trop longtemps enfermé, ou tout le jour.', 'Ouvrir la porte quand il aboie : il apprend que les cris ouvrent la porte. Attendez un court moment de calme.', 'Choisir une caisse trop grande (il fait ses besoins dans un coin) ou trop petite.'],
  faq: [['Il pleure dans la caisse.', 'Vous êtes probablement allé trop vite. Retournez à un palier plus court. Vérifiez qu’il a fait ses besoins et dépensé de l’énergie. Un chiot très jeune peut avoir besoin de compagnie la nuit.'], ['Il fait ses besoins dans la caisse.', 'Sortez-le plus souvent, réduisez la taille, vérifiez la durée. Nettoyez avec un produit enzymatique.'], ['Peut-on l’utiliser pour l’anxiété de séparation ?', 'Non : un chien anxieux peut se blesser en caisse. Voir la leçon « Solitude » et consultez.']],
  test: 'Il entre seul dans sa caisse et y reste détendu 30 minutes, porte fermée, pendant que vous vaquez dans la maison.', safety: 'Jamais de caisse en plein soleil ou dans une voiture chaude. Retirez colliers et laisses qui pourraient s’accrocher.' },

{ id: 'voiture', free: false, icon: '🚗', cat: 'Voyage', title: 'Voyager en voiture sereinement', from: 8, dur: '5 min × 2-3 par jour', span: '2 à 6 semaines', level: 'Intermédiaire',
  goal: 'Votre chien monte en voiture volontiers, voyage installé en sécurité et sans stress ni nausée.',
  why: 'Un chien mal habitué associe la voiture au vétérinaire ou aux nausées. Une habituation progressive, en commençant à l’arrêt, en fait un lieu neutre puis agréable. La sécurité compte : un chien non attaché est un danger pour lui-même et les occupants.',
  need: ['Un harnais avec ceinture ou une caisse de transport arrimée', 'Friandises et jouet de mastication', 'Une couverture'],
  steps: [
    { t: 'Voiture à l’arrêt, moteur éteint', min: 5, b: 'Portière ouverte, jetez des friandises sur la banquette ou dans le coffre. Il monte, mange, redescend. Puis restez quelques secondes assis avec lui, portière ouverte.', crit: 'Il monte de lui-même 8 fois sur 10.' },
    { t: 'Installation en sécurité', min: 5, b: 'Attachez-le avec un harnais et la ceinture, ou dans sa caisse arrimée. Ne le laissez jamais libre ni sur les genoux. Associez cette installation à un jouet de mastication.', crit: 'Il s’installe calmement, attaché.' },
    { t: 'Moteur allumé, sans rouler', min: 3, b: 'Démarrez le moteur, récompensez le calme, coupez. Répétez plusieurs jours, avant d’avancer.', crit: 'Il reste calme moteur allumé 2 minutes.' },
    { t: 'Trajets très courts vers un endroit agréable', min: 10, b: 'Roulez 1 minute, arrêtez-vous, récompensez. Allez à des endroits agréables (parc, forêt) plutôt qu’uniquement chez le vétérinaire. Allongez très progressivement : 5, 10, 20 minutes.', crit: 'Trajet de 10 minutes sans stress.' },
    { t: 'Prévenir le mal des transports', min: 0, b: 'Ne donnez pas de gros repas avant un trajet (2 à 3 heures avant), aérez la voiture, faites des pauses toutes les 2 heures, regard vers l’avant si possible. Si salivation, léchages de babines ou vomissements persistent : parlez à votre vétérinaire, des traitements existent.', crit: 'Aucune nausée sur 3 trajets consécutifs.' }
  ],
  mistakes: ['Ne partir en voiture que pour le vétérinaire : la voiture devient synonyme de stress.', 'Laisser le chien libre dans l’habitacle ou sur le siège avant.', 'Laisser un chien seul dans une voiture, même fenêtres ouvertes : le coup de chaleur peut être mortel en quelques minutes.', 'Forcer un chien terrorisé à monter.'],
  faq: [['Il aboie ou pleure tout le trajet.', 'Trajets trop longs trop vite. Revenez à l’arrêt ou à 1 minute, et récompensez le silence avec un jouet à mâcher.'], ['Il vomit à chaque trajet.', 'Consultez votre vétérinaire pour vérifier la cause et envisager un traitement anti-nausée adapté.'], ['Il ne veut plus monter.', 'Reprenez à l’étape 1 sans pression : friandises au sol, portière ouverte, puis installez une rampe pour un grand chien ou un chien âgé.']],
  test: 'Il monte, s’installe attaché et voyage 20 minutes sans stress ni nausée.', safety: 'Ne laissez jamais un animal seul dans une voiture stationnée.' },

{ id: 'aboiements', free: false, icon: '🔊', cat: 'Savoir-vivre', title: 'Aboiements : comprendre et réduire', from: 12, dur: '5 min × 2 par jour', span: '2 à 8 semaines', level: 'Intermédiaire',
  goal: 'Votre chien aboie moins, sait se taire sur signal, et dispose d’une alternative claire à l’aboiement.',
  why: 'Aboyer est un comportement normal qui a toujours une fonction : alerte, exigence, ennui, peur, excitation. Pour le réduire, on identifie ce qui le déclenche et ce qu’il obtient, puis on couvre le besoin autrement. Punir l’aboiement ne traite ni la cause ni l’émotion.',
  need: ['Un carnet pour noter quand, où, pourquoi il aboie', 'Friandises', 'Des jouets d’occupation'],
  steps: [
    { t: 'Trouver la fonction de l’aboiement', min: 0, b: 'Pendant 3 jours, notez les circonstances : fenêtre, sonnette, absence, frustration, jeu. Alerte (passants), exigence (attention, nourriture), ennui, peur, excitation ? La stratégie dépend de la cause.', crit: 'Vous savez identifier les 3 principaux déclencheurs.' },
    { t: 'Réduire les déclencheurs et couvrir les besoins', min: 0, b: 'Film sur les fenêtres, rideaux, rentrer le chien dans une pièce plus calme. Augmentez l’exercice, le reniflage, les jouets à mâcher, les jeux d’odorat. Un chien fatigué et occupé aboie moins.', crit: 'Moins d’aboiements sur 7 jours.' },
    { t: 'Apprendre « Chut » par le silence', min: 3, b: 'Attendez qu’il cesse d’aboyer (même 2 secondes) : « Oui ! » et friandise. Étirez le silence : 3, 5, 10 secondes. Quand cela marche, dites « Chut » juste avant le silence.', crit: 'Il se tait au mot 8 fois sur 10.' },
    { t: 'Un comportement alternatif', min: 3, b: 'Enseignez : aller sur la Place, apporter un jouet ou s’asseoir à l’arrivée d’un visiteur. Récompensez ce comportement, incompatible avec l’aboiement.', crit: 'Il va sur sa Place quand la sonnette retentit.' },
    { t: 'Aboiements d’exigence : ignorer puis récompenser le calme', min: 0, b: 'Ne répondez pas à l’aboiement d’exigence (regard, parole, contact). Récompensez immédiatement le silence. Attention : l’aboiement peut s’intensifier avant de diminuer (« effet d’extinction ») : tenez bon, sinon vous lui apprenez à aboyer plus longtemps.', crit: 'Il ne réclame plus par aboiements.' }
  ],
  mistakes: ['Crier « Tais-toi ! » : le chien croit que vous aboyez avec lui.', 'Utiliser un collier anti-aboiement (choc, spray) : douleur et stress, la cause reste.', 'Céder de temps en temps à l’aboiement d’exigence : c’est le meilleur moyen de le renforcer.', 'Ignorer l’aboiement de peur ou d’anxiété : il exige de l’aide, pas de la fermeté.'],
  faq: [['Il aboie seul à la maison.', 'Peut-être de l’anxiété de séparation : voir la leçon « Solitude » et consultez si l’aboiement est prolongé, avec salivation ou destruction.'], ['Il aboie sur les autres chiens en promenade.', 'Voir la leçon « Rencontrer d’autres chiens sereinement ».'], ['Il aboie la nuit.', 'Écartez douleur, besoin de sortie, froid ou peur. Un chiot a besoin de compagnie la nuit.']],
  test: 'Il se tait au mot « Chut » 8 fois sur 10 et vous avez réduit de moitié ses aboiements habituels sur 2 semaines.', safety: 'Des aboiements soudains, excessifs et inhabituels (surtout chez un chien âgé) peuvent être un signe de douleur ou de trouble cognitif : consultez.' },

{ id: 'visiteurs', free: false, icon: '🔔', cat: 'Savoir-vivre', title: 'Sonnette et visiteurs : un accueil calme', from: 12, dur: '5 min × 2 par jour', span: '2 à 4 semaines', level: 'Intermédiaire',
  goal: 'Votre chien reste calme à la sonnette et accueille les visiteurs sans sauter ni aboyer excessivement.',
  why: 'La sonnette prédit l’arrivée de quelqu’un : elle déclenche l’excitation, l’alerte ou la peur. On la « vide » de son effet en l’associant à du positif (contre-conditionnement), puis on donne au chien un rôle clair : aller sur sa Place.',
  need: ['Un enregistrement de sonnette ou un ami qui sonne', 'Friandises appétissantes', 'Une laisse et un tapis (Place)'],
  steps: [
    { t: 'Sonnette = friandise', min: 3, b: 'Faites sonner (ou passez l’enregistrement à faible volume), puis donnez aussitôt une friandise. Aucune demande. Répétez 15 fois, en augmentant progressivement le volume.', crit: 'À la sonnette, il se tourne vers vous, joyeux.' },
    { t: 'Sonnette = aller sur la Place', min: 3, b: 'Après la sonnette, dites « Place » et récompensez sur le tapis. Progressivement, plus de mot : la sonnette seule déclenche le déplacement.', crit: 'Il va sur son tapis dès la sonnette.' },
    { t: 'Ouvrir la porte', min: 5, b: 'Faites sonner, allez à la porte (chien sur la Place ou en laisse), ouvrez, refermez, retournez le récompenser. Répétez, sans visiteur d’abord.', crit: 'Il reste sur sa Place pendant l’ouverture, 8 fois sur 10.' },
    { t: 'Le visiteur entre', min: 5, b: 'Demandez au visiteur d’ignorer le chien jusqu’à ce qu’il soit calme. Chien en laisse, assis ; le visiteur avance seulement si le chien reste calme, sinon il s’arrête. Récompensez le calme, puis autorisez une caresse.', crit: 'Il salue calmement 2 visiteurs différents.' },
    { t: 'Un rituel pour toute la famille', min: 0, b: 'Convenez d’un protocole : sonnette, Place, friandise, visiteurs prévenus. Un chien qui sait ce qu’on attend de lui se stresse moins.', crit: 'Le rituel est appliqué de façon identique par tous.' }
  ],
  mistakes: ['Ouvrir la porte tant qu’il aboie ou saute : cela le récompense.', 'Le gronder : cela associe les visiteurs à la punition.', 'Laisser les visiteurs l’exciter par des câlins agités.', 'Enfermer un chien craintif avec les visiteurs sans préparation.'],
  faq: [['Il a peur des visiteurs.', 'Ne le forcez pas à les saluer. Laissez-le à distance, dans un espace sûr, avec un jouet ; les visiteurs l’ignorent, lui jettent des friandises sans le regarder. Consultez si la peur est marquée.'], ['Il saute sur les invités.', 'Voir la leçon « Ne plus sauter » et gardez-le en laisse pendant les arrivées.']],
  test: 'À la sonnette, il va sur sa Place et y reste 1 minute pendant que vous ouvrez.', safety: 'Un chien qui grogne ou montre les dents aux visiteurs doit être tenu à distance ; consultez un comportementaliste.' },

{ id: 'pied', free: false, icon: '🏃', cat: 'Balades', title: 'Marche au pied : un suivi précis', from: 16, dur: '5 min × 2-3 par jour', span: '3 à 6 semaines', level: 'Avancé',
  goal: 'Votre chien marche à hauteur de votre jambe, attentif, en suivant vos changements de rythme et de direction, même sans laisse.',
  why: 'Contrairement à la simple « laisse détendue », la marche au pied est un exercice de précision et de concentration. Elle renforce la connexion avec vous, sert dans les endroits encombrés et prépare des sports canins.',
  need: ['Marche en laisse acquise', 'Friandises très appétissantes', 'Un endroit calme puis animé'],
  steps: [
    { t: 'La position au pied', min: 3, b: 'Chien à votre côté (celui de votre choix), friandise dans la main à hauteur de la cuisse. Récompensez chaque fois qu’il se place tête à hauteur de votre jambe.', crit: 'Il vient se placer seul à votre côté, 8 fois sur 10.' },
    { t: 'Un pas, deux pas avec appât', min: 3, b: 'Marchez un pas en gardant la main à hauteur de la cuisse, récompensez au bon endroit. Puis 3, 5, 10 pas.', crit: '10 pas consécutifs au pied avec l’appât.' },
    { t: 'Sans appât, avec le signal « Au pied »', min: 4, b: 'Main vide (friandise dans la poche ou l’autre main). Dites « Au pied » juste avant de partir. Récompensez toutes les 3 à 5 pas, puis toutes les 10.', crit: 'Il suit 20 pas main vide.' },
    { t: 'Tournants, arrêts, changements de rythme', min: 5, b: 'Tourner à gauche, à droite, demi-tour, accélérer, ralentir, s’arrêter (il s’assoit à votre côté). Récompensez chaque succès. Entraînez-vous d’abord à petite vitesse.', crit: 'Il suit les changements de direction sans décrocher, 8 fois sur 10.' },
    { t: 'Distractions et sans laisse (lieu clos)', min: 10, b: 'Augmentez la difficulté : jouet posé, autres personnes, puis dans un lieu sûr et clos sans laisse. Toujours proche du critère de réussite.', crit: '8 réussites sur 10 avec une distraction moyenne.' }
  ],
  mistakes: ['Marcher vite trop tôt.', 'Récompenser derrière la jambe ou trop loin : il ne saura pas où se placer.', 'Séances trop longues : le suivi précis est très fatigant mentalement.', 'Exiger le pied sur toute la promenade : gardez la marche détendue pour le reste.'],
  faq: [['Il regarde partout au lieu de me regarder.', 'Vous êtes probablement trop vite ou dans un endroit trop distrayant : retournez en lieu calme.'], ['Il se place devant moi.', 'Récompensez seulement la bonne position et reculez la main de récompense vers la cuisse.']],
  test: 'Suivi précis sur 30 pas, avec 3 changements de direction, dans un endroit avec une distraction faible.', safety: 'Séances courtes pour les chiots et les chiens souffrant des articulations.' },

{ id: 'rapport', free: false, icon: '🎾', cat: 'Jeu', title: 'Rapporter : le jeu de rapport', from: 10, dur: '5 min × 2 par jour', span: '2 à 4 semaines', level: 'Intermédiaire',
  goal: 'Votre chien poursuit un jouet, le rapporte et le donne, avec plaisir.',
  why: 'Le rapport dépense de l’énergie de façon canalisée, renforce la relation et facilite le rappel et le « Donne ». On construit chaque maillon : prendre, tenir, revenir, donner. Un chien qui ne rapporte pas n’est pas « têtu » : il n’a pas encore compris que revenir fait continuer le jeu.',
  need: ['Deux jouets identiques (échange)', 'Friandises', 'Un lieu clos ou une longe'],
  steps: [
    { t: 'Susciter l’intérêt', min: 3, b: 'Agitez le jouet au sol, faites-le bouger, laissez-le l’attraper. Félicitez. Ne le lancez pas encore loin.', crit: 'Il prend le jouet avec enthousiasme.' },
    { t: 'Tenir et venir à vous', min: 3, b: 'Lancez à 1 ou 2 mètres, reculez en l’encourageant. Quand il vous rejoint avec le jouet, félicitez, sans le lui prendre tout de suite.', crit: 'Il vient vers vous avec le jouet, 8 fois sur 10.' },
    { t: 'L’échange : « Donne »', min: 3, b: 'Présentez le second jouet ou une friandise ; quand il lâche : « Oui ! », lancez de nouveau. Donner mène à jouer plus, pas à perdre le jouet.', crit: 'Il lâche sans résistance à « Donne ».' },
    { t: 'Augmenter la distance', min: 5, b: 'Lancez à 5, 10, 15 mètres. S’il ne revient pas, utilisez la longe ou lancez le second jouet dans votre direction pour l’attirer.', crit: 'Rapport complet à 10 mètres.' },
    { t: 'Structurer le jeu', min: 0, b: 'Terminez avant qu’il ne se lasse. Introduisez le « Assis » avant le lancer et le mot « Va chercher ». Alternez avec des jeux d’odorat.', crit: 'Jeu structuré, calme, avec attente avant le lancer.' }
  ],
  mistakes: ['Lui courir après pour récupérer le jouet.', 'Enchaîner trop de lancers : usure articulaire et surexcitation.', 'Utiliser le rapport comme seule activité physique (risque d’obsession de la balle).', 'Lancer dans des lieux dangereux (route, eau agitée).'],
  faq: [['Il emporte la balle et ne revient pas.', 'Ne lui courez pas après : sortez un deuxième jouet ou une friandise et jouez avec l’autre ; le premier perd de son intérêt.'], ['Il ne s’intéresse pas aux balles.', 'Essayez des peluches, des cordes, de la nourriture cachée ; certains chiens préfèrent tirer que rapporter.']],
  test: 'Il rapporte 5 fois de suite le jouet lancé à 10 mètres et le donne sans conflit.', safety: 'Chiots et chiens à risque articulaire : évitez les sauts et les freinages brutaux, privilégiez les surfaces souples.' },

{ id: 'nosework', free: false, icon: '👃', cat: 'Jeu', title: 'Cherche ! Les jeux d’odorat', from: 8, dur: '5 min par jour', span: '2 à 6 semaines', level: 'Tous niveaux',
  goal: 'Votre chien cherche des friandises ou des objets cachés, avec méthode et plaisir, sur le signal « Cherche ! ».',
  why: 'Le flair est le sens principal du chien. Le laisser chercher le fatigue mentalement mieux que la course, développe sa confiance et calme les chiens stressés ou hyperactifs. C’est aussi une excellente activité pour les chiens âgés ou en convalescence.',
  need: ['Friandises odorantes', 'Petits contenants (cartons, boîtes, pots)', 'Une pièce calme'],
  steps: [
    { t: 'La friandise au sol', min: 3, b: 'Montrez la friandise, posez-la au sol devant lui : il la trouve. Dites « Cherche ! » quand il approche. Répétez 5 à 10 fois.', crit: 'Il va chercher la friandise dès que vous dites « Cherche ! ».' },
    { t: 'Cachée à vue partiellement', min: 3, b: 'Posez la friandise sous un pot renversé ou derrière un pied de chaise, à moitié visible. Encouragez : « Cherche ! ».', crit: 'Il trouve seul 8 fois sur 10.' },
    { t: 'Cachette invisible', min: 5, b: 'Cachez la friandise sous un pot ou dans une boîte fermée qu’il doit renverser. Augmentez : plusieurs cachettes, en hauteur, dans une autre pièce. Il doit toujours réussir.', crit: 'Il trouve 3 cachettes différentes dans la pièce.' },
    { t: 'Chercher un objet', min: 5, b: 'Cachez un jouet familier, dites « Cherche ! ». Récompensez à la découverte (friandise, jeu). Puis cachez à l’extérieur (herbe, jardin), sans distraction forte.', crit: 'Il retrouve un jouet caché dans le jardin.' },
    { t: 'Le jeu de la boîte : fiabilité', min: 5, b: 'Alignez 5 boîtes ; une seule contient la friandise. Le chien flaire chaque boîte et marque la bonne (arrêt, museau, patte). Marquez « Oui ! » puis récompensez.', crit: 'Il marque la bonne boîte 8 fois sur 10.' }
  ],
  mistakes: ['Rendre l’exercice trop difficile d’un coup : il perd confiance et abandonne.', 'Lui montrer la cachette pour l’aider : il n’apprendra pas à chercher.', 'Utiliser des friandises peu odorantes.', 'Séances trop longues : 5 à 10 minutes suffisent, c’est très fatigant.'],
  faq: [['Il n’a pas l’air d’utiliser son nez.', 'Utilisez des friandises très odorantes et des cachettes plus faciles (à vue), il apprend à chercher.'], ['Il renverse tout.', 'Normal au début : c’est un jeu. Ajoutez le signal « Doucement » et récompensez le calme, ou utilisez des contenants plus lourds.']],
  test: 'Il trouve 3 friandises cachées dans 3 cachettes différentes en moins de 2 minutes.', safety: 'Évitez de cacher des aliments toxiques ou dangereux ; surveillez les chiens qui avalent les cartons.' },

{ id: 'tours', free: false, icon: '🎪', cat: 'Jeu', title: 'Petits tours : patte, tourne, roule', from: 10, dur: '3 min × 2-3 par jour', span: '1 à 3 semaines', level: 'Débutant',
  goal: 'Votre chien apprend « Donne la patte », « Tourne » et « Roule » : de la stimulation mentale et de la complicité.',
  why: 'Les tours n’ont pas d’utilité pratique, mais ils développent la capacité d’apprentissage, la coordination et la confiance. Ils apprennent aussi au chien à « chercher » quoi faire pour gagner une récompense, ce qui accélère tous les apprentissages ultérieurs.',
  need: ['Friandises', 'Sol souple', 'Assis et Couché acquis'],
  steps: [
    { t: 'Donne la patte', min: 3, b: 'Chien assis, tenez une friandise dans le poing près de son museau. Il va gratter ou lever la patte : « Oui ! » dès qu’elle décolle, puis récompensez. Ajoutez le mot « Patte » quand il lève de lui-même. Puis présentez la main ouverte.', crit: 'Il donne la patte à la demande 8 fois sur 10.' },
    { t: 'Tourne', min: 3, b: 'Debout, guidez la friandise en cercle autour de lui, lentement, jusqu’à ce qu’il fasse un tour complet. « Oui ! » et récompense. Puis sans appât, avec le geste du doigt, et le mot « Tourne ». Apprenez dans les deux sens.', crit: 'Il tourne aux deux sens au signal.' },
    { t: 'Roule : le coucher, puis le côté', min: 5, b: 'Chien couché, guidez la friandise de son museau vers son épaule, puis vers sa colonne : la tête se tourne, il bascule sur la hanche. Marquez la bascule, puis le demi-tour, puis le tour complet. Allez lentement, sur un tapis moelleux.', crit: 'Il roule complètement en suivant l’appât.' },
    { t: 'Ajouter les mots et enchaîner', min: 5, b: 'Faites disparaître l’appât, ajoutez les mots. Enchaînez deux tours puis trois, avec une seule récompense à la fin.', crit: 'Enchaînement de 2 tours sur signal.' }
  ],
  mistakes: ['Forcer la patte ou la position du corps.', 'Apprendre « Roule » sur un sol dur ou glissant.', 'Négliger le repos : un chien fatigué ne réussit plus.', 'Se décourager : chaque chien a ses tours préférés.'],
  faq: [['Il ne lève pas la patte.', 'Essayez de récompenser un simple mouvement d’épaule, puis d’un centimètre plus haut.'], ['Il a du mal à se coucher sur le côté.', 'Ne forcez jamais : douleurs articulaires possibles. Choisissez un autre tour.']],
  test: 'Il exécute Patte, Tourne et Roule sur le seul signal, 8 fois sur 10.', safety: 'Évitez « Roule » chez un chien âgé, arthrosique, ou de grande race à thorax profond juste après le repas.' },

{ id: 'bruits', free: false, icon: '⛈️', cat: 'Émotions', title: 'Bruits forts, orages et pétards', from: 8, dur: '5 min × 2 par jour', span: '4 à 12 semaines', level: 'Important',
  goal: 'Votre chien reste serein (ou nettement plus calme) face aux bruits forts : orage, pétards, aspirateur, feux d’artifice.',
  why: 'La peur des bruits est très fréquente et tend à s’aggraver sans intervention. La méthode efficace est la désensibilisation associée au contre-conditionnement : on fait entendre le bruit à un volume si faible qu’il ne provoque aucune peur, on l’associe à quelque chose d’agréable, et on augmente très lentement. Le forcer à « faire face » aggrave la peur.',
  need: ['Enregistrements de bruits (orage, pétards) sur enceinte ou téléphone', 'Friandises de très haute valeur', 'Un endroit sûr (sa niche, la caisse)'],
  steps: [
    { t: 'Un refuge sûr', min: 0, b: 'Aménagez un endroit qu’il choisit : caisse couverte, pièce sans fenêtre, tapis. Il doit pouvoir s’y réfugier à tout moment, sans que personne ne l’en sorte.', crit: 'Il va spontanément se réfugier dans son coin quand il a peur.' },
    { t: 'Volume quasi inaudible', min: 5, b: 'Lancez l’enregistrement à un volume à peine audible. Pendant le bruit : friandises ou jeu. Arrêtez : les friandises s’arrêtent. Le bruit doit prédire les bonnes choses.', crit: 'À ce volume, il est détendu et attend la friandise.' },
    { t: 'Augmenter très lentement', min: 5, b: 'Montez le volume d’un cran seulement quand il est parfaitement calme à l’étape précédente (pupilles normales, corps souple, il mange). S’il montre du stress (halète, tremble, se fige) : revenez au volume précédent.', crit: 'Il reste calme à volume moyen.' },
    { t: 'Volume réel, bruits variés', min: 5, b: 'Variez les bruits : orage, pétards, portière, casseroles. Faites des séances de quelques minutes plusieurs fois par semaine. Mettez plusieurs semaines si nécessaire.', crit: 'Il reste calme à volume réel.' },
    { t: 'Le jour J : pétards, orage, feux d’artifice', min: 0, b: 'Restez avec lui, fermez volets et fenêtres, mettez de la musique ou la télévision, proposez son refuge, jeux de mastication ou de flair. Ne le grondez pas et ne le rassurez pas de façon excessive, restez calme. Pour un chien très anxieux, parlez à votre vétérinaire bien avant l’événement (solutions et traitements existent).', crit: 'Il traverse un événement avec un stress réduit.' }
  ],
  mistakes: ['L’exposer au bruit à fort volume « pour qu’il s’habitue » (noyade émotionnelle).', 'Le gronder ou le forcer à sortir de son refuge.', 'Le laisser seul, dehors ou dans le jardin pendant un feu d’artifice.', 'Attendre le jour de l’orage pour commencer le travail.'],
  faq: [['Il tremble dès le début à volume très faible.', 'Baissez encore, ou raccourcissez les séances. Si la peur est intense, consultez un vétérinaire comportementaliste.'], ['Dois-je le réconforter ?', 'Vous pouvez rester près de lui, lui parler d’un ton calme, le caresser s’il le recherche : le réconforter ne « renforce » pas la peur.'], ['Que faire s’il s’enfuit à cause du bruit ?', 'Vérifiez que son collier a une médaille avec vos coordonnées et que sa puce est à jour : c’est la première cause de disparition.']],
  test: 'Il reste détendu et mange des friandises pendant l’enregistrement d’un orage à volume réel.', safety: 'Les chiens paniqués peuvent fuguer ou se blesser : ne les laissez jamais seuls à l’extérieur lors d’un événement bruyant.' },

{ id: 'congeneres', free: false, icon: '🐕‍🦺', cat: 'Émotions', title: 'Rencontrer d’autres chiens sereinement', from: 12, dur: '10 min × 2 par jour', span: '4 à 12 semaines', level: 'Avancé',
  goal: 'Votre chien voit un autre chien sans tirer, aboyer ni se jeter dessus, et se tourne vers vous pour sa récompense.',
  why: 'Aboyer et tirer face à un chien (réactivité en laisse) est souvent de la peur, de la frustration ou de l’excitation. La solution n’est pas de se rapprocher « pour qu’ils se disent bonjour », mais de travailler à la distance où votre chien reste calme, et de lui apprendre que voir un chien fait arriver une récompense.',
  need: ['Un harnais bien ajusté', 'Une laisse de 2 mètres (pas d’enrouleur)', 'Friandises de très haute valeur', 'Un lieu avec de l’espace pour créer de la distance'],
  steps: [
    { t: 'Trouver la « distance-seuil »', min: 5, b: 'Repérez la distance où votre chien voit l’autre chien mais reste calme (il peut regarder, renifler, manger). C’est là que vous travaillez : ni trop près (réaction), ni trop loin (indifférent).', crit: 'Vous connaissez votre distance-seuil.' },
    { t: 'Chien = friandise', min: 5, b: 'À la distance-seuil, dès que votre chien voit un chien : « Oui ! » et friandise. Le chien de l’autre côté fait apparaître la nourriture. Il regarde ? Vous récompensez. Il vous regarde ? Vous récompensez.', crit: 'Il se tourne vers vous pour sa friandise après avoir vu un chien.' },
    { t: 'Le jeu du « regarde » (Look at That)', min: 5, b: 'Il regarde calmement le chien : « Oui ! » Il revient vers vous : nouvelle friandise. Répétez. Ne le forcez pas à vous regarder : laissez-le choisir de le faire.', crit: '8 « regarde puis reviens » sur 10.' },
    { t: 'Réduire la distance très lentement', min: 10, b: 'Rapprochez-vous de 1 à 2 mètres à la fois, uniquement quand il est très calme. Si vous dépassez le seuil (aboiements, tension), reculez sans un mot : la séance suivante sera plus facile.', crit: 'Calme à la moitié de la distance de départ.' },
    { t: 'Croiser sans réaction', min: 10, b: 'Marchez en parallèle à distance, puis croisez à distance avec une trajectoire courbe (jamais de face). Évitez le contact direct nez à nez. Récompensez sans cesse. Faites demi-tour si nécessaire.', crit: 'Il croise un chien calme à 3 mètres sans réagir.' }
  ],
  mistakes: ['Approcher de front, laisse tendue : la tension est transmise et augmente la réaction.', 'Punir le chien réactif : il associe l’autre chien à la punition, ce qui aggrave.', 'Laisser « se dire bonjour » en laisse : le contact en laisse est souvent source de conflit.', 'Aller dans un endroit très fréquenté pour « l’habituer » : il doit d’abord réussir en douceur.'],
  faq: [['Mon chien est agressif ou mord.', 'Ne tentez pas de le corriger : consultez un vétérinaire comportementaliste. Envisagez une muselière (voir la leçon dédiée).'], ['Il est sociable en liberté mais réactif en laisse.', 'C’est fréquent : la laisse crée de la frustration. Travaillez cette leçon et laissez-le jouer avec des chiens connus en liberté.'], ['Comment prévenir ?', 'Socialisation positive avant 4 mois, chiens équilibrés, rencontres brèves et détendues.']],
  test: 'Il croise un chien à 3 mètres sans tirer ni aboyer, et se tourne vers vous pour sa friandise.', safety: 'Ne laissez pas un chien réactif sans laisse. Anticipez : changez de trottoir dès que vous voyez un autre chien.' },

{ id: 'museliere', free: false, icon: '🧤', cat: 'Soins', title: 'Muselière : un conditionnement positif', from: 12, dur: '3 min × 2-3 par jour', span: '2 à 4 semaines', level: 'Utile',
  goal: 'Votre chien met son museau dans la muselière volontairement, l’accepte quelques minutes, sans stress.',
  why: 'Une muselière bien apprise n’est pas une punition : c’est un outil de sécurité qui permet un examen vétérinaire, un transport en commun ou la gestion d’un chien réactif sans stress. Il faut la conditionner à l’avance, avec patience.',
  need: ['Une muselière « panier » (le chien peut haleter, boire et manger des friandises)', 'Friandises molles ou pâte à tartiner pour chien', 'Un moment calme'],
  steps: [
    { t: 'Découverte : la muselière = friandises', min: 3, b: 'Présentez la muselière, laissez-le la renifler. Donnez une friandise. Posez-la au sol ou dans la main : friandise à côté. Il apprend que l’objet fait apparaître de la nourriture.', crit: 'Il s’approche de la muselière avec plaisir.' },
    { t: 'Le museau dedans : les friandises par l’avant', min: 3, b: 'Tenez la muselière et glissez une friandise depuis l’avant : il doit avancer le museau à l’intérieur pour l’attraper. Répétez, puis retardez : tenez 1 seconde, 2, 3 avant de récompenser.', crit: 'Il met le museau dedans volontairement, 8 fois sur 10.' },
    { t: 'Tenir quelques secondes', min: 3, b: 'Le museau dedans, distribuez plusieurs friandises à la suite par l’avant, sans fermer la sangle. Augmentez la durée à 5, 10, 20 secondes.', crit: 'Museau dans la muselière 10 secondes, calme.' },
    { t: 'Attacher la sangle', min: 5, b: 'Passez la sangle derrière la tête 1 seconde, récompensez généreusement, détachez. Puis 3, 5, 10, 30 secondes.', crit: 'Sangle attachée 30 secondes sans stress.' },
    { t: 'Durée et situations réelles', min: 10, b: 'Allongez : 1, 5, 10 minutes, en marchant, en voiture, chez le vétérinaire (essayez la muselière lors des visites de familiarisation). Associez la muselière à des moments agréables : promenade, repas, friandises.', crit: 'Il porte la muselière 10 minutes en promenade sans stress.' }
  ],
  mistakes: ['Mettre la muselière de force au dernier moment : elle devient un symbole de stress.', 'Utiliser une muselière en tissu qui ferme la gueule : il ne peut pas haleter et risque le coup de chaleur.', 'Ne la mettre que pour les situations désagréables.', 'Laisser la muselière sans surveillance ou trop longtemps par forte chaleur.'],
  faq: [['Il se frotte le museau au sol pour l’enlever.', 'La sangle est trop tôt attachée ou trop longue. Revenez à l’étape précédente.'], ['La muselière ne va pas à sa morphologie.', 'Prenez conseil auprès d’un éducateur ou d’un vétérinaire : les muselières sont à l’essayage, surtout pour les museaux courts.']],
  test: 'Il met le museau dedans sur signal, sangle attachée, et la garde 10 minutes en marchant.', safety: 'Utilisez uniquement une muselière panier bien ajustée, et retirez-la dès qu’il montre des signes d’inconfort ou par forte chaleur.' }

);

/* Programmes guidés Plus (chien) */
PROGRAMS.length = 0;
PROGRAMS.push(
  { id: 'chiot8', sp: 'dog', icon: '🐶', title: 'Programme chiot : 8 semaines', sub: 'De l’arrivée à la maison au chiot serein', weeks: [
    ['Semaine 1', 'Installer les bases', ['marqueur', 'proprete', 'caisse']],
    ['Semaine 2', 'Premiers signaux et douceur', ['assis', 'mordillements', 'socialisation']],
    ['Semaine 3', 'Se poser', ['coucher', 'manipulations', 'voiture']],
    ['Semaine 4', 'Calme et sécurité', ['place', 'laisse-le', 'bruits']],
    ['Semaine 5', 'Vivre ensemble', ['solitude', 'sauter', 'visiteurs']],
    ['Semaines 6 à 8', 'Dehors, en sécurité', ['laisse', 'reste', 'rappel']]
  ] },
  { id: 'balade6', sp: 'dog', icon: '🌲', title: 'Programme balade parfaite : 6 semaines', sub: 'Marche, rappel, rencontres : des sorties sereines', weeks: [
    ['Semaine 1', 'Marcher détendu', ['laisse']],
    ['Semaine 2', 'Attention et maîtrise', ['pied', 'reste']],
    ['Semaine 3', 'Rappel et rapport', ['rappel', 'rapport']],
    ['Semaine 4', 'Sécurité dehors', ['laisse-le', 'congeneres']],
    ['Semaine 5', 'Sons et voyage', ['bruits', 'voiture']],
    ['Semaine 6', 'Jeux pour le plaisir', ['nosework', 'tours']]
  ] },
  { id: 'serein', sp: 'dog', icon: '🧘', title: 'Programme chien serein : 6 semaines', sub: 'Calme, solitude, émotions maîtrisées', weeks: [
    ['Semaine 1', 'Un endroit à soi', ['place', 'caisse']],
    ['Semaine 2', 'Apprendre la solitude', ['solitude']],
    ['Semaine 3', 'Bruits et alertes', ['bruits', 'aboiements']],
    ['Semaine 4', 'Accueil calme', ['visiteurs', 'sauter']],
    ['Semaine 5', 'Confiance aux soins', ['manipulations', 'museliere']],
    ['Semaine 6', 'Sérénité dehors', ['congeneres', 'nosework']]
  ] }
);
