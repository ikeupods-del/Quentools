# Aube des Nations

Jeu de stratégie au tour par tour dans le navigateur, dans la famille des « 4X » (explorer, s’étendre, exploiter, conquérir) : on guide un peuple de 4000 av. J.-C. jusqu’à l’ère spatiale, sur une carte hexagonale générée à chaque partie. Conception originale (règles, noms, graphismes dessinés par le programme) ; les nations et les merveilles sont des références historiques.

Projet personnel : **pas publié sur le site** (dossier absent des `rsync` de `.github/workflows/pages.yml`, page en `noindex`). Affichage en **3D** avec three.js (r169, copié dans `vendor/`, licence MIT) : aucun service externe, aucune image ni modèle téléchargé, tous les modèles sont construits par le programme.

## Jouer

```
cd jeux/aube && python3 -m http.server 8766
```

puis http://localhost:8766 (ou ouvrir directement `index.html`). Fonctionne sur Mac (souris, trackpad, clavier) et sur téléphone (toucher). Sur iPhone : Safari → Partager → Sur l’écran d’accueil pour l’avoir en plein écran. La partie est enregistrée dans le navigateur à chaque tour (`localStorage`, clé `aube-des-nations:partie`).

| Mac | Téléphone | Action |
|---|---|---|
| Clic | Toucher | Sélectionner une unité, ouvrir une ville |
| Survol puis clic | Toucher puis toucher à nouveau | Trajet ou combat prévu, puis confirmation |
| Clic droit | — | Ordre direct, même sur une case occupée par vos unités |
| Glisser, deux doigts | Glisser | Déplacer la carte |
| Pincer, ⌃ + molette, + / − | Pincer | Zoom |
| Entrée (⇧ Entrée : forcer) | Bouton en bas à droite | Tâche suivante puis tour suivant |
| B F R A E U V Espace | Boutons du panneau | Fonder, fortifier, route, automatiser, explorer, améliorer, veille, passer |
| T, P, D, Échap | Barre du haut | Technologies, doctrines, nations, menu |

## Contenu

- **Carte** : rivières (+1 or), 3 tailles (4, 6 ou 8 nations), 3 formes (continents, pangée, archipel), 7 terrains, collines, montagnes, forêts, jungles, marais, 18 ressources (dont 8 de luxe), villages tribaux, camps barbares, brouillard de guerre.
- **8 nations** avec un atout chacune (Gaulois, Romains, Égyptiens, Chinois, Aztèques, Vikings, Perses, Maliens), 4 difficultés, 2 durées (220 ou 320 tours).
- **Villes** : croissance, cases exploitées automatiquement selon une spécialisation, frontières qui s’étendent avec la culture, 21 bâtiments, 11 merveilles du monde, achat avec l’or, bombardement des ennemis proches.
- **43 technologies** sur 6 ères (choix d’un objectif lointain, le chemin se fait seul), **15 doctrines** en 5 voies achetées avec la culture, **bonheur** (luxes, temples… contre taille de l’empire), entretien en or.
- **26 unités** (terre, mer, siège, cavalerie), embarquement, combat avec relief, fortification, encerclement, blessures, expérience et grades, amélioration des unités ; ouvriers à charges (fermes, mines, pâturages, plantations, scieries, routes) et automatisation.
- **Diplomatie** : rencontre, guerre et paix (frontières fermées en paix), propositions de paix de l’IA.
- **IA** : expansion, choix des sites, ouvriers, garnisons, guerres de conquête avec engins de siège, marine, achats, doctrines. Barbares.
- **Victoires** : conquête des capitales, Arche stellaire (science), score à la date limite.

## Fichiers

| Fichier | Rôle |
|---|---|
| `regles.js` | Toutes les données : terrains, ressources, unités, bâtiments, merveilles, technologies, doctrines, nations, difficultés |
| `monde.js` | Géométrie hexagonale, bruit, génération de la carte et des points de départ |
| `moteur.js` | État `G`, déplacements (`explorer` = chemins), combat (`prevision`, `attaquer`), villes, recherche, tours (`finDuTour`), sauvegarde (`exporter` / `importer`) |
| `ia.js` | Nations adverses et barbares ; `iaOuvrier` et `iaExplorer` servent aussi à l’automatisation du joueur |
| `modeles3d.js` | Modèles 3D construits à partir de formes simples : escouades (armes et casques selon l’époque), cavaliers, engins de siège, chars, navires, chariot du colon, arbres, quartiers des villes selon l’époque, palais, remparts, aménagements |
| `rendu.js` | Scène 3D : relief continu calculé depuis les cases (collines, montagnes, côtes sous une eau transparente), soleil et ombres, arbres instanciés, rivières, routes, frontières, brouillard de guerre en mer de nuages (ajouté aux shaders), caméra inclinée, sélection des cases, bandeaux des villes et fanions des unités en HTML ; réglage « Graphismes » (haute qualité / économie : sans ombres, relief allégé) |
| `interface.js` | Entrées, panneaux, fenêtres (ville, technologies, doctrines, nations), écran titre |

Ajouter une unité, un bâtiment ou une technologie = une ligne dans `regles.js` (l’interface et l’IA les prennent seules).

## Contrôles

```
node jeux/aube/outils/simulation.js 3            # 3 parties entières IA contre IA (petite, normale, grande)
node jeux/aube/outils/essai-navigateur.js [dossier-captures]   # Chromium : Mac (souris, clavier) puis iPhone (toucher)
```

`node jeux/aube/outils/artefact.js <dossier>` prépare la version en une page (contenu entre `<!--JEU-DEBUT-->` et `<!--JEU-FIN-->` + scripts) pour une publication sous forme de page partagée.

## Limites

- Pas de multijoueur, pas de commerce ni de diplomatie fine (alliances, échanges) ; pas d’avions.
- La carte ne fait pas le tour du monde (bords fixes).
- L’IA reste simple : elle se défend correctement et attaque quand elle se sent plus forte, mais ne coordonne pas de débarquements.
