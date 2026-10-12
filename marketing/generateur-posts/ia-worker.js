// Studio Posts : IA locale (modèle de langage sur la puce du Mac, node-llama-cpp), dans un processus à part.
// Messages : { id, type: 'ecrire', modele, systeme, demande, schema, maxTokens, temperature } → { id, ok, resultat }
//            { id, type: 'verifier' } → { id, ok, gpu } (la bibliothèque se charge, sans modèle)
'use strict';
let llama = null, modele = null, chemin = '', lib = null;

async function preparer() {
  lib = lib || await import('node-llama-cpp');
  llama = llama || await lib.getLlama({ build: 'never', gpu: 'auto' });
}
async function charger(fichier) {
  await preparer();
  if (modele && chemin === fichier) return;
  if (modele) await modele.dispose();
  modele = await llama.loadModel({ modelPath: fichier });
  chemin = fichier;
}

async function ecrire({ modele: fichier, systeme, demande, schema, maxTokens = 1400, temperature = 0.6, contexte = 4096 }) {
  await charger(fichier);
  const ctx = await modele.createContext({ contextSize: contexte });
  try {
    const session = new lib.LlamaChatSession({ contextSequence: ctx.getSequence(), systemPrompt: systeme });
    const grammaire = schema ? await llama.createGrammarForJsonSchema(schema) : undefined;
    const t = await session.prompt(demande, { grammar: grammaire, maxTokens, temperature });
    return { resultat: grammaire ? grammaire.parse(t) : t, gpu: llama.gpu };
  } finally { await ctx.dispose(); }
}

process.on('message', async m => {
  try { process.send({ id: m.id, ok: true, ...(m.type === 'ecrire' ? await ecrire(m) : (await preparer(), { gpu: llama.gpu })) }); }
  catch (e) { process.send({ id: m.id, ok: false, erreur: String((e && e.message) || e) }); }
});
