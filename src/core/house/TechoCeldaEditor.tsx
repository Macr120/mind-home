import { Html } from '@react-three/drei'
import { useLayout, SIN_OCUPACION } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { useHouse } from '../state/houseStore'
import { usePlanos } from '../state/planosStore'
import {
  cellToWorld,
  nivelBaseY,
  cellId,
  FOOTPRINT_DEFAULT,
} from './walls'
import { lineasExpandiblesTecho, lineasRetraiblesTecho } from './techoCeldas'

const ETIQUETA_DIR: Record<string, string> = {
  N: 'norte',
  S: 'sur',
  O: 'oeste',
  E: 'este',
}

/**
 * Expande/retrae el TECHO como UNA sola losa: un + por dirección que extiende toda la
 * línea de esa dirección (uniforme), y un − por dirección que retrae el borde exterior.
 * Solo sobre cuartos vecinos colocados (no celdas vacías).
 */
export function TechoCeldaEditor() {
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const alturaTechoPorNivel = useLayout((s) => s.alturaTechoPorNivel)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const conTecho = useHouse((s) => s.conTecho)

  const roomTechoExtra = useDiseño((s) => s.roomTechoExtra)
  const addTechoLinea = useDiseño((s) => s.addTechoLinea)
  const removeTechoLinea = useDiseño((s) => s.removeTechoLinea)

  // En Planos (capa Techos) se opera sobre el cuarto seleccionado; si no, sobre el cuarto en edición.
  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const seleccion = usePlanos((s) => s.seleccion)
  const roomId =
    editingRoomId ??
    (planosActivo && capa === 'techos' && seleccion?.tipo === 'cuarto' ? seleccion.roomId : null)

  if (!roomId || !conTecho || !cells[roomId]) return null

  const anchor = cells[roomId]
  const fp = footprints[roomId] ?? FOOTPRINT_DEFAULT
  const extra = roomTechoExtra[roomId] ?? []
  const nivel = niveles[roomId] ?? 0
  const ocupado = ocupadoPorNivel.get(nivel) ?? SIN_OCUPACION
  const ocupadoSup = ocupadoPorNivel.get(nivel + 1)
  const y0 = nivelBaseY(nivel, conTecho)

  const alturaPorCelda = alturaTechoPorNivel.get(nivel) ?? new Map<string, number>()
  const alturaActual = alturaPorCelda.get(cellId(anchor.col, anchor.row)) ?? 0

  const expandir = lineasExpandiblesTecho(
    anchor,
    fp,
    extra,
    gridCols,
    gridRows,
    ocupado,
    ocupadoSup,
    alturaActual,
    alturaPorCelda,
  )
  const retraer = lineasRetraiblesTecho(anchor, fp, extra)

  if (expandir.length === 0 && retraer.length === 0) return null

  return (
    <>
      {retraer.map(({ dir, celdas, centro }) => {
        const [x, , z] = cellToWorld(centro.col, centro.row)
        return (
          <Html
            key={`tm-${dir}`}
            position={[x, y0 + 1.15, z]}
            center
            zIndexRange={[86, 0]}
            pointerEvents="auto"
          >
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                void removeTechoLinea(roomId, celdas)
              }}
              title={`Retraer techo del ${ETIQUETA_DIR[dir]}`}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-black/60 text-base font-bold text-red-400 backdrop-blur-sm transition hover:bg-red-400/25"
            >
              −
            </button>
          </Html>
        )
      })}

      {expandir.map(({ dir, celdas, centro }) => {
        const [x, , z] = cellToWorld(centro.col, centro.row)
        return (
          <Html
            key={`tp-${dir}`}
            position={[x, y0 + 0.65, z]}
            center
            zIndexRange={[86, 0]}
            pointerEvents="auto"
          >
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                void addTechoLinea(roomId, celdas)
              }}
              title={`Extender techo hacia el ${ETIQUETA_DIR[dir]}`}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-400/45 bg-black/60 text-lg font-bold text-amber-300 backdrop-blur-sm transition hover:bg-amber-400/20"
            >
              +
            </button>
          </Html>
        )
      })}
    </>
  )
}
