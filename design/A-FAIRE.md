# À faire — site QuenTools

État au 1er octobre 2026. Les cases cochées sont faites.

## À faire par le propriétaire (par ordre de priorité)
- [ ] **E-mail public** : créer `contact@quentools.fr` (redirection OVH vers la boîte personnelle), puis le communiquer pour l'afficher sur le site.
- [ ] **Règles Firebase** : `/admin/`, onglet Règles, copier et publier dans Firebase (espace client, contacts, e-book). Sans cela, ni l'espace client ni l'enregistrement des contacts ne fonctionnent.
- [ ] **Systeme.io** : compte gratuit, entonnoir d'inscription à l'e-book (consentement : nouvelles et offres, dont la future formation), PDF `QuenTools-ebook-debuter-avec-Claude.pdf` envoyé par e-mail automatique, tag « ebook » ; communiquer l'adresse de la page d'inscription (réglage `ebookUrl`).
- [ ] **Tests réels** : demande de devis puis `/espace/` avec un second compte Google ; inscription à l'e-book ; connexion du propriétaire sur `/espace/` (redirigée vers `/admin/`).
- [ ] **Google Search Console** : ajouter `quentools.fr` (ligne TXT dans la zone DNS OVH) et envoyer `sitemap.xml`.
- [ ] Vérifier « Enforce HTTPS » dans GitHub, Pages.
- [ ] Ouvrir Infikit, Freelance Kit et Gourmet AI sur téléphone (mise en forme dépendante de bibliothèques externes).
- [ ] Relecture juridique des mentions légales et de confidentialité ; statut micro-entreprise pour facturer.
- [ ] Chiffres réels de Wouf et premier client (avec accord écrit) pour l'étude de cas.
- [ ] Décider : mention de l'IA sur le site ; niveau des prix de départ (`design/TARIFS.md`).
- [ ] Marketing : bio TikTok, publier la vidéo avant / après avec le son tendance (si disponible sur le compte), tournage des vidéos (`marketing/quentools/VIDEOS.md`), prospection.
- [ ] Facultatif : `www.quentools.fr` (CNAME bloqué par une ligne TXT OVH ; ticket au support).

## À faire côté développement (sur demande)
- [ ] Après bascule vers Systeme.io : renseigner `ebookUrl`, retirer `ebook-source`, le bouton « Publier l'e-book » et la règle `qt_ebook` ; ajouter Systeme.io aux mentions de confidentialité.
- [ ] Afficher l'e-mail public sur l'accueil et le devis.
- [ ] Remplacer Tailwind et Alpine chargés depuis un CDN par des fichiers hébergés (Infikit, Freelance Kit, Gourmet AI), avec vérification visuelle.
- [ ] Firebase App Check (anti-spam du formulaire de devis).
- [ ] Notifications par e-mail des nouvelles demandes et messages (relais d'envoi).
- [ ] Messages de prospection par métier ; fiches Fiverr alignées sur les trois offres ; e-mails types (accueil, e-book, annonce de la formation).

## Fait
- [x] Domaine `quentools.fr`, adresses canoniques, plan du site, robots.txt, données structurées.
- [x] Trois offres sur devis, carrousel d'exemples, page Outils, bandeau e-book, en-tête adapté aux petits écrans.
- [x] Espace client, administration enrichie (suivi, échanges, indicateurs, contacts), inscription à l'e-book.
- [x] Contrôle automatique du site avant publication ; plan de lancement et scripts vidéo (`marketing/quentools/`).
- [x] 11 pages de référencement par métier (`/creation-site/`) ; vidéo « avant / après » (`marketing/quentools/video-avant-apres.js`, exemple au choix).
