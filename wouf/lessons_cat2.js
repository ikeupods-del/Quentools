/* Wouf Éducation — leçons chat supplémentaires (Wouf Plus). Principes : environnement adapté, respect du rythme du chat,
   aucune punition. Tout changement soudain de comportement doit d'abord faire évoquer un problème de santé. */
LESSONS.push(

{ id: 'c-peur', sp: 'cat', free: false, icon: '🫣', cat: 'Émotions', title: 'Chat craintif : gagner sa confiance', from: 8, dur: '5 min × 3 par jour', span: '3 à 12 semaines', level: 'Important',
  goal: 'Votre chat timide se cache moins, vient à vous de lui-même et accepte votre présence, vos caresses et les visiteurs.',
  why: 'Un chat craintif n’est ni méchant ni ingrat : il manque de sécurité, souvent à cause d’une socialisation insuffisante ou d’un mauvais vécu. La confiance se gagne en lui laissant le contrôle : il décide de s’approcher, de partir, de se cacher, sans pression. Chaque interaction doit être un choix pour lui.',
  need: ['Cachettes (boîtes, niches, tunnels)', 'Friandises très appétissantes', 'Cannes à jouer', 'Diffuseur de phéromones (facultatif)'],
  steps: [
    { t: 'Un territoire sûr', min: 0, b: 'Installez des cachettes en hauteur et au sol dans chaque pièce. Un chat qui peut se cacher se sent moins menacé. Ne le sortez jamais de force de sa cachette.', crit: 'Il utilise ses cachettes et sort de lui-même.' },
    { t: 'Être là sans interagir', min: 5, b: 'Asseyez-vous dans la pièce, sur le côté, sans le regarder ni le toucher, en lisant ou en parlant doucement. Le chat apprend que votre présence est neutre et prévisible.', crit: 'Il reste dans la pièce en votre présence.' },
    { t: 'Les friandises sur la route', min: 5, b: 'Lancez des friandises près de lui, puis un peu plus près de vous, sans jamais forcer. Clignez lentement des yeux (le « sourire du chat ») et détournez le regard.', crit: 'Il vient prendre une friandise à 1 mètre.' },
    { t: 'Jouer à distance', min: 5, b: 'Canne à jouer : le jeu construit la confiance sans contact direct. Faites-le en fin de journée, au même endroit.', crit: 'Il joue avec la canne devant vous.' },
    { t: 'Le toucher choisi', min: 5, b: 'Présentez un doigt à hauteur de son nez : s’il vient le sentir, caressez la joue une seconde, puis arrêtez. Il décide de la suite. Allongez petit à petit.', crit: 'Il recherche vos caresses.' }
  ],
  plan: [['Semaine 1', 'Cachettes, présence calme, aucune pression.'], ['Semaine 2', 'Friandises lancées, séances de 5 minutes trois fois par jour.'], ['Semaines 3 et 4', 'Jeu à distance, puis friandises à la main.'], ['Semaines 5 à 12', 'Toucher choisi, présentation progressive des visiteurs.']],
  next: ['Habituer le chat à un harnais pour des sorties courtes en sécurité.', 'Consulter un vétérinaire comportementaliste si la peur est intense.', 'Ajouter des phéromones apaisantes dans les lieux de vie.'],
  mistakes: ['Le sortir de force de sa cachette : la peur augmente.', 'Le fixer dans les yeux, ce qui est une menace pour un chat.', 'Le punir quand il se cache ou fuit.', 'Le laisser se débrouiller face à des visiteurs ou des enfants bruyants.'],
  faq: [['Il ne vient jamais.', 'Réduisez encore la pression : moins d’attention directe, plus de friandises lancées à distance. Le progrès peut prendre des semaines.'], ['Il s’est mis à se cacher soudainement.', 'Écartez une douleur ou une maladie : consultez avant tout.']],
  test: 'Il sort seul, vient prendre une friandise à la main et accepte une caresse à la joue.', safety: 'Un chat qui se cache soudain, mange peu ou ne se toilette plus peut être malade : consultez.' },

{ id: 'c-harnais', sp: 'cat', free: false, icon: '🦺', cat: 'Sorties', title: 'Harnais et sorties en sécurité', from: 16, dur: '3 min × 2 par jour', span: '3 à 6 semaines', level: 'Utile',
  goal: 'Votre chat accepte un harnais bien ajusté et explore dehors en toute sécurité, à son rythme.',
  why: 'Pour un chat d’appartement, des sorties encadrées enrichissent la vie et réduisent l’ennui. Tous les chats n’aiment pas cela : on vise un chat détendu qui choisit ses explorations, jamais un chat traîné. Le harnais doit être à sa taille, de type « gilet » pour éviter les échappées.',
  need: ['Un harnais gilet ajusté', 'Une longe légère', 'Friandises de haute valeur', 'Un balcon sécurisé ou un jardin calme'],
  steps: [
    { t: 'Découvrir le harnais', min: 3, b: 'Posez le harnais près de la gamelle, puis sur son couchage. Faites-le renifler avec une friandise. Ne l’enfilez que lorsqu’il est détendu.', crit: 'Il s’approche du harnais sans crainte.' },
    { t: 'L’enfiler quelques secondes', min: 3, b: 'Enfilez le harnais 5 secondes, récompensez, retirez. Puis 30 secondes, 2 minutes, jusqu’à 10 minutes, en le distrayant par un jeu ou un repas.', crit: 'Il porte le harnais 10 minutes en jouant.' },
    { t: 'La longe dans la maison', min: 5, b: 'Attachez la longe légère et laissez-le la traîner, puis tenez-la sans tirer, en le suivant.', crit: 'Il marche avec la longe sans se figer.' },
    { t: 'Dehors, en douceur', min: 10, b: 'Portez-le dans un endroit calme (balcon sécurisé, jardin), posez-le et laissez-le explorer à son rythme. Ne tirez jamais : suivez-le. Rentrez avant qu’il ne soit stressé.', crit: 'Il explore 10 minutes, détendu.' }
  ],
  plan: [['Semaine 1', 'Le harnais près de la gamelle, puis enfilé quelques secondes.'], ['Semaine 2', 'Port dans la maison, 10 minutes, avec jeu.'], ['Semaine 3', 'Longe dans la maison, puis balcon.'], ['Semaine 4 et suivantes', 'Sorties courtes, calmes et régulières.']],
  next: ['Habituer à la caisse de transport pour aller dehors.', 'Choisir des lieux calmes à distance des chiens.', 'Vérifier la vaccination et le traitement antiparasitaire avant les sorties.'],
  mistakes: ['Un harnais trop large : il s’échappe, et c’est très dangereux.', 'Tirer sur la longe.', 'Sortir un chat non vacciné ou non pucé.', 'Forcer un chat qui se fige ou se couche.'],
  faq: [['Il se fige comme une statue.', 'Trop de stress : enlevez le harnais, recommencez plus lentement dans la maison.'], ['Tous les chats peuvent-ils sortir ?', 'Non : certains préfèrent rester à l’intérieur. Respectez-le et enrichissez la maison.']],
  test: 'Il porte son harnais 10 minutes puis explore dehors de façon détendue.', safety: 'Chat toujours pucé, vacciné et traité contre les parasites avant toute sortie. Surveillance permanente.' },

{ id: 'c-nuit', sp: 'cat', free: false, icon: '🌙', cat: 'Savoir-vivre', title: 'Miaulements et réveils la nuit', from: 12, dur: 'Routine du soir', span: '2 à 4 semaines', level: 'Utile',
  goal: 'Votre chat dort la nuit ou reste calme, sans vous réveiller à 4 h du matin.',
  why: 'Le chat est crépusculaire : très actif à l’aube et au crépuscule. Il miaule la nuit par ennui, faim, besoin d’attention ou parfois par douleur ou maladie. En dépensant son énergie le soir et en ne récompensant jamais les appels, on décale son rythme.',
  need: ['Canne à jouer', 'Repas du soir tardif', 'Distributeur de croquettes ou jouet de nourriture', 'Bouchons d’oreilles (patience !)'],
  steps: [
    { t: 'Exclure la santé', min: 0, b: 'Un chat âgé qui miaule la nuit peut souffrir d’hyperthyroïdie, de troubles cognitifs, d’hypertension ou de douleurs. Consultez d’abord si le comportement est nouveau.', crit: 'Bilan vétérinaire fait.' },
    { t: 'Le rituel du soir', min: 10, b: 'Jouez intensément 10 minutes avec une canne à jouer juste avant le coucher, puis donnez un repas complet. La séquence chasse, capture, repas, toilette, sommeil est un signal de repos.', crit: 'Il se toilette et dort après le repas.' },
    { t: 'Ne pas récompenser les appels', min: 0, b: 'Ne lui parlez pas, ne le nourrissez pas, ne le touchez pas quand il miaule la nuit. Chaque réponse, même une gronderie, le confirme. Attendez : récompensez le calme le jour.', crit: 'Moins de miaulements nocturnes en 2 semaines.' },
    { t: 'Un environnement de nuit', min: 0, b: 'Laissez de l’eau, un endroit chaud, une cachette, un jouet de nourriture. Réduisez les stimulations visuelles à la fenêtre (rideaux, film).', crit: 'Il dort dans son coin.' },
    { t: 'Réveil du matin', min: 0, b: 'Distribuez son petit-déjeuner avec un distributeur automatique programmé un peu avant votre réveil pour couper le lien avec vous.', crit: 'Plus de réveil avant l’heure.' }
  ],
  plan: [['Jours 1 à 3', 'Bilan vétérinaire si besoin, rituel du soir.'], ['Semaine 1', 'Jeu intense et repas tardif, chaque soir.'], ['Semaines 2 et 3', 'Aucune réponse aux appels nocturnes, distributeur automatique.'], ['Semaine 4', 'Ajuster : plus de jeu, repas plus tardif si besoin.']],
  next: ['Ajouter des perchoirs et une fenêtre avec vue pendant la journée.', 'Envisager un compagnon si le chat s’ennuie seul (avec précaution).', 'Utiliser un diffuseur de phéromones dans la chambre.'],
  mistakes: ['Céder « pour avoir la paix » : il recommencera plus fort.', 'Punir ou lancer de l’eau : stress et effet contraire.', 'Négliger le jeu du soir.', 'Ne pas consulter face à un changement soudain.'],
  faq: [['Il miaule en tournant en rond, la nuit.', 'Chez un chat âgé, cela peut signaler un trouble cognitif ou une maladie : consultez.'], ['Le nouvel horaire ne marche pas.', 'Augmentez le jeu du soir et retardez le repas ; soyez cohérent pendant au moins 2 semaines.']],
  test: 'Une semaine sans réveil nocturne, avec routine du soir en place.', safety: 'Miaulements soudains la nuit chez un chat âgé : consultez.' },

{ id: 'c-senior', sp: 'cat', free: false, icon: '🐈‍⬛', cat: 'Bien-être', title: 'Chat senior : confort, santé et complicité', from: 520, dur: '10 min par jour', span: 'En continu', level: 'Essentiel',
  goal: 'Votre chat âgé garde son confort, sa mobilité et son appétit, avec des soins et un environnement adaptés.',
  why: 'À partir de 10 ans, l’arthrose, les maladies rénales, la thyroïde et les troubles cognitifs deviennent fréquents. Le chat cache sa douleur : ne pas jouer, moins sauter, moins se toiletter, uriner hors de la litière sont souvent des signes de souffrance, pas de « caractère ». Un dépistage régulier et un environnement adapté changent tout.',
  need: ['Litière à bord bas', 'Marches ou rampes pour monter', 'Couchages chauds et accessibles', 'Bilan sanguin et urinaire'],
  steps: [
    { t: 'Adapter le lieu de vie', min: 0, b: 'Ajoutez des marches pour accéder au canapé ou à la fenêtre, un bac à bords bas, des couchages moelleux et chauds, gamelles et eau à hauteur facile, plusieurs points d’eau.', crit: 'Il accède facilement à tous ses lieux.' },
    { t: 'Dépister', min: 0, b: 'Bilan sanguin et urinaire tous les 6 à 12 mois, prise de tension, contrôle des dents et du poids. Beaucoup de maladies de l’âge se traitent bien si elles sont détectées tôt.', crit: 'Bilan vétérinaire à jour.' },
    { t: 'Boire et manger', min: 0, b: 'Alimentation adaptée, humide de préférence, eau fraîche, fontaine à eau. Surveillez la soif, l’appétit et le poids. Pesez tous les mois.', crit: 'Poids stable et bon appétit.' },
    { t: 'Jouer autrement', min: 5, b: 'Séances courtes, mouvements lents, jouets au sol ou à hauteur faible. Le jeu préserve muscles et moral.', crit: 'Il joue 5 minutes deux fois par jour.' },
    { t: 'Prendre soin de son pelage', min: 5, b: 'Brossage doux quotidien : un chat âgé se toilette moins bien. Vérifiez griffes (qui poussent trop), dents, yeux.', crit: 'Pelage propre et griffes entretenues.' }
  ],
  plan: [['Semaine 1', 'Adapter la maison : marches, litière, couchages.'], ['Semaine 2', 'Bilan vétérinaire complet.'], ['Semaine 3', 'Ajuster l’alimentation et l’eau, pesée mensuelle.'], ['Chaque jour', 'Jeu lent, brossage, observation de la litière et de l’appétit.']],
  next: ['Compléments articulaires sur avis vétérinaire.', 'Acupuncture ou physiothérapie féline.', 'Diffuseur de phéromones dans les lieux de repos.'],
  mistakes: ['Attribuer à l’âge une perte de poids ou de l’appétit.', 'Ne pas consulter pour une litière négligée.', 'Changer brutalement ses habitudes et son territoire.', 'Ne plus jouer avec lui.'],
  faq: [['Il boit beaucoup et urine beaucoup.', 'Signe fréquent de maladie rénale ou de diabète : consultez rapidement.'], ['Il miaule la nuit.', 'Voir aussi la leçon sur les miaulements nocturnes ; consultez si le changement est récent.']],
  test: 'Maison adaptée, bilan vétérinaire fait, poids et appétit stables.', safety: 'Toute perte de poids, soif accrue, litière négligée ou refus de nourriture : consultez rapidement.' },

{ id: 'c-amenager', sp: 'cat', free: false, icon: '🪜', cat: 'Bien-être', title: 'Aménager sa maison pour un chat épanoui', from: 8, dur: 'Aménagement à faire une fois', span: '1 à 2 semaines', level: 'Essentiel',
  goal: 'Votre logement offre à votre chat de la verticalité, des cachettes, des zones de chasse et de repos, pour un chat calme et en forme.',
  why: 'Un chat d’appartement peut être heureux si on lui donne un vrai territoire : monter, se cacher, observer, chasser, griffer. Un environnement pauvre provoque ennui, obésité, agressivité, malpropreté. Les 5 piliers d’un environnement sain sont la clé.',
  need: ['Arbre à chat solide', 'Étagères ou perchoirs', 'Fontaine à eau', 'Griffoirs, cachettes, jouets'],
  steps: [
    { t: 'La verticalité', min: 0, b: 'Arbre à chat stable jusqu’au plafond ou étagères murales, perchoir à la fenêtre. Un chat se sent en sécurité en hauteur. Plusieurs animaux : plusieurs perchoirs.', crit: 'Il utilise les hauteurs chaque jour.' },
    { t: 'Des cachettes', min: 0, b: 'Boîtes en carton, niches, tunnels, dessous de meuble accessibles. Une cachette par chat, au moins.', crit: 'Il utilise ses cachettes.' },
    { t: 'Les ressources séparées', min: 0, b: 'Gamelles, eau, litières, couchages, griffoirs à différents endroits, loin les uns des autres. Nourriture et eau séparées de la litière.', crit: 'Aucun conflit autour des ressources.' },
    { t: 'La chasse chez soi', min: 5, b: 'Cachez des croquettes, utilisez des tapis de fouille, des balles distributrices, des jouets qui bougent. Rotation hebdomadaire des jouets.', crit: 'Il chasse sa nourriture.' },
    { t: 'La fenêtre sur le monde', min: 0, b: 'Une fenêtre sécurisée avec vue, éventuellement un mangeoire d’oiseaux à distance : le meilleur « téléviseur » pour un chat. Filets ou grillages aux fenêtres et balcons.', crit: 'Il observe dehors, en sécurité.' }
  ],
  plan: [['Jour 1', 'Inventaire : ce qui manque (hauteur, cachettes, jeux).'], ['Semaine 1', 'Installer arbre, perchoir, cachettes.'], ['Semaine 2', 'Séparer les ressources, ajouter fontaine et tapis de fouille.'], ['Chaque semaine', 'Faire tourner les jouets, cacher la nourriture.']],
  next: ['Créer un « catio » (balcon grillagé).', 'Ajouter des chemins en hauteur entre les pièces.', 'Diffuseur de phéromones dans les lieux de vie.'],
  mistakes: ['Un arbre à chat instable : il n’osera plus l’utiliser.', 'Toutes les ressources au même endroit.', 'Fenêtres ou balcons non sécurisés (chute).', 'Toujours les mêmes jouets.'],
  faq: [['Le chat ignore l’arbre à chat.', 'Placez-le près d’une fenêtre, frottez-y une friandise ou une plume ; augmentez la stabilité.'], ['Plusieurs chats se disputent.', 'Multipliez les ressources et les hauteurs ; consultez un comportementaliste si les conflits persistent.']],
  test: 'Le chat monte, se cache, chasse sa nourriture et observe dehors chaque jour.', safety: 'Sécurisez toutes les fenêtres et balcons : les chutes sont fréquentes.' },

{ id: 'c-alimentation', sp: 'cat', free: false, icon: '🍽️', cat: 'Bien-être', title: 'Bien nourrir son chat : eau, ration et poids', from: 8, dur: 'Routine quotidienne', span: '2 à 4 semaines', level: 'Essentiel',
  goal: 'Votre chat mange une alimentation adaptée en quantité, boit assez, garde un poids idéal.',
  why: 'L’obésité et les maladies urinaires et rénales sont parmi les principaux problèmes du chat. L’alimentation, l’eau et le mode de distribution (plusieurs petits repas, nourriture cachée) sont des leviers puissants pour la santé, avec la stérilisation qui augmente le risque de prise de poids.',
  need: ['Balance de cuisine', 'Aliment complet pour chat', 'Fontaine à eau', 'Tapis de fouille, distributeurs'],
  steps: [
    { t: 'Choisir un aliment complet', min: 0, b: 'Un aliment « complet » adapté à son âge et à son état (chaton, adulte, stérilisé, senior). La nourriture humide apporte de l’eau et protège les reins et les voies urinaires. Jamais d’aliment pour chien.', crit: 'Aliment adapté, complet.' },
    { t: 'Calculer la ration', min: 5, b: 'Utilisez le calculateur « Ration » de Wouf (menu Plus) : le besoin d’un chat stérilisé se calcule à partir de son poids idéal. Pesez sa nourriture à chaque repas, friandises comprises.', crit: 'Ration pesée et notée.' },
    { t: 'Fractionner et faire chasser', min: 0, b: 'Répartissez en 4 à 6 petits repas, ou cachez les croquettes dans des jouets. Le chat mange naturellement 10 à 15 petits repas par jour.', crit: 'Il mange plusieurs petits repas.' },
    { t: 'Faire boire', min: 0, b: 'Fontaine à eau, plusieurs points d’eau loin de la nourriture, gamelles en verre ou céramique larges. Une nourriture humide aide beaucoup.', crit: 'Il boit régulièrement.' },
    { t: 'Suivre le poids', min: 0, b: 'Pesez chaque mois. Une perte ou une prise de plus de 5 % en quelques semaines justifie une consultation. Pour un chat en surpoids, utilisez le plan de perte de poids de Wouf, toujours avec l’avis du vétérinaire, sans jeûne.', crit: 'Poids stable dans la fourchette.' }
  ],
  plan: [['Semaine 1', 'Choix de l’aliment, pesée de la ration.'], ['Semaine 2', 'Fractionner les repas, cacher une partie de la nourriture.'], ['Semaine 3', 'Fontaine à eau, alimentation humide.'], ['Chaque mois', 'Pesée et ajustement de la ration.']],
  next: ['Plan de perte de poids (Plus).', 'Alimentation sur mesure avec un vétérinaire nutritionniste.', 'Contrôle dentaire régulier.'],
  mistakes: ['Laisser la gamelle toujours pleine en libre-service sans contrôle.', 'Trop de friandises.', 'Donner du lait de vache ou des restes de table.', 'Faire jeûner un chat en surpoids : risque hépatique grave.'],
  faq: [['Il mange trop vite.', 'Utilisez un tapis de fouille ou une gamelle anti-glouton, fractionnez.'], ['Il refuse de manger depuis 24 heures.', 'Consultez : un jeûne prolongé est dangereux chez le chat.']],
  test: 'Ration pesée, repas fractionnés, poids stable sur 2 mois.', safety: 'Un chat qui ne mange plus depuis plus de 24 à 48 heures doit être vu par un vétérinaire.' }

);

PROGRAMS.push(
  { id: 'chat-serein4', sp: 'cat', icon: '😌', title: 'Programme chat serein : 4 semaines', sub: 'Un chat détendu, à l’aise chez lui', weeks: [
    ['Semaine 1', 'Un territoire complet', ['c-amenager', 'c-litiere']],
    ['Semaine 2', 'Confiance et jeu', ['c-peur', 'c-jeu']],
    ['Semaine 3', 'Repas et rythme', ['c-alimentation', 'c-nuit']],
    ['Semaine 4', 'Sorties et soins', ['c-harnais', 'c-soins']]
  ] },
  { id: 'chat-senior3', sp: 'cat', icon: '🐈‍⬛', title: 'Programme chat senior : 3 semaines', sub: 'Confort et santé après 10 ans', weeks: [
    ['Semaine 1', 'Un logis adapté', ['c-senior']],
    ['Semaine 2', 'Bien manger, bien boire', ['c-alimentation']],
    ['Semaine 3', 'Soins doux et jeu lent', ['c-soins', 'c-jeu']]
  ] }
);
