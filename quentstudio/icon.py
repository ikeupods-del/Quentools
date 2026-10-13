"""Icône de QuentStudio (Glitchou sur fond nuit) : python icon.py sortie.png [taille]."""
import sys

from PIL import Image, ImageDraw


def icone(taille=1024):
    k = taille / 1024
    s = lambda *v: [x * k for x in v]
    im = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    g = ImageDraw.Draw(im)
    g.rounded_rectangle(s(40, 40, 984, 984), radius=220 * k, fill=(22, 24, 34))
    g.line(s(512, 250, 512, 170), fill=(90, 120, 40), width=int(18 * k))
    g.ellipse(s(472, 130, 552, 210), fill=(255, 120, 90))
    g.ellipse(s(212, 230, 812, 830), fill=(198, 232, 74), outline=(80, 110, 30), width=int(16 * k))
    for x in (400, 624):
        g.ellipse(s(x - 70, 400, x + 70, 560), fill=(255, 255, 255), outline=(80, 110, 30), width=int(10 * k))
        g.ellipse(s(x - 25, 450, x + 40, 530), fill=(30, 34, 40))
    g.arc(s(400, 560, 624, 720), 20, 160, fill=(70, 95, 30), width=int(18 * k))
    return im


if __name__ == "__main__":
    t = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
    icone(t).save(sys.argv[1] if len(sys.argv) > 1 else "icone.png")
