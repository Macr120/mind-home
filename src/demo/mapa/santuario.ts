/**
 * Cuadrante · El santuario: animales rescatados y el huerto que los alimenta.
 *
 * Dos detalles del motor que hay que respetar: los animales NO salen de su
 * corral (por eso son grandes) y comer consume de `db.cesta`, que se llena
 * cosechando el huerto — sin cesta inicial los animales enferman y mueren.
 * Todo se coloca como OFFSETS del área útil del cuadrante (malla proporcional).
 *
 * El AÑO de uso se nota en: `cosechas` acumuladas por parcela, la cesta con
 * las 6 especies en cantidades de temporada, un corral sucio por limpiar y un
 * recién llegado enfermo por curar (la enfermedad de v106).
 */
import {
  animalesRepo,
  aplicarPisoExteriorCeldas,
  cestaRepo,
  corralesRepo,
  cultivosRepo,
} from '../../core/data/repository'
import { nombreAleatorio } from '../../core/house/nombresAnimales'
import { areaUtilZona, celdasRect } from './cuadrantes'

const MIN = 60_000
const DIA_MS = 86_400_000

export async function construirSantuario(cols: number, rows: number): Promise<void> {
  const ahora = Date.now()
  const u = areaUtilZona('zona-santuario', cols, rows)

  // ── Corral grande: los animales de pastoreo (capacidad 3 por celda) ──────
  const corralGrande = await corralesRepo.add({
    col: u.c0,
    row: u.r0,
    ancho: 3,
    alto: 2,
    accesorios: [
      { tipo: 'tina', col: u.c0, row: u.r0 },
      { tipo: 'pelota', col: u.c0 + 2, row: u.r0 + 1 },
    ],
    limpiadoEn: ahora,
  })
  for (const tipo of ['vaca', 'caballo', 'oveja', 'oveja'] as const) {
    await animalesRepo.add({
      corralId: corralGrande,
      tipo,
      alimentadoEn: ahora,
      mimadoEn: ahora,
      nombre: nombreAleatorio(),
    })
  }

  // ── Corral chico (2×2, hasta el borde este): aves y recién llegados. Lleva
  // 8 días sin limpiarse (se ve sucio: la demo invita a limpiar) y el cerdo
  // llegó enfermo — curarlo es parte del paseo. ─────────────────────────────
  const corralChico = await corralesRepo.add({
    col: u.c0 + 3,
    row: u.r0,
    ancho: 2,
    alto: 2,
    accesorios: [
      { tipo: 'lodo', col: u.c0 + 3, row: u.r0 + 1 },
      { tipo: 'tina', col: u.c0 + 4, row: u.r0 },
      { tipo: 'pelota', col: u.c0 + 4, row: u.r0 + 1 },
    ],
    limpiadoEn: ahora - 8 * DIA_MS,
  })
  for (const tipo of ['gallina', 'gallina', 'gallina', 'cabra', 'cabra', 'cabra', 'oveja'] as const) {
    await animalesRepo.add({
      corralId: corralChico,
      tipo,
      alimentadoEn: ahora,
      mimadoEn: ahora,
      nombre: nombreAleatorio(),
    })
  }
  await animalesRepo.add({
    corralId: corralChico,
    tipo: 'cerdo',
    alimentadoEn: ahora,
    mimadoEn: ahora,
    enfermoDesde: ahora - 2 * 3_600_000,
    nombre: nombreAleatorio(),
  })

  // ── Huerto: las 4 etapas del ciclo, tierra libre y un aspersor. Las
  // `cosechas` acumuladas cuentan el año de trabajo de Pep@. ───────────────
  const h = { col: u.c0, row: u.r0 + 2 }
  await cultivosRepo.add({ col: h.col, row: h.row, especie: 'calabaza', plantadoEn: ahora - 1 * MIN, regadoEn: ahora - 1 * MIN, cosechas: 6 }) // semilla
  await cultivosRepo.add({ col: h.col + 1, row: h.row, especie: 'maiz', plantadoEn: ahora - 35 * MIN, regadoEn: ahora - 5 * MIN, cosechas: 22 }) // planta
  await cultivosRepo.add({ col: h.col + 2, row: h.row, especie: 'girasol', plantadoEn: ahora - 12 * MIN, regadoEn: ahora - 3 * MIN, cosechas: 15 }) // listo
  await cultivosRepo.add({ col: h.col + 3, row: h.row, especie: 'zanahoria', plantadoEn: ahora - 5 * MIN, regadoEn: ahora - 5 * MIN, cosechas: 28 }) // marchito
  await cultivosRepo.add({ col: h.col, row: h.row + 1 }) // tierra lista para sembrar
  await cultivosRepo.add({ col: h.col + 1, row: h.row + 1, especie: 'lechuga', plantadoEn: ahora - 2 * MIN, regadoEn: ahora - 2 * MIN, cosechas: 19 })
  await cultivosRepo.add({ col: h.col + 2, row: h.row + 1 })
  await cultivosRepo.add({ col: h.col + 3, row: h.row + 1, especie: 'tomate', plantadoEn: ahora, regadoEn: ahora, aspersorEn: ahora, cosechas: 24 })

  // ── La franja este (la columna que era de césped): el corral chico ocupa
  // su mitad de arriba; abajo, dos parcelas más ────────────────────────────
  const e = u.c0 + 4
  await cultivosRepo.add({ col: e, row: h.row, especie: 'maiz', plantadoEn: ahora - 20 * MIN, regadoEn: ahora - 4 * MIN, cosechas: 17 })
  await cultivosRepo.add({ col: e, row: h.row + 1, especie: 'calabaza', plantadoEn: ahora - 30 * MIN, regadoEn: ahora - 6 * MIN, cosechas: 9 })

  // La despensa de un año de cosechas (sin grano no se alimenta a nadie).
  await cestaRepo.add({ especie: 'maiz', cantidad: 180 })
  await cestaRepo.add({ especie: 'zanahoria', cantidad: 96 })
  await cestaRepo.add({ especie: 'tomate', cantidad: 57 })
  await cestaRepo.add({ especie: 'lechuga', cantidad: 44 })
  await cestaRepo.add({ especie: 'girasol', cantidad: 31 })
  await cestaRepo.add({ especie: 'calabaza', cantidad: 12 })

  // ── Suelos: sin césped a la vista, todo es granja ────────────────────────
  await aplicarPisoExteriorCeldas(0, celdasRect(u.c0, u.r0, u.c0 + 4, u.r0 + 1), 'arena', '#d9c38a')
  await aplicarPisoExteriorCeldas(0, celdasRect(h.col, h.row, h.col + 4, h.row + 1), 'desierto', '#9c7a50')
}
