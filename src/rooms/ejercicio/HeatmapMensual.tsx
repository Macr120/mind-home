import { useMemo } from 'react'
import type { SesionEjercicio, TipoEntrenamiento } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Heatmap } from '../_shared/Heatmap'

/**
 * Mapa de calor mensual de actividad: los minutos entrenados de una modalidad
 * por día, sobre el heatmap compartido de `rooms/_shared`.
 */
export function HeatmapMensual({
  sesiones,
  tipo,
  color,
}: {
  sesiones: SesionEjercicio[]
  tipo: TipoEntrenamiento
  color: string
}) {
  const t = useT()

  const minPorDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of sesiones) {
      if (s.tipo !== tipo) continue
      m.set(s.fecha, (m.get(s.fecha) ?? 0) + s.duracionMin)
    }
    return m
  }, [sesiones, tipo])

  return (
    <Heatmap
      modo="mes"
      datos={minPorDia}
      color={color}
      textos={{
        dias: t('ejercicio.heatmap.dias', 'días activos'),
        menos: t('ejercicio.heatmap.menos', 'menos'),
        mas: t('ejercicio.heatmap.mas', 'más'),
      }}
    />
  )
}
