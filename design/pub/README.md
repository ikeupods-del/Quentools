# Publicités vidéo

## Paperdecrypt (45 s)

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

# Publicité QuenTools (30 s) : studio de création d'apps et d'outils

Même méthode que Paperdecrypt : `tools/pub/quentools.html` (animation), `tools/pub/audio.py` (musique et bruitages générés), `tools/pub/render.js` avec `PUB=quentools`.

| Fichier | Usage | Format | Son |
|---|---|---|---|
| `quentools-pub-30s-reseaux-9x16.mp4` | TikTok, Reels, Stories, Shorts, publicité Facebook/Instagram | 1080×1920, 30 i/s, H.264 | AAC, −14 LUFS |
| `quentools-pub-30s-web-16x9.mp4` | YouTube, LinkedIn, site, écran en boutique | 1920×1080, 25 i/s, H.264 | AAC, −14 LUFS |
| `quentools-pub-30s-tele-16x9.mp4` | Diffusion à la télévision uniquement (norme des chaînes, son volontairement plus faible) | 1920×1080, 25 i/s, H.264 | AAC, −23 LUFS |

Refaire un rendu : `PUB=quentools node tools/pub/render.js port 30` et `PUB=quentools node tools/pub/render.js land 25` (ajouter `TV=1` pour la copie télévision) ; bandes son seules : `quentools-pub-bande-son-*.mp3` ; aperçu en images fixes : `PUB=quentools node tools/pub/apercu.js port`.

| Temps | Plan | Message |
|---|---|---|
| 0 – 4 s | Tableur, devis papier, notifications (rendez-vous annulé, message à toute heure, appels manqués) | « Excel, papiers, messages à toute heure ? » |
| 4 – 8 s | Logo, icônes des applications déjà en ligne | « QuenTools crée vos apps et vos outils. » |
| 8 – 14 s | Pack Commerçant : réservation, acompte reçu, tampons de fidélité, avis | « Vos clients réservent, paient l'acompte et reviennent. » |
| 14 – 19 s | Devis qui se remplit, total, envoyé au client | « Vos devis faits sur téléphone, devant le client. » |
| 19 – 23,5 s | Installation sur l'écran d'accueil, sans magasin d'applications | « Votre appli sur l'écran d'accueil. » |
| 23,5 – 26,5 s | Prix fixé avant de commencer, première version montrée, données chez vous, quelqu'un de joignable | « Simple, à votre nom. » |
| 26,5 – 30 s | Logo, adresse, devis gratuit | « Studio de création d'apps et d'outils. quentools.fr » |

Aucun prix (règle des publications), écrans du Pack Commerçant signalés comme exemple fictif, devis d'exemple marqué « Exemple ».

Voix off proposée (30 s) :
> « Excel, des papiers, des messages à toute heure ? QuenTools crée vos apps et vos outils. Vos clients réservent, paient l'acompte et reviennent. Vos devis se font sur téléphone, devant le client. Et votre appli s'installe sur l'écran d'accueil. Prix fixé avant de commencer, à votre nom. QuenTools, studio de création d'apps et d'outils. Devis gratuit sur quentools.fr. »
