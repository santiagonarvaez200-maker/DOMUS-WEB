/* Domus · "Así se arma" (aparador que se desarma con el scroll) y comparador de antes y después. */
(function () {
  'use strict';
  var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hay3D = !!window.Domus3D;

  /* ---------- Aparador por piezas ---------- */
  var seccion = document.querySelector('[data-despiece]');
  if (seccion) {
    var lienzo = seccion.querySelector('canvas'), piezasLista = seccion.querySelectorAll('.piezas li');
    var d = hay3D && Domus3D.despiece(lienzo, {
      ancho: 160, rotulos: seccion.querySelector('.rotulos'),
      alCambiar: function (e) {
        var activas = Math.round(e * piezasLista.length);
        Array.prototype.forEach.call(piezasLista, function (li, i) { li.classList.toggle('activa', i < activas); });
        seccion.classList.toggle('desarmado', e > 0.6);
      }
    });
    if (!d) {
      seccion.classList.add('sin-3d');
      lienzo.hidden = true;
    } else if (reducir) {
      seccion.classList.add('quieta');
      d.progreso(0.5);
    } else {
      var calcular = function () {
        var r = seccion.getBoundingClientRect(), recorrido = r.height - window.innerHeight;
        d.progreso(recorrido > 0 ? -r.top / recorrido : 0.5);
      };
      window.addEventListener('scroll', calcular, { passive: true });
      window.addEventListener('resize', calcular);
      calcular();
    }
  }

  /* ---------- Cubo modular de las preguntas: cada pregunta abierta lo vuelve un mueble ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-modular]'), function (escena) {
    var lienzo = escena.querySelector('canvas'), pista = escena.querySelector('.pista'), nombre = escena.querySelector('.nombre-forma');
    var bloque = escena.closest('section'), preguntas = bloque ? bloque.querySelectorAll('details.desplegable') : [];
    var cubo = hay3D && Domus3D.modular(lienzo, { zona: escena, sombra: escena.querySelector('.sombra'), acabado: 'natural', alTocar: function () { if (pista) pista.classList.add('oculta'); } });
    if (!cubo) {
      lienzo.hidden = true;
      if (pista) pista.hidden = true;
      escena.querySelector('.respaldo').removeAttribute('hidden');
      return;
    }
    var ultima = -1;
    Array.prototype.forEach.call(preguntas, function (d, i) {
      d.addEventListener('toggle', function () {
        var abierta = -1;
        if (d.open) abierta = i;
        else Array.prototype.forEach.call(preguntas, function (o, k) { if (o.open) abierta = k; });
        if (abierta === ultima) return;
        ultima = abierta;
        nombre.textContent = cubo.forma(abierta);
        if (pista) pista.classList.add('oculta');
      });
    });
  });

  /* ---------- Antes y después ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-comparar]'), function (c) {
    var rango = c.querySelector('input[type=range]');
    var antes = c.querySelector('.capa-antes img'), despues = c.querySelector('.capa-despues img');
    /* Mientras no haya fotos reales, se ilustra con el aparador 3D: gastado y con una puerta descolgada, y restaurado en oliva */
    if (antes && !antes.getAttribute('src') && hay3D) {
      var a = Domus3D.foto({ acabado: 'gastado', puertaAbierta: true, luz: 0.85 });
      var b = Domus3D.foto({ acabado: 'oliva' });
      if (a && b) { antes.src = a; despues.src = b; }
    }
    if (!antes.getAttribute('src')) c.classList.add('sin-imagen');
    function poner(v) { c.style.setProperty('--corte', v + '%'); }
    rango.addEventListener('input', function () { poner(rango.value); c.classList.add('tocado'); });
    poner(rango.value);
    /* Una sola pista al aparecer: la línea va y vuelve para mostrar que se puede deslizar */
    if (!reducir && 'IntersectionObserver' in window && Element.prototype.animate) {
      var visto = false;
      new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting || visto) return;
        visto = true;
        var t0 = performance.now();
        (function paso(ahora) {
          if (c.classList.contains('tocado')) return;
          var t = Math.min(1, (ahora - t0) / 1800), v = 50 + Math.sin(t * Math.PI * 2) * 22 * (1 - t);
          poner(v.toFixed(1)); rango.value = Math.round(v);
          if (t < 1) requestAnimationFrame(paso);
        })(t0);
      }, { threshold: 0.6 }).observe(c);
    }
  });
})();
