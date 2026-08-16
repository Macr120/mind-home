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

/**
 * Pilas que solo tienen glifos latinos (Comic Sans, Segoe Print, SF Pro Rounded…).
 * En japonés, chino, coreano, hindi o árabe el navegador las completaría con
 * fuentes sustitutas letra a letra: media frase manuscrita y media no. Lo limpio
 * es caer a la pila base en esos idiomas.
 */
const SOLO_LATINAS: TipografiaId[] = ['redondeada', 'manuscrita']
const ESCRITURA_NO_LATINA = ['ja', 'zh', 'ko', 'hi', 'ar']

function getTipografia(id: TipografiaId): Tipografia {
  return TIPOGRAFIAS.find((t) => t.id === id) ?? TIPOGRAFIAS[0]
}

/**
 * Aplica la pila de fuentes al documento mediante la variable `--ui-font`.
 * El idioma activo puede degradar la elección (ver `SOLO_LATINAS`).
 */
export function aplicarTipografia(id: TipografiaId, idioma?: string): void {
  const efectiva =
    idioma && ESCRITURA_NO_LATINA.includes(idioma) && SOLO_LATINAS.includes(id) ? 'sistema' : id
  document.documentElement.style.setProperty('--ui-font', getTipografia(efectiva).stack)
}
