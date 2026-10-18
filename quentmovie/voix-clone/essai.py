#!/usr/bin/env python3
"""Essai de voix clonée : lit les enregistrements du corpus « Ma voix », en tire un extrait de référence,
puis fait dire les mêmes phrases d'essai par un modèle de clonage (Chatterbox multilingue ou Qwen3-TTS).

Usage : essai.py --moteur chatterbox|qwen --voix <dossier ma-voix> --sortie <dossier> [--selection-seule]
Sortie : <sortie>/reel.wav (l'extrait de référence), <sortie>/<moteur>-N.wav, <sortie>/rapport.json.
Les lignes « ETAPE : … » et « ERREUR : … » sont lues par QuentMovie pour afficher l'avancement.
"""
import argparse, json, os, sys, time, wave

PHRASES = [
    "Salut la colonie ! Abonne-toi pour ne rien rater.",
    "En seize cent trente-sept, un seul bulbe de tulipe aurait été payé cinq mille florins, alors qu'un artisan en gagnait environ trois cents par an.",
    "Imaginons un contrat à cent florins, revendu cinq fois, avec cinquante pour cent de hausse à chaque revente.",
    "Un grain après l'autre, à bientôt dans la fourmilière !",
]
REF_MIN, REF_MAX = 8.0, 16.0  # secondes de voix de référence (assez pour le timbre, assez court pour rester rapide)


def etape(t):
    print('ETAPE : ' + t, flush=True)


def erreur(t, code=2):
    print('ERREUR : ' + t, flush=True)
    sys.exit(code)


def lire_wav(f):
    with wave.open(f, 'rb') as w:
        return w.getframerate(), w.getnchannels(), w.getsampwidth(), w.readframes(w.getnframes())


def choisir_reference(voix, sortie):
    """Assemble des répliques propres (3 à 10 s) jusqu'à ~12 s ; écrit reel.wav et reel.txt (texte dit, nécessaire à Qwen3-TTS)."""
    candidates = []

    def ajouter(ident, fichier, texte, duree):
        if os.path.exists(fichier) and texte and 3.0 <= duree <= 10.0:
            candidates.append((abs(duree - 6.0), ident, fichier, texte, duree))

    index = os.path.join(voix, 'index.json')
    if os.path.exists(index):
        with open(index, encoding='utf-8') as f:
            for ident, x in sorted(json.load(f).items()):
                ajouter(ident, os.path.join(voix, 'wavs', ident + '.wav'), (x.get('texte') or '').strip(), float(x.get('duree') or 0))
    # doublages faits avant la création du corpus : répliques vNN.wav et texte de script.json
    racine = os.path.join(os.path.dirname(os.path.abspath(voix)), 'doublages')
    if not candidates and os.path.isdir(racine):
        for nom in sorted(os.listdir(racine)):
            try:
                with open(os.path.join(racine, nom, 'script.json'), encoding='utf-8') as f:
                    lignes = json.load(f).get('lignes') or []
            except (OSError, ValueError):
                continue
            for n, texte in enumerate(lignes):
                fichier = os.path.join(racine, nom, 'v%02d.wav' % n)
                if os.path.exists(fichier):
                    try:
                        sr, canaux, largeur, brut = lire_wav(fichier)
                        ajouter('%s-%02d' % (nom, n), fichier, str(texte).strip(), len(brut) / (sr * canaux * largeur))
                    except (wave.Error, EOFError):
                        continue
    if not candidates:
        erreur("Pas encore de voix enregistrée : fais d'abord un doublage dans QuentMovie (Doublage, ⇧⌘D).")
    candidates.sort()
    choisies, total = [], 0.0
    for _, ident, fichier, texte, duree in candidates:
        if total >= 12.0:
            break
        if total + duree > REF_MAX:
            continue
        choisies.append((fichier, texte, duree))
        total += duree
    if total < REF_MIN:
        erreur("Pas assez de voix pour l'essai : %.0f s de répliques utilisables, il en faut au moins %.0f s. Enregistre quelques répliques de plus avec le Doublage." % (total, REF_MIN))
    os.makedirs(sortie, exist_ok=True)
    taux = None
    morceaux = []
    for fichier, texte, duree in choisies:
        sr, canaux, largeur, brut = lire_wav(fichier)
        if canaux != 1 or largeur != 2:
            erreur('Format inattendu pour %s (mono 16 bits attendu).' % os.path.basename(fichier))
        if taux is None:
            taux = sr
        elif sr != taux:
            erreur('Les répliques n\'ont pas toutes la même fréquence (%s).' % os.path.basename(fichier))
        morceaux.append(brut)
        morceaux.append(b'\x00\x00' * int(taux * 0.25))  # 0,25 s de silence entre deux répliques
    ref = os.path.join(sortie, 'reel.wav')
    with wave.open(ref, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(taux)
        w.writeframes(b''.join(morceaux))
    texte = ' '.join(t for _, t, _ in choisies)
    with open(os.path.join(sortie, 'reel.txt'), 'w', encoding='utf-8') as f:
        f.write(texte)
    return ref, texte, total


def appareil():
    import torch
    if torch.cuda.is_available():
        return 'cuda'
    if getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available():
        return 'mps'
    return 'cpu'


def chatterbox(ref, sortie, rapport):
    import torch, torchaudio
    dev = appareil()
    etape('Chargement de Chatterbox (premier lancement : téléchargement du modèle, quelques Go)')
    if dev != 'cuda':  # les poids sont enregistrés pour un GPU Nvidia : sur Mac, il faut les lire sur le processeur
        charger = torch.load
        torch.load = lambda *a, **k: charger(*a, **{**k, 'map_location': torch.device(dev if dev == 'mps' else 'cpu')})
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    modele = ChatterboxMultilingualTTS.from_pretrained(device=dev)
    for i, phrase in enumerate(PHRASES, 1):
        etape('Chatterbox : phrase %d sur %d' % (i, len(PHRASES)))
        t0 = time.time()
        audio = modele.generate(phrase, language_id='fr', audio_prompt_path=ref)
        calcul = time.time() - t0
        f = os.path.join(sortie, 'chatterbox-%d.wav' % i)
        torchaudio.save(f, audio.detach().cpu(), modele.sr)
        rapport.append({'moteur': 'chatterbox', 'phrase': i, 'fichier': os.path.basename(f), 'calcul': round(calcul, 1), 'duree': round(audio.shape[-1] / modele.sr, 1), 'appareil': dev})


def qwen(ref, texte_ref, sortie, rapport):
    import torch, soundfile
    dev = appareil()
    etape('Chargement de Qwen3-TTS (premier lancement : téléchargement du modèle, quelques Go)')
    from qwen_tts import Qwen3TTSModel
    modele = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-0.6B-Base', device_map=dev if dev != 'cpu' else 'cpu', dtype=torch.float32)
    prompt = modele.create_voice_clone_prompt(ref_audio=ref, ref_text=texte_ref, x_vector_only_mode=False)
    for i, phrase in enumerate(PHRASES, 1):
        etape('Qwen3-TTS : phrase %d sur %d' % (i, len(PHRASES)))
        t0 = time.time()
        sons, sr = modele.generate_voice_clone(text=phrase, language='French', voice_clone_prompt=prompt)
        calcul = time.time() - t0
        f = os.path.join(sortie, 'qwen-%d.wav' % i)
        soundfile.write(f, sons[0], sr)
        rapport.append({'moteur': 'qwen', 'phrase': i, 'fichier': os.path.basename(f), 'calcul': round(calcul, 1), 'duree': round(len(sons[0]) / sr, 1), 'appareil': dev})


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--moteur', choices=['chatterbox', 'qwen'], required=True)
    a.add_argument('--voix', required=True)
    a.add_argument('--sortie', required=True)
    a.add_argument('--selection-seule', action='store_true')
    o = a.parse_args()
    etape('Choix de l\'extrait de ta voix')
    ref, texte, total = choisir_reference(o.voix, o.sortie)
    print('Extrait de référence : %.1f s' % total, flush=True)
    if o.selection_seule:
        return
    rapport = []
    fichier_rapport = os.path.join(o.sortie, 'rapport-%s.json' % o.moteur)
    try:
        if o.moteur == 'chatterbox':
            chatterbox(ref, o.sortie, rapport)
        else:
            qwen(ref, texte, o.sortie, rapport)
    except Exception as e:  # le détail est gardé dans le journal ; le message affiché reste court
        import traceback
        traceback.print_exc()
        erreur('%s : %s' % (type(e).__name__, str(e)[:300]), 3)
    with open(fichier_rapport, 'w', encoding='utf-8') as f:
        json.dump(rapport, f, ensure_ascii=False, indent=1)
    etape('Terminé')


if __name__ == '__main__':
    main()
