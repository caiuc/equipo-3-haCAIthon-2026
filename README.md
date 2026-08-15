# RutaLibre ♿🚇

Planificador de rutas accesibles para el transporte público de Santiago. Calcula rutas usando solo estaciones de Metro con ascensores **operativos ahora mismo**; si un ascensor está fuera de servicio, recalcula la ruta automáticamente evitando esa estación.

**HaCAithon 2026 · Equipo 3 · Temática: Transporte (accesibilidad)**

🔗 **Demo en vivo: <https://rutalibre-pi.vercel.app>**

## El problema

Las personas con movilidad reducida tardan en promedio 25 minutos más por viaje en Santiago (estudio PUC). Ninguna app de rutas integra el estado real de los ascensores del Metro: si el ascensor de tu estación de destino está malo, te enteras al llegar.

## Cómo funciona

1. El usuario pide una ruta en lenguaje natural, por texto o **por voz** 🎤: *"llévame de San Joaquín al Hospital Sótero del Río"*. La app asume siempre movilidad reducida — ese es su único público.
2. Gemini interpreta la intención y se calcula la ruta en transporte público (Google Maps Routes API, modo Transit). Si no se indica origen, se usa el GPS del dispositivo.
3. La ruta se cruza con el estado **en vivo** de los ~950 ascensores y escaleras mecánicas del Metro, considerando además la **dirección del andén** afectado.
4. Si hay un ascensor fuera de servicio en una estación donde hay que subir, bajar o hacer combinación, se recalcula automáticamente: primero rutas alternativas de Metro, y si no existen, ruta solo en micro. Escalera mecánica mala = aviso amarillo (no bloquea).

## Features

- 🗺️ Mapa Mapbox con las líneas de Metro (trazados reales de OpenStreetMap) y todos los dispositivos coloreados por estado en vivo: 🟢 operativo · 🔴 ascensor malo · 🟡 escalera mecánica en pana · ⚪ sin datos.
- 🧭 Itinerario paso a paso estilo timeline, con números de micro, dirección del tren, chips de ruta expresa (Roja/Verde en hora punta) y paradas intermedias.
- 🚶 Tiempos de caminata ajustados ×1.5 al ritmo real de una persona con movilidad reducida ("~N min a tu ritmo").
- 🎤 Entrada por voz con la Web Speech API del navegador (**sin API key**, integrada en Chrome).
- 🌗 Modo claro/oscuro persistente.
- 🧪 Botón de demo "simular falla de ascensor" para ver el recálculo automático en acción.

## Stack

- React + Vite (JS) · Mapbox GL JS · Google Maps Routes API (Transit) · Google Gemini · Web Speech API · deploy en Vercel

## Datos y servicios de terceros (declarados según bases §11)

- **Ubicación de ascensores/escaleras del Metro**: GeoJSON público de [ariellopez.cl](https://ariellopez.cl/metro/accesibilidad/) (`metro_dispositivos.geojson`, incluido en `frontend/public/data/`).
- **Estado en vivo de equipos**: API pública de [seguimos.cl](https://velocidades.seguimos.cl/?metro=1&all=1).
- **Trazados de líneas de Metro**: OpenStreetMap vía Overpass (`metro_lineas.geojson`, estático).
- **Ruteo**: Google Maps Platform (Routes API). **Mapa**: Mapbox GL JS. **IA**: Google Gemini.
- **Voz**: Web Speech API nativa del navegador (no es un servicio externo, no requiere key).
- Librerías npm listadas en `frontend/package.json`.

## Desarrollo

```bash
cd frontend
npm install
npm run dev
```

Requiere un archivo `frontend/.env.local` con las API keys (no versionado, valores propios de cada quien):

```
VITE_MAPBOX_TOKEN=...    # token público de Mapbox (mapbox.com)
VITE_GOOGLE_MAPS_KEY=... # key de Google Maps Platform con Routes API habilitada
VITE_GEMINI_KEY=...      # key de Google AI Studio (aistudio.google.com)
```

El reconocimiento de voz (speech-to-text) **no necesita key**: usa la Web Speech API incluida en Chrome.

## Deploy

Producción en Vercel (root directory `frontend`, mismas tres variables de entorno): <https://rutalibre-pi.vercel.app>

## Documentación

- [`AGENTS.md`](AGENTS.md) — contexto, reglas y trampas del proyecto. Punto de entrada para
  cualquier agente de IA y para quien retome el desarrollo.
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — cómo funciona el código por dentro.
- [`docs/OPERACIONES.md`](docs/OPERACIONES.md) — API keys, variables de entorno y deploy.

## Licencia

MIT — ver [LICENSE](LICENSE).
