# Naw Fruity : projet client (plateaux de fruits)

Trois propositions de design pour présenter à la cliente, sur une même base fonctionnelle. Page de présentation : `index.html` (à ouvrir en premier).

| Dossier | Rôle |
|---|---|
| `tropical/` · `atelier/` · `gourmand/` | Les trois propositions (HTML et `theme.css` : mise en page et style uniquement). |
| `shared/store.js` | Moteur : plateaux et options, calendrier et capacité par jour, commandes, acompte et solde, comptes clients, e-mails. Données dans `localStorage`. |
| `shared/app.js` | Interface commune : catalogue, personnalisation d'un plateau, panier, calendrier, commande en 3 étapes (date, informations, paiement). |
| `shared/art.js`, `base.css`, `themes.css` | Illustrations SVG des plateaux, composants, jetons des trois styles. |
| `compte/` | Espace client (reprend le style de la proposition visitée en dernier) : suivi, solde en ligne, annulation, reçu, « commander à nouveau », profil et allergies. |
| `admin/` | Administration : calendrier de charge, commandes, fiche de production, plateaux et options, paiements, clients, réglages (interrupteurs, acompte, délai, capacité, créneaux, zones de livraison), e-mails. Code : `config.js`. |

## Règles principales
- Capacité par jour en « unités » : petit plateau 1, moyen 2, grand 3, barquette 0,25 (modifiable jour par jour dans le calendrier d'administration).
- Délai minimum de commande (48 h par défaut), jours de fermeture hebdomadaires et dates fermées.
- Paiement : acompte (30 % par défaut), total par carte, ou à la remise (retrait). Le solde se règle à la remise ou en ligne depuis l'espace client.
- Annulation par le client gratuite jusqu'à 72 h avant ; l'acompte est alors à rembourser (suivi dans l'administration).
- La corbeille d'entreprise se commande sur devis.

## Démonstration : réel / simulé
Simulés : paiement par carte (aucune carte demandée), e-mails (journal dans l'administration), stockage (navigateur du visiteur). Boutons « Vue client » et « Vue admin » et barre « Proposition » : démonstration seulement.

## Pour la vraie mise en ligne
1. Garder **une** proposition : supprimer les deux autres dossiers, la barre de démonstration (`demoBar()` dans `shared/app.js`) et la page `index.html`.
2. Remplacer les illustrations par les photographies (`NFArt.svg` dans les cartes et les fenêtres).
3. Brancher : base de données (Firestore) à la place de `load()`/`save()`, paiement par Stripe (acompte puis solde, confirmé côté serveur), e-mails via `formEndpoint`, connexion Google ou e-mail pour l'administration et les clients (retirer `?demo` et le code d'accès).
4. Conditions de vente, politique d'annulation et d'allergènes : à faire relire par un professionnel.
