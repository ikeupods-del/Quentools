"""Anti-répétition : titres et situations déjà utilisés (history.json)."""
import functools
import re
import time
import unicodedata

import config

MOTS_VIDES = set("""le la les un une des du de d l au aux et ou a à en dans sur pour par avec sans ce cet cette ces
mon ma mes ton ta tes son sa ses qui que quoi est sont il elle on je tu nous vous ils elles pas ne plus tres trop
mode operation glitchou quentools""".split())


def normaliser(t):
    return list(_norm(str(t)))


@functools.lru_cache(maxsize=300000)
def _norm(t):
    t = unicodedata.normalize("NFD", str(t).lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return tuple(m for m in re.findall(r"[a-z0-9]+", t) if m not in MOTS_VIDES and len(m) > 1)


def _jaccard(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a and b else 0.0


def cles(s):
    """Mots-clés d'une situation : mots donnés + lieu."""
    m = set()
    for x in s.get("mots") or []:
        m.update(normaliser(x))
    return m


def _proche(ta, ka, tb, kb):
    if ta and ta == tb:
        return True
    if _jaccard(ta, tb) >= 0.6:
        return True
    return len(ka) >= 2 and len(kb) >= 2 and _jaccard(ka, kb) >= 0.5


def trop_proche(a, b):
    """Vrai si deux sketchs se ressemblent trop (titre presque identique ou mêmes mots-clés)."""
    return _proche(set(normaliser(a.get("titre", ""))), cles(a), set(normaliser(b.get("titre", ""))), cles(b))


class Index:
    """Recherche rapide des sketchs proches (index par mot) : reste instantanée après des années d'historique."""

    def __init__(self, sketchs=()):
        self.items, self.par_mot = [], {}
        for s in sketchs:
            self.ajouter(s)

    def ajouter(self, s):
        t, k = set(normaliser(s.get("titre", ""))), cles(s)
        self.items.append((t, k))
        for m in t | k:
            self.par_mot.setdefault(m, []).append(len(self.items) - 1)

    def proche(self, s):
        t, k = set(normaliser(s.get("titre", ""))), cles(s)
        vus = set()
        for m in t | k:
            for i in self.par_mot.get(m, ()):
                if i not in vus:
                    vus.add(i)
                    if _proche(t, k, *self.items[i]):
                        return True
        return False

    def __len__(self):
        return len(self.items)


def charger():
    h = config.lire_json(config.chemin("history.json"), {})
    if not isinstance(h, dict):
        h = {}
    h.setdefault("sketchs", [])
    h.setdefault("cta", -1)
    return h


def index(extra=()):
    """Index de l'historique (plus d'éventuels sketchs supplémentaires)."""
    return Index(list(charger()["sketchs"]) + list(extra))


def deja_vu(s, h=None):
    """h : Index, historique déjà chargé, ou rien (relu sur le disque)."""
    if isinstance(h, Index):
        return h.proche(s)
    return Index((h or charger())["sketchs"]).proche(s)


def noter(sketchs):
    """Retient les sketchs d'une vidéo produite."""
    h = charger()
    for s in sketchs:
        h["sketchs"].append({"titre": s.get("titre", ""), "mots": s.get("mots") or [], "id": s.get("id"),
                             "date": time.strftime("%Y-%m-%d")})
    config.ecrire_json(config.chemin("history.json"), h)


def cta_suivant(nb):
    """Variante suivante de l'appel à s'abonner (rotation, jamais deux fois de suite la même)."""
    h = charger()
    h["cta"] = (int(h.get("cta", -1)) + 1) % max(1, nb)
    config.ecrire_json(config.chemin("history.json"), h)
    return h["cta"]
