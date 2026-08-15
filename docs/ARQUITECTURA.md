# Arquitectura de RutaLibre

> Lee esto **antes de modificar código**. Si solo vas a desplegar o tocar keys, ve a
> `OPERACIONES.md`. Si solo respondes preguntas, con `AGENTS.md` basta.

## Idea en una frase

Cruzamos una ruta de transporte público (Google) con el estado en vivo de los ascensores del Metro
(seguimos.cl) y, si la ruta pasa por una estación con el ascensor roto, buscamos otra ruta sola.

## Flujo completo de una búsqueda

```
Usuario escribe o dicta: "llévame de Plaza Chacabuco a Irarrázaval"
        │
        ▼
[asistente.js] Gemini → { origen, destino, necesidad }
        │        (siempre asume movilidad reducida; si no hay origen → GPS)
        ▼
[rutas.js] Google Routes API (modo TRANSIT) → hasta 3 rutas alternativas
        │        parsearRuta() arma: pasos del itinerario + geometría + estaciones
        ▼
[MapView.jsx] aplicarRutaAccesible()
        │        cruza las estaciones de la ruta contra los ascensores rotos
        │        ¿ruta principal limpia? → úsala
        │        ¿alguna alternativa limpia? → úsala y avisa "ruta ajustada"
        │        ¿ninguna? → reintenta solo con buses
        │        ¿tampoco? → muestra la original + alerta "pide asistencia"
        ▼
[MapView.jsx] dibujarRuta() → polilínea, marcadores 📍🚌🏁 e itinerario en el panel
```

## Los cuatro archivos de código

### `lib/dispositivos.js` (80 líneas)

Carga dos cosas en paralelo y las cruza:

1. `public/data/metro_dispositivos.geojson` — catálogo estático de ~950 ascensores y escaleras
   mecánicas (ID de equipo, estación, línea, coordenadas). Fuente: ariellopez.cl.
2. `https://velocidades.seguimos.cl/?metro=1&all=1` — estado en vivo por ID de equipo.

**El cruce es por el campo `properties.equipo` exacto** (calzan 946 de 949). Si "mejoras" esto,
lo rompes y todo aparece fuera de servicio. Si la API en vivo falla, los puntos quedan en gris
"sin información" y la app sigue funcionando.

Devuelve además dos mapas indexados por nombre de estación normalizado:
`estacionesMalas` (ascensores rotos, bloqueantes) y `escalerasMalas` (solo aviso).

`normalizarNombre()` existe porque Google y el Metro escriben distinto: quita acentos, mayúsculas
y puntuación para que "Chile-España" calce con "chile espana".

### `lib/rutas.js` (178 líneas)

Habla con Google Routes API v2 en modo TRANSIT. Puntos importantes:

- `comoWaypoint()` ancla las direcciones de texto a `", Santiago, Chile"`. **Sin esto**,
  "Irarrázaval" geocodificaba a un pasaje en Maipú y no aparecían rutas.
- `decodificarPolyline()` convierte la geometría comprimida de Google en coordenadas. Está escrito
  a mano (~20 líneas) para no sumar una dependencia.
- `parsearRuta()` arma el itinerario: número de micro, dirección del tren, paradas intermedias y
  el chip de ruta expresa. Las **rutas expresas** (Roja/Verde en hora punta) vienen dentro del
  `headsign` de Google como "(Ruta Roja)"; se extraen a un campo aparte y **se quitan antes de
  comparar direcciones**, o la comparación falla.
- Los tramos a pie se multiplican por `FACTOR_CAMINATA = 1.5`.

### `lib/asistente.js` (47 líneas)

Gemini (`gemini-3.1-flash-lite`) con `responseSchema` que **fuerza** la respuesta a JSON
`{origen, destino, necesidad}`. La instrucción del sistema le dice que el usuario **siempre**
tiene movilidad reducida y que nombre los lugares como "Metro \<nombre\>" cuando parezcan
estaciones (esto mejoró mucho la geocodificación).

### `MapView.jsx` (696 líneas) — índice para no leerlo entero

| Líneas | Función | Qué hace |
|---|---|---|
| 20–34 | `ubicacionActual`, `escapeHtml` | GPS con fallback a Campus San Joaquín; escape de HTML en popups |
| 142–230 | `agregarCapas` | Crea fuentes y capas del mapa. **Se llama al inicio y tras cada cambio de tema** |
| 231–243 | (efecto de tema) | `setStyle` borra las capas custom → hay que re-agregarlas |
| 248–274 | `cruzarEstaciones` | Compara estaciones de la ruta con equipos rotos y marca los casos dudosos |
| 275–304 | `crearMarker`, `escalarMarkers` | Marcadores 📍🚌🏁. El `scale` va en un hijo interno porque Mapbox usa `transform` en la raíz |
| 305–345 | `dibujarRuta` | Pinta la ruta, los marcadores y ajusta el encuadre |
| 347–369 | `buscar` | Orquesta: pide rutas y aplica la lógica de accesibilidad |
| 372–389 | `onBuscar`, `onAsistente` | Handlers de los formularios |
| 391–416 | `onMicrofono` | Dictado por voz (Web Speech API, solo Chrome) |
| 417–451 | `consultarAsistente` | Llama a Gemini. **El `setBuscando(false)` va en un `finally`** o el botón queda pegado en "Buscando…" |
| 454–489 | `onSimularFalla` | Botón demo: rompe un ascensor de la ruta actual y fuerza el recálculo |
| 493–524 | `aplicarRutaAccesible` | La cascada de accesibilidad descrita arriba |
| 526+ | JSX | Panel, itinerario timeline, alertas y leyendas |

## Estilos

`App.css` (588 líneas) define todo con **tokens de color** en `:root` y `[data-theme='claro']`.
Para cambiar colores, toca los tokens, no los valores sueltos. El tema por defecto es **claro** y
se guarda en `localStorage` bajo `rutalibre-tema`.

## Datos estáticos

- `metro_dispositivos.geojson` (253 KB): catálogo de ascensores. **Nunca lo abras completo.**
- `metro_lineas.geojson` (46 KB): trazados de las 7 líneas, extraídos de OpenStreetMap vía
  Overpass una sola vez. Si se inaugura una línea nueva, hay que regenerarlo.

## Cosas que parecen bugs y no lo son

- **"❓ podría no afectarte"**: cuando no podemos determinar si la falla está en el andén del
  usuario, avisamos igual. Es deliberado, ver `AGENTS.md` §3.
- **Estaciones con muchos puntos superpuestos**: 129 de 132 estaciones tienen todos sus equipos en
  la misma coordenada. Se resuelve con `circle-sort-key`, que dibuja los rojos encima de los verdes.
- **Las caminatas se ven más lentas que en Google Maps**: es el factor 1.5, a propósito.
