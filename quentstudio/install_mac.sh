#!/bin/bash
# Installe (ou met à jour) QuentStudio.app sur ce Mac.
#   bash install_mac.sh            installation complète (voix + IA locale si possible)
#   QS_SANS_IA=1 bash install_mac.sh   sans télécharger le modèle d'IA (2,5 Go)
set -eo pipefail

cd "$(dirname "$0")"
SRC="$(pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
SUPPORT="$HOME/Library/Application Support/QuentStudio"
VENV="$SUPPORT/venv"

etape() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }
stop() { printf '\n\033[1;31m✖ %s\033[0m\n' "$1"; exit 1; }

[ "$(uname)" = "Darwin" ] || stop "Ce script est prévu pour macOS."

etape "Outils en ligne de commande d'Apple (Swift, iconutil)"
if ! xcode-select -p >/dev/null 2>&1; then
  xcode-select --install || true
  stop "Installe les outils en ligne de commande (fenêtre ouverte), puis relance : bash install_mac.sh"
fi

etape "Python 3.9 ou plus récent"
PY=""
for c in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' 2>/dev/null; then
    PY="$(command -v "$c")"; break
  fi
done
if [ -z "$PY" ] && command -v brew >/dev/null 2>&1; then brew install python@3.12; PY="$(brew --prefix)/bin/python3.12"; fi
[ -n "$PY" ] || stop "Python 3.9+ introuvable. Installe Homebrew (https://brew.sh) puis relance."
echo "Python : $PY ($("$PY" --version 2>&1))"

etape "FFmpeg"
if ! command -v ffmpeg >/dev/null 2>&1; then
  command -v brew >/dev/null 2>&1 || stop "FFmpeg manque : installe Homebrew (https://brew.sh) puis relance."
  brew install ffmpeg
fi
FFMPEG="$(command -v ffmpeg)"
echo "FFmpeg : $FFMPEG"

etape "Environnement Python (venv) et dépendances"
mkdir -p "$SUPPORT"
if [ -x "$VENV/bin/python" ] && ! "$VENV/bin/python" -c 'import sys' 2>/dev/null; then rm -rf "$VENV"; fi
[ -x "$VENV/bin/python" ] || "$PY" -m venv "$VENV"
"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet -r "$SRC/requirements.txt"
"$VENV/bin/python" -c 'import PIL, piper, webview; print("Pillow, Piper, pywebview : OK")'

etape "Voix Piper (Pierre et Jessica)"
QS_FFMPEG="$FFMPEG" "$VENV/bin/python" -c "import sys; sys.path.insert(0, '$SRC'); import voice; m = voice.assurer_modele(); print('Voix :', m or 'ÉCHEC (les bips de secours seront utilisés)'); print('Locuteurs :', voice.locuteurs())"

etape "Construction de QuentStudio.app"
DEST="/Applications"
if [ ! -w "$DEST" ]; then DEST="$HOME/Applications"; mkdir -p "$DEST"; echo "/Applications non modifiable : installation dans $DEST"; fi
TMP="$(mktemp -d)"
APP="$TMP/QuentStudio.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/app"
cp "$SRC"/*.py "$SRC"/ui.html "$SRC"/requirements.txt "$APP/Contents/Resources/app/"
mkdir -p "$APP/Contents/Resources/app/persos" && cp "$SRC"/persos/*.png "$APP/Contents/Resources/app/persos/"

# Icône : PNG 1024 → iconset (sips) → .icns (iconutil) ; sans icône si l'un échoue
ICONSET="$TMP/QuentStudio.iconset"
mkdir -p "$ICONSET"
"$VENV/bin/python" "$SRC/icon.py" "$TMP/icone.png" 1024
for t in 16 32 128 256 512; do
  sips -z $t $t "$TMP/icone.png" --out "$ICONSET/icon_${t}x${t}.png" >/dev/null
  sips -z $((t * 2)) $((t * 2)) "$TMP/icone.png" --out "$ICONSET/icon_${t}x${t}@2x.png" >/dev/null
done
if iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/QuentStudio.icns"; then
  cp "$APP/Contents/Resources/QuentStudio.icns" "$APP/Contents/Resources/app/QuentStudio.icns"
else
  echo "iconutil a échoué : application sans icône personnalisée"
fi

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>QuentStudio</string>
  <key>CFBundleDisplayName</key><string>QuentStudio</string>
  <key>CFBundleIdentifier</key><string>fr.quentools.quentstudio</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>QuentStudio</string>
  <key>CFBundleIconFile</key><string>QuentStudio</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST

# Lanceur : depuis le Dock le PATH ne contient pas Homebrew, on le fixe ici (ffmpeg, ollama)
cat > "$APP/Contents/MacOS/QuentStudio" <<LANCEUR
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export QS_FFMPEG="$FFMPEG"
ICI="\$(cd "\$(dirname "\$0")/.." && pwd)"
export QS_ICONE="\$ICI/Resources/QuentStudio.icns"
mkdir -p "\$HOME/Movies/QuentStudio"
exec "$VENV/bin/python" "\$ICI/Resources/app/studio.py" >> "\$HOME/Movies/QuentStudio/journal.txt" 2>&1
LANCEUR
chmod +x "$APP/Contents/MacOS/QuentStudio"

rm -rf "$DEST/QuentStudio.app"
mv "$APP" "$DEST/QuentStudio.app"
rm -rf "$TMP"
touch "$DEST/QuentStudio.app"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$DEST/QuentStudio.app" >/dev/null 2>&1 || true
echo "Installée : $DEST/QuentStudio.app"

etape "Partage AirDrop (petit programme Swift)"
"$VENV/bin/python" -c "import sys; sys.path.insert(0, '$SRC'); import share; print('AirDrop :', share.programme_airdrop())" \
  || echo "Compilation Swift impossible : le bouton AirDrop montrera la vidéo dans le Finder."

etape "IA intégrée (moteur llama.cpp + modèle Qwen3 4B partagé avec QuentMovie)"
"$VENV/bin/python" -m pip install --quiet --only-binary=:all: llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/metal \
  || CMAKE_ARGS="-DGGML_METAL=on" "$VENV/bin/python" -m pip install --quiet llama-cpp-python \
  || echo "Moteur d'IA non installé : l'app marche sans IA (générateur intégré et fiches)."
if [ -z "$QS_SANS_IA" ]; then
  "$VENV/bin/python" -c "import sys; sys.path.insert(0, '$SRC'); import ia_locale as i; i.chemin_modele() or i.installer(); print('IA :', i.etat(), i.chemin_modele())"
fi

etape "Vérification rapide"
QS_FFMPEG="$FFMPEG" "$VENV/bin/python" "$SRC/verifier.py" --rapide

printf '\n\033[1;32m✔ QuentStudio est prêt.\033[0m Lancer : open -a "%s/QuentStudio.app"\n' "$DEST"
