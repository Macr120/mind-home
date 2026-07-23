import { create } from 'zustand'
import type { TipoVehiculo } from '../house/vehiculos'
import { sonar } from '../audio/sfx'
import { useGrafitis } from './grafitiStore'
import { usePlanos } from './planosStore'

/**
 * Herramientas de la rueda (estilo GTA) y acciones del personaje. Se pueden
 * EQUIPAR hasta 3 a la vez (hotbar); sin equipadas se muestra el cubo de
 * vistas. Estado runtime NO persistido; los datos por-frame (salto, baile,
 * disparo) van en el módulo mutable `accionFrame` (patrón `monturaFrame`)
 * para que Character/AvatarModelo/arma los lean sin re-renders. Las acciones
 * también funcionan montado en un vehículo (turbo, brincos, disparos…).
 */
export type Herramienta =
  | 'saltar' | 'correr' | 'bailar' | 'cuerda' | 'mortal' | 'saludar'
  | 'laser' | 'portales' | 'fuegos' | 'burbujas' | 'grafiti'
  /** Atajos de construcción: activan el constructor de mapa en 3D sin abrir el editor. */
  | 'construir'
  | TipoVehiculo

export const MAX_EQUIPADAS = 3

export const DUR_SALTO = 600 // ms
export const ALTURA_SALTO = 1.1
export const LARGO_RAYO = 14 // alcance máximo del blaster (unidades de mundo)
export const CORRER_MULT = 1.8
export const PERIODO_CUERDA = 550 // ms por vuelta de la cuerda
export const ALTURA_CUERDA = 0.28
export const DUR_SALUDO = 1800 // ms
export const ANGULO_BRAZO_CUERDA = -0.6

export const accionFrame = {
  correr: false,
  bailando: false,
  cuerda: false,
  burbujas: false,
  /** performance.now() del inicio del salto; 0 = sin salto. */
  saltoInicio: 0,
  /** El salto en curso es una voltereta (mortal). */
  mortal: false,
  /** performance.now() del inicio del saludo; 0 = sin saludo. */
  saludoInicio: 0,
  /** Timestamp del último disparo. */
  disparoT: 0,
  /** Hay un portal por colocar (Character lo resuelve en su frame). */
  portalPendiente: false,
  /** Hay un muro por pintar con grafiti (Character lo busca en su frame). */
  grafitiPendiente: false,
}

/** Offset vertical del salto en curso (parábola 0→H→0); expira solo. */
export function offsetSalto(ahora: number): number {
  if (!accionFrame.saltoInicio) return 0
  const p = (ahora - accionFrame.saltoInicio) / DUR_SALTO
  if (p >= 1) {
    accionFrame.saltoInicio = 0
    accionFrame.mortal = false
    return 0
  }
  return ALTURA_SALTO * 4 * p * (1 - p)
}

/** Fase 0..1 del ciclo de la cuerda (cuerpo, cuerda visual y brinco la comparten). */
export const faseCuerda = (ahora: number) => (ahora % PERIODO_CUERDA) / PERIODO_CUERDA

/** Brinquito de la cuerda: parábola en la media vuelta en que la cuerda pasa abajo. */
export function offsetCuerda(ahora: number): number {
  if (!accionFrame.cuerda) return 0
  const p = Math.min(1, Math.max(0, (faseCuerda(ahora) - 0.25) / 0.5))
  return ALTURA_CUERDA * 4 * p * (1 - p)
}

/** Ángulo del brazo saludando, o null si el saludo ya expiró (se limpia solo). */
export function anguloSaludo(ahora: number): number | null {
  if (!accionFrame.saludoInicio) return null
  if (ahora - accionFrame.saludoInicio >= DUR_SALUDO) {
    accionFrame.saludoInicio = 0
    return null
  }
  return -2.6 + Math.sin(ahora * 0.01) * 0.3
}

// Fase del baile por tiempo real: cuerpo y ropa la leen por separado y quedan
// en sincronía sin compartir refs (mismo patrón que `anguloMarcha`).
const faseBaile = () => performance.now() * 0.007

/** Brazo bailando: levantado, ondeando alternado (signo 1 = brazo izquierdo del cuerpo). */
export function anguloBrazoBaile(signo: 1 | -1): number {
  return -2.5 + Math.sin(faseBaile() + (signo === 1 ? 0 : Math.PI)) * 0.5
}

/** Pierna bailando: pasitos alternados en el sitio. */
export function anguloPiernaBaile(signo: 1 | -1): number {
  return Math.sin(faseBaile() + (signo === 1 ? 0 : Math.PI)) * 0.35
}

interface HerramientaState {
  /** Herramientas equipadas (máx MAX_EQUIPADAS); vacío = cubo de vistas normal. */
  equipadas: Herramienta[]
  correr: boolean
  bailando: boolean
  cuerda: boolean
  burbujas: boolean
  equipar: (h: Herramienta) => void
  soltarTodo: () => void
  setCorrer: (v: boolean) => void
  setBailando: (v: boolean) => void
  setCuerda: (v: boolean) => void
  setBurbujas: (v: boolean) => void
  saltar: () => void
  mortal: () => void
  saludar: () => void
  disparar: () => void
  colocarPortal: () => void
  pintarGrafiti: () => void
}

export const useHerramienta = create<HerramientaState>((set, get) => {
  /** Apaga la acción sostenida de una herramienta al desequiparla. */
  const apagar = (h: Herramienta) => {
    if (h === 'correr') {
      accionFrame.correr = false
      set({ correr: false })
    } else if (h === 'bailar') {
      accionFrame.bailando = false
      set({ bailando: false })
    } else if (h === 'cuerda') {
      accionFrame.cuerda = false
      set({ cuerda: false })
    } else if (h === 'burbujas') {
      accionFrame.burbujas = false
      set({ burbujas: false })
    } else if (h === 'portales') {
      accionFrame.portalPendiente = false
    } else if (h === 'grafiti') {
      accionFrame.grafitiPendiente = false
      useGrafitis.getState().salir()
    } else if (h === 'construir') {
      usePlanos.getState().setActivo(false)
    }
  }
  return {
    equipadas: [],
    correr: false,
    bailando: false,
    cuerda: false,
    burbujas: false,
    // Toggle: equipar/desequipar; con el máximo puesto, la nueva desplaza a la más antigua.
    equipar: (h) => {
      const eq = get().equipadas
      if (eq.includes(h)) {
        apagar(h)
        set({ equipadas: eq.filter((x) => x !== h) })
        return
      }
      const nuevas = [...eq, h]
      if (nuevas.length > MAX_EQUIPADAS) apagar(nuevas.shift()!)
      set({ equipadas: nuevas })
    },
    soltarTodo: () => {
      for (const h of get().equipadas) apagar(h)
      set({ equipadas: [] })
    },
    setCorrer: (v) => {
      accionFrame.correr = v
      set({ correr: v })
    },
    setBailando: (v) => {
      accionFrame.bailando = v
      set({ bailando: v })
    },
    setCuerda: (v) => {
      accionFrame.cuerda = v
      set({ cuerda: v })
    },
    setBurbujas: (v) => {
      accionFrame.burbujas = v
      set({ burbujas: v })
    },
    saltar: () => {
      const ahora = performance.now()
      if (accionFrame.saltoInicio && ahora - accionFrame.saltoInicio < DUR_SALTO) return
      accionFrame.saltoInicio = ahora
      accionFrame.mortal = false
      sonar('salto')
    },
    mortal: () => {
      const ahora = performance.now()
      if (accionFrame.saltoInicio && ahora - accionFrame.saltoInicio < DUR_SALTO) return
      accionFrame.saltoInicio = ahora
      accionFrame.mortal = true
      sonar('mortal')
    },
    saludar: () => {
      if (!accionFrame.saludoInicio) {
        accionFrame.saludoInicio = performance.now()
        sonar('saludo')
      }
    },
    disparar: () => {
      accionFrame.disparoT = performance.now()
      sonar('disparo')
    },
    colocarPortal: () => {
      accionFrame.portalPendiente = true
    },
    pintarGrafiti: () => {
      accionFrame.grafitiPendiente = true
    },
  }
})
