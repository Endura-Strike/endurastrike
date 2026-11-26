// Capturas y medidas del holograma 3D de la Cámara AI, sin cámara ni MediaPipe.
// Uso: node holo-capturas.js <ruta/index.html> --three <ruta/three.min.js> [--out carpeta] [--ancho 390]
// Saca: demo en guardia, momento del golpe, pose "en vivo", vista girada y modo de movimiento reducido.
// Mide: contextos WebGL, llamadas de dibujo, triángulos y tiempo medio por cuadro.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const html = path.resolve(args[0] || 'index.html');
const three = opt('--three');
const out = path.resolve(opt('--out', 'capturas-holograma'));
const ancho = +opt('--ancho', 390);
if (!three) { console.error('Falta --three ruta/three.min.js (npm pack three@0.128.0)'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

// Pose de prueba "en vivo" (coordenadas de MediaPipe: metros, origen en la cadera, y hacia abajo)
const POSE = { 0: [0, -0.62, -0.08], 11: [0.18, -0.48, 0], 12: [-0.18, -0.48, 0], 13: [0.17, -0.47, -0.235], 14: [-0.2, -0.28, -0.1],
  15: [0.16, -0.46, -0.5], 16: [-0.1, -0.52, -0.18], 23: [0.11, 0, 0], 24: [-0.11, 0, 0], 25: [0.14, 0.42, -0.06], 26: [-0.12, 0.42, 0.04],
  27: [0.15, 0.86, -0.1], 28: [-0.14, 0.86, 0.08] };

async function abrir(b, reducir) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, reducedMotion: reducir ? 'reduce' : 'no-preference' });
  await ctx.route(/^https?:/, (r) => /three\.min\.js/.test(r.request().url()) ? r.fulfill({ path: three, contentType: 'application/javascript' }) : r.abort());
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('es_zero_v1', '1');
    localStorage.setItem('es7', JSON.stringify({ appOnb: true, _user: { name: 'Prueba' }, ultimaBienvenida: new Date().toDateString() }));
    let n = 0; const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl/.test(t)) window.__webgl = ++n; return gc.apply(this, arguments); };
  });
  await p.goto('file://' + html);
  await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('#welcome-modal,#es-bien,#app-onb').forEach((e) => e.remove()); abrirCam2(); });
  await p.waitForTimeout(800);
  return { ctx, p, errores };
}
const caja = (p) => p.locator('#cam2-holo');

(async () => {
  const b = await chromium.launch();
  const { ctx, p, errores } = await abrir(b, false);
  if (!(await p.evaluate(() => !!(window.HOLO && HOLO.r)))) { console.error('El holograma no arrancó (¿falta three.js o el bloque cam27?)'); process.exit(1); }

  await caja(p).screenshot({ path: path.join(out, '1-demo.png') });
  await p.evaluate(() => HOLO.golpe('left', 90));
  await p.waitForTimeout(120);
  await caja(p).screenshot({ path: path.join(out, '2-golpe.png') });

  // Pose en vivo: se alimenta varias veces para que el suavizado llegue
  await p.evaluate((P) => {
    const w = []; for (let i = 0; i < 33; i++) { const q = P[i] || P[0]; w.push({ x: q[0], y: q[1], z: q[2], visibility: 0.99 }); }
    window.__poseViva = setInterval(() => HOLO.pose(w), 33);
  }, POSE);
  await p.waitForTimeout(600);
  await caja(p).screenshot({ path: path.join(out, '3-en-vivo.png') });

  // Vista girada (arrastre con el dedo)
  const r = await caja(p).boundingBox();
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down();
  await p.mouse.move(r.x + r.width / 2 + 120, r.y + r.height / 2, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(150);
  await caja(p).screenshot({ path: path.join(out, '4-girado.png') });

  // Medidas: abrir y cerrar no debe sumar contextos; costo por cuadro
  const medidas = await p.evaluate(async () => {
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 3; i++) { cerrarCam2(); await espera(80); abrirCam2(); await espera(120); }
    const info = HOLO.r.info.render;
    const t = []; let ult = performance.now();
    await new Promise((res) => { let n = 0; (function f(now) { t.push(now - ult); ult = now; if (++n < 90) requestAnimationFrame(f); else res(); })(performance.now()); });
    t.sort((a, b) => a - b);
    return { contextosWebGL: window.__webgl || 0, llamadasDibujo: info.calls, triangulos: info.triangles, msPorCuadroMediana: +t[t.length >> 1].toFixed(1), msPorCuadroPeor: +t[t.length - 1].toFixed(1) };
  });
  await ctx.close();

  // Movimiento reducido: dos capturas separadas deben ser iguales (nada se mueve solo)
  const red = await abrir(b, true);
  const a1 = await caja(red.p).screenshot({ path: path.join(out, '5-reducido.png') });
  await red.p.waitForTimeout(1500);
  const a2 = await caja(red.p).screenshot();
  medidas.reducidoQuieto = Buffer.compare(a1, a2) === 0;
  errores.push(...red.errores);
  await red.ctx.close();

  console.log(JSON.stringify(medidas, null, 2));
  console.log('Capturas en', out);
  errores.forEach((e) => console.log('ERROR', e));
  await b.close();
  const mal = medidas.contextosWebGL !== 1 || !medidas.reducidoQuieto || errores.length;
  process.exit(mal ? 1 : 0);
})();
