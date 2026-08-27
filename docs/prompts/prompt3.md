# Modifiquemos algunos elementos de la demo.

- El principal problema es que estamos dibujando elementos sobre el fondo como este fuese un componente cualquiera, sin considerar que en realidad es un mapa con calles.
  - En ese sentido, las rutas generadas deben ser rutas que involucren caminos válidos, en lugar de atravesar calles y edificios arbitrariamente.
  - Idealmente los segmentos de riesgo deberían ser una o más cuadras a través de una calle, en vez de por ejemplo un segmento que considera una media cuadra y otra media cuadra de cuadras distintas, porque el mapeo de la visión final va a considerar el análisis por cuadras e intersecciones, y queremos mostrar una demo de ese producto.

- Quiero ajustar los tooltip/modales para que no interfieran con las rutas y para que sean más consistentes a nivel de diseño.
  - Las flechas del componente apuntan hacia abajo, a pesar de que las rutas, que es a lo que están apuntando, no estén necesariamente abajo.
    - Ese es el primer problema.
  - Segundo, los tooltips se superponen con la ruta.
  - Entonces, siguiendo el ejemplo ya hardcodeado (pero ajustado para que las rutas atraviesen caminos reales según las calles disponibles, y no que atraviesen bloques), con tres rutas que son líneas más o menos verticales y paralelas que convergen en origen y destino, una mejor visualización sería:
    - forzar que el tooltip de la ruta de la izquierda, esté a la izquierda de la ruta,
    - que la ruta derecha funcione de forma análoga por simetría,
    - y que la ruta central tenga su tooltip arriba pero en diagonal, no directamente arriba porque de lo contrario podría señalar el destino.
  - Va a quedar un poco alejado, por lo que una opción es unir la ruta preferida intermedia con una flecha hasta el tooltip, creo que visualmente es más agradable, y de esa forma no habrá interferencia visual sobre las ruta (aparte de la flecha, que es aceptable).

- Quiero estandarizar la información dentro de cada tooltip.
  - Comenzando por el título, entiendo la necesidad de decir riesgo estimado, ya que no podemos garantizar seguridad, pero bajo el mismo argumento, la ruta de google maps sigue siendo la más rápida a pesar de que no pueda garantizar rapidez.
  - Para efectos de impresionar a un jurado, y no confundirlo, quiero:
    - cambiar el título de la ruta de menor riesgo estimado, a "Ruta más segura",
    - y también el de ruta recomendada a Ruta balanceada.
  - Quiero eliminar los subheaders.
  - Respecto a los atributos de cada ruta, estandariza la posición, el score y las métricas.
  - Sigue este formato para la ruta de google maps:
    - Primera fila de rapidez: ## minutos,
    - segunda fila de seguridad: Seguridad estimada: ##/100.
  - Sigue este formato para las 2 rutas de balanceo y seguridad:
    - Primera fila de rapidez: ### min \* +# min,
    - segunda fila de seguridad: +##% de seguridad,
    - tercera fila de componentes de seguridad (de ahora en adelante, CDS): -##km de calles de riesgo,
    - cuarta fila de CDS: -##% de delitos,
    - quinta fila de CDS: +##% de luminarias.
  - Las filas de CDS indentadas y con bullets.
  - La ruta de google maps tiene sus componentes en negro.
  - Las rutas balanceada y segura tienen componentes verdes para seguridad (ya que aumenta) y rojos para tiempo (aumenta el tiempo lo que es negativo).
  - Además, a la izquierda de las filas principales de tiempo y seguridad, añade emotes de rayo para el tiempo, y de un escudo medieval para la seguridad.

Documenta este prompt en prompt3.md reestructurado según el formato que conversamos, guárdalo en docs/prompts, mueve prompt2 a esa carpeta también, y escribe un plan de acción en docs para hacer estos cambios.

Después ejecuta el plan de acción y actualiza la aplicación.

Finalmente, dime solo por chat, qué necesitas que te entregue para realizar el deploy en vercel, sin romper el deploy de ruta libre.
