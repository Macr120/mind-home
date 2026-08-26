import { registerPlugin } from '@capacitor/core'
import type { AccionWidget } from './tipos'

/**
 * Plugin Capacitor local «Widgets», con una implementación nativa por
 * plataforma y el MISMO contrato en las dos:
 *   - Android: `android/…/widgets/WidgetsPlugin.java`
 *   - iOS:     `ios/App/App/WidgetsPlugin.swift`
 * Puente único con los widgets: publicar el snapshot y drenar la cola de
 * acciones que dejaron los taps en la pantalla de inicio.
 */
export interface WidgetsNativo {
  /** Guarda el snapshot en SharedPreferences y repinta los widgets colocados. */
  publicarSnapshot(opciones: { json: string }): Promise<void>
  /** Guarda la foto de la casa (JPEG en base64, sin cabecera `data:`). */
  publicarFotoCasa(opciones: { base64: string }): Promise<void>
  /** Devuelve la cola de acciones y la VACÍA (atómico del lado Java). */
  tomarAccionesPendientes(): Promise<{ acciones: AccionWidget[] }>
  /** ¿Hay widgets colocados en el launcher? `casa` evita capturar la casa en balde. */
  hayWidgets(): Promise<{ hay: boolean; casa: boolean }>
  /**
   * Destino del último toque en un widget ({} si no hay); leerlo lo consume.
   * `appId` abre la app de esa plantilla; `accion` es global (chat, foto, voz).
   */
  tomarDestinoPendiente(): Promise<{ appId?: string; seccion?: string; accion?: string }>
}

// En web nadie llega a llamarlo (useWidgets corta con esAppNativa()), pero el
// no-op evita que un registro sin implementación reviente ahí.
export const Widgets = registerPlugin<WidgetsNativo>('Widgets', {
  web: {
    async publicarSnapshot() {},
    async publicarFotoCasa() {},
    async tomarAccionesPendientes() {
      return { acciones: [] }
    },
    async hayWidgets() {
      return { hay: false, casa: false }
    },
    async tomarDestinoPendiente() {
      return {}
    },
  },
})
