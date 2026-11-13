'use strict';

/* Downcount v4 – Live countdowns with Custom Theme Studio & Custom Emoji Uploader/Picker.
   All extra cool features (3D Flip/Ring Clocks, Particle Backgrounds, Focus & Soundscape Studio,
   Checklists & World Timezones, and Celebration Sound) are OFF by default and only turn on
   when enabled in Settings! */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const app = $('#app');
const notice = $('#app-notice');
const modalRoot = $('#modal-root');
const installButton = $('#install-app');
const themeButton = $('#theme-toggle');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STORAGE_KEY = 'downcount.events.v1';
const ALERT_KEY = 'downcount.alerts.v1';
const THEME_KEY = 'downcount.theme.v2';
const CUSTOM_THEMES_KEY = 'downcount.customThemes.v1';
const CUSTOM_EMOJIS_KEY = 'downcount.customEmojis.v1';
const EXTRAS_KEY = 'downcount.extras.v1';
const SOUND_KEY = 'downcount.sound.v1';
const SOUND_STYLE_KEY = 'downcount.soundStyle.v1';
const FINALE_STYLE_KEY = 'downcount.finaleStyle.v1';
const FOCUS_STATS_KEY = 'downcount.focusStats.v1';
const svgI = (body, sz = 18) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICON_PIN = svgI('<path d="M9 3h6l-1 6 3 3v1.5H7V12l3-3-1-6Z"/><path d="M12 13.5V21"/>', 16);
const ICON_SEARCH = svgI('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>', 16);
const ICON_SUN = svgI('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 19);
const ICON_MOON = svgI('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>', 19);
const DAY = 864e5;

/* --------- Settings-gated Cool Extras (ALL OFF BY DEFAULT) --------- */
const DEFAULT_EXTRAS = {
  clockModes: false,    // 3D Flip Clock, SVG Rings, Poster mode & .0 Tenths
  particles: false,     // Animated Particle Backgrounds (Sparkles, Snow, Matrix, etc.)
  focusStudio: false,   // Focus / Pomodoro Timer & Ambient Soundscapes tab
  detailPanels: false,  // Event Checklists & World Timezone Matrix on countdown pages
  extraFinals: false    // Fireworks, Emoji Fountain & Cyber Strobe finale modes
};

function getExtras() {
  const raw = readJson(EXTRAS_KEY, {});
  return {
    clockModes: !!(raw && raw.clockModes),
    particles: !!(raw && raw.particles),
    focusStudio: !!(raw && raw.focusStudio),
    detailPanels: !!(raw && raw.detailPanels),
    extraFinals: !!(raw && raw.extraFinals)
  };
}

function setExtras(next) {
  const merged = { ...getExtras(), ...next };
  writeJson(EXTRAS_KEY, merged);
  syncExtrasShellUI();
  return merged;
}

function anyExtraEnabled() {
  const ex = getExtras();
  return Object.values(ex).some(Boolean);
}

function allExtrasEnabled() {
  const ex = getExtras();
  return Object.values(ex).every(Boolean);
}

function syncExtrasShellUI() {
  const ex = getExtras();
  const navFocus = $('#nav-focus-link');
  const tabFocus = $('#tab-focus-link');
  const proBadge = $('#pro-badge');
  if (navFocus) navFocus.hidden = !ex.focusStudio;
  if (tabFocus) tabFocus.hidden = !ex.focusStudio;
  if (proBadge) proBadge.hidden = !anyExtraEnabled();
  if (!ex.focusStudio && typeof stopAmbientSoundscape === 'function') {
    stopAmbientSoundscape();
  }
}

const BUILTIN_STYLES = {
  classic: 'Classic',
  sunset: 'Sunset',
  ocean: 'Ocean',
  forest: 'Forest',
  neon: 'Neon',
  mono: 'Mono',
  aurora: 'Aurora',
  sakura: 'Sakura',
  synthwave: 'Synthwave',
  gold: 'Royal Gold'
};

const DISPLAY_MODES = [
  ['cards', 'Cards'],
  ['flip', '3D Flip'],
  ['rings', 'SVG Rings'],
  ['minimal', 'Poster']
];

const PARTICLE_FX = [
  ['none', 'None'],
  ['sparkles', 'Sparkles'],
  ['bubbles', 'Orbs'],
  ['snow', 'Snow'],
  ['petals', 'Petals'],
  ['matrix', 'Matrix'],
  ['embers', 'Embers']
];

const FINALE_STYLES = [
  ['confetti', 'Confetti Cannon'],
  ['fireworks', 'Fireworks Burst'],
  ['emojis', 'Emoji Fountain'],
  ['disco', 'Cyber Strobe']
];

const SOUND_STYLES = [
  ['chime', 'Crystal Chord'],
  ['arcade', '8-Bit Arcade Win'],
  ['fanfare', 'Royal Fanfare'],
  ['gong', 'Warm Zen Bowl']
];

const CATEGORIES = ['Personal', 'Travel', 'Work', 'Birthday', 'Launch', 'Holiday', 'Other'];
const REPEATS = [
  ['none', 'Does not repeat'],
  ['daily', 'Every day'],
  ['weekly', 'Every week'],
  ['monthly', 'Every month'],
  ['yearly', 'Every year']
];

const QUICK_EMOJIS = ['🎉', '✈️', '🎂', '🏖️', '🌲', '💍', '🎓', '⚽', '🎮', '🚀', '❤️', '✨'];

const EMOJI_CATALOG = [
  { e: '🎉', c: 'Celebration', k: 'party celebrate confetti' },
  { e: '🎂', c: 'Celebration', k: 'birthday cake candle' },
  { e: '🥂', c: 'Celebration', k: 'cheers champagne toast new year' },
  { e: '🎈', c: 'Celebration', k: 'balloon party birthday' },
  { e: '🎁', c: 'Celebration', k: 'gift present birthday christmas' },
  { e: '🎆', c: 'Celebration', k: 'fireworks new year festival' },
  { e: '🪩', c: 'Celebration', k: 'disco ball dance party club' },
  { e: '👑', c: 'Celebration', k: 'crown royal vip winner' },
  { e: '💍', c: 'Celebration', k: 'ring wedding engagement marriage' },
  { e: '🎓', c: 'Celebration', k: 'graduation school college degree' },
  { e: '🎃', c: 'Celebration', k: 'halloween pumpkin autumn' },
  { e: '🎄', c: 'Celebration', k: 'christmas tree holiday winter' },
  { e: '✈️', c: 'Travel', k: 'airplane flight trip vacation travel' },
  { e: '🏖️', c: 'Travel', k: 'beach summer vacation island' },
  { e: '🏔️', c: 'Travel', k: 'mountain hike ski snow nature' },
  { e: '🏕️', c: 'Travel', k: 'camping tent outdoors forest' },
  { e: '🚢', c: 'Travel', k: 'cruise ship boat ocean' },
  { e: '🚆', c: 'Travel', k: 'train rail eurostar trip' },
  { e: '🚗', c: 'Travel', k: 'car roadtrip drive' },
  { e: '🗺️', c: 'Travel', k: 'map world adventure explore' },
  { e: '🏝️', c: 'Travel', k: 'tropical island palm beach' },
  { e: '🗼', c: 'Travel', k: 'tokyo eiffel tower city trip' },
  { e: '🎢', c: 'Travel', k: 'rollercoaster theme park disney' },
  { e: '🏠', c: 'Travel', k: 'home house move new place' },
  { e: '🚀', c: 'Work & Tech', k: 'rocket launch startup release ship' },
  { e: '💻', c: 'Work & Tech', k: 'laptop code dev hackathon work' },
  { e: '📅', c: 'Work & Tech', k: 'calendar deadline meeting event' },
  { e: '📈', c: 'Work & Tech', k: 'chart growth stocks earnings' },
  { e: '💼', c: 'Work & Tech', k: 'briefcase job career office' },
  { e: '🏆', c: 'Work & Tech', k: 'trophy win award competition' },
  { e: '💡', c: 'Work & Tech', k: 'idea innovation pitch project' },
  { e: '⚡', c: 'Work & Tech', k: 'bolt fast sprint energy' },
  { e: '🔔', c: 'Work & Tech', k: 'bell reminder alert launch' },
  { e: '🎯', c: 'Work & Tech', k: 'target goal milestone focus' },
  { e: '📚', c: 'Work & Tech', k: 'books study exam finals read' },
  { e: '💰', c: 'Work & Tech', k: 'money payday bonus savings' },
  { e: '⚽', c: 'Sports & Fun', k: 'soccer football match game' },
  { e: '🏀', c: 'Sports & Fun', k: 'basketball nba game court' },
  { e: '🏈', c: 'Sports & Fun', k: 'football superbowl nfl' },
  { e: '⚾', c: 'Sports & Fun', k: 'baseball game stadium' },
  { e: '🎾', c: 'Sports & Fun', k: 'tennis match court' },
  { e: '🏎️', c: 'Sports & Fun', k: 'race car f1 formula speed' },
  { e: '🏃', c: 'Sports & Fun', k: 'run marathon race 5k fitness' },
  { e: '🎮', c: 'Sports & Fun', k: 'video game console release play' },
  { e: '🎵', c: 'Sports & Fun', k: 'music concert festival album' },
  { e: '🎸', c: 'Sports & Fun', k: 'guitar rock band concert live' },
  { e: '🎬', c: 'Sports & Fun', k: 'movie cinema film premiere' },
  { e: '🎟️', c: 'Sports & Fun', k: 'ticket show theatre event' },
  { e: '🌲', c: 'Nature & Food', k: 'tree forest nature outdoors' },
  { e: '🌸', c: 'Nature & Food', k: 'cherry blossom spring flower sakura' },
  { e: '☀️', c: 'Nature & Food', k: 'sun summer warm bright' },
  { e: '❄️', c: 'Nature & Food', k: 'snowflake winter snow cold' },
  { e: '🌈', c: 'Nature & Food', k: 'rainbow pride hope sky' },
  { e: '🍕', c: 'Nature & Food', k: 'pizza dinner food party' },
  { e: '☕', c: 'Nature & Food', k: 'coffee cafe morning break' },
  { e: '🍣', c: 'Nature & Food', k: 'sushi dinner japan food' },
  { e: '🍷', c: 'Nature & Food', k: 'wine dinner date night' },
  { e: '🐾', c: 'Nature & Food', k: 'pet dog cat puppy adopt' },
  { e: '❤️', c: 'Symbols', k: 'heart love anniversary valentine' },
  { e: '✨', c: 'Symbols', k: 'sparkles magic special shine' },
  { e: '🔥', c: 'Symbols', k: 'fire hot streak hype' },
  { e: '💎', c: 'Symbols', k: 'diamond luxury gem special' },
  { e: '🌟', c: 'Symbols', k: 'star glowing favorite shine' },
  { e: '👶', c: 'Symbols', k: 'baby birth due date family' },
  { e: '⏳', c: 'Symbols', k: 'hourglass time timer wait' },
  { e: '⏰', c: 'Symbols', k: 'alarm clock time wake' }
];

const THEME_STARTERS = [
  { name: 'Cyberpunk', mode: 'gradient', bg1: '#0f051d', bg2: '#2b0938', fg: '#ffffff', acc: '#00f5d4', angle: 135, font: 'mono', glow: true, fx: 'matrix', display: 'flip' },
  { name: 'Midnight Gold', mode: 'gradient', bg1: '#0f172a', bg2: '#3b2106', fg: '#fef3c7', acc: '#fbbf24', angle: 145, font: 'serif', glow: false, fx: 'sparkles', display: 'rings' },
  { name: 'Matcha Latte', mode: 'gradient', bg1: '#ecfdf5', bg2: '#a7f3d0', fg: '#064e3b', acc: '#059669', angle: 135, font: 'rounded', glow: false, fx: 'bubbles', display: 'cards' },
  { name: 'Cosmic Berry', mode: 'gradient', bg1: '#3b0764', bg2: '#be185d', fg: '#fdf2f8', acc: '#f472b6', angle: 130, font: 'sans', glow: true, fx: 'sparkles', display: 'cards' },
  { name: 'Solar Embers', mode: 'gradient', bg1: '#431407', bg2: '#ea580c', fg: '#fff7ed', acc: '#fde047', angle: 120, font: 'sans', glow: true, fx: 'embers', display: 'minimal' }
];

const DEFAULT_TITLE = document.title;
const IS_EMBED = location.hash.startsWith('#/embed');

if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) document.documentElement.classList.add('standalone');

let ticker, msTicker, installPrompt, noticeTimer, liveTitle = null;
let homeFilter = { search: '', category: 'All', sort: 'soonest' };
let wakeLockRef = null;

/* --------- storage --------- */
function readJson(key, fallback) { try { const parsed = JSON.parse(localStorage.getItem(key)); return parsed ?? fallback; } catch { return fallback; } }
function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }

const newId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

/* --------- custom themes & custom emojis storage --------- */
function readCustomThemes() {
  const list = readJson(CUSTOM_THEMES_KEY, []);
  return Array.isArray(list) ? list.filter((t) => t && t.id && t.name) : [];
}
function saveCustomThemes(list) { writeJson(CUSTOM_THEMES_KEY, list.slice(0, 40)); }
function findCustomTheme(id) { return readCustomThemes().find((t) => t.id === id); }

function getAllStylesMap() {
  const map = { ...BUILTIN_STYLES };
  for (const t of readCustomThemes()) map[t.id] = t.name;
  return map;
}

function readCustomEmojis() {
  const list = readJson(CUSTOM_EMOJIS_KEY, []);
  return Array.isArray(list) ? list.filter((e) => e && e.id && e.dataUrl) : [];
}
function saveCustomEmojis(list) { return writeJson(CUSTOM_EMOJIS_KEY, list.slice(0, 40)); }

function isImageEmoji(val) {
  return typeof val === 'string' && (val.startsWith('data:image/') || val.startsWith('ce_'));
}

function resolveEmojiDataUrl(val) {
  if (!val) return '';
  if (val.startsWith('data:image/')) return val;
  if (val.startsWith('ce_')) {
    const found = readCustomEmojis().find((x) => x.id === val);
    return found ? found.dataUrl : '';
  }
  return '';
}

function renderEmoji(val) {
  const url = resolveEmojiDataUrl(val);
  if (url) return `<img class="custom-emoji-img" src="${esc(url)}" alt="emoji">`;
  return esc(val || '✨');
}

function plainEmojiText(val) {
  return isImageEmoji(val) ? '✨' : String(val || '✨');
}

/* --------- normalize & events --------- */
function normalizeCustomThemeObj(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const cleanHex = (v, fb) => /^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : fb;
  return {
    id: String(raw.id || 'ct_' + newId()),
    name: String(raw.name || 'Custom Theme').trim().slice(0, 32) || 'Custom Theme',
    mode: raw.mode === 'solid' ? 'solid' : 'gradient',
    bg1: cleanHex(raw.bg1, '#1e1b4b'),
    bg2: cleanHex(raw.bg2, '#4338ca'),
    fg: cleanHex(raw.fg, '#ffffff'),
    acc: cleanHex(raw.acc, '#38bdf8'),
    angle: Math.min(360, Math.max(0, Number(raw.angle) || 135)),
    font: ['sans', 'mono', 'serif', 'rounded'].includes(raw.font) ? raw.font : 'sans',
    glow: !!raw.glow,
    fx: PARTICLE_FX.some(([k]) => k === raw.fx) ? raw.fx : 'none',
    display: DISPLAY_MODES.some(([k]) => k === raw.display) ? raw.display : 'cards'
  };
}

function normalize(raw) {
  let end = Number(raw.end);
  const name = String(raw.name || '').trim().slice(0, 70);
  const start = Number(raw.start);
  const repeat = ['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(raw.repeat) ? raw.repeat : 'none';
  const category = CATEGORIES.includes(raw.category) ? raw.category : 'Personal';
  const note = String(raw.note || '').trim().slice(0, 140);
  const pinned = !!raw.pinned;
  const showMs = !!raw.showMs;
  const rawEmoji = String(raw.emoji || '✨');
  const emoji = rawEmoji.startsWith('data:image/') || rawEmoji.startsWith('ce_') ? rawEmoji : rawEmoji.slice(0, 12);
  const allStyles = getAllStylesMap();
  const customTheme = raw.customTheme ? normalizeCustomThemeObj(raw.customTheme) : (raw.style && raw.style.startsWith('ct_') ? findCustomTheme(raw.style) : null);
  const style = allStyles[raw.style] ? raw.style : (customTheme ? customTheme.id : 'classic');
  const display = DISPLAY_MODES.some(([k]) => k === raw.display) ? raw.display : (customTheme && customTheme.display ? customTheme.display : 'cards');
  const fx = PARTICLE_FX.some(([k]) => k === raw.fx) ? raw.fx : (customTheme && customTheme.fx ? customTheme.fx : 'none');
  const checklist = Array.isArray(raw.checklist)
    ? raw.checklist.filter((c) => c && c.text).slice(0, 30).map((c) => ({ id: c.id || newId(), text: String(c.text).slice(0, 80), done: !!c.done }))
    : [];
  return {
    id: raw.id || 'l' + end.toString(36) + name.length,
    name,
    end,
    start: Number.isFinite(start) && start > 0 ? start : 0,
    emoji,
    style,
    display,
    fx,
    showMs,
    customTheme,
    category,
    repeat,
    note,
    pinned,
    checklist
  };
}

function readEvents() { return readJson(STORAGE_KEY, []).filter((e) => e && e.name && Number.isFinite(Number(e.end))).map(normalize); }
function saveEvents(list) { writeJson(STORAGE_KEY, list.slice(0, 100)); }

function upsertEvent(ev) {
  const list = readEvents().filter((e) => e.id !== ev.id && !(e.name === ev.name && e.end === ev.end));
  list.unshift(normalize(ev));
  saveEvents(list);
  return list[0];
}

const findByNameEnd = (name, end) => readEvents().find((e) => e.name === name && e.end === end);

function nextOccurrenceTimestamp(endMs, repeat) {
  if (!repeat || repeat === 'none') return endMs;
  const d = new Date(endMs);
  const now = Date.now();
  let safety = 0;
  while (d.getTime() <= now && safety++ < 500) {
    if (repeat === 'daily') d.setDate(d.getDate() + 1);
    else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
    else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (repeat === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else break;
  }
  return d.getTime();
}

/* --------- helpers & synthesized audio (OFF BY DEFAULT unless turned on in Settings) --------- */
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

// Sound is strictly OFF by default; only true if explicitly set to '1' in Settings
function isSoundEnabled() { return localStorage.getItem(SOUND_KEY) === '1'; }
function setSoundEnabled(on) { try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch {} }
function getSoundStyle() { const s = localStorage.getItem(SOUND_STYLE_KEY); return SOUND_STYLES.some(([k]) => k === s) ? s : 'chime'; }
function setSoundStyle(s) { try { localStorage.setItem(SOUND_STYLE_KEY, s); } catch {} }
function getFinaleStyle() {
  if (!getExtras().extraFinals) return 'confetti';
  const s = localStorage.getItem(FINALE_STYLE_KEY);
  return FINALE_STYLES.some(([k]) => k === s) ? s : 'confetti';
}
function setFinaleStyle(s) { try { localStorage.setItem(FINALE_STYLE_KEY, s); } catch {} }

function playChime(forceStyle) {
  if (!isSoundEnabled() && !forceStyle) return;
  const style = forceStyle || getSoundStyle();
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (style === 'arcade') {
      const notes = [330, 392, 659.25, 523.25, 587.33, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.065);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.065);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.065 + 0.14);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.065);
        osc.stop(ctx.currentTime + i * 0.065 + 0.15);
      });
    } else if (style === 'fanfare') {
      const notes = [[523.25, 0, 0.14], [523.25, 0.15, 0.14], [523.25, 0.3, 0.14], [659.25, 0.46, 0.42], [587.33, 0.9, 0.22], [659.25, 1.15, 0.6]];
      notes.forEach(([freq, t, dur]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.11, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + dur + 0.02);
      });
    } else if (style === 'gong') {
      [220, 440, 660, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.18 / (idx + 1), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2.5);
      });
    } else {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + i * 0.09 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.09 + 0.65);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.7);
      });
    }
  } catch { /* ignore audio errors */ }
}

function parts(ms) {
  const clamped = Math.max(0, ms);
  const t = Math.floor(clamped / 1000);
  return {
    days: Math.floor(t / 86400),
    hours: Math.floor(t % 86400 / 3600),
    minutes: Math.floor(t % 3600 / 60),
    seconds: t % 60,
    tenths: Math.floor((clamped % 1000) / 100)
  };
}

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

function resolveThemeForEvent(ev) {
  if (!ev) return null;
  if (ev.customTheme) return normalizeCustomThemeObj(ev.customTheme);
  if (ev.style && ev.style.startsWith('ct_')) return findCustomTheme(ev.style);
  return null;
}

function customThemeInlineVars(ct) {
  if (!ct) return '';
  const g = ct.mode === 'solid' ? ct.bg1 : `linear-gradient(${ct.angle || 135}deg, ${ct.bg1}, ${ct.bg2})`;
  return `--g:${g};--fg:${ct.fg};--acc:${ct.acc};--brand:${ct.acc};--soft:color-mix(in srgb,${ct.fg} 12%,transparent);--track:color-mix(in srgb,${ct.fg} 24%,transparent);--muted2:color-mix(in srgb,${ct.fg} 78%,transparent);border-color:color-mix(in srgb,${ct.fg} 18%,transparent)`;
}

function paramString(ev, extra = {}) {
  const ex = getExtras();
  const emojiParam = isImageEmoji(ev.emoji) ? '✨' : ev.emoji;
  const p = new URLSearchParams({ name: ev.name, end: String(ev.end), style: ev.style, emoji: emojiParam });
  if (ev.start) p.set('s', String(ev.start));
  if (ev.note) p.set('note', ev.note);
  if (ev.repeat && ev.repeat !== 'none') p.set('rep', ev.repeat);
  if (ex.clockModes && ev.display && ev.display !== 'cards') p.set('disp', ev.display);
  if (ex.particles && ev.fx && ev.fx !== 'none') p.set('fx', ev.fx);
  if (ex.clockModes && ev.showMs) p.set('ms', '1');
  const ct = resolveThemeForEvent(ev);
  if (ct) {
    p.set('c_name', ct.name);
    p.set('c_mode', ct.mode);
    p.set('c_bg1', ct.bg1);
    p.set('c_bg2', ct.bg2);
    p.set('c_fg', ct.fg);
    p.set('c_acc', ct.acc);
    p.set('c_angle', String(ct.angle));
    p.set('c_font', ct.font);
    if (ct.glow) p.set('c_glow', '1');
  }
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
  let customTheme = null;
  if (p.get('c_bg1')) {
    customTheme = normalizeCustomThemeObj({
      id: p.get('style') || 'ct_shared',
      name: p.get('c_name') || 'Custom',
      mode: p.get('c_mode') || 'gradient',
      bg1: p.get('c_bg1'),
      bg2: p.get('c_bg2') || p.get('c_bg1'),
      fg: p.get('c_fg') || '#ffffff',
      acc: p.get('c_acc') || '#38bdf8',
      angle: Number(p.get('c_angle')) || 135,
      font: p.get('c_font') || 'sans',
      glow: p.get('c_glow') === '1',
      fx: p.get('fx') || 'none',
      display: p.get('disp') || 'cards'
    });
  }
  const stored = findByNameEnd(name, end);
  return normalize({
    ...(stored || {}),
    name,
    end,
    start: Number(p.get('s')) || (stored ? stored.start : 0),
    emoji: (stored && isImageEmoji(stored.emoji)) ? stored.emoji : (p.get('emoji') || (stored ? stored.emoji : '✨')),
    style: p.get('style') || (stored ? stored.style : 'classic'),
    display: p.get('disp') || (stored ? stored.display : (customTheme ? customTheme.display : 'cards')),
    fx: p.get('fx') || (stored ? stored.fx : (customTheme ? customTheme.fx : 'none')),
    showMs: p.get('ms') === '1' || (stored ? stored.showMs : false),
    note: p.get('note') ?? (stored ? stored.note : ''),
    repeat: p.get('rep') || (stored ? stored.repeat : 'none'),
    customTheme: customTheme || (stored ? stored.customTheme : null)
  });
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

/* --------- Ambient Particle Canvas Engine (Only runs when Particles Extra is turned ON in Settings) --------- */
let fxAnimFrame = null;
const widgetParticlesMap = new WeakMap();

function initOrStepWidgetCanvases() {
  if (!getExtras().particles || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (fxAnimFrame) { cancelAnimationFrame(fxAnimFrame); fxAnimFrame = null; }
    return;
  }
  const canvases = $$('canvas.w-fx-canvas');
  if (!canvases.length) {
    if (fxAnimFrame) { cancelAnimationFrame(fxAnimFrame); fxAnimFrame = null; }
    return;
  }
  for (const c of canvases) {
    const fx = c.dataset.fx;
    if (!fx || fx === 'none') continue;
    const rect = c.parentElement.getBoundingClientRect();
    const W = Math.max(200, Math.floor(rect.width));
    const H = Math.max(140, Math.floor(rect.height));
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    let state = widgetParticlesMap.get(c);
    if (!state || state.fx !== fx) {
      const count = fx === 'matrix' ? 28 : 34;
      const pts = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1.8 + Math.random() * 3.5,
        vx: (Math.random() - 0.5) * 0.7,
        vy: fx === 'bubbles' || fx === 'embers' ? -(0.4 + Math.random() * 1.1) : (0.4 + Math.random() * 1.2),
        a: 0.25 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        char: String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96))
      }));
      state = { fx, pts };
      widgetParticlesMap.set(c, state);
    }
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    for (const p of state.pts) {
      p.phase += 0.04;
      if (fx === 'sparkles') {
        const alpha = 0.2 + 0.7 * Math.abs(Math.sin(p.phase));
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        p.y -= 0.15;
        if (p.y < 0) p.y = H;
      } else if (fx === 'bubbles') {
        ctx.strokeStyle = `rgba(255,255,255,${(p.a * 0.55).toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(p.phase) * 6, p.y, p.r * 2.4, 0, Math.PI * 2);
        ctx.stroke();
        p.y += p.vy;
        if (p.y < -15) { p.y = H + 15; p.x = Math.random() * W; }
      } else if (fx === 'snow') {
        ctx.fillStyle = `rgba(255,255,255,${p.a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(p.phase) * 8, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.vy;
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
      } else if (fx === 'petals') {
        ctx.save();
        ctx.translate(p.x + Math.sin(p.phase) * 10, p.y);
        ctx.rotate(p.phase * 0.6);
        ctx.fillStyle = `rgba(255,182,193,${(p.a * 0.85).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.8, p.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        p.y += p.vy * 0.85;
        p.x += 0.3;
        if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W; }
        if (p.x > W + 12) p.x = -12;
      } else if (fx === 'embers') {
        const hue = 15 + Math.floor(Math.abs(Math.sin(p.phase)) * 35);
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${p.a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(p.phase) * 5, p.y, p.r * 0.95, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.vy * 1.1;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      } else if (fx === 'matrix') {
        ctx.fillStyle = `rgba(0, 245, 212, ${(p.a * 0.55).toFixed(2)})`;
        ctx.font = '12px monospace';
        ctx.fillText(p.char, p.x, p.y);
        p.y += p.vy * 2.2;
        if (p.y > H + 14) { p.y = -10; p.x = Math.random() * W; }
      }
    }
  }
  fxAnimFrame = requestAnimationFrame(initOrStepWidgetCanvases);
}

function triggerParticleLoop() {
  if (getExtras().particles && !fxAnimFrame && $$('canvas.w-fx-canvas').length) {
    fxAnimFrame = requestAnimationFrame(initOrStepWidgetCanvases);
  }
}

/* --------- the live widget --------- */
function widgetHtml(ev, o = {}) {
  const { title = true, credit = false, size = 'wide', showMilestones = false } = o;
  const ex = getExtras();
  const ct = resolveThemeForEvent(ev);
  const inlineStyle = ct ? ` style="${esc(customThemeInlineVars(ct))}"` : '';
  const fontClass = ct && ct.font ? ` f-${ct.font}` : '';
  const glowClass = ct && ct.glow ? ' has-glow' : '';
  const disp = ex.clockModes ? (ev.display || (ct && ct.display) || 'cards') : 'cards';
  const fx = ex.particles ? (ev.fx || (ct && ct.fx) || 'none') : 'none';
  const hasMs = ex.clockModes && !!ev.showMs && size !== 'compact';

  const unitList = ['days', 'hours', 'minutes', 'seconds'];
  const unitsHtml = unitList.map((u) => {
    const label = u[0].toUpperCase() + u.slice(1);
    if (disp === 'rings' && size !== 'compact') {
      const r = 42;
      const c = (2 * Math.PI * r).toFixed(1);
      return `<div class="digit"><div class="ring-wrap"><svg class="ring-svg" viewBox="0 0 100 100"><circle class="ring-bg" cx="50" cy="50" r="${r}"/><circle class="ring-fg" data-ring="${u}" cx="50" cy="50" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="0"/></svg><strong data-unit="${u}">00</strong></div><small>${label}</small></div>`;
    }
    return `<div class="digit"><strong data-unit="${u}">00</strong><small>${label}</small></div>`;
  }).join('') + (hasMs ? `<div class="digit ms-digit"><strong data-unit="tenths">.0</strong><small>Sec/10</small></div>` : '');

  const repeatLabel = ev.repeat && ev.repeat !== 'none' ? `<span class="w-badge">${esc(ev.repeat[0].toUpperCase() + ev.repeat.slice(1))}</span>` : '';
  const catLabel = ev.category ? `<span class="w-badge">${esc(ev.category)}</span>` : '';
  const fxCanvas = fx !== 'none' ? `<canvas class="w-fx-canvas" data-fx="${esc(fx)}"></canvas>` : '';

  return `<div class="widget s-${esc(ev.style)} d-${esc(disp)}${fontClass}${glowClass}${hasMs ? ' has-ms' : ''}${size === 'compact' ? ' compact' : ''}"${inlineStyle} data-end="${ev.end}" data-start="${ev.start || 0}" data-emoji-raw="${esc(plainEmojiText(ev.emoji))}">`
    + fxCanvas
    + (title ? `<div class="w-head"><span class="w-emoji" aria-hidden="true">${renderEmoji(ev.emoji)}</span><h2>${esc(ev.name)}</h2></div>` : '')
    + `<p class="w-date">${esc(fmtDate(ev.end))}</p>`
    + (ev.note && title ? `<p class="w-note">${esc(ev.note)}</p>` : '')
    + ((repeatLabel || (showMilestones && catLabel)) ? `<div class="w-badges">${catLabel}${repeatLabel}</div>` : '')
    + `<div class="digits" role="timer" aria-label="Time remaining">${unitsHtml}</div>`
    + `<div class="w-bar-wrap"><div class="w-bar" aria-hidden="true"><i></i></div>`
    + (showMilestones ? `<div class="w-milestones"><span>Start</span><span>25%</span><span>50% Halfway</span><span>75%</span><span>Goal </span></div>` : '')
    + `</div><p class="w-status" data-status></p>`
    + (credit ? `<a class="w-credit" href="${esc(countdownUrl(ev))}" target="_blank" rel="noopener">Made with Downcount ↗</a>` : '')
    + '</div>';
}

function tickWidget(w, now) {
  const end = Number(w.dataset.end);
  const startRaw = Number(w.dataset.start);
  const start = startRaw > 0 && startRaw < end ? startRaw : end - 30 * DAY;
  const remaining = Math.max(0, end - now);
  const p = parts(remaining);
  for (const u of ['days', 'hours', 'minutes', 'seconds']) {
    const el = w.querySelector(`[data-unit="${u}"]`);
    const v = pad(p[u]);
    if (el && el.textContent !== v) {
      el.textContent = v;
      if (w.classList.contains('d-flip')) {
        el.classList.remove('tick-pop');
        void el.offsetWidth;
        el.classList.add('tick-pop');
      } else if (u === 'seconds' && !document.hidden) {
        el.classList.remove('val-tick');
        void el.offsetWidth;
        el.classList.add('val-tick');
      }
    }
  }
  const tenthsEl = w.querySelector('[data-unit="tenths"]');
  if (tenthsEl) tenthsEl.textContent = `.${p.tenths}`;

  const ringMax = { days: Math.max(30, p.days || 30), hours: 24, minutes: 60, seconds: 60 };
  for (const u of ['days', 'hours', 'minutes', 'seconds']) {
    const circle = w.querySelector(`[data-ring="${u}"]`);
    if (circle) {
      const c = 263.9;
      const frac = Math.min(1, Math.max(0, p[u] / ringMax[u]));
      circle.style.strokeDashoffset = String((c * (1 - frac)).toFixed(1));
    }
  }

  const pct = Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
  const bar = w.querySelector('.w-bar i'); if (bar) bar.style.width = pct + '%';
  const status = w.querySelector('[data-status]');
  if (status) {
    status.textContent = remaining > 0
      ? (remaining < DAY ? 'Happening within 24 hours – almost there!' : `${Math.round(pct)}% of the wait is complete`)
      : `It's here! Reached ${agoText(now - end)}`;
  }
  if (remaining === 0) {
    if (!w.classList.contains('done')) {
      w.classList.add('done');
      if (now - end < 15000) { celebrateFinale(w.dataset.emojiRaw || '🎉'); playChime(); }
    }
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
    document.title = r > 0 ? `${shortLeft(r)} · ${liveTitle.name}` : `${liveTitle.name} is here!`;
  }
  triggerParticleLoop();
}

function startTicker() {
  clearTimeout(ticker);
  clearInterval(msTicker);
  const loop = () => {
    tickAll();
    ticker = setTimeout(loop, 1000 - (Date.now() % 1000) + 10);
  };
  loop();
  msTicker = setInterval(() => {
    if (!getExtras().clockModes) return;
    const msWidgets = $$('.widget.has-ms');
    if (msWidgets.length) {
      const now = Date.now();
      msWidgets.forEach((w) => {
        const tenthsEl = w.querySelector('[data-unit="tenths"]');
        if (tenthsEl) {
          const rem = Math.max(0, Number(w.dataset.end) - now);
          tenthsEl.textContent = `.${Math.floor((rem % 1000) / 100)}`;
        }
      });
    }
  }, 100);
}

/* --------- Finale Celebration Animations --------- */
function celebrateFinale(emojiChar = '🎉', forcedMode) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const mode = forcedMode || getFinaleStyle();
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.append(c);
  const ctx = c.getContext('2d');
  const W = c.width = innerWidth;
  const H = c.height = innerHeight;
  const colors = ['#6d5dfc', '#ff5a5f', '#ffb347', '#22d3ee', '#22c55e', '#ff3d81', '#a855f7'];

  if (mode === 'fireworks') {
    const bursts = Array.from({ length: 5 }, (_, idx) => {
      const cx = W * (0.2 + Math.random() * 0.6);
      const cy = H * (0.2 + Math.random() * 0.45);
      const col = colors[idx % colors.length];
      return Array.from({ length: 42 }, () => {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 5.5;
        return { x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, a: 1, c: col, delay: idx * 22 };
      });
    }).flat();
    let f = 0;
    (function drawFw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of bursts) {
        if (f < p.delay) continue;
        p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.a = Math.max(0, p.a - 0.014);
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (++f < 210) requestAnimationFrame(drawFw); else c.remove();
    })();
    return;
  }

  if (mode === 'emojis') {
    const pool = [emojiChar, '🎉', '✨', '🥳', '🔥', '💖'];
    const items = Array.from({ length: 65 }, () => ({
      x: Math.random() * W,
      y: H + 20 + Math.random() * 120,
      vx: (Math.random() - 0.5) * 4,
      vy: -(9 + Math.random() * 7),
      size: 24 + Math.random() * 18,
      ch: pool[Math.floor(Math.random() * pool.length)]
    }));
    let f = 0;
    (function drawEm() {
      ctx.clearRect(0, 0, W, H);
      for (const b of items) {
        b.x += b.vx; b.y += b.vy; b.vy += 0.22;
        ctx.font = `${Math.round(b.size)}px sans-serif`;
        ctx.fillText(b.ch, b.x, b.y);
      }
      if (++f < 210) requestAnimationFrame(drawEm); else c.remove();
    })();
    return;
  }

  if (mode === 'disco') {
    let f = 0;
    (function drawDisco() {
      ctx.clearRect(0, 0, W, H);
      const col = colors[Math.floor(f / 8) % colors.length];
      ctx.fillStyle = col + '22';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) {
        ctx.strokeStyle = colors[(i + Math.floor(f / 5)) % colors.length] + '66';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo((W / 11) * i + Math.sin(f * 0.08 + i) * 90, H);
        ctx.stroke();
      }
      if (++f < 150) requestAnimationFrame(drawDisco); else c.remove();
    })();
    return;
  }

  // Default: Confetti
  const bits = Array.from({ length: 150 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, r: 4 + Math.random() * 5, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, c: colors[Math.floor(Math.random() * colors.length)] }));
  let frames = 0;
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) { b.x += b.vx; b.y += b.vy; b.rot += b.vr; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = b.c; ctx.fillRect(-b.r, -b.r, b.r * 1.8, b.r * 1.8); ctx.restore(); }
    if (++frames < 260) requestAnimationFrame(draw); else c.remove();
  })();
}

/* --------- Export High-Res PNG Share Card --------- */
async function exportShareImage(ev) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  const ct = resolveThemeForEvent(ev);
  const builtinPalettes = {
    classic: { bg1: '#1e1b4b', bg2: '#4338ca', fg: '#ffffff', acc: '#a5b4fc' },
    sunset: { bg1: '#ff8a3d', bg2: '#ff3d81', fg: '#ffffff', acc: '#ffffff' },
    ocean: { bg1: '#22b8e8', bg2: '#2563eb', fg: '#ffffff', acc: '#ffffff' },
    forest: { bg1: '#0f766e', bg2: '#22a55e', fg: '#ffffff', acc: '#ffffff' },
    neon: { bg1: '#0a0a18', bg2: '#111827', fg: '#ffffff', acc: '#00f5d4' },
    mono: { bg1: '#111111', bg2: '#262626', fg: '#ffffff', acc: '#ffffff' },
    aurora: { bg1: '#311042', bg2: '#14b8a6', fg: '#ffffff', acc: '#a5f3fc' },
    sakura: { bg1: '#fbcfe8', bg2: '#f472b6', fg: '#4c0519', acc: '#be185d' },
    synthwave: { bg1: '#120428', bg2: '#be185d', fg: '#ffffff', acc: '#38bdf8' },
    gold: { bg1: '#0f172a', bg2: '#422006', fg: '#fef9c3', acc: '#facc15' }
  };
  const pal = ct || builtinPalettes[ev.style] || builtinPalettes.classic;

  const grad = ctx.createLinearGradient(0, 0, 1200, 630);
  grad.addColorStop(0, pal.bg1);
  grad.addColorStop(1, ct && ct.mode === 'solid' ? pal.bg1 : pal.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(60, 50, 1080, 530, 36);
  ctx.fill();

  ctx.fillStyle = pal.fg;
  ctx.textAlign = 'center';
  ctx.font = '800 54px Inter, system-ui, sans-serif';
  const titleStr = `${plainEmojiText(ev.emoji)}  ${ev.name}`;
  ctx.fillText(titleStr.slice(0, 38), 600, 155);

  ctx.font = '600 24px Inter, system-ui, sans-serif';
  ctx.globalAlpha = 0.82;
  ctx.fillText(fmtDate(ev.end), 600, 205);
  ctx.globalAlpha = 1;

  const p = parts(Math.max(0, ev.end - Date.now()));
  const units = [
    [pad(p.days), 'DAYS'],
    [pad(p.hours), 'HOURS'],
    [pad(p.minutes), 'MINUTES'],
    [pad(p.seconds), 'SECONDS']
  ];
  const boxW = 215, boxH = 190, gap = 28;
  const startX = (1200 - (boxW * 4 + gap * 3)) / 2;
  units.forEach(([val, label], idx) => {
    const x = startX + idx * (boxW + gap);
    const y = 250;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 24);
    ctx.fill();

    ctx.fillStyle = pal.acc;
    ctx.font = '800 76px Inter, system-ui, sans-serif';
    ctx.fillText(val, x + boxW / 2, y + 110);

    ctx.fillStyle = pal.fg;
    ctx.globalAlpha = 0.75;
    ctx.font = '700 18px Inter, system-ui, sans-serif';
    ctx.fillText(label, x + boxW / 2, y + 155);
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = pal.fg;
  ctx.globalAlpha = 0.65;
  ctx.font = '600 20px Inter, system-ui, sans-serif';
  ctx.fillText('Downcount · Make every moment count', 600, 525);
  ctx.globalAlpha = 1;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(ev.name)}-countdown.png`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showNotice('Downloaded shareable countdown image card!');
  }, 'image/png');
}

/* --------- home --------- */
const FEATURES = [
  ['Custom Theme Studio', 'Design your own gradients, neon glows, fonts and color palettes with a live preview.'],
  ['Emoji Picker & Upload', 'Browse 70+ categorized emojis or upload your own custom PNG/GIF/SVG stickers.'],
  ['Recurring Events', 'Set daily, weekly, monthly or yearly repeats for birthdays, sprints and holidays.'],
  ['PNG Share Cards', 'Download a crisp 1200×630 image snapshot of any countdown to share on social media.'],
  ['Pin, Tag & Filter', 'Organize countdowns by category, pin top priorities, and search instantly.'],
  ['Share & Embed Anywhere', 'Copy a link, iframe or script tag — custom themes carry right over into embeds.'],
  ['Opt-In Cool Extras', 'Turn on 3D Flip Clocks, Particle Effects, Focus Timer & Audio Chimes anytime in Settings.'],
  ['Offline-Ready PWA', 'Install Downcount to your home screen or dock. 100% private and local-first.']
];

function cardHtml(ev) {
  const ex = getExtras();
  const ct = resolveThemeForEvent(ev);
  const cardBrand = ct ? ` style="--brand:${esc(ct.acc)}"` : '';
  const repTag = ev.repeat && ev.repeat !== 'none' ? `<span class="meta-tag">${esc(ev.repeat)}</span>` : '';
  const catTag = ev.category ? `<span class="meta-tag">${esc(ev.category)}</span>` : '';
  const fxTag = ex.particles && ev.fx && ev.fx !== 'none' ? `<span class="meta-tag">${esc(ev.fx)}</span>` : '';
  const tasksDone = (ev.checklist || []).filter((c) => c.done).length;
  const tasksTotal = (ev.checklist || []).length;
  const taskTag = ex.detailPanels && tasksTotal ? `<span class="meta-tag">${tasksDone}/${tasksTotal} tasks</span>` : '';
  return `<article class="saved-card s-${esc(ev.style)}${ev.pinned ? ' pinned' : ''}"${cardBrand} data-id="${esc(ev.id)}">`
    + `<a class="card-main" href="#${esc(countdownHash(ev))}">`
    + `<span class="card-emoji" aria-hidden="true">${renderEmoji(ev.emoji)}</span>`
    + `<div class="card-text"><strong class="saved-title">${esc(ev.name)}</strong><small>${esc(fmtShort(ev.end))}</small><div class="card-meta-tags">${catTag}${repTag}${fxTag}${taskTag}</div></div>`
    + `<span class="chip" data-live="${ev.end}"></span></a>`
    + `<div class="saved-actions">`
    + `<button class="pin-btn ${ev.pinned ? 'on' : ''}" type="button" data-pin="${esc(ev.id)}" title="${ev.pinned ? 'Unpin' : 'Pin to top'}">${ICON_PIN}</button>`
    + `<button type="button" data-share="${esc(ev.id)}">Share</button>`
    + `<button type="button" data-edit="${esc(ev.id)}">Edit</button>`
    + `<button class="remove-event" type="button" data-remove="${esc(ev.id)}">Remove</button>`
    + `</div></article>`;
}

function renderHome() {
  const ex = getExtras();
  const events = readEvents();
  if (!events.length) {
    const demo = normalize({ name: 'Summer vacation', end: Date.now() + ((12 * 24 + 8) * 3600 + 34 * 60 + 56) * 1000, start: Date.now() - 20 * DAY, emoji: '🏖️', style: 'ocean', display: ex.clockModes ? 'flip' : 'cards', fx: ex.particles ? 'sparkles' : 'none', category: 'Travel', note: 'Flights booked & bags packed!' });
    app.innerHTML = `<section class="hero"><div><div class="eyebrow"><span class="eyebrow-dot"></span> A LITTLE SOMETHING TO LOOK FORWARD TO</div><h1>Countdown to <span>anything</span> that matters</h1><p class="hero-copy">Create clean, customizable live countdowns with your own custom themes and uploaded emojis. Share them with a link, export a PNG card, or embed them anywhere.</p><div class="hero-btns"><a class="button" href="#/create">+ Create a countdown</a><a class="button secondary-button" href="#/themes">Theme Studio</a>${ex.focusStudio ? '<a class="button secondary-button" href="#/focus">Focus Timer</a>' : '<a class="button secondary-button" href="#/settings">Cool Extras in Settings</a>'}</div></div><div class="preview-wrap"><div class="preview-glow"></div><div class="preview">${widgetHtml(demo, { showMilestones: true })}</div></div></section><section class="features">${FEATURES.map(([title, text]) => `<div class="feature"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('')}</section>`;
    return;
  }

  const now = Date.now();
  const pinnedOrUpcoming = events.filter((e) => e.end > now).sort((a, b) => (b.pinned - a.pinned) || (a.end - b.end));
  const next = pinnedOrUpcoming[0];

  const q = homeFilter.search.trim().toLowerCase();
  const filtered = events.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q) && !(e.note || '').toLowerCase().includes(q)) return false;
    if (homeFilter.category === 'Pinned') return !!e.pinned;
    if (homeFilter.category !== 'All' && e.category !== homeFilter.category) return false;
    return true;
  });

  const sortFn = (a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    if (homeFilter.sort === 'furthest') return b.end - a.end;
    if (homeFilter.sort === 'name') return a.name.localeCompare(b.name);
    return a.end - b.end;
  };

  const up = filtered.filter((e) => e.end > now && !(next && e.id === next.id)).sort(sortFn);
  const done = filtered.filter((e) => e.end <= now).sort((a, b) => b.end - a.end);

  const filterCats = ['All', 'Pinned', ...CATEGORIES];
  const toolbar = `<div class="home-toolbar">`
    + `<div class="search-input-wrap"><span class="search-icon">${ICON_SEARCH}</span><input id="home-search" type="search" placeholder="Search countdowns…" value="${esc(homeFilter.search)}"></div>`
    + `<div class="filter-pills">${filterCats.map((c) => `<button type="button" class="filter-pill ${homeFilter.category === c ? 'on' : ''}" data-cat-filter="${esc(c)}">${c === 'Pinned' ? 'Pinned' : esc(c)}</button>`).join('')}</div>`
    + `<select id="home-sort" class="sort-select" aria-label="Sort countdowns"><option value="soonest"${homeFilter.sort === 'soonest' ? ' selected' : ''}>Soonest</option><option value="furthest"${homeFilter.sort === 'furthest' ? ' selected' : ''}>Furthest</option><option value="name"${homeFilter.sort === 'name' ? ' selected' : ''}>A–Z</option></select>`
    + `</div>`;

  const section = (label, list) => list.length ? `<section class="saved-section"><div class="section-heading"><h2>${label} (${list.length})</h2></div><div class="saved-grid">${list.map(cardHtml).join('')}</div></section>` : '';
  const emptyFiltered = !up.length && !done.length ? `<p class="small-note center" style="padding:32px 0">No countdowns match your current filter. <button class="text-link" type="button" id="reset-filters">Reset filters</button></p>` : '';

  app.innerHTML = `<section class="next-up"><div class="section-heading"><div><span class="eyebrow">${next ? (next.pinned ? 'PINNED SPOTLIGHT' : 'NEXT UP') : 'YOUR COUNTDOWNS'}</span></div><div style="display:flex;gap:8px">${ex.focusStudio ? '<a class="button secondary-button small-button" href="#/focus">Focus</a>' : ''}<a class="button secondary-button small-button" href="#/themes">Themes</a><a class="button small-button" href="#/create">+ New</a></div></div>${next ? `<a class="next-link" href="#${esc(countdownHash(next))}">${widgetHtml(next, { showMilestones: true })}</a>` : ''}</section>`
    + toolbar
    + section('Upcoming', up)
    + section('Completed', done)
    + emptyFiltered;

  const searchEl = $('#home-search');
  if (searchEl) {
    searchEl.addEventListener('input', (e) => {
      homeFilter.search = e.target.value;
      const pos = searchEl.selectionStart;
      renderHome();
      const nextSearch = $('#home-search');
      if (nextSearch) { nextSearch.focus(); nextSearch.setSelectionRange(pos, pos); }
    });
  }
  const sortEl = $('#home-sort');
  if (sortEl) sortEl.addEventListener('change', (e) => { homeFilter.sort = e.target.value; renderHome(); });
  $$('[data-cat-filter]').forEach((b) => b.addEventListener('click', () => { homeFilter.category = b.dataset.catFilter; renderHome(); }));
  const resetBtn = $('#reset-filters');
  if (resetBtn) resetBtn.addEventListener('click', () => { homeFilter = { search: '', category: 'All', sort: 'soonest' }; renderHome(); });
}

app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pin],[data-share],[data-edit],[data-remove]');
  if (!b) return;
  const card = b.closest('[data-id]');
  const ev = card && readEvents().find((x) => x.id === card.dataset.id);
  if (!ev) return;
  if (b.dataset.pin !== undefined) {
    ev.pinned = !ev.pinned;
    upsertEvent(ev);
    buzz();
    renderHome();
    tickAll();
    showNotice(ev.pinned ? `Pinned "${ev.name}" to top.` : `Unpinned "${ev.name}".`);
  } else if (b.dataset.share !== undefined) openShare(ev);
  else if (b.dataset.edit !== undefined) location.hash = `/edit/${encodeURIComponent(ev.id)}`;
  else if (b.dataset.remove !== undefined) removeEvent(ev);
});

function removeEvent(ev) {
  const before = readEvents();
  const finish = () => {
    saveEvents(before.filter((e) => e.id !== ev.id));
    buzz(); route();
    showNotice(`Deleted “${ev.name}”.`, { label: 'Undo', fn: () => { saveEvents(before); route(); } });
  };
  const card = $$('.saved-card').find((c) => c.dataset.id === ev.id);
  if (card && !matchMedia('(prefers-reduced-motion: reduce)').matches) { card.classList.add('leaving'); setTimeout(finish, 230); }
  else finish();
}

/* --------- Emoji Picker & Custom Emoji Uploader Modal --------- */
function resizeImageFileToDataUrl(file, maxSize = 96) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxSize / Math.max(img.width || maxSize, img.height || maxSize));
        canvas.width = Math.max(1, Math.round((img.width || maxSize) * scale));
        canvas.height = Math.max(1, Math.round((img.height || maxSize) * scale));
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openEmojiPickerModal(currentEmoji, onSelect) {
  closeModal();
  const state = { query: '', cat: 'All' };
  const root = document.createElement('div');
  root.className = 'modal-backdrop';
  root.innerHTML = `<div class="modal emoji-modal" role="dialog" aria-modal="true" aria-labelledby="emoji-modal-title">`
    + `<div class="modal-head"><h2 id="emoji-modal-title">Choose or Upload Emoji</h2><button class="icon-button" type="button" data-close>✕</button></div>`
    + `<div class="emoji-search-bar"><input id="emoji-search-input" type="search" placeholder="Search emojis (e.g. party, rocket, beach, wedding)…"></div>`
    + `<div class="emoji-cats" id="emoji-cats"></div>`
    + `<div class="emoji-picker-grid" id="emoji-grid"></div>`
    + `<div class="upload-emoji-box">`
    + `<div class="upload-emoji-info"><strong>Upload your own custom emoji / sticker</strong><span>PNG, JPG, GIF, WebP or SVG — saved locally in your browser</span></div>`
    + `<button class="button small-button" type="button" id="trigger-emoji-upload">+ Upload Image</button>`
    + `<input id="emoji-file-input" type="file" accept="image/*" hidden>`
    + `</div></div>`;
  modalRoot.append(root);
  document.body.classList.add('modal-open');

  const cats = ['All', 'Custom Uploaded', 'Celebration', 'Travel', 'Work & Tech', 'Sports & Fun', 'Nature & Food', 'Symbols'];
  const catsEl = $('#emoji-cats', root);
  const gridEl = $('#emoji-grid', root);
  const searchInput = $('#emoji-search-input', root);
  const fileInput = $('#emoji-file-input', root);

  const renderGrid = () => {
    const customList = readCustomEmojis();
    catsEl.innerHTML = cats.map((c) => `<button type="button" class="emoji-cat-btn ${state.cat === c ? 'on' : ''}" data-ecat="${esc(c)}">${c === 'Custom Uploaded' ? `Custom (${customList.length})` : esc(c)}</button>`).join('');

    const q = state.query.trim().toLowerCase();
    const items = [];

    if (state.cat === 'All' || state.cat === 'Custom Uploaded') {
      for (const ce of customList) {
        if (!q || (ce.name || '').toLowerCase().includes(q) || 'custom uploaded sticker'.includes(q)) {
          items.push(`<button type="button" class="emoji-pick-item" data-pick-emoji="${esc(ce.id)}" title="${esc(ce.name || 'Custom emoji')}"><img class="emoji-btn-img" src="${esc(ce.dataUrl)}" alt="${esc(ce.name)}"><span class="del-custom-emoji" data-del-ce="${esc(ce.id)}" title="Delete custom emoji">✕</span></button>`);
        }
      }
    }

    if (state.cat !== 'Custom Uploaded') {
      for (const item of EMOJI_CATALOG) {
        if (state.cat !== 'All' && item.c !== state.cat) continue;
        if (q && !item.k.includes(q) && !item.c.toLowerCase().includes(q) && item.e !== q) continue;
        items.push(`<button type="button" class="emoji-pick-item" data-pick-emoji="${esc(item.e)}" title="${esc(item.k.split(' ')[0])}">${item.e}</button>`);
      }
    }

    gridEl.innerHTML = items.length
      ? items.join('')
      : `<p class="small-note center" style="grid-column:1/-1;padding:24px 0">${state.cat === 'Custom Uploaded' ? 'No custom emojis uploaded yet. Click "+ Upload Image" below!' : 'No matching emojis found.'}</p>`;
  };

  searchInput.addEventListener('input', (e) => { state.query = e.target.value; renderGrid(); });
  $('#trigger-emoji-upload', root).addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 96);
      const cleanName = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Custom Sticker';
      const newCe = { id: 'ce_' + newId(), name: cleanName, dataUrl };
      const list = [newCe, ...readCustomEmojis()];
      if (!saveCustomEmojis(list)) {
        showNotice('Storage full — delete an older custom emoji first.');
        return;
      }
      buzz();
      showNotice(`Uploaded custom emoji "${cleanName}"!`);
      closeModal();
      onSelect(newCe.id);
    } catch {
      showNotice('Could not load that image file.');
    }
  });

  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t === root || t.closest('[data-close]')) { closeModal(); return; }
    const catBtn = t.closest('[data-ecat]');
    if (catBtn) { state.cat = catBtn.dataset.ecat; renderGrid(); return; }
    const delBtn = t.closest('[data-del-ce]');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.dataset.delCe;
      saveCustomEmojis(readCustomEmojis().filter((x) => x.id !== id));
      renderGrid();
      showNotice('Custom emoji removed.');
      return;
    }
    const pickBtn = t.closest('[data-pick-emoji]');
    if (pickBtn) {
      const val = pickBtn.dataset.pickEmoji;
      buzz();
      closeModal();
      onSelect(val);
    }
  });

  renderGrid();
  searchInput.focus();
}

/* --------- create / edit countdown form --------- */
function renderStyleChipHtml(key, label, activeKey) {
  const ct = key.startsWith('ct_') ? findCustomTheme(key) : null;
  const dotStyle = ct ? ` style="background:${ct.mode === 'solid' ? ct.bg1 : `linear-gradient(135deg,${ct.bg1},${ct.bg2})`}"` : '';
  return `<button class="style-chip s-${esc(key)} ${activeKey === key ? 'on' : ''}" type="button" data-style="${esc(key)}"><i${dotStyle}></i> ${esc(label)}</button>`;
}

function renderForm(existing) {
  const ex = getExtras();
  const editing = !!existing;
  const st = {
    emoji: existing ? existing.emoji : QUICK_EMOJIS[0],
    style: existing ? existing.style : 'classic',
    display: existing ? existing.display : 'cards',
    fx: existing ? existing.fx : 'none',
    showMs: existing ? !!existing.showMs : false,
    category: existing ? existing.category : 'Personal',
    repeat: existing ? existing.repeat : 'none',
    pinned: existing ? !!existing.pinned : false,
    checklist: existing && Array.isArray(existing.checklist) ? existing.checklist : []
  };
  const localDate = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const drawForm = () => {
    const customEmojis = readCustomEmojis();
    const stylesMap = getAllStylesMap();
    const quickSet = [...QUICK_EMOJIS];
    if (st.emoji && !quickSet.includes(st.emoji) && !st.emoji.startsWith('ce_')) quickSet.unshift(st.emoji);

    app.innerHTML = `<section class="page wide"><a class="back" href="#/">← Back</a><div class="form-grid"><div class="form-card"><h1>${editing ? 'Edit countdown' : 'New countdown'}</h1><p>Set a target date, pick or upload an emoji, and customize the theme.</p><form id="cd-form">`
      + `<div class="field"><label for="event-name">Event name</label><input id="event-name" type="text" maxlength="70" required placeholder="e.g. Vacation in Kyoto" value="${editing ? esc(existing.name) : ''}"></div>`
      + `<div class="field"><label for="event-date">Target date & time</label><input id="event-date" type="datetime-local" required value="${editing ? localDate(new Date(existing.end)) : ''}"></div>`
      + `<div class="field-label">Quick time presets</div><div class="presets"><button type="button" data-add="15m">+15 min</button><button type="button" data-add="1h">+1 hour</button><button type="button" data-add="1d">+1 day</button><button type="button" data-add="7d">+1 week</button><button type="button" data-add="30d">+1 month</button><button type="button" data-add="365d">+1 year</button></div>`
      + `<div class="field-row-2"><div class="field" style="margin:0"><label for="event-cat">Category</label><select id="event-cat">${CATEGORIES.map((c) => `<option value="${esc(c)}"${st.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`
      + `<div class="field" style="margin:0"><label for="event-rep">Repeat cycle</label><select id="event-rep">${REPEATS.map(([v, l]) => `<option value="${v}"${st.repeat === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>`
      + `<div class="field"><label for="event-note">Optional note or milestone subtitle</label><input id="event-note" type="text" maxlength="140" placeholder="e.g. Flight JL 005 departs Terminal 1" value="${editing && existing.note ? esc(existing.note) : ''}"></div>`
      + `<div class="field"><div class="field-label"><span>Emoji / Custom Sticker</span><button type="button" class="text-link" id="open-emoji-picker">Browse 70+ & Upload Custom…</button></div>`
      + `<div class="emoji-row">`
      + customEmojis.map((ce) => `<button type="button" data-emoji="${esc(ce.id)}" title="${esc(ce.name)}"><img class="emoji-btn-img" src="${esc(ce.dataUrl)}" alt="${esc(ce.name)}"></button>`).join('')
      + quickSet.map((e) => `<button type="button" data-emoji="${esc(e)}">${renderEmoji(e)}</button>`).join('')
      + `<button type="button" class="emoji-more-btn" id="open-emoji-picker-btn">＋ Picker / Upload</button>`
      + `</div></div>`
      + `<div class="field"><div class="field-label"><span>Theme</span><a class="text-link" href="#/themes">Open Theme Studio →</a></div>`
      + `<div class="style-row">${Object.entries(stylesMap).map(([k, label]) => renderStyleChipHtml(k, label, st.style)).join('')}<button type="button" class="style-chip custom-chip-btn" id="quick-theme-modal">＋ New Custom Theme</button></div></div>`
      + (ex.clockModes ? `<div class="field"><label>Clock Display Mode</label><div class="seg" id="disp-seg">${DISPLAY_MODES.map(([k, l]) => `<button type="button" data-disp="${k}" class="${st.display === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : '')
      + (ex.particles ? `<div class="field"><label>Ambient Particle Effect</label><div class="seg" id="fx-seg">${PARTICLE_FX.map(([k, l]) => `<button type="button" data-fx="${k}" class="${st.fx === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : '')
      + (ex.clockModes ? `<div class="opt-row" style="margin-bottom:18px"><span>Show High-Precision Tenths of a Second (.0)</span><button type="button" class="toggle ${st.showMs ? 'on' : ''}" id="toggle-ms"></button></div>` : '')
      + `<p class="form-error" id="form-error"></p><button class="button" type="submit">${editing ? 'Save changes' : 'Create & view countdown'}</button></form></div>`
      + `<div class="preview-pane"><div class="eyebrow"><span class="eyebrow-dot"></span> LIVE PREVIEW</div><div id="form-preview"></div></div></div></section>`;

    const nameInput = $('#event-name');
    const dateInput = $('#event-date');
    const noteInput = $('#event-note');
    const catInput = $('#event-cat');
    const repInput = $('#event-rep');
    if (existing) dateInput.value = localDate(new Date(existing.end));
    else if (!dateInput.value) dateInput.value = localDate(new Date(Date.now() + 7 * DAY));

    const sync = () => {
      st.category = catInput.value;
      st.repeat = repInput.value;
      $$('[data-emoji]', app).forEach((b) => b.classList.toggle('on', b.dataset.emoji === st.emoji));
      $$('[data-style]', app).forEach((b) => b.classList.toggle('on', b.dataset.style === st.style));
      $$('[data-disp]', app).forEach((b) => b.classList.toggle('on', b.dataset.disp === st.display));
      $$('[data-fx]', app).forEach((b) => b.classList.toggle('on', b.dataset.fx === st.fx));
      const msBtn = $('#toggle-ms');
      if (msBtn) msBtn.classList.toggle('on', st.showMs);
      const end = new Date(dateInput.value).getTime();
      const ev = normalize({
        name: nameInput.value.trim() || 'Your countdown',
        end: Number.isFinite(end) ? end : Date.now() + 3 * DAY,
        start: Date.now(),
        emoji: st.emoji,
        style: st.style,
        display: st.display,
        fx: st.fx,
        showMs: st.showMs,
        category: st.category,
        repeat: st.repeat,
        note: noteInput.value.trim()
      });
      $('#form-preview').innerHTML = widgetHtml(ev, { showMilestones: true });
      tickAll();
    };

    nameInput.addEventListener('input', sync);
    dateInput.addEventListener('input', sync);
    noteInput.addEventListener('input', sync);
    catInput.addEventListener('change', sync);
    repInput.addEventListener('change', sync);

    $$('[data-emoji]', app).forEach((b) => b.addEventListener('click', () => { st.emoji = b.dataset.emoji; buzz(); sync(); }));
    $$('[data-style]', app).forEach((b) => b.addEventListener('click', () => { st.style = b.dataset.style; buzz(); sync(); }));
    $$('[data-disp]', app).forEach((b) => b.addEventListener('click', () => { st.display = b.dataset.disp; buzz(); sync(); }));
    $$('[data-fx]', app).forEach((b) => b.addEventListener('click', () => { st.fx = b.dataset.fx; buzz(); sync(); }));
    const msBtn = $('#toggle-ms');
    if (msBtn) msBtn.addEventListener('click', () => { st.showMs = !st.showMs; buzz(); sync(); });

    const handleEmojiModal = () => {
      const savedName = nameInput.value;
      const savedDate = dateInput.value;
      const savedNote = noteInput.value;
      openEmojiPickerModal(st.emoji, (picked) => {
        st.emoji = picked;
        drawForm();
        $('#event-name').value = savedName;
        $('#event-date').value = savedDate;
        $('#event-note').value = savedNote;
        $('#event-name').dispatchEvent(new Event('input'));
      });
    };
    $('#open-emoji-picker').addEventListener('click', handleEmojiModal);
    $('#open-emoji-picker-btn').addEventListener('click', handleEmojiModal);

    $('#quick-theme-modal').addEventListener('click', () => {
      const savedName = nameInput.value;
      const savedDate = dateInput.value;
      const savedNote = noteInput.value;
      openQuickThemeEditorModal(null, (createdTheme) => {
        st.style = createdTheme.id;
        drawForm();
        $('#event-name').value = savedName;
        $('#event-date').value = savedDate;
        $('#event-note').value = savedNote;
        $('#event-name').dispatchEvent(new Event('input'));
      });
    });

    $$('[data-add]').forEach((b) => b.addEventListener('click', () => {
      const map = { '15m': 9e5, '1h': 36e5, '1d': DAY, '7d': 7 * DAY, '30d': 30 * DAY, '365d': 365 * DAY };
      const add = map[b.dataset.add] || DAY;
      dateInput.value = localDate(new Date(Date.now() + add));
      sync();
    }));

    $('#cd-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const end = new Date(dateInput.value).getTime();
      const err = $('#form-error');
      if (!name || !Number.isFinite(end)) {
        err.textContent = 'Please enter a valid event name and date.';
        err.style.display = 'block';
        return;
      }
      const ev = normalize({
        id: existing ? existing.id : newId(),
        name,
        end,
        start: existing && existing.end === end ? existing.start : Date.now(),
        emoji: st.emoji,
        style: st.style,
        display: st.display,
        fx: st.fx,
        showMs: st.showMs,
        category: st.category,
        repeat: st.repeat,
        note: noteInput.value.trim(),
        pinned: st.pinned,
        checklist: st.checklist
      });
      upsertEvent(ev);
      buzz();
      location.hash = countdownHash(ev);
    });

    sync();
  };

  drawForm();
}

/* --------- Theme Studio (#/themes) & Quick Theme Modal --------- */
function randomHarmonyPalette() {
  const h1 = Math.floor(Math.random() * 360);
  const h2 = (h1 + 35 + Math.floor(Math.random() * 55)) % 360;
  const hAcc = (h1 + 160 + Math.floor(Math.random() * 60)) % 360;
  const hslToHex = (h, s, l) => {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [0, 8, 4].map((x) => Math.round(255 * f(x)).toString(16).padStart(2, '0')).join('');
  };
  const darkBg = Math.random() > 0.22;
  const fxList = ['none', 'sparkles', 'bubbles', 'snow', 'petals', 'embers', 'matrix'];
  return {
    bg1: hslToHex(h1, 70, darkBg ? 14 : 92),
    bg2: hslToHex(h2, 75, darkBg ? 28 : 80),
    fg: darkBg ? '#ffffff' : '#1e1b4b',
    acc: hslToHex(hAcc, 90, darkBg ? 68 : 42),
    angle: Math.floor(Math.random() * 8) * 45,
    fx: getExtras().particles ? fxList[Math.floor(Math.random() * fxList.length)] : 'none'
  };
}

function openQuickThemeEditorModal(existingTheme, onSave) {
  closeModal();
  const draft = normalizeCustomThemeObj(existingTheme || {
    id: 'ct_' + newId(),
    name: 'My Custom Theme',
    mode: 'gradient',
    bg1: '#1e1b4b',
    bg2: '#4338ca',
    fg: '#ffffff',
    acc: '#38bdf8',
    angle: 135,
    font: 'sans',
    glow: false,
    fx: 'none',
    display: 'cards'
  });
  const root = document.createElement('div');
  root.className = 'modal-backdrop';
  root.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>Custom Theme Editor</h2><button class="icon-button" type="button" data-close>✕</button></div><div id="quick-theme-body"></div></div>`;
  modalRoot.append(root);
  document.body.classList.add('modal-open');

  const renderModalEditor = () => {
    const body = $('#quick-theme-body', root);
    const demoEv = normalize({ name: draft.name || 'Custom Theme', end: Date.now() + 5 * DAY + 14400000, start: Date.now() - 2 * DAY, emoji: '✨', style: draft.id, customTheme: draft, fx: draft.fx, display: draft.display });
    body.innerHTML = `<div class="share-preview" id="qt-preview">${widgetHtml(demoEv, { size: 'compact' })}</div>`
      + `<div class="field"><label>Theme Name <button type="button" class="text-link" id="qt-random">Randomize Palette</button></label><input id="qt-name" type="text" maxlength="32" value="${esc(draft.name)}"></div>`
      + `<div class="color-grid">`
      + `<div class="color-field"><label>Background Start</label><div class="color-input-row"><input type="color" id="qt-bg1" value="${esc(draft.bg1)}"><input type="text" id="qt-bg1-hex" value="${esc(draft.bg1)}"></div></div>`
      + `<div class="color-field"><label>Background End</label><div class="color-input-row"><input type="color" id="qt-bg2" value="${esc(draft.bg2)}"><input type="text" id="qt-bg2-hex" value="${esc(draft.bg2)}"></div></div>`
      + `<div class="color-field"><label>Text Color</label><div class="color-input-row"><input type="color" id="qt-fg" value="${esc(draft.fg)}"><input type="text" id="qt-fg-hex" value="${esc(draft.fg)}"></div></div>`
      + `<div class="color-field"><label>Digit Accent</label><div class="color-input-row"><input type="color" id="qt-acc" value="${esc(draft.acc)}"><input type="text" id="qt-acc-hex" value="${esc(draft.acc)}"></div></div>`
      + `</div>`
      + `<div class="opt-row"><span>Digit Font</span><div class="seg small">${[['sans', 'Sans'], ['mono', 'Mono'], ['serif', 'Serif'], ['rounded', 'Round']].map(([v, l]) => `<button type="button" data-qt-font="${v}" class="${draft.font === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`
      + `<div class="opt-row"><span>Neon Accent Glow</span><button type="button" class="toggle ${draft.glow ? 'on' : ''}" id="qt-glow"></button></div>`
      + `<button class="button" type="button" id="qt-save">Save & Apply Theme</button>`;

    const updatePreviewOnly = () => {
      const ev = normalize({ name: draft.name || 'Custom Theme', end: Date.now() + 5 * DAY + 14400000, start: Date.now() - 2 * DAY, emoji: '✨', style: draft.id, customTheme: draft, fx: draft.fx, display: draft.display });
      $('#qt-preview', root).innerHTML = widgetHtml(ev, { size: 'compact' });
      tickAll();
    };

    $('#qt-name', root).addEventListener('input', (e) => { draft.name = e.target.value; updatePreviewOnly(); });
    for (const k of ['bg1', 'bg2', 'fg', 'acc']) {
      const picker = $(`#qt-${k}`, root);
      const hex = $(`#qt-${k}-hex`, root);
      picker.addEventListener('input', () => { draft[k] = picker.value; hex.value = picker.value; updatePreviewOnly(); });
      hex.addEventListener('input', () => { if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) { draft[k] = hex.value; picker.value = hex.value; updatePreviewOnly(); } });
    }
    $$('[data-qt-font]', root).forEach((b) => b.addEventListener('click', () => { draft.font = b.dataset.qtFont; renderModalEditor(); }));
    $('#qt-glow', root).addEventListener('click', () => { draft.glow = !draft.glow; renderModalEditor(); });
    $('#qt-random', root).addEventListener('click', () => { Object.assign(draft, randomHarmonyPalette()); renderModalEditor(); });
    $('#qt-save', root).addEventListener('click', () => {
      const saved = normalizeCustomThemeObj(draft);
      const list = readCustomThemes().filter((t) => t.id !== saved.id);
      list.unshift(saved);
      saveCustomThemes(list);
      buzz();
      closeModal();
      showNotice(`Saved custom theme "${saved.name}"!`);
      if (onSave) onSave(saved);
    });
    tickAll();
  };

  root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('[data-close]')) closeModal(); });
  renderModalEditor();
}

function renderThemeStudio() {
  const ex = getExtras();
  let activeDraft = normalizeCustomThemeObj({
    id: 'ct_' + newId(),
    name: 'Midnight Cyber',
    mode: 'gradient',
    bg1: '#0f051d',
    bg2: '#2b0938',
    fg: '#ffffff',
    acc: '#00f5d4',
    angle: 135,
    font: 'mono',
    glow: true,
    fx: ex.particles ? 'sparkles' : 'none',
    display: ex.clockModes ? 'flip' : 'cards'
  });
  let isEditingExisting = false;

  const drawStudio = () => {
    const savedThemes = readCustomThemes();
    const previewEv = normalize({
      name: activeDraft.name || 'Theme Preview',
      end: Date.now() + 9 * DAY + 21600000,
      start: Date.now() - 4 * DAY,
      emoji: '🎨',
      style: activeDraft.id,
      display: activeDraft.display,
      fx: activeDraft.fx,
      customTheme: activeDraft,
      category: 'Launch',
      note: 'Live preview of your custom theme settings'
    });

    app.innerHTML = `<section class="page wide"><a class="back" href="#/">← Back to Countdowns</a>`
      + `<div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-dot"></span> THEME STUDIO</span><h1 style="margin:10px 0 4px;font-size:clamp(28px,4vw,42px);letter-spacing:-1.6px">Design your own custom themes</h1><p class="small-note" style="margin:0">Craft gradients, solid surfaces, digit typography and neon glows. Custom themes carry over into share links and embeds.</p></div></div>`
      + `<div class="theme-studio-grid">`
      + `<div class="form-card">`
      + `<div class="field"><label for="ts-name"><span>Theme Name</span><button type="button" class="text-link" id="ts-random">Randomize Harmony</button></label><input id="ts-name" type="text" maxlength="32" value="${esc(activeDraft.name)}" placeholder="e.g. Neon Sunset"></div>`
      + `<div class="field-label">Quick Starter Templates</div>`
      + `<div class="presets">${THEME_STARTERS.map((s, idx) => `<button type="button" data-starter="${idx}">${esc(s.name)}</button>`).join('')}</div>`
      + `<div class="field"><label>Background Mode</label><div class="seg" id="ts-mode"><button type="button" data-mode="gradient" class="${activeDraft.mode === 'gradient' ? 'on' : ''}">Linear Gradient</button><button type="button" data-mode="solid" class="${activeDraft.mode === 'solid' ? 'on' : ''}">Solid Color</button></div></div>`
      + `<div class="color-grid">`
      + `<div class="color-field"><label>${activeDraft.mode === 'solid' ? 'Background Color' : 'Gradient Start'}</label><div class="color-input-row"><input type="color" id="ts-bg1" value="${esc(activeDraft.bg1)}"><input type="text" id="ts-bg1-hex" value="${esc(activeDraft.bg1)}" maxlength="7"></div></div>`
      + (activeDraft.mode === 'gradient' ? `<div class="color-field"><label>Gradient End</label><div class="color-input-row"><input type="color" id="ts-bg2" value="${esc(activeDraft.bg2)}"><input type="text" id="ts-bg2-hex" value="${esc(activeDraft.bg2)}" maxlength="7"></div></div>` : '')
      + `<div class="color-field"><label>Text & Heading Color</label><div class="color-input-row"><input type="color" id="ts-fg" value="${esc(activeDraft.fg)}"><input type="text" id="ts-fg-hex" value="${esc(activeDraft.fg)}" maxlength="7"></div></div>`
      + `<div class="color-field"><label>Digit & Bar Accent</label><div class="color-input-row"><input type="color" id="ts-acc" value="${esc(activeDraft.acc)}"><input type="text" id="ts-acc-hex" value="${esc(activeDraft.acc)}" maxlength="7"></div></div>`
      + `</div>`
      + (activeDraft.mode === 'gradient' ? `<div class="field"><label for="ts-angle"><span>Gradient Angle</span><span id="ts-angle-val">${activeDraft.angle}°</span></label><div class="range-row"><input type="range" id="ts-angle" min="0" max="360" step="15" value="${activeDraft.angle}"></div></div>` : '')
      + (ex.clockModes ? `<div class="field"><label>Default Clock Display Style</label><div class="seg">${DISPLAY_MODES.map(([v, l]) => `<button type="button" data-ts-disp="${v}" class="${activeDraft.display === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : '')
      + (ex.particles ? `<div class="field"><label>Ambient Particle Canvas</label><div class="seg">${PARTICLE_FX.map(([v, l]) => `<button type="button" data-ts-fx="${v}" class="${activeDraft.fx === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : '')
      + `<div class="field"><label>Digit Typography</label><div class="seg">${[['sans', 'Modern Sans'], ['mono', 'Code Mono'], ['serif', 'Editorial Serif'], ['rounded', 'Soft Rounded']].map(([v, l]) => `<button type="button" data-font="${v}" class="${activeDraft.font === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`
      + `<div class="opt-row" style="margin-bottom:20px"><span>Neon Glow Effect</span><button type="button" class="toggle ${activeDraft.glow ? 'on' : ''}" id="ts-glow"></button></div>`
      + `<div style="display:flex;gap:10px"><button class="button" type="button" id="ts-save">${isEditingExisting ? 'Update Custom Theme' : 'Save Custom Theme'}</button>${isEditingExisting ? `<button class="button secondary-button" type="button" id="ts-cancel-edit" style="flex:0 0 auto;width:auto">New</button>` : ''}</div>`
      + `</div>`
      + `<div class="preview-pane">`
      + `<div class="eyebrow"><span class="eyebrow-dot"></span> LIVE THEME PREVIEW</div>`
      + `<div id="ts-live-preview" style="width:100%">${widgetHtml(previewEv, { showMilestones: true })}</div>`
      + `<div class="settings-card" style="width:100%;margin-top:8px"><h3>Your Saved Custom Themes (${savedThemes.length})</h3>`
      + (savedThemes.length
        ? `<div class="saved-themes-grid">${savedThemes.map((t) => {
            const bg = t.mode === 'solid' ? t.bg1 : `linear-gradient(${t.angle || 135}deg,${t.bg1},${t.bg2})`;
            return `<div class="theme-card"><div class="theme-swatch-bar" style="background:${esc(bg)};color:${esc(t.fg)}"><span>${esc(t.name)}</span><span style="color:${esc(t.acc)}">09:42</span></div><div class="theme-card-actions"><button type="button" data-use-theme="${esc(t.id)}">Use</button><button type="button" data-edit-theme="${esc(t.id)}">Edit</button><button type="button" class="danger" data-del-theme="${esc(t.id)}">Delete</button></div></div>`;
          }).join('')}</div>`
        : `<p class="small-note" style="margin:0">You haven’t saved any custom themes yet. Customize the palette in the editor and click <strong>Save Custom Theme</strong>!</p>`)
      + `</div></div></div></section>`;

    const refreshPreview = () => {
      const ev = normalize({
        name: activeDraft.name || 'Theme Preview',
        end: Date.now() + 9 * DAY + 21600000,
        start: Date.now() - 4 * DAY,
        emoji: '🎨',
        style: activeDraft.id,
        display: activeDraft.display,
        fx: activeDraft.fx,
        customTheme: activeDraft,
        category: 'Launch',
        note: 'Live preview of your custom theme settings'
      });
      $('#ts-live-preview').innerHTML = widgetHtml(ev, { showMilestones: true });
      tickAll();
    };

    $('#ts-name').addEventListener('input', (e) => { activeDraft.name = e.target.value; refreshPreview(); });
    for (const k of ['bg1', 'bg2', 'fg', 'acc']) {
      const picker = $(`#ts-${k}`);
      const hex = $(`#ts-${k}-hex`);
      if (!picker || !hex) continue;
      picker.addEventListener('input', () => { activeDraft[k] = picker.value; hex.value = picker.value; refreshPreview(); });
      hex.addEventListener('input', () => { if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) { activeDraft[k] = hex.value; picker.value = hex.value; refreshPreview(); } });
    }
    const angleEl = $('#ts-angle');
    if (angleEl) {
      angleEl.addEventListener('input', () => {
        activeDraft.angle = Number(angleEl.value);
        $('#ts-angle-val').textContent = `${activeDraft.angle}°`;
        refreshPreview();
      });
    }
    $$('[data-mode]', app).forEach((b) => b.addEventListener('click', () => { activeDraft.mode = b.dataset.mode; drawStudio(); }));
    $$('[data-font]', app).forEach((b) => b.addEventListener('click', () => { activeDraft.font = b.dataset.font; drawStudio(); }));
    $$('[data-ts-disp]', app).forEach((b) => b.addEventListener('click', () => { activeDraft.display = b.dataset.tsDisp; drawStudio(); }));
    $$('[data-ts-fx]', app).forEach((b) => b.addEventListener('click', () => { activeDraft.fx = b.dataset.tsFx; drawStudio(); }));
    $('#ts-glow').addEventListener('click', () => { activeDraft.glow = !activeDraft.glow; drawStudio(); });
    $('#ts-random').addEventListener('click', () => { Object.assign(activeDraft, randomHarmonyPalette()); buzz(); drawStudio(); });
    $$('[data-starter]', app).forEach((b) => b.addEventListener('click', () => {
      const starter = THEME_STARTERS[Number(b.dataset.starter)];
      if (starter) { Object.assign(activeDraft, starter); buzz(); drawStudio(); }
    }));

    $('#ts-save').addEventListener('click', () => {
      const saved = normalizeCustomThemeObj(activeDraft);
      const list = readCustomThemes().filter((t) => t.id !== saved.id);
      list.unshift(saved);
      saveCustomThemes(list);
      const updatedEvents = readEvents().map((ev) => ev.style === saved.id ? { ...ev, customTheme: saved } : ev);
      saveEvents(updatedEvents);
      isEditingExisting = false;
      activeDraft = normalizeCustomThemeObj({ ...saved, id: 'ct_' + newId(), name: saved.name + ' Copy' });
      buzz();
      drawStudio();
      showNotice(`Saved custom theme "${saved.name}"!`);
    });

    const cancelBtn = $('#ts-cancel-edit');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      isEditingExisting = false;
      activeDraft = normalizeCustomThemeObj({ id: 'ct_' + newId(), name: 'My Custom Theme', ...randomHarmonyPalette() });
      drawStudio();
    });

    $$('[data-edit-theme]', app).forEach((b) => b.addEventListener('click', () => {
      const found = findCustomTheme(b.dataset.editTheme);
      if (found) { activeDraft = normalizeCustomThemeObj({ ...found }); isEditingExisting = true; drawStudio(); }
    }));

    $$('[data-del-theme]', app).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.delTheme;
      const found = findCustomTheme(id);
      saveCustomThemes(readCustomThemes().filter((t) => t.id !== id));
      drawStudio();
      showNotice(`Deleted theme "${found ? found.name : ''}".`);
    }));

    $$('[data-use-theme]', app).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.useTheme;
      location.hash = '/create';
      setTimeout(() => {
        const chip = $(`[data-style="${id}"]`);
        if (chip) chip.click();
      }, 60);
    }));

    tickAll();
  };

  drawStudio();
}

/* --------- Focus & Pomodoro Studio (#/focus — Only accessible when enabled in Settings) --------- */
let focusState = {
  durationSec: 25 * 60,
  remainingSec: 25 * 60,
  running: false,
  modeLabel: '25m Pomodoro',
  timerId: null,
  soundscape: 'off',
  audioCtx: null,
  audioNodes: []
};

function stopAmbientSoundscape() {
  if (focusState.audioNodes.length) {
    focusState.audioNodes.forEach((n) => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch {} });
    focusState.audioNodes = [];
  }
  if (focusState.audioCtx) {
    try { focusState.audioCtx.close(); } catch {}
    focusState.audioCtx = null;
  }
  focusState.soundscape = 'off';
}

function startAmbientSoundscape(type) {
  stopAmbientSoundscape();
  focusState.soundscape = type;
  if (type === 'off') return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    focusState.audioCtx = ctx;

    if (type === 'rain') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.018;
        b6 = white * 0.115926;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 950;
      noise.connect(filter);
      filter.connect(ctx.destination);
      noise.start();
      focusState.audioNodes.push(noise, filter);
    } else if (type === 'drone') {
      [110, 164.81, 220, 277.18].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.025;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        focusState.audioNodes.push(osc, gain);
      });
    } else if (type === 'binaural') {
      const left = ctx.createOscillator();
      const right = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);
      const gain = ctx.createGain();
      left.frequency.value = 200;
      right.frequency.value = 206;
      gain.gain.value = 0.04;
      left.connect(merger, 0, 0);
      right.connect(merger, 0, 1);
      merger.connect(gain);
      gain.connect(ctx.destination);
      left.start(); right.start();
      focusState.audioNodes.push(left, right, gain);
    }
  } catch { /* ignore */ }
}

function renderFocusStudio() {
  if (!getExtras().focusStudio) {
    app.innerHTML = `<section class="page not-found"><h1>Focus Studio is turned off</h1><p>You can turn on the Focus & Ambient Soundscape Studio anytime from Settings.</p><a class="button" href="#/settings">Go to Settings</a></section>`;
    return;
  }
  const stats = readJson(FOCUS_STATS_KEY, { sessions: 0, totalMinutes: 0 });
  const r = 100;
  const c = (2 * Math.PI * r).toFixed(1);

  const drawFocus = () => {
    const mins = Math.floor(focusState.remainingSec / 60);
    const secs = focusState.remainingSec % 60;
    const frac = Math.min(1, Math.max(0, focusState.remainingSec / Math.max(1, focusState.durationSec)));
    const offset = (c * (1 - frac)).toFixed(1);

    app.innerHTML = `<section class="page wide"><a class="back" href="#/">← Back to Countdowns</a>`
      + `<div class="section-heading"><div><span class="eyebrow"><span class="eyebrow-dot"></span> FOCUS & AMBIENT STUDIO</span><h1 style="margin:10px 0 4px;font-size:clamp(28px,4vw,42px);letter-spacing:-1.6px">Pomodoro Timer & Ambient Soundscapes</h1><p class="small-note" style="margin:0">Stay in flow with quick countdown intervals and real-time Web Audio synthesized soundscapes.</p></div></div>`
      + `<div class="focus-wrap">`
      + `<div class="focus-stage">`
      + `<div class="seg" style="width:100%">`
      + [['1500', '25m Focus'], ['300', '5m Break'], ['900', '15m Rest'], ['3600', '60m Deep']].map(([sec, label]) => `<button type="button" data-fpreset="${sec}" data-flabel="${esc(label)}" class="${focusState.durationSec === Number(sec) ? 'on' : ''}">${label}</button>`).join('')
      + `</div>`
      + `<div class="focus-ring-box">`
      + `<svg class="focus-ring-svg" viewBox="0 0 220 220"><circle class="focus-ring-bg" cx="110" cy="110" r="${r}"/><circle class="focus-ring-fg" id="focus-ring-circle" cx="110" cy="110" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${offset}"/></svg>`
      + `<div><div class="focus-time-readout" id="focus-readout">${pad(mins)}:${pad(secs)}</div><div class="focus-sub-readout">${esc(focusState.modeLabel)}</div></div>`
      + `</div>`
      + `<div style="display:flex;gap:10px;width:100%;max-width:340px">`
      + `<button class="button" type="button" id="focus-toggle" style="flex:1">${focusState.running ? 'Pause' : '▶ Start Focus'}</button>`
      + `<button class="button secondary-button" type="button" id="focus-reset" style="flex:0 0 auto;width:auto">↺ Reset</button>`
      + `</div>`
      + `</div>`
      + `<div style="display:flex;flex-direction:column;gap:14px">`
      + `<div class="settings-card" style="margin:0"><h3>Synthesized Ambient Soundscapes</h3><p>Generated live in your browser using Web Audio — zero external audio files required.</p>`
      + `<div class="soundscape-grid">`
      + [
          ['off', '', 'Silent', 'No background audio'],
          ['rain', '', 'Soft Pink Rain', 'Filtered warm rainfall noise'],
          ['drone', '', 'Warm Harmonics', 'Ambient A2/E3 sine chord'],
          ['binaural', '', 'Theta Binaural', '200Hz / 206Hz focus wave']
        ].map(([k, icon, title, desc]) => `<button type="button" class="sound-card ${focusState.soundscape === k ? 'on' : ''}" data-soundscape="${k}"><div><strong>${title}</strong><small>${desc}</small></div></button>`).join('')
      + `</div></div>`
      + `<div class="settings-card" style="margin:0"><h3>Your Focus Stats</h3><div class="stats" style="grid-template-columns:1fr 1fr;margin-top:8px"><div class="stat"><strong>${stats.sessions}</strong><small>COMPLETED SESSIONS</small></div><div class="stat"><strong>${stats.totalMinutes}m</strong><small>TOTAL FOCUS TIME</small></div></div></div>`
      + `</div></div></section>`;

    $$('[data-fpreset]', app).forEach((b) => b.addEventListener('click', () => {
      clearInterval(focusState.timerId);
      focusState.running = false;
      focusState.durationSec = Number(b.dataset.fpreset);
      focusState.remainingSec = focusState.durationSec;
      focusState.modeLabel = b.dataset.flabel;
      buzz();
      drawFocus();
    }));

    $('#focus-toggle').addEventListener('click', () => {
      if (focusState.running) {
        clearInterval(focusState.timerId);
        focusState.running = false;
      } else {
        focusState.running = true;
        focusState.timerId = setInterval(() => {
          if (focusState.remainingSec > 0) {
            focusState.remainingSec--;
            const ro = $('#focus-readout');
            const rc = $('#focus-ring-circle');
            if (ro) ro.textContent = `${pad(Math.floor(focusState.remainingSec / 60))}:${pad(focusState.remainingSec % 60)}`;
            if (rc) {
              const f = focusState.remainingSec / Math.max(1, focusState.durationSec);
              rc.style.strokeDashoffset = String((c * (1 - f)).toFixed(1));
            }
          } else {
            clearInterval(focusState.timerId);
            focusState.running = false;
            const curStats = readJson(FOCUS_STATS_KEY, { sessions: 0, totalMinutes: 0 });
            curStats.sessions += 1;
            curStats.totalMinutes += Math.round(focusState.durationSec / 60);
            writeJson(FOCUS_STATS_KEY, curStats);
            celebrateFinale('🍅');
            playChime();
            showNotice(`Completed ${focusState.modeLabel}!`);
            if (parseHash().path === '/focus') renderFocusStudio();
          }
        }, 1000);
      }
      drawFocus();
    });

    $('#focus-reset').addEventListener('click', () => {
      clearInterval(focusState.timerId);
      focusState.running = false;
      focusState.remainingSec = focusState.durationSec;
      drawFocus();
    });

    $$('[data-soundscape]', app).forEach((b) => b.addEventListener('click', () => {
      startAmbientSoundscape(b.dataset.soundscape);
      drawFocus();
    }));
  };

  drawFocus();
}

/* --------- countdown detail page --------- */
function formatZoneTime(ms, timeZone) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(Number(ms)));
  } catch { return ''; }
}

function renderCountdown() {
  const ex = getExtras();
  const ev = evFromParams(parseHash().params);
  if (!ev) {
    app.innerHTML = '<section class="page not-found"><h1>Countdown not found</h1><p>This link doesn’t look right. Create a countdown and share its link with your friends.</p><a class="button" href="#/create">+ Create countdown</a></section>';
    return;
  }
  let stored = findByNameEnd(ev.name, ev.end);
  let saved = !!stored;
  if (!stored) stored = normalize({ ...ev, id: newId(), start: ev.start || Date.now() });
  else stored = upsertEvent(normalize({ ...stored, ...ev, emoji: isImageEmoji(stored.emoji) ? stored.emoji : ev.emoji, checklist: stored.checklist }));

  liveTitle = { end: stored.end, name: stored.name };
  const canRollRepeat = stored.repeat && stored.repeat !== 'none' && stored.end <= Date.now();

  const worldZones = [
    ['Your Local Time', undefined],
    ['UTC / GMT', 'UTC'],
    ['New York (ET)', 'America/New_York'],
    ['London (UK)', 'Europe/London'],
    ['Tokyo (JST)', 'Asia/Tokyo'],
    ['Sydney (AEST)', 'Australia/Sydney']
  ];

  const drawDetail = () => {
    const checklist = stored.checklist || [];
    const doneCount = checklist.filter((c) => c.done).length;

    app.innerHTML = `<section class="page"><a class="back" href="#/">← My countdowns</a>`
      + (saved ? '' : `<div class="add-banner"><div><strong>Shared with you</strong><small>Add it to your page to keep it, edit it and use all the extras.</small></div><button class="button" id="add-to-page" type="button">Add to my page</button></div>`)
      + `<div class="stage">${widgetHtml(stored, { showMilestones: true })}`
      + `<div class="stage-controls">`
      + (ex.clockModes && saved ? `<button class="stage-btn" id="cycle-disp" type="button" title="Switch Clock Display Style">${esc(stored.display)}</button>` : '')
      + (ex.particles && saved ? `<button class="stage-btn" id="cycle-fx" type="button" title="Switch Particle Effect">${esc(stored.fx)}</button>` : '')
      + `<button class="stage-btn" id="fs" type="button" title="Toggle Full screen">⛶</button>`
      + `</div></div>`
      + (canRollRepeat && saved ? `<div style="margin-top:12px"><button class="button" id="roll-repeat" type="button" style="width:100%">Roll over to next ${esc(stored.repeat)} occurrence</button></div>` : '')
      + `<div class="action-row">`
      + `<button class="button" id="share" type="button">Share</button>`
      + `<button class="button secondary-button" id="export-img" type="button">PNG Card</button>`
      + `<button class="button secondary-button" id="remind-me" type="button">Reminder</button>`
      + `<button class="button secondary-button" id="add-cal" type="button">Calendar</button>`
      + `<button class="button secondary-button" id="celebrate-now" type="button">Celebrate</button>`
      + `</div>`
      + `<div class="stats"><div class="stat"><strong data-stat="weeks" data-end="${stored.end}">0</strong><small>WEEKS</small></div><div class="stat"><strong data-stat="days" data-end="${stored.end}">0</strong><small>DAYS</small></div><div class="stat"><strong data-stat="hours" data-end="${stored.end}">0</strong><small>HOURS</small></div><div class="stat"><strong data-stat="minutes" data-end="${stored.end}">0</strong><small>MINUTES</small></div></div>`
      + (ex.detailPanels && saved ? (`<div class="detail-panels">`
        + `<div class="detail-card"><h3><span>Event Checklist</span><small style="color:var(--muted)">${doneCount}/${checklist.length}</small></h3>`
        + `<form class="checklist-form" id="add-check-form"><input id="check-input" type="text" maxlength="80" placeholder="Add a task or packing item…"><button type="submit">Add</button></form>`
        + `<div class="checklist-items">${checklist.length ? checklist.map((item) => `<div class="check-row ${item.done ? 'done' : ''}"><input type="checkbox" data-toggle-check="${esc(item.id)}"${item.done ? ' checked' : ''}><span>${esc(item.text)}</span><button type="button" data-del-check="${esc(item.id)}" title="Remove">✕</button></div>`).join('') : `<p class="small-note" style="margin:6px 0">No checklist tasks yet. Add milestones or packing items above!</p>`}</div>`
        + `</div>`
        + `<div class="detail-card"><h3><span>World Launch Times</span><small style="color:var(--muted)">Global Sync</small></h3>`
        + `<div class="tz-list">${worldZones.map(([label, tz]) => `<div class="tz-row"><strong>${label}</strong><span>${esc(formatZoneTime(stored.end, tz))}</span></div>`).join('')}</div>`
        + `</div></div>`) : '')
      + `<div class="countdown-actions">${saved ? `<a href="#/edit/${encodeURIComponent(stored.id)}">Edit countdown</a>` : ''}<a href="#/themes">Theme Studio</a><button type="button" id="open-embed-direct">Embed on a website</button></div></section>`;

    const addBtn = $('#add-to-page');
    if (addBtn) addBtn.addEventListener('click', () => {
      stored = upsertEvent(stored); saved = true; buzz();
      showNotice('Added to your page.', { label: 'View my page', fn: () => { location.hash = '/'; } });
      drawDetail(); tickAll();
    });
    $('#share').addEventListener('click', () => openShare(stored, 'link'));
    $('#open-embed-direct').addEventListener('click', () => openShare(stored, 'embed'));
    $('#export-img').addEventListener('click', () => exportShareImage(stored));
    $('#remind-me').addEventListener('click', () => enableReminder(stored));
    $('#add-cal').addEventListener('click', () => addToCalendar(stored));
    $('#celebrate-now').addEventListener('click', () => { celebrateFinale(plainEmojiText(stored.emoji)); playChime(); buzz(); });

    const dispBtn = $('#cycle-disp');
    if (dispBtn) {
      dispBtn.addEventListener('click', () => {
        const idx = DISPLAY_MODES.findIndex(([k]) => k === stored.display);
        stored.display = DISPLAY_MODES[(idx + 1) % DISPLAY_MODES.length][0];
        stored = upsertEvent(stored);
        buzz();
        drawDetail();
        tickAll();
      });
    }

    const fxBtn = $('#cycle-fx');
    if (fxBtn) {
      fxBtn.addEventListener('click', () => {
        const idx = PARTICLE_FX.findIndex(([k]) => k === stored.fx);
        stored.fx = PARTICLE_FX[(idx + 1) % PARTICLE_FX.length][0];
        stored = upsertEvent(stored);
        buzz();
        drawDetail();
        tickAll();
      });
    }

    const checkForm = $('#add-check-form');
    if (checkForm) {
      checkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = $('#check-input');
        const text = inp.value.trim();
        if (!text) return;
        stored.checklist = [...(stored.checklist || []), { id: newId(), text, done: false }];
        stored = upsertEvent(stored);
        drawDetail();
        tickAll();
      });
    }

    $$('[data-toggle-check]', app).forEach((cb) => cb.addEventListener('change', () => {
      const id = cb.dataset.toggleCheck;
      stored.checklist = (stored.checklist || []).map((c) => c.id === id ? { ...c, done: cb.checked } : c);
      stored = upsertEvent(stored);
      drawDetail();
      tickAll();
    }));

    $$('[data-del-check]', app).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.delCheck;
      stored.checklist = (stored.checklist || []).filter((c) => c.id !== id);
      stored = upsertEvent(stored);
      drawDetail();
      tickAll();
    }));

    const rollBtn = $('#roll-repeat');
    if (rollBtn) {
      rollBtn.addEventListener('click', () => {
        const nextEnd = nextOccurrenceTimestamp(stored.end, stored.repeat);
        stored = upsertEvent({ ...stored, start: Date.now(), end: nextEnd });
        showNotice(`Rolled "${stored.name}" to ${fmtShort(stored.end)}!`);
        location.hash = countdownHash(stored);
      });
    }

    $('#fs').addEventListener('click', async () => {
      const stage = $('.stage');
      if (document.fullscreenElement) {
        document.exitFullscreen();
        if (wakeLockRef) { try { await wakeLockRef.release(); } catch {} wakeLockRef = null; }
      } else if (stage.requestFullscreen) {
        stage.requestFullscreen().then(async () => {
          if ('wakeLock' in navigator) {
            try { wakeLockRef = await navigator.wakeLock.request('screen'); } catch {}
          }
        }).catch(() => showNotice('Full screen isn’t available here.'));
      } else showNotice('Full screen isn’t supported on this device.');
    });
  };

  drawDetail();
}

function addToCalendar(ev) {
  const f = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const t = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Downcount//EN',
    'BEGIN:VEVENT',
    `UID:${ev.end}-${slugify(ev.name)}@downcount`,
    `DTSTAMP:${f(Date.now())}`,
    `DTSTART:${f(ev.end)}`,
    `DTEND:${f(ev.end + 1800000)}`,
    `SUMMARY:${t(plainEmojiText(ev.emoji) + ' ' + ev.name)}`,
    `DESCRIPTION:${t((ev.note ? ev.note + '\n' : '') + 'Countdown link: ' + countdownUrl(ev))}`,
    `URL:${t(countdownUrl(ev))}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  download(`${slugify(ev.name)}.ics`, ics, 'text/calendar');
  showNotice('Calendar (.ics) file downloaded.');
}

function renderEmbed() {
  const p = parseHash().params;
  const ev = evFromParams(p);
  if (!ev) { app.innerHTML = '<p class="embed-error">Countdown not found</p>'; return; }
  document.title = ev.name;
  app.innerHTML = widgetHtml(ev, { title: p.get('title') !== '0', credit: true, size: p.get('size') === 'compact' ? 'compact' : 'wide' });
}

/* --------- share modal --------- */
function embedCode(ev, st) {
  const compact = st.size === 'compact';
  const h = compact ? (st.title ? 195 : 155) : (st.title ? 320 : 250);
  const w = compact ? 360 : 640;
  const ct = resolveThemeForEvent(ev);
  if (st.fmt === 'script') {
    const ctAttrs = ct
      ? ` data-c-bg1="${esc(ct.bg1)}" data-c-bg2="${esc(ct.bg2)}" data-c-fg="${esc(ct.fg)}" data-c-acc="${esc(ct.acc)}" data-c-angle="${ct.angle}" data-c-font="${esc(ct.font)}"${ct.glow ? ' data-c-glow="1"' : ''}`
      : '';
    return `<script async src="${esc(baseUrl())}embed.js" data-name="${esc(ev.name)}" data-end="${ev.end}"${ev.start ? ` data-start="${ev.start}"` : ''} data-style="${esc(st.style)}" data-emoji="${esc(plainEmojiText(ev.emoji))}"${st.title ? '' : ' data-title="0"'} data-size="${st.size}"${ctAttrs}></script>`;
  }
  const src = `${baseUrl()}#/embed?${paramString(ev, { title: st.title ? '1' : '0', size: st.size })}`;
  return `<iframe src="${esc(src)}" title="${esc(ev.name)}" width="100%" height="${h}" style="border:0;max-width:${w}px;border-radius:20px" loading="lazy"></iframe>`;
}

function closeModal() { modalRoot.textContent = ''; document.body.classList.remove('modal-open'); }

function openShare(ev, initialTab = 'link') {
  closeModal();
  const st = { style: ev.style, tab: initialTab, size: 'wide', title: true, fmt: 'iframe' };
  const stylesMap = getAllStylesMap();
  const root = document.createElement('div');
  root.className = 'modal-backdrop';
  root.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><div class="modal-head"><h2 id="share-title">Share this countdown</h2><button class="icon-button" id="close-modal" type="button" data-close>✕</button></div><div id="share-body"></div></div>';
  modalRoot.append(root);
  document.body.classList.add('modal-open');
  const body = $('#share-body', root);

  const draw = () => {
    const customTheme = st.style.startsWith('ct_') ? (findCustomTheme(st.style) || ev.customTheme) : null;
    const cur = normalize({ ...ev, style: st.style, customTheme });
    const url = countdownUrl(cur);
    const text = `Countdown to ${ev.name} ${plainEmojiText(ev.emoji)}`;
    const emb = st.tab === 'embed';
    const linkPane = `<div class="share-box"><input id="share-field" aria-label="Shareable countdown link" readonly value="${esc(url)}"><button type="button" data-copy="#share-field">Copy link</button></div>`
      + `<div class="share-apps">`
      + `<button type="button" data-dl-img>Download PNG Card</button>`
      + `<a href="https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}" target="_blank" rel="noopener">WhatsApp</a>`
      + `<a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener">X</a>`
      + `<a href="mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}" target="_blank" rel="noopener">Email</a>`
      + `${navigator.share ? '<button type="button" data-native>More…</button>' : ''}</div>`;
    const seq = (attr, cur2, opts) => `<div class="seg small">${opts.map(([v, l]) => `<button type="button" data-${attr}="${v}" class="${cur2 === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const embedPane = `<div class="opt-row"><span>Format</span>${seq('fmt', st.fmt, [['iframe', 'iframe'], ['script', 'Script']])}</div>`
      + `<div class="opt-row"><span>Size</span>${seq('size', st.size, [['wide', 'Wide'], ['compact', 'Compact']])}</div>`
      + `<div class="opt-row"><span>Show Title</span><button class="toggle ${st.title ? 'on' : ''}" type="button" data-toggle-title></button></div>`
      + `<textarea readonly id="embed-code" aria-label="Embed code">${esc(embedCode(cur, st))}</textarea>`
      + `<button class="button" type="button" data-copy="#embed-code">Copy embed code</button>`;

    body.innerHTML = `<div class="share-preview">${widgetHtml(cur, { title: emb ? st.title : true, size: emb ? st.size : 'wide' })}</div>`
      + `<div class="field-label">Theme</div>`
      + `<div class="style-row" style="margin-bottom:14px">${Object.entries(stylesMap).map(([k, label]) => renderStyleChipHtml(k, label, st.style).replace('data-style=', 'data-pick=')).join('')}</div>`
      + `<div class="seg tabs">${seq('tab', st.tab, [['link', 'Share link & Image'], ['embed', 'Embed code']])}</div>`
      + (emb ? embedPane : linkPane);
    tickAll();
  };

  root.addEventListener('click', async (e) => {
    const t = e.target;
    if (t === root || t.closest('[data-close]')) { closeModal(); return; }
    const pick = t.closest('[data-pick]');
    const tab = t.closest('[data-tab]');
    const fmt = t.closest('[data-fmt]');
    const size = t.closest('[data-size]');
    if (pick) { st.style = pick.dataset.pick; draw(); }
    else if (tab) { st.tab = tab.dataset.tab; draw(); }
    else if (fmt) { st.fmt = fmt.dataset.fmt; draw(); }
    else if (size) { st.size = size.dataset.size; draw(); }
    else if (t.closest('[data-toggle-title]')) { st.title = !st.title; draw(); }
    else if (t.closest('[data-dl-img]')) {
      const customTheme = st.style.startsWith('ct_') ? (findCustomTheme(st.style) || ev.customTheme) : null;
      exportShareImage(normalize({ ...ev, style: st.style, customTheme }));
    } else if (t.closest('[data-native]')) {
      const customTheme = st.style.startsWith('ct_') ? (findCustomTheme(st.style) || ev.customTheme) : null;
      const cur = normalize({ ...ev, style: st.style, customTheme });
      try { await navigator.share({ title: ev.name, text: `Countdown to ${ev.name}`, url: countdownUrl(cur) }); } catch (err) { if (err.name !== 'AbortError') showNotice('Sharing failed.'); }
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); return; }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.toLowerCase() === 'n') { e.preventDefault(); location.hash = '/create'; }
  else if (e.key.toLowerCase() === 't') { e.preventDefault(); location.hash = '/themes'; }
  else if (e.key.toLowerCase() === 'f' && getExtras().focusStudio) { e.preventDefault(); location.hash = '/focus'; }
});

/* --------- settings (with Opt-In Toggles for All Cool Extras & Sound!) --------- */
const darkMq = matchMedia('(prefers-color-scheme: dark)');
const getThemePref = () => { const v = localStorage.getItem(THEME_KEY) || localStorage.getItem('downcount.theme'); return ['auto', 'light', 'dark'].includes(v) ? v : 'auto'; };

function applyTheme() {
  const pref = getThemePref(); const dark = pref === 'dark' || (pref === 'auto' && darkMq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeButton.innerHTML = dark ? ICON_SUN : ICON_MOON;
  const meta = $('meta[name=theme-color]'); if (meta) meta.content = dark ? '#171727' : '#f6f7fb';
}

function setThemePref(v) {
  try { localStorage.setItem(THEME_KEY, v); } catch { /* ignore */ }
  const root = document.documentElement; root.classList.add('theme-anim');
  applyTheme();
  clearTimeout(setThemePref.t); setThemePref.t = setTimeout(() => root.classList.remove('theme-anim'), 450);
}

async function triggerInstall() {
  if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; return; }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) showNotice('To install: tap Share in Safari, then choose “Add to Home Screen”.');
  else showNotice('Open your browser menu and choose “Install app” or “Add to Home Screen”.');
}

/* ---------- download / install page ---------- */
function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/windows/i.test(ua)) return 'windows';
  return 'other';
}
const PLATFORM_ICONS = {
  windows: svgI('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', 24),
  ios: svgI('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>', 24),
  android: svgI('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><circle cx="12" cy="6" r=".7"/><path d="M10.5 18.5h3"/>', 24)
};
const PLATFORMS = [
  { id: 'windows', name: 'Windows', browser: 'Chrome or Edge', steps: ['Open Downcount in Chrome or Edge.', 'Click the install icon at the right end of the address bar, or open the browser menu and choose “Install Downcount”.', 'Click Install. Downcount opens in its own window and shows up in your Start menu.'] },
  { id: 'ios', name: 'iOS', browser: 'Safari on iPhone or iPad', steps: ['Open Downcount in Safari.', 'Tap the Share button.', 'Scroll down, tap “Add to Home Screen”, then tap Add.'] },
  { id: 'android', name: 'Android', browser: 'Chrome', steps: ['Open Downcount in Chrome.', 'Tap the menu (three dots) in the top corner.', 'Tap “Install app” or “Add to Home screen”, then confirm.'] }
];
function renderDownload() {
  const here = detectPlatform();
  const standalone = document.documentElement.classList.contains('standalone');
  const cards = PLATFORMS.map((p) => `<article class="platform-card${here === p.id ? ' here' : ''}" data-platform="${p.id}">`
    + `<div class="platform-head"><div class="platform-icon">${PLATFORM_ICONS[p.id]}</div><div><h2>${p.name}</h2><small>${p.browser}</small></div>${here === p.id ? '<span class="platform-tag">Your device</span>' : ''}</div>`
    + `<ol>${p.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
    + `<button class="button" type="button" data-dl="${p.id}">Download for ${p.name}</button></article>`).join('');
  app.innerHTML = `<section class="page wide download-page"><a class="back" href="#/">← Back</a>`
    + `<h1 class="page-title">Download Downcount</h1>`
    + `<p class="download-lead">${standalone ? 'Downcount is already installed on this device.' : 'Pick your device. Downcount installs straight from your browser, with no app store, and works offline.'}</p>`
    + `<div class="platform-grid">${cards}</div>`
    + (here === 'other' && !standalone ? '<p class="small-note">On a Mac or Linux computer, use Chrome or Edge and click the install icon in the address bar.</p>' : '')
    + `<div class="download-foot"><span>Installing on another device?</span><button class="button secondary-button small-button" type="button" id="copy-app-link">Copy link</button></div></section>`;
  $$('[data-dl]').forEach((b) => b.addEventListener('click', () => {
    const p = PLATFORMS.find((x) => x.id === b.dataset.dl);
    if (standalone) { showNotice('Downcount is already installed on this device.'); return; }
    if (p.id === here) {
      if (installPrompt) { triggerInstall(); return; }
      const card = b.closest('.platform-card');
      card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
      showNotice(p.id === 'ios' ? 'Follow the steps: tap Share, then Add to Home Screen.' : 'Follow the steps to install from your browser menu.');
    } else {
      copyText(baseUrl()).then((ok) => showNotice(ok ? `Link copied. Open it on your ${p.name} device to install.` : `Open Downcount on your ${p.name} device to install it.`));
    }
  }));
  $('#copy-app-link').addEventListener('click', async () => showNotice((await copyText(baseUrl())) ? 'Link copied.' : 'Couldn’t copy the link.'));
}

/* ---------- share my data: one link that carries everything ---------- */
function buildShareBundle(st) {
  const b = { v: 5, t: Date.now() };
  if (st.events) b.events = readEvents();
  if (st.themes) b.customThemes = readCustomThemes();
  if (st.emojis) b.customEmojis = readCustomEmojis();
  if (st.settings) b.settings = { extras: getExtras(), theme: getThemePref(), sound: isSoundEnabled(), soundStyle: getSoundStyle(), finale: localStorage.getItem(FINALE_STYLE_KEY) || 'confetti' };
  return b;
}
async function readStreamLimited(stream, limit) {
  const reader = stream.getReader(); const chunks = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    n += value.length; if (n > limit) { reader.cancel(); throw new Error('too big'); }
    chunks.push(value);
  }
  const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
async function packBundle(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let out = bytes; let tag = 'j';
  if (typeof CompressionStream === 'function') {
    try { out = await readStreamLimited(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')), 20e6); tag = 'z'; } catch { out = bytes; tag = 'j'; }
  }
  let bin = ''; for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return tag + '.' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unpackBundle(str) {
  const m = /^([jz])\.([A-Za-z0-9_-]+)$/.exec(str);
  if (!m) throw new Error('bad link');
  const b64 = m[2].replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
  let bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (m[1] === 'z') {
    if (typeof DecompressionStream !== 'function') throw new Error('unsupported');
    bytes = await readStreamLimited(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')), 8e6);
  }
  const obj = JSON.parse(new TextDecoder().decode(bytes));
  if (!obj || typeof obj !== 'object') throw new Error('bad data');
  return obj;
}
function exportBackupFile() {
  const bundle = { version: 4, exportedAt: new Date().toISOString(), events: readEvents(), customThemes: readCustomThemes(), customEmojis: readCustomEmojis(), extras: getExtras() };
  download('downcount-backup.json', JSON.stringify(bundle, null, 2), 'application/json');
}
function openShareData() {
  closeModal();
  const counts = { events: readEvents().length, themes: readCustomThemes().length, emojis: readCustomEmojis().length };
  const st = { events: counts.events > 0, themes: counts.themes > 0, emojis: counts.emojis > 0, settings: true };
  const root = document.createElement('div'); root.className = 'modal-backdrop';
  root.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="sd-title"><div class="modal-head"><h2 id="sd-title">Share my data</h2><button class="icon-button" type="button" data-close aria-label="Close">✕</button></div><div id="sd-body"></div></div>';
  modalRoot.append(root); document.body.classList.add('modal-open');
  const body = $('#sd-body', root); let token = 0;
  const rows = [['events', 'Countdowns', counts.events], ['themes', 'Custom themes', counts.themes], ['emojis', 'Uploaded emojis', counts.emojis], ['settings', 'Settings & preferences', null]].filter((r) => r[2] === null || r[2] > 0);
  const draw = async () => {
    const my = ++token;
    const payload = await packBundle(buildShareBundle(st));
    if (my !== token) return;
    const url = `${baseUrl()}#/import/${payload}`;
    const len = url.length;
    const size = len > 1000 ? `${(len / 1000).toFixed(1)} KB` : `${len} characters`;
    const level = len > 60000 ? 'bad' : (len > 8000 ? 'warn' : 'ok');
    const msg = { ok: `Link size: ${size}. Works in most apps.`, warn: `Link size: ${size}. Some chat apps may cut long links. Try turning off uploaded emojis, or send a backup file instead.`, bad: `This is too long to share as a link (${size}). Turn off uploaded emojis, or send a backup file instead.` }[level];
    const none = !st.events && !st.themes && !st.emojis && !st.settings;
    body.innerHTML = `<p class="share-hint" style="margin:0 0 14px">Make one link that carries your data. Open it on another device to bring everything over.</p>`
      + rows.map(([k, label, n]) => `<div class="opt-row"><span>${label}${n === null ? '' : ` <small class="muted-count">(${n})</small>`}</span><button type="button" class="toggle${st[k] ? ' on' : ''}" role="switch" aria-checked="${st[k]}" aria-label="${label}" data-sd="${k}"></button></div>`).join('')
      + (none ? '<p class="share-hint">Turn something on to create a link.</p>' : (level === 'bad'
        ? `<p class="share-hint sd-${level}">${msg}</p><button class="button" type="button" data-export>Download backup file</button>`
        : `<div class="share-box"><input id="sd-link" aria-label="Link with your data" readonly value="${esc(url)}"><button type="button" data-copy-link>Copy link</button></div><div class="share-apps">${navigator.share ? '<button type="button" data-native>Share…</button>' : ''}<button type="button" data-export>Download backup file</button></div><p class="share-hint sd-${level}">${msg}</p>`))
      + '<p class="share-hint">Anyone who has this link can see and import your data, so only send it to yourself or people you trust. The data is inside the link and isn’t uploaded anywhere.</p>';
  };
  root.addEventListener('click', async (e) => {
    const t = e.target;
    if (t === root || t.closest('[data-close]')) { closeModal(); return; }
    const tg = t.closest('[data-sd]');
    if (tg) { st[tg.dataset.sd] = !st[tg.dataset.sd]; draw(); return; }
    if (t.closest('[data-export]')) { exportBackupFile(); return; }
    const cp = t.closest('[data-copy-link]');
    if (cp) {
      const ok = await copyText($('#sd-link', root).value);
      const old = cp.textContent; cp.textContent = ok ? 'Copied ✓' : 'Press Ctrl/Cmd+C'; buzz();
      setTimeout(() => { if (cp.isConnected) cp.textContent = old; }, 1600); return;
    }
    if (t.closest('[data-native]')) {
      try { await navigator.share({ title: 'My Downcount data', url: $('#sd-link', root).value }); } catch (err) { if (err.name !== 'AbortError') showNotice('Use Copy link to share your data.'); }
    }
  });
  draw();
  $('[data-close]', root).focus();
}
async function renderImport(payload) {
  app.innerHTML = '<section class="page"><p class="small-note">Reading your link…</p></section>';
  let data;
  try { data = await unpackBundle(payload); }
  catch {
    app.innerHTML = '<section class="page not-found"><h1>Link couldn’t be read</h1><p>It may have been cut off when it was sent. Ask for the link again, or use a backup file from Settings.</p><a class="button" href="#/">Go home</a></section>'; return;
  }
  const has = { events: Array.isArray(data.events), themes: Array.isArray(data.customThemes), emojis: Array.isArray(data.customEmojis), settings: !!data.settings && typeof data.settings === 'object' };
  const events = (has.events ? data.events : []).filter((e) => e && e.name && Number.isFinite(Number(e.end))).slice(0, 100).map(normalize);
  const themes = (has.themes ? data.customThemes : []).slice(0, 40).map(normalizeCustomThemeObj).filter(Boolean);
  const emojis = (has.emojis ? data.customEmojis : []).filter((x) => x && x.id && /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/.test(String(x.dataUrl || ''))).slice(0, 40);
  if (!events.length && !themes.length && !emojis.length && !has.settings) {
    app.innerHTML = '<section class="page not-found"><h1>Nothing to import</h1><p>This link doesn’t contain any Downcount data.</p><a class="button" href="#/">Go home</a></section>'; return;
  }
  const st = { mode: 'merge', settings: has.settings };
  const names = events.slice(0, 5).map((e) => esc(e.name)).join(', ') + (events.length > 5 ? `, and ${events.length - 5} more` : '');
  const li = (n, label, extra = '') => n ? `<li><strong>${n}</strong> ${label}${extra ? `<span>${extra}</span>` : ''}</li>` : '';
  const draw = () => {
    app.innerHTML = `<section class="page import-page"><a class="back" href="#/">← Cancel</a><h1 class="page-title">Bring your data over</h1><p class="download-lead">This link was shared from another device. Check what’s inside, then choose how to add it.</p>`
      + `<div class="settings-card"><h3>In this link</h3><ul class="import-list">${li(events.length, events.length === 1 ? 'countdown' : 'countdowns', names)}${li(themes.length, themes.length === 1 ? 'custom theme' : 'custom themes')}${li(emojis.length, emojis.length === 1 ? 'uploaded emoji' : 'uploaded emojis')}${has.settings ? '<li>Settings &amp; preferences</li>' : ''}</ul></div>`
      + `<div class="settings-card"><h3>How to add it</h3><div class="seg"><button type="button" data-mode="merge" class="${st.mode === 'merge' ? 'on' : ''}">Add to this device</button><button type="button" data-mode="replace" class="${st.mode === 'replace' ? 'on' : ''}">Replace what’s here</button></div>`
      + `<p class="fine">${st.mode === 'merge' ? 'Keeps what you already have on this device and adds anything new. Duplicates are skipped.' : 'Removes the countdowns, themes and emojis in this link’s categories from this device first, then adds the shared ones.'}</p>`
      + (has.settings ? `<div class="opt-row" style="margin-top:14px"><span>Also apply the shared settings</span><button type="button" class="toggle${st.settings ? ' on' : ''}" role="switch" aria-checked="${st.settings}" aria-label="Apply settings" data-imp-settings></button></div>` : '')
      + `</div><button class="button" type="button" id="imp-go" style="width:100%">Import data</button></section>`;
    $$('[data-mode]').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; draw(); }));
    const ts = $('[data-imp-settings]'); if (ts) ts.addEventListener('click', () => { st.settings = !st.settings; draw(); });
    $('#imp-go').addEventListener('click', () => {
      if (st.mode === 'replace' && !confirm('Replace the data on this device with what’s in this link?')) return;
      let added = 0;
      if (st.mode === 'replace') {
        if (has.events) saveEvents([]);
        if (has.themes) saveCustomThemes([]);
        if (has.emojis) saveCustomEmojis([]);
      }
      for (const ev of events) {
        if (findByNameEnd(ev.name, ev.end)) continue;
        const clash = readEvents().some((x) => x.id === ev.id);
        upsertEvent(clash ? { ...ev, id: newId() } : ev); added++;
      }
      if (themes.length) { const seen = new Set(); saveCustomThemes([...themes, ...readCustomThemes()].filter((t) => !seen.has(t.id) && seen.add(t.id))); }
      if (emojis.length) { const seen = new Set(); saveCustomEmojis([...emojis, ...readCustomEmojis()].filter((x) => !seen.has(x.id) && seen.add(x.id))); }
      if (has.settings && st.settings) {
        const s = data.settings;
        if (s.extras && typeof s.extras === 'object') setExtras(s.extras);
        if (['auto', 'light', 'dark'].includes(s.theme)) setThemePref(s.theme);
        if (typeof s.sound === 'boolean') setSoundEnabled(s.sound);
        if (SOUND_STYLES.some(([k]) => k === s.soundStyle)) setSoundStyle(s.soundStyle);
        if (FINALE_STYLES.some(([k]) => k === s.finale)) setFinaleStyle(s.finale);
      }
      buzz();
      showNotice(added ? `Imported ${added} countdown${added === 1 ? '' : 's'} and your other data.` : 'Your data was imported.');
      location.hash = '/';
    });
  };
  draw();
}

/* ---------- More, Login (coming later) and News ---------- */
const moreChev = svgI('<path d="m9 6 6 6-6 6"/>', 18);
function moreRow(href, title, sub, pill = '', id = '') {
  const inner = `<span class="more-text"><strong>${title}</strong><small>${sub}</small></span>${pill}<span class="more-chev">${moreChev}</span>`;
  return id ? `<button type="button" class="more-row" id="${id}">${inner}</button>` : `<a class="more-row" href="${href}">${inner}</a>`;
}
function renderMore() {
  const ex = getExtras();
  app.innerHTML = `<section class="page"><h1 class="page-title">More</h1><div class="more-list">`
    + moreRow('#/login', 'Log in', 'Save your countdowns to an account', '<span class="soon-pill">Coming later</span>')
    + moreRow('#/news', 'News', 'What’s new and what’s coming', '<span class="soon-pill try">Log in to try</span>')
    + moreRow('#/settings', 'Settings', 'Appearance, extras, notifications and data')
    + moreRow('', 'Share my data', 'Move your countdowns to another device', '', 'more-share')
    + moreRow('#/download', 'Download app', 'Install on Windows, iOS or Android')
    + moreRow('#/themes', 'Theme Studio', 'Design your own colors and fonts')
    + (ex.focusStudio ? moreRow('#/focus', 'Focus & Audio', 'Focus timer and soundscapes') : '')
    + '</div></section>';
  $('#more-share').addEventListener('click', openShareData);
}
function renderLogin() {
  app.innerHTML = `<section class="page login-page"><a class="back" href="#/more">← Back</a><div class="login-card"><span class="soon-pill big">Coming later</span><h1 class="page-title">Login coming later</h1>`
    + `<p class="download-lead">Accounts aren’t ready yet. For now everything you make stays on this device. To use your countdowns on another device, try <button type="button" class="text-link" id="login-share">Share my data</button>.</p>`
    + `<div class="login-form" aria-disabled="true"><div class="field"><label for="login-email">Email</label><input id="login-email" type="email" placeholder="you@example.com" disabled></div><div class="field"><label for="login-pass">Password</label><input id="login-pass" type="password" placeholder="Password" disabled></div><button class="button" type="button" disabled>Log in</button></div>`
    + `<p class="small-note">Login is coming later. Nothing is collected on this page.</p></div></section>`;
  $('#login-share').addEventListener('click', openShareData);
}
const NEWS_ITEMS = [
  ['Sync across devices', 'Open Downcount on your phone, tablet and computer and see the same countdowns everywhere.'],
  ['Cloud backup', 'Keep your countdowns safe if you clear your browser or switch phones.'],
  ['Countdowns with friends', 'Share a countdown that everyone you invite can see and add to.'],
  ['Reminders everywhere', 'Get an alert on every device when a countdown is getting close.']
];
function renderNews() {
  app.innerHTML = `<section class="page"><a class="back" href="#/more">← Back</a><h1 class="page-title">News</h1>`
    + `<p class="download-lead">New things we’re building. They need an account, so you’ll be able to log in to try them once login is ready.</p>`
    + `<div class="news-list">${NEWS_ITEMS.map(([t, d]) => `<article class="news-card"><div><span class="soon-pill try">Log in to try</span><h3>${t}</h3><p>${d}</p></div><a class="button secondary-button small-button" href="#/login">Log in to try</a></article>`).join('')}</div>`
    + `<h2 class="news-sub">Available now</h2><div class="more-list">`
    + moreRow('', 'Share my data', 'Move your countdowns to another device', '', 'news-share')
    + moreRow('#/themes', 'Theme Studio', 'Design your own colors and fonts')
    + moreRow('#/download', 'Download app', 'Install on Windows, iOS or Android')
    + '</div></section>';
  $('#news-share').addEventListener('click', openShareData);
}

function renderSettings() {
  const pref = getThemePref();
  const ex = getExtras();
  const allOn = allExtrasEnabled();
  const soundOn = isSoundEnabled();
  const soundStyle = getSoundStyle();
  const finaleStyle = getFinaleStyle();
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const permText = { granted: 'Notifications are on.', denied: 'Notifications are blocked in your browser settings.', default: 'Allow notifications to be alerted when countdowns reach 0.', unsupported: 'Notifications are not supported in this browser.' }[perm];
  const standalone = document.documentElement.classList.contains('standalone');
  const customThemes = readCustomThemes();
  const customEmojis = readCustomEmojis();

  app.innerHTML = `<section class="page"><a class="back" href="#/more">← More</a><h1 class="page-title">Settings</h1>`
    + `<div class="settings-card"><h3>Cool Features & Pro Extras (Opt-In)</h3><p>All extra features below are <strong>off by default</strong> so Downcount stays clean until you turn them on here.</p>`
    + `<div class="opt-row" style="padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:12px"><span><strong>Enable All Cool Extras</strong></span><button type="button" class="toggle ${allOn ? 'on' : ''}" id="toggle-all-extras"></button></div>`
    + `<div class="opt-row"><span>3D Flip Clock, SVG Progress Rings & Tenths (.0)</span><button type="button" class="toggle ${ex.clockModes ? 'on' : ''}" data-extra-toggle="clockModes"></button></div>`
    + `<div class="opt-row"><span>Animated Particle Backgrounds (Sparkles, Snow, Matrix)</span><button type="button" class="toggle ${ex.particles ? 'on' : ''}" data-extra-toggle="particles"></button></div>`
    + `<div class="opt-row"><span>Focus / Pomodoro Timer & Ambient Soundscapes Tab</span><button type="button" class="toggle ${ex.focusStudio ? 'on' : ''}" data-extra-toggle="focusStudio"></button></div>`
    + `<div class="opt-row"><span>Event Checklists & World Launch Timezones</span><button type="button" class="toggle ${ex.detailPanels ? 'on' : ''}" data-extra-toggle="detailPanels"></button></div>`
    + `<div class="opt-row" style="margin-bottom:0"><span>Extra Finale Animations (Fireworks, Emoji Fountain, Strobe)</span><button type="button" class="toggle ${ex.extraFinals ? 'on' : ''}" data-extra-toggle="extraFinals"></button></div>`
    + (ex.extraFinals ? `<div class="field" style="margin:12px 0 0"><label>Active Finale Effect</label><div class="seg">${FINALE_STYLES.map(([k, l]) => `<button type="button" data-finale-style="${k}" class="${finaleStyle === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : '')
    + `</div>`
    + `<div class="settings-card"><h3>Celebration Sound & Audio Chimes (Opt-In)</h3><p>Audio is <strong>off by default</strong>. Turn it on below if you want a synthesized chime when a countdown reaches zero.</p>`
    + `<div class="opt-row" style="margin-bottom:${soundOn ? '12px' : '0'}"><span>Play celebration sound when countdown reaches 0</span><button type="button" class="toggle ${soundOn ? 'on' : ''}" id="toggle-sound"></button></div>`
    + (soundOn ? `<div class="field" style="margin-bottom:12px"><label>Synthesized Audio Chime</label><div class="seg">${SOUND_STYLES.map(([k, l]) => `<button type="button" data-sound-style="${k}" class="${soundStyle === k ? 'on' : ''}">${l}</button>`).join('')}</div></div><button class="button secondary-button small-button" type="button" id="test-chime" style="flex:0 0 auto;width:auto">Test Sound & Finale</button>` : '')
    + `</div>`
    + `<div class="settings-card"><h3>Appearance</h3><div class="seg" id="theme-seg">${[['auto', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button type="button" data-theme-pref="${v}" class="${pref === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`
    + `<div class="settings-card"><h3>Custom Themes & Emojis</h3><p>You have <strong>${customThemes.length}</strong> custom theme${customThemes.length === 1 ? '' : 's'} and <strong>${customEmojis.length}</strong> custom uploaded emoji${customEmojis.length === 1 ? '' : 's'}.</p><div class="row"><a class="button secondary-button" href="#/themes">Open Theme Studio</a><button class="button secondary-button" id="manage-emojis-btn" type="button">Manage Custom Emojis</button></div></div>`
    + `<div class="settings-card"><h3>Notifications</h3><p>${permText}</p>${perm === 'default' ? '<button class="button secondary-button" id="enable-notif" type="button">Enable notifications</button>' : ''}</div>`
    + `<div class="settings-card"><h3>App & Offline</h3><p>${standalone ? 'Downcount is running as an installed app.' : 'Install Downcount to launch it instantly from your home screen or dock.'}</p>${standalone ? '' : '<button class="button secondary-button" id="install-2" type="button">Download app</button>'}</div>`
    + `<div class="settings-card"><h3>Backup & Data</h3><p>Your countdowns, custom themes, uploaded emojis and settings are saved locally in this browser. Use Share my data to move them to another device.</p><div class="row"><button class="button" id="share-data" type="button" style="flex:1 1 100%">Share my data</button><button class="button secondary-button" id="export-data" type="button">Export Full Backup</button><button class="button secondary-button" id="import-data" type="button">Import Backup</button><button class="button secondary-button danger" id="clear-data" type="button">Clear all</button></div><p class="fine">Downcount v4 · Built with vanilla JS & CSS · Clean, private & local-first.</p></div></section>`;

  $('#toggle-all-extras').addEventListener('click', () => {
    const target = !allOn;
    setExtras({ clockModes: target, particles: target, focusStudio: target, detailPanels: target, extraFinals: target });
    buzz();
    renderSettings();
    showNotice(target ? 'All Cool Extras turned ON!' : 'Cool Extras turned OFF.');
  });

  $$('[data-extra-toggle]', app).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.extraToggle;
    const cur = getExtras();
    setExtras({ [k]: !cur[k] });
    buzz();
    renderSettings();
  }));

  $$('[data-theme-pref]').forEach((b) => b.addEventListener('click', () => { setThemePref(b.dataset.themePref); renderSettings(); }));
  $$('[data-finale-style]').forEach((b) => b.addEventListener('click', () => { setFinaleStyle(b.dataset.finaleStyle); celebrateFinale('🎉', b.dataset.finaleStyle); renderSettings(); }));
  $$('[data-sound-style]').forEach((b) => b.addEventListener('click', () => { setSoundStyle(b.dataset.soundStyle); playChime(b.dataset.soundStyle); renderSettings(); }));
  $('#toggle-sound').addEventListener('click', () => {
    const next = !soundOn;
    setSoundEnabled(next);
    if (next) playChime();
    renderSettings();
  });
  const testBtn = $('#test-chime');
  if (testBtn) testBtn.addEventListener('click', () => { playChime(); celebrateFinale('🎉'); });
  $('#manage-emojis-btn').addEventListener('click', () => openEmojiPickerModal('✨', () => renderSettings()));
  const en = $('#enable-notif'); if (en) en.addEventListener('click', async () => { await Notification.requestPermission(); renderSettings(); });
  const ins = $('#install-2'); if (ins) ins.addEventListener('click', () => { location.hash = '/download'; });

  $('#share-data').addEventListener('click', openShareData);
  $('#export-data').addEventListener('click', exportBackupFile);

  $('#import-data').addEventListener('click', () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const eventsArr = Array.isArray(data) ? data : (Array.isArray(data.events) ? data.events : null);
        if (!eventsArr) throw new Error('bad');
        if (data.extras && typeof data.extras === 'object') setExtras(data.extras);
        if (Array.isArray(data.customThemes)) {
          const mergedThemes = [...data.customThemes.map(normalizeCustomThemeObj).filter(Boolean), ...readCustomThemes()];
          const seenT = new Set();
          saveCustomThemes(mergedThemes.filter((t) => !seenT.has(t.id) && seenT.add(t.id)));
        }
        if (Array.isArray(data.customEmojis)) {
          const mergedEmojis = [...data.customEmojis.filter((x) => x && x.id && x.dataUrl), ...readCustomEmojis()];
          const seenE = new Set();
          saveCustomEmojis(mergedEmojis.filter((x) => !seenE.has(x.id) && seenE.add(x.id)));
        }
        let count = 0;
        for (const raw of eventsArr) {
          if (raw && raw.name && Number.isFinite(Number(raw.end))) {
            const ev = normalize(raw);
            if (!findByNameEnd(ev.name, ev.end)) { upsertEvent(ev); count++; }
          }
        }
        showNotice(`Imported ${count} countdown${count === 1 ? '' : 's'}.`);
        renderSettings();
      } catch { showNotice('That file couldn’t be imported.'); }
    });
    input.click();
  });

  $('#clear-data').addEventListener('click', () => {
    if (!confirm('Delete all your countdowns, custom themes, and uploaded emojis from this device?')) return;
    const beforeEv = readEvents();
    const beforeTh = readCustomThemes();
    const beforeEm = readCustomEmojis();
    saveEvents([]); saveCustomThemes([]); saveCustomEmojis([]); route();
    showNotice('All data deleted.', { label: 'Undo', fn: () => { saveEvents(beforeEv); saveCustomThemes(beforeTh); saveCustomEmojis(beforeEm); route(); showNotice('Restored.'); } });
  });
}

/* --------- reminders --------- */
async function enableReminder(event) {
  if (!('Notification' in window)) { showNotice('This browser does not support notifications.'); return; }
  if (Notification.permission === 'denied') { showNotice('Notifications are blocked in your browser settings.'); return; }
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') { showNotice('Notification permission was not granted.'); return; }
  const alerts = readJson(ALERT_KEY, []);
  if (!alerts.some((a) => a.end === event.end && a.name === event.name)) alerts.push({ name: event.name, end: event.end, start: event.start, emoji: plainEmojiText(event.emoji) });
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

/* --------- router --------- */
function route() {
  closeModal();
  closeNewMenu();
  syncExtrasShellUI();
  const { path } = parseHash();
  liveTitle = null; document.title = DEFAULT_TITLE;
  document.documentElement.classList.toggle('embed', path === '/embed');
  let tab = 'home';
  if (path === '/embed') renderEmbed();
  else if (path.startsWith('/countdown/')) renderCountdown();
  else if (path === '/themes') { renderThemeStudio(); tab = 'themes'; }
  else if (path === '/focus') { renderFocusStudio(); tab = 'focus'; }
  else if (path === '/create') { renderForm(); tab = 'create'; }
  else if (path.startsWith('/edit/')) {
    const ev = readEvents().find((e) => e.id === decodeURIComponent(path.slice(6)));
    if (!ev) { location.hash = '/'; return; }
    renderForm(ev); tab = 'create';
  } else if (path === '/settings') { renderSettings(); tab = 'more'; }
  else if (path === '/more') { renderMore(); tab = 'more'; }
  else if (path === '/login') { renderLogin(); tab = 'more'; }
  else if (path === '/news') { renderNews(); tab = 'more'; }
  else if (path === '/download') { renderDownload(); tab = 'more'; }
  else if (path.startsWith('/import/')) { renderImport(path.slice(8)); tab = 'more'; }
  else renderHome();
  $$('.tabbar [data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === (tab === 'themes' ? 'create' : tab)));
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === tab));
  app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
  const bar = $('.tabbar'); if (bar) bar.classList.remove('hide');
  if (path !== '/embed') window.scrollTo(0, 0);
  tickAll();
  initReveal();
}

window.addEventListener('hashchange', route);
window.addEventListener('storage', (e) => { if ([STORAGE_KEY, CUSTOM_THEMES_KEY, CUSTOM_EMOJIS_KEY, EXTRAS_KEY].includes(e.key) && ['/', '/settings', '/themes'].includes(parseHash().path)) route(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tickAll(); checkReminders(); } });

const newMenu = $('#new-menu');
const newBtn = $('#tab-new');
const newScrim = document.createElement('div'); newScrim.className = 'menu-scrim'; newScrim.hidden = true; document.body.append(newScrim);
function closeNewMenu() { if (!newMenu) return; newMenu.hidden = true; newScrim.hidden = true; if (newBtn) newBtn.setAttribute('aria-expanded', 'false'); }
if (newBtn && newMenu) {
  newBtn.addEventListener('click', (e) => { e.stopPropagation(); const open = newMenu.hidden; newMenu.hidden = !open; newScrim.hidden = !open; newBtn.setAttribute('aria-expanded', String(open)); buzz(); });
  newMenu.addEventListener('click', closeNewMenu);
  document.addEventListener('click', (e) => { if (!newMenu.hidden && !newMenu.contains(e.target) && !newBtn.contains(e.target)) closeNewMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNewMenu(); });
}


/* ---------- small motion & touch polish ---------- */
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let revealIO;
function initReveal() {
  if (revealIO) revealIO.disconnect();
  if (!('IntersectionObserver' in window) || reducedMotion()) return;
  const els = $$('.feature, .saved-card, .platform-card, .settings-card, .stat, .import-page .button').filter((el) => !el.closest('.modal'));
  revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target; revealIO.unobserve(el); el.classList.add('in');
      setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.removeProperty('--ri'); }, 900);
    });
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0.05 });
  els.forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--ri', Math.min(i, 6)); revealIO.observe(el); });
  setTimeout(() => els.forEach((el) => { el.classList.add('in'); }), 2600);
}
// the tab bar slides away while you scroll down and comes back when you scroll up
(function tabbarAutoHide() {
  let lastY = window.scrollY, ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY; const bar = $('.tabbar'); const d = y - lastY;
      if (bar && matchMedia('(max-width:780px)').matches) {
        if (y < 80 || d < -6 || (newMenu && !newMenu.hidden)) bar.classList.remove('hide');
        else if (d > 10 && !document.body.classList.contains('modal-open')) bar.classList.add('hide');
      }
      lastY = y; ticking = false;
    });
  }, { passive: true });
})();
// drag the top of a bottom sheet down to close it
(function sheetSwipe() {
  let el = null, backdrop = null, startY = 0, dy = 0;
  modalRoot.addEventListener('touchstart', (e) => {
    const m = e.target.closest('.modal');
    if (!m || !matchMedia('(max-width:780px)').matches) return;
    const t = e.touches[0];
    if (t.clientY - m.getBoundingClientRect().top > 60) return;
    el = m; backdrop = m.parentElement; startY = t.clientY; dy = 0; el.style.transition = 'none';
  }, { passive: true });
  modalRoot.addEventListener('touchmove', (e) => {
    if (!el) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    el.style.transform = `translateY(${dy}px)`;
    backdrop.style.opacity = String(Math.max(0.2, 1 - dy / 420));
  }, { passive: true });
  const end = () => {
    if (!el) return;
    const m = el, b = backdrop; el = null;
    m.style.transition = 'transform .2s ease';
    if (dy > 110) { m.style.transform = 'translateY(105%)'; b.style.transition = 'opacity .2s'; b.style.opacity = '0'; setTimeout(closeModal, 190); }
    else { m.style.transform = ''; b.style.opacity = ''; }
  };
  modalRoot.addEventListener('touchend', end); modalRoot.addEventListener('touchcancel', end);
})();
// a light tap buzz on supported phones for toggles, chips and tabs
document.addEventListener('click', (e) => { if (e.target.closest('.toggle, .style-chip, .filter-pill, .seg button, .tabbar a, .tab-new, .pin-btn')) buzz(); }, true);

applyTheme();
darkMq.addEventListener('change', applyTheme);
themeButton.addEventListener('click', () => setThemePref(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
route();
startTicker();

if (!IS_EMBED) {
  setInterval(checkReminders, 15000);
  checkReminders();
  installButton.hidden = document.documentElement.classList.contains('standalone');
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; });
  installButton.addEventListener('click', () => { location.hash = '/download'; });
  window.addEventListener('appinstalled', () => { installButton.hidden = true; document.documentElement.classList.add('standalone'); showNotice('Downcount is installed.'); if (parseHash().path === '/download') renderDownload(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(() => { $('#offline-indicator').hidden = false; }).catch((error) => console.info('ServiceWorker error:', error)));
  }
}
