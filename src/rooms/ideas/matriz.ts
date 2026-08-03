import type { NodoMapa } from '../../core/data/db'
import { nodosMapaRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { PALETA_RAMAS } from './constantes'

/**
 * Matriz de decisión ponderada sobre las MISMAS tablas que los mapas.
 *
 * Es el único formato que no es un lienzo (es una tabla), pero no necesita
 * esquema propio: los criterios y las opciones son nodos raíz marcados con su
 * `zona`, y cada celda cuelga de su criterio (`padreId`) guardando en `zona` el
 * `nodoId` de su opción. `peso` hace doble papel: la importancia del criterio y
 * el puntaje de la celda.
 *
 * Las celdas se escriben cuando se tocan, no al crear la fila: una matriz sin
 * estrenar vale lo mismo en todas sus opciones (todo neutro) y no ensucia la
 * base con decenas de filas en cero.
 */

export const ZONA_CRITERIO = 'criterio'
export const ZONA_OPCION = 'opcion'

/** Puntaje de una celda sin tocar: ni suma ni resta frente a las demás. */
export const PUNTAJE_NEUTRO = 3
export const MAX_PUNTAJE = 5

/** Del peor puntaje al mejor: la tabla se lee de un vistazo por el color. */
export const COLORES_PUNTAJE = ['#fb7185', '#fb923c', '#facc15', '#a3e635', '#34d399']

export interface MatrizLeida {
  criterios: NodoMapa[]
  opciones: NodoMapa[]
  /** `criterioId|opcionId` → la celda, si ya se tocó alguna vez. */
  celdas: Map<string, NodoMapa>
}

const clave = (criterioId: string, opcionId: string) => `${criterioId}|${opcionId}`

export function leerMatriz(nodos: NodoMapa[]): MatrizLeida {
  const raiz = (zona: string) => nodos.filter((n) => n.padreId == null && n.zona === zona)
  const celdas = new Map<string, NodoMapa>()
  for (const n of nodos) {
    if (n.padreId != null && n.zona) celdas.set(clave(n.padreId, n.zona), n)
  }
  return { criterios: raiz(ZONA_CRITERIO), opciones: raiz(ZONA_OPCION), celdas }
}

export const celdaDe = (m: MatrizLeida, criterio: NodoMapa, opcion: NodoMapa) =>
  m.celdas.get(clave(criterio.nodoId, opcion.nodoId))

/** Puntaje de una opción en un criterio (neutro mientras nadie lo toque). */
export const puntaje = (m: MatrizLeida, criterio: NodoMapa, opcion: NodoMapa): number =>
  celdaDe(m, criterio, opcion)?.peso ?? PUNTAJE_NEUTRO

/** Total de una opción: cada puntaje multiplicado por lo que pesa su criterio. */
export const totalOpcion = (m: MatrizLeida, opcion: NodoMapa): number =>
  m.criterios.reduce((suma, c) => suma + (c.peso ?? 1) * puntaje(m, c, opcion), 0)

/** Índice de la opción con más puntos (-1 si hay empate o no hay opciones). */
export function ganadora(m: MatrizLeida): number {
  if (m.opciones.length === 0 || m.criterios.length === 0) return -1
  const totales = m.opciones.map((o) => totalOpcion(m, o))
  const mejor = Math.max(...totales)
  return totales.filter((x) => x === mejor).length === 1 ? totales.indexOf(mejor) : -1
}

// ----- Escrituras -----

const filaBase = (mapaId: number) => ({
  mapaId,
  nodoId: `nod-${crypto.randomUUID()}`,
  x: 0,
  y: 0,
  fecha: fechaLocalISO(),
  creadoEn: new Date().toISOString(),
})

export async function agregarCriterio(mapaId: number, texto: string, orden: number): Promise<void> {
  await nodosMapaRepo.add({
    ...filaBase(mapaId),
    padreId: null,
    zona: ZONA_CRITERIO,
    texto,
    peso: PUNTAJE_NEUTRO,
    color: PALETA_RAMAS[orden % PALETA_RAMAS.length],
  })
}

export async function agregarOpcion(mapaId: number, texto: string, orden: number): Promise<void> {
  await nodosMapaRepo.add({
    ...filaBase(mapaId),
    padreId: null,
    zona: ZONA_OPCION,
    texto,
    color: PALETA_RAMAS[orden % PALETA_RAMAS.length],
  })
}

/** Sube el puntaje de una celda y vuelve a 1 tras el 5 (crea la fila si hace falta). */
export async function ciclarPuntaje(
  m: MatrizLeida,
  mapaId: number,
  criterio: NodoMapa,
  opcion: NodoMapa,
): Promise<void> {
  const celda = celdaDe(m, criterio, opcion)
  const siguiente = ((celda?.peso ?? PUNTAJE_NEUTRO) % MAX_PUNTAJE) + 1
  if (celda?.id != null) await nodosMapaRepo.update(celda.id, { peso: siguiente })
  else {
    await nodosMapaRepo.add({
      ...filaBase(mapaId),
      padreId: criterio.nodoId,
      zona: opcion.nodoId,
      texto: '',
      peso: siguiente,
    })
  }
}

/** Borra una fila o una columna con las celdas que dependían de ella. */
export async function borrarDeMatriz(nodos: NodoMapa[], fila: NodoMapa): Promise<void> {
  const suyas = nodos.filter(
    (n) => n.nodoId === fila.nodoId || n.padreId === fila.nodoId || n.zona === fila.nodoId,
  )
  for (const n of suyas) if (n.id != null) await nodosMapaRepo.remove(n.id)
}
