/**
 * Avisos globales del plan (modales montados en App.tsx):
 * - AvisoRenovar: el ex-suscriptor intentó usar la IA → «renueva tu suscripción».
 * - CuotaAgotada: el aviso «Suscríbete». Sale cada vez que alguien sin plan
 *   intenta usar algo que cuesta (IA, sync, nube, transporte, juegos con Jev,
 *   redes), y también cuando un Pro gastó sus créditos del mes (ofrece subir).
 *
 * Los abre `cuenta/api.ts::llamarFuncion` (embudo único de la IA vía cuenta) y
 * cada superficie de pago al tocarla sin plan.
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

/**
 * Por qué se abrió: sin créditos ('cuota'), techo de uso real del mes ('techo')
 * o qué función de pago intentó usar quien no tiene plan (el título lo dice).
 */
export type MotivoCuota = 'cuota' | 'techo' | 'ia' | 'sync' | 'nube' | 'transporte' | 'jev' | 'redes'

interface CuotaState {
  abierto: boolean
  motivo: MotivoCuota
  abrir: (motivo?: MotivoCuota) => void
  cerrar: () => void
}

// Un juego o una ráfaga de llamadas puede pedir el aviso varias veces seguidas:
// tras cerrarlo, la misma ráfaga no lo reabre (un toque nuevo, segundos después, sí).
let ultimoAvisoCuota = 0

export const useCuotaAgotada = create<CuotaState>((set, get) => ({
  abierto: false,
  motivo: 'cuota',
  abrir: (motivo = 'cuota') => {
    if (!get().abierto && Date.now() - ultimoAvisoCuota < 3_000) return
    ultimoAvisoCuota = Date.now()
    set({ abierto: true, motivo })
  },
  cerrar: () => {
    ultimoAvisoCuota = Date.now()
    set({ abierto: false })
  },
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

// Mismo respaldo que el aviso demo, para el marcador de data/probarGuard.ts.
let ultimoAvisoSesion = 0

/** El trato del modo probar: edita lo que quieras, para guardarlo inicia sesión. */
export const useAvisoSesion = create<AvisoState>((set) => ({
  abierto: false,
  abrir: () => {
    if (Date.now() - ultimoAvisoSesion < 30_000) return
    ultimoAvisoSesion = Date.now()
    set({ abierto: true })
  },
  cerrar: () => set({ abierto: false }),
}))
