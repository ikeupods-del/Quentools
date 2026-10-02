# Espace client et administration

## Principe
- Le client se connecte avec Google sur `/espace/` : il voit les demandes de devis dont l'adresse e-mail correspond à celle de son compte Google (champ `emailLower`, ajouté par le formulaire de devis).
- Il suit l'avancement (reçue, en discussion, devis envoyé, accepté, en cours, livré), consulte le montant et le lien du devis, échange par messages et peut accepter ou refuser le devis.
- L'administration (`/admin/`) ajoute : lien du devis, échéance et note privée (collection `qt_notes`, jamais visible du client), échanges avec le client, réponses types, indicateurs (messages à lire, devis à relancer après 7 jours, demandes sans réponse depuis 48 h).

## Données
- `qt_devis/{id}` : demande et suivi (statut, montant, lien, réponse du client).
- `qt_devis/{id}/messages/{mid}` : messages (`from` : `client`, `admin` ou `systeme`).
- `qt_notes/{id}` : note privée et échéance, propriétaire seul.

## Mise en service (une seule fois)
1. Ouvrir `/admin/`, onglet **Règles**, copier les règles.
2. Firebase, Firestore, Règles : remplacer les blocs `qt_admin` / `qt_devis` existants par ceux-ci (garder les règles des autres applications), puis publier.
3. Tester : faire une demande de devis depuis un second compte Google, se connecter sur `/espace/` avec cette adresse.

Tant que les règles ne sont pas mises à jour, le formulaire de devis continue de fonctionner (repli sans `emailLower`) ; l'espace client affiche « Espace en préparation » et l'administration signale les règles à mettre à jour.

## Limites
- Aucun e-mail automatique : le propriétaire est averti dans l'administration (badge « nouveau message »), le client doit revenir sur l'espace. Un relais d'e-mails pourra être ajouté plus tard.
- Pas de dépôt de fichiers : le devis et les fichiers passent par un lien (Drive, PDF en ligne).
- Les demandes antérieures à cette mise en service n'ont pas d'`emailLower` et n'apparaissent pas côté client.

