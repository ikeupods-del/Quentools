# Pax Mythica — télécharge certains fichiers d'un dossier Google Drive public (liste par gdown, puis lien direct de chaque fichier)
# usage : python3 scripts/gdrive.py <adresse du dossier> <dossier de sortie> <motif des chemins à garder>
import re, sys, os, urllib.request, http.cookiejar
import gdown
url, sortie, motif = sys.argv[1], sys.argv[2], re.compile(sys.argv[3], re.I)
fichiers = gdown.download_folder(url, output=sortie, skip_download=True, quiet=True)
cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj)); op.addheaders = [('User-Agent', 'Mozilla/5.0')]
for f in fichiers:
    chemin = f.path if hasattr(f, 'path') else f.local_path
    rel = os.path.relpath(chemin, sortie)
    if not motif.search(rel): continue
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    ok = False
    for adresse in [f'https://drive.usercontent.google.com/download?id={f.id}&export=download&confirm=t', f'https://drive.google.com/uc?export=download&id={f.id}&confirm=t']:
        try:
            d = op.open(adresse, timeout=120).read()
            if d[:15].lower().startswith(b'<!doctype html') or d[:5].lower() == b'<html':
                m = re.search(rb'name="uuid" value="([^"]+)"', d)
                if m: d = op.open(adresse + '&uuid=' + m.group(1).decode(), timeout=120).read()
            if d[:15].lower().startswith(b'<!doctype html'): print('page html au lieu du fichier :', rel, d[:300]); continue
            open(chemin, 'wb').write(d); print('ok', rel, len(d)); ok = True; break
        except Exception as e: print('échec', rel, adresse[:60], e)
    if not ok: print('NON TÉLÉCHARGÉ', rel)
