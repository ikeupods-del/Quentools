/* Pack Commerçant — règles et données (réservation avec acompte, carte de fidélité, liens de rappel et d'avis).
   Deux stockages pour la même interface :
   - démonstration (PACK.firebase vide) : navigateur du visiteur (localStorage), site et administration partagés sur le même appareil ;
   - réel : Firestore du commerçant par son API web (sans bibliothèque). Réservation et créneaux écrits d'un seul coup
     (un créneau déjà pris fait échouer l'écriture : pas de double réservation). Administration avec le jeton de connexion Google. */
(() => {
  const P = window.PACK || {}, F = P.firebase || {};
  const reel = !!(F.projectId && F.apiKey);
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const min = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const hm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const euros = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0 }) + ' €';
  const id = (n = 12) => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(n)); return [...r].map(x => a[x % a.length]).join(''); };
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const dateLongue = s => { const d = new Date(s + 'T12:00:00'); return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; };

  /* ---------- Règles du commerce ---------- */
  const prestation = pid => (P.prestations || []).find(x => x.id === pid);
  function acompte(prix) {
    const a = P.acompte || {}; if (!a.valeur) return 0;
    return Math.min(prix, a.type === 'pourcent' ? Math.round(prix * a.valeur) / 100 : a.valeur);
  }
  // Lien de paiement : paypal.me reçoit le montant dans l'adresse ; un lien Stripe est utilisé tel quel (montant réglé dans Stripe).
  function lienPaiement(montant) {
    const l = String((P.acompte || {}).lien || '').trim(); if (!l || !montant) return '';
    if (/^https:\/\/(www\.)?paypal\.me\/[^/?#]+\/?$/i.test(l)) return l.replace(/\/$/, '') + '/' + String(montant).replace(',', '.') + 'EUR';
    return /^https:\/\//.test(l) ? l : '';
  }
  // Créneaux libres d'un jour pour une durée donnée : plages d'ouverture découpées au pas, sans chevaucher un créneau pris.
  function creneauxDuJour(date, duree, pris, maintenant = new Date()) {
    const d = new Date(date + 'T12:00:00'), jour = d.getDay() || 7, pas = P.pas || 30, occupe = new Set(pris.filter(c => c.date === date).map(c => c.heure));
    const limite = maintenant.getTime() + (P.delaiMin || 0) * 3600e3, res = [];
    for (const plage of (P.horaires || {})[jour] || []) {
      const [a, b] = plage.split('-').map(min);
      for (let t = a; t + duree <= b; t += pas) {
        const debut = new Date(`${date}T${hm(t)}:00`).getTime(); if (debut < limite) continue;
        let libre = true; for (let u = t; u < t + duree; u += pas) if (occupe.has(hm(u))) { libre = false; break; }
        if (libre) res.push(hm(t));
      }
    }
    return res;
  }
  function joursOuverts(maintenant = new Date()) {
    const res = []; const d = new Date(maintenant); d.setHours(12, 0, 0, 0);
    for (let i = 0; i < (P.jours || 21); i++) { const j = d.getDay() || 7; if (((P.horaires || {})[j] || []).length) res.push(iso(d)); d.setDate(d.getDate() + 1); }
    return res;
  }
  const casesDe = (heure, duree) => { const r = [], pas = P.pas || 30; for (let u = min(heure); u < min(heure) + duree; u += pas) r.push(hm(u)); return r; };

  /* ---------- Messages prêts à envoyer depuis le téléphone du commerçant ---------- */
  const telIntl = t => { const c = String(t || '').replace(/[^\d+]/g, ''); return c.startsWith('+') ? c.slice(1) : c.startsWith('0') ? '33' + c.slice(1) : c; };
  const messages = {
    rappel: r => `Bonjour ${r.nom}, petit rappel : votre rendez-vous « ${r.prestation} » chez ${P.nom} est prévu ${dateLongue(r.date)} à ${r.heure.replace(':', 'h')}. À bientôt !`,
    acompte: r => `Bonjour ${r.nom}, nous avons bien reçu votre acompte de ${euros(r.acompte)} pour votre rendez-vous du ${dateLongue(r.date)} à ${r.heure.replace(':', 'h')}. Merci et à bientôt chez ${P.nom} !`,
    avis: r => `Bonjour ${r.nom}, merci pour votre visite chez ${P.nom} ! Si vous avez un instant, votre avis nous aide beaucoup : ${(P.avis || {}).lien || ''}`.trim()
  };
  const whatsapp = (tel, texte) => `https://wa.me/${telIntl(tel)}?text=${encodeURIComponent(texte)}`;
  const sms = (tel, texte) => `sms:${String(tel || '').replace(/\s/g, '')}?&body=${encodeURIComponent(texte)}`;

  /* ---------- Stockage : démonstration ---------- */
  const KEY = 'pack:' + (P.nom || 'demo');
  const lire = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const ecrire = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* stockage indisponible */ } };
  const demo = {
    async pris() { return Object.values(lire().creneaux || {}); },
    async reserver(r) {
      const d = lire(); d.creneaux = d.creneaux || {}; d.rdv = d.rdv || {};
      const cases = casesDe(r.heure, r.duree);
      if (cases.some(h => d.creneaux[r.date + '_' + h])) throw new Error('pris');
      cases.forEach(h => { d.creneaux[r.date + '_' + h] = { date: r.date, heure: h, rdv: r.id }; });
      d.rdv[r.id] = r; ecrire(d); return r;
    },
    async carte(cid) { return (lire().cartes || {})[cid] || null; },
    async creerCarte(c) { const d = lire(); d.cartes = d.cartes || {}; d.cartes[c.id] = c; ecrire(d); return c; },
    admin: {
      async connexion() { return { email: 'demonstration' }; },
      async rdv() { return Object.values(lire().rdv || {}); },
      async majRdv(rid, champs) { const d = lire(); Object.assign(d.rdv[rid], champs); ecrire(d); },
      async liberer(r) { const d = lire(); casesDe(r.heure, r.duree).forEach(h => { if ((d.creneaux[r.date + '_' + h] || {}).rdv === r.id) delete d.creneaux[r.date + '_' + h]; }); ecrire(d); },
      async cartes() { return Object.values(lire().cartes || {}); },
      async majCarte(cid, champs) { const d = lire(); Object.assign(d.cartes[cid], champs); ecrire(d); }
    }
  };

  /* ---------- Stockage : Firestore (API web) ---------- */
  const racine = `projects/${F.projectId}/databases/(default)/documents`, api = `https://firestore.googleapis.com/v1/${racine}`;
  const enc = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v }
    : Number.isInteger(v) ? { integerValue: String(v) } : typeof v === 'number' ? { doubleValue: v } : { stringValue: String(v ?? '') }]));
  const dec = doc => { const o = { id: doc.name.split('/').pop() }; for (const [k, v] of Object.entries(doc.fields || {}))
    o[k] = 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : null; return o; };
  let jeton = null;
  async function appel(chemin, opts = {}) {
    const h = { 'Content-Type': 'application/json' }; if (jeton) h.Authorization = 'Bearer ' + (await jeton());
    const r = await fetch(api + chemin + (chemin.includes('?') ? '&' : '?') + 'key=' + F.apiKey, { ...opts, headers: h });
    if (r.status === 404) return null;
    if (!r.ok) { const e = new Error(r.status === 403 ? 'refuse' : 'erreur ' + r.status); e.status = r.status; throw e; }
    return r.status === 204 ? null : r.json();
  }
  const requete = async (col, filtre) => (await appel(':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], ...(filtre ? { where: { fieldFilter: filtre } } : {}), limit: 500 } }) }))
    .filter(x => x.document).map(x => dec(x.document));
  const firestore = {
    async pris() { return requete('creneaux', { field: { fieldPath: 'date' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: iso(new Date()) } }); },
    async reserver(r) {
      const ecritures = casesDe(r.heure, r.duree).map(h => ({ update: { name: `${racine}/creneaux/${r.date}_${h.replace(':', '')}`, fields: enc({ date: r.date, heure: h, rdv: r.id }) }, currentDocument: { exists: false } }));
      const { id: rid, ...champs } = r;
      ecritures.push({ update: { name: `${racine}/rdv/${rid}`, fields: enc(champs) }, currentDocument: { exists: false } });
      try { await appel(':commit', { method: 'POST', body: JSON.stringify({ writes: ecritures }) }); }
      catch (e) { if (e.status === 400 || e.status === 409 || e.status === 403) throw new Error('pris'); throw e; }
      return r;
    },
    async carte(cid) { const d = await appel('/cartes/' + encodeURIComponent(cid)); return d ? dec(d) : null; },
    async creerCarte(c) { const { id: cid, ...champs } = c; await appel('/cartes?documentId=' + cid, { method: 'POST', body: JSON.stringify({ fields: enc(champs) }) }); return c; },
    admin: {
      async connexion() {
        const B = 'https://www.gstatic.com/firebasejs/10.14.1/';
        const [{ initializeApp }, Au] = await Promise.all([import(B + 'firebase-app.js'), import(B + 'firebase-auth.js')]);
        const auth = Au.getAuth(initializeApp({ apiKey: F.apiKey, authDomain: F.authDomain || F.projectId + '.firebaseapp.com', projectId: F.projectId }));
        const u = auth.currentUser || (await Au.signInWithPopup(auth, new Au.GoogleAuthProvider())).user;
        jeton = () => u.getIdToken(); return { email: u.email };
      },
      async rdv() { return requete('rdv'); },
      async majRdv(rid, champs) { await appel(`/rdv/${rid}?` + Object.keys(champs).map(k => 'updateMask.fieldPaths=' + k).join('&'), { method: 'PATCH', body: JSON.stringify({ fields: enc(champs) }) }); },
      async liberer(r) { for (const h of casesDe(r.heure, r.duree)) await appel(`/creneaux/${r.date}_${h.replace(':', '')}`, { method: 'DELETE' }); },
      async cartes() { return requete('cartes'); },
      async majCarte(cid, champs) { await appel(`/cartes/${cid}?` + Object.keys(champs).map(k => 'updateMask.fieldPaths=' + k).join('&'), { method: 'PATCH', body: JSON.stringify({ fields: enc(champs) }) }); }
    }
  };

  window.PACKS = { reel, ...(reel ? firestore : demo), regles: { prestation, acompte, lienPaiement, creneauxDuJour, joursOuverts, casesDe },
    messages, whatsapp, sms, outils: { iso, euros, id, dateLongue, telIntl } };
})();
