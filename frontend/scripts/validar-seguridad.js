import assert from 'node:assert/strict'
import path from 'node:path'
import { readFile } from 'node:fs/promises'

const root = process.cwd()

globalThis.fetch = async (url) => {
  const relative = new URL(url, 'http://localhost').pathname.replace(/^\//, '')
  const data = await readFile(path.join(root, 'public', relative))
  return new Response(data, { status: 200, headers: { 'Content-Type': 'application/json' } })
}

const { caminataExcesiva, elegirRutaSegura, proponerCorredoresSeguros, puntuarRuta } = await import('../src/lib/seguridad.js')

function tramo(coordenadas, caminando) {
  return {
    type: 'Feature',
    properties: { caminando },
    geometry: { type: 'LineString', coordinates: coordenadas },
  }
}

function ruta(tramos) {
  return { type: 'FeatureCollection', features: tramos }
}

const puntos = [
  [-70.6348, -33.4335],
  [-70.62, -33.44],
  [-70.5978, -33.4568],
]
const rutaTransporte = ruta([tramo(puntos, 0)])
const rutaCaminata = ruta([tramo(puntos, 1)])
const transporteDia = await puntuarRuta(rutaTransporte, { hora: '12:00' })
const transporteNoche = await puntuarRuta(rutaTransporte, { hora: '23:00' })
const caminataDia = await puntuarRuta(rutaCaminata, { hora: '12:00' })
const caminataLarga = await puntuarRuta(rutaCaminata, { hora: '12:00', duracionMin: 315 })
const corredores = await proponerCorredoresSeguros(rutaCaminata, { hora: '12:00' })

assert.equal(transporteDia.tipoRuta, 'transporte')
assert.equal(caminataDia.tipoRuta, 'caminata')
assert.equal(transporteDia.tramos[0].puntos[0].componentes.scoreTransporte, 10)
assert.equal(caminataDia.tramos[0].puntos[0].componentes.scoreTransporte, 5)
assert.ok(transporteDia.score > transporteNoche.score, 'La noche debe reducir el score')
assert.match(caminataDia.recomendacion.mensaje, /camina|caminar/i)
assert.equal(caminataExcesiva(90), false, '90 minutos todavía es el límite razonable')
assert.equal(caminataExcesiva(91), true, 'Una caminata mayor a 90 minutos debe recomendar auto')
assert.equal(caminataLarga.caminataExcesiva, true)
assert.equal(caminataLarga.nivel, 'auto')
assert.match(caminataLarga.recomendacion.mensaje, /315.*auto/i)

const rapida = { ruta: { duracionMin: 30 }, seguridad: { score: 44 } }
const segura = { ruta: { duracionMin: 36 }, seguridad: { score: 55 } }
const demasiadoLenta = { ruta: { duracionMin: 45 }, seguridad: { score: 60 } }
const pocoMejor = { ruta: { duracionMin: 34 }, seguridad: { score: 49 } }

assert.equal(elegirRutaSegura([rapida, segura]).evaluada, segura)
assert.equal(elegirRutaSegura([rapida, demasiadoLenta]).evaluada, rapida)
assert.equal(elegirRutaSegura([rapida, pocoMejor]).evaluada, rapida)
assert.equal(elegirRutaSegura([rapida, segura]).criterio, 'seguridad')
assert.equal(elegirRutaSegura([rapida, segura]).alternativas, 2)
assert.ok(corredores.length <= 2, 'No se deben proponer más de dos corredores')
assert.ok(corredores.every((corredor) => Array.isArray(corredor.punto) && corredor.punto.length === 2))

console.log('Validacion de seguridad OK')
console.log(`Transporte dia/noche: ${transporteDia.score}/${transporteNoche.score}`)
console.log(`Caminata dia: ${caminataDia.score} (${caminataDia.recomendacion.mensaje})`)
console.log(`Corredores seguros propuestos: ${corredores.length}`)
console.log('Seleccion segura: umbral de 8 puntos y maximo 10 minutos extra')
