/* Wouf — espèces : chien 🐶 et chat 🐱 (gratuit : 1 chien + 1 chat ; Plus : autant d'animaux qu'on veut).
   Tout ce qui diffère selon l'espèce est ici : vocabulaire, races, vaccins, toxiques, premiers secours, besoins caloriques.
   Contenu indicatif : il ne remplace jamais l'avis d'un vétérinaire. */

const SPECIES = {
  dog: { id: 'dog', noun: 'chien', plural: 'chiens', emoji: '🐶', young: 'Chiot', youngLow: 'chiot', planTitle: 'Plan chiot', pron: 'il', ofYour: 'de votre chien' },
  cat: { id: 'cat', noun: 'chat', plural: 'chats', emoji: '🐱', young: 'Chaton', youngLow: 'chaton', planTitle: 'Plan chaton', pron: 'il', ofYour: 'de votre chat' }
};
const spOf = d => SPECIES[(d && d.species) || 'dog'] || SPECIES.dog;

/* ---------- Races de chats ---------- */
const CAT_BREEDS = [
  ['Européen (chat de gouttière)', [3.5, 6], [13, 18], 1.0, ['Obésité', 'Diabète', 'Maladie rénale chronique', 'Problèmes dentaires']],
  ['Croisé', [3, 7], [12, 18], 1.0, ['Obésité', 'Maladie rénale chronique', 'Problèmes dentaires']],
  ['Maine Coon', [5, 11], [10, 14], 1.35, ['Cardiomyopathie hypertrophique (cœur)', 'Dysplasie de la hanche', 'Amyotrophie spinale']],
  ['Ragdoll', [4.5, 9], [12, 15], 1.25, ['Cardiomyopathie hypertrophique', 'Maladie rénale', 'Calculs urinaires']],
  ['Persan', [3.5, 7], [12, 16], 1.5, ['Polykystose rénale', 'Problèmes respiratoires et oculaires (face plate)', 'Problèmes dentaires', 'Dermatites des plis']],
  ['Exotic Shorthair', [3.5, 7], [12, 15], 1.45, ['Polykystose rénale', 'Problèmes respiratoires et oculaires', 'Larmoiement chronique']],
  ['British Shorthair', [4, 8], [12, 17], 1.2, ['Cardiomyopathie hypertrophique', 'Obésité', 'Maladies gingivales']],
  ['Scottish Fold', [3, 6], [11, 15], 1.5, ['Ostéochondrodysplasie (douleurs articulaires)', 'Cardiomyopathie', 'Polykystose rénale']],
  ['Sacré de Birmanie', [3.5, 6.5], [12, 16], 1.1, ['Cardiomyopathie', 'Problèmes oculaires', 'Diabète']],
  ['Norvégien', [4, 9], [12, 16], 1.1, ['Cardiomyopathie hypertrophique', 'Glycogénose de type IV', 'Dysplasie de la hanche']],
  ['Siamois', [3, 5.5], [12, 17], 1.15, ['Asthme félin', 'Amyloïdose', 'Problèmes dentaires', 'Strabisme']],
  ['Bengal', [4, 7], [12, 16], 1.2, ['Cardiomyopathie hypertrophique', 'Atrophie rétinienne progressive', 'Déficit en pyruvate kinase']],
  ['Abyssin', [3, 5], [12, 16], 1.2, ['Atrophie rétinienne progressive', 'Amyloïdose rénale', 'Déficit en pyruvate kinase']],
  ['Sphynx', [3, 5], [10, 15], 1.4, ['Cardiomyopathie hypertrophique', 'Dermatites, peau grasse', 'Problèmes dentaires']],
  ['Devon Rex', [2.5, 4.5], [12, 16], 1.15, ['Cardiomyopathie', 'Myopathie héréditaire', 'Luxation de la rotule']],
  ['Chartreux', [4, 7], [12, 16], 1.0, ['Luxation de la rotule', 'Calculs urinaires']],
  ['Bleu Russe', [3, 5.5], [15, 20], 1.0, ['Obésité', 'Calculs urinaires']],
  ['Angora Turc', [2.5, 5], [12, 18], 1.0, ['Surdité (blancs aux yeux bleus)', 'Cardiomyopathie']],
  ['Birman', [3, 6], [12, 16], 1.05, ['Cardiomyopathie', 'Problèmes rénaux', 'Cataracte']],
  ['Burmese', [3.5, 6], [12, 16], 1.15, ['Diabète', 'Hypokaliémie', 'Problèmes dentaires']]
].map(([name, w, life, risk, pred]) => ({ name, sp: 'cat', size: 'CAT', w, life, risk, pred }));

/* ---------- Soins présélectionnés par espèce (remplacent ceux du chien) ---------- */
const CAT_PRESETS = {
  vaccine: [['Typhus + Coryza (TC)', 365], ['Typhus + Coryza + Leucose (TCL)', 365], ['Leucose (FeLV)', 365], ['Rage', 365], ['Chlamydiose', 365]],
  worm: [['Vermifuge (comprimé ou pâte)', 90], ['Vermifuge chaton (mensuel)', 30]],
  parasite: [['Pipette antiparasitaire chat (1 mois)', 30], ['Comprimé antiparasitaire chat (1 à 3 mois)', 30], ['Collier antiparasitaire chat (≈ 8 mois)', 240]]
};
function presetsFor(type, d) {
  if (spOf(d).id === 'cat' && CAT_PRESETS[type]) return CAT_PRESETS[type];
  return TYPES[type].presets || [];
}
const breedsFor = sp => (sp === 'cat' ? CAT_BREEDS : BREEDS);

/* ---------- Toxiques du chat ---------- */
const TOXICS_CAT = [
  ['Lys (toutes les parties, pollen, eau du vase)', 'danger', 'Extrêmement toxique : insuffisance rénale aiguë, même après avoir léché du pollen tombé sur le pelage. Urgence immédiate.'],
  ['Pipette antiparasitaire pour chien (perméthrine)', 'danger', 'Très dangereux pour le chat : tremblements, convulsions. Utilisez uniquement des produits pour chats ; évitez les contacts avec un chien traité.'],
  ['Paracétamol, ibuprofène, aspirine', 'danger', 'Le chat ne sait pas les éliminer : destruction des globules rouges, atteinte du foie. Jamais de médicament humain sans avis vétérinaire.'],
  ['Huiles essentielles (arbre à thé, menthe, agrumes…)', 'danger', 'Toxiques par ingestion, par contact avec la peau ou en diffusion prolongée dans une pièce fermée.'],
  ['Oignon, ail, poireau, échalote', 'danger', 'Détruisent les globules rouges (anémie), crus ou cuits.'],
  ['Antigel (éthylène glycol)', 'danger', 'Goût sucré, insuffisance rénale mortelle en quelques heures.'],
  ['Mort-aux-rats / raticides', 'danger', 'Hémorragies internes, parfois différées. Consulter même sans symptôme.'],
  ['Fils, ficelles, rubans, aiguilles', 'danger', 'Corps étranger linéaire : occlusion et perforation de l’intestin. Ne jamais tirer sur un fil qui sort de la bouche ou de l’anus.'],
  ['Chocolat, cacao', 'danger', 'Théobromine : vomissements, tremblements, troubles du rythme cardiaque.'],
  ['Xylitol (sucre des produits « sans sucre »)', 'danger', 'À éviter absolument : risque d’hypoglycémie et d’atteinte du foie.'],
  ['Raisins et raisins secs', 'attention', 'Toxicité rénale prouvée chez le chien, non exclue chez le chat : à éviter.'],
  ['Alcool, café, thé', 'danger', 'Très toxiques même en petite quantité.'],
  ['Laurier-rose, muguet, if, digitale, azalée, rhododendron', 'danger', 'Plantes toxiques pour le cœur et le tube digestif.'],
  ['Dieffenbachia, philodendron, monstera, pothos', 'attention', 'Cristaux d’oxalate : salivation, gonflement de la bouche, difficulté à avaler.'],
  ['Aloe vera, poinsettia (étoile de Noël), gui, houx', 'attention', 'Vomissements, diarrhées, irritation ; le gui et le houx sont plus dangereux.'],
  ['Bulbes (tulipe, narcisse, jonquille)', 'attention', 'Irritation digestive importante, parfois plus grave.'],
  ['Lait de vache', 'attention', 'Beaucoup de chats digèrent mal le lactose : diarrhées. Ce n’est pas un besoin.'],
  ['Aliments pour chien (usage exclusif)', 'attention', 'Carencés en taurine pour un chat : problèmes cardiaques et oculaires à long terme.'],
  ['Os cuits, arêtes', 'attention', 'Éclats : risque de perforation ou d’occlusion.'],
  ['Détergents, eau de Javel, produits ménagers', 'attention', 'Brûlures de la bouche et de l’œsophage. Ne pas faire vomir, appeler un vétérinaire.']
].map(([name, level, why]) => ({ name, level, why }));

/* ---------- Premiers secours du chat ---------- */
const FIRST_AID_CAT = [
  ['🚻', 'Blocage urinaire (surtout chez le mâle)', ['Signes : il va et vient dans la litière, s’accroupit sans uriner, miaule, lèche son sexe, ventre douloureux, vomissements.', 'C’est une urgence vitale : sans intervention, l’issue peut être fatale en 24 à 48 heures.', 'Ne tentez rien à la maison. Appelez et partez immédiatement chez un vétérinaire, en prévenant par téléphone.']],
  ['🌷', 'Ingestion de lys ou de plante toxique', ['Même le pollen léché sur le pelage ou l’eau du vase peut suffire.', 'Ne faites pas vomir. Notez la plante et l’heure, gardez un échantillon.', 'Appelez immédiatement un vétérinaire ou un centre antipoison vétérinaire : plus le traitement est précoce, meilleur est le pronostic.']],
  ['😮‍💨', 'Difficulté à respirer', ['Signes : respiration bouche ouverte, rapide, avec le ventre qui pompe, museau étiré, gencives bleutées.', 'Pas de manipulation inutile : gardez-le calme, sans stress ni contention.', 'Transportez-le en caisse couverte d’un linge, fenêtre entrouverte, vers une clinique ouverte, en prévenant à l’avance.']],
  ['🏢', 'Chute (syndrome du chat parachute)', ['Un chat tombé d’un balcon peut paraître normal alors qu’il a des lésions internes ou de la mâchoire, du palais, du thorax.', 'Consultez systématiquement, même s’il semble aller bien.', 'Transportez-le en caisse, sans le porter à bras.']],
  ['🩸', 'Saignement', ['Comprimez la plaie avec une compresse propre pendant 5 à 10 minutes, sans relâcher.', 'Bandez sans trop serrer. Pas de garrot sans avis vétérinaire.', 'Consultez : une plaie profonde, ou une morsure, est vite infectée.']],
  ['🩹', 'Morsure ou abcès', ['Signes : boule chaude et douloureuse, fièvre, abattement, souvent après une bagarre.', 'Ne percez pas vous-même. Consultez sous 24 heures : antibiotiques et drainage sont nécessaires.']],
  ['🧵', 'Fil ou corps étranger avalé', ['Ne tirez jamais sur un fil qui sort de la bouche ou de l’anus : vous risquez de couper l’intestin.', 'Coupez éventuellement la partie qui dépasse à proximité, sans tirer, et allez en urgence chez le vétérinaire.']],
  ['☠️', 'Intoxication (pipette pour chien, plante, produit)', ['Signes : salivation, tremblements, vomissements, convulsions, pupilles dilatées.', 'Pipette pour chien : lavez délicatement au savon doux avec de l’eau tiède, séchez, puis consultez en urgence.', 'Appelez un vétérinaire ou un centre antipoison vétérinaire avec le nom du produit.']],
  ['⚡', 'Convulsions', ['Éloignez les objets dangereux, baissez lumière et bruit. Ne mettez jamais la main dans sa gueule.', 'Notez la durée. Plus de 3 à 5 minutes, crises répétées ou première crise : urgence vétérinaire.']],
  ['🌡️', 'Coup de chaleur', ['Signes : halètement (inhabituel chez le chat), bave, prostration, gencives rouge foncé.', 'Placez-le dans un endroit frais, mouillez délicatement les pattes et le ventre avec de l’eau tiède, ventilez.', 'Appelez un vétérinaire en urgence.']],
  ['🐾', 'Paralysie des pattes arrière, cris de douleur', ['Signes : cris soudains, pattes arrière froides, dures ou traînantes : possible caillot (thrombo-embolie).', 'Urgence absolue : ne le manipulez pas plus que nécessaire et partez tout de suite.']]
];
const URGENT_CAT = [
  'Respiration difficile, bouche ouverte, gencives pâles, bleutées ou jaunes',
  'Il essaie d’uriner sans y parvenir, s’agite dans la litière',
  'Ne mange plus rien depuis 24 h (chaton) ou 48 h (adulte), ou ne boit plus',
  'Vomissements répétés, diarrhée avec du sang, ventre gonflé et dur',
  'Chute, accident, morsure, plaie profonde ou saignement',
  'Ingestion d’un toxique (lys, médicament, fil, produit ménager)',
  'Convulsions, perte d’équilibre, paralysie ou cris soudains',
  'Œil fermé, très rouge ou douloureux ; pupilles anormales',
  'Chatte gestante en difficulté, chaton qui ne tète plus ou refroidi'
];
const TIPS_CAT = [
  'Un chat ne doit jamais rester plus de 24 heures sans manger : le foie peut être atteint rapidement.',
  'Surveillez la litière : changement de fréquence, de quantité ou de couleur = premier signe de problème rénal ou urinaire.',
  'Le lys est mortel pour les chats : ne gardez ni bouquet ni plante de la famille des lys à la maison.',
  'Beaucoup de chats boivent peu : une fontaine à eau et de l’alimentation humide aident à protéger les reins.',
  'Pesez votre chat régulièrement : une perte de poids même légère est un signal d’alerte chez un chat âgé.',
  'Un chat d’intérieur a besoin de jeu et de verticalité : arbre à chat, étagères, séances de chasse simulée de 10 minutes.',
  'Ne donnez jamais de pipette pour chien à un chat, même en diluant.',
  'Le brossage des dents avec un dentifrice pour chat retarde les maladies gingivales.',
  'Un chat qui cache sa douleur peut se cacher, moins se toiletter ou dormir plus : notez ces changements.',
  'Pensez à la stérilisation (santé et comportement) et à l’identification par puce, obligatoire pour les chats.',
  'Un seul bac à litière par chat, plus un : à des endroits calmes, loin de la gamelle.'
];

/* ---------- Nutrition du chat (RER = 70 × kg^0,75 ; coefficient selon la situation) ---------- */
const NUT_FACTORS_DOG = [['neutered', 'Adulte stérilisé', 1.6], ['intact', 'Adulte non stérilisé', 1.8], ['inactive', 'Sédentaire / tendance à grossir', 1.4], ['loss', 'Perte de poids (peser le poids cible)', 1.0], ['active', 'Très actif / sportif', 2.5], ['senior', 'Senior', 1.4], ['pup4', 'Chiot de moins de 4 mois', 3.0], ['pup12', 'Chiot de 4 à 12 mois', 2.0]];
const NUT_FACTORS_CAT = [['neutered', 'Adulte stérilisé', 1.2], ['intact', 'Adulte non stérilisé', 1.4], ['inactive', 'Sédentaire / tendance à grossir', 1.0], ['loss', 'Perte de poids (peser le poids cible)', 0.8], ['active', 'Très actif', 1.6], ['senior', 'Senior', 1.1], ['pup4', 'Chaton de moins de 4 mois', 3.0], ['pup12', 'Chaton de 4 à 12 mois', 2.0]];
const nutFactorsOf = d => (spOf(d).id === 'cat' ? NUT_FACTORS_CAT : NUT_FACTORS_DOG);
const toxicsOf = d => (spOf(d).id === 'cat' ? TOXICS_CAT : TOXICS);
const firstAidOf = d => (spOf(d).id === 'cat' ? FIRST_AID_CAT : FIRST_AID);
const urgentOf = d => (spOf(d).id === 'cat' ? URGENT_CAT : URGENT_SIGNS);
const tipsOf = d => (spOf(d).id === 'cat' ? TIPS_CAT : TIPS);

/* Âge « humain » approximatif */
function humanAgeOf(d) {
  if (!d.birth) return null;
  const a = ageYears(d.birth);
  if (spOf(d).id === 'cat') return a < 0.2 ? null : a < 1 ? Math.round(a * 15) : a < 2 ? Math.round(15 + (a - 1) * 9) : Math.round(24 + (a - 2) * 4);
  return humanAge(d.birth);
}
