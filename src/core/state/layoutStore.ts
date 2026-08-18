import { create } from 'zustand'
import { db, type Acceso, type Cuarto, type CuadranteMapa } from '../data/db'
import { claveLS, esDemo } from '../edicion'
import { useCuartos } from './cuartosStore'
import { useCam, zoomEncuadre } from './cameraStore'
import { useInteractUi } from './interactUiStore'
import { useEditorUi } from './editorUiStore'
import { usePlanos } from './planosStore'
import { useHouse } from './houseStore'
import { playerPos } from './playerPosition'
import { cuadranteDePosicion, rectMundo } from '../house/cuadrantesMapa'
import {
  cellId,
  cabeEnRejilla,
  collidersForRoom,
  formasColisionRoom,
  alturaTechoRoom,
  defaultCell,
  footprintCells,
  footprintBounds,
  roomSubCells,
  tileOcupado,
  rectFootprint,
  roomCenter,
  centroCuarto3D,
  roomDoorways,
  roomEdges,
  edgeKey,
  cellToWorld,
  doorFor,
  maxIndiceAncla,
  setGridDims,
  setTamCelda,
  setFlota,
  flotaPara,
  nivelBaseY,
  esquinaAlCentro,
  esquinasDeLado,
  type TipoAcceso,
  type EsquinaKey,
  COLS,
  ROWS,
  MAX_GRID,
  TAM_CELDA_BASE,
  TAM_CELDA_MIN,
  TAM_CELDA_MAX,
  SPACING,
  SIZE_DEFAULT,
  FOOTPRINT_DEFAULT,
  SIDE_KEYS,
  type AABB,
  type Cell,
  type Size,
  type Footprint,
  type SideKey,
  type WallState,
  type WallOverrides,
} from '../house/walls'
import {
  PINCELES_DEFAULT,
  type EstiloArista,
  type EstiloMuro,
  type EstiloPuerta,
  type PincelesCuarto,
} from '../house/murosPuertas'
import { puertaInicialCuarto, ventanaInicialCuarto, murosAbiertosExterior } from '../house/murosZona'
import { perimetroFormaCelda } from '../house/murosPerimetroLoseta'
import {
  formaEnCelda,
  formasAbsAOff,
  claveCeldaOff,
  claveSubceldaOff,
  cuadrantesDelLado,
  rotInicialSubforma,
  esFormaCuadrada,
  migrarClavesSubcelda,
  remapearFormasOffTrasAncla,
  siguienteFormaEnCelda,
  SUBQ_OFF,
  type FormaLoseta,
  type FormasCeldaMap,
  type CeldaFormaLoseta,
} from '../house/formasLoseta'

/**
 * Layout editable del mapa: qué cuartos están colocados, en qué CELDA ancla y con
 * qué FORMA (footprint = conjunto de celdas, no solo rectángulos). Data-driven:
 * se pueden agregar/quitar, mover (drag), crecer/encoger celda a celda y editar
 * cada arista (pared/puerta/abierto). Puertas y colisiones se recalculan al cambiar.
 */

type Cells = Record<string, Cell>
type Sizes = Record<string, Size>
type Footprints = Record<string, Footprint>
type Overrides = Record<string, WallOverrides>
type EdgeStyles = Record<string, Record<string, EstiloArista>>
type PincelesPorCuarto = Record<string, PincelesCuarto>
type Niveles = Record<string, number>
type FormasCeldaPorCuarto = Record<string, FormasCeldaMap>
/** Dónde se planta un acceso dentro de su celda: esquina (piso alto) o pared (sótano). */
type AnclaLocal = { esquina?: EsquinaKey; lado?: SideKey }

const sizeDe = (sizes: Sizes, id: string): Size => sizes[id] ?? SIZE_DEFAULT
const fpDe = (fps: Footprints, id: string): Footprint => fps[id] ?? FOOTPRINT_DEFAULT
const nivelDe = (niveles: Niveles, id: string): number => niveles[id] ?? 0

/** Lista dinámica de cuartos creados por el usuario (sustituye al arreglo estático). */
const losCuartos = (): Cuarto[] => useCuartos.getState().cuartos

/** Conjunto vacío estable para niveles sin cuartos (evita recrear Sets en cada render). */
export const SIN_OCUPACION: Set<string> = new Set()

/** Posición del mundo (centro de la caja) de un cuarto. */
function worldOf(cells: Cells, sizes: Sizes, id: string): [number, number, number] {
  const c = cells[id]
  if (!c) return [0, 0, 0]
  return roomCenter(c, sizeDe(sizes, id))
}

interface RecomputeIn {
  placed: Record<string, boolean>
  cells: Cells
  footprints: Footprints
  niveles: Niveles
  wallOverrides?: Overrides
  edgeStyles?: EdgeStyles
  pinceles?: PincelesPorCuarto
  formasCelda?: FormasCeldaPorCuarto
  conAgua?: Record<string, boolean>
}

/**
 * Recalcula cajas (sizes), ocupación POR NIVEL y colliders por nivel de los cuartos
 * colocados. Dos cuartos solo compiten por una celda si están en el MISMO nivel, así
 * que un cuarto de arriba puede apilarse sobre el footprint de otro de abajo.
 */
function recompute({ placed, cells, footprints, niveles, wallOverrides = {}, edgeStyles = {}, pinceles = {}, formasCelda = {}, conAgua = {} }: RecomputeIn) {
  const colocados = losCuartos().filter((r) => placed[r.id] && cells[r.id])
  const sizes: Sizes = {}
  const ocupadoPorNivel = new Map<number, Set<string>>()
  // Sub-celdas (½) de las albercas (sótanos con agua): el personaje flota sobre ellas.
  const subCeldasAgua = new Set<string>()
  const setDe = (lvl: number) => {
    let s = ocupadoPorNivel.get(lvl)
    if (!s) ocupadoPorNivel.set(lvl, (s = new Set<string>()))
    return s
  }
  // Número de cuartos de la planta baja: alimenta la separación explotada (más cuartos ⇒
  // más separación para que el piso de arriba no tape la planta extensa de abajo).
  let nBase = 0
  for (const r of colocados) {
    const fp = fpDe(footprints, r.id)
    sizes[r.id] = footprintBounds(fp)
    const lvl = nivelDe(niveles, r.id)
    if (lvl === 0) nBase++
    const occ = setDe(lvl)
    // Ocupación por SUB-CELDA (½): detecta traslapes y vecinos a media rejilla.
    const subs = roomSubCells(cells[r.id], fp)
    for (const k of subs) occ.add(k)
    // Albercas (sótano con agua): sus sub-celdas marcan dónde flota el personaje.
    if (lvl < 0 && conAgua[r.id]) for (const k of subs) subCeldasAgua.add(k)
  }
  setFlota(flotaPara(nBase))
  const wallCollidersByLevel: Record<number, AABB[]> = {}
  // Los mismos colliders, indexados por cuarto: permiten excluir de la colisión el
  // cuarto que el personaje carga sobre la cabeza (ver `muroColliders` en Character).
  const collidersPorCuarto: Record<string, AABB[]> = {}
  const puertasPorNivel = new Map<number, AABB[]>()
  // Altura de techo (la del muro más alto) por celda absoluta, para no permitir
  // extender el techo de un cuarto sobre el de otro con distinta altura.
  const alturaTechoPorNivel = new Map<number, Map<string, number>>()
  for (const r of colocados) {
    const lvl = nivelDe(niveles, r.id)
    const occ = ocupadoPorNivel.get(lvl) ?? SIN_OCUPACION
    const fp = fpDe(footprints, r.id)
    const arr = wallCollidersByLevel[lvl] ?? (wallCollidersByLevel[lvl] = [])
    // Curvas/diagonales de formas (enteras y finas): colisión muestreada con el vano
    // abierto donde hay puerta (se puede entrar y salir por ellas).
    const fcol = formasColisionRoom(cells[r.id], fp, formasCelda[r.id], wallOverrides[r.id], edgeStyles[r.id], pinceles[r.id])
    const propios = [
      ...collidersForRoom(cells[r.id], fp, occ, wallOverrides[r.id], edgeStyles[r.id], pinceles[r.id], formasCelda[r.id]),
      ...fcol.muros,
    ]
    collidersPorCuarto[r.id] = propios
    arr.push(...propios)
    const altura = alturaTechoRoom(cells[r.id], fp, occ, wallOverrides[r.id], edgeStyles[r.id], pinceles[r.id])
    let aMap = alturaTechoPorNivel.get(lvl)
    if (!aMap) alturaTechoPorNivel.set(lvl, (aMap = new Map()))
    for (const c of footprintCells(cells[r.id], fp)) aMap.set(cellId(c.col, c.row), altura)
    // Zonas de puerta (hueco): rectángulo del vano + holgura, para no estorbar el paso.
    const [wcx, , wcz] = centroCuarto3D(cells[r.id], fp)
    let pArr = puertasPorNivel.get(lvl)
    if (!pArr) puertasPorNivel.set(lvl, (pArr = []))
    pArr.push(...fcol.puertas)
    for (const v of roomDoorways(cells[r.id], fp, occ, wallOverrides[r.id], edgeStyles[r.id], pinceles[r.id], formasCelda[r.id])) {
      const dx = wcx + v.cx
      const dz = wcz + v.cz
      const along = v.ancho / 2 + 0.5 // a lo largo del vano
      const deep = 1.2 // perpendicular (cubre el embocadura por dentro y por fuera)
      puertasPorNivel.get(lvl)!.push(
        v.horizontal
          ? { minX: dx - along, maxX: dx + along, minZ: dz - deep, maxZ: dz + deep }
          : { minX: dx - deep, maxX: dx + deep, minZ: dz - along, maxZ: dz + along },
      )
    }
  }
  // Piso caminable por nivel: los cuartos de ese nivel MÁS los techos del nivel inferior
  // (terraza). Así en un piso alto se camina por todo el techo de la planta de abajo.
  const pisoPorNivel = new Map<number, Set<string>>()
  for (const [lvl, occ] of ocupadoPorNivel) {
    const piso = new Set(occ)
    const abajo = ocupadoPorNivel.get(lvl - 1)
    if (abajo) for (const k of abajo) piso.add(k)
    pisoPorNivel.set(lvl, piso)
  }
  return {
    sizes,
    ocupadoPorNivel,
    pisoPorNivel,
    wallCollidersByLevel,
    collidersPorCuarto,
    wallColliders: wallCollidersByLevel[0] ?? [],
    puertasPorNivel,
    alturaTechoPorNivel,
    subCeldasAgua,
  }
}

const todos = (v: boolean) =>
  Object.fromEntries(losCuartos().map((r) => [r.id, v])) as Record<string, boolean>

const celdasDefault = (): Cells =>
  Object.fromEntries(losCuartos().map((r) => [r.id, defaultCell([0, 0, 0])]))

const formasDefault = (): Footprints =>
  Object.fromEntries(losCuartos().map((r) => [r.id, [...FOOTPRINT_DEFAULT]]))

const nivelesDefault = (): Niveles => Object.fromEntries(losCuartos().map((r) => [r.id, 0]))

/**
 * Garantiza que cada cuarto esté colocado (placed=true) en una celda válida y ÚNICA
 * dentro de su nivel. Repara estados rotos (sin colocar o solapados en la misma celda)
 * reubicando a la primera celda libre. Muta placed/cells y devuelve los ids cambiados.
 */
function curarColocacionCuartos(
  cuartos: Cuarto[],
  placed: Record<string, boolean>,
  cells: Cells,
  footprints: Footprints,
  niveles: Niveles,
  gridCols: number,
  gridRows: number,
): Set<string> {
  const cambiados = new Set<string>()
  const ocupadoPorNivel = new Map<number, Set<string>>()
  const occDe = (lvl: number) => {
    let s = ocupadoPorNivel.get(lvl)
    if (!s) ocupadoPorNivel.set(lvl, (s = new Set<string>()))
    return s
  }
  for (const r of cuartos) {
    if (placed[r.id] !== true) {
      placed[r.id] = true
      cambiados.add(r.id)
    }
    const occ = occDe(nivelDe(niveles, r.id))
    const fp = fpDe(footprints, r.id)
    const cell = cells[r.id]
    const valida =
      cell &&
      cabeEnRejilla(cell, fp, gridCols, gridRows) &&
      !roomSubCells(cell, fp).some((k) => occ.has(k))
    let destino: Cell = cell ?? { col: 0, row: 0 }
    if (!valida) {
      let libre: Cell | null = null
      for (let row = 0; row < gridRows && !libre; row++) {
        for (let col = 0; col < gridCols; col++) {
          const c = { col, row }
          if (cabeEnRejilla(c, fp, gridCols, gridRows) && !roomSubCells(c, fp).some((k) => occ.has(k))) {
            libre = c
            break
          }
        }
      }
      destino = libre ?? destino
      cells[r.id] = destino
      cambiados.add(r.id)
    }
    for (const k of roomSubCells(destino, fp)) occ.add(k)
  }
  return cambiados
}

/** Acota la celda ancla para que el footprint quepa en la rejilla actual. */
function clampAnchor(cell: Cell, fp: Footprint, cols: number, rows: number): Cell {
  return {
    col: Math.max(0, Math.min(cell.col, maxIndiceAncla(cols, fp))),
    row: Math.max(0, Math.min(cell.row, maxIndiceAncla(rows, fp))),
  }
}

const DELTA: Record<SideKey, Cell> = {
  N: { col: 0, row: -1 },
  S: { col: 0, row: 1 },
  O: { col: -1, row: 0 },
  E: { col: 1, row: 0 },
}

/** ¿El conjunto de offsets es 4-conexo (una sola pieza)? */
function conexo(fp: Footprint): boolean {
  if (fp.length <= 1) return true
  const set = new Set(fp.map((c) => cellId(c.col, c.row)))
  const visto = new Set<string>()
  const cola = [fp[0]]
  visto.add(cellId(fp[0].col, fp[0].row))
  while (cola.length) {
    const c = cola.pop()!
    for (const s of SIDE_KEYS) {
      const d = DELTA[s]
      const k = cellId(c.col + d.col, c.row + d.row)
      if (set.has(k) && !visto.has(k)) {
        visto.add(k)
        cola.push({ col: c.col + d.col, row: c.row + d.row })
      }
    }
  }
  return visto.size === fp.length
}

/**
 * Normaliza un footprint para que su celda mínima sea (0,0), moviendo el ancla en
 * consecuencia y remapeando las claves de overrides (que van por offset).
 */
function normalizarForma(
  anchor: Cell,
  fp: Footprint,
  ov: WallOverrides | undefined,
  estilos?: Record<string, EstiloArista>,
) {
  let minC = Infinity
  let minR = Infinity
  for (const c of fp) {
    if (c.col < minC) minC = c.col
    if (c.row < minR) minR = c.row
  }
  if (!isFinite(minC)) {
    minC = 0
    minR = 0
  }
  if (minC === 0 && minR === 0) return { anchor, fp, ov: ov ?? {}, estilos: estilos ?? {} }
  const nfp = fp.map((c) => ({ col: c.col - minC, row: c.row - minR }))
  const nAnchor = { col: anchor.col + minC, row: anchor.row + minR }
  const nov: WallOverrides = {}
  const nest: Record<string, EstiloArista> = {}
  const remap = (k: string) => {
    const [oc, or, side] = k.split(',')
    return `${Number(oc) - minC},${Number(or) - minR},${side}`
  }
  if (ov) for (const [k, v] of Object.entries(ov)) nov[remap(k)] = v as WallState
  if (estilos) for (const [k, v] of Object.entries(estilos)) nest[remap(k)] = v
  return { anchor: nAnchor, fp: nfp, ov: nov, estilos: nest }
}

/** Migra overrides por lado (formato viejo N/S/E/O) a overrides por arista. */
function migrarMuros(muros: Record<string, string>, fp: Footprint): WallOverrides {
  const keys = Object.keys(muros)
  const esLados = keys.length > 0 && keys.every((k) => SIDE_KEYS.includes(k as SideKey))
  if (!esLados) return muros as WallOverrides // ya por arista
  const out: WallOverrides = {}
  for (const e of roomEdges({ col: 0, row: 0 }, fp, new Set())) {
    const v = muros[e.side]
    if (v) out[edgeKey(e.off, e.side)] = v as WallState
  }
  return out
}

export type DirGrid = 'N' | 'S' | 'E' | 'O'

interface LayoutState {
  placed: Record<string, boolean>
  cells: Cells
  sizes: Sizes
  footprints: Footprints
  /** Nivel/piso de cada cuarto (0 = planta baja). */
  niveles: Niveles
  /** Accesos para subir (uno por nivel ≥ 1). */
  accesos: Acceso[]
  gridCols: number
  gridRows: number
  /** Lado de cada celda de la rejilla en metros (espejo del SIZE activo de walls). */
  tamCelda: number
  /** Cuadrantes del mapa dibujados por el usuario (los automáticos se calculan). */
  cuadrantes: CuadranteMapa[]
  editMode: boolean
  editingRoomId: string | null
  /** Cuarto cuyos objetos se mueven sueltos en el mapa 3D (editor cerrado, botón flotante "Listo"). */
  moverObjetosRoomId: string | null
  /** Ocupación de celdas por nivel (un cuarto se apila sobre otro de distinto nivel). */
  ocupadoPorNivel: Map<number, Set<string>>
  /** Piso caminable por nivel: cuartos del nivel + techos (terraza) del nivel inferior. */
  pisoPorNivel: Map<number, Set<string>>
  /** Colliders de pared por nivel (el personaje usa los de su nivel actual). */
  wallCollidersByLevel: Record<number, AABB[]>
  /** Los mismos colliders indexados por cuarto (para excluir el cuarto cargado). */
  collidersPorCuarto: Record<string, AABB[]>
  /** Alias de los colliders del nivel 0 (planta baja). */
  wallColliders: AABB[]
  /** Zonas de puerta (huecos) por nivel: los objetos que caen aquí NO estorban el paso. */
  puertasPorNivel: Map<number, AABB[]>
  /** Altura de techo (la del muro más alto) por celda absoluta, por nivel. */
  alturaTechoPorNivel: Map<number, Map<string, number>>
  /** Sub-celdas (½) de las albercas (sótanos con agua): donde el personaje flota. */
  subCeldasAgua: Set<string>
  wallOverrides: Overrides
  edgeStyles: EdgeStyles
  pinceles: PincelesPorCuarto
  /** Forma de loseta por offset de footprint (cuartos del registro). */
  formasCelda: FormasCeldaPorCuarto
  /** Cuartos de espacio abierto (jardín): sin muros/puertas/techo ni colisión. */
  sinMuros: Record<string, boolean>
  /** Albercas (sótanos): cuartos llenos de agua animada, siempre destapados. */
  conAgua: Record<string, boolean>
  draggingId: string | null
  previewCell: Cell | null
  /** Celda ancla al iniciar el arrastre (para validar zonas bajo el origen). */
  dragOriginCell: Cell | null
  /** Acceso (id) que se arrastra en edición, o null. */
  draggingAcceso: number | null
  /** Celda destino del acceso arrastrado, o null. */
  previewAcceso: Cell | null
  /** Pared (lado) destino de la escalera marina arrastrada (sótano), o null. */
  previewLado: SideKey | null
  /** Esquina destino del ascenso arrastrado (pisos altos), o null. */
  previewEsquina: EsquinaKey | null
  cargado: boolean
  cargar: () => Promise<void>
  /** `mantenerVista`: al cerrar (v=false), no resetea la cámara (p. ej. al abrir el side menu de MPH). */
  setEditMode: (v: boolean, opts?: { mantenerVista?: boolean }) => void
  editRoom: (id: string | null) => void
  /** Activa/desactiva "mover objetos" de un cuarto: cierra el editor, enfoca el cuarto y
   *  deja sus objetos arrastrables sueltos en el mapa 3D (se sale con el botón "Listo"). */
  setMoverObjetos: (id: string | null) => void
  toggleRoom: (id: string) => Promise<void>
  /** Coloca un cuarto NUEVO (recién creado) en la primera celda libre de planta baja. */
  colocarCuartoNuevo: (id: string) => Promise<void>
  /** Coloca un cuarto NUEVO con la forma dibujada (celdas absolutas) en un nivel dado. */
  colocarCuartoEnCeldas: (id: string, celdas: Cell[], nivel: number) => Promise<void>
  /** Marca el cuarto como espacio abierto (jardín): sin muros/puertas/techo ni colisión. */
  marcarSinMuros: (id: string) => Promise<void>
  /** Llena/vacía de agua un cuarto de sótano (alberca). */
  setAgua: (id: string, v: boolean) => Promise<void>
  /** Retira por completo un cuarto eliminado: estado + filas de layout/diseño/objetos. */
  quitarCuarto: (id: string) => Promise<void>
  /** Coloca un cuarto en planta baja (nivel 0). */
  addRoomGround: (id: string) => Promise<void>
  /** Coloca un cuarto ENCIMA de otro (apila 1:1). Si crea un nivel nuevo, define su acceso. */
  addRoomOnTop: (id: string, baseRoomId: string, tipoAcceso?: TipoAcceso) => Promise<void>
  /** Crea el acceso de un nivel (uno por nivel). El ancla es la esquina del cuarto
   *  (pisos altos) o la pared del pozo (escalera marina del sótano). */
  addAcceso: (nivel: number, tipo: TipoAcceso, col: number, row: number, ancla: AnclaLocal) => Promise<void>
  /** Cambia el tipo (escalera/elevador/resbaladilla) de un acceso existente. */
  setAccesoTipo: (id: number, tipo: TipoAcceso) => Promise<void>
  /** Cuarto recién creado que estrena un nivel sin acceso: pide elegir el tipo de ascenso. */
  accesoPendiente: { nivel: number; col: number; row: number } | null
  /** Si el nivel (≥1) aún no tiene acceso, abre la petición para elegir el tipo de ascenso. */
  pedirAccesoNivel: (nivel: number, col: number, row: number) => void
  /** Crea el acceso del nivel pendiente con el tipo elegido, en la esquina del cuarto. */
  confirmarAccesoNivel: (tipo: TipoAcceso) => Promise<void>
  /** Descarta la petición de acceso (el nivel queda sin acceso por ahora). */
  cancelarAccesoNivel: () => void
  /** ¿Hay al menos un cuarto en planta baja? (requisito para apilar). */
  hayPlantaBaja: () => boolean
  /** Cuartos colocados que aún no tienen otro directamente encima (candidatos para apilar). */
  basesDisponibles: () => Cuarto[]
  /** ¿El nivel ya tiene acceso? (para no volver a preguntar el tipo). */
  nivelTieneAcceso: (nivel: number) => boolean
  /** Inicia el arrastre de un acceso (en edición). */
  startAccesoDrag: (id: number) => void
  /** Fija la celda y el ancla (esquina o pared) destino del acceso arrastrado. */
  setAccesoPreview: (cell: Cell | null, ancla: AnclaLocal | null) => void
  /** Suelta el acceso: lo reubica si hay celda y ancla válidas. */
  endAccesoDrag: () => Promise<void>
  /** Reubica un ascenso a la esquina de una celda de un cuarto de su nivel (la escalera
   *  marina del sótano se reubica por pared). No toca ningún muro. */
  moveAcceso: (id: number, cell: Cell, ancla: AnclaLocal) => Promise<void>
  setAll: (v: boolean) => Promise<void>
  moveRoom: (id: string, cell: Cell) => Promise<void>
  /** Fija forma+paredes+losetas del cuarto de una vez (al adoptar la geometría de una zona). */
  adoptarFormaCuarto: (
    id: string,
    anchor: Cell,
    fp: Footprint,
    muros: WallOverrides,
    formasOff: FormasCeldaMap | undefined,
  ) => Promise<void>
  /** Agrega una celda (absoluta) a la forma del cuarto. */
  addRoomCell: (id: string, abs: Cell) => Promise<void>
  /**
   * Expande el cuarto a la celda (absoluta). Si la celda vecina propia tiene forma de
   * círculo/triángulo, mueve esa forma a la celda nueva (la silueta avanza) y deja su
   * antiguo lugar como cuadrado. Si no hay forma, equivale a `addRoomCell`.
   */
  expandirCeldaCuarto: (id: string, abs: Cell) => Promise<void>
  /**
   * Inverso de `expandirCeldaCuarto`: quita la celda (absoluta) devolviendo su silueta
   * (círculo/triángulo o esquinas finas del borde) a la celda vecina que queda, para que
   * la figura recupere su forma anterior en vez de dejar un cuadrado.
   */
  contraerCeldaCuarto: (id: string, abs: Cell) => Promise<void>
  /** Quita una celda (absoluta) de la forma del cuarto. */
  removeRoomCell: (id: string, abs: Cell) => Promise<void>
  /** Cicla una arista del cuarto: Pared → Puerta → Abierto. */
  cycleEdge: (id: string, off: Cell, side: SideKey) => Promise<void>
  /** Pinta una arista con el estado y estilo del pincel activo. */
  paintEdge: (id: string, off: Cell, side: SideKey, estado: WallState) => Promise<void>
  /** Edita el estilo de UNA arista (muro/puerta), fusionando con lo existente. */
  setEdgeEstilo: (
    id: string,
    off: Cell,
    side: SideKey,
    patch: { muro?: Partial<EstiloMuro>; puerta?: Partial<EstiloPuerta> },
  ) => Promise<void>
  /** Actualiza el pincel (tipo/color por defecto) de un cuarto. */
  setPinceles: (id: string, p: PincelesCuarto) => Promise<void>
  /**
   * Forma de una celda del cuarto (offset en footprint). Sin `rotacionForzada`, doble
   * aplicación rota (+90°); con ella, la fija directamente en esa rotación (botones de posición).
   */
  setCeldaForma: (id: string, offKey: string, forma: FormaLoseta, rotacionForzada?: 0 | 90 | 180 | 270) => Promise<void>
  /**
   * Recorte fino de un cuadrante (rejilla fina): cicla crear (rotación hacia la esquina
   * exterior) → rotar ×3 → quitar. `cuadrado` quita el recorte directamente.
   */
  pintarSubformaCelda: (
    id: string,
    offCol: number,
    offRow: number,
    cuadrante: number,
    forma: FormaLoseta,
  ) => Promise<void>
  /** Fija la forma (absoluta) en TODAS las celdas del cuarto, o la quita (null). */
  aplicarFormaCuartoTodas: (id: string, forma: CeldaFormaLoseta | null) => Promise<void>
  startDrag: (id: string) => void
  setPreview: (cell: Cell | null) => void
  endDrag: () => Promise<void>
  expandGrid: (dir: DirGrid) => Promise<void>
  contractGrid: (dir: DirGrid) => Promise<void>
  /** Cambia el lado de las celdas de la rejilla (metros) y lo persiste en mapaConfig. */
  setTamCeldaMapa: (m: number) => Promise<void>
  /** Guarda un cuadrante dibujado en el croquis y devuelve su id. */
  agregarCuadrante: (q: CuadranteMapa) => Promise<void>
  renombrarCuadrante: (id: string, nombre: string) => Promise<void>
  eliminarCuadrante: (id: string) => Promise<void>
}

export const useLayout = create<LayoutState>((set, get) => ({
  placed: todos(true),
  cells: celdasDefault(),
  footprints: formasDefault(),
  niveles: nivelesDefault(),
  accesos: [],
  gridCols: COLS,
  gridRows: ROWS,
  tamCelda: TAM_CELDA_BASE,
  cuadrantes: [],
  editMode: false,
  editingRoomId: null,
  moverObjetosRoomId: null,
  wallOverrides: {},
  edgeStyles: {},
  pinceles: {},
  formasCelda: {},
  sinMuros: {},
  conAgua: {},
  draggingId: null,
  previewCell: null,
  dragOriginCell: null,
  draggingAcceso: null,
  previewAcceso: null,
  previewLado: null,
  previewEsquina: null,
  accesoPendiente: null,
  cargado: false,
  ...recompute({
    placed: todos(true),
    cells: celdasDefault(),
    footprints: formasDefault(),
    niveles: nivelesDefault(),
  }),

  cargar: async () => {
    // Los cuartos (instancias) deben estar cargados antes de mapear su layout.
    await useCuartos.getState().cargar()
    const cuartos = losCuartos()
    const filas = await db.layout.toArray()
    const configArr = await db.mapaConfig.toArray()
    const accesos = await db.accesos.toArray()
    const gridCols = configArr[0]?.cols ?? COLS
    const gridRows = configArr[0]?.rows ?? ROWS
    const tamCelda = configArr[0]?.celda ?? TAM_CELDA_BASE
    const cuadrantes = configArr[0]?.cuadrantes ?? []
    setGridDims(gridCols, gridRows)
    // Antes de cualquier recompute: los colliders y la geometría salen del SIZE activo.
    setTamCelda(tamCelda)

    const placed: Record<string, boolean> = {}
    const cells = celdasDefault()
    const footprints = formasDefault()
    const niveles = nivelesDefault()
    const wallOverrides: Overrides = {}
    const edgeStyles: EdgeStyles = {}
    const pinceles: PincelesPorCuarto = {}
    const formasCelda: FormasCeldaPorCuarto = {}
    const sinMuros: Record<string, boolean> = {}
    const conAgua: Record<string, boolean> = {}
    // Casa data-driven: cada cuarto creado por el usuario toma su colocación de la
    // fila de `layout` correspondiente (o defaults si aún no tiene). Sin siembra fija.
    for (const r of cuartos) {
      const f = filas.find((x) => x.roomId === r.id)
      placed[r.id] = f?.placed ?? true
      if (f && f.col !== undefined && f.row !== undefined) {
        cells[r.id] = { col: f.col, row: f.row }
      }
      if (f?.footprint && Array.isArray(f.footprint) && f.footprint.length) {
        footprints[r.id] = f.footprint
      } else if (f?.w && f?.h) {
        footprints[r.id] = rectFootprint({ w: f.w, h: f.h })
      }
      niveles[r.id] = f?.nivel ?? 0
      if (f?.muros) wallOverrides[r.id] = migrarMuros(f.muros, fpDe(footprints, r.id))
      if (f?.estilos) edgeStyles[r.id] = f.estilos
      if (f?.pinceles) pinceles[r.id] = f.pinceles
      // Migra claves de sub-celda del esquema inicial (paso ½) al de centros (¼/¾).
      if (f?.formasCelda) formasCelda[r.id] = migrarClavesSubcelda(f.formasCelda)!
      if (f?.sinMuros) sinMuros[r.id] = true
      if (f?.agua) conAgua[r.id] = true
    }
    // Sanar colocación: un cuarto SIEMPRE vive en el mapa, en una celda única.
    // Repara datos donde un cuarto quedó sin colocar o solapado (p. ej. tras un
    // "quitar" antiguo), reubicándolo a una celda libre. Persiste solo lo que cambia.
    const sanados = curarColocacionCuartos(cuartos, placed, cells, footprints, niveles, gridCols, gridRows)
    for (const rid of sanados) {
      await upsert(rid, { placed: true, col: cells[rid].col, row: cells[rid].row })
    }
    // Migración: los ascensos viejos se anclaban a una PARED y se plantaban por fuera del
    // cuarto, tapando la puerta del vecino; además abrían ese muro para poder salir a ellos.
    // Ahora viven DENTRO del cuarto, en una esquina, y no tocan muros: se recolocan en la
    // esquina más cercana a su pared vieja y se cierra el vano que habían dejado. Corre una
    // sola vez por acceso (al guardar `esquina` deja de cumplirse la condición).
    const migrados = new Set<string>()
    for (const a of accesos) {
      if (a.nivel < 1 || a.esquina || a.id == null) continue
      const ladoViejo: SideKey = a.lado ?? ladoDesdeDoor(a.col, a.row)
      for (const nivel of [a.nivel, a.nivel - 1]) {
        const r = losCuartos().find(
          (rm) =>
            placed[rm.id] &&
            cells[rm.id] &&
            (niveles[rm.id] ?? 0) === nivel &&
            footprintCells(cells[rm.id], fpDe(footprints, rm.id)).some(
              (fc) => fc.col === a.col && fc.row === a.row,
            ),
        )
        if (!r) continue
        const anchor = cells[r.id]
        const off = { col: a.col - anchor.col, row: a.row - anchor.row }
        const key = edgeKey(off, ladoViejo)
        if (wallOverrides[r.id]?.[key] !== 'abierto') continue
        const m = { ...wallOverrides[r.id] }
        delete m[key]
        wallOverrides[r.id] = m
        migrados.add(r.id)
      }
      // De las dos esquinas de esa pared, la que mira al centro de la casa.
      const [e1, e2] = esquinasDeLado(ladoViejo)
      const alCentro = esquinaAlCentro(a.col, a.row)
      a.esquina = e1 === alCentro || e2 === alCentro ? alCentro : e1
      await db.accesos.update(a.id, { esquina: a.esquina })
    }
    for (const rid of migrados) await upsert(rid, { muros: wallOverrides[rid] })

    // Sótanos: la escalera marina NUNCA lleva vano (se accede caminando por encima). Si
    // una versión anterior dejó un muro abierto por error (p. ej. al arrastrarla), se
    // cierra aquí — defensivo, corre siempre (barato: solo itera los accesos).
    const cerrados = new Set<string>()
    for (const a of accesos) {
      if (a.nivel >= 0) continue
      const lado: SideKey = a.lado ?? ladoDesdeDoor(a.col, a.row)
      const r = losCuartos().find(
        (rm) =>
          placed[rm.id] &&
          cells[rm.id] &&
          (niveles[rm.id] ?? 0) === a.nivel &&
          footprintCells(cells[rm.id], fpDe(footprints, rm.id)).some(
            (fc) => fc.col === a.col && fc.row === a.row,
          ),
      )
      if (!r) continue
      const anchor = cells[r.id]
      const off = { col: a.col - anchor.col, row: a.row - anchor.row }
      const key = edgeKey(off, lado)
      if (wallOverrides[r.id]?.[key] == null) continue
      const m = { ...wallOverrides[r.id] }
      delete m[key]
      wallOverrides[r.id] = m
      cerrados.add(r.id)
    }
    for (const rid of cerrados) await upsert(rid, { muros: wallOverrides[rid] })

    // Reparación: la escalera marina debe estar en una celda de SU cuarto de sótano. Un
    // dato viejo (el cuarto se movió sin ella, antes de que `moveRoom` la siguiera) pudo
    // dejarla huérfana; se re-ancla a la celda ancla del cuarto de ese nivel. Idempotente.
    for (const a of accesos) {
      if (a.nivel >= 0 || a.id == null) continue
      let ancla: Cell | null = null
      const celdasNivel = new Set<string>()
      for (const rm of losCuartos()) {
        if (!placed[rm.id] || !cells[rm.id] || (niveles[rm.id] ?? 0) !== a.nivel) continue
        if (!ancla) ancla = cells[rm.id]
        for (const c of footprintCells(cells[rm.id], fpDe(footprints, rm.id))) {
          celdasNivel.add(`${c.col},${c.row}`)
        }
      }
      if (!ancla || celdasNivel.has(`${a.col},${a.row}`)) continue // sin cuarto o ya alineada
      a.col = ancla.col
      a.row = ancla.row
      a.lado = ladoDesdeDoor(ancla.col, ancla.row)
      await db.accesos.update(a.id, { col: a.col, row: a.row, lado: a.lado })
    }

    const zonas = await db.zonas.toArray()
    // Migración única: retirar "zonas sombra" (ZonaPlano con roomId). Su geometría pasa al
    // cuarto del registro (footprint/muros/losetas) y la zona se elimina, dejando el footprint
    // como única fuente de verdad de la forma. Idempotente: tras correr no quedan sombras.
    const sombras = zonas.filter(
      (z) => z.roomId && z.id != null && losCuartos().some((r) => r.id === z.roomId),
    )
    if (sombras.length) {
      const { zonaAnchorFootprint } = await import('../house/planoGeometria')
      for (const z of sombras) {
        const rid = z.roomId!
        const { anchor, footprint } = zonaAnchorFootprint(z.celdas)
        placed[rid] = true
        cells[rid] = anchor
        footprints[rid] = footprint
        niveles[rid] = z.nivel
        const fo = formasAbsAOff(z.formasCelda, anchor)
        if (fo) formasCelda[rid] = fo
        else delete formasCelda[rid]
        wallOverrides[rid] = { ...(z.muros ?? {}) }
        edgeStyles[rid] = {}
        await upsert(rid, {
          placed: true,
          col: anchor.col,
          row: anchor.row,
          footprint,
          nivel: z.nivel,
          muros: wallOverrides[rid],
          estilos: {},
          formasCelda: formasCelda[rid],
        })
        await db.zonas.delete(z.id!)
      }
    }

    set({
      placed,
      cells,
      footprints,
      niveles,
      accesos,
      gridCols,
      gridRows,
      tamCelda,
      cuadrantes,
      wallOverrides,
      edgeStyles,
      pinceles,
      formasCelda,
      sinMuros,
      conAgua,
      ...recompute({ placed, cells, footprints, niveles, wallOverrides, edgeStyles, pinceles, formasCelda, conAgua }),
      cargado: true,
    })

    // Sin cuarto sembrado: la casa la arma la bienvenida (los intereses elegidos) y,
    // si no se elige ninguno, el paso 1 de su guía enseña a crear el primero.

    // Migración única: los cuartos que ya hospedan una app "sin muros" (jardín) quedan
    // como espacio abierto. Las apps nuevas lo hacen al asignarse (ver plantillaBundle).
    // En demo no aplica: la casa nace bien y la escritura chocaría con el guard.
    if (!esDemo() && localStorage.getItem(claveLS('mh_jardin_sin_muros_v2')) !== '1') {
      localStorage.setItem(claveLS('mh_jardin_sin_muros_v2'), '1')
      const { plantillas } = await import('../registry')
      const idsSinMuros = new Set(plantillas.filter((p) => p.sinMuros).map((p) => p.id))
      if (idsSinMuros.size) {
        const objetos = await db.objetosCuarto.toArray()
        const cuartosAbrir = new Set(
          objetos.filter((o) => o.plantillaId && idsSinMuros.has(o.plantillaId)).map((o) => o.roomId),
        )
        for (const rid of cuartosAbrir) {
          if (get().placed[rid]) await get().marcarSinMuros(rid)
        }
      }
    }
  },

  setEditMode: (v, opts) => {
    // Abrir el editor ya no te saca de donde estabas: en primera y en tercera
    // persona se edita desde ahí. Desde cualquier otra vista sí se pasa a iso,
    // que es la cámara ortográfica que la edición del mapa da por hecha.
    const vista = useCam.getState().vista
    const persp = vista === 'tercera' || vista === 'primera'
    if (v) {
      useInteractUi.getState().clear()
      if (!persp) useCam.getState().setVista('iso')
      // El editor recuerda en qué cámara se abrió: de ello dependen dónde van sus
      // controles y que tocar el mundo en 3D seleccione en vez de mover el mapa.
      useEditorUi.getState().setEditor3d(persp)
    } else {
      usePlanos.getState().setActivo(false)
      usePlanos.getState().setCuadranteVista(null)
    }
    const editingAntes = get().editingRoomId
    set({
      editMode: v,
      draggingId: null,
      previewCell: null,
      // Abrir/togglear el editor de mapa cancela el modo "mover objetos" (son excluyentes).
      moverObjetosRoomId: null,
      // `mantenerVista`: al ocultar el panel (p. ej. se abrió el side menu de MPH) NO
      // se limpia editingRoomId — seguimos "dentro" del cuarto, solo se ocultó el panel; así
      // el botón flotante sigue visible y `setEditMode(true)` retoma el mismo cuarto.
      editingRoomId: v || opts?.mantenerVista ? editingAntes : null,
    })
    if (v && !editingAntes && !persp) {
      // Con cuadrantes, la cámara encuadra el del personaje (y enciende su recorte
      // de vista); sin ellos —o si no cae en ninguno— toda la casa (todos los niveles).
      const { gridCols, gridRows, cuadrantes } = get()
      const q = cuadranteDePosicion(playerPos.x, playerPos.z, gridCols, gridRows, cuadrantes)
      if (q) {
        usePlanos.getState().setCuadranteVista(q.id)
        // Import dinámico a propósito: zonaMapa importa este store (ciclo si fuera estático).
        void import('../tutorial/zonaMapa').then((m) => m.enfocarRegion(rectMundo(q)))
      } else {
        useCam.setState({ focus: mapFocusPos(), zoom: zoomEncuadre() })
      }
    } else if (!v) {
      // Al salir, la vista en perspectiva se conserva (solo iso vuelve a su encuadre).
      // `mantenerVista`: cerrar sin mover la cámara ni salir del cuarto.
      if (!persp && !opts?.mantenerVista) useCam.getState().reset()
      useEditorUi.getState().setEditor3d(false)
    }
  },

  editRoom: (id) => {
    // En el editor 3D (perspectiva) se edita un cuarto sin cambiar la cámara.
    const persp = useEditorUi.getState().editor3d
    // Forzar iso antes de editar (evita que la cámara perspectiva quede activa durante edición iso).
    if (!persp) useCam.getState().setVista('iso')
    const saliaDeCuarto = get().editingRoomId != null && id == null
    set({ editMode: true, editingRoomId: id, moverObjetosRoomId: null, draggingId: null, previewCell: null })
    if (id) {
      // Editar un cuarto = editor de mapa enfocado en él: pestaña Mapa, su nivel y el
      // cuarto seleccionado (el croquis hace zoom sobre él y las props actúan sobre él).
      // El cuarto se selecciona AL FINAL: setNivel/setModo limpian la selección.
      useEditorUi.getState().setTab('mapa')
      usePlanos.getState().setNivel(get().niveles[id] ?? 0)
      usePlanos.getState().setModo('cuartos')
      usePlanos.getState().setSeleccion({ tipo: 'cuarto', roomId: id })
    }
    if (persp) return
    if (id) useCam.getState().focusRoomEdit(roomFocusPos(id))
    else if (saliaDeCuarto) useCam.getState().reset()
  },

  setMoverObjetos: (id) => {
    if (id) {
      // Cerrar el editor y enfocar el cuarto en vista de PLANTA (top-down): en móvil es mucho
      // más fácil ubicar y arrastrar objetos mirando desde arriba que en isométrico. Sus objetos
      // quedan sueltos en el mapa 3D (ObjetoDragController) y el botón flotante "Listo"
      // (EditorAnchor) sale del modo.
      useCam.getState().setVistaIso('top')
      set({ editMode: false, editingRoomId: null, moverObjetosRoomId: id, draggingId: null, previewCell: null })
      useEditorUi.getState().setObjetoSel(null)
      useCam.getState().focusRoomEdit(roomFocusPos(id))
    } else {
      set({ moverObjetosRoomId: null })
      useCam.getState().reset()
    }
  },

  toggleRoom: async (id) => {
    const quitando = get().placed[id]
    const { cells, niveles } = get()
    const nivel = nivelDe(niveles, id)
    if (quitando) {
      // No se puede quitar un cuarto que tiene otro directamente encima.
      const bc = cells[id]
      const tieneEncima =
        bc &&
        losCuartos().some((r) => {
          const c = cells[r.id]
          return (
            r.id !== id &&
            get().placed[r.id] &&
            c &&
            nivelDe(niveles, r.id) === nivel + 1 &&
            c.col === bc.col &&
            c.row === bc.row
          )
        })
      if (tieneEncima) return
    }
    const placed = { ...get().placed, [id]: !get().placed[id] }
    set({ placed, ...recompute({ ...get(), placed }) })
    await upsert(id, { placed: placed[id] })
    // Si era el último cuarto de su nivel (piso alto o sótano), retira su acceso.
    if (quitando && nivel !== 0) {
      const quedan = losCuartos().some((r) => get().placed[r.id] && nivelDe(get().niveles, r.id) === nivel)
      if (!quedan) {
        const ac = get().accesos.find((a) => a.nivel === nivel)
        if (ac?.id != null) await db.accesos.delete(ac.id)
        if (ac) set({ accesos: get().accesos.filter((a) => a.nivel !== nivel) })
      }
    }
  },

  colocarCuartoNuevo: async (id) => {
    const { placed, cells, footprints, niveles, gridCols, gridRows } = get()
    const fp = [...FOOTPRINT_DEFAULT]
    // La casa crece en RECTÁNGULO, no en hilera: entre las celdas libres de la planta
    // baja gana la que deja la planta más compacta (menor perímetro del rectángulo que
    // la envuelve y, a igualdad, la más cuadrada). Así los cuartos conservan fachada
    // al frente para su puerta en vez de alinearse en una fila larga.
    const ocupadas: Cell[] = []
    for (const r of losCuartos()) {
      if (!placed[r.id] || !cells[r.id] || nivelDe(niveles, r.id) !== 0) continue
      ocupadas.push(...footprintCells(cells[r.id], fpDe(footprints, r.id)))
    }
    let destino: Cell | null = null
    let mejor = Infinity
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const cell = { col, row }
        if (!esFootprintLibre(placed, cells, footprints, niveles, id, cell, fp, 0)) continue
        const todas = [...ocupadas, ...footprintCells(cell, fp)]
        const cols = todas.map((c) => c.col)
        const rows = todas.map((c) => c.row)
        const w = Math.max(...cols) - Math.min(...cols) + 1
        const h = Math.max(...rows) - Math.min(...rows) + 1
        // Pesos escalonados: primero el perímetro, luego lo cuadrado, luego la cercanía al origen.
        const puntaje = (w + h) * 1000 + Math.abs(w - h) * 40 + row + col
        if (puntaje < mejor) {
          mejor = puntaje
          destino = cell
        }
      }
    }
    if (!destino) destino = { col: 0, row: 0 }
    // Cuarto nuevo: nace con UNA puerta exterior (después el usuario la mueve o agrega más).
    const muros = puertaInicialCuarto(destino, fp, get().ocupadoPorNivel.get(0) ?? SIN_OCUPACION)
    const newPlaced = { ...placed, [id]: true }
    const newCells = { ...cells, [id]: destino }
    const newFps = { ...footprints, [id]: fp }
    const newNiveles = { ...niveles, [id]: 0 }
    const newOv = { ...get().wallOverrides, [id]: muros }
    set({
      placed: newPlaced,
      cells: newCells,
      footprints: newFps,
      niveles: newNiveles,
      wallOverrides: newOv,
      ...recompute({ ...get(), placed: newPlaced, cells: newCells, footprints: newFps, niveles: newNiveles, wallOverrides: newOv }),
    })
    await upsert(id, { placed: true, col: destino.col, row: destino.row, footprint: fp, nivel: 0, muros })
  },

  colocarCuartoEnCeldas: async (id, celdas, nivel) => {
    if (!celdas.length) return get().colocarCuartoNuevo(id)
    const { zonaAnchorFootprint } = await import('../house/planoGeometria')
    const { anchor, footprint } = zonaAnchorFootprint(celdas)
    const ocupadoNivel = get().ocupadoPorNivel.get(nivel) ?? SIN_OCUPACION
    // Cuarto nuevo: nace con UNA puerta exterior (después el usuario la mueve o agrega más).
    // Sótanos: sin puerta inicial — el otro lado del muro es tierra (se vería el vacío).
    // Pisos altos: tampoco (la puerta daría al vacío); en su lugar, una VENTANA.
    const muros =
      nivel === 0 ? puertaInicialCuarto(anchor, footprint, ocupadoNivel) : {}
    const estilos =
      nivel >= 1
        ? ventanaInicialCuarto(anchor, footprint, ocupadoNivel, (get().pinceles[id] ?? PINCELES_DEFAULT).muro)
        : {}
    const placed = { ...get().placed, [id]: true }
    const cells = { ...get().cells, [id]: anchor }
    const footprints = { ...get().footprints, [id]: footprint }
    const niveles = { ...get().niveles, [id]: nivel }
    const wallOverrides = { ...get().wallOverrides, [id]: muros }
    const edgeStyles = { ...get().edgeStyles, [id]: estilos }
    set({
      placed,
      cells,
      footprints,
      niveles,
      wallOverrides,
      edgeStyles,
      ...recompute({ ...get(), placed, cells, footprints, niveles, wallOverrides, edgeStyles }),
    })
    await upsert(id, { placed: true, col: anchor.col, row: anchor.row, footprint, nivel, muros, estilos })
    // Sótano: la escalera marina (una por nivel -1) nace con el primer cuarto excavado.
    if (nivel < 0 && !get().nivelTieneAcceso(nivel)) {
      await get().addAcceso(nivel, 'escalera-marina', anchor.col, anchor.row, {
        lado: ladoDesdeDoor(anchor.col, anchor.row),
      })
    }
  },

  marcarSinMuros: async (id) => {
    const { cells, footprints, niveles, wallOverrides, sinMuros } = get()
    const anchor = cells[id]
    if (!anchor) return
    // Abrir las aristas exteriores deja el cuarto sin colisiones (colliders derivan de los
    // muros); el flag `sinMuros` hace que Room3D no dibuje muros/portones ni techo.
    const fp = fpDe(footprints, id)
    const ocupado = get().ocupadoPorNivel.get(niveles[id] ?? 0) ?? SIN_OCUPACION
    const muros: WallOverrides = { ...(wallOverrides[id] ?? {}), ...murosAbiertosExterior(anchor, fp, ocupado) }
    const nuevosOv = { ...wallOverrides, [id]: muros }
    const nuevosSin = { ...sinMuros, [id]: true }
    set({ wallOverrides: nuevosOv, sinMuros: nuevosSin, ...recompute({ ...get(), wallOverrides: nuevosOv }) })
    await upsert(id, { muros, sinMuros: true })
  },

  setAgua: async (id, v) => {
    const conAgua = { ...get().conAgua }
    if (v) conAgua[id] = true
    else delete conAgua[id]
    // Recalcula subCeldasAgua (de ahí sale la flotación del personaje).
    set({ conAgua, ...recompute({ ...get(), conAgua }) })
    await upsert(id, { agua: v })
  },

  quitarCuarto: async (id) => {
    const st = get()
    const nivel = nivelDe(st.niveles, id)
    const clon = <T,>(o: Record<string, T>): Record<string, T> => {
      const n: Record<string, T> = { ...o }
      delete n[id]
      return n
    }
    const placed = clon(st.placed)
    const cells = clon(st.cells)
    const footprints = clon(st.footprints)
    const niveles = clon(st.niveles)
    const wallOverrides = clon(st.wallOverrides)
    const edgeStyles = clon(st.edgeStyles)
    const pinceles = clon(st.pinceles)
    const formasCelda = clon(st.formasCelda)
    const conAgua = clon(st.conAgua)
    set({
      placed,
      cells,
      footprints,
      niveles,
      wallOverrides,
      edgeStyles,
      pinceles,
      formasCelda,
      conAgua,
      editingRoomId: st.editingRoomId === id ? null : st.editingRoomId,
      ...recompute({ placed, cells, footprints, niveles, wallOverrides, edgeStyles, pinceles, formasCelda, conAgua }),
    })
    const fila = await db.layout.where('roomId').equals(id).first()
    if (fila?.id) await db.layout.delete(fila.id)
    await db.disenoRooms.where('roomId').equals(id).delete()
    await db.objetosCuarto.where('roomId').equals(id).delete()
    // Si era el último cuarto de su nivel (piso alto o sótano), retira su acceso.
    if (nivel !== 0) {
      const quedan = losCuartos().some((r) => get().placed[r.id] && nivelDe(get().niveles, r.id) === nivel)
      if (!quedan) {
        const ac = get().accesos.find((a) => a.nivel === nivel)
        if (ac?.id != null) await db.accesos.delete(ac.id)
        if (ac) set({ accesos: get().accesos.filter((a) => a.nivel !== nivel) })
      }
    }
    // Purga los objetos del cuarto también en memoria (sus plantillas vuelven al
    // catálogo sin recargar). Import dinámico: disenoStore importa este store.
    const { useDiseño } = await import('./disenoStore')
    useDiseño.setState((s) => ({ objetos: s.objetos.filter((o) => o.roomId !== id) }))
  },

  addRoomGround: async (id) => {
    const niveles = { ...get().niveles, [id]: 0 }
    const placed = { ...get().placed, [id]: true }
    set({ placed, niveles, ...recompute({ ...get(), placed, niveles }) })
    await upsert(id, { placed: true, nivel: 0 })
  },

  addRoomOnTop: async (id, baseRoomId, tipoAcceso) => {
    const base = get().cells[baseRoomId]
    if (!base) return
    const nivel = nivelDe(get().niveles, baseRoomId) + 1
    const fp = [...fpDe(get().footprints, baseRoomId)]
    const placed = { ...get().placed, [id]: true }
    const cells = { ...get().cells, [id]: { col: base.col, row: base.row } }
    const footprints = { ...get().footprints, [id]: fp }
    const niveles = { ...get().niveles, [id]: nivel }
    // El ascenso vive DENTRO del cuarto (en su esquina), así que ningún muro se abre.
    const muros: WallOverrides = {}
    const wallOverrides = { ...get().wallOverrides, [id]: muros }
    set({
      placed,
      cells,
      footprints,
      niveles,
      wallOverrides,
      ...recompute({ ...get(), placed, cells, footprints, niveles, wallOverrides }),
    })
    await upsert(id, { placed: true, col: base.col, row: base.row, footprint: fp, nivel, muros })
    if (tipoAcceso && !get().nivelTieneAcceso(nivel)) {
      await get().addAcceso(nivel, tipoAcceso, base.col, base.row, {
        esquina: esquinaAlCentro(base.col, base.row),
      })
    }
  },

  addAcceso: async (nivel, tipo, col, row, ancla) => {
    if (get().nivelTieneAcceso(nivel)) return
    const acceso: Acceso = { nivel, tipo, col, row, ...ancla }
    acceso.id = await db.accesos.add(acceso)
    set({ accesos: [...get().accesos, acceso] })
  },

  setAccesoTipo: async (id, tipo) => {
    set({ accesos: get().accesos.map((a) => (a.id === id ? { ...a, tipo } : a)) })
    await db.accesos.update(id, { tipo })
  },

  pedirAccesoNivel: (nivel, col, row) => {
    if (nivel < 1 || get().nivelTieneAcceso(nivel)) return
    set({ accesoPendiente: { nivel, col, row } })
  },
  confirmarAccesoNivel: async (tipo) => {
    const p = get().accesoPendiente
    if (!p) return
    // El ascenso se planta DENTRO del cuarto, en la esquina que mira al centro de la casa:
    // así no tapa puertas ni vanos y no hay que abrir ningún muro.
    await get().addAcceso(p.nivel, tipo, p.col, p.row, { esquina: esquinaAlCentro(p.col, p.row) })
    set({ accesoPendiente: null })
  },
  cancelarAccesoNivel: () => set({ accesoPendiente: null }),

  startAccesoDrag: (id) =>
    set({ draggingAcceso: id, previewAcceso: null, previewLado: null, previewEsquina: null }),
  setAccesoPreview: (cell, ancla) =>
    set((s) =>
      s.previewAcceso?.col === cell?.col &&
      s.previewAcceso?.row === cell?.row &&
      s.previewLado === (ancla?.lado ?? null) &&
      s.previewEsquina === (ancla?.esquina ?? null)
        ? s
        : { previewAcceso: cell, previewLado: ancla?.lado ?? null, previewEsquina: ancla?.esquina ?? null },
    ),
  endAccesoDrag: async () => {
    const { draggingAcceso, previewAcceso, previewLado, previewEsquina } = get()
    if (draggingAcceso != null && previewAcceso && (previewLado || previewEsquina))
      await get().moveAcceso(draggingAcceso, previewAcceso, {
        lado: previewLado ?? undefined,
        esquina: previewEsquina ?? undefined,
      })
    set({ draggingAcceso: null, previewAcceso: null, previewLado: null, previewEsquina: null })
  },
  moveAcceso: async (id, cell, ancla) => {
    const ac = get().accesos.find((a) => a.id === id)
    if (!ac) return
    // Ningún ascenso toca muros: el de piso alto vive DENTRO del cuarto (atraviesa la losa
    // por su hueco) y la escalera marina del sótano es decorativa (se baja caminando).
    const patch = { col: cell.col, row: cell.row, ...ancla }
    set({ accesos: get().accesos.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
    await db.accesos.update(id, patch)
  },

  hayPlantaBaja: () =>
    losCuartos().some((r) => get().placed[r.id] && nivelDe(get().niveles, r.id) === 0),

  basesDisponibles: () => {
    const { placed, cells, niveles } = get()
    const colocados = losCuartos().filter((r) => placed[r.id] && cells[r.id])
    return colocados.filter((base) => {
      const bc = cells[base.id]
      const bn = nivelDe(niveles, base.id)
      return !colocados.some(
        (o) =>
          o.id !== base.id &&
          nivelDe(niveles, o.id) === bn + 1 &&
          cells[o.id].col === bc.col &&
          cells[o.id].row === bc.row,
      )
    })
  },

  nivelTieneAcceso: (nivel) => get().accesos.some((a) => a.nivel === nivel),

  setAll: async (v) => {
    const placed = todos(v)
    set({ placed, ...recompute({ ...get(), placed }) })
    await Promise.all(losCuartos().map((r) => upsert(r.id, { placed: v })))
  },

  moveRoom: async (id, cell) => {
    // Mover no destructivo: el piso exterior bajo el cuarto se oculta solo (ocupación por
    // sub-celda) y reaparece al liberar; los pisos finos pintados DENTRO se mueven con él.
    const prev = get().cells[id]
    const fp = fpDe(get().footprints, id)
    const nivel = nivelDe(get().niveles, id)
    const newCells = { ...get().cells, [id]: cell }
    set({ cells: newCells, ...recompute({ ...get(), cells: newCells }) })
    await upsert(id, { col: cell.col, row: cell.row })
    if (prev && fp?.length && (prev.col !== cell.col || prev.row !== cell.row)) {
      const dc = cell.col - prev.col
      const dr = cell.row - prev.row
      const { trasladarPisosInteriores } = await import('../data/repository')
      await trasladarPisosInteriores(nivel, footprintCells(prev, fp), dc, dr)
      // El acceso vive DENTRO del cuarto (esquina en pisos altos, pozo en el sótano), así
      // que se traslada con él: si se quedara fijo acabaría flotando sobre el vacío.
      const celdasViejas = footprintCells(prev, fp)
      const ac = get().accesos.find(
        (a) => a.nivel === nivel && celdasViejas.some((c) => c.col === a.col && c.row === a.row),
      )
      if (ac?.id != null) {
        const movido = { col: ac.col + dc, row: ac.row + dr }
        set({ accesos: get().accesos.map((a) => (a.id === ac.id ? { ...a, ...movido } : a)) })
        await db.accesos.update(ac.id, movido)
      }
    }
  },

  adoptarFormaCuarto: async (id, anchor, fp, muros, formasOff) => {
    const placed = { ...get().placed, [id]: true }
    const cells = { ...get().cells, [id]: anchor }
    const footprints = { ...get().footprints, [id]: fp }
    const wallOverrides = { ...get().wallOverrides, [id]: muros }
    // La zona no tiene estilos ricos de arista; limpiar los del cuarto (claves del 1×1 viejo).
    const edgeStyles = { ...get().edgeStyles, [id]: {} }
    const formasCelda = { ...get().formasCelda }
    if (formasOff && Object.keys(formasOff).length) formasCelda[id] = formasOff
    else delete formasCelda[id]
    set({
      placed,
      cells,
      footprints,
      wallOverrides,
      edgeStyles,
      formasCelda,
      ...recompute({ ...get(), placed, cells, footprints, wallOverrides, edgeStyles, formasCelda }),
    })
    await upsert(id, {
      placed: true,
      col: anchor.col,
      row: anchor.row,
      footprint: fp,
      muros,
      estilos: {},
      formasCelda: formasOff,
    })
  },

  addRoomCell: async (id, abs) => {
    const { cells, footprints, gridCols, gridRows, ocupadoPorNivel, niveles, wallOverrides, edgeStyles } = get()
    const anchor = cells[id]
    if (!anchor) return
    if (abs.col < 0 || abs.row < 0 || abs.col >= gridCols || abs.row >= gridRows) return
    const occ = ocupadoPorNivel.get(nivelDe(niveles, id)) ?? SIN_OCUPACION
    if (tileOcupado(occ, abs.col, abs.row)) return // ya ocupada en este nivel (otro cuarto)
    const fp = fpDe(footprints, id)
    const off = { col: abs.col - anchor.col, row: abs.row - anchor.row }
    const propias = new Set(fp.map((c) => cellId(c.col, c.row)))
    const adyacente = SIDE_KEYS.some((s) =>
      propias.has(cellId(off.col + DELTA[s].col, off.row + DELTA[s].row)),
    )
    if (!adyacente) return
    const norm = normalizarForma(anchor, [...fp, off], wallOverrides[id], edgeStyles[id])
    const formasPrev = get().formasCelda[id]
    const formasNuevas = remapearFormasOffTrasAncla(
      formasPrev,
      anchor,
      fp,
      norm.anchor,
      norm.fp,
    )
    const newCells = { ...cells, [id]: norm.anchor }
    const newFps = { ...footprints, [id]: norm.fp }
    const newOv = { ...wallOverrides, [id]: norm.ov }
    const newEst = { ...edgeStyles, [id]: norm.estilos }
    const formasCelda = { ...get().formasCelda }
    if (formasNuevas !== undefined) formasCelda[id] = formasNuevas
    else delete formasCelda[id]
    set({
      cells: newCells,
      footprints: newFps,
      wallOverrides: newOv,
      edgeStyles: newEst,
      formasCelda,
      ...recompute({ ...get(), cells: newCells, footprints: newFps, wallOverrides: newOv, formasCelda }),
    })
    await upsert(id, {
      col: norm.anchor.col,
      row: norm.anchor.row,
      footprint: norm.fp,
      muros: norm.ov,
      estilos: norm.estilos,
      ...(formasNuevas !== undefined ? { formasCelda: formasNuevas } : {}),
    })
    // El techo por celda va por offset igual que las formas: sigue a su celda al reanclar.
    const { useDiseño } = await import('./disenoStore')
    await useDiseño.getState().remapearTechoCeldas(id, anchor, fp, norm.anchor, norm.fp)
  },

  expandirCeldaCuarto: async (id, abs) => {
    const { cells, footprints, formasCelda } = get()
    const anchor = cells[id]
    if (!anchor) return
    const fp = fpDe(footprints, id)
    const formas = formasCelda[id]
    const propias = new Set(fp.map((c) => cellId(c.col, c.row)))
    // Celda propia vecina cuya silueta "empuja" hacia `abs`: forma de celda entera
    // (círculo/triángulo) o, si no, los recortes finos del lado que da a `abs`.
    let origen:
      | { cell: Cell; forma: CeldaFormaLoseta; subs?: undefined }
      | { cell: Cell; forma?: undefined; subs: { i: number; f: CeldaFormaLoseta }[] }
      | null = null
    for (const s of SIDE_KEYS) {
      const v = { col: abs.col + DELTA[s].col, row: abs.row + DELTA[s].row }
      const off = { col: v.col - anchor.col, row: v.row - anchor.row }
      if (!propias.has(cellId(off.col, off.row))) continue
      const f = formaEnCelda(formas, claveCeldaOff(off.col, off.row))
      if (!esFormaCuadrada(f)) {
        origen = { cell: v, forma: f }
        break
      }
      // Esquinas finas: solo avanzan los cuadrantes que tocan el lado por el que crece.
      const subs = cuadrantesDelLado(abs.col - v.col, abs.row - v.row)
        .map((i) => ({ i, f: formas?.[claveSubceldaOff(off.col, off.row, i)] }))
        .filter((x): x is { i: number; f: CeldaFormaLoseta } => !!x.f && !esFormaCuadrada(x.f))
      if (subs.length) {
        origen = { cell: v, subs }
        break
      }
    }
    // Sin silueta que mover: expansión normal (cuadrado).
    if (!origen) return get().addRoomCell(id, abs)

    await get().addRoomCell(id, abs)
    // addRoomCell pudo reanclar el cuarto; relee y confirma que la celda se agregó.
    const st = get()
    const anchor2 = st.cells[id]
    const fp2 = fpDe(st.footprints, id)
    const tieneNueva = fp2.some(
      (o) => anchor2.col + o.col === abs.col && anchor2.row + o.row === abs.row,
    )
    if (!tieneNueva) return // no se pudo expandir (ocupada/fuera de rejilla)
    const nueva = { col: abs.col - anchor2.col, row: abs.row - anchor2.row }
    const vieja = { col: origen.cell.col - anchor2.col, row: origen.cell.row - anchor2.row }
    const roomFormas = { ...(st.formasCelda[id] ?? {}) }
    // Aristas virtuales (color/textura/puerta) del recorte fino que se mueve: sin esto
    // quedan huérfanas en la clave vieja y la esquina nueva nace con el pincel por defecto.
    const wallOverrides2 = { ...st.wallOverrides }
    const ov = { ...(wallOverrides2[id] ?? {}) }
    const edgeStyles2 = { ...st.edgeStyles }
    const est = { ...(edgeStyles2[id] ?? {}) }
    let movioAristas = false
    const migrarAristasSubcelda = (viejaC: Cell, nuevaC: Cell, i: number) => {
      const baseVieja = claveSubceldaOff(viejaC.col, viejaC.row, i)
      const baseNueva = claveSubceldaOff(nuevaC.col, nuevaC.row, i)
      for (const s of SIDE_KEYS) {
        const kVieja = `${baseVieja},${s}`
        const kNueva = `${baseNueva},${s}`
        if (ov[kVieja] !== undefined) {
          ov[kNueva] = ov[kVieja]
          delete ov[kVieja]
          movioAristas = true
        }
        if (est[kVieja] !== undefined) {
          est[kNueva] = est[kVieja]
          delete est[kVieja]
          movioAristas = true
        }
      }
    }
    if (origen.forma) {
      // La silueta avanza a la celda nueva; su antiguo lugar queda cuadrado.
      roomFormas[claveCeldaOff(nueva.col, nueva.row)] = origen.forma
      delete roomFormas[claveCeldaOff(vieja.col, vieja.row)]
      // Forma entera: su estilo vive en UNA arista real representativa (no en claves de
      // cuadrante), la misma que usa MurosPerimetroFormaCuarto para pintarla y editarla.
      const per = perimetroFormaCelda(origen.forma, 0, 0)
      const ladoRep = per ? SIDE_KEYS.find((s) => !per.lados.has(s)) : undefined
      if (ladoRep) {
        const kVieja = edgeKey(vieja, ladoRep)
        const kNueva = edgeKey(nueva, ladoRep)
        if (ov[kVieja] !== undefined) {
          ov[kNueva] = ov[kVieja]
          delete ov[kVieja]
          movioAristas = true
        }
        if (est[kVieja] !== undefined) {
          est[kNueva] = est[kVieja]
          delete est[kVieja]
          movioAristas = true
        }
      }
    } else {
      // Cada esquina fina avanza al MISMO cuadrante de la celda nueva (el borde redondeado
      // pasa a ser el exterior) y se borra del suyo, que queda a escuadra.
      for (const { i, f } of origen.subs) {
        roomFormas[claveSubceldaOff(nueva.col, nueva.row, i)] = f
        delete roomFormas[claveSubceldaOff(vieja.col, vieja.row, i)]
        migrarAristasSubcelda(vieja, nueva, i)
      }
    }
    const formasCelda2 = { ...st.formasCelda, [id]: roomFormas }
    if (movioAristas) {
      wallOverrides2[id] = ov
      edgeStyles2[id] = est
      set({
        formasCelda: formasCelda2,
        wallOverrides: wallOverrides2,
        edgeStyles: edgeStyles2,
        ...recompute({ ...st, formasCelda: formasCelda2, wallOverrides: wallOverrides2, edgeStyles: edgeStyles2 }),
      })
      await upsert(id, { formasCelda: roomFormas, muros: ov, estilos: est })
    } else {
      set({ formasCelda: formasCelda2, ...recompute({ ...st, formasCelda: formasCelda2 }) })
      await upsert(id, { formasCelda: roomFormas })
    }
    // El techo fabricado viaja con la silueta que avanza: si no, la figura se quedaría
    // con techo plano y su tienda/cono sobre la celda que acaba de quedar cuadrada.
    const kVieja = claveCeldaOff(vieja.col, vieja.row)
    const { useDiseño } = await import('./disenoStore')
    const cfVieja = useDiseño.getState().roomTechoFormasCelda[id]?.[kVieja]
    if (cfVieja) {
      await useDiseño.getState().setRoomTechoCeldaForma(id, claveCeldaOff(nueva.col, nueva.row), cfVieja)
      await useDiseño.getState().setRoomTechoCeldaForma(id, kVieja, null)
    }
  },

  contraerCeldaCuarto: async (id, abs) => {
    const { cells, footprints, formasCelda, wallOverrides, edgeStyles } = get()
    const anchor = cells[id]
    if (!anchor) return
    const fp = fpDe(footprints, id)
    if (fp.length <= 1) return get().removeRoomCell(id, abs)
    const off = { col: abs.col - anchor.col, row: abs.row - anchor.row }
    const resto = fp.filter((c) => !(c.col === off.col && c.row === off.row))
    // Sin cambio real o partiría el cuarto: que decida removeRoomCell (no hará nada).
    if (resto.length === fp.length || !conexo(resto)) return get().removeRoomCell(id, abs)

    const formas = formasCelda[id]
    if (formas) {
      const quedan = new Set(resto.map((c) => cellId(c.col, c.row)))
      // Celda vecina que queda: al retirarse `abs`, ella pasa a ser el borde exterior.
      let destino: { off: Cell; dc: number; dr: number } | null = null
      for (const s of SIDE_KEYS) {
        const v = { col: off.col + DELTA[s].col, row: off.row + DELTA[s].row }
        if (!quedan.has(cellId(v.col, v.row))) continue
        destino = { off: v, dc: off.col - v.col, dr: off.row - v.row }
        break
      }
      if (destino) {
        const roomFormas = { ...formas }
        // Aristas virtuales (color/textura/puerta) del recorte fino que retrocede: sin
        // esto quedan huérfanas en la clave vieja y la esquina que queda nace sin estilo.
        const ov = { ...(wallOverrides[id] ?? {}) }
        const est = { ...(edgeStyles[id] ?? {}) }
        let movioAristas = false
        const migrarAristasSubcelda = (viejaC: Cell, nuevaC: Cell, i: number) => {
          const baseVieja = claveSubceldaOff(viejaC.col, viejaC.row, i)
          const baseNueva = claveSubceldaOff(nuevaC.col, nuevaC.row, i)
          for (const s of SIDE_KEYS) {
            const kVieja = `${baseVieja},${s}`
            const kNueva = `${baseNueva},${s}`
            if (ov[kVieja] !== undefined) {
              ov[kNueva] = ov[kVieja]
              delete ov[kVieja]
              movioAristas = true
            }
            if (est[kVieja] !== undefined) {
              est[kNueva] = est[kVieja]
              delete est[kVieja]
              movioAristas = true
            }
          }
        }
        let movio = false
        const fEntera = formas[claveCeldaOff(off.col, off.row)]
        if (fEntera && !esFormaCuadrada(fEntera)) {
          // La silueta retrocede entera a la vecina.
          roomFormas[claveCeldaOff(destino.off.col, destino.off.row)] = fEntera
          movio = true
          // Forma entera: su estilo vive en UNA arista real representativa (no en claves
          // de cuadrante), la misma que usa MurosPerimetroFormaCuarto.
          const per = perimetroFormaCelda(fEntera, 0, 0)
          const ladoRep = per ? SIDE_KEYS.find((s) => !per.lados.has(s)) : undefined
          if (ladoRep) {
            const kVieja = edgeKey(off, ladoRep)
            const kNueva = edgeKey(destino.off, ladoRep)
            if (ov[kVieja] !== undefined) {
              ov[kNueva] = ov[kVieja]
              delete ov[kVieja]
              movioAristas = true
            }
            if (est[kVieja] !== undefined) {
              est[kNueva] = est[kVieja]
              delete est[kVieja]
              movioAristas = true
            }
          }
        } else {
          // Solo las esquinas del borde exterior (las que avanzaron al expandir) regresan
          // al mismo cuadrante de la vecina, restaurando la figura original.
          for (const i of cuadrantesDelLado(destino.dc, destino.dr)) {
            const f = formas[claveSubceldaOff(off.col, off.row, i)]
            if (!f || esFormaCuadrada(f)) continue
            roomFormas[claveSubceldaOff(destino.off.col, destino.off.row, i)] = f
            movio = true
            migrarAristasSubcelda(off, destino.off, i)
          }
        }
        // Se aplica antes de quitar: removeRoomCell descarta las claves de la celda que se va.
        if (movio) {
          if (movioAristas) {
            set({
              formasCelda: { ...formasCelda, [id]: roomFormas },
              wallOverrides: { ...wallOverrides, [id]: ov },
              edgeStyles: { ...edgeStyles, [id]: est },
            })
          } else {
            set({ formasCelda: { ...formasCelda, [id]: roomFormas } })
          }
          // El techo retrocede con su silueta; el de la celda que se va lo descarta removeRoomCell.
          const { useDiseño } = await import('./disenoStore')
          const cfOff = useDiseño.getState().roomTechoFormasCelda[id]?.[claveCeldaOff(off.col, off.row)]
          if (cfOff)
            await useDiseño
              .getState()
              .setRoomTechoCeldaForma(id, claveCeldaOff(destino.off.col, destino.off.row), cfOff)
        }
      }
    }
    await get().removeRoomCell(id, abs)
  },

  removeRoomCell: async (id, abs) => {
    const { cells, footprints, wallOverrides, edgeStyles } = get()
    const anchor = cells[id]
    if (!anchor) return
    const fp = fpDe(footprints, id)
    if (fp.length <= 1) return
    const off = { col: abs.col - anchor.col, row: abs.row - anchor.row }
    const resto = fp.filter((c) => !(c.col === off.col && c.row === off.row))
    if (resto.length === fp.length) return // no era propia
    if (!conexo(resto)) return // dejaría el cuarto partido
    const ov = { ...(wallOverrides[id] ?? {}) }
    const est = { ...(edgeStyles[id] ?? {}) }
    for (const s of SIDE_KEYS) {
      delete ov[edgeKey(off, s)]
      delete est[edgeKey(off, s)]
    }
    const norm = normalizarForma(anchor, resto, ov, est)
    const formasPrev = get().formasCelda[id]
    const formasNuevas = remapearFormasOffTrasAncla(
      formasPrev,
      anchor,
      fp,
      norm.anchor,
      norm.fp,
    )
    const newCells = { ...cells, [id]: norm.anchor }
    const newFps = { ...footprints, [id]: norm.fp }
    const newOv = { ...wallOverrides, [id]: norm.ov }
    const newEst = { ...edgeStyles, [id]: norm.estilos }
    const formasCelda = { ...get().formasCelda }
    if (formasNuevas !== undefined) formasCelda[id] = formasNuevas
    else delete formasCelda[id]
    set({
      cells: newCells,
      footprints: newFps,
      wallOverrides: newOv,
      edgeStyles: newEst,
      formasCelda,
      ...recompute({ ...get(), cells: newCells, footprints: newFps, wallOverrides: newOv, formasCelda }),
    })
    await upsert(id, {
      col: norm.anchor.col,
      row: norm.anchor.row,
      footprint: norm.fp,
      muros: norm.ov,
      estilos: norm.estilos,
      ...(formasNuevas !== undefined ? { formasCelda: formasNuevas } : { formasCelda: undefined }),
    })
    // Sigue a su celda al reanclar; la celda quitada pierde su techo.
    const { useDiseño } = await import('./disenoStore')
    await useDiseño.getState().remapearTechoCeldas(id, anchor, fp, norm.anchor, norm.fp)
  },

  cycleEdge: async (id, off, side) => {
    const orden: WallState[] = ['pared', 'puerta', 'abierto']
    const { cells, footprints, ocupadoPorNivel, niveles, wallOverrides } = get()
    const occ = ocupadoPorNivel.get(nivelDe(niveles, id)) ?? SIN_OCUPACION
    const e = roomEdges(cells[id], fpDe(footprints, id), occ).find(
      (x) => x.off.col === off.col && x.off.row === off.row && x.side === side,
    )
    if (!e) return
    const key = edgeKey(off, side)
    const actual = wallOverrides[id]?.[key] ?? e.auto
    const siguiente = orden[(orden.indexOf(actual) + 1) % orden.length]
    const muros: WallOverrides = { ...(wallOverrides[id] ?? {}), [key]: siguiente }
    const nuevos = { ...wallOverrides, [id]: muros }
    set({ wallOverrides: nuevos, ...recompute({ ...get(), wallOverrides: nuevos }) })
    await upsert(id, { muros })
  },

  paintEdge: async (id, off, side, estado) => {
    const { cells, footprints, ocupadoPorNivel, niveles, wallOverrides, edgeStyles, pinceles } = get()
    // Arista VIRTUAL de un recorte fino (off = centro del cuadrante): válida si el
    // cuadrante tiene subforma; no existe en roomEdges.
    if (!Number.isInteger(off.col) || !Number.isInteger(off.row)) {
      const f = get().formasCelda[id]?.[claveCeldaOff(off.col, off.row)]
      if (!f || esFormaCuadrada(f)) return
    } else {
      const occ = ocupadoPorNivel.get(nivelDe(niveles, id)) ?? SIN_OCUPACION
      const e = roomEdges(cells[id], fpDe(footprints, id), occ).find(
        (x) => x.off.col === off.col && x.off.row === off.row && x.side === side,
      )
      if (!e) return
    }
    const key = edgeKey(off, side)
    const pin = pinceles[id] ?? PINCELES_DEFAULT
    const muros: WallOverrides = { ...(wallOverrides[id] ?? {}), [key]: estado }
    // Conserva la configuración existente del borde; solo siembra defaults si falta.
    const estRoom = { ...(edgeStyles[id] ?? {}) }
    const prev = estRoom[key] ?? {}
    estRoom[key] = {
      ...prev,
      muro: prev.muro ?? { ...pin.muro },
      ...(estado === 'puerta' ? { puerta: prev.puerta ?? { ...pin.puerta } } : {}),
    }
    const nuevosOv = { ...wallOverrides, [id]: muros }
    const nuevosEst = { ...edgeStyles, [id]: estRoom }
    set({
      wallOverrides: nuevosOv,
      edgeStyles: nuevosEst,
      ...recompute({ ...get(), wallOverrides: nuevosOv }),
    })
    await upsert(id, { muros, estilos: estRoom })
  },

  setEdgeEstilo: async (id, off, side, patch) => {
    const { edgeStyles, pinceles } = get()
    // Base = pincel actual del cuarto (no el default genérico): así la primera edición de
    // una sola propiedad (p.ej. subir el Alto) no resetea color/textura ya pintados.
    const pin = pinceles[id] ?? PINCELES_DEFAULT
    const key = edgeKey(off, side)
    const estRoom = { ...(edgeStyles[id] ?? {}) }
    const prev = estRoom[key] ?? {}
    estRoom[key] = {
      ...prev,
      ...(patch.muro
        ? { muro: { ...pin.muro, ...prev.muro, ...patch.muro } }
        : {}),
      ...(patch.puerta
        ? { puerta: { ...pin.puerta, ...prev.puerta, ...patch.puerta } }
        : {}),
    }
    const nuevos = { ...edgeStyles, [id]: estRoom }
    set({ edgeStyles: nuevos, ...recompute({ ...get(), edgeStyles: nuevos }) })
    await upsert(id, { estilos: estRoom })
  },

  setPinceles: async (id, p) => {
    const nuevos = { ...get().pinceles, [id]: p }
    set({ pinceles: nuevos })
    await upsert(id, { pinceles: p })
  },

  setCeldaForma: async (id, offKey, forma, rotacionForzada) => {
    const prevMap = get().formasCelda[id] ?? {}
    const prev = formaEnCelda(prevMap, offKey)
    const next =
      rotacionForzada != null
        ? { forma, rotacion: rotacionForzada }
        : siguienteFormaEnCelda(prev.forma === forma ? prev : undefined, forma)
    const roomFormas = { ...prevMap, [offKey]: next }
    // La forma entera reemplaza los recortes finos de esa celda (no se mezclan).
    const [oc, or] = offKey.split(',').map(Number)
    for (let i = 0; i < SUBQ_OFF.length; i++) delete roomFormas[claveSubceldaOff(oc, or, i)]
    const formasCelda = { ...get().formasCelda, [id]: roomFormas }
    // Recalcula colisiones: una celda con forma cierra sus muros (sin puerta), así
    // chocas contra lo mismo que ves.
    set({ formasCelda, ...recompute({ ...get(), formasCelda }) })
    await upsert(id, { formasCelda: roomFormas })
  },

  pintarSubformaCelda: async (id, offCol, offRow, cuadrante, forma) => {
    const prevMap = get().formasCelda[id] ?? {}
    const clave = claveSubceldaOff(offCol, offRow, cuadrante)
    const prev = prevMap[clave]
    const roomFormas = { ...prevMap }
    if (forma === 'cuadrado') {
      if (!prev) return // nada que quitar
      delete roomFormas[clave]
    } else if (prev?.forma === forma) {
      const rotInicial = rotInicialSubforma(forma, cuadrante)
      const rotFinal = (rotInicial + 270) % 360
      if (prev.rotacion === rotFinal) {
        delete roomFormas[clave] // giro completo: quitar el recorte
      } else {
        roomFormas[clave] = { forma, rotacion: ((prev.rotacion + 90) % 360) as 0 | 90 | 180 | 270 }
      }
    } else {
      roomFormas[clave] = { forma, rotacion: rotInicialSubforma(forma, cuadrante) }
      // El recorte fino reemplaza la forma entera de la celda (no se mezclan).
      const kEntera = claveCeldaOff(offCol, offRow)
      if (roomFormas[kEntera] && !esFormaCuadrada(roomFormas[kEntera])) delete roomFormas[kEntera]
    }
    const formasCelda = { ...get().formasCelda, [id]: roomFormas }
    set({ formasCelda, ...recompute({ ...get(), formasCelda }) })
    await upsert(id, { formasCelda: roomFormas })
  },

  aplicarFormaCuartoTodas: async (id, forma) => {
    const anchor = get().cells[id]
    const fp = get().footprints[id]
    if (!anchor || !fp) return
    const roomFormas: FormasCeldaMap = {}
    if (forma) {
      for (const c of footprintCells(anchor, fp)) {
        roomFormas[claveCeldaOff(c.col - anchor.col, c.row - anchor.row)] = forma
      }
    }
    const formasCelda = { ...get().formasCelda, [id]: roomFormas }
    set({ formasCelda, ...recompute({ ...get(), formasCelda }) })
    await upsert(id, { formasCelda: roomFormas })
  },

  startDrag: (id) => {
    const origen = get().cells[id]
    set({ draggingId: id, previewCell: origen, dragOriginCell: origen })
  },

  setPreview: (cell) => {
    const { draggingId, cells } = get()
    if (!draggingId || !cell) {
      set(
        cell
          ? { previewCell: cell }
          : {
              previewCell: null,
              ...recompute({ ...get() }),
            },
      )
      return
    }
    const anclado = clampAnchor(
      cell,
      fpDe(get().footprints, draggingId),
      get().gridCols,
      get().gridRows,
    )
    const previewCells = { ...cells, [draggingId]: anclado }
    set({
      previewCell: anclado,
      ...recompute({ ...get(), cells: previewCells }),
    })
  },

  endDrag: async () => {
    const {
      draggingId,
      previewCell,
      dragOriginCell,
      placed,
      cells,
      footprints,
      niveles,
    } = get()

    if (draggingId && previewCell) {
      const origen = dragOriginCell ?? cells[draggingId]
      const fp = fpDe(footprints, draggingId)
      const nivel = nivelDe(niveles, draggingId)
      const planosActivo = usePlanos.getState().activo

      if (origen && fp?.length) {
        if (planosActivo) {
          const { finalizarArrastreCuartoRegistro } = await import(
            '../ui/planos/planoCuartoRegistroDrag'
          )
          const { zonasRepo } = await import('../data/repository')
          const zonas = await zonasRepo.list()
          await finalizarArrastreCuartoRegistro({
            roomId: draggingId,
            origen,
            preview: previewCell,
            fp,
            nivel,
            placed,
            cells,
            footprints,
            niveles,
            zonas,
            moveRoom: get().moveRoom,
            setAviso: usePlanos.getState().setAviso,
          })
        } else if (
          esFootprintLibre(
            placed,
            cells,
            footprints,
            niveles,
            draggingId,
            previewCell,
            fp,
            nivel,
          )
        ) {
          await get().moveRoom(draggingId, previewCell)
        }
      }
    }

    set({
      draggingId: null,
      previewCell: null,
      dragOriginCell: null,
      ...recompute({ ...get() }),
    })
  },

  expandGrid: async (dir) => {
    const { gridCols, gridRows, cells } = get()
    let newCols = gridCols
    let newRows = gridRows
    let newCells = cells

    if (dir === 'E' && gridCols < MAX_GRID) {
      newCols = gridCols + 1
    } else if (dir === 'O' && gridCols < MAX_GRID) {
      newCols = gridCols + 1
      newCells = desplazarCeldas(cells, 1, 0)
    } else if (dir === 'S' && gridRows < MAX_GRID) {
      newRows = gridRows + 1
    } else if (dir === 'N' && gridRows < MAX_GRID) {
      newRows = gridRows + 1
      newCells = desplazarCeldas(cells, 0, 1)
    } else {
      return
    }

    setGridDims(newCols, newRows)
    set({
      gridCols: newCols,
      gridRows: newRows,
      cells: newCells,
      ...recompute({ ...get(), cells: newCells }),
    })
    // La cámara sigue el ½ celda que el contenido se recorre al recentrar la rejilla,
    // para que el borde pulsado crezca en SU dirección y el contenido no salte.
    nudgeFocoPorBorde(dir, +1)
    const { desplazarPisoExteriorTodo, rellenarBordePisoExterior } = await import('../data/repository')
    if (dir === 'O' || dir === 'N') {
      const dc = dir === 'O' ? 1 : 0
      const dr = dir === 'N' ? 1 : 0
      const { useDiseño } = await import('./disenoStore')
      await useDiseño.getState().desplazarTechoExtra(dc, dr)
      // El piso exterior sigue al contenido recentrado para no desalinearse.
      await desplazarPisoExteriorTodo(dc, dr)
    }
    // Las celdas nuevas heredan el piso exterior de la celda contigua (jardín continuo).
    await rellenarBordePisoExterior(dir, newCols, newRows)
    await guardarGridConfig(newCols, newRows)
    if (newCells !== cells)
      await Promise.all(
        losCuartos().map((r) => upsert(r.id, { col: newCells[r.id]?.col, row: newCells[r.id]?.row })),
      )
  },

  contractGrid: async (dir) => {
    const { gridCols, gridRows, placed, cells, footprints } = get()
    const colocados = losCuartos().filter((r) => placed[r.id] && cells[r.id])
    // Bloquea contraer si algún cuarto cae dentro de ½ celda del borde a quitar.
    const tocaBorde = () =>
      colocados.some((r) =>
        footprintCells(cells[r.id], fpDe(footprints, r.id)).some((c) =>
          dir === 'E'
            ? c.col > gridCols - 2
            : dir === 'O'
              ? c.col < 1
              : dir === 'S'
                ? c.row > gridRows - 2
                : c.row < 1,
        ),
      )

    let newCols = gridCols
    let newRows = gridRows
    let newCells = cells

    if (dir === 'E') {
      if (gridCols <= 1 || tocaBorde()) return
      newCols = gridCols - 1
    } else if (dir === 'O') {
      if (gridCols <= 1 || tocaBorde()) return
      newCols = gridCols - 1
      newCells = desplazarCeldas(cells, -1, 0)
    } else if (dir === 'S') {
      if (gridRows <= 1 || tocaBorde()) return
      newRows = gridRows - 1
    } else if (dir === 'N') {
      if (gridRows <= 1 || tocaBorde()) return
      newRows = gridRows - 1
      newCells = desplazarCeldas(cells, 0, -1)
    } else {
      return
    }

    setGridDims(newCols, newRows)
    set({
      gridCols: newCols,
      gridRows: newRows,
      cells: newCells,
      ...recompute({ ...get(), cells: newCells }),
    })
    // Al encoger, el contenido se recorre al lado contrario: la cámara lo sigue (negativo).
    nudgeFocoPorBorde(dir, -1)
    const { useDiseño } = await import('./disenoStore')
    if (dir === 'O' || dir === 'N') {
      await useDiseño.getState().ajustarTechoEnContraccion(dir)
      // El piso exterior sigue al contenido recentrado (igual que al crecer).
      const { desplazarPisoExteriorTodo } = await import('../data/repository')
      await desplazarPisoExteriorTodo(dir === 'O' ? -1 : 0, dir === 'N' ? -1 : 0)
    } else {
      await useDiseño.getState().podarTechoExtra(newCols, newRows)
    }
    await guardarGridConfig(newCols, newRows)
    if (newCells !== cells)
      await Promise.all(
        losCuartos().map((r) => upsert(r.id, { col: newCells[r.id]?.col, row: newCells[r.id]?.row })),
      )
  },

  setTamCeldaMapa: async (m) => {
    const celda = Math.min(TAM_CELDA_MAX, Math.max(TAM_CELDA_MIN, m))
    const anterior = get().tamCelda
    if (celda === anterior) return
    setTamCelda(celda)
    // Colliders, puertas y alturas salen del SIZE activo; la escena se remonta vía
    // el key del Canvas (House) al cambiar tamCelda.
    set({ tamCelda: celda, ...recompute({ ...get() }) })
    // Lo que vive suelto sobre el mapa sigue a la rejilla para conservar su celda.
    const { useDiseño } = await import('./disenoStore')
    await useDiseño.getState().reescalarObjetosMapa(celda / anterior)
    const arr = await db.mapaConfig.toArray()
    if (arr[0]?.id) await db.mapaConfig.update(arr[0].id, { celda })
    else await db.mapaConfig.add({ cols: get().gridCols, rows: get().gridRows, celda })
  },

  agregarCuadrante: async (q) => {
    const cuadrantes = [...get().cuadrantes, q]
    set({ cuadrantes })
    await guardarCuadrantes(cuadrantes, get)
  },
  renombrarCuadrante: async (id, nombre) => {
    const cuadrantes = get().cuadrantes.map((q) => (q.id === id ? { ...q, nombre } : q))
    set({ cuadrantes })
    await guardarCuadrantes(cuadrantes, get)
  },
  eliminarCuadrante: async (id) => {
    const cuadrantes = get().cuadrantes.filter((q) => q.id !== id)
    set({ cuadrantes })
    await guardarCuadrantes(cuadrantes, get)
  },
}))

/**
 * Mueve el foco de la cámara ½ celda para compensar el recentrado de la rejilla al
 * crecer (signo +1) o encoger (-1) por un borde, así el contenido queda fijo en pantalla
 * y la rejilla crece/encoge en la dirección del borde pulsado.
 */
function nudgeFocoPorBorde(dir: DirGrid, signo: 1 | -1) {
  const dz = dir === 'N' ? 0.5 : dir === 'S' ? -0.5 : 0
  const dx = dir === 'O' ? 0.5 : dir === 'E' ? -0.5 : 0
  if (dx === 0 && dz === 0) return
  const f = useCam.getState().focus
  useCam.setState({
    focus: [f[0] + signo * dx * SPACING, f[1], f[2] + signo * dz * SPACING],
  })
}

/** Desplaza todas las celdas ancla del mapa por (dc, dr). */
function desplazarCeldas(cells: Cells, dc: number, dr: number): Cells {
  return Object.fromEntries(
    Object.entries(cells).map(([id, c]) => [id, { col: c.col + dc, row: c.row + dr }]),
  )
}

async function guardarGridConfig(cols: number, rows: number) {
  const arr = await db.mapaConfig.toArray()
  if (arr[0]?.id) await db.mapaConfig.update(arr[0].id, { cols, rows })
  else await db.mapaConfig.add({ cols, rows })
}

async function guardarCuadrantes(cuadrantes: CuadranteMapa[], get: () => LayoutState) {
  const arr = await db.mapaConfig.toArray()
  if (arr[0]?.id) await db.mapaConfig.update(arr[0].id, { cuadrantes })
  else await db.mapaConfig.add({ cols: get().gridCols, rows: get().gridRows, cuadrantes })
}

/** Lado (pared) de la celda que mira hacia el centro de la casa (acceso por defecto). */
function ladoDesdeDoor(col: number, row: number): SideKey {
  const [cx, , cz] = cellToWorld(col, row)
  const { axis, sign } = doorFor([cx, 0, cz])
  return axis === 'x' ? (sign < 0 ? 'O' : 'E') : sign < 0 ? 'N' : 'S'
}

/** Sub-celdas (½) ocupadas por los cuartos colocados de un nivel dado. */
function celdasDeNivel(
  placed: Record<string, boolean>,
  cells: Cells,
  footprints: Footprints,
  niveles: Niveles,
  nivel: number,
): Set<string> {
  const s = new Set<string>()
  for (const r of losCuartos()) {
    if (!placed[r.id] || !cells[r.id] || nivelDe(niveles, r.id) !== nivel) continue
    for (const k of roomSubCells(cells[r.id], fpDe(footprints, r.id))) s.add(k)
  }
  return s
}

/**
 * ¿La forma se apoya en la planta de abajo? Cada celda debe estar sobre la huella
 * inferior o, como mucho, UNA celda en voladizo (ortogonalmente adyacente), para que
 * un piso alto nunca flote desconectado de un cuarto. `lower` son sub-celdas (½).
 */
function tieneSoporte(lower: Set<string>, anchor: Cell, fp: Footprint): boolean {
  for (const off of fp) {
    const col = anchor.col + off.col
    const row = anchor.row + off.row
    const apoyada =
      tileOcupado(lower, col, row) ||
      tileOcupado(lower, col - 1, row) ||
      tileOcupado(lower, col + 1, row) ||
      tileOcupado(lower, col, row - 1) ||
      tileOcupado(lower, col, row + 1)
    if (!apoyada) return false
  }
  return true
}

/**
 * ¿La forma (anclada en `anchor`, en `nivel`) cabe en la rejilla y no se solapa con
 * otro cuarto DEL MISMO NIVEL? Los cuartos de otros niveles no estorban (se apilan).
 * Además, los pisos altos (nivel ≥ 1) deben apoyarse en la planta de abajo (máx. 1
 * celda en voladizo), para no quedar flotando sueltos.
 */
export function esFootprintLibre(
  placed: Record<string, boolean>,
  cells: Cells,
  footprints: Footprints,
  niveles: Niveles,
  exceptId: string,
  anchor: Cell,
  fp: Footprint,
  nivel: number,
): boolean {
  if (!cabeEnRejilla(anchor, fp)) return false
  const ocupadasOtros = new Set<string>()
  for (const r of losCuartos()) {
    if (r.id === exceptId || !placed[r.id] || !cells[r.id]) continue
    if (nivelDe(niveles, r.id) !== nivel) continue
    for (const k of roomSubCells(cells[r.id], fpDe(footprints, r.id))) ocupadasOtros.add(k)
  }
  // Traslape por sub-celda (½): impide solaparse aun a media rejilla.
  const libre = roomSubCells(anchor, fp).every((k) => !ocupadasOtros.has(k))
  if (!libre) return false
  if (nivel > 0) {
    const lower = celdasDeNivel(placed, cells, footprints, niveles, nivel - 1)
    if (!tieneSoporte(lower, anchor, fp)) return false
  }
  return true
}

/** Posición del mundo (centro) de un cuarto, fuera de React. */
export function roomWorldPos(id: string): [number, number, number] {
  return worldOf(useLayout.getState().cells, useLayout.getState().sizes, id)
}

/**
 * ¿Qué cuarto de NIVEL 0 ocupa la posición de mundo (x,z)? Devuelve su id o null.
 * Usa la caja del cuarto (mismo criterio que el clamp del arrastre). Sirve para que
 * un objeto libre soltado sobre un cuarto pase a pertenecer a él.
 */
export function cuartoEnMundo(x: number, z: number): string | null {
  const st = useLayout.getState()
  for (const c of useCuartos.getState().cuartos) {
    if (st.placed[c.id] !== true || nivelDe(st.niveles, c.id) !== 0) continue
    const [cx, , cz] = worldOf(st.cells, st.sizes, c.id)
    const size = st.sizes[c.id] ?? SIZE_DEFAULT
    if (Math.abs(x - cx) <= (size.w * SPACING) / 2 && Math.abs(z - cz) <= (size.h * SPACING) / 2) {
      return c.id
    }
  }
  return null
}

/**
 * Posición del cuarto INCLUYENDO la altura de su nivel: la cámara enfoca y ROTA
 * alrededor de este punto, así un cuarto elevado no se sale del cuadro.
 */
export function roomFocusPos(id: string): [number, number, number] {
  const [x, , z] = roomWorldPos(id)
  const nivel = useLayout.getState().niveles[id] ?? 0
  return [x, nivelBaseY(nivel, !useHouse.getState().explotado), z]
}

/**
 * Centro del bounding-box 3D de TODOS los cuartos colocados (incluyendo niveles).
 * Al abrir "Editar mapa", la cámara se posiciona aquí para encuadrar toda la casa.
 */
export function mapFocusPos(): [number, number, number] {
  const { placed, cells, sizes, niveles } = useLayout.getState()
  const apilado = !useHouse.getState().explotado
  const ids = losCuartos().filter((r) => placed[r.id] && cells[r.id]).map((r) => r.id)
  if (ids.length === 0) return [0, 0, 0]
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  for (const id of ids) {
    const [x, , z] = worldOf(cells, sizes, id)
    const y = nivelBaseY(niveles[id] ?? 0, apilado)
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]
}

async function upsert(
  roomId: string,
  patch: Partial<{
    placed: boolean
    col: number
    row: number
    footprint: Footprint
    nivel: number
    muros: WallOverrides
    estilos: Record<string, EstiloArista>
    pinceles: PincelesCuarto
    formasCelda: FormasCeldaMap
    sinMuros: boolean
    agua: boolean
  }>,
) {
  const fila = await db.layout.where('roomId').equals(roomId).first()
  if (fila?.id) await db.layout.update(fila.id, patch)
  else await db.layout.add({ roomId, placed: true, ...patch })
}

if (import.meta.env.DEV) {
  ;(window as unknown as { useLayout: typeof useLayout }).useLayout = useLayout
}

useLayout.getState().cargar()
