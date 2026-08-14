const KEY = import.meta.env.VITE_GEMINI_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${KEY}`

export const asistenteDisponible = Boolean(KEY)

const INSTRUCCION =
  'Extrae de la consulta del usuario: origen, destino y necesidad de accesibilidad. ' +
  'Si no menciona origen, origen debe ser cadena vacía. ' +
  'necesidad: silla_ruedas, movilidad_reducida, coche_bebe u otra palabra breve (vacía si no menciona). ' +
  'Los lugares están en Santiago de Chile; devuelve nombres de lugares tal como se buscarían en un mapa.'

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
    necesidad: String(out.necesidad || '').slice(0, 60),
  }
}
