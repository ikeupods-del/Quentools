"""IA intégrée à QuentStudio : moteur llama.cpp livré dans l'application, modèle Qwen3 4B partagé avec QuentMovie.

Le modèle (~2,5 Go) est cherché d'abord dans ~/Movies/QuentMovie/modeles (s'il a déjà été téléchargé par QuentMovie,
Studio Posts ou Studio Sites, rien n'est retéléchargé), sinon téléchargé une seule fois dans ce même dossier.
Ollama reste utilisable en secours s'il est lancé sur le Mac. Tout le texte est produit sur le Mac.
"""
import json
import os
import threading
import urllib.request
from pathlib import Path

import config

MODELE = {"fichier": "Qwen3-4B-Instruct-2507-Q4_K_M.gguf", "mo": 2500,
          "url": "https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf"}
PARTAGE = Path.home() / "Movies" / "QuentMovie" / "modeles"
INSTALL = {"en_cours": False, "avancement": 0.0, "erreur": None}
_verrou = threading.Lock()
_llm = None


def dossiers():
    return [Path(os.environ["QS_MODELES_IA"])] if os.environ.get("QS_MODELES_IA") else [PARTAGE, config.MODELES]


def chemin_modele():
    for d in dossiers():
        f = d / MODELE["fichier"]
        if f.exists() and f.stat().st_size > 100_000_000:
            return f
    return None


def moteur_present():
    try:
        import llama_cpp
        return bool(llama_cpp.__name__)
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
    if moteur_present() and chemin_modele():
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


def _moteur():
    global _llm
    if _llm is None:
        from llama_cpp import Llama
        _llm = Llama(model_path=str(chemin_modele()), n_ctx=4096, n_gpu_layers=-1, verbose=False)
    return _llm


def discuter(systeme, demande, schema, temperature=0.8, max_tokens=900):
    """Réponse JSON (texte) au format imposé par le schéma : IA intégrée, sinon Ollama."""
    if moteur_present() and chemin_modele():
        with _verrou:  # un seul calcul à la fois (mémoire du MacBook Air)
            r = _moteur().create_chat_completion(
                messages=[{"role": "system", "content": systeme}, {"role": "user", "content": demande}],
                response_format={"type": "json_object", "schema": schema}, temperature=temperature, top_p=0.95, max_tokens=max_tokens)
        return r["choices"][0]["message"]["content"]
    r = _ollama("/api/chat", {"model": config.MODELE_IA, "stream": False, "format": schema,
                              "options": {"temperature": temperature, "top_p": 0.95, "num_predict": max_tokens},
                              "messages": [{"role": "system", "content": systeme}, {"role": "user", "content": demande}]})
    return (r.get("message") or {}).get("content", "")
