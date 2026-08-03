import { Capacitor } from '@capacitor/core'

/** ¿Corriendo empaquetado como app nativa (Capacitor, Android/iOS)? Falso en cualquier navegador. */
export function esAppNativa(): boolean {
  return Capacitor.isNativePlatform()
}

/** ¿Corriendo dentro del shell de escritorio (Electron, Windows/macOS)? */
export function esEscritorio(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')
}

/**
 * ¿Puede esta plataforma mostrar compra/enlaces de pago? Solo web y escritorio:
 * en las apps de tienda (Android/iOS) la suscripción ni se menciona — modelo
 * «solo consumo», sin comisión ni riesgo de rechazo por pagos externos.
 */
export function puedeMostrarPagos(): boolean {
  return !esAppNativa()
}
