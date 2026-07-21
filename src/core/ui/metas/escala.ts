import { addDias, deIso, DIA_MS, fechaLocalISO, inicioSemana } from '../../fechaLocal'

// Viven en `fechaLocal.ts` (solo necesitan `addDias`): el dominio de los planes
// también las usa y no puede importar de `core/ui/`. Se siguen exportando desde
// aquí porque el eje es donde el cronograma las busca.
export { isoMasDias } from '../../fechaLocal'

/**
 * El eje del cronograma. Es geometría pura: convierte fechas en píxeles y al revés.
 *
 * La cabecera pinta DOS filas, no las cinco unidades a la vez: cada nivel de zoom
 * declara la pareja que se lee a esa escala (un contexto ancho arriba y el detalle
 * abajo). Cinco filas fijas significaban que a "Días" sobraba la de trimestres y a
 * "Años" la de días era una papilla de píxeles de un carácter.
 */

export type Unidad = 'anio' | 'trimestre' | 'mes' | 'mesSemana' | 'semana' | 'dia'

/**
 * Los niveles de zoom, del más cercano al más lejano. Cada `pxPerDia` está elegido
 * para que la unidad de detalle se lea cómoda: un día necesita ~36px para "MI 31"
 * (letra + número, sin truncar), una semana ~56px para "12 mar", un mes ~75px
 * para "mar".
 */
export interface NivelZoom {
  clave: string
  nombre: string
  pxPerDia: number
  /** Las dos filas de la cabecera: contexto arriba, detalle abajo. */
  filas: [Unidad, Unidad]
  /** La unidad que marca la rejilla de fondo: siempre la de detalle. */
  unidadRejilla: Unidad
}

export const NIVELES_ZOOM: NivelZoom[] = [
  { clave: 'dia', nombre: 'Días', pxPerDia: 36, filas: ['mes', 'dia'], unidadRejilla: 'dia' },
  { clave: 'semana', nombre: 'Semanas', pxPerDia: 8, filas: ['mesSemana', 'semana'], unidadRejilla: 'semana' },
  { clave: 'mes', nombre: 'Meses', pxPerDia: 2.5, filas: ['trimestre', 'mes'], unidadRejilla: 'mes' },
  { clave: 'anio', nombre: 'Años', pxPerDia: 0.7, filas: ['anio', 'trimestre'], unidadRejilla: 'trimestre' },
]

/**
 * Ancho objetivo del eje, en píxeles: por debajo de esto se ve "compactado" en un
 * rincón al alejar el zoom, con toda la ventana a la izquierda y hueco vacío a la
 * derecha. Al ser fijo en píxeles (no en días), la ventana de tiempo se ENSANCHA
 * sola al alejar — a años (0.7 px/día) hay que abarcar años para llenar el mismo
 * ancho que a días (24 px/día) llenan unas pocas semanas.
 */
const ANCHO_OBJETIVO_PX = 2200

export interface Columna {
  ini: Date
  ancho: number
  etiqueta: string
  /** Sábado o domingo: la cabecera y la rejilla los sombrean (solo en la fila de días). */
  finde?: boolean
}

/** Días enteros de `a` a `b`. */
export const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA_MS)

/**
 * Primer lunes que pertenece de verdad al mes de `d` (para `mesSemana`, la
 * versión del mes que se sincroniza con las semanas). El lunes de la semana del
 * día 1 casi siempre cae en el mes ANTERIOR (a menos que el día 1 sea lunes);
 * en ese caso el primer lunes propio del mes es una semana después.
 *
 * Esto es lo que evita que dos meses vecinos se solapen: cada semana pertenece
 * exactamente a un bloque, el del mes de SU lunes — no hay una regla aparte que
 * decida "esta semana a caballo es de quién".
 */
function primerLunesDelMes(d: Date): Date {
  const dia1 = new Date(d.getFullYear(), d.getMonth(), 1)
  const lunes = inicioSemana(dia1)
  return lunes.getMonth() === dia1.getMonth() ? lunes : addDias(lunes, 7)
}

/** Inicio de la unidad que contiene a `d`. */
function inicioUnidad(u: Unidad, d: Date): Date {
  if (u === 'dia') return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (u === 'semana') return inicioSemana(d)
  if (u === 'mes') return new Date(d.getFullYear(), d.getMonth(), 1)
  if (u === 'mesSemana') return primerLunesDelMes(d)
  if (u === 'trimestre') return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
  return new Date(d.getFullYear(), 0, 1)
}

function siguienteUnidad(u: Unidad, d: Date): Date {
  if (u === 'dia') return addDias(d, 1)
  if (u === 'semana') return addDias(d, 7)
  if (u === 'mes') return new Date(d.getFullYear(), d.getMonth() + 1, 1)
  // `d` ya es el primer lunes de su mes (así lo entrega `inicioUnidad`/este
  // mismo método): el bloque siguiente empieza en el primer lunes del mes de
  // después, y así los bloques quedan pegados sin hueco ni traslape.
  if (u === 'mesSemana') return primerLunesDelMes(new Date(d.getFullYear(), d.getMonth() + 1, 1))
  if (u === 'trimestre') return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 1)
  return new Date(d.getFullYear() + 1, 0, 1)
}

// Iniciales del día de la semana, índice = `Date.getDay()` (0 = domingo). Un
// juego por idioma porque no es el abreviado de tres letras que ya da
// `toLocaleDateString` — "MI" en vez de "X" evita confundir miércoles con
// martes, y el inglés necesita dos letras por la misma razón (martes/jueves,
// sábado/domingo comparten inicial).
const LETRA_DIA_ES = ['D', 'L', 'M', 'MI', 'J', 'V', 'S']
const LETRA_DIA_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/**
 * Semana del año (1-52/53): cuenta de lunes en lunes desde el lunes de la
 * semana que contiene el 1 de enero. No es el cálculo ISO 8601 (que decide el
 * año por el primer jueves) — para un cronograma personal alcanza con un
 * contador simple que arranca en 1 cada enero.
 */
function semanaDelAnio(d: Date): number {
  const inicioAnio = inicioSemana(new Date(d.getFullYear(), 0, 1))
  return diasEntre(inicioAnio, inicioSemana(d)) / 7 + 1
}

function etiquetaDe(u: Unidad, d: Date, locale: string): string {
  if (u === 'dia') {
    const letras = locale.startsWith('es') ? LETRA_DIA_ES : LETRA_DIA_EN
    return `${letras[d.getDay()]} ${d.getDate()}`
  }
  if (u === 'semana') {
    // "S32 3-9": el número de semana y, igual que el mes, los días que abarca
    // (inicio-fin, aunque cruce de mes — el mes de arriba ya dice cuál es cuál).
    const fin = addDias(d, 6)
    return `S${semanaDelAnio(d)} ${d.getDate()}-${fin.getDate()}`
  }
  if (u === 'mes') {
    // Marca inicio y fin del mes en la misma etiqueta ("1-31 jul 26"): el borde
    // entre dos meses ya los separa, pero no dice dónde empieza y termina cada uno.
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const mes = d.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
    return `${d.getDate()}-${fin} ${mes}`
  }
  if (u === 'mesSemana') {
    // Sin rango de días: el bloque no empieza siempre en el día 1 (se estiró al
    // lunes de su semana), así que "1-31" ya no sería exacto — la fila de
    // semanas de abajo es la que da los días con precisión.
    return d.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
  }
  if (u === 'trimestre') return `Q${Math.floor(d.getMonth() / 3) + 1}`
  return String(d.getFullYear())
}

/**
 * La ventana del eje: cubre todos los periodos puestos y siempre hoy, con margen.
 * El mínimo de días no es fijo: se calcula para que, al `pxPerDia` de hoy, el eje
 * llene `ANCHO_OBJETIVO_PX` — así cambiar de nivel ensancha la ventana en vez de
 * dejar el mismo tramo de días compactado en una esquina.
 */
export function ventana(
  rangos: { ini: string; fin: string }[],
  hoy: Date,
  pxPerDia: number,
  margenDias = 60,
): { desde: Date; hasta: Date } {
  const isos = [fechaLocalISO(hoy), ...rangos.flatMap((r) => [r.ini, r.fin])]
  const min = isos.reduce((a, b) => (a < b ? a : b))
  const max = isos.reduce((a, b) => (a > b ? a : b))
  let desde = addDias(deIso(min), -margenDias)
  let hasta = addDias(deIso(max), margenDias)
  const minDias = Math.ceil(ANCHO_OBJETIVO_PX / pxPerDia)
  if (diasEntre(desde, hasta) < minDias) {
    const centro = new Date((desde.getTime() + hasta.getTime()) / 2)
    desde = addDias(centro, -minDias / 2)
    hasta = addDias(centro, minDias / 2)
  }
  return { desde, hasta }
}

/**
 * El nivel más cercano en el que todos los periodos caben a la vez en `anchoPx`.
 * Lo usa "Ajustar": encuadrar es elegir zoom, no inventar una escala nueva, así
 * que devuelve un índice de `NIVELES_ZOOM` y todo lo demás sigue igual. Si ni el
 * más lejano alcanza, ese es el mejor que hay.
 */
export function nivelQueEncuadra(rangos: { ini: string; fin: string }[], anchoPx: number): number {
  if (rangos.length === 0) return 0
  const min = rangos.map((r) => r.ini).reduce((a, b) => (a < b ? a : b))
  const max = rangos.map((r) => r.fin).reduce((a, b) => (a > b ? a : b))
  const dias = diasEntre(deIso(min), deIso(max)) + 1
  const i = NIVELES_ZOOM.findIndex((n) => dias * n.pxPerDia <= anchoPx)
  return i === -1 ? NIVELES_ZOOM.length - 1 : i
}

/**
 * Las columnas de UNA fila de la cabecera. `desde`/`hasta` casi nunca caen justo en
 * un borde de la unidad (las dos filas no pueden estar alineadas a la vez), así
 * que la primera y la última columna salen recortadas a los días que de verdad
 * quedan dentro de la ventana. Así el ancho de cada columna sigue representando
 * exactamente sus días, y las barras — posicionadas por días desde `desde` — caen
 * justo debajo de su fecha en cualquiera de las dos filas.
 */
export function columnasDe(unidad: Unidad, desde: Date, hasta: Date, pxPerDia: number, locale: string): Columna[] {
  const cols: Columna[] = []
  let unidadIni = inicioUnidad(unidad, desde)
  let cursor = desde
  while (cursor < hasta) {
    const finUnidad = siguienteUnidad(unidad, unidadIni)
    const fin = finUnidad < hasta ? finUnidad : hasta
    const dia = unidadIni.getDay()
    cols.push({
      ini: unidadIni,
      ancho: diasEntre(cursor, fin) * pxPerDia,
      etiqueta: etiquetaDe(unidad, unidadIni, locale),
      finde: unidad === 'dia' && (dia === 0 || dia === 6),
    })
    cursor = fin
    unidadIni = finUnidad
  }
  return cols
}

export const anchoTotal = (cols: Columna[]) => cols.reduce((n, c) => n + c.ancho, 0)

/** Píxeles desde el origen del eje hasta el inicio de un día. */
export const xDeIso = (desde: Date, iso: string, pxPerDia: number) => diasEntre(desde, deIso(iso)) * pxPerDia

/** Día ISO que cae en una x del eje: el inverso de `xDeIso`, para trazar con el ratón. */
export const isoDeX = (desde: Date, x: number, pxPerDia: number) =>
  fechaLocalISO(addDias(desde, Math.floor(x / pxPerDia)))

/** Ancho de un rango en píxeles; `fin` es inclusivo, por eso el +1. */
export const anchoDeRango = (ini: string, fin: string, pxPerDia: number) =>
  (diasEntre(deIso(ini), deIso(fin)) + 1) * pxPerDia

/** Píxeles arrastrados → días enteros. */
export const diasDeDx = (dx: number, pxPerDia: number) => Math.round(dx / pxPerDia)
