import { nombrePlataforma } from '../plataforma'
import type { ModoVarsUI } from './temasUI'

/**
 * Barra de estado de iOS al son del tema. Allí el WebView se dibuja DEBAJO de
 * la barra (por eso el `viewport-fit=cover` del index.html y los
 * `env(safe-area-inset-*)`), así que la hora, la señal y la batería quedan
 * encima del fondo de la app. Sin decirle nada, iOS las pinta oscuras y
 * desaparecen sobre el `#0f1115` del tema oscuro.
 *
 * Es la versión nativa de la línea del `theme-color` de `aplicarTemaUI`, y va
 * enganchada ahí mismo para que no haya dos sitios que decidan el color.
 *
 * Android NO entra: allí la barra la pinta el tema de la Activity y el WebView
 * no se mete debajo, así que tocarla desde aquí solo podría estropearlo.
 */
let ultima: ModoVarsUI | undefined

export function pintarBarraEstadoNativa(base: ModoVarsUI): void {
  // El tema se re-aplica en cada cambio de ajuste y con la luz de la casa en
  // modo transparente: sin este corte serían decenas de llamadas al puente.
  if (nombrePlataforma() !== 'ios' || base === ultima) return
  ultima = base
  // Import perezoso: el plugin no tiene por qué entrar en el arranque de la web.
  void import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) =>
      // Ojo con los nombres: `Style.Dark` es «barra oscura» → texto CLARO, y
      // `Style.Light` al revés. Van cruzados respecto a la base del tema.
      StatusBar.setStyle({ style: base === 'claro' ? Style.Light : Style.Dark }),
    )
    .catch((err) => console.warn('[MPH] No se pudo pintar la barra de estado:', err))
}
