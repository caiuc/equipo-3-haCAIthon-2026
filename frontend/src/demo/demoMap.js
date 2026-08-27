import mapboxgl from 'mapbox-gl'
import {
  DEMO_CONECTORES,
  DEMO_ETIQUETAS,
  DEMO_EXTREMOS,
  DEMO_RUTAS,
  DEMO_SEGMENTOS_RIESGO,
} from './demoConfig'

const VACIO = { type: 'FeatureCollection', features: [] }

export function agregarCapasDemo(map, opciones = {}) {
  if (map.getSource('demo-rutas')) return

  map.addSource('demo-rutas', {
    type: 'geojson',
    data: opciones.rutasVisibles ? DEMO_RUTAS : VACIO,
  })
  map.addLayer({
    id: 'demo-rutas-alternativas-borde',
    type: 'line',
    source: 'demo-rutas',
    filter: ['==', ['get', 'tipo'], 'alternativa'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#ffffff',
      'line-width': 12,
      'line-opacity': 0.42,
    },
  })
  map.addLayer({
    id: 'demo-rutas-alternativas',
    type: 'line',
    source: 'demo-rutas',
    filter: ['==', ['get', 'tipo'], 'alternativa'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#64748b',
      'line-width': 8,
      'line-opacity': 0.58,
    },
  })
  map.addLayer({
    id: 'demo-ruta-principal-borde',
    type: 'line',
    source: 'demo-rutas',
    filter: ['==', ['get', 'tipo'], 'principal'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#065f46',
      'line-width': 14,
      'line-opacity': 0.32,
    },
  })
  map.addLayer({
    id: 'demo-ruta-principal',
    type: 'line',
    source: 'demo-rutas',
    filter: ['==', ['get', 'tipo'], 'principal'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#10b981',
      'line-width': 9,
      'line-opacity': 0.78,
    },
  })

  map.addSource('demo-conectores', {
    type: 'geojson',
    data: opciones.rutasVisibles ? DEMO_CONECTORES : VACIO,
  })
  map.addLayer({
    id: 'demo-conectores-linea',
    type: 'line',
    source: 'demo-conectores',
    filter: ['==', ['get', 'clase'], 'conector'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['match', ['get', 'tipo'], 'principal', '#059669', '#475569'],
      'line-width': ['match', ['get', 'tipo'], 'principal', 3, 2],
      'line-opacity': 0.82,
      'line-dasharray': [1.5, 1.2],
    },
  })
  map.addLayer({
    id: 'demo-conectores-anclaje',
    type: 'circle',
    source: 'demo-conectores',
    filter: ['==', ['get', 'clase'], 'anclaje'],
    paint: {
      'circle-radius': ['match', ['get', 'tipo'], 'principal', 6, 5],
      'circle-color': ['match', ['get', 'tipo'], 'principal', '#10b981', '#64748b'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  })

  map.addSource('demo-riesgos', {
    type: 'geojson',
    data: opciones.rutasVisibles ? DEMO_SEGMENTOS_RIESGO : VACIO,
  })
  map.addLayer({
    id: 'demo-segmentos-riesgo-borde',
    type: 'line',
    source: 'demo-riesgos',
    layout: {
      visibility: opciones.riesgosVisibles ? 'visible' : 'none',
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#ffffff',
      'line-width': 13,
      'line-opacity': 0.82,
    },
  })
  map.addLayer({
    id: 'demo-segmentos-riesgo',
    type: 'line',
    source: 'demo-riesgos',
    layout: {
      visibility: opciones.riesgosVisibles ? 'visible' : 'none',
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#dc2626',
      'line-width': 8,
      'line-opacity': 0.96,
    },
  })
}

function crearTarjeta(etiqueta) {
  const tarjeta = document.createElement('div')
  tarjeta.className = etiqueta.destacada ? 'demo-ruta-card destacada' : 'demo-ruta-card'
  tarjeta.dataset.demoRuta = etiqueta.id

  const titulo = document.createElement('strong')
  titulo.textContent = etiqueta.titulo
  tarjeta.appendChild(titulo)

  for (const dato of etiqueta.filas) {
    const fila = document.createElement('div')
    fila.className = `demo-ruta-fila ${dato.tono}`
    const icono = document.createElement('span')
    icono.className = 'demo-ruta-icono'
    icono.textContent = dato.icono
    const texto = document.createElement('span')
    texto.textContent = dato.texto
    fila.append(icono, texto)
    tarjeta.appendChild(fila)
  }

  if (etiqueta.componentes?.length) {
    const componentes = document.createElement('ul')
    componentes.className = 'demo-ruta-componentes'
    for (const componente of etiqueta.componentes) {
      const fila = document.createElement('li')
      fila.textContent = componente
      componentes.appendChild(fila)
    }
    tarjeta.appendChild(componentes)
  }
  return tarjeta
}

export function crearMarcadoresDemo(map) {
  const movil = window.innerWidth <= 700
  const marcadores = DEMO_ETIQUETAS.map((etiqueta) =>
    new mapboxgl.Marker({
      element: crearTarjeta(etiqueta),
      anchor: etiqueta.anchor || 'center',
      offset: movil ? etiqueta.offsetMovil || etiqueta.offset || [0, 0] : etiqueta.offset || [0, 0],
    })
      .setLngLat(etiqueta.coordenadas)
      .addTo(map)
  )

  for (const extremo of DEMO_EXTREMOS) {
    const punto = document.createElement('div')
    punto.className = `demo-extremo demo-extremo-${extremo.id}`
    punto.textContent = extremo.texto
    punto.title = extremo.etiqueta
    marcadores.push(
      new mapboxgl.Marker({ element: punto, anchor: 'center' })
        .setLngLat(extremo.coordenadas)
        .addTo(map)
    )
  }
  return marcadores
}

export function mostrarRutasDemo(map) {
  map.getSource('demo-rutas')?.setData(DEMO_RUTAS)
  map.getSource('demo-riesgos')?.setData(DEMO_SEGMENTOS_RIESGO)
  map.getSource('demo-conectores')?.setData(DEMO_CONECTORES)

  const coordenadas = [
    ...DEMO_RUTAS.features.flatMap((feature) => feature.geometry.coordinates),
    ...DEMO_ETIQUETAS.map((etiqueta) => etiqueta.coordenadas),
  ]
  const limites = coordenadas.reduce(
    (bounds, coordenada) => bounds.extend(coordenada),
    new mapboxgl.LngLatBounds(coordenadas[0], coordenadas[0]),
  )
  const movil = window.innerWidth <= 700
  map.fitBounds(limites, {
    duration: 850,
    padding: movil
      ? { top: 280, right: 32, bottom: 170, left: 32 }
      : { top: 90, right: 230, bottom: 120, left: 390 },
  })
}

export function ocultarRutasDemo(map) {
  map.getSource('demo-rutas')?.setData(VACIO)
  map.getSource('demo-riesgos')?.setData(VACIO)
  map.getSource('demo-conectores')?.setData(VACIO)
  alternarRiesgosDemo(map, false)
}

export function alternarRiesgosDemo(map, visible) {
  for (const capa of ['demo-segmentos-riesgo-borde', 'demo-segmentos-riesgo']) {
    if (map.getLayer(capa)) map.setLayoutProperty(capa, 'visibility', visible ? 'visible' : 'none')
  }
}
