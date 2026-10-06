#!/bin/sh
# Copie complète du dépôt (toutes les branches et l'historique) dans un dossier daté.
# Usage : sh tools/sauvegarde-depot.sh [dossier de destination]  (défaut : ~/Sauvegardes-QuenTools)
# Pour une seconde copie chez un autre hébergeur : git push --mirror <adresse du nouveau dépôt vide>
set -e
DEST="${1:-$HOME/Sauvegardes-QuenTools}"
JOUR=$(date +%Y-%m-%d)
mkdir -p "$DEST"
git clone --mirror "$(git config --get remote.origin.url)" "$DEST/quentools-$JOUR.git"
tar -czf "$DEST/quentools-$JOUR.tar.gz" -C "$DEST" "quentools-$JOUR.git"
rm -rf "$DEST/quentools-$JOUR.git"
echo "Sauvegarde créée : $DEST/quentools-$JOUR.tar.gz"
