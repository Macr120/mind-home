import { create } from 'zustand'
import { db, type Acceso, type Cuarto } from '../data/db'
import { useCuartos } from './cuartosStore'
import { useCam, ZOOM_DEFAULT } from './cameraStore'
import { useInteractUi } from './interactUiStore'
import { usePlanos } from './planosStore'
import { useHouse } from './houseStore'
import {
  cellId,
  cabeEnRejilla,
  collidersForRoom,
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
  setFlota,
  flotaPara,
  nivelBaseY,
  type TipoAcceso,
  COLS,
  ROWS,
  MAX_GRID,
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
import {
  repararMurosCuartosRegistro,
  repararMurosZonasExistentes,
} from '../house/repararMurosConstruccion'
import {
  formaEnCelda,
  formasAbsAOff,
  remapearFormasOffTrasAncla,
  siguienteFormaEnCelda,
  type FormaLoseta,
  type FormasCeldaMap,
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
}

/**
 * Recalcula cajas (sizes), ocupación POR NIVEL y colliders por nivel de los cuartos
 * colocados. Dos cuartos solo compiten por una celda si están en el MISMO nivel, así
 * que un cuarto de arriba puede apilarse sobre el footprint de otro de abajo.
 */
function recompute({ placed, cells, footprints, niveles, wallOverrides = {}, edgeStyles = {}, pinceles = {} }: RecomputeIn) {
  const colocados = losCuartos().filter((r) => placed[r.id] && cells[r.id])
  const sizes: Sizes = {}
  const ocupadoPorNivel = new Map<number, Set<string>>()
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
    for (const k of roomSubCells(cells[r.id], fp)) occ.add(k)
  }
  setFlota(flotaPara(nBase))
  const wallCollidersByLevel: Record<number, AABB[]> = {}
  const puertasPorNivel = new Map<number, AABB[]>()
  // Altura de techo (la del muro más alto) por celda absoluta, para no permitir
  // extender el techo de un cuarto sobre el de otro con distinta altura.
  const alturaTechoPorNivel = new Map<number, Map<string, number>>()
  for (const r of colocados) {
    const lvl = nivelDe(niveles, r.id)
    const occ = ocupadoPorNivel.get(lvl) ?? SIN_OCUPACION
    const fp = fpDe(footprints, r.id)
    const arr = wallCollidersByLevel[lvl] ?? (wallCollidersByLevel[lvl] = [])
    arr.push(...collidersForRoom(cells[r.id], fp, occ, wallOverrides[r.id], edgeStyles[r.id], pinceles[r.id]))
    const altura = alturaTechoRoom(cells[r.id], fp, occ, wallOverrides[r.id], edgeStyles[r.id], pinceles[r.id])
    let aMap = alturaTechoPorNivel.get(lvl)
    if (!aMap) alturaTechoPorNivel.set(lvl, (aMap = new Map()))
    for (const c of footprintCells(cells[r.id], fp)) aMap.set(cellId(c.col, c.row), altura)
    // Zonas de puerta (hueco): rectángulo del vano + holgura, para no estorbar el paso.
    const [wcx, , wcz] = centroCuarto3D(cells[r.id], fp)
    let pArr = puertasPorNivel.get(lvl)
    if (!pArr) puertasPorNivel.set(lvl, (pArr = []))
    for (const v of roomDoorways(cells[r.id], fp, occ, wallOverrides[r.id], edgeStyles[r.id], pinceles[r.id])) {
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
    wallColliders: wallCollidersByLevel[0] ?? [],
    puertasPorNivel,
    alturaTechoPorNivel,
  }
}

const todos = (v: boolean) =>
  Object.fromEntries(losCuartos().map((r) => [r.id, v])) as Record<string, boolean>

const celdasDefault = (): Cells =>
  Object.fromEntries(losCuartos().map((r) => [r.id, defaultCell([0, 0, 0])]))

const formasDefault = (): Footprints =>
  Object.fromEntries(losCuartos().map((r) => [r.id, [...FOOTPRINT_DEFAULT]]))

const nivelesDefault = (): Niveles => Object.fromEntries(losCuartos().map((r) => [r.id, 0]))

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

type DirGrid = 'N' | 'S' | 'E' | 'O'

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
  editMode: boolean
  editingRoomId: string | null
  /** Ocupación de celdas por nivel (un cuarto se apila sobre otro de distinto nivel). */
  ocupadoPorNivel: Map<number, Set<string>>
  /** Piso caminable por nivel: cuartos del nivel + techos (terraza) del nivel inferior. */
  pisoPorNivel: Map<number, Set<string>>
  /** Colliders de pared por nivel (el personaje usa los de su nivel actual). */
  wallCollidersByLevel: Record<number, AABB[]>
  /** Alias de los colliders del nivel 0 (planta baja). */
  wallColliders: AABB[]
  /** Zonas de puerta (huecos) por nivel: los objetos que caen aquí NO estorban el paso. */
  puertasPorNivel: Map<number, AABB[]>
  /** Altura de techo (la del muro más alto) por celda absoluta, por nivel. */
  alturaTechoPorNivel: Map<number, Map<string, number>>
  wallOverrides: Overrides
  edgeStyles: EdgeStyles
  pinceles: PincelesPorCuarto
  /** Forma de loseta por offset de footprint (cuartos del registro). */
  formasCelda: FormasCeldaPorCuarto
  draggingId: string | null
  previewCell: Cell | null
  /** Celda ancla al iniciar el arrastre (para validar zonas bajo el origen). */
  dragOriginCell: Cell | null
  /** Acceso (id) que se arrastra en edición, o null. */
  draggingAcceso: number | null
  /** Celda destino del acceso arrastrado, o null. */
  previewAcceso: Cell | null
  /** Pared (lado) destino del acceso arrastrado, o null. */
  previewLado: SideKey | null
  cargado: boolean
  cargar: () => Promise<void>
  setEditMode: (v: boolean) => void
  editRoom: (id: string | null) => void
  toggleRoom: (id: string) => Promise<void>
  /** Coloca un cuarto NUEVO (recién creado) en la primera celda libre de planta baja. */
  colocarCuartoNuevo: (id: string) => Promise<void>
  /** Retira por completo un cuarto eliminado: estado + filas de layout/diseño/objetos. */
  quitarCuarto: (id: string) => Promise<void>
  /** Coloca un cuarto en planta baja (nivel 0). */
  addRoomGround: (id: string) => Promise<void>
  /** Coloca un cuarto ENCIMA de otro (apila 1:1). Si crea un nivel nuevo, define su acceso. */
  addRoomOnTop: (id: string, baseRoomId: string, tipoAcceso?: TipoAcceso) => Promise<void>
  /** Crea el acceso de un nivel (uno por nivel). */
  addAcceso: (nivel: number, tipo: TipoAcceso, col: number, row: number, lado: SideKey) => Promise<void>
  /** ¿Hay al menos un cuarto en planta baja? (requisito para apilar). */
  hayPlantaBaja: () => boolean
  /** Cuartos colocados que aún no tienen otro directamente encima (candidatos para apilar). */
  basesDisponibles: () => Cuarto[]
  /** ¿El nivel ya tiene acceso? (para no volver a preguntar el tipo). */
  nivelTieneAcceso: (nivel: number) => boolean
  /** Inicia el arrastre de un acceso (en edición). */
  startAccesoDrag: (id: number) => void
  /** Fija la celda y la pared destino del acceso arrastrado. */
  setAccesoPreview: (cell: Cell | null, lado: SideKey | null) => void
  /** Suelta el acceso: lo reubica si hay celda/pared válida. */
  endAccesoDrag: () => Promise<void>
  /** Reubica un acceso a una pared (lado) de una celda de un cuarto de su nivel:
   *  abre ese muro y cierra el anterior. */
  moveAcceso: (id: number, cell: Cell, lado: SideKey) => Promise<void>
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
  /** Forma de una celda del cuarto (offset en footprint). Doble aplicación rota. */
  setCeldaForma: (id: string, offKey: string, forma: FormaLoseta) => Promise<void>
  startDrag: (id: string) => void
  setPreview: (cell: Cell | null) => void
  endDrag: () => Promise<void>
  expandGrid: (dir: DirGrid) => Promise<void>
  contractGrid: (dir: DirGrid) => Promise<void>
}

export const useLayout = create<LayoutState>((set, get) => ({
  placed: todos(true),
  cells: celdasDefault(),
  footprints: formasDefault(),
  niveles: nivelesDefault(),
  accesos: [],
  gridCols: COLS,
  gridRows: ROWS,
  editMode: false,
  editingRoomId: null,
  wallOverrides: {},
  edgeStyles: {},
  pinceles: {},
  formasCelda: {},
  draggingId: null,
  previewCell: null,
  dragOriginCell: null,
  draggingAcceso: null,
  previewAcceso: null,
  previewLado: null,
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
    setGridDims(gridCols, gridRows)

    const placed: Record<string, boolean> = {}
    const cells = celdasDefault()
    const footprints = formasDefault()
    const niveles = nivelesDefault()
    const wallOverrides: Overrides = {}
    const edgeStyles: EdgeStyles = {}
    const pinceles: PincelesPorCuarto = {}
    const formasCelda: FormasCeldaPorCuarto = {}
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
      if (f?.formasCelda) formasCelda[r.id] = f.formasCelda
    }
    // Reparación: cada acceso debe tener ABIERTO el muro de su lado tanto en el cuarto
    // superior como en el inferior (accesos viejos no abrían el de abajo → bloqueaban
    // al bajar). Idempotente: solo persiste los cuartos que realmente cambian.
    const reparados = new Set<string>()
    for (const a of accesos) {
      const lado: SideKey = a.lado ?? ladoDesdeDoor(a.col, a.row)
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
        const key = edgeKey(off, lado)
        if (wallOverrides[r.id]?.[key] === 'abierto') continue
        wallOverrides[r.id] = { ...(wallOverrides[r.id] ?? {}), [key]: 'abierto' }
        reparados.add(r.id)
      }
    }
    for (const rid of reparados) await upsert(rid, { muros: wallOverrides[rid] })

    const zonas = await db.zonas.toArray()
    // Migración única: retirar "zonas sombra" (ZonaPlano con roomId). Su geometría pasa al
    // cuarto del registro (footprint/muros/losetas) y la zona se elimina, dejando el footprint
    // como única fuente de verdad de la forma. Idempotente: tras correr no quedan sombras.
    const sombras = zonas.filter(
      (z) => z.roomId && z.id != null && losCuartos().some((r) => r.id === z.roomId),
    )
    let zonasVigentes = zonas
    if (sombras.length) {
      const { zonaAnchorFootprint } = await import('../house/planoGeometria')
      const { murosEfectivosZona } = await import('../house/murosZona')
      zonasVigentes = zonas.filter((z) => !z.roomId)
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
      }
      // Ocupación con los footprints ya migrados → distingue fachada de muro interior.
      const occMig = recompute({
        placed, cells, footprints, niveles, wallOverrides, edgeStyles, pinceles,
      }).ocupadoPorNivel
      for (const z of sombras) {
        const rid = z.roomId!
        wallOverrides[rid] = murosEfectivosZona(z, zonasVigentes, occMig.get(z.nivel) ?? new Set<string>())
        edgeStyles[rid] = {}
        await upsert(rid, {
          placed: true,
          col: cells[rid].col,
          row: cells[rid].row,
          footprint: footprints[rid],
          nivel: z.nivel,
          muros: wallOverrides[rid],
          estilos: {},
          formasCelda: formasCelda[rid],
        })
        await db.zonas.delete(z.id!)
      }
    }
    const pre = recompute({ placed, cells, footprints, niveles, wallOverrides, edgeStyles, pinceles })
    await repararMurosZonasExistentes(pre.ocupadoPorNivel)
    const { wallOverrides: ovReparados, cambiados } = repararMurosCuartosRegistro({
      placed,
      cells,
      footprints,
      niveles,
      wallOverrides,
      ocupadoPorNivel: pre.ocupadoPorNivel,
      zonas: zonasVigentes,
    })
    for (const rid of cambiados) await upsert(rid, { muros: ovReparados[rid] })

    set({
      placed,
      cells,
      footprints,
      niveles,
      accesos,
      gridCols,
      gridRows,
      wallOverrides: ovReparados,
      edgeStyles,
      pinceles,
      formasCelda,
      ...recompute({ placed, cells, footprints, niveles, wallOverrides: ovReparados, edgeStyles, pinceles }),
      cargado: true,
    })
  },

  setEditMode: (v) => {
    if (v) {
      useInteractUi.getState().clear()
      // Forzar iso antes de activar el modo edición (la edición asume cámara ortográfica).
      useCam.getState().setVista('iso')
    } else {
      usePlanos.getState().setActivo(false)
    }
    const editingAntes = get().editingRoomId
    set({
      editMode: v,
      draggingId: null,
      previewCell: null,
      editingRoomId: v ? editingAntes : null,
    })
    if (v && !editingAntes) {
      // Centrar la cámara en toda la casa (todos los niveles).
      useCam.setState({ focus: mapFocusPos(), zoom: ZOOM_DEFAULT })
    } else if (!v) {
      useCam.getState().reset()
    }
  },

  editRoom: (id) => {
    // Forzar iso antes de editar (evita que la cámara perspectiva quede activa durante edición).
    useCam.getState().setVista('iso')
    const saliaDeCuarto = get().editingRoomId != null && id == null
    set({ editMode: true, editingRoomId: id, draggingId: null, previewCell: null })
    if (id) useCam.getState().focusRoomEdit(roomFocusPos(id))
    else if (saliaDeCuarto) useCam.getState().reset()
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
    if (quitando && nivel >= 1) {
      // Si era el último cuarto de su nivel, retira el acceso de ese nivel.
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
    // Primera celda libre en planta baja (nivel 0).
    let destino: Cell | null = null
    for (let row = 0; row < gridRows && !destino; row++) {
      for (let col = 0; col < gridCols; col++) {
        const cell = { col, row }
        if (esFootprintLibre(placed, cells, footprints, niveles, id, cell, fp, 0)) {
          destino = cell
          break
        }
      }
    }
    if (!destino) destino = { col: 0, row: 0 }
    const newPlaced = { ...placed, [id]: true }
    const newCells = { ...cells, [id]: destino }
    const newFps = { ...footprints, [id]: fp }
    const newNiveles = { ...niveles, [id]: 0 }
    set({
      placed: newPlaced,
      cells: newCells,
      footprints: newFps,
      niveles: newNiveles,
      ...recompute({ ...get(), placed: newPlaced, cells: newCells, footprints: newFps, niveles: newNiveles }),
    })
    await upsert(id, { placed: true, col: destino.col, row: destino.row, footprint: fp, nivel: 0 })
  },

  quitarCuarto: async (id) => {
    const st = get()
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
    set({
      placed,
      cells,
      footprints,
      niveles,
      wallOverrides,
      edgeStyles,
      pinceles,
      formasCelda,
      editingRoomId: st.editingRoomId === id ? null : st.editingRoomId,
      ...recompute({ placed, cells, footprints, niveles, wallOverrides, edgeStyles, pinceles }),
    })
    const fila = await db.layout.where('roomId').equals(id).first()
    if (fila?.id) await db.layout.delete(fila.id)
    await db.disenoRooms.where('roomId').equals(id).delete()
    await db.objetosCuarto.where('roomId').equals(id).delete()
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
    // Deriva el lado del acceso (pared de ambos cuartos que da al exterior).
    const [cx, , cz] = cellToWorld(base.col, base.row)
    const { axis, sign } = doorFor([cx, 0, cz])
    const ladoAcceso: SideKey = axis === 'x' ? (sign < 0 ? 'O' : 'E') : sign < 0 ? 'N' : 'S'
    // Abre el muro del cuarto NUEVO (superior): el personaje llega por aquí al subir.
    const muros: WallOverrides = { [edgeKey({ col: 0, row: 0 }, ladoAcceso)]: 'abierto' }
    // Abre también el muro del cuarto BASE (inferior): sin esto el personaje queda
    // bloqueado contra la pared cuando intenta salir por el acceso para bajar.
    const murosBase: WallOverrides = {
      ...(get().wallOverrides[baseRoomId] ?? {}),
      [edgeKey({ col: 0, row: 0 }, ladoAcceso)]: 'abierto',
    }
    const wallOverrides = { ...get().wallOverrides, [baseRoomId]: murosBase, [id]: muros }
    set({
      placed,
      cells,
      footprints,
      niveles,
      wallOverrides,
      ...recompute({ ...get(), placed, cells, footprints, niveles, wallOverrides }),
    })
    await upsert(id, { placed: true, col: base.col, row: base.row, footprint: fp, nivel, muros })
    await upsert(baseRoomId, { muros: murosBase })
    if (tipoAcceso && !get().nivelTieneAcceso(nivel)) {
      await get().addAcceso(nivel, tipoAcceso, base.col, base.row, ladoAcceso)
    }
  },

  addAcceso: async (nivel, tipo, col, row, lado) => {
    if (get().nivelTieneAcceso(nivel)) return
    const acceso: Acceso = { nivel, tipo, col, row, lado }
    acceso.id = await db.accesos.add(acceso)
    set({ accesos: [...get().accesos, acceso] })
  },

  startAccesoDrag: (id) => set({ draggingAcceso: id, previewAcceso: null, previewLado: null }),
  setAccesoPreview: (cell, lado) =>
    set((s) =>
      s.previewAcceso?.col === cell?.col && s.previewAcceso?.row === cell?.row && s.previewLado === lado
        ? s
        : { previewAcceso: cell, previewLado: lado },
    ),
  endAccesoDrag: async () => {
    const { draggingAcceso, previewAcceso, previewLado } = get()
    if (draggingAcceso != null && previewAcceso && previewLado)
      await get().moveAcceso(draggingAcceso, previewAcceso, previewLado)
    set({ draggingAcceso: null, previewAcceso: null, previewLado: null })
  },
  moveAcceso: async (id, cell, lado) => {
    const ac = get().accesos.find((a) => a.id === id)
    if (!ac) return
    const nivel = ac.nivel
    const wallOverrides = { ...get().wallOverrides }
    const afectados = new Set<string>()
    // Cierra los muros anteriores en el cuarto SUPERIOR e INFERIOR.
    const ladoViejo = ac.lado ?? ladoDesdeDoor(ac.col, ac.row)
    setMuro(get, wallOverrides, afectados, nivel, { col: ac.col, row: ac.row }, ladoViejo, null)
    setMuro(get, wallOverrides, afectados, nivel - 1, { col: ac.col, row: ac.row }, ladoViejo, null)
    // Abre los muros nuevos en el cuarto SUPERIOR e INFERIOR.
    setMuro(get, wallOverrides, afectados, nivel, cell, lado, 'abierto')
    setMuro(get, wallOverrides, afectados, nivel - 1, cell, lado, 'abierto')
    const accesos = get().accesos.map((a) =>
      a.id === id ? { ...a, col: cell.col, row: cell.row, lado } : a,
    )
    set({ accesos, wallOverrides, ...recompute({ ...get(), wallOverrides }) })
    await db.accesos.update(id, { col: cell.col, row: cell.row, lado })
    for (const rid of afectados) await upsert(rid, { muros: wallOverrides[rid] ?? {} })
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
      const { trasladarPisosInteriores } = await import('../data/repository')
      await trasladarPisosInteriores(
        nivel,
        footprintCells(prev, fp),
        cell.col - prev.col,
        cell.row - prev.row,
      )
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
      ...recompute({ ...get(), placed, cells, footprints, wallOverrides, edgeStyles }),
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
      ...recompute({ ...get(), cells: newCells, footprints: newFps, wallOverrides: newOv }),
    })
    await upsert(id, {
      col: norm.anchor.col,
      row: norm.anchor.row,
      footprint: norm.fp,
      muros: norm.ov,
      estilos: norm.estilos,
      ...(formasNuevas !== undefined ? { formasCelda: formasNuevas } : {}),
    })
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
      ...recompute({ ...get(), cells: newCells, footprints: newFps, wallOverrides: newOv }),
    })
    await upsert(id, {
      col: norm.anchor.col,
      row: norm.anchor.row,
      footprint: norm.fp,
      muros: norm.ov,
      estilos: norm.estilos,
      ...(formasNuevas !== undefined ? { formasCelda: formasNuevas } : { formasCelda: undefined }),
    })
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
    const occ = ocupadoPorNivel.get(nivelDe(niveles, id)) ?? SIN_OCUPACION
    const e = roomEdges(cells[id], fpDe(footprints, id), occ).find(
      (x) => x.off.col === off.col && x.off.row === off.row && x.side === side,
    )
    if (!e) return
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
    const { edgeStyles } = get()
    const key = edgeKey(off, side)
    const estRoom = { ...(edgeStyles[id] ?? {}) }
    const prev = estRoom[key] ?? {}
    estRoom[key] = {
      ...prev,
      ...(patch.muro
        ? { muro: { ...PINCELES_DEFAULT.muro, ...prev.muro, ...patch.muro } }
        : {}),
      ...(patch.puerta
        ? { puerta: { ...PINCELES_DEFAULT.puerta, ...prev.puerta, ...patch.puerta } }
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

  setCeldaForma: async (id, offKey, forma) => {
    const prevMap = get().formasCelda[id] ?? {}
    const prev = formaEnCelda(prevMap, offKey)
    const next = siguienteFormaEnCelda(prev.forma === forma ? prev : undefined, forma)
    const roomFormas = { ...prevMap, [offKey]: next }
    const formasCelda = { ...get().formasCelda, [id]: roomFormas }
    set({ formasCelda })
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
    if (dir === 'O' || dir === 'N') {
      const dc = dir === 'O' ? 1 : 0
      const dr = dir === 'N' ? 1 : 0
      const { useDiseño } = await import('./disenoStore')
      await useDiseño.getState().desplazarTechoExtra(dc, dr)
    }
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
    const { useDiseño } = await import('./disenoStore')
    if (dir === 'O' || dir === 'N') {
      await useDiseño.getState().ajustarTechoEnContraccion(dir)
    } else {
      await useDiseño.getState().podarTechoExtra(newCols, newRows)
    }
    await guardarGridConfig(newCols, newRows)
    if (newCells !== cells)
      await Promise.all(
        losCuartos().map((r) => upsert(r.id, { col: newCells[r.id]?.col, row: newCells[r.id]?.row })),
      )
  },
}))

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

/** Lado (pared) de la celda que mira hacia el centro de la casa (acceso por defecto). */
function ladoDesdeDoor(col: number, row: number): SideKey {
  const [cx, , cz] = cellToWorld(col, row)
  const { axis, sign } = doorFor([cx, 0, cz])
  return axis === 'x' ? (sign < 0 ? 'O' : 'E') : sign < 0 ? 'N' : 'S'
}

/**
 * Abre/cierra el muro de un cuarto (del `nivel` dado) en la celda y lado indicados.
 * `estado=null` quita el override (restaura la pared). Acumula el cuarto afectado y
 * muta `wallOverrides` (clonando por cuarto) para persistir después.
 */
function setMuro(
  get: () => LayoutState,
  wallOverrides: Overrides,
  afectados: Set<string>,
  nivel: number,
  cell: Cell,
  lado: SideKey,
  estado: WallState | null,
) {
  const { placed, cells, footprints, niveles } = get()
  const r = losCuartos().find(
    (rm) =>
      placed[rm.id] &&
      cells[rm.id] &&
      nivelDe(niveles, rm.id) === nivel &&
      footprintCells(cells[rm.id], fpDe(footprints, rm.id)).some(
        (fc) => fc.col === cell.col && fc.row === cell.row,
      ),
  )
  if (!r) return
  const anchor = cells[r.id]
  const off = { col: cell.col - anchor.col, row: cell.row - anchor.row }
  const m = { ...(wallOverrides[r.id] ?? {}) }
  const key = edgeKey(off, lado)
  if (estado == null) delete m[key]
  else m[key] = estado
  wallOverrides[r.id] = m
  afectados.add(r.id)
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
 * Posición del cuarto INCLUYENDO la altura de su nivel: la cámara enfoca y ROTA
 * alrededor de este punto, así un cuarto elevado no se sale del cuadro.
 */
export function roomFocusPos(id: string): [number, number, number] {
  const [x, , z] = roomWorldPos(id)
  const nivel = useLayout.getState().niveles[id] ?? 0
  return [x, nivelBaseY(nivel, useHouse.getState().conTecho), z]
}

/**
 * Centro del bounding-box 3D de TODOS los cuartos colocados (incluyendo niveles).
 * Al abrir "Editar mapa", la cámara se posiciona aquí para encuadrar toda la casa.
 */
export function mapFocusPos(): [number, number, number] {
  const { placed, cells, sizes, niveles } = useLayout.getState()
  const conTecho = useHouse.getState().conTecho
  const ids = losCuartos().filter((r) => placed[r.id] && cells[r.id]).map((r) => r.id)
  if (ids.length === 0) return [0, 0, 0]
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  for (const id of ids) {
    const [x, , z] = worldOf(cells, sizes, id)
    const y = nivelBaseY(niveles[id] ?? 0, conTecho)
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
