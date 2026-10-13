#!/bin/bash
# Construit QuentStudio.app et QuentStudio-<version>-arm64.dmg (Mac à puce Apple).
# Utilisé par le workflow « QuentStudio — application Mac » ; marche aussi sur un Mac avec Xcode CLT, Python 3.10+ et Node.
set -euo pipefail
cd "$(dirname "$0")"
SRC="$(pwd)"
VERSION="$(cat version.txt)"
B="$SRC/build-mac"
rm -rf "$B" "$SRC/dist"
mkdir -p "$B/bin" "$B/dmg"

echo "▶ Environnement Python"
"${PYTHON:-python3}" -m venv "$B/venv"
"$B/venv/bin/python" -m pip install --quiet --upgrade pip
"$B/venv/bin/python" -m pip install --quiet -r requirements.txt pyinstaller

echo "▶ FFmpeg pour puce Apple (même source que QuentMovie)"
npm install --silent --no-save --no-audit --no-fund --prefix "$B/npm" ffmpeg-static@5.2.0
cp "$B/npm/node_modules/ffmpeg-static/ffmpeg" "$B/bin/ffmpeg"
chmod +x "$B/bin/ffmpeg"
lipo -archs "$B/bin/ffmpeg" | grep -q arm64 || { echo "ffmpeg n'est pas arm64"; exit 1; }
"$B/bin/ffmpeg" -hide_banner -encoders | grep -q h264_videotoolbox || echo "Attention : pas d'encodeur matériel, libx264 sera utilisé"

echo "▶ Partage AirDrop (Swift)"
"$B/venv/bin/python" -c "import sys; sys.path.insert(0, '$SRC'); import share; open('$B/airdrop.swift', 'w').write(share.SWIFT)"
xcrun swiftc -O -target arm64-apple-macos11 -o "$B/bin/airdrop" "$B/airdrop.swift"

echo "▶ Icône"
"$B/venv/bin/python" icon.py "$B/icone.png" 1024
mkdir -p "$B/QuentStudio.iconset"
for t in 16 32 128 256 512; do
  sips -z $t $t "$B/icone.png" --out "$B/QuentStudio.iconset/icon_${t}x${t}.png" >/dev/null
  sips -z $((t * 2)) $((t * 2)) "$B/icone.png" --out "$B/QuentStudio.iconset/icon_${t}x${t}@2x.png" >/dev/null
done
iconutil -c icns "$B/QuentStudio.iconset" -o "$B/QuentStudio.icns"

echo "▶ Application"
"$B/venv/bin/pyinstaller" --noconfirm --log-level WARN --windowed --name QuentStudio \
  --icon "$B/QuentStudio.icns" --osx-bundle-identifier fr.quentools.quentstudio --target-arch arm64 \
  --add-data "$SRC/ui.html:." --add-data "$SRC/version.txt:." --add-data "$SRC/persos/*.png:persos" \
  --add-binary "$B/bin/ffmpeg:bin" --add-binary "$B/bin/airdrop:bin" \
  --collect-all piper --collect-all onnxruntime --collect-all webview \
  --hidden-import AppKit --hidden-import Foundation --hidden-import WebKit --hidden-import objc \
  --exclude-module piper.train --exclude-module torch --exclude-module tkinter \
  --paths "$SRC" --distpath "$SRC/dist" --workpath "$B/work" --specpath "$B" "$SRC/studio.py"
APP="$SRC/dist/QuentStudio.app"
PL="$APP/Contents/Info.plist"
for cle in CFBundleShortVersionString CFBundleVersion; do
  /usr/libexec/PlistBuddy -c "Set :$cle $VERSION" "$PL" 2>/dev/null || /usr/libexec/PlistBuddy -c "Add :$cle string $VERSION" "$PL"
done
/usr/libexec/PlistBuddy -c "Add :LSMinimumSystemVersion string 11.0" "$PL" 2>/dev/null || true
codesign --force --deep --sign - "$APP"

echo "▶ Image disque"
cp -R "$APP" "$B/dmg/"
ln -s /Applications "$B/dmg/Applications"
hdiutil create -volname "QuentStudio" -srcfolder "$B/dmg" -ov -format UDZO "$SRC/dist/QuentStudio-$VERSION-arm64.dmg"
echo "✔ dist/QuentStudio-$VERSION-arm64.dmg"
