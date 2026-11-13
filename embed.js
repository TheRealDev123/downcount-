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
  if (d.aName) q.set('a_name', d.aName);
  if (d.aShape) q.set('a_shape', d.aShape);
  if (d.aChar) q.set('a_char', d.aChar);
  if (d.aMotion) q.set('a_motion', d.aMotion);
  if (d.aCount) q.set('a_count', d.aCount);
  if (d.aSpeed) q.set('a_speed', d.aSpeed);
  if (d.aSize) q.set('a_size', d.aSize);
  if (d.aOpacity) q.set('a_opacity', d.aOpacity);
  if (d.aGlow) q.set('a_glow', d.aGlow);
  if (d.aLines) q.set('a_lines', d.aLines);
  if (d.aTrails) q.set('a_trails', d.aTrails);
  if (d.aMouse) q.set('a_mouse', d.aMouse);
  if (d.aPulse) q.set('a_pulse', d.aPulse);
  if (d.aSpin) q.set('a_spin', d.aSpin);
  if (d.aRainbow) q.set('a_rainbow', d.aRainbow);
  if (d.aLayer) q.set('a_layer', d.aLayer);
  if (d.aC1) q.set('a_c1', d.aC1);
  if (d.aC2) q.set('a_c2', d.aC2);
  if (d.aC3) q.set('a_c3', d.aC3);
  if (d.aBgmode) q.set('a_bgmode', d.aBgmode);
  if (d.aBg1) q.set('a_bg1', d.aBg1);
  if (d.aBg2) q.set('a_bg2', d.aBg2);
  if (d.aFg) q.set('a_fg', d.aFg);
  if (d.aAcc) q.set('a_acc', d.aAcc);
  if (d.aAngle) q.set('a_angle', d.aAngle);
  if (d.aKf) q.set('a_kf', d.aKf);
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
