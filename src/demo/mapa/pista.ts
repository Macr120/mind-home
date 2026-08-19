/**
 * Cuadrante · La pista de carreras.
 *
 * Circuito cerrado de `caminos.tipo = 'pista'` que LLENA el área útil de su
 * cuadrante (el modo carrera exige al menos 8 celdas alcanzables desde la
 * meta), con la ÚNICA meta del mapa en el punto medio de la recta norte y una
 * CHICANE en la recta oeste, que se apoya en la columna del antiguo paddock.
 * Nada de coordenadas absolutas: si la malla crece, el circuito crece con ella.
 *
 * También siembra el AÑO de récords (`db.carreras`, una fila por vehículo
 * para esta meta): se ven en la tabla de tiempos al pisar la pista.
 */
import { aplicarPisoExteriorCeldas, caminosRepo, carrerasRepo } from '../../core/data/repository'
import { MAPA_ROOM, useDiseño } from '../../core/state/disenoStore'
import { areaUtilZona, bordeRect, celdasRect, metaPista, mundo } from './cuadrantes'

const DIA_MS = 86_400_000

export async function construirPista(cols: number, rows: number): Promise<void> {
  const D = useDiseño.getState
  const u = areaUtilZona('zona-pista', cols, rows)
  const meta = metaPista(cols, rows)

  // El trazado: el óvalo del área útil menos la primera columna, con la recta
  // oeste quebrada en dos curvas encadenadas. Cada celda conserva exactamente
  // dos vecinas — así las esquinas se curvan solas y el rival no puede atajar.
  // Con menos de cinco filas útiles el quiebre no cabe: se queda el óvalo.
  const chicane = u.r1 - u.r0 >= 4
  const trazado = bordeRect(u.c0 + 1, u.r0, u.c1, u.r1).filter(
    (c) => !(chicane && c.col === u.c0 + 1 && c.row >= u.r0 + 2 && c.row <= u.r1 - 2),
  )
  if (chicane) {
    for (let row = u.r0 + 1; row <= u.r1 - 1; row++) trazado.push({ col: u.c0, row })
  }
  for (const c of trazado) {
    await caminosRepo.add({
      col: c.col,
      row: c.row,
      tipo: 'pista',
      meta: c.col === meta.col && c.row === meta.row,
    })
  }

  // Infield de cemento. El hueco de la chicane y las esquinas libres se quedan
  // en el césped de fondo: más gris solo apagaba el circuito.
  await aplicarPisoExteriorCeldas(0, celdasRect(u.c0 + 2, u.r0 + 1, u.c1 - 1, u.r1 - 1), 'cemento', '#9aa3ad')

  // Gradas improvisadas: faroles del circuito.
  for (const { col, row } of [
    { col: u.c0, row: u.r0 },
    { col: u.c0, row: u.r1 },
  ]) {
    await D().addObjeto(MAPA_ROOM, 'farol', '#cbd5e1', undefined, mundo(col, row))
  }

  // ── El año de Pep@ en la pista: récords acumulados por vehículo. La bici
  // es la de diario (más carreras); el coche viejo pierde más de lo que gana.
  const fecha = Date.now() - 14 * DIA_MS
  const records = [
    { vehiculo: 'bicicleta', mejorVuelta: 41_800, mejorTotal: 131_600, victorias: 38, derrotas: 14 },
    { vehiculo: 'motocicleta', mejorVuelta: 33_400, mejorTotal: 105_200, victorias: 12, derrotas: 9 },
    { vehiculo: 'automovil', mejorVuelta: 29_600, mejorTotal: 93_800, victorias: 7, derrotas: 11 },
  ]
  for (const r of records) {
    await carrerasRepo.add({ metaCol: meta.col, metaRow: meta.row, vueltasDeTotal: 3, fecha, ...r })
  }
}
