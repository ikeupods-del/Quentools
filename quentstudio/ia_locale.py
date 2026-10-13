"""IA intégrée à QuentStudio : moteur llama.cpp livré dans l'application, modèle Qwen3 4B partagé avec QuentMovie.

Le modèle (~2,5 Go) est cherché d'abord dans ~/Movies/QuentMovie/modeles (s'il a déjà été téléchargé par QuentMovie,
Studio Posts ou Studio Sites, rien n'est retéléchargé), sinon téléchargé une seule fois dans ce même dossier.
Ollama reste utilisable en secours s'il est lancé sur le Mac. Tout le texte est produit sur le Mac.

Le moteur tourne dans un processus à part (« --ia-serveur ») : s'il plante (puce graphique, mémoire…), QuentStudio
reste ouvert, relance le moteur sans la puce graphique et le note dans ~/Movies/QuentStudio/ia-journal.txt.
"""
import atexit
import json
import os
import queue
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

import config

MODELE = {"fichier": "Qwen3-4B-Instruct-2507-Q4_K_M.gguf", "mo": 2500,
          "url": "https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf"}
PARTAGE = Path.home() / "Movies" / "QuentMovie" / "modeles"
INSTALL = {"en_cours": False, "avancement": 0.0, "erreur": None}
_verrou = threading.Lock()


def dossiers():
    return [Path(os.environ["QS_MODELES_IA"])] if os.environ.get("QS_MODELES_IA") else [PARTAGE, config.MODELES]


def chemin_modele():
    for d in dossiers():
        f = d / MODELE["fichier"]
        if f.exists() and f.stat().st_size > 100_000_000:
            return f
    return None


def ia_permise():
    """IA coupée dans les réglages, ou version de QuentStudio livrée sans IA : jamais lancée."""
    return not config.SANS_IA and config.options()["ia"]


def moteur_present():
    """Moteur livré ? (sans le charger : il ne tourne que dans son propre processus)"""
    if not ia_permise():
        return False
    try:
        import importlib.util
        return importlib.util.find_spec("llama_cpp") is not None
    except Exception:
        return False


def _ollama(chemin, donnees=None, delai=180):
    req = urllib.request.Request(config.OLLAMA + chemin, method="POST" if donnees is not None else "GET",
                                 data=json.dumps(donnees).encode() if donnees is not None else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=delai) as r:
        return json.loads(r.read().decode("utf-8"))


def ollama_pret():
    try:
        noms = {m.get("name", "") for m in _ollama("/api/tags", delai=3).get("models", [])}
    except Exception:
        return False
    return any(n.split(":")[0] == config.MODELE_IA.split(":")[0] for n in noms)


def etat():
    """'ok' (prête), 'a_installer' (moteur présent, modèle à télécharger), 'absent' (ni moteur ni Ollama)."""
    if not ia_permise():
        return "absent"
    if moteur_present() and chemin_modele() and not _HS["oui"]:
        return "ok"
    if ollama_pret():
        return "ok"
    return "a_installer" if moteur_present() else "absent"


def installer(journal=print):
    """Télécharge le modèle dans le dossier partagé (reprise possible), en arrière-plan."""
    if INSTALL["en_cours"] or chemin_modele():
        return
    INSTALL.update(en_cours=True, avancement=0.0, erreur=None)
    dest = dossiers()[0] / MODELE["fichier"]
    part = dest.with_suffix(".gguf.part")
    try:
        dest.parent.mkdir(parents=True, exist_ok=True)
        deja = part.stat().st_size if part.exists() else 0
        req = urllib.request.Request(MODELE["url"], headers={"Range": f"bytes={deja}-"} if deja else {})
        with urllib.request.urlopen(req, timeout=60) as r, open(part, "ab" if deja and r.status == 206 else "wb") as f:
            total = int(r.headers.get("Content-Length") or 0) + (deja if r.status == 206 else 0)
            fait = deja if r.status == 206 else 0
            journal(f"Téléchargement de l'IA intégrée ({MODELE['mo'] / 1000:.1f} Go, une seule fois)…")
            while True:
                bloc = r.read(1 << 20)
                if not bloc:
                    break
                f.write(bloc)
                fait += len(bloc)
                INSTALL["avancement"] = fait / total if total else 0
        os.replace(part, dest)
        journal("IA intégrée prête.")
    except Exception as e:
        INSTALL["erreur"] = str(e)
        journal(f"Téléchargement de l'IA interrompu ({e}) : relance-le, il reprendra où il s'est arrêté.")
    finally:
        INSTALL["en_cours"] = False


# ---------- moteur dans un processus à part ----------
DELAI = int(os.environ.get("QS_IA_DELAI", "420"))  # secondes au plus pour une réponse
_proc = None
_sorties = None
_HS = {"oui": False}  # moteur en panne même sans la puce graphique : on s'en passe jusqu'au prochain lancement


def _reglages():
    r = config.lire_json(config.DATA / "ia.json", {})
    return r if isinstance(r, dict) else {}


def _sans_gpu():
    """Processeur par défaut (stable sur tous les Mac) ; la puce graphique seulement si ia.json → « gpu » vaut vrai."""
    return os.environ.get("QS_IA_CPU") == "1" or not bool(_reglages().get("gpu"))


def _noter(texte):
    try:
        config.DATA.mkdir(parents=True, exist_ok=True)
        with open(config.DATA / "ia-journal.txt", "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + texte.rstrip() + "\n")
    except OSError:
        pass


def _commande():
    if os.environ.get("QS_IA_COMMANDE"):  # essais : faux moteur
        return json.loads(os.environ["QS_IA_COMMANDE"])
    if getattr(sys, "frozen", False):
        return [sys.executable, "--ia-serveur"]
    return [sys.executable, str(Path(__file__).resolve()), "--ia-serveur"]


def _arreter():
    global _proc
    if _proc and _proc.poll() is None:
        try:
            _proc.kill()
        except OSError:
            pass
    _proc = None


atexit.register(_arreter)


def _demarrer():
    global _proc, _sorties
    _arreter()
    config.DATA.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, "QS_IA_GPU": "0" if _sans_gpu() else "1", "QS_IA_MODELE": str(chemin_modele())}
    err = open(config.DATA / "ia-journal.txt", "a", encoding="utf-8")
    _proc = subprocess.Popen(_commande(), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=err, env=env, text=True, bufsize=1)
    _sorties = queue.Queue()
    p, q = _proc, _sorties
    threading.Thread(target=lambda: [q.put(l) for l in p.stdout] + [q.put(None)], daemon=True).start()


def _demander(message):
    """Envoie une demande au moteur et attend sa réponse (exception si le moteur s'arrête ou ne répond pas)."""
    if not _proc or _proc.poll() is not None:
        _demarrer()
    _proc.stdin.write(json.dumps(message) + "\n")
    _proc.stdin.flush()
    fin = time.time() + DELAI
    while True:
        try:
            ligne = _sorties.get(timeout=max(1, fin - time.time()))
        except queue.Empty:
            _arreter()
            raise TimeoutError("l'IA n'a pas répondu à temps")
        if ligne is None:
            code = _proc.poll() if _proc else None
            _arreter()
            raise RuntimeError(f"le moteur de l'IA s'est arrêté (code {code})")
        try:
            r = json.loads(ligne)
        except ValueError:
            continue  # ligne écrite par la bibliothèque, pas une réponse
        if "erreur" in r:
            raise RuntimeError(r["erreur"])
        return r.get("texte", "")


def _local(systeme, demande, schema, temperature, max_tokens):
    msg = {"systeme": systeme, "demande": demande, "schema": schema, "temperature": temperature, "max_tokens": max_tokens}
    try:
        return _demander(msg)
    except (RuntimeError, TimeoutError) as e:
        if not (isinstance(e, TimeoutError) or "s'est arrêté" in str(e)) or _sans_gpu():
            raise
        # plantage avec la puce graphique : on retient de s'en passer et on recommence sur le processeur
        _noter(f"Moteur arrêté avec la puce graphique ({e}) : passage sur le processeur.")
        config.ecrire_json(config.DATA / "ia.json", {**_reglages(), "gpu": False})
        try:
            return _demander(msg)
        except (RuntimeError, TimeoutError) as e2:
            if isinstance(e2, TimeoutError) or "s'est arrêté" in str(e2):
                _HS["oui"] = True
                _noter(f"Moteur arrêté aussi sur le processeur ({e2}) : IA désactivée jusqu'au prochain lancement.")
            raise


def serveur():
    """Processus du moteur : lit une demande JSON par ligne, répond une ligne JSON."""
    from llama_cpp import Llama
    gpu = os.environ.get("QS_IA_GPU", "1") == "1"
    llm = Llama(model_path=os.environ["QS_IA_MODELE"], n_ctx=4096, n_gpu_layers=-1 if gpu else 0, verbose=False)
    sortie = sys.stdout
    sys.stdout = sys.stderr  # ce que la bibliothèque écrit ne doit pas se mêler aux réponses
    for ligne in sys.stdin:
        try:
            m = json.loads(ligne)
            r = llm.create_chat_completion(
                messages=[{"role": "system", "content": m["systeme"]}, {"role": "user", "content": m["demande"]}],
                response_format={"type": "json_object", "schema": m["schema"]}, temperature=m["temperature"], top_p=0.95, max_tokens=m["max_tokens"])
            rep = {"texte": r["choices"][0]["message"]["content"]}
        except Exception as e:  # une erreur Python ne doit pas arrêter le moteur
            rep = {"erreur": f"{type(e).__name__}: {e}"}
        sortie.write(json.dumps(rep) + "\n")
        sortie.flush()


def discuter(systeme, demande, schema, temperature=0.8, max_tokens=900):
    """Réponse JSON (texte) au format imposé par le schéma : IA intégrée, sinon Ollama."""
    if not ia_permise():
        raise RuntimeError("IA coupée dans les réglages")
    if moteur_present() and chemin_modele() and not _HS["oui"]:
        with _verrou:  # un seul calcul à la fois (mémoire du MacBook Air)
            return _local(systeme, demande, schema, temperature, max_tokens)
    r = _ollama("/api/chat", {"model": config.MODELE_IA, "stream": False, "format": schema,
                              "options": {"temperature": temperature, "top_p": 0.95, "num_predict": max_tokens},
                              "messages": [{"role": "system", "content": systeme}, {"role": "user", "content": demande}]})
    return (r.get("message") or {}).get("content", "")


if __name__ == "__main__" and "--ia-serveur" in sys.argv:
    serveur()
