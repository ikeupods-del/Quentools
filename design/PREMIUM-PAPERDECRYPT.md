# Paperdecrypt Premium : mode d'emploi

## Ce qui est gratuit, ce qui est Premium
| | Gratuit (avec publicité) | Premium (paiement unique, sans publicité) |
|---|---|---|
| Courriers | Décodage illimité, HT/TTC, détection d'hameçonnage, lettres de réponse, rappels, mémoire des corrections | Idem |
| Calcul de TVA | Oui | Oui |
| Garanties et tickets | 3 achats | Illimité |
| Coffre de documents | 10 documents | Illimité |
| Abonnements | 3 | Illimité |
| État des lieux | 1 état des lieux d'entrée (photos datées et géolocalisées, PDF) | Sortie avec comparaison, autant de logements que voulu, **photos certifiées par un serveur** |
| Fiche de paie | Chiffres clés, explications ligne par ligne, heures supp repérées | **Vérification de tes heures supp**, lettre à l'employeur, suivi mois par mois |
| Lettres types | Amende, résiliation, échéancier | + CAF, impôts, remboursement, heures supplémentaires |
| Dossier en PDF | Non | Oui |

Les limites se règlent dans `decodeur-courrier.html` → `CONFIG` (`FREE_GARANTIES`, `FREE_COFFRE`, `FREE_ABOS`, `FREE_EDL`, `FREE_LETTRES`). Le prix affiché est `CONFIG.PREMIUM_PRIX`.

## Mettre en vente (à faire une seule fois)
1. Créer un **lien de paiement** (Stripe « Payment Link », ou PayPal) pour un paiement unique au prix choisi. Conseil de prix : entre 14,99 € et 24,99 € (la fonction « état des lieux de sortie + photos certifiées » vaut à elle seule une caution de plusieurs centaines d'euros).
2. Coller ce lien dans `CONFIG.PREMIUM_URL` et le prix dans `CONFIG.PREMIUM_PRIX` (`decodeur-courrier.html`). Tant que le lien est vide, le bouton « Débloquer Premium » est remplacé par « L'achat ouvre très bientôt ».
3. Publier les règles Firebase (administration → Règles de sécurité), qui contiennent le bloc `qt_premium`.
4. Autoriser `quentools.fr` dans Firebase Authentication (connexion Google).

## Après chaque paiement
1. Ouvrir l'administration → **Premium**.
2. Saisir l'adresse e-mail Google de l'acheteur (celle du paiement) → « Activer ». Le message de confirmation est copié : le coller dans un e-mail à l'acheteur.
3. L'acheteur ouvre Paperdecrypt, se connecte avec Google, appuie sur « Retrouver mon Premium » : Premium s'active sur tous ses appareils.

L'activation est manuelle (comme pour Wouf). Pour l'automatiser, il faudrait un relais de paiement (webhook Stripe) : à chiffrer à part.

## Sécurité
- Le droit Premium est lu dans `qt_premium/<e-mail>` : un client ne peut lire que sa propre fiche, seul l'administrateur peut écrire.
- Il est mémorisé 45 jours sur l'appareil (utilisation hors connexion) puis relu à la connexion.
- L'ancien système de codes a été retiré : il pouvait être falsifié en lisant le code de la page.
- Ne pas oublier : un acheteur qui change d'adresse e-mail Google perd son accès tant que vous n'avez pas activé la nouvelle.

## Suivi
Administration → Paperdecrypt : carte « Entonnoir Premium » (fenêtre Premium vue, clics sur « Débloquer », activations). Administration → Premium : liste des membres.

## Assistant IA obligatoire et lecture des fiches de paie
- **Assistant IA obligatoire** : lire une photo ou un PDF (courrier, fiche de paie, ticket) ouvre d'abord l'installation de l'assistant (téléchargement unique, environ 1 Go, sur l'appareil, rien n'est envoyé). Sans assistant, l'action est abandonnée. Si l'appareil ne sait pas le faire tourner (navigateur sans WebGPU) ou si l'installation échoue et que la personne choisit de continuer, la lecture classique prend le relais.
- **Fiche de paie** : lecture par colonnes, puis **recoupement** (`rcSolve`, `decodeur-courrier.html`) : chaque total est cherché parmi les montants réellement lus, choisi par son libellé voisin, et vérifié par les calculs de la fiche (brut − cotisations (+ remboursement) = net avant impôt ; net avant impôt − prélèvement = net à payer). Ensuite **l'assistant relit** la fiche : il confirme ou contredit chaque montant, et ne complète que ce que les calculs confirment. Chaque case de l'écran de validation dit d'où vient le chiffre. Un montant n'est jamais inventé : il doit figurer dans le texte lu.
- Contrôle : `node tools/essai-lecture-paie.js` (dont une vraie photo de fiche, noms et adresses retirés : `tools/fixtures/fiche-photo-janvier-2025.json`).

