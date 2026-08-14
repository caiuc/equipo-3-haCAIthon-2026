const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'
const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const FIELD_MASK = [
  'routes.duration',
  'routes.legs.steps.travelMode',
  'routes.legs.steps.polyline.encodedPolyline',
  'routes.legs.steps.navigationInstruction.instructions',
  'routes.legs.steps.transitDetails.transitLine.name',
  'routes.legs.steps.transitDetails.transitLine.nameShort',
  'routes.legs.steps.transitDetails.transitLine.color',
  'routes.legs.steps.transitDetails.transitLine.vehicle.type',
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

// Busca rutas en transporte público (principal + alternativas). Cada ruta trae
// pasos para el itinerario, estaciones de Metro usadas y un FeatureCollection
// de tramos coloreados para dibujar en el mapa.
export async function buscarRutas(origen, destino, { soloBus = false } = {}) {
  const res = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      origin: { address: origen },
      destination: { address: destino },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: true,
      languageCode: 'es-CL',
      regionCode: 'CL',
      ...(soloBus && { transitPreferences: { allowedTravelModes: ['BUS'] } }),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `Routes API ${res.status}`)
  const rutas = (data.routes || []).map(parsearRuta)
  if (!rutas.length) throw new Error('sin rutas')
  return rutas
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
      const desde = t.stopDetails?.departureStop?.name || '?'
      const hasta = t.stopDetails?.arrivalStop?.name || '?'
      pasos.push({
        icono: ICONOS[vehiculo] || '🚍',
        texto: `${linea.name || linea.nameShort || 'Transporte'}: ${desde} → ${hasta} (${t.stopCount ?? '?'} paradas)`,
      })
      if (coords.length) {
        tramos.push({
          type: 'Feature',
          properties: { color: linea.color || '#4da3ff', caminando: 0 },
          geometry: { type: 'LineString', coordinates: coords },
        })
      }
      if (vehiculo === 'SUBWAY') estacionesMetro.push(desde, hasta)
    } else if (coords.length) {
      // Tramos a pie: colapsar instrucciones consecutivas en un solo paso
      const ultimo = pasos[pasos.length - 1]
      if (ultimo?.esCaminata) {
        tramos[tramos.length - 1].geometry.coordinates.push(...coords)
      } else {
        pasos.push({ icono: '🚶', texto: 'Caminata', esCaminata: true })
        tramos.push({
          type: 'Feature',
          properties: { color: '#9aa3b8', caminando: 1 },
          geometry: { type: 'LineString', coordinates: coords },
        })
      }
    }
  }

  return {
    duracionMin: Math.round(parseInt(route.duration, 10) / 60) || null,
    pasos,
    estacionesMetro,
    geojson: { type: 'FeatureCollection', features: tramos },
  }
}
