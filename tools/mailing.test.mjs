// Tests de l'outil de prospection par e-mail. Lancer : node --test tools/mailing.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { statut, lireSuivi, point, modele, composer, ajouter } = createRequire(import.meta.url)('./mailing.js');

const SUIVI = `# Suivi\n\n| Date | Entreprise | Métier | Ville | Adresse | Objet | Statut |\n|---|---|---|---|---|---|---|
| 2026-10-01 | Alpha | Plomberie | Nîmes | a@x.fr | A | envoyé |
| 2026-10-01 | Beta | Plomberie | Nîmes | b@x.fr | B | réponse |
| 2026-10-02 | Gamma | Coiffure | Arles | c@x.fr | B | rebond (domaine introuvable) : ne pas relancer |
| 2026-10-02 | Delta | Coiffure | Arles | d@x.fr | A | STOP |
| 2026-10-05 | Eps | Fleuriste | Nîmes | e@x.fr | C | envoyé |

## Pistes
| 2026-10-05 | Ignoré | X | Y | z@x.fr | A | envoyé |`;
const lignes = lireSuivi(SUIVI);
const MD = `\n## E-mail 1 : la question\n**Objet** : x\n\n> Bonjour [prénom],\n>\n> En cherchant [métier] à [ville], je suis tombé sur votre activité et [observation vraie].\n>\n> [phrase de métier ci-dessous]\n>\n> Répondez STOP pour ne plus être recontacté.\n\n### Objets\n- **A** : Vos clients vous trouvent-ils ?\n- **B** : Une question sur votre présence\n- **C** : Un point à [ville]\n\n- **Plombier, électricien** : « Votre numéro est-il visible ? »\n- **Coiffeur, barbier** : « Peut-on réserver en un clic ? »\n\n## Relance (une seule)\n**Objet** : Re\n\n> Bonjour [prénom], dernière fois.\n\n## Suivi`;

test('statuts normalisés', () => { assert.equal(statut('rebond (x) : ne pas relancer'), 'rebond'); assert.equal(statut('STOP'), 'stop'); assert.equal(statut('Réponse positive'), 'réponse'); assert.equal(statut('envoyé'), 'envoyé'); });
test('le suivi ne lit que le premier tableau', () => { assert.equal(lignes.length, 5); });
test('le point : quota, relances dues, réponses, rebonds, stops, objets', () => {
  const p = point(lignes, '2026-10-05');
  assert.equal(p.du_jour, 1); assert.equal(p.quota_restant, 9);
  assert.deepEqual(p.relances.map(l => l.entreprise), ['Alpha'], 'seul « envoyé » depuis 4 jours ou plus');
  assert.equal(p.reponses, 1); assert.equal(p.rebonds, 1); assert.equal(p.stops, 1);
  assert.deepEqual(p.parObjet.B, { envois: 1, reponses: 1 }, 'un rebond ne compte pas comme envoi');
});
test('relance : le délai est de 4 jours', () => { assert.equal(point(lignes, '2026-10-05').relances.length, 1); assert.equal(point(lignes, '2026-10-04').relances.length, 0); assert.equal(ajouter('2026-10-31', 1), '2026-11-01'); });
test('le modèle est lu dans MAILING.md', () => {
  const m = modele(MD); assert.match(m.corps, /Bonjour \[prénom\]/); assert.equal(m.objets.B, 'Une question sur votre présence');
  assert.equal(m.phrases['electricien'], 'Votre numéro est-il visible ?'); assert.match(m.relance, /dernière fois/);
});
test('e-mail composé : champs remplis, aucun contrôle en échec', () => {
  const r = composer({ metier: 'plombier', prenom: 'Julie', ville: 'Nîmes', observation: 'je n’ai pas trouvé de site pour votre entreprise', objet: 'C', adresse: 'nouveau@x.fr' }, lignes, MD);
  assert.deepEqual(r.problemes, []); assert.equal(r.sujet, 'Un point à Nîmes'); assert.match(r.corps, /Bonjour Julie/); assert.match(r.corps, /Votre numéro est-il visible/);
});
test('refus : adresse déjà contactée, STOP, rebond', () => {
  const base = { metier: 'plombier', prenom: 'J', ville: 'N', observation: 'je n’ai pas trouvé de site pour votre entreprise' };
  assert.match(composer({ ...base, adresse: 'a@x.fr' }, lignes, MD).problemes[0], /déjà été contactée/);
  assert.match(composer({ ...base, adresse: 'd@x.fr' }, lignes, MD).problemes[0], /STOP/);
  assert.match(composer({ ...base, adresse: 'c@x.fr' }, lignes, MD).problemes[0], /rebondi/);
});
test('refus : observation vide, prix, lien ; métier sans phrase', () => {
  const base = { metier: 'plombier', prenom: 'J', ville: 'N', adresse: 'n@x.fr' };
  assert.ok(composer({ ...base, observation: 'court' }, lignes, MD).problemes.some(x => /trop courte/.test(x)));
  assert.ok(composer({ ...base, observation: 'votre site coûte 299 € chez un autre prestataire' }, lignes, MD).problemes.some(x => /ni prix ni lien/.test(x)));
  assert.ok(composer({ ...base, observation: 'regardez https://exemple.fr pour comprendre le sujet' }, lignes, MD).problemes.some(x => /ni prix ni lien/.test(x)));
  assert.ok(composer({ ...base, metier: 'astronaute', observation: 'je n’ai pas trouvé de site pour votre entreprise' }, lignes, MD).problemes.some(x => /phrase de métier/.test(x)));
});
test('objet inconnu refusé', () => { assert.throws(() => composer({ metier: 'plombier', objet: 'Z' }, lignes, MD), /Objet inconnu/); });
