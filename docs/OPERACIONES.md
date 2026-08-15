# Operaciones: keys, entornos y deploy

> Lee esto **antes de desplegar o de tocar cualquier API key**. Las trampas de aquí ya rompieron
> el sitio en producción una vez.

## Variables de entorno

La app usa tres, todas con prefijo `VITE_`:

| Variable | Para qué | Dónde se consigue |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | Mapa base y tiles | account.mapbox.com |
| `VITE_GOOGLE_MAPS_KEY` | Routes API (cálculo de rutas) | console.cloud.google.com |
| `VITE_GEMINI_KEY` | Asistente de lenguaje natural | aistudio.google.com/apikey |

Viven en **dos lugares que hay que mantener sincronizados**:

1. `frontend/.env.local` — para desarrollo local. **Gitignoreado, nunca se sube.**
2. Variables de entorno del proyecto en Vercel — para producción.

El dictado por voz y el GPS usan APIs nativas del navegador (Web Speech y Geolocation): no
requieren key y no hay nada que configurar.

### ⚠️ Cómo cargar una variable en Vercel sin romperla

**Nunca uses `echo` desde PowerShell.** Inserta un carácter invisible (BOM, U+FEFF) al inicio del
valor, la key queda malformada y el servicio la rechaza. El síntoma es engañoso: el navegador
reporta **un error de CORS** cuando en realidad el token es inválido.

```bash
# CORRECTO (desde Bash)
printf '%s' 'el-valor-de-la-key' | npx vercel env add VITE_MAPBOX_TOKEN production

# INCORRECTO (mete BOM)
echo "el-valor-de-la-key" | npx vercel env add VITE_MAPBOX_TOKEN production
```

Para reemplazar una variable existente: primero `npx vercel env rm NOMBRE production --yes`.

### ⚠️ Las keys son visibles para cualquiera

Vite compila las variables `VITE_*` **dentro del JavaScript** que se descarga el navegador.
Consecuencias:

- Cualquier visitante puede leer las keys con F12. Por eso están **restringidas por dominio** en
  las consolas de Google y por eso hay que rotarlas si se filtran fuera del sitio.
- **Cambiar una variable en Vercel no arregla nada hasta que se hace un build nuevo.** El sitio
  publicado sigue sirviendo los valores viejos incrustados.
- La solución de fondo, si el proyecto sigue en serio: mover la llamada a Gemini a una función
  serverless, para que la key viva en el servidor y nunca llegue al navegador.

## Deploy

El proyecto en Vercel se llama `rutalibre` y el directorio raíz configurado es `frontend/`.
**No está conectado a GitHub**, así que hacer push *no* despliega nada.

### Forma recomendada: el dashboard

vercel.com → proyecto `rutalibre` → pestaña **Deployments** → menú `⋯` del último deploy que diga
*Ready* → **Redeploy**. Tarda menos de un minuto y toma las variables de entorno actuales.

### Por CLI (puede colgarse)

```bash
cd frontend && npx vercel --prod --yes
```

En la máquina de desarrollo este comando se ha quedado colgado en "Building…" indefinidamente,
con causa **sin diagnosticar**. Si te pasa: no reintentes a ciegas. Comprueba el estado real con
`npx vercel inspect <url>` o en el dashboard, y usa el botón Redeploy.

## Cómo verificar que un deploy quedó bien

Que la terminal devuelva `200` **no basta** — el HTML puede cargar y el mapa estar roto. Abre
<https://rutalibre-pi.vercel.app> en una ventana de incógnito y comprueba que:

1. El mapa se dibuja (si se queda en "Cargando mapa y datos del Metro…", algo falla).
2. Los puntos de colores de los ascensores aparecen.
3. Una búsqueda de ruta devuelve un itinerario.

Si algo falla, abre la consola con **F12** y lee el error. Ese dato vale más que cualquier prueba
desde la terminal.

## Cuentas y titularidad ⚠️

**Riesgo abierto que conviene resolver antes de retomar el proyecto:** el equipo usó cuentas
personales durante el hackathon y no está documentado a nombre de quién quedó cada servicio.
La cuenta de Vercel opera bajo `bimonthlyfour-3433s-projects` y el usuario de Mapbox es
`bimonthly`.

Antes de seguir trabajando, verifiquen quién controla cada una (Vercel, Mapbox, Google Cloud,
Google AI Studio) y decidan si migrar a cuentas del equipo. Si alguien queda fuera del proyecto,
podrían perder el acceso al deploy o a las keys sin previo aviso.

## Archivos que NO están en el repositorio

Si clonas el proyecto en otra máquina, estos no vienen y hay que reponerlos a mano:

- `frontend/.env.local` — las tres keys. **Haz un respaldo fuera del repositorio** (gestor de
  contraseñas o similar); si se pierde, hay que regenerar todas las keys.
- `docs/ESTUDIO.md` — documento de estudio interno del equipo, deliberadamente fuera del repo
  público. Respáldalo aparte si te importa conservarlo.
