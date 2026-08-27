const ACCIONES = {
  1: { anterior: 'Cerrar demo', siguiente: 'Ingresar ruta' },
  2: { anterior: 'Borrar ruta', siguiente: 'Buscar rutas' },
  3: { anterior: 'Ocultar rutas', siguiente: 'Finalizar demo' },
}

export default function DemoControls({ demo, deshabilitado }) {
  if (!demo.activo) {
    return (
      <div className="demo-controles">
        <button
          type="button"
          className="demo-boton demo-boton-iniciar"
          onClick={demo.iniciar}
          disabled={deshabilitado}
        >
          ▶ Iniciar Demo
        </button>
      </div>
    )
  }

  const acciones = ACCIONES[demo.paso]
  return (
    <>
      <div className="demo-controles demo-controles-activos" aria-label="Controles de la demo">
        <span className="demo-paso">Demo guiada · Paso {demo.paso} de 3</span>
        <button
          type="button"
          className="demo-boton demo-boton-anterior"
          onClick={demo.regresar}
          disabled={demo.ocupado}
        >
          ← {acciones.anterior}
        </button>
        <button
          type="button"
          className="demo-boton demo-boton-siguiente"
          onClick={demo.avanzar}
          disabled={demo.ocupado}
        >
          {demo.ocupado ? 'Ingresando ruta…' : `${acciones.siguiente} →`}
        </button>
      </div>
      {demo.paso === 3 && (
        <button
          type="button"
          className={demo.riesgosVisibles ? 'demo-riesgos activo' : 'demo-riesgos'}
          onClick={demo.alternarRiesgos}
        >
          {demo.riesgosVisibles ? 'Ocultar segmentos de riesgo' : 'Visualizar segmentos de riesgo'}
        </button>
      )}
    </>
  )
}
