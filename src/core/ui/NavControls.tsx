import type { RefObject } from 'react'
import type { OrbitControls } from '@react-three/drei'
import type { OrthographicCamera } from 'three'

type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>

const MIN_ZOOM = 8
const MAX_ZOOM = 45

/**
 * Botones de navegación de la casa 3D: rotar a las esquinas, zoom y reset.
 * También funciona arrastrar (rotar) y rueda del ratón (zoom).
 */
export function NavControls({
  controlsRef,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const rotar = (dir: 1 | -1) => {
    const c = controlsRef.current
    if (!c) return
    c.setAzimuthalAngle(c.getAzimuthalAngle() + (dir * Math.PI) / 2)
    c.update()
  }

  const zoom = (factor: number) => {
    const c = controlsRef.current
    if (!c) return
    const cam = c.object as OrthographicCamera
    cam.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor))
    cam.updateProjectionMatrix()
  }

  const reset = () => controlsRef.current?.reset()

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
        <Boton onClick={() => zoom(1.25)} title="Acercar">
          +
        </Boton>
        <Boton onClick={() => zoom(0.8)} title="Alejar">
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
