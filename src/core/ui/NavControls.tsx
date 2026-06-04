import { useCam } from '../state/cameraStore'

/**
 * Botones de navegación de la casa 3D: rotar a las esquinas, zoom y reset.
 * Conducen el estado de la cámara (useCam); CameraRig lo aplica suavemente.
 */
export function NavControls() {
  const rotar = useCam((s) => s.rotar)
  const zoomBy = useCam((s) => s.zoomBy)
  const reset = useCam((s) => s.reset)

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col items-center gap-2">
      {/* Rotar a las esquinas */}
      <div className="flex gap-2">
        <Boton onClick={() => rotar(-1)} title="Rotar a la izquierda">
          ⟲
        </Boton>
        <Boton onClick={() => rotar(1)} title="Rotar a la derecha">
          ⟳
        </Boton>
      </div>
      {/* Zoom */}
      <div className="flex gap-2">
        <Boton onClick={() => zoomBy(1.25)} title="Acercar">
          +
        </Boton>
        <Boton onClick={() => zoomBy(0.8)} title="Alejar">
          −
        </Boton>
      </div>
      {/* Reset */}
      <Boton onClick={reset} title="Vista inicial" ancho>
        ⌂ Reiniciar vista
      </Boton>
    </div>
  )
}

function Boton({
  children,
  onClick,
  title,
  ancho,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  ancho?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-white/15 active:scale-95 ${
        ancho ? 'h-9 px-3 text-xs font-semibold' : 'h-10 w-10 text-xl'
      }`}
    >
      {children}
    </button>
  )
}
