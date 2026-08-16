/**
 * Avisos globales del plan (modales montados en App.tsx):
 * - AvisoRenovar: el ex-suscriptor intentó usar la IA → «renueva tu suscripción».
 * - CuotaAgotada: un Pro gastó sus créditos del mes → ofrecer la recarga.
 *
 * Los abre `cuenta/api.ts::llamarFuncion` (embudo único de la IA vía cuenta).
 */
import { create } from 'zustand'

interface AvisoState {
  abierto: boolean
  abrir: () => void
  cerrar: () => void
}

// El intento de IA del ex-suscriptor puede repetirse en ráfaga (chat, charlas…):
// un solo aviso cada 30 s basta.
let ultimoAvisoRenovar = 0

export const useAvisoRenovar = create<AvisoState>((set) => ({
  abierto: false,
  abrir: () => {
    if (Date.now() - ultimoAvisoRenovar < 30_000) return
    ultimoAvisoRenovar = Date.now()
    set({ abierto: true })
  },
  cerrar: () => set({ abierto: false }),
}))

/** Por qué se abrió: sin créditos ('cuota') o techo de uso real del mes ('techo'). */
export type MotivoCuota = 'cuota' | 'techo'

interface CuotaState {
  abierto: boolean
  motivo: MotivoCuota
  abrir: (motivo?: MotivoCuota) => void
  cerrar: () => void
}

export const useCuotaAgotada = create<CuotaState>((set) => ({
  abierto: false,
  motivo: 'cuota',
  abrir: (motivo = 'cuota') => set({ abierto: true, motivo }),
  cerrar: () => set({ abierto: false }),
}))

// Un click del visitante puede disparar varias escrituras: el marcador
// (data/demoGuard.ts) ya avisa una sola vez por carga, y esto lo respalda.
let ultimoAvisoDemo = 0

/** El trato de la casa demo: pruébalo todo, nada se guarda. */
export const useAvisoDemo = create<AvisoState>((set) => ({
  abierto: false,
  abrir: () => {
    if (Date.now() - ultimoAvisoDemo < 30_000) return
    ultimoAvisoDemo = Date.now()
    set({ abierto: true })
  },
  cerrar: () => set({ abierto: false }),
}))
