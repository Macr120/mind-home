import { useEffect, useRef, useState, type ReactNode } from 'react'
import { vibrar } from '../../audio/vibrar'

/**
 * EL gesto de arrastre de toda la casa (nació en la agenda y se promovió aquí).
 *
 * Se agarra el ELEMENTO ENTERO, sin asa: mantenerlo pulsado un momento (o
 * empezar a moverlo con el ratón) lo levanta. Por eso el gesto no captura el
 * puntero de entrada —eso dejaría muertos los botones de dentro y el scroll de
 * la lista—, sino que espera a saber qué es: un toque corto sigue siendo un
 * toque, moverse enseguida con el dedo es hacer scroll, y solo la pulsación
 * larga arrastra.
 *
 * Al levantarse, el elemento VIAJA con el puntero: un fantasma (clon visual con
 * elevación) sigue al dedo mutando su transform por ref —cero re-renders por
 * movimiento—, el original se queda como hueco atenuado y el destino se marca
 * con el acento del tema. OJO: `cloneNode` no copia el valor vivo de un input
 * ni el contenido de un canvas; lo que se arrastra aquí son filas y tarjetas.
 *
 * No se usa el drag & drop de HTML5 (`draggable`/`onDragOver`): no existe en
 * táctil y la casa se usa en Android. `document.elementFromPoint` dice sobre
 * qué fila está el dedo, como en `HojaPlan` y `rooms/computo/useArrastreArbol`.
 */

/** Milisegundos de pulsación que levantan la fila con el dedo. */
const ESPERA_MS = 300
/** Píxeles que distinguen un toque quieto de un movimiento. */
const UMBRAL_PX = 6
/** Freno del scroll de Android mientras dura el arrastre (ver `activar`). */
const frenarTouch = (e: TouchEvent) => e.preventDefault()

/** Fila que guarda su puesto manual: todas las tablas ordenables lo tienen. */
export interface FilaOrdenable {
  id?: number
  orden?: number
}

/**
 * Ordena por el puesto manual. Lo que nunca se ha arrastrado (`orden` vacío) se
 * queda detrás CONSERVANDO el orden que traía. Los ausentes se numeran a partir
 * del largo de la lista en vez de mandarlos al infinito: con dos infinitos la
 * resta da NaN y el `sort` quedaría en manos del azar.
 */
export function porOrden<T extends FilaOrdenable>(items: T[]): T[] {
  return items
    .map((x, i) => ({ x, k: x.orden ?? items.length + i }))
    .sort((a, b) => a.k - b.k)
    .map((p) => p.x)
}

/**
 * Escribe el puesto de las filas que cambiaron. El puesto es de la FILA, no de
 * la lista donde se arrastró: reordenar a alguien en Salud › Prójimos también lo
 * recoloca en su carpeta de la libreta, que son la misma ficha.
 */
export async function guardarOrden<T extends FilaOrdenable>(
  lista: T[],
  guardar: (id: number, orden: number) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < lista.length; i++) {
    const fila = lista[i]
    if (fila.id != null && fila.orden !== i) await guardar(fila.id, i)
  }
}

/** Gesto en curso mientras se decide si es un toque, un scroll o un arrastre. */
interface Gesto {
  clave: string
  x: number
  y: number
  el: HTMLElement
  puntero: number
  raton: boolean
  timer: number
  activo: boolean
}

/** El clon que viaja con el puntero y su agarre (dónde lo pescó el dedo). */
interface Fantasma {
  cont: HTMLElement
  dx: number
  dy: number
}

export interface PropsArrastre {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerCancel: () => void
  onClickCapture: (e: React.MouseEvent) => void
  style: { touchAction: 'manipulation' }
}

/**
 * El elemento agarrado, clonado y elevado, listo para seguir al puntero.
 * La posición vive en el transform del CONTENEDOR (se muta en cada move); la
 * elevación (escala + sombra) va en el CLON con su transición corta, para que
 * el levantamiento «se sienta» sin arrastrar la posición con ella.
 */
function crearFantasma(g: Gesto): Fantasma {
  const rect = g.el.getBoundingClientRect()
  const clon = g.el.cloneNode(true) as HTMLElement
  clon.style.width = `${rect.width}px`
  clon.style.height = `${rect.height}px`
  clon.style.margin = '0'
  clon.style.borderRadius = '12px'
  clon.style.boxShadow = '0 12px 32px rgb(0 0 0 / 0.35)'
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!quieto) {
    clon.style.transition = 'transform 0.15s var(--ease-fluida)'
    clon.style.transform = 'scale(1)'
    requestAnimationFrame(() => {
      clon.style.transform = 'scale(1.03)'
    })
  }
  const cont = document.createElement('div')
  cont.style.position = 'fixed'
  cont.style.left = '0'
  cont.style.top = '0'
  cont.style.zIndex = '70'
  cont.style.pointerEvents = 'none'
  cont.style.willChange = 'transform'
  cont.style.transform = `translate(${rect.left}px, ${rect.top}px)`
  cont.appendChild(clon)
  document.body.appendChild(cont)
  return { cont, dx: g.x - rect.left, dy: g.y - rect.top }
}

/**
 * Gesto de arrastre sobre cualquier cosa que tenga una clave. `destinoDe` mira
 * qué hay bajo el dedo y devuelve el destino (o null si ahí no se puede soltar).
 */
export function useArrastre<D>(
  destinoDe: (e: React.PointerEvent, enMano: string) => D | null,
  alSoltar: (clave: string, destino: D) => void,
  alLevantar?: (clave: string) => void,
): { props: (clave: string) => PropsArrastre; enMano: string | null; destino: D | null } {
  const [enMano, setEnMano] = useState<string | null>(null)
  const [destino, setDestino] = useState<D | null>(null)
  // El destino vive también en un ref: al soltar, el estado puede ir un render
  // por detrás del último `pointermove`.
  const ultimo = useRef<D | null>(null)
  const gesto = useRef<Gesto | null>(null)
  const fantasma = useRef<Fantasma | null>(null)
  /** Hubo arrastre de verdad: el `click` que viene detrás no es un clic. */
  const arrastro = useRef(false)

  const cerrar = () => {
    const g = gesto.current
    if (g?.timer) clearTimeout(g.timer)
    document.removeEventListener('touchmove', frenarTouch)
    fantasma.current?.cont.remove()
    fantasma.current = null
    gesto.current = null
    ultimo.current = null
    setEnMano(null)
    setDestino(null)
  }

  // Si la app se cierra a mitad de un arrastre, el freno del scroll (y el
  // fantasma colgado de <body>) se quedarían puestos en todo el documento.
  useEffect(() => () => {
    if (gesto.current?.timer) clearTimeout(gesto.current.timer)
    document.removeEventListener('touchmove', frenarTouch)
    fantasma.current?.cont.remove()
  }, [])

  const activar = () => {
    const g = gesto.current
    if (!g || g.activo) return
    g.activo = true
    try {
      g.el.setPointerCapture(g.puntero)
    } catch {
      // El puntero ya se liberó: el gesto sigue siendo válido.
    }
    // El `touch-action` de la fila ya no se puede cambiar a mitad del gesto, así
    // que el scroll de Android se frena a mano mientras dura el arrastre.
    document.addEventListener('touchmove', frenarTouch, { passive: false })
    fantasma.current = crearFantasma(g)
    vibrar(10)
    ultimo.current = null
    setEnMano(g.clave)
    setDestino(null)
    alLevantar?.(g.clave)
  }

  const props = (clave: string): PropsArrastre => ({
    // Ni `preventDefault` ni captura todavía: hasta que el gesto no se confirme
    // esto tiene que seguir siendo un toque normal.
    onPointerDown: (e: React.PointerEvent) => {
      if (gesto.current) return
      arrastro.current = false
      gesto.current = {
        clave,
        x: e.clientX,
        y: e.clientY,
        el: e.currentTarget as HTMLElement,
        puntero: e.pointerId,
        raton: e.pointerType === 'mouse',
        activo: false,
        timer: e.pointerType === 'mouse' ? 0 : window.setTimeout(activar, ESPERA_MS),
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const g = gesto.current
      if (!g || g.clave !== clave) return
      if (!g.activo) {
        if (Math.abs(e.clientX - g.x) <= UMBRAL_PX && Math.abs(e.clientY - g.y) <= UMBRAL_PX) return
        // Con el ratón, mover ya es arrastrar; con el dedo, moverse antes de
        // tiempo es hacer scroll, y entonces esto nunca fue un arrastre.
        if (g.raton) activar()
        else cerrar()
        return
      }
      e.preventDefault()
      arrastro.current = true
      const f = fantasma.current
      if (f) f.cont.style.transform = `translate(${e.clientX - f.dx}px, ${e.clientY - f.dy}px)`
      const d = destinoDe(e, g.clave)
      ultimo.current = d
      setDestino(d)
    },
    onPointerUp: () => {
      const g = gesto.current
      if (g?.activo && ultimo.current != null) alSoltar(g.clave, ultimo.current)
      cerrar()
    },
    onPointerCancel: cerrar,
    // Tras arrastrar, el navegador manda un `click` de propina que abriría la
    // fila que se acaba de soltar.
    onClickCapture: (e: React.MouseEvent) => {
      if (!arrastro.current) return
      arrastro.current = false
      e.stopPropagation()
      e.preventDefault()
    },
    style: { touchAction: 'manipulation' },
  })

  return { props, enMano, destino }
}

/** Dónde cae la fila que va en la mano: antes o después de la que se señala. */
interface Destino {
  clave: string
  despues: boolean
}

export interface Arrastre<T> {
  fila: (item: T) => PropsArrastre & { 'data-fila': string; 'data-lista': string; className: string }
}

/**
 * @param items    la lista COMPLETA en el orden en que se ve
 * @param clave    identidad estable de cada fila
 * @param lista    contenedor al que pertenece (la carpeta, la sección…)
 * @param alSoltar recibe la lista ya reordenada
 * @param eje      'y' = una fila debajo de otra (lo normal); 'x' = rejilla, donde
 *                 el puesto lo decide de qué lado del centro entra el dedo
 * @param alLevantar aviso de que el gesto se confirmó y la fila ya está en la mano
 *                 (la pantalla de inicio lo usa para entrar en modo edición)
 */
export function useArrastreFilas<T>(
  items: T[],
  clave: (x: T) => string,
  lista: (x: T) => string,
  alSoltar: (nuevas: T[]) => void,
  eje: 'y' | 'x' = 'y',
  alLevantar?: () => void,
): Arrastre<T> {
  const { props, enMano, destino } = useArrastre<Destino>(
    (e, mano) => {
      const suya = items.find((x) => clave(x) === mano)
      const bajoElDedo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-fila]')
      const suClave = bajoElDedo?.getAttribute('data-fila')
      if (!bajoElDedo || !suClave || suClave === mano || !suya) return null
      // Fuera de su lista no hay destino posible: la fila se queda donde estaba.
      if (bajoElDedo.getAttribute('data-lista') !== lista(suya)) return null
      const caja = bajoElDedo.getBoundingClientRect()
      const despues =
        eje === 'x' ? e.clientX > caja.left + caja.width / 2 : e.clientY > caja.top + caja.height / 2
      return { clave: suClave, despues }
    },
    (mano, caida) => {
      const orden = [...items]
      const desde = orden.findIndex((x) => clave(x) === mano)
      if (desde < 0) return
      const [fila] = orden.splice(desde, 1)
      // El índice del destino se busca DESPUÉS de sacar la fila de la lista: si
      // venía de más arriba, todo lo de abajo se corrió un puesto.
      const hasta = orden.findIndex((x) => clave(x) === caida.clave)
      if (hasta < 0) return
      orden.splice(caida.despues ? hasta + 1 : hasta, 0, fila)
      alSoltar(orden)
    },
    alLevantar,
  )

  return {
    fila: (item: T) => {
      const k = clave(item)
      const cae = destino?.clave === k ? destino : null
      // En rejilla la marca va al costado (bordes lógicos, para el árabe).
      const marca = cae
        ? eje === 'x'
          ? cae.despues
            ? 'border-e-2 border-accent'
            : 'border-s-2 border-accent'
          : cae.despues
            ? 'border-b-2 border-accent'
            : 'border-t-2 border-accent'
        : ''
      return {
        ...props(k),
        'data-fila': k,
        'data-lista': lista(item),
        // El hueco se atenúa y el destino se marca con el acento del tema (en
        // los cuartos es el color de la app que baja RoomOverlay).
        className: `cursor-grab rounded-xl ${enMano === k ? 'opacity-40' : ''} ${marca}`,
      }
    },
  }
}

/**
 * Fila arrastrable: envuelve en vez de tocar cada tarjeta, así las filas de la
 * agenda siguen sirviendo igual donde no se reordena nada (dentro de una ficha,
 * por ejemplo).
 */
export function Arrastrable<T>({
  arrastre,
  item,
  children,
}: {
  arrastre: Arrastre<T>
  item: T
  children: ReactNode
}) {
  return <div {...arrastre.fila(item)}>{children}</div>
}
