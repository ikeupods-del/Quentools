// QuentMovie : packs de montage (comme les packs vendus pour Premiere Pro). Un pack réunit des transitions, des titres animés,
// des calques de coupe (flash, glitch…), des bruitages de transition et un look : tout est créé pour QuentMovie, libre de droits.
// Les identifiants renvoient aux listes de effects.js (transitions, reportage) et de bibliotheque/index.json (calques, sons, luts).
'use strict';

const PACKS = [
  { id: 'cinema', nom: 'Pack Cinéma', couleur: '#c9a45c', desc: 'Raccords de film : fondus profonds, volets, iris et impacts. Titres de film avec bandes noires.',
    transitions: ['fondufloute', 'diagdoux', 'irisdoux', 'fadeblack', 'circleopen'], dur: 0.8,
    titres: ['cine-titre', 'chapitre', 'citation', 'generique'], calques: ['tr-fuite-doree', 'tr-anamorphique', 'tr-flash-chaud'], sons: ['tr-cinema', 'tr-whoosh-long'], look: 'luts/cine-teal-orange.cube' },
  { id: 'reseaux', nom: 'Pack Réseaux sociaux', couleur: '#ff2d55', desc: 'Coupes rapides et nerveuses pour TikTok, Reels et Shorts. Pseudo, étiquettes et tiers inférieurs.',
    transitions: ['whipg', 'whipd', 'whiph', 'zoompunch', 'slideleft'], dur: 0.35,
    titres: ['angle', 'pseudo', 'etiquette', 'minimal'], calques: ['tr-flash', 'tr-onde'], sons: ['tr-pop', 'tr-whoosh-long'], look: '' },
  { id: 'glitch', nom: 'Pack Glitch', couleur: '#00e5ff', desc: 'Image qui saute, pixels, parasites télé et retour en arrière : l’ambiance numérique.',
    transitions: ['glitch', 'pixelize', 'squeezeh'], dur: 0.5,
    titres: ['glitch-titre', 'flash'], calques: ['tr-tracking'], sons: ['tr-glitch', 'tr-rewind'], look: 'luts/cyberpunk.cube' },
  { id: 'impact', nom: 'Pack Impact', couleur: '#ff3b30', desc: 'Pour le sport, le hype et les teasers : ondes de choc, rayons, grosses frappes sonores.',
    transitions: ['secousse', 'zoompunch', 'whipg'], dur: 0.4,
    titres: ['impact-titre', 'compte', 'etiquette'], calques: ['tr-onde', 'tr-rayons', 'tr-flash'], sons: ['tr-choc', 'tr-whoosh-long'], look: 'luts/blockbuster.cube' },
  { id: 'journal', nom: 'Pack Journal télé', couleur: '#1f4fff', desc: 'Habillage d’information : double barre, bandeaux, lieu et date, flash info.',
    transitions: ['wipeleft', 'slideleft', 'fade'], dur: 0.5,
    titres: ['double', 'tiers', 'lieu', 'tv', 'flash'], calques: ['tr-flash-bleu'], sons: ['tr-ding', 'tr-pop'], look: '' },
  { id: 'doux', nom: 'Pack Doux et lifestyle', couleur: '#e8c9a0', desc: 'Fondus tendres, lumière dorée et titres dans un cadre fin : vlogs, voyages, mariages.',
    transitions: ['fondufloute', 'fade', 'dissolve', 'smoothleft'], dur: 0.9,
    titres: ['cadre-titre', 'souligne', 'minimal'], calques: ['tr-fuite-rose', 'tr-fuite-doree'], sons: ['tr-ding', 'tr-obturateur'], look: 'luts/pastel-reveur.cube' }
];

module.exports = { PACKS };
