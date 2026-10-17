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
