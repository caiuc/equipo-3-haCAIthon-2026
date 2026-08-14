import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { cargarDispositivos, ESTADOS } from './lib/dispositivos'
import { buscarRuta } from './lib/rutas'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const SANTIAGO = [-70.6506, -33.4372]
const VACIO = { type: 'FeatureCollection', features: [] }

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

  useEffect(() => {
    if (!TOKEN) return
    let desmontado = false
    mapboxgl.accessToken = TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: SANTIAGO,
      zoom: 11.5,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

    map.on('load', async () => {
      try {
        const { geojson, fueraServicio, total, conDatos } = await cargarDispositivos()
        if (desmontado) return
        setResumen({ fueraServicio, total, conDatos })

        map.addSource('ruta', { type: 'geojson', data: VACIO })
        map.addLayer({
          id: 'ruta-transporte',
          type: 'line',
          source: 'ruta',
          filter: ['==', ['get', 'caminando'], 0],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': ['get', 'color'], 'line-width': 5, 'line-opacity': 0.9 },
        })
        map.addLayer({
          id: 'ruta-caminata',
          type: 'line',
          source: 'ruta',
          filter: ['==', ['get', 'caminando'], 1],
          paint: {
            'line-color': '#c6cddc',
            'line-width': 3,
            'line-opacity': 0.8,
            'line-dasharray': [0.5, 2],
          },
        })

        map.addSource('dispositivos', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'dispositivos-circulos',
          type: 'circle',
          source: 'dispositivos',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 7],
            'circle-color': [
              'match',
              ['get', 'estado'],
              'operativo', ESTADOS.operativo.color,
              'fuera_servicio', ESTADOS.fuera_servicio.color,
              ESTADOS.desconocido.color,
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': 'rgba(10, 12, 20, 0.8)',
          },
        })

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

  async function onBuscar(e) {
    e.preventDefault()
    const o = origen.trim().slice(0, 120)
    const d = destino.trim().slice(0, 120)
    if (!o || !d || buscando) return
    setBuscando(true)
    setErrorRuta(null)
    try {
      const r = await buscarRuta(o, d)
      setRuta(r)
      const map = mapRef.current
      map.getSource('ruta').setData(r.geojson)
      const coords = r.geojson.features.flatMap((f) => f.geometry.coordinates)
      if (coords.length) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        )
        map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 340, right: 60 } })
      }
    } catch (err) {
      console.error(err)
      setRuta(null)
      mapRef.current?.getSource('ruta')?.setData(VACIO)
      setErrorRuta('No se encontró una ruta. Revisa origen y destino.')
    } finally {
      setBuscando(false)
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
      <div className="panel">
        <h1>RutaLibre</h1>
        <p className="subtitulo">Accesibilidad Metro de Santiago</p>

        <form className="buscador" onSubmit={onBuscar}>
          <input
            type="text"
            placeholder="Origen"
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
          <button type="submit" disabled={!mapListo || buscando}>
            {buscando ? 'Buscando…' : 'Buscar ruta'}
          </button>
        </form>
        {errorRuta && <p className="panel-error">{errorRuta}</p>}

        {ruta && (
          <div className="itinerario">
            <p className="ruta-duracion">⏱ {ruta.duracionMin} min</p>
            <ol>
              {ruta.pasos.map((p, i) => (
                <li key={i}>
                  <span className="paso-icono">{p.icono}</span> {p.texto}
                </li>
              ))}
            </ol>
          </div>
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
