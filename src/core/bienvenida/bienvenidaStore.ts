import { create } from 'zustand'
import { esDemo } from '../edicion'
import { useDiseño, esObjetoLibreria } from '../state/disenoStore'

/** '1' = la bienvenida ya se vio (o la casa ya estaba armada al llegar esta versión). */
export const LS_BIENVENIDA = 'mh.bienvenida'
/** Pasos de la guía inicial ya completados (JSON con los ids). */
const LS_PASOS = 'mh.bienvenida.pasos'

/** Los 3 pasos de la guía que cierra la bienvenida. */
export type PasoGuia = 'cuarto' | 'tour' | 'explorar'

function leerHechos(): PasoGuia[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_PASOS) ?? '[]') as unknown
    return Array.isArray(raw) ? (raw as PasoGuia[]) : []
  } catch {
    return []
  }
}

interface BienvenidaState {
  abierto: boolean
  /** true = se muestra la guía de 3 pasos en vez del asistente de configuración. */
  guia: boolean
  /** Pasos de la guía ya completados. */
  hechos: PasoGuia[]
  abrir: () => void
  /** Vuelve a la guía de 3 pasos (al terminar o salir de un tour). */
  abrirGuia: () => void
  cerrar: () => void
  completar: (paso: PasoGuia) => void
}

export const useBienvenida = create<BienvenidaState>((set, get) => ({
  abierto: false,
  guia: false,
  hechos: leerHechos(),
  abrir: () => set({ abierto: true, guia: false }),
  abrirGuia: () => set({ abierto: true, guia: true }),
  cerrar: () => set({ abierto: false }),
  completar: (paso) => {
    if (get().hechos.includes(paso)) return
    const hechos = [...get().hechos, paso]
    localStorage.setItem(LS_PASOS, JSON.stringify(hechos))
    set({ hechos })
  },
}))

/** Apps ya asignadas a objetos de la casa (mismo criterio que el aviso del tutorial). */
export function appsAsignadas(): Set<string> {
  const ids = new Set<string>()
  for (const o of useDiseño.getState().objetos) {
    if (o.plantillaId && !esObjetoLibreria(o)) ids.add(o.plantillaId)
  }
  return ids
}

/**
 * Primera vez: abre la bienvenida si nunca se vio. Una casa que ya tiene apps
 * asignadas se considera "vista" (usuarios previos a esta versión) para no
 * interrumpirla ni duplicar cuartos. Idempotente (seguro con StrictMode).
 */
export function evaluarPrimeraVez(): void {
  // Casa demo: entra a una casa ya hecha, y además NUNCA debe escribir
  // `mh.bienvenida` — le robaría la primera vez a la casa real.
  if (esDemo()) return
  if (localStorage.getItem(LS_BIENVENIDA) === '1') return
  if (appsAsignadas().size > 0) {
    localStorage.setItem(LS_BIENVENIDA, '1')
    return
  }
  useBienvenida.getState().abrir()
}
