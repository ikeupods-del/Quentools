/* Studio Posts — génération automatique d'une publication complète (images + légende) par l'IA locale.
   L'IA remplit un formulaire JSON imposé (grammaire) ; le programme construit les images, la légende et les hashtags,
   et contrôle les règles de chaque marque. Une réponse refusée est redemandée (3 essais).
   Le Parvis : aucun verset écrit par l'IA ; elle choisit une référence dans la liste vérifiée (Louis Segond 1910,
   tirée de parvis-posts.js) et le programme recopie le texte exact.
   QuenTools : jamais de prix, de lien, de chiffre inventé ni de mention de l'IA (design/POSITIONNEMENT.md). */
'use strict';
const PARVIS = require('./parvis-posts.js');
const SECTEURS = require('./secteurs.js');

const HASHTAGS = { parvis: '#chretien #pourtoi #foi #jesus #bible', quentools: '#siteweb #entrepreneur #artisan #creationdesite #communicationdigitale' };
const CTA_PARVIS = (titre, sous) => ({ type: 'abonnement', titre, sous, bouton: 'Abonne-toi', bouton2: 'pour ne rien rater', petit: 'Le Parvis · communauté chrétienne' });

// Versets vérifiés : ceux déjà publiés par Le Parvis (référence → texte exact)
const VERSETS = (() => {
  const m = new Map();
  for (const p of PARVIS) for (const s of p.slides) if (s.ref && s.texte && /\d/.test(s.ref) && !m.has(s.ref)) m.set(s.ref, s.texte);
  return m;
})();

const THEMES_PARVIS = ['la peur du lendemain', 'la fatigue et le découragement', 'la gratitude', 'le pardon', 'la solitude', 'la confiance en Dieu', 'la patience',
  'l’espérance', 'la paix intérieure', 'l’amitié', 'le travail et les études', 'la famille', 'les nouveaux départs', 'la prière au quotidien', 'la persévérance',
  'l’anxiété', 'la joie', 'l’humilité', 'la générosité', 'les épreuves', 'la foi des jeunes', 'le repos', 'l’amour du prochain', 'les choix difficiles'];
const ANGLES_QT = ['être trouvé sur Google quand un client cherche ce métier près de chez lui', 'un numéro de téléphone visible tout de suite', 'des horaires toujours à jour',
  'un site facile à lire sur téléphone', 'la demande de devis ou la prise de rendez-vous en ligne', 'la fiche d’établissement Google', 'montrer ses réalisations en photos',
  'une page contact simple', 'un site qui s’affiche vite', 'rassurer un client avant son premier appel', 'présenter clairement ses services',
  'indiquer clairement sa zone d’intervention', 'répondre sur son site aux questions que les clients posent toujours', 'se démarquer de la concurrence locale',
  'donner confiance avec une présentation honnête de son entreprise'];

const FORMES = {
  parvis: { verset: 'Verset du jour', liste: 'Liste en 5 points', encouragement: 'Encouragement (3 versets)', priere: 'Prière' },
  quentools: { carrousel: 'Carrousel 5 images', conseil: 'Conseil', liste: 'Liste', astuces: 'Astuces en carrousel' }
};

const SYSTEME = {
  parvis: 'Tu écris des publications Instagram et TikTok pour « Le Parvis », une communauté chrétienne francophone. Tu tutoies le lecteur. ' +
    'Ton chaleureux, simple et fraternel, phrases courtes et vraies, sans jargon religieux compliqué. ' +
    'Règle absolue : tu ne cites JAMAIS la Bible de mémoire, tu n’écris aucun verset, aucune citation entre guillemets et aucune référence biblique : ' +
    'quand il faut un verset, tu choisis seulement une référence dans la liste fournie, le programme recopie lui-même le texte exact. ' +
    'Aucun émoji, aucun hashtag. Dans un titre de couverture, mets UN mot ou groupe de mots important entre astérisques : *mot*.',
  quentools: 'Tu écris des publications Instagram et TikTok pour QuenTools, une agence de communication digitale qui crée des sites internet simples et efficaces ' +
    'pour les artisans, commerçants, indépendants et petites entreprises. Tu vouvoies le lecteur. Ton clair, concret et bienveillant, sans jargon technique. ' +
    'Règles absolues : aucun prix, aucun lien ni adresse de site, aucun chiffre, pourcentage ou statistique, aucun faux avis ni témoignage, ' +
    'ne parle jamais d’intelligence artificielle ni d’IA. Aucun émoji, aucun hashtag. ' +
    'Dans chaque titre, mets UN mot ou groupe de mots important entre astérisques : *mot*.'
};

const S = (max, min = 1) => ({ type: 'string', minLength: min, maxLength: max });
const liste = (items, n) => ({ type: 'array', minItems: n, maxItems: n, items });
const objet = props => ({ type: 'object', properties: props, required: Object.keys(props) });

// Longueurs maximales (en caractères) qui tiennent dans les images, mesurées sur les modèles
const LIM = { couverture: 70, sous: 70, titrePoint: 55, textePoint: 170, meditation: 260, priere: 300, accroche: 75, sousAccroche: 90, item: 60, question: 60, legende: 400, titreLegende: 80 };

// Chaque forme : le formulaire demandé à l'IA, la consigne, et la construction de la publication
function formes(versetsPermis) {
  const refs = [...versetsPermis.keys()];
  const listeVersets = refs.map(r => `- ${r} : « ${VERSETS.get(r)} »`).join('\n');
  return {
    parvis: {
      verset: {
        schema: objet({ ref: { type: 'string', enum: refs }, titreLegende: S(LIM.titreLegende), meditation: S(LIM.meditation, 60), question: S(LIM.question) }),
        consigne: sujet => `Thème : ${sujet}.\nChoisis dans la liste ci-dessous le verset qui parle le mieux de ce thème (« ref »), puis écris :\n` +
          '- « meditation » : une méditation de 2 ou 3 phrases simples qui appliquent ce verset à la vie de tous les jours (sans recopier le verset) ;\n' +
          '- « titreLegende » : un titre TikTok accrocheur qui donne envie de lire ;\n- « question » : une courte question pour inviter à commenter.\n\nVersets disponibles :\n' + listeVersets,
        construire: r => {
          const texte = VERSETS.get(r.ref);
          return { nom: r.titreLegende, slides: [{ type: 'verset', label: 'Verset du jour', texte, ref: r.ref }, { type: 'point', titre: 'Pour méditer', texte: r.meditation },
            CTA_PARVIS('Cette parole est pour toi ?', 'Reçois un verset chaque jour avec Le Parvis.')],
          legende: { titre: r.titreLegende, texte: `Verset du jour 🙏\n\n« ${texte} »\n${r.ref}\n\n${r.meditation}\n\n${r.question}\n\nÉcris « Amen » si cette parole te parle.\n\n${HASHTAGS.parvis} #versetdujour` } };
        }
      },
      liste: {
        schema: objet({ titre: S(LIM.couverture), points: liste(objet({ titre: S(LIM.titrePoint), texte: S(LIM.textePoint, 20) }), 5), accroche: S(LIM.titreLegende), question: S(LIM.question) }),
        consigne: sujet => `Thème : ${sujet}.\nÉcris une publication « liste » en 5 points sur ce thème, pour des jeunes chrétiens :\n` +
          '- « titre » : le titre de couverture, du genre « 5 choses que… » ou « 5 signes que… », avec un mot entre astérisques ;\n' +
          '- « points » : 5 points, chacun avec un titre très court et une phrase qui l’explique ;\n- « accroche » : la première ligne de la légende ;\n' +
          '- « question » : une question pour la dernière image, qui invite à commenter.',
        construire: r => ({ nom: r.titre.replace(/\*/g, ''), slides: [{ type: 'couverture', titre: r.titre, sous: 'Swipe.' }, ...r.points.map((p, i) => ({ type: 'point', n: i + 1, titre: p.titre, texte: p.texte })),
          CTA_PARVIS(r.question, 'Dis-le en commentaire, puis abonne-toi.')],
        legende: { titre: r.titre.replace(/\*/g, ''), texte: `${r.accroche} 🙌\n\n${r.points.map((p, i) => `${i + 1}. ${p.titre}`).join('\n')}\n\n${r.question} Dis-le en commentaire 👇\n\n${HASHTAGS.parvis}` } })
      },
      encouragement: {
        schema: objet({ titre: S(LIM.couverture), sous: S(LIM.sous), points: liste(objet({ titre: S(LIM.titrePoint), ref: { type: 'string', enum: refs } }), 3), message: S(220, 40), accroche: S(LIM.titreLegende) }),
        consigne: sujet => `Thème : ${sujet}.\nÉcris un carrousel d’encouragement pour quelqu’un qui vit ce thème :\n` +
          '- « titre » : titre de couverture qui s’adresse à lui, du genre « Si tu es *fatigué(e)*, lis ça » ;\n- « sous » : une courte phrase sous le titre ;\n' +
          '- « points » : 3 encouragements, chacun avec un titre court qui parle au lecteur et la référence d’un verset DIFFÉRENT choisi dans la liste, qui correspond à ce titre ;\n' +
          '- « message » : 2 phrases chaleureuses pour la légende ;\n- « accroche » : un titre TikTok.\n\nVersets disponibles :\n' + listeVersets,
        verifier: r => (new Set(r.points.map(p => p.ref)).size < 3 ? 'les 3 versets doivent être différents' : ''),
        construire: r => ({ nom: r.titre.replace(/\*/g, ''), slides: [{ type: 'couverture', titre: r.titre, sous: r.sous }, ...r.points.map(p => ({ type: 'point', titre: p.titre, texte: VERSETS.get(p.ref), ref: p.ref })),
          CTA_PARVIS('Quelqu’un a besoin de lire ça.', 'Partage-lui et abonne-toi pour d’autres encouragements.')],
        legende: { titre: r.accroche, texte: `${r.message} 🤍\n\n${r.points.map(p => `« ${VERSETS.get(p.ref)} » ${p.ref}`).join('\n\n')}\n\nÉcris « Amen » si tu en avais besoin.\n\n${HASHTAGS.parvis} #encouragement` } })
      },
      priere: {
        schema: objet({ titre: S(LIM.couverture), debut: S(LIM.priere, 60), fin: S(LIM.priere, 60), accroche: S(LIM.titreLegende) }),
        consigne: sujet => `Thème : ${sujet}.\nÉcris une prière courte, sincère et simple sur ce thème, adressée à Dieu, que le lecteur peut prier lui-même (à la première personne : « je », « mon ») :\n` +
          '- « titre » : titre de couverture, du genre « Une *prière* pour… » ;\n- « debut » : la première partie de la prière, 2 ou 3 phrases qui commencent après « Seigneur, » ;\n' +
          '- « fin » : la seconde partie, 2 ou 3 phrases de remerciement et de confiance qui commencent après « Merci, » et finissent par « au nom de Jésus. » ;\n- « accroche » : un titre TikTok.',
        construire: r => ({ nom: r.titre.replace(/\*/g, ''), slides: [{ type: 'couverture', titre: r.titre, sous: 'Lis-la à voix basse.' }, { type: 'point', titre: 'Seigneur,', texte: r.debut }, { type: 'point', titre: 'Merci,', texte: r.fin },
          CTA_PARVIS('Tu as prié avec nous ?', 'Écris « Amen » en commentaire et abonne-toi.')],
        legende: { titre: r.accroche, texte: `Prions ensemble 🙏\n\nSeigneur, ${r.debut}\nMerci, ${r.fin}\n\nÉcris « Amen » si tu t’associes à cette prière.\n\n${HASHTAGS.parvis} #priere` } })
      }
    },
    quentools: {
      carrousel: {
        schema: objet({ accroche: S(LIM.accroche), sous: S(LIM.sousAccroche), constat: S(LIM.accroche), problemes: liste(S(LIM.item), 3), solution: S(LIM.accroche), avantages: liste(S(LIM.item), 3),
          telephone: S(50), titreLegende: S(LIM.titreLegende), legende: S(LIM.legende, 80) }),
        consigne: (sujet, sec) => `Métier : ${sec.metier}. Situation de départ : ${sec.situation}. Angle : ${sujet}.\n` +
          'Écris un carrousel de 5 images « situation → constat → solution → téléphone → question », du point de vue du client de ce métier :\n' +
          '- « accroche » : la situation en une phrase choc, avec une question entre astérisques ;\n- « sous » : courte réponse qui intrigue ;\n' +
          '- « constat » : titre de l’image 2 (ce qui se passe quand le site ne répond pas au besoin) ; « problemes » : 3 problèmes courts vécus par le client ;\n' +
          '- « solution » : titre de l’image 3 (ce qu’un bon site change) ; « avantages » : 3 éléments concrets du site qui règlent ces problèmes ;\n' +
          '- « telephone » : titre de l’image 4 qui montre le site sur téléphone ;\n- « titreLegende » : un titre TikTok ;\n' +
          '- « legende » : 2 ou 3 phrases pour la légende, qui finissent par une question au lecteur sur son métier.',
        construire: (r, sec) => ({ nom: `${sec.metier} : ${r.accroche.replace(/\*/g, '')}`, format: '45', capture: sec.id, slides: [
          { type: 'accroche', theme: 'nuit', etiquette: 'Modèle de démonstration', titre: r.accroche, sous: r.sous, appel: 'Glissez pour voir comment →' },
          { type: 'liste', theme: 'nuit', etiquette: 'Le constat', titre: r.constat, items: r.problemes.join('\n'), puce: 'croix' },
          { type: 'liste', theme: 'nuit', etiquette: 'La solution', titre: r.solution, items: r.avantages.join('\n'), puce: 'coche' },
          { type: 'telephone', theme: 'nuit', etiquette: 'Sur téléphone', titre: r.telephone, sous: '', position: 'centre', image: '' },
          { type: 'question', theme: 'violet', etiquette: 'Et vous ?', titre: 'Et votre *métier*, c’est quoi ?', texte: 'Dites-le en commentaire : je vous réponds avec une idée pour votre site.' }],
        legende: { titre: r.titreLegende, texte: `${r.legende}\n\nExemple fictif réalisé par QuenTools.\n\n${HASHTAGS.quentools}` } })
      },
      conseil: {
        schema: objet({ titre: S(LIM.accroche), sous: S(LIM.sousAccroche), titreLegende: S(LIM.titreLegende), legende: S(LIM.legende, 80) }),
        consigne: (sujet, sec) => `Angle : ${sujet}. Exemple de métier à évoquer si utile : ${sec.metier}.\nÉcris un conseil en une seule image pour un artisan ou un commerçant :\n` +
          '- « titre » : le conseil, court et concret, avec un mot entre astérisques ;\n- « sous » : pourquoi c’est important, en une phrase ;\n' +
          '- « titreLegende » : un titre TikTok ;\n- « legende » : 2 ou 3 phrases qui développent le conseil et finissent par une question au lecteur.',
        construire: r => ({ nom: r.titre.replace(/\*/g, ''), slides: [{ type: 'accroche', theme: 'creme', etiquette: 'Conseil', titre: r.titre, sous: r.sous }],
          legende: { titre: r.titreLegende, texte: `${r.legende}\n\n${HASHTAGS.quentools}` } })
      },
      liste: {
        schema: objet({ titre: S(LIM.accroche), points: liste(S(LIM.item), 3), titreLegende: S(LIM.titreLegende), legende: S(LIM.legende, 80) }),
        consigne: (sujet, sec) => `Angle : ${sujet}. Exemple de métier à évoquer si utile : ${sec.metier}.\nÉcris une liste en une image pour un artisan ou un commerçant :\n` +
          '- « titre » : du genre « 3 signes que… » ou « 3 choses à… », avec un mot entre astérisques ;\n- « points » : 3 points courts et concrets ;\n' +
          '- « titreLegende » : un titre TikTok ;\n- « legende » : 2 ou 3 phrases qui finissent par une question au lecteur.',
        construire: r => ({ nom: r.titre.replace(/\*/g, ''), slides: [{ type: 'liste', theme: 'violet', etiquette: 'Checklist', titre: r.titre, items: r.points.join('\n'), puce: 'numero' }],
          legende: { titre: r.titreLegende, texte: `${r.legende}\n\n${HASHTAGS.quentools}` } })
      },
      astuces: {
        schema: objet({ titre: S(LIM.accroche), sous: S(LIM.sous), astuces: liste(objet({ titre: S(LIM.titrePoint), texte: S(LIM.textePoint, 20) }), 3), question: S(LIM.question), titreLegende: S(LIM.titreLegende), legende: S(LIM.legende, 80) }),
        consigne: (sujet, sec) => `Angle : ${sujet}. Exemple de métier à évoquer si utile : ${sec.metier}.\nÉcris un carrousel de 3 astuces faciles à appliquer :\n` +
          '- « titre » : du genre « 3 astuces pour… », avec un mot entre astérisques ;\n- « sous » : une courte promesse (sans chiffre) ;\n' +
          '- « astuces » : 3 astuces, chacune avec un titre court et une ou deux phrases concrètes ;\n- « question » : la question de la dernière image, avec un mot entre astérisques ;\n' +
          '- « titreLegende » : un titre TikTok ;\n- « legende » : 2 phrases pour la légende.',
        construire: r => ({ nom: r.titre.replace(/\*/g, ''), slides: [{ type: 'accroche', theme: 'violet', etiquette: 'Astuces', titre: r.titre, sous: r.sous, appel: 'Glissez →' },
          ...r.astuces.map((a, i) => ({ type: 'point', theme: 'nuit', etiquette: 'Astuce ' + (i + 1), n: i + 1, titre: a.titre, texte: a.texte })),
          { type: 'question', theme: 'lime', etiquette: 'Et vous ?', titre: r.question, texte: 'Dites-le en commentaire 👇' }],
        legende: { titre: r.titreLegende, texte: `${r.legende}\n\n${r.astuces.map((a, i) => `${i + 1}. ${a.titre.replace(/\*/g, '')}`).join('\n')}\n\n${r.question.replace(/\*/g, '')} Dites-le en commentaire 👇\n\n${HASHTAGS.quentools}` } })
      }
    }
  };
}

// Nettoyage des textes de l'IA : espaces, émojis, hashtags, astérisques en trop
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu;
function nettoyer(v) {
  if (Array.isArray(v)) return v.map(nettoyer);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'ref' ? x : nettoyer(x)]));
  if (typeof v !== 'string') return v;
  let t = v.replace(EMOJI, '').replace(/(^|\s)#[\p{L}\d_]+/gu, '$1').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  t = t.replace(/^["“«]\s*|\s*["”»]$/g, '').replace(/'/g, '’');
  // une seule mise en couleur : *mot* ; une étoile seule est retirée
  const paires = t.match(/\*[^*\n]+\*/g) || [];
  if (paires.length > 1) { let k = 0; t = t.replace(/\*([^*\n]+)\*/g, (m, x) => (k++ ? x : m)); }
  if ((t.match(/\*/g) || []).length % 2) t = t.replace(/\*/g, '');
  return t;
}
const textes = v => (Array.isArray(v) ? v.flatMap(textes) : v && typeof v === 'object' ? Object.entries(v).filter(([k]) => k !== 'ref').flatMap(([, x]) => textes(x)) : typeof v === 'string' ? [v] : []);

// Règles de chaque marque, contrôlées par le programme (l'IA ne peut pas les oublier)
function controler(marque, r, schema) {
  const tout = textes(r).join('\n');
  if (marque === 'parvis') {
    if (/[«»"“”]/.test(tout)) return 'aucune citation entre guillemets : le programme ajoute lui-même les versets';
    if (/\b(?:[1-3]\s?)?[A-ZÉÈ][\p{Ll}]+\.?\s\d{1,3}\s?[:.,]\s?\d{1,3}\b/u.test(tout)) return 'aucune référence biblique dans les textes (seulement dans le champ « ref »)';
    if (/\bvous\b/i.test(tout)) return 'tutoie le lecteur (« tu »), jamais « vous »';
  } else {
    if (/€|\beuros?\b|\bprix\b|\btarifs?\b/i.test(tout)) return 'aucun prix ni tarif';
    if (/https?:|www\.|\.(fr|com|net)\b|@/i.test(tout)) return 'aucun lien, aucune adresse';
    if (/\bIA\b|intelligence artificielle|chat\s?gpt|\bia\b/i.test(tout)) return 'ne parle pas d’IA';
    if (/\d\s?%|pour\s?cent|\b\d{2,}\b|statisti|étude|sondage/i.test(tout)) return 'aucun chiffre, pourcentage ou statistique';
    if (/\b(tu|ton|ta|tes|toi|t’)\b/i.test(tout.replace(/\*/g, ''))) return 'vouvoie le lecteur (« vous »), jamais « tu »';
    if (/\b(avis|témoignage)s?\b.*«|«.*\b(client|cliente)\b/i.test(tout)) return 'aucun faux avis ni témoignage';
  }
  // longueurs (une grammaire peut laisser passer) et champs vides
  const trop = [];
  (function parcourir(v, sch, nom) {
    if (!sch) return;
    if (sch.type === 'string' && typeof v === 'string') { if (sch.maxLength && v.length > sch.maxLength * 1.15) trop.push(nom); if (!v.trim()) trop.push(nom + ' vide'); }
    else if (sch.type === 'array' && Array.isArray(v)) v.forEach((x, i) => parcourir(x, sch.items, `${nom} ${i + 1}`));
    else if (sch.type === 'object' && v) for (const [k, s] of Object.entries(sch.properties)) parcourir(v[k], s, k);
  })(r, schema, '');
  return trop.length ? 'textes trop longs ou vides : ' + trop.join(', ') + ' (raccourcis-les)' : '';
}

const hasard = l => l[Math.floor(Math.random() * l.length)];
const ASCII = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* demander({ systeme, demande, schema, maxTokens, temperature }) → objet JSON rempli par l'IA locale.
   generer({ marque, forme: 'auto' | clé de FORMES, sujet, recents: [noms ou références déjà utilisés], etape(texte) }) */
function creer({ demander }) {
  async function generer({ marque = 'parvis', forme = 'auto', sujet = '', recents = [], etape = () => {} } = {}) {
    if (!FORMES[marque]) throw new Error('Marque inconnue');
    const deja = ASCII(recents.join(' | '));
    if (!FORMES[marque][forme]) forme = hasard(Object.keys(FORMES[marque]));
    // versets pas encore utilisés récemment (au moins 12 au choix)
    let permis = new Map([...VERSETS].filter(([ref]) => !deja.includes(ASCII(ref))));
    if (permis.size < 12) permis = new Map(VERSETS);
    const F = formes(permis)[marque][forme];
    const secteur = SECTEURS.find(s => ASCII(sujet).includes(ASCII(s.metier)) || ASCII(sujet).includes(s.id)) || hasard(SECTEURS);
    const libre = String(sujet || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const theme = libre || (marque === 'parvis' ? hasard(THEMES_PARVIS.filter(t => !deja.includes(ASCII(t))).concat(THEMES_PARVIS).slice(0, 30)) : hasard(ANGLES_QT));
    const recentsTxt = recents.length ? `\nPublications déjà faites (ne les répète pas, trouve un angle nouveau) : ${recents.slice(0, 15).join(' ; ')}` : '';
    const demande = F.consigne(theme, secteur) + recentsTxt;
    let raison = '', r = null;
    for (const [i, temperature] of [0.75, 0.55, 0.35].entries()) {
      etape(i ? `L’IA corrige sa proposition (essai ${i + 1} sur 3)…` : `L’IA écrit : ${FORMES[marque][forme].toLowerCase()} · ${theme}`);
      const dem = raison ? `${demande}\n\nTa proposition précédente a été refusée : ${raison}. Corrige ce défaut.` : demande;
      r = nettoyer(await demander({ systeme: SYSTEME[marque], demande: dem, schema: F.schema, maxTokens: 1400, temperature }));
      raison = controler(marque, r, F.schema) || (F.verifier ? F.verifier(r) : '');
      if (!raison) break;
      // au dernier essai, des textes un peu longs sont acceptés : l'image les rétrécit et le signale
      if (i === 2 && /^textes trop longs/.test(raison)) { raison = ''; break; }
    }
    if (raison) throw new Error('L’IA n’a pas respecté les règles (' + raison + '). Appuie de nouveau sur Générer.');
    const p = F.construire(r, secteur);
    return { marque, forme, sujet: theme, ...p, nom: String(p.nom || theme).slice(0, 90) };
  }
  return { generer };
}

module.exports = { creer, FORMES, VERSETS, SECTEURS, controler, nettoyer, HASHTAGS };
