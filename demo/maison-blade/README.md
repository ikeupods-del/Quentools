# Modèle « Barbier de luxe » (Maison Blade)

Direction artistique « Quiet Luxury » : noir mat, anthracite, bronze et champagne, titres en Cormorant (serif éditorial), texte en DM Sans espacé. Page unique : rituel d'entrée, manifeste, rituels (cartes en verre discret), galerie avec zoom et visionneuse, barbiers, réservation en trois choix, lieu. Démonstration : `/demo/maison-blade/`.

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html` | Structure (classes Tailwind). |
| `luxe.js` | Contenu (`SERVICES`, `BARBERS`, `PLATES`), réservation, galerie, animations. Sans dépendance. |
| `src/input.css`, `tailwind.config.js` | Jetons de marque et composants (`.btn`, `.glass`, `.link`, `.sk` squelette, `.plate`, `.opt`, `.chip`…). |
| `luxe.css` | CSS compilé (à régénérer après chaque changement de classes). |

## Compiler le CSS
```
npm i -D tailwindcss@3
npx tailwindcss -c tailwind.config.js -i src/input.css -o luxe.css --minify
```
Aucune ressource externe : polices auto-hébergées (`assets/fonts/ex/`), pas de CDN, pas de cookie.

## Adapter pour un client
1. Nom, adresse, horaires : `index.html` (chercher « Maison Blade », « Paris »). Couleurs : `tailwind.config.js` (`bronze`, `champagne`, `ink`…).
2. Rituels, prix, barbiers : tableaux en tête de `luxe.js`. Horaires de réservation : fonction `slotsOf`.
3. Photos : dans la galerie, remplacer `<div class="art">…` par `<img class="h-full w-full object-cover" src alt>` (le zoom, le squelette de chargement et la visionneuse fonctionnent tels quels).

## Réel / simulé
Les disponibilités sont simulées et les rendez-vous gardés dans le navigateur (`localStorage`). Pour un vrai salon, brancher la réservation sur la base de données, l'administration, les e-mails et le paiement du modèle `../barbier/` (`store.js`, `admin/`), qui contient déjà ces règles (abonnement, fidélité, boutique).
