/* QuenTools — mise en page d'un devis, partagée par l'administration (/admin/) et l'espace client (/espace/).
   QTD.total(d)        : total des lignes (en euros).
   QTD.html(d)         : document HTML complet, prêt à imprimer ou enregistrer en PDF.
   QTD.open(d)         : ouvre le devis dans un nouvel onglet (bouton « Imprimer / PDF » inclus).
   d = { num, date (AAAA-MM-JJ), validite (jours), delai, acompte (%), notes, conditions,
         lignes: [{ l: désignation, q: quantité, pu: prix unitaire }],
         vendeur: { marque, titulaire, adresse, siren, email }, client: { nom, email } } */
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = +String(v ?? '').replace(',', '.'); return Number.isFinite(n) ? n : 0; };
  const eur = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const fdate = iso => { const t = Date.parse(iso); return t ? new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; };
  const plus = (iso, days) => { const t = Date.parse(iso); return t ? new Date(t + days * 864e5).toISOString().slice(0, 10) : ''; };
  const total = d => (d.lignes || []).reduce((s, x) => s + num(x.q || 1) * num(x.pu), 0);

  function html(d) {
    const v = d.vendeur || {}, c = d.client || {}, t = total(d), ac = Math.min(100, Math.max(0, num(d.acompte)));
    const rows = (d.lignes || []).filter(x => String(x.l || '').trim()).map(x => {
      const q = num(x.q || 1), pu = num(x.pu);
      return `<tr><td>${esc(x.l).replace(/\n/g, '<br>')}</td><td class="n">${q.toLocaleString('fr-FR')}</td><td class="n">${eur(pu)}</td><td class="n">${eur(q * pu)}</td></tr>`;
    }).join('');
    const nl = s => esc(s).replace(/\n/g, '<br>');
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
.tot{display:flex;justify-content:flex-end;margin-bottom:24px}.tot div{min-width:260px}
.tot p{display:flex;justify-content:space-between;gap:16px;margin:4px 0}.tot .big{font:800 22px/1.2 system-ui,sans-serif;border-top:2px solid #121019;padding-top:8px;margin-top:8px}
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
    <div class="box"><b class="l">Prestataire</b><b>${esc(v.marque || 'QuenTools')}</b><br>${esc(v.titulaire)}${v.adresse ? '<br>' + nl(v.adresse) : ''}${v.siren ? '<br>SIREN ' + esc(v.siren) : ''}${v.email ? '<br>' + esc(v.email) : ''}</div>
    <div class="box"><b class="l">Client</b><b>${esc(c.nom)}</b>${c.adresse ? '<br>' + nl(c.adresse) : ''}${c.email ? '<br>' + esc(c.email) : ''}</div>
  </div>
  <div class="tw"><table><thead><tr><th>Désignation</th><th class="n">Qté</th><th class="n">Prix unitaire</th><th class="n">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">Aucune ligne</td></tr>'}</tbody></table></div>
  <div class="tot"><div><p><span>Total HT</span><span>${eur(t)}</span></p><p class="muted"><span>TVA</span><span>non applicable</span></p>
    <p class="big"><span>Total à payer</span><span>${eur(t)}</span></p>${ac ? `<p class="muted"><span>Acompte à la commande (${ac} %)</span><span>${eur(t * ac / 100)}</span></p>` : ''}</div></div>
  <div class="cond">
    <p>TVA non applicable, article 293 B du CGI.</p>
    ${d.delai ? `<p><b>Délai de réalisation :</b> ${esc(d.delai)}</p>` : ''}
    <p><b>Paiement :</b> ${ac ? `acompte de ${ac} % à la commande, solde à la livraison.` : 'à la livraison.'}</p>
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
  window.QTD = { total, html, open, eur };
})();
