"""QuenTools — bande son de la publicité Paperdecrypt (musique et bruitages synthétisés, calés sur les repères de pub.html).
Usage : python3 tools/pub/audio.py cues.json sortie.wav   (30 s, 48 kHz, stéréo). Aucune musique tierce : tout est généré ici."""
import sys, json, wave
import numpy as np

SR = 48000
data = json.load(open(sys.argv[1]))
DUR = float(data['dur']); cues = data['cues']
N = int(SR * DUR)
T = np.arange(N) / SR
KS, ARP, CLAP, HAT, END = 3.5, 8.0, 8.0, 14.5, DUR - 4.5   # début du rythme, de l'arpège, des claps, des charleys ; fin du rythme (avant le logo)
CHIME = next((c['t'] for c in cues if c['k'] == 'chime'), DUR - 2.7)
rng = np.random.default_rng(7)

def place(buf, sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    seg = sig[: j - i] * gain
    buf[0, i:j] += seg * (1 - max(0, pan))
    buf[1, i:j] += seg * (1 + min(0, pan))

def env(n, a=0.005, d=0.2, shape=4.0):
    t = np.arange(n) / SR
    e = np.exp(-t / d * shape / 4)
    att = np.minimum(1, t / max(a, 1e-4))
    return e * att

def lp(x, fc):
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); acc = 0.0
    for k in range(len(x)):
        acc += a * (x[k] - acc); y[k] = acc
    return y

def hp(x, fc): return x - lp(x, fc)

def sine(f, n, ph=0.0): return np.sin(2 * np.pi * f * np.arange(n) / SR + ph)

def saw(f, n, harm=8):
    t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, harm + 1)) * 0.6

def kick(n=int(0.35 * SR)):
    t = np.arange(n) / SR
    f = 42 + 120 * np.exp(-t / 0.04)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.13) * np.minimum(1, t / 0.002)

def noise_burst(n, dec, fc_hp=None):
    x = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / dec)
    return hp(x, fc_hp) if fc_hp else x

def whoosh():
    n = int(0.62 * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    # balayage de fréquence : filtre passe-bas dont la coupure monte puis redescend
    fc = 300 + 5200 * np.sin(np.pi * np.clip(t / 0.62, 0, 1)) ** 2
    y = np.empty(n); acc = 0.0
    for k in range(n):
        a = 1 - np.exp(-2 * np.pi * fc[k] / SR); acc += a * (x[k] - acc); y[k] = acc
    return y * np.sin(np.pi * np.clip(t / 0.62, 0, 1)) ** 1.5 * 1.6

def pluck(f, dur=0.35, bright=4):
    n = int(dur * SR)
    return saw(f, n, bright) * env(n, 0.003, dur / 2.2)

def bell(f, dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR
    return (sine(f, n) + 0.5 * sine(f * 2.0, n) + 0.3 * sine(f * 3.01, n) + 0.2 * sine(f * 4.2, n)) * np.exp(-t / (dur / 3.2)) * np.minimum(1, t / 0.002)

# ---------- musique : 120 BPM, La mineur → Fa → Do → Sol ----------
music = np.zeros((2, N)); sfx = np.zeros((2, N))
BEAT = 0.5
CH = [([220.0, 261.63, 329.63], 55.0), ([174.61, 220.0, 261.63], 43.65), ([261.63, 329.63, 392.0], 65.41), ([196.0, 246.94, 293.66], 49.0)]
side = np.ones(N)   # compression par le kick (effet pompe)
kicks = [KS + k * BEAT for k in range(int((END - KS) / BEAT) + 1)]
for kt in kicks:
    i = int(kt * SR)
    if i < N: side[i:] *= 1.0; 
for kt in kicks:
    i = int(kt * SR); m = min(N, i + int(0.3 * SR))
    side[i:m] *= 1 - 0.55 * np.exp(-np.arange(m - i) / SR / 0.09)

pad = np.zeros((2, N)); 
for bar in range(int(DUR / 2) + 1):
    t0 = bar * 2.0
    notes, root = CH[bar % 4]
    n = int(2.15 * SR); e = np.minimum(1, np.arange(n) / SR / 0.35) * np.exp(-np.maximum(0, np.arange(n) / SR - 1.7) / 0.18)
    for k, f in enumerate(notes):
        for det, pan in ((-0.6, -0.5), (0.6, 0.5)):
            sig = (sine(f * (1 + det / 100), n) + 0.4 * sine(f * 2 * (1 + det / 100), n)) * e * 0.10
            place(pad, sig, t0, 1.0, pan)
    # basse : croches sur la fondamentale, dès 3 s
    if t0 + 1.99 > KS:
        for k in range(4):
            tb = t0 + k * BEAT
            if tb < KS or tb > END: continue
            n = int(0.42 * SR); bsig = (sine(root, n) * 0.9 + 0.35 * saw(root * 2, n, 5)) * env(n, 0.004, 0.22)
            place(music, bsig, tb + (0.25 if k % 2 else 0.0), 0.62)
    # arpège : doubles croches dès 6 s
    if ARP - 2 <= t0 < END:
        for k in range(16):
            ta = t0 + k * BEAT / 2
            if ta < ARP or ta > END: continue
            f = notes[[0, 1, 2, 1][k % 4]] * 2
            place(music, pluck(f, 0.22, 5), ta, 0.075, -0.3 if k % 2 else 0.3)
music += pad * (side[None, :] * 0.5 + 0.5)
# kicks, claps, charleys
for kt in kicks:
    place(music, kick(), kt, 0.95)
for kt in kicks[1::2]:
    if kt >= CLAP: place(music, noise_burst(int(0.16 * SR), 0.06, 1500), kt, 0.28); place(music, sine(190, int(0.16 * SR)) * np.exp(-np.arange(int(0.16 * SR)) / SR / 0.04), kt, 0.22)
for k in range(int((END - HAT) / (BEAT / 2))):
    if k % 2 == 1: place(music, noise_burst(int(0.05 * SR), 0.018, 6500), HAT + k * BEAT / 2, 0.30)
# montée avant le plan 3 s : bruit filtré qui monte
n = int((KS - 0.6) * SR); t = np.arange(n) / SR; x = rng.standard_normal(n) * (t / (KS - 0.6)) ** 2.2
rise = hp(x, 900) * 0.16
place(music, rise, 0.4, 1.0)
place(music, np.concatenate([sine(55, int(3 * SR)) * 0.0 + (sine(110, int(3 * SR)) * 0.22) * np.minimum(1, np.arange(int(3 * SR)) / SR / 1.2)]), 0.0, 1.0)
# final : accord de Do et fondu
for f, d in ((261.63, 0), (329.63, 0.04), (392.0, 0.08), (523.25, 0.12)):
    place(music, bell(f, 3.4) * 0.20, CHIME + d, 1.0, (f % 3 - 1) * 0.3)
# ---------- bruitages ----------
for c in cues:
    t, k = c['t'], c['k']
    if k == 'thump': place(sfx, kick(int(0.5 * SR)) * 1.3, t, 0.9); place(sfx, noise_burst(int(0.12 * SR), 0.03, 120), t, 0.35)
    elif k == 'whoosh': place(sfx, whoosh(), max(0, t - 0.30), 0.55, 0.15)
    elif k == 'pop':
        n = int(0.14 * SR); tt = np.arange(n) / SR; f = 420 + 700 * np.exp(-tt / 0.03)
        place(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.05), t, 0.55)
    elif k == 'tick': place(sfx, (sine(1900, int(0.05 * SR)) + sine(950, int(0.05 * SR)) * 0.5) * env(int(0.05 * SR), 0.001, 0.02), t, 0.45)
    elif k == 'type': place(sfx, noise_burst(int(0.025 * SR), 0.006, 2500) * 0.9, t, 0.28)
    elif k == 'ding': place(sfx, bell(1318.5, 1.1), t, 0.28); place(sfx, bell(1975.5, 0.9), t, 0.17)
    elif k == 'bell': place(sfx, bell(880, 1.6), t, 0.33); place(sfx, bell(1320, 1.4), t, 0.17)
    elif k == 'shutter':
        place(sfx, noise_burst(int(0.04 * SR), 0.01, 1800), t, 0.8); place(sfx, noise_burst(int(0.05 * SR), 0.012, 1200), t + 0.07, 0.7); place(sfx, sine(180, int(0.1 * SR)) * env(int(0.1 * SR), 0.001, 0.04), t, 0.5)
    elif k == 'scan':
        n = int(1.05 * SR); tt = np.arange(n) / SR; f = 380 + 1500 * tt; place(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 1.05) ** 1.2 * 0.5, t, 0.5)
    elif k == 'alert':
        for j in range(2): place(sfx, (sine(660, int(0.12 * SR)) + 0.4 * sine(1320, int(0.12 * SR))) * env(int(0.12 * SR), 0.003, 0.09), t + j * 0.16, 0.5)
    elif k == 'click': place(sfx, noise_burst(int(0.03 * SR), 0.008, 1500), t, 0.56); place(sfx, sine(1100, int(0.05 * SR)) * env(int(0.05 * SR), 0.001, 0.02), t, 0.7)
    elif k == 'swish':
        n = int(0.24 * SR); tt = np.arange(n) / SR; x = rng.standard_normal(n); fc = 600 + 3800 * (tt / 0.24); y = np.empty(n); acc = 0.0
        for q in range(n):
            a = 1 - np.exp(-2 * np.pi * fc[q] / SR); acc += a * (x[q] - acc); y[q] = acc
        place(sfx, y * np.sin(np.pi * tt / 0.24) * 1.5, t, 0.5, 0.2)
    elif k == 'chime': pass
mix = music * 0.7 + sfx * 1.0
# fondu d'entrée et de sortie, limiteur doux
fade = np.ones(N); fi = int(0.03 * SR); fade[:fi] = np.linspace(0, 1, fi); fo = int(1.6 * SR); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
mix *= fade[None, :]
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix *= 0.89 / max(1e-6, np.abs(mix).max())
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('audio ok', sys.argv[2])
