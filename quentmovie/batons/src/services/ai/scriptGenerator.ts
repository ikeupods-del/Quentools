// Scénario : sujet → script JSON validé (schéma + contrôles de cohérence), une seconde tentative si besoin.
// Clé lue dans ANTHROPIC_API_KEY (jamais dans le dépôt).
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { declencheursAbsents } from '../timing';
import { ScriptSchema, type Script } from '../../types/projet';
import { consigneSujet, SYSTEM_SCENARISTE } from './prompts';

export const MODELE = process.env.BATONS_MODELE || 'claude-opus-5-5';

/** Problèmes que le schéma ne voit pas : flèches vers un acteur inconnu, mots déclencheurs absents, rythme. */
export function problemesDe(script: Script): string[] {
  const p: string[] = [];
  const scenes = script.actes.flatMap((a) => a.scenes);
  if (scenes.length < 6) p.push(`seulement ${scenes.length} scènes (7 à 12 attendues)`);
  for (const s of scenes) {
    if (s.visuel.type === 'flux') {
      const ids = new Set(s.visuel.acteurs.map((a) => a.id));
      for (const f of s.visuel.flux) if (!ids.has(f.de) || !ids.has(f.vers)) p.push(`${s.id} : flèche ${f.de} → ${f.vers} vers un acteur inconnu`);
    }
    if (s.visuel.type === 'empilement' && s.visuel.briques.length < 2) p.push(`${s.id} : moins de 2 briques`);
    for (const phrase of s.narration.split(/(?<=[.!?…])\s+/)) {
      if (phrase.split(/\s+/).length > 24) p.push(`${s.id} : phrase trop longue (« ${phrase.slice(0, 40)}… »)`);
    }
  }
  for (const d of declencheursAbsents(script)) p.push(`mot déclencheur absent de la narration — ${d}`);
  for (let i = 2; i < scenes.length; i++) {
    const t = scenes[i].visuel.type;
    if (t === scenes[i - 1].visuel.type && t === scenes[i - 2].visuel.type) p.push(`${scenes[i].id} : trois visuels « ${t} » de suite`);
  }
  return p;
}

async function demander(client: Anthropic, contenu: string): Promise<Script> {
  const reponse = await client.messages.parse({
    model: MODELE,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: zodOutputFormat(ScriptSchema) },
    system: SYSTEM_SCENARISTE,
    messages: [{ role: 'user', content: contenu }],
  });
  if (reponse.stop_reason === 'refusal') throw new Error('Le scénariste a refusé ce sujet.');
  if (reponse.stop_reason === 'max_tokens') throw new Error('Scénario coupé (trop long) : resserrez le sujet.');
  if (!reponse.parsed_output) throw new Error('Réponse illisible du scénariste.');
  return reponse.parsed_output;
}

/**
 * Écrit le scénario d'un sujet. `faits` : faits vérifiés (Wikipédia, fiche…) à utiliser en priorité.
 * Si les contrôles trouvent des problèmes, le scénariste réécrit une fois avec la liste ; sinon erreur explicite.
 */
export async function genererScript(sujet: string, faits?: string, client = new Anthropic()): Promise<Script> {
  let script = await demander(client, consigneSujet(sujet, faits));
  let problemes = problemesDe(script);
  if (problemes.length) {
    script = await demander(client,
      consigneSujet(sujet, faits) +
      `\n\nUne première version avait ces défauts, corrige-les tous :\n- ${problemes.join('\n- ')}` +
      `\n\nPremière version :\n${JSON.stringify(script)}`);
    problemes = problemesDe(script);
  }
  if (problemes.length) throw new Error(`Scénario refusé :\n- ${problemes.join('\n- ')}`);
  return script;
}
