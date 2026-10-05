/* QuenTools — calcul et mise en page d'un devis, partagés par l'administration (/admin/) et l'espace client (/espace/).
   QTD.calc(d)   : { rows, sub, remLines, remise, total, acompte, solde, rec }  (montants en euros, arrondis au centime)
   QTD.line(l)   : { brut, net, r }  pour une ligne
   QTD.total(d)  : total à payer (hors abonnement mensuel)
   QTD.html(d)   : document HTML complet, prêt à imprimer ou enregistrer en PDF
   QTD.open(d)   : ouvre le devis dans un nouvel onglet (bouton « Imprimer / PDF » inclus)
   d = { num, date (AAAA-MM-JJ), validite (jours), delai, acompte (%), notes, conditions,
         lignes: [{ l: désignation, q: quantité, pu: prix unitaire, rem: remise en %, m: true si abonnement mensuel }],
         remise: { type: 'pct' | 'eur', val, label },
         vendeur: { marque, titulaire, adresse, siren, email }, client: { nom, email, adresse } } */
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = +String(v ?? '').replace(',', '.'); return Number.isFinite(n) ? n : 0; };
  const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const eur = n => r2(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const fdate = iso => { const t = Date.parse(iso); return t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; };
  const plus = (iso, days) => { const t = Date.parse(iso); return t ? new Date(t + days * 864e5).toISOString().slice(0, 10) : ''; };

  const line = x => {
    const q = x.q === '' || x.q == null ? 1 : num(x.q), pu = num(x.pu), brut = q * pu, r = Math.min(100, Math.max(0, num(x.rem)));
    return { q, pu, brut: r2(brut), net: r2(brut * (1 - r / 100)), r };
  };
  function calc(d) {
    const rows = (d.lignes || []).filter(x => String(x.l || '').trim() || num(x.pu)).map(x => ({ ...x, ...line(x) }));
    let sub = 0, rec = 0, remLines = 0;
    rows.forEach(x => { if (x.m) rec += x.net; else { sub += x.net; remLines += x.brut - x.net; } });
    sub = r2(sub); rec = r2(rec); remLines = r2(remLines);
    const g = d.remise || {}, gv = num(g.val);
    let remise = !gv ? 0 : g.type === 'eur' ? gv : sub * Math.min(100, gv) / 100;
    remise = r2(Math.min(sub, Math.max(0, remise)));
    const total = r2(sub - remise), ac = Math.min(100, Math.max(0, num(d.acompte))), acompte = r2(total * ac / 100);
    return { rows, sub, remLines, remise, total, acompte, solde: r2(total - acompte), rec };
  }
  const total = d => calc(d).total;

  function html(d) {
    const v = d.vendeur || {}, c = d.client || {}, k = calc(d), ac = Math.min(100, Math.max(0, num(d.acompte)));
    const hasRem = k.rows.some(x => x.r > 0), nl = s => esc(s).replace(/\n/g, '<br>');
    const rows = k.rows.map(x => `<tr><td>${nl(x.l)}${x.m ? ' <span class="tag">par mois</span>' : ''}</td><td class="n">${x.q.toLocaleString('fr-FR')}</td><td class="n">${eur(x.pu)}</td>${hasRem ? `<td class="n">${x.r ? '− ' + x.r.toLocaleString('fr-FR') + ' %' : ''}</td>` : ''}<td class="n">${eur(x.net)}${x.m ? ' / mois' : ''}</td></tr>`).join('');
    const g = d.remise || {}, gLabel = esc(g.label || 'Remise') + (g.type !== 'eur' && num(g.val) ? ` (${num(g.val).toLocaleString('fr-FR')} %)` : '');
    const saved = r2(k.remise + k.remLines);
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Devis ${esc(d.num)} · ${esc(v.marque || 'QuenTools')}</title><meta name="robots" content="noindex">
<style>
*{box-sizing:border-box}body{margin:0;background:#efece3;color:#121019;font:14px/1.5 "Inter",system-ui,-apple-system,"Segoe UI",sans-serif}
.page{max-width:820px;margin:24px auto;background:#fff;padding:clamp(20px,5vw,56px);border-radius:16px}
.top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px;margin-bottom:32px}
.brand{display:flex;align-items:center;gap:10px;font:800 24px/1 system-ui,sans-serif;letter-spacing:-.02em}
.mark{width:36px;height:36px;border-radius:10px;background:#5b3df5;display:grid;place-items:center}
h1{font:800 30px/1.1 system-ui,sans-serif;margin:0 0 4px;letter-spacing:-.02em}.muted{color:#5c5868}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}@media(max-width:560px){.parties{grid-template-columns:1fr}}
.box{padding:16px;border:1px solid #e3dfd3;border-radius:12px}.box b.l{display:block;font-size:12px;color:#5c5868;font-weight:600;margin-bottom:4px}
.tw{overflow-x:auto}table{width:100%;border-collapse:collapse;margin-bottom:16px;min-width:480px}
th{text-align:left;font-size:12px;color:#5c5868;font-weight:600;border-bottom:2px solid #121019;padding:8px 6px}
td{padding:10px 6px;border-bottom:1px solid #e3dfd3;vertical-align:top}.n{text-align:right;white-space:nowrap}
.tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px;background:#ece8ff;color:#4527d6;white-space:nowrap}
.tot{display:flex;justify-content:flex-end;margin-bottom:24px}.tot div{min-width:280px}
.tot p{display:flex;justify-content:space-between;gap:16px;margin:4px 0}.tot .big{font:800 22px/1.2 system-ui,sans-serif;border-top:2px solid #121019;padding-top:8px;margin-top:8px}
.tot .ok{color:#127a55;font-weight:600}
.cond{font-size:12.5px;color:#3b3848}.cond p{margin:4px 0}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}.sign .box{min-height:110px}
.bar{max-width:820px;margin:16px auto 0;display:flex;gap:8px;justify-content:flex-end;padding:0 12px}
.bar button{font:600 14px/1 system-ui,sans-serif;padding:12px 18px;border-radius:999px;border:0;background:#5b3df5;color:#fff;cursor:pointer;min-height:44px}
@media print{body{background:#fff}.page{margin:0;padding:0;max-width:none;border-radius:0}.bar{display:none}table{min-width:0}@page{margin:16mm}}
</style></head><body>
<div class="bar"><button onclick="print()">Imprimer / enregistrer en PDF</button></div>
<main class="page">
  <div class="top"><div><div class="brand"><span class="mark"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><circle cx="30" cy="30" r="14" fill="none" stroke="#fff" stroke-width="7"/><path d="M37 37l12 12" stroke="#d7f24a" stroke-width="8" stroke-linecap="round"/></svg></span>${esc(v.marque || 'QuenTools')}</div></div>
    <div style="text-align:right"><h1>Devis</h1><div class="muted">N° ${esc(d.num || '—')}<br>Émis le ${fdate(d.date)}${d.validite ? `<br>Valable jusqu’au ${fdate(plus(d.date, num(d.validite)))}` : ''}</div></div></div>
  <div class="parties">
    <div class="box"><b class="l">Prestataire</b><b>${esc(v.marque || 'QuenTools')}</b><br>${esc(v.titulaire)}${v.adresse ? '<br>' + nl(v.adresse) : ''}${v.siren ? '<br>' + (String(v.siren).replace(/\D/g, '').length === 14 ? 'SIRET ' : 'SIREN ') + esc(v.siren) : ''}${v.email ? '<br>' + esc(v.email) : ''}</div>
    <div class="box"><b class="l">Client</b><b>${esc(c.nom)}</b>${c.adresse ? '<br>' + nl(c.adresse) : ''}${c.email ? '<br>' + esc(c.email) : ''}</div>
  </div>
  <div class="tw"><table><thead><tr><th>Désignation</th><th class="n">Qté</th><th class="n">Prix unitaire</th>${hasRem ? '<th class="n">Remise</th>' : ''}<th class="n">Total</th></tr></thead><tbody>${rows || `<tr><td colspan="${hasRem ? 5 : 4}" class="muted">Aucune ligne</td></tr>`}</tbody></table></div>
  <div class="tot"><div>
    ${k.remise || k.remLines ? `<p><span>Sous-total${k.remLines ? ' (après remises par ligne)' : ''}</span><span>${eur(k.sub)}</span></p>` : ''}
    ${k.remise ? `<p><span>${gLabel}</span><span>− ${eur(k.remise)}</span></p>` : ''}
    <p class="muted"><span>Total HT</span><span>${eur(k.total)}</span></p><p class="muted"><span>TVA</span><span>non applicable</span></p>
    <p class="big"><span>Total à payer</span><span>${eur(k.total)}</span></p>
    ${saved ? `<p class="ok"><span>Vous économisez</span><span>${eur(saved)}</span></p>` : ''}
    ${ac ? `<p class="muted"><span>Acompte à la commande (${ac} %)</span><span>${eur(k.acompte)}</span></p><p class="muted"><span>Solde à la livraison</span><span>${eur(k.solde)}</span></p>` : ''}
    ${k.rec ? `<p><span>Abonnement mensuel (en plus)</span><span>${eur(k.rec)} / mois</span></p>` : ''}
  </div></div>
  <div class="cond">
    <p>TVA non applicable, article 293 B du CGI.</p>
    ${d.delai ? `<p><b>Délai de réalisation :</b> ${esc(d.delai)}</p>` : ''}
    <p><b>Paiement :</b> ${ac ? `acompte de ${ac} % à la commande, solde à la livraison.` : 'à la livraison.'}${k.rec ? ' L’abonnement mensuel est facturé chaque mois.' : ''}</p>
    ${d.conditions ? `<p>${nl(d.conditions)}</p>` : ''}
    ${d.notes ? `<p><b>Remarques :</b> ${nl(d.notes)}</p>` : ''}
  </div>
  <div class="sign"><div class="box"><b class="l">Le prestataire</b>${esc(v.marque || 'QuenTools')}</div><div class="box"><b class="l">Le client — date et signature, précédées de « Bon pour accord »</b></div></div>
</main></body></html>`;
  }

  function open(d) {
    const url = URL.createObjectURL(new Blob([html(d)], { type: 'text/html;charset=utf-8' }));
    const w = window.open(url, '_blank');
    if (!w) location.href = url;   // fenêtres bloquées : ouverture dans l'onglet courant
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  window.QTD = { calc, line, total, html, open, eur };
})();
