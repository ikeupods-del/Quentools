# Sauvegarde et reprise (piratage, bannissement GitHub)

À faire chaque semaine, en 5 minutes :
1. **Site et historique** : `sh tools/sauvegarde-depot.sh` (copie complète du dépôt, toutes les branches). Garder le fichier sur un disque externe.
2. **Base de données** : administration → Règles de sécurité → « Télécharger la sauvegarde » (demandes, messages, notes, agenda, contacts, cartes cadeaux, réglages, abonnés Infikit). Le fichier contient des données personnelles : le ranger chiffré, ne pas le partager.
3. **Seconde copie du code** chez un autre hébergeur (GitLab, Codeberg) : créer un dépôt vide privé, puis `git push --mirror <adresse>`.

À noter hors ordinateur : nom de domaine et zone DNS (OVH), projet Firebase, comptes Stripe et PayPal, codes de récupération de la double authentification.

## Reprise si GitHub est inaccessible
Le site est statique : `index.html` et les dossiers listés dans `.github/workflows/pages.yml` suffisent. Les mêmes fichiers peuvent être publiés chez un autre hébergeur de pages (Cloudflare Pages, Netlify), puis le domaine repointé depuis OVH.
Les données restent dans Firebase : si le compte Google est perdu, seule la sauvegarde JSON permet de les retrouver.
