import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCuartos, getCuarto } from '../../state/cuartosStore'
import { useLayout, SIN_OCUPACION } from '../../state/layoutStore'
import { useDiseño } from '../../state/disenoStore'
import { useCiclo } from '../../state/cicloStore'
import { usePlanos } from '../../state/planosStore'
import { zonasRepo, pisosExteriorRepo } from '../../data/repository'
import type { ZonaPlano } from '../../data/db'
import {
  cellId,
  edgeKey,
  footprintCells,
  tileOcupado,
  type Cell,
  type EdgeInfo,
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
  tilesMediaEnEje,
  celdasOcupadasEnNivel,
  aristasEnNivel,
  coberturaTechoEnNivel,
  aristaASegmento,
  COLOR_ARISTA,
  GROSOR_ARISTA,
  zonaEnCelda,
  cuartoIdEnTile,
  celdaEnteraEsLibre,
  aristasPerimetroCeldas,
  puedeMoverZona,
  puedeMoverCuartoRegistro,
  normalizarCeldasEnteras,
  centroSvgZona,
  centroSvgFootprint,
  zonaAnchorFootprint,
  ocupadoConZonas,
  celdaEsExterior,
  tileRectEnSvg,
  PLANO_TEXTO,
  PLANO_GRID_FUERTE,
  PLANO_GRID_SUAVE,
  PLANO_PAPEL_BORDE,
} from '../../house/planoGeometria'
import {
  MAPA_SUPERFICIE_ID,
  colorMargenPlanoDesdeCielo,
  rellenoPapelPlano,
} from '../../house/mapaSuperficie'
import { aristasZonasEnNivel, murosInicialesZona } from '../../house/murosZona'
import { roomEdges } from '../../house/walls'
import { paintZonaMuro } from './paintZonaMuro'
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
  type FormasCeldaMap,
} from '../../house/formasLoseta'
import { aplicarFormaEnPlano } from './planoEditarForma'
import { LosetaFormaSvg } from './LosetaFormaSvg'
import { PerimetroFormaPlanoSvg } from './PerimetroFormaPlanoSvg'
import { ladoGrillaActivo } from '../../house/murosPerimetroLoseta'
import { PlanoPapelRelleno } from './PlanoPapelRelleno'
import { usePlanoViewport } from './usePlanoViewport'
import { usePlanoRotacionCam } from './usePlanoRotacionCam'
import { useCam } from '../../state/cameraStore'

/** Croquis SVG ortogonal interactivo (vista en planta). */
export function PlanoCanvas({ onFitRef }: { onFitRef?: (fit: () => void) => void } = {}) {
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
  const toggleRoom = useLayout((s) => s.toggleRoom)
  const formasCeldaLayout = useLayout((s) => s.formasCelda)

  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)
  const roomPisoTipos = useDiseño((s) => s.roomPisoTipos)
  const roomPisoColors = useDiseño((s) => s.roomPisoColors)
  const roomTechoExtra = useDiseño((s) => s.roomTechoExtra)
  const mapaSuperficie = useDiseño((s) => s.mapaSuperficie)
  const fondoId = useDiseño((s) => s.fondoId)
  const fondoImagenActivo = useDiseño((s) => s.fondoImagenActivo)
  const temaGlobal = useDiseño((s) => s.temaGlobal)
  const mapaImagenUrl = useDiseño((s) => s.roomPisoImagenes[MAPA_SUPERFICIE_ID])
  const mapaImagenActiva = useDiseño((s) => s.roomPisoImagenActiva[MAPA_SUPERFICIE_ID] ?? false)
  const minutos = useCiclo((s) => s.minutos)
  const addTechoLinea = useDiseño((s) => s.addTechoLinea)
  const removeTechoLinea = useDiseño((s) => s.removeTechoLinea)

  const nivel = usePlanos((s) => s.nivel)
  const capa = usePlanos((s) => s.capa)
  const detalleRejilla = usePlanos((s) => s.detalleRejilla)
  const herramienta = usePlanos((s) => s.herramienta)
  const formaLoseta = usePlanos((s) => s.formaLoseta)
  const seleccion = usePlanos((s) => s.seleccion)
  const celdasMarcadas = usePlanos((s) => s.celdasMarcadas)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const toggleCeldaExterior = usePlanos((s) => s.toggleCeldaExterior)
  const toggleCeldaMarcada = usePlanos((s) => s.toggleCeldaMarcada)
  const setAviso = usePlanos((s) => s.setAviso)
  const draggingZonaId = usePlanos((s) => s.draggingZonaId)
  const previewZonaCeldas = usePlanos((s) => s.previewZonaCeldas)
  const zonaDragOrigen = usePlanos((s) => s.zonaDragOrigen)
  const setZonaDragPreview = usePlanos((s) => s.setZonaDragPreview)

  const zonas = zonasRepo.useAll() ?? []
  const pisosExterior = pisosExteriorRepo.useAll() ?? []

  const vp = useMemo(() => viewportPlano(gridCols, gridRows), [gridCols, gridRows])
  const areaPx = useMemo(() => areaPlanoPx(gridCols, gridRows), [gridCols, gridRows])
  const fondoMargen = useMemo(
    () => colorMargenPlanoDesdeCielo({ fondoId, fondoImagenActivo, temaGlobal, minutos }),
    [fondoId, fondoImagenActivo, temaGlobal, minutos],
  )
  const rellenoPapel = useMemo(
    () => rellenoPapelPlano(mapaSuperficie, mapaImagenActiva ? mapaImagenUrl : undefined),
    [mapaSuperficie, mapaImagenActiva, mapaImagenUrl],
  )
  const gridFuerte = mapaSuperficie.rejillaFuerte || PLANO_GRID_FUERTE
  const gridSuave = mapaSuperficie.rejillaSuave || PLANO_GRID_SUAVE
  const bordePapel = mapaSuperficie.papelBorde || PLANO_PAPEL_BORDE

  const {
    containerRef,
    mergeSvgRef,
    fitToContainer,
    cursorPan,
    viewBoxStr,
  } = usePlanoViewport(vp.ancho, vp.alto)

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
    (roomId: string, offCol: number, offRow: number, lado: import('../../house/walls').SideKey) => {
      const offKey = claveCeldaOff(offCol, offRow)
      return ladoGrillaActivo(formaEnCelda(formasCuartoDe(roomId), offKey), lado)
    },
    [formasCuartoDe],
  )

  const onPointerDownCelda = (c: Cell, roomIdHint?: string, zonaIdHint?: number) => {
    if (capa === 'cuartos') {
      if (herramienta === 'agregar') {
        const celda = { col: Math.round(c.col), row: Math.round(c.row) }
        const k = `${celda.col},${celda.row}`
        const yaMarcada = celdasMarcadas.some((x) => `${x.col},${x.row}` === k)
        const libre = celdaEnteraEsLibre(
          celda,
          nivel,
          placed,
          cells,
          footprints,
          niveles,
          zonas,
          idsCuartosNivel,
          anchorDe,
        )
        if (!yaMarcada && !libre) {
          setAviso('Esa celda ya está ocupada. Elige un espacio libre.')
          return
        }
        setAviso(null)
        toggleCeldaMarcada(celda)
        return
      }
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
          void toggleRoom(roomIdHint)
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
      const celda = { col: Math.round(c.col), row: Math.round(c.row) }
      const occTile = ocupanteEnTile(celda)
      const roomId = roomIdHint ?? (occTile?.tipo === 'cuarto' ? occTile.roomId : undefined)
      if (roomId) {
        // Celda con forma (triángulo/círculo): pintar su relleno; si es cuadrada, editar el cuarto.
        const a = anchorDe(roomId)
        const forma = a
          ? formaEnCelda(formasCuartoDe(roomId), claveCeldaOff(celda.col - a.col, celda.row - a.row))
          : undefined
        if (forma && !esFormaCuadrada(forma)) {
          toggleCeldaExterior(celda)
          return
        }
        setSeleccion({ tipo: 'cuarto', roomId })
        return
      }
      const zid =
        zonaIdHint ?? zonaEnCelda(zonas, nivel, celda.col, celda.row)?.id
      if (zid != null) {
        const z = zonas.find((zz) => zz.id === zid)
        const forma = formaEnCelda(z?.formasCelda, claveCeldaAbs(celda.col, celda.row))
        if (!esFormaCuadrada(forma)) {
          toggleCeldaExterior(celda)
          return
        }
        setSeleccion({ tipo: 'zona', zonaId: zid })
        return
      }
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
        toggleCeldaExterior(celda)
        return
      }
      return
    }

    if (capa === 'techos') {
      const rid = roomEnCelda(c)
      if (rid) setSeleccion({ tipo: 'cuarto', roomId: rid })
      return
    }

    setSeleccion({ tipo: 'celda', col: c.col, row: c.row })
  }

  const onClickArista = (roomId: string, off: Cell, side: (typeof aristas)[0]['edge']['side']) => {
    if (capa !== 'paredes') return
    setSeleccion({ tipo: 'arista', roomId, off, side })

    const item = aristas.find(
      (a) => a.roomId === roomId && a.edge.off.col === off.col && a.edge.off.row === off.row && a.edge.side === side,
    )
    if (!item) return

    const k = edgeKey(off, side)
    const muro = edgeStyles[roomId]?.[k]?.muro

    if (herramienta === 'puerta') {
      void paintEdge(roomId, off, side, 'puerta')
    } else if (herramienta === 'ventana') {
      if (item.estado === 'abierto') return
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
  const [hoverAgregar, setHoverAgregar] = useState<Cell | null>(null)
  const [hoverPisos, setHoverPisos] = useState<Cell | null>(null)

  const celdasMarcadasEnteras = useMemo(
    () => normalizarCeldasEnteras(celdasMarcadas),
    [celdasMarcadas],
  )

  const perimetroAgregar = useMemo(
    () => (herramienta === 'agregar' ? aristasPerimetroCeldas(celdasMarcadasEnteras) : []),
    [herramienta, celdasMarcadasEnteras],
  )

  const previewPuertasAgregar = useMemo(() => {
    if (herramienta !== 'agregar' || celdasMarcadasEnteras.length === 0) return []
    const occ = ocupadoPorNivel.get(nivel) ?? SIN_OCUPACION
    const muros = murosInicialesZona(celdasMarcadasEnteras, nivel, occ, zonas)
    const { anchor, footprint } = zonaAnchorFootprint(celdasMarcadasEnteras)
    const ocupado = ocupadoConZonas(nivel, ocupadoPorNivel, zonas)
    return roomEdges(anchor, footprint, ocupado)
      .filter((e) => {
        const st = muros[edgeKey(e.off, e.side)] ?? e.auto
        return st === 'puerta'
      })
      .map((e) => aristaASegmento(anchor, e))
      .filter((s): s is NonNullable<typeof s> => s != null)
  }, [herramienta, celdasMarcadasEnteras, nivel, ocupadoPorNivel, zonas])

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
    pisoExteriorMap.get(`${col},${row}`)?.color ?? '#3d4450'

  const capaColocacion = capa === 'cuartos' && herramienta === 'agregar'
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

  const manejarClickPlano = (e: React.PointerEvent) => {
    e.preventDefault()
    const p = svgPoint(e.clientX, e.clientY)
    if (!p) return
    const det = capaColocacion ? ('celda' as const) : detalleRejilla
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
      title="Rueda: zoom · Shift/Alt + arrastrar: mover · Doble clic en margen: encajar"
    >
      <div ref={rotWrapRef} className="h-full min-h-0 w-full flex-1">
      <svg
        ref={svgRefCombinado}
        viewBox={viewBoxStr}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full"
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

        {/* Fondo clicable (herramientas que no usan capa de colocación ni rejilla de pisos) */}
        {!capaColocacion && !capaSeleccionPisos && (
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
        {detalleRejilla === 'celda'
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

        {/* Piso exterior bajo cuartos (visible al mover: el hueco queda como exterior) */}
        {capa !== 'techos' &&
          capa !== 'paredes' &&
          Array.from({ length: gridCols }, (_, col) =>
            Array.from({ length: gridRows }, (_, row) => {
              if (
                !celdaEsExterior(
                  col,
                  row,
                  nivel,
                  idsCuartosNivel,
                  cellsEfectivos,
                  footprints,
                  zonas,
                  anchorDe,
                )
              ) {
                return null
              }
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
                  opacity={capa === 'cuartos' ? 0.55 : 0.9}
                  rx={2}
                  pointerEvents="none"
                />
              )
            }),
          )}

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
                pointerEvents={capaColocacion ? 'none' : undefined}
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
                    stroke={sel ? '#fff' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={sel ? 2 : 1}
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

        {capa === 'pisos' &&
          cuartosNivel.map((room) => {
            const anchor = anchorDe(room.id)
            const fp = footprints[room.id]
            if (!anchor || !fp) return null
            return footprintCells(anchor, fp).map((c) => {
              const fill = pisoSwatch(room.id)
              if (fill == null) return null
              const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
              const sel = seleccion?.tipo === 'cuarto' && seleccion.roomId === room.id
              const offKey = claveCeldaOff(c.col - anchor.col, c.row - anchor.row)
              const forma = formaEnCelda(formasCuartoDe(room.id), offKey)
              return (
                <g key={`p-${room.id}-${c.col}-${c.row}`}>
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
          const nombre = roomNames[room.id] || room.nombre.split(' · ')[0]
          const arrastrando = draggingId === room.id
          const invalido = arrastrando && !cuartoArrastrandoValido

          return (
            <g key={room.id}>
              {footprintCells(anchor, fp).map((c) => {
                const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
                const offKey = claveCeldaOff(c.col - anchor.col, c.row - anchor.row)
                return (
                  <LosetaFormaSvg
                    key={`r-${room.id}-${c.col}-${c.row}`}
                    x={x}
                    y={y}
                    w={w}
                    h={h}
                    forma={formaEnCelda(formasCuartoDe(room.id), offKey)}
                    fill={
                      invalido
                        ? 'rgba(239,68,68,0.45)'
                        : capa === 'pisos'
                          ? 'transparent'
                          : color
                    }
                    opacity={
                      capa === 'techos' ? 0.25 : arrastrando ? 0.92 : sel ? 0.95 : 0.75
                    }
                    stroke={invalido ? '#ef4444' : sel ? '#1e40af' : 'rgba(61,41,20,0.35)'}
                    strokeWidth={sel || arrastrando ? 2 : 1}
                    pointerEvents={capaColocacion || capa === 'pisos' ? 'none' : undefined}
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
                  fontSize={11}
                  fontWeight={700}
                  pointerEvents="none"
                  opacity={0.9}
                >
                  {room.icon} {nombre.length > 8 ? nombre.slice(0, 7) + '…' : nombre}
                </text>
                )
              })()}
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
                pointerEvents={capaColocacion || capaMover ? 'none' : undefined}
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
                pointerEvents={capaColocacion || capaMover ? 'none' : undefined}
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
            return footprintCells(anchor, fp).map((c) => {
              const { x, y, w, h } = tileRectEnSvg(c.col, c.row)
              const offKey = claveCeldaOff(c.col - anchor.col, c.row - anchor.row)
              const forma = formaEnCelda(formasCuartoDe(room.id), offKey)
              if (esFormaCuadrada(forma)) return null
              return (
                <PerimetroFormaPlanoSvg
                  key={`pfr-${room.id}-${c.col}-${c.row}`}
                  forma={forma}
                  x={x}
                  y={y}
                  w={w}
                  h={h}
                  stroke={color}
                  opacity={capa === 'cuartos' ? 0.55 : 1}
                />
              )
            })
          })}

        {/* Rejilla clicable + preview (Pisos → Seleccionar) */}
        {capaSeleccionPisos &&
          Array.from({ length: gridCols }, (_, col) =>
            Array.from({ length: gridRows }, (_, row) => {
              if (detalleRejilla === 'subcelda') {
                // Modo fino: 4 sub-cuadrantes clicables por celda (interior y exterior).
                const { x, y } = celdaASvg(col, row)
                return CUADRANTES_OFF.map((o, qi) => {
                  const q = { col: col + o.dc, row: row + o.dr }
                  const sel =
                    seleccion?.tipo === 'exterior' &&
                    seleccion.celdas.some((c) => c.col === q.col && c.row === q.row)
                  return (
                    <rect
                      key={`ps-${col}-${row}-${qi}`}
                      x={x + (o.dc > 0 ? PLANO_SUB_PX : 0)}
                      y={y + (o.dr > 0 ? PLANO_SUB_PX : 0)}
                      width={PLANO_SUB_PX}
                      height={PLANO_SUB_PX}
                      fill={sel ? 'rgba(52,211,153,0.4)' : 'transparent'}
                      stroke={sel ? '#10b981' : '#34d399'}
                      strokeWidth={sel ? 2 : 0.4}
                      style={{ cursor: 'cell' }}
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
              const esExterior = celdaEsExterior(
                col,
                row,
                nivel,
                idsCuartosNivel,
                cells,
                footprints,
                zonas,
                anchorDe,
              )
              const { x, y } = celdaASvg(col, row)
              const activa = selExterior || selInteriorGrupo || selCuarto || selZona
              const resaltarHover = hover && (esExterior || !occ)
              return (
                <rect
                  key={`ps-${col}-${row}`}
                  x={x}
                  y={y}
                  width={PLANO_CELL_PX}
                  height={PLANO_CELL_PX}
                  fill={
                    selExterior || selInteriorGrupo
                      ? 'rgba(52,211,153,0.4)'
                      : resaltarHover
                        ? 'rgba(52,211,153,0.15)'
                        : 'transparent'
                  }
                  stroke={activa ? '#10b981' : resaltarHover ? '#34d399' : undefined}
                  strokeWidth={activa ? 2 : resaltarHover ? 1 : 0}
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

        {/* Cuadrantes finos extra sobre celdas de cuartos a ½ celda (la rejilla entera no las cubre). */}
        {capaSeleccionPisos &&
          detalleRejilla === 'subcelda' &&
          celdasFinasExtra.map((cell) => {
            const { x, y } = celdaASvg(cell.col, cell.row)
            return CUADRANTES_OFF.map((o, qi) => {
              const q = { col: cell.col + o.dc, row: cell.row + o.dr }
              const sel =
                seleccion?.tipo === 'exterior' &&
                seleccion.celdas.some((c) => c.col === q.col && c.row === q.row)
              return (
                <rect
                  key={`psx-${cell.col},${cell.row}-${qi}`}
                  x={x + (o.dc > 0 ? PLANO_SUB_PX : 0)}
                  y={y + (o.dr > 0 ? PLANO_SUB_PX : 0)}
                  width={PLANO_SUB_PX}
                  height={PLANO_SUB_PX}
                  fill={sel ? 'rgba(52,211,153,0.4)' : 'transparent'}
                  stroke={sel ? '#10b981' : '#34d399'}
                  strokeWidth={sel ? 2 : 0.4}
                  style={{ cursor: 'cell' }}
                  onPointerDown={(ev) => {
                    ev.stopPropagation()
                    toggleCeldaExterior(q)
                  }}
                />
              )
            })
          })}

        {/* Espacio interior + rejilla clicable (Agregar cuarto) */}
        {capaColocacion &&
          Array.from({ length: gridCols }, (_, col) =>
            Array.from({ length: gridRows }, (_, row) => {
              const celda = { col, row }
              const k = `${col},${row}`
              const marcada = celdasMarcadasEnteras.some((x) => `${x.col},${x.row}` === k)
              const hover =
                hoverAgregar?.col === col && hoverAgregar?.row === row && !marcada
              const { x, y } = celdaASvg(col, row)
              return (
                <g key={`ag-${col}-${row}`}>
                  {marcada && (
                    <rect
                      x={x + 2}
                      y={y + 2}
                      width={PLANO_CELL_PX - 4}
                      height={PLANO_CELL_PX - 4}
                      fill="#a8a29e"
                      opacity={0.85}
                      rx={2}
                      pointerEvents="none"
                    />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={PLANO_CELL_PX}
                    height={PLANO_CELL_PX}
                    fill={
                      marcada
                        ? 'transparent'
                        : hover
                          ? 'rgba(52,211,153,0.15)'
                          : 'transparent'
                    }
                    stroke={marcada ? 'transparent' : hover ? '#34d399' : undefined}
                    strokeWidth={marcada ? 0 : 1}
                    style={{ cursor: 'cell' }}
                    onPointerEnter={() => setHoverAgregar(celda)}
                    onPointerLeave={() =>
                      setHoverAgregar((h) => (h?.col === col && h?.row === row ? null : h))
                    }
                    onPointerDown={(ev) => {
                      ev.stopPropagation()
                      onPointerDownCelda(celda)
                    }}
                  />
                </g>
              )
            }),
          )}

        {perimetroAgregar.map((ln, i) => (
          <line
            key={`per-${i}`}
            x1={ln.x1}
            y1={ln.y1}
            x2={ln.x2}
            y2={ln.y2}
            stroke="#78350f"
            strokeWidth={3}
            strokeLinecap="square"
            pointerEvents="none"
          />
        ))}

        {previewPuertasAgregar.map((ln, i) => (
          <line
            key={`pda-${i}`}
            x1={ln.x1}
            y1={ln.y1}
            x2={ln.x2}
            y2={ln.y2}
            stroke={COLOR_ARISTA.puerta}
            strokeWidth={GROSOR_ARISTA + 1}
            strokeLinecap="round"
            pointerEvents="none"
          />
        ))}

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
      </svg>
      </div>
    </div>
  )
}
