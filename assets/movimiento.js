/* Domus · movimiento
   Transición entre páginas (persiana de tablas), cabecera que cambia al bajar, palabra que se escribe sola,
   cinta de muebles, contadores, curva del ala que se dibuja con el scroll, línea del proceso,
   tarjetas que se inclinan con el cursor y paralaje suave.
   Todo respeta "reducir movimiento" y deja el contenido visible aunque el script no cargue. */
(function () {
  'use strict';
  var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raiz = document.documentElement;
  raiz.classList.add('js');
  if (reducir) raiz.classList.add('quieto');

  function cada(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function lim(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function alVer(el, fn, margen) {
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { fn(e.isIntersecting, e); }); }, { rootMargin: margen || '0px' }).observe(el);
  }
  function guardar(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  function leer(k) { try { var v = sessionStorage.getItem(k); sessionStorage.removeItem(k); return v; } catch (e) { return null; } }

  /* ---------- 1. Persiana entre páginas ---------- */
  var TABLAS = 7;
  var persiana = document.createElement('div');
  persiana.className = 'persiana';
  persiana.setAttribute('aria-hidden', 'true');
  var html = '';
  for (var i = 0; i < TABLAS; i++) html += '<span style="--i:' + i + '"></span>';
  html += '<svg class="persiana-logo" viewBox="110 150 670 920"><path d="M130 170 C300 200 520 240 650 330 C730 390 760 480 760 582 C660 530 525 455 405 365 C300 290 205 225 130 170 Z"/><path d="M760 582 C600 568 405 568 322 640 C268 690 298 765 350 845 C382 905 392 985 392 1055 C405 930 760 800 760 582 Z"/><path class="ojo" d="M222 343 C262 326 322 337 337 377 C298 397 243 386 222 343 Z"/></svg>';
  persiana.innerHTML = html;
  document.body.appendChild(persiana);

  /* La persiana toma el color de la portada a la que se llega, así al abrir no hay salto de color */
  function temaDe(href) {
    if (/renovacion|restaurados|gran-proyecto/.test(href)) return 'bosque';
    return 'cafe';
  }
  function cerrar(tema, luego) {
    persiana.dataset.tema = tema;
    persiana.classList.remove('abriendo');
    persiana.classList.add('cerrando');
    setTimeout(luego, 400);
  }
  function abrir() {
    persiana.classList.remove('cerrando');
    persiana.classList.add('abriendo');
    setTimeout(function () { persiana.classList.remove('abriendo'); }, 520);
  }
  var entrada = leer('domus-persiana');
  if (entrada && !reducir) {
    persiana.dataset.tema = entrada;
    persiana.classList.add('cerrando', 'sin-transicion');
    requestAnimationFrame(function () { requestAnimationFrame(function () { persiana.classList.remove('sin-transicion'); abrir(); }); });
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) persiana.classList.remove('cerrando', 'abriendo'); });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || reducir || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.wa !== undefined && a.href.indexOf('wa.me') !== -1) return;
    var href = a.getAttribute('href');
    /* enlace dentro de la misma página marcado para la demostración */
    if (href.charAt(0) === '#') {
      if (!a.hasAttribute('data-transicion')) return;
      var destino = document.querySelector(href);
      if (!destino) return;
      e.preventDefault();
      cerrar(a.dataset.transicion || 'oliva', function () {
        destino.scrollIntoView({ behavior: 'auto', block: 'start' });
        abrir();
      });
      return;
    }
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || /^(mailto|tel):/.test(href)) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    var tema = temaDe(url.pathname);
    guardar('domus-persiana', tema);
    cerrar(tema, function () { location.href = url.href; });
  });

  /* ---------- 2. Cabecera: oscura sobre la portada, clara y compacta al bajar ---------- */
  var cabecera = document.querySelector('.sitio-cabecera');
  var portada = document.querySelector('[data-portada]');
  function revisarCabecera() {
    if (!cabecera) return;
    var limite = portada ? portada.offsetTop + portada.offsetHeight - 90 : 40;
    var abajo = window.scrollY > limite;
    cabecera.classList.toggle('clara', abajo || !portada);
    cabecera.classList.toggle('compacta', window.scrollY > 40);
    raiz.style.setProperty('--franja-sup', getComputedStyle(cabecera).backgroundColor);
  }

  /* ---------- 3. Palabra que se escribe sola ----------
     Todas las palabras se apilan invisibles en la misma celda (molde): el hueco queda siempre
     del ancho de la más larga, así el titular y la portada no se reacomodan mientras se escribe. */
  cada('[data-escribir]', function (el) {
    var palabras = el.dataset.escribir.split('|'), cursor = document.createElement('i');
    cursor.className = 'cursor-texto';
    var inicial = el.textContent.trim();
    el.textContent = '';
    el.classList.add('rotar-fijo');
    palabras.forEach(function (p) {
      var molde = document.createElement('span');
      molde.className = 'rotar-molde';
      molde.textContent = p;
      el.appendChild(molde);
    });
    var vivo = document.createElement('span'), texto = document.createElement('span');
    vivo.className = 'rotar-vivo';
    texto.textContent = inicial;
    vivo.appendChild(texto); vivo.appendChild(cursor);
    el.appendChild(vivo);
    if (reducir) { texto.textContent = palabras[palabras.length - 1]; cursor.remove(); return; }
    var visible = true, n = palabras.indexOf(texto.textContent), pos = texto.textContent.length, borrando = true, temporizador = null;
    if (n < 0) n = 0;
    function paso() {
      if (!visible) { temporizador = null; return; }
      var p = palabras[n], espera = 70;
      if (borrando) {
        pos--; texto.textContent = p.slice(0, pos);
        espera = 38;
        if (pos <= 0) { borrando = false; n = (n + 1) % palabras.length; espera = 260; }
      } else {
        p = palabras[n]; pos++; texto.textContent = p.slice(0, pos);
        if (pos >= p.length) { borrando = true; espera = n === palabras.length - 1 ? 3200 : 1700; }
      }
      temporizador = setTimeout(paso, espera);
    }
    alVer(el, function (si) { visible = si; if (si && !temporizador) temporizador = setTimeout(paso, 2200); });
  });

  /* ---------- 4. Cinta: duplica el contenido para que el giro no tenga cortes ---------- */
  cada('[data-cinta]', function (cinta) {
    var pista = cinta.querySelector('.cinta-pista');
    if (!pista) return;
    var copia = pista.cloneNode(true);
    copia.setAttribute('aria-hidden', 'true');
    cinta.querySelector('.cinta-mover').appendChild(copia);
    alVer(cinta, function (si) { cinta.classList.toggle('en-pausa', !si); });
  });

  /* ---------- 5. Contadores ---------- */
  cada('[data-contar]', function (el) {
    var meta = parseInt(el.dataset.contar, 10), hecho = false;
    if (reducir || !meta) return;
    alVer(el, function (si) {
      if (!si || hecho) return;
      hecho = true;
      var t0 = performance.now(), dur = 1400;
      el.textContent = '0';
      (function anim(ahora) {
        var t = lim((ahora - t0) / dur), f = 1 - Math.pow(1 - t, 4);
        el.textContent = String(Math.round(meta * f));
        if (t < 1) requestAnimationFrame(anim);
      })(t0);
    });
  });

  /* ---------- 6. Ojo que parpadea al aparecer y al pasar el cursor ---------- */
  cada('.o-ojo', function (el) {
    function parpadear() { el.classList.remove('parpadea'); void el.offsetWidth; el.classList.add('parpadea'); }
    if (reducir) return;
    var visto = false;
    alVer(el, function (si) { if (si && !visto) { visto = true; setTimeout(parpadear, 500); } });
    var titulo = el.closest('h1, h2, p');
    if (titulo) titulo.addEventListener('pointerenter', parpadear);
  });

  /* ---------- 7. Efectos ligados al scroll ---------- */
  var ligados = [];
  cada('[data-dibujar]', function (el) { ligados.push({ el: el, tipo: 'dibujar' }); });
  cada('[data-avance]', function (el) { ligados.push({ el: el, tipo: 'avance', pasos: el.querySelectorAll('li') }); });
  cada('[data-paralaje]', function (el) { ligados.push({ el: el, tipo: 'paralaje', f: parseFloat(el.dataset.paralaje) || 0.1 }); });
  ligados.forEach(function (l) { l.visible = true; alVer(l.el, function (si) { l.visible = si; }, '120px'); });

  function progreso(el, inicio, fin) {
    var r = el.getBoundingClientRect(), h = window.innerHeight;
    return lim((h * inicio - r.top) / (r.height + h * (inicio - fin)));
  }
  var pendiente = false;
  function alDesplazar() {
    pendiente = false;
    revisarCabecera();
    if (reducir) return;
    var h = window.innerHeight;
    ligados.forEach(function (l) {
      if (!l.visible) return;
      if (l.tipo === 'dibujar') {
        var p = progreso(l.el, 0.95, 0.35);
        l.el.style.setProperty('--trazo', (1 - p).toFixed(4));
        l.el.style.setProperty('--giro', (p * 8 - 4).toFixed(2) + 'deg');
      } else if (l.tipo === 'avance') {
        var a = progreso(l.el, 0.85, 0.45);
        l.el.style.setProperty('--avance', a.toFixed(4));
        Array.prototype.forEach.call(l.pasos, function (li, i) { li.classList.toggle('activo', a >= (i + 0.35) / l.pasos.length); });
      } else {
        var r = l.el.getBoundingClientRect(), centro = r.top + r.height / 2 - h / 2;
        l.el.style.setProperty('--desplazar', (-centro * l.f).toFixed(1) + 'px');
      }
    });
  }
  function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(alDesplazar); } }
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  if (reducir) cada('[data-avance]', function (el) { el.style.setProperty('--avance', '1'); cada('[data-avance] li', function (li) { li.classList.add('activo'); }); });
  alDesplazar();

  /* ---------- 8. Desplegables que se abren con animación de altura ---------- */
  if (!reducir && Element.prototype.animate) cada('details.categoria, details.desplegable', function (d) {
    var resumen = d.querySelector('summary'), anim = null;
    if (!resumen) return;
    function cuerpo() { return d.querySelector(':scope > :not(summary)'); }
    resumen.addEventListener('click', function (e) {
      var c = cuerpo();
      if (!c) return;
      e.preventDefault();
      if (anim) anim.cancel();
      var abriendo = !d.open;
      if (abriendo) d.open = true;
      var alto = c.offsetHeight;
      c.style.overflow = 'hidden';
      anim = c.animate(abriendo
        ? [{ height: '0px', opacity: 0.2 }, { height: alto + 'px', opacity: 1 }]
        : [{ height: alto + 'px', opacity: 1 }, { height: '0px', opacity: 0.2 }],
        { duration: Math.min(520, 240 + alto * 0.25), easing: 'cubic-bezier(.2,.7,.2,1)' });
      anim.onfinish = function () { if (!abriendo) d.open = false; c.style.overflow = ''; anim = null; };
      anim.oncancel = function () { c.style.overflow = ''; };
    });
  });

  /* ---------- 9. Tarjetas que se inclinan con el cursor ---------- */
  if (!reducir) cada('[data-inclinar]', function (t) {
    t.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      t.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      t.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      t.style.setProperty('--lx', ((x + 0.5) * 100).toFixed(1) + '%');
      t.style.setProperty('--ly', ((y + 0.5) * 100).toFixed(1) + '%');
      t.classList.add('inclinada');
    });
    t.addEventListener('pointerleave', function () {
      t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg');
      t.classList.remove('inclinada');
    });
  });
})();
