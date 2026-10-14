/* Pack Commerçant — réservation en 4 étapes (prestation, jour, heure, coordonnées), acompte par lien de paiement. */
(() => {
  const P = window.PACK, S = window.PACKS, R = S.regles, O = S.outils, esc = window.PK.esc, $ = s => document.querySelector(s);
  const etat = { p: null, jour: null, heure: null, pris: [] };
  const JC = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], JL = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  $('#prest').innerHTML = P.prestations.map(p => `<label><input type="radio" name="p" value="${esc(p.id)}"><b>${esc(p.nom)}<small>${p.duree} min${R.acompte(p.prix) ? ' · acompte ' + O.euros(R.acompte(p.prix)) : ''}</small></b><span class="pr">${O.euros(p.prix)}</span></label>`).join('');
  $('#horaires').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(j => `<tr><th style="text-align:left;font-weight:600;padding:6px 0">${JL[j]}</th><td style="text-align:right;color:var(--muted)">${(P.horaires[j] || []).map(x => x.replace(/:/g, 'h').replace('-', ' – ')).join(', ') || 'Fermé'}</td></tr>`).join('');
  const tel = $('#lien-tel'); if (P.telephone) tel.href = 'tel:' + P.telephone.replace(/\s/g, ''); else tel.hidden = true;
  const avis = (P.avis || {}).lien; if (/^https:\/\//.test(avis || '')) $('#lien-avis').href = avis; else $('#bloc-avis').hidden = true;
  // Abonnement hébergé arrêté (essai terminé, pas d'abonnement) : la page reste visible, la réservation en ligne est suspendue.
  if (P.inactif) { $('#resa').outerHTML = `<p class="notice warn">La réservation en ligne est momentanément indisponible. Pour prendre rendez-vous, contactez-nous${P.telephone ? ' au <a href="tel:' + esc(P.telephone.replace(/\s/g, '')) + '">' + esc(P.telephone) + '</a>' : ''}.</p>`; return; }

  async function chargerPris() { try { etat.pris = await S.pris(); } catch (e) { etat.pris = []; } }
  function jours() {
    const p = R.prestation(etat.p), liste = R.joursOuverts().filter(d => R.creneauxDuJour(d, p.duree, etat.pris).length);
    $('#jours').innerHTML = liste.length ? liste.map(d => { const x = new Date(d + 'T12:00:00'); return `<button type="button" data-j="${d}" aria-pressed="${d === etat.jour}"><small>${JC[x.getDay()]}</small><b>${x.getDate()}</b><small>${x.toLocaleDateString('fr-FR', { month: 'short' })}</small></button>`; }).join('')
      : '<p class="pk-vide">Aucun créneau libre pour le moment : appelez-nous.</p>';
    $('#e-jour').hidden = false;
  }
  function heures() {
    const h = R.creneauxDuJour(etat.jour, R.prestation(etat.p).duree, etat.pris);
    $('#heures').innerHTML = h.map(x => `<button type="button" data-h="${x}" aria-pressed="${x === etat.heure}">${x.replace(':', 'h')}</button>`).join('') || '<p class="pk-vide">Ce jour vient d’être complet.</p>';
    $('#e-heure').hidden = false;
  }
  function recap() {
    const p = R.prestation(etat.p), a = R.acompte(p.prix);
    $('#recap').innerHTML = `<b>${esc(p.nom)}</b><span>${esc(O.dateLongue(etat.jour))} à ${etat.heure.replace(':', 'h')} · ${p.duree} min</span><span>${O.euros(p.prix)}${a ? ` dont <b>${O.euros(a)} d’acompte</b> à régler pour confirmer` : ''}</span>`;
    $('#e-coord').hidden = false;
  }
  $('#prest').addEventListener('change', async e => {
    etat.p = e.target.value; etat.jour = etat.heure = null; $('#e-heure').hidden = $('#e-coord').hidden = true;
    await chargerPris(); jours(); $('#e-jour').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('#jours').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; etat.jour = b.dataset.j; etat.heure = null; $('#e-coord').hidden = true; jours(); heures(); $('#e-heure').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  $('#heures').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; etat.heure = b.dataset.h; heures(); recap(); $('#e-coord').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });

  $('#resa').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#err'), nom = $('#nom').value.trim(), telv = $('#tel').value.trim(), mail = $('#email').value.trim();
    const faute = !nom ? 'Indiquez votre nom.' : telv.replace(/\D/g, '').length < 9 ? 'Indiquez un numéro de téléphone valide.' : mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) ? 'L’adresse e-mail semble incomplète.' : !$('#ok').checked ? 'Merci d’accepter les conditions.' : '';
    if (faute) { err.textContent = faute; err.hidden = false; return; }
    err.hidden = true; $('#go').disabled = true;
    const p = R.prestation(etat.p), a = R.acompte(p.prix);
    const r = { id: O.id(), prestationId: p.id, prestation: p.nom, prix: p.prix, duree: p.duree, date: etat.jour, heure: etat.heure, nom, tel: telv, email: mail, note: $('#note').value.trim(),
      acompte: a, acompteRecu: false, statut: 'attente', at: new Date().toISOString() };
    try { await S.reserver(r); }
    catch (x) {
      $('#go').disabled = false;
      if (x.message === 'pris') { err.textContent = 'Ce créneau vient d’être réservé par quelqu’un d’autre : choisissez-en un autre.'; err.hidden = false; await chargerPris(); etat.heure = null; heures(); $('#e-coord').hidden = true; return; }
      err.textContent = 'La réservation n’a pas pu être enregistrée. Vérifiez votre connexion ou appelez-nous.'; err.hidden = false; return;
    }
    const lien = R.lienPaiement(a) || (P.demo && a ? '#paiement-demo' : '');
    $('#resa').hidden = true;
    $('#fin').innerHTML = `<div class="card" style="display:grid;gap:var(--s-3)"><span class="chip chip-ok" style="justify-self:start">Demande enregistrée</span>
      <h3 style="margin:0">Merci ${esc(nom.split(' ')[0])} !</h3>
      <p style="margin:0">${esc(p.nom)}, ${esc(O.dateLongue(r.date))} à ${r.heure.replace(':', 'h')}.</p>
      ${a ? (lien ? `<p style="margin:0">Pour confirmer votre rendez-vous, réglez l’acompte de <b>${O.euros(a)}</b>. Il sera déduit du prix le jour J.</p><a class="btn btn-accent" id="payer" href="${esc(lien)}"${lien.startsWith('#') ? '' : ' target="_blank" rel="noopener"'}>Payer l’acompte de ${O.euros(a)}</a>`
        : `<p style="margin:0">Un acompte de <b>${O.euros(a)}</b> vous sera demandé pour confirmer : nous vous contactons rapidement.</p>`) : '<p style="margin:0">Votre rendez-vous est noté, à bientôt !</p>'}
      <p class="muted" style="margin:0;font-size:var(--t-sm)">${esc(P.annulation || '')} Pour annuler ou déplacer : ${esc(P.telephone || P.email || '')}.</p>
      <a href="carte/">Ouvrir ma carte de fidélité →</a></div>`;
    const pay = $('#payer'); if (pay && lien === '#paiement-demo') pay.addEventListener('click', ev => { ev.preventDefault(); pay.insertAdjacentHTML('afterend', '<p class="notice">Démonstration : ici, le client est envoyé vers la page de paiement sécurisée du commerçant (Stripe ou PayPal).</p>'); pay.remove(); });
    $('#fin').hidden = false; $('#fin').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
