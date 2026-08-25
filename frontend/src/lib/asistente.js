const KEY = import.meta.env.VITE_GEMINI_KEY
// gemini-3.1-flash-lite: el alias flash-latest daba 503 por alta demanda (14/08)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${KEY}`

export const asistenteDisponible = Boolean(KEY)

const INSTRUCCION =
  'Interpreta la consulta y extrae origen, destino, necesidad de accesibilidad, hora, modo y actividades. ' +
  'Si no menciona origen, origen debe ser cadena vacía. ' +
  'El usuario de esta app SIEMPRE tiene movilidad reducida: si menciona algo específico ' +
  '(silla_ruedas, coche_bebe, baston, muletas...) usa esa palabra; si no, necesidad = movilidad_reducida. ' +
  'Los lugares están en Santiago de Chile; devuelve nombres de lugares tal como se buscarían en un mapa. ' +
  'Si el lugar es o suena a una estación de Metro de Santiago, devuélvelo como "Metro <nombre>" (ej: "Metro Irarrázaval"). ' +
  'Si pregunta por seguridad o por caminar de noche, modo = seguridad. ' +
  'Si quiere organizar una salida con actividades o varias paradas, modo = plan. ' +
  'En los demás casos, modo = ruta. ' +
  'Hora debe ser HH:MM si la menciona (por ejemplo, noche = 22:00); si no, cadena vacía. ' +
  'Paradas debe ser una lista breve de lugares concretos que deban visitarse entre origen y destino; ' +
  'no incluyas actividades genéricas ni repitas origen o destino. ' +
  'Actividades debe ser una lista breve de actividades mencionadas, o una lista vacía. ' +
  'No inventes origen, destino, hora ni actividades.'

// Lenguaje natural → { origen, destino, necesidad } vía Gemini con salida JSON forzada.
export async function interpretarConsulta(texto) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: texto }] }],
      systemInstruction: { parts: [{ text: INSTRUCCION }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            origen: { type: 'STRING' },
            destino: { type: 'STRING' },
            necesidad: { type: 'STRING' },
            hora: { type: 'STRING' },
            modo: { type: 'STRING' },
            paradas: { type: 'ARRAY', items: { type: 'STRING' } },
            actividades: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['origen', 'destino', 'necesidad'],
        },
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `Gemini ${res.status}`)
  let out = {}
  try {
    out = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
  } catch {
    throw new Error('respuesta no interpretable')
  }
  return {
    origen: String(out.origen || '').slice(0, 120),
    destino: String(out.destino || '').slice(0, 120),
    necesidad: String(out.necesidad || 'movilidad_reducida').slice(0, 60),
    hora: String(out.hora || '').slice(0, 10),
    modo: ['seguridad', 'plan'].includes(out.modo) ? out.modo : 'ruta',
    paradas: Array.isArray(out.paradas)
      ? out.paradas.map((parada) => String(parada).slice(0, 80)).slice(0, 4)
      : [],
    actividades: Array.isArray(out.actividades)
      ? out.actividades.map((actividad) => String(actividad).slice(0, 60)).slice(0, 5)
      : [],
  }
}
