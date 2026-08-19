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

/**
 * ¿Puede esta plataforma mostrar compra/enlaces de pago? Solo web y escritorio:
 * en las apps de tienda (Android/iOS) la suscripción ni se menciona — modelo
 * «solo consumo», sin comisión ni riesgo de rechazo por pagos externos.
 *
 * La APP no pasa por aquí en ningún caso: se compra en la tienda (Android/iOS)
 * y en el navegador no se vende, se entra con la cuenta que ya la compró.
 */
export function puedeMostrarPagos(): boolean {
  return !esAppNativa()
}
