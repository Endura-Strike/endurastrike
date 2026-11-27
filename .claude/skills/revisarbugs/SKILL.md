---
name: revisarbugs
description: Revisa Endura Strike (index.html) en busca de errores y los corrige — recorre todas las pantallas y pestañas en un teléfono de 390×844, con movimiento normal y reducido, y prueba las funciones clave (técnica 3D, combos, quiz, cámara, ajustes, bienvenidas al abrir). Úsala cuando el usuario escriba /revisarbugs, pida "revisar bugs", "buscar errores", "ver si algo se rompió", o antes de publicar la web.
---

# Revisar bugs

Busca errores en toda la app, los corrige y deja constancia. No leas `index.html` entero (1,3 MB): busca con Grep lo que el reporte señale.

## 1. Preparar

- three.js: si la red bloquea cdnjs, `npm pack three@0.128.0` en una carpeta temporal y extrae `package/build/three.min.js`. Sin `--three` no se revisa el holograma.
- Playwright y Chromium ya vienen instalados en el entorno de la nube.

## 2. Correr la revisión

```bash
node .claude/skills/revisarbugs/scripts/revisar.js index.html --three ruta/three.min.js --capturas carpeta-temporal
```

Tarda 2–3 minutos. Sale con código 1 si encuentra algo. Revisa:

| Qué | Cómo lo detecta |
|---|---|
| Errores de JavaScript | errores de página y de consola en cada pantalla, pestaña y función (indica dónde) |
| Contenido que se sale del teléfono | elementos más anchos que la pantalla que no están dentro de una fila con desplazamiento lateral |
| Botones perdidos | botones sin texto ni ícono, o que miden 0 aunque tienen acción. Causa típica: su ícono era un emoji o un símbolo (📷, ↗) y la app borra los emojis sola |
| Ventanas apiladas al abrir | primera visita y visita diaria: nunca más de una bienvenida a la vez, ni otra detrás al cerrarla |
| Gráficos 3D de más | cuenta los contextos WebGL creados (máximo 2: holograma y Cronómetro) y dice dónde se creó cada uno |
| Funciones clave | técnica 3D (todos los modos, familias y tipos), los combos, el quiz, abrir/cerrar la cámara con guardia ortodoxa y zurda, el interruptor de animaciones |

Mira también las capturas de `--capturas` (una por pantalla y pestaña, normal y `red-` reducido) para lo que un script no ve: textos cortados, cosas encimadas, colores raros.

## 3. Corregir

- Un arreglo a la vez, con reemplazos exactos (script de Python con `assert s.count(viejo) == 1`).
- Botones con emoji o símbolo: cámbialo por un ícono SVG de línea (`stroke="currentColor"`) y deja `aria-label`.
- No tapes el síntoma: busca la causa (por ejemplo, por qué se apilan dos ventanas) y corrígela ahí.
- Si un hallazgo es intencional (una fila que se desplaza de lado), ajusta el script para que no lo vuelva a marcar y anótalo aquí abajo.

## 4. Confirmar

1. Vuelve a correr `revisar.js` hasta que diga `Total: 0 problemas`.
2. Corre también las pruebas de las otras skills:
   - `node .claude/skills/camara-endura/scripts/test-camara.js index.html --three ...` (detector de golpes; varias veces, un caso es aleatorio)
   - `node .claude/skills/holograma-endura/scripts/holo-capturas.js index.html --three ... --out carpeta` (holograma y rendimiento)
3. Para comprobar que el script detecta lo que arreglaste, córrelo sobre la versión anterior (`git show HEAD~1:index.html > /tmp/antes.html`): debe marcar el error que ya no aparece en la actual.
4. Commit con un mensaje que diga qué estaba mal y cómo se ve el arreglo; publica el artifact si el usuario lo usa.
5. Cuéntale al usuario, en español y sin tecnicismos: qué se revisó, qué estaba mal, qué se arregló y qué no se puede revisar desde aquí (la cámara real y el rendimiento en su teléfono necesitan la web publicada en `https`).

## Cosas que ya se sabe que están bien

- La fila de categorías de Videos se pasa del ancho a propósito: se desplaza de lado (`overflow-x: auto`).
- La Cámara AI no tiene enlace propio en el menú: se abre con `abrirCam2()` desde otros botones.

## Errores que ya se corrigieron (para no repetirlos)

- Dos bienvenidas apiladas al abrir: la diaria salía detrás de "bienvenido de nuevo" y de la presentación.
- Botón de cámara de cada combo y botón de compartir rutina invisibles: sus íconos eran 📷 y ↗, que la app borra.
- El Cronómetro creaba un lienzo WebGL solo para probar si había 3D: un contexto de más en el teléfono.
- Saludo de pantalla completa que, ya invisible, seguía tapando los toques 3 segundos.
