import { create } from 'zustand'
import { worldToCell, type Cell } from '../house/walls'
import { muebleAlAlcance, type MuebleAlAlcance } from '../house/apoyos'
import { useDiseño, esObjetoMapa } from './disenoStore'
import { roomWorldPos } from './layoutStore'
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
  /** Nivel del mueble elegido para dejar lo que se carga (null = el «a la mano»). */
  nivel: number | null
  /** Objetos al alcance, en el orden en que «Agarrar» los ofrece (la base primero). */
  opciones: number[]
  /** El que se eligió con «Otro» (null = el primero de `opciones`). */
  elegido: number | null
  setOpciones: (ids: number[]) => void
  /** Pasa al siguiente objeto al alcance. */
  otro: () => void
  setCerca: (c: CandidatoCarga | null) => void
  setNivel: (n: number | null) => void
  agarrar: () => void
  /** Suelta lo cargado: en el mueble al alcance si lo hay, o en el piso con `alPiso`. */
  soltar: (alPiso?: boolean) => void
}

/**
 * Dónde quedaría el objeto cargado si se suelta ahora: el mueble del taller al
 * alcance del personaje (ver `muebleAlAlcance`), o null si no hay ninguno.
 */
export function destinoCarga(nivel?: number | null): MuebleAlAlcance | null {
  const sujeto = useCargar.getState().sujeto
  if (sujeto?.tipo !== 'objeto') return null
  const { objetos } = useDiseño.getState()
  const o = objetos.find((x) => x.id === sujeto.id)
  if (!o) return null
  // Mismas coordenadas que las del objeto: las del cuarto o, en el mapa, las del mundo.
  const [cx, , cz] = esObjetoMapa(o) ? [0, 0, 0] : roomWorldPos(o.roomId)
  return muebleAlAlcance(objetos, o, playerPos.x - cx, playerPos.z - cz, nivel)
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
  nivel: null,
  opciones: [],
  elegido: null,
  setNivel: (n) => set({ nivel: n }),
  setOpciones: (ids) => {
    const { opciones, elegido } = get()
    if (ids.length === opciones.length && ids.every((id, i) => id === opciones[i])) return
    set({ opciones: ids, elegido: elegido != null && ids.includes(elegido) ? elegido : null })
  },
  otro: () => {
    const { opciones, cerca } = get()
    if (opciones.length < 2) return
    const i = cerca?.tipo === 'objeto' ? opciones.indexOf(cerca.id as number) : -1
    const id = opciones[(i + 1) % opciones.length]
    set({ elegido: id, cerca: { tipo: 'objeto', id } })
  },
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
    set({ sujeto: c, cerca: null, nivel: null, elegido: null })
    useHerramienta.getState().setCargando(true)
  },
  soltar: (alPiso = false) => {
    const s = get().sujeto
    if (!s) return
    if (s.tipo === 'objeto') {
      const nivel = get().nivel
      const destino = alPiso ? null : destinoCarga(nivel)
      const d = useDiseño.getState()
      if (destino) {
        // Se lleva al mueble lo cargado y lo que viaja con él, con sus offsets.
        const id = s.id as number
        d.setObjetoPos(id, destino.x, destino.z)
        for (const [mid, off] of Object.entries(d.dragGroupOffsets)) {
          d.setObjetoPos(Number(mid), destino.x + off.x, destino.z + off.z)
        }
        void d.endObjetoDrag().then(() => {
          if (nivel != null) void useDiseño.getState().setObjetoApoyo(id, destino.nivel)
        })
      } else {
        void d.endObjetoDrag()
      }
    }
    set({ sujeto: null, ultimaCeldaCuarto: null, nivel: null })
    useHerramienta.getState().setCargando(false)
    cargaFrame.retrocesoPendiente = true
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useCargar: typeof useCargar }).useCargar = useCargar
}
