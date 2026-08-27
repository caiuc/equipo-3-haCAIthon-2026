# Ok.

Entonces, usando la aplicación actual de esta branch, necesito que generes un flujo suficiente para una demo.

- Pienso en un botón Iniciar Demo que simplemente:
  - inyecte un origen y un destino en el mapa,
  - busque la ruta clásica (no relacionada a seguridad),
  - la ruta segura,
  - una ruta que visualmente se vea como un equililbrio o mezcla de ambas,
  - y que esta última tenga un color que la permita ser interpretada como la ruta principal, mientras que las otras dos sean rutas alternativas.

- De las rutas alternativas, quiero un pequeño tooltip adjunta a cada una.
  - Por ejemplo, que la ruta de Google maps diga en verde que es la ruta más rápida.
  - Que la ruta segura diga:
    - en verde que es tantos puntos, o tanto por ciento más segura, tanto por ciento menos asaltos o encerronas, tanto por ciento más luminarias, etc,
    - y en rojo, un tanto por ciento más lenta, o se demora tantos minutos más.

- La idea de hardcodear los números y mostrarlos visualizados en un tooltip o pequeña ventana flotante al lado de cada ruta, es que sea muy visible para el jurado que la ruta segura tiene beneficios respecto a la ruta de google maps, pero que es un tradeoff en velocidad y tiempo.

- Y por último, que la ruta de preferencia, que sería un intermedio, tenga números que concilien ambos extremos y la hagan ver como una opción más segura y aún así relativamente rápida.

- También la interfaz podría tener un botón que permita hacer highlight en el mapa a los segmentos de calle/bloques que serían riesgosos en cada ruta, estarían hardcodeados pero permitirían visualizar claramente la visión de la aplicación.

- Concretamente, al presionar este botón "Visualizar segmentos de riesgo", con las tres rutas ya visualizadas e identificadas en el mapa por medio de los tooltips anteriores y quizás algunos labels y highlight sobre la ruta en sí (transparente, de colores), bajo la misma ruta ,y de ahí que sea transparente, se podrían colorear los segmentos riesgosos en rojo, por lo que sería fácil identificar visualmente la relación entre rapidez y rutas inseguras (que no siempre es real, pero es el objetivo de la demo).

- Por lo tanto, por ahora:
  - las rutas alternativas destácalas en gris transparente,
  - y la ruta de equilibrio en verde transparente.
  - Así, el coloreo de segmentos en rojo debería ser claramente visible por la transparencia.

- Sería bueno separar a nivel de archivos y código, el estado actual de la aplicación de la demo.
  - Tal vez genera archivos fuente y una carpeta distintos.

- Recuerda que la demo debe funcionar como un script, no tendríamos que tener que escribir manualmente las rutas, ni tampoco presionar los botones, ya que aumentan los puntos de fallo.

- Simplemente presiono Iniciar Demo, botón en verde, esquina inferior izquierda, y una vez que se inicie, que hayan dos botones para regresar o continuar.
  - El botón de continuar va a estar en el espacio donde estaba el botón de Iniciar Demo.
  - El botón de regresar va a aparecer justo arriba.
  - Cada botón no dirá continuar o regresar, sino que van a tener labels con el nombre de la acción anterior o a continuación.

- Entonces, después de iniciar demo:
  - puede ser un botón de ingresar ruta,
  - y eso va a escribir en el input (y se va a mostrar escrito, en vivo),
  - el siguiente será Buscar ruta,
  - ahí va a mostrar inmediatamente las tres rutas descritas anteriormente, con sus labels e información respectiva,
  - y una vez que ocurra eso, aparecerá el botón en la esquina superior derecha para mostrar segmentos de riesgo.
