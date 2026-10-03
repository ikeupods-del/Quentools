/* QuenTools — garde d'accès d'un site client.
   Affiche une page « site momentanément indisponible » tant que le propriétaire de QuenTools a verrouillé ce site
   (paiement non réglé : suspension manuelle ou date limite dépassée, voir l'onglet « Sites clients » de /admin/).

   Installation sur un site client (après assets/qt-config.js) :
     <script src="https://quentools.fr/assets/qt-config.js"></script>
     <script src="https://quentools.fr/assets/qt-garde.js" data-site="identifiant-du-site" defer></script>

   Fonctionnement : lit le champ public « acces » du document Firestore qt_admin/config, par exemple
     { "naw-fruity": { "u": "2026-11-15" }, "autre-site": { "b": 1 } }
   « b » : site suspendu tout de suite ; « u » : suspendu après cette date. Aucun montant ni nom de client n'y figure.
   Si la lecture échoue (hors connexion, panne), le site reste ouvert : une panne ne doit jamais bloquer un client à jour.

   Limite à connaître : c'est un verrou côté navigateur. Il décourage un visiteur ordinaire, mais quelqu'un qui désactive
   JavaScript ou bloque ce script voit encore le site. Un verrou absolu se fait à l'hébergement (retirer la publication du site). */
(() => {
  const tag = document.currentScript, site = String((tag && tag.getAttribute('data-site')) || '').toLowerCase();
  const C = window.QT || {}, F = C.firebase || {};
  if (!/^[a-z0-9-]{2,40}$/.test(site) || !F.projectId || !F.apiKey) return;
  const memo = 'qt:garde:' + site;
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  let shown = null, obs = null;

  function block() {
    if (shown && document.contains(shown)) return;
    const wrap = document.createElement('div');
    wrap.id = 'qt-garde'; wrap.setAttribute('role', 'alertdialog'); wrap.setAttribute('aria-label', 'Site indisponible');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#f6f4ee;color:#121019;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center';
    const mail = C.email ? `<p style="margin:18px 0 0;font-size:14px;color:#555">Vous êtes le propriétaire de ce site ? <a href="mailto:${encodeURIComponent(C.email)}" style="color:#5b3df5">Contactez QuenTools</a>.</p>` : '';
    wrap.innerHTML = `<div style="max-width:440px"><div style="font-size:42px;line-height:1" aria-hidden="true">🔧</div><h1 style="font:700 24px/1.2 system-ui,sans-serif;margin:14px 0 8px">Ce site est momentanément indisponible</h1><p style="margin:0;color:#444">Merci de votre compréhension, il sera de nouveau accessible très bientôt.</p>${mail}</div>`;
    document.body.appendChild(wrap);
    document.documentElement.style.overflow = 'hidden';
    [...document.body.children].forEach(n => { if (n !== wrap && n.tagName !== 'SCRIPT') n.setAttribute('inert', ''); });
    shown = wrap;
    // si quelqu'un retire la page d'indisponibilité depuis les outils du navigateur, elle revient (verrou simple, voir la limite ci-dessus)
    obs = new MutationObserver(() => { if (shown === wrap && !document.contains(wrap)) { shown = null; block(); } });
    obs.observe(document.body, { childList: true });
  }
  function unblock() {
    if (obs) { obs.disconnect(); obs = null; }
    if (shown) { shown.remove(); shown = null; }
    document.documentElement.style.overflow = '';
    document.querySelectorAll('[inert]').forEach(n => n.removeAttribute('inert'));
  }
  const run = fn => document.body ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true });

  // dernier état connu : évite d'afficher le site un instant à un visiteur qui l'a déjà vu verrouillé
  try { if (localStorage.getItem(memo) === '1') run(block); } catch (e) { /* stockage indisponible */ }

  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 4000);
  fetch(`https://firestore.googleapis.com/v1/projects/${F.projectId}/databases/(default)/documents/qt_admin/config?key=${F.apiKey}`, { signal: ctl.signal })
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      clearTimeout(timer);
      if (!j || !j.fields) return;   // pas de réglages lisibles : on ne change rien
      let acces = {}; try { acces = JSON.parse((j.fields.acces && j.fields.acces.stringValue) || '{}') || {}; } catch (e) { acces = {}; }
      const e = acces[site], locked = !!e && (e.b === 1 || e.b === true || (typeof e.u === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.u) && today() > e.u));
      try { localStorage.setItem(memo, locked ? '1' : '0'); } catch (x) { /* ignore */ }
      run(locked ? block : unblock);
    })
    .catch(() => { clearTimeout(timer); /* panne ou hors connexion : le site reste tel quel */ });
})();
