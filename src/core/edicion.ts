/**
 * Modelo de negocio (ago 2026): app de PAGO ÚNICO con primer mes incluido.
 *
 * - **Demo** (gratis, sin cuenta): la casa de Pep@, no persistente. Es la única
 *   vía gratuita; la puerta (`PuertaUnlock`) ofrece entrar aquí.
 * - **Unlock** (`tieneUnlock()`, $6.99 pago único): persiste TU casa para
 *   siempre e incluye el primer mes (plan `trial`: 30 días con el pool de 700
 *   créditos + sync, sin tarjeta). Las instalaciones previas a esta versión
 *   quedan desbloqueadas por derechos adquiridos (`mh.unlockLocal`), y un build
 *   sin backend (.env ausente) no tiene puerta: 100% local, como siempre.
 * - **Trial** (`esTrial()`): el mes incluido del unlock. Al vencer, conserva la
 *   app y sus datos; pierde pool y sync hasta suscribirse.
 * - **Pro** (`esPro()`, 6 USD/mes en el nivel ×1): créditos mensuales + sync. Se compra solo
 *   en la web (la app nativa nunca muestra pagos, ver `plataforma.ts`).
 * - **Local / vencido**: la IA se paga con recargas de créditos que no caducan;
 *   sin créditos, las superficies siguen visibles y al usarlas sale el modal
 *   de recarga. No hay sincronización entre dispositivos.
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
/** Espejo de la compra única (`perfiles.unlock`); lo escribe solo sesionStore. */
export const LS_UNLOCK = 'mh.unlock'
/**
 * Derechos adquiridos: la instalación ya tenía casa cuando llegó la versión de
 * pago único. Se escribe UNA vez (ver `tieneUnlock`) y no se revierte.
 */
export const LS_UNLOCK_LOCAL = 'mh.unlockLocal'

export type Plan = 'local' | 'pro' | 'trial'

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

/** ¿Corre el mes incluido del unlock? (plan `trial` vigente, espejo del backend) */
export function esTrial(): boolean {
  if (localStorage.getItem(LS_PLAN_REAL) !== 'trial') return false
  const expira = localStorage.getItem(LS_PLAN_EXPIRA)
  return !expira || Date.parse(expira) > Date.now()
}

/** ¿Hay pool mensual y sync? (Pro o el mes incluido del unlock) */
export function tieneAcceso(): boolean {
  return esPro() || esTrial()
}

/**
 * ¿La app está desbloqueada? (compra única, derechos adquiridos, o build sin
 * backend). Lo consulta `PuertaUnlock`; la demo no pasa por aquí.
 *
 * El grandfather es perezoso e idempotente: `mh.bienvenida` la escribe la casa
 * real cuando la bienvenida se vio o la casa ya estaba armada
 * (`bienvenida/bienvenidaStore.ts` — literal repetido a propósito: importar el
 * store desde aquí crearía un ciclo). Si existe, esta instalación es anterior a
 * la puerta y no se le cobra lo que ya tenía.
 */
export function tieneUnlock(): boolean {
  // Sin backend no hay compras posibles: la app queda 100% local e idéntica.
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return true
  if (localStorage.getItem(LS_UNLOCK) === '1') return true
  if (localStorage.getItem(LS_UNLOCK_LOCAL) === '1') return true
  if (localStorage.getItem('mh.bienvenida') === '1') {
    localStorage.setItem(LS_UNLOCK_LOCAL, '1')
    return true
  }
  return false
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
