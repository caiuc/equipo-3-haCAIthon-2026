import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { cargarDispositivos, ESTADOS } from './lib/dispositivos'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
const SANTIAGO = [-70.6506, -33.4372]

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export default function MapView() {
  const containerRef = useRef(null)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState(null)

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
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

    map.on('load', async () => {
      try {
        const { geojson, fueraServicio, total, conDatos } = await cargarDispositivos()
        if (desmontado) return
        setResumen({ fueraServicio, total, conDatos })

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
