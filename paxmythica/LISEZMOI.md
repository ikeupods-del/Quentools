# Pax Mythica

Jeu de stratégie pour Mac façon *Age of Mythology* : batailles en temps réel (villageois, bâtiments, armées dirigées une à une, panthéons, dieux, âges, créatures mythiques, pouvoirs divins), et un mode de conquête façon *Pax Historia* (grande carte de provinces, diplomatie, décrets écrits librement, parties personnalisées). Jeu personnel, jamais publié sur le site.

## Installer

1. Télécharger `Pax-Mythica-X.Y.Z-arm64.dmg` dans les *Releases* du dépôt (étiquette `pax-mythica-vX.Y.Z`).
2. Ouvrir le .dmg et glisser **Pax Mythica** dans Applications.
3. Premier lancement : clic droit sur l’application → **Ouvrir**.

**Mises à jour à distance** : chaque nouvelle version publiée (changement de `version` dans `package.json` + section dans `NOUVEAUTES.md`) est téléchargée toute seule par les Mac où le jeu est installé (au démarrage puis toutes les 6 heures). Un bandeau annonce la version prête et ses nouveautés : « Redémarrer pour installer », ou installation automatique à la fermeture. Menu Partie → « Rechercher les mises à jour… » pour vérifier tout de suite.

## Jouer

### Bataille (temps réel, comme Age of Mythology)
- **Menu → ⚔️ Bataille** : époque, peuple, dieu majeur, carte (plaines, rivière et gués, oasis, lac, toundra, forêt d’automne, mer intérieure, archipel), taille (jusqu’à immense), 1 à 3 adversaires de l’ordinateur (facile, normal, difficile), chacun pour soi ou 2 contre 2, **durée** : normale, longue (trêve de 8 minutes, 250 de population, ressources abondantes) ou épique (trêve de 15 minutes, 300 de population).
- **📜 Campagne** (menu principal) : dix missions à la suite — fonder Mégara, repousser les pillards du Nord par vagues, chasser les envahisseurs du Nil, gagner la mer intérieure, débarquer sur les îles d’Égée, prendre un château fortifié, tenir la nuit des loups, gagner la course du rail, la tempête sur l’archipel, bâtir l’ascenseur spatial. Objectifs affichés en haut à droite ; chaque victoire ouvre la mission suivante.
- **Enregistrer** : Échap → 💾 Enregistrer (trois emplacements) ; la bataille s’enregistre aussi toute seule chaque minute et en quittant (« Continuer la bataille » au menu principal, « 📂 Charger une bataille »).
- **Murs et portes** (âge classique) : choisis Mur puis clique le début et la fin du tracé (Maj pour continuer) ; la porte se pose sur un mur et laisse passer tes unités et tes alliés, pas l’ennemi.
- **Mer** : le port se pose sur le rivage ; il forme des bateaux de pêche (bancs de poissons au large), des navires de transport et des navires de guerre qui tirent sur les navires et les bâtiments proches de l’eau.
- **Transport** : choisis des unités puis clic droit sur ton navire de transport (10 places) ; choisis ensuite le navire et clic droit sur la terre visée : il traverse et débarque (ou bouton ⚓ près d’un rivage).
- **Marché** (âge classique) : 100 de bois ou de nourriture contre de l’or, ou l’inverse ; le cours baisse à chaque vente et remonte avec le temps.
- **Améliorations** : choisis un bâtiment (grenier, entrepôt, caserne, champ de tir, écurie, forteresse, tour, temple, port, centre-ville), rangée du milieu de la grille ; la fiche au survol dit ce que fait chaque bouton. Touche « , » : toute l’armée. Postures des soldats choisis (rangée du haut) : agressive, défensive, tenir la position.
- **Sons** : les unités répondent en français avec la voix du Mac (réglage « Voix des unités »), bruit de la mer près de l’eau, musique d’ambiance apaisante.
- **Garnison** : clic droit d’un soldat sur ta tour, ta forteresse ou ton centre-ville, ou bouton 🛡️ puis clic sur l’abri (villageois, infanterie, archers, héros) ; bouton 🚪 pour les faire sortir. **Cloche** 🔔 au centre-ville : les villageois s’abritent, un second appui les renvoie au travail.
- **Commandes** : clic gauche ou cadre pour choisir ; avec des unités choisies, **clic gauche ou droit** sur une ressource, un chantier, un ennemi ou un transport pour leur donner l’ordre (une étiquette près de la souris l’annonce) ; **clic droit** (ou ctrl-clic sur le pavé tactile) pour agir — marcher, récolter, construire, réparer, prier (Grecs), attaquer, point de ralliement d’un bâtiment. Double-clic : toutes les unités du même genre à l’écran ; Maj : ajouter. Deux doigts ou flèches ou bord de l’écran pour se déplacer, pincer ou molette pour zoomer, mini-carte pour aller loin.
- **Économie** : les villageois récoltent la nourriture (baies, chasse, fermes), le bois et l’or, et les rapportent au centre-ville, au grenier ou à l’entrepôt. Les maisons donnent la population (150 au plus, davantage en partie longue). La faveur : prière au temple (Grecs), temples (Égyptiens), combats (Nordiques), centres-villes (Atlantes).
- **Âges** : au centre-ville, choisis un dieu mineur ; il débloque une créature (formée au temple) et un pouvoir divin à usage unique (colonne des pouvoirs en haut à gauche). Chaque âge ouvre de nouveaux bâtiments et unités.
- **Victoire** : un peuple est vaincu quand il n’a plus ni centre-ville ni villageois (ou plus rien du tout). Une merveille achevée et gardée 3 minutes donne aussi la victoire.
- **Raccourcis** : <kbd>H</kbd> centre-ville, <kbd>.</kbd> villageois inactif, <kbd>Espace</kbd> dernière alerte, <kbd>⌘</kbd>+<kbd>1</kbd>…<kbd>9</kbd> créer un groupe et <kbd>1</kbd>…<kbd>9</kbd> le rappeler, lettres de la grille d’ordres (<kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> <kbd>T</kbd> / <kbd>A</kbd>… / <kbd>Z</kbd>…), <kbd>Suppr</kbd> supprimer, <kbd>Échap</kbd> annuler puis pause.

### Conquête du monde (grande carte)
- **Nouvelle partie** : époque (Antiquité, Moyen Âge, ère industrielle, époque moderne, futur), peuple (quatre cultures par époque), dieu majeur ou doctrine, nom du peuple. L’époque change les peuples, unités, unités spéciales, bâtiments, âges, pouvoirs, vocabulaire et l’allure des villes ; les règles restent équilibrées de la même façon.
- **Vue 3D** façon Age of Mythology (par défaut) : relief, sol en textures photographiques (herbe, sous-bois, terre, sable, roche, falaises, neige, chemins, pavés), ciel photographique qui éclaire la scène, mer qui reflète le ciel, ombres, arbres et herbe en feuillages photographiques qui bougent au vent, rochers et accessoires photographiés, fumées des foyers, villes qui grandissent (toits de tuiles, pierre, bois, chaume, verre et néons selon l’époque), soldats en formation. **Packs graphiques** (bouton 🎨 ou Réglages) : Olympe doré, Réaliste, Fresque peinte, Crépuscule, Automne, Hiver nordique, Nuit étoilée, Ragnarök ; qualité Ultra (occlusion ambiante), Haute, Moyenne ou Basse. Glisser ou deux doigts pour se déplacer, molette ou pincement pour zoomer, Q/E pour tourner, **V** pour passer à la carte de stratégie 2D.
- **Partie personnalisée** : graine, taille et forme du monde, part de terres, peuples (nom, couleur, panthéon, dieu, humeur), règles (ressources, âge de départ, difficulté, tribus, paix initiale, événements, mythes, victoires). **Modifier la carte** ouvre l’éditeur : frontières, terrains, niveaux, capitales, noms ; le résultat s’enregistre comme scénario.
- **Scénarios** : cinq mondes prêts à jouer et les scénarios enregistrés.
- Le temps passe mois par mois (pause, trois vitesses). Province → construire, développer, recruter. Armée → clic sur une province pour y marcher ; les terres hostiles se prennent par siège.
- **Alliances** (onglet 🤝) : pactes de non-agression (10 ans), alliances défensives, alliances totales ; une alliance par peuple, invitations et demandes d’entrée, appels aux armes, paix commune, soutien en or, et la « parole » de chaque peuple (trahir ou abandonner la fait chuter).
- **Décrets** (barre du bas) : « lever 10 hoplites à Korinthos », « pacte de non-agression avec Nubie », « invoquer la foudre sur … ». Sans oracle, ils sont lus par mots-clés ; avec l’**oracle** (IA du Mac, réglages), on écrit librement et il raconte la suite. Dans les deux cas, le jeu applique ses propres règles et coûts.
- Sauvegardes : automatique chaque année, 12 parties nommées, export et import en fichier `.json`.

## Limites

- Mode Bataille : sur l’archipel, l’ordinateur débarque par la mer ; sur les autres cartes il passe par la terre.
- Une bataille enregistrée se reprend avec la même version du jeu ou une plus récente (les anciennes sauvegardes incompatibles sont écartées).

- L’oracle demande le modèle d’IA partagé avec QuentMovie (~2,5 Go, téléchargé une fois dans `~/Movies/QuentMovie/modeles`).
- Les sauvegardes restent dans l’application (stockage local) : exporter en fichier pour les garder ailleurs.
- Mac à puce Apple uniquement.

## Pour le développement

- Mode Bataille : `rts-donnees.js` (unités, bâtiments, âges, pouvoirs en temps réel, cartes), `rts-moteur.js` (simulation au 1/20 s : carte, chemins A*, récolte, construction, combats, brouillard, ordinateur, victoire), `rts-vue.js` (vue 3D, sous-classe de la vue 3D), `rts-interface.js` (création, campagne, enregistrements, barre, objectifs, mini-carte, sélection, grille d’ordres, tracé des murs) ; missions dans `R.CAMPAGNE` (rts-donnees.js, une mission = une entrée : objectifs, vagues, départ, muraille) ; enregistrement `BT.sauver` / `BT.charger` (la carte se recrée depuis sa graine) ; essai `node tests/bataille.js` (`BATAILLE_LONG=1` : toutes les cartes et époques).
- Fichiers : `donnees.js` (panthéons, dieux, unités, pouvoirs, événements), `epoques.js` (les cinq époques), `vue3d.js` (vue 3D, three.js r180 assemblé dans `vendor/three-pax.min.js`), `ressources3d.js` (chargement des textures, ciels et modèles), `packs-graphiques.js` (packs et qualités, un pack = une entrée), `carte.js` (génération du monde), `moteur.js` (règles), `alliances.js`, `ia-nations.js` (peuples de l’ordinateur), `oracle.js` (décrets), `rendu.js` (carte), `son.js`, `interface.js`, `main.js` / `preload.js` (Electron).
- Copies générées (ne pas modifier) : `ia-locale.js`, `ia-worker.js`, `maj.js` → `node tools/synchro-ia-locale.js`.
- Essais : `node tests/moteur.js` et `node tests/interface.js` (Chromium).
- Publier : changer `version` dans `package.json` et ajouter sa section dans `NOUVEAUTES.md` ; le workflow « Pax Mythica — jeu Mac » construit, essaie et publie le .dmg.
- **Ressources graphiques** (`ressources/`, toutes en CC0 : ambientCG et Poly Haven, détail dans `ressources/LICENCES.json`) : choisies dans `ressources/choix.json` et téléchargées par le workflow « Pax Mythica — ressources » (`scripts/ressources.js`) ; feuillages composés par `python3 scripts/feuillages.py` ; modèles allégés pour le jeu (`ressources/jeu/*.glb`) par `scripts/modeles-jeu.mjs`. Le workflow du jeu enregistre des captures de la vue 3D faites sur le Mac dans `captures-mac/`.
