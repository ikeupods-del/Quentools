// Voix clonée (essai) : choix de l'extrait de référence (essai.py, vrai Python), puis circuit complet du moteur avec un faux modèle
// (Python de remplacement qui reproduit venv / pip / essai.py), routes de l'interface.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

(async () => {
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-vc-')), ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  const py = spawnSync('python3', ['--version']).status === 0 ? 'python3' : null;
  const SCRIPT = path.join(__dirname, '..', 'voix-clone', 'essai.py');

  // corpus « Ma voix » : trois répliques de 5 s (mono 44,1 kHz, 16 bits) + deux trop courtes
  const mv = path.join(base, 'ma-voix'); fs.mkdirSync(path.join(mv, 'wavs'), { recursive: true });
  const index = {};
  const reponse = (id, d, texte) => { ff('-f', 'lavfi', '-i', `sine=f=220:r=44100:d=${d}`, '-ac', '1', '-c:a', 'pcm_s16le', path.join(mv, 'wavs', id + '.wav')); index[id] = { texte, duree: d }; };
  reponse('a-00', 5, 'Première phrase.'); reponse('a-01', 5, 'Deuxième phrase.'); reponse('a-02', 5, 'Troisième phrase.'); reponse('a-03', 1, 'Trop courte.');
  fs.writeFileSync(path.join(mv, 'index.json'), JSON.stringify(index));

  if (py) {
    const s1 = path.join(base, 'ref'), r = spawnSync(py, ['-I', SCRIPT, '--moteur', 'qwen', '--voix', mv, '--sortie', s1, '--selection-seule'], { encoding: 'utf8' });
    check('extrait : le script se termine bien', r.status === 0, r.stdout + r.stderr);
    const ref = path.join(s1, 'reel.wav'), texte = fs.existsSync(path.join(s1, 'reel.txt')) ? fs.readFileSync(path.join(s1, 'reel.txt'), 'utf8') : '';
    const d = +execFileSync(bins.ffprobe || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ref], { encoding: 'utf8' }).trim();
    check('extrait : entre 8 et 16 s de voix', d >= 8 && d <= 16.5, 'durée ' + d);
    check('extrait : texte dit gardé, sans la réplique trop courte', /Première/.test(texte) && /Deuxième/.test(texte) && !/Trop courte/.test(texte), texte);
    // pas assez de voix
    const pauvre = path.join(base, 'pauvre'), mv2 = path.join(pauvre, 'ma-voix'); fs.mkdirSync(path.join(mv2, 'wavs'), { recursive: true });
    ff('-f', 'lavfi', '-i', 'sine=f=220:r=44100:d=4', '-ac', '1', '-c:a', 'pcm_s16le', path.join(mv2, 'wavs', 'x-00.wav')); fs.writeFileSync(path.join(mv2, 'index.json'), JSON.stringify({ 'x-00': { texte: 'Une seule.', duree: 4 } }));
    const p2 = spawnSync(py, ['-I', SCRIPT, '--moteur', 'qwen', '--voix', mv2, '--sortie', path.join(pauvre, 'sortie'), '--selection-seule'], { encoding: 'utf8' });
    check('extrait : message clair quand il manque de la voix', p2.status !== 0 && /Pas assez de voix/.test(p2.stdout), p2.stdout);
    // doublages anciens, sans corpus
    const ancien = path.join(base, 'ancien'), dd = path.join(ancien, 'doublages', 'vieux'); fs.mkdirSync(dd, { recursive: true }); fs.mkdirSync(path.join(ancien, 'ma-voix'), { recursive: true });
    for (let k = 0; k < 3; k++) ff('-f', 'lavfi', '-i', 'sine=f=250:r=44100:d=5', '-ac', '1', '-c:a', 'pcm_s16le', path.join(dd, `v0${k}.wav`));
    fs.writeFileSync(path.join(dd, 'script.json'), JSON.stringify({ lignes: ['Un.', 'Deux.', 'Trois.'] }));
    const p3 = spawnSync(py, ['-I', SCRIPT, '--moteur', 'qwen', '--voix', path.join(ancien, 'ma-voix'), '--sortie', path.join(ancien, 'sortie'), '--selection-seule'], { encoding: 'utf8' });
    check('extrait : repli sur les anciens doublages', p3.status === 0 && fs.existsSync(path.join(ancien, 'sortie', 'reel.wav')), p3.stdout);
  } else console.log('  (python3 absent : contrôle de l’extrait ignoré)');

  // faux Python : « -m venv D » crée D/bin/python ; « -m pip … » ne fait rien ; le script d'essai appelle le vrai python3 (sélection) puis fabrique de faux fichiers
  const faux = path.join(base, 'faux-python'), fauxVenv = path.join(base, 'faux-venv-python');
  fs.writeFileSync(fauxVenv, `#!/bin/sh
if [ "$1" = "-m" ] && [ "$2" = "pip" ]; then echo "Collecting paquet"; exit 0; fi
case "$1" in *essai.py) ;; *) exit 1;; esac
M=""; V=""; S=""
while [ $# -gt 0 ]; do case "$1" in --moteur) M="$2";; --voix) V="$2";; --sortie) S="$2";; esac; shift; done
python3 -I "${SCRIPT}" --moteur "$M" --voix "$V" --sortie "$S" --selection-seule || exit $?
echo "ETAPE : $M : phrase 1 sur 4"
for i in 1 2 3 4; do cp "$S/reel.wav" "$S/$M-$i.wav"; done
echo '[{"moteur":"'$M'","phrase":1,"fichier":"'$M'-1.wav","calcul":2.5,"duree":5.0,"appareil":"cpu"}]' > "$S/rapport-$M.json"
echo "ETAPE : Terminé"
`); fs.chmodSync(fauxVenv, 0o755);
  fs.writeFileSync(faux, `#!/bin/sh
if [ "$1" = "-m" ] && [ "$2" = "venv" ]; then mkdir -p "$3/bin"; cp "${fauxVenv}" "$3/bin/python"; exit 0; fi
exit 1
`); fs.chmodSync(faux, 0o755);
  process.env.QM_PYTHON = faux;

  if (py) {
    const app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
    let e = await (await fetch(U('/api/voix-clone'))).json();
    check('état : deux modèles, rien d’installé, corpus lu', e.moteurs.length === 2 && e.moteurs.every(m => !m.installe) && e.corpus.prises === 4 && e.corpus.secondes === 16, JSON.stringify(e).slice(0, 300));
    const { id } = await (await fetch(U('/api/voix-clone/essai'), { method: 'POST', body: JSON.stringify({ moteurs: ['chatterbox', 'qwen'] }) })).json();
    let j; for (let k = 0; k < 120; k++) { await new Promise(r => setTimeout(r, 500)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) break; }
    check('essai : terminé sans erreur', j && j.done && !j.error, JSON.stringify(j));
    check('essai : fichiers des deux modèles et extrait de référence', j.resultat && ['reel.wav', 'chatterbox-1.wav', 'qwen-4.wav'].every(f => j.resultat.fichiers.includes(f)), JSON.stringify(j.resultat && j.resultat.fichiers));
    e = await (await fetch(U('/api/voix-clone'))).json();
    check('état : modèles marqués installés après l’essai', e.moteurs.every(m => m.installe) && e.rapports.length === 2, JSON.stringify(e.moteurs));
    const a = await fetch(U('/api/voix-clone/audio?f=chatterbox-1.wav'));
    check('audio : fichier servi', a.status === 200 && /audio\/wav/.test(a.headers.get('content-type')) && (await a.arrayBuffer()).byteLength > 1000);
    const x = await fetch(U('/api/voix-clone/audio?f=' + encodeURIComponent('../../index.json')));
    check('audio : chemin hors de l’essai refusé', x.status === 404);
    // deuxième essai : plus d'installation, plus rapide ; journal gardé
    check('journal : les commandes lancées sont gardées', fs.existsSync(path.join(base, 'voix-clone', 'journal.txt')) && /pip install/.test(fs.readFileSync(path.join(base, 'voix-clone', 'journal.txt'), 'utf8')));
    // erreur claire quand il n'y a pas de voix
    fs.rmSync(path.join(base, 'ma-voix'), { recursive: true, force: true }); fs.rmSync(path.join(base, 'voix-clone', 'essais'), { recursive: true, force: true });
    const r2 = await (await fetch(U('/api/voix-clone/essai'), { method: 'POST', body: JSON.stringify({ moteurs: ['qwen'] }) })).json();
    let j2; for (let k = 0; k < 60; k++) { await new Promise(r => setTimeout(r, 500)); j2 = await (await fetch(U('/api/job?id=' + r2.id))).json(); if (j2.done || j2.error) break; }
    check('essai sans voix : message compréhensible', j2.error && /Pas encore de voix enregistrée/.test(j2.error), JSON.stringify(j2));
    // dictionnaire de prononciation (routes + lecture par la voix)
    let pr = await (await fetch(U('/api/prononciations'))).json();
    check('prononciations : mots livrés lus, rien de personnel au départ', pr.livre.krach === 'crac' && Object.keys(pr.perso).length === 0, JSON.stringify(pr).slice(0, 120));
    pr = await (await fetch(U('/api/prononciations'), { method: 'PUT', body: JSON.stringify({ mots: { Quentin: 'Kantin', '': 'vide', _x: 'ignoré' } }) })).json();
    check('prononciations : mot personnel gardé (mots vides ou réservés ignorés)', pr.ok && JSON.stringify(pr.perso) === '{"Quentin":"Kantin"}', JSON.stringify(pr));
    check('prononciations : fichier écrit dans le dossier QuentMovie et utilisé par la voix', fs.existsSync(path.join(base, 'prononciations.json')) && require('../voix-texte').pourLaVoix('Quentin et le krach') === 'Kantin et le crac');
    app.stop();
  }
  fs.rmSync(base, { recursive: true, force: true });
  console.log(`Voix clonée : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
