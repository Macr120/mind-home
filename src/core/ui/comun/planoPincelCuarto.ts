import { useCuartos } from '../../state/cuartosStore'
import { useLayout } from '../../state/layoutStore'
import type { ZonaPlano } from '../../data/db'
import {
  claveCeldaOff,
  formaEnCelda,
  type FormaLoseta,
} from '../../house/formasLoseta'
import { FOOTPRINT_DEFAULT, type Cell, type Footprint } from '../../house/walls'
import { puedeColocarCuartoBasico, cuartoIdEnTile, footprintConSoporteDirecto } from '../../house/planoGeometria'
import type { SeleccionPlano } from '../../state/planosStore'

/** Los 8 vecinos a ½ celda alrededor de un punto. */
const VECINOS_MEDIA_CELDA: [number, number][] = [
  [-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5],
  [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5],
]

/**
 * En pisos altos, el raycast del toque en el mapa 3D proyecta sobre el plano del NIVEL
 * en construcción (más alto que el nivel de abajo, donde en realidad se ve el cuarto que
 * da soporte); esa diferencia de altura puede desviar el cálculo isométrico por ½ celda
 * aunque el fantasma se vea perfectamente alineado con el cuarto de abajo. Si la celda
 * exacta del toque no tiene soporte pero UN ÚNICO vecino a ½ celda sí lo tiene (y está
 * libre), se usa ese en vez de rechazar el toque.
 */
function celdaConSoporteCercana(
  celda: Cell,
  nivel: number,
  placed: Record<string, boolean>,
  cells: Record<string, Cell>,
  footprints: Record<string, Footprint>,
  niveles: Record<string, number>,
  zonas: ZonaPlano[],
): Cell | null {
  const candidatos = VECINOS_MEDIA_CELDA.map(([dc, dr]) => ({ col: celda.col + dc, row: celda.row + dr })).filter(
    (c) => puedeColocarCuartoBasico(c, nivel, placed, cells, footprints, niveles, zonas),
  )
  return candidatos.length === 1 ? candidatos[0] : null
}

// IDs de cuartos creados por este pincel en la sesión actual.
// Determina si el ciclo de triángulo/círculo debe borrar (creado aquí) o resetear a cuadrado.
const _creadosPorPincel = new Set<string>()

interface ContextoColocar {
  nivel: number
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, { col: number; row: number }[]>
  niveles: Record<string, number>
  zonas: ZonaPlano[]
  setAviso: (msg: string | null) => void
  /** Proyección del mismo clic sobre el plano del suelo (ver planoPincelCuarto). */
  celdaAlterna?: Cell
}

/**
 * Crea un cuarto de 1 celda (muros al color del cuarto + ascenso si estrena nivel).
 * Devuelve su id, o null si la celda no es colocable (deja el aviso puesto).
 */
async function crearCuartoEnCeldaLibre(celdaClic: Cell, ctx: ContextoColocar): Promise<string | null> {
  const { nivel, placed, cells, footprints, niveles, zonas, setAviso, celdaAlterna } = ctx
  let celda = celdaClic
  if (nivel > 0 && !puedeColocarCuartoBasico(celda, nivel, placed, cells, footprints, niveles, zonas)) {
    // 1) La celda alterna es la proyección del MISMO clic sobre el plano del suelo (ver
    // proyectarPincelSuelo): suele ser la corrección exacta cuando el desvío isométrico
    // viene de la diferencia de altura entre el piso en construcción y el de abajo.
    if (celdaAlterna && puedeColocarCuartoBasico(celdaAlterna, nivel, placed, cells, footprints, niveles, zonas)) {
      celda = celdaAlterna
    } else {
      // 2) Si no, un vecino a ½ celda con soporte (tolerancia fina, p. ej. touch impreciso).
      const cercana = celdaConSoporteCercana(celda, nivel, placed, cells, footprints, niveles, zonas)
      if (cercana) celda = cercana
    }
  }
  if (!puedeColocarCuartoBasico(celda, nivel, placed, cells, footprints, niveles, zonas)) {
    const sinSoporte =
      nivel > 0 &&
      !footprintConSoporteDirecto(celda, FOOTPRINT_DEFAULT, nivel, placed, cells, footprints, niveles)
    setAviso(
      sinSoporte
        ? 'En pisos altos solo puedes construir sobre un cuarto del nivel de abajo.'
        : 'Esa celda ya está ocupada. Elige un espacio libre.',
    )
    return null
  }
  const n = useCuartos.getState().cuartos.length + 1
  // Los muros del color del cuarto y la puerta inicial los pone `crearEnCeldas`.
  const id = await useCuartos.getState().crearEnCeldas({ nombre: `Cuarto ${n}` }, [celda], nivel)
  // Primer cuarto de un nivel nuevo: pide elegir el tipo de ascenso (uno por nivel).
  if (nivel >= 1) {
    const anchor = useLayout.getState().cells[id] ?? celda
    useLayout.getState().pedirAccesoNivel(nivel, anchor.col, anchor.row)
  }
  return id
}

/**
 * Pincel de forma del modo Cuartos. Un clic con una forma activa (cuadrado/triángulo/
 * círculo) sobre una celda:
 * - Celda libre → crea un cuarto de 1 celda con esa forma, en la rotación del botón (`rotacion`).
 * - Celda de un cuarto → cicla esa celda: misma forma rota +90°; al completar el giro (o en
 *   cuadrado) borra la celda (y el cuarto si era la última). Otra forma → la altera con la
 *   rotación del botón.
 * Compartido por el croquis 2D (PlanoCanvas) y el mapa 3D (PlanoCuartos3DController).
 */
export async function aplicarPincelCuarto(opts: {
  col: number
  row: number
  forma: FormaLoseta
  /** Rotación con la que se coloca triángulo/círculo (botones de posición). */
  rotacion?: 0 | 90 | 180 | 270
  nivel: number
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, { col: number; row: number }[]>
  niveles: Record<string, number>
  zonas: ZonaPlano[]
  idsCuartosNivel: string[]
  /** Proyección del mismo clic sobre el plano del suelo (ver planoPincelCuarto). */
  celdaAlterna?: Cell
  setAviso: (msg: string | null) => void
  setSeleccion: (s: SeleccionPlano) => void
  onCuartoCreado?: () => void
}): Promise<void> {
  const {
    col,
    row,
    forma,
    rotacion = 0,
    nivel,
    placed,
    cells,
    footprints,
    niveles,
    zonas,
    idsCuartosNivel,
    celdaAlterna,
    setAviso,
    setSeleccion,
    onCuartoCreado,
  } = opts

  // Ancla en ½ celda: el cuarto se coloca en media rejilla (los offsets del footprint
  // siguen siendo enteros). Llega ya enganchado a ½ desde el croquis / mapa 3D.
  const celda = { col, row }
  const anchorDe = (id: string) => cells[id]
  const layout = useLayout.getState()
  const roomId = cuartoIdEnTile(celda, idsCuartosNivel, cells, footprints, anchorDe)

  const borrarCelda = async (rid: string) => {
    const fp = footprints[rid] ?? []
    if (fp.length <= 1) {
      _creadosPorPincel.delete(rid)
      await useCuartos.getState().eliminar(rid)
      setSeleccion(null)
    } else {
      await layout.removeRoomCell(rid, celda)
    }
  }

  if (roomId) {
    const anchor = cells[roomId]
    if (!anchor) return
    const offKey = claveCeldaOff(celda.col - anchor.col, celda.row - anchor.row)
    const actual = formaEnCelda(layout.formasCelda[roomId], offKey)

    const mismaForma = actual.forma === forma
    // El ciclo arranca en la rotación del botón y se cierra al volver a ella (4 giros).
    const giroPendiente = (actual.rotacion + 90) % 360 !== rotacion
    if (!mismaForma) {
      // Otra forma: la altera, estrenando el ciclo en la rotación del botón (el cuadrado
      // no tiene posiciones: siempre entra en rotación 0).
      await layout.setCeldaForma(roomId, offKey, forma, forma === 'cuadrado' ? undefined : rotacion)
    } else if (forma !== 'cuadrado' && giroPendiente) {
      // Misma forma con giro pendiente: rota +90°.
      await layout.setCeldaForma(roomId, offKey, forma)
    } else if (forma !== 'cuadrado') {
      if (_creadosPorPincel.has(roomId)) {
        // Creado por este pincel: borra la celda (o el cuarto si era la única).
        await borrarCelda(roomId)
      } else {
        // Cuarto preexistente: resetea a cuadrado sin borrar.
        await layout.setCeldaForma(roomId, offKey, 'cuadrado')
      }
    } else {
      // Cuadrado: fin del ciclo → borra la celda (o el cuarto si era la única).
      await borrarCelda(roomId)
    }
    setAviso(null)
    return
  }

  // Celda libre: crea un cuarto nuevo de una celda con la forma elegida.
  const id = await crearCuartoEnCeldaLibre(celda, { nivel, placed, cells, footprints, niveles, zonas, setAviso, celdaAlterna })
  if (!id) return
  if (forma !== 'cuadrado') {
    _creadosPorPincel.add(id)
    await useLayout.getState().setCeldaForma(id, claveCeldaOff(0, 0), forma, rotacion)
  }
  setSeleccion({ tipo: 'cuarto', roomId: id })
  if (forma === 'cuadrado') onCuartoCreado?.()
  setAviso(null)
}

/**
 * Pincel de forma con la REJILLA FINA: el clic llega como esquina de cuadrante (paso ½).
 * - Cuadrante de un cuarto → cicla su recorte fino (crear → rotar → quitar).
 * - Celda libre → crea un cuarto de 1 celda con esa esquina recortada.
 * Compartido por el croquis 2D (PlanoCanvas) y el mapa 3D (PlanoCuartos3DController).
 */
export async function aplicarPincelCuartoFino(opts: {
  col: number
  row: number
  forma: FormaLoseta
  nivel: number
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, { col: number; row: number }[]>
  niveles: Record<string, number>
  zonas: ZonaPlano[]
  idsCuartosNivel: string[]
  setAviso: (msg: string | null) => void
  setSeleccion: (s: SeleccionPlano) => void
}): Promise<void> {
  const { col, row, forma, nivel, placed, cells, footprints, niveles, zonas, idsCuartosNivel, setAviso, setSeleccion } = opts
  for (const id of idsCuartosNivel) {
    const anchor = cells[id]
    const fp = footprints[id]
    if (!anchor || !fp) continue
    for (const c of fp) {
      const fcCol = anchor.col + c.col
      const fcRow = anchor.row + c.row
      if (col < fcCol || col >= fcCol + 1 || row < fcRow || row >= fcRow + 1) continue
      const cuadrante = (col - fcCol >= 0.25 ? 1 : 0) + (row - fcRow >= 0.25 ? 2 : 0)
      await useLayout.getState().pintarSubformaCelda(id, c.col, c.row, cuadrante, forma)
      setSeleccion({ tipo: 'cuarto', roomId: id })
      setAviso(null)
      return
    }
  }

  // Celda libre: crea el cuarto y recorta de una vez la esquina del cuadrante tocado.
  const celda = { col: Math.floor(col), row: Math.floor(row) }
  const id = await crearCuartoEnCeldaLibre(celda, { nivel, placed, cells, footprints, niveles, zonas, setAviso })
  if (!id) return
  if (forma !== 'cuadrado') {
    const cuadrante = (col - celda.col >= 0.25 ? 1 : 0) + (row - celda.row >= 0.25 ? 2 : 0)
    await useLayout.getState().pintarSubformaCelda(id, 0, 0, cuadrante, forma)
  }
  setSeleccion({ tipo: 'cuarto', roomId: id })
  setAviso(null)
}
