/**
 * "Intención" pendiente al abrir una app desde el chat («abre el recetario»,
 * «quiero jugar la viborita»): guarda a qué sección/dato debe llegar la app.
 * Las apps la LEEN al montarse (lectura pura, segura con StrictMode: nadie la
 * consume) y caduca sola a los pocos segundos para no re-aplicarse cuando el
 * usuario vuelve a abrir el cuarto a mano.
 */

export interface IntencionApp {
  appId: string
  /** Pestaña/sección interna que la app debe mostrar al abrirse. */
  seccion?: string
  /** Dato extra de la sección (p. ej. el id del juego de mesa). */
  dato?: string
}

const VIGENCIA_MS = 15_000

let pendiente: (IntencionApp & { creada: number }) | null = null

export function lanzarIntencionApp(i: IntencionApp) {
  pendiente = { ...i, creada: Date.now() }
}

/** Intención vigente para una app concreta (o null si no hay/caducó). */
export function intencionApp(appId: string): IntencionApp | null {
  const p = intencionAppActiva()
  return p && p.appId === appId ? p : null
}

/** Intención vigente sea cual sea la app (para preseleccionar en el lanzador del cuarto). */
export function intencionAppActiva(): (IntencionApp & { creada: number }) | null {
  if (pendiente && Date.now() - pendiente.creada > VIGENCIA_MS) pendiente = null
  return pendiente
}

/** Pestaña inicial de una app: la de la intención vigente si existe en `tabs`, o la default. */
export function tabInicial<T extends string>(appId: string, tabs: readonly T[], porDefecto: T): T {
  const s = intencionApp(appId)?.seccion
  return s && (tabs as readonly string[]).includes(s) ? (s as T) : porDefecto
}
