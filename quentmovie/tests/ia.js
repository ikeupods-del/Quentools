// IA locale et téléchargement depuis un lien. Hors ligne : contrôle des réponses d'erreur.
// Avec QM_RESEAU=1 (Mac de construction) : modèle téléchargé, script écrit à partir de faits (aucune année inventée),
// vidéo téléchargée depuis un lien. QM_BASE : dossier gardé pour l'essai de l'application (modèle déjà présent).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { create } = require('../server');
const { resolveFfmpeg } = require('../ffmpeg-path');

const nbMots = t => String(t).split(/\s+/).filter(Boolean).length;
let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

(async () => {
  const bins = await resolveFfmpeg();
  const base = process.env.QM_BASE || fs.mkdtempSync(path.join(os.tmpdir(), 'qm-ia-'));
  const app = create({ port: 0, base, ...bins });
  const port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const attendre = async id => { for (let i = 0; i < 3000; i++) { await new Promise(r => setTimeout(r, 500)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) return j; } return { error: 'trop long' }; };
  const e = await (await fetch(U('/api/ia'))).json();
  check('état de l’IA', typeof e.installee === 'boolean' && e.styles.includes('dynamique'), JSON.stringify(e));
  const mauvais = await attendre((await (await fetch(U('/api/telecharger'), { method: 'POST', body: JSON.stringify({ lien: 'pas un lien' }) })).json()).id);
  check('lien invalide refusé', /https/.test(mauvais.error || ''), mauvais.error);

  const { lireConsignes: lire } = require('../ia');
  const c1 = lire('Pas d’intro, pas de conclusion, tutoie-moi, sans musique'), c2 = lire('Fais une vidéo avec une intro percutante');
  check('consignes : pas d’intro ni de conclusion lus', !c1.accroche && !c1.ouverture && !c1.conclusion && !c1.musique && c1.sousTitres && c1.adresse === 'tu', JSON.stringify(c1));
  check('consignes : une intro demandée reste permise', c2.accroche && c2.ouverture && c2.libre, JSON.stringify(c2));
  check('consignes : sans sous-titres, vouvoiement', !lire('sans sous-titres').sousTitres && lire('vouvoie le spectateur').adresse === 'vous');

  const SQ = require('../script-qualite'), bon = 'Un casque bien ajusté protège efficacement la tête en cas de chute. Il doit rester stable et ne pas bouger quand vous secouez la tête.';
  check('qualité : bon texte accepté', SQ.verifier(bon, { min: 8, max: 60, source: 'casque' }) === '', SQ.verifier(bon, { source: 'casque' }));
  check('qualité : chiffre inventé refusé', /chiffre/.test(SQ.verifier('Un casque protège dans 90 pour cent des chutes graves en ville.', { min: 5, source: 'casque' })));
  check('qualité : nom inventé refusé', /nom inventé/.test(SQ.verifier('Un casque comme celui de Marcel Dupont protège bien la tête des cyclistes.', { min: 5, source: 'casque vélo' })));
  check('qualité : répétition refusée', /répét/.test(SQ.verifier('Il faut rouler prudemment en ville. Il faut rouler prudemment en ville pour éviter les accidents.', { min: 5 })));
  check('qualité : anglais refusé', /français/.test(SQ.verifier('This helmet protects your head very well when you fall down on the road.', { min: 5 })));
  check('qualité : phrase coupée refusée, nettoyage', /non terminée/.test(SQ.verifier('Un casque protège la tête des cyclistes en cas de', { min: 5 })) && SQ.nettoyerTexte('Voici la scène :\n**Un casque** protège la tête. Il est obligatoire pour les enfants de moins de dix ans en France et il faut') === 'Un casque protège la tête.');
  check('qualité : introduction interdite refusée', /introduction/.test(SQ.verifier('Bonjour à tous, aujourd’hui nous allons parler des casques de vélo.', { min: 5, interdireOuverture: true })));
  check('qualité : conclusion interdite refusée', /conclusion/.test(SQ.verifier('Voilà pour les casques, n’oubliez pas de vous abonner à la chaîne pour la suite.', { min: 5, interdireFin: true })));

  const { regroupe } = require('../ia'), o1 = regroupe('', { type: 'astuces', ton: 'humour', adresse: 'tu', accroche: false, cta: 'Abonne-toi pour la suite', eviter: 'gratuit, incroyable', inclure: ['casque'], scenes: 6, public: 'debutants' });
  check('options : règles appliquées par le code', !o1.accroche && !o1.ouverture && o1.conclusion && o1.adresse === 'tu' && o1.cta === 'Abonne-toi pour la suite' && o1.eviter.join() === 'gratuit,incroyable' && o1.inclure[0] === 'casque' && o1.nbScenes === 6 && o1.type === 'astuces', JSON.stringify(o1));
  check('options : valeurs inconnues ignorées', regroupe('', { type: 'zzz', ton: 'zzz', public: 'zzz', scenes: 99 }).type === 'libre' && regroupe('', { scenes: 99 }).nbScenes === 14);
  check('options : la consigne écrite et les options se complètent', !regroupe('pas de conclusion', { adresse: 'vous' }).conclusion && regroupe('pas de conclusion', { adresse: 'vous' }).adresse === 'vous');
  check('qualité : mot interdit refusé', /interdit/.test(SQ.verifier('Un casque gratuit protège efficacement la tête des cyclistes en ville.', { min: 5, interdits: ['gratuit'] })) && !SQ.verifier('Un casque bien ajusté protège efficacement la tête des cyclistes.', { min: 5, interdits: ['gratuit'] }));

  // assistant de montage : demandes en français → actions connues, dans l'ordre du montage
  const AS = require('../assistant'), acts = d => AS.comprendre(d).map(x => x.action + (x.parametre ? ':' + x.parametre : '')).join(' ');
  check('assistant : demande composée', acts('coupe les blancs, ajoute des sous-titres façon tiktok et une musique calme, passe en vertical') === 'format:vertical couper_blancs sous_titres:tiktok musique:calme', acts('coupe les blancs, ajoute des sous-titres façon tiktok et une musique calme, passe en vertical'));
  check('assistant : retirer plutôt qu’ajouter', acts('enlève la musique et mets des transitions en glissé') === 'retirer_musique transitions:slideleft', acts('enlève la musique et mets des transitions en glissé'));
  check('assistant : vitesse, titre, publication, export', acts('accélère x1,5 puis exporte') === 'vitesse:1.5 exporter' && AS.comprendre('ajoute un écran titre « Mon voyage »')[0].parametre === 'Mon voyage' && acts('écris les hashtags pour youtube') === 'publication:YouTube');
  check('assistant : chapitrer', acts('chapitre ma vidéo avec le bruit de clavier') === 'chapitrer' && acts('donne-moi la liste des chapitres à copier') === 'chapitres', acts('chapitre ma vidéo'));
  check('assistant : clipping TikTok', acts('crée des clips pour tiktok') === 'clipping' && acts('sors-moi les meilleurs passages en shorts') === 'clipping', acts('crée des clips pour tiktok'));
  check('assistant : montage automatique adapté au projet', acts('monte ma vidéo automatiquement').split(' ').includes('couper_blancs') && AS.comprendre('monte tout', { format: 'vertical', clips: [{ kind: 'video', hasAudio: true, dur: 200, subs: [] }], audio: [] }).map(x => x.action).join() === 'plans,couper_blancs,sous_titres,musique,chapitrer');
  check('assistant : rien d’inventé pour une demande inconnue', !AS.comprendre('fais un truc sympa').length && !AS.comprendre('').length);
  const sug = AS.suggerer({ format: 'vertical', clips: [{ kind: 'video', dur: 60, w: 1920, h: 1080 }, { kind: 'video', dur: 30 }], audio: [] }).map(x => x.action);
  check('assistant : suggestions tirées du montage', ['sous_titres', 'couper_blancs', 'plans', 'format', 'egaliser', 'musique'].every(x => sug.includes(x)), sug.join());
  check('assistant : montage vide → conseil de départ', AS.suggerer({ clips: [] })[0].action === 'aucune');
  check('assistant : hashtags sans IA', AS.hashtagsSimples('Le voyage en Islande : volcans, glaciers et volcans actifs du voyage').slice(0, 2).join() === '#volcans,#voyage');

  if (process.env.QM_RESEAU) {
    const IA = require('../ia').creer({ BASE: base, FFMPEG: bins.ffmpeg });
    const faits = 'Michelin est une entreprise française de pneumatiques fondée en 1889 à Clermont-Ferrand par les frères André et Édouard Michelin.\n[Les débuts] En 1891, ils déposent le brevet du pneu démontable pour bicyclette.\n[Le Bibendum] En 1898, le dessinateur O\'Galop crée le Bibendum.\n[Le guide] En 1900 paraît le premier guide Michelin.\n[Le pneu radial] En 1946, Michelin invente le pneu à carcasse radiale.';
    const t0 = Date.now(), job = {};
    const paragraphes = faits.split('\n').map(l => { const m = /^\[(.+?)\] (.*)$/.exec(l); return m ? { section: m[1], texte: m[2] } : { section: '', texte: l }; });
    const r = await IA.ecrireScript({ titre: 'L’histoire de Michelin', paragraphes, duree: 45, style: 'dynamique', consigne: 'Pas d’intro, pas de conclusion', recherche: false }, job);
    console.log('Paragraphes repris tels quels (garde-fou) :', r.repris);
    const texte = r.scenes.map(x => x.texte).join(' ');
    console.log(`IA (${r.gpu || 'processeur'}) en ${Math.round((Date.now() - t0) / 1000)} s — « ${r.titre} »`); r.scenes.forEach((x, i) => console.log(`  ${i + 1}. [${x.section}] ${x.texte}`));
    check('script écrit par l’IA', r.scenes.length >= 3 && texte.split(/\s+/).length > 50, r.scenes.length);
    const annees = [...texte.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map(m => m[1]).filter(a => !faits.includes(a));
    check('aucune année inventée', !annees.length, annees.join(', '));
    const dem = await IA.comprendreDemande('je voudrais que les gens qui regardent sans le son comprennent, et une ambiance plus épique');
    console.log('Assistant (IA) :', JSON.stringify(dem));
    check('assistant IA : actions connues uniquement', dem.length >= 1 && dem.every(x => AS.ACTIONS[x.action]), JSON.stringify(dem));
    const pub = await IA.textesPublication({ texte, plateforme: 'YouTube', titre: r.titre });
    console.log('Publication (IA) :', JSON.stringify(pub));
    check('publication IA : 3 titres, description, hashtags', pub.ia && pub.titres.length === 3 && pub.description.length > 20 && pub.hashtags.length >= 3 && pub.hashtags.every(h => /^#[a-z0-9]+$/.test(h)), JSON.stringify(pub));
    check('IA sur la puce graphique', process.platform !== 'darwin' || r.gpu === 'metal', r.gpu);
    // consignes de l'utilisateur : « pas d'intro, pas de conclusion » = ni accroche ni phrase de fin ajoutées
    check('consignes suivies : ni accroche ni conclusion', !r.regles.accroche && !r.regles.conclusion && nbMots(r.scenes[0].texte) <= nbMots(paragraphes[0].texte) * 1.3 && nbMots(r.scenes[4].texte) <= nbMots(paragraphes[4].texte) * 1.3, `${nbMots(r.scenes[0].texte)} / ${nbMots(paragraphes[0].texte)}`);
    IA.arreter();
    // mode express : sujet libre, un média cherché pour chaque scène
    const x = await attendre((await (await fetch(U('/api/generer/ia'), { method: 'POST', body: JSON.stringify({ article: '', titre: 'Faire du vélo en ville', consigne: '3 conseils pour faire du vélo en ville en sécurité', duree: 30, style: 'dynamique', medias: true }) })).json()).id);
    const xs = (x.resultat && x.resultat.scenes) || [];
    console.log('Express :', x.error || `« ${x.resultat.titre} » — ${xs.map(s => `${s.sujet} / ${s.recherche}` + (s.image >= 0 ? ' ✓' : ' ✗')).join(' | ')}`);
    xs.forEach((s, i) => console.log(`  ${i + 1}. [${s.section}] ${s.texte}`));
    check('express : « 3 conseils » = 3 scènes, avec mots-clés', xs.length === 3 && xs.every(s => s.sujet && s.texte), x.error + ' ' + xs.length);
    check('express : photos trouvées pour la moitié des scènes au moins', xs.filter(s => s.image >= 0).length >= Math.ceil(xs.length / 2), JSON.stringify(xs.map(s => s.image)));
    console.log('  photos :', xs.map(s => s.image >= 0 ? x.resultat.images[s.image].nom : '—').join(' | '));
    // vidéo depuis un lien (fichier libre de Wikimedia Commons ; l'outil sait aussi YouTube, TikTok, Instagram…)
    const q = await (await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrsearch=' + encodeURIComponent('bicycle filetype:video') + '&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=size|url', { headers: { 'User-Agent': 'QuentMovie-tests/1.0 (https://github.com/ikeupods-del/Quentools)' } })).json();
    const petite = ((q.query && q.query.pages) || []).map(x => x.imageinfo && x.imageinfo[0]).find(x => x && x.size < 6e6);
    console.log('Lien essayé :', petite && petite.descriptionurl);
    const j = await attendre((await (await fetch(U('/api/telecharger'), { method: 'POST', body: JSON.stringify({ lien: petite ? petite.descriptionurl : '' }) })).json()).id);
    console.log('Téléchargement depuis un lien :', j.error || j.resultat.file);
    check('vidéo téléchargée depuis un lien', j.done && j.resultat && fs.existsSync(path.join(base, 'medias', j.resultat.file)), j.error);
  }
  app.stop(); if (!process.env.QM_BASE) fs.rmSync(base, { recursive: true, force: true });
  console.log(`IA et liens : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
