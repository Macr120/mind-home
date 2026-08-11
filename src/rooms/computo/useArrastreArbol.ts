import { useRef, useState } from 'react'

/**
 * Arrastrar filas de un árbol CON EL DEDO.
 *
 * No se usa el drag & drop de HTML5 (`draggable`/`onDragOver`) porque no existe
 * en táctil, y la plataforma objetivo es Android. El patrón es el de
 * `core/ui/metas/HojaPlan.tsx`: un asa que captura el puntero y
 * `document.elementFromPoint` para saber sobre qué fila está el dedo.
 *
 * Cada fila arrastrable lleva `data-nodo="<tipo>:<id>"`. La zona se decide por
 * la mitad de la fila: arriba «antes de», abajo «dentro» — más perdonador que
 * exigir precisión de media fila en un móvil.
 */

export type TipoNodo = 'carpeta' | 'formula'

export interface EnMano {
  tipo: TipoNodo
  id: string
}

export interface Destino {
  tipo: TipoNodo
  id: string
  /** El dedo está en la mitad de abajo: soltar DENTRO, no antes. */
  dentro: boolean
}

const leerNodo = (el: Element | null): { tipo: TipoNodo; id: string } | null => {
  const dato = el?.closest('[data-nodo]')?.getAttribute('data-nodo')
  if (!dato) return null
  const i = dato.indexOf(':')
  const tipo = dato.slice(0, i)
  if (tipo !== 'carpeta' && tipo !== 'formula') return null
  return { tipo, id: dato.slice(i + 1) }
}

export function useArrastreArbol(
  alSoltar: (mano: EnMano, destino: Destino) => void,
  /** Destinos imposibles (una carpeta dentro de sí misma): ni se resaltan. */
  permite?: (mano: EnMano, destino: Destino) => boolean,
) {
  const [enMano, setEnMano] = useState<EnMano | null>(null)
  const [destino, setDestino] = useState<Destino | null>(null)
  // El destino vive también en un ref: al soltar, el estado puede ir un render
  // por detrás del último `pointermove`.
  const ultimo = useRef<Destino | null>(null)

  const empezar = (mano: EnMano) => (e: React.PointerEvent) => {
    // Sin esto, Android se lleva el gesto como selección de texto o como scroll.
    e.preventDefault()
    e.stopPropagation()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // El puntero ya se liberó: el gesto sigue igual de válido.
    }
    ultimo.current = null
    setEnMano(mano)
    setDestino(null)
  }

  const mover = (e: React.PointerEvent) => {
    if (!enMano) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const fila = el?.closest('[data-nodo]') ?? null
    const nodo = leerNodo(fila)
    if (!fila || !nodo || (nodo.tipo === enMano.tipo && nodo.id === enMano.id)) {
      ultimo.current = null
      setDestino(null)
      return
    }
    const caja = fila.getBoundingClientRect()
    // Una fórmula solo puede caer ENTRE fórmulas o DENTRO de una carpeta; el
    // «antes de» sobre una carpeta se reserva a mover carpetas.
    const dentro =
      enMano.tipo === 'formula' ? nodo.tipo === 'carpeta' : e.clientY > caja.top + caja.height / 2
    const siguiente = { ...nodo, dentro }
    if (permite && !permite(enMano, siguiente)) {
      ultimo.current = null
      setDestino(null)
      return
    }
    ultimo.current = siguiente
    setDestino(siguiente)
  }

  const soltar = () => {
    if (enMano && ultimo.current) alSoltar(enMano, ultimo.current)
    ultimo.current = null
    setEnMano(null)
    setDestino(null)
  }

  /** Props del asa de una fila (el `<span>` con el icono de mover). */
  const asa = (tipo: TipoNodo, id: string) => ({
    onPointerDown: empezar({ tipo, id }),
    onPointerMove: mover,
    onPointerUp: soltar,
    onPointerCancel: soltar,
  })

  /** Clases de resalte de una fila según dónde esté el dedo. */
  const resalte = (tipo: TipoNodo, id: string): string => {
    if (enMano?.tipo === tipo && enMano.id === id) return 'opacity-40'
    if (destino?.tipo !== tipo || destino.id !== id) return ''
    return destino.dentro ? 'ring-2 ring-sky-400/70' : 'border-t-2 border-sky-400'
  }

  return { enMano, destino, asa, resalte }
}
