// Fabrique des photos fictives de courriers et d'un ticket (feuille penchée de 3° à 19°, ombre, flou, fond de table).
// Prérequis (hors dépôt) : npm install --no-save tesseract.js@6.0.1 @tesseract.js-data/fra sharp ; Playwright (variable PW). Lancer : node tools/essai-photos.js
// Génère des photos réalistes de courriers/tickets fictifs (feuille penchée, ombre, flou, fond de table)
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const sharp = require(require('path').join(process.env.NM || require('path').join(__dirname, '..', '..', 'node_modules'), 'sharp'));
const fs = require('fs');
const OUT = process.env.PHOTOS || require('path').join(require('os').tmpdir(), 'qt-photos-essai'); require('fs').mkdirSync(OUT, { recursive: true });
const css = `body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111}.p{width:794px;height:1123px;box-sizing:border-box;padding:70px 80px;font-size:15px;line-height:1.5;position:relative}h1{font-size:20px;margin:30px 0 14px}.r{text-align:right}.b{font-weight:bold}.box{border:1px solid #333;padding:10px;margin:14px 0}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #444;padding:6px 8px;text-align:left}small{font-size:11px;color:#333}`;
const L = {
 caf: { exp: { type: 'caf', amount: 412.36, date: '2026-11-30' }, html: `<div class="p"><b>CAISSE D'ALLOCATIONS FAMILIALES DU GARD</b><br>Service des recouvrements<br>CS 90001 - 30947 NIMES CEDEX 9<div class="r">Nîmes, le 12 octobre 2026<br><b>Madame Sophie MARTIN</b><br>14 rue des Oliviers<br>30000 NIMES</div><p>N° allocataire : 1234567<br>Référence : IND-2026-0458</p><h1>Objet : Notification d'indu - Prime d'activité</h1><p>Madame,</p><p>Après examen de votre dossier, nous constatons que vous avez perçu à tort la somme de <b>412,36 €</b> au titre de la prime d'activité pour les mois de mai à juillet 2026.</p><p>Nous vous demandons de rembourser cette somme <b>avant le 30 novembre 2026</b>. Vous pouvez payer en ligne sur caf.fr ou nous contacter pour demander un échéancier.</p><p>Si vous contestez cette décision, vous pouvez saisir la commission de recours amiable dans un délai de deux mois à compter de la réception de ce courrier.</p><p>Nous vous prions d'agréer, Madame, l'expression de nos salutations distinguées.</p><p class="r">Le directeur</p></div>` },
 impots: { exp: { type: 'impots', amount: 1245, date: '2026-12-15' }, html: `<div class="p"><b>DIRECTION GÉNÉRALE DES FINANCES PUBLIQUES</b><br>Service des impôts des particuliers de Nîmes<br>BP 20012 - 30001 NIMES<div class="r">Monsieur Paul DURAND<br>8 impasse du Moulin<br>30900 NIMES</div><h1>MISE EN DEMEURE DE PAYER</h1><p>Avis d'impôt sur le revenu 2025 - N° fiscal 12 34 567 890 123</p><div class="box">Montant restant à payer : <b>1 245,00 €</b><br>Date limite de paiement : <b>15 décembre 2026</b></div><p>Sans paiement avant cette date, une majoration de 10 % sera appliquée et le comptable public pourra engager des poursuites. Vous pouvez payer sur impots.gouv.fr ou demander un délai de paiement auprès de votre service.</p><p>Veuillez agréer, Monsieur, l'expression de nos salutations distinguées.</p></div>` },
 facture: { exp: { type: 'facture', amount: 187.45, date: '2026-11-22' }, html: `<div class="p"><b>ÉLECTRICITÉ DU SUD</b> - Service clients<br>TSA 12345 - 75001 PARIS<div class="r">Mme Julie LEROY<br>3 avenue de la Gare<br>30100 ALES</div><h1>Facture d'électricité n° 2026-884512</h1><p>Période de consommation : du 01/08/2026 au 30/09/2026</p><table><tr><th>Désignation</th><th>Montant HT</th><th>TVA</th></tr><tr><td>Abonnement</td><td>29,80 €</td><td>5,5 %</td></tr><tr><td>Consommation 842 kWh</td><td>125,10 €</td><td>20 %</td></tr></table><div class="box">Total TTC à payer : <b>187,45 €</b><br>À régler avant le <b>22/11/2026</b> par prélèvement ou carte bancaire</div><small>En cas de difficulté de paiement, contactez-nous.</small></div>` },
 amende: { exp: { type: 'amende', amount: 135, date: '2026-11-05' }, html: `<div class="p"><b>AVIS DE CONTRAVENTION</b><br>Agence nationale de traitement automatisé des infractions<br>CS 41101 - 35911 RENNES CEDEX 9<div class="r">Monsieur Marc BERNARD<br>27 chemin des Vignes<br>30250 SOMMIERES</div><p>Infraction constatée le 18 septembre 2026 : excès de vitesse inférieur à 20 km/h</p><div class="box">Montant de l'amende forfaitaire : <b>135 €</b><br>Si vous payez avant le <b>5 novembre 2026</b>, le montant est minoré à 90 €.</div><p>Vous pouvez payer en ligne sur amendes.gouv.fr. Vous disposez de 45 jours pour contester.</p></div>` },
};
const TICKET = `<div style="width:380px;margin:0;padding:20px;font-family:'Courier New',monospace;font-size:16px;line-height:1.35;background:#fff;color:#111"><div style="text-align:center"><b>DARTY NIMES</b><br>12 rue du Commerce<br>30000 NIMES<br>Tel 04 66 00 00 00</div><br>Date : 12/09/2026 15:42<br>Ticket n° 004512<br>------------------------------<br>LAVE-LINGE FAGOR LV8<br>1 x 349,00 EUR<br>------------------------------<br>TOTAL TTC 349,00 EUR<br>dont TVA 20% 58,17<br>CB 349,00 EUR<br><br>Garantie 2 ans pièces et main d'oeuvre<br>Merci de votre visite</div>`;
const LEVELS = { doux: { a: 3, blur: 0.6, shadow: 0.15 }, moyen: { a: -8, blur: 1.2, shadow: 0.3 }, dur: { a: 13, blur: 1.8, shadow: 0.45 }, pire: { a: -19, blur: 1.2, shadow: 0.55, small: 1 } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 794, height: 1123 } });
  const exp = {};
  const jobs = [...Object.entries(L).map(([k, v]) => [k, v.html, 794, 1123]), ['ticket', TICKET, 420, 560]];
  for (const [k, html, w, h] of jobs) {
    await pg.setViewportSize({ width: w, height: h }); await pg.setContent(`<style>${css}</style>${html}`);
    const png = await pg.screenshot({ clip: { x: 0, y: 0, width: w, height: h } });
    for (const [lv, o] of Object.entries(LEVELS)) {
      const W = o.small ? 1500 : 1800, H = o.small ? 2000 : 2400, pw = Math.round(w * (k === 'ticket' ? (o.small ? 1.6 : 3.1) : (o.small ? 1.25 : 1.75))), ph = Math.round(h * pw / w);
      let page = await sharp(png).resize(pw).blur(o.blur).modulate({ brightness: 0.96 }).toBuffer();
      const shade = Buffer.from(`<svg width="${pw}" height="${ph}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${o.shadow}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
      page = await sharp(page).composite([{ input: shade }]).png().toBuffer();
      const rot = await sharp(page).rotate(o.a, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      const m = await sharp(rot).metadata();
      const wood = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 128, g: 100, b: 78 } } }).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}">${Array.from({ length: 60 }, (_, i) => `<rect x="0" y="${i * 40}" width="${W}" height="${3 + (i % 4)}" fill="#000" opacity="${0.05 + (i % 3) * 0.03}"/>`).join('')}</svg>`) }]).png().toBuffer();
      const left = Math.max(0, Math.round((W - m.width) / 2)), top = Math.max(0, Math.round((H - m.height) / 2));
      await sharp(wood).composite([{ input: rot, left, top }]).jpeg({ quality: 78 }).toFile(`${OUT}/${k}-${lv}.jpg`);
    }
    if (L[k]) exp[k] = L[k].exp;
  }
  fs.writeFileSync(OUT + '/attendu.json', JSON.stringify(exp));
  await b.close(); console.log(fs.readdirSync(OUT).join(' '));
})();
