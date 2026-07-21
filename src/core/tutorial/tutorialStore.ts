import { create } from 'zustand'
import type { PasoTutorial, TutorialCtx, TutorialDef } from './tipos'
import { getPlantilla } from '../registry'
import { useDiseño, esObjetoLibreria } from '../state/disenoStore'
import { useMascota } from '../state/mascotaStore'
import { useHud } from '../state/hudStore'
import { tGlobal } from '../i18n/useT'

/** Contexto interno de la ejecución: el público + su limpieza. */
interface CtxInterno extends TutorialCtx {
  limpiar(): Promise<void>
}

function crearCtx(): CtxInterno {
  const hechas = new Set<string>()
  const limpiezas: Array<() => void | Promise<void>> = []
  let limpiado = false
  return {
    datos: new Map(),
    async unaVez(clave, fn) {
      if (hechas.has(clave)) return
      hechas.add(clave)
      await fn()
    },
    alLimpiar(fn) {
      limpiezas.push(fn)
    },
    async limpiar() {
      if (limpiado) return
      limpiado = true
      // En orden inverso (lo último creado se borra primero); un fallo no detiene el resto.
      for (const fn of limpiezas.reverse()) {
        try {
          await fn()
        } catch (e) {
          console.warn('[tutorial] Falló una limpieza del dato de ejemplo:', e)
        }
      }
    },
  }
}

// Vive fuera del store: no re-renderiza y no se serializa a window en DEV.
let ctxActual: CtxInterno | null = null

/** El contexto vivo (para que el overlay resuelva `sel` cuando es función). */
export function ctxTutorial(): TutorialCtx | null {
  return ctxActual
}

interface TutorialState {
  def: TutorialDef | null
  paso: number
  /** Corriendo `preparar`/`alEntrar`: deshabilita los botones de la tarjeta. */
  ocupado: boolean
  iniciar(def: TutorialDef): Promise<void>
  siguiente(): Promise<void>
  atras(): Promise<void>
  /** Cierra la UI de inmediato y ejecuta SIEMPRE la limpieza. Idempotente. */
  salir(completado?: boolean): Promise<void>
}

/** Corre `alEntrar` sin romper el tour: si falla, el overlay degrada a tarjeta sin spotlight. */
async function correrPaso(p: PasoTutorial | undefined) {
  if (!p?.alEntrar || !ctxActual) return
  try {
    await p.alEntrar(ctxActual)
  } catch (e) {
    console.warn('[tutorial] Falló alEntrar de un paso:', e)
  }
}

export const useTutorial = create<TutorialState>((set, get) => ({
  def: null,
  paso: 0,
  ocupado: false,
  async iniciar(def) {
    if (get().def) await get().salir()
    // Los pasos apuntan a botones del HUD: con un cuadrante plegado no habría qué iluminar.
    useHud.getState().desplegarTodo()
    ctxActual = crearCtx()
    set({ def, paso: 0, ocupado: true })
    try {
      await def.preparar?.()
    } catch (e) {
      console.warn('[tutorial] Falló preparar():', e)
    }
    // Tour de una app cuya plantilla no está en ningún cuarto: `preparar` no pudo
    // abrirla, así que el mago lo explica junto a la casa y el asistente avisa cómo usarla.
    // Sin `preparar` no aplica: la app ya está en pantalla (su header o la previa).
    const plantillaId = def.preparar && def.id.startsWith('app-') ? def.id.slice(4) : null
    if (plantillaId && getPlantilla(plantillaId)) {
      const asignada = useDiseño
        .getState()
        .objetos.some((o) => o.plantillaId === plantillaId && !esObjetoLibreria(o))
      if (!asignada) {
        useMascota
          .getState()
          .decir(
            tGlobal(
              'tut.appSinCuarto',
              'Esta app aún no está en ningún cuarto, así que te la explico desde aquí. Para usarla, asígnala en Menú › Plantillas.',
            ),
          )
      }
    }
    await correrPaso(def.pasos[0])
    set({ ocupado: false })
  },
  async siguiente() {
    const { def, paso, ocupado } = get()
    if (!def || ocupado) return
    if (paso >= def.pasos.length - 1) return get().salir(true) // Terminar
    set({ ocupado: true })
    await correrPaso(def.pasos[paso + 1])
    set({ paso: paso + 1, ocupado: false })
  },
  async atras() {
    const { def, paso, ocupado } = get()
    if (!def || ocupado || paso === 0) return
    set({ ocupado: true })
    await correrPaso(def.pasos[paso - 1])
    set({ paso: paso - 1, ocupado: false })
  },
  async salir(completado = false) {
    const def = get().def
    const ctx = ctxActual
    ctxActual = null
    set({ def: null, paso: 0, ocupado: false })
    def?.alTerminar?.(completado)
    // La UI ya se cerró; borrar los datos de ejemplo puede tardar sin estorbar.
    await ctx?.limpiar()
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useTutorial: typeof useTutorial }).useTutorial = useTutorial
}
