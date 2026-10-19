# HyperFrames dans QuentMovie : étude (19 octobre 2026)

HyperFrames (HeyGen, licence Apache 2.0, paquet npm `hyperframes`, version essayée 0.8.173) transforme une page web animée en vidéo MP4 : il ouvre la page dans un Chrome caché, avance l'animation image par image, filme chaque image et assemble le tout avec FFmpeg.

## Essai fait
- Modèle « warm-grain » de leur catalogue (`hyperframes init essai --example=warm-grain`), rendu en 1080p : **10 secondes de vidéo fabriquées en 27 secondes**, image correcte (titres, pastilles de pourcentage, textes animés).
- Le premier rendu a **échoué** : le modèle charge sa bibliothèque d'animation (GSAP) et une texture depuis des sites extérieurs au moment du rendu. Une fois ces fichiers copiés en local, le rendu passe. Les polices du modèle sont aussi chargées depuis internet (outil `hyperframes-localize-fonts` prévu pour les copier).

## Ce qu'il faut sur le Mac
| Besoin | Dans QuentMovie aujourd'hui | Ce qu'il manque |
|---|---|---|
| Node 22 ou plus | Oui : le Node d'Electron 43 | rien |
| FFmpeg | Oui (livré) | rien (`HYPERFRAMES_FFMPEG_PATH`) |
| ffprobe | **Non** sur puce Apple (celui de npm est un programme Intel) | un ffprobe arm64 : HyperFrames refuse de démarrer sans lui (essayé) |
| Chrome | Non (Electron n'est pas pilotable par HyperFrames) | Google Chrome s'il est installé (`HYPERFRAMES_BROWSER_PATH`), sinon le « Chrome sans fenêtre » de Google téléchargé une fois (≈ 100 Mo, `hyperframes browser ensure`) |
| Le programme lui-même | Non | **124 Mo** de modules (sharp, esbuild, prettier, puppeteer…) |

Poids : trop lourd pour être livré dans l'application (celle-ci grossirait de plus de 120 Mo pour une rubrique). Il faudrait le **télécharger au premier usage**, comme l'IA et les voix : un paquet préparé par le workflow pour Mac à puce Apple (HyperFrames ≈ 42 Mo compressé, mesuré, plus un ffprobe arm64), plus Chrome s'il n'est pas déjà sur le Mac.

## Points de vigilance
- **Mesure d'audience activée par défaut** : à couper systématiquement (`HYPERFRAMES_NO_TELEMETRY=1`, `HYPERFRAMES_NO_UPDATE_CHECK=1`, `HYPERFRAMES_SKIP_SKILLS=1`). Ne jamais utiliser `publish`, `cloud`, `lambda` ni `cloudrun` (envoi des projets chez HeyGen ou dans un nuage).
- **Modèles** : le catalogue se télécharge depuis GitHub. Il faut vérifier la licence de chaque modèle avant de le garder, puis le ranger dans la bibliothèque de QuentMovie avec ses fichiers en local (GSAP, polices, images), pour que tout marche sans internet.
- **GSAP** n'est pas sous Apache 2.0 : licence « standard sans frais » de GSAP, qui permet l'usage commercial ; la copier dans l'application avec sa licence.

## Deux façons de l'intégrer
1. **HyperFrames tel quel** (rubrique « Animations ») : téléchargement d'environ 42 Mo plus ffprobe, et Chrome (≈ 100 Mo) s'il manque, au premier usage ; tous les modèles de leur catalogue utilisables après vérification ; outils de contrôle fournis (lint, synchronisation sur la musique).
2. **Moteur maison compatible** : QuentMovie dessine déjà des pages animées image par image dans ses fenêtres cachées (écrans de Pico, 2.2). On reprend seulement le principe (page HTML + GSAP en local, temps avancé image par image) : **rien à télécharger**, mais seulement les modèles écrits pour QuentMovie, sans les outils de HyperFrames.

Recommandation : commencer par la **façon 2** pour les génériques, écrans de chiffres et habillages réseaux sociaux, et pour les écrans de Pico (même moteur), sans rien ajouter au Mac. Passer à la façon 1 si le propriétaire veut tout le catalogue HyperFrames.
