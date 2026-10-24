/* Domus · tienda de muebles restaurados.
   Lee el inventario publicado (CSV de la hoja "Web" de Google Sheets) y muestra las fichas.
   Columnas esperadas: Codigo, Nombre, Categoria, Descripcion, Medidas, Madera, Estado, Precio, Foto1, Foto2, Foto3 */
document.addEventListener("DOMContentLoaded", function () {
  var C = window.DOMUS_CONFIG || {};
  var lista = document.getElementById("tienda-lista");
  if (!lista) return;
  var selCat = document.getElementById("filtro-categoria");
  var chkVend = document.getElementById("filtro-vendidos");
  var resultado = document.getElementById("resultado-restaurados");
  var vacia = document.getElementById("tienda-vacia");
  var aviso = document.getElementById("aviso-ejemplo");
  var muebles = [];
  var esEjemplo = false;

  var EJEMPLOS = [
    { Codigo: "R-001", Nombre: "Cómoda de cuatro cajones", Categoria: "Habitaciones", Descripcion: "Restaurada con laca mate y herrajes nuevos.", Medidas: "90 × 45 × 85 cm", Madera: "Cedro", Estado: "Disponible", Precio: "650000" },
    { Codigo: "R-002", Nombre: "Comedor de cuatro puestos", Categoria: "Comedor", Descripcion: "Mesa lijada y barnizada, sillas reforzadas.", Medidas: "120 × 80 × 76 cm", Madera: "Pino", Estado: "Apartado", Precio: "980000" },
    { Codigo: "R-003", Nombre: "Biblioteca abierta", Categoria: "Salas", Descripcion: "Pintada en verde salvia, con repisas reforzadas.", Medidas: "80 × 30 × 180 cm", Madera: "Pino", Estado: "Disponible", Precio: "420000" },
    { Codigo: "R-004", Nombre: "Mesa de noche", Categoria: "Habitaciones", Descripcion: "Cajón ajustado y acabado natural.", Medidas: "45 × 40 × 55 cm", Madera: "Roble", Estado: "Vendido", Precio: "210000" }
  ];

  function limpio(v) { return String(v == null ? "" : v).trim(); }

  function parseCSV(texto) {
    var filas = [], fila = [], campo = "", comillas = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (comillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i++; } else { comillas = false; }
        } else { campo += c; }
      } else if (c === '"') { comillas = true; }
      else if (c === ",") { fila.push(campo); campo = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && texto[i + 1] === "\n") i++;
        fila.push(campo); filas.push(fila); fila = []; campo = "";
      } else { campo += c; }
    }
    if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
    if (!filas.length) return [];
    var cab = filas[0].map(function (h) { return limpio(h).normalize("NFD").replace(/[̀-ͯ]/g, ""); });
    return filas.slice(1).map(function (f) {
      var o = {};
      cab.forEach(function (h, k) { o[h] = limpio(f[k]); });
      return o;
    }).filter(function (o) { return o.Nombre; });
  }

  /* Enlaces de Google Drive -> imagen directa */
  function urlFoto(u) {
    u = limpio(u);
    if (!u) return "";
    var m = u.match(/\/d\/([A-Za-z0-9_-]{10,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
    if (u.indexOf("drive.google.com") !== -1 && m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200";
    return u;
  }

  function precioTexto(p) {
    var n = Number(String(p).replace(/[^\d]/g, ""));
    if (!n) return limpio(p) || "Precio a consultar";
    return "$" + n.toLocaleString("es-CO").replace(/,/g, ".");
  }

  function estadoDe(m) {
    var e = limpio(m.Estado).toLowerCase();
    if (e.indexOf("vend") === 0) return "vendido";
    if (e.indexOf("apart") === 0) return "apartado";
    return "disponible";
  }

  function ficha(m) {
    var estado = estadoDe(m);
    var art = document.createElement("article");
    art.className = "producto estado-" + estado;

    var fotos = [m.Foto1, m.Foto2, m.Foto3].map(urlFoto).filter(Boolean);
    var marco = document.createElement("div");
    marco.className = "foto";
    var img = null;
    if (fotos.length) {
      img = document.createElement("img");
      img.src = fotos[0];
      img.alt = m.Nombre;
      img.loading = "lazy";
      marco.appendChild(img);
    } else {
      var sp = document.createElement("span");
      sp.textContent = "Foto pendiente";
      marco.appendChild(sp);
    }
    var sello = document.createElement("span");
    sello.className = "sello sello-" + estado;
    sello.textContent = estado === "vendido" ? "Vendido" : estado === "apartado" ? "Apartado" : "Disponible";
    marco.appendChild(sello);
    art.appendChild(marco);

    if (fotos.length > 1) {
      var mini = document.createElement("div");
      mini.className = "miniaturas";
      fotos.forEach(function (f, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Ver foto " + (i + 1) + " de " + m.Nombre);
        if (i === 0) b.setAttribute("aria-pressed", "true");
        var t = document.createElement("img");
        t.src = f; t.alt = "";
        b.appendChild(t);
        b.addEventListener("click", function () {
          img.src = f;
          mini.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        });
        mini.appendChild(b);
      });
      art.appendChild(mini);
      /* Pasar las fotos con el dedo */
      var actual = 0, x0 = null;
      function verFoto(i) {
        actual = (i + fotos.length) % fotos.length;
        img.src = fotos[actual];
        mini.querySelectorAll("button").forEach(function (x, k) { x.setAttribute("aria-pressed", k === actual ? "true" : "false"); });
      }
      mini.querySelectorAll("button").forEach(function (b, k) { b.addEventListener("click", function () { actual = k; }); });
      marco.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
      marco.addEventListener("pointerup", function (e) {
        if (x0 === null) return;
        var dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) verFoto(actual + (dx < 0 ? 1 : -1));
      });
    }

    var cod = document.createElement("p");
    cod.className = "codigo";
    if (m.Categoria) { var cc = document.createElement("span"); cc.textContent = m.Categoria; cod.appendChild(cc); }
    if (m.Codigo) { var cb = document.createElement("b"); cb.textContent = m.Codigo; cod.appendChild(cb); }
    var h = document.createElement("h3");
    h.textContent = m.Nombre;
    art.appendChild(cod);
    art.appendChild(h);
    if (m.Descripcion) {
      var d = document.createElement("p");
      d.textContent = m.Descripcion;
      art.appendChild(d);
    }
    var datos = [];
    if (m.Medidas) datos.push(["Medidas", m.Medidas]);
    if (m.Madera) datos.push(["Madera", m.Madera]);
    if (datos.length) {
      var dl = document.createElement("dl");
      dl.className = "datos";
      datos.forEach(function (par) {
        var dt = document.createElement("dt"); dt.textContent = par[0];
        var dd = document.createElement("dd"); dd.textContent = par[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      art.appendChild(dl);
    }
    var pie = document.createElement("div");
    pie.className = "producto-pie";
    var pr = document.createElement("p");
    pr.className = "precio";
    pr.textContent = precioTexto(m.Precio);
    pie.appendChild(pr);

    if (estado === "vendido") {
      var v = document.createElement("span");
      v.className = "nota";
      v.textContent = "Ya tiene nuevo hogar";
      pie.appendChild(v);
    } else {
      var a = document.createElement("a");
      a.className = "boton boton-principal boton-chico";
      var msg = estado === "apartado"
        ? "Hola, me interesa el mueble " + m.Nombre + " (código " + m.Codigo + "). Si se libera, quiero apartarlo."
        : "Hola, quiero apartar el mueble " + m.Nombre + " (código " + m.Codigo + ").";
      a.textContent = estado === "apartado" ? "Avisarme si se libera" : "Apartar";
      a.setAttribute("aria-label", a.textContent + ": " + m.Nombre);
      if (esEjemplo) {
        a.href = "#";
        a.setAttribute("aria-disabled", "true");
        a.addEventListener("click", function (e) { e.preventDefault(); });
      } else {
        a.href = window.DOMUS_WA ? window.DOMUS_WA(msg) : "contacto.html";
        if (a.href.indexOf("wa.me") !== -1) { a.target = "_blank"; a.rel = "noopener"; }
        a.addEventListener("click", function () {
          var antes = a.textContent;
          a.classList.add("listo");
          a.textContent = "Mensaje listo en WhatsApp";
          setTimeout(function () { a.classList.remove("listo"); a.textContent = antes; }, 2600);
        });
      }
      pie.appendChild(a);
    }
    art.appendChild(pie);
    return art;
  }

  function pintar() {
    lista.textContent = "";
    var cat = selCat.value;
    var verVend = chkVend.checked;
    var orden = { disponible: 0, apartado: 1, vendido: 2 };
    var vis = muebles.filter(function (m) {
      if (cat && m.Categoria !== cat) return false;
      if (!verVend && estadoDe(m) === "vendido") return false;
      return true;
    }).sort(function (x, y) { return orden[estadoDe(x)] - orden[estadoDe(y)]; });
    vis.forEach(function (m) { lista.appendChild(ficha(m)); });
    var disp = vis.filter(function (m) { return estadoDe(m) === "disponible"; }).length;
    resultado.textContent = muebles.length ? (disp === 1 ? "1 mueble disponible" : disp + " muebles disponibles") : "";
    vacia.hidden = vis.length > 0;
    if (!vis.length && muebles.length) {
      document.getElementById("tienda-vacia-titulo").textContent = "No hay muebles disponibles con ese filtro.";
      document.getElementById("tienda-vacia-texto").textContent = "Prueba con otra categoría o escríbenos y te avisamos cuando llegue uno.";
    }
  }

  function cargar(datos) {
    muebles = datos;
    var cats = [];
    muebles.forEach(function (m) { if (m.Categoria && cats.indexOf(m.Categoria) === -1) cats.push(m.Categoria); });
    cats.sort().forEach(function (c) {
      var o = document.createElement("option");
      o.value = c; o.textContent = c;
      selCat.appendChild(o);
    });
    pintar();
  }

  selCat.addEventListener("change", pintar);
  chkVend.addEventListener("change", pintar);

  var url = limpio(C.inventario);
  if (!url) {
    esEjemplo = true;
    aviso.hidden = false;
    cargar(EJEMPLOS);
    return;
  }
  resultado.textContent = "Cargando muebles…";
  fetch(url, { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (t) { cargar(parseCSV(t)); })
    .catch(function () {
      resultado.textContent = "";
      vacia.hidden = false;
      document.getElementById("tienda-vacia-titulo").textContent = "No pudimos cargar los muebles en este momento.";
      document.getElementById("tienda-vacia-texto").textContent = "Escríbenos por WhatsApp y te contamos qué tenemos disponible.";
    });
});
