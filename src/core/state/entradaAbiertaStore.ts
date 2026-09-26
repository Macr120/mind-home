import { useEffect } from 'react'
import { create } from 'zustand'
import type { EnlaceObjetoApp } from '../data/db'

/**
 * La entrada que la app tiene ABIERTA ahora mismo (una receta, un mapa, un
 * lugar…), publicada por su vista de detalle. La lee el botón «Enlazar a un
 * objeto» del encabezado del cuarto: sin nada publicado, enlaza la app entera.
 *
 * Es el camino de vuelta de `intencionApp` (que es de entrada y de un solo uso):
 * aquí la app dice dónde está, y nadie la navega.
 */
interface EntradaAbiertaState {
  entrada: EnlaceObjetoApp | null
}

export const useEntradaAbierta = create<EntradaAbiertaState>(() => ({ entrada: null }))

/** El `uid` que sella el sync (no todas las interfaces de fila lo declaran). */
export const uidDe = (fila: object): string | undefined => (fila as { uid?: string }).uid

/**
 * Publica la entrada mientras la vista esté montada (y la retira al cerrarse).
 * Con null no publica nada. Las dependencias son los campos, no el objeto: las
 * vistas lo arman en cada render.
 */
export function usePublicarEntrada(e: EnlaceObjetoApp | null): void {
  const { plantillaId, seccion, dato, ref, titulo } = e ?? {}
  useEffect(() => {
    if (!plantillaId) return
    const propia: EnlaceObjetoApp = { plantillaId, seccion, dato, ref, titulo }
    useEntradaAbierta.setState({ entrada: propia })
    return () => {
      if (useEntradaAbierta.getState().entrada === propia) useEntradaAbierta.setState({ entrada: null })
    }
  }, [plantillaId, seccion, dato, ref, titulo])
}
