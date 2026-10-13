"""Scénarios : IA intégrée (ou Ollama), bibliothèque, générateur procédural ; validation par clean()."""
import json
import random
import re

import config
import corpus
import history
import ia_locale
import procedural


# Ton : léger, jamais méchant, pas de vraie personne ni de marque (QuentInvest peut citer celles de son sujet)
GROSSIER = ["con", "conne", "connard", "idiot", "idiote", "debile", "abruti", "nul", "nulle", "merde", "putain", "crétin",
            "tuer", "suicide", "drogue", "sexe", "arme"]
INTERDITS_INVEST = re.compile(r"\b(" + "|".join(GROSSIER) + r")\b", re.I)
INTERDITS = re.compile(r"\b(" + "|".join([
    "apple", "iphone", "ipad", "macbook", "google", "android", "samsung", "microsoft", "windows", "amazon", "alexa",
    "siri", "netflix", "spotify", "facebook", "instagram", "tiktok", "youtube", "twitter", "chatgpt", "openai",
    "tesla", "ikea", "mcdonald", "coca", "nike", "disney", "uber", "airbnb", "whatsapp", "zoom",
    "macron", "trump", "musk", "biden", "poutine",
    "con", "conne", "connard", "idiot", "idiote", "debile", "abruti", "nul", "nulle", "merde", "putain", "crétin",
    "tuer", "mort", "suicide", "drogue", "sexe", "arme",
]) + r")\b", re.I)


def _texte(x, maxi, interdits=None):
    t = re.sub(r"\s+", " ", str(x or "")).strip().strip('"').strip()
    if not t or len(t) > maxi:
        raise ValueError(f"texte vide ou trop long : {t[:40]}")
    if (interdits or INTERDITS).search(t):
        raise ValueError(f"mot interdit : {t[:40]}")
    return t


def clean_sketch(d, interdits=None):
    """Sketch validé et normalisé (ValueError sinon)."""
    if not isinstance(d, dict):
        raise ValueError("sketch absent")
    plans = d.get("plans")
    if not isinstance(plans, list) or len(plans) != config.PLANS:
        raise ValueError("il faut exactement 4 plans")
    out = []
    for p in plans:
        if not isinstance(p, dict):
            raise ValueError("plan invalide")
        qui = str(p.get("qui", "")).strip().upper()[:1]
        if qui not in ("Q", "G"):
            raise ValueError("personnage inconnu")
        t = _texte(p.get("texte"), 120, interdits)
        if len(t.split()) > 22:
            raise ValueError("réplique trop longue")
        out.append({"qui": qui, "texte": t})
    if {p["qui"] for p in out} != {"Q", "G"}:
        raise ValueError("les deux personnages doivent parler")
    titre = _texte(d.get("titre"), 60, interdits)
    lieu = _texte(d.get("lieu") or "Maison", 30, interdits)
    mots = [m for m in (str(x).strip().lower() for x in (d.get("mots") or []) if isinstance(x, (str, int))) if m][:5]
    if len(mots) < 2:
        mots = history.normaliser(titre)[:4]
    s = {"titre": titre, "lieu": lieu, "mots": mots, "plans": out, "source": d.get("source") or "ia"}
    for k in ("id", "court"):
        if d.get(k):
            s[k] = d[k]
    return s


def clean(d):
    """Vidéo complète validée : 3 sketchs différents + question pour les commentaires."""
    if not isinstance(d, dict) or not isinstance(d.get("sketchs"), list) or len(d["sketchs"]) != config.SKETCHS:
        raise ValueError("il faut exactement 3 sketchs")
    sk = [clean_sketch(s) for s in d["sketchs"]]
    for i in range(len(sk)):
        for j in range(i):
            if history.trop_proche(sk[i], sk[j]):
                raise ValueError("deux sketchs trop proches")
    q = _texte(d.get("question") or random.choice(corpus.QUESTIONS), 90)
    if not q.endswith(("?", "!", ".")):
        q += " ?"
    return {"sketchs": sk, "question": q}


# ---------- IA locale ----------
SCHEMA = {
    "type": "object",
    "properties": {
        "titre": {"type": "string"}, "lieu": {"type": "string"},
        "mots": {"type": "array", "items": {"type": "string"}},
        "plans": {"type": "array", "minItems": 4, "maxItems": 4, "items": {
            "type": "object", "properties": {"qui": {"type": "string", "enum": ["Q", "G"]}, "texte": {"type": "string"}},
            "required": ["qui", "texte"]}},
    },
    "required": ["titre", "lieu", "mots", "plans"],
}

CONSIGNE = """Tu écris des sketchs courts et drôles pour la série « Quentools » (vidéos verticales).
Personnages :
- Q = Quentools, un humain sceptique et fatigué, phrases courtes, un peu désabusé.
- G = Glitchou, une petite IA ronde vert-jaune, trop sûre d'elle, fait des bourdes qu'elle croit géniales.
Règles :
- Exactement 4 répliques : Q expose un problème du quotidien, G fait une bourde, Q réagit, G conclut par une chute drôle.
- 22 mots maximum par réplique, français correct, ton léger et bienveillant, jamais méchant.
- Aucune marque, aucune vraie personne, rien de vulgaire ni de violent.
- Une situation NOUVELLE : ne reprends pas les exemples, ni les titres à éviter.
- « mots » : 2 à 4 mots-clés de la situation (objet, lieu, idée de la bourde).
Réponds uniquement en JSON."""


def ollama_etat():
    """État de l'IA : 'ok', 'modele absent' (IA intégrée à installer) ou 'absent'. Nom historique (Ollama en secours)."""
    e = ia_locale.etat()
    return "ok" if e == "ok" else "modele absent" if e == "a_installer" else "absent"


def ia_sketch(eviter=(), rng=random):
    """Un sketch écrit par l'IA locale, inspiré d'exemples de la bibliothèque."""
    ex = corpus.exemples(4)
    piste = rng.choice(procedural.PROBLEMES)
    h = history.charger()["sketchs"][-40:]
    titres = [x.get("titre") for x in h] + [x.get("titre") for x in eviter]
    demande = (
        "Exemples de sketchs (style à imiter, pas à copier) :\n"
        + "\n".join(json.dumps({k: s[k] for k in ("titre", "lieu", "mots", "plans")}, ensure_ascii=False) for s in ex)
        + "\n\nTitres déjà utilisés, à éviter : " + "; ".join(t for t in titres if t)
        + f"\n\nIdée de départ (libre de t'en écarter) : {piste[1]}, lieu « {piste[3]} ».\nÉcris un nouveau sketch."
    )
    d = json.loads(ia_locale.discuter(CONSIGNE, demande, SCHEMA, temperature=0.9, max_tokens=400))
    d["source"] = "ia"
    return clean_sketch(d)


def sketchs_ia(n, essais=None, journal=print):
    """n sketchs IA validés et nouveaux (régénère si trop proches d'un ancien)."""
    out, essais = [], essais or n * 4
    h = history.index()
    for _ in range(essais):
        if len(out) >= n:
            break
        try:
            s = ia_sketch(eviter=out)
        except Exception as e:
            journal(f"IA : sketch refusé ({e})")
            continue
        if history.deja_vu(s, h) or any(history.trop_proche(s, x) for x in out):
            journal(f"IA : « {s['titre']} » trop proche d'un ancien, je régénère")
            continue
        out.append(s)
    return out


# ---------- Réserve et bibliothèque ----------
def reserve():
    r = config.lire_json(config.chemin("reserve.json"), [])
    return r if isinstance(r, list) else []


def pregenerer(n=20, journal=print, avancement=lambda i, n: None):
    """Génère n sketchs en avance (IA si disponible, sinon procédural) ; ajoutés à la réserve et à la bibliothèque."""
    faits = []
    ia = ollama_etat() == "ok"
    for i in range(n):
        s = (sketchs_ia(1, essais=4, journal=journal) if ia else []) or procedural.sketchs_neufs(1, exclus=reserve() + faits)
        faits += s
        avancement(i + 1, n)
    r = reserve()
    r += [x for x in faits if not any(history.trop_proche(x, y) for y in r)]
    config.ecrire_json(config.chemin("reserve.json"), r)
    corpus.ajouter(faits)
    return len(faits)


def _depuis_reserve(n):
    r = reserve()
    h = history.index()
    pris, reste = [], []
    for s in r:
        if len(pris) < n and not history.deja_vu(s, h) and not any(history.trop_proche(s, x) for x in pris):
            pris.append(s)
        elif not history.deja_vu(s, h):
            reste.append(s)
    config.ecrire_json(config.chemin("reserve.json"), reste)
    return pris


def _depuis_bibliotheque(n):
    h = history.index()
    b = corpus.charger()
    random.shuffle(b)
    pris = []
    for s in b:
        if len(pris) >= n:
            break
        if not history.deja_vu(s, h) and not any(history.trop_proche(s, x) for x in pris):
            pris.append(s)
    return pris


def scenario(mode="auto", journal=print):
    """Vidéo prête à rendre : {'sketchs': [...3], 'question': ..., 'mode': ...}.

    auto : réserve, puis IA locale, puis générateur procédural (jamais de liste finie).
    bibliotheque : sketchs de la bibliothèque pas encore utilisés (complété par le procédural si épuisée).
    ia : uniquement l'IA (erreur si elle n'est pas installée).
    """
    n = config.SKETCHS
    sk, origine = [], []
    if mode == "bibliotheque":
        sk = _depuis_bibliotheque(n)
        origine.append("bibliothèque")
    elif mode == "ia":
        etat = ollama_etat()
        if etat != "ok":
            raise RuntimeError("IA intégrée pas encore installée : clique sur « Installer l'IA » (une seule fois)."
                               if etat == "modele absent" else "IA intégrée indisponible sur cette installation.")
        sk = sketchs_ia(n, journal=journal)
        if len(sk) < n:
            raise RuntimeError("L'IA locale n'a pas produit assez de sketchs valides, réessaie.")
        origine.append("IA locale")
    else:
        sk = _depuis_reserve(n)
        if sk:
            origine.append("réserve")
        if len(sk) < n and ollama_etat() == "ok":
            sk += sketchs_ia(n - len(sk), journal=journal)
            origine.append("IA locale")
    if len(sk) < n:
        sk += procedural.sketchs_neufs(n - len(sk), exclus=sk)
        origine.append("procédural")
    if len(sk) < n:  # après des années, tout a servi : on ne compare plus qu'aux deux dernières années
        sk += procedural.sketchs_neufs(n - len(sk), exclus=sk, recents=2000)
    video = clean({"sketchs": sk[:n], "question": procedural.question(sk)})
    nouveaux = [s for s in video["sketchs"] if s.get("source") in ("ia", "procedural")]
    corpus.ajouter(nouveaux)   # la bibliothèque s'enrichit et sert d'exemples à l'IA
    video["mode"] = " + ".join(dict.fromkeys(origine))
    return video
