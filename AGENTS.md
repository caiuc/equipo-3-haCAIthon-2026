# AGENTS.md — Instrucciones para agentes de IA

> Este archivo es el punto de entrada para cualquier agente (Claude Code, opencode, Antigravity,
> Cursor…). **Léelo completo antes de tocar nada.** Es corto a propósito. Los detalles están en
> `docs/`, y solo debes abrirlos cuando la tarea lo requiera (ver "Cuándo leer qué").

## 1. Qué es esto

**Ojo al Paso (antes RutaLibre)**: aplicación de navegación urbana de Santiago con foco en seguridad
y planificación con IA. Mantiene el planificador de transporte para personas con movilidad reducida,
cruza la ruta con el estado **en vivo** de los ascensores del Metro y, si hay uno roto, recalcula
automáticamente evitando esa estación.

- Estado: **terminado y funcionando**. 🥈 2° lugar en HaCAithon 2026 (14-08-2026).
- Producción: <https://rutalibre-pi.vercel.app>
- Stack: React 19 + Vite 8 (JavaScript, **sin TypeScript**), CSS plano. Todo vive en `frontend/`.
- Idioma del proyecto: **español** (código, comentarios, commits, UI y respuestas al usuario).

## 2. Reglas duras (romper esto arruina el proyecto)

1. **NUNCA subir secretos.** `frontend/.env.local` contiene las API keys y está gitignoreado.
   No lo copies, no lo pegues en un commit, no imprimas su contenido en un resumen.
2. **NUNCA subir `docs/ESTUDIO.md`.** Es material interno del equipo, protegido por `.gitignore`.
3. **No hagas refactors, reescrituras ni "mejoras" que nadie pidió.** Este código ya funciona y
   fue premiado. Cambia solo lo que se te pide.
4. **No despliegues salvo que te lo pidan explícitamente.** Ver `docs/OPERACIONES.md`.
5. **No leas archivos grandes completos** sin necesidad (ver tabla en §4). Llenan tu contexto y te
   hacen alucinar. Usa búsqueda por patrón y lee solo el fragmento que necesitas.
6. **Verifica en el navegador, no solo en la terminal.** Que `curl` devuelva 200 no significa que
   la app funcione. Esta lección costó un sitio roto en producción (ver §7).

## 3. Decisiones de producto ya tomadas (no las re-discutas ni las "corrijas")

- La app **asume siempre movilidad reducida**. No hay selector de perfil ni modo "normal": una
  persona sin esa necesidad usaría Google Maps. Si ves código que da esto por sentado, es correcto.
- El recálculo de ruta es **automático**, sin botón. Cascada: ruta principal → alternativas de
  Metro → solo micro (bus).
- **Ascensor roto = rojo y bloqueante. Escalera mecánica rota = amarillo y solo aviso** (el
  ascensor sigue sirviendo, así que la ruta no se recalcula).
- Cuando no se puede saber si la falla afecta al usuario (por el sentido del andén), se muestra
  **"❓ podría no afectarte"**. Esto **no es un bug**: los nombres de destino de Google no calzan
  con los terminales del Metro, y preferimos avisar de más que dejar a alguien atrapado.
- Los tiempos de caminata se multiplican por **1.5** (`FACTOR_CAMINATA` en `rutas.js`): Google
  asume 1.4 m/s y nuestro usuario va a ~0.9 m/s.
- Las consultas IA en modo `seguridad` usan `WALK`: primero piden la ruta base y sus alternativas
  a Google, luego generan hasta dos consultas independientes con `intermediates` ubicados en
  celdas de mejor score. La aplicación puntúa y compara todas las candidatas, pero esto es una
  heurística por grid: Google sigue calculando las calles de conexión y no existe garantía de que
  cada calle sea la más segura.
- Una caminata de más de **90 minutos** se marca como no razonable y recomienda pedir auto. El score
  urbano se conserva separado de esa decisión de transporte.
- Para rutas seguras, la selección prioriza una candidata con al menos **8 puntos** extra de score
  si el desvío no supera **10 minutos**; si no, conserva la más rápida.

## 4. Mapa de archivos y cuánto ocupan

| Archivo | Líneas | Qué es | Cómo leerlo |
|---|---|---|---|
| `frontend/src/MapView.jsx` | ~1204 | Componente principal: mapa, panel, toda la UI y la lógica | **No lo leas entero.** Busca por patrón la función que necesitas |
| `frontend/src/lib/rutas.js` | ~321 | Google Routes API, candidatos peatonales, parseo y decoder de polilínea | Se puede leer completo |
| `frontend/src/lib/seguridad.js` | ~409 | Score por punto/ruta, corredores seguros y recomendación de transporte | Se puede leer completo |
| `frontend/src/lib/dispositivos.js` | 80 | Carga ascensores + estado en vivo y los cruza | Se puede leer completo |
| `frontend/src/lib/asistente.js` | 47 | Gemini: texto → `{origen, destino, necesidad}` | Se puede leer completo |
| `frontend/src/App.css` | ~880 | Todos los estilos, con tokens de tema claro/oscuro | Busca por selector |
| `frontend/scripts/validar-seguridad.js` | 69 | Validación local del score, candidatos y umbral de caminata | Se puede leer completo |
| `frontend/public/data/*` | — | Datos estáticos de seguridad y Metro | **Nunca los abras.** Son datos, no código |

## 5. Comandos

```bash
cd frontend
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # DEBE pasar antes de dar por terminado cualquier cambio
npm run lint     # oxlint
npm run validar-seguridad # validación local de seguridad y selección
```

## 6. Cuándo leer qué (para no malgastar contexto)

- **Vas a tocar código de la app** → lee `docs/ARQUITECTURA.md` (flujo de datos y cómo encaja todo).
- **Vas a implementar features del pivot (seguridad, IA, Shark Tank)** → lee `docs/PLAN_SHARK_TANK.md`.
  Tiene toda la investigación de datos, algoritmo, arquitectura y cronograma.
- **Vas a desplegar, tocar API keys o variables de entorno** → lee `docs/OPERACIONES.md`.
  Contiene trampas que ya rompieron el sitio una vez.
- **Vas a configurar Codex, MCP, GitHub, navegador o permisos** → lee `docs/ENTORNO_CODEX.md`.
  Conserva el estado verificado y el orden acordado para separar RutaLibre de Ojo al Paso.
- **Solo respondes preguntas sobre el proyecto** → con este archivo basta.

## 7. Trampas conocidas (ya nos costaron caro)

- **BOM en variables de entorno**: cargar variables en Vercel con `echo "valor" | vercel env add`
  desde PowerShell inserta un carácter invisible (U+FEFF) que invalida la key. El síntoma engaña:
  el navegador reporta un **error de CORS** que en realidad es un token malformado. Usa
  `printf '%s' 'valor' | npx vercel env add NOMBRE production` desde Bash.
- **Las variables `VITE_*` se compilan dentro del JavaScript**: cambiarlas en Vercel no afecta al
  sitio publicado hasta que se hace un nuevo build. Y quedan **visibles para cualquier visitante**.
- **El CLI de Vercel se cuelga** en "Building…" en esta máquina (causa sin diagnosticar). Si pasa,
  no reintentes a ciegas: usa el botón **Redeploy** del dashboard de Vercel.
- **Cambiar el estilo del mapa borra las capas**: después de `map.setStyle()` hay que volver a
  llamar a `agregarCapas(map)` dentro de `map.once('style.load', …)`.
- **El cruce de ascensores es por el campo `equipo` exacto** (946 de 949 calzan). Si "arreglas" la
  normalización de nombres, se rompe y todas las estaciones aparecen fuera de servicio.
- **Modelo de Gemini**: usa `gemini-3.1-flash-lite`. Los `gemini-2.5-*` están cerrados a cuentas
  nuevas y el alias `gemini-flash-latest` daba errores 503.
- **Google Routes no optimiza por nuestro score**: `computeAlternativeRoutes` puede devolver solo
  la ruta base y no combina alternativas con waypoints. Los corredores seguros se calculan con
  solicitudes separadas; no afirmes que el resultado es óptimo calle por calle.

## 8. Antes de decir "listo"

1. `npm run build` pasa sin errores.
2. Abriste `npm run dev` en el navegador y **viste** el cambio funcionando.
3. Si tocaste algo de rutas o accesibilidad, probaste una búsqueda real de extremo a extremo.
4. No agregaste secretos al repositorio (`git status` antes de `git commit`).
5. Commit pequeño, mensaje en español y descriptivo.
6. `git pull --rebase` antes de `git push` — el repositorio es compartido con el equipo.

## 9. Shark Tank — Pivot comercial (DECIDIDO, agosto 2026)

### Contexto

El equipo participa en el **CAi Shark Tank** (jueves 27 de agosto de 2026, 13:30–15:00, Campus San
Joaquín UC). Pitch de 3 minutos, sin apoyo audiovisual. Premios: $500K / $300K / $200K CLP.

### Dirección del producto

Se pivotea de RutaLibre (planificador de accesibilidad) a una **app de navegación urbana con foco
en seguridad + planificación inteligente con IA**. Nombre de trabajo pendiente (candidatos:
RutaSegura, CiudadIA, etc.).

**Concepto en una frase**: una IA que te ayuda a moverte por Santiago de forma segura e inteligente
— te da la ruta más segura (no solo la más corta) y te planifica salidas completas.

### Features definidos (por orden de prioridad)

1. **Ruta segura**: ruteo A→B priorizando seguridad sobre velocidad. Score de seguridad por tramo
   basado en datos de delincuencia, hora del día, iluminación, densidad comercial.
2. **"¿Camino o pido auto?"**: la app recomienda si vale la pena caminar o pedir Uber/Didi. Si
   recomienda auto → link de afiliado (revenue).
3. **Planificador de salidas con IA**: "Quiero ir a un bar en Bellavista esta noche" → la IA
   sugiere plan + ruta segura entre paradas. Es la feature que da retención diaria.
4. **Compartir ruta en vivo**: que un contacto te siga mientras caminas (como compartir viaje de
   Uber, pero para peatones).
5. **Mapa de calor de seguridad**: visualización de qué tan seguro es cada sector por hora del día.
6. **Alertas de zona**: push notifications si hay incidentes reportados cerca.

### Revenue model

- **Afiliados Uber/Didi**: comisión por cada "mejor pide auto".
- **Premium** ($2–3K CLP/mes): tracking en vivo, alertas personalizadas, historial.
- **B2B municipalidades**: datos de cuáles calles necesitan más iluminación/patrullaje.
- **B2B seguros**: integración con pólizas de seguridad personal.

### Fuentes de datos para seguridad

- **CEAD** (Centro de Estudios y Análisis del Delito): estadísticas por comuna/sector.
- **datos.gob.cl**: datasets de denuncias georreferenciadas.
- **OpenStreetMap**: calles, iluminación, zonas comerciales.
- **Google Routes API** (ya integrada): info de calles, paraderos, peatonalidad.
- **Comunidad** (futuro): reportes de usuarios sobre incidentes.

### Heurísticas del score de seguridad por tramo

- Calle comercial (más gente, más luz) → más segura.
- Hora del día → modifica el score (noche = más riesgo).
- Densidad de transporte público cercano → más tránsito de personas → más seguro.
- Datos de delincuencia por sector → base estadística.

### Qué se reutiliza del stack actual

| Activo existente | Cómo se usa en el nuevo producto |
|---|---|
| Google Routes API (`rutas.js`) | Motor de ruteo — se le agrega capa de seguridad encima |
| Gemini AI (`asistente.js`) | Se expande para interpretar consultas de seguridad y planes |
| Mapbox GL JS (MapView) | Mapa de calor de seguridad + rutas coloreadas por score |
| React + Vite + Vercel | Misma infra, mismo deploy |
| Datos Metro (`dispositivos.js`) | Se mantiene como feature secundario de accesibilidad |

### Estructura del pitch (3 min)

| Tiempo | Sección |
|---|---|
| 0:00–0:30 | Hook: "¿Quién ha caminado de noche preguntándose si esa calle es segura?" |
| 0:30–1:00 | Origen: RutaLibre, 2° lugar HaCAIthon, tech real funcionando |
| 1:00–1:30 | Pivote: misma tech, mercado masivo — seguridad + IA |
| 1:30–2:15 | El negocio: features, revenue (afiliados + premium + B2B) |
| 2:15–2:45 | Tracción: prototipo en producción, equipo ingeniería UC |
| 2:45–3:00 | Ask: "$500K para data de seguridad + piloto con municipalidad" |

### Regla para agentes

**Ahora SÍ se implementan features comerciales**, pero solo los listados arriba y en el orden de
prioridad indicado. Si el usuario pide algo que no está en esta lista, pregunta antes de construir.
La funcionalidad original de accesibilidad (RutaLibre) se mantiene intacta como feature secundario.
