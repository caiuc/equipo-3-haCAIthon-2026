# Plan de acción — Ajustes de la demo según `prompt3.md`

## Objetivo

Actualizar la demo guiada para que represente recorridos peatonales válidos sobre calles reales, muestre segmentos de riesgo completos entre intersecciones y presente las tres alternativas mediante tarjetas consistentes que no oculten las rutas.

## Alcance

- Mantener intacto el flujo normal de Ojo al Paso.
- Mantener la demo aislada en `frontend/src/demo/`.
- Conservar el flujo guiado ya implementado y sus acciones reversibles.
- No agregar llamadas de red ni dependencias de IA durante la demo.
- No desplegar ni modificar variables de entorno.

## Pasos

1. **Obtener geometrías válidas una sola vez**
   - Calcular tres recorridos peatonales entre el origen y destino preparados.
   - Forzar corredores diferentes mediante puntos intermedios para producir alternativas aproximadamente paralelas.
   - Guardar las geometrías resultantes como GeoJSON estático dentro del módulo de demo.

2. **Definir segmentos de riesgo por cuadra**
   - Seleccionar subsecuencias completas de cada geometría delimitadas por intersecciones.
   - Evitar cortes arbitrarios a mitad de cuadra.
   - Mantener los segmentos como una fuente GeoJSON independiente para poder alternar su visibilidad.

3. **Rediseñar las anotaciones de ruta**
   - Ubicar la tarjeta izquierda a la izquierda de su recorrido y la derecha de forma simétrica.
   - Situar la tarjeta de la ruta balanceada arriba y en diagonal.
   - Eliminar los triángulos inferiores que asumían una dirección incorrecta.
   - Unir cada tarjeta con su ruta mediante conectores y un punto de anclaje visible.

4. **Estandarizar contenido y jerarquía**
   - Usar los títulos `Ruta más rápida`, `Ruta balanceada` y `Ruta más segura`.
   - Eliminar subheaders.
   - Presentar tiempo y seguridad en las primeras dos filas con iconos consistentes.
   - Mostrar los CDS como una lista indentada con bullets.
   - Aplicar negro a la referencia de Google, verde a mejoras de seguridad y rojo al costo adicional en tiempo.

5. **Integrar y verificar**
   - Mantener los controles guiados y la escritura animada existentes.
   - Probar avance, regreso, finalización y alternancia de segmentos.
   - Revisar visualmente escritorio y móvil.
   - Ejecutar `npm run lint`, `npm run build` y `npm run validar-seguridad`.

## Criterios de aceptación

- Ninguna ruta atraviesa edificios o manzanas fuera de la red vial.
- Los segmentos rojos coinciden con cuadras completas del recorrido preparado.
- Las tarjetas no cubren sus rutas ni se superponen entre sí en escritorio.
- Los conectores señalan inequívocamente la ruta correspondiente.
- Las tres tarjetas comparten estructura, alineación e iconografía.
- La demo funciona sin red después de que el mapa base está cargado.
- El flujo normal de la aplicación continúa compilando y validando correctamente.

## Estado de ejecución

- [x] Tres geometrías peatonales reales almacenadas como datos estáticos.
- [x] Seis segmentos de riesgo definidos mediante tramos completos de calles.
- [x] Tarjetas laterales ancladas fuera de sus rutas.
- [x] Tarjeta balanceada ubicada en diagonal y unida mediante conector.
- [x] Contenido, colores, iconos y CDS estandarizados.
- [x] Flujo guiado verificado en escritorio y móvil.
- [x] `npm run lint`, `npm run build` y `npm run validar-seguridad` aprobados.
- [x] Consola del navegador sin errores ni advertencias.
