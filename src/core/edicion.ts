/**
 * Modelo de negocio (ago 2026): la APP se compra en las tiendas, la IA se paga
 * en la web. Dos cajas distintas, cada una donde le toca.
 *
 * El flujo canónico es: comprar la app (Google Play / App Store) → registrar el
 * correo → bienvenida. La compra la cobra y la garantiza la tienda: instalada
 * = pagada, así que la app nativa nunca pide precio, solo cuenta.
 *
 * - **Demo** (gratis, sin cuenta): la casa de Pep@, no persistente. Es la única
 *   vía gratuita; la puerta (`PuertaUnlock`) ofrece entrar aquí.
 * - **Cuenta** (obligatoria): sin correo registrado no se abre la casa propia.
 *   Es lo que ata la compra de la tienda a la persona y lo que deja seguir en
 *   otro dispositivo (incluido el navegador).
 * - **Unlock** (`tieneUnlock()`): la cuenta tiene la app. Lo concede el alta de
 *   tienda al registrarse desde la app nativa (`alta-tienda`) o un cupón, e
 *   incluye el primer mes (plan `trial`: 30 días con el pool de 700 créditos +
 *   sync, sin tarjeta). En el NAVEGADOR el unlock es lo que abre la casa: se
 *   entra con la cuenta que compró en la tienda. Las instalaciones previas a
 *   esta versión quedan dentro por derechos adquiridos (`mh.unlockLocal`, ver
 *   `sellarDerechos`), y un build sin backend (.env ausente) no tiene puerta:
 *   100% local, como siempre.
 * - **Trial** (`esTrial()`): el mes incluido de la compra. Al vencer, conserva
 *   la app y sus datos; pierde pool y sync hasta suscribirse.
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
 * pago único. Se escribe UNA vez (ver `sellarDerechos`) y no se revierte.
 */
export const LS_UNLOCK_LOCAL = 'mh.unlockLocal'
/** Esta instalación ya arrancó con la cuenta obligatoria (ver `sellarDerechos`). */
const LS_ERA_CUENTA = 'mh.eraCuenta'
/** El usuario dejó el registro para después (ver `pospusoCuenta`). */
const LS_SIN_CUENTA = 'mh.sinCuenta'

export type Plan = 'local' | 'pro' | 'trial'

// La landing enlaza a `?demo=1` para abrir la casa de Pep@ sin cuenta. Se
// atiende AQUÍ, encima del flag congelado, porque cualquier otro sitio llegaría
// tarde: `demoActivo` se resuelve al importar este módulo. El parámetro se borra
// de la URL en cuanto se aplica; si se quedara, el `location.reload()` de
// `salirDemo()` devolvería al usuario a la demo una y otra vez.
if (typeof localStorage !== 'undefined' && typeof location !== 'undefined') {
  const url = new URL(location.href)
  if (url.searchParams.get('demo') === '1') {
    localStorage.setItem(LS_DEMO, '1')
    url.searchParams.delete('demo')
    history.replaceState(null, '', url)
  }
}

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
 * Sella los derechos adquiridos en el PRIMER arranque de esta versión: si la
 * bienvenida ya se vio (`mh.bienvenida`, la escribe la casa real cuando se
 * completó o cuando ya estaba armada — literal repetido a propósito: importar
 * `bienvenidaStore` desde aquí crearía un ciclo), esta instalación es anterior
 * a la cuenta obligatoria y entra sin registrarse ni comprar.
 *
 * Tiene que ser un sello de UNA vez y no una comprobación perezosa: la
 * bienvenida ahora corre DESPUÉS del registro, así que un usuario nuevo se
 * concedería derechos adquiridos a sí mismo al terminarla. `mh.eraCuenta`
 * cierra esa puerta. Idempotente; lo llama `main.tsx` antes de pintar nada.
 */
export function sellarDerechos(): void {
  if (localStorage.getItem(LS_ERA_CUENTA) === '1') return
  if (localStorage.getItem('mh.bienvenida') === '1') localStorage.setItem(LS_UNLOCK_LOCAL, '1')
  localStorage.setItem(LS_ERA_CUENTA, '1')
}

/** ¿Instalación anterior a la cuenta obligatoria? Entra sin cuenta ni compra. */
export function derechosAdquiridos(): boolean {
  return localStorage.getItem(LS_UNLOCK_LOCAL) === '1'
}

/**
 * ¿Dejó el registro para después? Es el «ahora no» de la puerta, y SOLO existe
 * en la app de tienda: allí la compra ya está hecha, así que exigir cuenta al
 * arrancar dejaría fuera a quien abre la app sin cobertura. La casa funciona
 * entera en modo local; lo que espera a la cuenta es lo que vive en el
 * servidor — los créditos del primer mes y la sincronización —, y por eso el
 * modal de créditos ofrece registrarse en el momento en que hacen falta.
 */
export function pospusoCuenta(): boolean {
  return localStorage.getItem(LS_SIN_CUENTA) === '1'
}

export function posponerCuenta(): void {
  localStorage.setItem(LS_SIN_CUENTA, '1')
}

/**
 * ¿La cuenta tiene la app? (alta de tienda, cupón, derechos adquiridos, o build
 * sin backend). Lo consulta `PuertaUnlock` para el NAVEGADOR; en la app nativa
 * la compra la garantiza la tienda y ni se pregunta. La demo no pasa por aquí.
 */
export function tieneUnlock(): boolean {
  // Sin backend no hay compras posibles: la app queda 100% local e idéntica.
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return true
  if (localStorage.getItem(LS_UNLOCK) === '1') return true
  return derechosAdquiridos()
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
