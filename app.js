const app = document.getElementById('app');
const notice = document.getElementById('app-notice');
const installButton = document.getElementById('install-app');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const STORAGE_KEY = 'downcount.events.v1';
const ALERT_KEY = 'downcount.alerts.v1';
let timerId;
let installPrompt;
let noticeTimer;

function readJson(key, fallback) {
  try { const parsed = JSON.parse(localStorage.getItem(key)); return parsed ?? fallback; }
  catch { return fallback; }
}
function readEvents() { return readJson(STORAGE_KEY, []).filter((item) => item && item.name && Number.isFinite(Number(item.end))); }
function saveEvent(event) {
  const events = readEvents().filter((item) => !(item.end === event.end && item.name === event.name));
  events.unshift(event);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, 30)));
}
function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 5000);
}
function digitsMarkup() {
  return `<div class="digits" aria-label="Time remaining">
    <div class="digit"><strong data-unit="days">00</strong><small>Days</small></div>
    <div class="digit"><strong data-unit="hours">00</strong><small>Hours</small></div>
    <div class="digit"><strong data-unit="minutes">00</strong><small>Minutes</small></div>
    <div class="digit"><strong data-unit="seconds">00</strong><small>Seconds</small></div>
  </div>`;
}
function countdownUrl(event) {
  const slug = event.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'my-countdown';
  return `${location.origin}${location.pathname}${location.search}#/countdown/${encodeURIComponent(slug)}?name=${encodeURIComponent(event.name)}&end=${Number(event.end)}`;
}
function formatDate(end) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Number(end)));
}
function renderHome() {
  const events = readEvents();
  const cards = events.length ? `<section class="saved-section"><div class="section-heading"><div><span class="eyebrow">YOUR COUNTDOWNS</span><h2>Your moments</h2></div><a class="text-link" href="#/create">＋ New countdown</a></div><div class="saved-grid">${events.map((event, index) => `<article class="saved-card"><a class="saved-title" href="${escapeHtml(countdownUrl(event))}">${escapeHtml(event.name)}</a><p>${escapeHtml(formatDate(event.end))}</p><div class="saved-actions"><a href="${escapeHtml(countdownUrl(event))}">View countdown →</a><button type="button" class="remove-event" data-remove="${index}" aria-label="Remove ${escapeHtml(event.name)}">Remove</button></div></article>`).join('')}</div></section>` : '';
  app.innerHTML = `<section class="hero"><div><div class="eyebrow"><span class="eyebrow-dot"></span> A LITTLE SOMETHING TO LOOK FORWARD TO</div><h1>Good things are <span>counting down.</span></h1><p class="hero-copy">Create a countdown for a big day, a little adventure, or anything you can't wait for. Give it a name and share a link with your friends.</p><a class="button" href="#/create">Create your countdown <span aria-hidden="true">→</span></a><p class="small-note">No account needed. Your countdowns are saved on this device.</p></div><div class="preview-wrap" aria-hidden="true"><div class="preview-glow"></div><div class="preview"><div class="preview-top"><span>YOUR NEXT BIG MOMENT</span><span class="live">COUNTING</span></div><h2>Summer vacation</h2><p class="preview-sub">The best days are just ahead</p><div class="digits"><div class="digit"><strong>12</strong><small>Days</small></div><div class="digit"><strong>08</strong><small>Hours</small></div><div class="digit"><strong>34</strong><small>Minutes</small></div><div class="digit"><strong>56</strong><small>Seconds</small></div></div><div class="preview-footer"><span>✦</span> Every second brings you closer</div></div></div></section>
  <section class="features" aria-label="Downcount features"><article class="feature"><div class="feature-icon">✍️</div><div><h3>Name your moment</h3><p>Give your countdown a name that makes you smile.</p></div></article><article class="feature"><div class="feature-icon">🗓️</div><div><h3>Pick the date</h3><p>Choose exactly when the big moment arrives.</p></div></article><article class="feature"><div class="feature-icon">🔗</div><div><h3>Share the excitement</h3><p>Send your personal countdown link to anyone.</p></div></article><article class="feature"><div class="feature-icon">🔔</div><div><h3>Get a reminder</h3><p>Allow notifications to be reminded when a countdown ends.</p></div></article><article class="feature"><div class="feature-icon">📲</div><div><h3>Install it</h3><p>Add Downcount to your home screen for an app-like experience.</p></div></article><article class="feature"><div class="feature-icon">☁️</div><div><h3>Works offline</h3><p>Open the app and your saved countdowns without a connection.</p></div></article></section>${cards}`;
  app.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => {
    const all = readEvents(); all.splice(Number(button.dataset.remove), 1); localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); renderHome();
  }));
}
function renderCreate() {
  app.innerHTML = `<section class="page"><a class="back" href="#/">← Back home</a><div class="form-card"><h1>Create a countdown</h1><p>What are you looking forward to? Pick a name and a date, then share the excitement.</p><div class="presets"><span>Quick picks:</span><button type="button" data-preset="1">Tomorrow</button><button type="button" data-preset="7">In a week</button><button type="button" data-preset="30">In a month</button></div><form id="countdown-form"><div class="field"><label for="event-name">What should we count down to?</label><input id="event-name" name="name" type="text" maxlength="70" placeholder="e.g. Our trip to Paris" required><span class="field-hint">Keep it short and make it yours.</span></div><div class="field"><label for="event-date">When does it happen?</label><input id="event-date" name="date" type="datetime-local" required><span class="field-hint">Time is based on your device's local time zone.</span></div><p class="form-error" id="form-error" role="alert"></p><button class="button" type="submit">Make my countdown <span aria-hidden="true">→</span></button></form></div></section>`;
  const dateInput = document.getElementById('event-date');
  const localDate = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  dateInput.min = localDate(new Date());
  app.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => {
    const date = new Date(); date.setDate(date.getDate() + Number(button.dataset.preset)); date.setHours(9, 0, 0, 0); dateInput.value = localDate(date);
    if (!document.getElementById('event-name').value) document.getElementById('event-name').value = button.textContent.trim();
  }));
  document.getElementById('countdown-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('event-name').value.trim();
    const end = new Date(dateInput.value).getTime();
    const error = document.getElementById('form-error');
    if (!name || !Number.isFinite(end) || end <= Date.now()) { error.textContent = 'Please enter a name and choose a future date and time.'; error.style.display = 'block'; return; }
    const item = { name, end };
    saveEvent(item);
    location.hash = countdownHash(item);
  });
}
function countdownHash(event) {
  const slug = event.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'my-countdown';
  return `/countdown/${slug}?name=${encodeURIComponent(event.name)}&end=${Number(event.end)}`;
}
function renderCountdown() {
  const raw = location.hash.slice('#/countdown/'.length);
  const queryIndex = raw.indexOf('?');
  const slug = queryIndex < 0 ? raw : raw.slice(0, queryIndex);
  const params = new URLSearchParams(queryIndex < 0 ? '' : raw.slice(queryIndex + 1));
  const name = params.get('name');
  const end = Number(params.get('end'));
  if (!name || !Number.isFinite(end) || end <= 0) {
    app.innerHTML = `<section class="page not-found"><h1>Countdown not found</h1><p>This link doesn't look right. Create a countdown and share its link with your friends.</p><a class="button" href="#/create">Create a countdown</a></section>`; return;
  }
  saveEvent({ name, end });
  const item = { name, end };
  app.innerHTML = `<section class="page"><a class="back" href="#/">← My countdowns</a><div class="form-card countdown-card"><div class="eyebrow"><span class="eyebrow-dot"></span> YOUR MOMENT IS GETTING CLOSER</div><h1>${escapeHtml(name)}</h1><p class="countdown-date">${escapeHtml(formatDate(end))}</p>${digitsMarkup()}<div class="countdown-tools"><button class="button secondary-button" id="remind-me" type="button">🔔 Remind me</button><button class="button secondary-button" id="share-countdown" type="button">↗ Share</button></div><div class="share-box"><input id="share-link" aria-label="Shareable countdown link" readonly><button id="copy-link" type="button">Copy link</button></div><p class="share-hint">Anyone with this link can see your countdown. Send it to your friends!</p><p class="done-message" id="done-message">The moment is here! Have a wonderful time. 🎉</p><div class="countdown-actions"><a href="#/create">＋ Create another countdown</a></div></div></section>`;
  const shareUrl = countdownUrl(item);
  document.getElementById('share-link').value = shareUrl;
  document.getElementById('copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareUrl); }
    catch { const input = document.getElementById('share-link'); input.select(); document.execCommand('copy'); }
    showNotice('Countdown link copied!');
  });
  document.getElementById('share-countdown').addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title: name, text: `Countdown to ${name}`, url: shareUrl }); } catch (error) { if (error.name !== 'AbortError') showNotice('Use Copy link to share your countdown.'); } }
    else { try { await navigator.clipboard.writeText(shareUrl); showNotice('Countdown link copied!'); } catch { showNotice('Copy the link from the box below.'); } }
  });
  document.getElementById('remind-me').addEventListener('click', () => enableReminder(item));
  const update = () => {
    const remaining = Math.max(0, end - Date.now());
    const total = Math.floor(remaining / 1000);
    const values = { days: Math.floor(total / 86400), hours: Math.floor(total % 86400 / 3600), minutes: Math.floor(total % 3600 / 60), seconds: total % 60 };
    for (const [unit, value] of Object.entries(values)) { const element = app.querySelector(`[data-unit="${unit}"]`); if (element) element.textContent = String(value).padStart(2, '0'); }
    if (remaining === 0) { const message = document.getElementById('done-message'); if (message) message.style.display = 'block'; }
  };
  update(); timerId = setInterval(update, 1000);
}
async function enableReminder(event) {
  if (!('Notification' in window)) { showNotice('This browser does not support notifications.'); return; }
  if (Notification.permission === 'denied') { showNotice('Notifications are blocked in your browser settings.'); return; }
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') { showNotice('Notification permission was not granted.'); return; }
  const alerts = readJson(ALERT_KEY, []);
  if (!alerts.some((alert) => alert.end === event.end && alert.name === event.name)) alerts.push(event);
  localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
  showNotice('Reminder set for this device. Keep Downcount open for the alert.');
}
async function checkReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const alerts = readJson(ALERT_KEY, []);
  const remaining = [];
  for (const event of alerts) {
    if (Number(event.end) <= Date.now()) {
      const tag = `downcount-${event.end}`;
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(`It's time for ${event.name}!`, { body: 'Your Downcount has reached zero.', icon: './icons/icon-192.svg', badge: './icons/icon-192.svg', tag, data: { url: countdownUrl(event) } });
        } else new Notification(`It's time for ${event.name}!`, { body: 'Your Downcount has reached zero.', tag });
      } catch (error) { console.info('Could not show countdown reminder:', error); }
    } else remaining.push(event);
  }
  if (remaining.length !== alerts.length) localStorage.setItem(ALERT_KEY, JSON.stringify(remaining));
}
function route() {
  clearInterval(timerId);
  const routePath = location.hash.slice(1).split('?')[0];
  if (routePath.startsWith('/countdown/')) renderCountdown();
  else if (routePath === '/create') renderCreate();
  else renderHome();
}
window.addEventListener('hashchange', route);
route();
setInterval(checkReminders, 15000);
checkReminders();

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); installPrompt = event; installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.hidden = true; return; }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) showNotice('To install: tap Share in Safari, then choose “Add to Home Screen”.');
  else showNotice('Open your browser menu and choose “Install app” or “Add to Home screen”.');
});
window.addEventListener('appinstalled', () => { installButton.hidden = true; showNotice('Downcount is installed!'); });
const themeButton = document.getElementById('theme-toggle');
function setTheme(theme) { document.documentElement.dataset.theme = theme; localStorage.setItem('downcount.theme', theme); themeButton.textContent = theme === 'dark' ? '☀' : '☾'; }
setTheme(readJson('downcount.theme', 'light'));
themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(() => { document.getElementById('offline-indicator').hidden = false; }).catch((error) => console.info('Offline setup unavailable:', error)));
}
