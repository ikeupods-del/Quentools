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
| Offre | Prix d'un dev classique | Prix QuenTools conseillé | Contenu |
|---|---|---|---|
| Site vitrine | 1 500–4 000 € | 600–1 500 € | modèle `design/templates/vitrine.html`, domaine, mise en ligne |
| Outil sur mesure (calculateur, devis, suivi) | 3 000–8 000 € | 1 200–3 000 € | outil hors connexion, données sur l'appareil |
| Application « type Wouf » (version de départ : comptes, fiches, rappels, installable) | 8 000–15 000 € | 3 000–6 000 € | modèle `design/templates/outil.html` + système `assets/qt.css` |
| + Paiements et administration | +3 000–6 000 € | +2 000–4 000 € | PayPal et/ou Stripe, relais Cloudflare |
| Maintenance | 100–300 €/mois | 50–150 €/mois | mises à jour, sauvegardes, petites évolutions |

Règles : devis gratuit, prix fixé avant de commencer, première version montrée avant engagement sur la suite, facturer la valeur (temps gagné par le client), pas le temps passé. Acompte 30 à 50 %. Micro-entreprise obligatoire pour facturer.

## Réponses types
- **« C'est fait avec l'IA ? »** Oui, assumé : outils modernes + tests automatiques = plus rapide et moins cher qu'une agence, même niveau d'exigence (Wouf : 6 700+ vérifications, 53 scénarios de test). Un développeur expérimenté le soupçonnerait (volume produit en peu de temps, style très uniforme, architecture sans outils de compilation) ; la qualité ne trahit pas un amateur.
- **Sécurité** : pas de clé secrète dans le code, paiements vérifiés côté serveur, textes utilisateurs échappés, règles Firestore. Limite des apps web : le contenu payant téléchargé sur l'appareil peut être débloqué par un utilisateur très technique ; pour l'empêcher, servir le contenu payant depuis un serveur (plus cher).
