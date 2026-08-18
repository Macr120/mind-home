/**
 * Modo demo: la casa de Pep@ — un año de vida ficticia en una BD paralela
 * (`mind-home-demo`), que sirve de demo gratuita y de escenario de los
 * tutoriales por flujos. Dentro se puede hacer TODO y nada se guarda: al
 * recargar, `demo/sandbox.ts` repone la casa original.
 *
 * Entrar y salir SIEMPRE recargan la página: `esDemo()` está congelado a la
 * carga y la BD ya abrió con un nombre (ver core/edicion.ts y data/db.ts).
 *
 * Claves propias (no pasan por `claveLS`: ya son exclusivas del demo):
 * - `mh.demo.version`: versión del contenido construido; si no coincide con
 *   `DEMO_VERSION` del bundle, el DemoGate reconstruye.
 * - `mh.demo.intent`: tour pendiente al entrar desde la casa real (un solo uso).
 */
import { claveLS, LS_DEMO, esDemo } from '../core/edicion'

/** Versión del CONTENIDO demo del bundle; subirla fuerza la reconstrucción. */
// v26: la casa viaja como snapshot commiteado (`public/demo/casa.json`) y los
// catálogos de fábrica se siembran solo con el año de su app. OJO: al cambiar
// el mapa demo (casaPep.ts / mapa/*.ts) hay que RE-EXPORTAR el JSON con
// window.mhExportarCasaDemo() — mientras exista, el snapshot manda y taparía
// los cambios de código.
// v30: el XP por lista cumplida bajó de 50 a 20. En una BD normal lo corrige la
// migración v127, pero la demo se repone desde su foto (`demo/sandbox.ts`) y
// volvería a la tarifa vieja: hay que rehacerla para que `sembrarListasDemo`
// siembre con la vigente.
export const DEMO_VERSION = 30
const LS_VERSION = 'mh.demo.version'
const LS_INTENT = 'mh.demo.intent'

/**
 * Apps cuyo año ya está en la BD. Al entrar desde un tutorial solo se construye
 * la del tour; las demás se construyen al abrirlas (ver demo/construir.ts). Lleva
 * prefijo `demo:` a propósito: la limpieza del primer paso de `construir.ts` la
 * borra al reconstruir, y así nunca sobrevive a una casa que ya no existe.
 */
const LS_APPS = 'mh.demo.apps'

export function appsConstruidas(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(claveLS(LS_APPS)) ?? 'null') as unknown
    return new Set(Array.isArray(raw) ? (raw as string[]) : [])
  } catch {
    return new Set()
  }
}

export function marcarAppConstruida(app: string): void {
  const apps = appsConstruidas()
  apps.add(app)
  localStorage.setItem(claveLS(LS_APPS), JSON.stringify([...apps]))
}

/**
 * Marca del sandbox: hay cambios en la BD demo que no son de Pep@. La lee
 * `db.ts` en el ARRANQUE (síncrona, antes de abrir) para reponer la casa
 * original. Lleva prefijo `demo:` a propósito: así la limpieza de `demo:*` del
 * primer paso de `construir.ts` la borra al reconstruir.
 */
const LS_SANDBOX_SUCIO = 'mh.sandbox.sucio'

export function haySandboxDemoSucio(): boolean {
  return localStorage.getItem(claveLS(LS_SANDBOX_SUCIO)) === '1'
}

export function marcarSandboxDemoSucio(): void {
  localStorage.setItem(claveLS(LS_SANDBOX_SUCIO), '1')
}

export function limpiarSandboxDemoSucio(): void {
  localStorage.removeItem(claveLS(LS_SANDBOX_SUCIO))
}

/** Tour pendiente al saltar de la casa real al demo. */
export interface IntentDemo {
  app: string
  tour?: string
}

export function entrarDemo(intent?: IntentDemo): void {
  if (intent) localStorage.setItem(LS_INTENT, JSON.stringify(intent))
  localStorage.setItem(LS_DEMO, '1')
  location.reload()
}

/** La BD demo se conserva (caché de reentrada); solo se apaga el modo. */
export function salirDemo(): void {
  localStorage.setItem(LS_DEMO, '0')
  location.reload()
}

/** ¿El contenido construido corresponde al de este bundle? */
export function demoConstruido(): boolean {
  return localStorage.getItem(LS_VERSION) === String(DEMO_VERSION)
}

export function marcarDemoConstruido(): void {
  localStorage.setItem(LS_VERSION, String(DEMO_VERSION))
}

/** Borra la BD demo (jamás la real: exige `esDemo()`), sin recargar. */
export async function borrarDemoDb(): Promise<void> {
  if (!esDemo()) return
  const { db } = await import('../core/data/db')
  db.close()
  await db.delete()
}

/**
 * ¿La BD demo ya tiene contenido? (construcción interrumpida o versión vieja).
 * El DemoGate la borra y recarga ANTES de construir: los builders exigen BD
 * virgen con los stores de la casa recién hidratados de ella.
 */
export async function demoSucia(): Promise<boolean> {
  const { db } = await import('../core/data/db')
  for (const t of ['cuartos', 'layout', 'objetosCuarto', 'recetas', 'rutinasFuerza']) {
    if ((await db.table(t).count()) > 0) return true
  }
  return false
}

/**
 * Borra la BD demo y recarga para reconstruir desde cero. Jamás toca la BD
 * real: exige `esDemo()`.
 */
export async function reiniciarDemo(): Promise<void> {
  if (!esDemo()) return
  localStorage.removeItem(LS_VERSION)
  // La BD se va entera: la foto original se va con ella.
  limpiarSandboxDemoSucio()
  // Un intent sin consumir lanzaría su tour sobre la casa recién construida.
  localStorage.removeItem(LS_INTENT)
  await borrarDemoDb()
  location.reload()
}

/**
 * Lee el intent SIN consumirlo: la construcción necesita saber a qué app viene
 * el visitante, y el tour se lanza mucho después (tras la recarga).
 */
export function leerIntent(): IntentDemo | null {
  const crudo = localStorage.getItem(LS_INTENT)
  if (!crudo) return null
  try {
    return JSON.parse(crudo) as IntentDemo
  } catch {
    return null
  }
}

/** Lee y CONSUME el intent de tour (una sola ejecución). */
export function tomarIntent(): IntentDemo | null {
  const intent = leerIntent()
  localStorage.removeItem(LS_INTENT)
  return intent
}
