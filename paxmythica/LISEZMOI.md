# Pax Mythica

Jeu de stratégie pour Mac : un mélange d’*Age of Mythology* (panthéons, dieux, âges, créatures mythiques, pouvoirs divins) et de *Pax Historia* (grande carte de provinces, diplomatie, décrets écrits librement, parties personnalisées). Jeu personnel, jamais publié sur le site.

## Installer

1. Télécharger `Pax-Mythica-X.Y.Z-arm64.dmg` dans les *Releases* du dépôt (étiquette `pax-mythica-vX.Y.Z`).
2. Ouvrir le .dmg et glisser **Pax Mythica** dans Applications.
3. Premier lancement : clic droit sur l’application → **Ouvrir**.

Les versions suivantes s’installent toutes seules (à la fermeture, ou bouton « Redémarrer pour installer » dans les réglages).

## Jouer

- **Nouvelle partie** : panthéon (Grecs, Égyptiens, Nordiques, Atlantes), dieu majeur, nom du peuple.
- **Partie personnalisée** : graine, taille et forme du monde, part de terres, peuples (nom, couleur, panthéon, dieu, humeur), règles (ressources, âge de départ, difficulté, tribus, paix initiale, événements, mythes, victoires). **Modifier la carte** ouvre l’éditeur : frontières, terrains, niveaux, capitales, noms ; le résultat s’enregistre comme scénario.
- **Scénarios** : cinq mondes prêts à jouer et les scénarios enregistrés.
- Le temps passe mois par mois (pause, trois vitesses). Province → construire, développer, recruter. Armée → clic sur une province pour y marcher ; les terres hostiles se prennent par siège.
- **Alliances** (onglet 🤝) : pactes de non-agression (10 ans), alliances défensives, alliances totales ; une alliance par peuple, invitations et demandes d’entrée, appels aux armes, paix commune, soutien en or, et la « parole » de chaque peuple (trahir ou abandonner la fait chuter).
- **Décrets** (barre du bas) : « lever 10 hoplites à Korinthos », « pacte de non-agression avec Nubie », « invoquer la foudre sur … ». Sans oracle, ils sont lus par mots-clés ; avec l’**oracle** (IA du Mac, réglages), on écrit librement et il raconte la suite. Dans les deux cas, le jeu applique ses propres règles et coûts.
- Sauvegardes : automatique chaque année, 12 parties nommées, export et import en fichier `.json`.

## Limites

- L’oracle demande le modèle d’IA partagé avec QuentMovie (~2,5 Go, téléchargé une fois dans `~/Movies/QuentMovie/modeles`).
- Les sauvegardes restent dans l’application (stockage local) : exporter en fichier pour les garder ailleurs.
- Mac à puce Apple uniquement.

## Pour le développement

- Fichiers : `donnees.js` (panthéons, dieux, unités, pouvoirs, événements), `carte.js` (génération du monde), `moteur.js` (règles), `alliances.js`, `ia-nations.js` (peuples de l’ordinateur), `oracle.js` (décrets), `rendu.js` (carte), `son.js`, `interface.js`, `main.js` / `preload.js` (Electron).
- Copies générées (ne pas modifier) : `ia-locale.js`, `ia-worker.js`, `maj.js` → `node tools/synchro-ia-locale.js`.
- Essais : `node tests/moteur.js` et `node tests/interface.js` (Chromium).
- Publier : changer `version` dans `package.json` ; le workflow « Pax Mythica — jeu Mac » construit, essaie et publie le .dmg.
