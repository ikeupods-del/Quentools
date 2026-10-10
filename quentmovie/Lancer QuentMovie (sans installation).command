#!/bin/bash
# Double-clique sur ce fichier pour ouvrir QuentMovie.
cd "$(dirname "$0")" || exit 1

# Homebrew (Mac Apple Silicon et Intel)
for b in /opt/homebrew/bin /usr/local/bin; do [ -d "$b" ] && export PATH="$b:$PATH"; done

manque=""
command -v node >/dev/null || manque="$manque node"
command -v ffmpeg >/dev/null || manque="$manque ffmpeg"
if [ -n "$manque" ]; then
  echo "Il manque :$manque"
  echo "Ouvre le Terminal et colle : brew install node ffmpeg"
  echo "(Si « brew » n'existe pas, suis d'abord les étapes du fichier LISEZMOI.md.)"
  read -r -p "Appuie sur Entrée pour fermer."
  exit 1
fi

(sleep 1; open "http://localhost:4173") &
echo "QuentMovie est ouvert. Ferme cette fenêtre pour l'arrêter."
node server.js
