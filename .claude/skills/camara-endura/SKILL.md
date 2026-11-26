---
name: camara-endura
description: Mejorar, ajustar o probar la Cámara AI de Endura Strike (index.html): el detector de golpes (jab, cross, gancho, uppercut), sus umbrales, la guardia ortodoxa/zurda y el holograma 3D de three.js. Úsala cuando el usuario pida cambiar cómo se cuentan los golpes, reporte golpes que no se cuentan o que se cuentan de más, quiera tocar el holograma, o antes de publicar cambios en la cámara.
---

# Cámara Endura

Todo vive en `index.html` (un solo archivo de ~1,3 MB). No lo leas entero: busca con Grep `id="cam27"`, `CAM_UMBRAL`, `detectar3D`, `HOLO`.

## Cómo está armada

- **Bloque `<script id="cam27">`** (al final del `<body>`) y su CSS `<style id="cam27css">`. No modifica el código original de la cámara: lo envuelve.
- **Cadena de envoltorios de `onPoseResults`** (de afuera hacia adentro): `cam27` → silueta guía (`lg27js`) → original. `cam27` guarda `camState._world` (poseWorldLandmarks), `camState._lm2d` y `camState._ejes` antes de que corra lo demás. El envoltorio se instala al cargar, porque `camState.pose.onResults(onPoseResults)` se ata una sola vez al activar la cámara.
- **`window.detectPunch` se reemplaza por asignación** (nunca con una declaración `function detectPunch`, que se elevaría y rompería el respaldo). Con coordenadas 3D usa `detectar3D`; sin ellas, el detector 2D original.
- **La silueta manda**: si `camState._calidadOk === false` (persona mal encuadrada), el golpe se detecta pero no se cuenta.

## El detector 3D

- Unidades de MediaPipe world: metros, origen en la cadera. Los ejes del cuerpo (`arriba`, `lado`, `frente`) se calculan de la propia pose, así el signo de y/z de MediaPipe no importa.
- Por brazo: `ratio = |muñeca − hombro| / largo del brazo` (0,4 en guardia, ~1 estirado), velocidad de la muñeca respecto al hombro y ángulo del codo.
- Fases: `listo` → `recta` (jab/cross) o `curva` (gancho/uppercut) → `bloq` (espera a que el brazo vuelva).
  - Recto: `ratio` sube rápido, se cuenta al llegar a `pico` con el codo > `codoMin` y la mano no por encima de la cabeza.
  - Curva: velocidad alta con el codo doblado; al frenar se mira la dirección: sube → uppercut; de lado con el codo a la altura del hombro (o la muñeca baja, gancho al cuerpo) → gancho.
- **Al cuerpo**: si al contar la muñeca está más de `CAM_UMBRAL.cuerpo` bajo el hombro, se suma a `camState.alCuerpo` y aparece "Jab al cuerpo". No se agregan claves a `camState.tipos`: el modo guiado, `actualizarTiposUI` y las sesiones guardadas esperan exactamente jab, cross, hook y uppercut.

## Movimientos (esquiva, agachada, bloqueo, guardia)

`window.detectarDefensa` y `window.evaluarGuardia` se reemplazan por asignación; sin poses usan el código original.
- **Esquiva**: la cabeza se sale del centro sobre la línea de la cadera (horizontal, con la vertical de la cámara, no la del torso, que se inclina al esquivar), rápido. El centro se adapta despacio cuando estás quieto. No cuenta mientras un brazo está golpeando.
- **Agachada**: se mide en la imagen (2D), porque en 3D el origen es la cadera y bajar doblando las rodillas no se ve. Cuenta como esquiva y en `camState.agachadas`.
- **Bloqueo**: las dos muñecas a la altura de la nariz o más, juntas y pegadas a la cara, sostenidas `sostener` ms. La guardia normal (manos al mentón) no cuenta.
- **Guardia**: altura de cada mano respecto a la cara (80 %) y codos cerrados (20 %). La mano que golpea no se evalúa; si la otra está baja aparece "Cuida la cara con la otra mano". El DOM se escribe solo cuando cambia.
- Umbrales en `CAM_UMBRAL.esquiva`, `.agachada`, `.bloqueo`, `.guardia`. El recuadro `?debug=1` muestra `cabeza lado`, `baja`, `cubre` y `guardia`.
- **Todos los umbrales están en `window.CAM_UMBRAL`.** Ajusta ahí, nunca con números sueltos en el código.

## Convenciones

- Landmarks 15/16 son la muñeca **izquierda/derecha de la persona**, sin importar el espejo del video.
- Guardia: `localStorage.es_guardia` = `orto` (mano izquierda adelante = jab) o `zurdo`. Botones en la Cámara AI.
- El holograma muestra en espejo (como la cámara) y hace sombra solo ("demo") hasta que llega una pose real.

## Probar

```bash
node .claude/skills/camara-endura/scripts/test-camara.js index.html [--three ruta/three.min.js] [--shot carpeta]
```

- Alimenta `onPoseResults` con golpes sintéticos a 30 fps (no hace falta cámara ni modelos de MediaPipe).
- 22 casos. Golpes: jab, cross, gancho, uppercut, jab con ruido, jab y gancho al cuerpo, cross con giro de hombros. Movimientos: esquiva a cada lado, agachada (`dy2` baja el cuerpo solo en la imagen), bloqueo, guardia baja y "cuida la cara". Y los que deben dar 0: alcanzar lento, saludar, solo retraer, guardia quieta, inclinarse lento, bloqueo breve. Cada caso revisa también esquivas, bloqueos y golpes al cuerpo (0 si no se dice).
- Con `--three` también comprueba que abrir/cerrar la cámara varias veces usa **un solo** contexto WebGL. three.js se consigue con `npm pack three@0.128.0` si la red bloquea cdnjs.
- `DEBUG=1` imprime los valores de cada golpe contado.
- Sale con código 1 si algo falla. Corre la batería varias veces: el caso con ruido es aleatorio.

## Ajustar con golpes reales

1. El usuario abre la web con `?debug=1` (o `localStorage.es_cam_debug = '1'`) y activa la cámara.
2. Un recuadro muestra por brazo: `estira`, `vel` (m/s), `vEst` (velocidad del estiramiento), `codo` y la fase.
3. Pídele los valores en el pico de un golpe que no se contó o de un movimiento que se contó de más, y mueve el umbral que corresponda en `CAM_UMBRAL`.
4. Agrega ese movimiento como caso nuevo en `test-camara.js` antes de cambiar el umbral, y confirma que los demás casos siguen pasando.

## Reglas de diseño

- Sin emojis (la app los quita sola). Íconos de línea.
- Holograma en menta `#63e6be`, guantes en rojo `#ff453a`, fondo negro; acción principal en verde `#30d158` con letra negra.
- Respeta `prefers-reduced-motion` y la clase `sin-movimiento`: nada se anima solo.
- Un solo renderizador WebGL para el holograma durante toda la visita; se pausa al cerrar la cámara. El Cronómetro ya usa otro y los teléfonos limitan los contextos.
- El contador de golpes debe verse sin desplazarse en un teléfono de 390×844.

## Límites conocidos

- Dentro del enlace de Claude (artifact) la cámara probablemente no abre. Para probarla de verdad hay que publicar en un dominio `https` propio, por ejemplo GitHub Pages, con permiso del usuario.
- Los umbrales se calibraron con golpes sintéticos; con golpes reales pueden necesitar ajuste.
