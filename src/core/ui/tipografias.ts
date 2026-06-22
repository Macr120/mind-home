/**
 * Tipografías de la interfaz. Cada una es una pila de fuentes del sistema
 * (sin descargas externas) que se aplica con la variable CSS `--ui-font`.
 * Los componentes no cambian: heredan la fuente del <body>.
 */

export type TipografiaId =
  | 'sistema'
  | 'serif'
  | 'mono'
  | 'redondeada'
  | 'manuscrita'

export interface Tipografia {
  id: TipografiaId
  /** Etiqueta para el selector (se traduce por separado en el diccionario). */
  nombre: string
  /** Pila CSS de font-family. */
  stack: string
}

export const TIPOGRAFIAS: Tipografia[] = [
  {
    id: 'sistema',
    nombre: 'Sistema',
    stack: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  {
    id: 'serif',
    nombre: 'Serif',
    stack: "Georgia, 'Times New Roman', 'Noto Serif', serif",
  },
  {
    id: 'mono',
    nombre: 'Monoespaciada',
    stack: "ui-monospace, 'Cascadia Code', Consolas, 'Courier New', monospace",
  },
  {
    id: 'redondeada',
    nombre: 'Redondeada',
    stack: "'Segoe UI Rounded', 'SF Pro Rounded', 'Trebuchet MS', system-ui, sans-serif",
  },
  {
    id: 'manuscrita',
    nombre: 'Manuscrita',
    stack: "'Comic Sans MS', 'Segoe Print', 'Bradley Hand', cursive",
  },
]

export const TIPOGRAFIA_DEFAULT: TipografiaId = 'sistema'

export function getTipografia(id: TipografiaId): Tipografia {
  return TIPOGRAFIAS.find((t) => t.id === id) ?? TIPOGRAFIAS[0]
}

/** Aplica la pila de fuentes al documento mediante la variable `--ui-font`. */
export function aplicarTipografia(id: TipografiaId): void {
  document.documentElement.style.setProperty('--ui-font', getTipografia(id).stack)
}
