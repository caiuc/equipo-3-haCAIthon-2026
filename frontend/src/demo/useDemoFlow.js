import { useEffect, useRef, useState } from 'react'
import { DEMO_DESTINO, DEMO_ORIGEN } from './demoConfig'

function esperar(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function useDemoFlow(opciones) {
  const [paso, setPaso] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [riesgosVisibles, setRiesgosVisibles] = useState(false)
  const ejecucionRef = useRef(0)

  useEffect(() => () => {
    ejecucionRef.current += 1
  }, [])

  async function escribir(texto, actualizar, ejecucion) {
    actualizar('')
    for (let i = 1; i <= texto.length; i += 1) {
      if (ejecucionRef.current !== ejecucion) return false
      actualizar(texto.slice(0, i))
      await esperar(22)
    }
    return true
  }

  function iniciar() {
    opciones.onIniciar()
    setRiesgosVisibles(false)
    setPaso(1)
  }

  async function avanzar() {
    if (paso === 1) {
      const ejecucion = ejecucionRef.current + 1
      ejecucionRef.current = ejecucion
      setOcupado(true)
      const origenListo = await escribir(DEMO_ORIGEN, opciones.setOrigen, ejecucion)
      const destinoListo = origenListo && await escribir(DEMO_DESTINO, opciones.setDestino, ejecucion)
      if (destinoListo) setPaso(2)
      setOcupado(false)
      return
    }
    if (paso === 2) {
      opciones.onMostrarRutas()
      setPaso(3)
      return
    }
    if (paso === 3) {
      salir()
    }
  }

  function regresar() {
    if (paso === 1) {
      salir()
      return
    }
    if (paso === 2) {
      opciones.setOrigen('')
      opciones.setDestino('')
      setPaso(1)
      return
    }
    if (paso === 3) {
      opciones.onOcultarRutas()
      setRiesgosVisibles(false)
      setPaso(2)
    }
  }

  function alternarRiesgos() {
    const siguiente = !riesgosVisibles
    setRiesgosVisibles(siguiente)
    opciones.onAlternarRiesgos(siguiente)
  }

  function salir() {
    ejecucionRef.current += 1
    opciones.onSalir()
    setOcupado(false)
    setRiesgosVisibles(false)
    setPaso(0)
  }

  return {
    activo: paso > 0,
    alternarRiesgos,
    avanzar,
    iniciar,
    ocupado,
    paso,
    regresar,
    riesgosVisibles,
  }
}
