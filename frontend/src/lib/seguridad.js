const ARCHIVOS_DATOS = [
  '/data/grid_seguridad.json',
  '/data/seguridad_comunas.json',
  '/data/comunas_santiago.geojson',
]

let datosPromise

function limitar(numero, minimo = 0, maximo = 100) {
  return Math.max(minimo, Math.min(maximo, numero))
}

function redondear(numero, decimales = 1) {
  const factor = 10 ** decimales
  return Math.round(numero * factor) / factor
}

function convertirPunto(punto) {
  if (Array.isArray(punto)) {
    const [lng, lat] = punto.map(Number)
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
  }
  if (!punto || typeof punto !== 'object') return null
  const lng = Number(punto.lng ?? punto.lon ?? punto.longitude)
  const lat = Number(punto.lat ?? punto.latitude)
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null
}

async function cargarJson(url) {
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${url}: ${respuesta.status}`)
  return respuesta.json()
}

// Los datos son estáticos; se cargan una sola vez y solo cuando se consulta seguridad.
export function cargarDatosSeguridad() {
  if (!datosPromise) {
    datosPromise = Promise.all(ARCHIVOS_DATOS.map(cargarJson)).then(
      ([grid, comunas, limites]) => ({
        grid,
        celdas: new Map((grid.celdas ?? []).map((celda) => [celda.id, celda])),
        comunas: comunas.comunas ?? [],
        limites: limites.features ?? [],
      }),
    )
  }
  return datosPromise
}

function horaDelDia(valor) {
  if (valor instanceof Date) return valor.getHours() + valor.getMinutes() / 60
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor % 24
  if (typeof valor === 'string') {
    const coincidencia = /^(\d{1,2})(?::(\d{1,2}))?/.exec(valor.trim())
    if (coincidencia) return Number(coincidencia[1]) + Number(coincidencia[2] ?? 0) / 60
  }
  return new Date().getHours()
}

function factorHora(hora) {
  const horaNormalizada = ((hora % 24) + 24) % 24
  if (horaNormalizada >= 7 && horaNormalizada < 19) return 1
  if (horaNormalizada >= 19 && horaNormalizada < 22) return 0.7
  if (horaNormalizada >= 22 || horaNormalizada < 1) return 0.4
  return 0.2
}

function indiceCelda(punto, grid) {
  const [west, south, east, north] = grid.bbox ?? []
  if (![west, south, east, north].every(Number.isFinite)) return null
  if (punto[0] < west || punto[0] > east || punto[1] < south || punto[1] > north) return null

  const latitudPorMetro = 1 / 111320
  const longitudPorMetro = 1 / (111320 * Math.cos((Math.abs((south + north) / 2) * Math.PI) / 180))
  const alto = Number(grid.celdaMetros) * latitudPorMetro
  const ancho = Number(grid.celdaMetros) * longitudPorMetro
  const x = Math.floor((punto[0] - west) / ancho)
  const y = Math.floor((punto[1] - south) / alto)
  return `${x}:${y}`
}

function puntoEnAnillo(punto, anillo) {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    const intersecta = yi > punto[1] !== yj > punto[1] && punto[0] < ((xj - xi) * (punto[1] - yi)) / (yj - yi) + xi
    if (intersecta) dentro = !dentro
  }
  return dentro
}

function puntoEnPoligono(punto, poligono) {
  const [exterior, ...interiores] = poligono
  return Boolean(exterior && puntoEnAnillo(punto, exterior) && !interiores.some((anillo) => puntoEnAnillo(punto, anillo)))
}

function puntoEnGeometria(punto, geometria) {
  if (geometria?.type === 'Polygon') return puntoEnPoligono(punto, geometria.coordinates)
  if (geometria?.type === 'MultiPolygon') return geometria.coordinates.some((poligono) => puntoEnPoligono(punto, poligono))
  return false
}

function buscarComuna(punto, datos) {
  const limite = datos.limites.find((feature) => puntoEnGeometria(punto, feature.geometry))
  if (!limite) return null
  return datos.comunas.find((comuna) => comuna.cutComuna === limite.properties?.cutComuna) ?? null
}

function nivelSeguridad(score) {
  if (score >= 60) return 'segura'
  if (score >= 40) return 'precaucion'
  return 'auto'
}

function mensajePorTipo(nivel, tipoRuta) {
  if (nivel === 'segura') {
    return tipoRuta === 'caminata' ? 'Puedes caminar tranquilo' : 'Es una ruta favorable para moverte'
  }
  if (nivel === 'precaucion') {
    return tipoRuta === 'caminata'
      ? 'Camina con precaución, preferible acompañado'
      : 'Muévete con precaución, preferible acompañado'
  }
  return 'Te recomendamos pedir un auto'
}

export function recomendacionSeguridad(score, opciones = {}) {
  const valor = Number(score)
  if (!Number.isFinite(valor)) return { nivel: 'sin-datos', mensaje: 'No pudimos calcular la seguridad de esta ruta' }
  const nivel = nivelSeguridad(valor)
  return { nivel, mensaje: mensajePorTipo(nivel, opciones.tipoRuta) }
}

const MARGEN_SEGURIDAD = 8
const MAX_MINUTOS_EXTRA = 10
const MAX_CAMINATA_MINUTOS = 90
const MAX_CORREDORES_SEGURIDAD = 2
const MAX_PUNTOS_CORREDOR = 36
const RADIO_CORREDOR_METROS = 900
const DISTANCIA_MINIMA_CORREDOR_METROS = 180
const DISTANCIA_MINIMA_EXTREMO_METROS = 350
const MEJORA_MINIMA_CORREDOR = 5

function duracionRuta(ruta) {
  const minutos = Number(ruta?.duracionMin)
  return Number.isFinite(minutos) ? minutos : Number.POSITIVE_INFINITY
}

export function caminataExcesiva(duracionMin, tipoRuta = 'caminata') {
  const minutos = Number(duracionMin)
  return tipoRuta === 'caminata' && Number.isFinite(minutos) && minutos > MAX_CAMINATA_MINUTOS
}

export function elegirRutaSegura(evaluadas) {
  const conScore = evaluadas.filter((evaluada) => evaluada.seguridad)
  if (!conScore.length) {
    return {
      evaluada: evaluadas[0],
      motivo: null,
      criterio: evaluadas.length === 1 ? 'unica' : 'sin-datos',
      alternativas: evaluadas.length,
    }
  }

  const masRapida = conScore.reduce((actual, candidata) =>
    duracionRuta(candidata.ruta) < duracionRuta(actual.ruta) ? candidata : actual
  )
  const masSegura = conScore.reduce((actual, candidata) =>
    candidata.seguridad.score > actual.seguridad.score ||
    (candidata.seguridad.score === actual.seguridad.score &&
      duracionRuta(candidata.ruta) < duracionRuta(actual.ruta))
      ? candidata
      : actual
  )
  const diferenciaScore = masSegura.seguridad.score - masRapida.seguridad.score
  const duracionSegura = duracionRuta(masSegura.ruta)
  const duracionRapida = duracionRuta(masRapida.ruta)
  const minutosExtra = duracionSegura - duracionRapida
  const tiempoRazonable = Number.isFinite(duracionSegura) &&
    (!Number.isFinite(duracionRapida) || minutosExtra <= MAX_MINUTOS_EXTRA)

  if (masSegura !== masRapida && diferenciaScore >= MARGEN_SEGURIDAD && tiempoRazonable) {
    const costoTiempo = minutosExtra > 0 ? `${Math.round(minutosExtra)} min extra` : 'sin costo de tiempo'
    const fuente = masSegura.ruta?.fuenteRuta === 'corredor-seguro'
      ? ' pasando por un corredor alternativo'
      : ''
    return {
      evaluada: masSegura,
      motivo: `Ruta priorizada por seguridad${fuente}: ${masSegura.seguridad.score}/100, ${costoTiempo} frente a la más rápida.`,
      criterio: 'seguridad',
      alternativas: conScore.length,
      diferenciaScore,
      minutosExtra,
    }
  }
  return {
    evaluada: masRapida,
    motivo: null,
    criterio: conScore.length === 1 ? 'unica' : 'rapidez',
    alternativas: conScore.length,
    diferenciaScore,
    minutosExtra,
  }
}

export async function puntuarPunto(punto, opciones = {}) {
  const coordenadas = convertirPunto(punto)
  if (!coordenadas) throw new Error('El punto de seguridad no tiene coordenadas válidas')

  const datos = await cargarDatosSeguridad()
  const celda = datos.celdas.get(indiceCelda(coordenadas, datos.grid))
  const comuna = buscarComuna(coordenadas, datos)
  const hora = horaDelDia(opciones.hora)
  const scoreContexto = Number(celda?.scoreContexto ?? 22.5)
  const scoreCrimen = Number(comuna?.scoreCrimen ?? 10)
  const scoreHora = 25 * factorHora(hora)
  const scoreTransporte = limitar(Number(opciones.scoreTransporte ?? 5), 0, 10)
  const score = redondear(limitar(scoreContexto + scoreCrimen + scoreHora + scoreTransporte))

  return {
    punto: coordenadas,
    score,
    nivel: nivelSeguridad(score),
    hora,
    celda: celda?.id ?? null,
    comuna: comuna?.comuna ?? null,
    componentes: { scoreContexto, scoreCrimen, scoreHora, scoreTransporte },
  }
}

export async function crearHeatmapSeguridad(opciones = {}) {
  const datos = await cargarDatosSeguridad()
  const celdas = [...datos.celdas.values()].filter((celda) => Array.isArray(celda.centro))
  const [west, south] = datos.grid.bbox ?? []
  const latitudPorMetro = 1 / 111320
  const longitudPorMetro = 1 / (111320 * Math.cos((Math.abs((datos.grid.bbox?.[1] + datos.grid.bbox?.[3]) / 2) * Math.PI) / 180))
  const alto = Number(datos.grid.celdaMetros) * latitudPorMetro
  const ancho = Number(datos.grid.celdaMetros) * longitudPorMetro
  const features = await Promise.all(
    celdas.map(async (celda) => {
      const resultado = await puntuarPunto(celda.centro, opciones)
      const [x, y] = celda.id.split(':').map(Number)
      const oeste = west + x * ancho
      const este = oeste + ancho
      const sur = south + y * alto
      const norte = sur + alto
      return {
        type: 'Feature',
        properties: {
          score: resultado.score,
          riesgo: 100 - resultado.score,
          nivel: resultado.nivel,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[oeste, sur], [este, sur], [este, norte], [oeste, norte], [oeste, sur]]],
        },
      }
    }),
  )
  return { type: 'FeatureCollection', features }
}

function coordenadasDeRuta(ruta) {
  if (Array.isArray(ruta)) return ruta.map(convertirPunto).filter(Boolean)
  if (ruta?.type === 'FeatureCollection') return ruta.features.flatMap(coordenadasDeRuta)
  if (ruta?.type === 'Feature') return coordenadasDeRuta(ruta.geometry)
  if (ruta?.type === 'LineString') return ruta.coordinates.map(convertirPunto).filter(Boolean)
  return []
}

function segmentosDeRuta(ruta) {
  if (ruta?.type === 'FeatureCollection') return ruta.features.filter((feature) => coordenadasDeRuta(feature).length)
  if (ruta?.type === 'Feature' || ruta?.type === 'LineString' || Array.isArray(ruta)) return [ruta]
  return []
}

function tipoDeRuta(segmentos) {
  if (segmentos.length && segmentos.every((segmento) => segmento.properties?.caminando === 1)) return 'caminata'
  return 'transporte'
}

export async function puntuarRuta(ruta, opciones = {}) {
  const segmentos = segmentosDeRuta(ruta)
  if (!segmentos.length) throw new Error('La ruta de seguridad no tiene geometría válida')
  const tipoRuta = tipoDeRuta(segmentos)

  const tramos = await Promise.all(
    segmentos.map(async (segmento) => {
      const puntosTramo = coordenadasDeRuta(segmento)
      // Los puntos de Metro o bus ya están junto a transporte; no deben recibir
      // el valor neutro de una caminata, que subestima las rutas mixtas.
      const scoreTransporte = opciones.scoreTransporte ?? (segmento.properties?.caminando === 0 ? 10 : 5)
      const opcionesTramo = { ...opciones, scoreTransporte }
      const puntajesTramo = await Promise.all(puntosTramo.map((punto) => puntuarPunto(punto, opcionesTramo)))
      const score = redondear(
        puntajesTramo.reduce((total, resultado) => total + resultado.score, 0) / puntajesTramo.length,
      )
      return {
        score,
        nivel: nivelSeguridad(score),
        recomendacion: recomendacionSeguridad(score, {
          tipoRuta: segmento.properties?.caminando === 1 ? 'caminata' : 'transporte',
        }),
        puntos: puntajesTramo,
      }
    }),
  )
  const puntajes = tramos.flatMap((tramo) => tramo.puntos)
  const score = redondear(puntajes.reduce((total, resultado) => total + resultado.score, 0) / puntajes.length)
  const duracionMin = Number.isFinite(Number(opciones.duracionMin)) ? Number(opciones.duracionMin) : null
  const esCaminataExcesiva = caminataExcesiva(duracionMin, tipoRuta)
  const recomendacion = esCaminataExcesiva
    ? {
        nivel: 'auto',
        mensaje: `Caminar este trayecto tomaría aproximadamente ${duracionMin} min; te recomendamos pedir un auto.`,
        motivo: 'duracion',
      }
    : recomendacionSeguridad(score, { tipoRuta })
  return {
    score,
    nivel: esCaminataExcesiva ? 'auto' : nivelSeguridad(score),
    recomendacion,
    tipoRuta,
    duracionMin,
    caminataExcesiva: esCaminataExcesiva,
    tramos,
    puntos: puntajes,
  }
}

function distanciaMetros(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY
  const lngA = Number(a[0])
  const latA = Number(a[1])
  const lngB = Number(b[0])
  const latB = Number(b[1])
  if (![lngA, latA, lngB, latB].every(Number.isFinite)) return Number.POSITIVE_INFINITY
  const latitudMedia = ((latA + latB) / 2) * (Math.PI / 180)
  const metrosPorGradoLongitud = 111320 * Math.cos(latitudMedia)
  return Math.hypot((lngB - lngA) * metrosPorGradoLongitud, (latB - latA) * 111320)
}

function muestrearPuntos(puntos, maximo) {
  if (puntos.length <= maximo) return puntos
  const paso = (puntos.length - 1) / (maximo - 1)
  return Array.from({ length: maximo }, (_, i) => puntos[Math.round(i * paso)])
}

// Busca puntos seguros cerca de los peores tramos para generar rutas candidatas
// independientes. Google calcula la geometría; este módulo solo elige los desvíos.
export async function proponerCorredoresSeguros(ruta, opciones = {}) {
  const puntos = segmentosDeRuta(ruta).flatMap(coordenadasDeRuta)
  const muestra = muestrearPuntos(puntos, MAX_PUNTOS_CORREDOR)
  if (muestra.length < 3) return []

  const extremos = [muestra[0], muestra[muestra.length - 1]]
  const evaluados = await Promise.all(
    muestra.map(async (punto) => ({ punto, seguridad: await puntuarPunto(punto, opciones) })),
  )
  const criticos = []
  for (const evaluado of [...evaluados].sort((a, b) => a.seguridad.score - b.seguridad.score)) {
    if (extremos.some((extremo) => distanciaMetros(evaluado.punto, extremo) < DISTANCIA_MINIMA_EXTREMO_METROS)) continue
    if (criticos.some((critico) => distanciaMetros(evaluado.punto, critico.punto) < RADIO_CORREDOR_METROS / 2)) continue
    criticos.push(evaluado)
    if (criticos.length === MAX_CORREDORES_SEGURIDAD) break
  }
  if (!criticos.length) return []

  const datos = await cargarDatosSeguridad()
  const celdas = [...datos.celdas.values()].filter((celda) => Array.isArray(celda.centro))
  const seleccionados = []

  for (const critico of criticos) {
    const celdasCercanas = celdas.filter((celda) => {
      const punto = convertirPunto(celda.centro)
      if (!punto || celda.id === critico.seguridad.celda) return false
      if (distanciaMetros(punto, critico.punto) < DISTANCIA_MINIMA_CORREDOR_METROS) return false
      if (distanciaMetros(punto, critico.punto) > RADIO_CORREDOR_METROS) return false
      return !extremos.some((extremo) => distanciaMetros(punto, extremo) < DISTANCIA_MINIMA_EXTREMO_METROS)
    })
    const candidatas = await Promise.all(
      celdasCercanas.map(async (celda) => {
        const punto = convertirPunto(celda.centro)
        return { punto, seguridad: await puntuarPunto(punto, opciones) }
      }),
    )
    const mejor = candidatas
      .filter((candidata) => candidata.seguridad.score >= critico.seguridad.score + MEJORA_MINIMA_CORREDOR)
      .sort((a, b) =>
        b.seguridad.score - a.seguridad.score ||
        distanciaMetros(a.punto, critico.punto) - distanciaMetros(b.punto, critico.punto),
      )
      .find((candidata) =>
        !seleccionados.some((seleccionada) => distanciaMetros(candidata.punto, seleccionada.punto) < RADIO_CORREDOR_METROS / 2),
      )
    if (mejor) {
      seleccionados.push({
        punto: mejor.punto,
        celda: mejor.seguridad.celda,
        score: mejor.seguridad.score,
        mejora: redondear(mejor.seguridad.score - critico.seguridad.score),
      })
    }
  }

  return seleccionados
}
