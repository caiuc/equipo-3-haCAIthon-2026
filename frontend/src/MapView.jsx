import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { cargarDispositivos, normalizarNombre, ESTADOS } from './lib/dispositivos'
import { buscarRutas } from './lib/rutas'
import { interpretarConsulta, asistenteDisponible } from './lib/asistente'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const SANTIAGO = [-70.6506, -33.4372]
const VACIO = { type: 'FeatureCollection', features: [] }
const ESTILOS_MAPA = {
  oscuro: 'mapbox://styles/mapbox/dark-v11',
  claro: 'mapbox://styles/mapbox/light-v11',
}
const CAMPUS_SJ = 'Campus San Joaquín UC, Santiago, Chile'

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

export default function MapView() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [mapListo, setMapListo] = useState(false)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState(null)
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [ruta, setRuta] = useState(null)
  const [errorRuta, setErrorRuta] = useState(null)
  const [alerta, setAlerta] = useState(null)
  const [avisoOk, setAvisoOk] = useState(null)
  const [consulta, setConsulta] = useState('')
  const [grabando, setGrabando] = useState(false)
  const reconocimientoRef = useRef(null)
  const [tema, setTema] = useState(() => localStorage.getItem('rutalibre-tema') || 'claro')
  const [lineasInfo, setLineasInfo] = useState([])
  const temaRef = useRef(tema)
  const rutaGeojsonRef = useRef(null)
  const lineasRef = useRef(null)
  const markersRef = useRef([])
  const ultimaBusquedaRef = useRef(null)
  const estacionesMalasRef = useRef(new Map())
  const escalerasMalasRef = useRef(new Map())
  const [avisoEscaleras, setAvisoEscaleras] = useState([])
  const alternativasRef = useRef([])
  const dispositivosRef = useRef(null)

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
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right'
    )
    map.on('zoom', escalarMarkers)

    map.on('load', async () => {
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
        setResumen({ fueraServicio, total, conDatos })

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
      } catch (err) {
        console.error(err)
        setError('No se pudieron cargar los datos de ascensores')
      }
    })

    return () => {
      desmontado = true
      map.remove()
    }
  }, [])

  // Fuentes y capas custom. Se llama al cargar y tras cada cambio de estilo
  // base (setStyle borra todo lo custom, hay que volver a agregarlo).
  function agregarCapas(map) {
    if (map.getSource('dispositivos')) return
    // Trazado de las líneas de Metro (estático, OSM), debajo de ruta y puntos
    if (lineasRef.current) {
      map.addSource('metro-lineas', { type: 'geojson', data: lineasRef.current })
      map.addLayer({
        id: 'metro-lineas',
        type: 'line',
        source: 'metro-lineas',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 14, 4],
          'line-opacity': 0.55,
        },
      })
    }
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
      paint: { 'line-color': ['get', 'color'], 'line-width': 5, 'line-opacity': 0.9 },
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
        'line-color': temaRef.current === 'claro' ? '#1f2937' : '#eef1f8',
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

  // o puede ser texto o coordenadas {lat, lng} (geolocalización del asistente)
  async function buscar(o, d) {
    setBuscando(true)
    setErrorRuta(null)
    setAlerta(null)
    setAvisoOk(null)
    try {
      const rutas = await buscarRutas(o, d)
      ultimaBusquedaRef.current = { o, d }
      alternativasRef.current = rutas
      await aplicarRutaAccesible(rutas, o, d)
    } catch (err) {
      console.error(err)
      setRuta(null)
      setAvisoEscaleras([])
      limpiarMarkers()
      rutaGeojsonRef.current = null
      mapRef.current?.getSource('ruta')?.setData(VACIO)
      setErrorRuta('No se encontró una ruta. Revisa origen y destino.')
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
      setOrigen(pos ? 'Mi ubicación' : CAMPUS_SJ)
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
        setOrigen(pos ? 'Mi ubicación' : CAMPUS_SJ)
      } else {
        setOrigen(o)
      }
      setDestino(r.destino)
      origenRuta = o
      destinoRuta = r.destino
    } catch (err) {
      console.error(err)
      setErrorRuta('El asistente no pudo procesar la consulta.')
    } finally {
      setBuscando(false)
    }
    if (destinoRuta) await buscar(origenRuta, destinoRuta)
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
    if (ultimaBusquedaRef.current && alternativasRef.current.length) {
      setBuscando(true)
      try {
        const { o, d } = ultimaBusquedaRef.current
        await aplicarRutaAccesible(alternativasRef.current, o, d)
      } finally {
        setBuscando(false)
      }
    }
  }

  // El usuario siempre tiene movilidad reducida: la app elige sola la mejor
  // ruta que no pase por estaciones con ascensor malo. Primero la principal,
  // luego las alternativas de Google y como último recurso solo buses.
  async function aplicarRutaAccesible(rutas, o, d) {
    const malas = estacionesProblema(rutas[0])
    if (!malas.length) {
      dibujarRuta(rutas[0])
      return
    }
    let limpia = rutas.slice(1).find((r) => estacionesProblema(r).length === 0)
    if (!limpia) {
      try {
        const soloBus = await buscarRutas(o, d, { soloBus: true })
        limpia = soloBus.find((r) => estacionesProblema(r).length === 0)
      } catch (err) {
        console.error(err)
      }
    }
    if (limpia) {
      dibujarRuta(limpia)
      setAvisoOk(`Ruta ajustada por accesibilidad: evita ${malas.map((m) => m.nombre).join(', ')}`)
      setAlerta({ malas, evitada: true })
    } else {
      dibujarRuta(rutas[0])
      setAlerta({ malas, sinAlternativa: true })
    }
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
      <img className="logo-app" src="/logo.png" alt="RutaLibre" />
      {!mapListo && !error && (
        <div className="cargando">
          <div className="cargando-caja">
            <div className="spinner" />
            <p>Cargando mapa y datos del Metro…</p>
          </div>
        </div>
      )}
      {lineasInfo.length > 0 && (
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
          <h1>RutaLibre</h1>
          <button
            type="button"
            className="btn-tema"
            onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')}
            title={tema === 'claro' ? 'Modo oscuro' : 'Modo claro'}
          >
            {tema === 'claro' ? '🌙' : '☀️'}
          </button>
        </div>
        <p className="subtitulo">Accesibilidad Metro de Santiago</p>

        {asistenteDisponible && (
          <form className="asistente" onSubmit={onAsistente}>
            <input
              type="text"
              placeholder="Ej: voy en silla de ruedas al Costanera Center"
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
                ✨ Buscar con IA
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
            placeholder="Origen (vacío = usar mi GPS)"
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
            <p className="ruta-duracion">
              ⏱ ~{ruta.duracionMin} min <span className="duracion-nota">a tu ritmo</span>
            </p>
            <ol className="timeline">
              {ruta.pasos.map((p, i) => (
                <li key={i} style={{ '--paso-color': p.tipo === 'transit' ? p.color : '#6b7280' }}>
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

        {error && <p className="panel-error">{error}</p>}
        {resumen && (
          <p className="panel-resumen">
            {resumen.conDatos
              ? `${resumen.fueraServicio} de ${resumen.total} equipos fuera de servicio`
              : 'Sin conexión al estado en vivo'}
          </p>
        )}
        <ul className="leyenda">
          {Object.values(ESTADOS).map((e) => (
            <li key={e.label}>
              <span className="punto" style={{ background: e.color }} /> {e.label}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
