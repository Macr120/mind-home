import { useEffect, useRef } from 'react'

/**
 * Salto de una pestaña de Finanzas a su hermana, señalando a dónde hay que
 * llegar: una deuda vive a la vez en Pasivos (donde se ve) y en Metas (donde se
 * abona), y los chips llevan de una a la otra.
 *
 * Va por props desde `FinanzasApp` y no por `intencionApp` a propósito: aquella
 * caduca a los 15 s y solo se lee al montar, así que sirve para entrar desde el
 * chat pero no para navegar dentro de la app ya abierta.
 */
export interface FocoFinanzas {
  tipo: 'patrimonio' | 'meta'
  id: number
}

/** Cuánto se queda encendido el resaltado antes de apagarse solo. */
const MS_RESALTADO = 1600

/**
 * Lleva a la vista el elemento señalado y lo resalta un momento. Devuelve la
 * ref que hay que poner en el contenedor y si toca pintarlo marcado.
 */
export function useFoco(marcado: boolean, onUsado: () => void) {
  const ref = useRef<HTMLLIElement | HTMLDivElement | null>(null)

  useEffect(() => {
    if (!marcado) return
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const t = setTimeout(onUsado, MS_RESALTADO)
    return () => clearTimeout(t)
  }, [marcado, onUsado])

  return { ref, clase: marcado ? 'ring-2 ring-amber-400/60' : '' }
}
