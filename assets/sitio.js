/* Domus · comportamiento del sitio: menú, enlaces de WhatsApp, catálogo y formularios. */
(function () {
  var C = window.DOMUS_CONFIG || {};

  function enlaceWhatsApp(mensaje) {
    var numero = String(C.whatsapp || "").replace(/\D/g, "");
    if (!numero) return "contacto.html";
    return "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensaje || "Hola, quiero más información sobre Domus.");
  }

  function prepararEnlace(a, mensaje) {
    a.href = enlaceWhatsApp(mensaje);
    if (a.href.indexOf("wa.me") !== -1) { a.target = "_blank"; a.rel = "noopener"; }
  }

  window.DOMUS_WA = enlaceWhatsApp;

  function normalizar(t) {
    return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  /* Menú en celular */
  var botonMenu = document.querySelector(".boton-menu");
  var menu = document.getElementById("menu-principal");
  if (botonMenu && menu) {
    botonMenu.addEventListener("click", function () {
      var abierto = menu.classList.toggle("abierto");
      botonMenu.setAttribute("aria-expanded", abierto ? "true" : "false");
      botonMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    });
  }

  /* Submenú de Servicios */
  document.querySelectorAll(".menu-grupo").forEach(function (grupo) {
    var boton = grupo.querySelector(".menu-desplegar");
    function poner(abierto) {
      grupo.classList.toggle("abierto", abierto);
      boton.setAttribute("aria-expanded", abierto ? "true" : "false");
    }
    boton.addEventListener("click", function (e) {
      e.stopPropagation();
      poner(!grupo.classList.contains("abierto"));
    });
    document.addEventListener("click", function (e) {
      if (!grupo.contains(e.target)) poner(false);
    });
    grupo.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && grupo.classList.contains("abierto")) { poner(false); boton.focus(); }
    });
    grupo.addEventListener("focusout", function (e) {
      if (e.relatedTarget && !grupo.contains(e.relatedTarget)) poner(false);
    });
  });

  /* Datos de contacto desde config.js */
  document.querySelectorAll("[data-config]").forEach(function (el) {
    var clave = el.getAttribute("data-config");
    var v = C[clave];
    if (v && clave === "instagram" && v.indexOf("[") === -1) v = "@" + v.replace(/^@/, "");
    if (v) el.textContent = v;
  });
  document.querySelectorAll("[data-config-href]").forEach(function (el) {
    var clave = el.getAttribute("data-config-href");
    if (clave === "instagram" && C.instagram && C.instagram.indexOf("[") === -1) {
      el.href = "https://www.instagram.com/" + C.instagram.replace(/^@/, "") + "/";
    } else if (clave === "mapa" && C.mapa) {
      el.href = C.mapa;
    }
  });

  /* Enlaces de WhatsApp con mensaje */
  document.querySelectorAll("[data-wa]").forEach(function (a) {
    prepararEnlace(a, a.getAttribute("data-wa"));
  });
  document.querySelectorAll("[data-wa-numero]").forEach(function (el) {
    var n = String(C.whatsapp || "").replace(/\D/g, "");
    if (n) el.textContent = n.length === 12 ? "+" + n.slice(0, 2) + " " + n.slice(2, 5) + " " + n.slice(5, 8) + " " + n.slice(8) : "+" + n;
  });

  /* Catálogo desplegable con buscador */
  var lista = document.getElementById("catalogo-lista");
  var datos = window.DOMUS_CATALOGO || [];
  if (lista) {
    var tarjetas = [];
    var categorias = [];

    datos.forEach(function (cat) {
      var det = document.createElement("details");
      det.className = "categoria";
      det.id = "cat-" + cat.id;

      var sum = document.createElement("summary");
      var nombre = document.createElement("span");
      nombre.textContent = cat.nombre;
      var cuenta = document.createElement("span");
      cuenta.className = "cuenta";
      cuenta.textContent = cat.items.length + (cat.items.length === 1 ? " mueble" : " muebles");
      sum.appendChild(nombre);
      sum.appendChild(cuenta);
      sum.insertAdjacentHTML("beforeend", '<svg class="flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>');
      det.appendChild(sum);

      var cuerpo = document.createElement("div");
      cuerpo.className = "categoria-cuerpo";
      cat.items.forEach(function (it) {
        var art = document.createElement("article");
        art.className = "mueble";

        var foto = document.createElement("div");
        foto.className = "foto";
        if (it.foto) {
          var img = document.createElement("img");
          img.src = it.foto;
          img.alt = it.nombre;
          img.loading = "lazy";
          img.addEventListener("error", function () {
            img.remove();
            var aviso = document.createElement("span");
            aviso.textContent = "La foto se ve en la web publicada";
            foto.insertBefore(aviso, foto.firstChild);
          });
          foto.appendChild(img);
          if (it.referencia) {
            var ref = document.createElement("span");
            ref.textContent = "Foto de referencia";
            foto.appendChild(ref);
          }
        } else {
          var et = document.createElement("span");
          et.textContent = "Foto pendiente";
          foto.appendChild(et);
        }
        art.appendChild(foto);

        var h = document.createElement("h3");
        h.textContent = it.nombre;
        var p = document.createElement("p");
        p.textContent = it.descripcion;
        var precio = document.createElement("p");
        precio.className = "precio";
        precio.textContent = it.precio;
        var a = document.createElement("a");
        a.className = "boton boton-principal boton-chico";
        a.textContent = "Cotizar";
        a.setAttribute("aria-label", "Cotizar " + it.nombre);
        prepararEnlace(a, "Hola, quiero cotizar: " + it.nombre + " (" + cat.nombre + ").");
        art.appendChild(h);
        art.appendChild(p);
        art.appendChild(precio);
        art.appendChild(a);
        cuerpo.appendChild(art);

        tarjetas.push({ el: art, cat: det, texto: normalizar(cat.nombre + " " + it.nombre + " " + it.descripcion) });
      });
      det.appendChild(cuerpo);
      lista.appendChild(det);
      categorias.push({ el: det, cuenta: cuenta, total: cat.items.length });
    });

    var input = document.getElementById("buscar-mueble");
    var resultado = document.getElementById("resultado-busqueda");
    var sinResultados = document.getElementById("sin-resultados");
    var estadoPrevio = null;

    function filtrar() {
      var q = normalizar(input.value);
      if (q && estadoPrevio === null) {
        estadoPrevio = categorias.map(function (c) { return c.el.open; });
      }
      var total = 0;
      categorias.forEach(function (c) { c.visibles = 0; });
      tarjetas.forEach(function (t) {
        var ok = !q || t.texto.indexOf(q) !== -1;
        t.el.hidden = !ok;
        if (ok) {
          total++;
          categorias.forEach(function (c) { if (c.el === t.cat) c.visibles++; });
        }
      });
      categorias.forEach(function (c, i) {
        c.el.hidden = c.visibles === 0;
        c.cuenta.textContent = (q ? c.visibles + " de " + c.total : c.total) + (c.total === 1 ? " mueble" : " muebles");
        if (q) c.el.open = c.visibles > 0;
        else if (estadoPrevio) c.el.open = estadoPrevio[i];
      });
      if (!q) estadoPrevio = null;
      resultado.textContent = q ? (total === 1 ? "1 mueble encontrado" : total + " muebles encontrados") : "";
      sinResultados.hidden = !(q && total === 0);
    }
    if (input) input.addEventListener("input", filtrar);

    if (location.hash && location.hash.indexOf("#cat-") === 0) {
      var objetivo = document.getElementById(location.hash.slice(1));
      if (objetivo) objetivo.open = true;
    }
  }

  /* Formularios que preparan un mensaje de WhatsApp */
  document.querySelectorAll("form[data-form-wa]").forEach(function (form) {
    var salida = form.querySelector(".mensaje-listo");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var lineas = [form.getAttribute("data-form-wa")];
      var faltan = [];
      form.querySelectorAll("[data-etiqueta]").forEach(function (campo) {
        var etiqueta = campo.getAttribute("data-etiqueta");
        var valor = "";
        var marcados = campo.querySelectorAll("input[type=checkbox]:checked, input[type=radio]:checked");
        if (campo.querySelector("input[type=checkbox], input[type=radio]")) {
          valor = Array.prototype.map.call(marcados, function (m) { return m.value; }).join(", ");
        } else {
          var control = campo.querySelector("input, select, textarea");
          valor = control ? control.value.trim() : "";
          if (control && control.required && !valor) faltan.push(control);
        }
        if (valor) lineas.push(etiqueta + ": " + valor);
      });
      var error = form.querySelector(".error");
      if (faltan.length) {
        error.hidden = false;
        error.textContent = "Escribe tu nombre para poder preparar el mensaje.";
        faltan[0].focus();
        return;
      }
      error.hidden = true;
      var mensaje = lineas.join("\n");
      var nota = form.getAttribute("data-nota");
      salida.hidden = false;
      salida.querySelector("pre").textContent = mensaje;
      var a = salida.querySelector("a");
      prepararEnlace(a, mensaje);
      var p = salida.querySelector(".nota");
      if (p) p.textContent = nota || "";
      a.focus();
    });
  });
})();
