import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { cargarDispositivos, normalizarNombre, ESTADOS } from './lib/dispositivos'
import { buscarRutas, buscarRutasPlan, buscarRutasSeguras, combinarRutas } from './lib/rutas'
import { crearHeatmapSeguridad, elegirRutaSegura, puntuarRuta, recomendacionSeguridad } from './lib/seguridad'
import { interpretarConsulta, asistenteDisponible } from './lib/asistente'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const SANTIAGO = [-70.6506, -33.4372]
const VACIO = { type: 'FeatureCollection', features: [] }
const ESTILOS_MAPA = {
  oscuro: 'mapbox://styles/mapbox/dark-v11',
  claro: 'mapbox://styles/mapbox/light-v11',
}
const CAMPUS_SJ = 'Campus San Joaquín UC, Santiago, Chile'
const COLORES_SEGURIDAD = {
  segura: '#2f9e44',
  precaucion: '#c58a00',
  auto: '#d64545',
}
const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

function ubicacionActual() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    )
  })
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function mensajeErrorRuta(err) {
  const original = String(err?.message || '').replace(/key=[^\s&]+/gi, 'key=[oculta]')
  const mensaje = original.toLowerCase()
  if (/401|403|api key|permission|unauthorized/.test(mensaje)) {
    return `Google Routes rechazó la solicitud. Detalle: ${original.slice(0, 180)}`
  }
  if (/failed to fetch|network|cors|fetch/.test(mensaje)) {
    return 'No se pudo conectar con Google Routes. Revisa tu conexión e inténtalo de nuevo.'
  }
  if (mensaje.includes('sin rutas')) {
    return 'Google no encontró una ruta para esos lugares. Prueba con direcciones más específicas.'
  }
  if (original) return `Google Routes indicó: ${original.slice(0, 180)}`
  return 'No se pudo calcular la ruta. Revisa origen y destino e inténtalo de nuevo.'
}

export default function MapView() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [mapListo, setMapListo] = useState(false)
  const [errorMapa, setErrorMapa] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [origen, setOrigen] = useState('')
  const [origenEsFallback, setOrigenEsFallback] = useState(false)
  const [destino, setDestino] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [ruta, setRuta] = useState(null)
  const [seguridadRuta, setSeguridadRuta] = useState(null)
  const [autoCargando, setAutoCargando] = useState(false)
  const [contextoRuta, setContextoRuta] = useState(null)
  const [calorVisible, setCalorVisible] = useState(false)
  const [calorCargando, setCalorCargando] = useState(false)
  const [metroVisible, setMetroVisible] = useState(false)
  const [dispositivosListos, setDispositivosListos] = useState(false)
  const [errorRuta, setErrorRuta] = useState(null)
  const [alerta, setAlerta] = useState(null)
  const [avisoOk, setAvisoOk] = useState(null)
  const [motivoRuta, setMotivoRuta] = useState(null)
  const [consulta, setConsulta] = useState('')
  const [grabando, setGrabando] = useState(false)
  const reconocimientoRef = useRef(null)
  const [tema, setTema] = useState(() => localStorage.getItem('rutalibre-tema') || 'claro')
  const [lineasInfo, setLineasInfo] = useState([])
  const temaRef = useRef(tema)
  const rutaGeojsonRef = useRef(null)
  const calorGeojsonRef = useRef(null)
  const lineasRef = useRef(null)
  const markersRef = useRef([])
  const ultimaBusquedaRef = useRef(null)
  const estacionesMalasRef = useRef(new Map())
  const escalerasMalasRef = useRef(new Map())
  const [avisoEscaleras, setAvisoEscaleras] = useState([])
  const alternativasRef = useRef([])
  const planTramosRef = useRef([])
  const dispositivosRef = useRef(null)

  // El mapa se monta una sola vez; sus capas se actualizan por eventos de Mapbox.
  // oxlint-disable react-hooks/exhaustive-deps
  useEffect(() => {
    if (!TOKEN) return
    let desmontado = false
    mapboxgl.accessToken = TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: ESTILOS_MAPA[temaRef.current] || ESTILOS_MAPA.oscuro,
      center: SANTIAGO,
      zoom: 11.5,
    })
    mapRef.current = map
    let estiloCargado = false
    const temporizadorMapa = window.setTimeout(() => {
      if (!desmontado && !estiloCargado) {
        setErrorMapa('El mapa base tardó demasiado en responder. Revisa tu conexión o los dominios autorizados.')
      }
    }, 10000)
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right'
    )
    map.on('zoom', escalarMarkers)
    map.on('error', (event) => {
      if (desmontado || estiloCargado) return
      console.error('No se pudo cargar Mapbox', event.error)
      setErrorMapa('No se pudo cargar el mapa base. Revisa el token y sus dominios autorizados.')
    })

    map.on('load', async () => {
      if (desmontado) return
      estiloCargado = true
      window.clearTimeout(temporizadorMapa)
      setErrorMapa(null)
      // Las capas se agregan una vez por ciclo de estilo de Mapbox.
      agregarCapas(map)
      map.on('click', 'dispositivos-circulos', (e) => {
        const p = e.features[0].properties
        const est = ESTADOS[p.estado] || ESTADOS.desconocido
        new mapboxgl.Popup({ closeButton: false, maxWidth: '280px' })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(
            `<div class="popup">
              <strong>${escapeHtml(p.nombre_estacion)}</strong>
              <span class="popup-linea">${escapeHtml(p.linea)}</span>
              <span class="popup-estado" style="color:${est.color}">● ${est.label}</span>
              ${p.texto ? `<p>${escapeHtml(p.texto)}</p>` : ''}
            </div>`
          )
          .addTo(map)
      })
      map.on('mouseenter', 'dispositivos-circulos', () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', 'dispositivos-circulos', () => (map.getCanvas().style.cursor = ''))
      setMapListo(true)
      try {
        const [{ geojson, fueraServicio, total, conDatos, estacionesMalas, escalerasMalas }, lineas] =
          await Promise.all([
            cargarDispositivos(),
            fetch('/data/metro_lineas.geojson')
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
          ])
        if (desmontado) return
        lineasRef.current = lineas
        map.getSource('metro-lineas')?.setData(lineas || VACIO)
        if (lineas) {
          setLineasInfo(
            lineas.features
              .map((f) => f.properties)
              .sort((a, b) => a.ref.localeCompare(b.ref, 'es', { numeric: true }))
          )
        }
        estacionesMalasRef.current = estacionesMalas
        escalerasMalasRef.current = escalerasMalas
        dispositivosRef.current = geojson
        map.getSource('dispositivos')?.setData(geojson)
        setResumen({ fueraServicio, total, conDatos })
        setDispositivosListos(true)
        if (ultimaBusquedaRef.current) {
          const { o, d, paradas, opcionesSeguridad } = ultimaBusquedaRef.current
          if (paradas?.length) {
            await aplicarPlanAccesible(planTramosRef.current, [o, ...paradas, d], opcionesSeguridad)
          } else if (alternativasRef.current.length) {
            await aplicarRutaAccesible(alternativasRef.current, o, d, opcionesSeguridad)
          }
        }
      } catch (err) {
        console.error(err)
        setResumen({ fueraServicio: 0, total: 0, conDatos: false })
        setDispositivosListos(true)
      }
    })

    return () => {
      desmontado = true
      window.clearTimeout(temporizadorMapa)
      map.remove()
    }
  }, [])
  // oxlint-enable react-hooks/exhaustive-deps

  // Fuentes y capas custom. Se llama al cargar y tras cada cambio de estilo
  // base (setStyle borra todo lo custom, hay que volver a agregarlo).
  function agregarCapas(map) {
    if (map.getSource('dispositivos')) return
    // Trazado de las líneas de Metro (estático, OSM), debajo de ruta y puntos
    map.addSource('metro-lineas', { type: 'geojson', data: lineasRef.current || VACIO })
    map.addLayer({
      id: 'metro-lineas',
      type: 'line',
      source: 'metro-lineas',
      layout: { visibility: metroVisible ? 'visible' : 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 14, 4],
        'line-opacity': 0.55,
      },
    })
    map.addSource('seguridad-calor', {
      type: 'geojson',
      data: calorGeojsonRef.current || VACIO,
    })
    map.addLayer({
      id: 'seguridad-celdas',
      type: 'fill',
      source: 'seguridad-calor',
      layout: { visibility: calorVisible ? 'visible' : 'none' },
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'score'],
          0,
          '#b42318',
          30,
          '#e05a33',
          45,
          '#f07c22',
          60,
          '#f5c542',
          75,
          '#2f9e44',
        ],
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.2, 13, 0.34, 15, 0.42],
        'fill-outline-color': 'rgba(255, 255, 255, 0.18)',
      },
    })
    map.addSource('ruta', { type: 'geojson', data: rutaGeojsonRef.current || VACIO })
    // Casing: borde de contraste bajo la ruta para distinguirla de la red
    map.addLayer({
      id: 'ruta-casing',
      type: 'line',
      source: 'ruta',
      filter: ['==', ['get', 'caminando'], 0],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': temaRef.current === 'claro' ? '#16202e' : '#ffffff',
        'line-width': 9,
        'line-opacity': 0.9,
      },
    })
    map.addLayer({
      id: 'ruta-transporte',
      type: 'line',
      source: 'ruta',
      filter: ['==', ['get', 'caminando'], 0],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['coalesce', ['get', 'seguridadColor'], ['get', 'color']],
        'line-width': 5,
        'line-opacity': 0.9,
      },
    })
    // Caminatas: puntos redondos grandes de alto contraste (dasharray [0, 2]
    // con cap round dibuja círculos, el estilo clásico de tramos a pie)
    map.addLayer({
      id: 'ruta-caminata',
      type: 'line',
      source: 'ruta',
      filter: ['==', ['get', 'caminando'], 1],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': [
          'coalesce',
          ['get', 'seguridadColor'],
          ['literal', temaRef.current === 'claro' ? '#1f2937' : '#eef1f8'],
        ],
        'line-width': 5,
        'line-opacity': 0.95,
        'line-dasharray': [0, 2],
      },
    })

    map.addSource('dispositivos', { type: 'geojson', data: dispositivosRef.current || VACIO })
    map.addLayer({
      id: 'dispositivos-circulos',
      type: 'circle',
      source: 'dispositivos',
      // Los dispositivos de una estación comparten coordenada: el peor
      // estado se dibuja encima para que un ascensor malo siempre se vea.
      layout: {
        visibility: metroVisible ? 'visible' : 'none',
        'circle-sort-key': [
          'match',
          ['get', 'estado'],
          'fuera_servicio', 3,
          'escalera_mala', 2,
          'desconocido', 1,
          0,
        ],
      },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 7],
        'circle-color': [
          'match',
          ['get', 'estado'],
          'operativo', ESTADOS.operativo.color,
          'fuera_servicio', ESTADOS.fuera_servicio.color,
          'escalera_mala', ESTADOS.escalera_mala.color,
          ESTADOS.desconocido.color,
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color':
          temaRef.current === 'claro' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(10, 12, 20, 0.8)',
      },
    })
  }

  // Cambio de tema: clase en el documento + estilo base del mapa
  useEffect(() => {
    temaRef.current = tema
    document.documentElement.dataset.theme = tema
    localStorage.setItem('rutalibre-tema', tema)
    const map = mapRef.current
    if (map && mapListo) {
      map.setStyle(ESTILOS_MAPA[tema])
      map.once('style.load', () => agregarCapas(map))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tema])

  // Estaciones de la ruta presentes en un mapa de equipos caídos.
  // Cada detalle se compara con la dirección del tren (headsign): si el
  // equipo sirve a un andén de otra dirección, se marca como dudoso en vez
  // de descartarlo (los nombres de terminal de Metro y Google no siempre calzan).
  function cruzarEstaciones(r, mapa) {
    const vistas = new Set()
    const malas = []
    for (const est of r.estacionesMetro) {
      const clave = normalizarNombre(est.nombre)
      const info = mapa.get(clave)
      if (info && !vistas.has(clave)) {
        vistas.add(clave)
        const detalles = info.detalles.map((d) => ({
          ...d,
          quizasNoAfecta: Boolean(
            d.direccion &&
              est.direccion &&
              normalizarNombre(d.direccion) !== normalizarNombre(est.direccion)
          ),
        }))
        malas.push({ nombre: info.nombre, detalles, direccionViaje: est.direccion })
      }
    }
    return malas
  }

  // Ascensor malo = bloqueante para elegir ruta
  function estacionesProblema(r) {
    return cruzarEstaciones(r, estacionesMalasRef.current)
  }

  function limpiarMarkers() {
    for (const m of markersRef.current) m.remove()
    markersRef.current = []
  }

  // El marker escala con el zoom; Mapbox usa transform en el elemento raíz
  // para posicionarlo, así que el scale va en un hijo interno.
  function crearMarker(map, lngLat, clase, contenido, color, titulo) {
    const el = document.createElement('div')
    const inner = document.createElement('div')
    inner.className = `marker ${clase}`
    inner.textContent = contenido
    if (color) inner.style.background = color
    if (titulo) inner.title = titulo
    el.appendChild(inner)
    markersRef.current.push(
      new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map)
    )
  }

  function escalarMarkers() {
    const map = mapRef.current
    if (!map) return
    const escala = Math.min(1, Math.max(0.45, (map.getZoom() - 8.5) / 5.5))
    for (const m of markersRef.current) {
      const inner = m.getElement().firstChild
      if (inner) inner.style.transform = `scale(${escala})`
    }
  }

  async function alternarCalor() {
    const map = mapRef.current
    if (!map || calorCargando) return
    if (calorVisible) {
      map.setLayoutProperty('seguridad-celdas', 'visibility', 'none')
      setCalorVisible(false)
      return
    }

    setCalorCargando(true)
    try {
      const geojson = await crearHeatmapSeguridad()
      calorGeojsonRef.current = geojson
      map.getSource('seguridad-calor')?.setData(geojson)
      map.setLayoutProperty('seguridad-celdas', 'visibility', 'visible')
      setCalorVisible(true)
    } catch (err) {
      console.error('No se pudo cargar el mapa de calor', err)
      setErrorRuta('No se pudo cargar el mapa de calor de seguridad.')
    } finally {
      setCalorCargando(false)
    }
  }

  function alternarMetro() {
    const map = mapRef.current
    if (!map) return
    const visibilidad = metroVisible ? 'none' : 'visible'
    for (const capa of ['metro-lineas', 'dispositivos-circulos']) {
      if (map.getLayer(capa)) map.setLayoutProperty(capa, 'visibility', visibilidad)
    }
    setMetroVisible(!metroVisible)
  }

  function dibujarRuta(r) {
    setRuta(r)
    // Escaleras mecánicas malas en la ruta elegida: advertencia, no bloquea
    setAvisoEscaleras(cruzarEstaciones(r, escalerasMalasRef.current))
    rutaGeojsonRef.current = r.geojson
    const map = mapRef.current
    map.getSource('ruta').setData(r.geojson)

    // Marcadores: 📍 posición inicial, 🚌/🚇 cada abordaje, 🏁 destino
    limpiarMarkers()
    const feats = r.geojson.features
    if (feats.length) {
      const inicio = feats[0].geometry.coordinates[0]
      const finCoords = feats[feats.length - 1].geometry.coordinates
      const fin = finCoords[finCoords.length - 1]
      crearMarker(map, inicio, 'marker-origen', '📍', null, 'Estás aquí')
      for (const parada of r.paradas || []) {
        crearMarker(map, parada.coordenadas, 'marker-parada', '🔹', null, `Parada: ${parada.nombre}`)
      }
      for (const f of feats) {
        if (f.properties.caminando === 0) {
          crearMarker(
            map,
            f.geometry.coordinates[0],
            'marker-transporte',
            f.properties.icono || '🚌',
            f.properties.color,
            f.properties.etiqueta
          )
        }
      }
      crearMarker(map, fin, 'marker-destino', '🏁', null, 'Destino')
      escalarMarkers()
    }
    const coords = r.geojson.features.flatMap((f) => f.geometry.coordinates)
    if (coords.length) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      )
      map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 340, right: 60 } })
    }
  }

  function colorSeguridad(nivel) {
    return COLORES_SEGURIDAD[nivel] || null
  }

  async function dibujarRutaConSeguridad(r, opcionesSeguridad = {}, resultadoPrevio = null) {
    dibujarRuta(r)
    setSeguridadRuta({ estado: 'cargando' })
    try {
    const resultado = resultadoPrevio || (await puntuarRuta(
      r.geojson,
      { ...opcionesSeguridad, duracionMin: r.duracionMin },
    ))
      const geojson = {
        ...r.geojson,
        features: r.geojson.features.map((feature, i) => ({
          ...feature,
          properties: {
            ...feature.properties,
            seguridadColor: colorSeguridad(resultado.tramos?.[i]?.nivel),
          },
        })),
      }
      rutaGeojsonRef.current = geojson
      mapRef.current?.getSource('ruta')?.setData(geojson)
      setRuta({ ...r, geojson })
      setSeguridadRuta({ estado: 'lista', ...resultado })
    } catch (err) {
      console.error('No se pudo calcular la seguridad de la ruta', err)
      setSeguridadRuta({
        estado: 'error',
        recomendacion: recomendacionSeguridad(null),
      })
    }
  }

  function obtenerParadas(opcionesSeguridad, origenRuta, destinoRuta) {
    const vistas = new Set([normalizarNombre(origenRuta), normalizarNombre(destinoRuta)])
    return (opcionesSeguridad.paradas || [])
      .map((parada) => String(parada).trim().slice(0, 120))
      .filter((parada) => {
        const clave = normalizarNombre(parada)
        if (!clave || vistas.has(clave)) return false
        vistas.add(clave)
        return true
      })
      .slice(0, 4)
  }

  async function evaluarRutas(rutas, opcionesSeguridad) {
    return Promise.all(
      rutas.map(async (r) => {
        try {
          return {
            ruta: r,
            seguridad: await puntuarRuta(r.geojson, { ...opcionesSeguridad, duracionMin: r.duracionMin }),
          }
        } catch (err) {
          console.error('No se pudo puntuar una alternativa', err)
          return { ruta: r, seguridad: null }
        }
      })
    )
  }

  function descripcionSeleccion(seleccion, opcionesSeguridad) {
    if (seleccion.seguridad?.caminataExcesiva) {
      const base = seleccion.motivo || 'Se eligió la mejor candidata disponible.'
      return `${base} La caminata tomaría aproximadamente ${seleccion.seguridad.duracionMin} min; recomendamos pedir un auto.`
    }
    if (seleccion.motivo) return seleccion.motivo
    if (opcionesSeguridad.modo !== 'seguridad') return null
    if (seleccion.criterio === 'sin-datos') return 'No pudimos puntuar las candidatas; se muestra la ruta más rápida disponible.'
    if (seleccion.criterio === 'unica' || seleccion.alternativas <= 1) {
      return 'Google entregó una sola ruta peatonal válida para comparar.'
    }
    return `Se mantuvo la ruta más rápida entre ${seleccion.alternativas} candidatas: ninguna alternativa fue suficientemente más segura dentro del límite de tiempo.`
  }

  async function seleccionarRutaAccesible(rutas, o, d, opcionesSeguridad = {}) {
    const malas = estacionesProblema(rutas[0])
    let candidatas = rutas
      .map((r) => ({ ruta: r, malas: estacionesProblema(r) }))
      .filter((candidata) => !candidata.malas.length)

    if (!candidatas.length) {
      try {
        const soloBus = await buscarRutas(o, d, { soloBus: true })
        candidatas = soloBus
          .map((r) => ({ ruta: r, malas: estacionesProblema(r) }))
          .filter((candidata) => !candidata.malas.length)
      } catch (err) {
        console.error(err)
      }
    }

    if (!candidatas.length) {
      return {
        ruta: rutas[0],
        malas,
        ajustada: false,
        seguridad: null,
        motivo: null,
        criterio: 'unica',
        alternativas: 0,
        corredores: 0,
      }
    }

    const evaluadas = await evaluarRutas(
      candidatas.map((candidata) => candidata.ruta),
      opcionesSeguridad
    )
    const seleccion = elegirRutaSegura(evaluadas)
    const corredores = candidatas.filter((candidata) => candidata.ruta.fuenteRuta === 'corredor-seguro').length
    const seguridad = seleccion.evaluada?.seguridad
      ? {
          ...seleccion.evaluada.seguridad,
          criterio: seleccion.criterio,
          alternativas: seleccion.alternativas,
          corredores,
        }
      : null
    return {
      ruta: seleccion.evaluada.ruta,
      malas,
      ajustada: Boolean(malas.length && seleccion.evaluada.ruta !== rutas[0]),
      seguridad,
      motivo: seleccion.motivo,
      criterio: seleccion.criterio,
      alternativas: seleccion.alternativas,
      corredores,
    }
  }

  // o puede ser texto o coordenadas {lat, lng} (geolocalización del asistente)
  async function buscar(o, d, opcionesSeguridad = {}) {
    setBuscando(true)
    setErrorRuta(null)
    setAlerta(null)
    setAvisoOk(null)
    setMotivoRuta(null)
    setSeguridadRuta(null)
    const paradas = obtenerParadas(opcionesSeguridad, o, d)
    const contexto = { ...opcionesSeguridad, paradas }
    const modoRuteo = opcionesSeguridad.modo === 'seguridad' ? 'WALK' : 'TRANSIT'
    setContextoRuta(
      opcionesSeguridad.modo &&
        (opcionesSeguridad.modo !== 'ruta' || opcionesSeguridad.hora || opcionesSeguridad.actividades?.length)
        ? contexto
        : null,
    )
    try {
      if (paradas.length) {
        const plan = await buscarRutasPlan(o, d, paradas, { modo: modoRuteo })
        ultimaBusquedaRef.current = { o, d, paradas, opcionesSeguridad: contexto }
        planTramosRef.current = plan.rutasPorTramo
        alternativasRef.current = []
        await aplicarPlanAccesible(plan.rutasPorTramo, plan.puntos, contexto)
      } else {
        const rutas = opcionesSeguridad.modo === 'seguridad'
          ? await buscarRutasSeguras(o, d, { modo: modoRuteo, hora: opcionesSeguridad.hora })
          : await buscarRutas(o, d, { modo: modoRuteo })
        ultimaBusquedaRef.current = { o, d, paradas, opcionesSeguridad: contexto }
        planTramosRef.current = []
        alternativasRef.current = rutas
        await aplicarRutaAccesible(rutas, o, d, contexto)
      }
    } catch (err) {
      console.error(err)
      setRuta(null)
      setSeguridadRuta(null)
      setAvisoEscaleras([])
      limpiarMarkers()
      rutaGeojsonRef.current = null
      planTramosRef.current = []
      mapRef.current?.getSource('ruta')?.setData(VACIO)
      setErrorRuta(mensajeErrorRuta(err))
    } finally {
      setBuscando(false)
    }
  }

  // Origen opcional: vacío (o "Mi ubicación") usa el GPS del dispositivo,
  // con fallback a Campus San Joaquín si el usuario no da permiso.
  async function onBuscar(e) {
    e.preventDefault()
    const d = destino.trim().slice(0, 120)
    let o = origen.trim().slice(0, 120)
    if (!d || buscando) return
    if (!o || o === 'Mi ubicación') {
      const pos = await ubicacionActual()
      o = pos || CAMPUS_SJ
      setOrigenEsFallback(!pos)
      setOrigen(pos ? 'Mi ubicación' : CAMPUS_SJ)
    } else {
      setOrigenEsFallback(false)
    }
    await buscar(o, d)
  }

  async function onAsistente(e) {
    e.preventDefault()
    await consultarAsistente(consulta)
  }

  // Dictado por voz (Web Speech API, Chrome): transcribe y consulta directo
  function onMicrofono() {
    if (!SpeechRecognition || buscando) return
    if (grabando) {
      reconocimientoRef.current?.stop()
      return
    }
    const rec = new SpeechRecognition()
    reconocimientoRef.current = rec
    rec.lang = 'es-CL'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (ev) => {
      const texto = ev.results[0]?.[0]?.transcript || ''
      setConsulta(texto)
      if (texto.trim()) consultarAsistente(texto)
    }
    rec.onerror = () => {
      setGrabando(false)
      setErrorRuta('No se pudo capturar el audio. Revisa el permiso del micrófono.')
    }
    rec.onend = () => setGrabando(false)
    setErrorRuta(null)
    setGrabando(true)
    rec.start()
  }

  async function consultarAsistente(texto) {
    const q = texto.trim().slice(0, 200)
    if (!q || buscando) return
    setBuscando(true)
    setErrorRuta(null)
    // El finally garantiza soltar "Buscando…" en todos los caminos (antes un
    // return temprano dejaba el botón pegado si Gemini no entendía el destino)
    let origenRuta = null
    let destinoRuta = null
    let opcionesRuta = {}
    try {
      const r = await interpretarConsulta(q)
      if (!r.destino) {
        setErrorRuta('No entendí el destino. Intenta describirlo de otra forma.')
        return
      }
      let o = r.origen
      if (!o) {
        const pos = await ubicacionActual()
        o = pos || CAMPUS_SJ
        setOrigenEsFallback(!pos)
        setOrigen(pos ? 'Mi ubicación' : CAMPUS_SJ)
      } else {
        setOrigenEsFallback(false)
        setOrigen(o)
      }
      setDestino(r.destino)
      origenRuta = o
      destinoRuta = r.destino
      opcionesRuta = { hora: r.hora, modo: r.modo, paradas: r.paradas, actividades: r.actividades }
    } catch (err) {
      console.error(err)
      setErrorRuta('El asistente no pudo procesar la consulta.')
    } finally {
      setBuscando(false)
    }
    if (destinoRuta) await buscar(origenRuta, destinoRuta, opcionesRuta)
  }

  async function verRutaAuto() {
    const busqueda = ultimaBusquedaRef.current
    if (!busqueda || autoCargando) return
    setAutoCargando(true)
    setErrorRuta(null)
    setAlerta(null)
    setAvisoEscaleras([])
    setMotivoRuta(null)
    try {
      let rutaAuto
      if (busqueda.paradas?.length) {
        const plan = await buscarRutasPlan(busqueda.o, busqueda.d, busqueda.paradas, { modo: 'DRIVE' })
        rutaAuto = combinarRutas(
          plan.rutasPorTramo.map((rutas) => rutas[0]),
          busqueda.paradas
        )
      } else {
        const rutas = await buscarRutas(busqueda.o, busqueda.d, { modo: 'DRIVE' })
        rutaAuto = rutas[0]
      }
      await dibujarRutaConSeguridad(rutaAuto, { modo: 'auto' })
      setAvisoOk('Alternativa en auto calculada. Revisa el tiempo y el costo antes de salir.')
    } catch (err) {
      console.error(err)
      setErrorRuta(mensajeErrorRuta(err))
    } finally {
      setAutoCargando(false)
    }
  }

  // Botón demo Feria: marca como caído el ascensor de una estación de la
  // ruta actual, pinta sus puntos en rojo y la app recalcula sola.
  async function onSimularFalla() {
    const r = ruta
    if (!r || buscando) return
    const objetivo = r.estacionesMetro.find(
      (est) => !estacionesMalasRef.current.has(normalizarNombre(est.nombre))
    )
    if (!objetivo) return
    const clave = normalizarNombre(objetivo.nombre)
    const info = {
      nombre: objetivo.nombre,
      detalles: [{ texto: 'Falla simulada para demo', direccion: null }],
    }
    estacionesMalasRef.current.set(clave, info)

    const geojson = dispositivosRef.current
    if (geojson) {
      for (const f of geojson.features) {
        if (normalizarNombre(f.properties.nombre_estacion) === clave) {
          f.properties.estado = 'fuera_servicio'
        }
      }
      mapRef.current?.getSource('dispositivos')?.setData(geojson)
    }
    setAvisoOk(null)
    setAlerta(null)
    if (
      ultimaBusquedaRef.current &&
      (alternativasRef.current.length || planTramosRef.current.length)
    ) {
      setBuscando(true)
      try {
        const { o, d, paradas, opcionesSeguridad } = ultimaBusquedaRef.current
        if (paradas?.length) {
          const puntos = [o, ...paradas, d]
          await aplicarPlanAccesible(planTramosRef.current, puntos, opcionesSeguridad)
        } else {
          await aplicarRutaAccesible(alternativasRef.current, o, d, opcionesSeguridad)
        }
      } finally {
        setBuscando(false)
      }
    }
  }

  // El usuario siempre tiene movilidad reducida: primero se descartan las rutas
  // con ascensores malos y después se compara seguridad contra duración.
  async function aplicarRutaAccesible(rutas, o, d, opcionesSeguridad = {}) {
    const seleccion = await seleccionarRutaAccesible(rutas, o, d, opcionesSeguridad)
    await dibujarRutaConSeguridad(seleccion.ruta, opcionesSeguridad, seleccion.seguridad)
    setMotivoRuta(descripcionSeleccion(seleccion, opcionesSeguridad))
    if (!seleccion.malas.length) return
    if (seleccion.ajustada) {
      setAvisoOk(`Ruta ajustada por accesibilidad: evita ${seleccion.malas.map((m) => m.nombre).join(', ')}`)
      setAlerta({ malas: seleccion.malas, evitada: true })
    } else {
      setAlerta({ malas: seleccion.malas, sinAlternativa: true })
    }
  }

  async function aplicarPlanAccesible(rutasPorTramo, puntos, opcionesSeguridad = {}) {
    const seleccionadas = []
    const problemas = []
    const motivos = []
    let tramosAjustados = 0
    let tramoSinAlternativa = false

    for (let i = 0; i < rutasPorTramo.length; i += 1) {
      const seleccion = await seleccionarRutaAccesible(
        rutasPorTramo[i],
        puntos[i],
        puntos[i + 1],
        opcionesSeguridad
      )
      seleccionadas.push(seleccion.ruta)
      problemas.push(...seleccion.malas)
      const motivo = descripcionSeleccion(seleccion, opcionesSeguridad)
      if (motivo) motivos.push(motivo)
      if (seleccion.ajustada) tramosAjustados += 1
      if (seleccion.malas.length && !seleccion.ajustada) tramoSinAlternativa = true
    }

    const rutaPlan = combinarRutas(seleccionadas, puntos.slice(1, -1))
    await dibujarRutaConSeguridad(rutaPlan, opcionesSeguridad)
    setMotivoRuta(motivos.length ? `Plan: ${motivos.join(' ')}` : null)

    const malas = [...new Map(problemas.map((m) => [normalizarNombre(m.nombre), m])).values()]
    if (!malas.length) return
    if (tramosAjustados) {
      setAvisoOk(`Plan ajustado por accesibilidad: evita ${malas.map((m) => m.nombre).join(', ')}`)
    }
    setAlerta({ malas, evitada: tramosAjustados > 0, sinAlternativa: tramoSinAlternativa })
  }

  if (!TOKEN) {
    return (
      <div className="aviso-token">
        Falta <code>VITE_MAPBOX_TOKEN</code> en <code>frontend/.env.local</code>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className="mapa" />
      {!mapListo && (
        <div className="cargando">
          <div className="cargando-caja">
            {errorMapa ? (
              <>
                <strong>Mapa no disponible</strong>
                <p>{errorMapa}</p>
              </>
            ) : (
              <>
                <div className="spinner" />
                <p>Cargando mapa de seguridad…</p>
              </>
            )}
          </div>
        </div>
      )}
      {metroVisible && lineasInfo.length > 0 && (
        <div className="leyenda-lineas">
          {lineasInfo.map((l) => (
            <div key={l.ref}>
              <span className="trazo" style={{ background: l.color }} /> {l.nombre}
            </div>
          ))}
        </div>
      )}
      <div className="panel">
        <div className="panel-cabecera">
          <h1>Ojo al Paso</h1>
          <button
            type="button"
            className="btn-tema"
            onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')}
            title={tema === 'claro' ? 'Modo oscuro' : 'Modo claro'}
          >
            {tema === 'claro' ? '🌙' : '☀️'}
          </button>
        </div>
        <p className="subtitulo">Muévete por Santiago con más seguridad</p>
        <div className="control-calor">
          <button
            type="button"
            className={calorVisible ? 'btn-calor activo' : 'btn-calor'}
            onClick={alternarCalor}
            disabled={!mapListo || calorCargando}
          >
            {calorCargando ? 'Cargando mapa…' : calorVisible ? 'Ocultar mapa de riesgo' : '🔥 Ver mapa de seguridad'}
          </button>
          {calorVisible && (
            <>
              <small>Estimación relativa: rojo indica mayor riesgo.</small>
              <div className="leyenda-seguridad" aria-label="Escala de seguridad">
                <span><i className="punto-seguridad riesgo-alto" /> Riesgo alto</span>
                <span><i className="punto-seguridad precaucion" /> Precaución</span>
                <span><i className="punto-seguridad riesgo-bajo" /> Más favorable</span>
              </div>
            </>
          )}
        </div>
        <div className="control-metro">
          <button
            type="button"
            className={metroVisible ? 'btn-metro activo' : 'btn-metro'}
            onClick={alternarMetro}
            disabled={!mapListo}
          >
            {metroVisible ? 'Ocultar accesibilidad Metro' : 'Ver accesibilidad Metro'}
          </button>
          {metroVisible && (
            <small>
              {dispositivosListos
                ? resumen?.conDatos
                  ? 'Estaciones, ascensores y escaleras mecánicas.'
                  : 'Estado en vivo no disponible; se muestran los datos básicos.'
                : 'Cargando estado de ascensores y escaleras…'}
            </small>
          )}
        </div>

        {asistenteDisponible && (
          <form className="asistente" onSubmit={onAsistente}>
            <input
              type="text"
              placeholder="Ej: ¿es seguro caminar de noche por Bellavista?"
              value={consulta}
              maxLength={200}
              onChange={(e) => setConsulta(e.target.value)}
            />
            <div className="asistente-botones">
              <button
                type="submit"
                className="btn-ia"
                disabled={!mapListo || buscando || !consulta.trim()}
              >
                ✨ Preguntar a Ojo al Paso
              </button>
              {SpeechRecognition && (
                <button
                  type="button"
                  className={grabando ? 'btn-mic grabando' : 'btn-mic'}
                  onClick={onMicrofono}
                  disabled={!mapListo || buscando}
                  title={grabando ? 'Escuchando… toca para detener' : 'Consultar por voz'}
                >
                  🎤
                </button>
              )}
            </div>
          </form>
        )}
        <form className="buscador" onSubmit={onBuscar}>
          <input
            type="text"
              placeholder="¿Desde dónde sales? (vacío = usar GPS)"
            value={origen}
            maxLength={120}
            onChange={(e) => setOrigen(e.target.value)}
          />
          <input
            type="text"
            placeholder="Destino"
            value={destino}
            maxLength={120}
            onChange={(e) => setDestino(e.target.value)}
          />
          <button type="submit" disabled={!mapListo || buscando || !destino.trim()}>
            {buscando ? 'Buscando…' : 'Buscar ruta'}
          </button>
        </form>
        {errorRuta && <p className="panel-error">{errorRuta}</p>}

        {alerta && (
          <div className={alerta.evitada ? 'alerta alerta-evitada' : 'alerta'}>
            <p className="alerta-titulo">
              {alerta.evitada
                ? 'ℹ Estaciones evitadas automáticamente'
                : '⚠ Sin alternativa accesible: la ruta pasa por'}
            </p>
            <ul>
              {alerta.malas.map((m) => (
                <li key={m.nombre}>
                  <strong>{m.nombre}</strong>
                  <ul className="alerta-detalles">
                    {m.detalles.map((d, i) => (
                      <li key={i} className={d.quizasNoAfecta ? 'detalle-dudoso' : ''}>
                        {d.quizasNoAfecta ? '❓' : '⛔'} {d.texto}
                        {d.quizasNoAfecta && (
                          <em> — tu tren va dirección {m.direccionViaje}; podría no afectarte</em>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {alerta.sinAlternativa && (
              <p className="alerta-sin">
                No se encontró una alternativa que evite estas estaciones. Considera pedir asistencia
                en la estación.
              </p>
            )}
          </div>
        )}
        {avisoOk && <p className="aviso-ok">✓ {avisoOk}</p>}
        {motivoRuta && <p className="aviso-seguridad">🛡 {motivoRuta}</p>}
        {origenEsFallback && ruta && (
          <p className="aviso-contexto">
            ℹ No pudimos usar tu ubicación; la ruta parte desde Campus San Joaquín UC.
          </p>
        )}

        {avisoEscaleras.length > 0 && (
          <div className="alerta alerta-escaleras">
            <p className="alerta-titulo">⚠ Escaleras mecánicas en pana (el ascensor funciona)</p>
            <ul>
              {avisoEscaleras.map((m) => (
                <li key={m.nombre}>
                  <strong>{m.nombre}</strong>
                  <ul className="alerta-detalles">
                    {m.detalles.map((d, i) => (
                      <li key={i} className={d.quizasNoAfecta ? 'detalle-dudoso' : ''}>
                        {d.quizasNoAfecta ? '❓' : '⚠'} {d.texto}
                        {d.quizasNoAfecta && (
                          <em> — tu tren va dirección {m.direccionViaje}; podría no afectarte</em>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ruta && (
          <div className="itinerario">
            {seguridadRuta && (
              <div
                className={`seguridad-card seguridad-${
                  seguridadRuta.estado === 'lista' ? seguridadRuta.nivel : 'sin-datos'
                }`}
              >
                {seguridadRuta.estado === 'cargando' ? (
                  <p className="seguridad-mensaje">Calculando seguridad de la ruta…</p>
                ) : seguridadRuta.estado === 'lista' ? (
                  <>
                    <div className="seguridad-encabezado">
                      <span>Seguridad estimada</span>
                      <strong>{seguridadRuta.score}/100</strong>
                    </div>
                    <p className="seguridad-mensaje">{seguridadRuta.recomendacion.mensaje}</p>
                    <small>Considera hora, contexto urbano y antecedentes del sector.</small>
                    <small>Es una estimación relativa, no una garantía.</small>
                    {seguridadRuta.tipoRuta === 'caminata' && seguridadRuta.alternativas != null && (
                      <small>
                        {seguridadRuta.alternativas > 1
                          ? `Se compararon ${seguridadRuta.alternativas} candidatas peatonales${seguridadRuta.corredores ? `, incluyendo ${seguridadRuta.corredores} corredor${seguridadRuta.corredores === 1 ? '' : 'es'} seguro${seguridadRuta.corredores === 1 ? '' : 's'}.` : '.'}`
                          : 'Google entregó una sola candidata peatonal para este trayecto.'}
                      </small>
                    )}
                    {seguridadRuta.tipoRuta === 'caminata' && (
                      <small>La ruta peatonal depende de la cobertura de veredas de Google.</small>
                    )}
                    {seguridadRuta.tipoRuta === 'caminata' &&
                      (seguridadRuta.nivel === 'auto' || seguridadRuta.caminataExcesiva) && (
                      <>
                        <small className="seguridad-no-recomendada">
                          {seguridadRuta.caminataExcesiva
                            ? 'Esta caminata supera el máximo razonable de 90 minutos; se muestra solo como referencia.'
                            : 'La caminata mostrada es la opción evaluada; la recomendación es pedir un auto.'}
                        </small>
                        <button type="button" className="btn-auto" onClick={verRutaAuto} disabled={autoCargando}>
                          {autoCargando ? 'Calculando ruta en auto…' : '🚗 Ver alternativa en auto'}
                        </button>
                      </>
                    )}
                    {contextoRuta?.modo === 'seguridad' && <small>Consulta enfocada en seguridad.</small>}
                    {contextoRuta?.modo === 'plan' && ruta.paradas?.length > 0 && (
                      <small>Paradas del plan: {ruta.paradas.map((parada) => parada.nombre).join(' · ')}.</small>
                    )}
                  </>
                ) : (
                  <p className="seguridad-mensaje">{seguridadRuta.recomendacion.mensaje}</p>
                )}
              </div>
            )}
            <p className="ruta-duracion">
              ⏱ ~{ruta.duracionMin} min <span className="duracion-nota">a tu ritmo</span>
            </p>
            <ol className="timeline">
              {ruta.pasos.map((p, i) => (
                <li
                  key={i}
                  style={{
                    '--paso-color': p.tipo === 'transit' ? p.color : p.tipo === 'auto' ? '#475569' : '#6b7280',
                  }}
                >
                  {p.tipo === 'transit' ? (
                    <>
                      <span className="badge" style={{ background: p.color, color: p.textColor }}>
                        {p.icono} {p.etiqueta}
                      </span>
                      {p.expresa && (
                        <span className={`chip-expresa expresa-${p.expresa.toLowerCase()}`}>
                          ● Ruta {p.expresa}
                        </span>
                      )}
                      <p className="paso-ruta">
                        {p.desde} <span className="paso-flecha">→</span> {p.hasta}
                      </p>
                      <p className="paso-meta">
                        {p.direccion ? `dirección ${p.direccion}` : ''}
                        {p.direccion && p.paradas != null ? ' · ' : ''}
                        {p.paradas != null ? `${p.paradas} paradas` : ''}
                      </p>
                    </>
                  ) : p.tipo === 'auto' ? (
                    <span className="badge badge-auto">
                      🚗 Auto{p.minutos ? ` · ~${p.minutos} min` : ''}
                    </span>
                  ) : (
                    <span className="badge badge-caminata">
                      🚶 Caminata{p.minutos ? ` · ~${p.minutos} min` : ''}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {ruta && ruta.estacionesMetro.length > 0 && (
          <button type="button" className="btn-demo" onClick={onSimularFalla} disabled={buscando}>
            ⚡ Simular falla de ascensor
          </button>
        )}

        {metroVisible && resumen && (
          <p className="panel-resumen">
            {resumen.conDatos
              ? `${resumen.fueraServicio} de ${resumen.total} equipos fuera de servicio`
              : 'Sin conexión al estado en vivo'}
          </p>
        )}
        {metroVisible && (
          <ul className="leyenda">
            {Object.values(ESTADOS).map((e) => (
              <li key={e.label}>
                <span className="punto" style={{ background: e.color }} /> {e.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
