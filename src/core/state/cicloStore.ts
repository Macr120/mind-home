import { create } from 'zustand'
import { obtenerClimaReal, type ClimaActual, ClimaError } from '../clima'

/**
 * Ciclo día/noche (sistema de 24 h). `minutos` (0..1439) es el minuto del día que
 * posiciona el sol y la luna en la escena 3D. En modo 'vivo' sigue la hora real del
 * sistema; en 'manual' lo fija la barra de 24 h del editor para previsualizar el
 * amanecer/atardecer y la noche.
 */

const CLAVE_CLIMA = 'mh-clima-activo'

type Modo = 'vivo' | 'manual'
type ClimaEstado = 'idle' | 'cargando' | 'ok' | 'error'

function leerClimaActivo(): boolean {
  try {
    return localStorage.getItem(CLAVE_CLIMA) === '1'
  } catch {
    return false
  }
}

function guardarClimaActivo(v: boolean) {
  try {
    localStorage.setItem(CLAVE_CLIMA, v ? '1' : '0')
  } catch {
    /* almacenamiento bloqueado */
  }
}

/** Minuto del día actual según el reloj del sistema (con segundos en fracción). */
function minutosReales(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

interface CicloState {
  minutos: number
  modo: Modo
  brilloCielo: number
  brilloFocos: number
  climaActivo: boolean
  clima: ClimaActual | null
  climaEstado: ClimaEstado
  climaError: string | null
  setMinutos: (m: number) => void
  enVivo: () => void
  setBrilloCielo: (v: number) => void
  setBrilloFocos: (v: number) => void
  setClimaActivo: (v: boolean) => void
  actualizarClima: () => Promise<void>
}

let climaFetchId = 0

export const useCiclo = create<CicloState>((set, get) => ({
  minutos: minutosReales(),
  modo: 'vivo',
  brilloCielo: 1,
  brilloFocos: 1,
  climaActivo: leerClimaActivo(),
  clima: null,
  climaEstado: 'idle',
  climaError: null,
  setMinutos: (m) => set({ minutos: Math.max(0, Math.min(1439.999, m)), modo: 'manual' }),
  enVivo: () => set({ minutos: minutosReales(), modo: 'vivo' }),
  setBrilloCielo: (v) => set({ brilloCielo: Math.max(0, Math.min(1.5, v)) }),
  setBrilloFocos: (v) => set({ brilloFocos: Math.max(0, Math.min(1.5, v)) }),
  setClimaActivo: (v) => {
    guardarClimaActivo(v)
    set({ climaActivo: v, climaError: null })
    if (v) void get().actualizarClima()
    else set({ climaEstado: 'idle' })
  },
  actualizarClima: async () => {
    if (!get().climaActivo) return
    const id = ++climaFetchId
    set({ climaEstado: 'cargando', climaError: null })

    const guard = setTimeout(() => {
      if (id !== climaFetchId || get().climaEstado !== 'cargando') return
      set({
        climaEstado: 'error',
        climaError: 'Tiempo agotado. Pulsa Reintentar o revisa tu conexión.',
      })
    }, 22_000)

    try {
      const clima = await obtenerClimaReal()
      if (id !== climaFetchId || !get().climaActivo) return
      set({ clima, climaEstado: 'ok', climaError: null })
    } catch (e) {
      if (id !== climaFetchId) return
      const msg =
        e instanceof ClimaError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo obtener el clima.'
      set({ climaEstado: 'error', climaError: msg })
    } finally {
      clearTimeout(guard)
    }
  },
}))

setInterval(() => {
  const { modo, minutos } = useCiclo.getState()
  if (modo !== 'vivo') return
  const m = minutosReales()
  if (Math.floor(m) !== Math.floor(minutos)) useCiclo.setState({ minutos: m })
}, 1000)

if (import.meta.env.DEV) {
  ;(window as unknown as { useCiclo: typeof useCiclo }).useCiclo = useCiclo
}
