# Publication automatique (YouTube et TikTok de QuentInvest)

État : non connecté. Les comptes se connectent une fois par le propriétaire (autorisation de sa part, impossible à faire à sa place) ; ensuite la programmation se fait par Metricool.

## À faire une fois (≈ 10 minutes, propriétaire)
1. Dans Metricool : ajouter une marque « QuentInvest » (le compte TikTok « quentools » est déjà lié à la marque de l'atelier : ne pas le mélanger).
2. Dans cette marque : connecter le TikTok et la chaîne YouTube de QuentInvest (boutons « Connecter », connexion avec les comptes de la chaîne).
3. Dans les réglages de la chaîne YouTube : vérifier les fonctionnalités avancées (vidéos de plus de 15 minutes non nécessaires ; vérification du téléphone pour les miniatures personnalisées).

## Ensuite, pour chaque épisode (une demande courte)
Chaque fabrication écrit `NN-sujet-publication.json` à côté des vidéos : titre, description avec chapitres, légende TikTok, étiquettes, « pas destiné aux enfants », contenu de synthèse déclaré, catégorie Éducation. La programmation lit ce fichier :
- YouTube : vidéo de 5 minutes au moins, titre, description, étiquettes, miniature, contenu de synthèse déclaré, public « pas pour enfants », date et heure choisies.
- TikTok : version verticale d'une minute, légende, contenu généré par ordinateur déclaré.
- Rythme proposé : 1 vidéo YouTube et 3 à 4 TikTok par semaine, heures conseillées par Metricool pour la marque.
Chaque publication est programmée à l'avance (pas immédiate) : elle reste visible et annulable dans le planificateur Metricool avant sa sortie.

## Point technique à valider au premier essai
Metricool télécharge la vidéo depuis une adresse publique. Les vidéos ne passent pas par la conversation (trop lourdes) : elles seront déposées sur une adresse publique (dépôt GitHub public dédié ou dossier Google Drive relié à Metricool), puis la programmation pointe vers cette adresse. Le premier essai se fait avec une publication privée pour vérifier que Metricool accepte le fichier.

## Compte relié (17 octobre 2026)
Marque Metricool n° 7483174 (propriétaire `ikeupods@gmail.com`, fuseau Europe/Paris) : TikTok « woufapp » et chaîne YouTube `UCQDy7BsKRARXG9P_LG6NPHg`. Le propriétaire a demandé de programmer les publications.

## Calendrier proposé (heures de Paris, d'après les meilleurs créneaux de Metricool)
YouTube : mardi et vendredi à 16 h (créneau le plus fort de la semaine pour la chaîne). TikTok : le même jour à 18 h (second pic de la journée), avec la mention « vidéo complète sur la chaîne ».

| Épisode | YouTube | TikTok |
|---|---|---|
| 3 · Les intérêts composés | mar. 20 oct. 16 h | mar. 20 oct. 18 h |
| 4 · Un crédit de 10 000 € | ven. 23 oct. 16 h | ven. 23 oct. 18 h |
| 5 · 100 € par mois pendant 20 ans | mar. 27 oct. 16 h | mar. 27 oct. 18 h |
| 6 · 1,5 % de frais par an | ven. 30 oct. 16 h | ven. 30 oct. 18 h |
| 7 · 2 000 € sur 20 ans | mar. 3 nov. 16 h | mar. 3 nov. 18 h |
| 8 · 5 000 € dans un tiroir | ven. 6 nov. 16 h | ven. 6 nov. 18 h |

Réglages de chaque publication : YouTube public, catégorie Éducation, « pas destiné aux enfants », contenu de synthèse déclaré ; TikTok public, contenu généré par ordinateur déclaré ; textes tirés de `NN-sujet-publication.json`.
