import { create } from 'zustand'
import { claveLS, esDemo, esProbar, LS_PLAN_REAL } from '../edicion'
import { borrarProbar, hayPruebaSucia } from '../../probar/modo'
import { haySesionProbable, useSesion } from '../cuenta/sesionStore'
import { useDiseño, esObjetoLibreria } from '../state/disenoStore'

/** '1' = la bienvenida ya se vio (o la casa ya estaba armada al llegar esta versión). */
export const LS_BIENVENIDA = 'mh.bienvenida'
/** Pasos de la guía inicial ya completados (JSON con los ids). */
const LS_PASOS = 'mh.bienvenida.pasos'

/** Los 3 pasos de la guía que cierra la bienvenida. */
export type PasoGuia = 'cuarto' | 'tour' | 'explorar'

function leerHechos(): PasoGuia[] {
  try {
    const raw = JSON.parse(localStorage.getItem(claveLS(LS_PASOS)) ?? '[]') as unknown
    return Array.isArray(raw) ? (raw as PasoGuia[]) : []
  } catch {
    return []
  }
}

interface BienvenidaState {
  abierto: boolean
  /** true = se muestra la guía de 3 pasos en vez del asistente de configuración. */
  guia: boolean
  /** Pasos de la guía ya completados. */
  hechos: PasoGuia[]
  /** true = ofrecer recuperar la casa del modo probar antes del wizard. */
  recuperacion: boolean
  abrir: () => void
  /** Vuelve a la guía de 3 pasos (al terminar o salir de un tour). */
  abrirGuia: () => void
  abrirRecuperacion: () => void
  cerrar: () => void
  completar: (paso: PasoGuia) => void
}

export const useBienvenida = create<BienvenidaState>((set, get) => ({
  abierto: false,
  guia: false,
  hechos: leerHechos(),
  recuperacion: false,
  abrir: () => set({ abierto: true, guia: false, recuperacion: false }),
  abrirGuia: () => set({ abierto: true, guia: true }),
  abrirRecuperacion: () => set({ recuperacion: true }),
  cerrar: () => set({ abierto: false }),
  completar: (paso) => {
    if (get().hechos.includes(paso)) return
    const hechos = [...get().hechos, paso]
    localStorage.setItem(claveLS(LS_PASOS), JSON.stringify(hechos))
    set({ hechos })
  },
}))

/** Apps ya asignadas a objetos de la casa (mismo criterio que el aviso del tutorial). */
export function appsAsignadas(): Set<string> {
  const ids = new Set<string>()
  for (const o of useDiseño.getState().objetos) {
    if (o.plantillaId && !esObjetoLibreria(o)) ids.add(o.plantillaId)
  }
  return ids
}

/**
 * Primera vez: abre la bienvenida si nunca se vio. Una casa que ya tiene apps
 * asignadas se considera "vista" (usuarios previos a esta versión) para no
 * interrumpirla ni duplicar cuartos. Idempotente (seguro con StrictMode).
 */
export function evaluarPrimeraVez(): void {
  // Casa demo: entra a una casa ya hecha, y además NUNCA debe escribir
  // `mh.bienvenida` — le robaría la primera vez a la casa real. (En el modo
  // probar SÍ corre: la bienvenida es justo su puerta de entrada, y sus marcas
  // van con prefijo `probar:` vía claveLS.)
  if (esDemo()) return
  if (localStorage.getItem(claveLS(LS_BIENVENIDA)) === '1') return
  // Con sesión iniciada la decisión es de la CUENTA: si trae casa se entra
  // directo (sin wizard); si la nube viene vacía es una cuenta nueva y el
  // wizard sale como siempre. Como el primer sync tarda unos segundos, la
  // decisión espera su resultado. En el modo probar no aplica: ahí no hay
  // cuenta y la bienvenida es su puerta.
  if (!esProbar() && haySesionProbable()) {
    esperarCasaDeCuenta()
    return
  }
  if (appsAsignadas().size > 0) {
    localStorage.setItem(claveLS(LS_BIENVENIDA), '1')
    // Cuenta veterana con casa: una prueba pendiente ya no se ofrece — fuera.
    if (!esProbar() && hayPruebaSucia()) void borrarProbar()
    return
  }
  abrirNormal()
}

/** El camino normal del wizard: recuperación de la prueba pendiente, o abrirlo. */
function abrirNormal(): void {
  // Casa real vacía con una prueba pendiente (visitante que creó cuenta y
  // pagó): antes del wizard se ofrece recuperar la casa de la prueba.
  if (!esProbar() && hayPruebaSucia()) {
    useBienvenida.getState().abrirRecuperacion()
    return
  }
  useBienvenida.getState().abrir()
}

/**
 * Con sesión al arrancar: espera el primer sync y decide. Llegan apps de la
 * cuenta → entrar directo (bienvenida marcada vista); el ciclo termina con la
 * nube vacía → cuenta nueva, wizard normal. Sin plan de sync (el espejo
 * `mh.planReal` no es pro/trial) no hay nada que esperar: wizard de una vez.
 */
function esperarCasaDeCuenta(): void {
  const plan = localStorage.getItem(LS_PLAN_REAL)
  if (plan !== 'pro' && plan !== 'trial') {
    abrirNormal()
    return
  }
  let decidido = false
  const decidir = (casaLlego: boolean) => {
    if (decidido || localStorage.getItem(claveLS(LS_BIENVENIDA)) === '1') return
    decidido = true
    limpiar()
    if (casaLlego || appsAsignadas().size > 0) {
      localStorage.setItem(claveLS(LS_BIENVENIDA), '1')
    } else {
      abrirNormal()
    }
  }
  // La casa de la cuenta llegó: directo, sin wizard.
  const offDiseno = useDiseño.subscribe((s, prev) => {
    if (s.objetos !== prev.objetos && appsAsignadas().size > 0) decidir(true)
  })
  // El primer ciclo terminó (o falló): margen breve para el repintado y decidir.
  const ultimaSyncBase = useSesion.getState().ultimaSync
  const offSesion = useSesion.subscribe((s) => {
    if (s.ultimaSync !== ultimaSyncBase || s.estadoSync === 'error') {
      setTimeout(() => decidir(false), 2000)
    }
  })
  // Red de seguridad (sin red, sync mudo): que el arranque no espere por siempre.
  const timer = setTimeout(() => decidir(false), 20_000)
  const limpiar = () => {
    offDiseno()
    offSesion()
    clearTimeout(timer)
  }
}

// Dispositivo nuevo que inicia sesión con el wizard ya abierto: el primer sync
// baja la casa de la cuenta segundos después del login; en cuanto llegan apps
// asignadas con sesión puesta, la bienvenida sobra y se cierra sola.
useDiseño.subscribe((s, prev) => {
  if (s.objetos === prev.objetos) return
  const st = useBienvenida.getState()
  if (!st.abierto && !st.recuperacion) return
  if (esDemo() || esProbar() || !haySesionProbable()) return
  if (appsAsignadas().size === 0) return
  localStorage.setItem(claveLS(LS_BIENVENIDA), '1')
  useBienvenida.setState({ abierto: false, guia: false, recuperacion: false })
})
