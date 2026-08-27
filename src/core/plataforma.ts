import { Capacitor } from '@capacitor/core'

/**
 * Override de PRUEBAS (solo `npm run dev`): finge la app de tienda dentro del
 * navegador para ver la puerta y los avisos como los verá Android.
 * `window.mhNativa(true)` y recargar. En producción el flag no hace nada a
 * propósito: fingirse nativo saltaría la compra en la web.
 */
const nativaForzada =
  import.meta.env.DEV &&
  typeof localStorage !== 'undefined' &&
  localStorage.getItem('mh.devNativa') === '1'

/** ¿Corriendo empaquetado como app nativa (Capacitor, Android/iOS)? Falso en cualquier navegador. */
export function esAppNativa(): boolean {
  return nativaForzada || Capacitor.isNativePlatform()
}

/** De qué tienda vino la instalación: 'android' | 'ios'; 'web' en el navegador. */
export function nombrePlataforma(): string {
  return nativaForzada ? 'android' : Capacitor.getPlatform()
}

// window.mhNativa(true) simula la app de tienda en dev; (false) vuelve a la web.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { mhNativa?: (on?: boolean) => void }).mhNativa = (on = true) => {
    localStorage.setItem('mh.devNativa', on ? '1' : '0')
    location.reload()
  }
}

/**
 * Marca que el shell de escritorio pone en su user agent (`app.userAgentFallback`
 * en Electron). Es lo que se busca, y NO la palabra «Electron» a secas: la
 * llevan también los editores que embeben un navegador —Cursor, VS Code, el
 * propio Claude Code—, y con ellos la app se creía instalada en el escritorio y
 * ofrecía pagar en la web en vez de por su caja.
 */
const MARCA_ESCRITORIO = 'MindPlannerHome'

/** ¿Corriendo dentro del shell de escritorio (Electron, Windows/macOS)? */
export function esEscritorio(): boolean {
  // Nunca dentro de la app de tienda: ahí manda la compra in-app, pase lo que
  // pase con el user agent (defensa en profundidad de la regla de más abajo).
  if (esAppNativa()) return false
  return typeof navigator !== 'undefined' && navigator.userAgent.includes(MARCA_ESCRITORIO)
}

/**
 * ¿Corriendo como fondo de pantalla (la ventana wallpaper del shell)? El shell
 * la lanza con `?fondo=1`: la app pinta SOLO la escena 3D (App.tsx) y monta el
 * puntero espacial. La ventana vive detrás de los iconos del escritorio y el
 * SO no le manda input; el shell le reenvía el mouse global (`sendInputEvent`).
 * Acotado a `esEscritorio()`: un `?fondo=1` en el navegador no debe dejar la
 * app sin UI.
 */
export function esModoFondo(): boolean {
  if (!esEscritorio()) return false
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('fondo')
}

/** Por qué caja cobra esta plataforma (ver `cuenta/paywall.ts`). */
export type CanalPago = 'web' | 'escritorio' | 'iap'

/**
 * Dónde se paga aquí. Se compra TODO —la casa, los créditos y la suscripción—
 * en las tres plataformas; lo que cambia es la caja:
 *
 * - `web`: checkout de RevenueCat dentro de la propia página. Directo, sin
 *   comisión de tienda.
 * - `escritorio`: mismo cobro directo, pero el checkout se abre en el navegador
 *   del sistema (Electron no es sitio para un formulario de pago).
 * - `iap`: compra in-app de Google Play o el App Store. Es obligatoria en las
 *   apps nativas (Apple 3.1.1 y Google Play Payments), y por eso es la única
 *   caja con comisión. En iOS, además, la app NO puede enlazar ni mencionar la
 *   compra de la web: quien vea `iap` no debe pintar enlaces de pago externos.
 *
 * El orden importa y es el que cumple las normas: **si es app nativa, `iap` y se
 * acabó**. Ninguna otra señal —user agent, dominio, flags— puede sacar a una app
 * de tienda de su caja, porque ahí es donde se incumpliría.
 */
export function canalPago(): CanalPago {
  if (esAppNativa()) return 'iap'
  return esEscritorio() ? 'escritorio' : 'web'
}

/**
 * El puente que expone el shell de escritorio (`electron/precarga.cjs`). Se tipa
 * aquí y se envuelve en funciones para que la UI no tenga que saber que Electron
 * existe: en el navegador y en el teléfono, `window.mph` simplemente no está.
 */
interface PuenteEscritorio {
  escritorio: true
  version: string | null
  ponerDeFondo?: () => Promise<boolean>
  vistaFondo?: () => Promise<string | null>
  moverFondo?: (d: { fx?: number; fy?: number; zoom?: number }) => Promise<boolean>
}

declare global {
  interface Window {
    mph?: PuenteEscritorio
  }
}

/** ¿Este shell sabe poner la casa de fondo de pantalla? */
export function hayFondoEscritorio(): boolean {
  return esEscritorio() && typeof window !== 'undefined' && typeof window.mph?.ponerDeFondo === 'function'
}

/** Enciende o apaga el fondo de pantalla; devuelve si queda encendido. */
export async function alternarFondoEscritorio(): Promise<boolean> {
  try {
    return (await window.mph?.ponerDeFondo?.()) ?? false
  } catch {
    return false
  }
}

/**
 * Foto de cómo se ve el fondo AHORA, para la vista previa. Es una captura de la
 * ventana real, no una simulación: lo que se ve aquí es lo que hay detrás.
 * Devuelve null si el fondo no está puesto.
 */
export async function vistaFondoEscritorio(): Promise<string | null> {
  try {
    return (await window.mph?.vistaFondo?.()) ?? null
  } catch {
    return null
  }
}

/** Mueve el encuadre del fondo: arrastre en fracción de pantalla (−1..1), o zoom. */
export async function moverFondoEscritorio(d: { fx?: number; fy?: number; zoom?: number }): Promise<void> {
  try {
    await window.mph?.moverFondo?.(d)
  } catch {
    /* el fondo no está puesto: no hay nada que mover */
  }
}
