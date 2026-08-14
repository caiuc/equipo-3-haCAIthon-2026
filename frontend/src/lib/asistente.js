const KEY = import.meta.env.VITE_GEMINI_KEY
// gemini-3.1-flash-lite: el alias flash-latest daba 503 por alta demanda (14/08)
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${KEY}`

export const asistenteDisponible = Boolean(KEY)

const INSTRUCCION =
  'Extrae de la consulta del usuario: origen, destino y necesidad de accesibilidad. ' +
  'Si no menciona origen, origen debe ser cadena vacía. ' +
  'El usuario de esta app SIEMPRE tiene movilidad reducida: si menciona algo específico ' +
  '(silla_ruedas, coche_bebe, baston, muletas...) usa esa palabra; si no, necesidad = movilidad_reducida. ' +
  'Los lugares están en Santiago de Chile; devuelve nombres de lugares tal como se buscarían en un mapa. ' +
  'Si el lugar es o suena a una estación de Metro de Santiago, devuélvelo como "Metro <nombre>" (ej: "Metro Irarrázaval").'

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
  }
}
