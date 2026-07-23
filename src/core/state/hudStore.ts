import { create } from 'zustand'

/**
 * Plegado del HUD de juego por cuadrantes (look minimalista). Cada esquina se
 * pliega por separado con un botón chico en su extremo más alejado y se
 * despliega tocando el icono que queda en su lugar:
 *   supIzq → casa · supDer → engrane · infDer → cubo · chat → asistente
 *   infIzq → el joystick se va; queda el abanico (rueda) y un chevron chico.
 *
 * En TELÉFONO en vertical rige un modo compacto (`movilVertical`): el HUD
 * arranca plegado y se aplican reglas de exclusión (ver `setPlegado`). En
 * tablets, escritorio y en horizontal NO aplica: manda la preferencia guardada.
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

const TODO = (): Plegado => ({
  supIzq: true,
  supDer: true,
  infIzq: true,
  infDer: true,
  chat: true,
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

/**
 * Teléfono en vertical: pantalla estrecha (≤ 640 px, el breakpoint `sm`) y
 * orientación vertical. Deja fuera tablets (más anchas) y cualquier pantalla en
 * horizontal, donde el HUD normal cabe sin estorbar.
 */
const QUERY_MOVIL = '(max-width: 640px) and (orientation: portrait)'
const esMovilVertical = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY_MOVIL).matches

interface HudState {
  plegado: Plegado
  /** Modo compacto de teléfono en vertical (reglas de default y exclusión). */
  movilVertical: boolean
  /** Side menu de Mind Home (RoomSideMenu) abierto. Vive aquí (no en estado local de
   *  App) para que el disparador del lado opuesto (ToolbarPermanente) sepa que debe
   *  plegarse en vertical, espejo de cómo FloatingMenuButton mira `editMode`. */
  menuAbierto: boolean
  setPlegado: (zona: ZonaHud, v: boolean) => void
  setMovilVertical: (v: boolean) => void
  setMenuAbierto: (v: boolean) => void
  /** Despliega todo (lo usan los tutoriales: sus pasos apuntan a botones del HUD). */
  desplegarTodo: () => void
}

const arranqueMovil = esMovilVertical()

export const useHud = create<HudState>((set, get) => ({
  // En teléfono vertical el HUD arranca plegado; en el resto, según lo guardado.
  plegado: arranqueMovil ? TODO() : leer(),
  movilVertical: arranqueMovil,
  menuAbierto: true,

  setPlegado: (zona, v) => {
    const { plegado, movilVertical } = get()
    const nuevo = { ...plegado, [zona]: v }
    // Reglas SOLO en teléfono vertical y solo al DESPLEGAR una zona (v === false):
    if (movilVertical && !v) {
      // Superiores: casa y engrane no conviven; abrir uno pliega el otro.
      if (zona === 'supIzq') nuevo.supDer = true
      else if (zona === 'supDer') nuevo.supIzq = true
      // Chat ⊕ esquinas inferiores: el chat ocupa el bajo completo, así que
      // abrirlo pliega las esquinas y abrir una esquina pliega el chat.
      else if (zona === 'chat') {
        nuevo.infIzq = true
        nuevo.infDer = true
      } else if (zona === 'infIzq' || zona === 'infDer') nuevo.chat = true
    }
    if (ZONAS.every((z) => nuevo[z] === plegado[z])) return
    // El estado compacto del móvil es de sesión: no pisa la preferencia base.
    if (!movilVertical) guardar(nuevo)
    set({ plegado: nuevo })
  },

  setMovilVertical: (v) => {
    if (get().movilVertical === v) return
    // Al entrar al modo teléfono: plegar todo (default). Al salir: preferencia guardada.
    set({ movilVertical: v, plegado: v ? TODO() : leer() })
  },

  setMenuAbierto: (v) => set({ menuAbierto: v }),

  desplegarTodo: () => {
    if (!ZONAS.some((z) => get().plegado[z])) return
    const plegado = NINGUNO()
    if (!get().movilVertical) guardar(plegado)
    set({ plegado })
  },
}))

// El HUD sigue el tamaño/orientación: al pasar a teléfono vertical se compacta,
// al volver a horizontal o a una pantalla ancha se restaura.
if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia(QUERY_MOVIL)
  mq.addEventListener('change', (e) => useHud.getState().setMovilVertical(e.matches))
}
