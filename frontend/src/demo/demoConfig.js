import {
  DEMO_RIESGOS_COORDS,
  DEMO_RUTA_BALANCEADA_COORDS,
  DEMO_RUTA_RAPIDA_COORDS,
  DEMO_RUTA_SEGURA_COORDS,
} from './demoRoutes'

export const DEMO_ORIGEN = 'Campus San Joaquín UC'
export const DEMO_DESTINO = 'Plaza Ñuñoa'

const INICIO = DEMO_RUTA_RAPIDA_COORDS[0]
const FIN = DEMO_RUTA_RAPIDA_COORDS.at(-1)

function linea(id, tipo, coordenadas, propiedades = {}) {
  return {
    type: 'Feature',
    properties: { id, tipo, ...propiedades },
    geometry: { type: 'LineString', coordinates: coordenadas },
  }
}

export const DEMO_RUTAS = {
  type: 'FeatureCollection',
  features: [
    linea('rapida', 'alternativa', DEMO_RUTA_RAPIDA_COORDS),
    linea('segura', 'alternativa', DEMO_RUTA_SEGURA_COORDS),
    linea('equilibrada', 'principal', DEMO_RUTA_BALANCEADA_COORDS),
  ],
}

export const DEMO_SEGMENTOS_RIESGO = {
  type: 'FeatureCollection',
  features: DEMO_RIESGOS_COORDS.map((segmento, indice) =>
    linea(`${segmento.id}-${indice}`, 'riesgo', segmento.coordinates, {
      nombre: segmento.nombre,
      ruta: segmento.ruta,
    })
  ),
}

export const DEMO_ETIQUETAS = [
  {
    id: 'rapida',
    coordenadas: [-70.610748, -33.477036],
    puntoRuta: [-70.610748, -33.477036],
    anchor: 'right',
    offset: [-28, 0],
    offsetMovil: [-2, 0],
    titulo: 'Ruta más rápida',
    filas: [
      { icono: '⚡', texto: '18 minutos', tono: 'neutro' },
      { icono: '🛡️', texto: 'Seguridad estimada: 51/100', tono: 'neutro' },
    ],
  },
  {
    id: 'equilibrada',
    coordenadas: [-70.609, -33.4632],
    puntoRuta: [-70.604275, -33.474046],
    conector: true,
    offsetMovil: [-60, 15],
    titulo: 'Ruta balanceada',
    destacada: true,
    filas: [
      { icono: '⚡', texto: '21 min · +3 min', tono: 'negativo' },
      { icono: '🛡️', texto: '+27% de seguridad', tono: 'positivo' },
    ],
    componentes: [
      '−0,8 km de calles de riesgo',
      '−18% de delitos',
      '+22% de luminarias',
    ],
  },
  {
    id: 'segura',
    coordenadas: [-70.599375, -33.482721],
    puntoRuta: [-70.599375, -33.482721],
    anchor: 'left',
    offset: [28, 0],
    offsetMovil: [2, 0],
    titulo: 'Ruta más segura',
    filas: [
      { icono: '⚡', texto: '25 min · +7 min', tono: 'negativo' },
      { icono: '🛡️', texto: '+43% de seguridad', tono: 'positivo' },
    ],
    componentes: [
      '−1,2 km de calles de riesgo',
      '−31% de delitos',
      '+34% de luminarias',
    ],
  },
]

export const DEMO_CONECTORES = {
  type: 'FeatureCollection',
  features: DEMO_ETIQUETAS.filter((etiqueta) => etiqueta.conector).flatMap((etiqueta) => [
    linea(`conector-${etiqueta.id}`, etiqueta.destacada ? 'principal' : 'alternativa', [
      etiqueta.coordenadas,
      etiqueta.puntoRuta,
    ], { clase: 'conector' }),
    {
      type: 'Feature',
      properties: {
        id: `anclaje-${etiqueta.id}`,
        clase: 'anclaje',
        tipo: etiqueta.destacada ? 'principal' : 'alternativa',
      },
      geometry: { type: 'Point', coordinates: etiqueta.puntoRuta },
    },
  ]),
}

export const DEMO_EXTREMOS = [
  { id: 'origen', coordenadas: INICIO, texto: 'A', etiqueta: DEMO_ORIGEN },
  { id: 'destino', coordenadas: FIN, texto: 'B', etiqueta: DEMO_DESTINO },
]
