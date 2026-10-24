/* Domus 3D
   Motor 3D mínimo en WebGL, sin librerías. Dibuja el símbolo del logo y muebles hechos de tablas,
   con una veta de madera que se genera en el propio material.
   Uso:
     var logo = Domus3D.logo(canvas, { fondo: 'oscuro', acabado: 'natural' });
     var mueble = Domus3D.aparador(canvas, { ancho: 160, acabado: 'natural' });
   Si el navegador no tiene WebGL, las dos funciones devuelven null y la página muestra su respaldo plano. */
(function (global) {
  'use strict';

  var reducir = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- Matrices (columna mayor, como WebGL) ---------- */
  var M = {
    I: function () { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    mul: function (a, b) {
      var o = new Float32Array(16);
      for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
        var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
      return o;
    },
    serie: function () { var m = arguments[0]; for (var i = 1; i < arguments.length; i++) m = M.mul(m, arguments[i]); return m; },
    T: function (x, y, z) { var m = M.I(); m[12] = x; m[13] = y; m[14] = z; return m; },
    RX: function (a) { var m = M.I(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
    RY: function (a) { var m = M.I(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
    RZ: function (a) { var m = M.I(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
    E: function (s) { var m = M.I(); m[0] = m[5] = m[10] = s; return m; },
    P: function (f, a, n, l) { var t = 1 / Math.tan(f / 2), m = new Float32Array(16); m[0] = t / a; m[5] = t; m[10] = (l + n) / (n - l); m[11] = -1; m[14] = 2 * l * n / (n - l); return m; },
    N: function (m) { return new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]); }
  };

  function lineal(hex) {
    var v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(function (c) { return Math.pow(c / 255, 2.2); });
  }

  /* Acabados de la marca. claro y oscuro son los dos tonos de la veta. */
  var ACABADOS = {
    natural: { nombre: 'madera natural', claro: '#C99B69', oscuro: '#82542F', espec: 0.22, brillo: 36 },
    cafe:    { nombre: 'café', claro: '#6E4A33', oscuro: '#2E1C10', espec: 0.30, brillo: 48 },
    oliva:   { nombre: 'pintado oliva', claro: '#5A6932', oscuro: '#4B582A', espec: 0.42, brillo: 70 },
    crema:   { nombre: 'lacado crema', claro: '#EDEBDC', oscuro: '#DAD6C2', espec: 0.40, brillo: 64 },
    gastado: { nombre: 'madera gastada', claro: '#A3998A', oscuro: '#6A6052', espec: 0.04, brillo: 8 }
  };
  function material(clave, extra) {
    var a = ACABADOS[clave] || ACABADOS.natural, m = { claro: lineal(a.claro), oscuro: lineal(a.oscuro), espec: a.espec, brillo: a.brillo, dir: [1, 0], semilla: 0 };
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }
  function solido(hex, espec, brillo) { var c = lineal(hex); return { claro: c, oscuro: c, espec: espec, brillo: brillo, dir: [1, 0], semilla: 0 }; }

  /* ---------- Geometría ---------- */
  function muestrear(ini, segs, n, esc, cx, cy) {
    var pts = [], p0 = ini;
    segs.forEach(function (s) {
      for (var k = 1; k <= n; k++) {
        var t = k / n, u = 1 - t;
        var x = u * u * u * p0[0] + 3 * u * u * t * s[0] + 3 * u * t * t * s[2] + t * t * t * s[4];
        var y = u * u * u * p0[1] + 3 * u * u * t * s[1] + 3 * u * t * t * s[3] + t * t * t * s[5];
        pts.push([(x - cx) / esc, -(y - cy) / esc]);
      }
      p0 = [s[4], s[5]];
    });
    var limpio = [];
    pts.forEach(function (p) {
      var q = limpio[limpio.length - 1];
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5) limpio.push(p);
    });
    var f = limpio[0], l = limpio[limpio.length - 1];
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-5) limpio.pop();
    var area = 0;
    for (var i = 0; i < limpio.length; i++) { var a = limpio[i], b = limpio[(i + 1) % limpio.length]; area += a[0] * b[1] - b[0] * a[1]; }
    if (area < 0) limpio.reverse();
    return limpio;
  }

  function enTriangulo(p, a, b, c) {
    var d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
    var d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
    var d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
    return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
  }
  function triangular(pts) {
    var idx = pts.map(function (_, i) { return i; }), tris = [], guardia = 0;
    while (idx.length > 3 && guardia++ < 20000) {
      var hecho = false, m = idx.length;
      for (var i = 0; i < m; i++) {
        var ia = idx[(i - 1 + m) % m], ib = idx[i], ic = idx[(i + 1) % m];
        var A = pts[ia], B = pts[ib], C = pts[ic];
        if ((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) <= 1e-10) continue;
        var dentro = false;
        for (var j = 0; j < m; j++) {
          var ij = idx[j];
          if (ij === ia || ij === ib || ij === ic) continue;
          if (enTriangulo(pts[ij], A, B, C)) { dentro = true; break; }
        }
        if (dentro) continue;
        tris.push(ia, ib, ic); idx.splice(i, 1); hecho = true; break;
      }
      if (!hecho) {
        var peor = 0, menor = Infinity;
        for (var k = 0; k < m; k++) {
          var a2 = pts[idx[(k - 1 + m) % m]], b2 = pts[idx[k]], c2 = pts[idx[(k + 1) % m]];
          var cr = Math.abs((b2[0] - a2[0]) * (c2[1] - a2[1]) - (b2[1] - a2[1]) * (c2[0] - a2[0]));
          if (cr < menor) { menor = cr; peor = k; }
        }
        idx.splice(peor, 1);
      }
    }
    if (idx.length === 3) tris.push(idx[0], idx[1], idx[2]);
    return tris;
  }

  function Geo() { this.pos = []; this.nor = []; this.ind = []; }
  Geo.prototype.v = function (x, y, z, nx, ny, nz) { this.pos.push(x, y, z); this.nor.push(nx, ny, nz); return this.pos.length / 3 - 1; };
  Geo.prototype.quad = function (a, b, c, d) { this.ind.push(a, b, c, a, c, d); };

  /* Pieza plana extruida con un chaflán pequeño en los bordes, como madera lijada. */
  function extruir(pts, prof, ch) {
    var g = new Geo(), n = pts.length, h = prof / 2, en = [], avn = [], i;
    for (i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      en.push([dy / l, -dx / l]);
    }
    for (i = 0; i < n; i++) {
      var e0 = en[(i - 1 + n) % n], e1 = en[i], x = e0[0] + e1[0], y = e0[1] + e1[1], ll = Math.hypot(x, y);
      avn.push(ll < 1e-4 ? e1 : [x / ll, y / ll]);
    }
    var COS = Math.cos(38 * Math.PI / 180);
    function lado(i, alInicio) {
      var e = en[i], o = alInicio ? en[(i - 1 + n) % n] : en[(i + 1) % n];
      if (e[0] * o[0] + e[1] * o[1] > COS) { var x = e[0] + o[0], y = e[1] + o[1], l = Math.hypot(x, y); return [x / l, y / l]; }
      return e;
    }
    function mezcla(v, l, f) { var x = v[0] * l, y = v[1] * l, z = f, m = Math.hypot(x, y, z); return [x / m, y / m, z / m]; }
    var dentro = pts.map(function (p, i) { return [p[0] - avn[i][0] * ch, p[1] - avn[i][1] * ch]; });
    var tris = triangular(pts), base = g.pos.length / 3;
    dentro.forEach(function (p) { g.v(p[0], p[1], h, 0, 0, 1); });
    for (i = 0; i < tris.length; i += 3) g.ind.push(base + tris[i], base + tris[i + 1], base + tris[i + 2]);
    base = g.pos.length / 3;
    dentro.forEach(function (p) { g.v(p[0], p[1], -h, 0, 0, -1); });
    for (i = 0; i < tris.length; i += 3) g.ind.push(base + tris[i], base + tris[i + 2], base + tris[i + 1]);
    function franja(p0, p1, q0, q1, za, zb, na, nb, nc, nd) {
      var s = g.v(p0[0], p0[1], za, na[0], na[1], na[2]);
      g.v(p1[0], p1[1], za, nb[0], nb[1], nb[2]);
      g.v(q1[0], q1[1], zb, nc[0], nc[1], nc[2]);
      g.v(q0[0], q0[1], zb, nd[0], nd[1], nd[2]);
      g.quad(s, s + 1, s + 2, s + 3);
    }
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n, ai = avn[i], aj = avn[j], s0 = lado(i, true), s1 = lado(i, false);
      franja(dentro[i], dentro[j], pts[i], pts[j], h, h - ch, mezcla(ai, .45, .9), mezcla(aj, .45, .9), mezcla(aj, .9, .45), mezcla(ai, .9, .45));
      franja(pts[i], pts[j], pts[i], pts[j], h - ch, -h + ch, [s0[0], s0[1], 0], [s1[0], s1[1], 0], [s1[0], s1[1], 0], [s0[0], s0[1], 0]);
      franja(pts[i], pts[j], dentro[i], dentro[j], -h + ch, -h, mezcla(ai, .9, -.45), mezcla(aj, .9, -.45), mezcla(aj, .45, -.9), mezcla(ai, .45, -.9));
    }
    var cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p[0]; cy += p[1]; });
    g.c = [cx / n, cy / n];
    return g;
  }

  /* Tabla rectangular: se suman varias en la misma geometría. */
  function caja(g, x0, y0, z0, x1, y1, z1) {
    var caras = [
      [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]],
      [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]],
      [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]],
      [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]],
      [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]],
      [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]]
    ];
    caras.forEach(function (c) {
      var n = c[4], s = g.v(c[0][0], c[0][1], c[0][2], n[0], n[1], n[2]);
      g.v(c[1][0], c[1][1], c[1][2], n[0], n[1], n[2]);
      g.v(c[2][0], c[2][1], c[2][2], n[0], n[1], n[2]);
      g.v(c[3][0], c[3][1], c[3][2], n[0], n[1], n[2]);
      g.quad(s, s + 1, s + 2, s + 3);
    });
    return g;
  }

  /* ---------- Sombreado ---------- */
  var VS = [
    'attribute vec3 a_pos; attribute vec3 a_nor;',
    'uniform mat4 u_model; uniform mat4 u_vp; uniform mat3 u_nmat;',
    'varying vec3 v_obj; varying vec3 v_w; varying vec3 v_n;',
    'void main(){ vec4 w = u_model * vec4(a_pos, 1.0); v_obj = a_pos; v_w = w.xyz; v_n = u_nmat * a_nor; gl_Position = u_vp * w; }'
  ].join('\n');
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'varying vec3 v_obj; varying vec3 v_w; varying vec3 v_n;',
    'uniform vec3 u_claro; uniform vec3 u_oscuro; uniform vec2 u_dir; uniform float u_semilla;',
    'uniform float u_brillo; uniform float u_espec; uniform vec3 u_cam; uniform float u_luz;',
    'float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
    'float ruido(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(mix(hash(i), hash(i + vec3(1.,0.,0.)), f.x), mix(hash(i + vec3(0.,1.,0.)), hash(i + vec3(1.,1.,0.)), f.x), f.y),',
    '             mix(mix(hash(i + vec3(0.,0.,1.)), hash(i + vec3(1.,0.,1.)), f.x), mix(hash(i + vec3(0.,1.,1.)), hash(i + vec3(1.,1.,1.)), f.x), f.y), f.z); }',
    'float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++){ v += a * ruido(p); p *= 2.03; a *= 0.5; } return v; }',
    'void main(){',
    '  vec2 g = normalize(u_dir); vec2 gp = vec2(-g.y, g.x);',
    '  float largo = dot(v_obj.xy, g); float ancho = dot(v_obj.xy, gp);',
    '  vec2 tronco = vec2(ancho + 0.45 + u_semilla, v_obj.z + 1.6);',
    '  float r = length(tronco) + (fbm(vec3(largo * 0.8, ancho * 2.2, v_obj.z * 2.2) + u_semilla * 9.0) - 0.5) * 0.24;',
    '  float anillo = fract(r * 8.5);',
    '  float banda = smoothstep(0.0, 0.16, anillo) * (1.0 - smoothstep(0.42, 1.0, anillo));',
    '  float fibra = ruido(vec3(largo * 1.6, ancho * 70.0, v_obj.z * 70.0));',
    '  vec3 base = mix(u_claro, u_oscuro, clamp(banda * 0.78 + fibra * 0.22, 0.0, 1.0));',
    '  vec3 n = normalize(v_n); vec3 V = normalize(u_cam - v_w);',
    '  vec3 L1 = normalize(vec3(0.55, 0.75, 0.85)); vec3 c1 = vec3(1.0, 0.92, 0.80) * 2.0 * u_luz;',
    '  vec3 L2 = normalize(vec3(-0.85, 0.15, 0.5)); vec3 c2 = vec3(0.72, 0.86, 0.80) * 0.6;',
    '  float cielo = 0.5 + 0.5 * n.y;',
    '  vec3 col = base * mix(vec3(0.14, 0.10, 0.07), vec3(0.34, 0.33, 0.28), cielo);',
    '  col += base * (c1 * max(dot(n, L1), 0.0) + c2 * max(dot(n, L2), 0.0));',
    '  vec3 H = normalize(L1 + V); col += c1 * u_espec * pow(max(dot(n, H), 0.0), u_brillo);',
    '  col += vec3(1.0, 0.95, 0.86) * pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.22;',
    '  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);',
    '  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);',
    '}'
  ].join('\n');

  function Lienzo(canvas) {
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: true, alpha: true }) || canvas.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(tipo, src) {
      var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('[Domus3D]', gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error('[Domus3D]', gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    var loc = {};
    ['u_model', 'u_vp', 'u_nmat', 'u_claro', 'u_oscuro', 'u_dir', 'u_semilla', 'u_brillo', 'u_espec', 'u_cam', 'u_luz'].forEach(function (k) { loc[k] = gl.getUniformLocation(prog, k); });
    var aPos = gl.getAttribLocation(prog, 'a_pos'), aNor = gl.getAttribLocation(prog, 'a_nor');
    var L = { gl: gl, canvas: canvas, vp: M.I(), dist: 8, luz: 1 };
    L.malla = function (g, vieja) {
      var m = vieja || { bPos: gl.createBuffer(), bNor: gl.createBuffer(), bInd: gl.createBuffer() };
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bPos); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.pos), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bNor); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.nor), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.bInd); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.ind), gl.STATIC_DRAW);
      m.cuenta = g.ind.length; m.c = g.c;
      return m;
    };
    L.medir = function (fovGrados, dist, minAspecto, alturaCam) {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      var asp = w / h, fov = fovGrados * Math.PI / 180;
      if (asp < minAspecto) fov = 2 * Math.atan(Math.tan(fov / 2) * minAspecto / asp);
      L.dist = dist; L.alto = alturaCam || 0;
      L.vp = M.mul(M.P(fov, asp, 0.1, 60), M.T(0, -L.alto, -dist));
    };
    L.limpiar = function () {
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
      gl.uniformMatrix4fv(loc.u_vp, false, L.vp); gl.uniform3f(loc.u_cam, 0, L.alto, L.dist); gl.uniform1f(loc.u_luz, L.luz);
    };
    L.dibujar = function (m, modelo, mat) {
      gl.uniformMatrix4fv(loc.u_model, false, modelo);
      gl.uniformMatrix3fv(loc.u_nmat, false, M.N(modelo));
      gl.uniform3fv(loc.u_claro, mat.claro); gl.uniform3fv(loc.u_oscuro, mat.oscuro);
      gl.uniform2fv(loc.u_dir, mat.dir); gl.uniform1f(loc.u_semilla, mat.semilla);
      gl.uniform1f(loc.u_espec, mat.espec); gl.uniform1f(loc.u_brillo, mat.brillo);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bPos); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.bNor); gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.bInd);
      gl.drawElements(gl.TRIANGLES, m.cuenta, gl.UNSIGNED_SHORT, 0);
    };
    return L;
  }

  /* ---------- Bucle: solo corre mientras la escena se ve y algo se mueve ---------- */
  function bucle(elemento, paso) {
    var visible = true, corriendo = false, previo = 0;
    function cuadro(ahora) {
      if (!visible || document.hidden) { corriendo = false; return; }
      var dt = Math.min(0.05, (ahora - previo) / 1000 || 0.016); previo = ahora;
      if (paso(ahora, dt)) global.requestAnimationFrame(cuadro); else corriendo = false;
    }
    function arrancar() { if (!corriendo && visible && !document.hidden) { corriendo = true; previo = performance.now(); global.requestAnimationFrame(cuadro); } }
    if ('IntersectionObserver' in global) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) arrancar(); }).observe(elemento);
    document.addEventListener('visibilitychange', arrancar);
    return arrancar;
  }

  /* Giro con el dedo o el mouse: suelta y vuelve suave al frente. Inclinación que sigue al cursor. */
  function control(canvas, zona, arrancar, alTocar) {
    var c = { giro: 0, vel: 0, inclX: 0, inclY: 0, metaX: 0, metaY: 0, arrastrando: false };
    var ultimo = 0;
    zona.addEventListener('pointermove', function (e) {
      if (c.arrastrando) { var dx = e.clientX - ultimo; ultimo = e.clientX; c.giro += dx * 0.011; c.vel = dx * 0.66; }
      else if (e.pointerType === 'mouse') {
        var r = zona.getBoundingClientRect();
        c.metaY = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
        c.metaX = ((e.clientY - r.top) / r.height - 0.5) * 0.3;
      }
      arrancar();
    });
    zona.addEventListener('pointerleave', function () { c.metaX = c.metaY = 0; arrancar(); });
    canvas.addEventListener('pointerdown', function (e) {
      c.arrastrando = true; ultimo = e.clientX; c.vel = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      if (alTocar) alTocar(); arrancar();
    });
    function soltar() { c.arrastrando = false; arrancar(); }
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);
    canvas.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { c.vel += e.key === 'ArrowLeft' ? -4.5 : 4.5; e.preventDefault(); if (alTocar) alTocar(); arrancar(); }
    });
    c.paso = function (dt) {
      var k = 1 - Math.exp(-dt * 4);
      c.inclX += (c.metaX - c.inclX) * k; c.inclY += (c.metaY - c.inclY) * k;
      if (!c.arrastrando) {
        var meta = Math.round(c.giro / (Math.PI * 2)) * Math.PI * 2;
        c.vel += (meta - c.giro) * 11 * dt; c.vel *= Math.exp(-4.5 * dt); c.giro += c.vel * dt;
      }
      return c.arrastrando || Math.abs(c.vel) > 0.002 || Math.abs(c.metaX - c.inclX) + Math.abs(c.metaY - c.inclY) > 0.0005 || Math.abs(c.giro - Math.round(c.giro / (Math.PI * 2)) * Math.PI * 2) > 0.0005;
    };
    return c;
  }

  function lim(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function suave(t) { return 1 - Math.pow(1 - t, 3); }
  function suaveAtras(t) { var c1 = 1.15, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  /* ---------- Logo: dos piezas que se ensamblan y el ojo que entra al final ---------- */
  var TRAZOS = {
    ala:    { ini: [130, 170], seg: [[300, 200, 520, 240, 650, 330], [730, 390, 760, 480, 760, 582], [660, 530, 525, 455, 405, 365], [300, 290, 205, 225, 130, 170]], n: 40 },
    cuerpo: { ini: [760, 582], seg: [[600, 568, 405, 568, 322, 640], [268, 690, 298, 765, 350, 845], [382, 905, 392, 985, 392, 1055], [405, 930, 760, 800, 760, 582]], n: 40 },
    ojo:    { ini: [222, 343], seg: [[262, 326, 322, 337, 337, 377], [298, 397, 243, 386, 222, 343]], n: 26 }
  };

  function logo(canvas, op) {
    op = op || {};
    var L = Lienzo(canvas);
    if (!L) return null;
    var zona = op.zona || canvas.parentElement, sombra = op.sombra || null;
    var estado = { acabado: op.acabado || 'natural', fondo: op.fondo || 'claro', inicio: -1, saltar: reducir || op.entrada === false };
    var piezas = [
      { id: 'cuerpo', dir: [-0.61, -0.79], semilla: 0.7, desde: [0.95, -0.85, -0.5, -0.5], retraso: 0.0, dur: 1.15 },
      { id: 'ala', dir: [0.84, -0.55], semilla: 0.0, desde: [-0.95, 0.9, 0.6, 0.55], retraso: 0.12, dur: 1.15 },
      { id: 'ojo', dir: [1, 0], semilla: 0.3, desde: [0, 0, 1.8, 0], retraso: 1.05, dur: 0.55, ojo: true }
    ];
    piezas.forEach(function (p) {
      var t = TRAZOS[p.id];
      p.malla = L.malla(extruir(muestrear(t.ini, t.seg, t.n, 280, 445, 612), 0.3, p.ojo ? 0.012 : 0.022));
    });
    var ctl, arrancar = bucle(zona, paso);
    ctl = control(canvas, zona, arrancar, op.alTocar);
    function medir() { L.medir(30, 8.4, op.minAspecto || 0.95, -0.02); }

    function paso(ahora, dt) {
      if (estado.inicio < 0) estado.inicio = ahora;
      var t = estado.saltar ? 99 : (ahora - estado.inicio) / 1000;
      var moviendo = ctl.paso(dt);
      var entrada = estado.saltar ? 0 : (1 - suave(lim(t / 1.7))) * -0.75;
      var flota = reducir ? 0 : Math.sin(ahora / 1000 * 1.15) * 0.045 * lim((t - 1.6) / 0.6);
      var clic = estado.saltar ? 0 : 0.018 * Math.exp(-Math.pow((t - 1.27) / 0.07, 2));
      var grupo = M.serie(M.T(0, flota, 0), M.RY(entrada + ctl.inclY + ctl.giro), M.RX(ctl.inclX), M.E(1 + clic));
      var mat = material(estado.acabado), ojo = solido(estado.fondo === 'oscuro' ? '#52D289' : '#362418', 0.5, 80);
      L.limpiar();
      var armado = 0;
      piezas.forEach(function (p) {
        var a = lim((t - p.retraso) / p.dur), f = p.ojo ? suave(a) : suaveAtras(a), q = 1 - f, d = p.desde, c = p.malla.c;
        if (!p.ojo) armado += f / 2;
        if (p.ojo && a <= 0) return;
        var m = M.mul(grupo, M.serie(M.T(c[0] + d[0] * q, c[1] + d[1] * q, d[2] * q), M.RZ(d[3] * q), M.T(-c[0], -c[1], 0)));
        mat.dir = p.dir; mat.semilla = p.semilla;
        L.dibujar(p.malla, m, p.ojo ? ojo : mat);
      });
      if (sombra) {
        sombra.style.opacity = String(Math.min(1, armado) * 0.95);
        sombra.style.transform = 'translateX(-50%) scale(' + (1 - flota * 1.6).toFixed(3) + ')';
      }
      if (op.alArmar && armado >= 1 && !estado.avisado) { estado.avisado = true; op.alArmar(); }
      return t < 2.4 || moviendo || !reducir;
    }

    if ('ResizeObserver' in global) new ResizeObserver(function () { medir(); arrancar(); }).observe(canvas);
    global.addEventListener('resize', function () { medir(); arrancar(); });
    medir(); arrancar();
    return {
      ensamblar: function () { estado.inicio = -1; estado.saltar = false; estado.avisado = false; ctl.giro = 0; ctl.vel = 0; arrancar(); },
      acabado: function (k) { estado.acabado = k; arrancar(); },
      fondo: function (k) { estado.fondo = k; arrancar(); }
    };
  }

  /* ---------- Aparador configurable: mismas tablas que en el taller ---------- */
  function aparador(canvas, op) {
    op = op || {};
    var L = Lienzo(canvas);
    if (!L) return null;
    var zona = op.zona || canvas.parentElement, sombra = op.sombra || null;
    var U = 1 / 60; /* 60 cm = 1 unidad */
    var estado = { ancho: op.ancho || 160, acabado: op.acabado || 'natural', cambio: -1, anterior: op.ancho || 160 };
    var mallas = {};
    function construir(anchoCm) {
      var W = anchoCm * U, H = 85 * U, D = 45 * U, pata = 12 * U, tabla = 1.8 * U, holg = 0.35 * U;
      var x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2, yb = pata - H / 2, yt = H / 2 - 3 * U, ytope = H / 2;
      var cuerpo = new Geo(), tapa = new Geo(), puertas = new Geo(), herrajes = new Geo();
      caja(cuerpo, x0, yb, z0, x0 + tabla, yt, z1 - tabla);
      caja(cuerpo, x1 - tabla, yb, z0, x1, yt, z1 - tabla);
      caja(cuerpo, x0 + tabla, yb, z0, x1 - tabla, yb + tabla, z1 - tabla);
      caja(cuerpo, x0 + tabla, yb, z0, x1 - tabla, yt, z0 + tabla);
      caja(tapa, x0 - 1 * U, yt, z0 - 1 * U, x1 + 1 * U, ytope, z1 + 1 * U);
      var n = anchoCm < 130 ? 2 : anchoCm < 190 ? 3 : 4, pw = (W - 2 * holg) / n;
      for (var i = 0; i < n; i++) {
        var px0 = x0 + holg + i * pw + holg / 2, px1 = px0 + pw - holg;
        caja(puertas, px0, yb + holg, z1 - tabla, px1, yt - holg, z1);
        var izquierda = i < n / 2, hx = izquierda ? px1 - 3.2 * U : px0 + 2.2 * U, hy = (yb + yt) / 2;
        caja(herrajes, hx, hy - 7 * U, z1, hx + 1 * U, hy + 7 * U, z1 + 1.4 * U);
      }
      [[x0 + 3 * U, z0 + 3 * U], [x1 - 7 * U, z0 + 3 * U], [x0 + 3 * U, z1 - 7 * U], [x1 - 7 * U, z1 - 7 * U]].forEach(function (p) {
        caja(herrajes, p[0], -H / 2, p[1], p[0] + 4 * U, yb, p[1] + 4 * U);
      });
      mallas.cuerpo = L.malla(cuerpo, mallas.cuerpo);
      mallas.tapa = L.malla(tapa, mallas.tapa);
      mallas.puertas = L.malla(puertas, mallas.puertas);
      mallas.herrajes = L.malla(herrajes, mallas.herrajes);
    }
    var ctl, arrancar = bucle(zona, paso);
    ctl = control(canvas, zona, arrancar, op.alTocar);
    function medir() { L.medir(30, 6.6, op.minAspecto || 1.1, 0.05); }
    var escalaX = 1;
    function paso(ahora, dt) {
      var moviendo = ctl.paso(dt);
      /* al cambiar el ancho, la pieza se estira con un pequeño rebote */
      var t = estado.cambio < 0 ? 1 : lim((ahora - estado.cambio) / 450);
      escalaX = estado.cambio < 0 || reducir ? 1 : (estado.anterior + (estado.ancho - estado.anterior) * suaveAtras(t)) / estado.ancho;
      var grupo = M.serie(M.RX(0.2 + ctl.inclX), M.RY(-0.55 + ctl.inclY + ctl.giro));
      var mod = M.mul(grupo, (function () { var m = M.I(); m[0] = escalaX; return m; })());
      var base = estado.acabado, madera = material(base), metal = solido(base === 'natural' ? '#2B2620' : '#C9C2B0', 0.6, 90);
      L.limpiar();
      madera.dir = [0, 1]; madera.semilla = 0.2; L.dibujar(mallas.cuerpo, mod, madera);
      var tapa = material(base, { dir: [1, 0], semilla: 0.55 }); L.dibujar(mallas.tapa, mod, tapa);
      var pu = material(base, { dir: [0, 1], semilla: 0.9 }); L.dibujar(mallas.puertas, mod, pu);
      L.dibujar(mallas.herrajes, mod, metal);
      if (sombra) sombra.style.width = (estado.ancho / 240 * 58 * escalaX).toFixed(1) + '%';
      return moviendo || t < 1;
    }
    if ('ResizeObserver' in global) new ResizeObserver(function () { medir(); arrancar(); }).observe(canvas);
    global.addEventListener('resize', function () { medir(); arrancar(); });
    construir(estado.ancho); medir(); arrancar();
    return {
      ancho: function (cm) {
        if (cm === estado.ancho) return;
        estado.anterior = estado.ancho * escalaX; estado.ancho = cm; estado.cambio = performance.now();
        construir(cm); arrancar();
      },
      acabado: function (k) { estado.acabado = k; arrancar(); }
    };
  }

  /* Piezas sueltas para construir otros muebles o el visualizador de Mi gran proyecto:
     Lienzo (contexto y dibujo), bucle (cuadros solo cuando hace falta), control (giro e inclinación),
     material y solido (acabados), geo (tablas y piezas extruidas), M (matrices). */

  /* ---------- Aparador por piezas: para verlo desarmado y para ilustraciones ---------- */
  function piezasAparador(anchoCm) {
    var U = 1 / 60, W = anchoCm * U, H = 85 * U, D = 45 * U, pata = 12 * U, t = 1.8 * U, hg = 0.35 * U;
    var x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2, yb = pata - H / 2, yt = H / 2 - 3 * U, ytope = H / 2;
    var lista = [];
    function pieza(tipo, b, off, rotulo, extra) {
      var g = caja(new Geo(), b[0], b[1], b[2], b[3], b[4], b[5]);
      var p = { geo: g, tipo: tipo, off: off, rotulo: rotulo || null, c: [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2], b: b };
      if (extra) for (var k in extra) p[k] = extra[k];
      lista.push(p); return p;
    }
    var altoCuerpo = Math.round(85 - 12 - 3), fondoCm = 45;
    pieza('cuerpo', [x0, yb, z0, x0 + t, yt, z1 - t], [-0.8, 0.1, 0], 'Costados ' + altoCuerpo + ' × ' + (fondoCm - 2) + ' cm');
    pieza('cuerpo', [x1 - t, yb, z0, x1, yt, z1 - t], [0.8, 0.1, 0]);
    pieza('cuerpo', [x0 + t, yb, z0, x1 - t, yb + t, z1 - t], [0, -0.45, 0], 'Base');
    pieza('cuerpo', [x0 + t, yb, z0, x1 - t, yt, z0 + t], [0, 0.05, -1.0], 'Fondo ' + Math.round(anchoCm - 4) + ' × ' + altoCuerpo + ' cm');
    pieza('tapa', [x0 - U, yt, z0 - U, x1 + U, ytope, z1 + U], [0, 0.85, 0], 'Tapa ' + (anchoCm + 2) + ' × ' + (fondoCm + 2) + ' cm');
    var n = anchoCm < 130 ? 2 : anchoCm < 190 ? 3 : 4, pw = (W - 2 * hg) / n;
    for (var i = 0; i < n; i++) {
      var px0 = x0 + hg + i * pw + hg / 2, px1 = px0 + pw - hg, izq = i < n / 2;
      pieza('puerta', [px0, yb + hg, z1 - t, px1, yt - hg, z1], [(i - (n - 1) / 2) * 0.25, 0, 0.95], i === Math.floor(n / 2) ? n + ' puertas ' + Math.round(pw / U) + ' × ' + Math.round((yt - yb - 2 * hg) / U) + ' cm' : null, { bisagra: izq ? px0 : px1, izq: izq });
      var hx = izq ? px1 - 3.2 * U : px0 + 2.2 * U, hy = (yb + yt) / 2;
      pieza('metal', [hx, hy - 7 * U, z1, hx + U, hy + 7 * U, z1 + 1.4 * U], [(i - (n - 1) / 2) * 0.25, 0, 1.55], i === 0 ? 'Herrajes' : null);
    }
    [[x0 + 3 * U, z0 + 3 * U], [x1 - 7 * U, z0 + 3 * U], [x0 + 3 * U, z1 - 7 * U], [x1 - 7 * U, z1 - 7 * U]].forEach(function (q, k) {
      pieza('metal', [q[0], -H / 2, q[1], q[0] + 4 * U, yb, q[1] + 4 * U], [0, -0.75, 0], k === 2 ? '4 patas de 12 cm' : null);
    });
    return lista;
  }
  function materialPieza(tipo, acabado) {
    if (tipo === 'metal') return solido(acabado === 'natural' || acabado === 'gastado' ? '#2B2620' : '#C9C2B0', acabado === 'gastado' ? 0.15 : 0.6, 90);
    return material(acabado, { dir: tipo === 'tapa' ? [1, 0] : [0, 1], semilla: tipo === 'tapa' ? 0.55 : tipo === 'puerta' ? 0.9 : 0.2 });
  }

  /* Aparador que se desarma con el scroll: progreso(0..1) lo maneja la página */
  function despiece(canvas, op) {
    op = op || {};
    var L = Lienzo(canvas);
    if (!L) return null;
    var piezas = piezasAparador(op.ancho || 160), rotulos = op.rotulos || null;
    piezas.forEach(function (p) { p.malla = L.malla(p.geo); });
    if (rotulos) piezas.forEach(function (p) {
      if (!p.rotulo) return;
      var e = document.createElement('span'); e.className = 'rotulo'; e.textContent = p.rotulo; rotulos.appendChild(e); p.el = e;
    });
    var prog = 0, pendiente = false;
    function medir() { L.medir(30, op.distancia || 9.6, 1.0, 0.1); dibujar(); }
    function suaveR(a, b, x) { var t = lim((x - a) / (b - a)); return t * t * (3 - 2 * t); }
    function dibujar() {
      pendiente = false;
      var e = reducir ? 0.85 : suaveR(0.08, 0.45, prog) * (1 - suaveR(0.72, 0.96, prog));
      var grupo = M.serie(M.RX(0.32 - 0.1 * e), M.RY(-0.75 + prog * 1.0));
      L.limpiar();
      var w = canvas.clientWidth, h = canvas.clientHeight;
      piezas.forEach(function (p) {
        var m = M.mul(grupo, M.T(p.off[0] * e, p.off[1] * e, p.off[2] * e));
        L.dibujar(p.malla, m, materialPieza(p.tipo, op.acabado || 'natural'));
        if (p.el) {
          var c = M.mul(L.vp, m), x = p.c[0], y = p.c[1], z = p.c[2];
          var cx = c[0] * x + c[4] * y + c[8] * z + c[12], cy = c[1] * x + c[5] * y + c[9] * z + c[13], cw = c[3] * x + c[7] * y + c[11] * z + c[15];
          p.el.style.transform = 'translate(' + ((cx / cw * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((1 - (cy / cw * 0.5 + 0.5)) * h).toFixed(1) + 'px) translate(-50%, -50%)';
          p.el.style.opacity = String(lim((e - 0.55) / 0.3));
        }
      });
      if (op.alCambiar) op.alCambiar(e);
    }
    if ('ResizeObserver' in global) new ResizeObserver(medir).observe(canvas);
    medir();
    return { progreso: function (v) { prog = lim(v); if (!pendiente) { pendiente = true; global.requestAnimationFrame(dibujar); } } };
  }

  /* Ilustración fija de un aparador (para el antes y después): devuelve una imagen PNG */
  function foto(op) {
    op = op || {};
    var c = document.createElement('canvas'); c.width = op.ancho || 1000; c.height = op.alto || 750;
    var L = Lienzo(c);
    if (!L) return null;
    var gl = L.gl;
    gl.viewport(0, 0, c.width, c.height);
    L.dist = 6.2; L.alto = 0.05;
    L.vp = M.mul(M.P(30 * Math.PI / 180, c.width / c.height, 0.1, 60), M.T(0, -L.alto, -L.dist));
    L.luz = op.luz || 1;
    var piezas = piezasAparador(op.anchoCm || 140), grupo = M.serie(M.RX(0.2), M.RY(op.giro == null ? -0.5 : op.giro));
    L.limpiar();
    piezas.forEach(function (p, k) {
      var m = grupo;
      if (op.puertaAbierta && p.tipo === 'puerta' && p.izq && p.c[0] === Math.min.apply(null, piezas.filter(function (q) { return q.tipo === 'puerta'; }).map(function (q) { return q.c[0]; }))) {
        var z = p.b[5];
        m = M.mul(grupo, M.serie(M.T(p.bisagra, 0, z), M.RY(-0.5), M.RZ(0.035), M.T(-p.bisagra, 0, -z)));
      }
      L.dibujar(L.malla(p.geo), m, materialPieza(p.tipo, op.acabado || 'natural'));
    });
    var url = c.toDataURL('image/png');
    var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext();
    return url;
  }

  global.Domus3D = {
    reducir: reducir, logo: logo, aparador: aparador, despiece: despiece, foto: foto, ACABADOS: ACABADOS,
    Lienzo: Lienzo, bucle: bucle, control: control, material: material, solido: solido, M: M,
    geo: { Geo: Geo, caja: caja, extruir: extruir, muestrear: muestrear }
  };
})(window);
