"""QuenTools — ajoute une voix off française à la publicité QuenTools (30 s), calée plan par plan.
Usage : python3 tools/pub/voix-off.py chemin/vers/fr-siwis-medium.onnx
Voix : Piper « fr-siwis-medium » (jeu de données SIWIS, licence CC BY 4.0 : créditer « Voix : SIWIS, CC BY 4.0 »),
téléchargeable sur https://github.com/rhasspy/piper/releases (voice-fr-siwis-medium.tar.gz) ; le modèle n'est pas versionné.
Pour chaque vidéo de design/pub/ (réseaux 9:16 et web 16:9) : voix posée au début de chaque plan, musique baissée sous la voix,
volume final à −14 LUFS, image recopiée telle quelle. Sorties : …-voix.mp4 et la bande son …-voix.mp3. Nécessite piper-tts et ffmpeg."""
import json, os, subprocess, sys, tempfile, wave
from piper import PiperVoice
from piper.config import SynthesisConfig

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
PUB = os.path.join(ROOT, 'design', 'pub')
# (début du plan en s, fin du plan en s, texte) : mêmes coupes que tools/pub/quentools.html
LIGNES = [
    (0.3, 4.0, "Excel, des papiers, des messages à toute heure ?"),
    (4.2, 8.0, "QuenTools crée vos applis et vos outils."),
    (8.3, 14.0, "Vos clients réservent, paient l’acompte, et reviennent."),
    (14.3, 19.0, "Vos devis se font sur téléphone, devant le client."),
    (19.3, 23.5, "Et votre appli s’installe sur l’écran d’accueil."),
    (23.7, 26.5, "Prix fixé avant de commencer. À votre nom."),
    (26.7, 30.0, "QuenTools. Devis gratuit sur quentools point f r."),
]

def duree(f):
    with wave.open(f) as w: return w.getnframes() / w.getframerate()

def main(modele):
    voix = PiperVoice.load(modele)
    tmp = tempfile.mkdtemp(prefix='voix-')
    pistes = []
    for i, (t0, t1, texte) in enumerate(LIGNES):
        place, vitesse = t1 - t0 - 0.25, 1.0
        for _ in range(6):   # resserre le débit jusqu'à ce que la phrase tienne dans son plan
            f = os.path.join(tmp, f'l{i}.wav')
            with wave.open(f, 'wb') as w: voix.synthesize_wav(texte, w, syn_config=SynthesisConfig(length_scale=vitesse))
            if duree(f) <= place: break
            vitesse *= max(0.82, place / duree(f))
        pistes.append((t0, f))
        print(f'{t0:5.1f} s  {duree(f):4.1f} s  (débit {vitesse:.2f})  {texte}')
    # voix assemblée sur 30 s
    entrees, filtres = [], []
    for k, (t0, f) in enumerate(pistes):
        entrees += ['-i', f]; filtres.append(f'[{k}:a]aresample=48000,adelay={int(t0 * 1000)}|{int(t0 * 1000)},apad=whole_dur=30[v{k}]')
    filtres.append(''.join(f'[v{k}]' for k in range(len(pistes))) + f'amix=inputs={len(pistes)}:normalize=0,highpass=f=90,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=2.2,atrim=0:30[voix]')
    voixwav = os.path.join(tmp, 'voix.wav')
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', *entrees, '-filter_complex', ';'.join(filtres), '-map', '[voix]', '-ac', '2', voixwav], check=True)
    for nom in ('quentools-pub-30s-reseaux-9x16', 'quentools-pub-30s-web-16x9'):
        src = os.path.join(PUB, nom + '.mp4')
        if not os.path.exists(src): continue
        mix = os.path.join(tmp, nom + '.wav')
        # musique baissée quand la voix parle (compression déclenchée par la voix), puis mélange
        g = ('[0:a]aresample=48000[mus];[1:a]asplit=2[vx][sc];'
             '[mus]volume=0.6[mus2];[mus2][sc]sidechaincompress=threshold=0.02:ratio=12:attack=15:release=400:makeup=1[musb];'
             '[musb][vx]amix=inputs=2:normalize=0:weights=1 1.4[m]')
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-i', voixwav, '-filter_complex', g, '-map', '[m]', mix], check=True)
        m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', mix, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
        j = json.loads(m[m.rfind('{'):m.rfind('}') + 1])
        norm = os.path.join(tmp, nom + '-norm.wav')
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', mix, '-af',
                        f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true",
                        '-ar', '48000', norm], check=True)
        out = os.path.join(PUB, nom + '-voix.mp4')
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-i', norm, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', '30', out], check=True)
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', norm, '-c:a', 'libmp3lame', '-b:a', '192k',
                        os.path.join(PUB, nom.replace('-30s-', '-bande-son-voix-').replace('-9x16', '').replace('-16x9', '') + '.mp3')], check=True)
        print('ok', out)

if __name__ == '__main__':
    main(sys.argv[1])
