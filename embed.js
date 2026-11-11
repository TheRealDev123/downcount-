/* Downcount embed loader (v3 with custom theme support).
   Usage:
     <script async src="https://YOUR-SITE/embed.js" data-name="Trip" data-end="1799999999000" data-style="sunset" data-emoji="✈️"></script>
   The countdown appears right where the script tag is. */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var d = s.dataset || {};
  var base = s.src.replace(/embed\.js(\?.*)?$/, '');
  var title = d.title === '0' ? '0' : '1';
  var size = d.size === 'compact' ? 'compact' : 'wide';
  var q = new URLSearchParams({
    name: d.name || 'Countdown',
    end: d.end || '',
    style: d.style || 'classic',
    emoji: d.emoji || '',
    title: title,
    size: size
  });
  if (d.start) q.set('s', d.start);
  if (d.note) q.set('note', d.note);
  if (d.cBg1) q.set('c_bg1', d.cBg1);
  if (d.cBg2) q.set('c_bg2', d.cBg2);
  if (d.cFg) q.set('c_fg', d.cFg);
  if (d.cAcc) q.set('c_acc', d.cAcc);
  if (d.cAngle) q.set('c_angle', d.cAngle);
  if (d.cFont) q.set('c_font', d.cFont);
  if (d.cGlow) q.set('c_glow', d.cGlow);
  var h = size === 'compact' ? (title === '1' ? 195 : 155) : (title === '1' ? 320 : 250);
  var f = document.createElement('iframe');
  f.src = base + '#/embed?' + q.toString();
  f.title = d.name || 'Countdown';
  f.loading = 'lazy';
  f.width = '100%';
  f.height = String(h);
  f.style.cssText = 'border:0;border-radius:20px;max-width:' + (size === 'compact' ? 360 : 640) + 'px;display:block;margin:0 auto';
  s.parentNode.insertBefore(f, s.nextSibling);
})();
