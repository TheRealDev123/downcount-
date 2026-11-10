'use strict';
/* Downcount v2 — live countdowns you can style, share and embed. */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const notice = $('#app-notice');
const modalRoot = $('#modal-root');
const installButton = $('#install-app');
const themeButton = $('#theme-toggle');
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STORAGE_KEY = 'downcount.events.v1';
const ALERT_KEY = 'downcount.alerts.v1';
const THEME_KEY = 'downcount.theme.v2';
const DAY = 864e5;
const STYLES = { classic: 'Classic', sunset: 'Sunset', ocean: 'Ocean', forest: 'Forest', neon: 'Neon', mono: 'Mono' };
const EMOJIS = ['🎉', '✈️', '🎂', '🏖️', '🎄', '💍', '🎓', '⚽', '🎮', '🚀', '❤️', '✨'];
const DEFAULT_TITLE = document.title;
const IS_EMBED = location.hash.startsWith('#/embed');
if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) document.documentElement.classList.add('standalone');

let ticker, installPrompt, noticeTimer, liveTitle = null;

/* ---------- storage ---------- */
function readJson(key, fallback) { try { const parsed = JSON.parse(localStorage.getItem(key)); return parsed ?? fallback; } catch { return fallback; } }
function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } }
const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
function normalize(raw) {
  const end = Number(raw.end);
  const name = String(raw.name).trim().slice(0, 70);
  const start = Number(raw.start);
  return {
    id: raw.id || 'l' + end.toString(36) + name.length,
    name, end,
    start: Number.isFinite(start) && start > 0 ? start : 0,
    emoji: String(raw.emoji || '✨').slice(0, 8),
    style: STYLES[raw.style] ? raw.style : 'classic'
  };
}
function readEvents() { return readJson(STORAGE_KEY, []).filter((e) => e && e.name && Number.isFinite(Number(e.end))).map(normalize); }
function saveEvents(list) { writeJson(STORAGE_KEY, list.slice(0, 60)); }
function upsertEvent(ev) {
  const list = readEvents().filter((e) => e.id !== ev.id && !(e.name === ev.name && e.end === ev.end));
  list.unshift(ev); saveEvents(list); return ev;
}
const findByNameEnd = (name, end) => readEvents().find((e) => e.name === name && e.end === end);

/* ---------- helpers ---------- */
function showNotice(message, action) {
  notice.textContent = '';
  const span = document.createElement('span'); span.textContent = message; notice.append(span);
  if (action) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = action.label;
    b.addEventListener('click', () => { notice.hidden = true; action.fn(); });
    notice.append(b);
  }
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, action ? 7000 : 4000);
}
const buzz = () => { try { navigator.vibrate && navigator.vibrate(10); } catch { /* ignore */ } };
const pad = (n) => String(n).padStart(2, '0');
function parts(ms) { const t = Math.floor(ms / 1000); return { days: Math.floor(t / 86400), hours: Math.floor(t % 86400 / 3600), minutes: Math.floor(t % 3600 / 60), seconds: t % 60 }; }
function shortLeft(ms) {
  if (ms <= 0) return 'Ended';
  const p = parts(ms);
  if (p.days >= 1) return `${p.days}d ${p.hours}h`;
  if (p.hours >= 1) return `${p.hours}h ${p.minutes}m`;
  return `${p.minutes}m ${pad(p.seconds)}s`;
}
function agoText(ms) {
  const p = parts(Math.max(0, ms));
  if (p.days) return `${p.days}d ${p.hours}h ago`;
  if (p.hours) return `${p.hours}h ${p.minutes}m ago`;
  if (p.minutes) return `${p.minutes}m ago`;
  return 'just now';
}
const fmtDate = (end) => new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(Number(end)));
const fmtShort = (end) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Number(end)));
const slugify = (n) => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'my-countdown';
const baseUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
function paramString(ev, extra = {}) {
  const p = new URLSearchParams({ name: ev.name, end: String(ev.end), style: ev.style, emoji: ev.emoji });
  if (ev.start) p.set('s', String(ev.start));
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}
const countdownHash = (ev) => `/countdown/${slugify(ev.name)}?${paramString(ev)}`;
const countdownUrl = (ev) => `${baseUrl()}${location.search}#${countdownHash(ev)}`;
function parseHash() {
  const h = location.hash.slice(1) || '/';
  const i = h.indexOf('?');
  return { path: i < 0 ? h : h.slice(0, i), params: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) };
}
function evFromParams(p) {
  const name = (p.get('name') || '').trim().slice(0, 70);
  const end = Number(p.get('end'));
  if (!name || !Number.isFinite(end) || end <= 0) return null;
  return normalize({ name, end, start: Number(p.get('s')) || 0, emoji: p.get('emoji') || '', style: p.get('style') || '' });
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.append(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove(); return ok;
  }
}
function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------- the live widget (used on pages, in share preview and in embeds) ---------- */
function widgetHtml(ev, o = {}) {
  const { title = true, credit = false, size = 'wide' } = o;
  const units = ['days', 'hours', 'minutes', 'seconds'].map((u) => `<div class="digit"><strong data-unit="${u}">00</strong><small>${u[0].toUpperCase() + u.slice(1)}</small></div>`).join('');
  return `<div class="widget s-${ev.style}${size === 'compact' ? ' compact' : ''}" data-end="${ev.end}" data-start="${ev.start || 0}">`
    + (title ? `<div class="w-head"><span class="w-emoji" aria-hidden="true">${esc(ev.emoji)}</span><h2>${esc(ev.name)}</h2></div>` : '')
    + `<p class="w-date">${esc(fmtDate(ev.end))}</p><div class="digits" role="timer" aria-label="Time remaining">${units}</div>`
    + `<div class="w-bar" aria-hidden="true"><i></i></div><p class="w-status" data-status></p>`
    + (credit ? `<a class="w-credit" href="${esc(countdownUrl(ev))}" target="_blank" rel="noopener">Made with Downcount ↗</a>` : '')
    + '</div>';
}
function tickWidget(w, now) {
  const end = Number(w.dataset.end);
  const startRaw = Number(w.dataset.start);
  const start = startRaw > 0 && startRaw < end ? startRaw : end - 30 * DAY;
  const remaining = Math.max(0, end - now);
  const p = parts(remaining);
  for (const u in p) { const el = w.querySelector(`[data-unit="${u}"]`); const v = pad(p[u]); if (el && el.textContent !== v) el.textContent = v; }
  const pct = Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
  const bar = w.querySelector('.w-bar i'); if (bar) bar.style.width = pct + '%';
  const status = w.querySelector('[data-status]');
  if (status) {
    status.textContent = remaining > 0
      ? (remaining < DAY ? 'Happening within a day — almost there!' : `${Math.round(pct)}% of the wait is over`)
      : `🎉 It’s here! Started ${agoText(now - end)}`;
  }
  if (remaining === 0) {
    if (!w.classList.contains('done')) { w.classList.add('done'); if (now - end < 15000) confetti(); }
  } else w.classList.remove('done');
}
function tickAll() {
  const now = Date.now();
  $$('.widget').forEach((w) => tickWidget(w, now));
  $$('[data-live]').forEach((el) => {
    const r = Number(el.dataset.live) - now;
    el.textContent = shortLeft(r);
    el.classList.toggle('soon', r > 0 && r < DAY);
    el.classList.toggle('ended', r <= 0);
  });
  $$('[data-stat]').forEach((el) => {
    const rem = Math.max(0, Number(el.dataset.end) - now);
    const div = { weeks: 6048e5, days: DAY, hours: 36e5, minutes: 6e4 }[el.dataset.stat];
    const v = Math.floor(rem / div).toLocaleString();
    if (el.textContent !== v) el.textContent = v;
  });
  if (liveTitle) {
    const r = liveTitle.end - now;
    document.title = r > 0 ? `${shortLeft(r)} · ${liveTitle.name}` : `🎉 ${liveTitle.name} is here!`;
  }
}
// Ticks exactly on the second so every countdown stays in sync with the clock.
function startTicker() {
  clearTimeout(ticker);
  const loop = () => { tickAll(); ticker = setTimeout(loop, 1000 - (Date.now() % 1000) + 10); };
  loop();
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; document.body.append(c);
  const ctx = c.getContext('2d'); const W = c.width = innerWidth; const H = c.height = innerHeight;
  const colors = ['#6d5dfc', '#ff5a5f', '#ffb347', '#22d3ee', '#22c55e', '#ff3d81'];
  const bits = Array.from({ length: 150 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, r: 4 + Math.random() * 5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.random() * colors.length | 0] }));
  let frames = 0;
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) { b.x += b.vx; b.y += b.vy; b.rot += b.vr; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = b.c; ctx.fillRect(-b.r, -b.r / 2, b.r * 2, b.r); ctx.restore(); }
    if (++frames < 260) requestAnimationFrame(draw); else c.remove();
  })();
}

/* ---------- home ---------- */
const FEATURES = [
  ['✍️', 'Name your moment', 'Pick a name, an emoji and a look that makes you smile.'],
  ['⏱️', 'Truly live', 'Every countdown ticks in real time and stays in sync across tabs.'],
  ['🔗', 'Share it', 'Send a link, or tap a share button for WhatsApp, X, email and more.'],
  ['🧩', 'Embed it', 'Copy one line of code and drop the countdown into any website.'],
  ['🎨', 'Six looks', 'Classic, Sunset, Ocean, Forest, Neon and Mono — pick one per share.'],
  ['📅', 'Add to calendar', 'Download an .ics file for Apple, Google or Outlook calendars.'],
  ['🔔', 'Get a reminder', 'Allow notifications to be alerted the moment a countdown ends.'],
  ['📲', 'Install it', 'Add Downcount to your home screen. It works offline too.']
];
function cardHtml(ev) {
  return `<article class="saved-card s-${ev.style}" data-id="${esc(ev.id)}"><a class="card-main" href="#${esc(countdownHash(ev))}"><span class="card-emoji" aria-hidden="true">${esc(ev.emoji)}</span><span class="card-text"><strong class="saved-title">${esc(ev.name)}</strong><small>${esc(fmtShort(ev.end))}</small></span><span class="chip" data-live="${ev.end}"></span></a><div class="saved-actions"><button type="button" data-act="share">Share</button><button type="button" data-act="edit">Edit</button><button type="button" data-act="remove" class="remove-event">Delete</button></div></article>`;
}
function renderHome() {
  const events = readEvents();
  if (!events.length) {
    const demo = normalize({ name: 'Summer vacation', end: Date.now() + ((12 * 24 + 8) * 3600 + 34 * 60 + 56) * 1000, start: Date.now() - 20 * DAY, emoji: '🏖️', style: 'classic' });
    app.innerHTML = `<section class="hero"><div><div class="eyebrow"><span class="eyebrow-dot"></span> A LITTLE SOMETHING TO LOOK FORWARD TO</div><h1>Good things are <span>counting down.</span></h1><p class="hero-copy">Create a live countdown for a big day, a little adventure, or anything you can’t wait for. Share the link or embed it on your own site.</p><a class="button" href="#/create">Create your countdown <span aria-hidden="true">→</span></a><p class="small-note">No account needed. Your countdowns are saved on this device.</p></div><div class="preview-wrap" aria-hidden="true"><div class="preview-glow"></div><div class="preview">${widgetHtml(demo)}</div></div></section><section class="features" aria-label="Downcount features">${FEATURES.map(([i, t, d]) => `<article class="feature"><div class="feature-icon">${i}</div><div><h3>${t}</h3><p>${d}</p></div></article>`).join('')}</section>`;
    return;
  }
  const now = Date.now();
  const up = events.filter((e) => e.end > now).sort((a, b) => a.end - b.end);
  const done = events.filter((e) => e.end <= now).sort((a, b) => b.end - a.end);
  const next = up[0];
  const section = (label, list) => list.length ? `<section class="saved-section"><div class="section-heading"><h2>${label}</h2></div><div class="saved-grid">${list.map(cardHtml).join('')}</div></section>` : '';
  app.innerHTML = `<section class="next-up"><div class="section-heading"><div><span class="eyebrow">${next ? 'NEXT UP' : 'YOUR COUNTDOWNS'}</span></div><a class="text-link" href="#/create">＋ New countdown</a></div>${next ? `<a class="next-link" href="#${esc(countdownHash(next))}" aria-label="Open ${esc(next.name)}">${widgetHtml(next)}</a>` : ''}</section>${section('Upcoming', up.slice(1))}${section('Finished', done)}`;
}
app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const card = b.closest('[data-id]'); const ev = card && readEvents().find((x) => x.id === card.dataset.id); if (!ev) return;
  if (b.dataset.act === 'share') openShare(ev);
  else if (b.dataset.act === 'edit') location.hash = `/edit/${encodeURIComponent(ev.id)}`;
  else if (b.dataset.act === 'remove') removeEvent(ev);
});
function removeEvent(ev) {
  const before = readEvents();
  saveEvents(before.filter((e) => e.id !== ev.id));
  buzz(); route();
  showNotice(`Deleted “${ev.name}”.`, { label: 'Undo', fn: () => { saveEvents(before); route(); } });
}

/* ---------- create / edit ---------- */
function renderForm(existing) {
  const editing = !!existing;
  const st = { emoji: existing ? existing.emoji : EMOJIS[0], style: existing ? existing.style : 'classic' };
  const localDate = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  app.innerHTML = `<section class="page wide"><a class="back" href="#/">← Back</a><div class="form-grid"><div class="form-card"><h1>${editing ? 'Edit countdown' : 'Create a countdown'}</h1><p>What are you looking forward to? Pick a name, a date and a look.</p>${editing ? '' : '<div class="presets"><span>Quick picks:</span><button type="button" data-preset="1">Tomorrow</button><button type="button" data-preset="7">In a week</button><button type="button" data-preset="30">In a month</button></div>'}<form id="countdown-form"><div class="field"><label for="event-name">What should we count down to?</label><input id="event-name" name="name" type="text" maxlength="70" placeholder="e.g. Our trip to Paris" value="${existing ? esc(existing.name) : ''}" required><span class="field-hint">Keep it short and make it yours.</span></div><div class="field"><label for="event-date">When does it happen?</label><input id="event-date" name="date" type="datetime-local" required><span class="field-hint">Time is based on your device’s local time zone.</span></div><div class="field"><label>Emoji</label><div class="emoji-row">${EMOJIS.map((m) => `<button type="button" data-emoji="${m}" aria-label="Emoji ${m}">${m}</button>`).join('')}</div></div><div class="field"><label>Look</label><div class="style-row">${Object.entries(STYLES).map(([id, n]) => `<button type="button" class="style-chip s-${id}" data-style="${id}"><i></i>${n}</button>`).join('')}</div></div><p class="form-error" id="form-error" role="alert"></p><button class="button" type="submit">${editing ? 'Save changes' : 'Make my countdown'} <span aria-hidden="true">→</span></button></form></div><aside class="preview-pane"><span class="eyebrow">LIVE PREVIEW</span><div id="form-preview"></div></aside></div></section>`;
  const nameInput = $('#event-name'); const dateInput = $('#event-date');
  if (existing) dateInput.value = localDate(new Date(existing.end)); else dateInput.min = localDate(new Date());
  const sync = () => {
    $$('[data-emoji]').forEach((b) => b.classList.toggle('on', b.dataset.emoji === st.emoji));
    $$('[data-style]', app).forEach((b) => b.classList.toggle('on', b.dataset.style === st.style));
    const end = new Date(dateInput.value).getTime();
    const ev = { name: nameInput.value.trim() || 'Your countdown', end: Number.isFinite(end) ? end : Date.now() + 3 * DAY, start: Date.now(), emoji: st.emoji, style: st.style };
    $('#form-preview').innerHTML = widgetHtml(ev); tickAll();
  };
  nameInput.addEventListener('input', sync); dateInput.addEventListener('input', sync);
  $$('[data-emoji]').forEach((b) => b.addEventListener('click', () => { st.emoji = b.dataset.emoji; buzz(); sync(); }));
  $$('[data-style]', app).forEach((b) => b.addEventListener('click', () => { st.style = b.dataset.style; buzz(); sync(); }));
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const d = new Date(); d.setDate(d.getDate() + Number(b.dataset.preset)); d.setHours(9, 0, 0, 0); dateInput.value = localDate(d); sync();
  }));
  $('#countdown-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim(); const end = new Date(dateInput.value).getTime(); const error = $('#form-error');
    if (!name || !Number.isFinite(end) || (!editing && end <= Date.now())) { error.textContent = 'Please enter a name and choose a future date and time.'; error.style.display = 'block'; return; }
    const ev = normalize({ id: existing ? existing.id : newId(), name, end, start: existing && existing.end === end ? existing.start : Date.now(), emoji: st.emoji, style: st.style });
    upsertEvent(ev); buzz();
    location.hash = countdownHash(ev);
  });
  sync();
}

/* ---------- countdown page ---------- */
function renderCountdown() {
  const ev = evFromParams(parseHash().params);
  if (!ev) {
    app.innerHTML = '<section class="page not-found"><h1>Countdown not found</h1><p>This link doesn’t look right. Create a countdown and share its link with your friends.</p><a class="button" href="#/create">Create a countdown</a></section>'; return;
  }
  let stored = findByNameEnd(ev.name, ev.end);
  if (!stored) stored = upsertEvent(normalize({ ...ev, id: newId(), start: ev.start || Date.now() }));
  liveTitle = { end: ev.end, name: ev.name };
  app.innerHTML = `<section class="page"><a class="back" href="#/">← My countdowns</a><div class="stage">${widgetHtml(ev)}<button class="stage-fs" id="fs" type="button" aria-label="Full screen" title="Full screen">⛶</button></div><div class="action-row"><button class="button" id="share" type="button">↗ Share</button><button class="button secondary-button" id="remind-me" type="button">🔔 Remind me</button><button class="button secondary-button" id="add-cal" type="button">📅 Calendar</button></div><div class="stats">${['weeks', 'days', 'hours', 'minutes'].map((u) => `<div class="stat"><strong data-stat="${u}" data-end="${ev.end}">0</strong><small>Total ${u}</small></div>`).join('')}</div><div class="countdown-actions"><a href="#/edit/${encodeURIComponent(stored.id)}">✎ Edit</a><a href="#/create">＋ Create another</a></div></section>`;
  $('#share').addEventListener('click', () => openShare(ev));
  $('#remind-me').addEventListener('click', () => enableReminder(ev));
  $('#add-cal').addEventListener('click', () => addToCalendar(ev));
  $('#fs').addEventListener('click', () => {
    const stage = $('.stage');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => showNotice('Full screen isn’t available here.'));
    else showNotice('Full screen isn’t supported on this device.');
  });
}
function addToCalendar(ev) {
  const f = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const t = (s) => s.replace(/\\/g, '\\\\').replace(/[;,]/g, '\\$&').replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Downcount//EN', 'BEGIN:VEVENT', `UID:${ev.end}-${slugify(ev.name)}@downcount`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(ev.end)}`, `DTEND:${f(ev.end + 36e5)}`, `SUMMARY:${t(ev.emoji + ' ' + ev.name)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download(`${slugify(ev.name)}.ics`, ics, 'text/calendar'); showNotice('Calendar file downloaded.');
}
function renderEmbed() {
  const p = parseHash().params; const ev = evFromParams(p);
  if (!ev) { app.innerHTML = '<p class="embed-error">Countdown not found</p>'; return; }
  document.title = ev.name;
  app.innerHTML = widgetHtml(ev, { title: p.get('title') !== '0', credit: true, size: p.get('size') === 'compact' ? 'compact' : 'wide' });
}

/* ---------- share modal: pick a look, then link or embed ---------- */
function embedCode(ev, st) {
  const compact = st.size === 'compact';
  const h = compact ? (st.title ? 190 : 150) : (st.title ? 310 : 240);
  const w = compact ? 360 : 640;
  if (st.fmt === 'script') {
    return `<script async src="${esc(baseUrl())}embed.js" data-name="${esc(ev.name)}" data-end="${ev.end}"${ev.start ? ` data-start="${ev.start}"` : ''} data-style="${ev.style}" data-emoji="${esc(ev.emoji)}" data-title="${st.title ? 1 : 0}" data-size="${st.size}"></script>`;
  }
  const src = `${baseUrl()}#/embed?${paramString(ev, { title: st.title ? '1' : '0', size: st.size })}`;
  return `<iframe src="${esc(src)}" title="${esc(ev.name)}" width="100%" height="${h}" style="border:0;max-width:${w}px;border-radius:20px" loading="lazy"></iframe>`;
}
function closeModal() { modalRoot.textContent = ''; document.body.classList.remove('modal-open'); }
function openShare(ev) {
  closeModal();
  const st = { style: ev.style, tab: 'link', size: 'wide', title: true, fmt: 'iframe' };
  const root = document.createElement('div'); root.className = 'modal-backdrop';
  root.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><div class="modal-head"><h2 id="share-title">Share this countdown</h2><button class="icon-button" type="button" data-close aria-label="Close">✕</button></div><div id="share-body"></div></div>';
  modalRoot.append(root); document.body.classList.add('modal-open');
  const body = $('#share-body', root);
  const draw = () => {
    const cur = { ...ev, style: st.style };
    const url = countdownUrl(cur); const text = `Countdown to ${ev.name} ${ev.emoji}`;
    const emb = st.tab === 'embed';
    const linkPane = `<div class="share-box"><input id="share-field" aria-label="Shareable countdown link" readonly value="${esc(url)}"><button type="button" data-copy="#share-field">Copy link</button></div><div class="share-apps">${navigator.share ? '<button type="button" data-native>Share…</button>' : ''}<a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}">WhatsApp</a><a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}">X</a><a href="mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(text + '\n' + url)}">Email</a><a href="sms:?&body=${encodeURIComponent(text + ' ' + url)}">Message</a></div><p class="share-hint">Anyone with this link sees the countdown in the look you picked.</p>`;
    const seg = (attr, cur2, opts) => `<div class="seg small">${opts.map(([v, l]) => `<button type="button" data-${attr}="${v}" class="${cur2 === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const embedPane = `<div class="opt-row"><span>Format</span>${seg('fmt', st.fmt, [['iframe', 'iframe'], ['script', 'Script']])}</div><div class="opt-row"><span>Size</span>${seg('size', st.size, [['wide', 'Wide'], ['compact', 'Compact']])}</div><div class="opt-row"><span>Show title</span><button type="button" class="toggle${st.title ? ' on' : ''}" role="switch" aria-checked="${st.title}" aria-label="Show title" data-toggle-title></button></div><textarea id="embed-code" aria-label="Embed code" rows="5" readonly>${esc(embedCode(cur, st))}</textarea><button class="button" type="button" data-copy="#embed-code">Copy embed code</button><p class="share-hint">Paste this into your page’s HTML where you want the countdown to appear. It keeps ticking live.</p>`;
    body.innerHTML = `<div class="share-preview">${widgetHtml(cur, { title: emb ? st.title : true, size: emb ? st.size : 'wide' })}</div><div class="field-label">Pick a look</div><div class="style-row">${Object.entries(STYLES).map(([id, n]) => `<button type="button" class="style-chip s-${id}${st.style === id ? ' on' : ''}" data-pick="${id}" aria-pressed="${st.style === id}"><i></i>${n}</button>`).join('')}</div><div class="seg tabs"><button type="button" data-tab="link" class="${emb ? '' : 'on'}">🔗 Link</button><button type="button" data-tab="embed" class="${emb ? 'on' : ''}">&lt;/&gt; Embed</button></div>${emb ? embedPane : linkPane}`;
    tickAll();
  };
  root.addEventListener('click', async (e) => {
    const t = e.target;
    if (t === root || t.closest('[data-close]')) { closeModal(); return; }
    const pick = t.closest('[data-pick]'); const tab = t.closest('[data-tab]'); const fmt = t.closest('[data-fmt]'); const size = t.closest('[data-size]');
    if (pick) { st.style = pick.dataset.pick; draw(); }
    else if (tab) { st.tab = tab.dataset.tab; draw(); }
    else if (fmt) { st.fmt = fmt.dataset.fmt; draw(); }
    else if (size) { st.size = size.dataset.size; draw(); }
    else if (t.closest('[data-toggle-title]')) { st.title = !st.title; draw(); }
    else if (t.closest('[data-native]')) {
      const cur = { ...ev, style: st.style };
      try { await navigator.share({ title: ev.name, text: `Countdown to ${ev.name}`, url: countdownUrl(cur) }); } catch (err) { if (err.name !== 'AbortError') showNotice('Use Copy link to share your countdown.'); }
    } else {
      const c = t.closest('[data-copy]');
      if (c) {
        const ok = await copyText($(c.dataset.copy, root).value);
        const old = c.textContent; c.textContent = ok ? 'Copied ✓' : 'Press Ctrl/Cmd+C';
        buzz(); setTimeout(() => { if (c.isConnected) c.textContent = old; }, 1600);
      }
    }
  });
  draw();
  $('[data-close]', root).focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ---------- settings ---------- */
const darkMq = matchMedia('(prefers-color-scheme: dark)');
const getThemePref = () => { const v = localStorage.getItem(THEME_KEY) || localStorage.getItem('downcount.theme'); return ['auto', 'light', 'dark'].includes(v) ? v : 'auto'; };
function applyTheme() {
  const pref = getThemePref(); const dark = pref === 'dark' || (pref === 'auto' && darkMq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeButton.textContent = dark ? '☀' : '☾';
  const meta = $('meta[name=theme-color]'); if (meta) meta.content = dark ? '#171727' : '#f6f7fb';
}
function setThemePref(v) { try { localStorage.setItem(THEME_KEY, v); } catch { /* ignore */ } applyTheme(); }
async function triggerInstall() {
  if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.hidden = true; return; }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) showNotice('To install: tap Share in Safari, then choose “Add to Home Screen”.');
  else showNotice('Open your browser menu and choose “Install app” or “Add to Home screen”.');
}
function renderSettings() {
  const pref = getThemePref();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const permText = { granted: 'Notifications are on.', denied: 'Notifications are blocked in your browser settings.', default: 'Allow notifications to be alerted when a countdown ends.', unsupported: 'This browser doesn’t support notifications.' }[perm];
  const standalone = document.documentElement.classList.contains('standalone');
  app.innerHTML = `<section class="page"><h1 class="page-title">Settings</h1><div class="settings-card"><h3>Appearance</h3><div class="seg" id="theme-seg">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button type="button" data-theme-pref="${v}" class="${pref === v ? 'on' : ''}">${l}</button>`).join('')}</div></div><div class="settings-card"><h3>Reminders</h3><p>${permText}</p>${perm === 'default' ? '<button class="button secondary-button" id="enable-notif" type="button">🔔 Allow notifications</button>' : ''}<p class="fine">Reminders fire while Downcount is open or running in the background.</p></div>${standalone ? '' : '<div class="settings-card"><h3>Install</h3><p>Add Downcount to your home screen for a full-screen app that works offline.</p><button class="button secondary-button" id="install-2" type="button">📲 Install app</button></div>'}<div class="settings-card"><h3>Your data</h3><p>Countdowns are stored only on this device.</p><div class="row"><button class="button secondary-button" id="export" type="button">Export</button><label class="button secondary-button" for="import">Import</label><input id="import" type="file" accept="application/json" hidden><button class="button secondary-button danger" id="wipe" type="button">Delete all</button></div></div><p class="small-note center">Downcount 2.0</p></section>`;
  $$('[data-theme-pref]').forEach((b) => b.addEventListener('click', () => { setThemePref(b.dataset.themePref); renderSettings(); }));
  const en = $('#enable-notif'); if (en) en.addEventListener('click', async () => { await Notification.requestPermission(); renderSettings(); });
  const ins = $('#install-2'); if (ins) ins.addEventListener('click', triggerInstall);
  $('#export').addEventListener('click', () => download('downcount-backup.json', JSON.stringify(readEvents(), null, 2), 'application/json'));
  $('#import').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text()); if (!Array.isArray(data)) throw new Error('bad');
      let count = 0;
      for (const raw of data) { if (raw && raw.name && Number.isFinite(Number(raw.end))) { const ev = normalize(raw); if (!findByNameEnd(ev.name, ev.end)) { upsertEvent({ ...ev, id: newId() }); count++; } } }
      showNotice(`Imported ${count} countdown${count === 1 ? '' : 's'}.`);
    } catch { showNotice('That file couldn’t be imported.'); }
  });
  $('#wipe').addEventListener('click', () => {
    if (!confirm('Delete all your countdowns from this device?')) return;
    const before = readEvents(); saveEvents([]);
    showNotice('All countdowns deleted.', { label: 'Undo', fn: () => { saveEvents(before); showNotice('Restored.'); } });
  });
}

/* ---------- reminders ---------- */
async function enableReminder(event) {
  if (!('Notification' in window)) { showNotice('This browser does not support notifications.'); return; }
  if (Notification.permission === 'denied') { showNotice('Notifications are blocked in your browser settings.'); return; }
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') { showNotice('Notification permission was not granted.'); return; }
  const alerts = readJson(ALERT_KEY, []);
  if (!alerts.some((a) => a.end === event.end && a.name === event.name)) alerts.push({ name: event.name, end: event.end, start: event.start, emoji: event.emoji, style: event.style });
  writeJson(ALERT_KEY, alerts);
  showNotice('Reminder set for this device. Keep Downcount open for the alert.');
}
async function checkReminders() {
  if (IS_EMBED || !('Notification' in window) || Notification.permission !== 'granted') return;
  const alerts = readJson(ALERT_KEY, []);
  const remaining = [];
  for (const event of alerts) {
    if (Number(event.end) <= Date.now()) {
      const tag = `downcount-${event.end}`;
      const ev = normalize(event);
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(`It’s time for ${ev.name}!`, { body: 'Your Downcount has reached zero.', icon: './icons/icon-192.svg', badge: './icons/icon-192.svg', tag, data: { url: countdownUrl(ev) } });
        } else new Notification(`It’s time for ${ev.name}!`, { body: 'Your Downcount has reached zero.', tag });
      } catch (error) { console.info('Could not show countdown reminder:', error); }
    } else remaining.push(event);
  }
  if (remaining.length !== alerts.length) writeJson(ALERT_KEY, remaining);
}

/* ---------- router ---------- */
function route() {
  closeModal();
  const { path } = parseHash();
  liveTitle = null; document.title = DEFAULT_TITLE;
  document.documentElement.classList.toggle('embed', path === '/embed');
  let tab = 'home';
  if (path === '/embed') renderEmbed();
  else if (path.startsWith('/countdown/')) renderCountdown();
  else if (path === '/create') { renderForm(); tab = 'create'; }
  else if (path.startsWith('/edit/')) {
    const ev = readEvents().find((e) => e.id === decodeURIComponent(path.slice(6)));
    if (!ev) { location.hash = '/'; return; }
    renderForm(ev); tab = 'create';
  } else if (path === '/settings') { renderSettings(); tab = 'settings'; }
  else renderHome();
  $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
  if (path !== '/embed') window.scrollTo(0, 0);
  tickAll();
}

window.addEventListener('hashchange', route);
window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY && ['/', '/settings'].includes(parseHash().path)) route(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tickAll(); checkReminders(); } });

applyTheme();
darkMq.addEventListener('change', applyTheme);
themeButton.addEventListener('click', () => setThemePref(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
route();
startTicker();

if (!IS_EMBED) {
  setInterval(checkReminders, 15000);
  checkReminders();
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; installButton.hidden = false; });
  installButton.addEventListener('click', triggerInstall);
  window.addEventListener('appinstalled', () => { installButton.hidden = true; document.documentElement.classList.add('standalone'); showNotice('Downcount is installed!'); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(() => { $('#offline-indicator').hidden = false; }).catch((error) => console.info('Offline setup unavailable:', error)));
  }
}
