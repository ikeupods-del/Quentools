"""Identité visuelle et sonore de chaque série (personnages, couleurs, voix, décor)."""

SERIES = {
    "quentools": {
        "nom": "Quentools",
        "sous_titre": "Quentools & Glitchou · sketchs comiques",
        "noms": {"Q": "QUENTOOLS", "G": "GLITCHOU"},
        "couleurs": {"Q": (255, 196, 120), "G": (198, 232, 74)},
        "sprites": {"Q": "quentools", "G": "glitchou"},
        # hauteur (asetrate) puis tempo : Quentools grave et posé, Glitchou aiguë et rapide
        "voix": {"Q": "asetrate={t}*0.93,aresample={t},atempo=1.04", "G": "asetrate={t}*1.12,aresample={t},atempo=1.12"},
        "etiquette": "SKETCH {n}/{total}",
        "palettes": None,
        "decor": "fenetre",
        "mention": None,
        "fin": "À TOI !",
        # ambiance sonore : musiques de fond (au hasard), bruitage entre sketchs, ponctuation comique après la chute
        "musiques": ["joyeux-vlog", "lofi-tranquille", "house-groove"],
        "transition": "whoosh-court",
        "chute": "ba-dum-tss",
        "chiffres": False,
    },
    "quentinvest": {
        "nom": "QuentInvest",
        "sous_titre": "Max & Pépite · l'économie expliquée simplement",
        "noms": {"Q": "MAX", "G": "PÉPITE"},
        "couleurs": {"Q": (255, 150, 90), "G": (246, 200, 70)},
        "sprites": {"Q": "max", "G": "pepite"},
        # Max : jeune et pressé ; Pépite : calme et claire
        "voix": {"Q": "asetrate={t}*0.98,aresample={t},atempo=1.10", "G": "asetrate={t}*1.04,aresample={t},atempo=1.0"},
        "etiquette": "{episode} · {n}/{total}",
        "palettes": [((214, 236, 214), (150, 196, 160)), ((222, 230, 250), (150, 170, 220)), ((250, 238, 200), (226, 196, 120)),
                     ((230, 222, 246), (176, 156, 214))],
        "decor": "courbe",
        "mention": "Vulgarisation · pas un conseil en investissement",
        "fin": "ET TOI ?",
        "musiques": ["documentaire-doux", "corporate-lumineux", "piano-chill"],
        "transition": "sd-whoosh-leger",
        "chute": None,
        "chiffres": True,  # chiffre clé de la réplique affiché en grand (22,6 %, 1929…)
    },
}


def serie(nom):
    return SERIES.get(nom) or SERIES["quentools"]
