// Contrôles hors ligne (aucune clé nécessaire) : schéma, temps, mots déclencheurs, découpe des sous-titres, alignement.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lignesDe } from '../remotion/compositions/EcoVideo/Habillage';
import { DEMO, SCRIPT_DEMO } from '../demo/crise2008';
import { problemesDe } from '../services/ai/scriptGenerator';
import { dureeWav, motsDepuisCaracteres, recaler } from '../services/audio/ttsService';
import { declencheursAbsents, instantsDe, INTRO, motsEstimes, normaliser } from '../services/timing';
import { ScriptSchema } from '../types/projet';

let ok = 0;
const essai = (nom: string, f: () => void) => { f(); ok++; console.log(`✓ ${nom}`); };

essai('le script de démonstration respecte le schéma', () => { ScriptSchema.parse(SCRIPT_DEMO); });
essai('aucun problème de cohérence dans la démonstration', () => assert.deepEqual(problemesDe(SCRIPT_DEMO), []));
essai('les mots déclencheurs sont trouvés', () => assert.deepEqual(declencheursAbsents(SCRIPT_DEMO), []));

essai('scènes bout à bout, après l’ouverture', () => {
  const scenes = DEMO.actes.flatMap((a) => a.scenes);
  assert.equal(scenes[0].debut, INTRO);
  for (let i = 1; i < scenes.length; i++) assert.ok(Math.abs(scenes[i].debut - (scenes[i - 1].debut + scenes[i - 1].duree)) < 0.01);
  const fin = scenes.at(-1)!;
  assert.ok(DEMO.duree >= fin.debut + fin.duree);
  for (const s of scenes) for (const t of Object.values(s.instants)) assert.ok(t >= 0 && t <= s.duree, `${s.id} : déclencheur hors de la scène`);
});

essai('déclencheurs : accents, ponctuation, mots composés', () => {
  const mots = motsEstimes('Les briques pourries cèdent, et tout le paquet s’écroule. Triple A !');
  const t = instantsDe(mots, ['cèdent', 'CEDENT', 'Triple A', 'paquet', 'absent']);
  assert.equal(t['cèdent'], mots[3].debut);
  assert.equal(t['CEDENT'], mots[3].debut);
  assert.equal(t['Triple A'], mots[9].debut);
  assert.equal(t['absent'], undefined);
  assert.equal(normaliser('L’État'), 'l etat');
});

essai('un mauvais script est refusé avec la raison', () => {
  const faux = structuredClone(SCRIPT_DEMO);
  const s = faux.actes[0].scenes[1];
  if (s.visuel.type !== 'flux') throw new Error('scène inattendue');
  s.visuel.flux[0].vers = 'inconnu';
  s.visuel.flux[0].motDeclencheur = 'nulle-part';
  const p = problemesDe(faux);
  assert.ok(p.some((x) => x.includes('acteur inconnu')));
  assert.ok(p.some((x) => x.includes('nulle-part')));
});

essai('sous-titres : lignes courtes, coupées aux fins de phrase', () => {
  const lignes = lignesDe(motsEstimes(SCRIPT_DEMO.actes[0].scenes[1].narration));
  for (const l of lignes) assert.ok(l.map((m) => m.texte).join(' ').length <= 50);
  assert.ok(lignes.length >= 2);
});

essai('alignement ElevenLabs : caractères → mots, ponctuation remise', () => {
  const texte = 'Bob rêve, vraiment.';
  const car = [...'Bob rêve vraiment'];
  const mots = motsDepuisCaracteres(car, car.map((_, i) => i * 0.1), car.map((_, i) => i * 0.1 + 0.08));
  assert.deepEqual(mots.map((m) => m.texte), ['Bob', 'rêve', 'vraiment']);
  assert.equal(mots[1].debut, 0.4);
  assert.deepEqual(recaler(texte, mots).map((m) => m.texte), ['Bob', 'rêve,', 'vraiment.']);
});

essai('durée d’un WAV du Doublage', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'batons-'));
  const n = 48000 * 2 * 3; // 3 s, 48 kHz, mono 16 bits
  const b = Buffer.alloc(44 + n);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(48000, 24); b.writeUInt32LE(96000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n, 40);
  const f = path.join(dir, 'v00.wav');
  writeFileSync(f, b);
  assert.equal(dureeWav(f), 3);
});

console.log(`\n${ok} contrôles réussis.`);
