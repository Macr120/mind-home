import { db } from '../data/db'
import { playerPos } from '../state/playerPosition'
import { cellToWorld } from './walls'

/**
 * Dónde está cada construcción del mapa, para que el chat pueda mandar al avatar
 * caminando («llévame al huerto», «quiero montar el tren»). Vive aquí y no en
 * `editorAcciones.ts` porque necesita leer `db`, que la capa del chat no importa.
 */

export type DestinoInfra = 'huerto' | 'granja' | 'pista' | 'meta' | 'tren'

/** La celda más cercana al avatar, ya en coordenadas de mundo. */
function masCercana(celdas: { col: number; row: number }[]): { x: number; z: number } | null {
  let mejor: { x: number; z: number } | null = null
  let dist = Infinity
  for (const c of celdas) {
    const [x, , z] = cellToWorld(c.col, c.row)
    const d = (x - playerPos.x) ** 2 + (z - playerPos.z) ** 2
    if (d < dist) {
      dist = d
      mejor = { x, z }
    }
  }
  return mejor
}

/** Punto al que caminar para llegar a esa construcción (null si aún no existe). */
export async function posicionInfra(destino: DestinoInfra): Promise<{ x: number; z: number } | null> {
  if (destino === 'huerto') return masCercana(await db.cultivos.toArray())
  if (destino === 'granja') return masCercana(await db.corrales.toArray())
  const filas = await db.caminos.toArray()
  if (destino === 'meta') {
    const m = filas.find((f) => f.meta)
    if (!m) return null
    const [x, , z] = cellToWorld(m.col, m.row)
    return { x, z }
  }
  // 'tren' = riel o montaña rusa (ambos se montan); 'pista' = solo pista de carreras.
  return masCercana(filas.filter((f) => (destino === 'tren' ? f.tipo !== 'pista' : f.tipo === 'pista')))
}
