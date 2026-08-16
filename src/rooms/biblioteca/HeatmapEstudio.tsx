import { useT } from '../../core/i18n/useT'
import { Heatmap } from '../_shared/Heatmap'

/** Mapa de calor anual del tiempo de estudio, sobre el heatmap compartido de `rooms/_shared`. */
export function HeatmapEstudio({ minPorDia, color }: { minPorDia: Map<string, number>; color: string }) {
  const t = useT()
  return (
    <Heatmap
      modo="anual"
      datos={minPorDia}
      color={color}
      titulo={t('biblioteca.heatmap.anual', 'Último año de estudio')}
      textos={{
        dias: t('biblioteca.heatmap.dias', 'días activos'),
        menos: t('biblioteca.heatmap.menos', 'menos'),
        mas: t('biblioteca.heatmap.mas', 'más'),
      }}
    />
  )
}
