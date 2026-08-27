# Hallazgos a partir de `prompt1.md`

**Fecha de revisión:** 27 de agosto de 2026  
**Alcance:** evaluación técnica, alineación con la investigación de negocio y recomendación para la demo. No incluye implementación.  
**Estructura:** la respuesta 1 corresponde al prompt original; la respuesta 2 incorpora su extensión y rectifica el diagnóstico del prototipo actual.

## Respuesta 1 — Evaluación del prompt original

### R1.1. Conclusión ejecutiva

La dirección general de `prompt1.md` tiene sentido y está muy bien alineada con la tesis de Ojo al Paso: convertir el riesgo estimado en una variable de navegación y, a futuro, construir rutas desde la red de calles en lugar de limitarse a puntuar unas pocas alternativas entregadas por Google.

La corrección conceptual más importante es esta:

> El producto no necesita tres algoritmos completamente separados, sino una cadena de datos y un motor de ruteo multiobjetivo sobre segmentos de calle.

Esa cadena debería ser:

1. dividir la red peatonal en segmentos entre intersecciones;
2. estimar para cada segmento un riesgo, una incertidumbre y una vigencia temporal;
3. acumular el riesgo a lo largo de cada trayecto;
4. calcular alternativas que representen distintos compromisos entre tiempo y riesgo;
5. explicar qué señales hicieron preferible una alternativa.

La idea de una demo visual con recorridos preparados es razonable para un plazo de cuatro horas, siempre que se presente con honestidad como una demostración de la experiencia objetivo. Sin embargo, el propio repositorio indica que esa decisión quedó parcialmente desactualizada: `PLAN_SHARK_TANK.md` registra que el prototipo actual ya integra datos, scoring, rutas coloreadas, recomendación de transporte y consultas de seguridad. Por lo tanto, hoy conviene conservar y mostrar lo que ya funciona, sin reemplazarlo por una interfaz completamente hardcodeada ni intentar construir a última hora el optimizador calle por calle.

### R1.2. Evaluación de la propuesta técnica

#### R1.2.1. Algoritmo 1: estimar seguridad para toda la red

La intención es correcta, pero la propagación basada principalmente en la cercanía a calles conocidas sería demasiado ingenua para convertirse en el modelo definitivo.

Dos segmentos cercanos pueden tener riesgos muy distintos por factores que la distancia euclidiana no representa:

- una autopista, un río, una vía férrea o un sitio eriazo pueden separar contextos vecinos;
- una avenida comercial iluminada puede estar al lado de un pasaje sin actividad;
- el horario puede invertir la interpretación de un parque o sector comercial;
- la ocurrencia delictual puede concentrarse en puntos específicos en lugar de variar suavemente con la distancia.

##### Recomendación

La unidad base debe ser el **segmento de calle entre intersecciones**, representado como una arista de un grafo. Para cada segmento se deberían distinguir al menos:

- `riesgo_estimado`: costo relativo esperado;
- `confianza`: calidad y cobertura de la evidencia;
- `fuente`: observado, derivado de contexto o imputado;
- `actualizado_en`: vigencia temporal;
- `explicaciones`: señales que más influyeron en la estimación.

La estimación inicial puede combinar datos delictuales agregados con atributos locales de OpenStreetMap, horario, actividad comercial, transporte e iluminación. La proximidad puede ser una señal adicional, pero no el principio dominante.

Tampoco conviene “unir” directamente scores observados e inferidos solo porque ambos usan una escala de 0 a 100. Antes deben calibrarse sobre una definición común. Una calle con evidencia directa y otra con un valor imputado pueden compartir el mismo score, pero no la misma certeza.

##### Implicación para la escala 0–100

El número debe presentarse como un **índice relativo de menor riesgo estimado**, no como una probabilidad de que no ocurra un delito. Los decimales no aumentan la exactitud real: pueden usarse internamente, pero la interfaz no debería aparentar una precisión que los datos no sostienen.

#### R1.2.2. Algoritmo 2: ruta optimizada solo por seguridad

Modelar la ciudad como un grafo con un costo de riesgo por arista es técnicamente correcto. Dijkstra o A* pueden encontrar el trayecto de menor costo si los pesos son no negativos.

El problema está en optimizar **exclusivamente** seguridad. Sin una restricción de tiempo o distancia, el resultado puede ser absurdo: desvíos muy largos, recorridos que duplican la duración o rutas que reducen el promedio de riesgo añadiendo segmentos innecesarios.

##### Recomendación

El costo de una ruta no debería ser el promedio simple de los scores. Debe ponderarse por la exposición:

```text
riesgo_ruta = suma(riesgo_segmento × tiempo_o_longitud_expuesta)
```

Luego se debe resolver uno de estos problemas:

```text
minimizar riesgo, sujeto a tiempo <= tiempo_más_rápido × (1 + desvío_máximo)
```

o bien:

```text
minimizar tiempo + λ × riesgo
```

La primera formulación suele ser más fácil de explicar al usuario: “esta alternativa reduce el riesgo estimado sin tardar más de diez minutos adicionales”.

#### R1.2.3. Algoritmo 3: balance entre rapidez y seguridad

Esta es la parte más valiosa de la propuesta, pero las dos opciones descritas en el prompt son aproximaciones a un problema conocido: **ruteo multiobjetivo**.

No hace falta bajar un umbral por deciles ni explorar desvíos geométricos alrededor de la polilínea de Google. Es preferible calcular una frontera de Pareto: rutas para las cuales no existe otra alternativa que sea simultáneamente más rápida y de menor riesgo estimado.

Para producto, esa frontera puede resumirse en tres alternativas comprensibles:

| Alternativa | Objetivo |
|---|---|
| Más rápida | mínimo tiempo; sirve como línea base |
| Equilibrada | reducción relevante de riesgo por un desvío pequeño |
| Menor riesgo estimado | mínimo riesgo dentro de un límite de tiempo aceptable |

Un slider continuo “rápida ↔ segura” es atractivo visualmente, pero no garantiza que exista una ruta nueva y estable para cada posición. Para una primera versión es más claro mostrar dos o tres alternativas discretas con diferencias explicadas.

##### Relación con Google Routes

Google puede seguir aportando la ruta rápida, los tiempos y la geometría de referencia. El motor propio necesita además una red enrutable —por ejemplo, derivada de OpenStreetMap— para construir trayectos calle por calle. Puntuar únicamente alternativas de Google no materializa el diferenciador estratégico, aunque sí sirve como prototipo intermedio.

#### R1.2.4. Algoritmo 4: buses RED

La propuesta es factible, pero no debería entrar en el alcance inmediato.

El transporte público no se modela bien como una simple extensión del grafo peatonal. Requiere horarios, paradas, transbordos, frecuencias y recorridos, normalmente mediante GTFS y algoritmos como RAPTOR o CSA. Además, para una persona que viaja dentro del bus, la seguridad de cada calle recorrida no representa la misma exposición que al caminar.

En una primera versión multimodal, la seguridad debería influir principalmente en:

- la caminata hasta y desde las paradas;
- el tiempo y contexto de espera;
- los transbordos a pie;
- la hora y actividad del entorno de cada parada.

Es un roadmap válido, pero construirlo ahora diluiría el foco de la propuesta principal.

#### R1.2.5. Segmentos, cuadras y caras de cuadra

El prompt acierta al detectar que una calle completa es una unidad demasiado gruesa. Una calle de veinte cuadras no debería compartir un único score.

La unidad recomendada es el **segmento dirigido entre dos intersecciones**. Esto permite:

- que una misma calle cambie de riesgo por cuadra;
- representar sentidos y restricciones de circulación;
- acumular exposición correctamente;
- actualizar solo el área afectada por nueva información.

La cara de cuadra —cada lado de la calle— solo agrega valor si existen datos diferentes por vereda, iluminación lateral, accesibilidad o actividad de fachada. Para el primer motor, el segmento central de la vía es suficiente y mucho más tratable.

### R1.3. Alineación con la investigación de negocio

La propuesta técnica está fuertemente alineada con `INVESTIGACION_OJO_AL_PASO_SHARK_TANK.md` en cuatro aspectos:

1. **Diferenciador:** construir el recorrido desde segmentos de calle, no escoger solamente entre rutas predeterminadas por otro navegador.
2. **Fundamento del problema:** el riesgo puede concentrarse en una fracción pequeña de los segmentos, por lo que una clasificación comunal es insuficiente.
3. **Decisión de producto:** aceptar un costo razonable en tiempo cuando produce una reducción relevante del riesgo estimado.
4. **Ventaja defendible:** el activo futuro no será Dijkstra, sino la capa de datos locales, su calibración, la confianza y los convenios institucionales.

También coincide con la oportunidad B2B/B2G: una capa de inteligencia territorial puede servir a municipalidades, universidades, centros de salud y empleadores, además de alimentar la experiencia B2C.

#### Tensiones que deben corregirse

Hay algunas formulaciones del plan técnico que son más fuertes que la investigación y deberían armonizarse:

- reemplazar “la ruta más segura” por “ruta de menor riesgo estimado”;
- evitar mensajes como “puedes caminar tranquilo”, porque el score nunca garantiza seguridad;
- no tratar la ausencia de `lit=yes` en OpenStreetMap como prueba de que una calle no tiene iluminación;
- separar claramente datos delictuales observados, contexto urbano e inferencias;
- mostrar incertidumbre y cobertura, no solo un score único;
- no presentar un score heurístico como una probabilidad validada.

Una redacción más responsable para la recomendación sería:

> “Según los datos disponibles, esta alternativa presenta menor riesgo estimado. Mantén las precauciones habituales.”

### R1.4. Mejoras sugeridas al plan técnico

#### Prioridad alta

1. Definir formalmente qué significa el score y cómo se transforma en costo de una arista.
2. Separar `riesgo`, `confianza` y `actualidad` de los datos.
3. Ponderar el riesgo de ruta por longitud o tiempo de exposición.
4. Formular el motor como optimización multiobjetivo o como riesgo mínimo con límite de desvío.
5. Evaluar con pares origen–destino y métricas reproducibles, no solo mediante inspección visual.
6. Diseñar explicaciones por tramo: iluminación reportada, actividad comercial, evidencia delictual, horario y cobertura.

#### Prioridad posterior

1. Calibrar pesos con datos históricos o validación institucional.
2. Probar sensibilidad: cuánto cambia la ruta cuando varían pesos u horarios.
3. Incorporar actualización temporal y decaimiento de incidentes antiguos.
4. Añadir crowdsourcing con moderación, reputación, caducidad y prevención de abuso.
5. Explorar modelos espaciales más sofisticados solo cuando exista suficiente dato para validarlos.

La IA generativa puede interpretar consultas y producir explicaciones, pero no debería inventar el score ni reemplazar la lógica determinista y auditable del motor.

### R1.5. Mejoras sugeridas a la investigación de negocio

La investigación es sólida en problema, narrativa, evidencia y competidores. Para convertirla en un plan de validación comercial faltan principalmente elementos operativos:

- **segmento inicial más estrecho:** por ejemplo, estudiantes que salen de campus durante la tarde y noche;
- **comprador inicial definido:** usuario individual, universidad o municipalidad;
- **hipótesis medibles:** porcentaje que elegiría una ruta cinco minutos más larga, intención de uso recurrente y disposición a compartir reportes;
- **unidad económica de afiliados:** confirmar que Uber, DiDi u otro actor ofrece un programa aplicable en Chile antes de incluir ingresos en proyecciones;
- **riesgo legal y reputacional:** lenguaje de no garantía, privacidad de ubicación y protocolo ante datos erróneos;
- **plan de piloto:** zona, socio, duración, datos disponibles y criterio de éxito;
- **métricas de calidad:** cobertura de segmentos, calibración del riesgo, estabilidad de rutas, desvío medio y confianza del usuario.

El mejor “ask” sigue siendo financiar validación de datos y un piloto institucional, porque ataca directamente el cuello de botella real y fortalece la barrera competitiva.

### R1.6. Recomendación para la demo y el pitch

#### Para la demo

Con cuatro horas restantes, no se debería intentar implementar el motor completo ni el ruteo de buses. La prioridad es una experiencia estable que muestre:

1. un origen y destino reconocibles;
2. una ruta rápida y una alternativa de menor riesgo estimado;
3. tiempo adicional y diferencia de score;
4. segmentos problemáticos destacados;
5. una explicación concreta del intercambio, por ejemplo: “+4 min; evita dos segmentos con menor iluminación reportada y menor actividad nocturna”.

Los recorridos preparados son aceptables si se dice explícitamente:

> “Este prototipo muestra la experiencia del motor calle por calle que estamos validando.”

Dado el estado actual documentado del repositorio, la opción más segura es usar la funcionalidad real ya existente y preparar uno o dos casos conocidos como respaldo. No conviene sustituir el prototipo funcional por una maqueta nueva a última hora.

#### Para el pitch

Las bases permiten llevar prototipos u objetos, pero prohíben el apoyo audiovisual con láminas o presentaciones. La app puede respaldar la capacidad de ejecución y la ronda de preguntas, pero el discurso de tres minutos debe sostenerse por sí solo e incluir:

- problema;
- propuesta de valor;
- solución;
- modelo de negocios;
- equipo;
- proyecciones;
- próximos pasos.

La narrativa recomendada es:

> “Google te dice qué ruta es más rápida. Ojo al Paso quiere ayudarte a elegir qué calles recorrer cuando seguridad y tiempo importan a la vez. No prometemos eliminar el riesgo: lo hacemos visible, comparable y accionable.”

### R1.7. Decisión recomendada

Para hoy:

- congelar el motor actual;
- verificar dos búsquedas reales y un caso preparado de respaldo;
- pulir únicamente la claridad visual si existe un defecto bloqueante;
- practicar el pitch y las respuestas sobre datos, competencia y garantías;
- presentar el optimizador calle por calle como el siguiente hito, no como algo ya validado si aún no lo está.

Para después del concurso:

- adoptar segmentos dirigidos como unidad de modelado;
- construir un costo de riesgo auditable con incertidumbre;
- generar una frontera de alternativas tiempo–riesgo;
- validar el sistema mediante un piloto con datos locales de mayor granularidad.

### R1.8. Fuentes internas revisadas

- [`prompt1.md`](./prompts/prompt1.md)
- [`INVESTIGACION_OJO_AL_PASO_SHARK_TANK.md`](./INVESTIGACION_OJO_AL_PASO_SHARK_TANK.md)
- [`PLAN_SHARK_TANK.md`](./PLAN_SHARK_TANK.md)
- [`AGENTS.md`](../AGENTS.md)
- [`shark-tank.pdf`](../shark-tank.pdf)

---

## Respuesta 2 — Propagación, independencia de IA y demo hardcodeada

### R2.1. Opinión directa sobre los comentarios a la respuesta 1

#### Comentario 1: el prototipo actual es un motor básico que compara candidatas

**Estoy de acuerdo con el diagnóstico general, pero no con la descripción exacta de Gemini.**

Es correcto considerar el prototipo como una validación interna del concepto y no como el motor que materializa la visión final. Su limitación principal es que todavía trabaja sobre un conjunto pequeño de rutas cuya geometría depende de Google, incluso cuando añade candidatos mediante puntos intermedios. Eso significa que el sistema compara rutas posibles, pero todavía no puede explorar libremente toda la red de calles ni afirmar que encontró el mejor compromiso global entre tiempo y riesgo.

La diferencia factual es que el código actual no envía esas rutas a Gemini para que el modelo escoja arbitrariamente. Gemini interpreta la consulta; el score y la selección se realizan mediante funciones locales. Si el comentario se refiere a una versión anterior o a la intención original, la crítica sigue siendo válida para esa versión. Para describir el repositorio actual, en cambio, conviene hablar de un **motor heurístico determinista limitado por la generación de candidatas de Google**.

Mi opinión es que este estado es completamente aceptable como prototipo. El error sería venderlo como un optimizador calle por calle terminado, no usarlo para validar la experiencia y las reglas iniciales.

#### Comentario 2: propagar scores es preferible a evaluar calles mediante noticias o agentes

**Coincido con la intuición y considero que es la dirección correcta, con una condición importante: la propagación debe poder demostrar que predice mejor que un baseline simple.**

Entre un índice reproducible derivado de datos espaciales existentes y una opinión generada en runtime por un agente, prefiero claramente el primero. Tiene varias ventajas:

- entrega el mismo resultado ante las mismas entradas;
- permite inspeccionar qué datos influyeron;
- se puede ejecutar sin una API generativa;
- se puede someter a validación y corregir;
- evita que una noticia aislada o una alucinación altere una recomendación sensible.

Mi único reparo es llamar “empírico” al score de una calle sin observaciones como si fuera un dato medido. Su **fundamento** puede ser empírico, pero el valor sigue siendo una inferencia. La cercanía a una calle peligrosa no demuestra por sí sola que la calle vecina también lo sea. Sin evaluación, la propagación podría extender errores con una apariencia de precisión matemática.

Por eso no descartaría la idea; la convertiría en el primer baseline serio del producto. Guardaría por separado el score estimado, su confianza y su origen, y comprobaría su calidad ocultando calles conocidas para intentar reconstruirlas. Si supera el promedio comunal, el vecino más cercano y otras reglas simples, entonces existe evidencia concreta de que aporta valor.

#### Comentario 3: evitar que la aplicación dependa permanentemente de agentes y tokens

**Estoy muy de acuerdo con la decisión arquitectónica y bastante de acuerdo con el argumento comercial.**

El mercado está saturado de productos cuya única diferenciación visible es encadenar una interfaz con un modelo generativo. Para Ojo al Paso, centrar el relato en Gemini diluiría el activo realmente interesante: el modelo territorial, los datos locales y el motor que transforma riesgo en una variable de navegación.

Además, una recomendación relacionada con seguridad se beneficia especialmente de ser reproducible y auditable. Poder explicar una ruta mediante datos y reglas es más defendible que responder “el modelo consideró que era mejor”. La independencia también reduce latencia, fallas por cuota, cambios de proveedor y exposición de datos de ubicación.

Donde discrepo es en afirmar que los costos de IA probablemente solo subirán. Es posible que bajen por competencia y mejoras de eficiencia. Un inversionista tampoco premiará automáticamente a un producto por no usar IA: premiará mejores márgenes, menor riesgo operativo y una ventaja difícil de copiar. Por eso formularía el punto así:

> “Nuestra función central no depende del precio, disponibilidad ni criterio de un modelo externo. Podemos usar IA donde mejora la experiencia, pero el dato, el score y la decisión de ruta son nuestros.”

Esa posición es más fuerte que presentarse como una empresa anti-IA. Permite aprovecharla en lenguaje natural o explicaciones, manteniéndola reemplazable y fuera del núcleo del producto.

#### Comentario 4: usar una demo principalmente frontend y hardcodeada

**Estoy de acuerdo para este evento y este plazo.** Una demo preparada puede comunicar el producto mucho mejor que intentar terminar apresuradamente el motor definitivo. En una competencia de etapa inicial, demostrar con claridad la decisión que vivirá el usuario tiene más valor que construir una pieza técnica incompleta e inestable durante las últimas horas.

La condición es no hacer pasar valores hardcodeados por resultados calculados en vivo. La frase correcta es “este prototipo muestra la experiencia del motor que estamos construyendo”. Esa transparencia no perjudica al equipo; muestra que distingue entre validar una interfaz y validar un algoritmo.

También mantengo una preferencia práctica: **usaría el pitch sin demo como versión principal** y reservaría el prototipo para la ronda de preguntas, salvo que los jueces puedan ver la pantalla con claridad. Como no hay proyector ni apoyo audiovisual, una pantalla pequeña puede consumir tiempo sin aportar información al público. Si se usa durante el pitch, debe requerir una sola acción, durar menos de 35 segundos y poder narrarse completamente aunque nadie vea la pantalla.

#### Síntesis de mi opinión

Tus comentarios mejoran la dirección planteada en la respuesta 1. En particular:

- la propagación merece ser desarrollada, no tratada solo como una aproximación ingenua;
- el motor propio y determinista debe ser el centro técnico y comercial;
- Gemini debe ser una comodidad opcional, no una dependencia estructural;
- la demo hardcodeada es una decisión sensata si se presenta como prototipo de experiencia;
- la mayor corrección necesaria es de lenguaje: “basado en datos” no equivale automáticamente a “validado”, y “sin dependencia de IA” debe venderse como control, auditabilidad y margen, no como una predicción sobre el precio futuro de los tokens.

### R2.2. Rectificación del diagnóstico del prototipo actual

La aclaración describe bien la limitación conceptual de una versión que solo puntuara alternativas de Google mediante Gemini, pero **no coincide con el código que existe actualmente en el repositorio**.

La revisión puntual del flujo muestra lo siguiente:

- [`asistente.js`](../frontend/src/lib/asistente.js) usa Gemini para interpretar lenguaje natural y extraer origen, destino, hora, modo y paradas;
- [`seguridad.js`](../frontend/src/lib/seguridad.js) calcula el score mediante reglas locales y deterministas;
- la misma biblioteca selecciona entre candidatas usando una mejora mínima de 8 puntos y un desvío máximo de 10 minutos;
- [`rutas.js`](../frontend/src/lib/rutas.js) solicita las alternativas peatonales disponibles a Google y puede hacer hasta dos consultas adicionales con puntos intermedios ubicados en corredores de mejor score;
- [`MapView.jsx`](../frontend/src/MapView.jsx) coordina esa evaluación y no envía las rutas a Gemini para que el modelo elija.

Por lo tanto, la descripción precisa del prototipo actual es:

> Google genera la geometría de las rutas candidatas; un módulo local las puntúa y compara; Gemini solo interpreta la consulta del usuario.

Esto sigue siendo un motor preliminar y heurístico. Google conserva el control de las calles de conexión y el sistema todavía no construye libremente el camino óptimo sobre toda la red. Sin embargo, ya está más desacoplado de la IA generativa de lo que plantea la extensión del prompt.

Esta distinción es importante para el pitch: afirmar que Gemini elige arbitrariamente la ruta subestimaría el trabajo ya construido y debilitaría innecesariamente la propuesta.

### R2.3. La propagación sí es una dirección defendible

La motivación detrás de propagar scores desde segmentos conocidos es razonable. Entre:

- una inferencia reproducible basada en datos espaciales y urbanos existentes; y
- una clasificación opaca producida en runtime por noticias recuperadas o por un agente generativo,

la primera opción es mejor como base de producto. Es más barata, auditable, estable y fácil de validar.

La precisión necesaria es que un modelo basado en datos no pasa a ser automáticamente “empírico” en todos sus resultados. El dato de una calle observada tiene sustento empírico directo; el score propagado de una calle sin datos es una **estimación derivada de evidencia empírica**. Su validez depende de que el método consiga predecir segmentos conocidos que se ocultaron durante la evaluación.

#### Propuesta concreta de propagación

Una primera versión seria puede formularse como propagación de etiquetas sobre un grafo:

1. cada segmento entre intersecciones es un nodo del problema de estimación —y una arista del grafo de ruteo—;
2. los segmentos con datos confiables actúan como semillas;
3. dos segmentos reciben mayor relación si están cerca **a través de la red** y comparten contexto urbano;
4. el score de los segmentos sin observación se ajusta para parecerse a vecinos relevantes sin mover excesivamente las semillas;
5. barreras físicas y cambios fuertes de uso de suelo reducen o cortan la propagación.

Una ponderación inicial podría seguir esta forma:

```text
peso(i, j) = exp(-distancia_en_red(i, j) / h) × similitud_contextual(i, j)
```

La similitud contextual puede considerar tipo de vía, iluminación reportada, densidad comercial, transporte cercano, comuna y horario. Esto conserva la intuición original de cercanía, pero evita tratar como equivalentes dos calles próximas separadas por una barrera o con funciones urbanas distintas.

#### Requisitos para que sea defendible

- **Validación espacial:** ocultar grupos completos de segmentos conocidos y medir qué tan bien se reconstruyen; no dividir puntos vecinos al azar, porque eso inflaría los resultados.
- **Confianza separada:** disminuirla cuando faltan semillas cercanas, atributos OSM o datos recientes.
- **Proveniencia visible:** distinguir `observado`, `estimado_por_contexto` e `imputado_por_vecindad`.
- **Anclaje:** los valores inferidos no deben sobreescribir las observaciones confiables.
- **Control de suavizado:** impedir que un hotspot pequeño contamine barrios completos o que todos los segmentos converjan al promedio.
- **Comparación con baselines:** demostrar que el modelo supera alternativas simples, como el promedio de la comuna o el vecino más cercano.

El resultado inicial no tiene que ser perfecto. Tiene que ser mejor que una regla trivial, transparente sobre su incertidumbre y capaz de mejorar cuando aparecen nuevos datos.

### R2.4. Reducir la dependencia de IA es una ventaja real, con un matiz

El argumento estratégico es sólido, pero conviene formularlo de manera positiva y verificable. El valor no está en ser “anti-IA”, sino en que la decisión crítica del producto no dependa de una caja negra ni de una llamada por tokens.

Una arquitectura adecuada sería:

```text
Formulario o consulta natural
            ↓
Parser opcional con Gemini
            ↓
Origen, destino y hora estructurados
            ↓
Datos locales + score determinista + motor de ruteo propio
            ↓
Alternativas y explicación auditable
```

Si Gemini falla o no existe una API key, el usuario debería poder ingresar origen, destino y hora mediante controles normales. La navegación central seguiría funcionando. En el código actual, la búsqueda manual ya ofrece una base para esa separación.

Las ventajas para un inversionista son más amplias que el ahorro de tokens:

- costo marginal predecible;
- menor dependencia de un proveedor;
- menor latencia y menos puntos de falla;
- resultados reproducibles;
- mayor auditabilidad ante una recomendación sensible;
- posibilidad de ejecutar parte del sistema localmente;
- mayor privacidad al no enviar rutas completas a un modelo generativo.

No conviene afirmar que los costos de IA necesariamente seguirán subiendo: también pueden bajar por competencia y eficiencia. La formulación defendible es que **son costos y condiciones controlados por terceros**, mientras que un motor propio permite gobernar la lógica crítica y sus márgenes.

La frase de pitch recomendada es:

> “Usamos IA para facilitar la conversación, no para decidir qué calle es segura. Esa decisión la toma nuestro motor con datos trazables y reglas auditables.”

Esto evita la impresión de “otro wrapper de IA” y concentra el valor en la capa de inteligencia territorial.

### R2.5. Cómo debe usarse la demo hardcodeada

Una demo frontend hardcodeada es apropiada para este concurso porque las bases aceptan prototipos y el proyecto se presenta como una iniciativa en etapa inicial. Su función no es probar que el optimizador ya está terminado, sino hacer tangible la decisión que el producto permitirá tomar.

La demo debería tener un solo recorrido preparado y una interacción breve:

1. mostrar origen, destino y hora;
2. presentar “ruta rápida” y “ruta de menor riesgo estimado”;
3. indicar el costo de tiempo de la segunda;
4. destacar uno o dos segmentos que explican la diferencia;
5. cerrar inmediatamente la demo y volver al relato.

No debe depender de red, Gemini, Google ni claves durante el pitch. Si muestra valores ilustrativos, el equipo debe describirla como “prototipo de experiencia” y no afirmar que esos números fueron calculados en vivo.

El riesgo escénico principal es la visibilidad: una pantalla de teléfono puede ser clara para los jueces cercanos y completamente invisible para el resto. Por eso, el presentador debe narrar en voz alta el resultado completo; la comprensión del pitch no puede depender de que alguien alcance a leer la interfaz.

### R2.6. Cambios recomendados en el plan y la investigación

El plan técnico debería incorporar explícitamente:

- un baseline de propagación sobre segmentos;
- validación espacial y métricas de error;
- score, confianza y proveniencia como campos separados;
- un modo manual completamente independiente de Gemini;
- IA generativa como capa opcional de interacción, no como motor de decisión;
- comparación futura entre el motor propio y las candidatas de Google.

La investigación de negocio debería agregar:

- independencia de proveedores como ventaja operativa;
- auditabilidad como requisito de confianza y posible ventaja B2B/B2G;
- costos por ruta y margen bruto estimado para cada arquitectura;
- un mensaje claro de que el moat es dato local + calibración + convenios, no la IA ni el algoritmo aislado;
- una separación estricta entre lo que muestra el prototipo y lo que ya fue validado.

### R2.7. Conclusión actualizada

La propagación no debe descartarse: es un baseline técnico sensato y coherente con la propuesta de negocio si se implementa sobre segmentos, usa contexto urbano, conserva las observaciones y comunica incertidumbre. Es claramente preferible a pedirle a un agente que improvise el riesgo de cada calle.

La independencia de IA también es una ventaja defendible, especialmente por confiabilidad, auditabilidad y control de costos. De hecho, el código actual ya avanza en esa dirección: Gemini interpreta la consulta, pero el scoring y la selección se ejecutan localmente.

Para el concurso, el mejor uso del tiempo es una demo frontend estable y preparada, acompañada de una descripción honesta del motor futuro. Los dos guiones propuestos están en [`PITCHES_OJO_AL_PASO_3_MIN.md`](./PITCHES_OJO_AL_PASO_3_MIN.md).
