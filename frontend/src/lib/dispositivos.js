const LIVE_URL = 'https://velocidades.seguimos.cl/?metro=1&all=1'

export const ESTADOS = {
  operativo: { color: '#2dd4a7', label: 'Operativo' },
  fuera_servicio: { color: '#ff5c5c', label: 'Fuera de servicio' },
  desconocido: { color: '#8b93a7', label: 'Sin información' },
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
  for (const f of geojson.features) {
    const info = live[f.properties.equipo]
    if (!info) {
      f.properties.estado = 'desconocido'
      continue
    }
    f.properties.estado = info.estado === 1 ? 'operativo' : 'fuera_servicio'
    if (f.properties.estado === 'fuera_servicio') fueraServicio++
    f.properties.tipo = info.tipo || ''
    f.properties.texto = info.texto || ''
  }

  return { geojson, fueraServicio, total: geojson.features.length, conDatos: Object.keys(live).length > 0 }
}
