const LIVE_URL = 'https://velocidades.seguimos.cl/?metro=1&all=1'

export const ESTADOS = {
  operativo: { color: '#2dd4a7', label: 'Operativo' },
  fuera_servicio: { color: '#ff5c5c', label: 'Ascensor fuera de servicio' },
  escalera_mala: { color: '#f5b731', label: 'Escalera mecánica en pana' },
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
  // Estaciones con equipos caídos, indexadas por nombre normalizado para
  // cruzar con las rutas de Google. Ascensor malo = bloqueante (rojo);
  // solo escalera mala = advertencia (amarillo), el ascensor sigue sirviendo.
  const estacionesMalas = new Map()
  const escalerasMalas = new Map()
  for (const f of geojson.features) {
    const info = live[f.properties.equipo]
    if (!info) {
      f.properties.estado = 'desconocido'
      continue
    }
    const esAscensor = info.tipo === 'ascensor'
    f.properties.tipo = info.tipo || ''
    f.properties.texto = info.texto || ''
    if (info.estado === 1) {
      f.properties.estado = 'operativo'
      continue
    }
    fueraServicio++
    f.properties.estado = esAscensor ? 'fuera_servicio' : 'escalera_mala'
    const mapa = esAscensor ? estacionesMalas : escalerasMalas
    const clave = normalizarNombre(f.properties.nombre_estacion)
    if (!mapa.has(clave)) {
      mapa.set(clave, { nombre: f.properties.nombre_estacion, detalles: [] })
    }
    // Si el texto dice "dirección <terminal>", el equipo sirve solo a ese
    // andén; sin dirección es de acceso/boletería y afecta ambos sentidos.
    const dir = /direcci[oó]n\s+(.+?)\s*$/i.exec(info.texto || '')
    mapa.get(clave).detalles.push({
      texto: info.texto || f.properties.equipo,
      direccion: dir ? dir[1] : null,
    })
  }

  return {
    geojson,
    fueraServicio,
    total: geojson.features.length,
    conDatos: Object.keys(live).length > 0,
    estacionesMalas,
    escalerasMalas,
  }
}
