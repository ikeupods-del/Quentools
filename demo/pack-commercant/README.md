# Pack Commerçant

Réservation en ligne avec acompte, carte de fidélité sur téléphone, demandes d'avis Google et espace commerçant, aux couleurs du commerce. Démonstration : `/demo/pack-commercant/` (commerce fictif « Atelier Lila », données dans le navigateur du visiteur).

## Fonctions
- **Réservation** (`index.html`, `reserver.js`) : prestation → jour → heure → coordonnées. Créneaux calculés d'après les horaires, la durée, le délai minimum et les créneaux déjà pris (un rendez-vous de 90 min bloque 3 cases de 30 min). Double réservation impossible (écriture unique des créneaux et du rendez-vous dans Firestore).
- **Acompte** : montant fixe ou pourcentage ; bouton vers le lien de paiement du commerçant (paypal.me avec montant, ou lien Stripe). Pas de confirmation automatique du paiement : le commerçant clique « Acompte reçu ».
- **Carte de fidélité** (`carte/`) : créée par le client avec son prénom, gardée sur son téléphone, QR code qui ouvre l'espace commerçant sur cette carte (appareil photo du téléphone, aucune application) ; récompense au bout de N tampons, puis remise à zéro.
- **Avis Google** : message préparé (WhatsApp ou SMS) après la visite, affiche à imprimer avec QR code (`affiche/`). Proposé à tous les clients, sans tri.
- **Espace commerçant** (`admin/`) : rendez-vous à venir et passés, acompte reçu, rappel WhatsApp/SMS, client venu, annulation qui libère le créneau, cartes de fidélité, réglages.

## Fichiers
| Fichier | Rôle |
|---|---|
| `config.js` | Fiche du commerce (générée pour chaque client). `firebase` vide = démonstration. |
| `store.js` | Règles (créneaux, acompte, liens de paiement et de messages) et stockage (démonstration ou Firestore par l'API web). |
| `pack.js`, `pack.css` | Couleur du commerce (contraste contrôlé), bandeau de démonstration, styles sur `assets/qt.css`. |
| `qr.js` | QR code sans bibliothèque (versions 1 à 10, correction M), relu par un lecteur dans les essais. |
| `regles-firestore.js` | Règles de sécurité Firestore (adresses autorisées dans l'espace commerçant). |

## Nouveau client
```
node tools/pack-commercant.js --exemple > fiche.json   # remplir la fiche
node tools/pack-commercant.js fiche.json               # → clients/<dossier>/site/ + REGLES-FIRESTORE.txt + LISEZMOI-LIVRAISON.txt
```
Le client fournit : ses prestations, prix, durées et horaires ; son lien de paiement (PayPal ou Stripe) ; le lien « Laisser un avis » de sa fiche Google ; un projet Firebase gratuit à son nom (Firestore + connexion Google) et l'adresse Google qui gère l'espace commerçant.

## Contrôle
`node tools/verifier-pack-commercant.js` : règles, parcours complet dans un navigateur (réservation, double réservation refusée, acompte, annulation, avis, 8 tampons et récompense, affiche), site client généré, téléphone et ordinateur. Lancé aussi avant chaque publication.

## Limites
- Le mode réel (Firestore) suit le même chemin que la démonstration mais doit être essayé une fois avec le vrai projet Firebase du premier client (étape 4 du LISEZMOI de livraison).
- Aucun SMS ni e-mail automatique : les messages partent du téléphone du commerçant.
- Quelqu'un de malveillant pourrait réserver de faux créneaux : le commerçant les annule dans son espace (le créneau est libéré).
