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

/** ¿Corriendo dentro del shell de escritorio (Electron, Windows/macOS)? */
export function esEscritorio(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')
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
 */
export function canalPago(): CanalPago {
  if (esAppNativa()) return 'iap'
  return esEscritorio() ? 'escritorio' : 'web'
}
