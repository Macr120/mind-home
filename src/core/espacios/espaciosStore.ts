import { create } from 'zustand'
import type { BloqueoEspacio, Espacio } from './tipos'

/**
 * Espejo SÍNCRONO de los espacios: la lista que devolvió el servidor y el
 * estado en vivo de los que están abiertos. La caché Dexie (`cache.ts`) es la
 * que sobrevive a la recarga; esto es lo que pinta la UI sin esperar a nadie.
 */

export interface EspacioVivo {
  /** El canal está unido y el pull al día. */
  conectado: boolean
  /** `miembroId` de quienes han dado señales de vida hace menos de 150 s. */
  presentes: string[]
  bloqueo: BloqueoEspacio | null
}

interface EspaciosState {
  lista: Espacio[]
  vivos: Record<string, EspacioVivo>
  /** Espacio cuyo panel de compartir está abierto (modal global de `App.tsx`). */
  panelCompartir: string | null
  abrirCompartir: (espacioId: string) => void
  cerrarCompartir: () => void
}

export const useEspaciosStore = create<EspaciosState>((set) => ({
  lista: [],
  vivos: {},
  panelCompartir: null,
  abrirCompartir: (espacioId) => set({ panelCompartir: espacioId }),
  cerrarCompartir: () => set({ panelCompartir: null }),
}))

/** Mete o actualiza un espacio en la lista sin tocar los demás. */
export function fundirEnLista(e: Espacio): void {
  useEspaciosStore.setState((s) => {
    const i = s.lista.findIndex((x) => x.espacioId === e.espacioId)
    if (i < 0) return { lista: [...s.lista, e] }
    const lista = s.lista.slice()
    lista[i] = e
    return { lista }
  })
}

export function quitarDeLista(espacioId: string): void {
  useEspaciosStore.setState((s) => ({
    lista: s.lista.filter((x) => x.espacioId !== espacioId),
    panelCompartir: s.panelCompartir === espacioId ? null : s.panelCompartir,
  }))
}

const VIVO_VACIO: EspacioVivo = { conectado: false, presentes: [], bloqueo: null }

export function fijarVivo(espacioId: string, parche: Partial<EspacioVivo>): void {
  useEspaciosStore.setState((s) => ({
    vivos: { ...s.vivos, [espacioId]: { ...VIVO_VACIO, ...s.vivos[espacioId], ...parche } },
  }))
}

export function olvidarVivo(espacioId: string): void {
  useEspaciosStore.setState((s) => {
    const vivos = { ...s.vivos }
    delete vivos[espacioId]
    return { vivos }
  })
}
