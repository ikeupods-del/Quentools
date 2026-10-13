"""Contrôles de QuentStudio : python verifier.py [--rapide] [--videos N]

--rapide : sans rendu vidéo (scénarios, anti-répétition, validation, calage, IA simulée).
Par défaut : rend aussi une vidéo et vérifie sa durée exacte avec ffprobe.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
DATA = tempfile.mkdtemp(prefix="quentstudio-test-")
os.environ["QS_DATA"] = DATA
# la vraie voix est reprise si elle est installée (évite un nouveau téléchargement)
VRAIE = Path(os.environ.get("QS_MODELES_SOURCE") or Path.home() / "Movies" / "QuentStudio" / "modeles")
for f in VRAIE.glob("fr_FR-upmc-medium.onnx*") if VRAIE.exists() else []:
    (Path(DATA) / "modeles").mkdir(parents=True, exist_ok=True)
    shutil.copy(f, Path(DATA) / "modeles" / f.name)

import config  # noqa: E402
import corpus  # noqa: E402
import history  # noqa: E402
import procedural  # noqa: E402
import render  # noqa: E402
import story  # noqa: E402

ok = ko = 0


def check(nom, cond, detail=""):
    global ok, ko
    if cond:
        ok += 1
    else:
        ko += 1
        print(f"ÉCHEC : {nom} {detail}")


# ---------- Bibliothèque et générateur ----------
check("49 situations écrites à la main", len(corpus.SITUATIONS) == 49)
check("bibliothèque créée", len(corpus.charger()) == 49)
for s in corpus.depart():
    try:
        story.clean_sketch(s)
    except ValueError as e:
        check("situation valide", False, f"{s['titre']} : {e}")
lot = procedural.sketchs_neufs(300)
check("générateur procédural : 300 sketchs neufs", len(lot) == 300, len(lot))
check("générateur : aucun doublon proche",
      all(not history.trop_proche(a, b) for i, a in enumerate(lot) for b in lot[:i]))
bad = 0
for s in lot:
    try:
        story.clean_sketch(s)
    except ValueError:
        bad += 1
check("générateur : tous validés par clean_sketch", bad == 0, bad)
check("générateur : plus de 10 millions de combinaisons", procedural.combinaisons() > 10_000_000)
import random as _r  # noqa: E402
fautes = [p["texte"] for s in (procedural.sketch(_r.Random(i)) for i in range(3000)) for p in s["plans"]
          if p["qui"] == "G" and (re.search(r"\b(à|de) (le|les) ", p["texte"]) or "{" in p["texte"])]
check("générateur : pas de « à le » ni « de les » ni de trou", not fautes, fautes[:3])
check("sous-titres : ponctuation jamais seule en début de ligne",
      all(not l.startswith(("?", "!", ":", "»")) for l in render.couper("Qui tient le thermostat ? Et « internet » ?", render.police(68), 300)))

# ---------- Validation ----------
base = corpus.depart()[0]


def refuse(d):
    try:
        story.clean_sketch(d)
        return False
    except ValueError:
        return True


check("clean : 5 plans refusés", refuse(dict(base, plans=base["plans"] + base["plans"][:1])))
check("clean : un seul personnage refusé", refuse(dict(base, plans=[{"qui": "Q", "texte": "Bonjour."}] * 4)))
check("clean : marque refusée", refuse(dict(base, titre="Le iPhone de Glitchou")))
check("clean : réplique trop longue refusée", refuse(dict(base, plans=[{"qui": "Q", "texte": "mot " * 30}] + base["plans"][1:])))
try:
    story.clean({"sketchs": [base, base, corpus.depart()[1]], "question": "Ça va"})
    check("clean : sketchs identiques refusés", False)
except ValueError:
    check("clean : sketchs identiques refusés", True)
v = story.clean({"sketchs": corpus.depart()[:3], "question": "Ça va"})
check("clean : question terminée par ?", v["question"].endswith("?"))

# ---------- Anti-répétition ----------
history.noter(corpus.depart()[:3])
check("historique : titre déjà vu refusé", history.deja_vu({"titre": "Le café optimisé !", "mots": ["x", "y"]}))
check("historique : mêmes mots-clés refusés", history.deja_vu({"titre": "Autre titre", "mots": ["cafe", "machine"]}))
check("historique : nouveau sketch accepté", not history.deja_vu({"titre": "La trottinette pressée", "mots": ["trottinette", "vitesse"]}))
b = story.scenario("bibliotheque", journal=lambda m: None)
check("bibliothèque : sketchs jamais vus", not any(s["titre"] in ("Le café optimisé", "Le wifi en mode avion", "La liste de courses") for s in b["sketchs"]))
p = story.scenario("procedural", journal=lambda m: None)
avant = len(corpus.charger())
check("mode procédural : 3 sketchs", len(p["sketchs"]) == 3)
check("la bibliothèque s'enrichit", avant > 49)

# ---------- Appel à s'abonner ----------
reg = config.reglages()
check("CTA : 12 mots maximum", all(len(t.split()) <= 12 for _, t in reg["cta_lignes"]))
i1, i2 = history.cta_suivant(len(reg["cta_lignes"])), history.cta_suivant(len(reg["cta_lignes"]))
check("CTA : les variantes tournent", i1 != i2)
(Path(DATA) / "config.json").write_text(json.dumps({"cta_bouton": "ABONNE-TOI", "cta_lignes": [["G", "Abonne-toi, Glitchou a besoin d'amis."], ["Q", "trop " * 13]]}), "utf-8")
reg2 = config.reglages()
check("CTA : config.json pris en compte (et ligne trop longue ignorée)", reg2["cta_bouton"] == "ABONNE-TOI" and len(reg2["cta_lignes"]) == 1)
(Path(DATA) / "config.json").unlink()

# ---------- Calage à 62,0 s ----------
for voix, cta in [([2.0] * 12, 2.5), ([5.5] * 12, 3.4), ([7.0] * 12, 4.0), ([0.6] * 12, 1.2), ([3] * 11 + [12], 3)]:
    im, fin, tempo = render.caler(voix, cta)
    check(f"calage exact ({voix[0]} s)", sum(im) + fin == render.TOTAL and all(x > 0 for x in im), (sum(im) + fin))
    check(f"carte finale comprise ({voix[0]} s)", config.FIN_MIN * 30 - 1 <= fin <= config.FIN_MAX * 30 + 1, fin)

# ---------- IA locale simulée (format de réponse d'Ollama) ----------
reponses = [
    "pas du json",
    json.dumps({"titre": "La machine à café", "lieu": "Cuisine", "mots": ["cafe", "machine"], "plans": base["plans"]}),  # trop proche
    json.dumps({"titre": "Le parapluie automatique", "lieu": "Rue", "mots": ["parapluie", "pluie"], "plans": [
        {"qui": "Q", "texte": "Le parapluie s'ouvre dans le métro."}, {"qui": "G", "texte": "Je prévois la pluie. Toutes les pluies."},
        {"qui": "Q", "texte": "Il fait grand soleil."}, {"qui": "G", "texte": "Alors c'est un parasol. Polyvalent !"}]}),
    json.dumps({"titre": "La bibliothèque rangée", "lieu": "Salon", "mots": ["livres", "rangement"], "plans": [
        {"qui": "Q", "texte": "Pourquoi mes livres sont classés par poids ?"}, {"qui": "G", "texte": "Les lourds en bas. C'est de la physique."},
        {"qui": "Q", "texte": "Je ne trouve plus rien."}, {"qui": "G", "texte": "Soulève-les un par un. C'est du sport."}]}),
    json.dumps({"titre": "Le tapis de course", "lieu": "Salon", "mots": ["tapis", "course"], "plans": [
        {"qui": "Q", "texte": "Le tapis de course va trop vite."}, {"qui": "G", "texte": "Je t'entraîne pour un marathon. Demain."},
        {"qui": "Q", "texte": "Je voulais marcher."}, {"qui": "G", "texte": "Marcher, c'est courir avec patience."}]}),
]


class FauxOllama(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, d):
        c = json.dumps(d).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(c)))
        self.end_headers()
        self.wfile.write(c)

    def do_GET(self):
        self._json({"models": [{"name": "llama3.2:3b"}]})

    def do_POST(self):
        d = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        assert d["format"]["required"] and d["messages"][1]["content"].startswith("Exemples")
        self._json({"message": {"role": "assistant", "content": reponses.pop(0) if reponses else "{}"}})


srv = ThreadingHTTPServer(("127.0.0.1", 0), FauxOllama)
threading.Thread(target=srv.serve_forever, daemon=True).start()
config.OLLAMA = f"http://127.0.0.1:{srv.server_address[1]}"
check("IA : Ollama détecté", story.ollama_etat() == "ok")
journal = []
ia = story.scenario("ia", journal=journal.append)
check("IA : 3 sketchs validés malgré une réponse invalide et un doublon", [s["titre"] for s in ia["sketchs"]] ==
      ["Le parapluie automatique", "La bibliothèque rangée", "Le tapis de course"], [s["titre"] for s in ia["sketchs"]])
check("IA : doublon régénéré", any("trop proche" in j for j in journal), journal)
check("IA : sketchs ajoutés à la bibliothèque", any(s["titre"] == "Le tapis de course" for s in corpus.charger()))
srv.shutdown()
config.OLLAMA = "http://127.0.0.1:9"
check("sans Ollama : le mode auto passe au procédural", "procédural" in story.scenario("auto", journal=lambda m: None)["mode"])
n = story.pregenerer(5, journal=lambda m: None)
check("génération en avance (sans IA) : 5 scénarios en réserve", n == 5 and len(story.reserve()) == 5)
a = story.scenario("auto", journal=lambda m: None)
check("le mode auto puise d'abord dans la réserve", a["mode"].startswith("réserve") and len(story.reserve()) == 2, a["mode"])


# ---------- QuentInvest ----------
import invest  # noqa: E402

config.serie = "quentinvest"
for f in invest.FICHES:
    try:
        invest.clean_episode(invest.episode_depuis_fiche(f), f["faits"])
    except ValueError as e:
        check("fiche QuentInvest valide", False, f"{f['id']} : {e}")
check("QuentInvest : sujet reconnu (krach de 1929)", (invest.fiche_pour("résume le krach boursier de 1929") or {}).get("id") == "krach-1929")
check("QuentInvest : sujet inconnu sans fiche", invest.fiche_pour("le marché du cacao") is None)
ep = invest.episode_depuis_fiche(invest.FICHES[0])
ep["parties"][0]["plans"][1]["texte"] = "En 1931, tout le monde avait 3 voitures."
try:
    invest.clean_episode(ep, invest.FICHES[0]["faits"])
    check("QuentInvest : chiffre inventé refusé", False)
except ValueError as e:
    check("QuentInvest : chiffre inventé refusé", "chiffre" in str(e), e)
v = invest.scenario(sujet="Explique-moi l'inflation", journal=lambda m: None)
check("QuentInvest sans IA : fiche utilisée", v["episode"] == "L'inflation" and v["mode"] == "fiche" and not v["verifier"])
try:
    invest.scenario(sujet="le marché du cacao", journal=lambda m: None)
    check("QuentInvest sans IA : sujet libre refusé proprement", False)
except RuntimeError as e:
    check("QuentInvest sans IA : sujet libre refusé proprement", "IA locale" in str(e))
reponses_inv = [json.dumps({"titre": "Le cacao", "parties": [{"titre": "Une fève précieuse", "plans": [
    {"qui": "Q", "texte": "Pépite, pourquoi le chocolat coûte plus cher ?"}, {"qui": "G", "texte": "Le prix du cacao dépend de l'offre et de la demande."},
    {"qui": "Q", "texte": "Donc moins de fèves, prix plus haut ?"}, {"qui": "G", "texte": "En général, oui. La météo compte beaucoup."}]}] * 2 + [{"titre": "La leçon", "plans": [
    {"qui": "Q", "texte": "Je stocke du chocolat, alors ?"}, {"qui": "G", "texte": "Il fond, Max. Les matières premières sont très variables."},
    {"qui": "Q", "texte": "Variable comme mon humeur."}, {"qui": "G", "texte": "Retenir : un prix reflète l'offre et la demande."}]}], "question": "Tu as vu le prix du chocolat changer ?"})]


class FauxOllamaInvest(FauxOllama):
    def do_POST(self):
        self.rfile.read(int(self.headers["Content-Length"]))
        self._json({"message": {"role": "assistant", "content": reponses_inv.pop(0) if reponses_inv else "{}"}})


srv = ThreadingHTTPServer(("127.0.0.1", 0), FauxOllamaInvest)
threading.Thread(target=srv.serve_forever, daemon=True).start()
config.OLLAMA = f"http://127.0.0.1:{srv.server_address[1]}"
v = invest.scenario(sujet="le marché du cacao", journal=lambda m: None)
check("QuentInvest avec IA : sujet libre écrit et marqué à vérifier", v["episode"] == "Le cacao" and v["verifier"] and len(v["sketchs"]) == 3)
check("QuentInvest : l'épisode IA rejoint la bibliothèque", any(x.get("episode") == "Le cacao" for x in invest.bibliotheque()))
srv.shutdown()
config.OLLAMA = "http://127.0.0.1:9"
config.serie = "quentools"

# ---------- Rendu ----------
def duree(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=nb_frames,duration", "-of", "json", str(f)],
                       capture_output=True, text=True)
    return json.loads(r.stdout)


if "--rapide" not in sys.argv:
    nb = int(sys.argv[sys.argv.index("--videos") + 1]) if "--videos" in sys.argv else 1
    for k in range(nb):
        v = story.scenario("auto", journal=lambda m: None)
        sortie = Path(DATA) / "videos" / f"essai{k}.mp4"
        sortie.parent.mkdir(parents=True, exist_ok=True)
        meta = render.rendre(v, sortie, journal=print)
        d = duree(sortie)
        check("vidéo : durée exacte 62,000 s", abs(float(d["format"]["duration"]) - 62.0) < 0.0005, d["format"]["duration"])
        check("vidéo : 1860 images", any(s.get("nb_frames") == "1860" for s in d["streams"]), d["streams"])
        check("vidéo : CTA dans les 62 s", 50 < meta["cta"]["debut"] <= 62 - config.FIN_MIN + 0.01, meta["cta"])
        check("vidéo : chaque voix tient dans son plan", all(p["voix"] / max(meta["tempo"], 1) <= p["duree"] for p in meta["plans"]))
        print(f"Vidéo d'essai : {sortie} (voix : {meta['voix']}, tempo ×{meta['tempo']})")
    config.serie = "quentinvest"
    v = invest.scenario(sujet="les intérêts composés", journal=lambda m: None)
    sortie = Path(DATA) / "videos" / "essai-invest.mp4"
    meta = render.rendre(v, sortie, journal=print)
    d = duree(sortie)
    check("vidéo QuentInvest : durée exacte 62,000 s", abs(float(d["format"]["duration"]) - 62.0) < 0.0005, d["format"]["duration"])
    check("vidéo QuentInvest : appel à s'abonner de la série", meta["cta"]["texte"] in [t for _, t in config.CTA_LIGNES_INVEST])
    config.serie = "quentools"

print(f"QuentStudio : {ok} contrôles réussis, {ko} échecs")
if "--garder" not in sys.argv:
    shutil.rmtree(DATA, ignore_errors=True)
sys.exit(1 if ko else 0)
