/**
 * Cuadrante · Tren y feria.
 *
 * La montaña rusa es su propia red: `caminos.tipo = 'coaster'` con `altura`
 * por celda (0–6, 0.6 m por nivel). No se enlaza con el riel del tren aunque
 * se toquen — los vecinos se filtran por tipo —, así que es un circuito
 * cerrado independiente, y las rampas entre alturas se interpolan solas.
 * Todo son OFFSETS del área útil del cuadrante (malla proporcional).
 */
import { aplicarPisoExteriorCeldas, caminosRepo } from '../../core/data/repository'
import { MAPA_ROOM, useDiseño } from '../../core/state/disenoStore'
import { areaUtilZona, celdasRect, mundo } from './cuadrantes'

/**
 * El circuito EN ORDEN de recorrido (12 celdas, en el sentido de las agujas)
 * con su altura, como offsets: subida al norte, cima en el este y bajada de
 * vuelta. El último tramo enlaza con el primero, así que ambos van a ras.
 */
const COASTER: { dc: number; dr: number; altura: number }[] = [
  { dc: 0, dr: 0, altura: 0 },
  { dc: 1, dr: 0, altura: 1 },
  { dc: 2, dr: 0, altura: 3 },
  { dc: 3, dr: 0, altura: 5 },
  { dc: 3, dr: 1, altura: 6 },
  { dc: 3, dr: 2, altura: 6 },
  { dc: 3, dr: 3, altura: 5 },
  { dc: 2, dr: 3, altura: 3 },
  { dc: 1, dr: 3, altura: 1 },
  { dc: 0, dr: 3, altura: 0 },
  { dc: 0, dr: 2, altura: 0 },
  { dc: 0, dr: 1, altura: 0 },
]

export async function construirFeria(cols: number, rows: number): Promise<void> {
  const D = useDiseño.getState
  const u = areaUtilZona('zona-feria', cols, rows)

  for (const c of COASTER) {
    await caminosRepo.add({ col: u.c0 + c.dc, row: u.r0 + c.dr, tipo: 'coaster', altura: c.altura })
  }

  // La feria es de campo: la estación y el paseo de juegos se quedan sobre el
  // césped de fondo, y el único piso propio es la tierra de la montaña rusa.
  // Tierra pisada bajo la estructura de la montaña rusa.
  await aplicarPisoExteriorCeldas(0, celdasRect(u.c0 + 1, u.r0 + 1, u.c0 + 2, u.r0 + 2), 'arena', '#c9b489')

  // Juegos de parque: se usan caminando dentro de ellos.
  await D().addObjeto(MAPA_ROOM, 'carrusel', '#e11d48', undefined, mundo(u.c0 + 1, u.r0 + 4))
  await D().addObjeto(MAPA_ROOM, 'columpio', '#0ea5e9', undefined, mundo(u.c0 + 2.6, u.r0 + 4))
  await D().addObjeto(MAPA_ROOM, 'resbaladilla', '#f59e0b', undefined, mundo(u.c0 + 4, u.r0 + 4))

  // Luz de feria en la estación.
  await D().addObjeto(MAPA_ROOM, 'farol', '#cbd5e1', undefined, mundo(u.c0 + 4, u.r0))
  const letrero = await D().addObjeto(MAPA_ROOM, 'letrero-neon', '#a855f7', undefined, mundo(u.c0 + 4, u.r0 + 2))
  await D().setObjetoTexto(letrero, 'FERIA')
}
