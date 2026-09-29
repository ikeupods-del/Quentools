/* Wouf Éducation — leçons chat supplémentaires (Wouf Plus), 4ᵉ série : bébé, hydratation, poids, sorties.
   Renforcement positif, aucune punition. Contenu à faire relire par un vétérinaire ou un comportementaliste félin diplômé
   avant communication commerciale. */
LESSONS.push(

{ id: 'c-bebe', sp: 'cat', free: false, icon: '👶', cat: 'Changements de vie', title: 'Chat et arrivée d’un bébé', from: 12, dur: 'Préparation sur 2 à 3 mois', span: '2 à 3 mois', level: 'Essentiel',
  goal: 'Votre chat accueille le bébé sereinement, garde ses repères, ses refuges en hauteur et n’est jamais laissé sans surveillance auprès de lui.',
  why: 'Un chat est attaché à ses routines : nouveaux sons, odeurs et bouleversements peuvent le stresser (malpropreté, griffades, retrait). Avec une préparation progressive, il apprend que le bébé n’est pas une menace, et il conserve ses repères et son territoire.',
  need: ['Des perchoirs et cachettes en hauteur', 'Enregistrements de sons de bébé', 'Une barrière ou porte pour le berceau', 'Jeux et friandises'],
  steps: [
    { t: 'Préserver les repères du chat', min: 10, b: 'Gardez sa litière, sa gamelle et ses refuges dans des endroits calmes et accessibles. Ajoutez des perchoirs pour qu’il puisse observer d’en haut. Conservez les horaires de repas et de jeux : c’est ce qui le rassure le plus.', crit: 'Le chat dispose d’au moins 2 refuges en hauteur et d’une routine stable.' },
    { t: 'Habituer aux sons et aux odeurs', min: 5, b: 'Faites écouter des sons de bébé à faible volume en jouant ou en donnant des friandises. Utilisez les produits de bébé (lotion, lingettes) pour qu’il en connaisse l’odeur. Offrez de bonnes expériences en même temps : jeu, friandise, caresse.', crit: 'Il reste calme en entendant des pleurs enregistrés.' },
    { t: 'Interdire calmement le berceau', min: 5, b: 'Installez une moustiquaire de berceau ou une barrière pour empêcher l’accès. Récompensez le chat qui reste à distance ou choisit son perchoir. Fermez la porte de la chambre du bébé lorsque vous n’y êtes pas.', crit: 'Il ne monte pas sur le berceau ni sur la table à langer.' },
    { t: 'La rencontre progressive', min: 10, b: 'Laissez-le sentir un vêtement de bébé avant l’arrivée. À la maison, laissez-le observer à distance, sans forcer. Restez calme, récompensez sa curiosité paisible. Ne mettez jamais le chat dans les bras ou près du visage du bébé.', crit: 'Il observe le bébé sans stress, à distance.' },
    { t: 'Du temps pour le chat', min: 10, b: 'Continuez le jeu quotidien et les câlins, même brefs. Un chat qui perd toute attention devient plus stressé. Prévoyez des séances de jeu pendant les siestes du bébé ou avec l’aide de l’autre parent.', crit: 'Il bénéficie d’au moins 2 séances de jeu par jour.' }
  ],
  plan: [['2 mois avant', 'Aménager perchoirs et refuges, installer les barrières.'], ['1 mois avant', 'Sons de bébé, odeurs, interdiction calme du berceau.'], ['Le jour J', 'Odeur du bébé avant la rencontre, retrouvailles calmes.'], ['Premières semaines', 'Jeux quotidiens, surveillance, litière hors de portée du bébé.']],
  next: ['Consulter le vétérinaire si le chat change de comportement (malpropreté, agressivité, perte d’appétit).', 'Voir « Aménager sa maison pour un chat épanoui » et « Pipi hors de la litière ».', 'Enseigner aux enfants plus grands à respecter le chat.'],
  mistakes: ['Punir le chat qui s’approche : il associe le bébé à la punition.', 'Laisser le chat dormir dans le berceau.', 'Supprimer d’un coup ses habitudes et son espace.', 'Laisser la litière accessible aux tout-petits.'],
  faq: [['Il est jaloux ?', 'Plutôt stressé : gardez ses habitudes, ses refuges et ses moments de jeu.'], ['Il urine près du berceau.', 'Consultez le vétérinaire, nettoyez avec un enzymatique et voyez la leçon « Pipi hors de la litière ».']],
  test: 'Le chat garde sa routine, se repose dans ses refuges et reste calme en présence du bébé.', safety: 'Ne laissez jamais un chat seul avec un nourrisson et empêchez-le de monter dans le berceau. Pendant la grossesse, demandez conseil à votre médecin sur l’entretien de la litière (toxoplasmose) et ne laissez pas les déjections s’accumuler.' },

{ id: 'c-eau', sp: 'cat', free: false, icon: '💧', cat: 'Bien-être', title: 'Faire boire son chat : hydratation et santé urinaire', from: 8, dur: '5 min × 2 par jour', span: '2 à 4 semaines', level: 'Essentiel',
  goal: 'Votre chat boit davantage grâce à plusieurs points d’eau attractifs et à une alimentation adaptée, pour protéger ses reins et sa vessie.',
  why: 'Les chats descendent d’animaux du désert : ils boivent peu, surtout quand la nourriture est sèche. Une faible hydratation favorise les cystites, les calculs urinaires et les maladies rénales, très fréquentes. Multiplier les occasions de boire est l’un des gestes les plus utiles pour sa santé.',
  need: ['Plusieurs gamelles larges ou une fontaine à eau', 'Nourriture humide (pâtée)', 'Un carnet pour noter la consommation', 'Un vétérinaire pour un avis si besoin'],
  steps: [
    { t: 'Multiplier les points d’eau', min: 10, b: 'Placez plusieurs bols dans différentes pièces, à l’écart de la nourriture et de la litière (les chats n’aiment pas boire près de leur repas). Choisissez des bols larges, peu profonds, en verre, inox ou céramique, sans odeur de plastique.', crit: 'Il dispose d’au moins 3 points d’eau bien placés.' },
    { t: 'Tester une fontaine', min: 5, b: 'Beaucoup de chats préfèrent l’eau qui coule. Essayez une fontaine à eau et nettoyez-la chaque semaine. Gardez aussi les bols traditionnels pendant quelques jours, le temps que le chat s’habitue.', crit: 'Il utilise la fontaine ou l’un des bols au moins 3 fois par jour.' },
    { t: 'Augmenter l’eau dans l’alimentation', min: 5, b: 'Proposez de la nourriture humide, plus riche en eau (environ 75 à 80 % d’eau, contre 10 % pour les croquettes). Vous pouvez aussi ajouter un peu d’eau tiède à la pâtée ou aux croquettes. Transition progressive sur une à deux semaines.', crit: 'Au moins un repas sur deux est humide.' },
    { t: 'Rendre boire attractif', min: 5, b: 'Ajoutez quelques glaçons, un peu de bouillon de poulet sans sel ni oignon, ou l’eau de cuisson du thon au naturel. Changez l’eau chaque jour. Gardez tout propre : les chats sont sensibles à la fraîcheur.', crit: 'Sa consommation quotidienne augmente.' },
    { t: 'Surveiller les signes d’alerte', min: 5, b: 'Consultez si votre chat boit soudain beaucoup plus, urine plus, pas du tout, ou avec effort. Vérifiez la déshydratation : soulevez délicatement la peau du dos : elle doit retomber immédiatement. Un carnet aide à repérer les changements.', crit: 'Vous connaissez ses habitudes de boisson et les signes d’alerte.' }
  ],
  plan: [['Jours 1 à 3', 'Ajouter des bols et les placer loin de la nourriture et de la litière.'], ['Jours 4 à 7', 'Tester la fontaine, nettoyer l’eau chaque jour.'], ['Semaines 2 et 3', 'Passer progressivement à plus de pâtée.'], ['Semaine 4', 'Faire le point : consommation, urines, poids.']],
  next: ['Voir « Bien nourrir son chat : eau, ration et poids ».', 'Voir « Pipi hors de la litière ».', 'Prévoir un contrôle annuel avec bilan urinaire, surtout après 7 ans.'],
  mistakes: ['Un seul bol, près de la litière ou de la nourriture.', 'Changer d’alimentation d’un coup.', 'Oublier de nettoyer bols et fontaine.', 'Ignorer une soif soudaine : elle peut signaler une maladie.'],
  faq: [['Il boit dans le robinet ou le verre.', 'Il préfère l’eau qui coule ou fraîche : essayez une fontaine ou changez l’eau plus souvent.'], ['Mon chat ne mange que des croquettes.', 'Introduisez la pâtée à petites doses, mélangée aux croquettes, avec patience.']],
  test: 'Il boit régulièrement à plusieurs endroits, mange au moins un repas humide par jour et ses urines restent normales.', safety: 'Un chat qui fait des efforts pour uriner sans résultat, ou qui boit énormément d’un coup, doit voir un vétérinaire en urgence. Les maladies rénales et le diabète débutent souvent par une soif inhabituelle.' },

{ id: 'c-poids', sp: 'cat', free: false, icon: '⚖️', cat: 'Bien-être', title: 'Chat en surpoids : perdre du poids en douceur', from: 26, dur: '10 min × 1 par jour', span: '3 à 6 mois', level: 'Essentiel',
  goal: 'Votre chat retrouve un poids sain, progressivement et sans conflit, grâce à une ration mesurée, davantage de jeu et un suivi régulier.',
  why: 'Le surpoids est très fréquent chez le chat et favorise le diabète, l’arthrose, les maladies urinaires et raccourcit la vie. Un régime trop rapide est dangereux (maladie du foie). La perte doit être progressive, encadrée par un vétérinaire, et associée à plus d’activité.',
  need: ['Balance de cuisine précise', 'Un vétérinaire pour définir l’objectif', 'Distributeur ou jouet à croquettes', 'Jouets de chasse simulée'],
  steps: [
    { t: 'Faire le point avec le vétérinaire', min: 15, b: 'Faites peser votre chat et évaluer sa note d’état corporel (côtes palpables, taille visible). Le vétérinaire écarte une cause médicale et fixe un poids cible et une ration adaptée. Ne réduisez jamais brutalement la nourriture sans avis.', crit: 'Vous connaissez son poids cible et sa ration quotidienne.' },
    { t: 'Peser la ration', min: 5, b: 'Pesez chaque jour la ration en grammes (jamais à l’œil ou à la mesure). Tenez compte de toutes les friandises, qui doivent représenter moins de 10 % des calories. Répartissez en 3 à 4 petits repas.', crit: 'Toute la nourriture est pesée chaque jour.' },
    { t: 'Passer au jeu et à la chasse', min: 10, b: 'Deux à trois séances de 5 à 10 minutes par jour de chasse simulée (canne à pêche, balle, souris). Cachez la nourriture, utilisez des distributeurs et des parcours en hauteur. Le chat dépense de l’énergie tout en s’occupant.', crit: 'Il joue au moins 15 minutes par jour.' },
    { t: 'Gérer les demandes de nourriture', min: 5, b: 'Ne cédez pas aux miaulements de faim : offrez du jeu, une caresse ou un repas à horaire fixe. Le chat obtient de la nourriture quand vous décidez, jamais quand il réclame, pour ne pas renforcer les demandes.', crit: 'Les miaulements de demande diminuent en 2 semaines.' },
    { t: 'Suivre la perte de poids', min: 5, b: 'Pesez-le toutes les 2 à 4 semaines. La perte saine est lente : environ 0,5 à 2 % du poids du corps par semaine. Si elle est plus rapide, ou si le chat mange peu, consultez : un chat qui ne mange plus peut développer une maladie du foie grave.', crit: 'Il perd du poids régulièrement, sans refuser de manger.' }
  ],
  plan: [['Semaine 1', 'Consultation et ration pesée, arrêt des restes.'], ['Semaines 2 à 4', 'Plus de jeux, distributeur de croquettes, 3 à 4 repas.'], ['Mois 2 et 3', 'Pesée toutes les 2 à 4 semaines, ajustement avec le vétérinaire.'], ['Mois 4 à 6', 'Stabilisation au poids cible, maintien de l’activité.']],
  next: ['Voir « Bien nourrir son chat : eau, ration et poids ».', 'Voir « Jeu et enrichissement : la chasse simulée ».', 'Utiliser le plan de perte de poids de Wouf pour suivre la courbe.'],
  mistakes: ['Faire jeûner le chat : risque de lipidose hépatique.', 'Réduire trop vite ou sans avis vétérinaire.', 'Mesurer à l’œil ou avec un verre doseur.', 'Céder aux miaulements à chaque fois.'],
  faq: [['Il mendie tout le temps.', 'Augmentez le nombre de petits repas, utilisez des distributeurs et du jeu, et gardez des horaires fixes.'], ['Il refuse la nouvelle nourriture.', 'Faites la transition sur 1 à 2 semaines et demandez conseil au vétérinaire pour choisir une alimentation adaptée.']],
  test: 'Après 3 mois, il a perdu du poids progressivement, joue davantage et ne réclame plus de nourriture toute la journée.', safety: 'Un chat en surpoids ne doit jamais être mis à la diète stricte : le jeûne, même de quelques jours, peut provoquer une maladie du foie grave. Suivez toujours l’avis d’un vétérinaire.' },

{ id: 'c-dehors', sp: 'cat', free: false, icon: '🌳', cat: 'Sorties', title: 'Chat qui sort : sécurité, identification et catio', from: 16, dur: 'Préparation sur 2 à 4 semaines', span: '2 à 4 semaines', level: 'Utile',
  goal: 'Votre chat profite de l’extérieur en sécurité : identifié, protégé, avec un accès contrôlé (catio, harnais ou sorties encadrées) et un retour fiable.',
  why: 'L’extérieur offre stimulation et exercice, mais aussi des dangers : routes, bagarres, maladies, poisons, vols, disparitions. Un chat identifié, vacciné, protégé contre les parasites, et dont les sorties sont progressives et encadrées, vit plus longtemps et plus sereinement.',
  need: ['Puce électronique ou tatouage à jour', 'Collier avec fermeture de sécurité (facultatif)', 'Harnais adapté', 'Un catio ou un balcon sécurisé (facultatif)'],
  steps: [
    { t: 'Identifier et protéger', min: 10, b: 'Vérifiez que l’identification (puce ou tatouage) est enregistrée avec vos coordonnées actuelles. Vaccination à jour, traitement antiparasitaire régulier (puces, tiques, vers) et stérilisation : elle réduit fugues, bagarres et marquages. Vérifiez les règles d’identification en vigueur.', crit: 'Identification à jour, vaccins et antiparasitaires à jour.' },
    { t: 'Sécuriser l’accès', min: 20, b: 'Un catio (enclos grillagé) ou un balcon filet offre l’extérieur sans les risques. Sinon, préférez des sorties à la journée, surveillées, et rentrez-le la nuit et à la tombée du jour, quand les accidents et les rencontres sont les plus fréquents.', crit: 'L’accès extérieur est sécurisé ou surveillé.' },
    { t: 'Le harnais et la découverte guidée', min: 10, b: 'Habituez-le au harnais à la maison, avec friandises. Puis premières sorties dans un jardin calme, longe légère, avec vous. Laissez-le mener, sans le tirer. Cette étape permet de sortir en sécurité, même en ville.', crit: 'Il marche avec le harnais et explore sans stress.' },
    { t: 'Le rappel avec le repas', min: 5, b: 'Associez un signal (bruit de gamelle, mot bref) à un repas ou une friandise très aimée. Rappelez-le régulièrement, même quand il n’a pas faim, pour que ce signal reste payant. Rentrez-le à heure fixe le soir.', crit: 'Il revient au signal 8 fois sur 10 dans le jardin.' },
    { t: 'Prévenir les dangers du quotidien', min: 10, b: 'Attention aux plantes toxiques (lys), à l’antigel (très toxique et attirant), aux produits du jardin et aux raticides. Repérez les zones de passage dangereuses. Après chaque sortie, inspectez-le : plaies, tiques, comportement.', crit: 'Vous avez vérifié les dangers de votre jardin et de votre quartier.' }
  ],
  plan: [['Semaine 1', 'Vérifier l’identification, les vaccins et les antiparasitaires.'], ['Semaine 2', 'Sécuriser l’accès (catio, balcon filet) ou choisir un cadre de sorties surveillées.'], ['Semaine 3', 'Harnais et premières sorties guidées.'], ['Semaine 4', 'Rappel avec le repas, rentrée à heure fixe.']],
  next: ['Lire « Harnais et sorties en sécurité ».', 'Lire « Déménagement et changements » avant une installation en maison.', 'Signaler tout changement de comportement au vétérinaire (bagarres, plaies, amaigrissement).'],
  mistakes: ['Laisser sortir un chat non identifié ou non vacciné.', 'Le laisser dehors la nuit sans surveillance.', 'Croire qu’un chat « connaît sa rue » et n’a pas besoin de protection.', 'Utiliser un collier classique sans fermeture de sécurité : risque d’étranglement.'],
  faq: [['Il ne revient plus.', 'Cherchez tôt, alertez le vétérinaire, les voisins, les fichiers d’identification et les groupes locaux ; l’identification à jour est la clé.'], ['Est-ce cruel de garder un chat en appartement ?', 'Non, si l’environnement est riche : perchoirs, jeux, chasse simulée, fenêtre sécurisée et éventuellement un catio.']],
  test: 'Il est identifié, protégé, sort dans un cadre sécurisé, revient au signal et rentre chaque soir.', safety: 'L’antigel est mortel même à petite dose et attire les chats : nettoyez immédiatement toute fuite. Les lys sont très toxiques pour le chat (reins) : ne les gardez ni dans la maison ni dans le jardin. En cas d’ingestion ou de doute, consultez immédiatement un vétérinaire.' }

);

PROGRAMS.push(
  { id: 'chat-sante3', sp: 'cat', icon: '💚', title: 'Programme chat en forme : 3 semaines', sub: 'Hydratation, poids et dents pour une longue vie', weeks: [
    ['Semaine 1', 'Bien boire', ['c-eau', 'c-alimentation']],
    ['Semaine 2', 'Un poids sain', ['c-poids', 'c-jeu']],
    ['Semaine 3', 'Bouche et soins', ['c-dents', 'c-soins']]
  ] }
);
