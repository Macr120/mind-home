/**
 * Edición de la app: GRATIS (local, sin IA) vs PRO (servidores + IA).
 *
 * La IA —chat del arquitecto, charlas de la biblioteca, imágenes de ejercicio,
 * generación de modelos 3D, efemérides del diario— es exclusiva de PRO: en
 * GRATIS su interfaz se oculta y cada cuarto cae a su capa determinista.
 *
 * La compuerta real: `esPro()` lee el espejo síncrono del plan (`mh.planReal` /
 * `mh.planExpira`), que escribe SOLO `cuenta/sesionStore` al refrescar el perfil
 * desde el backend (Supabase). Este archivo no importa nada del backend a
 * propósito: cualquier módulo puede preguntar `esPro()`/`iaHabilitada()` sin
 * acoplarse ni cargar supabase.
 *
 * En `npm run dev` la IA viene ENCENDIDA (BYOK con claves propias del navegador)
 * para poder probarla; en el build de producción manda el plan real.
 *
 * Overrides de desarrollo (localStorage `mh.devIA`):
 * - `window.mhIA(false)` fuerza APAGAR la IA (previsualizar la versión gratis).
 * - `window.mhIA(true)` fuerza ENCENDERLA sin Pro (necesario solo en producción).
 */

const LS_DEV_IA = 'mh.devIA'
/** Plan elegido en la bienvenida (intención; el plan real vive en la cuenta). */
const LS_PLAN = 'mh.plan'
/** Espejo síncrono del plan REAL de la cuenta; lo escribe solo sesionStore. */
export const LS_PLAN_REAL = 'mh.planReal'
export const LS_PLAN_EXPIRA = 'mh.planExpira'

export type Plan = 'local' | 'pro'

/** Guarda el plan elegido en la bienvenida (solo intención; ya no toca la IA). */
export function elegirPlan(plan: Plan): void {
  localStorage.setItem(LS_PLAN, plan)
}

/** ¿La cuenta tiene suscripción Pro vigente? (espejo local del backend) */
export function esPro(): boolean {
  if (localStorage.getItem(LS_PLAN_REAL) !== 'pro') return false
  const expira = localStorage.getItem(LS_PLAN_EXPIRA)
  return !expira || Date.parse(expira) > Date.now()
}

/**
 * Override de pruebas internas: la IA encendida (BYOK) sin Pro. En `npm run dev`
 * viene así por defecto, para poder probar con claves propias sin comprar el plan.
 */
export function devIA(): boolean {
  return localStorage.getItem(LS_DEV_IA) === '1' || import.meta.env.DEV
}

/** Override de pruebas internas: fuerza APAGAR la IA aunque haya Pro. */
function devIAApagada(): boolean {
  return localStorage.getItem(LS_DEV_IA) === '0'
}

/** ¿Se puede ver y usar la IA? Pro real, o modo desarrollo encendido. */
export function iaHabilitada(): boolean {
  if (devIAApagada()) return false
  return esPro() || devIA()
}

// Interruptor de pruebas internas desde la consola del navegador:
// window.mhIA(false) apaga la IA (ver la versión gratis), window.mhIA(true) la enciende (BYOK).
if (typeof window !== 'undefined') {
  ;(window as unknown as { mhIA?: (on?: boolean) => boolean }).mhIA = (on = true) => {
    localStorage.setItem(LS_DEV_IA, on ? '1' : '0')
    return iaHabilitada()
  }
}
