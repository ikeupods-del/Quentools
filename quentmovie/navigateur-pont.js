// Navigateur des écrans de Pico quand la fabrication tourne dans QuentMovie : mêmes appels que Playwright (chromium.launch, newPage,
// setContent, evaluate, screenshot, close) exécutés par une fenêtre cachée de QuentMovie (route /api/navigateur du moteur).
// Aucun Chromium à installer : la fabrication reçoit ce module par la variable PW, l'adresse et le jeton par QI_NAVIGATEUR et QI_JETON.
'use strict';

async function appel(action, corps) {
  const r = await fetch(`${process.env.QI_NAVIGATEUR}/${action}`, { method: 'POST', headers: { 'x-jeton': process.env.QI_JETON || '' }, body: JSON.stringify(corps) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `Navigateur des écrans indisponible (${r.status})`);
  return j.resultat;
}
async function nouvellePage({ viewport = { width: 1280, height: 720 } } = {}) {
  const id = await appel('ouvrir', { largeur: viewport.width, hauteur: viewport.height });
  return {
    setContent: html => appel('contenu', { id, html: String(html) }),
    // la fonction est envoyée en texte : elle ne doit utiliser que la page et son argument (comme avec Playwright)
    evaluate: (fn, arg) => appel('evaluer', { id, code: typeof fn === 'function' ? `(${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})` : String(fn) }),
    screenshot: ({ path, omitBackground } = {}) => appel('capture', { id, chemin: path, transparent: !!omitBackground }),
    waitForTimeout: ms => new Promise(r => setTimeout(r, ms)),
    close: () => appel('fermer', { id })
  };
}
const chromium = {
  launch: async () => {
    const pages = [];
    return { newPage: async o => { const p = await nouvellePage(o); pages.push(p); return p; }, close: async () => { for (const p of pages) await p.close().catch(() => {}); } };
  }
};

module.exports = { chromium };
