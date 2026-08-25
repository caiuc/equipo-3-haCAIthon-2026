# Sub-plan operativo - Ojo al Paso

Este documento ordena la validacion del pivot de RutaLibre a Ojo al Paso antes de
seguir agregando funcionalidades. La prioridad es evitar que una heuristica mal
calibrada o una configuracion de deploy incorrecta se convierta en una promesa
del producto.

## 1. Reglas de seguridad del trabajo

- No modificar el deploy de RutaLibre mientras se valida Ojo al Paso.
- No reutilizar ni borrar la API key de otro proyecto.
- No leer, copiar ni subir `frontend/.env.local`.
- No desplegar a produccion sin pasar la lista de aceptacion.
- No presentar el score como una verdad objetiva: es una estimacion basada en
  datos OSM, CEAD y hora del dia.
- Si una validacion falla, detener la siguiente etapa y registrar el problema.

## 2. Estado inicial

### Implementado localmente

- Datos estaticos de seguridad: grid, comunas y limites.
- Modulo de score por punto, tramo y ruta.
- Mapa de calor interactivo.
- Rutas coloreadas por nivel de seguridad.
- Tarjeta con score y recomendacion.
- Asistente IA con modo seguridad y modo plan.
- Rutas IA con paradas concretas calculadas como tramos consecutivos.
- Funcionalidad original de accesibilidad Metro y recalculo automatico.
- Correccion inicial: tramos de Metro y bus reciben el componente completo de
  transporte en vez del valor neutro de una caminata.

### Pendiente de validar

- Que el score represente razonablemente rutas conocidas.
- Que la seguridad influya en la seleccion de ruta, no solo en el color.
- Que caminata y transporte tengan un tratamiento coherente.
- Que los planes IA funcionen con una, dos y tres paradas.
- Que el deploy de Ojo al Paso use exclusivamente sus variables de produccion.
- Que la interfaz tenga identidad Ojo al Paso y sea usable en movil.

## 3. Etapa A - Congelar y ordenar

1. Revisar el diff completo y separar cambios del pivot de cambios ajenos.
2. Crear una rama de trabajo para Ojo al Paso.
3. Crear un commit base pequeno con los cambios ya aprobados.
4. Registrar el proyecto Vercel de Ojo al Paso y el dominio de produccion sin
   incluir valores de keys.
5. Confirmar que RutaLibre y Ojo al Paso tienen variables de Google Routes
   independientes.

**Puerta de salida:** el commit y el mapeo de proyectos quedan identificados y
RutaLibre sigue funcionando de forma independiente.

## 4. Etapa B - Validar el score

Usar una tabla de casos conocidos, manteniendo las mismas coordenadas y hora en
cada repeticion:

| Caso | Condicion | Resultado esperado |
|---|---|---|
| Vicente Valdes - Manquehue | Dia, principalmente Metro | No debe quedar penalizada por falta de transporte |
| Vicente Valdes - Manquehue | Noche | Baja respecto del caso diurno, sin saltos inexplicables |
| Tramo corto caminando | Dia | El score depende principalmente de la celda caminable |
| Tramo largo caminando | Dia | No debe quedar dominado por puntos repetidos de la geometria |
| Ruta con Metro y caminata | Dia y noche | Debe distinguir ambos tipos de tramo |

En cada caso registrar:

- Score total.
- Nivel y mensaje mostrado.
- `scoreContexto`.
- `scoreCrimen`.
- `scoreHora`.
- `scoreTransporte`.
- Tipo y cantidad de tramos.

**Puerta de salida:** no se cambia el umbral de 60 solo para hacer pasar un caso
individual. Primero se entiende la causa y se comparan varios casos.

## 5. Etapa C - Hacer que la seguridad elija la ruta

Actualmente Google entrega alternativas y la interfaz colorea la seleccionada.
La siguiente correccion debe:

1. Puntuar cada alternativa disponible.
2. Eliminar primero las rutas incompatibles con accesibilidad.
3. Comparar seguridad y duracion con una regla explicita.
4. Elegir la ruta segura cuando la diferencia de tiempo sea razonable.
5. Mantener una ruta mas rapida solo cuando la diferencia de seguridad sea menor
   que el margen definido.
6. Mostrar por que se eligio la alternativa.

**Puerta de salida:** una prueba con dos alternativas produce una seleccion
reproducible y no rompe el recálculo por ascensor fuera de servicio.

### Implementacion local actual

- Las alternativas se puntuan antes de dibujar la ruta.
- Primero se descartan las rutas con ascensores malos.
- Se prioriza una ruta al menos 8 puntos mas segura si tarda como maximo 10
  minutos extra.
- La interfaz muestra el motivo cuando se elige una alternativa por seguridad.
- Las consultas IA en modo seguridad usan rutas WALK; las búsquedas normales
  conservan TRANSIT.
- Cuando una caminata queda bajo el umbral de seguridad, se puede calcular una
  alternativa DRIVE desde la misma consulta.
- Falta probar la regla con dos alternativas reales entregadas por Google Routes.

## 6. Etapa D - Validar planes IA

Casos minimos:

- Consulta normal sin paradas.
- Consulta de seguridad nocturna.
- Plan con una parada concreta.
- Plan con dos paradas concretas.
- Plan con actividad generica sin direccion.
- Tramo intermedio sin ruta disponible.

El asistente debe devolver datos compatibles con:

`{ origen, destino, paradas, hora, modo, actividades }`

**Puerta de salida:** las actividades genericas no se convierten en waypoints,
las paradas no se duplican y un fallo de un tramo muestra un error entendible.

## 7. Etapa E - Producto y visual

### Decisión de producto para el frontend

Ojo al Paso no debe verse como una versión recoloreada de RutaLibre. La pantalla
principal debe ser de seguridad urbana y navegación, no de accesibilidad Metro.

- El mapa de calles, la ruta segura y el score deben ser los elementos dominantes.
- Las líneas de Metro no deben aparecer como capa principal por defecto.
- Los cerca de 950 dispositivos del Metro no deben llenar el mapa inicial.
- La capa de ascensores, escaleras y líneas de Metro debe quedar disponible como
  detalle secundario o modo de accesibilidad.
- Si una ruta usa transporte público, se pueden mostrar solo sus estaciones y
  tramos relevantes, no toda la red de Santiago.
- La carga del estado en vivo del Metro no debe bloquear el mapa ni las rutas de
  seguridad; debe cargarse de forma secundaria cuando se necesite.
- La lógica original de accesibilidad se conserva, pero no debe definir la
  identidad visual ni el copy principal de Ojo al Paso.
- Antes de rediseñar el buscador se debe definir la jerarquía de modos de viaje:
  el motor actual consulta solo `TRANSIT`, pero la promesa de Ojo al Paso incluye
  comparar caminar y pedir auto.

La revisión visual debe comparar explícitamente estas dos jerarquías:

| RutaLibre | Ojo al Paso |
|---|---|
| Metro y accesibilidad como foco | Seguridad urbana como foco |
| Estado de ascensores visible siempre | Estado Metro secundario |
| Panel de planificador de transporte | Panel de decisión y ruta segura |
| Líneas de Metro como contexto principal | Calles, riesgo y trayecto como contexto principal |

- Reemplazar la identidad visible de RutaLibre por Ojo al Paso cuando el nombre
  quede confirmado.
- Revisar titulo, logo, textos, tarjeta de seguridad y leyendas.
- Revisar desktop y movil.
- Explicar que el score es estimado y relativo.
- Mantener accesibilidad Metro como feature secundaria sin alterar su logica.

**Puerta de salida:** una persona puede entender en menos de 10 segundos que la
app recomienda rutas seguras y que el score no es una garantia.

## 8. Etapa F - Aceptacion y deploy

Antes de produccion ejecutar:

- `npm run build`.
- `npm run lint` y revisar warnings.
- Busqueda manual tradicional.
- Consulta IA de seguridad.
- Plan IA con dos paradas.
- Mapa de calor.
- Recalculo por falla de ascensor.
- Modo claro y oscuro.
- Prueba en movil.
- Consola del navegador sin errores de API no explicados.

El deploy debe hacerse primero como preview de Ojo al Paso. Solo despues de
probarlo se publica produccion. RutaLibre no se redeploya como parte de esta
etapa.

## 9. Fuera de alcance inmediato

No construir hasta cerrar las etapas anteriores:

- Compartir ruta en vivo.
- Reportes comunitarios.
- Alertas push.
- App nativa.
- Afiliados Uber/Didi reales.
- API B2B para municipalidades o aseguradoras.

## 10. Siguiente accion

La siguiente tarea tecnica es completar la tabla de casos de la Etapa B con
rutas reales y componentes del score, y despues probar la seleccion con dos
alternativas reales. La validacion local no reemplaza una prueba con las keys y
dominios autorizados de Ojo al Paso.
