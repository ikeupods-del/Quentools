# Garde d'accès et relances de paiement (sites clients)

Objectif : un site livré à un client reste accessible tant que le solde est réglé ; à défaut de paiement complet après la date limite, il affiche « Ce site est momentanément indisponible », puis se rouvre dès l'encaissement.

## Côté administration (`admin/` → Gestion → Sites clients)
1. **Ajouter un site client** : nom, e-mail, identifiant du site (ex. `boulangerie-martin`), montant total, date du solde attendu, jours de grâce (15 par défaut). On peut reprendre une demande de devis (nom, e-mail et montant du devis publié sont remplis).
2. **Encaisser un paiement** à chaque règlement (acompte, solde). Quand le total est réglé, le site est déverrouillé.
3. **Verrouillage** : automatique après `échéance + jours de grâce` ; ou **Suspendre maintenant** ; **Rétablir l'accès** demande une date (le site se reverrouille ensuite s'il n'est toujours pas payé).
4. **Relancer** : trois niveaux de messages prêts à envoyer (rappel amical, relance, dernier avis avant suspension) plus un message avant l'échéance. Le niveau conseillé dépend du retard. Envoi par e-mail, dans l'espace client ou copie du texte ; « Marquer comme envoyée » note la relance et crée un rappel dans l'agenda à 7 jours. Le champ « Comment vous payer » (Réglages du site → Vos informations sur les devis) est repris dans chaque message.
5. Un site en retard apparaît en tête de liste, avec un badge dans le menu et dans la page Demandes.

## Côté site client
Ajouter avant `</body>` (déjà présent, avec un identifiant à remplacer, dans les modèles de `design/templates/`) :
```html
<script src="https://quentools.fr/assets/qt-config.js"></script>
<script src="https://quentools.fr/assets/qt-garde.js" data-site="identifiant-du-site" defer></script>
```
Le bouton « Code du site » de l'administration donne ce code avec le bon identifiant.

## Ce que lit le site client
Le champ public `acces` de `qt_admin/config` (déjà lisible par tous, modifiable par le seul propriétaire : aucune règle Firestore à ajouter), par exemple `{"boulangerie-martin":{"u":"2026-11-15"},"autre":{"b":1}}`. `b` : suspendu maintenant ; `u` : suspendu après cette date. **Aucun montant, aucun nom de client** n'y figure ; les paiements restent dans `qt_notes/_clients` (privé).

## Limites (à dire clairement)
- **Verrou côté navigateur.** Il arrête un visiteur ordinaire (la page est recouverte et le contenu rendu inerte), mais quelqu'un qui désactive JavaScript ou bloque le script voit encore le site. Pour un verrou absolu, retirer la publication du site à l'hébergement.
- **En cas de panne ou de hors-connexion, le site reste ouvert** : une panne ne doit jamais bloquer un client à jour.
- **Cadre juridique** : suspendre un site livré doit être prévu dans les conditions du devis accepté. L'administration affiche un avertissement et propose d'ajouter une clause (`CLAUSE` dans `admin/index.html`, ajoutée aussi aux conditions par défaut). **Faire relire cette clause et les messages de relance par un professionnel du droit** : ils ne remplacent pas une mise en demeure formelle ni un avis juridique.
