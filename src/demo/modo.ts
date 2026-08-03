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
export const DEMO_VERSION = 17
const LS_VERSION = 'mh.demo.version'
const LS_INTENT = 'mh.demo.intent'

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

/** Lee y CONSUME el intent de tour (una sola ejecución). */
export function tomarIntent(): IntentDemo | null {
  const crudo = localStorage.getItem(LS_INTENT)
  if (!crudo) return null
  localStorage.removeItem(LS_INTENT)
  try {
    return JSON.parse(crudo) as IntentDemo
  } catch {
    return null
  }
}
