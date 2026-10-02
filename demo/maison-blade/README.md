# Modèle « Barbier de luxe » (Maison Blade)

Direction artistique « Quiet Luxury » : noir mat, anthracite, bronze et champagne, titres en Cormorant (serif éditorial), texte en DM Sans espacé. Page unique : rituel d'entrée, manifeste, rituels (cartes en verre discret), galerie avec zoom et visionneuse, barbiers, réservation en trois choix, lieu. Démonstration : `/demo/maison-blade/`.

## Fonctions (démo complète à montrer aux prospects)
Réservation en 3 choix (rituel, barbier, créneau) + produits facultatifs, paiement carte à l'avance (simulé) ou au salon, abonnement (« Privilège »), carte de fidélité (« le Cercle » : la Nᵉ coupe offerte), boutique (« l'Officine »), e-mails de confirmation, annulation, rappel (simulés). ****Espace client** (`compte/`) : création de compte et connexion, prochain rendez-vous, annulation gratuite jusqu'à 24 h avant, ajout à l'agenda, historique avec « Réserver à nouveau », carte de fidélité, abonnement (souscription et suivi), profil (coordonnées, mot de passe, e-mails, suppression du compte) ; coordonnées préremplies à la réservation. Compte de démonstration : `karim@exemple.fr` / `demo`. Boutons de démonstration « Vue client » et « Vue admin » (accès sans identifiant via `?demo`) : à retirer avant livraison à un client. **Administration** (`admin/`, code dans `config.js`) : trois interrupteurs (rendez-vous, carte, e-mails), rendez-vous par barbier, horaires, rituels, barbiers (et ce qu'ils réalisent), produits et stock, abonnés, clients, e-mails.

## Fichiers
| Fichier | Rôle |
|---|---|
| `config.js` | Nom, adresse, téléphone, code d'accès admin, relais d'e-mails. |
| `store.js` | Toutes les règles et les données de départ (créneaux par barbier, prix, abonnement, fidélité, stock, e-mails). Données dans `localStorage`. |
| `index.html`, `luxe.js` | Site public (classes Tailwind, galerie, animations, réservation). |
| `compte/` | Espace client (`index.html`, `compte.js`). |
| `admin/` | Administration (`index.html`, `admin.js`, `admin.css`). |
| `src/input.css`, `tailwind.config.js`, `luxe.css` | Jetons de marque, composants, CSS compilé (à régénérer après chaque changement de classes, y compris dans `admin/`). |

## Compiler le CSS
```
npm i -D tailwindcss@3
npx tailwindcss -c tailwind.config.js -i src/input.css -o luxe.css --minify
```
Aucune ressource externe : polices auto-hébergées (`assets/fonts/ex/`), pas de CDN, pas de cookie.

## Adapter pour un client
1. Nom, adresse, textes : `config.js` et `index.html`. Couleurs : `tailwind.config.js` (`bronze`, `champagne`, `ink`…) puis recompiler.
2. Rituels, barbiers, produits, prix, horaires, abonnement, fidélité : valeurs de départ dans `seed()` de `store.js`, modifiables ensuite dans l'administration.
3. Photos : dans la galerie (`PLATES` de `luxe.js`), remplacer le décor par `<img class="h-full w-full object-cover" src alt>` : zoom, squelette de chargement et visionneuse fonctionnent tels quels.

## Réel / simulé
Démonstration : le paiement carte (aucune carte demandée), les e-mails (journal dans l'onglet E-mails) et le stockage (navigateur du visiteur, site et administration partagent les données sur le même appareil) sont simulés. Les comptes sont simulés (mot de passe haché dans le navigateur). Pour un vrai salon : connexion Google ou e-mail côté serveur, base Firestore à la place de `load()`/`save()` avec connexion Google pour l'administration, paiement par Stripe (lien ou Checkout + webhook), e-mails via `formEndpoint`.
