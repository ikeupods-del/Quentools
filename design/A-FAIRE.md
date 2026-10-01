# À faire — site QuenTools

Points en attente (état au 1er octobre 2026).

## En attente d'informations
- [ ] Adresse e-mail publique (ex. `contact@quentools.fr`, redirection OVH vers la boîte personnelle) : à renseigner dans `assets/qt-config.js` ou l'administration, puis afficher sur l'accueil et le devis.
- [ ] Chiffres réels de Wouf (utilisateurs, avis) pour l'étude de cas de `realisations/`.
- [ ] Prix de départ des offres : à revoir par rapport au marché (voir `design/TARIFS.md`) ; l'accueil affiche « Sur devis ».

## À décider
- [ ] Pages de référencement par métier (« création de site pour … »).
- [ ] Remplacer Tailwind et Alpine chargés depuis un CDN par des fichiers hébergés (Infikit, Freelance Kit, Gourmet AI), avec vérification visuelle.
- [ ] Firebase App Check sur le formulaire de devis.

## Actions de configuration
- [ ] Google Search Console : ajouter `quentools.fr` (vérification par ligne TXT dans la zone DNS OVH) et envoyer `sitemap.xml`.
- [ ] `www.quentools.fr` : enregistrement CNAME vers `ikeupods-del.github.io.` (bloqué par une ligne TXT d'OVH ; ticket au support si besoin).
