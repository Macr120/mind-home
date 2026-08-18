import { create } from 'zustand'

/**
 * Cola de celebraciones de la gamificación (estilo Duolingo): racha de una app,
 * lista de objetivos cumplida (+XP) y subida de nivel. Store global porque quien
 * celebra no es un componente: `gamificacion/listas.ts` encola al otorgar y el
 * único `<CelebracionesOverlay>` de App las va sacando UNA a una — completar la
 * lista con el primer registro del día encadena racha → lista → nivel.
 */
export type Celebracion =
  | { tipo: 'racha'; plantillaId: string; racha: number }
  | { tipo: 'lista'; plantillaId: string; xpAntes: number; xpDespues: number }
  | { tipo: 'nivel'; plantillaId: string; nivel: number }

interface CelebracionState {
  actual: Celebracion | null
  cola: Celebracion[]
  encolar: (c: Celebracion) => void
  avanzar: () => void
}

export const useCelebracion = create<CelebracionState>((set) => ({
  actual: null,
  cola: [],
  encolar: (c) => set((s) => (s.actual ? { cola: [...s.cola, c] } : { actual: c })),
  avanzar: () => set((s) => ({ actual: s.cola[0] ?? null, cola: s.cola.slice(1) })),
}))
