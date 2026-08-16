/**
 * Pulso háptico corto (levantar una fila al arrastrar, palomear una meta).
 * `navigator.vibrate` funciona en Android/Chrome y es un no-op silencioso en
 * iOS y escritorio. Al retomar Capacitor se sustituye por @capacitor/haptics
 * SOLO en este archivo.
 */
export function vibrar(ms = 10): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate(ms)
  } catch {
    // Algunos WebView lanzan si la página no ha tenido interacción: da igual.
  }
}
