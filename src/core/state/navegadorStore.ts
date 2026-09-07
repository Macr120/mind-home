import { create } from 'zustand'
import { db } from '../data/db'
import { hostDe } from '../enlaces'
import { hayNavegadorEscritorio, type BoundsNavegador } from '../plataforma'

/**
 * El navegador embebido del escritorio (fase 2 de los enlaces web): el shell
 * pinta la página en una vista nativa (`WebContentsView`) y aquí vive el estado
 * de la barra (URL, título, atrás/adelante) y el registro de visitas.
 *
 * A diferencia del móvil (una fila por apertura), aquí el shell avisa de cada
 * navegación: se lleva UNA visita por dominio — al cambiar de host se cierra la
 * fila con su duración y se abre otra. Así `visitasWeb` guarda tiempo por
 * dominio de verdad, con la misma tabla de la fase 1.
 */

/** Alto de la barra de navegación (px CSS); la vista nativa empieza debajo. */
const BARRA_NAVEGADOR = 48

/** Tope de una visita sin cierre: no apuntar un día entero por una ventana olvidada. */
const TOPE_VISITA_SEG = 4 * 3600

function boundsBajoBarra(): BoundsNavegador {
  return { x: 0, y: BARRA_NAVEGADOR, width: window.innerWidth, height: window.innerHeight - BARRA_NAVEGADOR }
}

interface VisitaAbierta {
  id: number
  host: string
  desde: number
}

interface NavegadorState {
  abierto: boolean
  url: string
  titulo: string
  atras: boolean
  adelante: boolean
  /** La visita del dominio actual, aún sin duración. */
  visita: VisitaAbierta | null
  /** Abre el navegador con la página (o navega a ella si ya está abierto). */
  abrir: (url: string, nombre?: string) => Promise<void>
  cerrar: () => Promise<void>
  /** El shell navegó (did-navigate): actualizar barra y visita por dominio. */
  alNavegar: (datos: { url: string; atras: boolean; adelante: boolean }) => void
  alTitulo: (titulo: string) => void
  /** El shell cerró la vista por su cuenta (proceso caído). */
  alCerrarShell: () => void
  /** Manda al shell los bounds actuales (al abrir y al redimensionar). */
  reencuadrar: () => void
}

/** Cierra la fila de la visita vigente con su duración; no toca el estado. */
function cerrarVisita(visita: VisitaAbierta | null): void {
  if (!visita) return
  const seg = Math.min(Math.round((Date.now() - visita.desde) / 1000), TOPE_VISITA_SEG)
  void db.visitasWeb.update(visita.id, { duracionSeg: seg })
}

export const useNavegador = create<NavegadorState>((set, get) => ({
  abierto: false,
  url: '',
  titulo: '',
  atras: false,
  adelante: false,
  visita: null,

  abrir: async (url, nombre) => {
    if (!hayNavegadorEscritorio()) return
    const ok = await window.mph!.navegador!.abrir(url, boundsBajoBarra())
    if (!ok) return
    set({ abierto: true, url, titulo: nombre || hostDe(url) })
    // La primera visita se abre ya: el did-navigate llegará con el mismo host
    // y no la duplica (alNavegar solo rota la fila al CAMBIAR de dominio).
    if (get().visita?.host !== hostDe(url)) {
      cerrarVisita(get().visita)
      set({ visita: null })
      const id = await db.visitasWeb.add({ url, nombre: nombre || undefined, inicio: new Date().toISOString() })
      set({ visita: { id, host: hostDe(url), desde: Date.now() } })
    }
  },

  cerrar: async () => {
    cerrarVisita(get().visita)
    set({ abierto: false, visita: null, atras: false, adelante: false })
    await window.mph?.navegador?.cerrar()
  },

  alNavegar: ({ url, atras, adelante }) => {
    if (!get().abierto || !url) return
    const host = hostDe(url)
    if (get().visita?.host !== host) {
      cerrarVisita(get().visita)
      set({ visita: null })
      void db.visitasWeb.add({ url, inicio: new Date().toISOString() }).then((id) => {
        // Si cerraron el navegador mientras se escribía la fila, queda como apertura suelta.
        if (get().abierto) set({ visita: { id, host, desde: Date.now() } })
      })
    }
    set({ url, atras, adelante })
  },

  alTitulo: (titulo) => {
    if (get().abierto && titulo) set({ titulo })
  },

  alCerrarShell: () => {
    cerrarVisita(get().visita)
    set({ abierto: false, visita: null, atras: false, adelante: false })
  },

  reencuadrar: () => {
    if (get().abierto) void window.mph?.navegador?.bounds(boundsBajoBarra())
  },
}))
