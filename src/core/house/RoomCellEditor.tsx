import { Html } from '@react-three/drei'
import { useLayout, SIN_OCUPACION } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { useCuartos } from '../state/cuartosStore'
import { celdasEdicionCuarto } from './roomCellEdicion'
import { useT } from '../i18n/useT'
import {
  cellToWorld,
  cellId,
  nivelBaseY,
  FOOTPRINT_DEFAULT,
} from './walls'

/**
 * Botones + / − por celda para dar forma al cuarto:
 * - '+' en cada celda libre adyacente a la forma (la añade).
 * - '−' en cada celda de la forma (la quita, si no parte el cuarto).
 * Por defecto edita el cuarto en edición (editingRoomId); con `roomId` se puede
 * apuntar a un cuarto concreto (p. ej. el seleccionado en el constructor de mapa).
 */
export function RoomCellEditor({ roomId }: { roomId?: string } = {}) {
  const t = useT()
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const id = roomId ?? editingRoomId
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const niveles = useLayout((s) => s.niveles)
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const expandirCeldaCuarto = useLayout((s) => s.expandirCeldaCuarto)
  const contraerCeldaCuarto = useLayout((s) => s.contraerCeldaCuarto)
  const eliminarCuarto = useCuartos((s) => s.eliminar)

  if (!id || !cells[id]) return null

  const fp = footprints[id] ?? FOOTPRINT_DEFAULT
  const ocupado = ocupadoPorNivel.get(niveles[id] ?? 0) ?? SIN_OCUPACION
  const { quitar, agregar } = celdasEdicionCuarto(cells[id], fp, ocupado, gridCols, gridRows)
  // El '−' de un cuarto de una sola celda elimina el cuarto entero.
  const quitarCelda = (c: { col: number; row: number }) =>
    fp.length <= 1 ? void eliminarCuarto(id) : void contraerCeldaCuarto(id, c)
  // Altura del nivel del cuarto: los botones +/− siguen al cuarto aunque esté elevado.
  const y0 = nivelBaseY(niveles[id] ?? 0, apilado)

  return (
    <>
      {/* '−' en cada celda propia (solo si no parte el cuarto) */}
      {quitar.map(({ cell: c, puede }) => {
        if (!puede) return null
        const [x, , z] = cellToWorld(c.col, c.row)
        return (
          <Html key={'m' + cellId(c.col, c.row)} position={[x, y0 + 1.1, z]} center zIndexRange={[30, 0]}>
            <button
              type="button"
              onClick={() => quitarCelda(c)}
              title={fp.length <= 1 ? t('celdas.eliminarCuarto', 'Eliminar el cuarto') : t('celdas.quitar', 'Quitar esta celda')}
              className="ui-panel-glass flex h-7 w-7 items-center justify-center rounded-md border border-white/20 text-base font-bold text-red-400 backdrop-blur-sm transition hover:bg-red-400/25"
            >
              −
            </button>
          </Html>
        )
      })}

      {/* '+' en cada celda libre adyacente */}
      {agregar.map((v) => {
        const [x, , z] = cellToWorld(v.col, v.row)
        return (
          <Html key={'p' + cellId(v.col, v.row)} position={[x, y0 + 0.6, z]} center zIndexRange={[30, 0]}>
            <button
              type="button"
              onClick={() => expandirCeldaCuarto(id, v)}
              title={t('celdas.extender', 'Extender el cuarto aquí')}
              className="ui-panel-glass flex h-8 w-8 items-center justify-center rounded-md border border-emerald-400/40 text-lg font-bold text-emerald-400 backdrop-blur-sm transition hover:bg-emerald-400/25"
            >
              +
            </button>
          </Html>
        )
      })}
    </>
  )
}
