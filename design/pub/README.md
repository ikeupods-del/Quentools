# Publicité Paperdecrypt (45 s)

Film d'animation (motion design) généré par le code : `tools/pub/pub.html` (animation pilotée à la seconde près), `tools/pub/audio.py` (musique et bruitages synthétisés, aucun morceau tiers), `tools/pub/render.js` (rendu image par image puis assemblage ffmpeg).

| Fichier | Usage | Format | Son |
|---|---|---|---|
| `paperdecrypt-pub-45s-reseaux-9x16.mp4` | TikTok, Reels, Stories, Shorts | 1080×1920, 30 i/s, H.264 | AAC 48 kHz stéréo, −14 LUFS |
| `paperdecrypt-pub-45s-tele-16x9.mp4` | Télévision, YouTube, site, écran | 1920×1080, 25 i/s, H.264 | AAC 48 kHz stéréo, −23 LUFS (norme EBU R128) |

Bandes son seules : `paperdecrypt-pub-bande-son-reseaux.mp3` et `…-tele.mp3` (même volume que les vidéos).

Copie de travail pour un diffuseur ou un monteur (ProRes 422 HQ, son PCM) : `PRORES=1 node tools/pub/render.js land 25`.
Refaire un rendu (après avoir changé un texte ou une image) : `node tools/pub/render.js port 30` et `node tools/pub/render.js land 25` (environ une minute chacun). Aperçu en images fixes : `node tools/pub/apercu.js port`.

## Déroulé (45 s, coupes sur les temps de la musique à 120 battements par minute)
Chaque plan reste affiché au moins 2 secondes après l'apparition de son dernier élément, pour laisser le temps de lire.

| Temps | Plan | Message |
|---|---|---|
| 0 – 3,5 s | Courriers qui tombent, tampons « Mise en demeure », « Urgent » | « Un courrier que vous ne comprenez pas ? » |
| 3,5 – 8 s | Photo du courrier sur téléphone, balayage de lecture, flash, résultat | « Prenez-le en photo. Ou importez un PDF. » |
| 8 – 14,5 s | Cartes : qui écrit, ce qu'on demande, avant quand, combien (HT barré, TTC en évidence) | « On vous explique. » |
| 14,5 – 19 s | Rappels dans l'agenda, lettre de réponse prête | « On vous rappelle. Et la réponse est déjà écrite. » |
| 19 – 25,5 s | Fiche de paie : heures supplémentaires repérées, 14 h faites contre 10 h payées | « Vos heures supp sont-elles comptées ? » |
| 25,5 – 32 s | État des lieux : photo avec date, heure et GPS, carte, certification, comparaison entrée/sortie | « La preuve dans la poche. » |
| 32 – 37 s | Garanties, coffre, abonnements, HT/TTC, lettres types, dossier PDF | « Et aussi… » |
| 37 – 40,5 s | Cadenas | « Tout reste sur votre téléphone. » |
| 40,5 – 45 s | Logo, nom, adresse, mention légale | « Paperdecrypt, le décodeur de papiers. Gratuit pour commencer, Premium pour aller plus loin. quentools.fr » |

Le sens passe sans le son (la plupart des vidéos sociales sont vues sans son). Avec le son : musique rythmée et bruitages calés sur chaque apparition (frappes de tampons, balayage de lecture, déclic d'appareil photo, « ding » de validation, cloche, machine à écrire du GPS, alerte, cadenas, petits « pop » et « swish » à chaque élément). La bande son seule est fournie en MP3 pour le montage.

## Voix off proposée (pour une version télévision, 45 s, à faire enregistrer par un comédien)
> « Un courrier que vous ne comprenez pas ? Prenez-le en photo.
> Paperdecrypt vous explique : qui vous écrit, ce qu'on vous demande, avant quand, et combien : hors taxes ou toutes taxes comprises.
> Il vous rappelle les dates et prépare déjà la réponse.
> Votre fiche de paie : vos heures supplémentaires sont-elles toutes comptées ?
> Votre état des lieux : des photos datées, géolocalisées, certifiées.
> Garanties, abonnements, coffre de documents, calcul de TVA, lettres types… tout y est.
> Et tout reste sur votre téléphone.
> Paperdecrypt, le décodeur de papiers de QuenTools : gratuit pour commencer, Premium pour aller plus loin. Sur quentools.fr. »

Poser la voix à environ −18 LUFS sur la musique, qui peut descendre de 6 dB pendant la voix.

## Règles à respecter
- Ne jamais présenter l'outil comme une intelligence artificielle ; ne pas annoncer de prix ; ne pas dire « entièrement gratuit » (modèle gratuit + Premium).
- La mention légale de fin de film (« ne remplace pas l'avis d'un professionnel », « seul un état des lieux signé par les deux parties fait foi ») reste obligatoire à l'écran.
- Les écrans montrés sont de l'interface réelle ou fidèle, avec des données fictives (adresse, noms, montants d'exemple).
- Pour une diffusion télévisée, le diffuseur impose en général un contrôle technique (loudness, formats, mentions) et un numéro d'identification de la publicité : à demander à la régie.
