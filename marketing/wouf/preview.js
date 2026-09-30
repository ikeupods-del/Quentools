'use strict';
/* Envoie par e-mail l'APERÇU des 2 prochaines publications (celles de 7 h et 18 h du lendemain) : images et légendes.
   Lancé chaque soir par .github/workflows/apercu.yml. Variables : RESEND_API_KEY, MAIL_TO (secrets GitHub), IMAGE_BASE. Option : --dry (affiche sans envoyer). */
const fs = require('fs'), path = require('path');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function buildMail(items, base, remaining) {
  const url = f => base.replace(/\/?$/, '/') + encodeURIComponent(f), slots = ['🌅 Demain 7 h', '🌆 Demain 18 h'];
  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:auto"><h2>📅 Publications Instagram de demain</h2>
    <p style="color:#666">Elles partent toutes seules. Un changement à faire ? Dites-le à Claude avant l’heure (${remaining} publication(s) restent en réserve après celles-ci).</p>` +
    items.map((it, i) => `<hr><h3>${slots[i] || 'Ensuite'} — ${esc(it.id)}${it.type === 'carousel' ? ' (carrousel, ' + it.images.length + ' images)' : ''}</h3>` +
      it.images.map(f => `<img src="${esc(url(f))}" alt="${esc(f)}" style="max-width:100%;width:320px;border-radius:12px;margin:4px 4px 4px 0">`).join('') +
      `<pre style="white-space:pre-wrap;font-family:inherit;background:#f6f3ef;padding:12px;border-radius:8px">${esc(it.caption)}</pre>`).join('') + '</div>';
  const text = items.map((it, i) => `${slots[i] || 'Ensuite'} — ${it.id}\n${it.images.map(url).join('\n')}\n\n${it.caption}`).join('\n\n----------\n\n');
  return { subject: `Aperçu Instagram de demain : ${items.map(i => i.id).join(' + ')}`, html, text };
}

async function run({ queue, state, env = process.env, fetchFn = fetch, dry = false, log = console.log }) {
  const todo = queue.filter(q => !state.posted.includes(q.id));
  if (!todo.length) throw new Error('La file est vide : rien à prévisualiser.');
  const items = todo.slice(0, 2), mail = buildMail(items, env.IMAGE_BASE || '', todo.length - items.length);
  if (dry) { log(mail.subject + '\n\n' + mail.text); return { dry: true, mail }; }
  const to = env.MAIL_TO || 'wouf-contact@proton.me';   // par défaut : la boîte Proton de Wouf
  if (!env.RESEND_API_KEY) throw new Error('Configuration incomplète : secret RESEND_API_KEY requis.');
  const r = await fetchFn('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || 'Wouf <onboarding@resend.dev>', to: [to], subject: mail.subject, html: mail.html, text: mail.text }) });
  if (!r.ok) throw new Error('Envoi refusé par Resend (' + r.status + ') : ' + (await r.text()).slice(0, 200));
  log('✓ Aperçu envoyé : ' + mail.subject); return { sent: true, mail };
}

module.exports = { run, buildMail };
if (require.main === module) {
  const queue = JSON.parse(fs.readFileSync(path.join(__dirname, 'queue.json'), 'utf8')), sf = path.join(__dirname, 'state.json');
  run({ queue, state: fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : { posted: [] }, dry: process.argv.includes('--dry') }).catch(e => { console.error('✗ ' + e.message); process.exit(1); });
}
