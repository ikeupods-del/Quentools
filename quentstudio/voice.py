"""Voix : Piper (local) avec la voix française « upmc » (Pierre et Jessica), sinon bips de secours.

- Quentools = Pierre (QS_SPK_Q, par défaut le numéro de « pierre » lu dans le modèle), un peu plus grave.
- Glitchou = Jessica (QS_SPK_G, par défaut « jessica »), accélérée et plus aiguë.
Les numéros de locuteurs sont lus dans le fichier .onnx.json du modèle (pas supposés).
"""
import array
import json
import math
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import wave
from pathlib import Path

import config

TAUX = 22050
MODELE = "fr_FR-upmc-medium"
SOURCES = [  # le premier qui répond
    f"https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/{MODELE}.onnx",
    f"https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-{MODELE}.tar.bz2",
]
# Post-traitement ffmpeg : hauteur (asetrate) puis tempo
EFFETS = {"Q": "asetrate={t}*0.93,aresample={t},atempo=1.04", "G": "asetrate={t}*1.12,aresample={t},atempo=1.12"}


def chemin_modele():
    return config.MODELES / f"{MODELE}.onnx"


def assurer_modele(journal=print):
    """Télécharge la voix si elle manque (seul téléchargement autorisé avec les modèles d'IA)."""
    onnx = chemin_modele()
    if onnx.exists() and Path(str(onnx) + ".json").exists():
        return onnx
    config.MODELES.mkdir(parents=True, exist_ok=True)
    for url in SOURCES:
        try:
            journal(f"Téléchargement de la voix : {url.split('/')[2]}")
            if url.endswith(".onnx"):
                for suffixe in ("", ".json"):
                    urllib.request.urlretrieve(url + suffixe, str(onnx) + suffixe + ".part")
                for suffixe in ("", ".json"):
                    os.replace(str(onnx) + suffixe + ".part", str(onnx) + suffixe)
            else:
                with tempfile.TemporaryDirectory() as d:
                    arch = Path(d) / "voix.tar.bz2"
                    urllib.request.urlretrieve(url, arch)
                    with tarfile.open(arch) as t:
                        for m in t.getmembers():
                            nom = Path(m.name).name
                            if nom in (onnx.name, onnx.name + ".json") and m.isfile():
                                (config.MODELES / nom).write_bytes(t.extractfile(m).read())
            if onnx.exists() and Path(str(onnx) + ".json").exists():
                return onnx
        except Exception as e:
            journal(f"  échec : {e}")
    return None


def locuteurs():
    """{'Q': numéro, 'G': numéro} : variables QS_SPK_Q / QS_SPK_G, sinon noms lus dans le modèle."""
    carte = {}
    try:
        carte = json.loads(Path(str(chemin_modele()) + ".json").read_text("utf-8")).get("speaker_id_map") or {}
    except (OSError, ValueError):
        pass
    q = os.environ.get("QS_SPK_Q")
    g = os.environ.get("QS_SPK_G")
    return {"Q": int(q) if q else carte.get("pierre", 1), "G": int(g) if g else carte.get("jessica", 0)}


class Voix:
    """Synthèse d'une réplique en échantillons 16 bits à 22 050 Hz (array('h'))."""

    def __init__(self, ffmpeg="ffmpeg", journal=print):
        self.ffmpeg = ffmpeg
        self.journal = journal
        self.mode = "bips"
        self._api = None
        self._cli = None
        onnx = chemin_modele() if chemin_modele().exists() else None
        if os.environ.get("QS_BIPS"):
            onnx = None
        if onnx:
            self.spk = locuteurs()
            try:  # piper-tts 1.3 et plus : API Python (pas de souci de drapeaux)
                from piper import PiperVoice, SynthesisConfig  # noqa
                self._api = (PiperVoice.load(str(onnx)), SynthesisConfig)
                self.mode = "piper"
            except Exception as e:
                self._cli = self._trouver_cli(onnx)
                if self._cli:
                    self.mode = "piper"
                else:
                    journal(f"Piper indisponible ({e}) : voix de secours en bips")

    def _trouver_cli(self, onnx):
        """Ancienne CLI : drapeaux à tirets ou à soulignés selon la version installée."""
        exe = shutil.which("piper") or str(Path(sys.executable).with_name("piper"))
        if not Path(exe).exists() and not shutil.which("piper"):
            return None
        try:
            aide = subprocess.run([exe, "--help"], capture_output=True, text=True, timeout=20).stdout
        except Exception:
            return None
        tiret = "--output-file" in aide or "--length-scale" in aide
        return {"exe": exe, "modele": str(onnx), "sortie": "--output-file" if tiret else "--output_file",
                "spk": "--speaker", "len": "--length-scale" if tiret else "--length_scale"}

    def _piper(self, texte, qui, fichier):
        spk = self.spk[qui]
        if self._api:
            pv, SC = self._api
            with wave.open(fichier, "wb") as w:
                pv.synthesize_wav(texte, w, syn_config=SC(speaker_id=spk, length_scale=1.0))
            return
        c = self._cli
        subprocess.run([c["exe"], "--model", c["modele"], c["spk"], str(spk), c["len"], "1.0", c["sortie"], fichier],
                       input=texte, text=True, capture_output=True, check=True, timeout=120)

    def dire(self, texte, qui, tempo=1.0, effet=None):
        """Échantillons de la réplique (effets de personnage appliqués, tempo supplémentaire éventuel)."""
        if self.mode != "piper":
            return bips(texte, qui, tempo)
        with tempfile.TemporaryDirectory() as d:
            brut, fini = os.path.join(d, "a.wav"), os.path.join(d, "b.wav")
            try:
                self._piper(texte, qui, brut)
            except Exception as e:
                self.journal(f"Piper a échoué ({e}) : bips pour cette réplique")
                return bips(texte, qui, tempo)
            filtre = (effet or EFFETS[qui]).format(t=lire_taux(brut))
            t = tempo
            while t > 1.0001:  # atempo accepte 0,5 à 2 par étage
                f = min(2.0, t)
                filtre += f",atempo={f:.4f}"
                t /= f
            subprocess.run([self.ffmpeg, "-v", "error", "-y", "-i", brut, "-af", filtre + f",aresample={TAUX}",
                            "-ac", "1", "-ar", str(TAUX), "-c:a", "pcm_s16le", fini], check=True, capture_output=True)
            return lire_wav(fini)


def lire_taux(f):
    with wave.open(f) as w:
        return w.getframerate()


def lire_wav(f):
    with wave.open(f) as w:
        a = array.array("h")
        a.frombytes(w.readframes(w.getnframes()))
        if sys.byteorder == "big":
            a.byteswap()
        return a


def bips(texte, qui, tempo=1.0):
    """Voix de secours : une petite note par syllabe approximative (grave pour Q, aiguë pour G)."""
    base = 150 if qui == "Q" else 420
    out = array.array("h")
    syll = max(2, int(len([c for c in texte if c.lower() in "aeiouyéèêàâîôû"]) * 0.9))
    for i in range(syll):
        f = base * (1 + 0.12 * math.sin(i * 1.7))
        n = int(TAUX * 0.13 / tempo)
        for k in range(n):
            env = min(1.0, k / 200) * min(1.0, (n - k) / 400)
            out.append(int(5500 * env * math.sin(2 * math.pi * f * k / TAUX)))
        out.extend([0] * int(TAUX * 0.035 / tempo))
    return out


def ding():
    """Petit son de cloche discret pour le bouton « S'abonner »."""
    n = int(TAUX * 0.9)
    a = array.array("h", [0] * n)
    for f, v in ((1318.5, 0.55), (1975.5, 0.25), (2637.0, 0.12)):
        for k in range(n):
            a[k] += int(9000 * v * math.exp(-k / (TAUX * 0.22)) * math.sin(2 * math.pi * f * k / TAUX))
    return a
