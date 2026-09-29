'use strict';
/* Wouf — quiz de validation, série 3 : toutes les leçons chat. Même format que quiz.js. */
Object.assign(QUIZZES, {
  'c-litiere': [
    ['Combien de bacs pour deux chats ?', 'Trois : un par chat, plus un', 'Un seul, bien entretenu', 'Deux, placés côte à côte', 'Avec plusieurs chats, on éloigne aussi les bacs les uns des autres.'],
    ['Où placer le bac ?', 'Dans un endroit calme, loin de la gamelle', 'Juste à côté de sa gamelle et de son eau', 'Près de la machine à laver, à l’abri', 'Un chat n’aime pas faire ses besoins près de son repas ou dans le bruit.'],
    ['Un accident hors du bac. Que faire ?', 'Nettoyer avec un produit enzymatique, sans gronder', 'Lui mettre le nez dedans pour qu’il comprenne', 'Nettoyer à l’eau de Javel pour bien désinfecter', 'L’eau de Javel et l’ammoniaque sentent l’urine et attirent le chat.']
  ],
  'c-griffoir': [
    ['Quel griffoir choisir ?', 'Haut et stable, qui ne bouge pas', 'Petit et léger, facile à déplacer', 'N’importe lequel, du moment qu’il griffe', 'Un griffoir qui bascule fait peur au chat.'],
    ['Où placer le griffoir ?', 'Là où il griffe déjà et près de son couchage', 'Dans une pièce fermée, loin des meubles', 'Au garage, pour ne pas abîmer la maison', 'Les chats aiment griffer au réveil et à des endroits de passage.'],
    ['Il griffe le canapé. Que faire ?', 'Placer un griffoir devant et protéger le meuble', 'L’asperger d’eau chaque fois qu’il griffe', 'Envisager l’ablation des griffes chez le vétérinaire', 'L’ablation des griffes est interdite et cruelle.']
  ],
  'c-accueil': [
    ['Où installer le chaton à son arrivée ?', 'Dans une seule pièce refuge', 'Dans toute la maison dès le premier jour', 'Dans le jardin', 'Un espace réduit le rassure ; on ouvre la maison après quelques jours.'],
    ['Il se cache. Que faire ?', 'Le laisser venir, sans le sortir de force', 'Le sortir de sa cachette pour le câliner', 'Supprimer toutes les cachettes', 'Le forcer augmente la peur.'],
    ['Avec quoi le faire jouer ?', 'Un jouet, jamais les mains', 'Vos mains et vos pieds', 'Des ficelles laissées en libre accès', 'Joué avec les mains, il apprend à mordre et à griffer.']
  ],
  'c-transport': [
    ['Pourquoi tant de chats détestent-ils leur caisse ?', 'Elle n’apparaît que pour le vétérinaire', 'Elle est toujours trop grande', 'Les chats n’aiment pas les boîtes', 'Laissée en permanence, elle devient un abri familier.'],
    ['En voiture, où mettre la caisse ?', 'Attachée par la ceinture ou calée', 'Posée libre sur le siège', 'Ouverte, le chat se promène', 'Un chat libre en voiture est dangereux pour tous.'],
    ['Comment le mettre dans la caisse ?', 'Il y entre de lui-même, avec friandises et repas', 'On l’attrape par la peau du cou', 'On le pousse de force à l’intérieur', 'La contrainte rend chaque départ plus difficile.']
  ],
  'c-jeu': [
    ['Comment faire bouger le jouet ?', 'Comme une proie qui fuit et se cache', 'Toujours vers le chat', 'Sans jamais le laisser l’attraper', 'Une proie ne vient jamais vers le chasseur.'],
    ['Comment finir la séance de jeu ?', 'Par une capture puis une friandise ou un repas', 'Brusquement, en cachant le jouet d’un coup', 'Avec un pointeur laser qu’on éteint', 'Chasser, attraper, manger : la séquence complète apaise.'],
    ['Après le jeu, que faire de la canne à pêche ?', 'La ranger', 'La laisser en libre accès', 'L’accrocher à sa portée', 'Les ficelles avalées peuvent nécessiter une chirurgie.']
  ],
  'c-cible': [
    ['Un chat peut-il apprendre avec un clicker ?', 'Oui, très bien', 'Non, seuls les chiens apprennent', 'Seulement les chatons', 'Clicker et friandises de valeur fonctionnent très bien avec les chats.'],
    ['Combien de temps durent les séances ?', '2 à 3 minutes', '30 minutes', '1 heure', 'Des séances courtes gardent le chat motivé.'],
    ['Il s’éloigne pendant la séance. Que faire ?', 'Arrêter', 'Le rattraper pour continuer', 'Le gronder', 'On ne force jamais un chat à participer.']
  ],
  'c-soins': [
    ['Quelle partie de la griffe couper ?', 'Uniquement la pointe transparente', 'Jusqu’à la partie rosée incluse', 'Toute la griffe, à ras du doigt', 'La partie rosée contient vaisseaux et nerfs.'],
    ['Quand s’entraîner au comprimé ?', 'Avant qu’il soit malade, à vide', 'Le jour du traitement seulement', 'Jamais', 'Préparé à l’avance, le vrai traitement se passe bien mieux.'],
    ['Il se débat pendant les soins. Que faire ?', 'Revenir à une étape plus facile', 'Le tenir fermement', 'Finir le plus vite possible', 'La contrainte associe les soins à la peur.']
  ],
  'c-cohabitation': [
    ['Première étape pour présenter deux animaux ?', 'Échanger les odeurs, porte fermée', 'Les mettre ensemble dans une pièce', 'Les laisser se débrouiller', 'Odeurs, puis vue, puis contact : au rythme de l’animal.'],
    ['L’un souffle ou grogne. Que faire ?', 'Ne pas punir et revenir en arrière', 'Le gronder pour qu’il accepte l’autre', 'Le forcer à rester dans la même pièce', 'Souffler est un avertissement normal.'],
    ['Combien de ressources prévoir ?', 'Plusieurs bacs, gamelles, couchages et perchoirs', 'Un seul de chaque, pour qu’ils apprennent à partager', 'Aucune ressource commune, séparés pour toujours', 'La compétition pour les ressources crée des conflits.']
  ],
  'c-peur': [
    ['Comment gagner la confiance d’un chat craintif ?', 'Le laisser décider de s’approcher', 'Le sortir doucement de sa cachette', 'Le regarder longuement dans les yeux', 'Le contrôle rassure le chat craintif.'],
    ['Que signifie un clignement lent des yeux ?', 'Un signe de confiance', 'Une menace avant l’attaque', 'Un signe de grande fatigue', 'C’est le « sourire du chat » : on peut le lui renvoyer.'],
    ['Quel jeu favorise la confiance ?', 'La canne à pêche, sans contact direct', 'Le jeu avec les mains', 'Le jeu de poursuite dans la maison', 'Le jeu construit la confiance à distance.']
  ],
  'c-harnais': [
    ['Quel harnais choisir ?', 'Un harnais gilet bien ajusté', 'Un harnais très large', 'Un simple collier', 'Un harnais trop large permet de s’échapper : très dangereux.'],
    ['Dehors, en harnais, qui décide du chemin ?', 'Le chat, on le suit', 'Vous, en tirant', 'Personne, on le lâche', 'On ne tire jamais : il explore à son rythme.'],
    ['Que faut-il vérifier avant toute sortie ?', 'Chat pucé, vacciné et traité contre les parasites', 'Rien de particulier, les chats savent se défendre', 'Un bain pour qu’il sente bon dehors', 'Une sortie expose aux maladies et aux parasites.']
  ],
  'c-nuit': [
    ['Il miaule la nuit. Première chose à faire ?', 'Exclure un problème de santé', 'Lui donner à manger pour qu’il se calme', 'Lui lancer un peu d’eau pour qu’il arrête', 'Chez un chat âgé, cela peut révéler une maladie.'],
    ['Quel rituel avant le coucher ?', 'Un jeu intense puis un repas', 'Aucun jeu le soir', 'Une caresse puis la porte fermée', 'Chasse, repas, toilette, sommeil : un signal de repos.'],
    ['Il vous réveille à 4 h. Que faire ?', 'Ne pas répondre, même pour gronder', 'Le nourrir pour qu’il se taise', 'Jouer avec lui', 'Chaque réponse confirme que miauler fonctionne.']
  ],
  'c-senior': [
    ['Un vieux chat qui néglige sa litière…', 'Doit être vu par le vétérinaire', 'Fait un caprice lié à l’âge', 'Doit être puni pour qu’il reprenne ses habitudes', 'Douleur et maladie sont des causes fréquentes.'],
    ['Quel rythme de bilan après 10 ans ?', 'Tous les 6 à 12 mois', 'Tous les 5 ans', 'Seulement s’il est malade', 'Détectées tôt, beaucoup de maladies se soignent bien.'],
    ['Quel aménagement l’aide ?', 'Des marches et un bac à bords bas', 'Des perchoirs plus hauts pour l’exercice', 'Un bac couvert et profond pour l’intimité', 'Un chat âgé saute moins bien.']
  ],
  'c-amenager': [
    ['Pourquoi offrir de la hauteur (arbre à chat, étagères) ?', 'Le chat se sent en sécurité en hauteur', 'Pour qu’il fasse davantage de sport', 'Ce n’est pas vraiment utile en appartement', 'Arbre à chat, étagères et perchoirs sont essentiels.'],
    ['Où placer les ressources ?', 'À des endroits différents, loin les unes des autres', 'Toutes au même endroit, pour plus de simplicité', 'Dans la même pièce que la litière', 'Nourriture et eau loin de la litière.'],
    ['Que faire des fenêtres et du balcon ?', 'Sécurisées par des filets', 'Grandes ouvertes', 'Toujours fermées à clé', 'Les chutes sont fréquentes.']
  ],
  'c-alimentation': [
    ['Pourquoi la nourriture humide ?', 'Elle apporte de l’eau et protège les reins', 'Elle fait grossir, il vaut mieux l’éviter', 'Elle est déconseillée aux chats adultes', 'Les chats boivent peu : la pâtée aide.'],
    ['Le chat mange naturellement…', 'De nombreux petits repas', 'Un seul gros repas', 'Deux repas copieux', 'On fractionne ou on cache les croquettes.'],
    ['Faire jeûner un chat en surpoids ?', 'Jamais : risque de maladie du foie', 'Oui, deux jours par semaine', 'Non, un jour par semaine seulement', 'La perte de poids se fait doucement, avec le vétérinaire.']
  ],
  'c-mord': [
    ['Pourquoi il attaque vos chevilles ?', 'Il chasse', 'Il se venge', 'Il est méchant', 'Les chats joués avec la main apprennent que la peau est une proie.'],
    ['Quels signes annoncent une attaque pendant le jeu ?', 'Queue qui fouette, oreilles couchées, pupilles dilatées', 'Ronronnement et yeux mi-clos', 'Clignement lent des yeux', 'On arrête le jeu avant la morsure.'],
    ['Il mord pendant le jeu. Que faire ?', 'S’immobiliser, dire « Aïe » calmement et partir 30 secondes', 'Crier et lui donner une petite tape', 'L’asperger d’eau pour qu’il arrête', 'Il apprend que la morsure met fin au jeu.']
  ],
  'c-pipi': [
    ['Un chat urine hors de sa litière. D’abord…', 'Consulter le vétérinaire', 'Le punir pour qu’il comprenne', 'Déplacer la litière chaque jour', 'Cystite, calculs, douleur : la cause médicale est à écarter en premier.'],
    ['Il urine hors du bac « par vengeance » ?', 'Non, c’est un signal de mal-être', 'Oui, souvent', 'Non, il le fait pour marquer sa supériorité', 'La vengeance n’existe pas chez le chat.'],
    ['Un mâle fait des efforts sans rien produire…', 'Urgence : vétérinaire immédiatement', 'Attendre le lendemain', 'Lui donner plus d’eau et patienter', 'Une obstruction urinaire peut être mortelle en quelques heures.']
  ],
  'c-demenagement': [
    ['À l’arrivée dans le nouveau logement ?', 'Une pièce refuge pendant 2 à 3 jours', 'Tout le logement ouvert dès l’arrivée', 'Une première sortie dehors pour explorer', 'Trop de stimulations stressent le chat.'],
    ['Ses couvertures avant le départ ?', 'Ne pas les laver : leur odeur le rassure', 'Tout laver pour qu’il reparte à neuf', 'Tout jeter et racheter du neuf', 'L’odeur familière est un repère précieux.'],
    ['Quand laisser sortir un chat d’extérieur ?', 'Après 3 à 4 semaines, d’abord accompagné', 'Dès le premier jour, pour qu’il découvre', 'Jamais, un chat déménagé ne doit plus sortir', 'Trop tôt, il risque de chercher son ancien territoire.']
  ],
  'c-solitude': [
    ['Pour un week-end, que prévoir ?', 'Une visite quotidienne', 'Rien, les chats sont autonomes', 'Une gamelle pleine seulement', 'Eau, litière, santé : une visite par jour reste conseillée.'],
    ['Pour les vacances, que remplir ?', 'La fiche gardien de Wouf', 'Rien', 'Un mot sur le frigo', 'Habitudes, repas, traitements, contacts d’urgence.'],
    ['Combien de points d’eau ?', 'Plusieurs', 'Un seul', 'Aucun, il boira ailleurs', 'Une gamelle renversée ne doit pas le priver d’eau.']
  ],
  'c-dents': [
    ['Quel dentifrice utiliser pour un chat ?', 'Un dentifrice pour chat', 'Un dentifrice humain', 'Du bicarbonate', 'Fluor et xylitol sont toxiques pour le chat.'],
    ['Un chat cache-t-il la douleur dentaire ?', 'Oui, souvent', 'Non, il miaule toujours', 'Seulement les chatons', 'Il mâche d’un côté, mange moins ou bave : il faut consulter.'],
    ['Par où commencer l’habituation au brossage des dents ?', 'Caresses des joues et du menton', 'La brosse dès le premier jour', 'Ouvrir la gueule de force', 'On progresse très lentement, avec des friandises.']
  ],
  'c-bebe': [
    ['Que garder stable pour le chat ?', 'Ses repères : litière, repas, refuges', 'Rien, il s’adaptera tout seul', 'Seulement l’emplacement de sa gamelle', 'Les routines rassurent le chat.'],
    ['Le chat peut-il accéder au berceau ?', 'Non, il doit rester inaccessible', 'Oui, il peut même y dormir', 'Seulement quand le bébé n’y est pas', 'On sécurise par une moustiquaire ou une porte fermée.'],
    ['Pendant la grossesse, pour la litière ?', 'Demander conseil au médecin (toxoplasmose)', 'Aucune précaution particulière', 'Se débarrasser de la litière', 'On évite aussi de laisser les déjections s’accumuler.']
  ],
  'c-eau': [
    ['Où placer la gamelle d’eau ?', 'Loin de la nourriture et de la litière', 'Juste à côté de sa gamelle de croquettes', 'Près de son bac à litière', 'Les chats n’aiment pas boire près de leur repas.'],
    ['Pourquoi une fontaine ?', 'Beaucoup de chats préfèrent l’eau qui coule', 'Elle remplace la gamelle de nourriture', 'Elle n’est jamais utile pour un chat', 'On la nettoie chaque semaine.'],
    ['Il boit soudain beaucoup plus. Que faire ?', 'Consulter le vétérinaire', 'Mettre moins d’eau', 'Rien, c’est normal', 'Maladie rénale ou diabète débutent souvent ainsi.']
  ],
  'c-poids': [
    ['Comment mesurer la ration ?', 'La peser en grammes', 'À l’œil', 'Avec un verre doseur', 'Les friandises comptent aussi.'],
    ['Perte de poids saine par semaine ?', 'Environ 0,5 à 2 %', 'Environ 10 % par semaine', 'Environ 1 kg par semaine', 'Trop rapide, elle est dangereuse.'],
    ['Il réclame en miaulant. Que faire ?', 'Proposer du jeu et garder des horaires fixes', 'Le nourrir à chaque miaulement', 'Le faire jeûner une journée', 'Céder renforce les demandes.']
  ],
  'c-dehors': [
    ['Que vérifier avant de laisser sortir un chat ?', 'Identification à jour, vaccins, antiparasitaires', 'Rien, un chat sait se débrouiller dehors', 'Seulement qu’il porte un collier', 'Un chat identifié est retrouvé plus facilement.'],
    ['Quel moment est le plus dangereux dehors ?', 'La nuit et la tombée du jour', 'Le matin, au lever du soleil', 'Le midi, en plein soleil', 'Les accidents et les rencontres y sont plus fréquents.'],
    ['Quel produit est très dangereux et attirant ?', 'L’antigel', 'L’eau de pluie', 'L’herbe à chat', 'Il est mortel même à petite dose.']
  ],
  'c-langage': [
    ['Une queue qui fouette signifie…', 'De l’agacement', 'Du bonheur', 'Une envie de câlin', 'On arrête ce qu’on fait.'],
    ['Un ronronnement signifie toujours le bien-être ?', 'Non, il peut aussi accompagner la douleur', 'Oui, un ronronnement veut toujours dire le bonheur', 'Non, il signifie toujours que le chat a faim', 'Un chat malade peut ronronner.'],
    ['Un chat sur le dos invite-t-il toujours aux caresses du ventre ?', 'Non, c’est d’abord un signe de confiance', 'Oui, c’est toujours une invitation au câlin', 'Non, c’est une invitation à se battre', 'Caresser le ventre peut déclencher une griffure.']
  ],
  'c-caresses': [
    ['Zones que la plupart des chats aiment ?', 'Joues, menton, base des oreilles', 'Le ventre et la base de la queue', 'Les pattes et les coussinets', 'Ce sont les zones de leurs glandes à odeur.'],
    ['En quoi consiste le test du consentement ?', 'Caresser 3 secondes, s’arrêter, voir s’il en redemande', 'Caresser jusqu’à ce qu’il décide de partir', 'Le retenir doucement s’il veut s’en aller', 'Il décide de la suite.'],
    ['Il mord soudain pendant les caresses alors qu’il aimait ça ?', 'Consulter : une douleur est possible', 'Le punir pour qu’il arrête de mordre', 'Le caresser plus fort pour qu’il s’habitue', 'Dos, arthrose ou peau peuvent rendre le contact désagréable.']
  ],
  'c-brossage': [
    ['Quel outil pour un poil court ?', 'Un gant en caoutchouc', 'Un râteau métallique', 'Une tondeuse', 'Il ressemble à une caresse.'],
    ['Un nœud serré près de la peau ?', 'Le faire retirer par un professionnel', 'Le couper aux ciseaux pointus', 'Tirer d’un coup', 'On risque de couper la peau.'],
    ['Il vomit souvent des boules de poils ?', 'Consulter le vétérinaire', 'C’est normal', 'Arrêter le brossage', 'Des vomissements fréquents ne sont pas normaux.']
  ],
  'c-griffes': [
    ['Faut-il dégriffer un chat ?', 'Jamais : c’est une amputation', 'Oui, pour les meubles', 'Non, sauf pour les chats d’appartement', 'C’est interdit dans de nombreux pays et contraire au bien-être.'],
    ['Combien de griffes au début ?', 'Une ou deux par séance', 'Toutes d’un coup', 'Aucune, on attend', 'On progresse sans stress.'],
    ['Quel chat surveiller particulièrement ?', 'Le chat âgé', 'Le chaton', 'Le chat qui sort', 'Ses griffes s’épaississent et peuvent s’incarner.']
  ],
  'c-comprimes': [
    ['Après un comprimé, que faire ?', 'Donner un peu d’eau ou de nourriture humide', 'Rien, le comprimé suffit', 'Lui donner un deuxième comprimé par sécurité', 'Un comprimé coincé peut abîmer l’œsophage.'],
    ['Le paracétamol pour un chat ?', 'Jamais : il est mortel', 'Oui, à petite dose', 'Non, sauf un demi-comprimé contre la fièvre', 'Beaucoup de médicaments humains sont toxiques pour le chat.'],
    ['Il recrache toujours. Que faire ?', 'Demander une autre forme au vétérinaire', 'Forcer plus fort en le tenant', 'Arrêter le traitement de vous-même', 'Pâte, liquide ou forme appétente existent souvent.']
  ],
  'c-plans': [
    ['Pourquoi il monte sur le plan de travail ?', 'Hauteur, nourriture ou attention', 'Pour vous défier et tester vos limites', 'Par méchanceté ou par vengeance', 'On retire la récompense et on offre mieux en hauteur.'],
    ['Que lui offrir à la place du plan de travail ?', 'Un perchoir près de la cuisine', 'Rien, il doit apprendre à rester au sol', 'Une punition chaque fois qu’il monte', 'Il observe en sécurité ce que vous faites.'],
    ['Lui lancer de l’eau quand il monte ?', 'Non : il devient méfiant et monte en votre absence', 'Oui, c’est la méthode la plus efficace', 'Non, mieux vaut crier très fort', 'La redirection calme fonctionne mieux.']
  ],
  'c-fenetres': [
    ['Un chat d’appartement « prudent » peut-il tomber ?', 'Oui : un oiseau ou un bruit suffit', 'Non, un chat ne tombe jamais d’une fenêtre', 'Seulement les chatons de moins de 6 mois', 'Les chutes sont fréquentes au printemps et en été.'],
    ['La fenêtre oscillo-battante basculée ?', 'Dangereuse : le chat peut rester coincé', 'Idéale pour aérer sans risque pour le chat', 'Sans aucun danger si le chat est adulte', 'Il faut une grille de protection.'],
    ['Après une chute qui semble sans gravité ?', 'Consulter en urgence', 'Attendre quelques jours', 'Rien si le chat marche', 'Des lésions internes peuvent passer inaperçues.']
  ],
  'c-rappel': [
    ['Quel signal choisir ?', 'Un son unique, toujours suivi d’une récompense', 'Son prénom, utilisé toute la journée', 'Un cri', 'Le son doit annoncer quelque chose de merveilleux.'],
    ['Peut-on l’appeler pour lui donner un médicament ?', 'Non, jamais pour quelque chose de désagréable', 'Oui, c’est justement à ça que sert le rappel', 'Non, sauf s’il est déjà habitué à son médicament', 'Sinon, il cessera de venir.'],
    ['Combien de rappels « gratuits » garder ?', 'Environ 3 pour 1 rappel utile', 'Aucun, on ne l’appelle que quand c’est utile', 'Un seul par mois, pour ne pas l’user', 'Le rappel reste motivant.']
  ],
  'c-tours': [
    ['Quelle durée de séance ?', '2 à 3 minutes maximum', 'Environ 20 minutes', 'Au moins une heure', 'Un chat qui part, c’est une séance trop longue.'],
    ['Pour « Tape m’en cinq », que récompenser d’abord ?', 'La patte qui se lève vers votre main', 'Le chat couché sur le flanc', 'Le miaulement pour réclamer', 'On passe ensuite à la paume ouverte.'],
    ['Quel chat ne doit pas sauter ?', 'Un chat âgé, arthrosique ou en surpoids', 'Un jeune chat plein d’énergie', 'Un chat très joueur', 'On utilise aussi des supports stables.']
  ],
  'c-voyage': [
    ['Quand sortir la caisse ?', 'Des semaines avant, en permanence', 'Le jour du départ seulement', 'Jamais, il faut éviter de l’y habituer', 'Il doit y dormir de lui-même.'],
    ['Sur une aire d’autoroute ?', 'Ne jamais ouvrir la caisse', 'Le laisser se dégourdir', 'Le promener sans laisse', 'Un chat qui s’échappe dans un lieu inconnu est difficile à retrouver.'],
    ['Peut-on laisser le chat seul dans la voiture au soleil ?', 'Jamais, même quelques minutes', 'Oui, quelques minutes seulement', 'Non, sauf s’il dort dans sa caisse', 'La température monte très vite.']
  ],
  'c-socialisation': [
    ['Pourquoi socialiser tôt ?', 'Les expériences des premiers mois façonnent un chat confiant', 'Ça ne sert à rien, un chat est indépendant', 'Pour qu’il apprenne à obéir aux ordres', 'Le manque d’expériences produit souvent un adulte craintif.'],
    ['Comment soulever un chaton correctement ?', 'Une main sous le poitrail, une sous l’arrière-train', 'Par la peau du cou, comme sa mère', 'Par les pattes avant, doucement', 'Il se sent soutenu et en sécurité.'],
    ['Il se fige face à un bruit. Que faire ?', 'Baisser l’intensité', 'Monter le volume', 'Le tenir face au bruit', 'On reste toujours sous son seuil de peur.']
  ],
  'c-convalescence': [
    ['Quel bac après une opération ?', 'Un bac à bords bas', 'Un bac couvert et haut', 'Aucun', 'Il doit y entrer facilement, même avec la collerette.'],
    ['Il ne mange pas depuis 24 heures après l’opération ?', 'Prévenir le vétérinaire', 'Attendre une semaine', 'Le forcer à manger', 'Chez le chat, ne pas manger peut vite devenir grave.'],
    ['Quels jeux pendant la convalescence ?', 'Des jeux calmes au sol', 'Des sauts sur l’arbre à chat', 'Des courses dans la maison', 'Pas de sauts avant le feu vert du vétérinaire.']
  ]
});
