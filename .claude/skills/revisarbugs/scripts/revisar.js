// Revisión de errores de Endura Strike: recorre toda la app en un teléfono de 390×844 y junta lo que está mal.
// Uso: node revisar.js <ruta/index.html> --three <ruta/three.min.js> [--capturas carpeta]
// Corre dos veces: con movimiento normal y con "reducir movimiento". Sale con código 1 si encuentra algo.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const html = path.resolve(args[0] || 'index.html');
const three = opt('--three');
const capturas = opt('--capturas');
if (capturas) fs.mkdirSync(capturas, { recursive: true });

const PAGINAS = ['hoy', 'boxing', 'progresion', 'chat-ia', 'cronometro', 'rutinas-g', 'encasa', 'videos', 'academia', 'recuperacion', 'settings'];
const VENTANAS = '#welcome-modal,#es-bien,#app-onb';
const USUARIO = { appOnb: true, _user: { name: 'Prueba' }, ultimaBienvenida: new Date().toDateString() };

async function contexto(b, reducir, datos) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: reducir ? 'reduce' : 'no-preference' });
  await c.route(/^https?:/, (r) => (three && /three\.min/.test(r.request().url()) ? r.fulfill({ path: three, contentType: 'application/javascript' }) : r.abort()));
  const p = await c.newPage();
  const errores = []; let donde = 'carga';
  p.on('pageerror', (e) => errores.push(`[${donde}] ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errores.push(`[${donde}] consola: ${m.text().slice(0, 200)}`); });
  await p.addInitScript(() => {                               // cuenta los contextos WebGL que se crean
    let n = 0; const gc = HTMLCanvasElement.prototype.getContext;
    window.__webglDonde = [];
    HTMLCanvasElement.prototype.getContext = function (t) {
      if (/webgl/.test(t) && !this.__es3d) {                  // un gráfico se cuenta una vez, y se anota dónde se creó
        this.__es3d = 1; window.__webgl = ++n;
        const pg = document.querySelector('.apg.active-page'), tab = pg && pg.querySelector('.tabs .tab.active');
        const pila = (new Error().stack || '').split('\n').slice(2).map((l) => l.trim().replace(/^at /, '').replace(/\(?file:\/\/\S+?:(\d+):\d+\)?/, 'línea $1')).filter((l) => !/three\.min|cdnjs/.test(l)).slice(0, 2).join(' ← ');
        window.__webglDonde.push((pg ? pg.id : '?') + (tab ? ' › ' + tab.textContent.trim() : '') + ' · ' + pila);
      }
      return gc.apply(this, arguments);
    };
  });
  if (datos !== null) await p.addInitScript((d) => { localStorage.setItem('es_zero_v1', '1'); localStorage.setItem('es7', JSON.stringify(d)); }, datos || USUARIO);
  await p.goto('file://' + html);
  await p.waitForTimeout(3500);
  return { c, p, errores, lugar: (x) => { donde = x; } };
}
const visibles = (p) => p.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => { const s = getComputedStyle(e); return !e.hidden && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.1; }).map((e) => e.id), VENTANAS);

/* Lo que se revisa en cada pantalla: desbordes reales (no filas que se desplazan de lado), botones sin texto ni ícono y botones que quedaron invisibles */
function revisarPantalla(id) {
  const sec = document.getElementById(id), W = document.documentElement.clientWidth, out = { desborde: [], vacios: [], ocultos: [] };
  if (document.documentElement.scrollWidth > W + 1) out.desborde.push('toda la página mide ' + document.documentElement.scrollWidth + 'px');
  const desplaza = (e) => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
  const nombre = (e) => (e.getAttribute('onclick') || (typeof e.className === 'string' && e.className) || e.id || e.tagName).toString().slice(0, 60);
  if (!sec) return out;
  sec.querySelectorAll('*').forEach((e) => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    if (e.offsetParent && r.right > W + 2 && s.position !== 'fixed' && !desplaza(e)) out.desborde.push(nombre(e) + ' llega a ' + Math.round(r.right) + 'px');
    if (!e.matches('button,[role=button],a[onclick]')) return;
    const padreVisible = e.parentElement && e.parentElement.offsetParent && e.parentElement.getBoundingClientRect().width > 0;
    const texto = (e.textContent || '').replace(/\s/g, ''), icono = e.querySelector('svg,img,canvas,i'), etiqueta = e.getAttribute('aria-label') || e.title;
    // sin texto, ícono ni etiqueta: aunque el estilo lo oculte, es un botón que se perdió (p. ej. su ícono era un emoji que la app borra)
    if (padreVisible && !texto && !icono && (!etiqueta || r.width === 0)) out.vacios.push(nombre(e) + (r.width === 0 ? ' (quedó invisible)' : ''));
    else if (padreVisible && (r.width === 0 || r.height === 0) && e.getAttribute('onclick') && s.display !== 'none') out.ocultos.push(nombre(e));
  });
  for (const k in out) out[k] = [...new Set(out[k])].slice(0, 8);
  return out;
}

async function recorrido(b, reducir) {
  const modo = reducir ? 'movimiento reducido' : 'movimiento normal';
  const { c, p, errores, lugar } = await contexto(b, reducir);
  const hallazgos = [];
  await p.evaluate((sel) => document.querySelectorAll(sel).forEach((e) => e.remove()), VENTANAS);
  for (const pg of PAGINAS) {
    lugar(pg);
    const hay = await p.evaluate((x) => { const l = document.querySelector('.nav-link[data-page="' + x + '"]'); if (!l) return false; irA(x); return true; }, pg);
    if (!hay) { hallazgos.push(`${pg}: no hay enlace en el menú`); continue; }
    await p.waitForTimeout(700);
    const tabs = await p.evaluate((x) => document.querySelectorAll('#' + x + ' .tabs .tab').length, pg);
    for (let i = 0; i < Math.max(1, tabs); i++) {
      let aqui = pg;
      if (tabs) { aqui = pg + ' › pestaña ' + (i + 1); lugar(aqui); await p.evaluate(([x, i]) => document.querySelectorAll('#' + x + ' .tabs .tab')[i].click(), [pg, i]); await p.waitForTimeout(450); }
      const r = await p.evaluate(revisarPantalla, pg);
      if (r.desborde.length) hallazgos.push(`${aqui}: se sale de la pantalla → ${r.desborde.join(' | ')}`);
      if (r.vacios.length) hallazgos.push(`${aqui}: botones sin texto ni ícono → ${r.vacios.join(' | ')}`);
      if (r.ocultos.length) hallazgos.push(`${aqui}: botones que quedaron invisibles (miden 0) → ${r.ocultos.join(' | ')}`);
      if (capturas) await p.screenshot({ path: path.join(capturas, `${reducir ? 'red-' : ''}${aqui.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-')}.png`) });
    }
  }
  // Funciones clave: cada una se salta sola si todavía no existe en la versión que se revisa
  const paso = async (nombre, fn, espera) => { lugar(nombre); try { await p.evaluate(fn); } catch (e) { hallazgos.push(`${nombre}: ${e.message.split('\n')[0]}`); } await p.waitForTimeout(espera || 300); };
  await paso('técnica 3D', async () => {
    if (typeof tecModo !== 'function') return; irA('boxing'); switchTab('boxing', 't-hub');
    for (const m of ['golpes', 'defensa', 'distancia']) { tecModo(m); for (const f of document.querySelectorAll('#tec3d-fam button')) { f.click(); for (const t of document.querySelectorAll('#tec3d-tipos button')) { t.click(); await new Promise((r) => setTimeout(r, 25)); } } }
    tecLento(); tecLento();
  }, 600);
  await paso('combos', async () => {
    if (typeof COMBOS === 'undefined') return; switchTab('boxing', 't-combos');
    for (const c of COMBOS) { verCombo(c.id, true); await new Promise((r) => setTimeout(r, 40)); }
    const b = document.querySelector('[onclick^="practicarCombo"]'); if (b) b.click();
  }, 500);
  await paso('quiz', async () => {
    if (typeof iniciarQuiz !== 'function') return; switchTab('boxing', 't-practica'); iniciarQuiz();
    for (let i = 0; i < 5; i++) { const b = document.querySelector('#quiz-container button:not(.day-cta)'); if (b) b.click(); await new Promise((r) => setTimeout(r, 1500)); }
  }, 300);
  await paso('cámara', async () => {
    if (typeof abrirCam2 !== 'function') return;
    for (let i = 0; i < 3; i++) { abrirCam2(); await new Promise((r) => setTimeout(r, 300)); if (window.camSetGuardia) camSetGuardia(i % 2 ? 'orto' : 'zurdo'); cerrarCam2(); await new Promise((r) => setTimeout(r, 150)); }
    if (window.camSetGuardia) camSetGuardia('orto');
  }, 300);
  await paso('ajustes', () => { irA('settings'); if (typeof alternarMovimiento === 'function') { alternarMovimiento(); alternarMovimiento(); } }, 400);
  const estado = await p.evaluate(() => ({ contextos3D: window.__webgl || 0, donde: window.__webglDonde || [], holograma: !!(window.HOLO && HOLO.r) }));
  await c.close();
  return { modo, hallazgos, errores: [...new Set(errores)], estado };
}

/* Al abrir la app: nunca más de una ventana de bienvenida a la vez */
async function bienvenidas(b) {
  const out = [];
  const casos = [
    ['primera visita', null, 'Saltar'],
    ['visita diaria', { appOnb: true, _user: { name: 'Ana' }, sesiones: [{ tipo: 'boxeo', golpes: 20, ts: Date.now() - 864e5, fecha: 'x', camara: true }], ultimaBienvenida: 'ayer' }, 'Continuar mi progreso']
  ];
  for (const [nombre, datos, boton] of casos) {
    const { c, p, errores } = await contexto(b, false, datos);
    const alAbrir = await visibles(p);
    if (alAbrir.length > 1) out.push(`${nombre}: se apilan ${alAbrir.length} ventanas al abrir (${alAbrir.join(', ')})`);
    try { await p.getByText(boton, { exact: true }).first().click({ timeout: 2000 }); await p.waitForTimeout(1200); } catch (e) {}
    const despues = await visibles(p);
    if (alAbrir.length && despues.length && despues.join() !== alAbrir.join() && nombre === 'visita diaria') out.push(`${nombre}: después de "${boton}" aparece otra ventana (${despues.join(', ')})`);
    if (capturas) await p.screenshot({ path: path.join(capturas, `al-abrir-${nombre.replace(/\s/g, '-')}.png`) });
    errores.forEach((e) => out.push(`${nombre}: ${e}`));
    await c.close();
  }
  return out;
}

(async () => {
  if (!three) console.log('Aviso: sin --three no se revisa el holograma (consigue three.js con: npm pack three@0.128.0)');
  const b = await chromium.launch();
  const vueltas = [await recorrido(b, false), await recorrido(b, true)];
  const abrir = await bienvenidas(b);
  await b.close();
  let total = 0;
  for (const v of vueltas) {
    console.log(`\n== ${v.modo} ==`);
    if (three && !v.estado.holograma) v.hallazgos.push('el holograma no arrancó');
    if (v.estado.contextos3D > 2) v.hallazgos.push(`se crearon ${v.estado.contextos3D} contextos 3D (máximo 2: el holograma y el del Cronómetro); los teléfonos tienen pocos. Dónde se crearon: ${v.estado.donde.join(' | ')}`);
    if (!v.hallazgos.length && !v.errores.length) console.log('Sin problemas.');
    v.hallazgos.forEach((h) => console.log(' • ' + h));
    v.errores.forEach((e) => console.log(' ✗ ERROR ' + e));
    total += v.hallazgos.length + v.errores.length;
  }
  console.log('\n== al abrir la app ==');
  if (!abrir.length) console.log('Sin problemas: una sola ventana de bienvenida.');
  abrir.forEach((h) => console.log(' • ' + h));
  total += abrir.length;
  console.log(`\nTotal: ${total} ${total === 1 ? 'problema' : 'problemas'}.` + (capturas ? ' Capturas en ' + path.resolve(capturas) : ''));
  process.exit(total ? 1 : 0);
})();
