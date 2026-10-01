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
    // `ui-noche`: el visor es negro en los dos modos; sin ella, en modo claro los
    // botones de sus esquinas pintaban el icono con la tinta oscura sobre negro.
    <div ref={previewRef} style={{ height: alto }} data-tut="video.editor.visor" className="ui-noche relative shrink-0 overflow-hidden rounded-xl bg-black">
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
      // Activo con el acento (como `claseOverlayBtn`): el vidrio blanco al 25 % dejaba
      // el icono blanco sin contraste sobre un fotograma claro.
      className={`ui-boton absolute top-2 z-20 grid h-9 w-9 place-items-center rounded-full border text-sm backdrop-blur transition ${
        activo ? 'border-accent/60 bg-accent text-accent-ink' : 'border-white/20 bg-black/50 text-white hover:bg-black/70'
      } ${className}`}
    >
      <Icono nombre={icono} />
    </button>
  )
}
