/* Domus · isotipos de las bandas: la escena se dibuja al aparecer y el pájaro carpintero llega a posarse.
   Sin JavaScript o con "reducir movimiento" se ve la escena completa con el ave ya posada. */
(function () {
  'use strict';
  var escenas = document.querySelectorAll('[data-isotipo]');
  var quieto = document.documentElement.classList.contains('quieto') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!escenas.length || quieto || !('IntersectionObserver' in window)) return;

  function suave(t) { return 1 - Math.pow(1 - t, 3); }

  Array.prototype.forEach.call(escenas, function (iso) {
    var ave = iso.querySelector('.ave'), ala = iso.querySelector('.ave-ala'), ojo = iso.querySelector('.ave-ojo');
    if (!ave) return;
    var x = +ave.dataset.x, y = +ave.dataset.y, s = +ave.dataset.s, pivote = (ave.dataset.pivote || '0 0').split(' ');
    var ocupado = false;
    iso.classList.add('espera');

    function poner(px, py, giro, alaGrados, escY) {
      ave.setAttribute('transform', 'translate(' + px.toFixed(2) + ' ' + py.toFixed(2) + ') rotate(' + giro.toFixed(2) + ') scale(' + s + ' ' + (s * escY).toFixed(4) + ')');
      ala.setAttribute('transform', 'rotate(' + (-Math.abs(alaGrados)).toFixed(2) + ' ' + pivote[0] + ' ' + pivote[1] + ')');
    }
    function parpadear() {
      if (!ojo.animate) return;
      ojo.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], { duration: 220, easing: 'ease-in-out' });
    }

    /* Vuelo: llega desde arriba a la derecha en una curva, batiendo el ala, y se posa con un pequeño rebote */
    function volar() {
      ocupado = true;
      var x0 = x + 230, y0 = y - 120, cx = x + 70, cy = y - 150, dur = 1500, t0 = performance.now();
      ave.style.visibility = 'visible';
      (function cuadro(ahora) {
        var e = Math.min(1, (ahora - t0) / dur), p = suave(e), q = 1 - p;
        var px = q * q * x0 + 2 * q * p * cx + p * p * x, py = q * q * y0 + 2 * q * p * cy + p * p * y;
        var batida = Math.sin((ahora - t0) / 1000 * Math.PI * 2 * 5.5) * 24 * (1 - e * e);
        poner(px, py, -14 * q, batida, 1);
        if (e < 1) requestAnimationFrame(cuadro); else posarse();
      })(t0);
    }
    function posarse() {
      var t0 = performance.now();
      iso.classList.add('posado');
      (function cuadro(ahora) {
        var k = (ahora - t0) / 1000;
        var aplastar = k < 0.22 ? 1 - 0.12 * Math.sin(Math.PI * k / 0.22) : 1;
        var acomodo = k < 0.7 ? Math.sin(k * Math.PI * 2 * 2.8) * 10 * (1 - k / 0.7) : 0;
        poner(x, y, 0, acomodo, aplastar);
        if (k < 0.7) requestAnimationFrame(cuadro);
        else { poner(x, y, 0, 0, 1); ocupado = false; setTimeout(parpadear, 250); }
      })(t0);
    }
    /* Al pasar el cursor por la banda: un saltito con dos aleteos */
    function saltar() {
      if (ocupado) return;
      ocupado = true;
      var t0 = performance.now();
      (function cuadro(ahora) {
        var k = Math.min(1, (ahora - t0) / 520);
        poner(x, y - Math.sin(Math.PI * k) * 9, 0, Math.sin(k * Math.PI * 4) * 18 * (1 - k), 1);
        if (k < 1) requestAnimationFrame(cuadro); else { ocupado = false; parpadear(); }
      })(t0);
    }

    var obs = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      obs.disconnect();
      iso.classList.add('vivo');
      setTimeout(volar, iso.querySelector('.ladrillo') ? 1100 : 750);
    }, { threshold: 0.5 });
    obs.observe(iso);
    var banda = iso.closest('.banda');
    if (banda) banda.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && iso.classList.contains('posado')) saltar(); });
  });
})();
