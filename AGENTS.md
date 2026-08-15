# AGENTS.md — Instrucciones para agentes de IA

> Este archivo es el punto de entrada para cualquier agente (Claude Code, opencode, Antigravity,
> Cursor…). **Léelo completo antes de tocar nada.** Es corto a propósito. Los detalles están en
> `docs/`, y solo debes abrirlos cuando la tarea lo requiera (ver "Cuándo leer qué").

## 1. Qué es esto

**RutaLibre**: planificador de rutas de transporte público de Santiago para personas con movilidad
reducida. Cruza la ruta con el estado **en vivo** de los ascensores del Metro y, si hay uno roto,
recalcula automáticamente evitando esa estación.

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

## 4. Mapa de archivos y cuánto ocupan

| Archivo | Líneas | Qué es | Cómo leerlo |
|---|---|---|---|
| `frontend/src/MapView.jsx` | 696 | Componente principal: mapa, panel, toda la UI y la lógica | **No lo leas entero.** Busca por patrón la función que necesitas |
| `frontend/src/lib/rutas.js` | 178 | Google Routes API, parseo del itinerario, decoder de polilínea | Se puede leer completo |
| `frontend/src/lib/dispositivos.js` | 80 | Carga ascensores + estado en vivo y los cruza | Se puede leer completo |
| `frontend/src/lib/asistente.js` | 47 | Gemini: texto → `{origen, destino, necesidad}` | Se puede leer completo |
| `frontend/src/App.css` | 588 | Todos los estilos, con tokens de tema claro/oscuro | Busca por selector |
| `frontend/public/data/*.geojson` | — | 253 KB y 46 KB de datos | **Nunca los abras.** Son datos, no código |

## 5. Comandos

```bash
cd frontend
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # DEBE pasar antes de dar por terminado cualquier cambio
npm run lint     # oxlint
```

## 6. Cuándo leer qué (para no malgastar contexto)

- **Vas a tocar código de la app** → lee `docs/ARQUITECTURA.md` (flujo de datos y cómo encaja todo).
- **Vas a desplegar, tocar API keys o variables de entorno** → lee `docs/OPERACIONES.md`.
  Contiene trampas que ya rompieron el sitio una vez.
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

## 8. Antes de decir "listo"

1. `npm run build` pasa sin errores.
2. Abriste `npm run dev` en el navegador y **viste** el cambio funcionando.
3. Si tocaste algo de rutas o accesibilidad, probaste una búsqueda real de extremo a extremo.
4. No agregaste secretos al repositorio (`git status` antes de `git commit`).
5. Commit pequeño, mensaje en español y descriptivo.
6. `git pull --rebase` antes de `git push` — el repositorio es compartido con el equipo.

## 9. Qué viene después

El equipo evalúa presentar una versión de esto a un **Shark Tank**, lo que exige un ángulo
comercial. La idea en discusión es agregar al mapa otros atributos con atractivo de mercado, pero
**nada está decidido ni diseñado**. No empieces a implementar features "comerciales" por tu cuenta:
pregunta primero qué se quiere construir.
