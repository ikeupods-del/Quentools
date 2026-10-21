// Projet de démonstration (sans voix, temps estimés) : la crise de 2008 en quatre étapes.
// Sert à la prévisualisation dans Remotion Studio et au rendu d'essai `npm run demo`.
import { projetEstime } from '../services/timing';
import type { Script } from '../types/projet';

export const SCRIPT_DEMO: Script = {
  titre: 'La crise de 2008 en bâtons',
  accroche: 'Comment une maison a-t-elle fait trembler le monde ?',
  personnage: { nom: 'Bob', role: 'plombier qui rêve d’une maison' },
  actes: [
    {
      id: 'acte-1',
      etape: 'Étape 1 : Le prêt',
      scenes: [
        {
          id: 's1',
          narration: 'Voici Bob. Bob est plombier, et Bob rêve d’une maison.',
          metaphore: 'Un rêve simple : quatre murs et un toit.',
          visuel: { type: 'personnages', acteurs: [{ id: 'bob', genre: 'personne', nom: 'Bob', humeur: 'joie' }], bulle: 'Un jour, j’aurai ma maison !' },
          motCle: null,
        },
        {
          id: 's2',
          narration: 'En 2003, l’argent ne coûte presque rien : le taux de la banque centrale tombe à 1 %. Alors la banque prête à Bob.',
          metaphore: 'L’argent est en solde.',
          visuel: {
            type: 'flux',
            acteurs: [
              { id: 'banque', genre: 'banque', nom: 'La banque', humeur: 'neutre' },
              { id: 'bob', genre: 'personne', nom: 'Bob', humeur: 'joie' },
            ],
            flux: [{ de: 'banque', vers: 'bob', objet: 'sac', libelle: 'prêt', motDeclencheur: 'prête' }],
          },
          motCle: { texte: '1 %', ton: 'gain', motDeclencheur: '1' },
        },
      ],
    },
    {
      id: 'acte-2',
      etape: 'Étape 2 : Le paquet',
      scenes: [
        {
          id: 's3',
          narration: 'La banque ne garde pas le prêt. Elle le met dans un paquet avec des milliers d’autres, des bons et des fragiles.',
          metaphore: 'Un panier de pommes où quelques pommes sont déjà pourries.',
          visuel: {
            type: 'empilement',
            titre: 'Le paquet de prêts',
            briques: [
              { libelle: 'Prêt solide', risque: 'sain' },
              { libelle: 'Prêt solide', risque: 'sain' },
              { libelle: 'Prêt fragile', risque: 'douteux' },
              { libelle: 'Prêt de Bob', risque: 'toxique' },
              { libelle: 'Prêt fragile', risque: 'toxique' },
            ],
            note: 'Triple A',
            ecroulement: null,
          },
          motCle: null,
        },
        {
          id: 's4',
          narration: 'Une agence de notation regarde le paquet et lui donne la meilleure note : Triple A. Les investisseurs achètent.',
          metaphore: 'Un tampon « excellent » collé sur le panier sans regarder les pommes.',
          visuel: {
            type: 'flux',
            acteurs: [
              { id: 'agence', genre: 'agence', nom: 'L’agence', humeur: 'neutre' },
              { id: 'banque', genre: 'banque', nom: 'La banque', humeur: 'neutre' },
              { id: 'invest', genre: 'investisseur', nom: 'Investisseurs', humeur: 'joie' },
            ],
            flux: [
              { de: 'agence', vers: 'banque', objet: 'document', libelle: 'Triple A', motDeclencheur: 'note' },
              { de: 'banque', vers: 'invest', objet: 'paquet', libelle: 'le paquet', motDeclencheur: 'achètent' },
              { de: 'invest', vers: 'banque', objet: 'billet', libelle: null, motDeclencheur: 'achètent' },
            ],
          },
          motCle: { texte: 'Triple A', ton: 'neutre', motDeclencheur: 'Triple' },
        },
      ],
    },
    {
      id: 'acte-3',
      etape: 'Étape 3 : La chute',
      scenes: [
        {
          id: 's5',
          narration: 'Les prix des maisons montent, montent, montent. Puis, en 2006, ils s’arrêtent et se mettent à baisser.',
          metaphore: 'Un ballon qu’on gonfle trop.',
          visuel: { type: 'courbe', titre: 'Prix des maisons', points: [100, 108, 117, 128, 141, 156, 172, 182, 176, 160, 138, 120], cassure: 7, unite: 'points', debut: '2000', fin: '2009' },
          motCle: null,
        },
        {
          id: 's6',
          narration: 'Les taux remontent, Bob ne peut plus payer. Comme lui, des millions de familles. Les briques pourries cèdent, et tout le paquet s’écroule.',
          metaphore: 'Le panier se renverse : on ne sait plus quelles pommes sont bonnes.',
          visuel: {
            type: 'empilement',
            titre: 'Le paquet de prêts',
            briques: [
              { libelle: 'Prêt solide', risque: 'sain' },
              { libelle: 'Prêt solide', risque: 'sain' },
              { libelle: 'Prêt fragile', risque: 'douteux' },
              { libelle: 'Prêt de Bob', risque: 'toxique' },
              { libelle: 'Prêt fragile', risque: 'toxique' },
            ],
            note: 'Triple A',
            ecroulement: 'cèdent',
          },
          motCle: null,
        },
      ],
    },
    {
      id: 'acte-4',
      etape: 'Étape 4 : Le sauvetage',
      scenes: [
        {
          id: 's7',
          narration: 'Le 15 septembre 2008, la banque Lehman Brothers fait faillite. La peur gagne toutes les banques du monde.',
          metaphore: 'Un domino qui fait tomber les autres.',
          visuel: {
            type: 'personnages',
            acteurs: [
              { id: 'invest', genre: 'investisseur', nom: 'Investisseurs', humeur: 'peur' },
              { id: 'banque', genre: 'banque', nom: 'Les banques', humeur: 'peur' },
              { id: 'bob', genre: 'personne', nom: 'Bob', humeur: 'triste' },
            ],
            bulle: 'Qui a les pommes pourries ?',
          },
          motCle: { texte: 'Faillite', ton: 'danger', motDeclencheur: 'faillite' },
        },
        {
          id: 's8',
          narration: 'Pour éviter le pire, l’État américain met sur la table 700 milliards de dollars.',
          metaphore: 'Les pompiers arrivent avec la plus grande lance du monde.',
          visuel: { type: 'chiffre', valeur: '700 milliards $', legende: 'le plan de sauvetage américain (octobre 2008)', ton: 'danger', motDeclencheur: '700' },
          motCle: null,
        },
      ],
    },
  ],
  sources: [
    'Réserve fédérale : taux directeur à 1 % de juin 2003 à juin 2004',
    'Indice Case-Shiller : sommet des prix immobiliers en 2006',
    'Faillite de Lehman Brothers le 15 septembre 2008',
    'Emergency Economic Stabilization Act (TARP) : 700 milliards de dollars, octobre 2008',
  ],
};

export const DEMO = projetEstime('demo-crise-2008', SCRIPT_DEMO);
