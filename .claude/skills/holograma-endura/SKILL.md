---
name: holograma-endura
description: Mejorar cómo se ve y cómo se mueve el holograma 3D de la Cámara AI de Endura Strike (three.js r128 en index.html) — figura, brillo, efectos de golpe, piso, partículas, cámara, colores — midiendo antes y después con capturas y números de rendimiento. Úsala cuando el usuario pida un holograma más bonito, más realista, más fluido o con nuevos efectos. Para el conteo de golpes usa la skill camara-endura.
---

# Holograma Endura

El holograma vive en el bloque `<script id="cam27">` de `index.html`, dentro de `crear()`, y su CSS en `<style id="cam27css">` (`.cam2-holo`). Busca con Grep `HOLO`, `function crear`, `sombraDemo`, `cuadro()`. No leas el archivo entero (1,3 MB).

## Cómo está hecho

- **Un solo `THREE.WebGLRenderer`** para toda la visita (`HOLO.r`). `abrirCam2` lo crea la primera vez o lo reanuda; `cerrarCam2` pone `HOLO.on = false` y el bucle se detiene. Nunca crees otro renderizador ni otra escena: el Cronómetro ya usa un contexto y los teléfonos tienen pocos.
- **three.js carga con `defer`**: crea todo dentro de `crear()`, nunca al nivel superior del script.
- **Material holográfico**: `mat(color, k, l)`; `l` = luz suave desde arriba que marca el relieve (pecho, abdominales). Las normales van con `normalMatrix`, porque las piezas se escalan distinto en cada eje. Un `ShaderMaterial` (`VS`/`FS` en `crear()`) con borde brillante (fresnel), líneas de escaneo y parpadeo, mezcla aditiva y `depthWrite:false`. El uniform `t` (tiempo) es un solo objeto compartido por todos los materiales.
- **Cuerpo**: brazos, piernas y torso son `LatheGeometry` con perfil de músculo (`FORMAS`), escalados y orientados por `hueso(m, a, b, radio)`; el tronco es una sola malla esculpida (`tronco()`: espalda en V, pectorales, esternón, abdominales, columna, omóplatos; escala = ancho de hombros × largo del tronco × 1) y sigue la base del tronco. Short de boxeo rojo (`pelvis` con forma `cadera`, dos `pernera` y una `pretina` menta). Cabeza con forma (cráneo y mandíbula, `FORMAS.cabeza`) que gira con el tronco (hombros, columna; `ejeZ` apunta a la espalda, el frente es `-ejeZ`). Silueta musculosa: deltoides grandes, bíceps, pantorrillas. Guantes = grupo de puño, pulgar y muñequera orientado con el antebrazo. Estelas = cinta aditiva de 10 puntos por guante, visible solo con velocidad o golpe. `HUESOS` = [desde, hasta, grosor, forma].
- **Pose**: `HOLO.pose(worldLandmarks)` fija la meta. Cada cuadro `cuadro()` suaviza hacia la meta (k = 0,45). Sin pose real por 700 ms, `sombraDemo(t)` hace sombra (jab y cross alternados).
- **Escena**: piso con rejilla (textura de canvas), haz de proyector (cilindro abierto con shader), 90 partículas que suben, 4 ondas de impacto reutilizables (`HOLO.golpe(lado, potencia)`).
- **Espejo**: `aHolo` invierte x, y, z para que el holograma se vea como tu imagen en la cámara.

## Presupuesto (no lo superes)

| Medida | Ahora | Límite |
|---|---|---|
| Contextos WebGL al abrir/cerrar 4 veces | 1 | 1 |
| Llamadas de dibujo por cuadro | 32 (sin estela) | 45 |
| Triángulos | ~10.700 | 15.000 |
| Tiempo por cuadro (mediana, escritorio sin GPU) | 16,7 ms | 17 ms |
| `pixelRatio` | máx. 1,5 | 1,5 |

- El holograma compite con MediaPipe por la GPU del teléfono. Nada de posprocesado (bloom, `EffectComposer`), sombras ni luces dinámicas: el brillo se logra con el shader y la mezcla aditiva.
- Reutiliza geometrías y materiales. Nada de `new THREE.Vector3()`, `.clone()`, `querySelector` ni escrituras al DOM dentro de `cuadro()`.

## Cómo trabajar

1. **Mide antes.** Consigue three.js si la red bloquea cdnjs: `npm pack three@0.128.0` y extrae `package/build/three.min.js`.
   ```bash
   node .claude/skills/holograma-endura/scripts/holo-capturas.js index.html --three ruta/three.min.js --out capturas-antes
   ```
   Saca `1-demo`, `2-golpe`, `3-en-vivo`, `4-girado`, `5-reducido` e imprime las medidas. Sale con código 1 si hay más de un contexto WebGL, si con movimiento reducido algo se mueve solo, o si hay errores.
2. **Mira las capturas** antes de cambiar nada y decide qué mejorar mirando la imagen, no el código.
3. Cambia **una cosa a la vez** con reemplazos exactos (script de Python con `assert s.count(viejo) == 1`).
4. **Mide después** con `--out capturas-despues`, compara las imágenes lado a lado y revisa que las medidas sigan dentro del presupuesto.
5. Corre también `node .claude/skills/camara-endura/scripts/test-camara.js index.html --three ...` para confirmar que el detector sigue igual.
6. Muestra al usuario las capturas de antes y después.

## Reglas de diseño

- Cuerpo en menta `#63e6be`, juntas en menta claro `#9ff5dc`, guantes en rojo `#ff453a`, fondo negro. El blanco solo como destello del golpe.
- Sin emojis ni texto dentro del 3D. La etiqueta "Holograma · demo / en vivo" es HTML y solo se escribe cuando cambia.
- Respeta `prefers-reduced-motion` y la clase `sin-movimiento`: con cualquiera de los dos, la demo queda en guardia quieta, sin ondas, partículas ni giro. El holograma sí sigue a la persona si hay cámara.
- El contador de golpes debe verse sin desplazarse en un teléfono de 390×844: no hagas la caja del holograma más alta de ~240 px.
- Debe verse bien de frente y girado: revisa siempre `4-girado.png`.

## Ideas de mejora, de más a menos impacto

1. ~~Silueta más humana~~, ~~guantes con forma~~ y ~~estela del golpe~~: hechas.
4. **Color según el tipo de golpe**: jab menta, cross blanco, gancho ámbar, uppercut violeta. `HOLO.golpe` ya recibe el lado; pásale también el tipo desde `emitir()` en el detector.
5. **Holograma que se arma al abrir**: las líneas de escaneo suben de los pies a la cabeza en ~0,8 s (un uniform `aparece` en el shader que recorta por altura).
6. **Interferencia breve**: al recibir la primera pose real, 150 ms de desfase horizontal en el shader para marcar el paso de demo a en vivo.
7. **Sombra de suelo**: una mancha más brillante en el piso bajo cada pie, que sigue a los tobillos.

Antes de dar por buena cualquiera de estas mejoras, compara capturas de antes y después y vuelve a medir.
