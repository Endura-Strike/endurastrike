// Banco de pruebas de la Cámara AI con golpes sintéticos (sin cámara ni MediaPipe).
// Uso:  node test-camara.js <ruta/index.html> [--three ruta/three.min.js] [--shot carpeta]
// Alimenta onPoseResults con poses generadas cuadro a cuadro (30 fps) y cuenta lo que detecta.
const { chromium } = require('playwright');
const path = require('path');

const args = process.argv.slice(2);
const html = path.resolve(args[0] || 'index.html');
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const threePath = opt('--three');
const shotDir = opt('--shot');

// Lo que debe pasar con cada caso. "min" acepta cualquier número mayor o igual.
const ESPERADO = {
  jab_recto: { golpes: 1, tipo: 'jab' },
  cross_recto: { golpes: 1, tipo: 'cross' },
  gancho: { golpes: 1, tipo: 'hook' },
  uppercut: { golpes: 1, tipo: 'uppercut' },
  jab_con_ruido: { golpes: 1, tipo: 'jab' },
  alcanzar_lento: { golpes: 0 },
  saludar: { golpes: 0 },
  solo_retraer: { golpes: 0 },
  respaldo_2d: { min: 1 }
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/^https?:/, (r) => {
    if (threePath && /three\.min\.js/.test(r.request().url())) return r.fulfill({ path: threePath, contentType: 'application/javascript' });
    return r.abort();
  });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('es_zero_v1', '1');
    localStorage.setItem('es7', JSON.stringify({ appOnb: true, _user: { name: 'Prueba' } }));
    let n = 0; const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl/.test(t)) window.__webgl = ++n; return gc.apply(this, arguments); };
  });
  if (process.env.DEBUG) { await p.addInitScript(() => { window.__DBG = 1; }); p.on('console', (m) => console.log('  ·', m.text())); }
  await p.goto('file://' + html);
  await p.waitForTimeout(2500);

  const res = await p.evaluate(() => {
    // Coordenadas como MediaPipe: metros, origen en la cadera, y hacia abajo, -z hacia la cámara.
    const G = { 0: [0, -0.62, -0.08], 11: [0.18, -0.48, 0], 12: [-0.18, -0.48, 0], 13: [0.2, -0.28, -0.12], 14: [-0.2, -0.28, -0.1],
      15: [0.1, -0.52, -0.2], 16: [-0.1, -0.52, -0.18], 23: [0.11, 0, 0], 24: [-0.11, 0, 0], 25: [0.13, 0.42, 0], 26: [-0.13, 0.42, 0], 27: [0.15, 0.85, 0], 28: [-0.15, 0.85, 0] };
    const espejo = (o) => { const r = {}; for (const k in o) { const m = { 13: 14, 15: 16, 14: 13, 16: 15 }[k]; r[m] = [-o[k][0], o[k][1], o[k][2]]; } return r; };
    const ESTIRA_L = { 13: [0.17, -0.47, -0.235], 15: [0.16, -0.46, -0.5] };      // jab recto hacia la cámara
    const LATERAL_L = { 13: [0.415, -0.47, 0], 15: [0.68, -0.47, 0] };          // brazo estirado hacia un lado (se ve en 2D)
    const S = G[11];
    const gancho = (th) => { const c = Math.cos(th), s = Math.sin(th); const E = [S[0] + 0.23 * c, S[1] + 0.02, S[2] - 0.23 * s]; return { 13: E, 15: [E[0] - 0.27 * s, E[1], E[2] - 0.27 * c] }; };
    const UPPER_INI = espejo({ 13: [0.22, -0.26, -0.08], 15: [0.28, -0.26, -0.34] });
    const UPPER_FIN = espejo({ 13: [0.22, -0.36, -0.2], 15: [0.16, -0.62, -0.23] });
    const SALUDO_E = { 14: [-0.3, -0.55, 0] };
    const mezcla = (a, b, k) => { const r = {}; const ks = new Set([...Object.keys(a), ...Object.keys(b)]); ks.forEach((i) => { const x = a[i] || G[i], y = b[i] || G[i]; r[i] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]; }); return r; };
    const tramo = (a, b, n) => Array.from({ length: n }, (_, i) => mezcla(a, b, (i + 1) / n));
    const quieto = (a, n) => Array.from({ length: n }, () => a);

    window.__dn = Date.now; window.__T = 1e12; Date.now = () => window.__T;
    let ruido = 0;
    function cuadro(over, con3D) {
      const P = Object.assign({}, G, over || {}), w = [], l = [];
      const at = (i) => P[i] || P[{ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 17: 15, 19: 15, 21: 15, 18: 16, 20: 16, 22: 16, 29: 27, 31: 27, 30: 28, 32: 28 }[i]];
      for (let i = 0; i < 33; i++) {
        const q = at(i).map((v) => v + (ruido ? (Math.random() * 2 - 1) * ruido : 0));
        w.push({ x: q[0], y: q[1], z: q[2], visibility: 0.99 });
        l.push({ x: 0.5 + q[0] * 0.7, y: 0.68 + q[1] * 0.7, z: q[2] * 0.7, visibility: 0.99 });
      }
      window.__T += 33;
      onPoseResults(con3D === false ? { poseLandmarks: l } : { poseLandmarks: l, poseWorldLandmarks: w });
    }
    function correr(cuadros, con3D) {
      resetCamStats(); camState.activa = true; camState.startTime = Date.now();
      quieto({}, 40).forEach((f) => cuadro(f, con3D));                 // guardia encuadrada 1,3 s
      const g0 = camState.golpes, t0 = Object.assign({}, camState.tipos);
      cuadros.forEach((f) => cuadro(f, con3D));
      quieto({}, 25).forEach((f) => cuadro(f, con3D));
      const tipos = {}; Object.keys(camState.tipos).forEach((k) => { const d = camState.tipos[k] - (t0[k] || 0); if (d) tipos[k] = d; });
      return { golpes: camState.golpes - g0, tipos };
    }
    const jab = (L) => [...tramo({}, L, 3), ...quieto(L, 4), ...tramo(L, {}, 6)];
    const casos = {
      jab_recto: () => correr(jab(ESTIRA_L)),
      cross_recto: () => correr(jab(espejo(ESTIRA_L))),
      gancho: () => { const a = gancho(0), z = gancho(80 * Math.PI / 180); return correr([...tramo({}, a, 10), ...Array.from({ length: 4 }, (_, i) => gancho((i + 1) / 4 * 80 * Math.PI / 180)), ...quieto(z, 3), ...tramo(z, {}, 10)]); },
      uppercut: () => correr([...tramo({}, UPPER_INI, 10), ...tramo(UPPER_INI, UPPER_FIN, 4), ...quieto(UPPER_FIN, 3), ...tramo(UPPER_FIN, {}, 10)]),
      jab_con_ruido: () => { ruido = 0.015; const r = correr(jab(ESTIRA_L)); ruido = 0; return r; },
      alcanzar_lento: () => correr([...tramo({}, ESTIRA_L, 30), ...quieto(ESTIRA_L, 10), ...tramo(ESTIRA_L, {}, 30)]),
      saludar: () => { const A = Object.assign({}, SALUDO_E, { 16: [-0.42, -0.85, 0] }), B = Object.assign({}, SALUDO_E, { 16: [-0.12, -0.85, 0] }); return correr([...tramo({}, A, 12), ...tramo(A, B, 6), ...tramo(B, A, 6), ...tramo(A, B, 6), ...tramo(B, A, 6), ...tramo(A, {}, 12)]); },
      solo_retraer: () => correr([...tramo({}, ESTIRA_L, 30), ...quieto(ESTIRA_L, 25), ...tramo(ESTIRA_L, {}, 3)]),
      respaldo_2d: () => correr([...tramo({}, LATERAL_L, 3), ...quieto(LATERAL_L, 4), ...tramo(LATERAL_L, {}, 6)], false)
    };
    if (window.__DBG) { const rg = registrarGolpe; window.registrarGolpe = function (side, now, tipo) { console.log('golpe', side, tipo, JSON.stringify(camState._p3 && camState._p3[side].dbg)); return rg.apply(this, arguments); }; }
    const out = {}; for (const k in casos) out[k] = casos[k]();
    return out;
  });

  let fallos = 0;
  console.log('caso'.padEnd(16), 'golpes', 'tipos', '  ok');
  for (const k in ESPERADO) {
    const e = ESPERADO[k], r = res[k];
    const ok = e.min != null ? r.golpes >= e.min : (r.golpes === e.golpes && (!e.tipo || r.tipos[e.tipo] === 1));
    if (!ok) fallos++;
    console.log(k.padEnd(16), String(r.golpes).padEnd(6), JSON.stringify(r.tipos).padEnd(20), ok ? 'sí' : 'NO');
  }

  // Holograma: abrir y cerrar tres veces no debe crear más de un contexto WebGL
  const holo = await p.evaluate(async () => {
    Date.now = window.__dn;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 3; i++) { abrirCam2(); await espera(300); cerrarCam2(); await espera(100); }
    abrirCam2(); await espera(1200);
    const h = document.getElementById('cam2-holo');
    return { webgl: window.__webgl || 0, canvas: !!(h && h.querySelector('canvas')), sin3D: !h || h.classList.contains('sin-3d') };
  });
  console.log('holograma', JSON.stringify(holo));
  if (threePath && (holo.webgl !== 1 || !holo.canvas)) fallos++;
  if (shotDir) await p.screenshot({ path: path.join(shotDir, 'camara.png') });
  errores.forEach((e) => console.log('ERROR', e));
  await b.close();
  process.exit(fallos || errores.length ? 1 : 0);
})();
