# RutaLibre ♿🚇

Planificador de rutas accesibles para el transporte público de Santiago. Calcula rutas usando solo estaciones de Metro con ascensores **operativos ahora mismo**; si un ascensor está fuera de servicio, recalcula la ruta y ofrece alternativas para el tramo afectado.

**HaCAithon 2026 · Equipo 3 · Temática: Transporte (accesibilidad)**

## El problema

Las personas con movilidad reducida tardan en promedio 25 minutos más por viaje en Santiago (estudio PUC). Ninguna app de rutas integra el estado real de los ascensores del Metro: si el ascensor de tu estación de destino está malo, te enteras al llegar.

## Cómo funciona

1. El usuario pide una ruta en lenguaje natural (texto o voz): *"estoy en silla de ruedas, llévame de San Joaquín al Hospital Sótero del Río"*.
2. Gemini interpreta la intención y se calcula la ruta en transporte público (Google Maps Routes API, modo Transit).
3. La ruta se cruza con el estado **en vivo** de los ascensores de todas las estaciones involucradas.
4. Si hay un ascensor fuera de servicio en la ruta, se alerta y se recalcula evitando esa estación.

## Stack

- React + Vite · Mapbox GL JS · Google Maps Routes API (Transit) · Gemini API

## Datos y servicios de terceros (declarados según bases §11)

- **Ubicación de ascensores/escaleras del Metro**: GeoJSON público de [ariellopez.cl](https://ariellopez.cl/metro/accesibilidad/) (`metro_dispositivos.geojson`, incluido en `frontend/public/data/`).
- **Estado en vivo de equipos**: API pública de [seguimos.cl](https://velocidades.seguimos.cl/?metro=1&all=1).
- **Ruteo**: Google Maps Platform (Routes API). **Mapa**: Mapbox GL JS. **IA**: Google Gemini.
- Librerías npm listadas en `frontend/package.json`.

## Desarrollo

```bash
cd frontend
npm install
npm run dev
```

Requiere un archivo `frontend/.env.local` con las API keys (no versionado):

```
VITE_MAPBOX_TOKEN=...
VITE_GOOGLE_MAPS_KEY=...
VITE_GEMINI_KEY=...
```

## Licencia

MIT — ver [LICENSE](LICENSE).
