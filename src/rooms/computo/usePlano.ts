import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ALTO_PLANO_DEFECTO, ALTOS_PLANO, LS_ALTO_PLANO, SALTO_CORTE } from './constantes'
import { useVistaSvg, type Medida, type Vista } from './useVistaSvg'

/**
 * La MEDIDA y la PROYECCIÓN de un plano cartesiano: dónde cae cada unidad en
 * píxeles, y el pan/zoom que lo mueve.
 *
 * Va aparte de `PlanoSvg` porque hace falta ANTES de renderizar: el muestreo y
 * el corte de tramos se calculan con la escala, así que quien dibuja necesita
 * esto ya resuelto para poder pasarle los trazos hechos.
 */

export const MARGEN_PLANO = { izq: 34, der: 8, arr: 8, aba: 20 }

/** El nivel de alto guardado, acotado por si el catálogo encogió o hay basura. */
function leerAltoPlano(): number {
  const n = Number(localStorage.getItem(LS_ALTO_PLANO))
  return Number.isInteger(n) && n >= 0 && n < ALTOS_PLANO.length ? n : ALTO_PLANO_DEFECTO
}

/**
 * El alto del plano, en tres pasos y recordado entre sesiones.
 *
 * Vive aquí y no en un store porque solo hay UN plano montado a la vez: cada
 * tipo de gráfica monta el suyo y lee la preferencia al montar, así que no hay
 * nada que sincronizar.
 */
export function useAltoPlano(): { alto: string; nivel: number; ciclar: () => void } {
  const [nivel, setNivel] = useState(leerAltoPlano)
  return {
    alto: ALTOS_PLANO[nivel].alto,
    nivel,
    ciclar: () => {
      const siguiente = (nivel + 1) % ALTOS_PLANO.length
      // El `setItem` va FUERA del actualizador: en StrictMode se ejecuta dos veces.
      localStorage.setItem(LS_ALTO_PLANO, String(siguiente))
      setNivel(siguiente)
    },
  }
}

export interface Plano {
  /** La ventana PEDIDA: la que mueven el pan, el zoom y el encuadre. */
  vista: Vista
  /** La que de verdad se ve. Más ancha o más alta que `vista` si es cuadrado. */
  visible: Vista
  tam: { w: number; h: number }
  dentro: { w: number; h: number }
  px: (x: number) => number
  py: (y: number) => number
  /** Píxeles de pantalla → unidades, ya con el margen y la escala buenos. */
  aUnidades: (cx: number, cy: number) => { x: number; y: number }
  /** Salto máximo entre dos puntos seguidos antes de cortar el tramo, en píxeles. */
  cortePx: number
  caja: React.RefObject<HTMLDivElement | null>
  manejadores: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  zoomCentro: (factor: number) => void
  reiniciar: () => void
  /** Poner una ventana concreta (el encuadre automático de una curva). */
  encuadrar: (v: Vista) => void
  hubodArrastre: () => boolean
}

/**
 * `cuadrado` iguala la escala de los dos ejes, y es lo único que hace que en
 * polar un `r = 1` se dibuje como CÍRCULO y no como elipse: con la vista por
 * defecto (20 de ancho por 12 de alto) sobre una caja apaisada, la escala
 * vertical y la horizontal se llevan un 15 %. Al igualarlas sobra sitio en un
 * eje, y eso es lo que separa `visible` de `vista`.
 */
export function usePlano(inicial: Vista, opciones?: { cuadrado?: boolean }): Plano {
  const cuadrado = opciones?.cuadrado ?? false
  const medida = useRef<Medida>({ izq: MARGEN_PLANO.izq, arr: MARGEN_PLANO.arr, w: 1, h: 1, escalaX: 1, escalaY: 1 })
  const { vista, setVista, caja, aPlano, zoomCentro, reiniciar, manejadores, hubodArrastre } = useVistaSvg(
    inicial,
    medida,
  )
  const [tam, setTam] = useState({ w: 640, h: 340 })

  // El SVG se dibuja en píxeles reales para que el texto no se deforme.
  useEffect(() => {
    const el = caja.current
    if (!el) return
    const ro = new ResizeObserver(([entrada]) => {
      const r = entrada.contentRect
      if (r.width > 0 && r.height > 0) setTam({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [caja])

  const dentro = {
    w: Math.max(1, tam.w - MARGEN_PLANO.izq - MARGEN_PLANO.der),
    h: Math.max(1, tam.h - MARGEN_PLANO.arr - MARGEN_PLANO.aba),
  }

  const escalaCruda = { x: dentro.w / (vista.x1 - vista.x0), y: dentro.h / (vista.y1 - vista.y0) }
  const menor = Math.min(escalaCruda.x, escalaCruda.y)
  const escalaX = cuadrado ? menor : escalaCruda.x
  const escalaY = cuadrado ? menor : escalaCruda.y

  // Lo que cabe con esa escala, centrado en la vista pedida.
  const centro = { x: (vista.x0 + vista.x1) / 2, y: (vista.y0 + vista.y1) / 2 }
  const mitad = { x: dentro.w / escalaX / 2, y: dentro.h / escalaY / 2 }
  const visible: Vista = {
    x0: centro.x - mitad.x,
    x1: centro.x + mitad.x,
    y0: centro.y - mitad.y,
    y1: centro.y + mitad.y,
  }

  // Los manejadores de puntero corren entre repintados, así que les basta con la
  // medida del último layout.
  useLayoutEffect(() => {
    medida.current = { izq: MARGEN_PLANO.izq, arr: MARGEN_PLANO.arr, w: dentro.w, h: dentro.h, escalaX, escalaY }
  })

  return {
    vista,
    visible,
    tam,
    dentro,
    px: (x: number) => MARGEN_PLANO.izq + (x - visible.x0) * escalaX,
    py: (y: number) => MARGEN_PLANO.arr + (visible.y1 - y) * escalaY,
    aUnidades: aPlano,
    cortePx: SALTO_CORTE * dentro.h,
    caja,
    manejadores,
    zoomCentro,
    reiniciar,
    encuadrar: setVista,
    hubodArrastre,
  }
}
