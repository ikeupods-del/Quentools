'use strict';
/* Wouf — quiz de validation, série 2 : leçons chien des fichiers lessons4.js à lessons7.js. Même format que quiz.js. */
Object.assign(QUIZZES, {
  focus: [
    ['Au début, quand dire « Oui ! » ?', 'Dès qu’il regarde votre visage de lui-même', 'Quand il fixe la friandise dans votre main', 'Après 10 secondes de regard obligatoire', 'On récompense le regard spontané : il découvre que vous regarder rapporte.'],
    ['Il regarde la friandise, pas vos yeux. Que faire ?', 'Cacher la friandise et ne récompenser que le regard vers vous', 'Tenir la friandise contre votre front en permanence', 'Répéter « Regarde » jusqu’à ce qu’il obéisse', 'Si la friandise reste visible, c’est elle qu’il fixe.'],
    ['Comment ajouter des distractions ?', 'Une à la fois, en s’éloignant si l’exercice échoue', 'Toutes en même temps, pour gagner du temps', 'Directement au parc canin, aux heures d’affluence', 'On augmente la difficulté par petits paliers.']
  ],
  impulsions: [
    ['Il gratte votre main fermée. Que faire ?', 'Rester immobile et récompenser dès qu’il s’écarte', 'Retirer la main en disant « Non ! » d’un ton ferme', 'Ouvrir la main pour qu’il arrête enfin de gratter', 'L’absence de résultat lui apprend à changer de stratégie.'],
    ['De quelle main vient la récompense ?', 'De l’autre main', 'De la main qu’il convoitait', 'Du sol, après la séance', 'Il apprend que se retenir fait gagner, pas que forcer paie.'],
    ['Le jeu du « c’est ton choix » rend-il le chien obéissant par peur ?', 'Non, il muscle sa maîtrise de soi', 'Oui, il apprend à craindre votre main', 'Non, il apprend surtout à mendier davantage', 'Aucune punition : se retenir est toujours payant.']
  ],
  reactivite: [
    ['D’où viennent le plus souvent les aboiements en laisse ?', 'De la peur, de la frustration ou de l’excitation', 'D’une volonté de dominer les autres chiens', 'D’un manque de fermeté du maître', 'Punir augmente le stress et aggrave la réaction.'],
    ['Où travailler avec un chien réactif ?', 'À une distance où il reste détendu et mange', 'Au plus près des chiens, pour qu’il s’habitue', 'Dans une rue bondée aux heures de pointe', 'En dessous du seuil, il peut apprendre ; au-dessus, il réagit.'],
    ['Quel matériel proscrire ?', 'Collier étrangleur ou à pointes', 'Harnais bien ajusté', 'Laisse de 1,5 à 2 mètres', 'La douleur associée à l’autre chien aggrave le problème.']
  ],
  destruction: [
    ['Les dégâts n’ont lieu que quand il est seul, avec plaintes. Piste probable ?', 'Un stress de séparation', 'De la vengeance', 'Un manque de discipline', 'La solution est la préparation à la solitude, pas la punition.'],
    ['Il a pris une chaussure. Que faire ?', 'Proposer un échange plus attractif', 'Lui courir après dans la maison', 'Le gronder en montrant la chaussure', 'L’échange évite la course-poursuite et la garde de l’objet.'],
    ['Quels jouets éviter ?', 'Les os cuits, le bois et les pierres', 'Les jouets fourrés de pâtée', 'Les mâchouilles adaptées à sa taille', 'Ils peuvent casser les dents ou être avalés.']
  ],
  poursuite: [
    ['Pourquoi éviter toute poursuite réussie ?', 'Chaque poursuite renforce l’instinct', 'Parce qu’elle fatigue trop le chien', 'Parce que les chiens n’aiment pas courir', 'La gestion sur longe évite ces répétitions.'],
    ['Quand dire « Stop » ou « Par ici » ?', 'Dès qu’il repère le déclencheur, avant la course', 'Quand il court déjà derrière le vélo', 'Seulement quand il revient de lui-même', 'Rappeler un chien lancé ruine le signal.'],
    ['Comment canaliser l’instinct ?', 'Un jouet de proie sur longe, avec des règles', 'Le laisser courir après les chats du quartier', 'Supprimer toute activité physique', 'On offre un exutoire acceptable plutôt que d’interdire.']
  ],
  ville: [
    ['Comment faire découvrir un sol inhabituel ?', 'Friandise posée à côté, sans jamais forcer', 'Le tirer pour qu’il passe vite', 'Le porter chaque fois, pour toujours', 'Il doit pouvoir explorer à son rythme.'],
    ['Sous une table de café, qu’apporter ?', 'Son tapis et une mâchouille', 'Rien, il doit apprendre la patience', 'Un jouet sonore pour l’occuper', 'Le tapis rappelle la « Place » ; la mâchouille occupe les longues attentes.'],
    ['L’été en ville, que vérifier ?', 'La chaleur du bitume, du dos de la main', 'Que le trottoir est bien sec', 'Qu’il porte un collier étrangleur', 'Le bitume peut brûler les coussinets.']
  ],
  randonnee: [
    ['À partir de quand un chien peut-il faire de longues randonnées ?', 'Après la fin de sa croissance', 'Dès 3 mois s’il est énergique', 'À tout âge, sans précaution', 'Les articulations sont fragiles avant 12 à 18 mois selon la race.'],
    ['Quelle eau lui laisser boire ?', 'Celle que vous avez emportée', 'L’eau stagnante des mares', 'L’eau verte et écumeuse', 'Les eaux stagnantes peuvent transmettre la leptospirose ou contenir des algues toxiques.'],
    ['Près d’un troupeau ou d’un chien de protection ?', 'Laisse, distance et contournement large', 'Le lâcher pour qu’il aille jouer avec les bêtes', 'Courir pour passer le plus vite possible', 'On évite tout conflit et on respecte la réglementation.']
  ],
  dents: [
    ['Quel dentifrice utiliser ?', 'Un dentifrice pour chien', 'Un dentifrice humain au fluor', 'Un dentifrice au xylitol', 'Le fluor et le xylitol sont toxiques pour le chien.'],
    ['Quelle zone brosser en priorité ?', 'La face externe des dents', 'L’intérieur uniquement', 'La langue', 'Le côté externe est le plus important au début.'],
    ['Quel signe doit faire consulter ?', 'Des gencives qui saignent ou une mauvaise haleine forte', 'Un chien qui mâche beaucoup ses jouets', 'Des dents bien blanches et des gencives roses', 'La maladie dentaire est douloureuse et peut toucher d’autres organes.']
  ],
  vol: [
    ['Moyen le plus efficace contre le vol de nourriture ?', 'Rendre le vol impossible (ranger, fermer)', 'Le punir chaque fois qu’il vole', 'Le laisser manger les restes pour qu’il se lasse', 'Un chien qui ne réussit jamais à voler perd l’habitude.'],
    ['Pendant votre repas, où doit-il être ?', 'Sur sa place, avec une mâchouille', 'Sous la table, à attendre', 'Sur les genoux d’un enfant', 'Céder « juste une fois » relance la mendicité.'],
    ['Il a avalé du chocolat. Que faire ?', 'Appeler un vétérinaire sans attendre', 'Le faire vomir tout seul', 'Attendre de voir s’il a des symptômes', 'Chocolat, raisins, xylitol : urgence ; on ne fait pas vomir sans avis.']
  ],
  veto: [
    ['Qu’est-ce qu’une visite de plaisir ?', 'Passer à la clinique pour une pesée et une friandise', 'Une consultation de rappel avec un vaccin', 'Une visite à la clinique sans votre chien', 'Le lieu cesse d’annoncer uniquement des choses désagréables.'],
    ['Il tremble en salle d’attente. Que faire ?', 'Attendre dehors ou en voiture', 'Le forcer à rester au milieu des autres', 'Le gronder pour qu’il se calme', 'On réduit la difficulté au lieu de la subir.'],
    ['Comment voir la muselière ?', 'Comme un outil de sécurité conditionné à l’avance', 'Comme une punition pour les chiens méchants', 'Comme un accessoire inutile', 'Bien acceptée, elle rend les soins plus sereins pour tous.']
  ],
  eau: [
    ['Comment faire découvrir l’eau ?', 'Au bord, pieds mouillés, à son rythme', 'En le jetant dans l’eau profonde', 'En le tenant sous le jet', 'Jeté à l’eau, un chien peut paniquer et se noyer.'],
    ['Quels chiens ont souvent du mal à nager ?', 'Les chiens à museau court ou aux pattes très courtes', 'Les chiens de chasse et les retrievers', 'Aucun : tous les chiens nagent naturellement', 'Un gilet de flottaison est indispensable pour eux.'],
    ['Que faire après la baignade ?', 'Rincer à l’eau douce et sécher les oreilles', 'Le laisser sécher au soleil sans rien faire', 'Le laisser boire l’eau de mer', 'Des oreilles humides s’infectent facilement.']
  ],
  nuits: [
    ['Où installer le chiot les premières nuits ?', 'Près de votre lit, dans son coin', 'Seul au garage, pour qu’il s’habitue', 'Dehors, dans le jardin ou sur la terrasse', 'Votre présence le rassure ; on éloigne le couchage progressivement.'],
    ['Sortie de nuit : comment faire ?', 'Sans un mot, sans jeu, puis retour au lit', 'Avec une séance de jeu pour le fatiguer', 'Avec un repas complet', 'Il apprend que la nuit sert à dormir.'],
    ['Il pleure la nuit. D’abord…', 'Vérifier ses besoins (sortie, chaud, froid)', 'Le punir pour qu’il comprenne qu’il doit se taire', 'Mettre la musique très fort pour couvrir ses pleurs', 'Punir la nuit ajoute la peur et augmente les pleurs.']
  ],
  cerveau: [
    ['Pourquoi les jeux d’intelligence ?', 'Ils fatiguent l’esprit et réduisent l’ennui', 'Ils remplacent toutes les balades', 'Ils rendent le chien plus agité', 'Dix minutes de réflexion fatiguent beaucoup, mais ne remplacent pas l’exercice.'],
    ['Il abandonne ou détruit le jouet. Que faire ?', 'Simplifier le jeu', 'Le laisser se débrouiller', 'Retirer toutes ses friandises', 'Un jeu trop difficile crée de la frustration.'],
    ['Votre chien est au régime. Les friandises des jeux ?', 'Prélevées sur sa ration du jour', 'En plus de ses repas', 'Remplacées par du chocolat', 'Tout ce qu’il mange compte dans sa ration.']
  ],
  bebe: [
    ['Quand préparer le chien à l’arrivée du bébé ?', 'Plusieurs mois avant', 'Le jour de la naissance', 'Après quelques semaines', 'On change les routines avant, pour qu’il ne les associe pas au bébé.'],
    ['Il grogne près du bébé. Que faire ?', 'Séparer, ne pas punir, consulter un comportementaliste', 'Le gronder fermement', 'Laisser le bébé près de lui pour qu’il s’habitue', 'Punir un grognement supprime l’avertissement avant une morsure.'],
    ['Quelle règle absolue avec un bébé à la maison ?', 'Jamais le chien seul avec le bébé', 'Le chien dort avec le bébé', 'Le bébé peut le caresser seul', 'Les morsures graves touchent surtout les jeunes enfants.']
  ],
  craintif: [
    ['Qui décide du contact avec l’inconnu ?', 'Le chien, à son rythme', 'L’inconnu, s’il aime les chiens', 'Vous, en le rapprochant', 'Forcer le contact aggrave la peur.'],
    ['Comment l’inconnu doit-il se comporter ?', 'L’ignorer, rester de profil, sans le fixer', 'Se pencher pour le caresser', 'Le regarder dans les yeux pour le rassurer', 'Ces gestes sont menaçants pour un chien qui a peur.'],
    ['Quel signe montre la peur ?', 'Oreilles couchées, queue basse, léchage de museau', 'Corps souple et queue qui balaie largement', 'Il se roule sur le dos pour inviter au jeu', 'On recule avant que la peur n’explose.']
  ],
  'deux-chiens': [
    ['Où faire la première rencontre ?', 'En terrain neutre, chacun avec une personne', 'Directement dans le salon', 'Dans le jardin du chien résident', 'Le territoire du résident augmente les tensions.'],
    ['Comment éviter les conflits de ressources ?', 'Deux gamelles, deux couchages, repas séparés', 'Une seule gamelle pour qu’ils partagent', 'Un os pour deux', 'La garde de ressources est la première cause de bagarres.'],
    ['Ils se battent. Que faire ?', 'Bruit fort ou objet large, jamais les mains entre eux', 'Les séparer à mains nues, le plus vite possible', 'Les laisser régler leur différend entre eux', 'Mettre les mains entre deux chiens expose à une morsure.']
  ],
  medicaments: [
    ['Le « jeu des trois boulettes », c’est…', 'Une vide, une avec le comprimé, une vide', 'Trois comprimés donnés en une seule fois', 'Trois boulettes de chocolat pour masquer le goût', 'Pressé d’avoir la suivante, le chien avale sans trier.'],
    ['Pour les gouttes dans l’œil, d’où arrive le flacon ?', 'Par le dessus de la tête, hors de sa vue', 'De face, bien visible pour qu’il ne soit pas surpris', 'Par-dessous le museau, en levant sa tête', 'Un flacon qui arrive de face fait peur.'],
    ['Peut-on donner un antidouleur humain ?', 'Non, jamais sans avis vétérinaire', 'Oui, à petite dose', 'Non, sauf l’ibuprofène qui est sans danger', 'Beaucoup de médicaments humains sont toxiques pour le chien.']
  ],
  griffes: [
    ['Sur une griffe claire, où couper ?', 'Environ 2 mm avant la partie rosée', 'Au ras de la partie rosée', 'Juste la pointe du coussinet', 'La partie rosée contient un vaisseau et un nerf.'],
    ['Combien de griffes au début ?', 'Une seule, puis grosse récompense', 'Les 18 griffes d’un coup', 'Aucune, on se contente de les limer', 'On progresse une griffe par séance.'],
    ['Ça saigne. Que faire ?', 'Poudre hémostatique en pressant 1 à 2 minutes', 'Rincer longuement la patte à l’eau glacée', 'Continuer la coupe pour en finir rapidement', 'On arrête la séance, et on consulte si ça ne s’arrête pas.']
  ],
  brossage: [
    ['Quel outil pour un poil court ?', 'Un gant en caoutchouc ou une brosse souple', 'Un râteau à sous-poil métallique', 'Une tondeuse, une fois par mois', 'Une brosse trop dure irrite la peau.'],
    ['Un nœud tire. Que faire ?', 'Tenir la base du nœud pour ne pas tirer la peau', 'Tirer d’un coup sec pour aller plus vite', 'Le couper aux ciseaux au ras de la peau', 'Tirer fait mal : le chien fuira la brosse.'],
    ['Faut-il raser un chien à double pelage l’été ?', 'Non, son sous-poil le protège aussi de la chaleur', 'Oui, pour le rafraîchir pendant les fortes chaleurs', 'Non, mais il faut le tondre à ras au printemps', 'Le double pelage isole du chaud comme du froid.']
  ],
  canicross: [
    ['Quand commencer la course régulière ?', 'Après la fin de la croissance et un avis vétérinaire', 'Dès 4 mois, pour qu’il prenne l’habitude', 'Dès que le chien commence à tirer en laisse', 'Les articulations d’un chiot sont fragiles.'],
    ['Au-dessus de quelle température éviter de courir ?', 'Environ 20 °C (15 °C pour un chien sensible)', 'Vers 30 °C, pour un chien en bonne santé', 'Il n’y a aucune limite si le chien a de l’eau', 'Le coup de chaleur arrive vite à l’effort.'],
    ['Pourquoi attendre 2 heures après un repas ?', 'Pour limiter le risque de retournement d’estomac', 'Pour qu’il ait davantage d’énergie en courant', 'Ce n’est pas nécessaire s’il a peu mangé', 'La dilatation-torsion de l’estomac est une urgence vitale chez les grands chiens.']
  ],
  parcours: [
    ['Quelle hauteur de saut ?', 'Basse, pas plus haut que le poignet', 'Aussi haut que possible', 'La hauteur de votre taille', 'Le but est la coordination, pas la performance.'],
    ['Il a peur du tunnel. Que faire ?', 'Le raccourcir et récompenser chaque pas', 'Le pousser gentiment dedans pour qu’il comprenne', 'Supprimer l’agility : ce n’est pas fait pour lui', 'On ne force jamais un chien dans le tunnel.'],
    ['Il se trompe d’obstacle. Réaction ?', 'Recommencer joyeusement', 'Le gronder', 'Arrêter la séance fâché', 'Le reproche fait perdre confiance et entrain.']
  ],
  tir: [
    ['Jouer à tirer rend-il un chien agressif ?', 'Non, avec des règles c’est un excellent outil', 'Oui, toujours : ce jeu rend les chiens agressifs', 'Non, à condition que le maître gagne toujours', 'Règles claires : « Prends », « Lâche », jamais de dents sur la peau.'],
    ['Comment lui apprendre « Lâche » ?', 'Tenir le jouet immobile et proposer une friandise', 'Tirer plus fort jusqu’à ce qu’il abandonne', 'Lui serrer doucement la gueule pour l’ouvrir', 'Lâcher relance ensuite le jeu : il comprend vite.'],
    ['Ses dents touchent votre main. Que faire ?', 'Dire « Oups » et arrêter le jeu 10 secondes', 'Continuer le jeu, c’est normal chez un chiot', 'Lui donner une petite tape sur le museau', 'Il apprend à viser le jouet avec précision.']
  ],
  longe: [
    ['Où attacher la longe ?', 'À un harnais', 'À un collier', 'À un collier étrangleur', 'Un arrêt brusque sur un collier peut blesser la gorge et le cou.'],
    ['Comment tenir la longe ?', 'En boucles souples, jamais autour des doigts', 'Enroulée autour de la main et des doigts', 'Traînant en tas au sol', 'Enroulée autour des doigts, elle peut les brûler ou les fracturer.'],
    ['Peut-on remplacer la longe par un enrouleur ?', 'Non, l’enrouleur apprend à tirer', 'Oui, c’est exactement la même chose', 'Non, l’enrouleur est réservé aux grands chiens', 'L’enrouleur garde la laisse tendue en permanence.']
  ],
  equipement: [
    ['Comment faire accepter le harnais ?', 'Friandise de l’autre côté : il passe la tête de lui-même', 'Le lui enfiler de force, le plus vite possible', 'Le laisser sur lui jour et nuit pour qu’il l’oublie', 'Le chien finit par venir de lui-même vers son harnais.'],
    ['Pour les bottines, combien à la fois au début ?', 'Une seule', 'Les quatre', 'Deux avant, deux arrière', 'On ajoute une bottine par séance.'],
    ['Quel ajustement pour le harnais ?', 'Deux doigts sous les sangles', 'Serré au maximum pour éviter qu’il s’échappe', 'Très lâche, pour ne jamais le gêner', 'Trop serré, il frotte ; trop lâche, le chien s’échappe.']
  ],
  relaxation: [
    ['Quels signes récompenser ?', 'Hanche basculée, tête posée, soupir', 'Aboiement et saut', 'Queue raide et regard fixe', 'On capture les petits signes de détente.'],
    ['Comment donner les friandises ?', 'Calmement, entre ses pattes', 'Avec une voix aiguë et excitée', 'En les lançant loin', 'Une distribution excitante casse la détente.'],
    ['Il s’endort sur le tapis. C’est…', 'Exactement le but', 'Une erreur à corriger', 'Un signe de maladie', 'C’est le signe qu’il a appris à se détendre : laissez-le dormir.']
  ],
  'train-avion': [
    ['Quand se renseigner sur les règles du pays ?', 'Plusieurs mois avant le départ', 'À l’aéroport, au comptoir d’enregistrement', 'Une fois arrivé dans le pays de destination', 'Certaines exigences (vaccin, tests) demandent du temps.'],
    ['Quand habituer le chien au sac ou à la caisse ?', 'Des semaines avant le voyage', 'Le jour du départ', 'Jamais, il s’adaptera', 'Il doit s’y reposer volontairement avant de voyager.'],
    ['Peut-on donner un calmant au chien avant le voyage ?', 'Jamais sans avis vétérinaire', 'Toujours avant un vol', 'Au choix du propriétaire', 'Certains sont déconseillés en avion.']
  ],
  pension: [
    ['Avant une longue garde, que faire ?', 'Un essai d’une demi-journée ou d’une nuit', 'Rien, il s’adaptera', 'Le laisser deux semaines d’emblée', 'L’essai permet d’ajuster les consignes.'],
    ['Pourquoi garder sa nourriture habituelle ?', 'Un changement brutal donne souvent la diarrhée', 'Parce que les pensions n’ont pas de croquettes', 'Ce n’est pas utile', 'On prépare des portions pesées.'],
    ['Comment se comporter au moment de le déposer ?', 'Rester bref et calme', 'Faire de longs adieux', 'Partir en cachette', 'Des adieux émouvants augmentent le stress.']
  ],
  langage: [
    ['Un chien qui se lèche la truffe et détourne la tête…', 'Est un peu mal à l’aise', 'Veut un câlin tout de suite', 'Est simplement fatigué', 'Ce sont des signaux d’apaisement.'],
    ['Pourquoi ne pas punir un grognement ?', 'C’est un avertissement : sans lui, il mord sans prévenir', 'Parce qu’un grognement est toujours inoffensif', 'Parce que le chien ne comprend pas la punition', 'On s’éloigne calmement et on cherche la cause.'],
    ['Une queue qui remue signifie toujours la joie ?', 'Non, il faut lire tout le corps et le contexte', 'Oui, une queue qui remue veut toujours dire la joie', 'Non, elle signifie toujours qu’il va attaquer', 'Une queue haute et raide qui vibre peut traduire de la tension.']
  ],
  decompression: [
    ['Pendant la balade de reniflage, qui mène ?', 'Le chien', 'Vous, à rythme soutenu', 'Personne, il est lâché', 'On suit son nez, sur longe, sans exigences.'],
    ['Faut-il l’interrompre quand il renifle longtemps ?', 'Non, c’est le but', 'Oui, pour avancer', 'Non, mais on le tire toutes les minutes', 'Renifler l’apaise et fatigue son cerveau.'],
    ['Où faire cette balade ?', 'Dans un lieu calme et riche en odeurs', 'Dans une rue commerçante très animée', 'Au parc canin, aux heures d’affluence', 'Moins de déclencheurs, plus de détente.']
  ],
  sourd: [
    ['Quel marqueur pour un chien sourd ?', 'Un geste clair ou un flash lumineux', 'Un « Oui ! » crié très fort', 'Un sifflet', 'Il ne peut pas entendre : on change de canal.'],
    ['Comment réveiller un chien sourd ?', 'Main près du nez ou vibration au sol', 'Le toucher brusquement pour qu’il se réveille', 'Crier son nom très fort près de son oreille', 'Surpris, il peut sursauter ou mordre par réflexe.'],
    ['Peut-il être lâché dans un espace ouvert ?', 'Non, il n’entend ni rappel ni voitures', 'Oui, sans problème s’il reste près de vous', 'Non, sauf s’il connaît bien l’endroit', 'Laisse ou longe hors des zones closes.']
  ],
  convalescence: [
    ['Il semble malheureux avec la collerette. Que faire ?', 'La garder et occuper son esprit', 'La retirer pour lui faire plaisir', 'La retirer la nuit', 'Il peut rouvrir sa plaie en quelques minutes.'],
    ['Comment l’occuper pendant le repos ?', 'Tapis de léchage, flair, petits tours statiques', 'De petites courses au jardin pour le défouler', 'Des jeux avec d’autres chiens pour le distraire', 'On fatigue l’esprit sans solliciter le corps.'],
    ['Quel signe doit faire consulter ?', 'Plaie rouge, gonflée, qui suinte ou s’ouvre', 'Un chien qui dort beaucoup les premiers jours', 'Un chien calme qui reste dans son panier', 'Une plaie infectée doit être vue rapidement.']
  ],
  ramasse: [
    ['Pourquoi ne pas courir après lui s’il a ramassé quelque chose ?', 'Il avale plus vite', 'Il se fatigue', 'Ça ne change rien', 'On propose plutôt un échange.'],
    ['La coprophagie (manger des crottes), c’est…', 'Un comportement fréquent, avec des causes à chercher', 'Un vice à corriger par la punition', 'Un signe de méchanceté ou de vengeance', 'Ennui, faim, habitude ou santé : on en parle au vétérinaire.'],
    ['Pour un chien qui avale tout très vite ?', 'Une muselière panier bien conditionnée', 'Une muselière en tissu fermée', 'Le lâcher près des poubelles', 'Elle protège en attendant que l’apprentissage progresse.']
  ],
  creuser: [
    ['Première étape contre le creusage ?', 'Comprendre pourquoi il creuse', 'Punir chaque trou', 'Remplir les trous de déjections', 'Fraîcheur, ennui, rongeurs, envie de sortir : la solution dépend de la cause.'],
    ['Qu’offrir à un chien qui aime creuser ?', 'Un bac à fouille avec des trésors enterrés', 'Rien : il doit simplement arrêter de creuser', 'Un jardin en plein soleil, sans aucune ombre', 'On lui donne un endroit autorisé.'],
    ['Il creuse sous la clôture. Que faire ?', 'Enterrer du grillage et vérifier les raisons d’une fugue', 'L’attacher au jardin toute la journée', 'Le gronder chaque fois qu’il s’en approche', 'Il peut vouloir sortir : voir aussi la leçon sur les fugues.']
  ],
  fugue: [
    ['Il revient après une fugue. Que faire ?', 'L’accueillir positivement', 'Le punir', 'L’ignorer toute la journée', 'Punir le retour le fera revenir encore moins vite.'],
    ['Que vérifier sur l’identification ?', 'Puce enregistrée avec vos coordonnées actuelles', 'Rien, du moment qu’il porte un collier', 'Seulement que son collier soit bien visible', 'C’est ce qui permet de le retrouver.'],
    ['À la porte d’entrée, que lui apprendre ?', 'À attendre « Libre ! » avant de sortir', 'À sortir le premier dès que la porte s’ouvre', 'À gratter la porte quand il veut sortir', 'Toute la famille applique la même règle.']
  ],
  canape: [
    ['Qu’est-ce qui compte le plus pour les règles de la maison ?', 'La cohérence de toute la famille', 'Que le chien n’aille jamais sur le canapé', 'Que chacun fasse comme il veut', 'Des règles qui changent selon les personnes le perdent.'],
    ['Comment le faire descendre ?', 'Friandise lancée au sol avec « Descends »', 'Le tirer par le collier vers le sol', 'Le pousser doucement du canapé', 'Tirer par le collier peut provoquer un conflit.'],
    ['Il grogne quand on veut le faire descendre ?', 'Ne pas insister physiquement et demander conseil', 'Le forcer à descendre pour montrer qui décide', 'Le punir pour qu’il ne recommence plus', 'Voir la leçon sur la garde de ressources.']
  ],
  'parc-canin': [
    ['À quoi reconnaît-on un bon jeu entre chiens ?', 'Les rôles s’inversent et il y a des pauses', 'Un chien poursuit toujours l’autre', 'Le jeu devient raide et silencieux', 'Le jeu sain est réciproque.'],
    ['Un chien se cache et fuit sans cesse. Que faire ?', 'Intervenir calmement et faire une pause', 'Les laisser régler ça entre eux', 'Encourager les autres chiens à jouer', 'Il ne s’amuse plus : on le protège.'],
    ['Pourquoi rappeler au milieu du jeu ?', 'Pour qu’il apprenne que revenir ne met pas fin au plaisir', 'Pour mettre fin à tout jeu entre chiens', 'Pour le punir d’avoir trop joué', 'On le relâche aussitôt avec « Va jouer ! ».']
  ],
  tours2: [
    ['Pour « Recule », où s’entraîner ?', 'Dans un couloir étroit', 'Au milieu d’un parc', 'Dans un escalier', 'Le couloir l’aide à reculer droit.'],
    ['Pour le salut, quand marquer ?', 'Dès que les coudes plient, avant qu’il se couche', 'Quand il est entièrement couché au sol', 'Au moment où il se relève', 'On capture l’instant de la révérence.'],
    ['Quel chien ne doit pas faire le salut ou « Pan ! » ?', 'Un chien au dos ou aux épaules fragiles', 'Un chien jeune et en bonne santé', 'Un chien de petite taille, très souple', 'Évitez ces positions en cas de douleur.']
  ]
});
