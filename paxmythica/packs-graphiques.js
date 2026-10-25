/* Pax Mythica — packs graphiques de la vue 3D : lumière (heure du jour), ciel, mer, couleurs du sol et des arbres, saison,
   brume, nuages et étalonnage de l'image (saturation, contraste, halo lumineux, effet maquette, vignette, grain).
   Un pack ne change que l'apparence ; il se choisit dans Réglages → Packs graphiques ou avec le bouton 🎨 du jeu.
   Ajouter un pack = une entrée ici (les essais vérifient que chaque pack se dessine). Qualité : PM.QUALITES. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  PM.PACKS_GRAPHIQUES = {
    olympe: {
      nom: 'Olympe doré', emoji: '🏛️', desc: 'Fin d’après-midi méditerranéenne, mer turquoise, couleurs franches. Le pack par défaut.',
      soleil: { dir: [-0.55, 0.62, 0.42], couleur: 0xffd9a8, force: 2.3 }, hemi: { ciel: 0xc8defa, sol: 0x5a4628, force: 0.55 }, exposition: 0.86,
      ciel: { haut: 0x4f86c6, horizon: 0xbfd6e6, bas: 0xe9dcc0, halo: 0xffd9a0 }, brume: 1,
      eau: { creux: [0.03, 0.16, 0.30], bas: [0.12, 0.58, 0.62], reflet: [1.0, 0.9, 0.72] },
      sol: { herbe: [88, 136, 50], foret: [48, 78, 34], sec: [146, 140, 70], sable: [214, 180, 120], roche: [122, 112, 100], neige: [244, 246, 250], fleurs: true },
      neige: { niveau: 78, partout: 0 }, arbres: { sapin: [0x2f5d2c, 0x3a6b33, 0x2a5228], feuillu: [0x4f8a36, 0x5c9440, 0x6a9a3c, 0x477d31], palmier: 0x5f8a3a },
      herbe: [0x6fa040, 0x7aac44, 0x5f9036], nuages: { opacite: 0.75, ombres: 0.5 },
      post: { saturation: 1.12, contraste: 1.06, chaud: [1.04, 1.0, 0.94], froid: [0.96, 1.0, 1.04], vignette: 0.32, bloom: 0.32, seuil: 0.82, maquette: 0.9, grain: 0.02 }
    },
    realiste: {
      nom: 'Réaliste', emoji: '📷', desc: 'Lumière de midi, couleurs naturelles et sobres, ombres franches, occlusion marquée.',
      soleil: { dir: [-0.35, 0.86, 0.3], couleur: 0xfff3e2, force: 2.6 }, hemi: { ciel: 0xd6e6f5, sol: 0x4c4434, force: 0.55 }, exposition: 0.95,
      ciel: { haut: 0x6c9ccc, horizon: 0xcad9e3, bas: 0xd8d8d0, halo: 0xfff4e0 }, brume: 1.3,
      eau: { creux: [0.03, 0.12, 0.2], bas: [0.16, 0.42, 0.46], reflet: [1, 0.97, 0.9] },
      sol: { herbe: [86, 112, 58], foret: [52, 70, 40], sec: [132, 126, 84], sable: [180, 160, 120], roche: [116, 112, 106], neige: [238, 240, 244], fleurs: false },
      neige: { niveau: 66, partout: 0 }, arbres: { sapin: [0x2c4a2c, 0x34532f, 0x283f26], feuillu: [0x46683a, 0x51733f, 0x5a7a40], palmier: 0x58743a },
      herbe: [0x5e7a3e, 0x6b8544, 0x55703a], nuages: { opacite: 0.65, ombres: 0.6 },
      post: { saturation: 0.92, contraste: 1.1, chaud: [1.0, 1.0, 0.98], froid: [0.98, 1.0, 1.02], vignette: 0.22, bloom: 0.15, seuil: 0.9, maquette: 0.35, grain: 0.025 }
    },
    fresque: {
      nom: 'Fresque peinte', emoji: '🎨', desc: 'Couleurs de peinture, ombres douces, bords dorés : la carte d’une fresque antique.',
      soleil: { dir: [-0.5, 0.7, 0.5], couleur: 0xffe6c4, force: 2.1 }, hemi: { ciel: 0xffe7c8, sol: 0x7a5a38, force: 0.85 }, exposition: 1.05,
      ciel: { haut: 0x7aa6cf, horizon: 0xf2dfbf, bas: 0xf1dcb4, halo: 0xffe2b0 }, brume: 0.8,
      eau: { creux: [0.1, 0.3, 0.42], bas: [0.3, 0.7, 0.7], reflet: [1, 0.95, 0.8] },
      sol: { herbe: [118, 160, 70], foret: [70, 112, 52], sec: [186, 170, 92], sable: [236, 208, 150], roche: [160, 132, 112], neige: [250, 246, 240], fleurs: true },
      neige: { niveau: 72, partout: 0 }, arbres: { sapin: [0x3e7a44, 0x4c8a4a, 0x356c3c], feuillu: [0x6aa84a, 0x7cb552, 0x8cbc58, 0x5e9a46], palmier: 0x74a04a },
      herbe: [0x88b852, 0x96c25a, 0x7aa84a], nuages: { opacite: 0.8, ombres: 0.35 },
      post: { saturation: 1.32, contraste: 0.98, chaud: [1.08, 1.0, 0.9], froid: [1.0, 1.0, 1.02], vignette: 0.55, bloom: 0.25, seuil: 0.85, maquette: 1.1, grain: 0.05, papier: true }
    },
    crepuscule: {
      nom: 'Crépuscule', emoji: '🌅', desc: 'Soleil couchant, ciel orange et violet, longues ombres, reflets d’or sur la mer.',
      soleil: { dir: [-0.8, 0.26, 0.3], couleur: 0xff9c5a, force: 2.8 }, hemi: { ciel: 0x8a74b8, sol: 0x4a2a24, force: 0.6 }, exposition: 1.05,
      ciel: { haut: 0x3a3c7c, horizon: 0xe8a07a, bas: 0xc88a70, halo: 0xffb070 }, brume: 0.8,
      eau: { creux: [0.06, 0.08, 0.2], bas: [0.3, 0.32, 0.46], reflet: [1.0, 0.62, 0.32] },
      sol: { herbe: [100, 128, 60], foret: [56, 72, 40], sec: [160, 136, 76], sable: [222, 180, 130], roche: [130, 108, 100], neige: [246, 224, 220], fleurs: false },
      neige: { niveau: 70, partout: 0 }, arbres: { sapin: [0x35502c, 0x3e5a30, 0x2e4628], feuillu: [0x5a7a34, 0x6a8238, 0x748a3a], palmier: 0x667c38 },
      herbe: [0x7a8a40, 0x869444, 0x6e7e3a], nuages: { opacite: 0.85, ombres: 0.45 },
      post: { saturation: 1.15, contraste: 1.08, chaud: [1.1, 0.98, 0.86], froid: [0.92, 0.94, 1.1], vignette: 0.45, bloom: 0.55, seuil: 0.72, maquette: 0.9, grain: 0.03 }
    },
    automne: {
      nom: 'Automne', emoji: '🍂', desc: 'Forêts rousses, prairies dorées, lumière douce et brume légère.',
      soleil: { dir: [-0.6, 0.5, 0.45], couleur: 0xffd2a0, force: 2.3 }, hemi: { ciel: 0xd8d0c0, sol: 0x5a3c22, force: 0.65 }, exposition: 1.0,
      ciel: { haut: 0x6a8cb0, horizon: 0xd9cdb6, bas: 0xd8c4a0, halo: 0xffd090 }, brume: 1.4,
      eau: { creux: [0.04, 0.14, 0.24], bas: [0.18, 0.44, 0.46], reflet: [1, 0.85, 0.6] },
      sol: { herbe: [128, 132, 58], foret: [96, 70, 40], sec: [176, 146, 74], sable: [214, 190, 140], roche: [124, 112, 100], neige: [240, 240, 244], fleurs: false },
      neige: { niveau: 68, partout: 0 }, arbres: { sapin: [0x2f4f2a, 0x3a5a30, 0x2a4626], feuillu: [0xc8662a, 0xd88a2c, 0xb0402a, 0xe0b040, 0x8a8a34], palmier: 0x8a8040 },
      herbe: [0xa09044, 0xb0983e, 0x8a8a3c], nuages: { opacite: 0.8, ombres: 0.5 },
      post: { saturation: 1.12, contraste: 1.04, chaud: [1.08, 1.0, 0.88], froid: [0.98, 0.98, 1.02], vignette: 0.38, bloom: 0.3, seuil: 0.82, maquette: 0.9, grain: 0.03 }
    },
    hiver: {
      nom: 'Hiver nordique', emoji: '❄️', desc: 'Terres enneigées, sapins givrés, lumière froide et rasante, mer d’acier.',
      soleil: { dir: [-0.5, 0.36, 0.55], couleur: 0xe8eeff, force: 1.7 }, hemi: { ciel: 0xc6d4ea, sol: 0x5a6070, force: 0.55 }, exposition: 0.72,
      ciel: { haut: 0x6f8fb4, horizon: 0xd8e2ea, bas: 0xdfe4e8, halo: 0xf0f4ff }, brume: 1.5,
      eau: { creux: [0.04, 0.1, 0.18], bas: [0.3, 0.46, 0.54], reflet: [0.92, 0.96, 1.0] },
      sol: { herbe: [104, 120, 80], foret: [66, 80, 60], sec: [140, 136, 110], sable: [200, 196, 180], roche: [104, 106, 114], neige: [226, 233, 244], fleurs: false },
      neige: { niveau: 22, partout: 0.78 }, arbres: { sapin: [0x3c5a48, 0x2e4a3c, 0xa8bcc0], feuillu: [0x9a8a7a, 0xb0a698, 0x8a7c6c], palmier: 0x8a9a7a },
      herbe: [0xc8d4d8, 0xdfe6ea, 0xb4c2c6], nuages: { opacite: 0.9, ombres: 0.4 },
      post: { saturation: 0.92, contraste: 1.14, chaud: [0.98, 1.0, 1.02], froid: [0.9, 0.97, 1.1], vignette: 0.38, bloom: 0.25, seuil: 0.88, maquette: 0.8, grain: 0.03 }
    },
    nuit: {
      nom: 'Nuit étoilée', emoji: '🌙', desc: 'Clair de lune, villes illuminées, torches et étoiles. Superbe en gros plan.',
      soleil: { dir: [0.4, 0.55, -0.5], couleur: 0x8ea6ff, force: 0.55 }, hemi: { ciel: 0x2a3a6a, sol: 0x100c14, force: 0.45 }, exposition: 1.1, nuit: true, kCiel: 0.55, fond: 0.6, ambiance: 0.75, brumeTeinte: 0.5,
      ciel: { haut: 0x060b1e, horizon: 0x1c2a4c, bas: 0x1a2236, halo: 0xb0c4ff }, etoiles: true, brume: 1.1,
      eau: { creux: [0.01, 0.03, 0.08], bas: [0.04, 0.12, 0.2], reflet: [0.7, 0.8, 1.0] },
      sol: { herbe: [70, 100, 60], foret: [40, 60, 40], sec: [110, 110, 80], sable: [170, 160, 140], roche: [100, 100, 110], neige: [220, 228, 255], fleurs: false },
      neige: { niveau: 70, partout: 0 }, arbres: { sapin: [0x2a4a34, 0x30523a, 0x26442e], feuillu: [0x456a46, 0x4c7450, 0x527a54], palmier: 0x456a46 },
      herbe: [0x3a5a3a, 0x406240, 0x345234], nuages: { opacite: 0.35, ombres: 0.2 },
      post: { saturation: 1.0, contraste: 1.1, chaud: [1.15, 1.0, 0.85], froid: [0.85, 0.95, 1.2], vignette: 0.5, bloom: 0.95, seuil: 0.55, maquette: 0.8, grain: 0.04 }
    },
    ragnarok: {
      nom: 'Ragnarök', emoji: '🔥', desc: 'Ciel de braise, cendres et terres brûlées : la fin du monde des dieux.',
      soleil: { dir: [-0.4, 0.4, 0.5], couleur: 0xff8a5a, force: 2.0 }, hemi: { ciel: 0x6a4a44, sol: 0x2a1a14, force: 0.6 }, exposition: 1.05,
      ciel: { haut: 0x2a0e0e, horizon: 0xa8442a, bas: 0x6a3a2e, halo: 0xff7a3a }, brume: 1.6,
      eau: { creux: [0.08, 0.03, 0.03], bas: [0.3, 0.12, 0.08], reflet: [1, 0.5, 0.25] },
      sol: { herbe: [92, 84, 60], foret: [56, 46, 36], sec: [120, 100, 76], sable: [150, 120, 96], roche: [80, 70, 66], neige: [120, 110, 108], fleurs: false },
      neige: { niveau: 74, partout: 0 }, arbres: { sapin: [0x2a2420, 0x3a2e26, 0x241e1a], feuillu: [0x4a3a2a, 0x5a3424, 0x3a2e24], palmier: 0x4a3a2a },
      herbe: [0x6a5a3e, 0x7a6040, 0x5a4a36], nuages: { opacite: 0.9, ombres: 0.7 },
      post: { saturation: 0.82, contraste: 1.15, chaud: [1.1, 0.96, 0.88], froid: [0.92, 0.92, 1.02], vignette: 0.6, bloom: 0.6, seuil: 0.7, maquette: 0.9, grain: 0.05 }
    }
  };
  // qualité : effets, ombres, herbe, finesse de l'image
  PM.QUALITES = {
    ultra: { nom: 'Ultra', ao: true, bloom: true, maquette: true, ombres: 4096, herbe: 1, finesse: 2, desc: 'Tous les effets, occlusion ambiante des volumes, image la plus fine.' },
    haute: { nom: 'Haute', ao: false, bloom: true, maquette: true, ombres: 2048, herbe: 1, finesse: 1.5, desc: 'Halo lumineux, ombres fines, herbe, textures photographiques en pleine définition.' },
    moyenne: { nom: 'Moyenne', ao: false, bloom: false, maquette: false, ombres: 1024, herbe: 0.5, finesse: 1, desc: 'Textures allégées, moins d’herbe et d’effets : pour un MacBook Air.' },
    basse: { nom: 'Basse', ao: false, bloom: false, maquette: false, ombres: 0, herbe: 0, finesse: 1, desc: 'Pour un Mac ancien : sans ombres ni effets.' }
  };
  const lire = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  PM.packGraphique = () => { const id = lire('pm:pack', 'olympe'); return PM.PACKS_GRAPHIQUES[id] ? id : 'olympe'; };
  PM.qualite = () => { const id = lire('pm:qualite', 'haute'); return PM.QUALITES[id] ? id : 'haute'; };
  // économie de batterie : sur batterie (réglage « auto ») ou toujours, l'image est limitée à 30 images par seconde
  // et la qualité ne dépasse pas « Moyenne » ; fenêtre au second plan : 10 images par seconde ; sinon 60 au plus (écrans 120 Hz)
  PM.ENERGIE = { auto: 'Sur batterie', toujours: 'Toujours', jamais: 'Jamais' };
  PM.surBatterie = false;
  PM.reglageEnergie = () => { const v = lire('pm:energie', 'auto'); return PM.ENERGIE[v] ? v : 'auto'; };
  PM.economie = () => { const r = PM.reglageEnergie(); return r === 'toujours' || (r === 'auto' && PM.surBatterie); };
  PM.qualiteEffective = id => PM.economie() && (id === 'ultra' || id === 'haute') ? 'moyenne' : id;
  PM.imagesParSeconde = () => (typeof document !== 'undefined' && document.hasFocus && !document.hasFocus()) ? 10 : PM.economie() ? 30 : 60;
  // une image toutes les 1000/n ms : la boucle saute les images en trop (renvoie faux)
  PM.imageDue = (etat, ts) => { const pas = 1000 / PM.imagesParSeconde(); if (etat.tImage && ts - etat.tImage < pas - 1.5) return false; etat.tImage = etat.tImage && ts - etat.tImage < pas * 2 ? etat.tImage + pas : ts; return true; };
  const abonnes = [];
  PM.surEnergie = f => abonnes.push(f);
  PM.majEnergie = () => { for (const f of abonnes) try { f(); } catch (e) { /* vue fermée */ } };
  PM.choisirEnergie = v => { try { localStorage.setItem('pm:energie', v); } catch (e) { /* sans stockage */ } PM.majEnergie(); };
  PM.changerBatterie = oui => { if (PM.surBatterie === !!oui) return; PM.surBatterie = !!oui; PM.majEnergie(); };
  // source d'alimentation : donnée par l'application Mac, sinon par le navigateur quand il la connaît
  if (G.paxEnergie) G.paxEnergie.surChangement(b => PM.changerBatterie(b));
  else if (G.navigator && G.navigator.getBattery) G.navigator.getBattery().then(bt => { const f = () => PM.changerBatterie(!bt.charging); f(); bt.addEventListener('chargingchange', f); }).catch(() => { /* inconnue */ });
  PM.choisirPack = id => { try { localStorage.setItem('pm:pack', id); } catch (e) { /* sans stockage */ } };
  PM.choisirQualite = id => { try { localStorage.setItem('pm:qualite', id); } catch (e) { /* sans stockage */ } };
})(typeof window !== 'undefined' ? window : globalThis);
