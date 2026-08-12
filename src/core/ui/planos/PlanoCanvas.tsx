import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCuartos, getCuarto } from '../../state/cuartosStore'
import { useT } from '../../i18n/useT'
import { useLayout, SIN_OCUPACION } from '../../state/layoutStore'
import { useDiseño } from '../../state/disenoStore'
import { useCiclo } from '../../state/cicloStore'
import { usePlanos, detalleEfectivo } from '../../state/planosStore'
import { VACIO, zonasRepo, pisosExteriorRepo, murosLibresRepo, crearMuroAristaLibre, ciclarMuroFormaLibre, primeraRotMuroForma, setEstiloMuroLibre } from '../../data/repository'
import type { ZonaPlano } from '../../data/db'
import {
  cellId,
  edgeKey,
  footprintCells,
  tileOcupado,
  SIDE_KEYS,
  type Cell,
  type EdgeInfo,
  type SideKey,
} from '../../house/walls'
import {
  PLANO_CELL_PX,
  PLANO_SUB_PX,
  PLANO_PAD,
  viewportPlano,
  areaPlanoPx,
  celdaASvg,
  celdaCentroSvg,
  celdaSnapEnPlano,
  svgACuadrante,
  tilesMediaEnEje,
  celdasOcupadasEnNivel,
  aristasEnNivel,
  coberturaTechoEnNivel,
  aristaASegmento,
  COLOR_ARISTA,
  GROSOR_ARISTA,
  zonaEnCelda,
  cuartoIdEnTile,
  puedeMoverZona,
  puedeMoverCuartoRegistro,
  centroSvgZona,
  centroSvgFootprint,
  zonaAnchorFootprint,
  celdaEsExterior,
  tileRectEnSvg,
  PLANO_TEXTO,
  PLANO_GRID_FUERTE,
  PLANO_GRID_SUAVE,
  PLANO_PAPEL_BORDE,
  aristaMasCercanaEnPlano,
} from '../../house/planoGeometria'
import { objetivoMuroArista, objetivoMuroForma } from '../../house/murosLibre'
import {
  MAPA_SUPERFICIE_ID,
  colorMargenPlanoDesdeCielo,
  rellenoPapelPlano,
} from '../../house/mapaSuperficie'
import { aristasZonasEnNivel } from '../../house/murosZona'
import { celdasEdicionCuarto } from '../../house/roomCellEdicion'
import { aplicarPincelCuarto, aplicarPincelCuartoFino } from '../comun/planoPincelCuarto'
import { useNombreCuarto } from '../roomDisplay'
import { paintZonaMuro } from '../comun/paintZonaMuro'
import { registrarSvgPlano } from '../../house/arrastreCelda'
import {
  lineasExpandiblesTecho,
  lineasRetraiblesTecho,
} from '../../house/techoCeldas'
import { getPisoTipo, esSinPiso, type PisoTipoId } from '../../house/pisos'
import { CUADRANTES_OFF } from '../../house/pisoSubcelda'
import {
  claveCeldaAbs,
  claveCeldaOff,
  formaEnCelda,
  esFormaCuadrada,
  deltaTrasladoAncla,
  trasladarFormasCelda,
  subformasDeCelda,
  offSubcelda,
  rotInicialSubforma,
  type FormasCeldaMap,
} from '../../house/formasLoseta'
import { aplicarFormaEnPlano } from '../comun/planoEditarForma'
import { colorExteriorDefecto } from '../../house/PisosExterior3D'
import { LosetaFormaSvg } from '../comun/LosetaFormaSvg'
import { PerimetroFormaPlanoSvg, TrazoPerimetroSvg } from './PerimetroFormaPlanoSvg'
import {
  ladoGrillaActivo,
  ladoGrillaActivoEnMapa,
  perimetroFormaCelda,
  extrasPerimetroSubformasSvg,
} from '../../house/murosPerimetroLoseta'
import { PlanoPapelRelleno } from './PlanoPapelRelleno'
import { usePlanoViewport } from './usePlanoViewport'
import { usePlanoRotacionCam } from './usePlanoRotacionCam'
import { useCam } from '../../state/cameraStore'
import {
  colorCuadrante,
  colorZona,
  cuadrantePorId,
  cuadrantesAuto,
  esBloqueAuto,
  hayCuadrantes,
  normalizarRect,
} from '../../house/cuadrantesMapa'

/** Croquis SVG ortogonal interactivo (vista en planta). */
export function PlanoCanvas({ onFitRef }: { onFitRef?: (fit: () => void) => void } = {}) {
  const t = useT()
  const svgRef = useRef<SVGSVGElement>(null)
  const rotWrapRef = useRef<HTMLDivElement>(null)

  const setSvgRef = useCallback((node: SVGSVGElement | null) => {
    svgRef.current = node
    registrarSvgPlano(node)
  }, [])

  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const editMode = useLayout((s) => s.editMode)
  const cuartos = useCuartos((s) => s.cuartos)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const wallOverrides = useLayout((s) => s.wallOverrides)
  const edgeStyles = useLayout((s) => s.edgeStyles)
  const draggingId = useLayout((s) => s.draggingId)
  const previewCell = useLayout((s) => s.previewCell)
  const dragOriginCell = useLayout((s) => s.dragOriginCell)
  const startDrag = useLayout((s) => s.startDrag)
  const paintEdge = useLayout((s) => s.paintEdge)
  const setEdgeEstilo = useLayout((s) => s.setEdgeEstilo)
  const eliminarCuarto = useCuartos((s) => s.eliminar)
  const formasCeldaLayout = useLayout((s) => s.formasCelda)
  const expandirCeldaCuarto = useLayout((s) => s.expandirCeldaCuarto)
  const contraerCeldaCuarto = useLayout((s) => s.contraerCeldaCuarto)

  const roomColors = useDiseño((s) => s.roomColors)
  const nombreCuarto = useNombreCuarto()
  const roomPisoTipos = useDiseño((s) => s.roomPisoTipos)
  const roomPisoColors = useDiseño((s) => s.roomPisoColors)
  const roomTechoExtra = useDiseño((s) => s.roomTechoExtra)
  const mapaSuperficie = useDiseño((s) => s.mapaSuperficie)
  const fondoId = useDiseño((s) => s.fondoId)
  const fondoColorFijo = useDiseño((s) => s.fondoColorFijo)
  const fondoImagenActivo = useDiseño((s) => s.fondoImagenActivo)
  const temaGlobal = useDiseño((s) => s.temaGlobal)
  const mapaImagenUrl = useDiseño((s) => s.roomPisoImagenes[MAPA_SUPERFICIE_ID])
  const mapaImagenActiva = useDiseño((s) => s.roomPisoImagenActiva[MAPA_SUPERFICIE_ID] ?? false)
  const minutos = useCiclo((s) => s.minutos)
  const addTechoLinea = useDiseño((s) => s.addTechoLinea)
  const removeTechoLinea = useDiseño((s) => s.removeTechoLinea)

  const nivel = usePlanos((s) => s.nivel)
  const capa = usePlanos((s) => s.capa)
  const modo = usePlanos((s) => s.modo)
  // Efectivo: fuera de Cuartos y Piso exterior el croquis dibuja siempre la rejilla normal.
  const detalleRejilla = usePlanos(detalleEfectivo)
  const herramienta = usePlanos((s) => s.herramienta)
  const formaLoseta = usePlanos((s) => s.formaLoseta)
  const pincelForma = usePlanos((s) => s.pincelForma)
  const formaMuro = usePlanos((s) => s.formaMuro)
  const orientMuro = usePlanos((s) => s.orientMuro)
  const rotForma = usePlanos((s) => s.rotForma)
  const muroHover = usePlanos((s) => s.muroHover)
  const setMuroHover = usePlanos((s) => s.setMuroHover)
  const muroLibreSel = usePlanos((s) => s.muroLibreSel)
  const setMuroLibreSel = usePlanos((s) => s.setMuroLibreSel)
  const seleccion = usePlanos((s) => s.seleccion)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const toggleCeldaExterior = usePlanos((s) => s.toggleCeldaExterior)
  const setAviso = usePlanos((s) => s.setAviso)
  const draggingZonaId = usePlanos((s) => s.draggingZonaId)
  const previewZonaCeldas = usePlanos((s) => s.previewZonaCeldas)
  const zonaDragOrigen = usePlanos((s) => s.zonaDragOrigen)
  const setZonaDragPreview = usePlanos((s) => s.setZonaDragPreview)

  const zonas = zonasRepo.useAll() ?? VACIO
  const pisosExterior = pisosExteriorRepo.useAll() ?? VACIO
  const murosLibres = murosLibresRepo.useAll() ?? VACIO
  const murosLibresNivel = murosLibres.filter((m) => m.nivel === nivel)

  // Pincel de forma + rejilla fina: el clic recorta CUADRANTES (esquinas finas) de un
  // cuarto; las losetas dejan pasar el puntero para que el fondo resuelva el cuadrante.
  const pincelFino = capa === 'cuartos' && !!pincelForma && detalleRejilla === 'subcelda'

  const vp = useMemo(() => viewportPlano(gridCols, gridRows), [gridCols, gridRows])
  const areaPx = useMemo(() => areaPlanoPx(gridCols, gridRows), [gridCols, gridRows])
  const fondoMargen = useMemo(
    () => colorMargenPlanoDesdeCielo({ fondoId, fondoColorFijo, fondoImagenActivo, temaGlobal, minutos }),
    [fondoId, fondoColorFijo, fondoImagenActivo, temaGlobal, minutos],
  )
  const rellenoPapel = useMemo(
    () => rellenoPapelPlano(mapaSuperficie, mapaImagenActiva ? mapaImagenUrl : undefined),
    [mapaSuperficie, mapaImagenActiva, mapaImagenUrl],
  )
  const gridFuerte = mapaSuperficie.rejillaFuerte || PLANO_GRID_FUERTE
  const gridSuave = mapaSuperficie.rejillaSuave || PLANO_GRID_SUAVE
  const bordePapel = mapaSuperficie.papelBorde || PLANO_PAPEL_BORDE

  // Editando un cuarto: el croquis encaja/zoom sobre su footprint (coords SVG del plano).
  const focoCuarto = useMemo(() => {
    if (!editingRoomId) return null
    const anchor = cells[editingRoomId]
    const fp = footprints[editingRoomId]
    if (!anchor || !fp?.length) return null
    if ((niveles[editingRoomId] ?? 0) !== nivel) return null
    let minC = Infinity, minR = Infinity, maxC = -Infinity, maxR = -Infinity
    for (const c of footprintCells(anchor, fp)) {
      minC = Math.min(minC, c.col); minR = Math.min(minR, c.row)
      maxC = Math.max(maxC, c.col); maxR = Math.max(maxR, c.row)
    }
    const tl = celdaASvg(minC, minR)
    const br = celdaASvg(maxC + 1, maxR + 1)
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y }
  }, [editingRoomId, cells, footprints, niveles, nivel])

  // ── Cuadrantes del mapa: bloques de referencia (A1…) y zonas dibujadas ────────
  const cuadrantesPropios = useLayout((s) => s.cuadrantes)
  const agregarCuadrante = useLayout((s) => s.agregarCuadrante)
  const cuadranteActivo = usePlanos((s) => s.cuadranteActivo)
  const dibujandoCuadrante = usePlanos((s) => s.dibujandoCuadrante)
  const setDibujandoCuadrante = usePlanos((s) => s.setDibujandoCuadrante)
  const [rectCuadrante, setRectCuadrante] = useState<{ a: Cell; b: Cell } | null>(null)

  /** Contornos a dibujar: en Grid todos, en el resto de modos solo el activo (sin ruido). */
  const cuadrantesVisibles = useMemo(() => {
    if (!hayCuadrantes(gridCols, gridRows)) return []
    if (modo !== 'grid') {
      const q = cuadrantePorId(cuadranteActivo, gridCols, gridRows, cuadrantesPropios)
      return q ? [q] : []
    }
    return [...cuadrantesAuto(gridCols, gridRows), ...cuadrantesPropios]
  }, [modo, gridCols, gridRows, cuadrantesPropios, cuadranteActivo])

  /**
   * Zona de TRABAJO: fuera de ella el croquis queda velado y sordo a los clics. Mismas
   * condiciones que `zonaEdicionActiva()` (que aplica el bloqueo en 3D), pero reactivas.
   */
  const zonaEdicion = useMemo(
    () =>
      !editMode || modo === 'grid'
        ? null
        : (cuadrantesPropios.find((q) => q.id === cuadranteActivo) ?? null),
    [editMode, modo, cuadranteActivo, cuadrantesPropios],
  )

  // El croquis se encaja en el cuadrante elegido para poder editarlo de cerca; editar un
  // cuarto concreto manda sobre él por ser más específico.
  const focoCuadrante = useMemo(() => {
    const q = cuadrantePorId(cuadranteActivo, gridCols, gridRows, cuadrantesPropios)
    if (!q) return null
    const tl = celdaASvg(q.col, q.row)
    const br = celdaASvg(q.col + q.cols, q.row + q.rows)
    return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y }
  }, [cuadranteActivo, gridCols, gridRows, cuadrantesPropios])
  const foco = focoCuarto ?? focoCuadrante

  const {
    containerRef,
    mergeSvgRef,
    fitToContainer,
    cursorPan,
    viewBoxStr,
  } = usePlanoViewport(vp.ancho, vp.alto, foco)

  const svgRefCombinado = useCallback(
    (node: SVGSVGElement | null) => {
      setSvgRef(node)
      mergeSvgRef(node)
    },
    [setSvgRef, mergeSvgRef],
  )

  useEffect(() => {
    onFitRef?.(fitToContainer)
  }, [onFitRef, fitToContainer])

  const vistaIso = useCam((s) => s.vista === 'iso')
  usePlanoRotacionCam(rotWrapRef, vistaIso)

  const anchorDe = useCallback(
    (id: string) => {
      if (draggingId === id && previewCell) return previewCell
      return cells[id]
    },
    [cells, draggingId, previewCell],
  )

  /** Celdas ancla con preview de arrastre (ocupación y aristas en sync). */
  const cellsEfectivos = useMemo(() => {
    if (!draggingId || !previewCell) return cells
    return { ...cells, [draggingId]: previewCell }
  }, [cells, draggingId, previewCell])

  const ocupadoMap = useMemo(
    () => celdasOcupadasEnNivel(nivel, placed, cellsEfectivos, footprints, niveles),
    [nivel, placed, cellsEfectivos, footprints, niveles],
  )

  const aristas = useMemo(
    () =>
      aristasEnNivel(
        nivel,
        placed,
        cellsEfectivos,
        footprints,
        niveles,
        ocupadoPorNivel,
        wallOverrides,
      ),
    [nivel, placed, cellsEfectivos, footprints, niveles, ocupadoPorNivel, wallOverrides],
  )

  const aristasZonas = useMemo(() => {
    const occ = ocupadoPorNivel.get(nivel) ?? SIN_OCUPACION
    return aristasZonasEnNivel(nivel, zonas, occ)
  }, [nivel, zonas, ocupadoPorNivel])

  const techos = useMemo(
    () => coberturaTechoEnNivel(nivel, placed, cellsEfectivos, footprints, niveles, roomTechoExtra),
    [nivel, placed, cellsEfectivos, footprints, niveles, roomTechoExtra],
  )

  const zonasNivel = useMemo(() => zonas.filter((z) => z.nivel === nivel), [zonas, nivel])
  // Ya no existen "zonas sombra" (cuartos con app): todas las zonas del nivel se dibujan.
  const zonasPlanoRender = zonasNivel

  const cuartosNivel = useMemo(
    () => cuartos.filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === nivel),
    [cuartos, placed, niveles, nivel],
  )

  const idsCuartosNivel = useMemo(() => cuartosNivel.map((r) => r.id), [cuartosNivel])

  // Nivel de contexto tenue: en un piso alto, el de abajo (solo se construye encima);
  // en el sótano, la planta baja (para ubicar la excavación respecto a la casa).
  const cuartosNivelInferior = useMemo(() => {
    const nivelContexto = nivel > 0 ? nivel - 1 : nivel < 0 ? 0 : null
    if (nivelContexto == null) return []
    return cuartos.filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === nivelContexto)
  }, [nivel, cuartos, placed, niveles])

  // Aristas colocables para muro libre (modo Muros · cuadrado): TODOS los bordes de la
  // rejilla (muros rectos independientes). Cada arista = (orient, col, row) de esquina.
  const muroModo = capa === 'paredes' && herramienta === 'muro'
  // En Puertas/Ventanas también se puede tocar un muro libre (para ponerle puerta/ventana).
  const muroLibreClicable = capa === 'paredes'
  /** Clic en un muro libre: lo selecciona y, en Puertas/Ventanas, le crea la abertura al momento. */
  const clicMuroLibre = (id: number | null | undefined) => {
    setMuroLibreSel(id ?? null)
    if (id == null) return
    if (herramienta === 'puerta') void setEstiloMuroLibre(id, { puerta: true, ventana: false })
    else if (herramienta === 'ventana') void setEstiloMuroLibre(id, { ventana: true, puerta: false })
  }
  // La diagonal/arco se selecciona en Puertas/Ventanas (en Muros, el clic en la celda rota).
  const formaMuroSeleccionable = capa === 'paredes' && herramienta !== 'muro'
  const muroAristaMode = muroModo && formaMuro === 'cuadrado'
  // Muro recto: la rejilla del croquis no necesita el detalle fino (los muros van a la
  // celda entera); si venía activo de otro modo (p.ej. Cuartos), aquí se ignora. El clic se
  // resuelve por proximidad (manejarClickPlano), sin depender de líneas guía visibles.
  const rejillaVisible = muroAristaMode ? 'celda' : detalleRejilla

  // Celdas de cuartos colocados a ½ celda (no enteras): para ofrecerles cuadrantes finos.
  const celdasFinasExtra = useMemo(() => {
    if (detalleRejilla !== 'subcelda') return []
    const m = new Map<string, Cell>()
    for (const room of cuartosNivel) {
      const a = anchorDe(room.id)
      const f = footprints[room.id]
      if (!a || !f) continue
      for (const fc of footprintCells(a, f)) {
        if (!Number.isInteger(fc.col) || !Number.isInteger(fc.row)) m.set(`${fc.col},${fc.row}`, fc)
      }
    }
    return [...m.values()]
  }, [detalleRejilla, cuartosNivel, anchorDe, footprints])

  const pisoExteriorMap = useMemo(() => {
    const m = new Map<string, { tipo: string | null; color: string }>()
    for (const p of pisosExterior) {
      if (p.nivel !== nivel) continue
      const tipo = (p.pisoTipo as string | null | undefined) ?? null
      const conf = tipo && !esSinPiso(tipo) ? getPisoTipo(tipo as PisoTipoId) : null
      m.set(`${p.col},${p.row}`, {
        tipo,
        color: p.pisoColor ?? conf?.color ?? '#3d4450',
      })
    }
    return m
  }, [pisosExterior, nivel])

  const ocupanteEnTile = useCallback(
    (c: Cell) => {
      const roomId = cuartoIdEnTile(c, idsCuartosNivel, cells, footprints, anchorDe)
      if (roomId) return { tipo: 'cuarto' as const, roomId }
      const z = zonaEnCelda(zonas, nivel, c.col, c.row)
      if (z?.id != null) return { tipo: 'zona' as const, zonaId: z.id }
      return null
    },
    [idsCuartosNivel, cells, footprints, anchorDe, zonas, nivel],
  )

  const svgPoint = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const loc = pt.matrixTransform(ctm.inverse())
    return { x: loc.x, y: loc.y }
  }, [])

  const roomEnCelda = useCallback(
    (c: Cell): string | undefined => {
      const occ = ocupadoPorNivel.get(nivel) ?? SIN_OCUPACION
      if (!tileOcupado(occ, c.col, c.row)) return undefined
      return ocupadoMap.get(cellId(c.col, c.row))
    },
    [ocupadoPorNivel, nivel, ocupadoMap],
  )

  const formasCuartoDe = useCallback(
    (roomId: string): FormasCeldaMap | undefined => formasCeldaLayout[roomId],
    [formasCeldaLayout],
  )

  const aristaActivaCuarto = useCallback(
    (roomId: string, offCol: number, offRow: number, lado: import('../../house/walls').SideKey) =>
      // Considera forma entera Y recortes finos: un lado parcialmente consumido oculta la
      // línea entera (las mitades vivas las dibujan los trazos del perímetro fino).
      ladoGrillaActivoEnMapa(formasCuartoDe(roomId), offCol, offRow, lado),
    [formasCuartoDe],
  )

  /**
   * Cuadrante (0..3) bajo esa esquina, para el fantasma fino: relativo a la celda del
   * cuarto que lo contiene o, en espacio libre, a la celda entera (ahí el clic crea).
   */
  const cuadranteEnCuarto = useCallback(
    (q: Cell): number => {
      for (const room of cuartosNivel) {
        const anchor = anchorDe(room.id)
        const f = footprints[room.id]
        if (!anchor || !f) continue
        for (const c of f) {
          const fc = anchor.col + c.col
          const fr = anchor.row + c.row
          if (q.col >= fc && q.col < fc + 1 && q.row >= fr && q.row < fr + 1) {
            return (q.col - fc >= 0.25 ? 1 : 0) + (q.row - fr >= 0.25 ? 2 : 0)
          }
        }
      }
      return (q.col - Math.floor(q.col) >= 0.25 ? 1 : 0) + (q.row - Math.floor(q.row) >= 0.25 ? 2 : 0)
    },
    [cuartosNivel, anchorDe, footprints],
  )

  const onPointerDownCelda = (c: Cell, roomIdHint?: string, zonaIdHint?: number) => {
    if (capa === 'cuartos') {
      // Pincel de forma activo: coloca/altera la celda (crear → rotar → borrar).
      if (pincelForma) {
        // Rejilla fina: la celda llega como esquina de cuadrante (paso ½).
        if (detalleRejilla === 'subcelda') {
          void aplicarPincelCuartoFino({
            col: c.col,
            row: c.row,
            forma: pincelForma,
            nivel,
            placed,
            cells,
            footprints,
            niveles,
            zonas,
            idsCuartosNivel,
            setAviso,
            setSeleccion,
          })
          return
        }
        void aplicarPincelCuarto({
          col: c.col,
          row: c.row,
          forma: pincelForma,
          rotacion: rotForma,
          nivel,
          placed,
          cells,
          footprints,
          niveles,
          zonas,
          idsCuartosNivel,
          setAviso,
          setSeleccion,
          onCuartoCreado: () => usePlanos.getState().setHerramienta('expandir'),
        })
        return
      }
      // Expandir: solo actúan los botones +/− (el clic en el cuerpo no hace nada).
      if (herramienta === 'expandir') return
      if (herramienta === 'mover') {
        const rid =
          roomIdHint ??
          cuartoIdEnTile(c, idsCuartosNivel, cells, footprints, anchorDe)
        if (rid) {
          startDrag(rid)
          setSeleccion({ tipo: 'cuarto', roomId: rid })
          return
        }
        const zid =
          zonaIdHint ??
          (() => {
            const z = zonaEnCelda(zonas, nivel, c.col, c.row)
            return z?.id
          })()
        if (zid != null) {
          const z = zonas.find((x) => x.id === zid)
          if (!z) return
          setZonaDragPreview(zid, z.celdas.map((x) => ({ ...x })))
          setSeleccion({ tipo: 'zona', zonaId: zid })
          return
        }
        return
      }
      if (herramienta === 'borrar') {
        const z = zonaEnCelda(zonas, nivel, c.col, c.row)
        if (z?.id != null) {
          void zonasRepo.remove(z.id)
          setSeleccion(null)
          return
        }
        if (roomIdHint) {
          // Borrar en el plano = eliminar el cuarto (también desaparece del menú lateral).
          void eliminarCuarto(roomIdHint)
          setSeleccion(null)
        }
        return
      }
      if (herramienta === 'editar-forma') {
        const celda = { col: Math.round(c.col), row: Math.round(c.row) }
        void aplicarFormaEnPlano({
          col: celda.col,
          row: celda.row,
          nivel,
          forma: formaLoseta,
          zonas,
          placed,
          cells,
          footprints,
          idsCuartosNivel,
          setAviso,
        })
        return
      }
      const occTile = ocupanteEnTile(c)
      const roomId = roomIdHint ?? (occTile?.tipo === 'cuarto' ? occTile.roomId : undefined)
      if (roomId) setSeleccion({ tipo: 'cuarto', roomId })
      else {
        const z = zonaEnCelda(zonas, nivel, c.col, c.row)
        if (z?.id != null) setSeleccion({ tipo: 'zona', zonaId: z.id })
        else setSeleccion({ tipo: 'celda', col: c.col, row: c.row })
      }
      return
    }

    if (capa === 'pisos') {
      // Piso interior: selecciona el cuarto/zona bajo el cursor (a ½ celda, para caer sobre
      // cuartos colocados a media rejilla). No aplica formas ni toca el exterior.
      if (modo === 'piso-int') {
        const occTile = ocupanteEnTile(c)
        const roomId = roomIdHint ?? (occTile?.tipo === 'cuarto' ? occTile.roomId : undefined)
        if (roomId) {
          setSeleccion({ tipo: 'cuarto', roomId })
          return
        }
        const zid = zonaIdHint ?? zonaEnCelda(zonas, nivel, c.col, c.row)?.id
        if (zid != null) setSeleccion({ tipo: 'zona', zonaId: zid })
        return
      }
      // Piso exterior: es la CAPA de abajo; se pinta en cualquier celda, incluso debajo de un
      // cuarto. Siempre alterna la celda exterior (entera).
      toggleCeldaExterior({ col: Math.round(c.col), row: Math.round(c.row) })
      return
    }

    if (capa === 'techos') {
      const rid = roomEnCelda(c)
      if (rid) setSeleccion({ tipo: 'cuarto', roomId: rid })
      return
    }

    if (capa === 'paredes' && herramienta === 'muro') {
      // El cuadrado (muro recto) se maneja antes, en manejarClickPlano (arista más cercana).
      // Aquí solo llega forma (triángulo/círculo) en celda libre.
      // Celda a ½ (ya llega enganchada desde el snap); se alinea con cuartos a media rejilla.
      const celda = { col: c.col, row: c.row }
      if (
        celdaEsExterior(
          celda.col,
          celda.row,
          nivel,
          idsCuartosNivel,
          cells,
          footprints,
          zonas,
          anchorDe,
        )
      ) {
        const formaSel = formaMuro as 'triangular' | 'circular'
        void ciclarMuroFormaLibre(
          nivel,
          celda.col,
          celda.row,
          formaSel,
          primeraRotMuroForma(formaSel, rotForma),
        ).then((r) => setMuroLibreSel(r?.id ?? null))
      }
      return
    }

    setSeleccion({ tipo: 'celda', col: c.col, row: c.row })
  }

  const onClickArista = (roomId: string, off: Cell, side: (typeof aristas)[0]['edge']['side']) => {
    if (capa !== 'paredes') return
    // En Puertas/Ventanas: el primer clic selecciona la arista para editar; el segundo clic
    // sobre la misma la deselecciona (toggle).
    if (
      (herramienta === 'puerta' || herramienta === 'ventana') &&
      seleccion?.tipo === 'arista' &&
      seleccion.roomId === roomId &&
      edgeKey(seleccion.off, seleccion.side) === edgeKey(off, side)
    ) {
      setSeleccion(null)
      return
    }
    setSeleccion({ tipo: 'arista', roomId, off, side })

    const k = edgeKey(off, side)
    const muro = edgeStyles[roomId]?.[k]?.muro

    // Arista VIRTUAL de un recorte fino (off fraccionario): no existe en `aristas`; se
    // aplica directo (el recorte es un muro sólido propio, sin estado 'abierto').
    const esVirtual = !Number.isInteger(off.col) || !Number.isInteger(off.row)
    if (!esVirtual) {
      const item = aristas.find(
        (a) => a.roomId === roomId && a.edge.off.col === off.col && a.edge.off.row === off.row && a.edge.side === side,
      )
      if (!item) return
      if (herramienta === 'ventana' && item.estado === 'abierto') return
    }

    if (herramienta === 'puerta') {
      void paintEdge(roomId, off, side, 'puerta')
    } else if (herramienta === 'ventana') {
      void setEdgeEstilo(roomId, off, side, { muro: { ventana: true } })
    } else if (herramienta === 'muro') {
      void paintEdge(roomId, off, side, 'pared')
      void setEdgeEstilo(roomId, off, side, {
        muro: {
          ventana: false,
          ...(muro?.tipo === 'ventana' ? { tipo: 'solido' as const } : {}),
        },
      })
    }
  }

  const onClickAristaZona = (
    zonaId: number,
    off: Cell,
    side: (typeof aristasZonas)[0]['edge']['side'],
  ) => {
    if (capa !== 'paredes') return
    setSeleccion({ tipo: 'arista-zona', zonaId, off, side })

    const item = aristasZonas.find(
      (a) =>
        a.zonaId === zonaId &&
        a.edge.off.col === off.col &&
        a.edge.off.row === off.row &&
        a.edge.side === side,
    )
    if (!item) return

    if (herramienta === 'puerta') {
      void paintZonaMuro(zonaId, off, side, 'puerta')
    } else if (herramienta === 'muro') {
      void paintZonaMuro(zonaId, off, side, 'pared')
    } else if (herramienta === 'seleccionar') {
      // solo selección
    }
  }

  const colorArista = (roomId: string, edge: EdgeInfo, estado: (typeof aristas)[0]['estado']) => {
    if (estado === 'puerta') return COLOR_ARISTA.puerta
    if (estado === 'abierto') return COLOR_ARISTA.abierto
    const m = edgeStyles[roomId]?.[edgeKey(edge.off, edge.side)]?.muro
    if (m?.ventana || m?.tipo === 'ventana') return COLOR_ARISTA.abierto
    return COLOR_ARISTA.pared
  }

  const [hoverTecho, setHoverTecho] = useState<string | null>(null)
  const [hoverPisos, setHoverPisos] = useState<Cell | null>(null)
  const [hoverPisoFino, setHoverPisoFino] = useState<Cell | null>(null)
  const [hoverPisoIntRoom, setHoverPisoIntRoom] = useState<string | null>(null)
  const [hoverPincel, setHoverPincel] = useState<Cell | null>(null)

  const lineasTecho = useMemo(() => {
    if (capa !== 'techos' || !seleccion || seleccion.tipo !== 'cuarto') return null
    const roomId = seleccion.roomId
    const anchor = cells[roomId]
    const fp = footprints[roomId]
    if (!anchor || !fp) return null
    const occ = ocupadoPorNivel.get(nivel) ?? SIN_OCUPACION
    const occSup = ocupadoPorNivel.get(nivel + 1)
    const extra = roomTechoExtra[roomId] ?? []
    const alturaMap = new Map<string, number>()
    for (const t of techos) {
      for (const c of t.celdas) alturaMap.set(cellId(c.col, c.row), 1)
    }
    return {
      roomId,
      expand: lineasExpandiblesTecho(
        anchor,
        fp,
        extra,
        gridCols,
        gridRows,
        occ,
        occSup,
        1,
        alturaMap,
      ),
      retract: lineasRetraiblesTecho(anchor, fp, extra),
    }
  }, [
    capa,
    seleccion,
    cells,
    footprints,
    nivel,
    ocupadoPorNivel,
    roomTechoExtra,
    techos,
    gridCols,
    gridRows,
  ])

  const pisoSwatch = (roomId: string) => {
    const tipo = roomPisoTipos[roomId] ?? null
    if (esSinPiso(tipo)) return null
    const p = tipo ? getPisoTipo(tipo as PisoTipoId) : null
    return roomPisoColors[roomId] ?? p?.color ?? '#334155'
  }

  const pisoSwatchZona = (z: ZonaPlano) => {
    const tipo = (z.pisoTipo as string | null | undefined) ?? null
    if (esSinPiso(tipo)) return null
    const p = tipo ? getPisoTipo(tipo as PisoTipoId) : null
    return z.pisoColor ?? p?.color ?? '#a8a29e'
  }

  const exteriorSinPiso = (col: number, row: number) =>
    esSinPiso(pisoExteriorMap.get(`${col},${row}`)?.tipo)

  const pisoSwatchExterior = (col: number, row: number) =>
    pisoExteriorMap.get(`${col},${row}`)?.color ?? colorExteriorDefecto(temaGlobal)

  const capaMover = capa === 'cuartos' && herramienta === 'mover'
  const capaSeleccionPisos = capa === 'pisos' && herramienta === 'seleccionar'

  const celdasVisiblesZona = useCallback(
    (z: (typeof zonasNivel)[0]) => {
      if (draggingZonaId === z.id && previewZonaCeldas.length > 0) return previewZonaCeldas
      return z.celdas
    },
    [draggingZonaId, previewZonaCeldas],
  )

  /** Formas de zona con claves absolutas alineadas a las celdas visibles (incl. preview). */
  const formasZonaEn = useCallback(
    (z: ZonaPlano, celdas: Cell[]): FormasCeldaMap | undefined => {
      if (!z.formasCelda) return z.formasCelda
      if (draggingZonaId !== z.id || previewZonaCeldas.length === 0) return z.formasCelda
      const origen = zonaDragOrigen.length > 0 ? zonaDragOrigen : z.celdas
      const { dc, dr } = deltaTrasladoAncla(origen, celdas)
      if (dc === 0 && dr === 0) return z.formasCelda
      return trasladarFormasCelda(z.formasCelda, dc, dr)
    },
    [draggingZonaId, previewZonaCeldas, zonaDragOrigen],
  )

  const aristaActivaZona = useCallback(
    (z: ZonaPlano, absCol: number, absRow: number, lado: import('../../house/walls').SideKey) =>
      ladoGrillaActivo(formaEnCelda(formasZonaEn(z, celdasVisiblesZona(z)), claveCeldaAbs(absCol, absRow)), lado),
    [formasZonaEn, celdasVisiblesZona],
  )

  const zonaArrastrandoValida = useMemo(() => {
    if (draggingZonaId == null || previewZonaCeldas.length === 0) return true
    return puedeMoverZona(
      previewZonaCeldas,
      draggingZonaId,
      nivel,
      gridCols,
      gridRows,
      placed,
      cells,
      footprints,
      niveles,
      zonas,
      idsCuartosNivel,
      anchorDe,
    )
  }, [
    draggingZonaId,
    previewZonaCeldas,
    nivel,
    gridCols,
    gridRows,
    placed,
    cells,
    footprints,
    niveles,
    zonas,
    idsCuartosNivel,
    anchorDe,
  ])

  const cuartoArrastrandoValido = useMemo(() => {
    if (!draggingId || !previewCell) return true
    const origen = dragOriginCell ?? cells[draggingId]
    const fp = footprints[draggingId]
    if (!origen || !fp?.length) return true
    return puedeMoverCuartoRegistro({
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
    })
  }, [
    draggingId,
    previewCell,
    dragOriginCell,
    cells,
    footprints,
    nivel,
    placed,
    niveles,
    zonas,
  ])

  const celdaDeCuadrante = (e: React.PointerEvent) => {
    const p = svgPoint(e.clientX, e.clientY)
    return p ? celdaSnapEnPlano(p.x, p.y, gridCols, gridRows, 'celda') : null
  }
  const dibujoDown = (e: React.PointerEvent) => {
    const c = celdaDeCuadrante(e)
    if (!c) return
    e.stopPropagation()
    setRectCuadrante({ a: c, b: c })
    // El capture mantiene el arrastre aunque el puntero salga del croquis; si el
    // navegador lo rechaza, el trazo sigue funcionando dentro del croquis.
    try {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    } catch {
      /* puntero no capturable */
    }
  }
  const dibujoMove = (e: React.PointerEvent) => {
    if (!rectCuadrante) return
    const c = celdaDeCuadrante(e)
    if (c) setRectCuadrante((r) => (r ? { a: r.a, b: c } : r))
  }
  const dibujoUp = () => {
    if (!rectCuadrante) return
    const nombre = `${t('constructor.cuadrantes.nuevo', 'Zona')} ${cuadrantesPropios.length + 1}`
    const q = normalizarRect(
      rectCuadrante.a,
      rectCuadrante.b,
      gridCols,
      gridRows,
      nombre,
      colorZona(cuadrantesPropios.length),
    )
    setRectCuadrante(null)
    setDibujandoCuadrante(false)
    void agregarCuadrante(q)
  }

  const manejarClickPlano = (e: React.PointerEvent) => {
    e.preventDefault()
    const p = svgPoint(e.clientX, e.clientY)
    if (!p) return
    // Muro recto (Lados): coloca/borra la arista más cercana al punto — misma predicción
    // que el fantasma (aristaMasCercanaEnPlano), sin depender de guías visibles en la rejilla.
    if (muroAristaMode) {
      const a = aristaMasCercanaEnPlano(p.x, p.y, orientMuro)
      void crearMuroAristaLibre(nivel, a.orient, a.col, a.row).then(setMuroLibreSel)
      return
    }
    // Pincel fino: el clic apunta al cuadrante de ¼ bajo el cursor.
    if (pincelFino) {
      const q = svgACuadrante(p.x, p.y, gridCols, gridRows)
      if (q) onPointerDownCelda(q)
      return
    }
    const det =
      (capa === 'cuartos' && pincelForma) ||
      (capa === 'paredes' && herramienta === 'muro') ||
      (modo === 'piso-int' && detalleRejilla === 'celda')
        ? ('subcelda' as const)
        : detalleRejilla
    const c = celdaSnapEnPlano(p.x, p.y, gridCols, gridRows, det)
    if (!c) return
    onPointerDownCelda(c)
  }

  return (
    <div
      ref={containerRef}
      className={[
        'absolute inset-0 overflow-hidden touch-none select-none',
        cursorPan ? 'cursor-grabbing' : 'cursor-default',
      ].join(' ')}
      style={{ background: fondoMargen }}
      title={t('plano.controles', 'Rueda: zoom · Shift/Alt + arrastrar: mover · Doble clic en margen: encajar')}
    >
      <div ref={rotWrapRef} className="h-full min-h-0 w-full flex-1">
      <svg
        ref={svgRefCombinado}
        viewBox={viewBoxStr}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full"
        onPointerMove={
          (modo === 'cuartos' && pincelForma) || modo === 'piso-int' || muroModo
            ? (ev) => {
                const p = svgPoint(ev.clientX, ev.clientY)
                // Muros (Crear): fantasma del muro que resultaría del clic, igual que el mapa 3D.
                if (muroModo) {
                  if (!p) {
                    setMuroHover(null)
                    return
                  }
                  if (formaMuro === 'cuadrado') {
                    const a = aristaMasCercanaEnPlano(p.x, p.y, orientMuro)
                    setMuroHover(objetivoMuroArista(murosLibresNivel, nivel, a))
                  } else {
                    const forma = formaMuro as 'triangular' | 'circular'
                    const celdaF = celdaSnapEnPlano(p.x, p.y, gridCols, gridRows, 'subcelda')
                    setMuroHover(celdaF ? objetivoMuroForma(murosLibresNivel, nivel, celdaF, forma, rotForma) : null)
                  }
                  return
                }
                const c = p
                  ? pincelFino
                    ? svgACuadrante(p.x, p.y, gridCols, gridRows)
                    : celdaSnapEnPlano(p.x, p.y, gridCols, gridRows, 'subcelda')
                  : null
                if (modo === 'cuartos') setHoverPincel(c)
                // Piso interior: resalta la FIGURA del cuarto bajo el cursor (como techos).
                else {
                  const occ = c ? ocupanteEnTile(c) : null
                  setHoverPisoIntRoom(occ?.tipo === 'cuarto' ? occ.roomId : null)
                }
              }
            : undefined
        }
        onPointerLeave={
          (modo === 'cuartos' && pincelForma) || modo === 'piso-int' || muroModo
            ? () => {
                setHoverPincel(null)
                setHoverPisoIntRoom(null)
                if (muroModo) setMuroHover(null)
              }
            : undefined
        }
      >
        <rect
          x={0}
          y={0}
          width={vp.ancho}
          height={vp.alto}
          fill={fondoMargen}
          onDoubleClick={(e) => {
            e.stopPropagation()
            fitToContainer()
          }}
        />

        <PlanoPapelRelleno
          x={PLANO_PAD - 4}
          y={PLANO_PAD - 4}
          w={areaPx.ancho + 8}
          h={areaPx.alto + 8}
          borde={bordePapel}
          relleno={rellenoPapel}
        />

        {/* Fondo clicable (herramientas que no usan la rejilla de pisos) */}
        {!capaSeleccionPisos && (
          <rect
            x={PLANO_PAD}
            y={PLANO_PAD}
            width={areaPx.ancho}
            height={areaPx.alto}
            fill="transparent"
            onPointerDown={manejarClickPlano}
          />
        )}

        {/* Rejilla del croquis */}
        {rejillaVisible === 'celda'
          ? Array.from({ length: gridCols }, (_, col) =>
              Array.from({ length: gridRows }, (_, row) => {
                const { x, y } = celdaASvg(col, row)
                return (
                  <rect
                    key={`g-${col}-${row}`}
                    x={x}
                    y={y}
                    width={PLANO_CELL_PX}
                    height={PLANO_CELL_PX}
                    fill="transparent"
                    stroke={gridFuerte}
                    strokeWidth={1}
                    pointerEvents="none"
                  />
                )
              }),
            )
          : Array.from({ length: tilesMediaEnEje(gridCols) }, (_, si) =>
              Array.from({ length: tilesMediaEnEje(gridRows) }, (_, sj) => {
                const x = PLANO_PAD + si * PLANO_SUB_PX
                const y = PLANO_PAD + sj * PLANO_SUB_PX
                const esBorde = si % 2 === 0 && sj % 2 === 0
                return (
                  <rect
                    key={`gs-${si}-${sj}`}
                    x={x}
                    y={y}
                    width={PLANO_SUB_PX}
                    height={PLANO_SUB_PX}
                    fill="transparent"
                    stroke={esBorde ? gridFuerte : gridSuave}
                    strokeWidth={esBorde ? 1 : 0.6}
                    pointerEvents="none"
                  />
                )
              }),
            )}

        {/* Piso exterior: CAPA CONTINUA de fondo bajo todo (como el suelo en el 3D). No se
            recorta por ocupación; los cuartos se dibujan encima con su forma, así triángulos,
            círculos y cuartos a media rejilla dejan ver el piso exterior en el hueco. También
            se muestra en Techos (atenuado) para ver el piso bajo los techos. */}
        {capa !== 'paredes' &&
          Array.from({ length: gridCols }, (_, col) =>
            Array.from({ length: gridRows }, (_, row) => {
              if (exteriorSinPiso(col, row)) return null
              const { x, y } = celdaASvg(col, row)
              return (
                <rect
                  key={`ex-${col}-${row}`}
                  x={x + 1}
                  y={y + 1}
                  width={PLANO_CELL_PX - 2}
                  height={PLANO_CELL_PX - 2}
                  fill={pisoSwatchExterior(col, row)}
                  opacity={capa === 'cuartos' || capa === 'techos' ? 0.55 : 0.9}
                  rx={2}
                  pointerEvents="none"
                />
              )
            }),
          )}

        {/* Previsualizador del piso de abajo (nivel alto): cuartos del nivel inferior en
            tenue, para ubicarse y construir encima. */}
        {cuartosNivelInferior.map((room) => {
          const anchor = cells[room.id]
          const fp = footprints[room.id]
          if (!anchor || !fp) return null
          const color = roomColors[room.id] ?? room.color
          return footprintCells(anchor, fp).map((c) => {
            const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
            const offC = c.col - anchor.col
            const offR = c.row - anchor.row
            return (
              <LosetaFormaSvg
                key={`prev-${room.id}-${c.col}-${c.row}`}
                x={x}
                y={y}
                w={w}
                h={h}
                forma={formaEnCelda(formasCuartoDe(room.id), claveCeldaOff(offC, offR))}
                subformas={subformasDeCelda(formasCuartoDe(room.id), offC, offR)}
                fill={color}
                opacity={0.16}
                stroke={color}
                strokeWidth={1}
                pointerEvents="none"
              />
            )
          })
        })}

        {/* Muros libres existentes: aristas (línea) y formas (diagonal/arco). */}
        {murosLibresNivel.map((m) => {
          const sel = muroLibreSel === m.id
          const stroke = sel ? '#34d399' : m.color || COLOR_ARISTA.pared
          if (m.clase === 'arista' && m.orient) {
            const p1 = celdaASvg(m.col, m.row)
            const p2 = m.orient === 'h' ? celdaASvg(m.col + 1, m.row) : celdaASvg(m.col, m.row + 1)
            return (
              <line
                key={`ml-${m.id}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={stroke}
                strokeWidth={GROSOR_ARISTA + (sel ? 2 : 0)}
                strokeLinecap="round"
                style={{ cursor: muroLibreClicable ? 'pointer' : 'default' }}
                pointerEvents={muroLibreClicable ? undefined : 'none'}
                onPointerDown={(ev) => {
                  ev.stopPropagation()
                  // En Muros: seleccionada → segundo clic la borra. En Puertas/Ventanas: crea la abertura.
                  if (muroModo && muroLibreSel === m.id && m.orient) {
                    void crearMuroAristaLibre(nivel, m.orient, m.col, m.row).then(setMuroLibreSel)
                  } else {
                    clicMuroLibre(m.id)
                  }
                }}
              />
            )
          }
          if (m.clase === 'forma' && m.forma) {
            const { x, y } = celdaASvg(m.col, m.row)
            return (
              <PerimetroFormaPlanoSvg
                key={`ml-${m.id}`}
                forma={{ forma: m.forma, rotacion: m.rotacion ?? 0 }}
                x={x}
                y={y}
                w={PLANO_CELL_PX}
                h={PLANO_CELL_PX}
                stroke={stroke}
                onPointerDown={
                  formaMuroSeleccionable
                    ? (ev) => {
                        ev.stopPropagation()
                        clicMuroLibre(m.id)
                      }
                    : undefined
                }
              />
            )
          }
          return null
        })}

        {capa !== 'pisos' &&
          zonasPlanoRender.map((z) => {
          const arrastrando = draggingZonaId === z.id
          const visibles = celdasVisiblesZona(z)
          return visibles.map((c) => {
            const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
            const sel = seleccion?.tipo === 'zona' && seleccion.zonaId === z.id
            const invalido = arrastrando && !zonaArrastrandoValida
            return (
              <LosetaFormaSvg
                key={`z-${z.id}-${c.col}-${c.row}`}
                x={x}
                y={y}
                w={w}
                h={h}
                forma={formaEnCelda(formasZonaEn(z, visibles), claveCeldaAbs(c.col, c.row))}
                fill={
                  invalido
                    ? 'rgba(239,68,68,0.45)'
                    : arrastrando
                      ? z.color + 'aa'
                      : z.color + (sel ? 'cc' : '66')
                }
                stroke={invalido ? '#ef4444' : z.color}
                strokeWidth={sel || arrastrando ? 2 : 1}
                opacity={arrastrando ? 0.92 : 1}
                pointerEvents={pincelFino ? 'none' : undefined}
                onPointerDown={(ev) => {
                  ev.stopPropagation()
                  onPointerDownCelda(c, undefined, z.id)
                }}
              />
            )
          })
        })}
        {capa === 'cuartos' &&
          zonasPlanoRender.map((z) => {
            const visibles = celdasVisiblesZona(z)
            const centro = centroSvgZona(visibles)
            return (
              <text
                key={`zl-${z.id}`}
                x={centro.x}
                y={centro.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={PLANO_TEXTO}
                fontSize={10}
                fontWeight={600}
                pointerEvents="none"
                opacity={0.85}
              >
                {z.nombre.length > 10 ? z.nombre.slice(0, 9) + '…' : z.nombre}
              </text>
            )
          })}

        {capa === 'pisos' &&
          Array.from({ length: gridCols }, (_, col) =>
            Array.from({ length: gridRows }, (_, row) => {
              if (
                !celdaEsExterior(
                  col,
                  row,
                  nivel,
                  idsCuartosNivel,
                  cells,
                  footprints,
                  zonas,
                  anchorDe,
                )
              ) {
                return null
              }
              if (exteriorSinPiso(col, row)) return null
              const { x, y } = celdaASvg(col, row)
              const selExt =
                seleccion?.tipo === 'exterior' &&
                seleccion.celdas.some((c) => c.col === col && c.row === row)
              return (
                <rect
                  key={`pe-${col}-${row}`}
                  x={x + 1}
                  y={y + 1}
                  width={PLANO_CELL_PX - 2}
                  height={PLANO_CELL_PX - 2}
                  fill={pisoSwatchExterior(col, row)}
                  opacity={0.9}
                  stroke={selExt ? '#fff' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={selExt ? 2 : 1}
                  rx={2}
                  pointerEvents="none"
                />
              )
            }),
          )}

        {capa === 'pisos' &&
          zonasPlanoRender.map((z) => {
            const visibles = celdasVisiblesZona(z)
            return visibles.map((c) => {
              const fill = pisoSwatchZona(z)
              if (fill == null) return null
              const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
              const sel = seleccion?.tipo === 'zona' && seleccion.zonaId === z.id
              // "Todos los interiores": se resalta la figura de la zona (como techos).
              const grupoInt = modo === 'piso-int' && seleccion?.tipo === 'pisos-interiores'
              const forma = formaEnCelda(formasZonaEn(z, visibles), claveCeldaAbs(c.col, c.row))
              return (
                <g key={`pz-${z.id}-${c.col}-${c.row}`}>
                  {!esFormaCuadrada(forma) && (
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={w - 2}
                      height={h - 2}
                      fill={pisoSwatchExterior(c.col, c.row)}
                      opacity={0.9}
                      rx={2}
                      pointerEvents="none"
                    />
                  )}
                  <LosetaFormaSvg
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                    forma={forma}
                    fill={fill}
                    opacity={0.9}
                    stroke={sel || grupoInt ? '#fff' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={sel || grupoInt ? 2 : 1}
                    pointerEvents={capaSeleccionPisos ? 'none' : undefined}
                    onPointerDown={(ev) => {
                      ev.stopPropagation()
                      onPointerDownCelda(c, undefined, z.id)
                    }}
                  />
                </g>
              )
            })
          })}

        {/* Swatch del piso de cada cuarto: solo en piso exterior. En piso interior los cuartos
            se ven con SU color (uniformes), no con la textura del piso (que la edita el panel). */}
        {capa === 'pisos' &&
          modo !== 'piso-int' &&
          cuartosNivel.map((room) => {
            const anchor = anchorDe(room.id)
            const fp = footprints[room.id]
            if (!anchor || !fp) return null
            return footprintCells(anchor, fp).map((c) => {
              const fill = pisoSwatch(room.id)
              if (fill == null) return null
              const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
              const sel = seleccion?.tipo === 'cuarto' && seleccion.roomId === room.id
              const offC = c.col - anchor.col
              const offR = c.row - anchor.row
              const forma = formaEnCelda(formasCuartoDe(room.id), claveCeldaOff(offC, offR))
              const sub = subformasDeCelda(formasCuartoDe(room.id), offC, offR)
              return (
                <g key={`p-${room.id}-${c.col}-${c.row}`}>
                  {(!esFormaCuadrada(forma) || sub) && (
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={w - 2}
                      height={h - 2}
                      fill={pisoSwatchExterior(c.col, c.row)}
                      opacity={0.9}
                      rx={2}
                      pointerEvents="none"
                    />
                  )}
                  <LosetaFormaSvg
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                    forma={forma}
                    subformas={sub}
                    fill={fill}
                    opacity={0.9}
                    stroke={sel ? '#fff' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={sel ? 2 : 1}
                    pointerEvents={capaSeleccionPisos ? 'none' : undefined}
                    onPointerDown={(ev) => {
                      ev.stopPropagation()
                      onPointerDownCelda(c, room.id)
                    }}
                  />
                </g>
              )
            })
          })}

        {/* Overlay de cuadrantes pintados (sub-celdas, coords de ¼): encima del piso base. */}
        {capa === 'pisos' &&
          pisosExterior
            .filter(
              (p) =>
                p.nivel === nivel &&
                (!Number.isInteger(p.col) || !Number.isInteger(p.row)) &&
                !esSinPiso(p.pisoTipo),
            )
            .map((p) => {
              const col = Math.round(p.col)
              const row = Math.round(p.row)
              const { x, y } = celdaASvg(col, row)
              const conf =
                p.pisoTipo && !esSinPiso(p.pisoTipo) ? getPisoTipo(p.pisoTipo as PisoTipoId) : null
              return (
                <LosetaFormaSvg
                  key={`pq-${p.col},${p.row}`}
                  x={x + (p.col > col ? PLANO_SUB_PX : 0)}
                  y={y + (p.row > row ? PLANO_SUB_PX : 0)}
                  w={PLANO_SUB_PX}
                  h={PLANO_SUB_PX}
                  forma={p.forma ?? { forma: 'cuadrado', rotacion: 0 }}
                  fill={p.pisoColor || conf?.color || '#3d4450'}
                  opacity={0.9}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={0.5}
                  rx={2}
                  pointerEvents={capaSeleccionPisos ? 'none' : undefined}
                />
              )
            })}

        {capa === 'techos' &&
          techos.map(({ roomId, celdas: cs }) =>
            cs.map((c) => {
              const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
              const color = roomColors[roomId] ?? getCuarto(roomId)?.color ?? '#64748b'
              const sel = seleccion?.tipo === 'cuarto' && seleccion.roomId === roomId
              const anchor = anchorDe(roomId)
              const fp = footprints[roomId]
              const offKey =
                anchor && fp
                  ? claveCeldaOff(c.col - anchor.col, c.row - anchor.row)
                  : '0,0'
              return (
                <LosetaFormaSvg
                  key={`t-${roomId}-${c.col}-${c.row}`}
                  x={x}
                  y={y}
                  w={w}
                  h={h}
                  forma={formaEnCelda(formasCuartoDe(roomId), offKey)}
                  subformas={
                    anchor && fp
                      ? subformasDeCelda(formasCuartoDe(roomId), c.col - anchor.col, c.row - anchor.row)
                      : null
                  }
                  fill={color}
                  opacity={sel ? 0.55 : 0.35}
                  stroke={sel ? '#fff' : color}
                  strokeWidth={sel ? 1.5 : 0.5}
                  onPointerDown={() => onPointerDownCelda(c, roomId)}
                />
              )
            }),
          )}

        {cuartosNivel.map((room) => {
          const anchor = anchorDe(room.id)
          const fp = footprints[room.id]
          if (!anchor || !fp) return null
          const color = roomColors[room.id] ?? room.color
          const sel = seleccion?.tipo === 'cuarto' && seleccion.roomId === room.id
          // Piso interior: resalta la FIGURA del cuarto al pasar el cursor, al seleccionarlo,
          // o cuando está activo "todos los interiores" (como techos, nunca la rejilla).
          const enPisoInt = capa === 'pisos' && modo === 'piso-int'
          const hov = enPisoInt && hoverPisoIntRoom === room.id
          const grupoInt = enPisoInt && seleccion?.tipo === 'pisos-interiores'
          const resaltado = enPisoInt && (sel || hov || grupoInt)
          const nombre = nombreCuarto(room)
          const arrastrando = draggingId === room.id
          const invalido = arrastrando && !cuartoArrastrandoValido

          return (
            <g key={room.id}>
              {footprintCells(anchor, fp).map((c) => {
                const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
                const offC = c.col - anchor.col
                const offR = c.row - anchor.row
                const offKey = claveCeldaOff(offC, offR)
                return (
                  <LosetaFormaSvg
                    key={`r-${room.id}-${c.col}-${c.row}`}
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                    forma={formaEnCelda(formasCuartoDe(room.id), offKey)}
                    subformas={subformasDeCelda(formasCuartoDe(room.id), offC, offR)}
                    fill={
                      invalido
                        ? 'rgba(239,68,68,0.45)'
                        : capa === 'pisos'
                          ? (enPisoInt ? color : 'transparent')
                          : color
                    }
                    opacity={
                      capa === 'techos'
                        ? 0.25
                        : enPisoInt
                          ? (resaltado ? 0.55 : 0.32)
                          : arrastrando ? 0.92 : sel ? 0.95 : 0.75
                    }
                    stroke={
                      invalido
                        ? '#ef4444'
                        : sel
                          ? '#1e40af'
                          : hov || grupoInt
                            ? '#ffffff'
                            : 'rgba(61,41,20,0.35)'
                    }
                    strokeWidth={sel || arrastrando || hov || grupoInt ? 2 : 1}
                    pointerEvents={capa === 'pisos' || pincelFino ? 'none' : undefined}
                    onPointerDown={(ev) => {
                      ev.stopPropagation()
                      onPointerDownCelda(c, room.id)
                    }}
                  />
                )
              })}
              {capa === 'cuartos' && (() => {
                const centro = centroSvgFootprint(anchor, fp)
                return (
                <text
                  x={centro.x}
                  y={centro.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={PLANO_TEXTO}
                  fontSize={6}
                  fontWeight={700}
                  pointerEvents="none"
                  opacity={0.9}
                >
                  {room.icon} {nombre.length > 12 ? nombre.slice(0, 11) + '…' : nombre}
                </text>
                )
              })()}
            </g>
          )
        })}

        {/* Fantasma de la forma del pincel bajo el cursor (preview en el croquis). */}
        {modo === 'cuartos' && pincelForma && hoverPincel && (() => {
          // Rejilla fina: fantasma del cuadrante con la rotación que recortará la esquina.
          if (pincelFino) {
            const { x, y } = celdaASvg(hoverPincel.col, hoverPincel.row)
            const i = cuadranteEnCuarto(hoverPincel)
            return (
              <LosetaFormaSvg
                x={x}
                y={y}
                w={PLANO_SUB_PX}
                h={PLANO_SUB_PX}
                forma={{ forma: pincelForma, rotacion: rotInicialSubforma(pincelForma, i) }}
                fill="#34d399"
                opacity={0.55}
                stroke="#34d399"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            )
          }
          const { x, y, w, h } = tileRectEnSvg(hoverPincel.col, hoverPincel.row)
          return (
            <LosetaFormaSvg
              x={x}
              y={y}
              w={w}
              h={h}
              forma={{ forma: pincelForma, rotacion: pincelForma === 'cuadrado' ? 0 : rotForma }}
              fill="#34d399"
              opacity={0.45}
              stroke="#34d399"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          )
        })()}

        {/* Fantasma del muro (recto/triángulo/círculo) bajo el cursor: mismo cálculo que
            el mapa 3D (verde = lo que colocaría/avanzaría, rojo = lo borraría). */}
        {muroModo && muroHover && (() => {
          const color = muroHover.borra ? '#f87171' : '#34d399'
          if (muroHover.clase === 'arista' && muroHover.orient) {
            const p1 = celdaASvg(muroHover.col, muroHover.row)
            const p2 =
              muroHover.orient === 'h'
                ? celdaASvg(muroHover.col + 1, muroHover.row)
                : celdaASvg(muroHover.col, muroHover.row + 1)
            return (
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={GROSOR_ARISTA + 2}
                strokeLinecap="round"
                opacity={0.7}
                pointerEvents="none"
              />
            )
          }
          if (muroHover.clase === 'forma' && muroHover.forma) {
            const { x, y } = celdaASvg(muroHover.col, muroHover.row)
            return (
              <PerimetroFormaPlanoSvg
                forma={{ forma: muroHover.forma, rotacion: (muroHover.rotacion ?? 0) as 0 | 90 | 180 | 270 }}
                x={x}
                y={y}
                w={PLANO_CELL_PX}
                h={PLANO_CELL_PX}
                stroke={color}
                strokeWidth={GROSOR_ARISTA + 2}
                opacity={0.7}
              />
            )
          }
          return null
        })()}

        {/* Herramienta Expandir: botones +/− de TODOS los cuartos del nivel para
            crecerlos, recortarlos o eliminarlos (el '−' de un cuarto de 1 celda lo borra). */}
        {modo === 'cuartos' &&
          !pincelForma &&
          herramienta === 'expandir' &&
          !draggingId &&
          cuartosNivel.map((room) => {
            const anchor = anchorDe(room.id)
            const fp = footprints[room.id]
            if (!anchor || !fp) return null
            const ocupado = ocupadoPorNivel.get(niveles[room.id] ?? 0) ?? SIN_OCUPACION
            const { quitar, agregar } = celdasEdicionCuarto(anchor, fp, ocupado, gridCols, gridRows)
            const unaCelda = fp.length <= 1
            return (
              <g key={`exp-${room.id}`}>
                {quitar.map(({ cell, puede }) => {
                  if (!puede) return null
                  const { x, y, w, h } = tileRectEnSvg(cell.col, cell.row)
                  return (
                    <BotonCeldaSvg
                      key={`mm-${room.id}-${cell.col}-${cell.row}`}
                      cx={x + w / 2}
                      cy={y + h / 2}
                      signo="−"
                      onTap={() =>
                        unaCelda ? void eliminarCuarto(room.id) : void contraerCeldaCuarto(room.id, cell)
                      }
                    />
                  )
                })}
                {agregar.map((v) => {
                  const { x, y, w, h } = tileRectEnSvg(v.col, v.row)
                  return (
                    <BotonCeldaSvg
                      key={`pp-${room.id}-${v.col}-${v.row}`}
                      cx={x + w / 2}
                      cy={y + h / 2}
                      signo="+"
                      onTap={() => void expandirCeldaCuarto(room.id, v)}
                    />
                  )
                })}
              </g>
            )
          })}

        {(capa === 'paredes' || capa === 'cuartos') &&
          aristas.map(({ roomId, edge, estado }, i) => {
            const anchor = anchorDe(roomId)
            if (!anchor) return null
            if (!aristaActivaCuarto(roomId, edge.off.col, edge.off.row, edge.side)) return null
            const seg = aristaASegmento(anchor, edge)
            if (!seg) return null
            const sel =
              seleccion?.tipo === 'arista' &&
              seleccion.roomId === roomId &&
              edgeKey(seleccion.off, seleccion.side) === edgeKey(edge.off, edge.side)
            return (
              <line
                key={`e-${i}`}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={colorArista(roomId, edge, estado)}
                strokeWidth={sel ? GROSOR_ARISTA + 2 : GROSOR_ARISTA}
                strokeLinecap="round"
                opacity={capa === 'cuartos' ? 0.35 : 1}
                pointerEvents={capaMover ? 'none' : undefined}
                onPointerDown={(ev) => {
                  ev.stopPropagation()
                  onClickArista(roomId, edge.off, edge.side)
                }}
              />
            )
          })}

        {(capa === 'paredes' || capa === 'cuartos') &&
          aristasZonas.map(({ zonaId, edge, estado }, i) => {
            const z = zonas.find((x) => x.id === zonaId)
            if (!z) return null
            const { anchor } = zonaAnchorFootprint(z.celdas)
            if (!aristaActivaZona(z, anchor.col + edge.off.col, anchor.row + edge.off.row, edge.side))
              return null
            const seg = aristaASegmento(anchor, edge)
            if (!seg) return null
            const sel =
              seleccion?.tipo === 'arista-zona' &&
              seleccion.zonaId === zonaId &&
              edgeKey(seleccion.off, seleccion.side) === edgeKey(edge.off, edge.side)
            return (
              <line
                key={`ez-${i}`}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={estado === 'puerta' ? COLOR_ARISTA.puerta : estado === 'abierto' ? COLOR_ARISTA.abierto : COLOR_ARISTA.pared}
                strokeWidth={sel ? GROSOR_ARISTA + 2 : GROSOR_ARISTA}
                strokeLinecap="round"
                opacity={capa === 'cuartos' ? 0.35 : 1}
                pointerEvents={capaMover ? 'none' : undefined}
                onPointerDown={(ev) => {
                  ev.stopPropagation()
                  onClickAristaZona(zonaId, edge.off, edge.side)
                }}
              />
            )
          })}

        {(capa === 'paredes' || capa === 'cuartos') &&
          zonasPlanoRender.flatMap((z) => {
            const visibles = celdasVisiblesZona(z)
            return visibles.map((c) => {
              const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
              const forma = formaEnCelda(formasZonaEn(z, visibles), claveCeldaAbs(c.col, c.row))
              if (esFormaCuadrada(forma)) return null
              return (
                <PerimetroFormaPlanoSvg
                  key={`pfz-${z.id}-${c.col}-${c.row}`}
                  forma={forma}
                  x={x}
                  y={y}
                  w={w}
                  h={h}
                  stroke={z.color}
                  opacity={capa === 'cuartos' ? 0.55 : 1}
                />
              )
            })
          })}

        {(capa === 'paredes' || capa === 'cuartos') &&
          cuartosNivel.flatMap((room) => {
            const anchor = anchorDe(room.id)
            const fp = footprints[room.id]
            if (!anchor || !fp) return []
            const color = roomColors[room.id] ?? room.color
            const propias = new Set(fp.map((pc) => cellId(pc.col, pc.row)))
            // Igual que la selección 3D (PlanoMuroSelector3D): cualquier herramienta salvo
            // "muro" (colocar) puede tocar un tramo de esquina fina, incluida "seleccionar".
            const puedeClic = capa === 'paredes' && herramienta !== 'muro'
            return footprintCells(anchor, fp).flatMap((c) => {
              const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
              const off = { col: c.col - anchor.col, row: c.row - anchor.row }
              const offKey = claveCeldaOff(off.col, off.row)
              const forma = formaEnCelda(formasCuartoDe(room.id), offKey)
              const sub = subformasDeCelda(formasCuartoDe(room.id), off.col, off.row)
              const out: React.ReactElement[] = []
              // La diagonal/arco toma la puerta/ventana de su lado representativo (el que la
              // forma cubre). En Puertas/Ventanas el clic sobre ella crea la abertura, igual
              // que en los lados rectos y en los muros libres.
              if (!esFormaCuadrada(forma)) {
                const ladoRep = SIDE_KEYS.find((s) => !perimetroFormaCelda(forma, 0, 0)?.lados.has(s))
                const clicable = puedeClic && !!ladoRep
                out.push(
                  <PerimetroFormaPlanoSvg
                    key={`pfr-${room.id}-${c.col}-${c.row}`}
                    forma={forma}
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                    stroke={color}
                    opacity={capa === 'cuartos' ? 0.55 : 1}
                    onPointerDown={
                      clicable
                        ? (ev) => {
                            ev.stopPropagation()
                            onClickArista(room.id, off, ladoRep!)
                          }
                        : undefined
                    }
                  />,
                )
              }
              // Recortes finos: mini-diagonales/arcos + mitades rectas conservadas, con el
              // mismo clic de puerta/ventana sobre su lado representativo.
              if (sub) {
                const ladosExternos = new Set<SideKey>(
                  SIDE_KEYS.filter(
                    (s) =>
                      !propias.has(
                        cellId(
                          off.col + (s === 'O' ? -1 : s === 'E' ? 1 : 0),
                          off.row + (s === 'N' ? -1 : s === 'S' ? 1 : 0),
                        ),
                      ),
                  ),
                )
                extrasPerimetroSubformasSvg(sub, x, y, w, h, ladosExternos).forEach((ex, j) => {
                  const clicable = puedeClic && !!ex.ladoRep
                  // El recorte fino es un muro propio: su arista de estilo es la VIRTUAL del
                  // cuadrante; las mitades rectas pertenecen al lado real.
                  const offClic =
                    ex.cuadrante != null ? offSubcelda(off.col, off.row, ex.cuadrante) : off
                  out.push(
                    <TrazoPerimetroSvg
                      key={`pfs-${room.id}-${c.col}-${c.row}-${j}`}
                      extra={ex.extra}
                      stroke={color}
                      opacity={capa === 'cuartos' ? 0.55 : 1}
                      onPointerDown={
                        clicable
                          ? (ev) => {
                              ev.stopPropagation()
                              onClickArista(room.id, offClic, ex.ladoRep!)
                            }
                          : undefined
                      }
                    />,
                  )
                })
              }
              return out
            })
          })}

        {/* Rejilla clicable + preview (Pisos → Seleccionar) */}
        {capaSeleccionPisos &&
          Array.from({ length: gridCols }, (_, col) =>
            Array.from({ length: gridRows }, (_, row) => {
              if (detalleRejilla === 'subcelda' && modo === 'piso-ext') {
                // Modo fino (solo EXTERIOR): 4 sub-cuadrantes clicables por celda. El interior
                // ignora la rejilla fina: cae al bloque de celda entera y solo selecciona.
                const { x, y } = celdaASvg(col, row)
                return CUADRANTES_OFF.map((o, qi) => {
                  const q = { col: col + o.dc, row: row + o.dr }
                  const sel =
                    seleccion?.tipo === 'exterior' &&
                    seleccion.celdas.some((c) => c.col === q.col && c.row === q.row)
                  const hov = hoverPisoFino?.col === q.col && hoverPisoFino?.row === q.row
                  return (
                    <rect
                      key={`ps-${col}-${row}-${qi}`}
                      x={x + (o.dc > 0 ? PLANO_SUB_PX : 0)}
                      y={y + (o.dr > 0 ? PLANO_SUB_PX : 0)}
                      width={PLANO_SUB_PX}
                      height={PLANO_SUB_PX}
                      fill={sel ? 'rgba(52,211,153,0.4)' : 'transparent'}
                      stroke={sel ? '#10b981' : hov ? '#ffffff' : '#34d399'}
                      strokeWidth={sel ? 2 : hov ? 2 : 0.4}
                      style={{ cursor: 'cell' }}
                      onPointerEnter={() => setHoverPisoFino(q)}
                      onPointerLeave={() =>
                        setHoverPisoFino((h) => (h?.col === q.col && h?.row === q.row ? null : h))
                      }
                      onPointerDown={(ev) => {
                        ev.stopPropagation()
                        toggleCeldaExterior(q)
                      }}
                    />
                  )
                })
              }
              const celda = { col, row }
              const occ = ocupanteEnTile(celda)
              const hover = hoverPisos?.col === col && hoverPisos?.row === row
              const selExterior =
                seleccion?.tipo === 'exterior' &&
                seleccion.celdas.some((c) => c.col === col && c.row === row)
              const selInteriorGrupo =
                seleccion?.tipo === 'pisos-interiores' &&
                (occ?.tipo === 'cuarto' || occ?.tipo === 'zona')
              const selCuarto =
                seleccion?.tipo === 'cuarto' &&
                occ?.tipo === 'cuarto' &&
                seleccion.roomId === occ.roomId
              const selZona =
                seleccion?.tipo === 'zona' && occ?.tipo === 'zona' && seleccion.zonaId === occ.zonaId
              const { x, y } = celdaASvg(col, row)
              const activa = selExterior || selInteriorGrupo || selCuarto || selZona
              // Piso exterior: el fantasma se muestra en CUALQUIER celda (también bajo un cuarto),
              // porque es la capa de abajo. En interior, la figura del cuarto reemplaza este
              // resaltado de celda (no se dibuja el cuadro de la rejilla por cuarto/zona).
              const hoverable = modo !== 'piso-int'
              const resaltarHover = hover && hoverable && !activa
              // En piso interior la rejilla no se resalta: lo hace la figura del cuarto/zona.
              const bordeRejilla = modo === 'piso-int' ? false : activa
              return (
                <rect
                  key={`ps-${col}-${row}`}
                  x={x}
                  y={y}
                  width={PLANO_CELL_PX}
                  height={PLANO_CELL_PX}
                  fill={
                    modo !== 'piso-int' && (selExterior || selInteriorGrupo)
                      ? 'rgba(52,211,153,0.4)'
                      : 'transparent'
                  }
                  stroke={bordeRejilla ? '#10b981' : resaltarHover ? '#ffffff' : undefined}
                  strokeWidth={bordeRejilla ? 2 : resaltarHover ? 1.5 : 0}
                  style={{ cursor: 'cell' }}
                  onPointerEnter={() => setHoverPisos(celda)}
                  onPointerLeave={() =>
                    setHoverPisos((h) => (h?.col === col && h?.row === row ? null : h))
                  }
                  onPointerDown={(ev) => {
                    ev.stopPropagation()
                    onPointerDownCelda(celda)
                  }}
                />
              )
            }),
          )}

        {/* Cuadrantes finos extra sobre celdas de cuartos a ½ celda (solo EXTERIOR). */}
        {capaSeleccionPisos &&
          detalleRejilla === 'subcelda' &&
          modo === 'piso-ext' &&
          celdasFinasExtra.map((cell) => {
            const { x, y } = celdaASvg(cell.col, cell.row)
            return CUADRANTES_OFF.map((o, qi) => {
              const q = { col: cell.col + o.dc, row: cell.row + o.dr }
              const sel =
                seleccion?.tipo === 'exterior' &&
                seleccion.celdas.some((c) => c.col === q.col && c.row === q.row)
              const hov = hoverPisoFino?.col === q.col && hoverPisoFino?.row === q.row
              return (
                <rect
                  key={`psx-${cell.col},${cell.row}-${qi}`}
                  x={x + (o.dc > 0 ? PLANO_SUB_PX : 0)}
                  y={y + (o.dr > 0 ? PLANO_SUB_PX : 0)}
                  width={PLANO_SUB_PX}
                  height={PLANO_SUB_PX}
                  fill={sel ? 'rgba(52,211,153,0.4)' : 'transparent'}
                  stroke={sel ? '#10b981' : hov ? '#ffffff' : '#34d399'}
                  strokeWidth={sel ? 2 : hov ? 2 : 0.4}
                  style={{ cursor: 'cell' }}
                  onPointerEnter={() => setHoverPisoFino(q)}
                  onPointerLeave={() =>
                    setHoverPisoFino((h) => (h?.col === q.col && h?.row === q.row ? null : h))
                  }
                  onPointerDown={(ev) => {
                    ev.stopPropagation()
                    toggleCeldaExterior(q)
                  }}
                />
              )
            })
          })}

        {lineasTecho && (
          <>
            {lineasTecho.expand.map((ln) => {
              const { x, y } = celdaCentroSvg(ln.centro.col, ln.centro.row)
              const k = `exp-${ln.dir}-${ln.centro.col}-${ln.centro.row}`
              return (
                <g key={k}>
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill="#22c55e"
                    opacity={hoverTecho === k ? 1 : 0.85}
                    onPointerEnter={() => setHoverTecho(k)}
                    onPointerLeave={() => setHoverTecho(null)}
                    onPointerDown={() => void addTechoLinea(lineasTecho.roomId, ln.celdas)}
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fill="#000"
                    fontSize={14}
                    fontWeight={900}
                    pointerEvents="none"
                  >
                    +
                  </text>
                </g>
              )
            })}
            {lineasTecho.retract.map((ln) => {
              const { x, y } = celdaCentroSvg(ln.centro.col, ln.centro.row)
              const k = `ret-${ln.dir}-${ln.centro.col}-${ln.centro.row}`
              return (
                <g key={k}>
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill="#ef4444"
                    opacity={hoverTecho === k ? 1 : 0.85}
                    onPointerEnter={() => setHoverTecho(k)}
                    onPointerLeave={() => setHoverTecho(null)}
                    onPointerDown={() => void removeTechoLinea(lineasTecho.roomId, ln.celdas)}
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={14}
                    fontWeight={900}
                    pointerEvents="none"
                  >
                    −
                  </text>
                </g>
              )
            })}
          </>
        )}

        {/* Cuadrantes del mapa. Los bloques de referencia (A1…) son solo BORDE; las zonas
            dibujadas se pintan como ÁREA de su color, más opaca la que está activa. */}
        {cuadrantesVisibles.map((q) => {
          const { x, y } = celdaASvg(q.col, q.row)
          const sel = cuadranteActivo === q.id
          const auto = esBloqueAuto(q)
          const color = colorCuadrante(q, cuadrantesPropios)
          // Fuera del modo Grid la zona NO se rellena: sus celdas deben verse como
          // cualquier otra para poder editarlas; el color queda solo en el borde.
          const relleno = !auto && modo === 'grid'
          return (
            <g key={`cuad-${q.id}`} pointerEvents="none">
              <rect
                x={x + 3}
                y={y + 3}
                width={q.cols * PLANO_CELL_PX - 6}
                height={q.rows * PLANO_CELL_PX - 6}
                rx={6}
                fill={relleno ? color : 'none'}
                fillOpacity={relleno ? (sel ? 0.34 : 0.14) : 0}
                stroke={color}
                strokeWidth={sel ? 3.5 : 1.5}
                strokeOpacity={auto && !sel ? 0.55 : 1}
                strokeDasharray={auto ? '8 6' : undefined}
              />
              <text x={x + 10} y={y + 18} fill={color} fontSize={13} fontWeight={800}>
                {q.nombre}
              </text>
            </g>
          )
        })}

        {/* Velo sobre lo que queda FUERA de la zona de trabajo: además de apagarlo
            visualmente se come los clics, así que deshabilita de una sola vez todas las
            herramientas del croquis (celdas, aristas, botones +/− y arrastres). */}
        {zonaEdicion && (() => {
          const { x: zx, y: zy } = celdaASvg(zonaEdicion.col, zonaEdicion.row)
          const zw = zonaEdicion.cols * PLANO_CELL_PX
          const zh = zonaEdicion.rows * PLANO_CELL_PX
          const x1 = PLANO_PAD + areaPx.ancho
          const y1 = PLANO_PAD + areaPx.alto
          const bandas = [
            { k: 'n', x: PLANO_PAD, y: PLANO_PAD, w: areaPx.ancho, h: zy - PLANO_PAD },
            { k: 's', x: PLANO_PAD, y: zy + zh, w: areaPx.ancho, h: y1 - (zy + zh) },
            { k: 'o', x: PLANO_PAD, y: zy, w: zx - PLANO_PAD, h: zh },
            { k: 'e', x: zx + zw, y: zy, w: x1 - (zx + zw), h: zh },
          ]
          return bandas.map((b) => (
            <rect
              key={`velo-${b.k}`}
              x={b.x}
              y={b.y}
              width={Math.max(0, b.w)}
              height={Math.max(0, b.h)}
              fill="#0f172a"
              fillOpacity={0.42}
              style={{ cursor: 'not-allowed' }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
            />
          ))
        })()}
        {modo === 'grid' && dibujandoCuadrante && (
          <>
            {rectCuadrante && (() => {
              const c0 = Math.min(rectCuadrante.a.col, rectCuadrante.b.col)
              const r0 = Math.min(rectCuadrante.a.row, rectCuadrante.b.row)
              const nc = Math.abs(rectCuadrante.b.col - rectCuadrante.a.col) + 1
              const nr = Math.abs(rectCuadrante.b.row - rectCuadrante.a.row) + 1
              const { x, y } = celdaASvg(c0, r0)
              return (
                <rect
                  x={x}
                  y={y}
                  width={nc * PLANO_CELL_PX}
                  height={nr * PLANO_CELL_PX}
                  fill="#10b98133"
                  stroke="#059669"
                  strokeWidth={3}
                  pointerEvents="none"
                />
              )
            })()}
            {/* Capa de captura por encima de todo: el arrastre marca el rectángulo. */}
            <rect
              x={PLANO_PAD}
              y={PLANO_PAD}
              width={areaPx.ancho}
              height={areaPx.alto}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onPointerDown={dibujoDown}
              onPointerMove={dibujoMove}
              onPointerUp={dibujoUp}
              onPointerCancel={() => setRectCuadrante(null)}
            />
          </>
        )}
      </svg>
      </div>
    </div>
  )
}

/** Botón circular +/− sobre una celda del croquis (agrandar/recortar cuarto). */
function BotonCeldaSvg({
  cx,
  cy,
  signo,
  onTap,
}: {
  cx: number
  cy: number
  signo: '+' | '−'
  onTap: () => void
}) {
  const mas = signo === '+'
  return (
    <g style={{ cursor: 'pointer' }} onPointerDown={(ev) => { ev.stopPropagation(); onTap() }}>
      <circle cx={cx} cy={cy} r={12} fill={mas ? '#22c55e' : '#ef4444'} stroke="#fff" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill={mas ? '#000' : '#fff'}
        fontSize={15}
        fontWeight={900}
        pointerEvents="none"
      >
        {signo}
      </text>
    </g>
  )
}
