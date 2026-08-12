import { create } from 'zustand'
import type { CuerpoTutorial, PasoTutorial, TutorialCtx, TutorialDef } from './tipos'
import { setTutorialActivo } from '../data/demoGuard'
import { getPlantilla } from '../registry'
import { useDiseño, esObjetoLibreria } from '../state/disenoStore'
import { useMascota } from '../state/mascotaStore'
import { useHud } from '../state/hudStore'
import { useZonaTut } from '../state/zonaTutStore'
import { idiomaActual, tGlobal } from '../i18n/useT'
import { asegurarDictTut } from '../i18n/dict'
import { aplicarZonaPaso } from './zonaMapa'

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

/** Ajustes de UNA ejecución; los pone quien lanza el tour, no su definición. */
export interface OpcionesTour {
  /** La pantalla ya está montada: no vuelvas a abrirla (previa del catálogo, demo). */
  sinPreparar?: boolean
  /** Al cerrarse el tour, con `true` si se llegó al final. */
  alTerminar?: (completado: boolean) => void
}

interface TutorialState {
  def: TutorialDef | null
  /** Pasos y ganchos del tour en curso: llegan del chunk que baja `def.cargar()`. */
  cuerpo: CuerpoTutorial | null
  paso: number
  /** Bajando el cuerpo o corriendo `preparar`/`alEntrar`: botones deshabilitados. */
  ocupado: boolean
  iniciar(def: TutorialDef, opts?: OpcionesTour): Promise<void>
  siguiente(): Promise<void>
  atras(): Promise<void>
  /** Cierra la UI de inmediato y ejecuta SIEMPRE la limpieza. Idempotente. */
  salir(completado?: boolean): Promise<void>
}

// El gancho de cierre es de la EJECUCIÓN, no del tour: fuera del store, que no
// necesita re-renderizar por él.
let alTerminarActual: ((completado: boolean) => void) | undefined

/** Corre `alEntrar` sin romper el tour: si falla, el overlay degrada a tarjeta sin spotlight. */
async function correrPaso(p: PasoTutorial | undefined) {
  if (!p || !ctxActual) return
  if (p.alEntrar) {
    try {
      await p.alEntrar(ctxActual)
    } catch (e) {
      console.warn('[tutorial] Falló alEntrar de un paso:', e)
    }
  }
  // El vuelo va DESPUÉS de `alEntrar`: los editores de infraestructura hacen
  // `setVista('iso')` al abrirse, que recoloca el foco sobre el personaje y
  // desharía el encuadre.
  await aplicarZonaPaso(p, ctxActual)
}

export const useTutorial = create<TutorialState>((set, get) => ({
  def: null,
  cuerpo: null,
  paso: 0,
  ocupado: false,
  async iniciar(def, opts) {
    if (get().def) await get().salir()
    // En la casa demo, lo que el tour escriba no debe leerse como una edición
    // del visitante (el aviso saldría solo y taparía el spotlight).
    setTutorialActivo(true)
    // Los pasos apuntan a botones del HUD: con un cuadrante plegado no habría qué iluminar.
    useHud.getState().desplegarTodo()
    ctxActual = crearCtx()
    alTerminarActual = opts?.alTerminar
    // `cuerpo` va aparte del `set` inicial: el overlay no debe pintar tarjeta
    // hasta tener pasos, y bajar el chunk puede tardar un parpadeo.
    set({ def, cuerpo: null, paso: 0, ocupado: true })
    let cuerpo: CuerpoTutorial
    try {
      // El diccionario de los pasos viaja EN PARALELO con el chunk del cuerpo:
      // la tarjeta no se pinta hasta tener los dos, así que nunca se ve un tour
      // a medio traducir. Con tope: una petición que se queda COLGADA (server
      // zombi, red móvil caída) no rechaza nunca, y sin él la pantalla quedaba
      // con el velo puesto y sin tarjeta para siempre.
      ;[cuerpo] = (await Promise.race([
        Promise.all([def.cargar(), asegurarDictTut(idiomaActual())]),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error('tiempo de espera agotado')), 20000),
        ),
      ])) as [CuerpoTutorial, void]
    } catch (e) {
      console.warn('[tutorial] No se pudo cargar el tour:', e)
      // Sin aviso parecería que el botón no hizo nada (pasa con el dev server a
      // medio recargar o sin red en el primer uso de un tour).
      useMascota
        .getState()
        .decir(
          tGlobal('tut.errorCarga', 'No pude cargar ese tutorial. Revisa tu conexión e inténtalo de nuevo.'),
        )
      await get().salir()
      return
    }
    // Otro tour arrancó mientras bajaba el chunk: este ya no manda.
    if (get().def !== def) return
    set({ cuerpo })
    if (!opts?.sinPreparar) {
      try {
        await cuerpo.preparar?.()
      } catch (e) {
        console.warn('[tutorial] Falló preparar():', e)
      }
    }
    // Tour de una app cuya plantilla no está en ningún cuarto: `preparar` no pudo
    // abrirla, así que el mago lo explica junto a la casa y el asistente avisa cómo usarla.
    // Sin `preparar` no aplica: la app ya está en pantalla (su header o la previa).
    // Los flujos usan ids 'app-<plantillaId>--<flujo>': el sufijo se descarta.
    const plantillaId =
      !opts?.sinPreparar && cuerpo.preparar && def.id.startsWith('app-')
        ? def.id.slice(4).split('--')[0]
        : null
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
    await correrPaso(cuerpo.pasos[0])
    set({ ocupado: false })
  },
  async siguiente() {
    const { cuerpo, paso, ocupado } = get()
    if (!cuerpo || ocupado) return
    if (paso >= cuerpo.pasos.length - 1) return get().salir(true) // Terminar
    set({ ocupado: true })
    await correrPaso(cuerpo.pasos[paso + 1])
    set({ paso: paso + 1, ocupado: false })
  },
  async atras() {
    const { cuerpo, paso, ocupado } = get()
    if (!cuerpo || ocupado || paso === 0) return
    set({ ocupado: true })
    await correrPaso(cuerpo.pasos[paso - 1])
    set({ paso: paso - 1, ocupado: false })
  },
  async salir(completado = false) {
    const ctx = ctxActual
    const alTerminar = alTerminarActual
    ctxActual = null
    alTerminarActual = undefined
    set({ def: null, cuerpo: null, paso: 0, ocupado: false })
    // La cámara se queda donde la dejó el último paso (el visitante sigue
    // explorando esa zona); solo se apagan los resaltes.
    useZonaTut.getState().setZona(null)
    useZonaTut.getState().setFoco(null)
    alTerminar?.(completado)
    // La UI ya se cerró; borrar los datos de ejemplo puede tardar sin estorbar.
    await ctx?.limpiar()
    // Después de la limpieza: borrar el ejemplo también escribe.
    setTutorialActivo(false)
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { useTutorial: typeof useTutorial }).useTutorial = useTutorial
}
