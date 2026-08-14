const LIVE_URL = 'https://velocidades.seguimos.cl/?metro=1&all=1'

export const ESTADOS = {
  operativo: { color: '#2dd4a7', label: 'Operativo' },
  fuera_servicio: { color: '#ff5c5c', label: 'Fuera de servicio' },
  desconocido: { color: '#8b93a7', label: 'Sin información' },
}

// Normaliza nombres de estación para cruzar el GeoJSON con los nombres
// que devuelve Google (acentos, mayúsculas, guiones: "Chile-España" ≈ "Chile España").
export function normalizarNombre(nombre) {
  return String(nombre)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^estacion\s+/, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Carga el GeoJSON local de dispositivos y le cruza el estado en vivo.
// El cruce es por ID de equipo: la llave del JSON en vivo coincide con
// properties.equipo del GeoJSON (verificado: 946/949 match exacto).
export async function cargarDispositivos() {
  const [geoRes, liveRes] = await Promise.all([
    fetch('/data/metro_dispositivos.geojson'),
    fetch(LIVE_URL).catch(() => null),
  ])
  if (!geoRes.ok) throw new Error('No se pudo cargar el dataset de dispositivos')
  const geojson = await geoRes.json()

  let live = {}
  if (liveRes && liveRes.ok) {
    try {
      live = await liveRes.json()
    } catch {
      live = {}
    }
  }

  let fueraServicio = 0
  // Estaciones con al menos un ascensor fuera de servicio,
  // indexadas por nombre normalizado para cruzar con las rutas de Google.
  const estacionesMalas = new Map()
  for (const f of geojson.features) {
    const info = live[f.properties.equipo]
    if (!info) {
      f.properties.estado = 'desconocido'
      continue
    }
    f.properties.estado = info.estado === 1 ? 'operativo' : 'fuera_servicio'
    f.properties.tipo = info.tipo || ''
    f.properties.texto = info.texto || ''
    if (f.properties.estado === 'fuera_servicio') {
      fueraServicio++
      if (info.tipo === 'ascensor') {
        const clave = normalizarNombre(f.properties.nombre_estacion)
        if (!estacionesMalas.has(clave)) {
          estacionesMalas.set(clave, { nombre: f.properties.nombre_estacion, detalles: [] })
        }
        estacionesMalas.get(clave).detalles.push(info.texto || f.properties.equipo)
      }
    }
  }

  return {
    geojson,
    fueraServicio,
    total: geojson.features.length,
    conDatos: Object.keys(live).length > 0,
    estacionesMalas,
  }
}
