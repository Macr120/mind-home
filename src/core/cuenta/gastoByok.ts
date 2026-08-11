import { create } from 'zustand'

/**
 * Medidor de gasto BYOK: cuánto le ha costado al usuario, en dólares reales,
 * usar SU PROPIA clave de API (sin pasar por el proxy de créditos de la
 * cuenta). Puramente informativo y local — no afecta ninguna cuota ni límite.
 *
 * Mismas categorías que `OpIA` de `costos.ts` (chat/imagen/modelo3d/voz/tts),
 * para que el usuario reconozca de qué se compone. Los call-sites que llaman
 * a un proveedor con `getIaKey(...)` (en chat/ia.ts, imagenIA.ts, audio/vozIA.ts,
 * audio/dictado.ts) llaman `useGastoByok.getState().sumar(...)` directo, sin
 * necesidad de ser componentes React.
 */

export type CategoriaGastoByok = 'chat' | 'imagen' | 'modelo3d' | 'voz' | 'tts'

const CATEGORIAS: CategoriaGastoByok[] = ['chat', 'imagen', 'modelo3d', 'voz', 'tts']
const LS_PREFIX = 'mh.gastoByok.'

function leer(cat: CategoriaGastoByok): number {
  const v = parseFloat(localStorage.getItem(LS_PREFIX + cat) ?? '')
  return Number.isFinite(v) && v > 0 ? v : 0
}

function gastoInicial(): Record<CategoriaGastoByok, number> {
  return Object.fromEntries(CATEGORIAS.map((c) => [c, leer(c)])) as Record<CategoriaGastoByok, number>
}

interface GastoByokState {
  gasto: Record<CategoriaGastoByok, number>
  /** Suma `montoUsd` a la categoría. No-op si el monto no es positivo (llamada fallida/gratis). */
  sumar: (cat: CategoriaGastoByok, montoUsd: number) => void
  reiniciar: () => void
}

export const useGastoByok = create<GastoByokState>((set, get) => ({
  gasto: gastoInicial(),
  sumar: (cat, montoUsd) => {
    if (!(montoUsd > 0)) return
    const nuevo = get().gasto[cat] + montoUsd
    localStorage.setItem(LS_PREFIX + cat, String(nuevo))
    set((s) => ({ gasto: { ...s.gasto, [cat]: nuevo } }))
  },
  reiniciar: () => {
    for (const c of CATEGORIAS) localStorage.removeItem(LS_PREFIX + c)
    set({ gasto: gastoInicial() })
  },
}))

export function totalGastoByok(gasto: Record<CategoriaGastoByok, number>): number {
  return CATEGORIAS.reduce((suma, c) => suma + gasto[c], 0)
}
