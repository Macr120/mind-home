import { useMemo } from 'react'
import { useT } from '../../i18n/useT'
import { zonasRepo } from '../../data/repository'
import { useLayout, SIN_OCUPACION } from '../../state/layoutStore'
import {
  roomEdges,
  effectiveEdge,
  type WallState,
} from '../../house/walls'
import { zonaAnchorFootprint, ocupadoConZonas } from '../../house/planoGeometria'
import { murosEfectivosZona } from '../../house/murosZona'
import { paintZonaMuro } from './paintZonaMuro'

const INFO: Record<WallState, { labelEs: string; color: string }> = {
  pared: { labelEs: 'Pared', color: '#b45309' },
  puerta: { labelEs: 'Puerta', color: '#22c55e' },
  abierto: { labelEs: 'Abierto', color: '#38bdf8' },
}

const ESTADOS: WallState[] = ['pared', 'puerta', 'abierto']

/** Editor de arista para cuartos básicos del plano. */
export function ZonaWallEditor({
  zonaId,
  off,
  side,
}: {
  zonaId: number
  off: { col: number; row: number }
  side: 'N' | 'S' | 'E' | 'O'
}) {
  const t = useT()
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const zonas = zonasRepo.useAll() ?? []

  const zona = zonas.find((z) => z.id === zonaId)
  const estadoActual = useMemo(() => {
    if (!zona) return 'pared' as WallState
    const occ = ocupadoPorNivel.get(zona.nivel) ?? SIN_OCUPACION
    const { anchor, footprint } = zonaAnchorFootprint(zona.celdas)
    const ocupado = ocupadoConZonas(zona.nivel, ocupadoPorNivel, zonas, zona.id)
    const muros = murosEfectivosZona(zona, zonas, occ)
    const e = roomEdges(anchor, footprint, ocupado).find(
      (x) => x.off.col === off.col && x.off.row === off.row && x.side === side,
    )
    if (!e) return 'pared' as WallState
    return effectiveEdge(e, muros)
  }, [zona, zonas, ocupadoPorNivel, off, side])

  if (!zona) return null

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-white/80">{zona.nombre}</p>
      <p className="text-[10px] text-white/40">
        {t('planos.arista', 'Arista')} {side} · ({off.col}, {off.row})
      </p>
      <div className="flex flex-col gap-1">
        {ESTADOS.map((est) => {
          const info = INFO[est]
          const activo = estadoActual === est
          return (
            <button
              key={est}
              type="button"
              onClick={() => void paintZonaMuro(zonaId, off, side, est)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium transition"
              style={
                activo
                  ? {
                      background: `${info.color}22`,
                      color: info.color,
                      boxShadow: `inset 0 0 0 1px ${info.color}55`,
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.65)',
                    }
              }
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: info.color }}
              />
              {t(`planos.muro.${est}`, info.labelEs)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
