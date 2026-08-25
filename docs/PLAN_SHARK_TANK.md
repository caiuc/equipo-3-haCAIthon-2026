# Plan Técnico — Pivot a Seguridad + IA (Shark Tank 27/08/2026)

> **Lee `AGENTS.md` §9 primero** para entender la dirección del producto.
> Este documento es el plan de ejecución técnica.

## 1. Resumen del producto

Una IA que te ayuda a moverte por Santiago de forma segura e inteligente. Te da la ruta más segura
(no solo la más corta) y te planifica salidas completas.

**Diferenciador clave**: el score de seguridad opera **a nivel de calle**, no de comuna. Sabe que
una avenida comercial iluminada es más segura que un pasaje oscuro a 200 metros — aunque estén en
la misma comuna. Esto no lo hace Google Maps.

## 2. Fuentes de datos confirmadas

### 2A. OpenStreetMap — datos a nivel de calle (CORE del score)

| Dato OSM | Tag | Qué aporta al score |
|---|---|---|
| Tipo de calle | `highway=primary/secondary/residential/footway/path` | Avenida > calle > pasaje > callejón |
| Iluminación | `lit=yes/no` en ways | Calle sin luz = más riesgo de noche |
| Zona comercial | `landuse=commercial/retail` | Más comercio = más gente = más seguro |
| Tiendas y locales | `shop=*`, `amenity=restaurant/cafe/pharmacy/bank` | Densidad de locales = "ojos en la calle" |
| Parques | `leisure=park` | Seguros de día, riesgosos de noche |

**Acceso**: Overpass API (`https://overpass-api.de/api/interpreter`), gratis, sin API key.

**Estrategia**: pre-fetchear UNA vez con un script → convertir a un **grid de seguridad** (celdas
de ~200m cubriendo Santiago) → guardar como JSON estático en `public/data/`. No se llama en runtime.

**Queries Overpass útiles** (para el script de preparación de datos):

```
# Zonas comerciales de Santiago
[out:json][timeout:120];
area["name"="Santiago"]["boundary"="administrative"]["admin_level"="4"]->.a;
(way["landuse"~"commercial|retail"](area.a););
out geom;

# Calles con iluminación
[out:json][timeout:120];
area["name"="Santiago"]["boundary"="administrative"]["admin_level"="4"]->.a;
(way["highway"]["lit"](area.a););
out geom;

# Amenities (tiendas, restaurantes, etc.)
[out:json][timeout:120];
area["name"="Santiago"]["boundary"="administrative"]["admin_level"="4"]->.a;
(node["shop"](area.a);node["amenity"~"restaurant|cafe|bar|pharmacy|bank|fuel"](area.a););
out;
```

### 2B. CEAD — delincuencia por comuna (modificador de base)

| Campo | Detalle |
|---|---|
| Granularidad | Por comuna, escala mensual |
| Cobertura | 30 tipos de delito, todas las comunas, 2010–2025 |
| Fuente procesada | `https://github.com/bastianolea/delincuencia_chile` → `datos/procesados/` (.parquet) |
| Cómo se usa | Se convierte a JSON, se normaliza por población, se genera un **score base por comuna** (0–1) que modifica el score de calle |

> **No es el core del producto**: todo el mundo sabe qué comunas son peligrosas. El valor está
> en el dato a nivel de calle (OSM). El CEAD solo ajusta el riesgo base.

### 2C. Polígonos de comunas — BCN

Para saber en qué comuna cae cada punto, se necesitan los polígonos de límites comunales.

| Campo | Detalle |
|---|---|
| Fuente | Biblioteca del Congreso Nacional: `https://www.bcn.cl/siit/mapas_vectoriales` |
| Formato | GeoJSON / Shapefile |
| Alternativa | Descargar de OSM con Overpass (relation con `admin_level=8` y `boundary=administrative`) |

### 2D. Google Routes API (ya integrada en `rutas.js`)

Se reutiliza tal cual. La ruta de Google se divide en tramos (steps con polyline), y a cada tramo
se le asigna un score de seguridad basado en las celdas del grid que atraviesa.

### 2E. Gemini AI (ya integrada en `asistente.js`)

Se expande el prompt para entender:
- Consultas de seguridad: `"¿Es seguro caminar desde Metro Baquedano a Ñuñoa de noche?"`
- Planificación de salidas: `"Quiero ir a un bar en Bellavista esta noche"`

Se extrae: `{origen, destino, hora, modo: "seguridad" | "plan", actividades?}`

## 3. Algoritmo del score de seguridad

### Grid de seguridad (pre-calculado)

Santiago se divide en celdas de ~200m × 200m. Para cada celda se pre-calcula:

```
densidadComercial  = count(shops + amenities en la celda) / area
iluminacion        = ratio(calles con lit=yes / total calles en celda)
tipoCalle          = max(highway rank de calles en la celda)  // primary > residential > footway
```

### Score por tramo de ruta (runtime)

```
scoreContexto   = f(densidadComercial, iluminacion, tipoCalle)  × 45 pts  ← CORE
scoreCrimen     = invertir(tasa_delitos_comuna)                 × 20 pts  ← base CEAD
scoreHora       = curva_hora(hora_actual)                       × 25 pts  ← dinámico
scoreTransporte = cercanía_a_metro_o_paradero                   × 10 pts
──────────────────────────────────────────────────────────────────────────
TOTAL                                                             0–100
```

**Curva de hora** (heurística):
- 07:00–19:00 → factor 1.0 (día, comercio abierto)
- 19:00–22:00 → factor 0.7 (atardecer, comercio cerrando)
- 22:00–01:00 → factor 0.4 (noche)
- 01:00–06:00 → factor 0.2 (madrugada)

**Recomendación "¿camino o pido auto?"**:
- Score promedio de ruta ≥ 60 → "Puedes caminar tranquilo"
- Score 40–59 → "Camina con precaución, preferible acompañado"
- Score < 40 → "Te recomendamos pedir un auto" (+ link afiliado futuro)

## 4. Arquitectura de archivos

### Archivos nuevos

```
frontend/
├── scripts/
│   └── preparar-datos-seguridad.js   ← Script Node que pre-fetchea OSM + CEAD → genera JSONs
├── public/data/
│   ├── grid_seguridad.json           ← Grid pre-calculado (celdas con scores de contexto)
│   ├── seguridad_comunas.json        ← Score base por comuna (del CEAD)
│   └── comunas_santiago.geojson      ← Polígonos de comunas (del BCN)
├── src/lib/
│   └── seguridad.js                  ← Módulo runtime (~100–120 líneas)
```

### Archivos modificados (cambios aditivos, no destructivos)

```
frontend/src/lib/asistente.js         ← Expandir prompt de Gemini
frontend/src/lib/rutas.js             ← Enriquecer tramos con score de seguridad
frontend/src/MapView.jsx              ← Agregar modo seguridad (capa de calor + rutas coloreadas)
frontend/src/App.css                  ← Estilos del badge y panel de seguridad
```

### Archivos que NO se tocan

```
frontend/src/lib/dispositivos.js      ← Funcionalidad de accesibilidad intacta
frontend/public/data/metro_*.geojson  ← Datos del Metro intactos
```

## 5. Estrategia de git

```bash
git tag v1.0-rutalibre -m "RutaLibre - 2° lugar HaCAIthon 2026"
git push origin v1.0-rutalibre
git checkout -b shark-tank
# Todo el desarrollo va en esta rama
```

## 6. Prevención de errores

| Riesgo | Prevención |
|---|---|
| Build roto | `npm run build` después de cada archivo tocado |
| Romper RutaLibre | Módulos nuevos son aditivos. MapView agrega modo, no cambia el existente |
| GeoJSON gigante llena contexto de IA | Los datos van en `public/data/`, el agente NUNCA los abre |
| Overpass API lenta | Se llama UNA vez en un script offline, no en runtime |
| API keys | No se agregan nuevas. Mismas keys de `.env.local` |
| Tokens de IA gastados en vano | Commits chicos, cambios verificables, no refactors innecesarios |

## 7. Cronograma

| Día | Fecha | Tarea |
|---|---|---|
| **1** | Jue 21 | Script `preparar-datos-seguridad.js`: fetch OSM + CEAD → JSONs estáticos |
| **2** | Vie 22 | Módulo `seguridad.js`: score por punto y por ruta |
| **3** | Sáb 23 | Integrar en MapView: mapa de calor + rutas coloreadas. Expandir `asistente.js` |
| **4** | Dom 24 | UI: badge de score, panel de recomendación, responsivo |
| **5** | Lun 25 | Testing, bugs, deploy preview en Vercel |
| **6** | Mar 26 | **No tocar código.** Practicar pitch |
| — | Mié 27 | **Shark Tank 13:30** |

### Estado de avance

- **Paso 1 — completado:** datos estáticos de seguridad generados.
- **Paso 2 — completado:** `seguridad.js` calcula scores por punto, tramo y ruta.
- **Paso 3 — completado:** score integrado en las búsquedas, rutas coloreadas por nivel, recomendación visible, mapa de calor activable y asistente que reconoce consultas de seguridad y planes; fue probado end-to-end en local. Los planes con paradas concretas se calculan como tramos consecutivos y se muestran como una ruta combinada.

## 8. Para el pitch vs roadmap

### ✅ Se construye (prototipo funcional)
1. Grid de seguridad pre-calculado con datos OSM reales
2. Score por comuna con datos CEAD reales
3. Mapa de calor de seguridad interactivo
4. Rutas coloreadas por nivel de seguridad
5. Recomendación "¿camino o pido auto?"
6. Asistente IA que entiende consultas de seguridad y planes

### 📋 Solo se menciona en el pitch (roadmap)
- Reportes comunitarios de incidentes
- Compartir ruta en vivo con contacto de confianza
- Alertas push por zona
- Datos a nivel de calle desde convenio con Carabineros
- App nativa iOS/Android
- Programa de afiliados Uber/Didi
- API B2B para municipalidades y aseguradoras
