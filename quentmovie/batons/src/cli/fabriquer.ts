// Fabrication complète d'une vidéo « en bâtons » :
//   sujet → scénario (relu par le programme) → voix scène par scène → projet.json → MP4.
//
//   npm run fabriquer -- "La crise de 2008"                      tout d'un coup (voix ElevenLabs)
//   npm run fabriquer -- "La crise de 2008" --script-seul        s'arrête après le scénario (à relire)
//   npm run fabriquer -- --script public/projets/<id>/script.json   reprend un scénario relu
//   … --voix perso --doublage ~/Movies/QuentMovie/doublages/<nom>   ta voix (v00.wav, v01.wav… une par scène)
//   … --voix muet                                               temps estimés, sans voix (essai du rendu)
//   … --faits faits.txt                                         faits vérifiés donnés au scénariste
//   … --sans-rendu                                              s'arrête au projet.json
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { genererScript, problemesDe } from '../services/ai/scriptGenerator';
import { aligner, synthetiser } from '../services/audio/ttsService';
import { assembler, motsEstimes, type VoixScene } from '../services/timing';
import { ScriptSchema, type ProjetVideo, type Script } from '../types/projet';
import { rendre } from './rendu';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (nom: string) => { const i = args.indexOf(`--${nom}`); return i >= 0 ? args[i + 1] ?? null : null; };
const drapeau = (nom: string) => args.includes(`--${nom}`);
const OPTIONS_AVEC_VALEUR = new Set(['--script', '--voix', '--doublage', '--faits', '--sortie']);
const sujet = args.find((a, i) => !a.startsWith('--') && !OPTIONS_AVEC_VALEUR.has(args[i - 1] ?? ''));
const accueil = (p: string) => p.replace(/^~(?=\/|$)/, os.homedir());

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';

async function voixDesScenes(script: Script, dossier: string, idProjet: string): Promise<{ voix: VoixScene[]; source: ProjetVideo['voix'] }> {
  const mode = opt('voix') ?? 'elevenlabs';
  const scenes = script.actes.flatMap((a) => a.scenes);
  const voix: VoixScene[] = [];
  mkdirSync(path.join(dossier, 'voix'), { recursive: true });
  const publicDe = (f: string) => `projets/${idProjet}/voix/${f}`;

  if (mode === 'muet') {
    for (const s of scenes) { const mots = motsEstimes(s.narration); voix.push({ mots, duree: (mots.at(-1)?.fin ?? 2) + 0.2, audio: null }); }
    return { voix, source: { source: 'estimation', voixId: null } };
  }

  if (mode === 'perso') {
    const doublage = opt('doublage');
    if (!doublage) throw new Error('--voix perso demande --doublage <dossier du Doublage de QuentMovie>');
    const manquantes: string[] = [];
    scenes.forEach((s, k) => { if (!existsSync(path.join(accueil(doublage), `v${String(k).padStart(2, '0')}.wav`))) manquantes.push(`v${String(k).padStart(2, '0')}.wav — ${s.narration}`); });
    // Aucune voix de remplacement : une réplique manquante arrête la fabrication avec la liste à enregistrer.
    if (manquantes.length) throw new Error(`Répliques à enregistrer dans le Doublage :\n${manquantes.join('\n')}`);
    for (const [k, s] of scenes.entries()) {
      const nom = `v${String(k).padStart(2, '0')}.wav`, cible = path.join(dossier, 'voix', nom);
      copyFileSync(path.join(accueil(doublage), nom), cible);
      console.log(`Voix ${k + 1}/${scenes.length} : alignement de ${nom}`);
      voix.push({ ...(await aligner(s.narration, cible)), audio: publicDe(nom) });
    }
    return { voix, source: { source: 'enregistrement', voixId: null } };
  }

  const voixId = process.env.ELEVENLABS_VOICE_ID;
  if (!voixId) throw new Error('ELEVENLABS_VOICE_ID manquant (identifiant de la voix ElevenLabs à utiliser).');
  for (const [k, s] of scenes.entries()) {
    const nom = `s${String(k).padStart(2, '0')}.mp3`;
    console.log(`Voix ${k + 1}/${scenes.length} : synthèse`);
    const r = await synthetiser(s.narration, path.join(dossier, 'voix', nom), {
      voixId, modele: process.env.ELEVENLABS_MODELE, precedent: scenes[k - 1]?.narration, suivant: scenes[k + 1]?.narration,
    });
    voix.push({ ...r, audio: publicDe(nom) });
  }
  return { voix, source: { source: 'elevenlabs', voixId } };
}

async function principal() {
  const fichierScript = opt('script');
  let script: Script, id: string;

  if (fichierScript) {
    script = ScriptSchema.parse(JSON.parse(readFileSync(fichierScript, 'utf8')));
    const problemes = problemesDe(script);
    if (problemes.length) throw new Error(`Scénario à corriger :\n- ${problemes.join('\n- ')}`);
    id = path.basename(path.dirname(path.resolve(fichierScript)));
  } else {
    if (!sujet) throw new Error('Donnez un sujet : npm run fabriquer -- "La crise de 2008"');
    console.log(`Scénario : « ${sujet} »…`);
    const faits = opt('faits');
    script = await genererScript(sujet, faits ? readFileSync(faits, 'utf8') : undefined);
    id = `${slug(sujet)}-${new Date().toISOString().slice(0, 10)}`;
  }

  const dossier = path.join(RACINE, 'public/projets', id);
  mkdirSync(dossier, { recursive: true });
  writeFileSync(path.join(dossier, 'script.json'), JSON.stringify(script, null, 2));
  // Répliques numérotées comme le Doublage de QuentMovie (v00, v01…), pour enregistrer sa propre voix.
  writeFileSync(path.join(dossier, 'repliques.txt'),
    script.actes.flatMap((a) => a.scenes).map((s, k) => `v${String(k).padStart(2, '0')}  ${s.narration}`).join('\n') + '\n');
  console.log(`Scénario enregistré : ${path.join(dossier, 'script.json')}`);
  if (drapeau('script-seul')) {
    console.log(`À relire, puis : npm run fabriquer -- --script ${path.relative(process.cwd(), path.join(dossier, 'script.json'))}`);
    return;
  }

  const { voix, source } = await voixDesScenes(script, dossier, id);
  const projet = assembler(id, script, voix, source);
  writeFileSync(path.join(dossier, 'projet.json'), JSON.stringify(projet, null, 2));
  console.log(`Projet prêt (${projet.duree.toFixed(1)} s) : ${path.join(dossier, 'projet.json')}`);
  if (drapeau('sans-rendu')) return;

  const exportsQM = path.join(os.homedir(), 'Movies/QuentMovie/exports');
  const sortie = opt('sortie') ? accueil(opt('sortie')!) : existsSync(exportsQM) ? path.join(exportsQM, `${id}.mp4`) : path.join(RACINE, 'out', `${id}.mp4`);
  await rendre(projet, path.resolve(sortie));
}

principal().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
