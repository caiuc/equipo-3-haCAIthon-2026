# Entorno Codex — estado y continuidad

> Última actualización: 24-08-2026. Este documento conserva el contexto operativo para retomar
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

- Codex CLI `0.149.1`, autenticado mediante ChatGPT.
- Plugin oficial de Vercel `0.45.1`, instalado y habilitado.
- Vercel MCP configurado en `https://mcp.vercel.com`, habilitado pero todavía no autenticado.
- La configuración global de Codex aplica una allowlist de herramientas de lectura para equipos,
  proyectos, despliegues, logs, analytics y documentación, todas con aprobación `prompt`.
- Existe además un denylist explícito para compras (`buy_domain`, `buy_credits`, `buy_pro`,
  `buy_addon`), cotizaciones, despliegues, creación de proyectos, pausas y enlaces de acceso.
- El primer OAuth se revocó. Un segundo intento se canceló al comprobar que la sesión ya abierta
  conservaba el inventario anterior de herramientas; se requiere reiniciar Codex antes del login.
- Plugin Browser y plugin Chrome instalados y habilitados.
- La extensión oficial de ChatGPT para Chrome se conectó correctamente desde Codex.
- Chrome permite navegación, inspección del DOM, capturas, consola y CDP para inspección avanzada
  de red cuando la pestaña lo soporta.
- GitHub CLI (`gh`) no está instalado.
- El plugin GitHub de Codex no está instalado.
- Vercel CLI no está instalado globalmente.

## 4. Hallazgo pendiente de seguridad

El diagnóstico `codex doctor` informó que el sandbox elevado de Windows falló y que el entorno
actual tiene acceso de archivos sin restricciones. No se cambió todavía ninguna configuración.

Objetivo posterior: usar una configuración de mínimo privilegio, idealmente `workspace-write` con
aprobaciones `on-request`, sin impedir build, servidor local, Chrome ni las herramientas necesarias
del proyecto.

## 5. Orden acordado para continuar

1. **Git — completado:** preservar RutaLibre, ordenar commits y publicar `shark-tank`.
2. **Vercel MCP:** reiniciar Codex, verificar la allowlist, autenticar y después identificar los
   proyectos existentes sin desplegar ni cambiar variables.
3. **GitHub:** evaluar si plugin o CLI aportan PRs, issues, revisión y protección adicional frente
   a Git local; evitar instalar herramientas redundantes.
4. **Browser tooling:** consolidar Chrome como superficie principal para localhost y Vercel;
   comprobar consola y red con una prueba controlada.
5. **Pipeline local:** dejar claro cuándo ejecutar build, lint, validación de seguridad y servidor.
6. **Plugins, MCP y skills:** conservar solo capacidades con valor real para este proyecto.
7. **Sandbox y permisos:** corregir el fallo y establecer límites seguros.

## 6. Próximo paso exacto

Cerrar y volver a abrir Codex o iniciar un chat nuevo para recargar la configuración MCP. Antes de
autenticar, comprobar que el inventario exponga solo las herramientas incluidas en `enabled_tools`
y que no aparezca ninguna herramienta `buy_*`, `deploy_to_vercel` ni `create_git_project`.

Solo después de esa verificación, autenticar Vercel MCP mediante OAuth y usarlo para listar cuenta,
proyectos y despliegues, y confirmar cuál proyecto corresponde a RutaLibre. Ojo al Paso debe recibir
un proyecto nuevo e independiente. La pantalla OAuth de Vercel muestra permisos amplios aunque
Codex aplique la allowlist local, por lo que el token debe tratarse como una credencial sensible.

No desplegar, crear proyectos, cambiar dominios ni tocar variables de entorno sin autorización
explícita del usuario y sin leer primero `docs/OPERACIONES.md`.
