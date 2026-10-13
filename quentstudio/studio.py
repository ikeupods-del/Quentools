"""QuentStudio : fenêtre de l'application (pywebview) autour d'un petit serveur local.

Lancement : python studio.py  (ou QuentStudio.app après `bash install_mac.sh`).
Tout reste local : seules la voix Piper et le modèle Ollama sont téléchargés une fois.
"""
import json
import os
import subprocess
import sys
import threading
import time
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

# Lancé depuis le Dock, le PATH est minimal : on ajoute Homebrew pour trouver ffmpeg et ollama
for d in ("/opt/homebrew/bin", "/usr/local/bin"):
    if os.path.isdir(d) and d not in os.environ.get("PATH", "").split(":"):
        os.environ["PATH"] = d + ":" + os.environ.get("PATH", "")

import config  # noqa: E402
import corpus  # noqa: E402
import history  # noqa: E402
import invest  # noqa: E402
import render  # noqa: E402
import series  # noqa: E402
import share  # noqa: E402
import story  # noqa: E402
import voice  # noqa: E402

ICI = config.RESSOURCES
ETAT = {"travail": None, "avancement": 0.0, "journal": [], "avance": None, "erreur": None}
VERROU = threading.Lock()


def journal(m):
    ETAT["journal"] = (ETAT["journal"] + [time.strftime("%H:%M:%S ") + str(m)])[-80:]


def videos():
    config.VIDEOS.mkdir(parents=True, exist_ok=True)
    l = sorted(config.VIDEOS.glob(config.serie + "-*.mp4"), key=lambda f: f.stat().st_mtime, reverse=True)[:12]
    out = []
    for f in l:
        m = config.lire_json(f.with_suffix(".json"), {})
        titres = [m["episode"]] if m.get("episode") else m.get("titres", [])
        out.append({"nom": f.name, "titres": titres, "mode": m.get("mode"), "voix": m.get("voix"), "a_verifier": m.get("a_verifier"),
                    "vignette": f.with_suffix(".jpg").exists()})
    return out


def nouvelle_video(mode, sujet=""):
    if not VERROU.acquire(blocking=False):
        return False
    serie = config.serie

    def tache():
        try:
            ETAT.update(travail=f"Nouvelle vidéo {series.serie(serie)['nom']} ({sujet or mode})", avancement=0.02, erreur=None)
            if serie == "quentinvest":
                journal(f"Écriture de l'épisode ({sujet or mode})…")
                v = invest.scenario(mode, sujet, journal=journal)
                journal(f"Épisode : {v['episode']} [{v['mode']}]" + (" · à relire avant publication" if v.get("verifier") else ""))
            else:
                journal(f"Écriture des sketchs ({mode})…")
                v = story.scenario(mode, journal=journal)
                journal("Sketchs : " + " · ".join(s["titre"] for s in v["sketchs"]) + f" [{v['mode']}]")
            nom = time.strftime(serie + "-%Y%m%d-%H%M%S.mp4")
            sortie = config.VIDEOS / nom
            render.rendre(v, sortie, journal=journal, avancement=lambda x: ETAT.update(avancement=0.05 + 0.9 * x), serie=serie)
            if serie == "quentinvest":
                history.noter([{"titre": t, "mots": []} for t in (v["episode"], v.get("sujet")) if t])
            else:
                history.noter(v["sketchs"])
            subprocess.run([render.ffmpeg_exe(), "-v", "error", "-y", "-ss", "8", "-i", str(sortie), "-frames:v", "1",
                            "-vf", "scale=270:-1", str(sortie.with_suffix(".jpg"))])
            journal(f"Vidéo prête : {nom}")
        except Exception as e:
            ETAT["erreur"] = str(e)
            journal(f"Erreur : {e}")
            traceback.print_exc()
        finally:
            ETAT.update(travail=None, avancement=0.0)
            VERROU.release()

    threading.Thread(target=tache, daemon=True).start()
    return True


def generer_en_avance(n=20):
    if ETAT["avance"]:
        return False

    def tache():
        try:
            ETAT["avance"] = f"0/{n}"
            gen = invest.pregenerer if config.serie == "quentinvest" else story.pregenerer
            k = gen(n, journal=journal, avancement=lambda i, t: ETAT.update(avance=f"{i}/{t}"))
            journal(f"{k} scénarios générés en avance")
        except Exception as e:
            journal(f"Erreur pendant la génération en avance : {e}")
        finally:
            ETAT["avance"] = None

    threading.Thread(target=tache, daemon=True).start()
    return True


_ia = {"t": 0, "v": "absent"}


def etat_ia():
    if time.time() - _ia["t"] > 10:
        _ia.update(t=time.time(), v=story.ollama_etat())
    return _ia["v"]


def etat():
    return {
        "travail": ETAT["travail"], "avancement": round(ETAT["avancement"], 3), "erreur": ETAT["erreur"],
        "avance": ETAT["avance"], "journal": ETAT["journal"][-14:],
        "serie": config.serie, "series": {k: {"nom": v["nom"], "sous_titre": v["sous_titre"]} for k, v in series.SERIES.items()},
        "bibliotheque": len(invest.FICHES) + len(invest.bibliotheque()) if config.serie == "quentinvest" else len(corpus.charger()),
        "reserve": len(invest.reserve()) if config.serie == "quentinvest" else len(story.reserve()),
        "fiches": [f["titre"] for f in invest.FICHES] if config.serie == "quentinvest" else [],
        "historique": len(history.charger()["sketchs"]),
        "ia": etat_ia(), "modele": config.MODELE_IA,
        "voix": "piper" if voice.chemin_modele().exists() and not os.environ.get("QS_BIPS") else "bips",
        "videos": videos(), "dossier": str(config.VIDEOS), "version": config.VERSION,
    }


class Serveur(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _envoyer(self, code, corps, type_="application/json; charset=utf-8"):
        if isinstance(corps, (dict, list)):
            corps = json.dumps(corps, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", type_)
        self.send_header("Content-Length", str(len(corps)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(corps)

    def _video(self, nom):
        f = config.VIDEOS / Path(unquote(nom)).name
        return f if f.exists() else None

    def do_GET(self):
        p = urlparse(self.path).path
        if p == "/":
            return self._envoyer(200, (ICI / "ui.html").read_bytes(), "text/html; charset=utf-8")
        if p == "/api/etat":
            return self._envoyer(200, etat())
        if p.startswith("/vignette/"):
            f = self._video(p[10:])
            if f and f.with_suffix(".jpg").exists():
                return self._envoyer(200, f.with_suffix(".jpg").read_bytes(), "image/jpeg")
        return self._envoyer(404, {"erreur": "introuvable"})

    def do_POST(self):
        p = urlparse(self.path).path
        n = int(self.headers.get("Content-Length") or 0)
        try:
            b = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            b = {}
        if p == "/api/video":
            mode = b.get("mode") if b.get("mode") in ("auto", "bibliotheque", "ia", "procedural") else "auto"
            sujet = str(b.get("sujet") or "").strip()[:200] if config.serie == "quentinvest" else ""
            return self._envoyer(200, {"ok": nouvelle_video(mode, sujet)})
        if p == "/api/serie":
            if b.get("serie") not in config.SERIES or ETAT["travail"] or ETAT["avance"]:
                return self._envoyer(200, {"ok": False})
            config.serie = b["serie"]
            config.ecrire_json(config.DATA / "serie.json", {"serie": config.serie})
            config.chemin("x").parent.mkdir(parents=True, exist_ok=True)
            return self._envoyer(200, {"ok": True})
        if p == "/api/avance":
            return self._envoyer(200, {"ok": generer_en_avance(20)})
        if p in ("/api/ouvrir", "/api/finder", "/api/airdrop"):
            f = self._video(b.get("nom", ""))
            if not f:
                return self._envoyer(404, {"erreur": "vidéo introuvable"})
            if sys.platform != "darwin":
                return self._envoyer(200, {"ok": False, "message": f"Fichier : {f}"})
            if p == "/api/ouvrir":
                subprocess.run(["open", str(f)])
                return self._envoyer(200, {"ok": True})
            if p == "/api/finder":
                subprocess.run(["open", "-R", str(f)])
                return self._envoyer(200, {"ok": True})
            par = share.airdrop(f)
            return self._envoyer(200, {"ok": True, "par": par})
        return self._envoyer(404, {"erreur": "introuvable"})


def icone_dock():
    """Lancé par le lanceur de l'app, le processus est « Python » : on remet nom et icône de QuentStudio."""
    if sys.platform != "darwin":
        return
    try:
        from AppKit import NSApplication, NSBundle, NSImage
        info = NSBundle.mainBundle().infoDictionary()
        info["CFBundleName"] = "QuentStudio"
        icns = os.environ.get("QS_ICONE") or str(ICI / "QuentStudio.icns")
        if os.path.exists(icns):
            NSApplication.sharedApplication().setApplicationIconImage_(NSImage.alloc().initWithContentsOfFile_(icns))
    except Exception:
        pass


def preparer_voix():
    """Premier lancement : télécharge la voix Piper (une seule fois) sans bloquer la fenêtre."""
    if voice.chemin_modele().exists() and voice.chemin_modele().with_suffix(".onnx.json").exists():
        return
    def tache():
        journal("Téléchargement de la voix (une seule fois, environ 75 Mo)…")
        journal("Voix prête." if voice.assurer_modele(journal=journal) else "Voix indisponible : bips de secours en attendant.")
    threading.Thread(target=tache, daemon=True).start()


def essai(sortie):
    """Essai de l'application installée (workflow de construction) : une vidéo de chaque série, résultat en JSON."""
    import json as _json
    res = {"version": config.VERSION, "ffmpeg": render.ffmpeg_exe(), "videos": []}
    try:
        res["modele_voix"] = str(voice.assurer_modele(journal=print))
        for serie in config.SERIES:
            config.serie = serie
            v = invest.scenario("auto", "les intérêts composés", journal=print) if serie == "quentinvest" else story.scenario("auto", journal=print)
            f = config.VIDEOS / f"essai-{serie}.mp4"
            meta = render.rendre(v, f, journal=print, serie=serie)
            d = subprocess.run([render.ffmpeg_exe(), "-i", str(f)], capture_output=True, text=True).stderr
            res["videos"].append({"serie": serie, "voix": meta["voix"], "duree": (d.split("Duration: ")[1].split(",")[0] if "Duration: " in d else None),
                                  "taille": f.stat().st_size})
        res["airdrop"] = str(config.outil("airdrop"))
    except Exception as e:
        res["erreur"] = repr(e)
        traceback.print_exc()
    Path(sortie).write_text(_json.dumps(res, ensure_ascii=False, indent=1), "utf-8")


def main():
    config.DATA.mkdir(parents=True, exist_ok=True)
    if "--essai" in sys.argv:
        return essai(sys.argv[sys.argv.index("--essai") + 1])
    preparer_voix()
    corpus.charger()
    reglage = config.lire_json(config.DATA / "serie.json", {})
    if reglage.get("serie") in config.SERIES:
        config.serie = reglage["serie"]
    srv = ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("QS_PORT", "0"))), Serveur)
    url = f"http://127.0.0.1:{srv.server_address[1]}/"
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print("QuentStudio :", url, flush=True)
    if "--serveur" in sys.argv:
        try:
            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            return
    try:
        import webview
    except ImportError:
        webbrowser.open(url)
        print("pywebview absent : interface ouverte dans le navigateur (Ctrl+C pour quitter).")
        try:
            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            return
    fenetre = webview.create_window("QuentStudio", url, width=1060, height=820, min_size=(860, 640))
    if "--essai-fenetre" in sys.argv:  # essai de la fenêtre native (workflow de construction)
        sortie = sys.argv[sys.argv.index("--essai-fenetre") + 1]

        def verifier():
            import json as _json
            res = {}
            try:
                time.sleep(4)
                res["statut"] = fenetre.evaluate_js("document.querySelector('#statut').textContent")
                res["serie"] = fenetre.evaluate_js("document.querySelector('#nomSerie').textContent")
            except Exception as e:
                res["erreur"] = repr(e)
            Path(sortie).write_text(_json.dumps(res, ensure_ascii=False), "utf-8")
            fenetre.destroy()
        webview.start(verifier)
        return
    webview.start(icone_dock)


if __name__ == "__main__":
    main()
