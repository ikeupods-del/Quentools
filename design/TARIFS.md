# QuenTools — tarifs, estimations et réponses types

Mémo commercial à relire avant un devis (évite de tout recalculer). Estimations indicatives, freelance France ≈ 400–600 €/jour.

## Ce que coûterait Wouf (référence de projet complet)
| Partie | Jours | Coût freelance |
|---|---|---|
| Application (carnet, rappels, hors connexion, compte Google, synchro chiffrée, GPS, météo, vétérinaires, croquettes) | 50–70 | 20 000–42 000 € |
| Paiements (PayPal/Stripe), abonnement, administration, relais serveur | 15–20 | 6 000–12 000 € |
| Contenu (110 leçons, quiz, e-books, textes légaux) | 30–40 | 12 000–24 000 € |
| Design, tests, mise en ligne | 10–15 | 4 000–9 000 € |
| **Total** | **105–145** | **≈ 40 000–85 000 €** (agence : 80 000–150 000 €) |

## Grille à proposer aux clients (QuenTools)
Voir `design/OFFRES.md` (formules du site et services Fiverr, validées par le propriétaire). Positionnement : le marché des boutiques Shopify démarre vers 75 € sur Fiverr ; QuenTools vend le français, le suivi et le sur mesure plutôt que le prix seul.

| Offre | Départ | Mensuel | Contenu |
|---|---|---|---|
| Essentiel | 200 € | 15 € | 1 page, contact, mise en ligne |
| Pro | 400 € | 25 € | 4-5 pages, formulaire de devis, 1 modification par mois |
| Boutique Shopify | 250 € | 20 € | jusqu'à 20 produits, pages légales, paiement (abonnement Shopify à la charge du client) |
| Outil sur mesure | dès 1 000 € | 30-50 € | calcul de devis, suivi, réservation |
| Application « type Wouf » | 3 000-6 000 € | 50-150 € | comptes, fiches, rappels, installable |
| + Paiements et administration | +500-1 500 € | | PayPal et/ou Stripe, relais Cloudflare |

Règles : devis gratuit, prix fixé avant de commencer, première version montrée avant engagement sur la suite, acompte 30 à 50 %, engagement de 12 mois sur le mensuel. Noter le temps réellement passé sur les premières commandes et ajuster. Micro-entreprise obligatoire pour facturer. Hébergement gratuit sur GitHub Pages : code public, donc pas pour des données sensibles.

## Réponses types
- **« C'est fait avec l'IA ? »** Oui, assumé : outils modernes + tests automatiques = plus rapide et moins cher qu'une agence, même niveau d'exigence (Wouf : 6 700+ vérifications, 53 scénarios de test). Un développeur expérimenté le soupçonnerait (volume produit en peu de temps, style très uniforme, architecture sans outils de compilation) ; la qualité ne trahit pas un amateur.
- **Sécurité** : pas de clé secrète dans le code, paiements vérifiés côté serveur, textes utilisateurs échappés, règles Firestore. Limite des apps web : le contenu payant téléchargé sur l'appareil peut être débloqué par un utilisateur très technique ; pour l'empêcher, servir le contenu payant depuis un serveur (plus cher).
