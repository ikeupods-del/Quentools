# QuentMovie — vidéos explicatives en bâtons

Module de QuentMovie qui fabrique une vidéo explicative « comme si vous aviez 5 ans » : bonshommes bâtons au trait sur papier mat, flèches d'argent, paquets qui s'écroulent, courbes qui plongent, chiffre clé au centre, bannière d'étape et sous-titres au mot près.

Sujet → **scénario** (actes, scènes, métaphores, visuels) → **voix** scène par scène avec le temps de chaque mot → **projet.json** → **MP4** dessiné image par image par Remotion.

Projet à part dans `quentmovie/batons/` (TypeScript, React, Remotion) : il n'alourdit pas l'application Mac et ne figure pas dans son paquet.

## Installation (une fois)

```bash
cd quentmovie/batons
npm install
```

Au premier rendu, Remotion télécharge son propre Chromium (≈ 100 Mo). Pour utiliser un Chromium déjà installé : `export REMOTION_CHROME=/chemin/vers/chrome`.

## Essayer sans aucune clé

```bash
npm run studio      # aperçu interactif dans le navigateur (Remotion Studio), lecture, image par image
npm run demo        # rendu MP4 de la démonstration « crise de 2008 » → out/demo-crise-2008.mp4
npm run verifier    # contrôles (types + 9 essais hors ligne)
```

La démonstration n'a pas de voix : les temps des mots sont estimés.

## Fabriquer une vraie vidéo

Clés à mettre dans le terminal (jamais dans le dépôt) :

```bash
export ANTHROPIC_API_KEY=…        # scénario
export ELEVENLABS_API_KEY=…       # voix et alignement des mots
export ELEVENLABS_VOICE_ID=…      # voix ElevenLabs choisie (synthèse seulement)
```

Méthode conseillée, avec relecture du texte :

```bash
npm run fabriquer -- "La crise de 2008" --script-seul
#   → public/projets/la-crise-de-2008-AAAA-MM-JJ/script.json (à relire, à corriger à la main si besoin)
#   → repliques.txt (une ligne par scène, numérotée v00, v01… comme le Doublage)
npm run fabriquer -- --script public/projets/la-crise-de-2008-AAAA-MM-JJ/script.json
```

Options :

| Option | Effet |
| --- | --- |
| `--voix elevenlabs` | voix de synthèse ElevenLabs (par défaut) |
| `--voix perso --doublage ~/Movies/QuentMovie/doublages/<nom>` | **ta voix** : les prises `v00.wav`, `v01.wav`… du Doublage de QuentMovie (une par scène), alignées mot à mot par ElevenLabs ; une prise manquante arrête tout avec la liste à enregistrer |
| `--voix muet` | aucune voix, temps estimés (essai du rendu) |
| `--faits faits.txt` | faits vérifiés donnés au scénariste, utilisés en priorité |
| `--sans-rendu` | s'arrête au `projet.json` |
| `--sortie chemin.mp4` | emplacement de la vidéo (par défaut `~/Movies/QuentMovie/exports/` s'il existe, sinon `out/`) |

Un `projet.json` peut être rendu de nouveau à tout moment : `npm run rendu -- public/projets/<id>/projet.json` (ajouter `--images 90,400` pour quelques images de contrôle).

**Chaîne QuentInvest** : la règle « jamais de voix de synthèse » s'applique. Pour un épisode de la chaîne, utiliser `--voix perso` (ta voix du Doublage) ou, dans ElevenLabs, une voix clonée à partir de ta propre voix.

## Ce que contrôle le programme

- Le scénario suit un schéma strict (sortie JSON structurée) ; puis le programme vérifie que chaque mot déclencheur figure bien dans la narration de sa scène, que les flèches relient des acteurs existants, que les phrases restent courtes et que les visuels varient. Au moindre défaut, le scénariste réécrit une fois avec la liste ; sinon la fabrication s'arrête en disant pourquoi.
- Les chiffres et dates doivent figurer dans `sources` du script : **relire le script avant la voix**, l'IA peut se tromper.

## Organisation

```
batons/
├── src/
│   ├── types/projet.ts                  schéma : script (écrit par le scénariste) et projet complet (temps)
│   ├── services/
│   │   ├── ai/prompts.ts                consignes du scénariste (ton, tension, métaphores, exactitude)
│   │   ├── ai/scriptGenerator.ts        appel au modèle, contrôles, seconde tentative
│   │   ├── audio/ttsService.ts          synthèse ElevenLabs horodatée, alignement d'un enregistrement
│   │   └── timing.ts                    placement des scènes, mots déclencheurs → secondes
│   ├── remotion/
│   │   ├── Root.tsx                     composition « EcoVideo » (durée lue dans le projet)
│   │   └── compositions/EcoVideo/
│   │       ├── EcoVideo.tsx             ouverture, séquences des actes et scènes, voix
│   │       ├── theme.ts, trait.ts       palette, police, traits « au feutre » qui frémissent
│   │       ├── Papier.tsx               fond papier mat
│   │       ├── StickFigure.tsx          bonhomme bâton (6 humeurs : pose, bouche, mouvement)
│   │       ├── Objets.tsx               maison en 5 traits, sac $, billets, contrat, bâtiments, acteurs
│   │       ├── MoneyFlow.tsx            flèches tracées au mot prononcé, objets qui circulent
│   │       ├── Habillage.tsx            bannière d'étape, chiffre clé, sous-titres karaoké
│   │       └── scenes/                  paquet qui s'écroule, courbe, chiffre, personnages, aiguillage
│   ├── cli/                             fabriquer, rendu, verifier
│   └── demo/crise2008.ts                projet de démonstration
└── public/                              police Inter (OFL), projets fabriqués (non versionnés)
```

Ajouter un type de visuel : une entrée dans `VisuelSchema` (types/projet.ts), un composant dans `scenes/`, un cas dans `SceneVisuel` (scenes/Scenes.tsx) et une ligne dans les consignes du scénariste.

## Limites

- Les clés ElevenLabs et Anthropic sont payantes à l'usage ; rien n'est appelé sans elles (la démonstration et les contrôles s'en passent).
- Pas encore de bouton dans l'application QuentMovie : la fabrication se lance au terminal. Le MP4 produit s'importe dans QuentMovie comme n'importe quelle vidéo.
- Remotion est gratuit pour un particulier ou une entreprise de 3 personnes au plus ; au-delà, une licence est nécessaire (remotion.pro).
- Format 16:9 (1920 × 1080, 30 images/s). Le 9:16 demandera de replacer les acteurs (`placer` dans MoneyFlow.tsx).
