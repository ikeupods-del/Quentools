// QuentMovie : IA locale du générateur (Qwen3 4B Instruct, licence Apache 2.0, ~2,5 Go téléchargés une fois)
// et téléchargement de vidéos depuis un lien (yt-dlp, installé au premier usage).
'use strict';
const fs = require('fs');
const path = require('path');
const { fork, spawn, execFile } = require('child_process');
const { requete } = require('./maj');

const MODELE = { fichier: 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf', url: 'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf', mo: 2500 };
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
  rg.nbScenes = Math.max(0, Math.min(14, Math.round(+opt.scenes || 0)));
  rg.libre = rg.libre && !rg.eviter.length && !rg.inclure.length && !rg.cta && rg.type === 'libre' && !rg.public && rg.ton === 'neutre' && rg.rythme === 'normal' && !rg.nbScenes;
  return rg;
}
const consignesDe = rg => [TYPES[rg.type], rg.public ? `Public visé : ${PUBLICS[rg.public]}.` : '', TONS[rg.ton], RYTHMES[rg.rythme], rg.inclure.length ? `Utilise naturellement ces mots ou expressions : ${rg.inclure.join(', ')}.` : '',
  rg.eviter.length ? `N’emploie JAMAIS ces mots ou expressions : ${rg.eviter.join(', ')}.` : ''].filter(Boolean).join(' ');
const SCHEMA_PLAN = n => ({ type: 'object', properties: { titre: { type: 'string' }, scenes: { type: 'array', minItems: n, maxItems: n, items: { type: 'object', properties: { section: { type: 'string' }, idee: { type: 'string' }, sujet: { type: 'string' }, recherche: { type: 'string' } }, required: ['section', 'idee', 'sujet', 'recherche'] } } }, required: ['titre', 'scenes'] });
const SCHEMA_MOTS = { type: 'object', properties: { scenes: { type: 'array', items: { type: 'object', properties: { sujet: { type: 'string' }, recherche: { type: 'string' } }, required: ['sujet', 'recherche'] } } }, required: ['scenes'] };
const nbMots = t => String(t).split(/\s+/).filter(Boolean).length;
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
  r.libre = r.accroche && r.conclusion && r.ouverture && r.musique && r.sousTitres && !r.adresse;
  return r;
}

function creer({ BASE, FFMPEG }) {
  const MODELES = path.join(BASE, 'modeles'), OUTILS = path.join(BASE, 'outils');
  const cheminModele = path.join(MODELES, MODELE.fichier);
  let proc = null, attente = new Map(), num = 0, installation = null;

  function processus() {
    if (proc) return proc;
    proc = fork(path.join(__dirname, 'ia-worker.js'), [], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let err = ''; proc.stderr.on('data', d => { err = (err + d).slice(-2000); });
    proc.on('message', m => { const a = attente.get(m.id); if (!a) return; attente.delete(m.id); m.ok ? a.ok(m) : a.ko(new Error(m.erreur)); });
    proc.on('exit', code => { for (const a of attente.values()) a.ko(new Error('L’IA locale s’est arrêtée' + (err ? ' : ' + err.trim().split('\n').pop() : ` (code ${code})`))); attente = new Map(); proc = null; });
    return proc;
  }
  const demander = msg => new Promise((ok, ko) => { const id = ++num; attente.set(id, { ok, ko }); processus().send({ id, ...msg }); });
  const installe = () => fs.existsSync(cheminModele);
  const etat = () => ({ installee: installe(), mo: MODELE.mo, styles: Object.keys(STYLES) });

  function installer(job) {
    if (installe()) return Promise.resolve();
    if (installation) return installation;
    installation = (async () => {
      fs.mkdirSync(MODELES, { recursive: true });
      if (job) job.step = `Téléchargement de l’IA locale (≈ ${(MODELE.mo / 1000).toFixed(1)} Go, une seule fois)…`;
      const part = cheminModele + '.part';
      const r = await requete(MODELE.url, { dest: part, quoi: 'de modèles', onProgress: (a, t) => { if (job && t) job.progress = a / t * 0.97; } });
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
  async function ecrireScript({ titre, paragraphes = [], duree, style, consigne = '', recherche = true, options = {} }, job) {
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
      const phrase = async (demande, max, verif) => { const r = await texteControle({ systeme: 'Scénariste de vidéos en français. ' + REGLES + adresse, demande, maxTokens: max * 3, verif: { min: 5, max, source: titre + ' ' + consigne, interdits: rg.eviter, ...verif } }); return r.texte || ''; };
      if (rg.accroche) { etape('L’IA locale écrit l’accroche…'); const t = await phrase(`${ordres}Écris UNE seule phrase d’accroche (12 à 18 mots) qui donne envie de regarder une vidéo sur « ${titre} », sans fait précis, sans chiffre ni date. Réponds uniquement par la phrase.`, 26, {}); if (t) scenes[0].texte = t + ' ' + scenes[0].texte; }
      if (rg.conclusion) { etape('L’IA locale écrit la conclusion…'); const t = await phrase(`${ordres}Écris UNE seule phrase de conclusion (12 à 20 mots) pour clore une vidéo sur « ${titre} », sans fait nouveau, sans chiffre ni date, sans appel à s’abonner. Réponds uniquement par la phrase.`, 28, {}); if (t) scenes[scenes.length - 1].texte += ' ' + t; }
      if (recherche) { etape('L’IA locale choisit les images…'); completerMots(scenes, await motsCles(titre, scenes)); } else completerMots(scenes, []);
      if (rg.cta) scenes[scenes.length - 1].texte += ' ' + rg.cta.replace(/([^.!?…])$/, '$1.');
      return { titre: String(titre).slice(0, 80), gpu, scenes, repris, regles: rg };
    }
    // sujet libre : 1) plan de la vidéo, 2) chaque scène écrite à son tour avec le plan et la scène précédente sous les yeux
    const n = rg.nbScenes || Math.max(3, Math.min(14, Math.round(duree / 8)));
    etape('L’IA locale prépare le plan de la vidéo…');
    const structure = rg.accroche && rg.conclusion ? ' La première scène est l’ouverture (accroche) et la dernière la conclusion.' : rg.accroche ? ' La première scène est l’ouverture (accroche) ; pas de conclusion.' : rg.conclusion ? ' Pas d’introduction : la première scène entre directement dans le sujet ; la dernière est la conclusion.' : ' Ni introduction ni conclusion : chaque scène apporte un point précis.';
    const sysPlan = 'Scénariste de vidéos courtes en français. Tu construis des plans concrets et précis, sans généralités. Tu n’inventes aucun nom de personne, d’entreprise ou de lieu, ni aucun chiffre ou date.' + adresse;
    const demPlan = `${ordres}Sujet de la vidéo : ${titre}\nTon : ${ton}.\nÉcris le plan de ${n} scènes qui se suivent logiquement.${structure}\nPour chaque scène : « section » (titre de partie, 2 à 4 mots), « idee » (UNE phrase : ce que la scène explique, concrète), « sujet » (l’objet à montrer à l’image, 1 à 3 mots en français, ex. « casque de vélo »), « recherche » (le même objet en 2 ou 3 mots anglais pour une banque de photos). « titre » : titre accrocheur de 6 mots maximum, sans chiffre.`;
    const rp = await demanderAvecMarge({ type: 'ecrire', modele: cheminModele, systeme: sysPlan, demande: demPlan, schema: SCHEMA_PLAN(n), ctx: contexteDe(sysPlan, demPlan), temperature: 0.45 }, n * 70 + 80);
    gpu = rp.gpu || gpu;
    const plan = ((rp.resultat && rp.resultat.scenes) || []).filter(x => String(x.idee || '').trim().length > 8);
    if (!plan.length) throw new Error('L’IA n’a pas réussi à préparer un plan : réessaie ou précise ton sujet.');
    const titreVideo = String((rp.resultat && rp.resultat.titre) || titre).replace(/\d+/g, '').trim().slice(0, 80) || titre;
    const sourcePlan = [titre, consigne, ...plan.map(x => `${x.section} ${x.idee} ${x.sujet}`)].join(' ');
    const systeme = 'Scénariste de vidéos en français. ' + REGLES + ' Tu n’inventes aucun chiffre, date, prix, citation ni nom propre absent du plan ; jamais de promesse ni d’avis médical, juridique ou financier.' + adresse;
    const ecrites = [], par = Math.round(mots / plan.length);
    for (let i = 0; i < plan.length; i++) {
      etape(`L’IA locale écrit la scène ${i + 1} sur ${plan.length}…`); if (job) job.progress = (i + 1) / (plan.length + 2);
      const demande = `${ordres}Vidéo : « ${titreVideo} ». Ton : ${ton}.\nPlan : ${plan.map((x, k) => `${k + 1}. ${x.idee}`).join(' ')}\n${ecrites.length ? `Texte déjà écrit : ${ecrites.slice(-2).join(' ')}\n` : ''}` +
        `Écris maintenant la scène ${i + 1} sur ${plan.length} : « ${plan[i].idee} ». ${roleScene(i, plan.length, rg)}2 ou 3 phrases complètes, environ ${par} mots, qui continuent ce qui précède sans le répéter. Réponds uniquement par le texte à dire à voix haute.`;
      const r = await texteControle({ systeme, demande, maxTokens: Math.ceil(par * 3 + 80), verif: { min: Math.max(8, Math.round(par * 0.5)), max: Math.round(par * 1.8) + 6, source: sourcePlan,
        interdireOuverture: i === 0 ? !rg.accroche : true, interdireFin: i === plan.length - 1 ? !rg.conclusion : true, interdits: rg.eviter } });
      ecrites.push(r.texte || (/[.!?…]$/.test(plan[i].idee.trim()) ? plan[i].idee.trim() : plan[i].idee.trim() + '.'));
    }
    const scenes = plan.map((x, i) => ({ section: String(x.section || '').slice(0, 40), texte: ecrites[i], sujet: String(x.sujet || '').slice(0, 60), recherche: String(x.recherche || '').slice(0, 80) }));
    if (rg.cta) scenes[scenes.length - 1].texte += ' ' + rg.cta.replace(/([^.!?…])$/, '$1.');
    return { titre: titreVideo, gpu, scenes, regles: rg };
  }
  // Une scène réécrite selon une consigne précise (bouton « Réécrire » de l'interface)
  async function reecrireScene({ texte, instruction = '', titre = '', style = '' }) {
    if (!installe()) await installer(null);
    const n0 = SQ.nbMots(texte), ton = STYLES[style] || STYLES.documentaire;
    const systeme = 'Scénariste de vidéos en français. ' + REGLES + ' Tu ne rajoutes aucun chiffre, date ni nom propre absent du texte ou de la consigne.';
    const demande = `${ORDRES(instruction || 'améliore ce texte : plus clair, plus vivant, mieux enchaîné')}Vidéo : « ${titre} ». Ton : ${ton}.\nTexte à réécrire : ${texte}\nGarde les mêmes faits. Longueur voisine de ${n0} mots sauf si la consigne en demande une autre. Réponds uniquement par le nouveau texte.`;
    const r = await texteControle({ systeme, demande, maxTokens: Math.ceil(n0 * 4 + 80), verif: { min: 4, max: Math.round(n0 * 2) + 12, source: `${texte} ${titre} ${instruction}` } });
    if (!r.texte) throw new Error('L’IA n’a pas réussi à réécrire cette scène : reformule ta consigne ou modifie le texte à la main.');
    return { texte: r.texte, gpu };
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
  return { etat, installer, ecrireScript, reecrireScene, telecharger, arreter };
}

module.exports = { creer, STYLES, MODELE, lireConsignes, regroupe, TYPES, PUBLICS, TONS, RYTHMES };
