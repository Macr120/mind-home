export type SeccionMapaId =
  | 'mapa'
  | 'ajustes'
  | 'inventario'
  | 'tema'
  | 'fondo'
  | 'perfil'

export type SeccionCuartoId = 'piso' | 'paredes' | 'techo' | 'objetos'

// La pestaña "Mapa" del editor: el resto vive en otras pestañas (perfil → Personajes,
// ajustes → Configuraciones), en la barra del constructor (fondo de cielo) o en el side
// menu de Mind Home (inventario y catálogo).
const ORDEN_MAPA_DEFAULT: SeccionMapaId[] = ['tema']

const ORDEN_CUARTO_DEFAULT: SeccionCuartoId[] = [
  'piso',
  'paredes',
  'techo',
  'objetos',
]

export const TITULOS_MAPA: Record<SeccionMapaId, string> = {
  mapa: 'Mapa',
  ajustes: 'Interfaz e idioma',
  inventario: 'Inventario y catálogo',
  tema: 'Tema de la casa',
  fondo: 'Fondo de cielo',
  perfil: 'Tu perfil y avatar',
}

export const TITULOS_CUARTO: Record<SeccionCuartoId, string> = {
  piso: 'Piso del cuarto',
  paredes: 'Paredes, puertas y ventanas',
  techo: 'Techo del cuarto',
  objetos: 'Objetos del cuarto',
}

const KEY_ORDEN_MAPA = 'mind-home-editor-orden-mapa'
const KEY_ORDEN_CUARTO = 'mind-home-editor-orden-cuarto'
const KEY_COLAPSO = 'mind-home-editor-colapso'

/** Secciones de mapa retiradas de la pestaña Mapa (viven en otras pestañas / barra / side menu). */
const SECCIONES_MAPA_RETIRADAS = new Set([
  'techo',
  'piso',
  'ajustes',
  'perfil',
  'fondo',
  'inventario',
])

/** Secciones de cuarto retiradas del panel (p. ej. `forma` → edición en escena 3D). */
const SECCIONES_CUARTO_RETIRADAS = new Set(['forma', 'apariencia'])

/** Quita ids obsoletos y rellena faltantes (orden del usuario + defaults). */
export function sanitizarOrdenMapa(orden: readonly string[]): SeccionMapaId[] {
  const validos = orden.filter(
    (id): id is SeccionMapaId =>
      !SECCIONES_MAPA_RETIRADAS.has(id) &&
      ORDEN_MAPA_DEFAULT.includes(id as SeccionMapaId),
  )
  const faltantes = ORDEN_MAPA_DEFAULT.filter((id) => !validos.includes(id))
  return [...validos, ...faltantes]
}

/** Quita ids obsoletos y rellena faltantes (orden del usuario + defaults). */
export function sanitizarOrdenCuarto(orden: readonly string[]): SeccionCuartoId[] {
  const validos = orden.filter(
    (id): id is SeccionCuartoId =>
      !SECCIONES_CUARTO_RETIRADAS.has(id) &&
      ORDEN_CUARTO_DEFAULT.includes(id as SeccionCuartoId),
  )
  const faltantes = ORDEN_CUARTO_DEFAULT.filter((id) => !validos.includes(id))
  return [...validos, ...faltantes]
}

function guardarOrden(key: string, orden: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(orden))
  } catch {
    /* quota / modo privado */
  }
}

export function leerOrdenMapa(): SeccionMapaId[] {
  try {
    const raw = localStorage.getItem(KEY_ORDEN_MAPA)
    if (!raw) return ORDEN_MAPA_DEFAULT
    return sanitizarOrdenMapa(JSON.parse(raw) as string[])
  } catch {
    return ORDEN_MAPA_DEFAULT
  }
}

export function leerOrdenCuarto(): SeccionCuartoId[] {
  try {
    const raw = localStorage.getItem(KEY_ORDEN_CUARTO)
    if (!raw) return ORDEN_CUARTO_DEFAULT
    return sanitizarOrdenCuarto(JSON.parse(raw) as string[])
  } catch {
    return ORDEN_CUARTO_DEFAULT
  }
}

export function guardarOrdenMapa(orden: SeccionMapaId[]) {
  guardarOrden(KEY_ORDEN_MAPA, orden)
}

export function guardarOrdenCuarto(orden: SeccionCuartoId[]) {
  guardarOrden(KEY_ORDEN_CUARTO, orden)
}

export function leerColapso(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY_COLAPSO)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export function guardarColapso(colapso: Record<string, boolean>) {
  try {
    localStorage.setItem(KEY_COLAPSO, JSON.stringify(colapso))
  } catch {
    /* noop */
  }
}

/** Mueve `origen` antes de `destino` en el arreglo. */
export function reordenar<T>(lista: T[], origen: T, destino: T): T[] {
  if (origen === destino) return lista
  const sin = lista.filter((x) => x !== origen)
  const idx = sin.indexOf(destino)
  if (idx < 0) return lista
  const next = [...sin]
  next.splice(idx, 0, origen)
  return next
}
