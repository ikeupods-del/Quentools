# Infikit : guide d'utilisation

Infikit organise la tournée d'une infirmière libérale : patients, ordonnances, visites, cotations et comptabilité. Elle fonctionne dans le navigateur, sans compte, et s'installe sur l'écran d'accueil du téléphone.

Adresse : https://quentools.fr/infikit/

## Installer sur le téléphone

- **iPhone** : ouvrez le lien dans Safari, touchez le bouton Partager, puis « Sur l'écran d'accueil ».
- **Android** : ouvrez le lien dans Chrome, touchez les trois points, puis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).

Une fois installée, l'application s'ouvre même sans réseau, pendant la tournée.

## Premiers pas

1. À l'ouverture, indiquez votre pays (France ou Belgique) et votre prénom.
2. Choisissez :
   - **Découvrir avec des patients fictifs** pour essayer avec des données d'exemple (vous pourrez les effacer ensuite, dans Réglages → Données) ;
   - **Commencer avec une tournée vide** pour saisir vos vrais patients.
3. Ajoutez votre premier patient avec le bouton « + Patient » : nom, adresse, médecin.
4. Joignez son ordonnance (photo ou PDF). L'application vous prévient avant sa fin.
5. Faites une sauvegarde (Réglages → Sauvegarde), pour ne pas perdre vos données.

## Le jour de la tournée

- **Tournée** : les visites du jour, dans l'ordre. Touchez « Démarrer ma tournée », puis une visite pour la noter (actes, constantes, transmission).
- **Itinéraire** : Google Maps ou Waze enchaîne les visites restantes.
- **+ Visite ponctuelle** : ajoute une visite non prévue.
- **Optimiser l'ordre** : réordonne les visites pour réduire le trajet.

## Patients et urgences

- Fiche patient : coordonnées, plan de soins, constantes, transmissions, dernières visites.
- **Fiche d'urgence** : allergies, antécédents, traitements et personne à prévenir, prêts à lire aux secours.
- Un patient n'est jamais supprimé d'un coup : utilisez « Archiver ».

## Cotations et comptabilité

- **Cotation** : calcule les actes, majorations et déplacements d'après les tarifs enregistrés (NGAP en France, INAMI en Belgique). Vérifiez les tarifs dans Réglages → Tarifs.
- **Compta** : recettes, charges et répartition par mois, avec export CSV.

Les montants sont des calculs d'aide. Vérifiez-les avant de facturer, et pour la télétransmission, utilisez le logiciel agréé que vous employez déjà.

## Sauvegarde et code d'accès

**La sauvegarde est chiffrée.** Vous choisissez un mot de passe. Sans lui, la sauvegarde ne peut pas être lue, et personne (pas même QuenTools) ne peut la récupérer pour vous.

- **Sauvegarder** crée un fichier chiffré : vous choisissez où le ranger (Google Drive, iCloud, e-mail…).
- **Restaurer** : sur un nouveau téléphone, ouvrez l'application et choisissez « Restaurer ma sauvegarde ».
- Un **code d'accès** (Réglages → Sécurité) demande un code à chaque ouverture.

**Conseil** : notez votre mot de passe de sauvegarde dans un endroit sûr, distinct de votre téléphone.

## Où sont mes données ?

- **Sur votre téléphone**, dans le navigateur qui fait tourner l'application. C'est le seul endroit où elles sont toujours.
- **Dans la sauvegarde** : un fichier chiffré que vous rangez où vous voulez.
- **Dans la synchronisation Google** (facultative, à activer dans Réglages → Synchronisation) : les données chiffrées avec votre phrase secrète sont stockées sur l'infrastructure Google Firebase du projet QuenTools. QuenTools ne peut pas les lire, mais elle en assure l'hébergement. À n'activer qu'après la relecture juridique indiquée dans le guide de l'éditeur.
- **Dans la synchronisation GitHub** (facultative) : un fichier chiffré est créé dans votre propre compte GitHub.

## Limites

- Infikit est un outil d'organisation. Ce n'est pas un dispositif médical, et elle ne remplace ni votre jugement professionnel ni les consignes de votre médecin.
- En cas d'urgence, appelez le 15 (ou le 112).
- Les textes sur les tarifs et la réglementation sont à vérifier régulièrement : ils changent.

## Pour l'éditeur

- Code : `infikit/index.html` (une seule page), réglages de connexion : `infikit/config.js`.
- Publication : sur la branche principale, par le workflow de publication GitHub Pages.
- Données de santé : avant d'ouvrir la synchronisation Google à de vrais patients, faire relire par un professionnel (juriste ou délégué à la protection des données) l'hébergement sur Firebase. Pour un hébergement de données de santé pour le compte de tiers, la certification HDS est exigée : voir la liste officielle des hébergeurs certifiés sur esante.gouv.fr.
- Après une modification : ouvrir `https://quentools.fr/infikit/` sur téléphone et vérifier la tournée, la création d'un patient et la sauvegarde.
