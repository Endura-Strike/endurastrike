---
name: tecnica-boxeo
description: Referencia de técnica de boxeo para Endura Strike — guardia, pasos, las tres distancias (larga, media y corta), todos los golpes y todas las defensas, qué defensa sirve contra qué golpe y qué contragolpe sigue. Úsala al escribir consejos, rutinas o combos en la app, al crear o corregir animaciones del holograma, al decidir qué debe detectar la Cámara AI, o cuando el usuario pregunte por técnica, distancia o nombres de golpes.
---

# Técnica de boxeo

Guía de referencia para que todo lo que la app enseña (textos, holograma, cámara, rutinas) diga lo mismo y esté bien.
Sale de manuales de entrenadores (AIBA/IBA, Boxing Australia, Boxing Canada, USA Boxing) y de guías de gimnasios; ver `referencias/fuentes.md`.

## Qué leer según la tarea

| Tarea | Lee |
|---|---|
| Nombres de golpes y defensas, o textos para la app | `referencias/glosario.md` |
| Distancia larga, media y corta: qué se hace en cada una, cómo entrar y salir | `referencias/distancias.md` |
| Cómo se tira cada golpe y sus errores | `referencias/golpes.md` |
| Cada defensa, contra qué golpe sirve y el contragolpe | `referencias/defensa.md` |
| Animar una técnica o ajustar la cámara | la sección "Pasar la técnica a la app" de abajo |

## Lo esencial en un minuto

- **Guardia**: pies algo más abiertos que los hombros, el de atrás atrasado y en diagonal; peso repartido, sobre la parte delantera de los pies; rodillas sueltas; mentón abajo; mano de adelante a la altura de la mejilla, la de atrás en la mandíbula; codos cerrados protegiendo las costillas. Ortodoxo = izquierda adelante; zurdo = al revés.
- **Pasos**: se mueve primero el pie que está del lado al que vas y el otro lo sigue la misma distancia (paso y arrastre). Los pies nunca se cruzan ni se juntan. Pasos cortos: un paso largo desarma la guardia y quita fuerza. Se termina siempre en la misma guardia en la que se empezó.
- **Tres distancias** (manual AIBA): **larga**, hay que dar un paso para alcanzar; **media**, alcanzas sin avanzar; **corta**, los guantes casi se tocan. Larga = rectos y pies; media = combinaciones y cruzados; corta = ganchos, cruzados cortos y trabajo al cuerpo.
- **Fuerza**: sale del suelo, la cadera y el giro del tronco; el brazo solo la entrega. Error más común en todos los golpes: lanzar solo con el brazo y bajar la otra mano.
- **Defensa**: cuatro maneras de no recibir un golpe: **pararlo** (bloqueo, atrape), **desviarlo** (parada), **que no llegue a la cabeza** (esquiva, agachada, pendular, hombro) o **no estar ahí** (pasos, pivote, salir en ángulo). En corta se suma controlar la cabeza y los brazos del rival (clinch). Toda defensa deja la otra mano arriba y prepara un contragolpe.

## Nombres que usa la app

En el mundo hispano los nombres cambian: en España "gancho" suele ser el golpe que sube y "crochet" el de lado; en Latinoamérica "gancho" suele ser el de lado. La app (pensada para Perú) usa:

- **Rectos**: jab (mano de adelante) y recto (mano de atrás, "cross" o "directo").
- **Cruzados**: el golpe de lado en arco (en inglés hook; en España crochet).
- **Ganchos**: el golpe que sube (en inglés uppercut).

Cada familia lo aclara en la app con el nombre en inglés. Si el usuario pide otros nombres, cámbialos en todos lados a la vez (holograma `TEC`/`FAMILIAS`, textos, detector) y actualiza `referencias/glosario.md`. El detector usa internamente `jab`, `cross`, `hook`, `uppercut`: esas claves no se cambian (el modo guiado y las sesiones guardadas las esperan).

## Pasar la técnica a la app

**Holograma** (`index.html`, bloque `cam27`; ver la skill `holograma-endura`). Cada técnica es una lista de fotogramas clave de `poseDe`:

| En el boxeo | Parámetro |
|---|---|
| Girar cadera y hombros (perfil ↔ de frente) | `r` (0,45 = guardia; más = hombro de adelante al frente) |
| Flexionar las rodillas, bajar | `d` (metros) |
| Inclinarse adelante / atrás | `f` (+ adelante, − atrás) |
| Inclinarse de lado (esquiva) | `l` (+ hacia su izquierda) |
| Pivotear el pie de atrás (recto, cruzado de atrás) | `piv` 0..1 |
| Paso: mover los pies / todo el cuerpo | `lx lz ly`, `rx rz ry` / `tx tz` |
| Pivote sobre el pie de adelante | `gp` |
| Subir el hombro de adelante | `hl` |
| Dónde va el puño y hacia dónde apunta el codo | `L`/`R` = [x, y, z respecto a la nariz, dirección del codo] |

Para animar bien: primero la pierna o la cadera, después el brazo; en el impacto, la otra mano en la cara; vuelta a guardia por el mismo camino. Cada golpe tiene su distancia: un golpe de corta no se dibuja con el brazo estirado.

**Cámara AI** (skill `camara-endura`). Hoy detecta jab, cross, gancho (hook), uppercut, golpes al cuerpo, esquivas, agachadas, bloqueo alto y guardia. No detecta parada, atrape, rodar el hombro, pasos ni clinch: son movimientos pequeños o necesitan ver al rival. Si se agregan, empieza por un caso sintético en `test-camara.js` que siga la mecánica de `referencias/`.

## Reglas para los textos de la app

- Un consejo = una idea, en una o dos frases, en español, con el nombre que usa la app y el inglés entre paréntesis solo la primera vez.
- Di qué hacer, no solo qué evitar: "gira la cadera" antes que "no lances solo con el brazo".
- Indica contra qué golpe sirve cada defensa y en qué distancia se usa cada golpe.
- Sin promesas de resultados ni consejos médicos. Ante dolor o lesión: parar y consultar a un profesional.
- Recomienda revisar la técnica con un entrenador: la app complementa, no reemplaza.

## Límites

Varias fuentes son blogs de gimnasios y no coinciden en detalles. Los manuales oficiales (AIBA/IBA) se citaron a través de búsquedas porque la red de este entorno no deja abrirlos directamente. Ante una duda de técnica o de nombres, manda lo que diga el entrenador del usuario: actualiza esta skill con eso.
