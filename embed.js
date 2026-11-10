/* Downcount embed loader.
   Usage:
   <script async src="https://YOUR-SITE/embed.js" data-name="Trip" data-end="1799999999000" data-style="sunset" data-emoji="✈️" data-title="1" data-size="wide"></script>
   The countdown appears right where the script tag is. */
(function () {
  var s = document.currentScript;
  if (!s) return;
  var d = s.dataset || {};
  var base = s.src.replace(/embed\.js(\?.*)?$/, '');
  var title = d.title === '0' ? '0' : '1';
  var size = d.size === 'compact' ? 'compact' : 'wide';
  var q = new URLSearchParams({ name: d.name || 'Countdown', end: d.end || '', style: d.style || 'classic', emoji: d.emoji || '✨', title: title, size: size });
  if (d.start) q.set('s', d.start);
  var h = size === 'compact' ? (title === '1' ? 190 : 150) : (title === '1' ? 310 : 240);
  var f = document.createElement('iframe');
  f.src = base + '#/embed?' + q.toString();
  f.title = d.name || 'Countdown';
  f.loading = 'lazy';
  f.width = '100%';
  f.height = String(h);
  f.style.cssText = 'border:0;border-radius:20px;max-width:' + (size === 'compact' ? 360 : 640) + 'px;display:block';
  s.parentNode.insertBefore(f, s.nextSibling);
})();
