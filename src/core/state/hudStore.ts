import { create } from 'zustand'

/**
 * Plegado del HUD de juego por cuadrantes (look minimalista). Cada esquina se
 * pliega por separado con un botón chico en su extremo más alejado y se
 * despliega tocando el icono que queda en su lugar:
 *   supIzq → casa · supDer → engrane · infDer → cubo · chat → asistente
 *   infIzq → el joystick se va; queda el abanico (rueda) y un chevron chico.
 */
export type ZonaHud = 'supIzq' | 'supDer' | 'infIzq' | 'infDer' | 'chat'

const CLAVE = 'mh-hud-plegado'
const ZONAS: ZonaHud[] = ['supIzq', 'supDer', 'infIzq', 'infDer', 'chat']

type Plegado = Record<ZonaHud, boolean>

const NINGUNO = (): Plegado => ({
  supIzq: false,
  supDer: false,
  infIzq: false,
  infDer: false,
  chat: false,
})

function leer(): Plegado {
  const p = NINGUNO()
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Partial<Plegado>
    for (const z of ZONAS) p[z] = guardado[z] === true
  } catch {
    /* almacenamiento bloqueado o dato corrupto */
  }
  return p
}

function guardar(p: Plegado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p))
  } catch {
    /* almacenamiento bloqueado */
  }
}

interface HudState {
  plegado: Plegado
  setPlegado: (zona: ZonaHud, v: boolean) => void
  /** Despliega todo (lo usan los tutoriales: sus pasos apuntan a botones del HUD). */
  desplegarTodo: () => void
}

export const useHud = create<HudState>((set, get) => ({
  plegado: leer(),
  setPlegado: (zona, v) => {
    if (get().plegado[zona] === v) return
    const plegado = { ...get().plegado, [zona]: v }
    guardar(plegado)
    set({ plegado })
  },
  desplegarTodo: () => {
    if (!ZONAS.some((z) => get().plegado[z])) return
    const plegado = NINGUNO()
    guardar(plegado)
    set({ plegado })
  },
}))
