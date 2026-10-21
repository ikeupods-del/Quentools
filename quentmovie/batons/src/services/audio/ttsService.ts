// Voix et temps de chaque mot, scène par scène (un fichier par scène : aucun assemblage audio nécessaire).
// Deux sources :
//  - synthèse ElevenLabs avec horodatage des caractères (/v1/text-to-speech/{voix}/with-timestamps) ;
//  - enregistrement existant (Doublage de QuentMovie, vNN.wav) aligné sur le texte (/v1/forced-alignment).
// Clé lue dans ELEVENLABS_API_KEY (jamais dans le dépôt).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Mot } from '../../types/projet';

const API = 'https://api.elevenlabs.io/v1';

export interface OptionsVoix {
  voixId: string;
  modele?: string;
  /** Texte de la scène précédente et suivante : ElevenLabs garde une intonation continue d'une scène à l'autre. */
  precedent?: string;
  suivant?: string;
}

export interface ResultatVoix { mots: Mot[]; duree: number }

function cle(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('ELEVENLABS_API_KEY manquante (export ELEVENLABS_API_KEY=… avant la commande).');
  return k;
}

async function appeler<T>(url: string, init: RequestInit): Promise<T> {
  for (let essai = 1; ; essai++) {
    const r = await fetch(url, { ...init, headers: { 'xi-api-key': cle(), ...(init.headers ?? {}) } });
    if (r.ok) return (await r.json()) as T;
    const texte = await r.text();
    // 429 (limite) et 5xx : jusqu'à 3 essais espacés ; le reste est une vraie erreur (clé, voix, quota).
    if ((r.status === 429 || r.status >= 500) && essai < 3) { await new Promise((ok) => setTimeout(ok, 2000 * essai)); continue; }
    throw new Error(`ElevenLabs ${r.status} : ${texte.slice(0, 300)}`);
  }
}

/** Regroupe des caractères horodatés en mots (les espaces séparent les mots). */
export function motsDepuisCaracteres(caracteres: string[], debuts: number[], fins: number[]): Mot[] {
  const mots: Mot[] = [];
  let cur = '', d = 0, f = 0;
  caracteres.forEach((c, i) => {
    if (/\s/.test(c)) {
      if (cur) mots.push({ texte: cur, debut: d, fin: f });
      cur = '';
      return;
    }
    if (!cur) d = debuts[i];
    cur += c;
    f = fins[i];
  });
  if (cur) mots.push({ texte: cur, debut: d, fin: f });
  return mots;
}

/**
 * Remet le texte écrit (ponctuation, majuscules) sur les temps reçus quand les mots se correspondent un à un ;
 * sinon garde les mots tels que la voix les a rendus.
 */
export function recaler(narration: string, recus: Mot[]): Mot[] {
  const ecrits = narration.split(/\s+/).filter(Boolean);
  if (ecrits.length !== recus.length) return recus;
  return recus.map((m, i) => ({ ...m, texte: ecrits[i] }));
}

/** Synthèse d'une scène ; écrit le MP3 dans `fichier` et renvoie les mots horodatés. */
export async function synthetiser(narration: string, fichier: string, o: OptionsVoix): Promise<ResultatVoix> {
  const r = await appeler<{
    audio_base64: string;
    alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } | null;
  }>(`${API}/text-to-speech/${encodeURIComponent(o.voixId)}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: narration,
      model_id: o.modele ?? 'eleven_multilingual_v2',
      previous_text: o.precedent,
      next_text: o.suivant,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    }),
  });
  writeFileSync(fichier, Buffer.from(r.audio_base64, 'base64'));
  const a = r.alignment;
  const mots = a ? recaler(narration, motsDepuisCaracteres(a.characters, a.character_start_times_seconds, a.character_end_times_seconds)) : [];
  return { mots, duree: (mots[mots.length - 1]?.fin ?? 0) + 0.25 };
}

/** Durée d'un WAV PCM lue dans son en-tête (fichiers du Doublage de QuentMovie). */
export function dureeWav(fichier: string): number {
  const b = readFileSync(fichier);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${path.basename(fichier)} n'est pas un WAV`);
  let o = 12, octetsParSeconde = 0;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), taille = b.readUInt32LE(o + 4);
    if (id === 'fmt ') octetsParSeconde = b.readUInt32LE(o + 16);
    if (id === 'data' && octetsParSeconde) return Math.min(taille, b.length - o - 8) / octetsParSeconde;
    o += 8 + taille + (taille % 2);
  }
  throw new Error(`${path.basename(fichier)} : en-tête WAV incomplet`);
}

/** Aligne un enregistrement existant sur son texte ; renvoie les mots horodatés et la durée réelle du fichier. */
export async function aligner(narration: string, fichier: string): Promise<ResultatVoix> {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(fichier)]), path.basename(fichier));
  form.append('text', narration);
  const r = await appeler<{ words: { text: string; start: number; end: number }[] }>(`${API}/forced-alignment`, { method: 'POST', body: form });
  const mots = recaler(narration, r.words.filter((w) => w.text.trim()).map((w) => ({ texte: w.text.trim(), debut: w.start, fin: w.end })));
  const duree = fichier.toLowerCase().endsWith('.wav') ? dureeWav(fichier) : (mots[mots.length - 1]?.fin ?? 0) + 0.25;
  return { mots, duree };
}
