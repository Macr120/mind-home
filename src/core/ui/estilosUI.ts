/**
 * Estilos de la INTERFAZ: la FORMA del chrome (esquinas, bordes, sombras y
 * relieve del acento). Es un eje aparte del tema de color (`temasUI.ts`), del
 * modo de luz (claro/oscuro/transparente) y de la tipografía; todos combinan.
 *
 * Aquí solo vive el catálogo: lo visual está entero en `index.css`, colgado
 * del atributo `data-estilo-ui`. Cada estilo declara ÚNICAMENTE variables CSS
 * (radios de Tailwind, sombras, grosor de borde, material del acento) y unas
 * reglas genéricas las leen con un respaldo, el aspecto de antes (el «suave»
 * que se retiró el 7 sep 2026 por quedar demasiado cerca de «redondo»): por
 * eso una tarjeta del selector con su propio `data-estilo-ui` se previsualiza
 * a sí misma, y sin atributo (widgets, ventana de fondo) nada cambia.
 */

export type EstiloUIId = 'plano' | 'redondo' | 'pixel' | 'tinta'

export interface EstiloUI {
  id: EstiloUIId
  /** Etiqueta para el selector (se traduce por separado en el diccionario). */
  nombre: string
}

export const ESTILOS_UI: EstiloUI[] = [
  { id: 'plano', nombre: 'Plano' },
  { id: 'redondo', nombre: 'Redondo' },
  { id: 'pixel', nombre: 'Pixel' },
  { id: 'tinta', nombre: 'Tinta' },
]

/** Un «suave» guardado de antes cae aquí (no pasa `esEstiloUI`). */
export const ESTILO_UI_DEFAULT: EstiloUIId = 'redondo'

export function esEstiloUI(v: unknown): v is EstiloUIId {
  return ESTILOS_UI.some((e) => e.id === v)
}

/** Marca el estilo en el <html>; las reglas de `index.css` hacen el resto. */
export function aplicarEstiloUI(id: EstiloUIId): void {
  document.documentElement.dataset.estiloUi = id
}
