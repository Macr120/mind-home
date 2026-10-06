/**
 * Modelo de negocio (5-oct-2026): la casa es GRATIS con cuenta; se vende solo
 * la suscripción, en tres niveles (7/14/20 USD al mes: 700/1400/2100 créditos
 * de IA, sync y 10/30/100 GB de nube). Lo que cambia por plataforma es la caja
 * (`canalPago()` en `plataforma.ts`): compra in-app en Android e iOS
 * —obligatorio por sus normativas— y cobro directo, sin comisión, en el
 * navegador y en el escritorio.
 *
 * Se paga por cuenta, no por dispositivo: el plan vive en `perfiles` (lo
 * escribe el webhook de RevenueCat, que recibe igual a las tres cajas).
 *
 * El flujo canónico es: instalar → registrar el correo → bienvenida.
 *
 * - **Probar** (sin cuenta): casa propia en una BD paralela; la puerta
 *   (`PuertaCuenta`) ofrece entrar aquí.
 * - **Cuenta** (gratis): la casa entera y lo social (buzón, partidas,
 *   espacios) con topes diarios. Lo que cuesta dinero (IA, sync, nube) se ve
 *   igual y al usarlo sale el aviso «Suscríbete» (`useCuotaAgotada`).
 * - **Pro** (`esPro()`): un nivel de la suscripción.
 * - **Trial** (`esTrial()`): Pro temporal de los cupones de testers (y de quien
 *   compró la casa cuando se vendía).
 * - **Ex-suscriptor** (`fuePro()` sin Pro): cuenta gratis con historial; el
 *   servidor responde sin cuota y sale el aviso de renovar.
 *
 * La IA de FONDO (latidos, efemérides, reparto) exige plan a propósito
 * (`iaOperativa()` en `chat/ia.ts`): no debe gastar créditos ni abrir avisos
 * sin que el usuario haya pedido nada.
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
/** Modo probar: casa PROPIA vacía en una BD paralela, sin cuenta ni sync. */
export const LS_PROBAR = 'mh.probar'
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
 * Marcas de los «derechos adquiridos», el atajo que dejaba entrar sin comprar a
 * las instalaciones anteriores al pago único. Ya no se conceden: solo quedan
 * aquí para BORRARLAS (ver `limpiarDerechosViejos`), porque mientras existan en
 * un dispositivo su dueño sigue entrando gratis.
 */
const LS_UNLOCK_LOCAL = 'mh.unlockLocal'
const LS_ERA_CUENTA = 'mh.eraCuenta'

export type Plan = 'local' | 'pro' | 'trial'

// La landing enlaza a `?probar=1` para probar la app sin cuenta (y las páginas
// viejas cacheadas aún traen `?demo=1`: ambos caen en el modo probar — la casa
// de Pep@ quedó solo para los tutoriales de dentro). Se atiende AQUÍ, encima del
// flag congelado, porque cualquier otro sitio llegaría tarde: los flags se
// resuelven al importar este módulo. El parámetro se borra de la URL en cuanto
// se aplica; si se quedara, el `location.reload()` de `salirProbar()` devolvería
// al usuario al modo probar una y otra vez.
if (typeof localStorage !== 'undefined' && typeof location !== 'undefined') {
  const url = new URL(location.href)
  if (url.searchParams.get('probar') === '1' || url.searchParams.get('demo') === '1') {
    localStorage.setItem(LS_PROBAR, '1')
    // La demo manda sobre probar (ver abajo): un `mh.demo` viejo —de la web
    // anterior con `?demo=1`, o de una demo de la que nunca se salió— taparía
    // el modo probar recién pedido y el enlace seguiría abriendo la casa de Pep@.
    localStorage.setItem(LS_DEMO, '0')
    // La prueba SIEMPRE arranca de cero al entrar de nuevo: fuera el rastro de
    // la anterior. El deleteDatabase se ENCOLA antes de que db.ts abra la BD
    // (este módulo evalúa primero y las peticiones IDB se atienden en orden),
    // así el open espera a la borrada y la casa de prueba nace vacía.
    for (const clave of Object.keys(localStorage)) {
      if (clave.startsWith('probar:')) localStorage.removeItem(clave)
    }
    localStorage.removeItem('mh.probar.sucio')
    if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('mind-home-probar')
    url.searchParams.delete('probar')
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

// La demo manda sobre probar: los tutoriales pueden saltar a la casa de Pep@
// desde cualquier modo y `salirDemo()` devuelve al que estaba (mh.probar sigue a '1').
const probarActivo = !demoActivo && typeof localStorage !== 'undefined' && localStorage.getItem(LS_PROBAR) === '1'

/** ¿Modo probar? (casa propia sin cuenta, BD `mind-home-probar`, nada cuenta como guardado) */
export function esProbar(): boolean {
  return probarActivo
}

/** Visita: la casa de OTRO en una BD paralela (`mind-home-visita`), de solo lectura. */
export const SS_VISITA = 'mh.visita'

// Por PESTAÑA (sessionStorage), nunca localStorage: el flag es de esta ventana,
// así conviven la casa propia en una pestaña y la casa visitada en otra, y
// cerrarla lo limpia sola. El parámetro de URL manda —es lo que deja
// `entrarAVisita` al recargar— y se guarda para que un F5 siga en la visita.
const salaEnVisita = (() => {
  if (typeof sessionStorage === 'undefined' || typeof location === 'undefined') return null
  const enUrl = new URLSearchParams(location.search).get('visita')
  if (!enUrl) {
    try {
      return sessionStorage.getItem(SS_VISITA)
    } catch {
      return null
    }
  }
  try {
    sessionStorage.setItem(SS_VISITA, enUrl)
  } catch {
    // Almacenamiento bloqueado: la visita vale para esta carga y ya.
  }
  return enUrl
})()

const visitaActivo = salaEnVisita !== null

/** ¿Estamos dentro de la casa de otro? (BD `mind-home-visita`, nada se escribe) */
export function esVisita(): boolean {
  return visitaActivo
}

/** Id de la sala que se está visitando, o null. */
export function salaVisitada(): string | null {
  return salaEnVisita
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
  return visitaActivo ? 'visita:' + clave : demoActivo ? 'demo:' + clave : probarActivo ? 'probar:' + clave : clave
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
 * Borra los «derechos adquiridos» que sellaron las versiones anteriores. Existió
 * como cortesía para quien ya usaba la app cuando llegó el pago único, pero era
 * un unlock que vivía en el DISPOSITIVO: cualquier instalación con la bienvenida
 * vista —la del propio equipo de pruebas, la de un tester— entraba a la casa sin
 * pasar por la compra. Quien deba entrar sin pagar canjea un cupón, que concede
 * el unlock de verdad, en la cuenta y en todos sus dispositivos.
 *
 * Idempotente; lo llama `main.tsx` antes de pintar nada.
 */
export function limpiarDerechosViejos(): void {
  localStorage.removeItem(LS_UNLOCK_LOCAL)
  localStorage.removeItem(LS_ERA_CUENTA)
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

// Interruptores de pruebas internas desde la consola del navegador (SOLO dev):
// window.mhIA(false) apaga la IA (ver la versión sin IA), window.mhIA(true) la enciende (BYOK).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { mhIA?: (on?: boolean) => boolean }).mhIA = (on = true) => {
    localStorage.setItem(LS_DEV_IA, on ? '1' : '0')
    return iaHabilitada()
  }
  // window.mhDemo(true) entra a la casa demo, window.mhDemo(false) vuelve a la real.
  ;(window as unknown as { mhDemo?: (on?: boolean) => void }).mhDemo = (on = true) => {
    localStorage.setItem(LS_DEMO, on ? '1' : '0')
    location.reload()
  }
  // window.mhProbar(true) entra al modo probar, window.mhProbar(false) sale.
  ;(window as unknown as { mhProbar?: (on?: boolean) => void }).mhProbar = (on = true) => {
    localStorage.setItem(LS_PROBAR, on ? '1' : '0')
    location.reload()
  }
  // window.mhDemoAutor(true) abre la edición de la casa demo (solo dev).
  ;(window as unknown as { mhDemoAutor?: (on?: boolean) => void }).mhDemoAutor = (on = true) => {
    localStorage.setItem(LS_DEMO_AUTOR, on ? '1' : '0')
    location.reload()
  }
}
