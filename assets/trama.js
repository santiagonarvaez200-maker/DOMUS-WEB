/* Domus · trama de puntos (semitono) del bloque de la portada.
   Los puntos crecen hacia la esquina superior derecha hasta volverse color sólido,
   y se inflan alrededor del cursor o del dedo. Con "reducir movimiento" queda quieta. */
(function () {
  'use strict';
  var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(document.querySelectorAll('canvas[data-trama]'), function (canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var zona = canvas.parentElement, color = canvas.dataset.trama || '#52D289';
    var w = 0, h = 0, paso = 14, px = -9999, py = -9999, tx = px, ty = py, fuerza = 0, metaFuerza = 0, corriendo = false;
    function medir() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      paso = w < 420 ? 11 : 14;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dibujar();
    }
    function dibujar() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      var rmax = paso * 0.74, radio = 120 * 120 * 2;
      for (var y = paso / 2; y < h + paso; y += paso) {
        for (var x = paso / 2; x < w + paso; x += paso) {
          var d = Math.min(1, Math.max(0, (x / w) * 0.62 + (1 - y / h) * 0.5 - 0.12));
          var r = rmax * (0.08 + 0.92 * Math.pow(d, 1.6));
          if (fuerza > 0.001) {
            var dx = x - px, dy = y - py;
            r += Math.exp(-(dx * dx + dy * dy) / radio) * paso * 0.42 * fuerza;
          }
          if (r < 0.35) continue;
          ctx.beginPath(); ctx.arc(x, y, Math.min(r, rmax), 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    function cuadro() {
      px += (tx - px) * 0.18; py += (ty - py) * 0.18; fuerza += (metaFuerza - fuerza) * 0.12;
      dibujar();
      if (Math.abs(tx - px) + Math.abs(ty - py) > 0.5 || Math.abs(metaFuerza - fuerza) > 0.01) requestAnimationFrame(cuadro);
      else corriendo = false;
    }
    function arrancar() { if (!corriendo) { corriendo = true; requestAnimationFrame(cuadro); } }
    if (!reducir) {
      zona.addEventListener('pointermove', function (e) {
        var r = canvas.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (px < -1000) { px = tx; py = ty; }
        metaFuerza = 1; arrancar();
      });
      zona.addEventListener('pointerleave', function () { metaFuerza = 0; arrancar(); });
    }
    if ('ResizeObserver' in window) new ResizeObserver(medir).observe(canvas);
    medir();
  });
})();
