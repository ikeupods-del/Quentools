# À faire — site QuenTools

État au 1er octobre 2026. Les cases cochées sont faites.

## À faire par le propriétaire (par ordre de priorité)
- [ ] **Règles Firebase** : `/admin/`, onglet Règles, copier et publier dans Firebase (espace client, contacts). Sans cela, ni l'espace client ni l'enregistrement des contacts ne fonctionnent.
- [ ] **Tests réels** : demande de devis puis `/espace/` avec un second compte Google  ; connexion du propriétaire sur `/espace/` (redirigée vers `/admin/`).
- [ ] **Google Search Console** : ajouter `quentools.fr` (ligne TXT dans la zone DNS OVH) et envoyer `sitemap.xml`.
- [ ] Vérifier « Enforce HTTPS » dans GitHub, Pages.
- [ ] Ouvrir Infikit, Freelance Kit et Gourmet AI sur téléphone (mise en forme dépendante de bibliothèques externes).
- [ ] Relecture juridique des mentions légales et de confidentialité ; statut micro-entreprise pour facturer.
- [ ] Chiffres réels de Wouf et premier client (avec accord écrit) pour l'étude de cas.
- [ ] Décider : mention de l'IA sur le site ; niveau des prix de départ (`design/TARIFS.md`).
- [ ] Marketing : bio TikTok, publier la vidéo avant / après avec le son tendance (si disponible sur le compte), tournage des vidéos (`marketing/quentools/VIDEOS.md`), prospection.
- [ ] Facultatif : `www.quentools.fr` (CNAME bloqué par une ligne TXT OVH ; ticket au support).

- [ ] **Sauvegarde** : lancer chaque semaine `sh tools/sauvegarde-depot.sh` et le bouton « Télécharger la sauvegarde » de l'administration (voir `design/SAUVEGARDE.md`) ; double authentification sur tous les comptes.
- [ ] **Infikit Pro** : publier les règles Firestore, coller le lien Stripe, relecture juridique (voir `design/INFIKIT-PRO.md`).

## À faire côté développement (sur demande)
- [ ] Remplacer Tailwind et Alpine chargés depuis un CDN par des fichiers hébergés (Infikit, Freelance Kit, Gourmet AI), avec vérification visuelle.
- [ ] Firebase App Check (anti-spam du formulaire de devis).
- [ ] Notifications par e-mail des nouvelles demandes et messages (relais d'envoi).
- [ ] Messages de prospection par métier ; fiches Fiverr alignées sur les trois offres ; e-mails types (accueil, annonce de la formation).

## Fait
- [x] E-mail public `contact.quentools@gmail.com` affiché sur le site (accueil, mentions, données structurées) ; une adresse `@quentools.fr` pourra le remplacer plus tard.
- [x] Domaine `quentools.fr`, adresses canoniques, plan du site, robots.txt, données structurées.
- [x] Trois offres sur devis, carrousel d'exemples, page Outils, en-tête adapté aux petits écrans.
- [x] Espace client, administration enrichie (suivi, échanges, indicateurs, contacts).
- [x] Contrôle automatique du site avant publication ; plan de lancement et scripts vidéo (`marketing/quentools/`).
- [x] 11 pages de référencement par métier (`/creation-site/`) ; vidéo « avant / après » (`marketing/quentools/video-avant-apres.js`, exemple au choix).

- [x] Micro-entreprise : formalité déposée et validée par l'INSEE le 01/10/2026 (entrepreneur individuel, SIREN 912026713, domiciliation, franchise de TVA). Mentions légales du site mises à jour. À faire : vérifier la radiation de l'ancienne activité, relever le SIRET sur l'avis de situation Sirene, faire relire les mentions légales par un professionnel.
