/** Color de la app (azul documento). */
export const COLOR_FABRICA = '#60a5fa'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay`
 * en `--ui-app`) y, fuera de él, el de fábrica.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

/** Paleta de colores de texto de la barra (la primera es «quitar color»). */
export const PALETA_TEXTO = [
  '#f8fafc',
  '#94a3b8',
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#2dd4bf',
  '#38bdf8',
  '#818cf8',
  '#c084fc',
  '#f472b6',
  '#a16207',
]

/**
 * Tope defensivo del HTML guardado (~500 KB): un pegado monstruoso no debe
 * reventar la fila del sync. Se avisa y no se guarda más allá.
 */
export const MAX_HTML = 500_000

// Topes de la IA (se aplican en código, no solo en el prompt)
/** Cuánto documento viaja como contexto para resumir. */
export const MAX_TEXTO_RESUMIR = 6000
/** Cola del documento que viaja para «continuar». */
export const MAX_TEXTO_CONTINUAR = 1500
/** Selección máxima que se manda a mejorar. */
export const MAX_TEXTO_MEJORAR = 4000
