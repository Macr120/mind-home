/**
 * Calidad de las imágenes generadas con IA.
 *
 * Vive APARTE de `costos.ts` y del store de ajustes para que los dos la lean
 * sin cadena de imports: el store es el espejo reactivo (para que los precios de
 * la UI se refresquen solos) y localStorage la fuente. Mismo patrón que
 * `getProveedor()` en `chat/ia.ts`.
 *
 * - `rapida` (por defecto): gpt-image-1-mini, ~$0.005 → 3 créditos.
 * - `buena`: Gemini 3.1 Flash Lite Image, ~$0.0336 → 10 créditos.
 */
export type CalidadImagen = 'rapida' | 'buena'

const LS_CALIDAD_IMAGEN = 'mh.calidadImagen'
export const CALIDAD_IMAGEN_DEFAULT: CalidadImagen = 'rapida'

export function leerCalidadImagen(): CalidadImagen {
  return localStorage.getItem(LS_CALIDAD_IMAGEN) === 'buena' ? 'buena' : CALIDAD_IMAGEN_DEFAULT
}

export function guardarCalidadImagen(calidad: CalidadImagen): void {
  localStorage.setItem(LS_CALIDAD_IMAGEN, calidad)
}
