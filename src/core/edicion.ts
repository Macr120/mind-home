/**
 * Modelo de negocio: la app se usa de DOS maneras.
 *
 * - **Local** (gratis, sin cuenta): la app entera funciona offline sobre Dexie.
 *   La IA se paga con recargas de créditos que no caducan; sin créditos, las
 *   superficies siguen visibles y al usarlas sale el modal de recarga. No hay
 *   sincronización entre dispositivos.
 * - **Pro** (`esPro()`, 4.99 USD/mes): créditos mensuales + sync. Se compra solo
 *   en la web (la app nativa nunca muestra pagos, ver `plataforma.ts`).
 * - **Ex-suscriptor** (`fuePro()` sin Pro): es un usuario local con historial.
 *   Sus créditos de recarga siguen sirviendo; el pool mensual queda en 0 y el
 *   servidor responde 429, que abre el aviso de renovación.
 *
 * La IA de FONDO (latidos, efemérides, reparto) exige Pro a propósito
 * (`iaOperativa()` en `chat/ia.ts`): unos créditos comprados no deben gastarse
 * solos sin que el usuario haya pedido nada.
 *
 * La compuerta real: `esPro()`/`fuePro()` leen el espejo síncrono del plan
 * (`mh.planReal` / `mh.planExpira` / `mh.fuePro`), que escribe SOLO
 * `cuenta/sesionStore` al refrescar el perfil desde el backend (Supabase).
 * Este archivo no importa nada del backend a propósito: cualquier módulo puede
 * preguntar `esPro()`/`iaHabilitada()` sin acoplarse ni cargar supabase.
 * El espejo es falsificable por consola: es modelo de negocio, no seguridad —
 * lo cobrable (IA, sync) se revalida en el servidor, que es la única defensa
 * real ahora que la puerta ya no filtra a nadie.
 *
 * En `npm run dev` la IA viene ENCENDIDA (BYOK con claves propias del navegador);
 * en el build de producción manda el plan real.
 *
 * Overrides de desarrollo:
 * - `window.mhIA(false)` fuerza APAGAR la IA / `window.mhIA(true)` la enciende
 *   sin Pro (BYOK) — localStorage `mh.devIA`.
 */

const LS_DEV_IA = 'mh.devIA'
/** Modo demo: la casa de Pep@ en una BD paralela que nada persiste. */
export const LS_DEMO = 'mh.demo'
/** Modo AUTOR del demo (solo dev): editar la casa de Pep@ sin candado. */
const LS_DEMO_AUTOR = 'mh.demoAutor'
/** Espejo síncrono del plan REAL de la cuenta; lo escribe solo sesionStore. */
export const LS_PLAN_REAL = 'mh.planReal'
export const LS_PLAN_EXPIRA = 'mh.planExpira'
/** Espejo de «pagó alguna vez» (nunca se revierte, salvo cerrar sesión). */
export const LS_FUE_PRO = 'mh.fuePro'

export type Plan = 'local' | 'pro'

// Congelado a la carga: cambiar de modo SIEMPRE pasa por location.reload(),
// porque la BD ya abrió con un nombre y los stores ya hidrataron de ella.
const demoActivo = typeof localStorage !== 'undefined' && localStorage.getItem(LS_DEMO) === '1'

/** ¿Estamos dentro de la casa demo? (BD `mind-home-demo`, se repone al recargar) */
export function esDemo(): boolean {
  return demoActivo
}

// Herramienta TEMPORAL de autoría (hasta congelar el modelo ideal de la casa):
// solo existe en `npm run dev`; en producción el flag no hace nada.
const autorActivo =
  import.meta.env.DEV &&
  demoActivo &&
  typeof localStorage !== 'undefined' &&
  localStorage.getItem(LS_DEMO_AUTOR) === '1'

/**
 * ¿Modo autor del demo? Quita el marcador y la reposición: lo que se edite
 * sobre la BD demo SE QUEDA, para ajustar la casa de Pep@ a mano y exportarla
 * (`casa.json`). Se activa por consola: `window.mhDemoAutor(true)`.
 */
export function esDemoAutor(): boolean {
  return autorActivo
}

/**
 * Namespacer de localStorage para estado ligado a la CASA (flags de seeds y
 * reparaciones one-shot, ejemplos, bienvenida, avisos…): en demo usa su propia
 * copia para no sellar ni ensuciar el de la casa real. Las preferencias de la
 * PERSONA (idioma, tema, HUD, dificultades…) NO pasan por aquí: se comparten.
 */
export function claveLS(clave: string): string {
  return demoActivo ? 'demo:' + clave : clave
}

/** ¿La cuenta tiene suscripción Pro vigente? (espejo local del backend) */
export function esPro(): boolean {
  if (localStorage.getItem(LS_PLAN_REAL) !== 'pro') return false
  const expira = localStorage.getItem(LS_PLAN_EXPIRA)
  return !expira || Date.parse(expira) > Date.now()
}

/** ¿La cuenta pagó la suscripción alguna vez? (decide el copy de los avisos) */
export function fuePro(): boolean {
  return localStorage.getItem(LS_FUE_PRO) === '1'
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

/**
 * ¿Se puede VER la IA? Siempre, salvo que se apague a mano en pruebas.
 *
 * En modo local las superficies se muestran aunque no haya créditos: es la única
 * forma de que alguien que nunca ha pagado descubra que existen y llegue al
 * modal de recarga. Quien decide si la llamada SALE es `iaActiva()`, y quien
 * cobra es el servidor.
 */
export function iaHabilitada(): boolean {
  return !devIAApagada()
}

// Interruptores de pruebas internas desde la consola del navegador:
// window.mhIA(false) apaga la IA (ver la versión sin IA), window.mhIA(true) la enciende (BYOK).
if (typeof window !== 'undefined') {
  ;(window as unknown as { mhIA?: (on?: boolean) => boolean }).mhIA = (on = true) => {
    localStorage.setItem(LS_DEV_IA, on ? '1' : '0')
    return iaHabilitada()
  }
  // window.mhDemo(true) entra a la casa demo, window.mhDemo(false) vuelve a la real.
  ;(window as unknown as { mhDemo?: (on?: boolean) => void }).mhDemo = (on = true) => {
    localStorage.setItem(LS_DEMO, on ? '1' : '0')
    location.reload()
  }
  // window.mhDemoAutor(true) abre la edición de la casa demo (solo dev).
  ;(window as unknown as { mhDemoAutor?: (on?: boolean) => void }).mhDemoAutor = (on = true) => {
    localStorage.setItem(LS_DEMO_AUTOR, on ? '1' : '0')
    location.reload()
  }
}
