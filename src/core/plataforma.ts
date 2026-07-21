import { Capacitor } from '@capacitor/core'

/** ¿Corriendo empaquetado como app nativa (Capacitor, Android/iOS)? Falso en cualquier navegador. */
export function esAppNativa(): boolean {
  return Capacitor.isNativePlatform()
}
