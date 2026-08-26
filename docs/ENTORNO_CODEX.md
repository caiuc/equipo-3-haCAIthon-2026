# Entorno Codex — estado y continuidad

> Última actualización: 25-08-2026. Este documento conserva el contexto operativo para retomar
> la preparación del CAi Shark Tank aunque se cierre el chat actual.

## 1. Objetivo no negociable

**RutaLibre y Ojo al Paso deben funcionar como dos aplicaciones independientes.**

- `main` se reserva para RutaLibre. No se fusiona `shark-tank` hacia `main`.
- `shark-tank` contiene Ojo al Paso y todo el desarrollo del pivot.
- El tag `v1.0-rutalibre` preserva la versión original exacta de RutaLibre.
- RutaLibre y Ojo al Paso deben usar proyectos Vercel distintos, ramas de producción distintas y
  variables de entorno independientes.
- Configurar o desplegar Ojo al Paso nunca debe modificar ni volver a desplegar RutaLibre.

## 2. Estado verificado de Git

Repositorio remoto: `https://github.com/caiuc/equipo-3-haCAIthon-2026.git`.

| Referencia | Commit | Propósito |
|---|---|---|
| `v1.0-rutalibre` | `5a117ac` | RutaLibre original, preservado como tag anotado en GitHub |
| `origin/main` | `553019e` | RutaLibre más dos commits aditivos de Codespaces; la app original no fue modificada |
| `origin/shark-tank` | `a65b2d7` | Ojo al Paso publicado y separado de `main` |

Los tres commits iniciales del pivot en `shark-tank` son:

1. `64fdaae` — `Agrega motor y datos de seguridad urbana`.
2. `c292e9c` — `Integra rutas seguras y planificación con IA`.
3. `a65b2d7` — `Documenta el pivot a Ojo al Paso`.

Antes del push se verificó:

- `npm run build`: OK.
- `npm run lint`: OK.
- `npm run validar-seguridad`: OK.
- Los datasets son JSON válidos.
- No se detectaron patrones de credenciales en los cambios.
- `frontend/.env.local`, `docs/ESTUDIO.md` y `frontend/dist` siguen ignorados.

## 3. Herramientas Codex comprobadas

- `codex doctor` confirmó Codex CLI `0.149.1`, modelo `gpt-5.6-sol`, autenticación mediante ChatGPT,
  conexión WebSocket operativa y bases locales de conversaciones íntegras.
- Hay 12 plugins instalados y habilitados. Para este proyecto destacan Vercel, GitHub, Browser,
  Chrome, Sites y las herramientas de documentos, PDF, planillas, presentaciones y visualización.
- Plugin oficial de Vercel `0.45.1`, instalado y habilitado.
- Vercel MCP está habilitado y autenticado mediante OAuth en `https://mcp.vercel.com`.
- Su inventario efectivo contiene exactamente las 13 herramientas declaradas en `enabled_tools`:
  consultas de equipos, proyectos, despliegues, logs, analytics y documentación. Todas usan
  aprobación `prompt`.
- No aparecen las herramientas bloqueadas para compras (`buy_*`), cotizaciones, despliegues,
  creación de proyectos Git, pausas, cambios de protección ni enlaces de acceso.
- La consulta `list_teams` confirmó el equipo `bimonthlyfour-3433s-projects`, plan Hobby.
- Vercel CLI no está instalado globalmente, pero `npx vercel@latest` funciona, quedó autenticado
  como `bimonthlyfour-3433` y reportó Vercel CLI `59.5.0`.
- Plugin Browser y plugin Chrome están instalados y habilitados. El 25-08-2026 Chrome fue
  seleccionado correctamente como navegador predeterminado conectado mediante la extensión.
- Chrome permite navegación, inspección del DOM, capturas, consola y CDP para inspección avanzada
  de red cuando la pestaña lo soporta.
- GitHub CLI `2.98.0` está instalado para el usuario, aparece normalmente en el `PATH` y usa
  HTTPS para operaciones Git.
- `gh` está autenticado como `bimonthly` mediante un token fine-grained guardado en el keyring de
  Windows. El token vence el 31-08-2026, solo permite leer repositorios públicos y no tiene
  permisos adicionales de cuenta, escritura, workflows ni facturación.
- Plugin `github@openai-curated` instalado y habilitado, versión de caché `11c74d6b`.
- El inventario recargado expone 89 herramientas GitHub bajo el prefijo actual
  `mcp__codex_apps__github_*`; no usa el alias antiguo `mcp__github__*`.
- El permiso específico de GitHub sigue en **permitir lecturas y preguntar antes de escribir**.
- Una consulta pública de lectura mediante el conector confirmó que
  `caiuc/equipo-3-haCAIthon-2026` es público, usa `main` como rama predeterminada y no está
  archivado. No se hicieron escrituras.
- No se solicitó ni se instaló la app GitHub en la organización `caiuc`. Esa acción sigue
  requiriendo acuerdo previo con un administrador de la organización.

## 4. Estado de Vercel y separación de aplicaciones

Los proyectos independientes existentes en el equipo son:

| Aplicación | Proyecto | ID | Estado |
|---|---|---|---|
| RutaLibre | `rutalibre` | `prj_08FFxBspVtKZsJ5uHr6jRQVRRaqQ` | Existente; no fue modificado ni redesplegado |
| Ojo al Paso | `ojo-al-paso` | `prj_8p2lYsNS9GbIuPkWKZeGGFJWBezC` | Creado el 25-08-2026; todavía sin deploy |

- `ojo-al-paso` usa el preset **Vite**, Node.js 24.x y raíz `.` porque el futuro deploy se debe
  ejecutar desde `frontend/`.
- Las variables `VITE_MAPBOX_TOKEN`, `VITE_GOOGLE_MAPS_KEY` y `VITE_GEMINI_KEY` existen solo en
  Production del proyecto `ojo-al-paso`. Sus valores nunca se imprimieron ni se copiaron al repo.
- Vercel obliga a almacenar las variables `VITE_*` como configuración pública/no sensible porque
  Vite las compila en el JavaScript del navegador. Deben mantenerse restringidas por dominio en
  Mapbox y Google, tal como explica `docs/OPERACIONES.md`.
- Se usó un enlace temporal aislado para configurar Ojo al Paso. Ese directorio y su token OIDC
  fueron eliminados al terminar.
- `frontend/.vercel/project.json` sigue apuntando a `rutalibre`. Esto evita modificar el proyecto
  original, pero también significa que **no se debe ejecutar un deploy desde `frontend/` todavía**:
  antes hay que definir un enlace aislado y verificable para Ojo al Paso.
- No se creó ningún despliegue, no se cambiaron dominios y RutaLibre quedó intacto.

## 5. Hallazgos pendientes de seguridad y mantenimiento

- `codex doctor` terminó con 21 comprobaciones correctas y un fallo: el aprovisionamiento del
  sandbox elevado de Windows sigue fallando (`helper_unknown_error`).
- La política de aprobación es `OnRequest`, pero el sandbox efectivo mantiene acceso irrestricto
  al sistema de archivos y red habilitada. Codex recomienda reparar o reinstalar el CLI desde una
  distribución aprobada.
- No se detectó una solución de protección de endpoint compatible en Windows.
- La aplicación de escritorio instalada (`26.818.8289.0`) tiene disponible la actualización
  `26.820.7780.0`.
- El repositorio no está en un Windows Dev Drive. Moverlo a uno es opcional, pero podría mejorar el
  rendimiento de Git y del sistema de archivos.
- El token de GitHub CLI vence el 31-08-2026 y debe renovarse si se seguirá usando `gh`; el conector
  GitHub es una autenticación independiente.

## 6. Orden acordado para continuar

1. **Git — completado:** preservar RutaLibre, ordenar commits y publicar `shark-tank`.
2. **GitHub — completado con límite organizacional:** plugin, CLI, inventario, permiso y lectura
   pública verificados; no se solicitó instalación en `caiuc`.
3. **Vercel — separación creada:** `ojo-al-paso` existe como proyecto independiente, usa Vite y
   tiene sus tres variables de Production. No existe todavía ningún deploy.
4. **Preparación previa al deploy:** verificar las restricciones por dominio de Mapbox y Google,
   ejecutar build, lint y validación de seguridad, levantar el servidor local y probar la app de
   extremo a extremo en Chrome.
5. **Deploy:** solo con autorización explícita, usando un enlace aislado a `ojo-al-paso`; después
   verificar mapa, ascensores y una ruta real en el navegador.
6. **Sandbox y permisos:** reparar el sandbox de Windows y volver a ejecutar `codex doctor`.
7. **Mantenimiento:** actualizar la app de escritorio y renovar el token `gh` antes de su fecha de
   vencimiento si sigue siendo necesario.

## 7. Cómo retomar esta conversación

- Se puede cerrar normalmente Codex en la terminal. El historial local y las bases de hilos están
  íntegros.
- En la app de escritorio, usar la misma cuenta, abrir este repositorio y elegir **este mismo chat**
  desde **Recent chats**. No crear un chat nuevo.
- Si el chat no aparece en la app, volver a la terminal y ejecutar `codex resume --all` para
  localizarlo por su título o directorio de trabajo.
- Los identificadores temporales de herramientas o navegador no sobreviven al cierre, pero las
  conexiones se pueden restablecer; el historial, los archivos locales y el estado remoto sí
  permanecen.

## 8. Próximo paso exacto

Al retomar este mismo chat, continuar con la preparación previa al deploy de Ojo al Paso:

1. Confirmar las restricciones de dominio de Mapbox y Google para el futuro dominio de producción.
2. Ejecutar `npm run build`, `npm run lint` y `npm run validar-seguridad` desde `frontend/`.
3. Iniciar `npm run dev` y probar visualmente en Chrome el mapa, las capas y una ruta real.
4. Detenerse y pedir autorización explícita antes de crear el primer deploy de `ojo-al-paso`.

No desplegar, cambiar dominios, modificar variables, solicitar instalaciones organizacionales ni
alterar RutaLibre sin autorización explícita del usuario y sin releer antes `docs/OPERACIONES.md`.
