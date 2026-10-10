# Publicité Paperdecrypt (30 s)

Film d'animation (motion design) généré par le code : `tools/pub/pub.html` (animation pilotée à la seconde près), `tools/pub/audio.py` (musique et bruitages synthétisés, aucun morceau tiers), `tools/pub/render.js` (rendu image par image puis assemblage ffmpeg).

| Fichier | Usage | Format | Son |
|---|---|---|---|
| `paperdecrypt-pub-30s-reseaux-9x16.mp4` | TikTok, Reels, Stories, Shorts | 1080×1920, 30 i/s, H.264 | AAC 48 kHz stéréo, −14 LUFS |
| `paperdecrypt-pub-30s-tele-16x9.mp4` | Télévision, YouTube, site, écran | 1920×1080, 25 i/s, H.264 | AAC 48 kHz stéréo, −23 LUFS (norme EBU R128) |

Copie de travail pour un diffuseur ou un monteur (ProRes 422 HQ, son PCM) : `PRORES=1 node tools/pub/render.js land 25`.
Refaire un rendu (après avoir changé un texte ou une image) : `node tools/pub/render.js port 30` et `node tools/pub/render.js land 25` (environ une minute chacun). Aperçu en images fixes : `node tools/pub/apercu.js port`.

## Déroulé (30 s, coupes sur les temps de la musique à 120 battements par minute)
| Temps | Plan | Message |
|---|---|---|
| 0 – 3 s | Courriers qui tombent, tampons « Mise en demeure », « Urgent » | « Un courrier que vous ne comprenez pas ? » |
| 3 – 6 s | Photo du courrier sur téléphone, balayage de lecture, flash | « Prenez-le en photo. Ou importez un PDF. » |
| 6 – 10 s | Cartes : qui écrit, ce qu'on demande, avant quand, combien (HT barré, TTC en évidence) | « On vous explique. » |
| 10 – 13 s | Rappels dans l'agenda, lettre de réponse prête | « On vous rappelle. Et la réponse est déjà écrite. » |
| 13 – 17 s | Fiche de paie : heures supplémentaires repérées, 14 h faites contre 10 h payées | « Vos heures supp sont-elles comptées ? » |
| 17 – 21 s | État des lieux : photo avec date, heure et GPS, carte, certification, comparaison entrée/sortie | « La preuve dans la poche. » |
| 21 – 24,5 s | Garanties, coffre, abonnements, HT/TTC, lettres types, dossier PDF | « Et aussi… » |
| 24,5 – 27 s | Cadenas | « Tout reste sur votre téléphone. » |
| 27 – 30 s | Logo, nom, adresse, mention légale | « Paperdecrypt, le décodeur de papiers, gratuit. quentools.fr » |

Le sens passe sans le son (la plupart des vidéos sociales sont vues sans son) ; la musique et les bruitages sont calés sur chaque apparition (frappes, balayage, déclic d'appareil photo, « ding » de validation, alerte, cadenas).

## Voix off proposée (pour une version télévision, 30 s, à faire enregistrer par un comédien)
> « Un courrier que vous ne comprenez pas ? Prenez-le en photo.
> Paperdecrypt vous explique : qui vous écrit, ce qu'on vous demande, avant quand, et combien : hors taxes ou toutes taxes comprises.
> Il vous rappelle les dates et prépare la réponse.
> Votre fiche de paie : vos heures supplémentaires sont-elles comptées ?
> Votre état des lieux : des photos datées, géolocalisées, certifiées.
> Garanties, abonnements, coffre de documents… tout y est, et tout reste sur votre téléphone.
> Paperdecrypt, le décodeur de papiers gratuit de QuenTools. Sur quentools.fr. »

Poser la voix à environ −18 LUFS sur la musique, qui peut descendre de 6 dB pendant la voix.

## Règles à respecter
- Ne jamais présenter l'outil comme une intelligence artificielle ; ne pas annoncer de prix.
- La mention légale de fin de film (« ne remplace pas l'avis d'un professionnel », « seul un état des lieux signé par les deux parties fait foi ») reste obligatoire à l'écran.
- Les écrans montrés sont de l'interface réelle ou fidèle, avec des données fictives (adresse, noms, montants d'exemple).
- Pour une diffusion télévisée, le diffuseur impose en général un contrôle technique (loudness, formats, mentions) et un numéro d'identification de la publicité : à demander à la régie.
