/* Le Parvis — 30 publications TikTok (carrousels photo 4:5).
   Citations bibliques : Louis Segond 1910 (domaine public).
   Types de diapositives : cover, point, verse, cta. *mot* = mot en or dans les titres. */

const hashBase = '#chretien #pourtoi #foi #jesus #bible';

const cta = (titre, sous) => ({ kind: 'cta', titre, sous });
const ctaVerset = cta('Cette parole est pour toi ?', 'Reçois un verset chaque jour avec Le Parvis.');
const ctaEncour = cta('Quelqu’un a besoin de lire ça.', 'Partage-lui et abonne-toi pour d’autres encouragements.');
const ctaHistoire = cta('Quelle histoire veux-tu la prochaine fois ?', 'Dis-le en commentaire et abonne-toi.');
const ctaListe = cta('Tu t’es reconnu dans combien ?', 'Dis-le en commentaire, puis abonne-toi.');

const verset = (id, texte, ref, tiktok, meditation, extra = '') => ({
  id, format: 'Verset du jour', tiktok,
  legende: `Verset du jour 🙏\n\n« ${texte} »\n${ref}\n\n${meditation}\n\nÉcris « Amen » si cette parole te parle.\n\n${hashBase} #versetdujour ${extra}`.trim(),
  slides: [
    { kind: 'verse', label: 'Verset du jour', texte, ref },
    { kind: 'point', titre: 'Pour méditer', texte: meditation },
    ctaVerset
  ]
});

module.exports = [
  // ── Versets du jour (10) ─────────────────────────────────────────────
  verset('01-verset-josue', 'Fortifie-toi et prends courage ! Ne t’effraie point et ne t’épouvante point, car l’Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.', 'Josué 1:9',
    'Verset du jour : Josué 1:9',
    'Le courage, ce n’est pas ne pas avoir peur. C’est savoir Qui marche avec toi. Avance aujourd’hui : tu n’es pas seul(e).'),
  verset('02-verset-psaume46', 'Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse.', 'Psaume 46:2',
    'Verset du jour : Psaume 46:2',
    'Dans la tempête, Dieu n’est pas un plan B. C’est le premier endroit où courir. Dis-lui simplement : « Seigneur, j’ai besoin de toi. »'),
  verset('03-verset-esaie', 'Ne crains rien, car je suis avec toi ; ne promène pas des regards inquiets, car je suis ton Dieu.', 'Ésaïe 41:10',
    'Verset du jour : Ésaïe 41:10',
    'Les regards inquiets ne changent rien à la tempête. Regarde plutôt Celui qui est avec toi, et respire.'),
  verset('04-verset-jeremie', 'Car je connais les projets que j’ai formés sur vous, dit l’Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l’espérance.', 'Jérémie 29:11',
    'Verset du jour : Jérémie 29:11',
    'Même quand tu ne vois pas la suite, Dieu voit toute l’histoire. Ton avenir est entre de bonnes mains.'),
  verset('05-verset-proverbes', 'Confie-toi en l’Éternel de tout ton cœur, et ne t’appuie pas sur ta sagesse ; reconnais-le dans toutes tes voies, et il aplanira tes sentiers.', 'Proverbes 3:5-6',
    'Verset du jour : Proverbes 3:5-6',
    'Tu n’as pas besoin de tout comprendre pour avancer. Confie ta route à Dieu : c’est lui qui aplanit le chemin.'),
  verset('06-verset-matthieu11', 'Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.', 'Matthieu 11:28',
    'Verset du jour : Matthieu 11:28',
    'Jésus ne dit pas « reviens quand tu iras mieux ». Il dit « viens ». Dépose ce soir ce que tu portes.'),
  verset('07-verset-lamentations', 'Les bontés de l’Éternel ne sont pas épuisées, ses compassions ne sont pas à leur terme ; elles se renouvellent chaque matin.', 'Lamentations 3:22-23',
    'Verset du jour : Lamentations 3:22-23',
    'Hier est passé. Aujourd’hui, la bonté de Dieu est neuve, comme chaque matin. Recommence avec lui.'),
  verset('08-verset-psaume119', 'Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.', 'Psaume 119:105',
    'Verset du jour : Psaume 119:105',
    'Une lampe n’éclaire pas toute la route, juste le prochain pas. Fais ce pas, et Dieu éclairera le suivant.'),
  verset('09-verset-jean14', 'Je vous laisse la paix, je vous donne ma paix.', 'Jean 14:27',
    'Verset du jour : Jean 14:27',
    'La paix de Jésus ne dépend pas de tes circonstances. Elle reste, même quand tout bouge autour de toi.'),
  verset('10-verset-philippiens', 'Ne vous inquiétez de rien ; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces.', 'Philippiens 4:6',
    'Verset du jour : Philippiens 4:6',
    'Transforme chaque inquiétude en prière. Dis-le à Dieu, puis remercie-le d’avance : la paix suivra.'),

  // ── « Seuls les chrétiens comprennent » et listes (4) ────────────────
  {
    id: '11-seuls-chretiens-2', format: 'Liste', tiktok: '5 choses que seuls les chrétiens comprennent (partie 2)',
    legende: '5 choses que seuls les chrétiens comprennent (partie 2) 🙌\n\nTu t’es reconnu dans combien ? Dis-le en commentaire 👇\n\n' + hashBase + ' #chretiens #priere #eglise',
    slides: [
      { kind: 'cover', titre: '5 choses que seuls les *chrétiens* comprennent', sous: 'Partie 2. Swipe.' },
      { kind: 'point', n: 1, titre: 'Prier au restaurant', texte: 'Fermer les yeux trois secondes pour remercier Dieu, et sentir quelques regards.' },
      { kind: 'point', n: 2, titre: 'Une paix inexplicable', texte: 'Tout va mal autour de toi, et pourtant, quelque chose en toi tient bon.' },
      { kind: 'point', n: 3, titre: 'Pleurer pendant la louange', texte: 'Sans savoir pourquoi. Juste parce que Dieu est là.' },
      { kind: 'point', n: 4, titre: 'Pardonner quand même', texte: 'Tout en toi voudrait garder rancune, mais tu choisis de lâcher prise, par amour pour Christ.' },
      { kind: 'point', n: 5, titre: 'Ta valeur ne dépend de personne', texte: 'Tu sais qui tu es aux yeux de Dieu, et ça change tout.' },
      ctaListe
    ]
  },
  {
    id: '12-situations-chretien', format: 'Liste', tiktok: '5 situations que tout chrétien a déjà vécues',
    legende: '5 situations que tout chrétien a déjà vécues 😅🙏\n\nLaquelle t’est déjà arrivée ? Raconte en commentaire 👇\n\n' + hashBase + ' #chretiens #humour #eglise',
    slides: [
      { kind: 'cover', titre: '5 situations que *tout chrétien* a déjà vécues', sous: 'Tu t’es reconnu ? Swipe.' },
      { kind: 'point', n: 1, titre: 'Le verset qui répond pile', texte: 'Tu ouvres la Bible au hasard et tu tombes sur la parole dont tu avais besoin.' },
      { kind: 'point', n: 2, titre: '« Je prie pour toi »', texte: 'Tu le dis, et tu le fais vraiment, même cinq minutes après.' },
      { kind: 'point', n: 3, titre: 'Se sentir seul(e) dans sa foi', texte: 'À l’école, au travail, en famille : être le seul à croire, ce n’est pas facile. Mais Dieu est avec toi.' },
      { kind: 'point', n: 4, titre: 'Lire la Bible en entier', texte: 'Tu commences en janvier, plein de motivation… et tu t’arrêtes quelque part dans le Lévitique.' },
      { kind: 'point', n: 5, titre: 'La prière exaucée, des années après', texte: 'Un jour tu comprends : Dieu n’avait pas oublié.' },
      ctaListe
    ]
  },
  {
    id: '13-dieu-te-parle', format: 'Liste', tiktok: '5 façons dont Dieu peut te parler',
    legende: '5 façons dont Dieu peut te parler 🕊️\n\nÀ toujours confronter à la Bible. Comment Dieu t’a-t-il parlé ? Dis-le en commentaire 👇\n\n' + hashBase + ' #priere #paroledudieu',
    slides: [
      { kind: 'cover', titre: '5 façons dont *Dieu* peut te parler', sous: 'Swipe pour les découvrir.' },
      { kind: 'point', n: 1, titre: 'Par sa Parole', texte: 'La Bible reste la première voix. Tout le reste doit s’y confronter.', ref: '2 Timothée 3:16' },
      { kind: 'point', n: 2, titre: 'Par la prière', texte: 'Dans le calme, une pensée, une paix, une direction. Prends le temps d’écouter, pas seulement de demander.' },
      { kind: 'point', n: 3, titre: 'Par des frères et sœurs', texte: 'Un conseil sage, un encouragement au bon moment. Dieu utilise les autres croyants.' },
      { kind: 'point', n: 4, titre: 'Par les circonstances', texte: 'Des portes qui s’ouvrent, d’autres qui se ferment. Dieu guide aussi par là.' },
      { kind: 'point', n: 5, titre: 'Par la louange', texte: 'Quand tu adores, ton cœur s’ouvre et tu entends mieux.' },
      cta('Comment Dieu t’a-t-il déjà parlé ?', 'Raconte en commentaire et abonne-toi.')
    ]
  },
  {
    id: '14-habitudes-foi', format: 'Liste', tiktok: '5 habitudes simples pour grandir dans la foi',
    legende: '5 habitudes simples pour grandir dans la foi 🌱\n\nPas besoin de tout faire d’un coup : commence par une seule. Laquelle ? Dis-le en commentaire 👇\n\n' + hashBase + ' #croissancespirituelle #priere',
    slides: [
      { kind: 'cover', titre: '5 habitudes simples pour *grandir dans la foi*', sous: 'Choisis-en une dès aujourd’hui.' },
      { kind: 'point', n: 1, titre: 'Lire un passage chaque jour', texte: 'Quelques versets suffisent. L’important, c’est la régularité.' },
      { kind: 'point', n: 2, titre: 'Prier, même 5 minutes', texte: 'Parle à Dieu simplement, comme à un ami, et prends un moment pour l’écouter.' },
      { kind: 'point', n: 3, titre: 'Rejoindre une communauté', texte: 'On grandit mieux ensemble. Une église ou un petit groupe, c’est une force.' },
      { kind: 'point', n: 4, titre: 'Remercier chaque soir', texte: 'Trois choses pour lesquelles tu es reconnaissant(e). La gratitude change le regard.' },
      { kind: 'point', n: 5, titre: 'Servir quelqu’un', texte: 'Un message, un repas, un coup de main. La foi se vit aussi en actes.' },
      cta('Laquelle vas-tu commencer ?', 'Dis-le en commentaire et abonne-toi.')
    ]
  },

  // ── Encouragements (6) ───────────────────────────────────────────────
  {
    id: '15-encouragement-fatigue', format: 'Encouragement', tiktok: 'Si tu es fatigué(e), lis ça',
    legende: 'Si tu es fatigué(e), lis ça 🤍\n\nTu n’as pas à tout porter seul(e). Dépose ça aux pieds de Jésus.\n\nÉcris « Amen » si tu en avais besoin.\n\n' + hashBase + ' #encouragement #fatigue',
    slides: [
      { kind: 'cover', titre: 'Si tu es *fatigué(e)*, lis ça', sous: 'Ce message est pour toi.' },
      { kind: 'point', titre: 'Tu n’as pas à tout porter seul(e)', texte: 'Déchargez-vous sur lui de tous vos soucis, car lui-même prend soin de vous.', ref: '1 Pierre 5:7' },
      { kind: 'point', titre: 'Se reposer n’est pas abandonner', texte: 'Jésus lui-même se retirait dans des lieux déserts pour prier.', ref: 'Luc 5:16' },
      { kind: 'point', titre: 'Tes forces se renouvellent', texte: 'Ceux qui se confient en l’Éternel renouvellent leur force.', ref: 'Ésaïe 40:31' },
      ctaEncour
    ]
  },
  {
    id: '16-encouragement-retard', format: 'Encouragement', tiktok: 'Dieu n’est jamais en retard',
    legende: 'Dieu n’est jamais en retard ⏳🙏\n\nCe que tu attends n’est pas oublié. Fais-lui confiance.\n\nÉcris « Amen » si tu attends encore une réponse.\n\n' + hashBase + ' #patience #encouragement',
    slides: [
      { kind: 'cover', titre: 'Dieu n’est *jamais en retard*', sous: 'Même quand ça semble long.' },
      { kind: 'point', titre: 'Ce que tu attends n’est pas oublié', texte: 'Dieu entend chaque prière. Son silence ne veut pas dire son absence.' },
      { kind: 'point', titre: 'L’attente prépare', texte: 'Abraham a attendu des années avant de voir la promesse se réaliser. Dieu a tenu parole.', ref: 'Genèse 12 à 21' },
      { kind: 'point', titre: 'Continue de croire', texte: 'Si la promesse tarde, attends-la : elle s’accomplira au temps fixé par Dieu.', ref: 'Habacuc 2:3' },
      ctaEncour
    ]
  },
  {
    id: '17-encouragement-pas-seul', format: 'Encouragement', tiktok: 'Tu n’es pas seul(e)',
    legende: 'Tu n’es pas seul(e) 🤍\n\nDieu est avec toi dans ce que tu traverses. Si tu en as besoin, écris « Amen ».\n\n' + hashBase + ' #encouragement #solitude',
    slides: [
      { kind: 'cover', titre: 'Tu n’es *pas seul(e)*', sous: 'Lis jusqu’au bout.' },
      { kind: 'point', titre: 'Il est avec toi', texte: 'Et voici, je suis avec vous tous les jours, jusqu’à la fin du monde.', ref: 'Matthieu 28:20' },
      { kind: 'point', titre: 'Il ne t’abandonne pas', texte: 'L’Éternel, ton Dieu, marchera lui-même avec toi, il ne te délaissera point, il ne t’abandonnera point.', ref: 'Deutéronome 31:6' },
      { kind: 'point', titre: 'Il est proche de ton cœur', texte: 'L’Éternel est près de ceux qui ont le cœur brisé.', ref: 'Psaume 34:19' },
      ctaEncour
    ]
  },
  {
    id: '18-encouragement-passe', format: 'Encouragement', tiktok: 'Ton passé ne te définit pas',
    legende: 'Ton passé ne te définit pas 🕊️\n\nEn Christ, tu es une nouvelle créature. Écris « Amen » si tu y crois.\n\n' + hashBase + ' #pardon #nouveaudepart',
    slides: [
      { kind: 'cover', titre: 'Ton passé *ne te définit pas*', sous: 'Voici ce que Dieu en dit.' },
      { kind: 'point', titre: 'Tu es pardonné(e)', texte: 'Si nous confessons nos péchés, il est fidèle et juste pour nous les pardonner.', ref: '1 Jean 1:9' },
      { kind: 'point', titre: 'Tu es une nouvelle créature', texte: 'Les choses anciennes sont passées ; voici, toutes choses sont devenues nouvelles.', ref: '2 Corinthiens 5:17' },
      { kind: 'point', titre: 'Plus de condamnation', texte: 'Il n’y a donc maintenant aucune condamnation pour ceux qui sont en Jésus-Christ.', ref: 'Romains 8:1' },
      ctaEncour
    ]
  },
  {
    id: '19-encouragement-priere', format: 'Encouragement', tiktok: 'Quand la prière semble sans réponse',
    legende: 'Quand la prière semble sans réponse 🙏\n\nContinue de prier : Dieu t’entend.\n\nÉcris « Amen » si tu pries encore pour quelque chose.\n\n' + hashBase + ' #priere #perseverance',
    slides: [
      { kind: 'cover', titre: 'Quand la prière semble *sans réponse*', sous: 'Ne lâche pas.' },
      { kind: 'point', titre: 'Dieu t’entend', texte: 'Invoque-moi, et je te répondrai ; je t’annoncerai de grandes choses, des choses cachées, que tu ne connais pas.', ref: 'Jérémie 33:3' },
      { kind: 'point', titre: 'Persévère', texte: 'Il faut toujours prier, et ne point se relâcher.', ref: 'Luc 18:1' },
      { kind: 'point', titre: 'Le silence n’est pas l’absence', texte: 'Dieu agit même quand tu ne vois rien. Sa réponse peut venir autrement, ou plus tard, mais elle vient.' },
      ctaEncour
    ]
  },
  {
    id: '20-encouragement-valeur', format: 'Encouragement', tiktok: 'Tu comptes pour Dieu',
    legende: 'Tu comptes pour Dieu 🤍\n\nAimé, voulu, connu. Écris « Amen » si tu avais besoin de l’entendre.\n\n' + hashBase + ' #identite #amour',
    slides: [
      { kind: 'cover', titre: 'Tu *comptes* pour Dieu', sous: 'Plus que tu ne l’imagines.' },
      { kind: 'point', titre: 'Tu es une merveille', texte: 'Je te loue de ce que je suis une créature si merveilleuse.', ref: 'Psaume 139:14' },
      { kind: 'point', titre: 'Il connaît chaque détail', texte: 'Les cheveux même de votre tête sont tous comptés.', ref: 'Luc 12:7' },
      { kind: 'point', titre: 'Il t’a aimé en premier', texte: 'Dieu prouve son amour envers nous, en ce que, lorsque nous étions encore des pécheurs, Christ est mort pour nous.', ref: 'Romains 5:8' },
      ctaEncour
    ]
  },

  // ── Histoires bibliques (6) ──────────────────────────────────────────
  {
    id: '21-histoire-david', format: 'Histoire biblique', tiktok: 'David et Goliath : la victoire appartient à Dieu',
    legende: 'David et Goliath ⚔️\n\nUn jeune berger, un géant, et un Dieu qui donne la victoire. (1 Samuel 17)\n\nQuel est ton « Goliath » en ce moment ? Dis-le en commentaire, on prie pour toi 👇\n\n' + hashBase + ' #histoirebiblique #david',
    slides: [
      { kind: 'cover', titre: 'David et *Goliath*', sous: 'Histoire biblique · 1 Samuel 17' },
      { kind: 'point', titre: 'Le géant', texte: 'Tout le peuple tremblait devant Goliath. Personne n’osait l’affronter, pas même les soldats du roi.' },
      { kind: 'point', titre: 'Le berger', texte: 'David, un jeune berger, se présente avec une fronde et sa confiance en Dieu. Il refuse l’armure du roi.' },
      { kind: 'point', titre: 'La leçon', texte: 'La victoire appartient à l’Éternel. Tes batailles ne sont pas trop grandes pour lui.', ref: '1 Samuel 17:47' },
      ctaHistoire
    ]
  },
  {
    id: '22-histoire-daniel', format: 'Histoire biblique', tiktok: 'Daniel dans la fosse aux lions',
    legende: 'Daniel dans la fosse aux lions 🦁\n\nIl a continué de prier malgré l’interdiction, et Dieu l’a protégé. (Daniel 6)\n\nEt toi, oserais-tu rester fidèle ? Dis-le en commentaire 👇\n\n' + hashBase + ' #histoirebiblique #daniel',
    slides: [
      { kind: 'cover', titre: 'Daniel dans la *fosse aux lions*', sous: 'Histoire biblique · Daniel 6' },
      { kind: 'point', titre: 'Le piège', texte: 'Un décret interdit de prier un autre que le roi. Daniel continue de prier Dieu, trois fois par jour, comme avant.' },
      { kind: 'point', titre: 'La fosse', texte: 'Daniel est jeté aux lions. Mais Dieu envoie son ange et ferme la gueule des lions.' },
      { kind: 'point', titre: 'La leçon', texte: 'Il ne se trouva sur lui aucune blessure, parce qu’il avait cru en son Dieu.', ref: 'Daniel 6:23' },
      ctaHistoire
    ]
  },
  {
    id: '23-histoire-joseph', format: 'Histoire biblique', tiktok: 'Joseph : ce que le mal veut détruire, Dieu le transforme',
    legende: 'Joseph, vendu puis élevé 👑\n\nTrahi par ses frères, oublié en prison, et pourtant Dieu avait un plan. (Genèse 37 à 50)\n\nQuelle épreuve Dieu a-t-il retournée en bien dans ta vie ? Raconte 👇\n\n' + hashBase + ' #histoirebiblique #joseph',
    slides: [
      { kind: 'cover', titre: 'Joseph, du *puits* au palais', sous: 'Histoire biblique · Genèse 37 à 50' },
      { kind: 'point', titre: 'La trahison', texte: 'Ses frères le vendent comme esclave. Il se retrouve en Égypte, loin de sa famille, puis en prison.' },
      { kind: 'point', titre: 'Le tournant', texte: 'Dieu est avec Joseph. Il devient l’homme le plus puissant d’Égypte après Pharaon, et sauve sa famille de la famine.' },
      { kind: 'point', titre: 'La leçon', texte: 'Vous aviez médité de me faire du mal : Dieu l’a changé en bien.', ref: 'Genèse 50:20' },
      ctaHistoire
    ]
  },
  {
    id: '24-histoire-jonas', format: 'Histoire biblique', tiktok: 'Jonas : Dieu donne une seconde chance',
    legende: 'Jonas, la seconde chance 🐟\n\nIl a fui, Dieu l’a rattrapé, puis lui a redonné sa mission. (Jonas 1 à 3)\n\nTu as déjà eu l’impression de fuir Dieu ? Il t’attend toujours 🤍\n\n' + hashBase + ' #histoirebiblique #jonas',
    slides: [
      { kind: 'cover', titre: 'Jonas et la *seconde chance*', sous: 'Histoire biblique · Jonas 1 à 3' },
      { kind: 'point', titre: 'La fuite', texte: 'Dieu demande à Jonas d’aller à Ninive. Jonas part dans la direction opposée, et une grande tempête éclate.' },
      { kind: 'point', titre: 'Le poisson', texte: 'Jeté à la mer, Jonas est avalé par un grand poisson. Dans le noir, il prie, et Dieu l’entend.' },
      { kind: 'point', titre: 'La leçon', texte: 'La parole de l’Éternel s’adressa à Jonas une seconde fois. Dieu ne renonce pas à toi.', ref: 'Jonas 3:1' },
      ctaHistoire
    ]
  },
  {
    id: '25-histoire-fils-prodigue', format: 'Histoire biblique', tiktok: 'Le fils prodigue : un père qui court vers toi',
    legende: 'Le fils prodigue 🏃‍♂️🤍\n\nIl a tout perdu, il est revenu, et son père a couru vers lui. (Luc 15:11-32)\n\nC’est ça, l’amour de Dieu pour toi. Écris « Amen » si tu en as besoin aujourd’hui.\n\n' + hashBase + ' #parabole #amourdedieu',
    slides: [
      { kind: 'cover', titre: 'Le fils *prodigue*', sous: 'Parabole de Jésus · Luc 15:11-32' },
      { kind: 'point', titre: 'Le départ', texte: 'Un fils demande son héritage, part loin et dépense tout. Bientôt, il n’a plus rien à manger.' },
      { kind: 'point', titre: 'Le retour', texte: 'Il décide de rentrer, prêt à devenir serviteur. Son père l’aperçoit de loin.' },
      { kind: 'point', titre: 'La leçon', texte: 'Il était encore loin, son père le vit et fut ému de compassion, il courut se jeter à son cou.', ref: 'Luc 15:20' },
      ctaHistoire
    ]
  },
  {
    id: '26-histoire-zachee', format: 'Histoire biblique', tiktok: 'Zachée : Jésus cherche ceux qu’on rejette',
    legende: 'Zachée sur son arbre 🌳\n\nRejeté de tous, mais regardé par Jésus. (Luc 19:1-10)\n\nJésus te voit aussi. Écris « Amen » si tu y crois.\n\n' + hashBase + ' #histoirebiblique #zachee',
    slides: [
      { kind: 'cover', titre: '*Zachée*, l’homme sur l’arbre', sous: 'Histoire biblique · Luc 19:1-10' },
      { kind: 'point', titre: 'Le rejeté', texte: 'Zachée est un collecteur d’impôts que tout le monde méprise. Trop petit pour voir Jésus dans la foule, il monte sur un sycomore.' },
      { kind: 'point', titre: 'Le regard de Jésus', texte: 'Jésus s’arrête, lève les yeux et l’appelle par son nom : « Aujourd’hui il faut que je demeure dans ta maison. »', ref: 'Luc 19:5' },
      { kind: 'point', titre: 'La leçon', texte: 'Le Fils de l’homme est venu chercher et sauver ce qui était perdu.', ref: 'Luc 19:10' },
      ctaHistoire
    ]
  },

  // ── Engagement (2) ───────────────────────────────────────────────────
  {
    id: '27-livre-prefere', format: 'Question', tiktok: 'Quel est ton livre préféré de la Bible ?',
    legende: 'Quel est ton livre préféré de la Bible ? 📖\n\nRéponds en commentaire avec un seul livre, et dis-nous pourquoi 👇\n\n' + hashBase + ' #lecturebiblique #question',
    slides: [
      { kind: 'cover', titre: 'Quel est ton *livre préféré* de la Bible ?', sous: 'Réponds en commentaire.' },
      { kind: 'point', titre: 'Les Psaumes', texte: 'Pour la louange, les larmes et la confiance en Dieu.' },
      { kind: 'point', titre: 'Les Proverbes', texte: 'Pour la sagesse du quotidien.' },
      { kind: 'point', titre: 'L’Évangile de Jean', texte: 'Pour connaître Jésus de plus près.' },
      { kind: 'point', titre: 'L’épître aux Romains', texte: 'Pour comprendre la grâce et la foi.' },
      cta('Et toi, c’est lequel ?', 'Dis-le en commentaire et abonne-toi.')
    ]
  },
  {
    id: '28-priere-exaucee', format: 'Question', tiktok: 'Raconte une prière exaucée',
    legende: 'As-tu déjà vu Dieu répondre à une prière ? 🙏\n\nRaconte-nous ton témoignage en commentaire : il encouragera quelqu’un 👇\n\n' + hashBase + ' #temoignage #priere',
    slides: [
      { kind: 'cover', titre: 'As-tu déjà vu Dieu *répondre* à une prière ?', sous: 'Ton témoignage encourage.' },
      { kind: 'point', titre: 'Pourquoi témoigner ?', texte: 'Raconter ce que Dieu a fait, c’est rappeler aux autres qu’il est fidèle.', ref: 'Psaume 66:16' },
      { kind: 'point', titre: 'Écris-le en commentaire', texte: 'Une phrase suffit. Quelqu’un qui doute a peut-être besoin de la lire aujourd’hui.' },
      cta('Ton histoire compte.', 'Écris-la en commentaire et abonne-toi.')
    ]
  },

  // ── Prières (2) ──────────────────────────────────────────────────────
  {
    id: '29-priere-matin', format: 'Prière', tiktok: 'Prière du matin',
    legende: 'Prière du matin 🌅\n\nCommence ta journée avec Dieu. Prie avec nous, puis écris « Amen » 🙏\n\n' + hashBase + ' #prieredumatin #priere',
    slides: [
      { kind: 'verse', label: 'Prière du matin', texte: 'Seigneur, merci pour ce nouveau jour. Guide mes pas, garde mon cœur en paix et aide-moi à vivre selon ta volonté. Amen.', ref: 'Le Parvis' },
      { kind: 'point', titre: 'Pour y croire', texte: 'Fais-moi dès le matin entendre ta bonté, car je me confie en toi !', ref: 'Psaume 143:8' },
      cta('Amen ?', 'Abonne-toi pour prier avec nous chaque jour.')
    ]
  },
  {
    id: '30-priere-soir', format: 'Prière', tiktok: 'Prière du soir',
    legende: 'Prière du soir 🌙\n\nTermine ta journée en paix. Prie avec nous, puis écris « Amen » 🙏\n\n' + hashBase + ' #prieredusoir #priere',
    slides: [
      { kind: 'verse', label: 'Prière du soir', texte: 'Seigneur, merci pour cette journée. Je dépose entre tes mains mes soucis et ceux que j’aime. Donne-moi une nuit paisible. Amen.', ref: 'Le Parvis' },
      { kind: 'point', titre: 'Pour y croire', texte: 'Je me couche et je m’endors en paix, car toi seul, ô Éternel, tu me donnes la sécurité dans ma demeure.', ref: 'Psaume 4:9' },
      cta('Amen ?', 'Abonne-toi pour prier avec nous chaque soir.')
    ]
  }
];
