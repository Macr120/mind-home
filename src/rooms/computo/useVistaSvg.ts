import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Pan y zoom sobre un plano cartesiano dibujado en SVG, pensado para el dedo:
 * uno arrastra, dos pellizcan y la rueda acerca donde apunta el cursor.
 *
 * No se reusa `core/ui/planos/usePlanoViewport`: aquel exige botón central o
 * Alt/Shift para panear (es de un croquis de escritorio), lo que en un teléfono
 * es inalcanzable. El patrón táctil viene de `rooms/ideas/LienzoMapa.tsx`.
 *
 * Trabaja sobre la MEDIDA que le pasa `usePlano`, no sobre el rect del
 * contenedor: dentro del contenedor hay 34 px de margen para los rótulos, y
 * usar el rect entero desplazaba la lectura del cursor y hacía que el plano se
 * moviera un ~7 % más lento que el dedo.
 */

export interface Vista {
  x0: number
  x1: number
  y0: number
  y1: number
}

/** El área de dibujo de verdad, ya descontado el margen de los rótulos. */
export interface Medida {
  /** Esquina del área útil dentro del contenedor. */
  izq: number
  arr: number
  /** Área útil, en píxeles. */
  w: number
  h: number
  /** Píxeles por unidad. Iguales cuando el plano es cuadrado. */
  escalaX: number
  escalaY: number
}

const ZOOM_RUEDA = 1.25
const ANCHO_MIN = 1e-6
const ANCHO_MAX = 1e9

export function useVistaSvg(inicial: Vista, medida: RefObject<Medida>) {
  const [vista, setVista] = useState<Vista>(inicial)
  const caja = useRef<HTMLDivElement>(null)
  const punteros = useRef(new Map<number, { x: number; y: number }>())
  const arrastre = useRef(0)

  /**
   * Píxeles → unidades del plano. Se mide desde el CENTRO del área útil con la
   * escala real, y no interpolando entre los bordes de la vista: así vale igual
   * con el plano cuadrado, donde lo que se ve es más ancho que la vista pedida.
   */
  const aPlano = useCallback(
    (cx: number, cy: number, v: Vista) => {
      const r = caja.current?.getBoundingClientRect()
      const m = medida.current
      if (!r || !m || !(m.escalaX > 0) || !(m.escalaY > 0)) {
        return { x: (v.x0 + v.x1) / 2, y: (v.y0 + v.y1) / 2 }
      }
      const dx = cx - r.left - m.izq - m.w / 2
      const dy = cy - r.top - m.arr - m.h / 2
      return { x: (v.x0 + v.x1) / 2 + dx / m.escalaX, y: (v.y0 + v.y1) / 2 - dy / m.escalaY }
    },
    [medida],
  )

  /** Acerca o aleja dejando fijo el punto del plano que hay bajo el cursor. */
  const zoomHacia = useCallback(
    (factor: number, cx: number, cy: number) =>
      setVista((v) => {
        const ancho = (v.x1 - v.x0) / factor
        const alto = (v.y1 - v.y0) / factor
        if (ancho < ANCHO_MIN || ancho > ANCHO_MAX) return v
        const p = aPlano(cx, cy, v)
        const fx = (p.x - v.x0) / (v.x1 - v.x0)
        const fy = (p.y - v.y0) / (v.y1 - v.y0)
        return {
          x0: p.x - ancho * fx,
          x1: p.x + ancho * (1 - fx),
          y0: p.y - alto * fy,
          y1: p.y + alto * (1 - fy),
        }
      }),
    [aPlano],
  )

  // La rueda se registra a mano para poder `preventDefault` (React la pone pasiva).
  useEffect(() => {
    const el = caja.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomHacia(e.deltaY < 0 ? ZOOM_RUEDA : 1 / ZOOM_RUEDA, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomHacia])

  const onPointerDown = (e: React.PointerEvent) => {
    // Los controles del plano (zoom, alto, lectura, centrar) viven DENTRO de la
    // caja. Si se captura el puntero aquí, el `pointerup` se reapunta al
    // contenedor y el `click` acaba disparándose en la caja y no en el botón:
    // por eso no funcionaban. Un toque sobre un control ni se captura ni panea.
    if ((e.target as Element | null)?.closest?.('button, input, select, textarea, a')) return
    try {
      caja.current?.setPointerCapture(e.pointerId)
    } catch {
      /* puntero ya liberado */
    }
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (punteros.current.size === 1) arrastre.current = 0
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const previo = punteros.current.get(e.pointerId)
    if (!previo) return
    const actual = { x: e.clientX, y: e.clientY }
    if (punteros.current.size === 2) {
      const otro = [...punteros.current.entries()].find(([id]) => id !== e.pointerId)?.[1]
      if (otro) {
        const antes = Math.hypot(previo.x - otro.x, previo.y - otro.y)
        const ahora = Math.hypot(actual.x - otro.x, actual.y - otro.y)
        if (antes > 0) zoomHacia(ahora / antes, (actual.x + otro.x) / 2, (actual.y + otro.y) / 2)
      }
    } else {
      const m = medida.current
      if (m && m.escalaX > 0 && m.escalaY > 0) {
        arrastre.current += Math.abs(actual.x - previo.x) + Math.abs(actual.y - previo.y)
        // Se divide por la escala real, así el plano se mueve EXACTAMENTE lo que
        // se movió el dedo.
        const dx = (actual.x - previo.x) / m.escalaX
        const dy = (actual.y - previo.y) / m.escalaY
        setVista((v) => ({ x0: v.x0 - dx, x1: v.x1 - dx, y0: v.y0 + dy, y1: v.y1 + dy }))
      }
    }
    punteros.current.set(e.pointerId, actual)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    punteros.current.delete(e.pointerId)
  }

  return {
    vista,
    setVista,
    /** Se puso a mover el plano (para no confundirlo con un toque). */
    hubodArrastre: () => arrastre.current > 6,
    caja,
    aPlano: (cx: number, cy: number) => aPlano(cx, cy, vista),
    zoomHacia,
    /** Acerca o aleja desde el centro (botones). */
    zoomCentro: (factor: number) => {
      const r = caja.current?.getBoundingClientRect()
      if (r) zoomHacia(factor, r.left + r.width / 2, r.top + r.height / 2)
    },
    reiniciar: () => setVista(inicial),
    manejadores: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
