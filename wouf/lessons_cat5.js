/* Wouf Éducation — leçons chat (Wouf Plus), 5ᵉ série : langage, soins, sécurité, voyages et complicité.
   Renforcement positif, aucune punition (jamais de jet d’eau, de cri ni de contrainte).
   Contenu à faire relire par un vétérinaire ou un comportementaliste félin diplômé avant communication commerciale. */
LESSONS.push(

{ id: 'c-langage', sp: 'cat', free: false, icon: '🗣️', cat: 'Complicité', title: 'Comprendre son chat : queue, oreilles, yeux et ronronnements', from: 8, dur: '10 min d’observation par jour', span: '2 à 3 semaines', level: 'Essentiel',
  goal: 'Vous savez lire les émotions de votre chat (confiance, envie de jeu, agacement, peur, douleur) et adapter vos gestes avant qu’il ne griffe, ne morde ou ne se cache.',
  why: 'Le chat communique subtilement : une queue qui bat, des oreilles qui pivotent, un clignement lent. Beaucoup de griffures arrivent après des signaux ignorés. Et le chat cache la douleur : savoir repérer les petits changements permet de consulter à temps.',
  need: ['Du temps d’observation', 'Votre téléphone pour filmer', 'Le journal de Wouf pour noter vos observations'],
  steps: [
    { t: 'La queue', min: 10, b: 'Queue dressée, bout légèrement recourbé : salut amical. Queue qui fouette ou bat le sol : agacement croissant, arrêtez ce que vous faites. Queue gonflée : peur intense. Queue basse ou enroulée sous le corps : inquiétude.', crit: 'Vous décrivez 4 positions de queue et leur sens.' },
    { t: 'Les oreilles et les yeux', min: 10, b: 'Oreilles droites vers l’avant : curiosité. Oreilles qui pivotent sur le côté ou en arrière (« avion ») : agacement ou peur. Pupilles dilatées : excitation, peur ou jeu selon le contexte. Clignement lent des yeux : signe de confiance ; répondez-lui par un clignement lent.', crit: 'Vous échangez un clignement lent avec votre chat.' },
    { t: 'Les sons', min: 10, b: 'Miaulement : surtout destiné aux humains (demande). Ronronnement : souvent bien-être, mais aussi parfois douleur ou stress (un chat malade peut ronronner). Feulement et crachement : « éloigne-toi ». Petits « trilles » : salutation amicale.', crit: 'Vous savez qu’un ronronnement n’est pas toujours un signe de bien-être.' },
    { t: 'Les postures', min: 10, b: 'Chat qui se roule sur le dos : signe de confiance, pas toujours une invitation à caresser le ventre. Corps ramassé, prêt à bondir : chasse ou peur. Dos rond et poils hérissés : peur et intimidation. Se frotter contre vous : marquage affectueux.', crit: 'Vous interprétez 3 postures dans leur contexte.' },
    { t: 'Repérer la douleur', min: 10, b: 'Le chat cache la douleur. Signes à noter : se cache plus, moins de toilettage ou toilette excessive d’une zone, dos voûté, yeux mi-clos, refus de sauter, changement d’appétit ou de litière, agressivité nouvelle. Consultez en cas de changement durable.', crit: 'Vous connaissez 5 signes discrets de douleur.' }
  ],
  plan: [['Jours 1 à 3', 'Observer la queue et les oreilles au quotidien.'], ['Jours 4 à 7', 'Clignements lents et sons.'], ['Semaine 2', 'Postures et contexte.'], ['Semaine 3', 'Repérer les signes de douleur, noter dans Wouf.']],
  next: ['Suivre « Caresses : respecter ses limites ».', 'Suivre « Chat craintif : gagner sa confiance ».', 'Faire un bilan annuel chez le vétérinaire, surtout après 7 ans.'],
  mistakes: ['Caresser le ventre d’un chat qui se roule sur le dos (piège classique).', 'Continuer quand la queue fouette.', 'Croire qu’un chat qui ronronne va forcément bien.', 'Punir un feulement : c’est un avertissement utile.'],
  faq: [['Mon chat me mord pendant les caresses.', 'Il a probablement montré des signes avant (queue, oreilles) : voyez la leçon « Caresses : respecter ses limites ».'], ['Il ronronne mais ne mange plus.', 'Consultez : le ronronnement peut accompagner la douleur ou la maladie.']],
  test: 'Devant 3 situations réelles ou filmées, vous identifiez correctement l’émotion du chat et la bonne réaction.', safety: 'Tout changement soudain de comportement (agressivité, cachettes, malpropreté, perte d’appétit) doit faire consulter le vétérinaire : c’est souvent le premier signe d’une douleur ou d’une maladie.' },

{ id: 'c-caresses', sp: 'cat', free: false, icon: '🤲', cat: 'Complicité', title: 'Caresses : respecter ses limites (et éviter les morsures)', from: 8, dur: '3 min × 3 par jour', span: '2 à 4 semaines', level: 'Essentiel',
  goal: 'Votre chat vient chercher le contact, apprécie des caresses courtes aux bons endroits, et vous vous arrêtez avant qu’il ne morde ou ne griffe.',
  why: 'Beaucoup de chats mordent « sans prévenir » pendant les caresses. En réalité, ils préviennent, mais discrètement. Chaque chat a son seuil de tolérance. En le laissant choisir et en s’arrêtant à temps, on obtient un chat plus câlin, pas moins.',
  need: ['Friandises', 'Une pièce calme', 'Un jouet pour rediriger si besoin'],
  steps: [
    { t: 'Les bonnes zones', min: 3, b: 'La plupart des chats aiment être caressés sur les joues, sous le menton et à la base des oreilles, là où se trouvent leurs glandes à odeur. Beaucoup n’aiment pas le ventre, la base de la queue ou les pattes. Observez ses préférences.', crit: 'Vous connaissez 3 zones que votre chat apprécie.' },
    { t: 'Le test du consentement', min: 3, b: 'Caressez 3 secondes, puis arrêtez-vous. S’il se frotte contre votre main ou vous relance, il en veut encore. S’il s’immobilise, détourne la tête ou s’éloigne, c’est assez. Répétez ce test à chaque séance.', crit: 'Vous faites le test du consentement à chaque caresse.' },
    { t: 'Repérer les signaux d’agacement', min: 3, b: 'Queue qui bat, peau du dos qui frissonne, oreilles qui pivotent, regard fixe sur votre main, arrêt du ronronnement : arrêtez immédiatement et retirez calmement votre main. Ne la retirez pas brusquement si elle est déjà prise.', crit: 'Vous arrêtez dès le premier signal, 8 fois sur 10.' },
    { t: 'Des séances courtes', min: 3, b: 'Préférez plusieurs caresses brèves dans la journée à une longue séance. Laissez toujours le chat venir à vous, et terminez avant qu’il ne s’agace. Une friandise en fin de séance renforce l’expérience positive.', crit: 'Plus de morsures pendant les caresses depuis 2 semaines.' },
    { t: 'Rediriger vers le jeu', min: 5, b: 'S’il est excité et cherche à attraper votre main, arrêtez la caresse et proposez un jouet (canne à pêche). Un chat qui mord pendant les caresses a parfois simplement besoin de plus de jeux de chasse.', crit: 'Il accepte le jouet à la place de la main.' }
  ],
  plan: [['Semaine 1', 'Repérer ses zones préférées, test du consentement.'], ['Semaine 2', 'Arrêter dès les premiers signaux d’agacement.'], ['Semaine 3', 'Séances courtes et fréquentes.'], ['Semaine 4', 'Plus de jeux de chasse pour canaliser l’énergie.']],
  next: ['Suivre « Comprendre son chat ».', 'Suivre « Griffes et morsures pendant le jeu ».', 'Suivre « Jeu et enrichissement : la chasse simulée ».'],
  mistakes: ['Retenir un chat qui veut partir.', 'Caresser le ventre parce qu’il s’est mis sur le dos.', 'Punir une morsure : il devient méfiant.', 'Laisser les enfants caresser sans surveillance ni règles.'],
  faq: [['Il me mord après quelques secondes.', 'Son seuil est bas : caressez 2 secondes, arrêtez, récompensez, et augmentez très lentement.'], ['Il mord soudain alors qu’il aimait les caresses.', 'Consultez : une douleur (dos, arthrose, peau) peut rendre le contact désagréable.']],
  test: 'Pendant 2 semaines, aucune morsure pendant les caresses, et votre chat vient de lui-même chercher le contact.', safety: 'Une morsure de chat s’infecte facilement : lavez à l’eau et au savon et consultez un médecin si la zone rougit, gonfle ou devient douloureuse.' },

{ id: 'c-brossage', sp: 'cat', free: false, icon: '🪮', cat: 'Soins', title: 'Brossage et boules de poils', from: 8, dur: '3 min × 3 par semaine', span: '2 à 4 semaines', level: 'Utile',
  goal: 'Votre chat accepte le brossage avec plaisir, son pelage reste sans nœuds, et les boules de poils diminuent.',
  why: 'En faisant sa toilette, le chat avale beaucoup de poils, surtout pendant la mue et chez les chats à poil long. Le brossage régulier limite les boules de poils, les nœuds (douloureux et source de lésions) et permet d’inspecter la peau. Il renforce aussi le lien.',
  need: ['Brosse adaptée (gant en caoutchouc pour poil court, peigne et brosse douce pour poil long)', 'Friandises', 'Un moment calme'],
  steps: [
    { t: 'Choisir l’outil', min: 5, b: 'Poil court : gant en caoutchouc ou brosse souple. Poil mi-long à long (persan, maine coon) : peigne métallique à dents larges et brosse carde douce, avec brossage quotidien. Évitez les outils qui coupent le sous-poil sans conseil professionnel.', crit: 'Vous avez l’outil adapté à son pelage.' },
    { t: 'Commencer par les joues', min: 3, b: 'Brossez d’abord là où il aime être caressé (joues, dos), quelques passages, puis friandise. Arrêtez avant qu’il ne s’agace. Beaucoup de chats finissent par réclamer la brosse.', crit: 'Il accepte 1 minute de brossage sur le dos et les joues.' },
    { t: 'Les zones difficiles', min: 3, b: 'Ventre, culotte, aisselles et derrière les oreilles forment des nœuds chez les poils longs. Travaillez une petite zone par séance. Tenez la base du nœud pour ne pas tirer sur la peau. Un nœud serré se retire chez le toiletteur ou le vétérinaire, jamais aux ciseaux pointus près de la peau.', crit: 'Il accepte le peigne sous les aisselles et sur le ventre.' },
    { t: 'Limiter les boules de poils', min: 5, b: 'Brossage plus fréquent pendant la mue, alimentation adaptée (fibres) si le vétérinaire le conseille, eau à volonté. Vomir occasionnellement une boule de poils peut arriver ; des vomissements fréquents ne sont pas « normaux » et doivent être signalés au vétérinaire.', crit: 'Moins de boules de poils rejetées qu’avant.' },
    { t: 'Inspecter la peau', min: 2, b: 'Profitez du brossage pour vérifier : puces (grains noirs), croûtes, rougeurs, grosseurs, perte de poils par zones. Notez-les dans le journal de Wouf.', crit: 'Vous inspectez la peau à chaque séance.' }
  ],
  plan: [['Semaine 1', 'Brossage court sur les zones appréciées.'], ['Semaine 2', 'Une zone difficile par séance.'], ['Semaine 3', 'Routine complète 3 fois par semaine (quotidienne pour poil long).'], ['Pendant la mue', 'Brossage quotidien.']],
  next: ['Suivre « Soins et manipulations : brossage, griffes, comprimé ».', 'Suivre « Couper les griffes de son chat ».', 'Demander au vétérinaire une alimentation adaptée si les boules de poils persistent.'],
  mistakes: ['Tirer sur les nœuds.', 'Faire de longues séances d’emblée.', 'Couper un nœud aux ciseaux près de la peau (risque de coupure).', 'Croire que les vomissements fréquents de poils sont normaux.'],
  faq: [['Il déteste la brosse.', 'Essayez un gant en caoutchouc (ressemble à une caresse) et des séances de 30 secondes.'], ['Il vomit souvent des poils.', 'Consultez : des vomissements fréquents peuvent cacher un trouble digestif.']],
  test: 'Il accepte 3 minutes de brossage complet, zones difficiles comprises, sans chercher à partir.', safety: 'Un chat âgé ou en surpoids qui ne fait plus sa toilette (poil gras, nœuds sur le dos) peut souffrir d’arthrose ou d’une maladie : consultez.' },

{ id: 'c-griffes', sp: 'cat', free: false, icon: '✂️', cat: 'Soins', title: 'Couper les griffes de son chat', from: 10, dur: '2 min × 1 par jour', span: '2 à 4 semaines', level: 'Utile',
  goal: 'Votre chat accepte qu’on lui prenne les pattes, sorte ses griffes et en coupe la pointe, une ou deux à la fois, sans stress.',
  why: 'Un chat qui sort et a un griffoir use souvent ses griffes seul, mais les chats d’intérieur, âgés ou peu actifs ont souvent des griffes trop longues, qui s’accrochent, cassent ou s’incarnent dans le coussinet. Une habituation progressive évite la contention et le stress.',
  need: ['Coupe-griffes pour chat', 'Poudre hémostatique', 'Friandises très appréciées (pâte en tube)', 'Une bonne lumière'],
  steps: [
    { t: 'Toucher les pattes', min: 2, b: 'Pendant un moment calme, touchez une patte une seconde, friandise. Tenez-la doucement, friandise. Ne retenez pas s’il la retire. Travaillez les quatre pattes, sur plusieurs jours.', crit: 'Il vous laisse tenir chaque patte 3 secondes.' },
    { t: 'Sortir la griffe', min: 2, b: 'Appuyez doucement sur le dessus et le dessous du doigt : la griffe sort. Relâchez, friandise. Repérez la partie rose (vivante) visible par transparence : on ne coupe que la pointe transparente, 1 à 2 mm.', crit: 'Il accepte que vous sortiez ses griffes.' },
    { t: 'Présenter le coupe-griffes', min: 2, b: 'Montrez l’outil, friandise. Faites-le claquer à côté (sur un spaghetti cru, par exemple), friandise. Touchez une griffe avec l’outil fermé, friandise.', crit: 'Il reste calme quand l’outil touche ses griffes.' },
    { t: 'Une ou deux griffes par séance', min: 2, b: 'Coupez la pointe d’une griffe, grosse récompense, fin de séance. Le lendemain, une autre. Quand c’est facile, passez à une patte entière. N’oubliez pas l’ergot (le pouce) des pattes avant.', crit: 'Il accepte la coupe d’une patte sans se débattre.' },
    { t: 'Le bon rythme', min: 2, b: 'Recoupez environ toutes les 3 à 5 semaines. Vérifiez particulièrement les chats âgés : leurs griffes s’épaississent et peuvent s’enfoncer dans le coussinet.', crit: 'Les griffes ne s’accrochent plus aux tissus.' }
  ],
  plan: [['Semaine 1', 'Toucher et tenir les pattes, sortir les griffes.'], ['Semaine 2', 'Présentation du coupe-griffes.'], ['Semaine 3', 'Une ou deux griffes par séance.'], ['Semaine 4', 'Une patte par séance, puis entretien régulier.']],
  next: ['Suivre « Griffoir : préserver les meubles ».', 'Suivre « Soins et manipulations ».', 'Faire contrôler les griffes des chats âgés à chaque visite.'],
  mistakes: ['Couper trop court (saignement et douleur).', 'Tenir le chat à plusieurs de force.', 'Tout couper en une fois avec un chat stressé.', 'Dégriffer un chat : c’est une amputation, interdite dans de nombreux pays et contraire au bien-être.'],
  faq: [['Il se débat.', 'Arrêtez, revenez aux étapes précédentes, et faites des séances plus courtes, par exemple pendant qu’il somnole.'], ['J’ai coupé trop court.', 'Appliquez de la poudre hémostatique en pressant ; consultez si ça saigne longtemps.']],
  test: 'Vous coupez les griffes des 4 pattes (en une ou deux séances) sans saignement et sans lutte.', safety: 'Une griffe incarnée dans le coussinet, un doigt gonflé ou une boiterie doivent être vus par un vétérinaire. Ne dégriffez jamais un chat.' },

{ id: 'c-comprimes', sp: 'cat', free: false, icon: '💊', cat: 'Soins', title: 'Donner un comprimé ou un sirop à son chat', from: 10, dur: '2 min × 2 par jour', span: '1 à 3 semaines', level: 'Essentiel',
  goal: 'Votre chat avale ses médicaments (comprimé, gélule, sirop) sans lutte, grâce à des techniques douces préparées à l’avance.',
  why: 'Donner un comprimé à un chat est redouté par beaucoup de propriétaires. Les chats flairent et recrachent facilement, et une contention brutale les rend méfiants pour longtemps. Préparer ces gestes à l’avance et choisir la bonne méthode change tout.',
  need: ['Pâte appétente pour chat (friandise à mâcher creuse ou pâte en tube)', 'Seringue sans aiguille', 'Une serviette', 'Friandises'],
  steps: [
    { t: 'Demander la bonne forme', min: 5, b: 'Demandez au vétérinaire si le médicament existe en version appétente, liquide, en pâte, ou en pipette. Certains comprimés peuvent être écrasés et mélangés, d’autres pas : ne le faites jamais sans son avis.', crit: 'Vous connaissez la forme la plus simple pour votre chat.' },
    { t: 'La friandise « cachette »', min: 2, b: 'Entraînez-vous avec des friandises vides : donnez-en une vide, puis une avec le comprimé, puis une vide. Pour les chats méfiants, entraînez-vous plusieurs jours avant le traitement pour qu’il accepte ces friandises sans suspicion.', crit: 'Il mange 3 friandises cachettes à la suite.' },
    { t: 'La seringue de sirop', min: 2, b: 'Entraînez-vous avec un peu de pâtée délayée ou de l’eau de thon dans la seringue : introduisez l’embout sur le côté de la gueule, derrière les crocs, et poussez lentement. Récompensez. Le jour venu, le sirop passera plus facilement.', crit: 'Il accepte la seringue sur le côté de la bouche.' },
    { t: 'Le comprimé à la main (si nécessaire)', min: 2, b: 'Chat enveloppé dans une serviette si besoin, tête légèrement relevée, ouvrez doucement la gueule, déposez le comprimé au fond, refermez et massez la gorge. Faites suivre immédiatement d’un peu d’eau à la seringue et d’une friandise.', crit: 'Le comprimé est avalé en moins de 30 secondes.' },
    { t: 'Faire suivre d’eau', min: 1, b: 'Chez le chat, un comprimé qui reste coincé dans l’œsophage peut causer une inflammation grave. Faites toujours suivre d’un peu d’eau (5 ml environ à la seringue) ou d’une friandise humide. Notez chaque prise dans Wouf.', crit: 'Chaque prise est suivie d’eau ou de nourriture humide.' }
  ],
  plan: [['Avant le traitement', 'Friandises cachettes et seringue « à blanc », plusieurs jours.'], ['Jour 1 du traitement', 'Choisir la méthode la plus douce, noter l’heure.'], ['Pendant le traitement', 'Même moment chaque jour, eau à la seringue après chaque prise.'], ['Après', 'Une séance à blanc de temps en temps pour garder l’habitude.']],
  next: ['Suivre « Caisse de transport et vétérinaire sans stress ».', 'Suivre « Soins et manipulations ».', 'Demander au vétérinaire une démonstration de la technique.'],
  mistakes: ['Donner un médicament humain : le paracétamol est mortel pour le chat.', 'Donner un comprimé sec sans eau après.', 'Écraser un comprimé sans avis.', 'Poursuivre le chat dans toute la maison.'],
  faq: [['Il bave beaucoup après le comprimé.', 'Certains médicaments ont un goût amer ; c’est souvent impressionnant mais passager. Demandez une autre forme au vétérinaire.'], ['Il recrache toujours.', 'Demandez une forme liquide, en pâte, ou transdermique si elle existe.']],
  test: 'Le traitement est donné en entier, à l’heure, sans lutte ni griffure.', safety: 'Ne donnez jamais de médicament humain à un chat (paracétamol, ibuprofène, aspirine…) : ils sont toxiques, parfois mortels. En cas de doute ou d’oubli, appelez le vétérinaire.' },

{ id: 'c-plans', sp: 'cat', free: false, icon: '🍽️', cat: 'Savoir-vivre', title: 'Tables et plans de travail : offrir mieux en hauteur', from: 8, dur: '5 min × 2 par jour', span: '2 à 4 semaines', level: 'Utile',
  goal: 'Votre chat préfère ses perchoirs aux plans de travail et à la table, et vous n’avez plus besoin de le chasser.',
  why: 'Le chat aime la hauteur : il s’y sent en sécurité, observe et surveille. Il monte aussi sur le plan de travail parce qu’il y trouve de la nourriture ou de l’attention. Plutôt que de punir, on lui offre des perchoirs plus attirants et on retire ce qui l’attire.',
  need: ['Arbre à chat ou étagères murales près de la cuisine', 'Friandises', 'Rangement des aliments', 'Tapis antidérapants ou adhésif double face (facultatif)'],
  steps: [
    { t: 'Retirer les récompenses', min: 5, b: 'Rangez la nourriture, essuyez les miettes, fermez la poubelle. Un chat qui trouve régulièrement quelque chose à manger reviendra. Ne le nourrissez jamais sur le plan de travail.', crit: 'Plus aucune nourriture accessible sur les plans.' },
    { t: 'Installer un perchoir attractif', min: 15, b: 'Placez un arbre à chat ou une étagère près de la cuisine, avec vue sur ce que vous faites. Garnissez-le d’une couverture, déposez des friandises. Récompensez chaque fois qu’il y monte.', crit: 'Il monte volontiers sur son perchoir pendant que vous cuisinez.' },
    { t: 'Rediriger calmement', min: 3, b: 'S’il saute sur le plan de travail, posez-le doucement au sol sans un mot, ou attirez-le vers son perchoir avec une friandise. Pas de cris ni d’eau : il apprendrait à monter quand vous n’êtes pas là.', crit: 'Il accepte d’être redirigé vers son perchoir.' },
    { t: 'Rendre les plans moins agréables', min: 5, b: 'Temporairement, adhésif double face ou set de table retourné sur les plans : texture désagréable mais sans danger. Retirez-les quand l’habitude est prise.', crit: 'Il monte moins souvent sur les plans.' },
    { t: 'Récompenser le bon choix', min: 3, b: 'Dès qu’il choisit son perchoir, friandise ou caresse. Les chats apprennent très bien ce qui est payant. Pensez à la sécurité : plaques de cuisson brûlantes, couteaux, produits toxiques.', crit: 'Plus de visite sur le plan de travail depuis 2 semaines.' }
  ],
  plan: [['Semaine 1', 'Retirer la nourriture, installer le perchoir.'], ['Semaine 2', 'Rediriger calmement, récompenser le perchoir.'], ['Semaine 3', 'Rendre les plans temporairement moins agréables.'], ['Semaine 4', 'Retirer les aides, maintenir les récompenses.']],
  next: ['Suivre « Aménager sa maison pour un chat épanoui ».', 'Suivre « Clicker et cible : viens, assis, touche ».', 'Suivre « Jeu et enrichissement ».'],
  mistakes: ['Jeter de l’eau ou crier : le chat devient méfiant et continue en votre absence.', 'Laisser de la nourriture sur le plan.', 'Ne proposer aucun lieu en hauteur.', 'Oublier les plaques de cuisson chaudes.'],
  faq: [['Il monte la nuit.', 'Fermez la cuisine ou rendez les plans temporairement désagréables, et proposez un perchoir la nuit.'], ['Il vole la nourriture.', 'Rangez tout et offrez des repas fractionnés, voire des distributeurs de croquettes.']],
  test: 'Pendant 2 semaines, il ne monte plus sur le plan de travail et utilise son perchoir.', safety: 'Les plaques de cuisson brûlent les coussinets : ne laissez jamais un chat seul dans une cuisine avec des plaques chaudes. Rangez lys, oignons, ail, chocolat, raisins et produits ménagers.' },

{ id: 'c-fenetres', sp: 'cat', free: false, icon: '🪟', cat: 'Sorties', title: 'Fenêtres et balcons : prévenir les chutes', from: 8, dur: 'Aménagement sur 1 semaine', span: '1 à 2 semaines', level: 'Essentiel',
  goal: 'Votre maison est sécurisée (filets, moustiquaires, fenêtres oscillo-battantes protégées) et votre chat profite de la vue sans risque de chute.',
  why: 'Les chutes depuis les fenêtres et balcons (« syndrome du chat parachutiste ») sont très fréquentes, surtout au printemps et en été, même chez les chats d’appartement « prudents ». Un oiseau, un insecte ou un bruit suffisent. Les fenêtres oscillo-battantes peuvent aussi coincer et blesser gravement.',
  need: ['Filets de protection pour balcon', 'Moustiquaires résistantes', 'Protections pour fenêtres oscillo-battantes', 'Un perchoir près d’une fenêtre sécurisée'],
  steps: [
    { t: 'Faire le tour des risques', min: 15, b: 'Repérez chaque fenêtre, balcon, velux et fenêtre oscillo-battante accessibles. Notez ceux que vous ouvrez souvent. Pensez aussi aux fenêtres de toit et aux chambres d’enfants.', crit: 'Vous avez listé toutes les ouvertures à risque.' },
    { t: 'Installer des filets et moustiquaires', min: 60, b: 'Posez des filets anti-chute sur le balcon (fixations solides, sans trous suffisants pour passer la tête), et des moustiquaires résistantes aux fenêtres. Vérifiez que le chat ne peut pas les déchirer ni se faufiler sur les côtés.', crit: 'Balcon et fenêtres ouvertes sont protégés.' },
    { t: 'Protéger les oscillo-battants', min: 15, b: 'La position « basculée » est un piège : le chat tente de passer et reste coincé, avec des lésions graves. Installez une grille de protection spécifique, ou ne laissez jamais cette position quand le chat est dans la pièce.', crit: 'Aucune fenêtre oscillo-battante n’est laissée basculée sans protection.' },
    { t: 'Offrir une fenêtre sûre', min: 10, b: 'Installez un perchoir ou un hamac de fenêtre près d’une vitre fermée ou protégée : le chat observe les oiseaux en toute sécurité. C’est un véritable enrichissement (« télévision pour chat »).', crit: 'Il a un poste d’observation sécurisé.' },
    { t: 'Les bons réflexes au quotidien', min: 5, b: 'Informez toute la famille et les visiteurs : fenêtre ouverte = chat dans une autre pièce ou protection en place. Soyez particulièrement vigilant au printemps, en été, et après un déménagement.', crit: 'Toute la famille applique la règle.' }
  ],
  plan: [['Jour 1', 'Inventaire des fenêtres et balcons à risque.'], ['Jours 2 à 5', 'Installation des filets et moustiquaires.'], ['Jour 6', 'Protection des oscillo-battants.'], ['Jour 7', 'Perchoir de fenêtre sécurisé et règles familiales.']],
  next: ['Suivre « Aménager sa maison pour un chat épanoui ».', 'Suivre « Chat qui sort : sécurité, identification et catio ».', 'Suivre « Déménagement et changements ».'],
  mistakes: ['Penser que son chat « ne sautera jamais ».', 'Laisser une fenêtre oscillo-battante basculée.', 'Poser un filet mal fixé.', 'Oublier la vigilance lors des fêtes ou des visites.'],
  faq: [['Mon chat est au 1er étage, c’est grave ?', 'Oui : les chutes d’un étage peuvent causer fractures et traumatismes, surtout sur une surface dure.'], ['Il est tombé mais semble aller bien.', 'Consultez quand même rapidement : des lésions internes (thorax, mâchoire) peuvent passer inaperçues.']],
  test: 'Toutes les fenêtres et balcons accessibles sont sécurisés, et votre chat profite d’un poste d’observation sûr.', safety: 'Après toute chute, même d’une faible hauteur, consultez un vétérinaire en urgence : hémorragies internes, fractures de la mâchoire ou du palais et traumatismes thoraciques sont fréquents.' },

{ id: 'c-rappel', sp: 'cat', free: false, icon: '📣', cat: 'Complicité', title: 'Faire venir son chat : le rappel au son', from: 8, dur: '2 min × 3 par jour', span: '2 à 3 semaines', level: 'Utile',
  goal: 'Votre chat accourt quand il entend un son précis (sifflet, claquement de langue, boîte secouée), à la maison et au jardin.',
  why: 'Oui, un chat peut apprendre à venir quand on l’appelle ! C’est très utile pour le rentrer le soir, le retrouver en cas de fuite, le mettre dans sa caisse ou le trouver quand il est caché. Le secret : un son unique, toujours associé à une récompense irrésistible.',
  need: ['Friandises irrésistibles (pâte en tube, morceaux de poulet)', 'Un son unique : sifflet, clicker, boîte de friandises secouée', 'Des pièces calmes pour commencer'],
  steps: [
    { t: 'Charger le son', min: 2, b: 'Faites le son (sifflet court, par exemple), puis donnez immédiatement la friandise, alors que le chat est juste à côté de vous. Répétez 10 fois par séance. Le son doit annoncer quelque chose de merveilleux.', crit: 'Il tourne la tête vers vous au son, 8 fois sur 10.' },
    { t: 'Augmenter la distance', min: 2, b: 'Faites le son quand il est à 1 mètre, puis 3 mètres, puis dans la pièce voisine. Récompensez généreusement dès qu’il arrive. Ne l’appelez jamais pour quelque chose de désagréable (médicament, caisse).', crit: 'Il vient depuis une autre pièce, 8 fois sur 10.' },
    { t: 'Varier les lieux', min: 2, b: 'Appelez-le depuis différentes pièces, étages, puis au jardin ou sur le balcon (si sécurisé). Récompensez toujours. Utilisez-le aussi à l’heure des repas : c’est une récompense naturelle.', crit: 'Il vient au son dans 4 lieux différents.' },
    { t: 'Utiliser le rappel au quotidien', min: 2, b: 'Rentrer le soir, retrouver le chat caché avant un départ, arrêter une bêtise : le son, puis récompense. Gardez 3 rappels « gratuits » pour 1 rappel utile, afin qu’il reste motivé.', crit: 'Il rentre le soir au son, 8 fois sur 10.' },
    { t: 'En cas de fuite', min: 2, b: 'Si votre chat s’échappe, utilisez ce son en restant calme, près de la maison, surtout la nuit quand c’est plus calme. Laissez sa litière et une gamelle près de la porte. C’est souvent ce son qui le fait revenir.', crit: 'Vous savez utiliser le son en cas de fuite.' }
  ],
  plan: [['Semaine 1', 'Charger le son, 3 séances de 10 répétitions par jour.'], ['Semaine 2', 'Distance croissante, autres pièces.'], ['Semaine 3', 'Autres lieux, utilisation à l’heure des repas et le soir.'], ['Ensuite', 'Garder 3 rappels récompensés pour 1 rappel utile.']],
  next: ['Suivre « Clicker et cible : viens, assis, touche ».', 'Suivre « Chat qui sort : sécurité, identification et catio ».', 'Suivre « Tours au clicker ».'],
  mistakes: ['Utiliser le son pour quelque chose de désagréable.', 'Utiliser un son banal (son prénom dit toute la journée).', 'Oublier la récompense.', 'Appeler en boucle quand il ne vient pas.'],
  faq: [['Il ne vient pas quand il est occupé.', 'Travaillez d’abord quand il est calme, et utilisez une récompense encore plus irrésistible.'], ['Mon chat âgé n’entend plus bien.', 'Utilisez une vibration (taper au sol) ou une lumière, et approchez-vous davantage.']],
  test: 'Il vient au son depuis une autre pièce ou le jardin en moins de 10 secondes, 8 fois sur 10.', safety: 'Un chat qui ne revient pas et disparaît plus de 24 heures : prévenez le fichier d’identification, les vétérinaires, la fourrière et les voisins, et utilisez la page « Animal perdu » de Wouf.' },

{ id: 'c-tours', sp: 'cat', free: false, icon: '🎪', cat: 'Complicité', title: 'Tours au clicker : tape m’en cinq, tourne, saute', from: 12, dur: '3 min × 2 par jour', span: '3 à 6 semaines', level: 'Intermédiaire',
  goal: 'Votre chat réalise 3 tours sur signal (tape m’en cinq, tourne sur lui-même, saute sur un tabouret), avec plaisir, en séances très courtes.',
  why: 'Les chats apprennent très bien avec le clicker et les friandises. Les tours stimulent leur esprit, renforcent la relation, occupent les chats d’appartement et facilitent les soins (un chat qui touche une cible se déplace sur demande). Tout se fait sans contrainte, en quelques minutes par jour.',
  need: ['Un clicker (ou un mot bref)', 'Friandises très petites et appétissantes', 'Une baguette cible (ou un stylo)', 'Un tabouret stable'],
  steps: [
    { t: 'Charger le clicker', min: 2, b: 'Clic, puis friandise immédiate, 10 fois. Le chat comprend que le clic annonce une récompense. Si vous avez déjà suivi la leçon « Clicker et cible », passez à l’étape suivante.', crit: 'Il tourne la tête vers vous au clic.' },
    { t: 'Tape m’en cinq', min: 3, b: 'Tenez une friandise dans votre main fermée, un peu au-dessus de sa tête. Il lève la patte pour l’attraper : clic, et ouvrez la main. Puis présentez votre paume ouverte : clic dès que sa patte la touche. Ajoutez le mot « Tape ! ».', crit: 'Il touche votre paume sur « Tape ! », 8 fois sur 10.' },
    { t: 'Tourne', min: 3, b: 'Guidez-le avec la baguette cible ou une friandise en décrivant un petit cercle autour de lui. Clic quand il a fait le tour complet. Réduisez peu à peu le geste jusqu’à un simple mouvement du doigt.', crit: 'Il fait un tour complet sur un geste du doigt.' },
    { t: 'Saute sur le tabouret', min: 3, b: 'Tapotez le tabouret, clic quand il y pose les pattes avant, puis quand il monte entièrement. Ajoutez « Hop ! ». Puis éloignez le tabouret d’un autre pour qu’il saute de l’un à l’autre (distance modeste).', crit: 'Il saute sur le tabouret sur « Hop ! ».' },
    { t: 'Enchaîner', min: 3, b: 'Enchaînez deux tours, puis trois, avec une récompense à la fin. Séances de 2 à 3 minutes maximum : arrêtez quand il est encore motivé. Un chat qui part, c’est une séance trop longue.', crit: 'Il enchaîne les 3 tours pour une seule récompense.' }
  ],
  plan: [['Semaine 1', 'Charger le clicker, tape m’en cinq.'], ['Semaine 2', 'Tourne sur lui-même.'], ['Semaines 3 et 4', 'Saut sur le tabouret.'], ['Semaines 5 et 6', 'Enchaîner les tours.']],
  next: ['Suivre « Clicker et cible : viens, assis, touche ».', 'Apprendre à entrer dans la caisse sur signal (« Caisse ! »).', 'Apprendre à passer dans un cerceau.'],
  mistakes: ['Des séances trop longues : le chat s’en va.', 'Des friandises trop grosses : il n’a plus faim au bout de 3 répétitions.', 'Cliquer sans récompenser.', 'Faire sauter haut un chat âgé ou arthrosique.'],
  faq: [['Il n’est pas intéressé.', 'Essayez avant le repas, avec une friandise plus appétissante, et des séances d’une minute.'], ['Il donne la patte sans arrêt.', 'Ne récompensez que sur le mot, et arrêtez la séance calmement s’il insiste.']],
  test: 'Il réalise « Tape ! », « Tourne » et « Hop ! » sur signal, enchaînés, avec entrain.', safety: 'Pas de sauts pour un chat âgé, arthrosique ou en surpoids. Utilisez des supports stables et non glissants.' },

{ id: 'c-voyage', sp: 'cat', free: false, icon: '🚗', cat: 'Sorties', title: 'Voyager avec son chat : voiture, train et avion', from: 12, dur: 'Préparation sur 2 à 4 semaines', span: '2 à 4 semaines', level: 'Utile',
  goal: 'Votre chat voyage en voiture, en train ou en avion dans sa caisse, sereinement, avec l’équipement et les documents nécessaires.',
  why: 'Pour beaucoup de chats, le voyage se résume à la caisse, au bruit et au vétérinaire. Une préparation progressive (caisse, trajets courts, repères olfactifs) réduit fortement le stress, les vomissements et les miaulements.',
  need: ['Caisse de transport rigide, bien aérée', 'Tapis absorbant et couverture familière', 'Passeport européen et vaccins à jour (selon destination)', 'Diffuseur ou spray de phéromones félines (facultatif)'],
  steps: [
    { t: 'La caisse, un endroit familier', min: 5, b: 'Laissez la caisse ouverte dans la maison, avec une couverture et des friandises. Le chat doit y dormir de lui-même avant tout voyage. Voir la leçon « Caisse de transport et vétérinaire sans stress ».', crit: 'Il entre et dort dans sa caisse spontanément.' },
    { t: 'Des trajets courts', min: 10, b: 'En voiture : caisse attachée par la ceinture ou calée au sol derrière un siège. Démarrez le moteur sans rouler, puis 2 minutes, puis 10. Récompensez au retour. Évitez les freinages brusques et la musique forte.', crit: 'Il reste calme pendant 10 minutes de trajet.' },
    { t: 'Préparer les règles et documents', min: 15, b: 'Train et avion : vérifiez les règles de la compagnie (taille de sac, cabine ou soute, tarif). Étranger : identification, vaccin antirabique et exigences du pays à vérifier plusieurs mois à l’avance avec votre vétérinaire.', crit: 'Documents et règles sont vérifiés.' },
    { t: 'Le jour du départ', min: 10, b: 'Repas léger quelques heures avant (limite les nausées), couverture familière dans la caisse, tapis absorbant. Ne sortez jamais le chat de sa caisse dans un lieu non clos. Proposez de l’eau pendant les pauses, dans la voiture fermée.', crit: 'Le chat voyage ventre léger, dans une caisse préparée.' },
    { t: 'L’installation à l’arrivée', min: 15, b: 'Installez-le dans une seule pièce, avec litière, eau, nourriture, cachette et couverture. Laissez-le explorer à son rythme. Vérifiez fenêtres et balcons. Repérez le vétérinaire le plus proche avec Wouf.', crit: 'Il mange et utilise sa litière dès le premier jour.' }
  ],
  plan: [['3 à 4 semaines avant', 'Caisse ouverte à la maison, documents vérifiés.'], ['2 semaines avant', 'Trajets courts en voiture.'], ['1 semaine avant', 'Trajets plus longs, préparation du matériel.'], ['Le jour J', 'Repas léger, caisse familière, arrivée dans une pièce calme.']],
  next: ['Suivre « Déménagement et changements ».', 'Suivre « Laisser son chat seul » si vous ne l’emmenez pas.', 'Consulter le vétérinaire si le chat vomit en voiture (médicament contre le mal des transports).'],
  mistakes: ['Sortir la caisse seulement le jour du départ.', 'Laisser le chat libre dans la voiture.', 'Ouvrir la caisse sur une aire d’autoroute.', 'Donner un calmant sans avis vétérinaire.'],
  faq: [['Il miaule tout le trajet.', 'Couvrez partiellement la caisse avec une couverture, parlez doucement et faites des trajets d’entraînement plus courts.'], ['Il vomit en voiture.', 'Repas léger et plus tôt, trajets progressifs ; demandez au vétérinaire un traitement contre le mal des transports.']],
  test: 'Il voyage 1 heure dans sa caisse, calme, sans vomir, et s’installe rapidement à l’arrivée.', safety: 'Ne laissez jamais un chat dans une voiture au soleil, même quelques minutes : la température monte très vite et peut être mortelle.' },

{ id: 'c-socialisation', sp: 'cat', free: false, icon: '🐣', cat: 'Chaton', title: 'Socialiser son chaton : sons, gens, objets et manipulations', from: 7, dur: '5 min × 3 par jour', span: '4 à 8 semaines', level: 'Essentiel',
  goal: 'Votre chaton découvre sereinement les bruits, les personnes, les objets et les manipulations du quotidien, et devient un adulte confiant.',
  why: 'Entre 2 et 7 semaines, le chaton traverse une période clé de socialisation, qui se prolonge en habituation les mois suivants. Les expériences positives de ces premiers mois façonnent un chat confiant ; le manque d’expériences produit souvent un adulte craintif.',
  need: ['Friandises adaptées au chaton', 'Des jouets variés', 'Des enregistrements de sons du quotidien', 'Des visiteurs calmes'],
  steps: [
    { t: 'Les personnes', min: 5, b: 'Faites rencontrer au chaton des personnes variées (hommes, femmes, enfants calmes, personnes avec chapeau ou lunettes). Laissez-le venir, jamais le prendre de force. Chaque visiteur peut offrir une friandise ou un jeu.', crit: 'Il vient spontanément vers 5 personnes différentes.' },
    { t: 'Les sons', min: 5, b: 'Aspirateur, sèche-cheveux, sonnette, télévision, orage enregistré : d’abord à faible volume ou à distance, pendant un jeu ou un repas, puis augmentez lentement. Stoppez si le chaton se fige ou se cache.', crit: 'Il continue à jouer malgré l’aspirateur dans une autre pièce.' },
    { t: 'Les manipulations', min: 3, b: 'Touchez doucement les pattes, les oreilles, la bouche, soulevez-le correctement (une main sous le poitrail, une sous l’arrière-train), récompensez. Présentez la brosse, le coupe-griffes, la caisse. Il sera plus facile à soigner toute sa vie.', crit: 'Il accepte qu’on touche ses pattes, oreilles et bouche.' },
    { t: 'Les objets et surfaces', min: 5, b: 'Cartons, sacs, tunnels, sols différents, jouets qui roulent : laissez-le explorer à son rythme. Un environnement varié développe sa curiosité et sa confiance.', crit: 'Il explore un nouvel objet en moins de 2 minutes.' },
    { t: 'Les autres animaux', min: 10, b: 'Si possible, rencontres avec un chien ou un chat adulte calme et habitué aux chatons, toujours sous surveillance et avec une échappatoire. Voir la leçon « Présenter deux animaux ».', crit: 'Il reste détendu en présence d’un animal calme.' }
  ],
  plan: [['Semaine 1', 'Personnes et manipulations douces.'], ['Semaine 2', 'Sons du quotidien à faible volume.'], ['Semaines 3 et 4', 'Objets, surfaces, caisse de transport.'], ['Semaines 5 à 8', 'Autres animaux calmes, sorties en caisse.']],
  next: ['Suivre « Arrivée du chaton : les 7 premiers jours ».', 'Suivre « Caisse de transport et vétérinaire sans stress ».', 'Suivre « Clicker et cible : viens, assis, touche ».'],
  mistakes: ['Forcer le chaton à être tenu ou câliné.', 'Tout lui faire découvrir en même temps.', 'Laisser les enfants le poursuivre.', 'Jouer avec les mains : il apprend à mordre.'],
  faq: [['Mon chaton se cache tout le temps.', 'Réduisez l’intensité, laissez-lui des cachettes et laissez-le venir à son rythme ; certains chatons ont besoin de plus de temps.'], ['Il est adopté à 3 mois, est-il trop tard ?', 'Non : l’habituation continue toute la jeunesse ; allez simplement plus doucement.']],
  test: 'Il reste curieux et détendu face à des personnes, sons et objets nouveaux, et accepte les manipulations de base.', safety: 'Suivez le calendrier de vaccination avant tout contact avec d’autres chats. Un chaton qui mange peu, a la diarrhée ou éternue doit voir un vétérinaire rapidement.' },

{ id: 'c-convalescence', sp: 'cat', free: false, icon: '🩹', cat: 'Soins', title: 'Convalescence et collerette : aider son chat à guérir', from: 8, dur: 'Pendant la convalescence', span: '1 à 4 semaines', level: 'Utile',
  goal: 'Votre chat respecte le repos après une opération, garde sa collerette ou son body, mange, boit et utilise sa litière normalement.',
  why: 'Après une stérilisation ou une chirurgie, un chat qui saute, lèche sa plaie ou ne mange plus guérit moins bien. Un espace adapté, une collerette bien réglée et une surveillance attentive rendent la convalescence sereine.',
  need: ['Collerette ou body post-opératoire', 'Une pièce calme sans hauteurs', 'Litière à bords bas', 'Nourriture appétente'],
  steps: [
    { t: 'Préparer la pièce de convalescence', min: 15, b: 'Une pièce calme, sans meubles hauts ni arbre à chat, avec couchage au sol, litière à bords bas (avec du papier journal si demandé par le vétérinaire), eau et nourriture accessibles.', crit: 'La pièce est prête avant le retour du chat.' },
    { t: 'La collerette ou le body', min: 5, b: 'La collerette doit dépasser le museau, sans gêner la respiration. Surélevez légèrement les gamelles. Beaucoup de chats supportent mieux un body post-opératoire : demandez au vétérinaire lequel convient.', crit: 'Il mange et boit avec sa collerette.' },
    { t: 'Surveiller la plaie', min: 2, b: 'Observez la plaie deux fois par jour : légère rougeur les premiers jours, mais pas de gonflement important, d’écoulement, d’ouverture ou de mauvaise odeur. Notez vos observations dans Wouf.', crit: 'Vous inspectez la plaie matin et soir.' },
    { t: 'Faire manger', min: 5, b: 'Un chat qui ne mange pas pendant plus de 24 heures après l’opération doit être signalé au vétérinaire. Proposez une nourriture appétente, légèrement tiédie. Suivez exactement les prescriptions d’antidouleurs.', crit: 'Il mange dans les 24 heures suivant son retour.' },
    { t: 'Occuper sans agiter', min: 5, b: 'Caresses douces, jeux calmes au sol (petite plume, balle lente), tapis de léchage. Pas de sauts ni de courses jusqu’au feu vert du vétérinaire.', crit: 'Il reste calme et occupé sans sauter.' }
  ],
  plan: [['Avant l’opération', 'Préparer la pièce et la litière à bords bas.'], ['Jours 1 à 3', 'Repos strict, surveillance de la plaie, appétit.'], ['Jours 4 à 10', 'Jeux calmes, collerette jusqu’au contrôle.'], ['Après le contrôle', 'Reprise progressive des sauts et des jeux.']],
  next: ['Suivre « Donner un comprimé ou un sirop à son chat ».', 'Suivre « Caisse de transport et vétérinaire sans stress ».', 'Suivre « Soins et manipulations ».'],
  mistakes: ['Retirer la collerette trop tôt.', 'Laisser le chat sauter sur les meubles.', 'Ignorer un chat qui ne mange plus.', 'Donner un antidouleur humain.'],
  faq: [['Il recule et se cogne avec la collerette.', 'C’est fréquent au début ; il s’habitue en 1 à 2 jours. Dégagez les passages.'], ['Il n’utilise pas la litière.', 'Vérifiez que les bords sont assez bas et que la collerette ne le gêne pas pour entrer.']],
  test: 'Il garde sa collerette, mange, boit, utilise sa litière et sa plaie cicatrise normalement jusqu’au contrôle.', safety: 'Consultez rapidement si la plaie s’ouvre, suinte, gonfle ou sent mauvais, si le chat ne mange plus depuis 24 heures, vomit, ou n’urine pas. Ne donnez jamais de paracétamol ou d’ibuprofène à un chat.' }

);

PROGRAMS.push(
  { id: 'chat-complice4', sp: 'cat', icon: '🤝', title: 'Programme complicité chat : 4 semaines', sub: 'Comprendre son chat, le caresser et jouer ensemble', weeks: [
    ['Semaine 1', 'Comprendre son chat', ['c-langage', 'c-caresses']],
    ['Semaine 2', 'Venir quand on l’appelle', ['c-cible', 'c-rappel']],
    ['Semaine 3', 'Tours et jeux', ['c-tours', 'c-jeu']],
    ['Semaine 4', 'Une maison sûre', ['c-fenetres', 'c-plans']]
  ] },
  { id: 'chat-soins4', sp: 'cat', icon: '🧴', title: 'Programme soins chat sans stress : 4 semaines', sub: 'Brossage, griffes, médicaments et vétérinaire', weeks: [
    ['Semaine 1', 'Manipulations', ['c-soins', 'c-brossage']],
    ['Semaine 2', 'Griffes', ['c-griffes', 'c-griffoir']],
    ['Semaine 3', 'Médicaments', ['c-comprimes', 'c-dents']],
    ['Semaine 4', 'Transport et vétérinaire', ['c-transport', 'c-voyage']]
  ] }
);
