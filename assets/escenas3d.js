/* Domus · escenas 3D del Inicio: logo que se ensambla en la portada y aparador de "Prueba tu medida".
   Necesita domus3d.js antes. El menú y los enlaces de WhatsApp los maneja sitio.js. */
(function () {
  'use strict';
  var C = window.DOMUS_CONFIG || {};
  function whatsapp(mensaje) {
    if (window.DOMUS_WA) return window.DOMUS_WA(mensaje);
    var n = String(C.whatsapp || '').replace(/\D/g, '');
    return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(mensaje) : 'contacto.html';
  }
  function ocultar(p) { if (p) p.classList.add('oculta'); }
  function respaldo(lienzo, escena) {
    lienzo.hidden = true;
    var pista = escena.querySelector('.pista');
    if (pista) pista.hidden = true;
    var r = escena.querySelector('.respaldo');
    if (r) r.removeAttribute('hidden'); /* en SVG, .hidden = false no funciona */
  }
  var hay3D = !!window.Domus3D;

  /* Logo de la portada */
  var lienzoLogo = document.getElementById('logo-3d');
  if (lienzoLogo) {
    var escena = lienzoLogo.parentElement, pista = escena.querySelector('.pista');
    var logo = hay3D && Domus3D.logo(lienzoLogo, { fondo: 'claro', acabado: 'natural', zona: escena, sombra: escena.querySelector('.sombra'), alTocar: function () { ocultar(pista); } });
    if (!logo) respaldo(lienzoLogo, escena);
  }

  /* Aparador para probar medidas */
  var lienzoMueble = document.getElementById('aparador-3d');
  if (lienzoMueble) {
    var escenaM = lienzoMueble.parentElement, pistaM = escenaM.querySelector('.pista');
    var rango = document.getElementById('ancho'), salida = document.getElementById('ancho-valor');
    var resumen = document.getElementById('resumen'), cotizar = document.getElementById('cotizar-medida');
    var NOMBRES = { natural: 'madera natural', cafe: 'café', oliva: 'pintado oliva', crema: 'lacado crema' };
    var acabado = 'natural';
    var mueble = hay3D && Domus3D.aparador(lienzoMueble, { ancho: +rango.value, acabado: acabado, zona: escenaM, sombra: escenaM.querySelector('.sombra'), alTocar: function () { ocultar(pistaM); } });
    if (!mueble) respaldo(lienzoMueble, escenaM);
    var actualizar = function () {
      var ancho = +rango.value, nombre = NOMBRES[acabado];
      salida.textContent = ancho + ' cm';
      rango.style.setProperty('--lleno', ((ancho - rango.min) / (rango.max - rango.min) * 100) + '%');
      resumen.textContent = 'Aparador de ' + ancho + ' × 85 × 45 cm, ' + nombre;
      cotizar.href = whatsapp('Hola, quiero cotizar un aparador de ' + ancho + ' × 85 × 45 cm en ' + nombre + '.');
      if (cotizar.href.indexOf('wa.me') !== -1) { cotizar.target = '_blank'; cotizar.rel = 'noopener'; }
      var cota = escenaM.querySelector('.cota');
      if (cota) cota.textContent = ancho + ' × 85 × 45 cm';
      if (mueble) { mueble.ancho(ancho); mueble.acabado(acabado); }
    };
    rango.addEventListener('input', actualizar);
    Array.prototype.forEach.call(document.querySelectorAll('[data-acabado]'), function (b) {
      b.addEventListener('click', function () {
        acabado = b.dataset.acabado;
        Array.prototype.forEach.call(document.querySelectorAll('[data-acabado]'), function (o) { o.setAttribute('aria-pressed', o === b); });
        actualizar();
      });
    });
    actualizar();
  }
})();
