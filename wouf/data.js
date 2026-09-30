/* Wouf — données de référence (indicatives : elles ne remplacent jamais l'avis d'un vétérinaire). */

/* ---------- Types d'événements du carnet ---------- */
const VACCINES = [
  ['CHPPiL (Carré, Hépatite, Parvo, Parainfluenza, Lepto)', 365],
  ['Rage', 365],
  ['Toux du chenil (Bordetella)', 365],
  ['Piroplasmose (babésiose)', 365],
  ['Leishmaniose', 365],
  ['Maladie de Lyme (borréliose)', 365]
];
const TYPES = {
  vaccine:  { icon: '💉', label: 'Vaccin',           presets: VACCINES },
  worm:     { icon: '🪱', label: 'Vermifuge',        presets: [['Vermifuge (comprimé)', 90], ['Vermifuge chiot (mensuel)', 30]] },
  parasite: { icon: '🦟', label: 'Antipuces / tiques', presets: [['Pipette antiparasitaire (1 mois)', 30], ['Comprimé antiparasitaire mensuel', 30], ['Comprimé antiparasitaire trimestriel', 90], ['Collier antiparasitaire (≈ 8 mois)', 240]] },
  visit:    { icon: '🩺', label: 'Consultation',     presets: [['Consultation', null], ['Bilan de santé annuel', 365], ['Visite de contrôle', null]] },
  dental:   { icon: '🦷', label: 'Dents',            presets: [['Détartrage', 365], ['Contrôle dentaire', 180]] },
  surgery:  { icon: '🏥', label: 'Chirurgie',        presets: [['Stérilisation / castration', null], ['Chirurgie', null]] },
  other:    { icon: '📝', label: 'Autre',            presets: [['Analyse de sang', null], ['Radiographie / échographie', null], ['Traitement', null]] }
};
const ROUTINE_TYPES = ['vaccine', 'worm', 'parasite'];

/* ---------- Races : taille, poids adulte (kg), espérance de vie (ans), facteur de risque santé, prédispositions ---------- */
const BREEDS = [
  ['Croisé (petit format)', 'S', [4, 10], [12, 16], 1.0, ['Problèmes dentaires', 'Luxation de la rotule']],
  ['Croisé (format moyen)', 'M', [10, 22], [11, 15], 1.0, ['Obésité', 'Otites', 'Problèmes articulaires']],
  ['Croisé (grand format)', 'L', [22, 40], [10, 13], 1.05, ['Dysplasie de la hanche', 'Arthrose', 'Torsion d’estomac']],
  ['Labrador Retriever', 'L', [25, 36], [10, 13], 1.15, ['Dysplasie hanche / coude', 'Obésité', 'Otites', 'Tumeurs cutanées']],
  ['Golden Retriever', 'L', [25, 34], [10, 12], 1.3, ['Cancers (hémangiosarcome, lymphome)', 'Dysplasie hanche / coude', 'Allergies cutanées', 'Otites']],
  ['Berger Allemand', 'L', [22, 40], [9, 13], 1.3, ['Dysplasie hanche / coude', 'Torsion d’estomac', 'Myélopathie dégénérative', 'Insuffisance pancréatique']],
  ['Berger Australien', 'M', [16, 32], [12, 15], 1.05, ['Sensibilité aux médicaments (gène MDR1)', 'Épilepsie', 'Dysplasie', 'Troubles oculaires']],
  ['Border Collie', 'M', [14, 22], [12, 15], 1.0, ['Épilepsie', 'Dysplasie de la hanche', 'Atrophie rétinienne', 'Gène MDR1']],
  ['Berger Belge Malinois', 'L', [20, 30], [12, 14], 1.0, ['Dysplasie', 'Épilepsie', 'Problèmes articulaires']],
  ['Berger Blanc Suisse', 'L', [25, 40], [11, 14], 1.1, ['Dysplasie', 'Gène MDR1', 'Allergies cutanées']],
  ['Berger des Pyrénées', 'S', [7, 15], [14, 17], 1.0, ['Luxation de la rotule', 'Problèmes oculaires']],
  ['Husky Sibérien', 'L', [16, 27], [12, 14], 1.0, ['Cataracte / troubles oculaires', 'Dysplasie', 'Dermatose sensible au zinc']],
  ['Bouledogue Français', 'S', [8, 14], [10, 12], 1.6, ['Syndrome brachycéphale (respiration)', 'Hernies discales', 'Allergies cutanées', 'Coup de chaleur', 'Naissance par césarienne']],
  ['Bulldog Anglais', 'M', [18, 25], [8, 10], 1.7, ['Syndrome brachycéphale', 'Dermatites des plis', 'Dysplasie', 'Coup de chaleur']],
  ['Carlin', 'S', [6, 8], [11, 14], 1.4, ['Syndrome brachycéphale', 'Ulcères de cornée', 'Obésité', 'Dermatites des plis']],
  ['Cavalier King Charles', 'S', [5.5, 9], [9, 14], 1.6, ['Maladie valvulaire mitrale (cœur)', 'Syringomyélie', 'Yeux secs']],
  ['Chihuahua', 'S', [1.5, 3], [14, 16], 1.0, ['Luxation de la rotule', 'Problèmes dentaires', 'Hypoglycémie (chiots)']],
  ['Yorkshire Terrier', 'S', [2, 3.5], [13, 16], 1.0, ['Luxation de la rotule', 'Collapsus trachéal', 'Shunt porto-systémique', 'Problèmes dentaires']],
  ['Spitz nain (Poméranien)', 'S', [1.8, 3.5], [12, 16], 1.0, ['Collapsus trachéal', 'Luxation de la rotule', 'Alopécie X']],
  ['Caniche toy', 'S', [2, 4], [14, 18], 1.0, ['Luxation de la rotule', 'Problèmes dentaires', 'Atrophie rétinienne']],
  ['Caniche nain', 'S', [4, 7], [13, 17], 1.0, ['Luxation de la rotule', 'Problèmes oculaires', 'Maladie de Cushing']],
  ['Caniche moyen', 'M', [7, 12], [12, 15], 1.0, ['Problèmes oculaires', 'Otites', 'Allergies']],
  ['Caniche royal', 'L', [20, 30], [11, 14], 1.1, ['Torsion d’estomac', 'Dysplasie', 'Maladie d’Addison']],
  ['Teckel', 'S', [4, 9], [12, 16], 1.3, ['Hernie discale', 'Obésité', 'Problèmes dentaires']],
  ['Shih Tzu', 'S', [4, 7.5], [10, 16], 1.1, ['Problèmes oculaires', 'Dysplasie rénale', 'Dermatites']],
  ['Bichon Frisé', 'S', [5, 8], [12, 15], 1.0, ['Allergies cutanées', 'Luxation de la rotule', 'Calculs urinaires']],
  ['Maltais', 'S', [2, 4], [12, 15], 1.0, ['Problèmes dentaires', 'Collapsus trachéal', 'Shunt porto-systémique']],
  ['Jack Russell Terrier', 'S', [5, 8], [13, 16], 1.0, ['Luxation de la rotule', 'Luxation du cristallin', 'Ataxie']],
  ['West Highland White Terrier', 'S', [6, 10], [12, 15], 1.2, ['Dermatite atopique', 'Fibrose pulmonaire', 'Maladie de Legg-Perthes']],
  ['Cocker Spaniel Anglais', 'M', [12, 15], [12, 15], 1.2, ['Otites chroniques', 'Problèmes oculaires', 'Allergies']],
  ['Springer Spaniel Anglais', 'M', [16, 25], [12, 14], 1.1, ['Otites', 'Dysplasie', 'Atrophie rétinienne']],
  ['Épagneul Breton', 'M', [13, 18], [12, 14], 1.0, ['Dysplasie', 'Otites', 'Épilepsie']],
  ['Beagle', 'M', [9, 14], [12, 15], 1.0, ['Obésité', 'Épilepsie', 'Hernie discale', 'Otites', 'Glaucome']],
  ['Basset Hound', 'M', [20, 35], [10, 12], 1.3, ['Otites', 'Problèmes dorsaux', 'Torsion d’estomac', 'Obésité']],
  ['Boxer', 'L', [25, 32], [9, 12], 1.4, ['Cancers', 'Cardiomyopathie', 'Dysplasie', 'Coup de chaleur']],
  ['Dogue Allemand', 'XL', [45, 80], [7, 10], 1.5, ['Torsion d’estomac', 'Cardiomyopathie dilatée', 'Ostéosarcome', 'Dysplasie']],
  ['Rottweiler', 'L', [35, 60], [8, 10], 1.4, ['Dysplasie', 'Ostéosarcome', 'Rupture du ligament croisé', 'Torsion d’estomac']],
  ['Dobermann', 'L', [30, 40], [10, 12], 1.3, ['Cardiomyopathie dilatée', 'Syndrome de Wobbler', 'Maladie de Willebrand']],
  ['Cane Corso', 'XL', [40, 50], [9, 12], 1.35, ['Dysplasie', 'Torsion d’estomac', 'Entropion']],
  ['Bouvier Bernois', 'XL', [35, 55], [7, 9], 1.6, ['Cancers (sarcome histiocytaire)', 'Dysplasie', 'Torsion d’estomac']],
  ['Saint-Bernard', 'XL', [55, 80], [8, 10], 1.5, ['Dysplasie', 'Torsion d’estomac', 'Cardiomyopathie', 'Entropion / ectropion']],
  ['Terre-Neuve', 'XL', [45, 70], [9, 10], 1.4, ['Dysplasie', 'Sténose aortique', 'Cystinurie']],
  ['Chien de montagne des Pyrénées', 'XL', [40, 60], [10, 12], 1.3, ['Dysplasie', 'Torsion d’estomac', 'Luxation de la rotule']],
  ['Dalmatien', 'L', [23, 32], [11, 13], 1.1, ['Surdité', 'Calculs urinaires (urates)', 'Allergies cutanées']],
  ['Staffordshire Bull Terrier', 'M', [11, 17], [12, 14], 1.1, ['Allergies cutanées', 'Cataracte héréditaire', 'Dysplasie']],
  ['American Staffordshire Terrier', 'M', [18, 32], [12, 14], 1.1, ['Dysplasie', 'Allergies cutanées', 'Hypothyroïdie']],
  ['Bull Terrier', 'M', [20, 32], [11, 14], 1.2, ['Surdité (blancs)', 'Maladie rénale', 'Allergies cutanées']],
  ['Akita Inu', 'L', [30, 45], [10, 13], 1.2, ['Dysplasie', 'Maladies auto-immunes', 'Torsion d’estomac']],
  ['Shiba Inu', 'M', [7, 11], [12, 15], 1.0, ['Allergies cutanées', 'Glaucome', 'Luxation de la rotule']],
  ['Chow-chow', 'M', [20, 32], [9, 13], 1.3, ['Entropion', 'Dysplasie', 'Coup de chaleur']],
  ['Shar-Pei', 'M', [18, 25], [9, 11], 1.4, ['Entropion', 'Dermatites des plis', 'Fièvre du Shar-Pei']],
  ['Whippet', 'M', [9, 18], [12, 15], 1.0, ['Problèmes cardiaques', 'Sensibilité aux anesthésiques', 'Blessures musculaires']],
  ['Lévrier (Greyhound)', 'L', [25, 35], [10, 13], 1.05, ['Ostéosarcome', 'Torsion d’estomac', 'Sensibilité aux anesthésiques']],
  ['Setter Irlandais', 'L', [24, 32], [11, 14], 1.1, ['Torsion d’estomac', 'Atrophie rétinienne', 'Dysplasie']],
  ['Cavapoo / Labradoodle (croisé)', 'M', [7, 30], [12, 15], 1.0, ['Otites', 'Allergies cutanées', 'Problèmes oculaires']]
].map(([name, size, w, life, risk, pred]) => ({ name, size, w, life, risk, pred }));
const SIZE_LABEL = { S: 'Petit', M: 'Moyen', L: 'Grand', XL: 'Géant', CAT: 'Chat' };
const SENIOR_AGE = { S: 8, M: 7, L: 6, XL: 5, CAT: 10 };
const breedOf = name => BREEDS.concat(typeof CAT_BREEDS !== 'undefined' ? CAT_BREEDS : []).find(b => b.name.toLowerCase() === String(name || '').toLowerCase());

/* ---------- Aliments et produits toxiques ---------- */
const TOXICS = [
  ['Chocolat', 'danger', 'La théobromine provoque vomissements, tremblements, troubles du rythme cardiaque, convulsions. Le chocolat noir et le cacao sont les plus dangereux.'],
  ['Raisins frais et secs', 'danger', 'Insuffisance rénale aiguë, même à petite dose, avec une sensibilité très variable selon les chiens.'],
  ['Xylitol (chewing-gum, bonbons et biscuits « sans sucre »)', 'danger', 'Chute brutale du sucre sanguin et atteinte du foie, très rapides. Urgence absolue.'],
  ['Oignon, ail, poireau, ciboulette', 'danger', 'Détruisent les globules rouges (anémie). Cru, cuit ou en poudre.'],
  ['Antigel (éthylène glycol)', 'danger', 'Goût sucré, insuffisance rénale mortelle. Urgence immédiate, même pour une lapée.'],
  ['Mort-aux-rats / raticides', 'danger', 'Hémorragies internes, souvent différées de plusieurs jours. Consulter tout de suite, même sans symptôme.'],
  ['Médicaments humains (paracétamol, ibuprofène…)', 'danger', 'Atteintes du foie, des reins et de l’estomac. Ne jamais donner sans ordonnance vétérinaire.'],
  ['Granulés anti-limaces (métaldéhyde)', 'danger', 'Tremblements, convulsions, hyperthermie en moins d’une heure.'],
  ['Noix de macadamia', 'danger', 'Faiblesse, tremblements, vomissements, hyperthermie.'],
  ['Pâte à pain crue', 'danger', 'Gonfle dans l’estomac (risque de torsion) et fermente en produisant de l’alcool.'],
  ['Alcool', 'danger', 'Très toxique, y compris dans certains desserts (tiramisu, gâteaux imbibés).'],
  ['Café, thé, boissons énergisantes', 'attention', 'La caféine provoque agitation, tachycardie, tremblements.'],
  ['Os cuits, os de volaille', 'attention', 'Les éclats perforent ou obstruent l’intestin.'],
  ['Noyaux et pépins (pêche, abricot, cerise, pomme)', 'attention', 'Risque d’occlusion, et traces de cyanure dans certaines graines.'],
  ['Avocat', 'attention', 'La persine (surtout dans le noyau et la peau) irrite le tube digestif ; le noyau peut obstruer.'],
  ['Sel en excès, eau de mer', 'attention', 'Intoxication au sel : soif intense, vomissements, convulsions. Prévoir de l’eau douce à la plage.'],
  ['Aliments très gras, restes de barbecue', 'attention', 'Risque de pancréatite aiguë (vomissements, douleur abdominale).'],
  ['Champignons sauvages', 'danger', 'Certains sont mortels. Ne pas attendre les symptômes, garder un échantillon.'],
  ['Muguet, laurier-rose, if, digitale', 'danger', 'Plantes toxiques pour le cœur, même en petite quantité.'],
  ['Azalée, rhododendron', 'danger', 'Vomissements, faiblesse, troubles cardiaques.'],
  ['Bulbes (tulipe, narcisse, jonquille)', 'attention', 'Irritation digestive importante ; les bulbes sont les plus toxiques.'],
  ['Sagoutier (cycas)', 'danger', 'Toxique pour le foie ; très dangereux, y compris les graines.'],
  ['Crapaud (Bufo)', 'danger', 'Salivation, gencives très rouges, troubles du rythme cardiaque. Rincer la gueule et consulter.'],
  ['Chenilles processionnaires', 'danger', 'Contact avec la langue : gonflement, nécrose. Rincer à l’eau tiède et consulter sans attendre.'],
  ['Engrais, produits ménagers, eau de Javel', 'attention', 'Brûlures digestives. Ne pas faire vomir, appeler un vétérinaire.']
].map(([name, level, why]) => ({ name, level, why }));

/* ---------- Premiers secours ---------- */
const FIRST_AID = [
  ['🌡️', 'Coup de chaleur', ['Signes : halètement intense, langue rouge foncé, salive épaisse, titubation, vomissements, effondrement.', 'Mettre le chien à l’ombre, au frais, sans attendre.', 'Le mouiller à l’eau tiède ou fraîche (jamais glacée), surtout ventre, pattes, tête ; ventiler.', 'Proposer de l’eau par petites quantités, sans forcer.', 'Appeler ou aller chez le vétérinaire en urgence, même si le chien semble récupérer : les organes peuvent être touchés.']],
  ['🫁', 'Étouffement', ['Ouvrir la gueule et regarder ; retirer un corps étranger seulement s’il est bien visible et accessible.', 'Petit chien : le tenir tête en bas et donner quelques tapes fermes entre les omoplates.', 'Grand chien : soulever l’arrière-train, tête vers le bas, tapes entre les omoplates ; sinon compressions vers le haut juste derrière les côtes.', 'Filer chez le vétérinaire, même si le corps étranger est sorti.']],
  ['🩸', 'Saignement', ['Comprimer directement la plaie avec une compresse ou un linge propre, sans relâcher pendant 5 à 10 minutes.', 'Bander sans serrer excessivement, ajouter des couches si le sang traverse.', 'Pas de garrot sans avis vétérinaire.', 'Consulter : une plaie profonde ou un saignement abondant est une urgence.']],
  ['🐍', 'Morsure de vipère', ['Signes : gonflement douloureux et rapide, deux petits points, abattement.', 'Garder le chien calme ; le porter si possible.', 'Ni garrot, ni incision, ni succion, ni glace, ni cortisone donnée maison.', 'Direction le vétérinaire immédiatement.']],
  ['☠️', 'Ingestion toxique', ['Noter le produit, la quantité et l’heure ; garder l’emballage.', 'Ne pas faire vomir sans avis d’un professionnel (dangereux selon le produit).', 'Appeler immédiatement un vétérinaire ou un centre antipoison vétérinaire.']],
  ['🐝', 'Piqûre de guêpe ou d’abeille', ['Retirer le dard en le grattant (sans le pincer), appliquer du froid.', 'Gonflement de la gueule ou de la gorge, difficulté à respirer, malaise = urgence vétérinaire immédiate (choc allergique).']],
  ['🎈', 'Ventre gonflé, dur (torsion d’estomac)', ['Signes : ventre tendu, tentatives de vomissements sans rien rendre, salivation, agitation, gencives pâles ; grands chiens à thorax profond surtout.', 'Urgence absolue, chaque heure compte : ne rien donner, partir immédiatement chez le vétérinaire en prévenant par téléphone.']],
  ['⚡', 'Convulsions', ['Éloigner les objets dangereux, baisser la lumière et le bruit.', 'Ne jamais mettre la main dans la gueule.', 'Noter la durée. Plus de 5 minutes, crises répétées ou première crise : urgence vétérinaire.']],
  ['🚗', 'Accident, choc, chute', ['Sécuriser la zone. Un chien qui a mal peut mordre : muselière de fortune ou couverture.', 'Le transporter à plat sur une surface rigide (planche, couverture tendue) en évitant de plier le dos.', 'Prévenir la clinique pendant le trajet.']],
  ['🔥', 'Brûlure', ['Rincer abondamment à l’eau tiède ou fraîche pendant 10 minutes.', 'Ne rien appliquer (pas de beurre, pas de pommade).', 'Consulter : les brûlures sont souvent plus profondes qu’elles n’en ont l’air.']],
  ['🐛', 'Chenilles processionnaires', ['Ne pas toucher à mains nues ; porter des gants.', 'Rincer abondamment la gueule à l’eau tiède, tête vers le bas, sans frotter.', 'Urgence vétérinaire : la langue peut nécroser.']]
];
const URGENT_SIGNS = ['Difficulté à respirer, gencives pâles, bleues ou très rouges', 'Ventre gonflé et dur, tentatives de vomir sans succès', 'Vomissements ou diarrhées répétés, surtout avec du sang', 'Convulsions, perte de connaissance, faiblesse soudaine', 'Impossible d’uriner, ou de faire ses besoins depuis plus de 24 h', 'Ingestion d’un toxique ou d’un corps étranger', 'Traumatisme, chute, accident, plaie profonde ou saignement', 'Œil fermé ou douloureux, douleur intense, cris', 'Chienne gestante en difficulté, chiot qui ne tète plus'];
const POISON_LINES = [
  ['CAPAE Ouest (Nantes)', '0240687740'],
  ['CNITV (Lyon)', '0478871040']
];

/* ---------- Astuces ---------- */
const TIPS = [
  'Pesez votre chien tous les mois : une prise de poids se corrige plus facilement au début.',
  'Le brossage des dents plusieurs fois par semaine retarde le tartre et les soucis dentaires.',
  'Par forte chaleur, ne laissez jamais votre chien dans la voiture, même quelques minutes, même fenêtres ouvertes.',
  'Contrôlez les oreilles, les coussinets et la peau après chaque balade en zone herbeuse (tiques, épillets).',
  'Une eau fraîche et propre doit toujours être disponible, en particulier l’été.',
  'Les chiens de grande taille : ne pas faire d’effort intense juste après le repas (risque de torsion d’estomac).',
  'Le sucre, le sel, le chocolat et les restes de table déséquilibrent votre chien : privilégiez de petites récompenses adaptées.',
  'Faites vérifier la puce électronique chez le vétérinaire de temps en temps et mettez à jour vos coordonnées auprès de l’I-CAD.',
  'Un chien senior gagne à faire un bilan sanguin chaque année : détecter tôt, c’est soigner mieux.',
  'Après un traitement antiparasitaire en pipette, évitez le bain pendant 48 h.',
  'Vous voyagez ? Vérifiez à l’avance les exigences de vaccination antirabique et le passeport européen.',
  'Le jeu et la stimulation mentale fatiguent autant qu’une longue marche : cachez des friandises, proposez des tapis de fouille.',
  'Notez tout changement d’appétit, de soif ou de comportement : ils précèdent souvent un problème de santé.',
  'Un chien ne transpire presque pas : il se refroidit surtout en haletant. Par forte chaleur, il surchauffe vite.',
  'Le museau d’un chien est unique, comme une empreinte digitale.',
  'Un chien peut percevoir des sons bien plus aigus que nous : les sifflets à ultrasons l’atteignent, pas vous.',
  'Le bâillement chez le chien est souvent un signal d’apaisement, pas seulement de la fatigue.',
  'Une queue qui remue ne veut pas toujours dire « content » : regardez aussi les oreilles, le corps et le regard.',
  'Les séances d’éducation courtes (2 à 5 minutes) sont plus efficaces qu’une longue séance par semaine.',
  'Récompensez dans la seconde qui suit le bon comportement : c’est ce délai qui permet au chien de comprendre.',
  'Le flair est le sens principal du chien : une balade « reniflage » le fatigue et l’apaise beaucoup.',
  'L’ail et l’oignon, crus ou cuits, sont toxiques pour le chien, même en poudre dans une sauce.',
  'Le xylitol (chewing-gums, bonbons « sans sucre ») est très dangereux pour le chien, même en petite quantité.',
  'Les os cuits peuvent éclater et blesser la bouche ou l’intestin : ne les donnez pas.',
  'Les tiques sont plus actives au printemps et à l’automne : inspectez votre chien après chaque sortie en nature.',
  'Les épillets peuvent se loger dans les oreilles, le nez ou entre les doigts : ils nécessitent souvent le vétérinaire.',
  'Le bitume peut être bien plus chaud que l’air : testez-le 5 secondes avec le dos de la main.',
  'Les chiens à museau court (bouledogues, carlins…) supportent mal la chaleur et l’effort intense.',
  'Un chiot a besoin de beaucoup de sommeil : jusqu’à 18 heures par jour selon l’âge.',
  'La période de socialisation du chiot est courte : les expériences positives des premiers mois comptent énormément.',
  'Couper les griffes trop court fait saigner : en cas de doute, ne coupez que la pointe ou demandez au vétérinaire.',
  'Un chien qui se lèche sans arrêt les pattes peut avoir une allergie ou une gêne : parlez-en au vétérinaire.',
  'Un chien qui boit beaucoup plus que d’habitude doit être vu par un vétérinaire.',
  'Le chocolat noir et le cacao sont les plus dangereux pour le chien : plus il est noir, plus il est toxique.',
  'La noix de macadamia peut provoquer faiblesse et tremblements chez le chien.',
  'L’identification par puce est obligatoire pour les chiens en France : gardez vos coordonnées à jour.',
  'Changez l’alimentation progressivement, sur environ une semaine, pour éviter les troubles digestifs.',
  'Mâcher calme le chien : un jouet à mâcher adapté aide à gérer le stress et l’ennui.',
  'L’obésité réduit l’espérance de vie : vous devez sentir les côtes sous une fine couche de graisse.',
  'Un harnais bien ajusté ne gêne ni les épaules ni la respiration : glissez deux doigts sous les sangles.',
  'Les feux d’artifice et les orages effraient beaucoup de chiens : préparez-lui un coin calme et fermé.',
  'Un chien senior apprécie des balades plus courtes mais plus fréquentes.',
  'Laver trop souvent un chien peut assécher sa peau : utilisez un shampoing adapté aux chiens.',
  'En hiver, rincez les coussinets après la balade : le sel de déneigement les irrite.',
  'Certaines plantes de jardin sont toxiques pour le chien, comme le laurier-rose ou l’if.',
  'Jouer à « cherche » avec des friandises cachées stimule son cerveau autant qu’une balade.',
  'Un chien laissé seul trop longtemps peut aboyer ou détruire par ennui ou par anxiété, pas par vengeance.',
  'Les vers intestinaux ne se voient pas toujours : suivez le rythme de vermifugation conseillé par votre vétérinaire.',
  'Pour voyager en Europe avec votre chien, il faut en général un passeport européen et le vaccin contre la rage à jour.',
  'Une carte de premiers secours et le numéro du vétérinaire de garde dans votre téléphone font gagner un temps précieux.'
];
