# Pax Mythica

Jeu de stratégie pour Mac : un mélange d’*Age of Mythology* (panthéons, dieux, âges, créatures mythiques, pouvoirs divins) et de *Pax Historia* (grande carte de provinces, diplomatie, décrets écrits librement, parties personnalisées). Jeu personnel, jamais publié sur le site.

## Installer

1. Télécharger `Pax-Mythica-X.Y.Z-arm64.dmg` dans les *Releases* du dépôt (étiquette `pax-mythica-vX.Y.Z`).
2. Ouvrir le .dmg et glisser **Pax Mythica** dans Applications.
3. Premier lancement : clic droit sur l’application → **Ouvrir**.

**Mises à jour à distance** : chaque nouvelle version publiée (changement de `version` dans `package.json` + section dans `NOUVEAUTES.md`) est téléchargée toute seule par les Mac où le jeu est installé (au démarrage puis toutes les 6 heures). Un bandeau annonce la version prête et ses nouveautés : « Redémarrer pour installer », ou installation automatique à la fermeture. Menu Partie → « Rechercher les mises à jour… » pour vérifier tout de suite.

## Jouer

- **Nouvelle partie** : époque (Antiquité, Moyen Âge, ère industrielle, époque moderne, futur), peuple (quatre cultures par époque), dieu majeur ou doctrine, nom du peuple. L’époque change les peuples, unités, unités spéciales, bâtiments, âges, pouvoirs, vocabulaire et l’allure des villes ; les règles restent équilibrées de la même façon.
- **Vue 3D** façon Age of Mythology (par défaut) : relief, sol en textures photographiques (herbe, sous-bois, terre, sable, roche, falaises, neige, chemins, pavés), ciel photographique qui éclaire la scène, mer qui reflète le ciel, ombres, arbres et herbe en feuillages photographiques qui bougent au vent, rochers et accessoires photographiés, fumées des foyers, villes qui grandissent (toits de tuiles, pierre, bois, chaume, verre et néons selon l’époque), soldats en formation. **Packs graphiques** (bouton 🎨 ou Réglages) : Olympe doré, Réaliste, Fresque peinte, Crépuscule, Automne, Hiver nordique, Nuit étoilée, Ragnarök ; qualité Ultra (occlusion ambiante), Haute, Moyenne ou Basse. Glisser ou deux doigts pour se déplacer, molette ou pincement pour zoomer, Q/E pour tourner, **V** pour passer à la carte de stratégie 2D.
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

- Fichiers : `donnees.js` (panthéons, dieux, unités, pouvoirs, événements), `epoques.js` (les cinq époques), `vue3d.js` (vue 3D, three.js r180 assemblé dans `vendor/three-pax.min.js`), `ressources3d.js` (chargement des textures, ciels et modèles), `packs-graphiques.js` (packs et qualités, un pack = une entrée), `carte.js` (génération du monde), `moteur.js` (règles), `alliances.js`, `ia-nations.js` (peuples de l’ordinateur), `oracle.js` (décrets), `rendu.js` (carte), `son.js`, `interface.js`, `main.js` / `preload.js` (Electron).
- Copies générées (ne pas modifier) : `ia-locale.js`, `ia-worker.js`, `maj.js` → `node tools/synchro-ia-locale.js`.
- Essais : `node tests/moteur.js` et `node tests/interface.js` (Chromium).
- Publier : changer `version` dans `package.json` et ajouter sa section dans `NOUVEAUTES.md` ; le workflow « Pax Mythica — jeu Mac » construit, essaie et publie le .dmg.
- **Ressources graphiques** (`ressources/`, toutes en CC0 : ambientCG et Poly Haven, détail dans `ressources/LICENCES.json`) : choisies dans `ressources/choix.json` et téléchargées par le workflow « Pax Mythica — ressources » (`scripts/ressources.js`) ; feuillages composés par `python3 scripts/feuillages.py` ; modèles allégés pour le jeu (`ressources/jeu/*.glb`) par `scripts/modeles-jeu.mjs`. Le workflow du jeu enregistre des captures de la vue 3D faites sur le Mac dans `captures-mac/`.
