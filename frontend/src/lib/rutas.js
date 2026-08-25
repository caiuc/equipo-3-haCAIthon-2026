import { proponerCorredoresSeguros } from './seguridad'

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'
const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// Google asume ~1.4 m/s de caminata; una persona con movilidad reducida
// camina a ~0.9 m/s, así que los tramos a pie toman ~1.5x el tiempo.
const FACTOR_CAMINATA = 1.5

const FIELD_MASK = [
  'routes.duration',
  'routes.distanceMeters',
  'routes.routeLabels',
  'routes.legs.steps.travelMode',
  'routes.legs.steps.staticDuration',
  'routes.legs.steps.polyline.encodedPolyline',
  'routes.legs.steps.navigationInstruction.instructions',
  'routes.legs.steps.transitDetails.transitLine.name',
  'routes.legs.steps.transitDetails.transitLine.nameShort',
  'routes.legs.steps.transitDetails.transitLine.color',
  'routes.legs.steps.transitDetails.transitLine.vehicle.type',
  'routes.legs.steps.transitDetails.headsign',
  'routes.legs.steps.transitDetails.stopDetails.departureStop.name',
  'routes.legs.steps.transitDetails.stopDetails.arrivalStop.name',
  'routes.legs.steps.transitDetails.stopCount',
].join(',')

// Decodificador estándar de polylines de Google → [[lng, lat], ...]
export function decodificarPolyline(str) {
  let index = 0
  let lat = 0
  let lng = 0
  const coords = []
  while (index < str.length) {
    let b, shift = 0, result = 0
    do {
      b = str.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    shift = 0
    result = 0
    do {
      b = str.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    coords.push([lng / 1e5, lat / 1e5])
  }
  return coords
}

const ICONOS = { SUBWAY: '🚇', BUS: '🚌', TRAM: '🚊', HEAVY_RAIL: '🚆' }

// Busca rutas en el modo solicitado (por defecto transporte público). Cada ruta
// trae pasos para el itinerario, estaciones de Metro y tramos para el mapa.
export async function buscarRutas(
  origen,
  destino,
  { soloBus = false, modo = 'TRANSIT', intermedios = [], calcularAlternativas = true } = {},
) {
  const travelMode = ['WALK', 'DRIVE'].includes(modo) ? modo : 'TRANSIT'
  const puntosIntermedios = Array.isArray(intermedios) ? intermedios.filter(Boolean) : []
  const res = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      origin: comoWaypoint(origen),
      destination: comoWaypoint(destino),
      travelMode,
      computeAlternativeRoutes: calcularAlternativas && !puntosIntermedios.length,
      languageCode: 'es-CL',
      regionCode: 'CL',
      ...(puntosIntermedios.length && {
        intermediates: puntosIntermedios.map(comoWaypointIntermedio),
      }),
      ...(soloBus && travelMode === 'TRANSIT' && { transitPreferences: { allowedTravelModes: ['BUS'] } }),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `Routes API ${res.status}`)
  const rutas = (data.routes || []).map(parsearRuta)
  if (!rutas.length) throw new Error('sin rutas')
  return rutas
}

// Google puede devolver una sola ruta peatonal aunque se pidan alternativas.
// Las consultas con waypoints seguros generan candidatos adicionales sin hacer
// que un fallo de una consulta bloquee la ruta base.
export async function buscarRutasSeguras(origen, destino, opciones = {}) {
  const rutasBase = await buscarRutas(origen, destino, {
    ...opciones,
    modo: 'WALK',
    calcularAlternativas: true,
  })
  let corredores = []
  try {
    corredores = await proponerCorredoresSeguros(rutasBase[0]?.geojson, opciones)
  } catch (err) {
    console.warn('No se pudieron proponer corredores seguros', err)
  }
  if (!corredores.length) return rutasBase

  const respuestas = await Promise.allSettled(
    corredores.map((corredor) =>
      buscarRutas(origen, destino, {
        ...opciones,
        modo: 'WALK',
        intermedios: [corredor.punto],
        calcularAlternativas: false,
      }),
    ),
  )
  const rutasCorredor = respuestas.flatMap((respuesta, i) => {
    if (respuesta.status === 'rejected') {
      console.warn('No se pudo calcular un corredor seguro', respuesta.reason)
      return []
    }
    return respuesta.value.map((ruta) => ({
      ...ruta,
      fuenteRuta: 'corredor-seguro',
      corredorSeguro: corredores[i],
    }))
  })
  return deduplicarRutas([...rutasBase, ...rutasCorredor])
}

// Un plan se calcula como una secuencia de tramos porque Routes API no siempre
// acepta waypoints intermedios en transporte público.
export async function buscarRutasPlan(origen, destino, paradas = [], opciones = {}) {
  const puntos = [origen, ...paradas, destino]
  const rutasPorTramo = []
  for (let i = 0; i < puntos.length - 1; i += 1) {
    rutasPorTramo.push(await buscarRutas(puntos[i], puntos[i + 1], opciones))
  }
  return { puntos, rutasPorTramo }
}

export function combinarRutas(rutas, nombresParadas = []) {
  const pasos = rutas.flatMap((r) => r.pasos)
  const estacionesMetro = rutas.flatMap((r) => r.estacionesMetro)
  const features = rutas.flatMap((r) => r.geojson.features)
  const paradas = nombresParadas.map((nombre, i) => {
    const tramo = rutas[i]
    const tramoFeatures = tramo?.geojson?.features || []
    const ultimo = tramoFeatures[tramoFeatures.length - 1]
    const coordenadas = ultimo?.geometry?.coordinates || []
    return { nombre, coordenadas: coordenadas[coordenadas.length - 1] || null }
  }).filter((parada) => parada.coordenadas)

  return {
    duracionMin: rutas.reduce((total, r) => total + (r.duracionMin || 0), 0) || null,
    pasos,
    estacionesMetro,
    paradas,
    geojson: { type: 'FeatureCollection', features },
  }
}

// Acepta dirección como texto o coordenadas {lat, lng} (geolocalización).
// Ancla el texto a Santiago: sin eso el geocoder devuelve lugares ambiguos
// (ej. "Irarrazabal" solo caía en un pasaje de Maipú) o ninguna ruta.
function comoWaypoint(x) {
  if (typeof x !== 'string') {
    return { location: { latLng: { latitude: x.lat, longitude: x.lng } } }
  }
  const anclada = /santiago|chile/i.test(x) ? x : `${x}, Santiago, Chile`
  return { address: anclada }
}

function comoWaypointIntermedio(punto) {
  const [lng, lat] = Array.isArray(punto) ? punto : [punto.lng, punto.lat]
  return {
    location: { latLng: { latitude: lat, longitude: lng } },
    via: true,
  }
}

function deduplicarRutas(rutas) {
  const vistas = new Set()
  return rutas.filter((ruta) => {
    const firma = JSON.stringify(
      ruta.geojson.features.map((feature) => feature.geometry.coordinates),
    )
    if (vistas.has(firma)) return false
    vistas.add(firma)
    return true
  })
}

function parsearRuta(route) {
  const steps = (route.legs || []).flatMap((l) => l.steps || [])
  const pasos = []
  const tramos = []
  const estacionesMetro = []

  for (const s of steps) {
    const coords = s.polyline?.encodedPolyline ? decodificarPolyline(s.polyline.encodedPolyline) : []
    if (s.travelMode === 'TRANSIT' && s.transitDetails) {
      const t = s.transitDetails
      const linea = t.transitLine || {}
      const vehiculo = linea.vehicle?.type || ''
      // "PB1960-Parada 6 / (M) Pza. Chacabuco" → "Parada 6 / (M) Pza. Chacabuco"
      const limpiar = (n) => String(n).replace(/^P[A-Z]{1,2}\d+\s*-\s*/, '')
      const desde = limpiar(t.stopDetails?.departureStop?.name || '?')
      const hasta = limpiar(t.stopDetails?.arrivalStop?.name || '?')
      // Metro: "Línea 5". Micro: el número del recorrido ("210") es lo útil.
      const etiqueta =
        vehiculo === 'BUS' && linea.nameShort
          ? `Micro ${linea.nameShort}`
          : linea.name || linea.nameShort || 'Transporte'
      // En hora punta L2/L4/L5 operan con ruta expresa: el headsign llega
      // como "Terminal (Ruta Roja)". Separamos color de tren y dirección.
      const headsign = t.headsign || null
      const expresa = /\(ruta (roja|verde)\)/i.exec(headsign || '')?.[1] || null
      const direccion = headsign ? headsign.replace(/\s*\(.*\)\s*$/, '') : null
      pasos.push({
        tipo: 'transit',
        direccion,
        expresa,
        icono: ICONOS[vehiculo] || '🚍',
        etiqueta,
        desde,
        hasta,
        paradas: t.stopCount ?? null,
        color: linea.color || '#4da3ff',
        textColor: linea.textColor || '#ffffff',
      })
      if (coords.length) {
        tramos.push({
          type: 'Feature',
          properties: {
            color: linea.color || '#4da3ff',
            caminando: 0,
            icono: ICONOS[vehiculo] || '🚍',
            etiqueta,
          },
          geometry: { type: 'LineString', coordinates: coords },
        })
      }
      if (vehiculo === 'SUBWAY') {
        estacionesMetro.push({ nombre: desde, direccion }, { nombre: hasta, direccion })
      }
    } else if (s.travelMode === 'DRIVE') {
      const sec = parseInt(s.staticDuration, 10) || 0
      let ultimo = pasos[pasos.length - 1]
      if (ultimo?.tipo !== 'auto') {
        if (!coords.length && sec === 0) continue
        ultimo = { tipo: 'auto', icono: '🚗', segundos: 0, conTramo: false }
        pasos.push(ultimo)
      }
      ultimo.segundos += sec
      if (coords.length) {
        if (ultimo.conTramo) {
          tramos[tramos.length - 1].geometry.coordinates.push(...coords)
        } else {
          tramos.push({
            type: 'Feature',
            properties: { color: '#475569', caminando: 0, tipo: 'auto', icono: '🚗', etiqueta: 'Auto' },
            geometry: { type: 'LineString', coordinates: coords },
          })
          ultimo.conTramo = true
        }
      }
    } else {
      // Tramos a pie: colapsar instrucciones consecutivas en un solo paso,
      // acumulando su duración para el ajuste por movilidad reducida.
      const sec = parseInt(s.staticDuration, 10) || 0
      let ultimo = pasos[pasos.length - 1]
      if (ultimo?.tipo !== 'walk') {
        if (!coords.length && sec === 0) continue
        ultimo = { tipo: 'walk', icono: '🚶', segundos: 0, conTramo: false }
        pasos.push(ultimo)
      }
      ultimo.segundos += sec
      if (coords.length) {
        if (ultimo.conTramo) {
          tramos[tramos.length - 1].geometry.coordinates.push(...coords)
        } else {
          tramos.push({
            type: 'Feature',
            properties: { color: '#9aa3b8', caminando: 1 },
            geometry: { type: 'LineString', coordinates: coords },
          })
          ultimo.conTramo = true
        }
      }
    }
  }

  // Duración ajustada: el tiempo en vehículo no cambia, las caminatas se
  // estiran por FACTOR_CAMINATA.
  const durSec = parseInt(route.duration, 10) || 0
  let walkSec = 0
  for (const p of pasos) {
    if (p.tipo === 'walk') {
      walkSec += p.segundos
      p.minutos = Math.max(1, Math.round((p.segundos * FACTOR_CAMINATA) / 60))
    } else if (p.tipo === 'auto') {
      p.minutos = Math.max(1, Math.round(p.segundos / 60))
    }
  }
  const ajustadaSec = durSec + walkSec * (FACTOR_CAMINATA - 1)

  const etiquetasGoogle = route.routeLabels || []
  return {
    duracionMin: Math.round(ajustadaSec / 60) || null,
    distanciaMetros: Number(route.distanceMeters) || null,
    etiquetasGoogle,
    fuenteRuta: etiquetasGoogle.includes('DEFAULT_ROUTE_ALTERNATE') ? 'alternativa-google' : 'google',
    pasos,
    estacionesMetro,
    geojson: { type: 'FeatureCollection', features: tramos },
  }
}
