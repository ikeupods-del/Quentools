// Affiche les nouveautés d'une version (section « ## X.Y.Z » de NOUVEAUTES.md) pour la page de publication.
'use strict';
const fs = require('fs');
const path = require('path');
const version = process.argv[2] || require('../package.json').version;
const texte = fs.readFileSync(path.join(__dirname, '..', 'NOUVEAUTES.md'), 'utf8');
const m = new RegExp(`^## ${version.replace(/\./g, '\\.')}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm').exec(texte);
const notes = m ? m[1].trim() : '- Améliorations et corrections.';
process.stdout.write(`${notes}\n\nInstallation : ouvrir le .dmg et glisser QuentMovie dans Applications. Les versions suivantes s'installent ensuite toutes seules.\n`);
