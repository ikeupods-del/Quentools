// QuentMovie : packs de montage (comme les packs vendus pour Premiere Pro). Un pack réunit des transitions, des titres animés,
// des calques de coupe (flash, glitch…), des bruitages de transition et un look : tout est créé pour QuentMovie, libre de droits.
// Les identifiants renvoient aux listes de effects.js (transitions, reportage) et de bibliotheque/index.json (calques, sons, luts).
'use strict';

const PACKS = [
  { famille: 'Montage', id: 'cinema', fond: 'fonds/ville-nuit-h.jpg', nom: 'Pack Cinéma', couleur: '#c9a45c', desc: 'Raccords de film : fondus profonds, volets, iris et impacts. Titres de film avec bandes noires.',
    transitions: ['fondufloute', 'diagdoux', 'irisdoux', 'fadeblack', 'circleopen'], dur: 0.8,
    titres: ['cine-titre', 'chapitre', 'citation', 'generique'], calques: ['tr-fuite-doree', 'tr-anamorphique', 'tr-flash-chaud'], sons: ['tr-cinema', 'tr-whoosh-long'], look: 'luts/cine-teal-orange.cube' },
  { famille: 'Montage', id: 'reseaux', fond: 'fonds/degrade-neon-h.jpg', nom: 'Pack Réseaux sociaux', couleur: '#ff2d55', desc: 'Coupes rapides et nerveuses pour TikTok, Reels et Shorts. Pseudo, étiquettes et tiers inférieurs.',
    transitions: ['whipg', 'whipd', 'whiph', 'zoompunch', 'slideleft'], dur: 0.35,
    titres: ['angle', 'pseudo', 'etiquette', 'minimal'], calques: ['tr-flash', 'tr-onde'], sons: ['tr-pop', 'tr-whoosh-long'], look: '' },
  { famille: 'Montage', id: 'glitch', fond: 'fonds/synthwave-h.jpg', nom: 'Pack Glitch', couleur: '#00e5ff', desc: 'Image qui saute, pixels, parasites télé et retour en arrière : l’ambiance numérique.',
    transitions: ['glitch', 'pixelize', 'squeezeh'], dur: 0.5,
    titres: ['glitch-titre', 'flash'], calques: ['tr-tracking'], sons: ['tr-glitch', 'tr-rewind'], look: 'luts/cyberpunk.cube' },
  { famille: 'Montage', id: 'impact', fond: 'fonds/briques-h.jpg', nom: 'Pack Impact', couleur: '#ff3b30', desc: 'Pour le sport, le hype et les teasers : ondes de choc, rayons, grosses frappes sonores.',
    transitions: ['secousse', 'zoompunch', 'whipg'], dur: 0.4,
    titres: ['impact-titre', 'compte', 'etiquette'], calques: ['tr-onde', 'tr-rayons', 'tr-flash'], sons: ['tr-choc', 'tr-whoosh-long'], look: 'luts/blockbuster.cube' },
  { famille: 'Montage', id: 'journal', fond: 'fonds/plateau-info-h.jpg', nom: 'Pack Journal télé', couleur: '#1f4fff', desc: 'Habillage d’information : double barre, bandeaux, lieu et date, flash info.',
    transitions: ['wipeleft', 'slideleft', 'fade'], dur: 0.5,
    titres: ['double', 'tiers', 'lieu', 'tv', 'flash'], calques: ['tr-flash-bleu'], sons: ['tr-ding', 'tr-pop'], look: '' },
  { famille: 'Montage', id: 'doux', fond: 'fonds/pastel-h.jpg', nom: 'Pack Doux et lifestyle', couleur: '#e8c9a0', desc: 'Fondus tendres, lumière dorée et titres dans un cadre fin : vlogs, voyages, mariages.',
    transitions: ['fondufloute', 'fade', 'dissolve', 'smoothleft'], dur: 0.9,
    titres: ['cadre-titre', 'souligne', 'minimal'], calques: ['tr-fuite-rose', 'tr-fuite-doree'], sons: ['tr-ding', 'tr-obturateur'], look: 'luts/pastel-reveur.cube' },
  // ---- Famille Vlog : transitions douces, titres de vlog (jour, lieu, REC, chapitre), effets de lumière, sons légers, look et musique ----
  { famille: 'Vlog', id: 'vlog-voyage', fond: 'fonds/plage-h.jpg', nom: 'Vlog Voyage', couleur: '#ffb347', desc: 'Carnet de route : jours numérotés, nom des lieux, reflets de soleil doré et glissés doux.',
    transitions: ['glissedoux', 'zoomdoux', 'fondulumiere', 'fondufloute', 'whipg'], dur: 0.5,
    titres: ['jour', 'lieu-vlog', 'numero', 'rec'], calques: ['tr-soleil', 'tr-fuite-doree', 'tr-flash-chaud'], sons: ['vl-souffle', 'vl-pizz-gai', 'tr-whoosh-long'], look: 'luts/ete-dore.cube', musique: 'joyeux-vlog' },
  { famille: 'Vlog', id: 'vlog-quotidien', fond: 'fonds/bureau-flou-h.jpg', nom: 'Vlog du quotidien', couleur: '#e8a0b4', desc: 'Une journée comme elle vient : fondus tendres, chapitres numérotés, lumière rose, clics et pages qui tournent.',
    transitions: ['fondufloute', 'glissedoux', 'dissolve', 'smoothleft'], dur: 0.6,
    titres: ['numero', 'jour', 'etiquette', 'rec'], calques: ['tr-fuite-rose', 'tr-fuite-doree'], sons: ['vl-clic', 'vl-pizz-doux', 'vl-page'], look: 'luts/argentique-chaud.cube', musique: 'lofi-tranquille' },
  { famille: 'Vlog', id: 'vlog-food', fond: 'fonds/briques-h.jpg', nom: 'Vlog Food', couleur: '#ff7a3d', desc: 'Restaurants, recettes, marchés : zooms gourmands, lumière chaude, étiquettes de plats et cloche de service.',
    transitions: ['zoomdoux', 'glissedoux', 'fondulumiere', 'whipd'], dur: 0.45,
    titres: ['etiquette', 'angle', 'cadre-titre', 'numero'], calques: ['tr-fuite-chaude', 'tr-flash-chaud'], sons: ['vl-cloche', 'vl-pizz-gai', 'vl-souffle'], look: 'luts/gourmand.cube', musique: 'joyeux-vlog' },
  { famille: 'Vlog', id: 'vlog-sport', fond: 'fonds/espace-h.jpg', nom: 'Vlog Sport et énergie', couleur: '#2ee6a8', desc: 'Entraînements, défis, sorties : whip pans, zoom punch, ondes de choc et gros titres.',
    transitions: ['whipg', 'whipd', 'zoompunch', 'secousse'], dur: 0.35,
    titres: ['impact-titre', 'numero', 'compte', 'rec'], calques: ['tr-onde', 'tr-flash', 'tr-rayons'], sons: ['tr-choc', 'tr-whoosh-long', 'vl-clic'], look: 'luts/clair-lumineux.cube', musique: 'house-groove' },
  { famille: 'Vlog', id: 'vlog-nuit', fond: 'fonds/ville-nuit-h.jpg', nom: 'Vlog Ville de nuit', couleur: '#7a5cff', desc: 'Sorties, concerts, rues allumées : reflets anamorphiques bleus, glitch léger, néons et caméscope.',
    transitions: ['glitch', 'fondufloute', 'whipg', 'irisdoux'], dur: 0.5,
    titres: ['lieu-vlog', 'jour', 'glitch-titre', 'rec'], calques: ['tr-fuite-bleue', 'tr-anamorphique', 'tr-tracking'], sons: ['vl-souffle', 'tr-glitch', 'tr-ding'], look: 'luts/neon-nuit.cube', musique: 'synthwave-80' }
];

module.exports = { PACKS };
