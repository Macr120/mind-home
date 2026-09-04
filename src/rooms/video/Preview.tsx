import type { ReactNode, RefObject } from 'react'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * El visor: el canvas del frame actual, con el alto que decide el divisor, y
 * encima los botones flotantes de sus esquinas (`children`). El motor, el pool
 * y el canvas los gobierna `Editor`; play y contador viven en la barra de
 * herramientas. `object-contain` letterboxea 16:9 y 9:16 dentro del alto
 * elegido; la resolución interna la fija `RESOLUCIONES`.
 */
export function Preview({
  canvasRef,
  previewRef,
  alto,
  children,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  previewRef: RefObject<HTMLDivElement | null>
  alto: number
  children?: ReactNode
}) {
  return (
    <div ref={previewRef} style={{ height: alto }} className="relative shrink-0 overflow-hidden rounded-xl bg-black">
      <canvas ref={canvasRef} className="h-full w-full object-contain" />
      {children}
    </div>
  )
}

/** Botón flotante en una esquina del visor (`start-2` o `end-2`): abre o pliega un lateral. */
export function BotonVisor({
  icono,
  etiqueta,
  activo,
  onClick,
  className = '',
}: {
  icono: NombreIcono
  etiqueta: string
  activo: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      aria-label={etiqueta}
      title={etiqueta}
      className={`ui-boton absolute top-2 z-20 grid h-9 w-9 place-items-center rounded-full border text-sm text-white backdrop-blur transition ${
        activo ? 'border-white/60 bg-white/25' : 'border-white/20 bg-black/50 hover:bg-black/70'
      } ${className}`}
    >
      <Icono nombre={icono} />
    </button>
  )
}
