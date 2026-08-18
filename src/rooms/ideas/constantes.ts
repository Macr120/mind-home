/** Color de la app (ámbar foco). */
export const COLOR_FABRICA = '#facc15'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay` en
 * `--ui-app`) y, fuera de él, el de fábrica. Es una variable CSS, no un hex: para
 * mezclarlo usa `color-mix`, no interpolación de alfa.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

/** Paleta de las ramas de primer nivel (los descendientes la heredan). */
export const PALETA_RAMAS = [
  '#fb923c',
  '#34d399',
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#facc15',
  '#2dd4bf',
  '#fb7185',
]

// Geometría del lienzo (unidades del mundo = px a zoom 1)
/** Distancia padre → hijo al auto-colocar un nodo nuevo. */
export const R_HIJO = 130
/** Radio por nivel de los layouts radiales (mapa mental y círculo). */
export const R_ANILLO = 150
/** Ancho mínimo del viewBox (tope de acercamiento). */
export const ANCHO_MIN = 320

// Topes duros de la IA (se aplican en código, no solo en el prompt)
export const MAX_NODOS_MAPA = 30
export const MAX_PROF_MAPA = 3
export const MAX_HIJOS_MAPA = 6
export const MAX_TEXTO_NODO = 60
