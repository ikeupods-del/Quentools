# QuentStudio

Application Mac (Python) qui fabrique des vidéos verticales 9:16 de **62,0 secondes exactement**, pour deux séries :

- **Quentools** : sketchs comiques. Quentools, un humain sceptique et fatigué, face à Glitchou, une petite IA ronde vert-jaune trop sûre d'elle. Chaque vidéo contient 3 sketchs de 4 plans.
- **QuentInvest** : l'économie expliquée simplement. Max, un jeune pressé de devenir riche, face à Pépite, une pièce d'or calme et pédagogue. Chaque vidéo traite un sujet en 3 parties de 4 répliques.

Un bouton en haut de la fenêtre passe d'une série à l'autre. Chaque série a sa propre bibliothèque, son historique et sa réserve.

Chaque vidéo finit par une carte avec la question pour les commentaires et un **appel à s'abonner**, compris dans les 62 s : une réplique parlée (les variantes tournent), un bouton « S'ABONNER » animé et un ding.

Tout est local. Rien n'est envoyé sur internet : seuls la voix Piper et le modèle d'IA locale sont téléchargés, une seule fois.

## Installer et lancer

```bash
cd quentstudio
bash install_mac.sh                 # Python, ffmpeg, venv, voix, app, AirDrop, IA locale
open -a QuentStudio                 # ou depuis le Launchpad / le Dock
```

- `QS_SANS_IA=1 bash install_mac.sh` installe sans Ollama. L'app marche alors sans IA : générateur procédural pour Quentools, fiches pour QuentInvest.
- Relancer `bash install_mac.sh` après chaque modification du code : l'app installée est une copie du dossier.
- L'app s'installe dans `/Applications`, ou dans `~/Applications` si `/Applications` n'est pas modifiable.
- Le journal de l'app est dans `~/Movies/QuentStudio/journal.txt`.
- Sans installation, pour essayer : `python3 studio.py` (interface dans le navigateur si pywebview manque).

## Utilisation

| Bouton | Quentools | QuentInvest |
|---|---|---|
| Nouvelle vidéo | réserve, puis IA locale, puis générateur procédural | réserve, puis fiche pas encore publiée, puis IA locale |
| Nouvelle vidéo (bibliothèque / fiches) | sketchs de la bibliothèque jamais publiés | fiche écrite à la main |
| Nouvelle vidéo (IA locale) | 3 sketchs écrits par l'IA | épisode écrit par l'IA |
| Champ « Sujet » | — | ex. « résume le krach boursier de 1929 » |
| Générer 20 en avance | en arrière-plan, avec ou sans IA | épisodes écrits par l'IA (nécessite Ollama) |

Les vidéos sont enregistrées dans `~/Movies/QuentStudio/videos`. À côté de chaque vidéo, un fichier `.json` donne le texte, les temps de chaque plan, la voix utilisée et l'appel à s'abonner. Le bouton **AirDrop** ouvre directement la fenêtre de partage. S'il échoue, la vidéo est montrée dans le Finder et la fenêtre AirDrop du Finder s'ouvre.

## Scénarios quasi infinis (Quentools)

- **IA locale (Ollama, `llama3.2:3b`)** : elle écrit de nouveaux sketchs en continu. Elle s'inspire de 4 exemples tirés de la bibliothèque et d'une idée de départ au hasard, et reçoit les titres déjà utilisés à éviter. Le JSON est imposé (schéma) puis contrôlé par `story.clean_sketch` : 4 répliques, les deux personnages, 22 mots maximum, ni marque, ni vraie personne, ni grossièreté.
- **Générateur procédural** (`procedural.py`, sans IA) : il combine 89 problèmes du quotidien, 80 bourdes, 40 réactions et 68 chutes. Cela donne environ 5 000 sketchs nettement différents, soit près de 5 ans à une vidéo par jour.
- **Anti-répétition** (`history.json`) : un sketch est refusé, puis régénéré, si son titre ressemble trop à un ancien ou s'il partage ses mots-clés (objet, bourde, chute).
- **Bibliothèque qui s'enrichit** (`bibliotheque.json`) : elle démarre avec 49 sketchs écrits à la main (`corpus.py`). Chaque bon sketch généré y est ajouté et sert ensuite d'exemple à l'IA.

## QuentInvest et exactitude

- **13 fiches vérifiées** (`invest.py`) : krach de 1929, crise de 2008, bulle internet, intérêts composés, inflation, diversification, actions et obligations, fonds indiciels, taux directeurs, dividende, épargne de précaution, tulipomanie, hyperinflation de 1923. Elles sont utilisables sans IA.
- **Avec l'IA**, le sujet tapé est d'abord rapproché d'une fiche. Si une fiche correspond, l'IA réécrit l'épisode à partir de ses faits.
- **Contrôle des chiffres** : tout chiffre ou toute date qui n'apparaît ni dans les faits ni dans le sujet fait refuser l'épisode, qui est alors réécrit. Ce contrôle est fait par le programme, pas par l'IA.
- **Sujet libre sans fiche** : l'épisode est marqué « À relire avant publication ».
- **Mention fixe** sur chaque image : « Vulgarisation · pas un conseil en investissement ».

## Calage à 62,0 s

`render.caler` répartit les 62 s entre les 12 plans et la carte finale, qui dure de 5,5 à 8 s avec l'appel à s'abonner. Chaque plan dure au moins 2 s et prend la durée de sa voix plus une petite respiration.

- **Voix trop longues** : elles sont accélérées, jusqu'à ×1,6.
- **Temps en trop** : il va d'abord à la carte finale, puis aux respirations.

Les images sont comptées une à une (1 860 à 30 i/s) et le son est mixé à l'échantillon près. ffprobe donne donc exactement `62.000000`. Les bouches s'ouvrent selon le volume réel de la voix de chaque personnage, image par image. Les sous-titres changent avec le plan.

## Voix

Piper, voix française `fr_FR-upmc-medium` :

- **Quentools** : Pierre, un peu plus grave.
- **Glitchou** : Jessica, accélérée et plus aiguë.
- **QuentInvest** : mêmes voix, réglées autrement pour Max et Pépite.

Les numéros des locuteurs sont lus dans le fichier du modèle (`speaker_id_map`) et ne sont pas supposés. On peut les forcer avec `QS_SPK_Q` / `QS_SPK_G`. `voice.py` utilise l'API Python de piper-tts. Avec une ancienne version en ligne de commande, il détecte lui-même les options attendues (`--length-scale` ou `--length_scale`). Sans Piper, des bips de secours sont utilisés et l'interface l'indique.

## Changer l'appel à s'abonner

Créer `~/Movies/QuentStudio/config.json` :

```json
{"cta_bouton": "S'ABONNER",
 "cta_lignes": [["G", "Abonne-toi, je promets de rester sage."], ["Q", "Abonne-toi, ou Glitchou reprend le clavier."]],
 "quentinvest": {"cta_lignes": [["G", "Abonne-toi pour une notion d'économie par jour."]]}}
```

`Q` désigne Quentools (ou Max), `G` Glitchou (ou Pépite). Une réplique de plus de 12 mots est ignorée. Les valeurs par défaut sont dans `config.py`.

## Contrôles

```bash
python3 verifier.py --rapide     # scénarios, anti-répétition, validation, calage, IA simulée, QuentInvest
python3 verifier.py              # + rendu de vidéos et durée exacte vérifiée par ffprobe
```

## Fichiers

`studio.py` (fenêtre et serveur local) · `ui.html` (interface) · `story.py` (Quentools : IA, réserve, `clean`) · `procedural.py` · `corpus.py` · `history.py` · `invest.py` (QuentInvest) · `series.py` (personnages, couleurs, voix) · `render.py` · `voice.py` · `share.py` (AirDrop) · `config.py` · `icon.py` · `install_mac.sh` · `verifier.py`.

## Limites connues

- L'installation, la fenêtre native, l'icône du Dock, AirDrop et Ollama ont été écrits pour macOS mais n'ont pas encore été lancés sur un vrai Mac. Le moteur (scénarios, voix Piper réelles, rendu, durée exacte, interface) a été testé sous Linux.
- Lancée depuis le lanceur de l'app, la fenêtre appartient au processus Python : nom et icône du Dock sont corrigés au démarrage (`icone_dock`). À confirmer sur le Mac.
- Le contrôle des chiffres de QuentInvest ne voit que les nombres écrits en chiffres. Un épisode sur un sujet libre reste à relire avant publication.
