'use strict';
/* Wouf — croissance : essai gratuit de Wouf Plus, parrainage, carte de l'animal à partager, rappels en arrière-plan.
   - Essai : billing.trialDays jours de Plus, une seule fois par carnet (S.trial, synchronisé avec le compte Google).
   - Parrainage : lien woufapp.fr/?parrain=CODE ; le code du filleul est mémorisé puis transmis avec son profil (wouf_users.referredBy) ;
     l'administration offre 1 mois aux deux en un appui.
   - Carte de l'animal : image 1080×1350 générée sur l'appareil (aucun envoi), partagée ou téléchargée.
   - Rappels en arrière-plan : la liste des échéances est confiée au service worker (cache « wouf-rappels ») ; sur Android, l'app installée
     peut alors prévenir même fermée (synchronisation périodique). Ailleurs : notification à l'ouverture et export agenda. */

/* ---------- Essai gratuit ---------- */
const TRIAL_DAYS = +(BILL.trialDays || 0);
const trialActive = () => !!(S.trial && S.trial.until && today() <= S.trial.until);
const trialAvailable = () => !!(BILL.enabled && TRIAL_DAYS > 0 && !S.trial && !subActive() && !isFreeWindow() && !grandfathered());
ACT['trial-start'] = async () => {
  if (!trialAvailable()) return;
  if (!(await ask(`Essayer Wouf Plus gratuitement pendant ${TRIAL_DAYS} jours ? Aucun paiement ni carte demandés : à la fin, Wouf repasse simplement en gratuit et vos données restent intactes.`, 'Commencer l’essai', false))) return;
  S.trial = { start: today(), until: addDays(today(), TRIAL_DAYS - 1) }; save(); closeAllSheets();
  if (typeof celebrate === 'function') celebrate('⭐ Essai Wouf Plus activé', `Toutes les fonctions Plus jusqu’au ${fmtDate(S.trial.until)}`); else toast('Essai activé ✓');
  render(true);
};
const trialCard = () => trialActive()
  ? `<section class="card note"><b>⭐ Essai Wouf Plus en cours</b><p>Toutes les fonctions Plus sont débloquées jusqu’au <b>${esc(fmtDate(S.trial.until))}</b>. Ensuite, Wouf repasse en gratuit : rien n’est prélevé, vos données restent.</p></section>`
  : trialAvailable() ? `<section class="card note"><b>🎁 Essayez Wouf Plus ${TRIAL_DAYS} jours</b><p>Gratuit, sans carte bancaire, sans engagement.</p><button class="btn primary" data-act="trial-start">Essayer gratuitement ${TRIAL_DAYS} jours</button></section>` : '';

/* ---------- Parrainage ---------- */
const REF_RE = /^[A-Z0-9]{6,10}$/;
(() => { try { const r = (new URLSearchParams(location.search).get('parrain') || '').toUpperCase(); if (REF_RE.test(r)) localStorage.setItem('wouf:ref', r); } catch (e) { /* ignore */ } })();
function refCode() {
  if (!S.refCode) { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; S.refCode = Array.from(crypto.getRandomValues(new Uint8Array(7)), x => a[x % a.length]).join(''); save(); }
  return S.refCode;
}
const referredBy = () => { try { const r = localStorage.getItem('wouf:ref') || ''; return REF_RE.test(r) && r !== S.refCode ? r : ''; } catch (e) { return ''; } };
const refLink = () => ((typeof SITE !== 'undefined' && SITE.home) || location.origin + location.pathname) + '?parrain=' + refCode();
ACT['ref-share'] = async () => {
  const url = refLink(), text = 'J’utilise Wouf pour le carnet de santé de mon animal (vaccins, rappels, éducation). Inscris-toi avec mon lien : on gagne chacun 1 mois de Wouf Plus 🐾';
  try { if (navigator.share) { await navigator.share({ title: 'Wouf', text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); toast('Lien copié ✓'); } catch (e) { toast(url); }
};
const refCard = () => BILL.enabled ? `<section class="card"><h2>🤝 Parrainez un ami</h2><p>Votre ami se connecte avec Google depuis votre lien : vous gagnez <b>chacun 1 mois de Wouf Plus</b>.</p>
  <div class="field"><input readonly value="${esc(refLink())}" aria-label="Votre lien de parrainage"></div><button class="btn primary" data-act="ref-share">Partager mon lien</button>
  <p class="mut small">Le mois offert est ajouté après vérification, sous quelques jours.</p></section>` : '';

/* ---------- Carte de l'animal à partager ---------- */
function loadImg(src) { return new Promise(r => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
async function petCard(d) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ff9f4f'); g.addColorStop(1, '#c85a14'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalAlpha = .08; x.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc((i * 173) % W, (i * 311) % H, 120 + (i % 3) * 60, 0, 7); x.fill(); } x.globalAlpha = 1;
  x.fillStyle = '#fff'; x.beginPath(); if (x.roundRect) x.roundRect(70, 150, W - 140, H - 300, 56); else x.rect(70, 150, W - 140, H - 300); x.fill();
  const img = await loadImg(d.photo), cx = W / 2, cy = 470, r = 230;
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
  if (img) { const s = Math.max(2 * r / img.width, 2 * r / img.height); x.drawImage(img, cx - img.width * s / 2, cy - img.height * s / 2, img.width * s, img.height * s); }
  else { x.fillStyle = '#fff5ec'; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); x.font = '220px "Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(spOf(d).emoji, cx, cy + 10); }
  x.restore(); x.lineWidth = 14; x.strokeStyle = '#f0782a'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = '#231f1b';
  let fs = 110; x.font = `800 ${fs}px system-ui,sans-serif`; while (x.measureText(d.name).width > W - 240 && fs > 50) { fs -= 6; x.font = `800 ${fs}px system-ui,sans-serif`; }
  x.fillText(d.name, cx, 860);
  x.font = '500 46px system-ui,sans-serif'; x.fillStyle = '#7b7268';
  const line = [d.breed || spOf(d).noun, d.birth ? ageText(d.birth) : ''].filter(Boolean).join(' · ');
  x.fillText(line.length > 42 ? line.slice(0, 41) + '…' : line, cx, 940);
  const ha = d.birth ? humanAgeOf(d) : null; if (ha) { x.font = '600 40px system-ui,sans-serif'; x.fillStyle = '#c85a14'; x.fillText(`≈ ${ha} ans en âge humain`, cx, 1010); }
  x.font = '800 54px system-ui,sans-serif'; x.fillStyle = '#fff'; x.fillText('Wouf 🐾', cx, H - 92); x.font = '600 32px system-ui,sans-serif'; x.fillText('Son carnet de santé sur woufapp.fr', cx, H - 46);
  return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', .92));
}
ACT['pet-card'] = async ({ id }) => {
  const d = S.dogs.find(x => x.id === id) || dog(); if (!d) return;
  toast('Création de la carte…'); const b = await petCard(d); if (!b) return toast('Impossible de créer l’image sur cet appareil');
  await shareOrDownload(new File([b], `${d.name.replace(/[^\p{L}\p{N}]+/gu, '-')}-wouf.jpg`, { type: 'image/jpeg' }), `Voici ${d.name} 🐾 Son carnet de santé est sur Wouf : woufapp.fr`);
};

/* ---------- Rappels en arrière-plan ---------- */
async function syncBackgroundReminders() {
  if (!('caches' in window)) return;
  try {
    const items = [];
    if (S.settings.notif) for (const d of S.dogs) for (const r of reminders(d.id)) if (r.days <= 30) items.push({ name: d.name, title: r.title, due: addDays(today(), r.days) });
    const c = await caches.open('wouf-rappels');
    await c.put('./__rappels.json', new Response(JSON.stringify({ on: !!S.settings.notif, items: items.slice(0, 40) }), { headers: { 'Content-Type': 'application/json' } }));
    const reg = await navigator.serviceWorker.getRegistration();
    if (S.settings.notif && reg && reg.periodicSync) {
      const st = await navigator.permissions.query({ name: 'periodic-background-sync' }).catch(() => ({ state: 'denied' }));
      if (st.state === 'granted') await reg.periodicSync.register('wouf-rappels', { minInterval: 12 * 3600e3 });
    } else if (reg && reg.periodicSync) await reg.periodicSync.unregister('wouf-rappels').catch(() => {});
  } catch (e) { /* navigateur sans prise en charge : notification à l'ouverture seulement */ }
}
const bgRemindersOk = () => 'serviceWorker' in navigator && 'periodicSync' in (ServiceWorkerRegistration.prototype || {});
