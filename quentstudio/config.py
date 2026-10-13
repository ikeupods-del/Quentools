"""Réglages de QuentStudio : dossiers, durées et appel à s'abonner.

Les textes de fin (appel à s'abonner) peuvent être changés sans toucher au code :
créer `~/Movies/QuentStudio/config.json`, par exemple
    {"cta_bouton": "S'ABONNER", "cta_lignes": [["G", "Abonne-toi, je promets de rester sage."]],
     "quentinvest": {"cta_lignes": [["G", "Abonne-toi pour une notion d'économie par jour."]]}}
"""
import json
import os
import sys
from pathlib import Path

# Fichiers livrés avec l'application (ui.html, persos/, bin/) : dossier du code, ou celui de l'app .dmg
RESSOURCES = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
# version « sans IA » du .dmg : fichier repère dans l'application (aucun moteur d'IA livré)
SANS_IA = bool(os.environ.get("QS_SANS_IA")) or (RESSOURCES / "sans-ia").exists() or (
    getattr(sys, "frozen", False) and (Path(sys.executable).resolve().parents[1] / "Resources" / "sans-ia").exists())
VERSION = (RESSOURCES / "version.txt").read_text("utf-8").strip() if (RESSOURCES / "version.txt").exists() else "dev"


def outil(nom):
    """Programme livré dans l'application (bin/ffmpeg, bin/airdrop), ou None."""
    f = RESSOURCES / "bin" / nom
    return str(f) if f.exists() else None


DATA = Path(os.environ.get("QS_DATA") or Path.home() / "Movies" / "QuentStudio")
VIDEOS = DATA / "videos"
MODELES = DATA / "modeles"

# Série active : « quentools » (sketchs comiques) ou « quentinvest » (vulgarisation de l'économie).
# Chaque série a sa bibliothèque, son historique et sa réserve (Quentools reste à la racine du dossier).
SERIES = ("quentools", "quentinvest")
serie = "quentools"


def chemin(nom, s=None):
    s = s or serie
    return DATA / nom if s == "quentools" else DATA / s / nom


# Vidéo
LARGEUR, HAUTEUR, FPS = 1080, 1920, 30
DUREE = 62.0                 # durée exacte de chaque vidéo (ne pas changer)
SKETCHS, PLANS = 3, 4        # 3 sketchs de 4 plans
QMIN = 2.0                   # durée minimale d'un plan (s)
MARGE = 0.35                 # respiration après chaque réplique (s)
FIN_MIN, FIN_MAX = 5.5, 8.0  # carte finale : question + appel à s'abonner (comprise dans les 62 s)

# IA locale (Ollama)
OLLAMA = os.environ.get("QS_OLLAMA", "http://127.0.0.1:11434")
MODELE_IA = os.environ.get("QS_MODELE", "llama3.2:3b")

# Appel à s'abonner : 12 mots maximum par réplique, les variantes tournent d'une vidéo à l'autre
CTA_BOUTON = "S'ABONNER"
CTA_LIGNES = [
    ("Q", "Abonne-toi, ou Glitchou reprend le clavier."),
    ("G", "Abonne-toi ! Je compte les abonnés, pas les erreurs."),
    ("Q", "Abonne-toi. Moi, j'ai besoin de soutien."),
    ("G", "Clique sur s'abonner. J'ai vérifié, c'est sans danger."),
    ("Q", "Abonne-toi avant qu'il mette à jour autre chose."),
    ("G", "Abonne-toi, sinon je range encore le bureau."),
    ("Q", "Un abonnement, et je dors peut-être ce soir."),
    ("G", "Abonne-toi ! C'est ma meilleure idée de la journée."),
]


# QuentInvest : Max (Q) et Pépite (G)
CTA_LIGNES_INVEST = [
    ("G", "Abonne-toi pour comprendre l'économie en une minute."),
    ("Q", "Abonne-toi, je deviens riche… de connaissances."),
    ("G", "Abonne-toi : une notion d'économie claire à chaque vidéo."),
    ("Q", "Abonne-toi avant que je réinvestisse mon argent de poche."),
    ("G", "Un abonnement, c'est un petit placement dans ta culture."),
    ("Q", "Abonne-toi. Pépite explique, moi je prends des notes."),
]


def reglages(s=None):
    """Constantes ci-dessus, remplacées par config.json s'il existe (clé « quentinvest » pour cette série)."""
    s = s or serie
    lignes = CTA_LIGNES_INVEST if s == "quentinvest" else CTA_LIGNES
    r = {"cta_bouton": CTA_BOUTON, "cta_lignes": [list(x) for x in lignes]}
    f = DATA / "config.json"
    if f.exists():
        try:
            perso = json.loads(f.read_text("utf-8"))
            if s != "quentools":
                perso = perso.get(s) or {}
            if isinstance(perso.get("cta_bouton"), str) and perso["cta_bouton"].strip():
                r["cta_bouton"] = perso["cta_bouton"].strip()[:20]
            lignes = [l for l in perso.get("cta_lignes") or [] if isinstance(l, list) and len(l) == 2
                      and l[0] in ("Q", "G") and 0 < len(str(l[1]).split()) <= 12]
            if lignes:
                r["cta_lignes"] = lignes
        except (ValueError, OSError):
            pass
    return r


# Options de la vidéo (cases de l'application), enregistrées dans options.json
OPTIONS = {"musique": True, "volume_musique": 100, "bruitages": True, "karaoke": True, "barre": True, "chiffres": True, "relire": False, "ia": True}


def options():
    o = dict(OPTIONS)
    lu = lire_json(DATA / "options.json", {})
    if isinstance(lu, dict):
        for k, v in lu.items():
            if k in OPTIONS and type(v) is type(OPTIONS[k]):
                o[k] = v
    o["volume_musique"] = max(0, min(200, int(o["volume_musique"])))
    return o


def ecrire_options(nouvelles):
    o = options()
    for k, v in (nouvelles or {}).items():
        if k in OPTIONS and type(v) is type(OPTIONS[k]):
            o[k] = v
    ecrire_json(DATA / "options.json", o)
    return options()


def lire_json(f, defaut):
    try:
        return json.loads(Path(f).read_text("utf-8"))
    except (ValueError, OSError):
        return defaut


def ecrire_json(f, donnees):
    f = Path(f)
    f.parent.mkdir(parents=True, exist_ok=True)
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(donnees, ensure_ascii=False, indent=1), "utf-8")
    tmp.replace(f)
