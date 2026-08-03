/**
 * Cuadrante 5 · Mindfulness y alberca (cols 6-11, rows 6-11).
 *
 * El jardín es un cuarto SIN MUROS con la app de mindfulness (2×2 celdas), y
 * la alberca es un cuarto de sótano (nivel −1): el agua nadable solo existe
 * ahí. Ambos van redondeados con recortes finos — no llevan ventanas, así que
 * la curva no le quita nada a la fachada.
 *
 * OJO: `playerPos` (spawn del motor) es el punto FIJO (-3, 0, 0) — con una
 * rejilla PAR (18×12) ese z=0 cae exacto en el límite entre las filas 5 y 6.
 * El jardín arrancaba en la fila 6, así que su esquina redondeada quedaba
 * literalmente sobre el punto de aparición y atrapaba al personaje (bug real,
 * verificado). Por eso el jardín empieza en la fila 7, no en la 6.
 */
import { asignarPlantillaACuarto } from '../../core/gamificacion/plantillaBundle'
import { getPlantilla } from '../../core/registry'
import { useCuartos } from '../../core/state/cuartosStore'
import { MAPA_ROOM, useDiseño } from '../../core/state/disenoStore'
import { useLayout } from '../../core/state/layoutStore'
import { areaUtilZona, mundo } from './cuadrantes'

/** Devuelve el id del cuarto del jardín (la app Mindfulness vive aquí). */
export async function construirMindfulness(cols: number, rows: number): Promise<string> {
  const L = useLayout.getState
  const C = useCuartos.getState
  const D = useDiseño.getState
  const u = areaUtilZona('zona-mindfulness', cols, rows)

  /** Redondea las 4 esquinas exteriores de un cuarto de 2×2 celdas. */
  const redondear2x2 = async (id: string) => {
    await L().pintarSubformaCelda(id, 0, 0, 0, 'circular') // NO
    await L().pintarSubformaCelda(id, 1, 0, 1, 'circular') // NE
    await L().pintarSubformaCelda(id, 0, 1, 2, 'circular') // SO
    await L().pintarSubformaCelda(id, 1, 1, 3, 'circular') // SE
  }

  // ── Jardín zen: 2×2, sin muros (lo marca su plantilla al asignarse).
  // OJO al offset +1: ver la nota del spawn en la cabecera. ────────────────
  const jc = u.c0 + 1
  const jr = u.r0 + 1
  const jardin = getPlantilla('jardin')
  const jardinId = await C().crearEnCeldas(
    { color: jardin?.color, categoria: jardin?.categoria },
    [
      { col: jc, row: jr },
      { col: jc + 1, row: jr },
      { col: jc, row: jr + 1 },
      { col: jc + 1, row: jr + 1 },
    ],
    0,
  )
  await asignarPlantillaACuarto(jardinId, 'jardin')
  await redondear2x2(jardinId)
  await D().setRoomPisoTipo(jardinId, 'pasto')

  // ── Alberca: excavada en el patio (nivel −1), al sur del jardín ──────────
  const albercaId = await C().crearEnCeldas(
    { nombre: 'Alberca', icon: '🏊', color: '#38bdf8', categoria: 'complemento' },
    [
      { col: jc, row: jr + 2 },
      { col: jc + 1, row: jr + 2 },
      { col: jc, row: jr + 3 },
      { col: jc + 1, row: jr + 3 },
    ],
    -1,
  )
  // Las esquinas ANTES del agua: `setAgua` recalcula sus sub-celdas ya con la
  // silueta recortada.
  await redondear2x2(albercaId)
  await L().setAgua(albercaId, true)
  await D().sincronizarFlotadorAlberca(albercaId, true)
  await D().setRoomPisoTipo(albercaId, 'mosaico')
  await D().setRoomPisoColor(albercaId, '#7dd3fc')

  // Los flancos de la alberca se quedan en césped: el deck de adoquín metía
  // gris en el único rincón del mapa que se quiere todo verde.

  // ── Detalles: fuente, faroles y vegetación ───────────────────────────────
  const fuente = await D().addObjeto(MAPA_ROOM, 'fuente', '#9aa6b2', undefined, mundo(u.c0 + 4, u.r0 + 1))
  await D().setObjetoFx(fuente, 1.3)
  await D().addObjeto(MAPA_ROOM, 'farol', '#cbd5e1', undefined, mundo(u.c0, u.r0))
  await D().addObjeto(MAPA_ROOM, 'farol', '#cbd5e1', undefined, mundo(u.c0 + 4, u.r0 + 3))
  for (const { col, row } of [
    { col: u.c0, row: u.r0 + 1 },
    { col: u.c0 + 3, row: u.r0 },
    { col: u.c0 + 4, row: u.r0 },
    { col: u.c0 + 4, row: u.r0 + 2 },
  ]) {
    await D().addObjeto(MAPA_ROOM, 'planta', '#3f8f4f', undefined, mundo(col, row))
  }

  // Vegetación del rincón de calma, en las celdas que dejan libres el jardín, la
  // alberca y el deck. Escalas y giros distintos para que no se vean clonados.
  const arboles: [number, number, number, number][] = [
    // [col, row, escala, giro]
    [u.c0, u.r0 + 2, 1.15, 25],
    [u.c0 + 4, u.r0 + 4, 0.9, -40],
  ]
  for (const [col, row, escala, giro] of arboles) {
    const id = await D().addObjeto(MAPA_ROOM, 'recurso:77', '#2f7d32', undefined, mundo(col, row))
    await D().setObjetoEscala(id, escala)
    await D().setObjetoRotacion(id, giro)
  }
  const arbustos: [number, number, number, number][] = [
    [u.c0 + 3, u.r0 + 2, 1, 0],
    [u.c0 + 3, u.r0 + 1, 0.85, 60],
    [u.c0 + 1, u.r0, 1.1, -30],
  ]
  for (const [col, row, escala, giro] of arbustos) {
    const id = await D().addObjeto(MAPA_ROOM, 'recurso:78', '#2f7d32', undefined, mundo(col, row))
    await D().setObjetoEscala(id, escala)
    await D().setObjetoRotacion(id, giro)
  }
  // Flores junto a la fuente y jardineras al borde de la alberca (posiciones
  // fraccionarias: no ocupan celda propia).
  await D().addObjeto(MAPA_ROOM, 'recurso:99', '#f472b6', undefined, mundo(u.c0 + 3.6, u.r0 + 1))
  await D().addObjeto(MAPA_ROOM, 'recurso:101', '#ec4899', undefined, mundo(u.c0 + 4, u.r0 + 1.5))
  await D().addObjeto(MAPA_ROOM, 'recurso:106', '#7c4a24', undefined, mundo(u.c0, u.r0 + 3.4))
  await D().addObjeto(MAPA_ROOM, 'recurso:106', '#7c4a24', undefined, mundo(u.c0 + 3, u.r0 + 3.4))

  return jardinId
}
