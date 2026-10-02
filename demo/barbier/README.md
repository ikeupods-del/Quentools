# Modèle « Barbier » (Kings Ave)

Site de barbier style Brooklyn : réservation en ligne, paiement par carte à l'avance ou espèces au salon, abonnement, carte de fidélité, boutique de produits, administration. Démonstration : `/demo/barbier/` (administration : `/demo/barbier/admin/`, code dans `config.js`).

## Fichiers
| Fichier | Rôle |
|---|---|
| `config.js` | Nom, adresse, téléphone, code d'accès admin, relais d'e-mails. À adapter par client. |
| `store.js` | Toutes les règles : créneaux, prix, abonnement, fidélité, stock, e-mails, `.ics`. Données dans `localStorage`. |
| `site.js`, `index.html` | Site public. |
| `admin/` | Administration : interrupteurs (rendez-vous, carte, e-mails), rendez-vous, horaires, prestations, produits, abonnés, clients, e-mails. |
| `barber.css` | Style (typographies Oswald et Archivo auto-hébergées). |

## Ce qui est réel et ce qui est simulé
- Simulé dans la démonstration : le paiement par carte (aucune carte demandée), l'envoi d'e-mails (journal dans l'onglet E-mails), le stockage (navigateur du visiteur : site et admin partagent les données seulement sur le même appareil).
- Pour un vrai salon : (1) remplacer `load()`/`save()` de `store.js` par Firestore (comme `assets/qt-cloud.js`) avec règles de sécurité et connexion Google pour l'admin à la place du code ; (2) paiement carte par Stripe (liens ou Checkout + webhook qui marque le rendez-vous « payé ») ; (3) e-mails via `formEndpoint` (relais type Cloudflare Worker + service d'envoi).
- Règles métier : la Nᵉ coupe est offerte (coupes terminées, hors abonnement) ; abonnement = X coupes par semaine pendant Y semaines, seulement sur les prestations « coupe ».

## Nouveau client
Copier le dossier, adapter `config.js`, les couleurs (`:root` de `barber.css`), les textes de `index.html`, puis régler prix et horaires dans l'administration.
