import { create } from 'zustand'
import { desbloquearAudio } from '../audio/motor'
import { fechaLocalISO } from '../fechaLocal'
import {
  periodoAnterior,
  periodoDe,
  periodoSiguiente,
  ultimoCerrado,
  type TipoPeriodo,
} from '../wrapped/periodo'

/**
 * Estado del overlay Wrapped (resumen del periodo). Es store global porque se
 * abre desde el menú lateral, desde una notificación (main.tsx) y desde el
 * reloj de avisos, no solo desde un componente.
 */
interface WrappedUiState {
  abierto: boolean
  tipo: TipoPeriodo
  /** Primer día del periodo mostrado (cualquier fecha del periodo vale de ancla). */
  ancla: string
  /** Hay un resumen cerrado que el usuario aún no abre (badge en el personaje). */
  hayNuevo: boolean
  /** Sin argumentos abre el último periodo CERRADO (la semana pasada). */
  abrir: (tipo?: TipoPeriodo, ancla?: string) => void
  cerrar: () => void
  /** Cambia semana/mes/año re-anclando al periodo que contiene el ancla actual. */
  setTipo: (tipo: TipoPeriodo) => void
  irAnterior: () => void
  /** Avanza sin pasar del periodo que contiene hoy. */
  irSiguiente: () => void
  /** Recalcula el badge (lo llama el reloj de avisos al cerrar un periodo). */
  refrescarNuevo: () => void
}

const TIPOS: TipoPeriodo[] = ['semana', 'mes', 'anio']
const LS_VISTO = (tipo: TipoPeriodo) => `mh.wrapped.visto.${tipo}`

/** ¿Algún periodo cerrado sigue sin verse? (visto ≠ avisado: aquí cuenta ABRIRLO). */
function calcularNuevo(): boolean {
  try {
    return TIPOS.some((t) => localStorage.getItem(LS_VISTO(t)) !== ultimoCerrado(t).id)
  } catch {
    return false
  }
}

function marcarVisto() {
  try {
    for (const t of TIPOS) localStorage.setItem(LS_VISTO(t), ultimoCerrado(t).id)
  } catch {
    /* quota / modo privado */
  }
}

export const useWrappedUi = create<WrappedUiState>((set, get) => ({
  abierto: false,
  tipo: 'semana',
  ancla: ultimoCerrado('semana').desde,
  hayNuevo: calcularNuevo(),
  abrir: (tipo = 'semana', ancla) => {
    // El clic que abre es el gesto que desbloquea el autoplay de la música.
    desbloquearAudio()
    // Abrirlo cuenta como "visto": se apaga el badge de todos los periodos.
    marcarVisto()
    set({ abierto: true, tipo, ancla: ancla ?? ultimoCerrado(tipo).desde, hayNuevo: false })
  },
  cerrar: () => set({ abierto: false }),
  setTipo: (tipo) => set({ tipo, ancla: periodoDe(tipo, get().ancla).desde }),
  irAnterior: () => {
    const { tipo, ancla } = get()
    set({ ancla: periodoAnterior(periodoDe(tipo, ancla)).desde })
  },
  irSiguiente: () => {
    const { tipo, ancla } = get()
    const sig = periodoSiguiente(periodoDe(tipo, ancla))
    if (sig.desde > fechaLocalISO()) return
    set({ ancla: sig.desde })
  },
  refrescarNuevo: () => set({ hayNuevo: calcularNuevo() }),
}))
