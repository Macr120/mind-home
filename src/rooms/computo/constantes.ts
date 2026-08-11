/** Constantes de la sala de cómputo: color, topes de la hoja y tolerancias. */

export const COLOR = '#0ea5e9'

// ── Hojas de cálculo ────────────────────────────────────────────────────────
// Topes duros. La hoja entera viaja en UNA fila de Dexie (ver `HojaCalculo`),
// así que el tamaño máximo es también el tamaño máximo de esa fila: 200×52
// llenas rondan los 120 KB, que IndexedDB mueve sin pestañear.
export const MAX_FILAS = 200
export const MAX_COLS = 52
/** Filas y columnas con las que nace una hoja nueva. */
export const FILAS_INICIO = 30
export const COLS_INICIO = 8
export const ANCHO_COL = 96
export const ALTO_FILA = 34
/** Milisegundos de espera antes de persistir mientras se teclea. */
export const ESPERA_GUARDADO = 400
/**
 * Pasos de deshacer que se recuerdan. Son fotos completas de la hoja, pero la
 * típica pesa 2-8 KB y viven solo en memoria (ver `useHistorial.ts`).
 */
export const MAX_DESHACER = 40

// ── Graficador ──────────────────────────────────────────────────────────────
/** Hasta seis funciones a la vez; más, y la gráfica deja de leerse. */
export const MAX_FUNCIONES = 6
export const COLORES_FUNCION = ['#38bdf8', '#f472b6', '#4ade80', '#fbbf24', '#a78bfa', '#fb7185']
/**
 * Colores de las gráficas de la hoja. En un pastel el color distingue REBANADAS
 * (no series), así que hacen falta más que en el graficador de funciones.
 */
export const COLORES_PASTEL = [
  ...COLORES_FUNCION,
  '#2dd4bf',
  '#f59e0b',
  '#818cf8',
  '#34d399',
]
/** Vista inicial del plano, en unidades. */
export const VISTA_INICIAL = { x0: -10, x1: 10, y0: -6, y1: 6 }
/**
 * Un tramo se corta cuando el salto vertical entre dos puntos supera este
 * múltiplo del alto visible: sin esto, `tan(x)` y `1/x` dibujan una línea
 * vertical falsa en cada asíntota.
 */
export const SALTO_CORTE = 3

// ── Resolvedor ──────────────────────────────────────────────────────────────
/** Puntos de muestreo al buscar cambios de signo. */
export const MUESTRAS_RAIZ = 2000
/** Intervalo por defecto cuando se resuelve fuera del graficador. */
export const RANGO_RAIZ = { x0: -20, x1: 20 }
/** Dos raíces más cercanas que esto son la misma. */
export const TOL_RAIZ = 1e-7
/** |f(x)| máximo para aceptar una raíz: descarta las falsas de las asíntotas. */
export const TOL_CERO = 1e-9
export const ITER_BISECCION = 60
export const ITER_NEWTON = 8

// ── IA ──────────────────────────────────────────────────────────────────────
/** Tope de variables de una fórmula propuesta (la ficha no lee más). */
export const MAX_VARIABLES_IA = 8
/** Tope de celdas de una hoja propuesta: los topes se aplican EN CÓDIGO. */
export const MAX_CELDAS_IA = 300

// ── Formulario ──────────────────────────────────────────────────────────────
/** Ids de las tres áreas del catálogo de fábrica. */
export const AREAS_FABRICA = ['matematicas', 'fisica', 'quimica'] as const
export type AreaFabrica = (typeof AREAS_FABRICA)[number]
/** Variables que mathjs ya usa: no se pueden declarar en una fórmula. */
export const SIMBOLOS_RESERVADOS = new Set(['e', 'i', 'pi', 'tau', 'phi', 'Infinity', 'NaN', 'null', 'true', 'false'])

// ── Modos especiales de la calculadora ──────────────────────────────────────
/** Todas las bases del modo de numeración, de la binaria a la hexadecimal. */
export const BASES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
/**
 * Prefijo de literal de mathjs, SOLO para las tres bases que lo tienen. Las
 * demás se convierten a mano (`parseInt`/`toString`): mathjs no sabe escribir
 * un número en base 7 dentro de una expresión.
 */
export const PREFIJO_BASE: Record<number, string> = { 2: '0b', 8: '0o', 16: '0x' }

/** Matrices: se empieza en 3×3 y no se pasa de 6 (más no se lee en un móvil). */
export const DIM_MATRIZ_INICIAL = 3
export const MAX_DIM_MATRIZ = 6

/** Ecuaciones de un sistema. Tantas como incógnitas, y el método es exacto. */
export const MIN_ECUACIONES = 2
export const MAX_ECUACIONES = 6

/** Propinas de un toque, en porcentaje. */
export const PROPINAS = [10, 15, 18, 20]

// ── Graficador: los cuatro tipos ────────────────────────────────────────────
/**
 * Un punto de curva cada dos píxeles de ancho. SOLO vale para y = f(x), que es
 * el único tipo cuyo dominio de muestreo es la parte del plano que se ve.
 */
export const PX_POR_MUESTRA = 2
/** Vueltas de θ que se muestrean: dos cierran las rosas de período no entero. */
export const VUELTAS_POLAR = 2
/** Muestras de θ: medio grado con dos vueltas. */
export const MUESTRAS_POLAR = 720
/** Rango por defecto del parámetro de una curva paramétrica, y sus muestras. */
export const RANGO_T: [number, number] = [0, 2 * Math.PI]
export const MUESTRAS_PARAM = 600
/** Aire alrededor de la curva al encuadrarla sola. */
export const AIRE_ENCUADRE = 0.12
/**
 * Suelo de la superficie suelta z = f(x, y). Constante de módulo A PROPÓSITO:
 * `Superficie3D` memoiza por IDENTIDAD del rango, y un `[-10, 10]` nuevo en cada
 * repintado reconstruiría los 2401 puntos de la malla con cada tecla.
 */
export const RANGO_XY_3D: [number, number] = [-10, 10]

/**
 * Los tres altos que cicla el botón del plano. Con la pantalla fija, el alto ya
 * no es cosmético: lo que ocupa el plano es lo que le quita al teclado.
 *
 * Se miden en VH y no en rem porque el plano va pegado arriba: con medidas
 * fijas, en una ventana corta los dos altos mayores se pasaban de la pantalla y
 * había que recortarlos a la misma altura, así que ciclar no hacía nada. Los
 * topes del `clamp` evitan el ridículo en un móvil apaisado y en un monitor
 * gigante, y el mayor se queda en el 48 % para que siempre quede sitio debajo.
 */
export const ALTOS_PLANO: { alto: string; clave: string; labelEs: string }[] = [
  { alto: 'clamp(8rem, 22vh, 14rem)', clave: 'computo.graf.altoCompacta', labelEs: 'Compacta' },
  { alto: 'clamp(12rem, 34vh, 22rem)', clave: 'computo.graf.altoNormal', labelEs: 'Normal' },
  { alto: 'clamp(16rem, 48vh, 32rem)', clave: 'computo.graf.altoAlta', labelEs: 'Alta' },
]
export const ALTO_PLANO_DEFECTO = 1
export const LS_ALTO_PLANO = 'mh.computo.altoPlano'

/** La gráfica embebida en la ficha de una fórmula: fija y discreta. */
export const ALTO_GRAFICA_FICHA = 'clamp(9rem, 26vh, 15rem)'
