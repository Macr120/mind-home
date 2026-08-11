import { create } from 'zustand'
import { worldToCell, type Cell } from '../house/walls'
import { useDiseño } from './disenoStore'
import { useHerramienta } from './herramientaStore'
import { playerPos } from './playerPosition'

/** Radio para agarrar un objeto suelto, medido a su CENTRO (mismo orden que RADIO_ACCION). */
export const RADIO_CARGA_OBJETO = 2.3
/** Distancia máxima al BORDE de un cuarto para agarrarlo (los objetos se miden al centro). */
export const RADIO_CARGA_CUARTO = 1.6
/** Altura a la que se dibuja un objeto cargado, sobre la cabeza del personaje. */
export const ALTURA_CARGA_OBJETO = 1.9
/** Altura a la que se dibuja un CUARTO cargado: su piso queda sobre la cabeza, y
 * por debajo de NIVEL_ALTURA (2.6) para no confundirse con el piso de arriba. */
export const ALTURA_CARGA_CUARTO = 2.2

export interface CandidatoCarga {
  tipo: 'objeto' | 'cuarto'
  id: number | string
}

/** Señales por frame que consume `Character.tsx` (patrón `monturaFrame`/`accionCuartoFrame`). */
export const cargaFrame = {
  /**
   * Se acaba de soltar: el objeto se dibujaba EXACTAMENTE en la posición del
   * jugador, así que al reactivarse su collider puede dejarlo dentro de la caja.
   * Character lo empuja hacia atrás en el siguiente frame (si hace falta).
   */
  retrocesoPendiente: false,
}

interface CargarState {
  /** Candidato más cercano al alcance (lo publica `ContextoProximity`). */
  cerca: CandidatoCarga | null
  /** Lo que se está cargando ahora mismo. */
  sujeto: CandidatoCarga | null
  /** Última celda del jugador usada como referencia para mover un cuarto por deltas. */
  ultimaCeldaCuarto: Cell | null
  setCerca: (c: CandidatoCarga | null) => void
  agarrar: () => void
  soltar: () => void
}

/**
 * Estado de la herramienta "Mover": agarrar/cargar/soltar un objeto o un cuarto
 * completo mientras el personaje camina (herramienta `mover` de la rueda). Un
 * objeto agarrado reutiliza el ciclo de arrastre de `disenoStore`
 * (`startObjetoDrag`/`setObjetoPos`/`endObjetoDrag`), conducido por la posición
 * del personaje en vez del mouse (ver `CargaController`). Un cuarto agarrado se
 * mueve por celdas de rejilla vía `layoutStore.moveRoom`, validado en cada paso
 * dentro de `Character.tsx` (que además bloquea el avance si el destino no es
 * válido — ahí vive la lógica, porque necesita frenar la propia posición del
 * personaje).
 */
export const useCargar = create<CargarState>((set, get) => ({
  cerca: null,
  sujeto: null,
  ultimaCeldaCuarto: null,
  setCerca: (c) => {
    const actual = get().cerca
    if (actual?.tipo === c?.tipo && actual?.id === c?.id) return
    set({ cerca: c })
  },
  agarrar: () => {
    const c = get().cerca
    if (!c || get().sujeto) return
    if (c.tipo === 'objeto') {
      useDiseño.getState().startObjetoDrag(c.id as number, true)
    } else {
      set({ ultimaCeldaCuarto: worldToCell(playerPos.x, playerPos.z) })
    }
    set({ sujeto: c, cerca: null })
    useHerramienta.getState().setCargando(true)
  },
  soltar: () => {
    const s = get().sujeto
    if (!s) return
    if (s.tipo === 'objeto') void useDiseño.getState().endObjetoDrag()
    set({ sujeto: null, ultimaCeldaCuarto: null })
    useHerramienta.getState().setCargando(false)
    cargaFrame.retrocesoPendiente = true
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useCargar: typeof useCargar }).useCargar = useCargar
}
