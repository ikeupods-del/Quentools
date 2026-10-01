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

## Inscription à l'e-book (contacts)
- Sur `/ebook/`, le guide est masqué tant que le visiteur ne s'est pas connecté avec Google (case de consentement obligatoire). Le contact est enregistré dans `qt_leads/{adresse}` (nom, e-mail, date, source, consentement) ; un drapeau local (`qt:ebook`) évite de redemander l'inscription au même appareil.
- L'onglet **Contacts** de `/admin/` liste les inscrits, copie les e-mails et exporte un CSV. Les règles à publier sont dans l'onglet **Règles** (bloc `qt_leads`).
- Le texte du guide n'est plus dans la page publiée : il est stocké dans Firebase (`qt_ebook/v1`, lisible seulement par une personne connectée) et chargé après l'inscription. La source reste dans `ebook-source/contenu.html` (non publiée sur le site, mais visible dans le dépôt GitHub public : le verrou protège contre le visiteur normal, pas contre quelqu'un qui fouille le dépôt).
- Mise en ligne ou mise à jour du guide : `/admin/`, onglet **Contacts**, bouton « Publier l'e-book » (copie `ebook-source/contenu.html` dans Firebase). Tant qu'il n'est pas publié, les inscrits voient « en cours de mise en ligne ».
- Le consentement mentionne les nouvelles et offres, dont la future formation : on peut donc écrire aux inscrits pour la lancer. Chaque envoi doit nommer l'expéditeur et contenir un lien de désinscription ; honorer immédiatement les désinscriptions. Aucun envoi d'e-mails automatique : exporter le CSV vers un outil d'envoi (avec lien de désinscription) pour les nouvelles. Les mentions de confidentialité de l'accueil sont à faire relire (contenu juridique indicatif).
