# Investigación estratégica — Ojo al Paso
## CAi Shark Tank 2026

**Fecha:** 26 de agosto de 2026  
**Objetivo:** reunir evidencia, cifras, competidores, diferenciadores y argumentos útiles para construir y defender el pitch de Ojo al Paso.

---

# 1. Tesis central del proyecto

Ojo al Paso no debería venderse simplemente como “una app que muestra rutas seguras” ni como “Google Maps pero seguro”. Ese espacio ya tiene competidores.

La propuesta defendible es más precisa:

> **Ojo al Paso busca construir rutas a partir de la seguridad estimada de cada segmento de calle, en lugar de limitarse a escoger la menos riesgosa entre un conjunto de rutas ya generadas por otro navegador.**

La visión tecnológica es convertir la seguridad urbana en una **variable de optimización de navegación**, junto con distancia y tiempo.

En términos conceptuales:

```text
segmento de calle
      │
      ├── historial delictual georreferenciado
      ├── tipo y severidad del delito
      ├── recencia
      ├── día / hora
      ├── iluminación
      ├── características urbanas
      ├── transporte cercano
      ├── actividad peatonal/comercial
      ├── incidentes recientes
      └── feedback comunitario validado
              ↓
       RIESGO ESTIMADO
              ↓
        motor de ruteo
              ↓
  ruta que optimiza seguridad + tiempo
```

---

# 2. El problema está fuertemente respaldado por datos en Chile

## 2.1. 65,5% se siente inseguro caminando solo de noche

La **ENUSC 2025**, publicada en julio de 2026, reporta que **65,5% de las personas se siente insegura caminando sola por su barrio cuando está oscuro**.

Este dato calza casi exactamente con el caso de uso de Ojo al Paso:

- persona caminando;
- entorno urbano cercano;
- horario nocturno;
- percepción de inseguridad durante el trayecto.

### Fuente
Subsecretaría de Prevención del Delito — ENUSC 2025:  
https://subprevenciondeldelito.gob.cl/noticia/enusc-2025-bajan-la-victimizacion-de-hogares-por-delitos-violentos-y-la-percepcion-de-inseguridad-en-el-pais/

---

## 2.2. La inseguridad cambia la forma en que las personas usan la ciudad

La **Política Nacional de Seguridad Pública 2025–2031** recoge resultados de la ENUSC 2024 según los cuales:

- **64,3%** había evitado transitar por ciertas áreas por temor a ser víctima de un delito.
- **59,2%** había dejado de salir de noche por el mismo motivo.

Esto permite formular el problema de una manera más profunda:

> **La inseguridad no solo genera miedo: cambia la manera en que las personas se mueven por la ciudad.**

### Fuente
Biblioteca del Congreso Nacional — Política Nacional de Seguridad Pública 2025–2031:  
https://www.bcn.cl/leychile/navegar?idNorma=1220944

---

## 2.3. La Región Metropolitana es un mercado inicial suficientemente grande

Según los primeros resultados del **Censo 2024**, la Región Metropolitana tiene aproximadamente **7,4 millones de habitantes**, cerca del **40% de la población censada del país**.

Esto no significa que esos 7,4 millones sean automáticamente clientes, pero sí permite defender que comenzar en Santiago ofrece:

- una gran masa crítica;
- alta densidad urbana;
- viajes peatonales y multimodales;
- diversidad de comunas y contextos;
- alta utilización de transporte público;
- potencial de expansión posterior a otras ciudades.

### Fuente
INE — Censo 2024:  
https://censo2024.ine.gob.cl/primeros-resultados-del-censo-2024-18-480-432-personas-fueron-censadas-en-chile-manteniendose-la-tendencia-de-envejecimiento-de-la-poblacion/

---

# 3. La idea de analizar seguridad calle por calle tiene fundamento criminológico

Este es probablemente el respaldo científico más importante para la propuesta de valor.

## 3.1. El delito está extremadamente concentrado en pocos segmentos de calle

Un estudio publicado en **Crime Science** analizó datos georreferenciados de **42 ciudades latinoamericanas** y encontró que, en promedio:

> **el 50% de los delitos se concentraba en apenas alrededor del 2,5% de los segmentos de calle.**

Para homicidios, la concentración era aún mayor: aproximadamente la mitad se producía en no más del 1,4% de los segmentos.

La implicancia para Ojo al Paso es enorme:

> **dos calles cercanas, incluso dentro de la misma comuna, pueden tener perfiles de riesgo muy distintos.**

Por lo tanto, una clasificación a nivel de comuna es demasiado gruesa para construir rutas peatonales realmente orientadas a seguridad.

### Fuente
Crime Science — Crime concentration at places in Latin America:  
https://link.springer.com/article/10.1186/s40163-019-0100-5

---

## 3.2. Evidencia previa del BID apunta en la misma dirección

Un estudio anterior del **Banco Interamericano de Desarrollo** encontró que, en ciudades latinoamericanas, aproximadamente **50% del crimen se concentraba en 3%–7,5% de los segmentos de calle**.

También observó que algunos hotspots pueden aparecer o desaparecer con el tiempo, lo cual respalda que un sistema de seguridad no debería tratar el riesgo como algo completamente estático.

### Fuente
BID — Crime Concentration and Hot Spot Dynamics in Latin America:  
https://publications.iadb.org/en/crime-concentration-and-hot-spot-dynamics-latin-america

---

# 4. La propia política pública chilena reconoce la lógica de “rutas seguras”

La **Política Nacional de Seguridad Pública 2025–2031** reconoce explícitamente que el delito y la desorganización social pueden concentrarse territorialmente en barrios, condominios **e incluso calles**.

Además, incluye entre sus líneas de acción el diseño e implementación de una **red de rutas seguras** alrededor de:

- establecimientos educacionales;
- centros de salud;
- centros comunitarios;
- otros servicios relevantes.

Esto es extremadamente útil para el proyecto porque demuestra que la idea de “rutas seguras” no es una ocurrencia aislada del equipo: existe una necesidad reconocida a nivel de política pública.

### Implicancia comercial

Esto fortalece una futura línea **B2B/B2G** con:

- municipalidades;
- universidades;
- campus;
- instituciones públicas;
- centros de salud;
- empresas con trabajadores que salen de noche.

### Fuente
Biblioteca del Congreso Nacional — Política Nacional de Seguridad Pública 2025–2031:  
https://www.bcn.cl/leychile/navegar?idNorma=1220944

---

# 5. Los datos policiales por sí solos no cuentan toda la historia

La **ENUSC 2025** muestra que aproximadamente **41,3% de los hogares víctimas de delitos violentos realizó una denuncia formal**.

Dicho de otra manera, existe una **cifra oculta cercana al 58,7%** para delitos violentos contra hogares.

Esto tiene una consecuencia estratégica:

> Una versión madura de Ojo al Paso no debería depender exclusivamente de denuncias policiales.

La capa de riesgo podría combinar, con metodología adecuada:

- datos oficiales;
- contexto urbano;
- horario;
- incidentes recientes;
- información comunitaria validada;
- datos institucionales;
- feedback de usuarios.

### Fuentes
INE — ENUSC 2025:  
https://www.ine.gob.cl/sala-de-prensa/prensa/general/noticia/2026/07/10/7-9-de-los-hogares-a-nivel-nacional-fue-v%C3%ADctima-de-delitos-violentos-en-los-%C3%BAltimos-doce-meses-seg%C3%BAn-la-enusc-2025

INE — Seguridad Ciudadana:  
https://www.ine.gob.cl/estadisticas-por-tema/sociedad-y-condiciones-de-vida/seguridad-ciudadana

---

# 6. Variables urbanas como iluminación sí tienen respaldo empírico

Un experimento aleatorizado en Nueva York estudió el efecto de instalar iluminación adicional en espacios urbanos y encontró una reducción relevante de delitos graves al aire libre durante la noche en las zonas intervenidas.

El resultado reportado fue de al menos **36% de reducción en delitos graves nocturnos al aire libre** en las comunidades estudiadas.

### Importante

No se debe afirmar:

> “Más iluminación reduce 36% el crimen en Santiago”.

Eso sería extrapolar indebidamente un resultado de Nueva York.

La formulación correcta sería algo como:

> “Existe evidencia experimental de que variables del entorno urbano, como la iluminación, pueden afectar la seguridad nocturna.”

### Fuente
NBER — Street Lighting and Crime:  
https://www.nber.org/papers/w25798

---

# 7. Infraestructura de datos disponible en Chile

## 7.1. CEAD

El **Centro de Estudios y Análisis del Delito (CEAD)** dispone de sistemas especialmente relevantes para una futura versión seria del producto.

### SIED Estadístico

Incluye datos oficiales de casos policiales por:

- región;
- provincia;
- comuna.

### SIED Territorial

Trabaja con casos policiales **georreferenciados** y permite:

- generar mapas;
- identificar concentraciones delictuales;
- analizar sectores y barrios;
- relacionar delitos con escuelas, comercio, paraderos y Metro;
- generar hotspots;
- filtrar temporalmente;
- consultar áreas específicas.

El acceso detallado está orientado principalmente a usuarios registrados y capacitados, incluyendo municipalidades y otros organismos.

### Oportunidad

En lugar de tratar esto como una limitación, puede convertirse en parte de la estrategia:

> **buscar un piloto con una municipalidad o institución que permita validar el motor con datos locales de mayor granularidad.**

### Fuentes
CEAD — Sala CEAD:  
https://cead.spd.gov.cl/sala-cead/

CEAD — Sistemas internos:  
https://cead.spd.gov.cl/sistemas-internos-cead/

---

# 8. Un segmento inicial especialmente defendible: estudiantes y adultos jóvenes

La **ENUSC 2024** mostró que el grupo de **15 a 29 años** tenía la mayor victimización personal por delitos violentos entre los grupos etarios reportados:

- 15–29 años: **7,6%**
- 30–59 años: **6,4%**
- 60 años o más: **2,4%**

Esto permite justificar un primer segmento de mercado como:

> **estudiantes y adultos jóvenes que se desplazan caminando o en transporte público, especialmente durante la tarde y noche.**

### Fuente
Ministerio de Seguridad Pública — ENUSC 2024:  
https://minsegpublica.cl/enusc-2024-victimizacion-por-delitos-violentos-se-mantiene-estable-a-nivel-nacional-como-tambien-en-14-de-las-16-regiones-del-pais/

---

# 9. Integración con plataformas de movilidad: oportunidad futura

Un estudio del **Centro UC de Encuestas y Estudios Longitudinales** estimó que en octubre de 2025 existían aproximadamente **3,5 millones de usuarios de plataformas de movilidad en Chile**, con alrededor de **20,1 millones de viajes en ese mes**.

Esto respalda que la futura recomendación “¿camino o pido un auto?” podría conectarse con un mercado real de gran escala.

### Precaución

Parte de los datos utilizados por el estudio provienen de Uber, por lo que conviene transparentar la fuente si se usa la cifra en una conversación técnica o académica.

### Fuente
Centro UC de Encuestas y Estudios Longitudinales:  
https://encuestas.uc.cl/?p=2792

---

# 10. Competidores y soluciones existentes

## 10.1. Google Maps / Google Routes

Google ofrece:

- rutas peatonales;
- alternativas;
- waypoints;
- optimización principalmente basada en movilidad/tiempo/distancia;
- restricciones y preferencias de transporte.

Sin embargo, la API pública de Google Routes no expone un modificador específico de **riesgo criminal o seguridad urbana** para construir una ruta peatonal.

### Implicancia

Google es la referencia de navegación, pero no resuelve directamente el problema específico que Ojo al Paso quiere atacar.

### Fuente
Google Routes — RouteModifiers:  
https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteModifiers

---

## 10.2. SOSAFE — Chile

SOSAFE se enfoca en:

- reportes comunitarios;
- incidentes cercanos;
- alertas;
- mapas;
- comunicación entre usuarios, comunidades e instituciones;
- soluciones B2B/B2G para municipalidades y organizaciones.

También cuenta con funcionalidades relacionadas con alertas durante trayectos.

### Diferencia respecto de Ojo al Paso

SOSAFE se aproxima principalmente a:

> **“¿Qué está pasando cerca?”**

Ojo al Paso busca resolver:

> **“¿Por dónde debería moverme?”**

### Fuente
SOSAFE — FAQs:  
https://store.sosafeapp.com/pages/faqs

---

## 10.3. Mi Patente — Chile

Este es uno de los competidores más relevantes encontrados.

Mi Patente ofrece opciones como:

- “Más Segura”;
- “Más Rápida”;
- “Más Corta”;
- zonas de riesgo;
- reportes e incidentes;
- modo caminar.

Sus notas de versión indican que el sistema **compara hasta tres trazados** y selecciona entre ellos considerando variables de riesgo.

### Por qué es muy relevante

Esto se parece bastante al enfoque limitado que actualmente tiene el prototipo de Ojo al Paso:

```text
motor externo genera rutas
        ↓
Ruta A
Ruta B
Ruta C
        ↓
se calcula score
        ↓
se elige la mejor
```

### Diferenciador posible de Ojo al Paso

La visión futura de Ojo al Paso es distinta:

```text
red completa de calles
        ↓
score individual por segmento
        ↓
algoritmo de caminos
        ↓
ruta construida específicamente
para minimizar riesgo estimado
```

### Fuente
App Store — Mi Patente:  
https://apps.apple.com/cl/app/mi-patente/id6759101158

---

## 10.4. My Safetipin — internacional

My Safetipin es un competidor conceptual directo.

Incluye:

- safety score;
- rutas más seguras;
- tracking;
- auditorías urbanas;
- variables como iluminación, visibilidad, presencia de personas, transporte público, senderos y apertura del espacio.

### Implicancia

Demuestra que existe una categoría internacional de navegación y seguridad urbana.

También significa que no se debe afirmar:

> “Somos los primeros del mundo en hacer rutas seguras.”

### Fuente
Safetipin — documentos y reportes:  
https://safetipin.com/wp-content/uploads/2023/09/Safetipin-Annual-Report_2022-23.pdf

---

## 10.5. ZoneScout

ZoneScout ofrece:

- safety score;
- mapas de crimen;
- rutas peatonales orientadas a evitar áreas con incidentes;
- cobertura limitada a determinadas ciudades internacionales.

### Implicancia

Valida nuevamente la categoría, pero no resuelve específicamente el mercado chileno.

### Fuente
App Store — ZoneScout:  
https://apps.apple.com/cl/app/zonescout-crime-map-safety/id6760105754

---

## 10.6. Tranzia

Tranzia incluye:

- heatmaps;
- safe-route planning;
- navegación a pie/transporte/auto;
- tracking;
- reportes comunitarios.

### Implicancia

Otra señal de que “rutas seguras” es una categoría internacional en desarrollo.

### Fuente
Google Play — Tranzia:  
https://play.google.com/store/apps/details?id=com.tranzia.mobile

---

## 10.7. Llego IA — Perú

Llego IA ofrece en Lima funcionalidades de seguridad de rutas utilizando:

- datos oficiales;
- horario;
- información territorial;
- ayuda y viaje compartido.

Su evaluación actual se apoya de forma importante en riesgo por **distrito + hora**, lo que abre un espacio para diferenciarse mediante granularidad a nivel de calle.

### Fuente
Llego IA:  
https://llego.pe/

---

# 11. Qué NO puede ser el diferenciador

Evitar afirmaciones como:

- “Somos la primera app de rutas seguras.”
- “Nadie hace esto.”
- “Google Maps no considera nada relacionado con seguridad.”
- “Encontramos la ruta más segura.”
- “Nuestra IA garantiza que no te pasará nada.”

Todas esas afirmaciones son demasiado fuertes o directamente falsas.

---

# 12. Diferenciador recomendado

La formulación más defendible es:

> **Ojo al Paso busca construir la ruta desde las calles, no limitarse a elegir la menos riesgosa entre rutas que otro navegador ya decidió.**

Otra versión:

> **Modelamos la ciudad como una red de segmentos y buscamos que cada calle tenga un costo dinámico de riesgo según datos delictuales, contexto urbano y horario. De esta forma, la seguridad pasa a ser una variable del algoritmo de ruteo.**

---

# 13. Fundamento técnico para el motor futuro

La arquitectura propuesta tiene respaldo en literatura académica.

## 13.1. Chicago / Philadelphia

Un trabajo publicado en **Information Systems** construyó redes urbanas utilizando OpenStreetMap, asignó riesgo a segmentos/edges mediante datos de delitos y formuló el problema como un shortest path biobjetivo:

- distancia;
- riesgo.

### Fuente
ScienceDirect — Safe routing in urban environments:  
https://www.sciencedirect.com/science/article/pii/S0306437915001854

---

## 13.2. Ciudad de México

Otro trabajo implementó un sistema en Ciudad de México combinando:

- datos oficiales;
- crowdsourcing;
- red vial;
- pesos de criminalidad;
- algoritmo basado en Dijkstra.

El objetivo era generar rutas más seguras considerando ubicación y tiempo.

### Fuente
Wiley — Safe routing / crime-aware navigation:  
https://onlinelibrary.wiley.com/doi/abs/10.1155/2016/8068209

---

# 14. El verdadero “moat” no es el algoritmo

Dijkstra no es difícil de copiar.

OpenStreetMap tampoco.

Gemini tampoco.

El activo difícil de replicar podría ser:

> **una capa de inteligencia de riesgo urbano específica de Santiago y posteriormente de Chile.**

Esa capa podría mejorar al incorporar:

- fuentes oficiales;
- datos municipales;
- datos urbanos;
- incidentes recientes;
- validación comunitaria;
- horarios;
- estacionalidad;
- feedback sobre rutas;
- calibración empírica del riesgo.

Mientras más datos locales y convenios se integren, más útil y difícil de replicar puede volverse el sistema.

---

# 15. Tres cifras especialmente útiles para el pitch

No conviene llenar un pitch de tres minutos con estadísticas. Las tres más fuertes son:

## Dato 1

> **65,5% de las personas en Chile se siente insegura caminando sola por su barrio cuando está oscuro.**

Uso: establecer inmediatamente la magnitud del problema.

---

## Dato 2

> **En un estudio de 42 ciudades latinoamericanas, aproximadamente 50% de los delitos se concentró en solo 2,5% de los segmentos de calle.**

Uso: justificar científicamente por qué importa analizar calle por calle.

---

## Dato 3

> **La Política Nacional de Seguridad Pública chilena reconoce que el delito se concentra incluso a nivel de calles y plantea explícitamente desarrollar redes de rutas seguras.**

Uso: demostrar relevancia institucional y futura oportunidad B2B/B2G.

---

# 16. Narrativa recomendada para conectar los datos

Una estructura conceptual fuerte podría ser:

> “Hoy, el 65,5% de las personas en Chile se siente insegura caminando sola por su barrio durante la noche. Pero el riesgo no se distribuye uniformemente: estudios en ciudades latinoamericanas muestran que la mitad del delito puede concentrarse en apenas una fracción de las calles. Entonces, si dos calles a 200 metros de distancia pueden tener riesgos distintos, ¿por qué nuestros navegadores siguen optimizando principalmente tiempo y distancia?”

Luego aparece Ojo al Paso.

---

# 17. Cómo presentar la demo hardcodeada de forma honesta

La demo hardcodeada puede funcionar perfectamente en un concurso de prototipos, siempre que no se haga pasar por un motor terminado.

### Evitar

> “Nuestro algoritmo ya calcula automáticamente esta ruta.”

### Mejor

> **“Este prototipo muestra la experiencia del motor de ruteo que estamos construyendo.”**

O:

> **“Hoy queremos mostrarles cómo se comportará nuestro motor cuando la seguridad de cada calle forme parte del cálculo de ruta.”**

La demo debería mostrar visualmente algo como:

```text
Ruta rápida
───────────────
12 min

Ruta Ojo al Paso
──────╮
      ╰────────
15 min

Evita segmentos con mayor riesgo estimado
```

El mensaje clave es:

> **Ojo al Paso puede aceptar algunos minutos adicionales si eso permite evitar segmentos con mayor riesgo estimado.**

---

# 18. Cómo responder si preguntan si el motor ya funciona de verdad

Respuesta sugerida:

> “El prototipo funcional actual ya integra mapas, búsqueda, datos y scoring. El optimizador calle por calle es el siguiente componente que estamos validando; la demo representa su comportamiento objetivo.”

Esto es transparente y evita perder credibilidad.

---

# 19. No vender miedo ni exagerar la situación del país

La ENUSC 2025 muestra mejoras en algunos indicadores respecto de 2024.

Por ejemplo:

- la victimización violenta de hogares bajó de 8,5% a 7,9%;
- también disminuyó la percepción de inseguridad en algunos indicadores.

Por lo tanto, evitar frases como:

> “Chile está cada vez más peligroso.”

No es necesario para defender el proyecto.

Una formulación más rigurosa es:

> **“Aunque algunos indicadores mejoraron, dos de cada tres personas todavía se sienten inseguras caminando solas de noche por su propio barrio.”**

---

# 20. Evitar prometer “la ruta más segura”

No existe una forma responsable de garantizar que una ruta sea objetivamente “la más segura”.

El delito es probabilístico, los datos son incompletos y siempre existe una cifra oculta.

Usar expresiones como:

- **ruta de menor riesgo estimado**;
- **ruta que prioriza seguridad**;
- **índice relativo de riesgo**;
- **alternativa que minimiza el riesgo estimado según los datos disponibles**.

Esto hace al proyecto más profesional y técnicamente defendible.

---

# 21. Q&A — preguntas probables y ejes de respuesta

## “¿Cómo saben que una calle es segura?”

No afirmar certeza absoluta.

Responder que el sistema busca estimar riesgo combinando múltiples señales:

- delito georreferenciado;
- contexto urbano;
- iluminación;
- transporte cercano;
- horario;
- actividad urbana;
- eventualmente reportes e información reciente.

---

## “¿Por qué no usar simplemente Google Maps?”

Porque Google optimiza muy bien movilidad, distancia y tiempo, pero la API pública no permite pedir directamente una ruta peatonal optimizada por riesgo criminal.

Ojo al Paso busca incorporar esa nueva variable al ruteo.

---

## “¿Qué los diferencia de Mi Patente?”

Mi Patente ya ofrece una opción de ruta segura y compara trazados existentes.

La visión diferencial de Ojo al Paso es construir el trayecto desde la red de calles mediante un score por segmento, en vez de limitarse a puntuar un pequeño conjunto de rutas generadas previamente.

---

## “¿Qué los diferencia de SOSAFE?”

SOSAFE ayuda principalmente a saber qué incidentes están ocurriendo alrededor.

Ojo al Paso quiere responder una pregunta distinta:

> **“Dado dónde estoy y hacia dónde voy, ¿por qué calles debería moverme?”**

---

## “¿Qué pasa si mandan a alguien por una ruta y ocurre un delito?”

Nunca garantizar seguridad.

El producto debe presentarse como apoyo a la toma de decisiones basado en riesgo estimado, no como garantía.

---

## “¿De dónde obtendrán datos suficientemente buenos?”

Roadmap posible:

1. datos abiertos;
2. OpenStreetMap/contexto urbano;
3. datos oficiales agregados;
4. CEAD/SIED mediante alianzas;
5. municipalidades;
6. comunidad validada;
7. calibración con uso real.

---

## “¿Qué impide que Google los copie?”

No defender el algoritmo como barrera.

La defensa futura está en:

- datos locales;
- convenios;
- modelos calibrados a Santiago;
- feedback de usuarios;
- inteligencia territorial acumulada;
- relaciones B2B/B2G;
- especialización en seguridad urbana.

---

# 22. Posible posicionamiento comercial

En lugar de pensar solo en una app B2C de $2.990 al mes, existe una oportunidad más amplia:

## B2C

- navegación peatonal segura;
- premium;
- tracking;
- alertas;
- historial;
- recomendaciones de movilidad.

## Afiliación / movilidad

- Uber;
- DiDi;
- Cabify;
- taxis;
- micromovilidad.

## B2B / B2G

- municipalidades;
- universidades;
- campus;
- empresas con turnos nocturnos;
- centros de salud;
- aseguradoras;
- planificación urbana;
- seguridad corporativa.

La visión más ambiciosa es que Ojo al Paso se convierta en una **capa de inteligencia de riesgo urbano**, donde la ruta peatonal sea el primer producto visible.

---

# 23. Idea de “ask” para el Shark Tank

En vez de:

> “Queremos los $500.000 para terminar la app.”

Una formulación más estratégica podría ser:

> **“Queremos utilizar este financiamiento para validar el motor de ruteo calle por calle con mejores datos locales y desarrollar un piloto con una institución o municipalidad.”**

Esto conecta:

- premio;
- validación;
- datos;
- política pública;
- potencial B2G;
- siguiente hito concreto.

---

# 24. Resumen ejecutivo

### Problema

Una proporción muy alta de las personas en Chile se siente insegura al caminar sola de noche, y el temor modifica cómo usan la ciudad.

### Insight

El riesgo no está distribuido homogéneamente: el delito puede concentrarse fuertemente en unos pocos segmentos de calle.

### Oportunidad

Los navegadores tradicionales optimizan principalmente tiempo y distancia. Existe espacio para convertir **seguridad/riesgo** en una variable explícita de ruteo.

### Producto

Ojo al Paso busca modelar la red peatonal calle por calle y generar rutas que reduzcan riesgo estimado aceptando, cuando sea razonable, un pequeño costo adicional en tiempo.

### Diferenciador

No limitarse a puntuar tres rutas ya construidas, sino construir el trayecto desde segmentos individuales con costos dinámicos de riesgo.

### Ventaja futura

Una capa de inteligencia de seguridad urbana específica para Santiago/Chile, alimentada por datos locales y potencialmente validada mediante alianzas institucionales.

### Posicionamiento

> **Ojo al Paso no es solo un mapa de crimen: busca convertir la seguridad en una variable de navegación.**

---

# 25. Fuentes principales

- ENUSC 2025 — Subsecretaría de Prevención del Delito  
  https://subprevenciondeldelito.gob.cl/noticia/enusc-2025-bajan-la-victimizacion-de-hogares-por-delitos-violentos-y-la-percepcion-de-inseguridad-en-el-pais/

- ENUSC 2025 — INE  
  https://www.ine.gob.cl/sala-de-prensa/prensa/general/noticia/2026/07/10/7-9-de-los-hogares-a-nivel-nacional-fue-v%C3%ADctima-de-delitos-violentos-en-los-%C3%BAltimos-doce-meses-seg%C3%BAn-la-enusc-2025

- Política Nacional de Seguridad Pública 2025–2031  
  https://www.bcn.cl/leychile/navegar?idNorma=1220944

- Crime concentration at places in Latin America — Crime Science  
  https://link.springer.com/article/10.1186/s40163-019-0100-5

- Crime Concentration and Hot Spot Dynamics in Latin America — BID  
  https://publications.iadb.org/en/crime-concentration-and-hot-spot-dynamics-latin-america

- CEAD  
  https://cead.spd.gov.cl/sala-cead/

- Sistemas internos CEAD  
  https://cead.spd.gov.cl/sistemas-internos-cead/

- Censo 2024 — INE  
  https://censo2024.ine.gob.cl/primeros-resultados-del-censo-2024-18-480-432-personas-fueron-censadas-en-chile-manteniendose-la-tendencia-de-envejecimiento-de-la-poblacion/

- Street Lighting and Crime — NBER  
  https://www.nber.org/papers/w25798

- Google Routes API — RouteModifiers  
  https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteModifiers

- Mi Patente  
  https://apps.apple.com/cl/app/mi-patente/id6759101158

- SOSAFE  
  https://store.sosafeapp.com/pages/faqs

- Safetipin  
  https://safetipin.com/

- Safe routing / crime-aware path planning — Information Systems  
  https://www.sciencedirect.com/science/article/pii/S0306437915001854

- Safe routing in Mexico City — Wiley  
  https://onlinelibrary.wiley.com/doi/abs/10.1155/2016/8068209

---

**Nota de uso:** este documento sirve como base para construir el pitch y preparar el Q&A. Para el pitch de 3 minutos conviene seleccionar muy pocos datos y guardar el resto como respaldo para preguntas de los jueces.
