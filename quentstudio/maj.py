"""Mises à jour automatiques de QuentStudio (même principe que QuentMovie) : nouvelle version cherchée dans les
Releases du dépôt (étiquette quentstudio-vX.Y.Z), téléchargée en arrière-plan, installée à la fermeture ou au clic
« Redémarrer pour installer ». Actif uniquement dans l'application installée (.app).
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

import config

DEPOT = "ikeupods-del/Quentools"
API = os.environ.get("QS_MAJ_API", "https://api.github.com")
RE_DMG = re.compile(r"^QuentStudio-(\d+)\.(\d+)\.(\d+)-arm64\.dmg$")
DOSSIER = Path.home() / "Library" / "Application Support" / "QuentStudio" / "mises-a-jour"
ETAT = {"etat": "inactif", "version": None, "avancement": 0.0, "notes": "", "erreur": None, "fichier": None}


def comparer(a, b):
    """> 0 si a est plus récente que b."""
    pa, pb = [int(x) for x in a.split(".")], [int(x) for x in b.split(".")] if re.match(r"^\d+\.\d+\.\d+$", b) else [0, 0, 0]
    return (pa > pb) - (pa < pb)


def _json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "QuentStudio", "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def chercher(actuelle):
    meilleure = None
    for rel in _json(f"{API}/repos/{DEPOT}/releases?per_page=30"):
        if rel.get("draft") or rel.get("prerelease"):
            continue
        for a in rel.get("assets") or []:
            m = RE_DMG.match(a.get("name") or "")
            if not m:
                continue
            v = ".".join(m.groups())
            if comparer(v, actuelle) > 0 and (not meilleure or comparer(v, meilleure["version"]) > 0):
                d = a.get("digest") or ""
                meilleure = {"version": v, "url": a["browser_download_url"], "taille": a.get("size"),
                             "sha256": d[7:] if d.startswith("sha256:") else "", "notes": (rel.get("body") or "")[:3000]}
    return meilleure


def app_actuelle():
    """…/QuentStudio.app à partir du programme en cours (application installée seulement)."""
    if not getattr(sys, "frozen", False):
        return None
    app = Path(sys.executable).resolve().parents[2]
    return app if app.suffix == ".app" else None


def peut_remplacer(app):
    if not app:
        return "Mises à jour automatiques actives seulement dans l'application installée."
    if "/AppTranslocation/" in str(app):
        return "Glisse d'abord QuentStudio dans le dossier Applications pour activer les mises à jour."
    if not os.access(app.parent, os.W_OK) or not os.access(app, os.W_OK):
        return "Le dossier de QuentStudio est protégé en écriture."
    return ""


def telecharger(info):
    DOSSIER.mkdir(parents=True, exist_ok=True)
    dest = DOSSIER / f"QuentStudio-{info['version']}.dmg"
    if dest.exists():
        return dest
    part = dest.with_suffix(".dmg.part")
    h = hashlib.sha256()
    req = urllib.request.Request(info["url"], headers={"User-Agent": "QuentStudio"})
    with urllib.request.urlopen(req, timeout=60) as r, open(part, "wb") as f:
        total, fait = int(r.headers.get("Content-Length") or info.get("taille") or 0), 0
        while True:
            bloc = r.read(1 << 20)
            if not bloc:
                break
            f.write(bloc)
            h.update(bloc)
            fait += len(bloc)
            ETAT["avancement"] = fait / total if total else 0
    if info.get("taille") and part.stat().st_size != info["taille"]:
        part.unlink()
        raise RuntimeError("téléchargement incomplet")
    if info.get("sha256") and h.hexdigest() != info["sha256"]:
        part.unlink()
        raise RuntimeError("fichier de mise à jour abîmé (empreinte différente)")
    part.replace(dest)
    return dest


def extraire(dmg, app):
    """Ouvre le .dmg et copie la nouvelle application à côté de l'ancienne (QuentStudio.app.nouvelle)."""
    mnt = tempfile.mkdtemp(prefix="qs-maj-")
    nouvelle = Path(str(app) + ".nouvelle")
    subprocess.run(["hdiutil", "attach", "-nobrowse", "-readonly", "-noautoopen", "-mountpoint", mnt, str(dmg)], check=True, capture_output=True)
    try:
        src = Path(mnt) / "QuentStudio.app"
        if not src.exists():
            raise RuntimeError("application absente du fichier de mise à jour")
        shutil.rmtree(nouvelle, ignore_errors=True)
        subprocess.run(["ditto", str(src), str(nouvelle)], check=True, capture_output=True)
    finally:
        subprocess.run(["hdiutil", "detach", mnt, "-force"], capture_output=True)
        shutil.rmtree(mnt, ignore_errors=True)
    subprocess.run(["xattr", "-dr", "com.apple.quarantine", str(nouvelle)], capture_output=True)
    return nouvelle


def _q(s):
    return "'" + str(s).replace("'", "'\\''") + "'"


def installer(relancer=True):
    """Lance le remplacement : attend la fermeture de QuentStudio, échange les versions, relance si demandé."""
    app, nouvelle = app_actuelle(), ETAT.get("fichier")
    if ETAT["etat"] != "pret" or not app or not nouvelle:
        return False
    script = DOSSIER / "remplacer.sh"
    script.write_text(f"""#!/bin/sh
APP={_q(app)}
NOUV={_q(nouvelle)}
n=0
while kill -0 {os.getpid()} 2>/dev/null && [ $n -lt 240 ]; do sleep 0.5; n=$((n+1)); done
if [ -d "$NOUV" ]; then
  rm -rf "$APP.ancienne"
  if mv "$APP" "$APP.ancienne"; then
    if mv "$NOUV" "$APP"; then rm -rf "$APP.ancienne"; else mv "$APP.ancienne" "$APP"; fi
  fi
fi
{'open "$APP"' if relancer else ''}
""", "utf-8")
    subprocess.Popen(["/bin/sh", str(script)], start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ETAT["etat"] = "installation"
    return True


def verifier(journal=print):
    """Cherche, télécharge et prépare la nouvelle version (sans rien interrompre)."""
    if ETAT["etat"] in ("recherche", "telechargement", "pret", "installation"):
        return ETAT
    app = app_actuelle()
    raison = peut_remplacer(app)
    if raison:
        ETAT.update(etat="inactif", erreur=raison)
        return ETAT
    try:
        ETAT.update(etat="recherche", erreur=None)
        info = chercher(config.VERSION)
        if not info:
            ETAT.update(etat="a_jour")
            return ETAT
        ETAT.update(etat="telechargement", version=info["version"], notes=info["notes"], avancement=0.0)
        journal(f"Nouvelle version {info['version']} : téléchargement en arrière-plan…")
        ETAT["fichier"] = str(extraire(telecharger(info), app))
        ETAT["etat"] = "pret"
        journal(f"QuentStudio {info['version']} est prête : elle s'installera à la fermeture (ou clique sur « Redémarrer pour installer »).")
    except Exception as e:
        ETAT.update(etat="erreur", erreur=str(e))
    return ETAT


def surveiller(journal=print):
    """Recherche discrète 10 s après le lancement, puis toutes les 6 heures."""
    def boucle():
        time.sleep(10)
        while True:
            verifier(journal)
            time.sleep(6 * 3600)
    threading.Thread(target=boucle, daemon=True).start()
