# Infikit Pro : mode payant

**Par défaut tout est gratuit.** Le mode payant s'active et se coupe dans l'administration (`admin/` → Gestion → **Infikit**), sans toucher au code.

## Fonctionnement
- Réglages publics : `qt_admin/infikit` → `paid` (mode payant), `freeLimit` (patients gratuits, 10 par défaut), `payUrl` (lien de paiement Stripe, `https://` obligatoire). L'application les lit au démarrage ; sans réseau, elle garde le dernier état connu.
- Quand le mode payant est actif, l'offre gratuite refuse l'ajout d'un patient au-delà de la limite, et réserve à Pro : transmissions, compta mensuelle, connexion de la sauvegarde en ligne. Les fiches et données existantes ne sont jamais supprimées ni masquées (hors onglet Compta, remplacé par une invitation), et l'export de sauvegarde en fichier reste libre.
- Abonnés : collection privée `qt_infikit_pro/{adresse Google en minuscules}` (champ facultatif `until` = date de fin). L'abonnée se vérifie depuis l'application (« J'ai déjà un abonnement », connexion Google) ; un abonné vérifié reste Pro 30 jours sans réseau.
- Règles Firestore : à recopier depuis l'onglet **Règles de sécurité** de l'administration (bloc `qt_infikit_pro` ajouté), puis à publier dans Firebase.

## Avant de passer en payant
1. Publier les nouvelles règles Firestore.
2. Créer le lien de paiement Stripe (abonnement 5 €/mois), le coller dans l'onglet Infikit, puis remplacer le `#` du bouton « S'abonner » de `infikit.html` (`data-infikit="pay"`).
3. Activation manuelle tant que Stripe n'est pas relié : après chaque paiement, ajouter l'adresse Google de l'abonnée dans l'onglet Infikit ; la retirer à la résiliation.
4. Relire la page de vente et les mentions légales (traitement de données de santé, sauvegarde en ligne via Google/Firebase, pas de « serveur Infikit » à affirmer) avec un professionnel du droit.
