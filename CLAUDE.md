# RutaLibre

Planificador de rutas accesibles para Santiago, enfocado en personas con movilidad reducida.
Cruza rutas de transporte público con el estado **en vivo** de los ascensores del Metro.

**Estado: proyecto terminado y desplegado. 🥈 2° lugar en HaCAithon 2026 (14-08-2026).**
Producción: <https://rutalibre-pi.vercel.app> · Deploy manual por CLI (`npx vercel --prod --yes`
desde `frontend/`); el repo **no** está conectado a auto-deploy de GitHub.

## Cómo funciona (todo implementado)

1. **Mapa** Mapbox pantalla completa con líneas de Metro (trazados de OSM) y ~950 dispositivos
   coloreados por estado en vivo: verde operativo · rojo ascensor malo · amarillo escalera en
   pana · gris sin datos.
2. **Ruta** vía Google Routes API (modo TRANSIT), con itinerario timeline paso a paso: micros
   con número, dirección del tren, chips de ruta expresa (Roja/Verde), paradas intermedias.
3. **Cruce de accesibilidad** contra el estado en vivo, considerando la dirección del andén.
4. **Asistente Gemini**: lenguaje natural (texto o voz) → JSON `{origen, destino, necesidad}`.
   Sin origen → Geolocation API, fallback Campus San Joaquín UC.
5. **Botón demo** "simular falla de ascensor" para mostrar el recálculo en vivo.

## Decisiones clave (no rehacer ni re-discutir)

- La app asume **siempre** movilidad reducida — es su único público. No hay selector de perfil.
- El recálculo es **automático**, sin botón: cascada principal → alternativas de Metro → solo bus.
- Ascensor malo = rojo, bloqueante. Escalera mecánica mala = amarillo, solo aviso, no recalcula.
- Cruce direccional de andenes: **nunca** des-alertar automáticamente. Los headsigns de Google no
  calzan con los terminales de Metro (ej. "Plaza Egaña" vs "Fernando Castillo Velasco"), así que
  cuando hay duda se marca "❓ podría no afectarte" en vez de ocultar la alerta.
- Caminatas ×1.5 (`FACTOR_CAMINATA` en `rutas.js`): 0.9 m/s en vez de los 1.4 m/s de Google.
- Waypoints de texto se anclan a ", Santiago, Chile" (sin eso, "Irarrázaval" caía en Maipú).
- Gemini: modelo `gemini-3.1-flash-lite` (`flash-latest` daba 503s); `responseSchema` fuerza el JSON.
- Tema **claro** por defecto, persistido en localStorage `rutalibre-tema`. Al cambiar el estilo de
  Mapbox hay que volver a agregar todas las capas (`agregarCapas`) — `setStyle` las borra.

## Archivos

- `frontend/src/MapView.jsx` — componente principal, toda la UI y la lógica de mapa.
- `frontend/src/lib/dispositivos.js` — carga GeoJSON + estado en vivo, cruce por ID `equipo`.
- `frontend/src/lib/rutas.js` — Google Routes API, parseo de itinerario, decoder de polyline.
- `frontend/src/lib/asistente.js` — Gemini.
- `frontend/public/data/` — `metro_dispositivos.geojson` (catálogo, de ariellopez.cl) y
  `metro_lineas.geojson` (trazados, de OSM/Overpass, estático).

## Datos y APIs

- **Catálogo de ascensores**: `metro_dispositivos.geojson` (ID equipo, estación, línea, lat/lon).
- **Estado en vivo**: `GET https://velocidades.seguimos.cl/?metro=1&all=1`. CORS abierto. El cruce
  con el GeoJSON es por el campo `equipo` **exacto** (946 de 949 calzan). Proyecto cívico que
  republica el dato público de Metro; sin convenio formal — para producción real haría falta uno.
- **Keys** en `frontend/.env.local` (gitignoreado): `VITE_MAPBOX_TOKEN`, `VITE_GOOGLE_MAPS_KEY`
  (Maps Demo Key gratuita, cuota diaria), `VITE_GEMINI_KEY`. Al ser `VITE_*` quedan visibles en el
  bundle; si el proyecto sigue en serio, mover Gemini a una serverless function y rotar las keys.
- Voz y GPS usan APIs nativas del navegador (Web Speech, Geolocation): sin key.

## Archivos fuera del repo (intencional)

- `docs/ESTUDIO.md` — material de estudio interno del equipo, **no subir**. Protegido por el
  `.gitignore` de la raíz.
- `frontend/.env.local` — las keys.

## Dirección futura (exploratoria, aún no decidida)

El equipo evalúa presentar una versión de esto a un **Shark Tank**, donde se necesita un ángulo
comercial. La idea en discusión es sumarle al mapa otros atributos con atractivo de mercado, sin
que esté definido cuáles. Nada de esto está implementado ni diseñado: antes de escribir código
hay que conversar el alcance con el equipo.

## Reglas de trabajo

- React + Vite (JS, sin TypeScript), CSS plano con tokens de tema, todo dentro de `frontend/`.
- Estética: panel flotante glassmorphism sobre el mapa.
- Commits pequeños y frecuentes, push seguido. Ojo: el repo es compartido, puede haber commits de
  compañeros — usar `git pull --rebase` antes de pushear.
- Validar inputs, no exponer stack traces al usuario.
- Respuestas breves, sin refactors no pedidos, no leer archivos grandes enteros.
- Idioma: español.
