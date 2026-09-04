import { useEffect, type RefObject } from 'react'
import { useT } from '../../core/i18n/useT'
import { peliculaFrame } from '../../core/state/peliculaStore'
import { LADO_MAX_PELICULA } from './constantes'

/** Resolución de la composición para un lienzo de `cw`×`ch` px CSS: su aspecto, lado mayor a LADO_MAX y lados pares (los códecs lo piden). */
export function resolucionPantalla(cw: number, ch: number): { ancho: number; alto: number } {
  const k = LADO_MAX_PELICULA / Math.max(1, cw, ch)
  const par = (v: number) => Math.max(2, 2 * Math.round((v * k) / 2))
  return { ancho: par(cw), alto: par(ch) }
}

/**
 * La capa de composición del modo película: se graba la PANTALLA ENTERA, así
 * que este canvas transparente cubre todo el viewport (el mismo rectángulo que
 * el lienzo 3D de la casa) y el motor pinta en él, en modo `transparente`, los
 * textos, imágenes, avatar PIP y fundidos: lo que ves es lo que sale. Los
 * controles flotan encima y no salen en el archivo (son DOM, no el lienzo 3D).
 * Publica el tamaño del lienzo de la casa en `peliculaFrame.encuadre` (el
 * recorte del export, entero) y avisa al Editor (`onMedida`) para que la
 * resolución de la composición siga al aspecto de la pantalla. Se mide de
 * inmediato y con ResizeObserver, nunca en render.
 */
export function PeliculaEncuadre({
  canvasRef,
  onMedida,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** Tamaño CSS del lienzo de la casa; estable (useCallback): re-suscribe el observador. */
  onMedida: (w: number, h: number) => void
}) {
  const t = useT()
  useEffect(() => {
    const lienzo = document.querySelector<HTMLCanvasElement>('[data-lienzo-casa] canvas')
    if (!lienzo) return
    const medir = () => {
      const w = lienzo.clientWidth
      const h = lienzo.clientHeight
      peliculaFrame.encuadre = { x: 0, y: 0, w, h }
      onMedida(w, h)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(lienzo)
    // El monitor del HUD (PreviewFilmacion) copia esta capa encima del 3D.
    peliculaFrame.lienzoComposicion = canvasRef.current
    return () => {
      ro.disconnect()
      peliculaFrame.encuadre = { x: 0, y: 0, w: 0, h: 0 }
      peliculaFrame.lienzoComposicion = null
    }
  }, [onMedida, canvasRef])
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={t('video.pelicula.encuadre', 'Encuadre del video')}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
