// QuentMovie : IA locale du générateur (Qwen3 4B Instruct, licence Apache 2.0, ~2,5 Go téléchargés une fois)
// et téléchargement de vidéos depuis un lien (yt-dlp, installé au premier usage).
'use strict';
const fs = require('fs');
const path = require('path');
const { fork, spawn, execFile } = require('child_process');
const MAJ = require('./maj');
// téléchargement vers un fichier : en cas d'échec, le fichier partiel est retiré
const requete = (url, o = {}, ...r) => MAJ.requete(url, o, ...r).catch(e => { if (o.dest) { try { require('fs').rmSync(o.dest, { force: true }); } catch (er) { /* rien à retirer */ } } throw e; });

const MODELE = { fichier: 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf', url: 'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf', mo: 2500 };
MODELE.nom = 'Standard (Qwen3 4B, rapide)';
// « Précise » : modèle plus grand, textes plus justes mais plus lents (à télécharger une fois) ; la pensée longue de ce modèle est coupée (/no_think)
const MODELES_IA = { standard: MODELE, precis: { nom: 'Précise (Qwen3 8B, plus lente)', fichier: 'Qwen3-8B-Q4_K_M.gguf', url: 'https://huggingface.co/unsloth/Qwen3-8B-GGUF/resolve/main/Qwen3-8B-Q4_K_M.gguf', mo: 5000, aucunePensee: true } };
const STYLES = {
  documentaire: 'un documentaire posé et clair, comme un reportage télévisé',
  dynamique: 'une vidéo pour TikTok ou Reels : ton vivant et direct, phrases complètes et naturelles, une accroche forte au début',
  enfants: 'une vidéo pour enfants de 8 à 12 ans : mots simples, ton chaleureux',
  histoire: 'un récit captivant qui raconte l’histoire dans l’ordre, avec du suspense'
};
// schémas JSON (réponses courtes seulement : plan de la vidéo, mots-clés d'images) ; les textes sont écrits en texte libre, scène par scène
// types de vidéo : la structure demandée au plan ; public, ton et rythme : consignes d'écriture
const TYPES = {
  libre: '',
  astuces: 'Format « astuces » : chaque scène présente UNE astuce précise (« Première astuce… », « Deuxième astuce… ») et dit pourquoi elle marche.',
  explication: 'Format explication : pose la question, explique le mécanisme pas à pas, termine par ce qu’il faut retenir.',
  histoire: 'Format chronologique : raconte dans l’ordre, du début à aujourd’hui.',
  tutoriel: 'Format tutoriel : des étapes numérotées dans l’ordre, chaque scène est une action concrète.',
  promo: 'Format présentation d’un service : le problème du client, la solution proposée, les bénéfices concrets, comment passer à l’action. Aucune promesse chiffrée, aucun faux témoignage.',
  info: 'Format info rapide : l’essentiel d’abord, puis le contexte, puis ce que cela change pour le spectateur.'
};
const PUBLICS = { debutants: 'des débutants : explique chaque terme technique', grandpublic: 'le grand public', experts: 'des connaisseurs : va droit au but, vocabulaire précis', enfants: 'des enfants de 8 à 12 ans : mots simples', pros: 'des professionnels indépendants (artisans, commerçants, TPE) : exemples concrets de leur quotidien' };
const TONS = { neutre: '', humour: 'Ton humoristique : un trait d’esprit léger par scène, jamais moqueur.', serieux: 'Ton sérieux et factuel.', inspirant: 'Ton inspirant et motivant.', chaleureux: 'Ton chaleureux et rassurant.', percutant: 'Ton percutant : phrases courtes, énergiques, qui donnent envie d’agir.' };
const RYTHMES = { court: 'Phrases courtes (12 mots maximum), rythme rapide.', normal: '', pose: 'Phrases amples et posées, rythme tranquille.' };
// options de l'interface (menus et cases) → règles, même vocabulaire que les consignes écrites ; les consignes écrites complètent les options
function regroupe(consigne, opt = {}) {
  const rg = lireConsignes(consigne), liste = v => (Array.isArray(v) ? v : String(v || '').split(/[,;\n]+/)).map(x => String(x).trim()).filter(Boolean).slice(0, 20);
  if (opt.accroche === false) { rg.accroche = false; rg.ouverture = false; }
  if (opt.conclusion === false) rg.conclusion = false;
  if (opt.adresse === 'tu' || opt.adresse === 'vous') rg.adresse = opt.adresse;
  rg.eviter = liste(opt.eviter); rg.inclure = liste(opt.inclure); rg.cta = String(opt.cta || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  rg.type = TYPES[opt.type] !== undefined ? opt.type : 'libre'; rg.public = PUBLICS[opt.public] ? opt.public : ''; rg.ton = TONS[opt.ton] ? opt.ton : 'neutre'; rg.rythme = RYTHMES[opt.rythme] !== undefined ? opt.rythme : 'normal';
  rg.nbScenes = Math.max(0, Math.min(14, Math.round(+opt.scenes || 0))) || (rg.nombre >= 3 ? rg.nombre : 0);
  rg.libre = rg.libre && !rg.eviter.length && !rg.inclure.length && !rg.cta && rg.type === 'libre' && !rg.public && rg.ton === 'neutre' && rg.rythme === 'normal' && !rg.nbScenes;
  return rg;
}
const consignesDe = rg => [TYPES[rg.type], rg.public ? `Public visé : ${PUBLICS[rg.public]}.` : '', TONS[rg.ton], RYTHMES[rg.rythme], rg.inclure.length ? `Utilise naturellement ces mots ou expressions : ${rg.inclure.join(', ')}.` : '',
  rg.eviter.length ? `N’emploie JAMAIS ces mots ou expressions : ${rg.eviter.join(', ')}.` : ''].filter(Boolean).join(' ');
// longueurs bornées : sans limite, l'IA pouvait s'emballer sur un champ et sa réponse était coupée (JSON illisible)
const SCHEMA_PLAN = n => ({ type: 'object', properties: { titre: { type: 'string', maxLength: 90 }, scenes: { type: 'array', minItems: n, maxItems: n, items: { type: 'object', properties: { section: { type: 'string', maxLength: 40 }, idee: { type: 'string', maxLength: 220 }, sujet: { type: 'string', maxLength: 60 }, recherche: { type: 'string', maxLength: 60 } }, required: ['section', 'idee', 'sujet', 'recherche'] } } }, required: ['titre', 'scenes'] });
const SCHEMA_MOTS = { type: 'object', properties: { scenes: { type: 'array', items: { type: 'object', properties: { sujet: { type: 'string' }, recherche: { type: 'string' } }, required: ['sujet', 'recherche'] } } }, required: ['scenes'] };
const nbMots = t => String(t).split(/\s+/).filter(Boolean).length;
// Langues de traduction des sous-titres (nom donné à l'IA en français et en anglais)
const LANGUES = { it: { nom: 'italien', en: 'Italian' }, en: { nom: 'anglais', en: 'English' }, es: { nom: 'espagnol', en: 'Spanish' }, de: { nom: 'allemand', en: 'German' }, pt: { nom: 'portugais', en: 'Portuguese' }, fr: { nom: 'français', en: 'French' } };
// Une ligne traduite rendue propre (numéro, guillemets, retours à la ligne retirés)
const nettoyerTraduction = t => String(t || '').replace(/\s+/g, ' ').replace(/^\s*\d{1,3}[.)]\s+/, '').replace(/^["«“]\s*|\s*["»”]$/g, '').trim();
// Contrôle d'une ligne traduite : '' si elle est bonne, sinon la raison du refus
function controleTraduction(src, tr, langue = 'it') {
  src = String(src || '').trim(); tr = String(tr || '').trim();
  if (!src) return '';
  if (!tr) return 'ligne vide';
  const chiffres = s => (s.replace(/(\d)[\s.,](?=\d{3}\b)/g, '$1').match(/\d+/g) || []);
  const manquants = chiffres(src).filter(n => !chiffres(tr).includes(n));
  if (manquants.length) return 'nombre perdu : ' + manquants.join(', ');
  const l1 = src.length, l2 = tr.length;
  if (l2 > l1 * 2.6 + 12 || l2 < l1 * 0.3 - 6) return 'longueur incohérente';
  if (langue !== 'fr' && nbMots(src) >= 4 && ASCII(src).replace(/[^a-z0-9]/g, '') === ASCII(tr).replace(/[^a-z0-9]/g, '')) return 'non traduite';
  return '';
}
const ASCII = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'");
// Ce que l'utilisateur interdit ou impose, lu par le programme (pas par l'IA) : « pas d'intro », « sans musique », « tutoie-moi »…
// Ces règles sont appliquées dans le code, l'IA ne peut donc pas les oublier.
function lireConsignes(consigne) {
  const t = ASCII(consigne);
  const NON = String.raw`(?:sans |pas (?:de |d'|du |des )|aucune? |ni |supprime |enleve |retire |ne (?:mets|mettez|fais|fait|mette|fasse)s? pas (?:de |d')?)(?:l'|la |le |les |une? |de |du |des |d')?`;
  const sans = mots => new RegExp(NON + '(?:' + mots + ')\\b').test(t);
  const r = { accroche: !sans('intro|introduction|accroche|ouverture|prologue|hook'), conclusion: !sans('conclusion|outro|appel|call to action|cta|epilogue'),
    ouverture: !sans('intro|introduction|ouverture|prologue|titre|ecran titre|generique de debut'), musique: !sans('musique|son de fond'), sousTitres: !sans('sous-?\\s?titres?'),
    adresse: /\b(tutoie|tutoyer|tutoiement|en tutoyant)/.test(t) ? 'tu' : /\b(vouvoie|vouvoyer|vouvoiement|en vouvoyant)/.test(t) ? 'vous' : '' };
  const NOMBRES = { un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12 };
  const nb = /\b(\d{1,2}|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)\s+(?:premieres?\s+)?(astuces?|conseils?|etapes?|points?|raisons?|idees?|erreurs?|secrets?|choses?|regles?|trucs?|facons?|manieres?|exemples?|faits?|methodes?|outils?|habitudes?|techniques?|questions?)\b/.exec(t);
  r.nombre = nb ? Math.max(0, Math.min(12, NOMBRES[nb[1]] || +nb[1])) : 0;
  r.libre = r.accroche && r.conclusion && r.ouverture && r.musique && r.sousTitres && !r.adresse;
  return r;
}

function creer({ BASE, FFMPEG, memoire }) { // memoire : () => texte des consignes retenues (memoire.js), ajouté à chaque demande d'écriture
  const MODELES = path.join(BASE, 'modeles'), OUTILS = path.join(BASE, 'outils');
  let MOD = MODELE, cheminModele = path.join(MODELES, MOD.fichier);
  const utiliser = id => { MOD = MODELES_IA[id] || MODELE; cheminModele = path.join(MODELES, MOD.fichier); };
  let proc = null, attente = new Map(), num = 0, installation = null;

  function processus() {
    if (proc) return proc;
    proc = fork(path.join(__dirname, 'ia-worker.js'), [], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let err = ''; proc.stderr.on('data', d => { err = (err + d).slice(-2000); });
    proc.on('message', m => { const a = attente.get(m.id); if (!a) return; attente.delete(m.id); m.ok ? a.ok(m) : a.ko(new Error(m.erreur)); });
    proc.on('exit', code => { for (const a of attente.values()) a.ko(new Error('L’IA locale s’est arrêtée' + (err ? ' : ' + err.trim().split('\n').pop() : ` (code ${code})`))); attente = new Map(); proc = null; });
    return proc;
  }
  const demander = msg => new Promise((ok, ko) => {
    const id = ++num; attente.set(id, { ok, ko });
    let mem = ''; try { mem = msg.type === 'ecrire' && msg.systeme && memoire && !msg.sansMemoire ? memoire() : ''; } catch (e) { mem = ''; }
    const m = { ...msg };
    if (m.systeme) m.systeme = m.systeme + (mem ? '\n' + mem : '') + (MOD.aucunePensee ? ' /no_think' : '');
    if (mem && m.contexte) m.contexte = Math.min(8192, m.contexte + 384); // place pour la mémoire
    processus().send({ id, ...m });
  });
  const installe = () => fs.existsSync(cheminModele);
  const etat = () => ({ installee: installe(), mo: MOD.mo, styles: Object.keys(STYLES), modeles: Object.entries(MODELES_IA).map(([id, m]) => ({ id, nom: m.nom, mo: m.mo, installe: fs.existsSync(path.join(MODELES, m.fichier)) })) });

  function installer(job, id) {
    if (id) utiliser(id);
    if (installe()) return Promise.resolve();
    if (installation) return installation;
    installation = (async () => {
      fs.mkdirSync(MODELES, { recursive: true });
      if (job) job.step = `Téléchargement de l’IA locale (≈ ${(MOD.mo / 1000).toFixed(1)} Go, une seule fois)…`;
      const part = cheminModele + '.part';
      const r = await requete(MOD.url, { dest: part, quoi: 'de modèles', onProgress: (a, t) => { if (job && t) job.progress = a / t * 0.97; } });
      if (r.taille < 5e8) { fs.rmSync(part, { force: true }); throw new Error('Téléchargement de l’IA incomplet'); }
      fs.renameSync(part, cheminModele);
    })().finally(() => { installation = null; });
    return installation;
  }

  const SQ = require('./script-qualite'), IM = require('./images');
  const REGLES = 'Tu écris pour être lu à voix haute : phrases complètes et naturelles (sujet, verbe, complément), ni listes, ni émojis, ni parenthèses. Heures, sommes et unités en toutes lettres : « 9 heures », « 5 euros ». Un français simple, précis et correct.';
  const ORDRES = c => (c ? `ORDRES DE L’UTILISATEUR (à suivre à la lettre, ils passent avant tout le reste) : ${String(c).slice(0, 600)}\n` : '');
  // jetons : ~1 pour 3 caractères en français ; contexte et réponse sont dimensionnés au plus juste
  const jetons = t => Math.ceil(String(t).length / 2.8);
  const contexteDe = (...textes) => (sortie => Math.min(8192, Math.max(1536, Math.ceil((textes.reduce((a, t) => a + jetons(t), 0) + sortie + 200) / 256) * 256)));
  let gpu = '';
  const debug = process.env.QM_IA_DEBUG ? (...a) => console.log('[IA]', ...a) : () => {};
  // Réponse coupée par la limite de longueur (JSON incomplet) : un second essai avec une marge double
  async function demanderAvecMarge({ ctx, ...msg }, sortie) {
    try { return await demander({ ...msg, maxTokens: sortie, contexte: ctx(sortie) }); }
    catch (e) { if (!/JSON|Unterminated|Unexpected/i.test(e.message)) throw e; const large = Math.min(4000, sortie * 2); return demander({ ...msg, maxTokens: large, contexte: ctx(large) }); }
  }
  // Un texte libre : écrit, nettoyé et contrôlé ; en cas de refus, réécrit plus sagement (3 essais). null si aucun essai n'est bon.
  async function texteControle({ systeme, demande, verif, maxTokens }) {
    let raison = '', dernier = '';
    for (const temperature of [0.55, 0.35, 0.2]) {
      const dem = raison ? `${demande}\n(Ta version précédente a été refusée : ${raison}. Corrige ce défaut.)` : demande;
      const t0 = Date.now(), r = await demander({ type: 'ecrire', modele: cheminModele, systeme, demande: dem, maxTokens, contexte: contexteDe(systeme, dem)(maxTokens), temperature });
      gpu = r.gpu || gpu;
      dernier = SQ.nettoyerTexte(r.resultat); raison = SQ.verifier(dernier, verif);
      debug(`essai T=${temperature} ${Math.round((Date.now() - t0) / 1000)} s ${raison ? 'REFUSÉ (' + raison + ')' : 'ok'} : ${dernier}`);
      if (!raison) return { texte: dernier, raison: '' };
    }
    return { texte: null, essai: dernier, raison };
  }
  const roleScene = (i, n, rg) => (i === 0 ? (rg.accroche ? 'C’est l’ouverture : commence par une phrase d’accroche qui donne envie de regarder. ' : 'Entre directement dans le sujet : aucune formule d’introduction (pas de « bonjour », « aujourd’hui », « dans cette vidéo »). ')
    : i === n - 1 ? (rg.conclusion ? 'C’est la fin : termine par une phrase de conclusion marquante, sans appel à s’abonner. ' : 'Termine sur le dernier point, sans conclusion ni formule de fin (pas de « en conclusion », « à bientôt »). ')
      : 'Continue naturellement, sans formule d’introduction ni de conclusion. ');
  const lienAdresse = rg => (rg.adresse === 'tu' ? ' Tu tutoies le spectateur.' : rg.adresse === 'vous' ? ' Tu vouvoies le spectateur.' : '');

  // Mots-clés d'images (objet à montrer, en français et en anglais) pour des scènes déjà écrites : un seul petit appel
  async function motsCles(titre, scenes) {
    const systeme = 'Tu choisis les images d’une vidéo : tu donnes pour chaque scène l’objet ou le lieu concret à montrer.';
    const demande = `Sujet général de la vidéo : ${titre}\nPour chaque scène ci-dessous, donne « sujet » (l’objet, le lieu ou l’action concrète à montrer, 1 à 3 mots en français, tiré du texte) et « recherche » (la même chose en 2 ou 3 mots anglais, pour une banque de photos).\n` +
      scenes.map((x, i) => `${i + 1}. ${x.texte.slice(0, 220)}`).join('\n');
    const sortie = scenes.length * 36 + 60;
    try {
      const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande, schema: SCHEMA_MOTS, ctx: contexteDe(systeme, demande), temperature: 0.2 }, sortie);
      gpu = r.gpu || gpu; const l = (r.resultat && r.resultat.scenes) || [];
      return scenes.map((x, i) => ({ sujet: String((l[i] || {}).sujet || '').slice(0, 60), recherche: String((l[i] || {}).recherche || '').slice(0, 80) }));
    } catch (e) { return scenes.map(() => ({ sujet: '', recherche: '' })); }
  }
  const completerMots = (scenes, mots) => scenes.forEach((x, i) => { const m = mots[i] || {}; x.sujet = m.sujet || IM.requeteDeScene(x.texte, 2).join(' '); x.recherche = m.recherche || ''; });

  // Avec un article : chaque paragraphe (faits de Wikipédia) est reformulé un par un, sans rien ajouter ; sinon sujet libre (plan, puis scène par scène).
  async function ecrireScript({ titre, paragraphes = [], duree, style, consigne = '', recherche = true, options = {}, contexte = '' }, job) {
    utiliser(options.qualite);
    if (!installe()) await installer(job);
    const ton = STYLES[style] || STYLES.documentaire, rg = regroupe(consigne, options), adresse = lienAdresse(rg);
    const ordres = ORDRES([String(consigne || '').slice(0, 600), consignesDe(rg)].filter(Boolean).join(' '));
    const etape = t => { if (job) job.step = t; };
    const mots = Math.round(Math.max(20, duree) * 2.6);
    if (paragraphes.length) {
      const systeme = 'Scénariste de vidéos en français. Tu reformules un texte pour la voix off sans jamais ajouter ni retirer de fait (noms, dates, chiffres, lieux). ' + REGLES + adresse;
      const scenes = []; let repris = 0;
      for (let i = 0; i < paragraphes.length; i++) {
        etape(`L’IA locale écrit la scène ${i + 1} sur ${paragraphes.length}…`); if (job) job.progress = i / (paragraphes.length + 2);
        const p = paragraphes[i], n0 = SQ.nbMots(p.texte), strict = (i === 0 && !rg.accroche) || (i === paragraphes.length - 1 && !rg.conclusion);
        const demande = `${ordres}Sujet : ${titre}. Ton : ${ton}.\nTexte source :\n${p.texte}\n\nRéécris ce texte pour la voix off : mêmes faits, mêmes noms, mêmes dates, environ ${n0} mots, phrases complètes et fluides. N’ajoute aucune information. ${roleScene(i, paragraphes.length, rg)}Réponds uniquement par le texte à dire.`;
        const r = await texteControle({ systeme, demande, maxTokens: Math.ceil(n0 * 3 + 60), verif: { min: Math.max(6, Math.round(n0 * 0.7)), max: Math.round(n0 * (strict ? 1.2 : 1.45)) + 4, source: p.texte + ' ' + titre,
          interdireOuverture: i === 0 && !rg.accroche, interdireFin: i === paragraphes.length - 1 && !rg.conclusion, interdits: rg.eviter } });
        if (!r.texte) repris++;
        scenes.push({ section: String(p.section || '').slice(0, 40), texte: r.texte || p.texte, repris: !r.texte });
      }
      const phrase = async (demande, max, source) => { const r = await texteControle({ systeme: 'Scénariste de vidéos en français. ' + REGLES + adresse, demande, maxTokens: max * 3, verif: { min: 5, max, source: `${titre} ${consigne} ${source}`, interdits: rg.eviter } }); return r.texte || ''; };
      if (rg.accroche) { etape('L’IA locale écrit l’accroche…'); const t = await phrase(`${ordres}Début du texte de la vidéo sur « ${titre} » :\n« ${scenes[0].texte} »\nÉcris UNE seule phrase d’accroche (une question ou une affirmation intrigante, 12 à 20 mots) qui donne envie de regarder la suite, fondée uniquement sur ce texte. Réponds uniquement par la phrase.`, 28, scenes[0].texte); if (t) scenes[0].texte = t + ' ' + scenes[0].texte; }
      if (rg.conclusion) { etape('L’IA locale écrit la conclusion…'); const fin = scenes[scenes.length - 1].texte, t = await phrase(`${ordres}Fin du texte de la vidéo sur « ${titre} » :\n« ${fin} »\nÉcris UNE seule phrase de conclusion (12 à 20 mots) qui reprend l’idée finale, sans fait nouveau, sans appel à s’abonner. Réponds uniquement par la phrase.`, 30, fin); if (t) scenes[scenes.length - 1].texte += ' ' + t; }
      if (recherche) { etape('L’IA locale choisit les images…'); completerMots(scenes, await motsCles(titre, scenes)); } else completerMots(scenes, []);
      if (rg.cta) scenes[scenes.length - 1].texte += ' ' + rg.cta.replace(/([^.!?…])$/, '$1.');
      return { titre: String(titre).slice(0, 80), gpu, scenes, repris, regles: rg };
    }
    // sujet libre : 1) plan de la vidéo, 2) chaque scène écrite à son tour avec le plan et la scène précédente sous les yeux
    const n = rg.nbScenes || Math.max(3, Math.min(14, Math.round(duree / 8)));
    etape('L’IA locale prépare le plan de la vidéo…');
    const structure = rg.nombre && rg.nombre === n ? ` Chaque scène est UN des ${n} points demandés, dans l’ordre${rg.accroche ? ' ; la première scène commence par une phrase d’accroche' : ''}${rg.conclusion ? ' ; la dernière se termine par une phrase de conclusion' : ''}.`
      : rg.accroche && rg.conclusion ? ' La première scène est l’ouverture (accroche) et la dernière la conclusion.' : rg.accroche ? ' La première scène est l’ouverture (accroche) ; pas de conclusion.' : rg.conclusion ? ' Pas d’introduction : la première scène entre directement dans le sujet ; la dernière est la conclusion.' : ' Ni introduction ni conclusion : chaque scène apporte un point précis.';
    const sysPlan = 'Scénariste de vidéos courtes en français. Tu construis des plans concrets et précis, sans généralités. Tu n’inventes aucun nom de personne, d’entreprise ou de lieu, ni aucun chiffre ou date.' + adresse;
    const faitsWiki = String(contexte || '').slice(0, 2800);
    const demPlan = `${ordres}Sujet de la vidéo : ${titre}\nTon : ${ton}.\n${faitsWiki ? `Faits vérifiés (Wikipédia), à utiliser en priorité ; n’en ajoute aucun autre :\n${faitsWiki}\n` : ''}Écris le plan de ${n} scènes qui se suivent logiquement.${structure}\nPour chaque scène : « section » (titre de partie, 2 à 4 mots), « idee » (UNE phrase : ce que la scène explique, concrète), « sujet » (ce qu’on PHOTOGRAPHIERAIT : un objet ou une scène concrète, 1 à 3 mots en français, ex. « casque de vélo », « piste cyclable » ; jamais une idée abstraite), « recherche » (le même sujet en 2 ou 3 mots anglais pour une banque de photos). « titre » : titre accrocheur de 8 mots maximum.\nExemple de bonne scène pour « 3 astuces pour économiser l’eau » : section « Douche courte », idee « Une douche de cinq minutes consomme bien moins d’eau qu’un bain. », sujet « pommeau de douche », recherche « shower head ». Les conseils doivent être concrets, courants et vérifiables ; n’invente aucune règle ni aucune loi.`;
    const rp = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme: sysPlan, demande: demPlan, schema: SCHEMA_PLAN(n), ctx: contexteDe(sysPlan, demPlan), temperature: 0.45 }, n * 150 + 100); // assez pour les longueurs maximales du schéma
    gpu = rp.gpu || gpu;
    const plan = ((rp.resultat && rp.resultat.scenes) || []).filter(x => String(x.idee || '').trim().length > 8);
    if (!plan.length) throw new Error('L’IA n’a pas réussi à préparer un plan : réessaie ou précise ton sujet.');
    const garde = /\d/.test(titre + ' ' + consigne);
    const titreVideo = String((rp.resultat && rp.resultat.titre) || titre).replace(garde ? /$^/ : /\d+/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([?!:;,.])/g, '$1').trim().slice(0, 80) || titre;
    const sourcePlan = [titre, consigne, faitsWiki, ...plan.map(x => `${x.section} ${x.idee} ${x.sujet}`)].join(' ');
    const systeme = 'Scénariste de vidéos en français. ' + REGLES + ' Tu n’inventes aucun chiffre, date, prix, citation ni nom propre absent du plan ; jamais de promesse ni d’avis médical, juridique ou financier.' + adresse;
    const ecrites = [], par = Math.round(mots / plan.length);
    for (let i = 0; i < plan.length; i++) {
      etape(`L’IA locale écrit la scène ${i + 1} sur ${plan.length}…`); if (job) job.progress = (i + 1) / (plan.length + 2);
      const demande = `${ordres}Vidéo : « ${titreVideo} ». Ton : ${ton}.\n${faitsWiki ? `Faits vérifiés : ${faitsWiki.slice(0, 1400)}\n` : ''}Plan : ${plan.map((x, k) => `${k + 1}. ${x.idee}`).join(' ')}\n${ecrites.length ? `Texte déjà écrit : ${ecrites.slice(-2).join(' ')}\n` : ''}` +
        `Écris maintenant la scène ${i + 1} sur ${plan.length} : « ${plan[i].idee} ». ${roleScene(i, plan.length, rg)}2 ou 3 phrases complètes, environ ${par} mots, qui continuent ce qui précède sans le répéter. Donne un conseil concret, courant et vérifiable ; si tu n’es pas certain d’un point, reste général et prudent. Réponds uniquement par le texte à dire à voix haute.`;
      const r = await texteControle({ systeme, demande, maxTokens: Math.ceil(par * 3 + 80), verif: { min: Math.max(8, Math.round(par * 0.5)), max: Math.round(par * 1.8) + 6, source: sourcePlan,
        interdireOuverture: i === 0 ? !rg.accroche : true, interdireFin: i === plan.length - 1 ? !rg.conclusion : true, interdits: rg.eviter } });
      ecrites.push(r.texte || (/[.!?…]$/.test(plan[i].idee.trim()) ? plan[i].idee.trim() : plan[i].idee.trim() + '.'));
    }
    const scenes = plan.map((x, i) => ({ section: String(x.section || '').slice(0, 40), texte: ecrites[i], sujet: String(x.sujet || '').slice(0, 60), recherche: String(x.recherche || '').slice(0, 80) }));
    if (rg.cta) scenes[scenes.length - 1].texte += ' ' + rg.cta.replace(/([^.!?…])$/, '$1.');
    return { titre: titreVideo, gpu, scenes, regles: rg };
  }
  // Une scène réécrite selon une consigne précise (bouton « Réécrire » de l'interface)
  async function reecrireScene({ texte, instruction = '', titre = '', style = '', qualite = '' }) {
    utiliser(qualite);
    if (!installe()) await installer(null);
    const n0 = SQ.nbMots(texte), ton = STYLES[style] || STYLES.documentaire;
    const systeme = 'Scénariste de vidéos en français. ' + REGLES + ' Tu ne rajoutes aucun chiffre, date ni nom propre absent du texte ou de la consigne.';
    const demande = `${ORDRES(instruction || 'améliore ce texte : plus clair, plus vivant, mieux enchaîné')}Vidéo : « ${titre} ». Ton : ${ton}.\nTexte à réécrire : ${texte}\nGarde les mêmes faits. Longueur voisine de ${n0} mots sauf si la consigne en demande une autre. Réponds uniquement par le nouveau texte.`;
    const r = await texteControle({ systeme, demande, maxTokens: Math.ceil(n0 * 4 + 80), verif: { min: 4, max: Math.round(n0 * 2) + 12, source: `${texte} ${titre} ${instruction}` } });
    if (!r.texte) throw new Error('L’IA n’a pas réussi à réécrire cette scène : reformule ta consigne ou modifie le texte à la main.');
    return { texte: r.texte, gpu };
  }

  // Traduction des sous-titres : lignes envoyées par lots de 10 (avec les lignes précédentes pour le sens), chaque ligne contrôlée
  // (nombres gardés, longueur cohérente, vraiment traduite) ; une ligne refusée est retraduite seule. Les heures ne changent pas.
  async function traduire({ lignes = [], langue = 'it' }, job) {
    const L = LANGUES[langue]; if (!L) throw new Error('Langue de traduction inconnue.');
    utiliser('');
    if (!installe()) await installer(job);
    const src = lignes.map(x => String(x || '').replace(/\s+/g, ' ').trim().slice(0, 300)), out = src.map(() => ''), n = src.length, TAILLE = 10;
    const etape = (t, p) => { if (job) { job.step = t; job.progress = p; } };
    const vers = (/^[aeiouy]/.test(L.nom) ? 'l’' : 'le ') + L.nom;
    const systeme = `Tu es un traducteur professionnel de sous-titres vidéo. Tu traduis vers ${vers} (${L.en}) de façon naturelle et fidèle, comme un sous-titreur : même sens, même ton, phrases courtes et parlées. Tu ne rajoutes rien, tu ne résumes rien, tu ne commentes rien. Tu gardes tels quels les noms propres, les marques, les nombres et les chiffres.`;
    for (let i = 0; i < n; i += TAILLE) {
      const lot = src.slice(i, i + TAILLE); if (!lot.some(Boolean)) continue;
      etape(`Traduction en ${L.nom} : lignes ${i + 1} à ${Math.min(n, i + TAILLE)} sur ${n}…`, i / n * 0.9);
      const avant = src.slice(Math.max(0, i - 3), i).filter(Boolean).join(' ');
      const demande = `${avant ? `Ce qui est dit juste avant (pour le sens, ne pas le traduire) : ${avant}\n` : ''}Traduis en ${L.nom} chacune de ces ${lot.length} lignes de sous-titres, dans le même ordre : une traduction par ligne. Une ligne peut être un morceau de phrase : traduis-la telle quelle, sans la compléter ni la fusionner avec la suivante.\n${lot.map((t, k) => `${k + 1}. ${t || '…'}`).join('\n')}`;
      const schema = { type: 'object', properties: { lignes: { type: 'array', minItems: lot.length, maxItems: lot.length, items: { type: 'string', maxLength: 420 } } }, required: ['lignes'] };
      let l = [];
      try { const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande, schema, ctx: contexteDe(systeme, demande), temperature: 0.2, sansMemoire: true }, Math.ceil(jetons(lot.join(' ')) * 1.8) + 40 * lot.length); gpu = r.gpu || gpu; l = (r.resultat && r.resultat.lignes) || []; }
      catch (e) { debug('lot refusé', e.message); }
      lot.forEach((t, k) => { const tr = nettoyerTraduction(l[k]); const raison = controleTraduction(t, tr, langue); if (!raison) out[i + k] = tr; else debug(`ligne ${i + k + 1} refusée (${raison}) : ${t} → ${tr}`); });
    }
    // lignes refusées : retraduites une par une, plus sagement ; à défaut la meilleure proposition est gardée et comptée
    let echecs = 0;
    const reste = src.map((t, k) => k).filter(k => src[k] && !out[k]);
    for (const [m, k] of reste.entries()) {
      etape(`Traduction en ${L.nom} : vérification de ${reste.length} ligne${reste.length > 1 ? 's' : ''}…`, 0.9 + m / reste.length * 0.1);
      let meilleur = '';
      for (const temperature of [0.1, 0.35]) {
        const demande = `${k ? `Contexte : ${src[k - 1]}\n` : ''}Traduis en ${L.nom} cette ligne de sous-titre, sans rien ajouter. Réponds uniquement par la traduction.\n${src[k]}`;
        try { const r = await demander({ type: 'ecrire', modele: cheminModele, systeme, demande, maxTokens: jetons(src[k]) * 3 + 30, contexte: contexteDe(systeme, demande)(jetons(src[k]) * 3 + 30), temperature, sansMemoire: true });
          const tr = nettoyerTraduction(r.resultat); if (!controleTraduction(src[k], tr, langue)) { out[k] = tr; break; } meilleur = meilleur || tr; } catch (e) { debug('ligne refusée', e.message); }
      }
      if (!out[k]) { echecs++; out[k] = meilleur || src[k]; }
    }
    return { lignes: out, echecs, langue, gpu };
  }

  // Assistant de montage : une demande que les règles d'assistant.js n'ont pas comprise → actions connues (jamais d'action inventée)
  async function comprendreDemande(texte) {
    const AS = require('./assistant'), ids = Object.keys(AS.ACTIONS);
    utiliser('');
    if (!installe()) throw new Error('L’IA locale n’est pas encore installée : ouvre « Générer » une fois pour l’installer, ou écris une demande plus simple (« coupe les blancs », « ajoute une musique calme »).');
    const systeme = 'Tu es l’assistant d’un logiciel de montage vidéo. Tu traduis la demande de l’utilisateur en actions de la liste fournie, sans jamais en inventer.';
    const demande = `Actions possibles :\n${ids.map(id => `- ${id} : ${AS.ACTIONS[id]}`).join('\n')}\nParamètres : format = vertical, horizontal ou carre ; musique = ambiance en un mot ; vitesse = nombre (0.5, 2…) ; transitions = fade, slideleft, zoomin ou fadeblack ; dynamiser = 110 à 140 ; titre = texte du titre ; sous_titres = tiktok ou rien ; traduire_sous = italien, anglais, espagnol, allemand, portugais ou français ; publication = YouTube, TikTok ou Instagram ; couleur_titre = couleur en un mot (jaune, rouge…).\nDemande : ${String(texte).slice(0, 500)}\nDonne les actions demandées, dans l’ordre (aucune si rien ne correspond).`;
    const schema = { type: 'object', properties: { actions: { type: 'array', maxItems: 8, items: { type: 'object', properties: { action: { enum: ids }, parametre: { type: 'string' } }, required: ['action', 'parametre'] } } }, required: ['actions'] };
    const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande, schema, ctx: contexteDe(systeme, demande), temperature: 0.1 }, 260);
    const vus = new Set();
    return ((r.resultat && r.resultat.actions) || []).filter(a => ids.includes(a.action) && !vus.has(a.action) && vus.add(a.action))
      .map(a => ({ action: a.action, parametre: String(a.parametre || '').slice(0, 60), libelle: AS.ACTIONS[a.action] + (a.parametre ? ` (${String(a.parametre).slice(0, 60)})` : '') }));
  }
  // Textes de publication (3 titres, description, hashtags) tirés du texte de la vidéo et de ce que l'analyse en a compris
  // (sujet, résumé, mots-clés) ; pour YouTube, les chapitres sont ajoutés tels quels à la fin de la description (par le programme).
  // Sans IA installée, repli simple (sujet et résumé de l'analyse, hashtags fréquents).
  async function textesPublication({ texte = '', plateforme = '', titre = '', analyse = {}, chapitres = [] }) {
    const AS = require('./assistant'), base = String(texte || titre || analyse.resume || analyse.sujet || '').slice(0, 3000);
    const cles = (analyse.motsCles || []).map(m => '#' + AS.sansAccents(m).replace(/[^a-z0-9]+/g, '')).filter(h => h.length > 2);
    const avecChapitres = d => (chapitres.length >= 3 ? `${d}\n\nChapitres :\n${chapitres.join('\n')}` : d);
    const repli = () => ({ titres: [titre || analyse.sujet || base.split(/[.!?]/)[0].slice(0, 70)].filter(Boolean),
      description: avecChapitres(analyse.resume || base.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').slice(0, 300)),
      hashtags: [...new Set([...cles, ...AS.hashtagsSimples(`${titre} ${analyse.sujet || ''} ${base}`, 8)])].slice(0, 10), ia: false });
    utiliser('');
    if (!installe() || !base.trim()) return repli();
    const pf = plateforme || 'les réseaux sociaux';
    const compris = analyse.sujet ? `Sujet de la vidéo : ${analyse.sujet}\n${analyse.resume ? `Résumé : ${analyse.resume}\n` : ''}${(analyse.points || []).length ? `Idées fortes : ${analyse.points.join(' ; ')}\n` : ''}${(analyse.motsCles || []).length ? `Mots-clés : ${analyse.motsCles.join(', ')}\n` : ''}` : '';
    const systeme = 'Tu rédiges les textes de publication de vidéos en français, sans rien inventer : uniquement à partir du contenu fourni. Aucun émoji superflu, aucune promesse.';
    const demande = `Plateforme : ${pf}.\n${titre ? `Titre de travail : ${titre}\n` : ''}${compris}Contenu de la vidéo :\n${base}\n\nÉcris : « titres » (3 titres différents, 70 caractères maximum, accrocheurs mais fidèles${analyse.sujet ? ', centrés sur le sujet' : ''}), « description » (2 ou 3 phrases, ${/tiktok|instagram/i.test(pf) ? 'courte et directe' : 'claire, avec les mots-clés du sujet'}), « hashtags » (6 à 10 mots-clés en minuscules, sans le #).`;
    const schema = { type: 'object', properties: { titres: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 100 } }, description: { type: 'string', maxLength: 600 }, hashtags: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 30 } } }, required: ['titres', 'description', 'hashtags'] };
    try {
      const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande, schema, ctx: contexteDe(systeme, demande), temperature: 0.5 }, 600);
      const o = r.resultat || {};
      const tags = (o.hashtags || []).map(h => '#' + AS.sansAccents(h).replace(/[^a-z0-9]+/g, '')).filter(h => h.length > 2);
      return { titres: (o.titres || []).map(x => SQ.nettoyerTexte(x).slice(0, 100)).filter(Boolean), description: avecChapitres(SQ.nettoyerTexte(o.description || '').slice(0, 1000)), hashtags: [...new Set([...tags, ...cles])].slice(0, 10), ia: true };
    } catch (e) { return repli(); }
  }

  // Titres de chapitres : l'IA nomme chaque partie à partir de son texte ; sans IA, les titres proposés par le programme sont gardés
  async function titrerChapitres({ chapitres = [], sujet = '', motsCles = [] }) {
    const garde = chapitres.map(c => ({ ...c }));
    utiliser('');
    if (!installe() || !garde.length) return { chapitres: garde, ia: false };
    const CH = require('./chapitrage');
    const systeme = 'Tu nommes et résumes les chapitres d’une vidéo en français, uniquement à partir du texte de chaque partie. Titres courts (2 à 5 mots), précis, sans point final, sans guillemets, sans numéro. Résumés d’une phrase (25 mots au plus) qui disent ce qu’on apprend dans la partie. Tu n’inventes rien.';
    const demande = (sujet ? `Sujet général de la vidéo : ${String(sujet).slice(0, 200)}\n${motsCles.length ? `Mots-clés de la vidéo : ${motsCles.slice(0, 6).join(', ')}\n` : ''}Les titres doivent rester dans ce sujet.\n\n` : '') + garde.map((c, i) => `Partie ${i + 1} (${c.titre}) : ${String(c.texte || '').slice(0, 600)}`).join('\n\n') + `\n\nDonne exactement ${garde.length} chapitres (titre et résumé), dans l’ordre. La première partie est l’introduction si elle présente la vidéo ; la dernière est la conclusion si elle conclut.`;
    const schema = { type: 'object', properties: { chapitres: { type: 'array', minItems: garde.length, maxItems: garde.length, items: { type: 'object', properties: { titre: { type: 'string', maxLength: 60 }, resume: { type: 'string', maxLength: 220 } }, required: ['titre', 'resume'] } } }, required: ['chapitres'] };
    try {
      const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande, schema, ctx: contexteDe(systeme, demande), temperature: 0.3 }, garde.length * 120 + 60);
      const l = (r.resultat && r.resultat.chapitres) || [];
      const t = l.map(x => SQ.nettoyerTexte(x && x.titre).replace(/[.:;,!]+$/, '').slice(0, 60));
      if (t.length === garde.length && t.every(x => x.length >= 3)) {
        // résumé gardé seulement s'il reprend ce qui est dit dans la partie ; sinon la phrase clé choisie par le programme
        return { chapitres: garde.map((c, i) => { const res = SQ.nettoyerTexte(l[i].resume || '').slice(0, 220); return { ...c, titre: t[i], resume: res.length >= 15 && CH.ancrage(res, [{ t: c.texte || '' }]) >= 0.5 ? res : c.resume }; }), ia: true };
      }
    } catch (e) { /* titres du programme gardés */ }
    return { chapitres: garde, ia: false };
  }

  // Titres d'écran des épisodes QuentInvest : l'idée principale d'une phrase trop longue pour un écran, en quelques mots (relecture-ecrans.js
  // contrôle chaque titre : rien d'ajouté à la phrase). Un seul appel pour tout l'épisode ; null pour un titre manquant.
  // chiffres : légendes écrites sous un grand chiffre (ce qu'il mesure, sans répéter la phrase)
  async function titrerEcrans({ phrases = [], sujet = '', chiffres = null }) {
    utiliser('');
    if (!installe() || !phrases.length) return { titres: phrases.map(() => null), ia: false };
    const systeme = chiffres
      ? 'Tu écris la légende affichée sous un grand chiffre dans une vidéo d’économie en français : ce que mesure ce chiffre, en 3 à 8 mots clairs (par exemple « Hausse du cours en deux semaines »), sans répéter le chiffre, sans point final, sans guillemets, sans points de suspension. Tu reprends les mots de la phrase ; tu n’ajoutes aucun autre chiffre, aucun nom, aucune date, aucun fait.'
      : 'Tu écris le titre affiché à l’écran pour chaque phrase d’une vidéo d’économie en français : l’idée principale en 3 à 9 mots, une phrase complète et claire, sans point final, sans guillemets, sans points de suspension. Tu reprends les mots de la phrase ; tu n’ajoutes aucun chiffre, aucun nom, aucune date, aucun fait.';
    const demande = (sujet ? `Sujet de la vidéo : ${String(sujet).slice(0, 160)}\n\n` : '') + phrases.map((p, i) => `Phrase ${i + 1}${chiffres && chiffres[i] ? ` (chiffre affiché : ${chiffres[i]})` : ''} : ${String(p).slice(0, 400)}`).join('\n') + `\n\nDonne exactement ${phrases.length} ${chiffres ? 'légendes' : 'titres'}, dans l’ordre.`;
    const schema = { type: 'object', properties: { titres: { type: 'array', minItems: phrases.length, maxItems: phrases.length, items: { type: 'string', maxLength: 80 } } }, required: ['titres'] };
    try {
      const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande, schema, ctx: contexteDe(systeme, demande), temperature: 0.3 }, phrases.length * 40 + 60);
      const l = (r.resultat && r.resultat.titres) || [];
      return { titres: phrases.map((_, i) => (typeof l[i] === 'string' ? SQ.nettoyerTexte(l[i]).replace(/[.:;,]+$/, '').trim() : null)), ia: true };
    } catch (e) { return { titres: phrases.map(() => null), ia: false }; }
  }

  // Retour du propriétaire sur un écran d'épisode QuentInvest : l'IA réécrit les textes de cet écran seulement (retour-ecran.js contrôle le résultat)
  async function retoucherEcran({ type = '', champs = {}, points = null, phrase = '', demande = '', sujet = '' }) {
    utiliser('');
    if (!installe()) return { ia: false };
    const cles = Object.keys(champs).filter(k => k !== 'source');
    const systeme = 'Tu corriges les textes affichés sur un écran de vidéo d’économie en français, selon la demande du monteur. Textes courts et clairs, sans point final, sans guillemets, sans points de suspension. Tu reprends les mots de la phrase dite ; tu n’ajoutes aucun chiffre, aucun nom, aucune date, aucun fait. Un champ peut être laissé vide si la demande le veut.';
    const demandeIA = `${sujet ? `Sujet de la vidéo : ${String(sujet).slice(0, 160)}\n` : ''}Phrase dite pendant l’écran : ${String(phrase).slice(0, 500)}\nÉcran (${type || 'message'}) :\n${cles.map(k => `- ${k} : ${String(champs[k]).slice(0, 300)}`).join('\n')}${points ? `\n- points : ${points.join(' | ')}` : ''}\n\nDemande du monteur : ${String(demande).slice(0, 400)}\n\nDonne les nouveaux textes de l’écran.`;
    const props = Object.fromEntries(cles.map(k => [k, { type: 'string', maxLength: 160 }])); if (points) props.points = { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 80 } };
    const schema = { type: 'object', properties: props, required: Object.keys(props) };
    try {
      const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande: demandeIA, schema, ctx: contexteDe(systeme, demandeIA), temperature: 0.3 }, 260);
      return { ia: true, ecran: r.resultat || {} };
    } catch (e) { return { ia: false }; }
  }

  // Analyse de la vidéo : l'IA lit des extraits datés de toute la vidéo (une part par minute environ, jusqu'à 10) et résume le sujet,
  // le public, les idées fortes (avec leur moment), les mots-clés et le genre (choisi dans la liste du programme).
  // Elle ne fait que décrire ce qui est dit : chaque phrase est comparée au texte de la vidéo (ancrage) et ce qui n'y est pas est écarté ;
  // l'analyse du programme (genre, mots-clés) lui sert de repère et de repli.
  async function analyserVideo({ segments = [], base = null, duree = 0 }) {
    utiliser('');
    const CH = require('./chapitrage'), texte = segments.map(s => String(s.t || '').trim()).filter(Boolean);
    const repli = { sujet: base ? base.sujet : '', resume: '', points: [], moments: [], motsCles: [], public: '', genre: '', ia: false };
    if (!installe() || texte.length < 4) return repli;
    const extrait = CH.echantillon(segments, duree, 4200), ids = CH.GENRES.map(g => g.id);
    const systeme = 'Tu analyses une vidéo en français à partir de ce qui y est dit (extraits datés [minutes:secondes] pris sur toute la durée). Tu décris le sujet, le public visé et les idées fortes, sans rien inventer qui ne soit pas dans le texte.';
    const reperes = base ? `Repères du programme (à vérifier, pas forcément justes) : genre probable « ${base.genre.nom} »${base.motsCles.length ? `, mots fréquents : ${base.motsCles.join(', ')}` : ''}.\n` : '';
    const demande = `${reperes}Texte de la vidéo (extraits datés) :\n${extrait}\n\nDonne :\n- le sujet en une phrase courte et précise (ce dont parle vraiment la vidéo, sans « cette vidéo parle de »),\n- le public visé en quelques mots,\n- un résumé de 2 phrases,\n- 3 à 6 idées fortes (4 à 10 mots chacune), chacune avec le moment [mm:ss] de l’extrait où elle est dite,\n- 3 à 6 mots-clés tirés du texte,\n- le genre parmi : ${ids.join(', ')}, general.`;
    const schema = { type: 'object', properties: { sujet: { type: 'string' }, public: { type: 'string' }, resume: { type: 'string' },
      points: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'object', properties: { idee: { type: 'string' }, moment: { type: 'string' } }, required: ['idee', 'moment'] } },
      motsCles: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string' } }, genre: { type: 'string', enum: [...ids, 'general'] } }, required: ['sujet', 'resume', 'points', 'motsCles', 'genre'] };
    try {
      const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande, schema, ctx: contexteDe(systeme, demande), temperature: 0.2 }, 520);
      const x = r.resultat || {}, net = (t, m) => SQ.nettoyerTexte(t).slice(0, m), ancre = t => CH.ancrage(t, segments);
      const D = Math.max(+duree || 0, ...segments.map(s => +s.e || 0)), temps = m => { const k = /(\d{1,3})\s*[:h]\s*(\d{1,2})/.exec(String(m || '')); return k ? Math.min(D, +k[1] * 60 + +k[2]) : null; };
      let sujet = net(x.sujet, 140).replace(/^(cette |la )?vid[ée]o (parle|traite|porte) (de |du |des |d’|d'|sur )/i, ''); sujet = sujet.charAt(0).toUpperCase() + sujet.slice(1);
      if (sujet.length < 6) return repli;
      if (ancre(sujet) < 0.2 && base && base.sujet) sujet = base.sujet; // sujet sans rapport avec ce qui est dit : celui du programme
      const pts = (x.points || []).map(p => ({ idee: net(p && p.idee, 90), t: temps(p && p.moment) })).filter(p => p.idee.length >= 4 && ancre(p.idee) >= 0.3).slice(0, 6);
      const cles = (x.motsCles || []).map(m => net(m, 40).toLowerCase()).filter(m => m.length >= 3 && ancre(m) > 0).slice(0, 6);
      return { sujet, public: net(x.public, 80), resume: net(x.resume, 380), points: pts.map(p => p.idee), moments: pts.filter(p => p.t != null).map(p => ({ t: p.t, idee: p.idee })),
        motsCles: cles, genre: ids.includes(x.genre) ? x.genre : '', ia: true };
    } catch (e) { /* analyse du programme gardée */ }
    return repli;
  }
  // Clipping : parmi des extraits candidats (calculés par le programme), l'IA choisit les plus accrocheurs pour TikTok et écrit leur titre.
  // Elle ne choisit que des numéros de la liste et ne peut ni modifier ni inventer un extrait.
  async function choisirExtraits({ candidats = [], nb = 5, sujet = '', idees = [] }) {
    utiliser('');
    const garde = candidats.slice(0, 14);
    if (!installe() || garde.length <= 1) return { extraits: candidats.slice(0, nb), ia: false };
    const systeme = 'Tu choisis les meilleurs extraits d’une vidéo pour TikTok, en français. Un bon extrait donne envie de regarder jusqu’au bout dès la première phrase, se comprend seul, et se termine sur une idée complète.';
    const demande = `${sujet ? `Sujet de la vidéo : ${String(sujet).slice(0, 120)}\n` : ''}${idees.length ? `Idées fortes de la vidéo (à privilégier) : ${idees.slice(0, 6).join(' ; ')}\n` : ''}Extraits possibles :\n${garde.map((c, i) => `${i + 1}. (${Math.round(c.e - c.s)} s) ${String(c.t).slice(0, 380)}`).join('\n')}\n\nChoisis les ${Math.min(nb, garde.length)} meilleurs extraits (numéros différents) et écris pour chacun un titre d’accroche de 8 mots maximum, fidèle au contenu, sans émoji.`;
    const schema = { type: 'object', properties: { choix: { type: 'array', minItems: 1, maxItems: nb, items: { type: 'object', properties: { numero: { type: 'integer' }, titre: { type: 'string' } }, required: ['numero', 'titre'] } } }, required: ['choix'] };
    try {
      const r = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme, demande, schema, ctx: contexteDe(systeme, demande), temperature: 0.3 }, nb * 40 + 80);
      const vus = new Set(), sortie = [];
      for (const c of (r.resultat && r.resultat.choix) || []) {
        const e = garde[(+c.numero || 0) - 1]; if (!e || vus.has(c.numero)) continue; vus.add(c.numero);
        const t = SQ.nettoyerTexte(c.titre).replace(/[.]+$/, '').slice(0, 70);
        sortie.push({ ...e, titre: t.length >= 4 ? t : e.titre });
      }
      if (sortie.length) return { extraits: sortie.sort((a, b) => a.s - b.s).slice(0, nb), ia: true };
    } catch (e) { /* classement du programme gardé */ }
    return { extraits: candidats.slice(0, nb), ia: false };
  }

  // ---------- Téléchargement depuis un lien (YouTube, TikTok, Instagram, Facebook, X…) ----------
  const YTDLP = path.join(OUTILS, process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp_linux');
  async function outilTelechargement(job) {
    if (fs.existsSync(YTDLP)) return;
    fs.mkdirSync(OUTILS, { recursive: true });
    if (job) job.step = 'Installation de l’outil de téléchargement (une seule fois)…';
    await requete(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${path.basename(YTDLP)}`, { dest: YTDLP + '.part', quoi: 'd’outils' });
    fs.chmodSync(YTDLP + '.part', 0o755); fs.renameSync(YTDLP + '.part', YTDLP);
    if (process.platform === 'darwin') await new Promise(ok => execFile('xattr', ['-d', 'com.apple.quarantine', YTDLP], () => ok()));
  }
  async function telecharger(lien, dossier, job) {
    if (!/^https?:\/\/\S+$/i.test(String(lien || '').trim())) throw new Error('Colle un lien qui commence par https://');
    await outilTelechargement(job);
    // mise à jour silencieuse de l'outil au plus une fois par semaine (les sites changent souvent)
    try { if (Date.now() - fs.statSync(YTDLP).mtimeMs > 7 * 864e5) await new Promise(ok => execFile(YTDLP, ['-U'], () => { fs.utimesSync(YTDLP, new Date(), new Date()); ok(); })); } catch (e) { /* on garde la version installée */ }
    job.step = 'Téléchargement de la vidéo…';
    const args = ['--no-playlist', '--newline', '--no-mtime', '--restrict-filenames', '-f', 'bv*[vcodec^=avc1][height<=2160]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b', '--merge-output-format', 'mp4',
      '--ffmpeg-location', FFMPEG, '-o', path.join(dossier, 'lien-%(title).60s-%(id)s.%(ext)s'), '--print', 'after_move:filepath', lien.trim()];
    return new Promise((ok, ko) => {
      const p = spawn(YTDLP, args); let sortie = '', err = '';
      p.stdout.on('data', d => { const t = String(d); sortie += t; const m = [...t.matchAll(/\[download\]\s+([\d.]+)%/g)].pop(); if (m) job.progress = Math.min(0.98, +m[1] / 100); });
      p.stderr.on('data', d => { err = (err + d).slice(-3000); });
      p.on('error', e => ko(e));
      p.on('close', code => {
        const f = sortie.split('\n').map(x => x.trim()).filter(x => x.startsWith('/') || /^[A-Z]:\\/.test(x)).pop();
        if (code === 0 && f && fs.existsSync(f)) return ok({ file: path.basename(f) });
        const e = (err.split('\n').filter(l => /ERROR/.test(l)).pop() || err.trim().split('\n').pop() || '').replace(/^ERROR:\s*/, '');
        ko(new Error(/login|cookies|private|sign in/i.test(e) ? 'Cette vidéo est privée ou demande une connexion : elle ne peut pas être téléchargée.' : `Téléchargement impossible : ${e.slice(0, 200)}`));
      });
    });
  }

  const arreter = () => { if (proc) proc.kill(); };
  return { etat, installer, ecrireScript, reecrireScene, traduire, comprendreDemande, textesPublication, titrerChapitres, titrerEcrans, retoucherEcran, analyserVideo, choisirExtraits, telecharger, arreter };
}

module.exports = { creer, STYLES, MODELE, lireConsignes, regroupe, TYPES, PUBLICS, TONS, RYTHMES, LANGUES, controleTraduction, nettoyerTraduction };
