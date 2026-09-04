import { useT } from '../../../core/i18n/useT'
import { esAppNativa } from '../../../core/plataforma'
import { BotonSecundario } from '../../_shared/ui'
import { COLOR } from '../constantes'

export type Fase = 'exportando' | 'subiendo' | 'publicando'

/** Barra + las tres fases; el export bloquea (render en tiempo real), la subida puede seguir en segundo plano. */
export function ProgresoTrabajo({
  fase,
  fraccion,
  onCancelar,
  onSegundoPlano,
}: {
  fase: Fase
  fraccion: number
  onCancelar: () => void
  onSegundoPlano?: () => void
}) {
  const t = useT()
  const fases: { id: Fase; etiqueta: string }[] = [
    { id: 'exportando', etiqueta: t('video.publicar.fase.exportando', 'Exportando') },
    { id: 'subiendo', etiqueta: t('video.publicar.fase.subiendo', 'Subiendo') },
    { id: 'publicando', etiqueta: t('video.publicar.fase.publicando', 'Publicando') },
  ]
  const indice = fases.findIndex((f) => f.id === fase)
  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-1.5">
        {fases.map((f, i) => (
          <span
            key={f.id}
            aria-current={f.id === fase ? 'step' : undefined}
            className={`rounded-full px-2.5 py-0.5 text-[11px] ${
              i === indice ? 'bg-white/20 font-semibold' : i < indice ? 'text-white/60' : 'text-white/30'
            }`}
          >
            {f.etiqueta}
          </span>
        ))}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${fase === 'publicando' ? 'animate-pulse' : ''}`}
          style={{ width: `${fase === 'publicando' ? 100 : Math.round(fraccion * 100)}%`, background: COLOR }}
        />
      </div>
      <p className="text-xs text-white/50">
        {fase === 'exportando'
          ? t('video.export.nota', 'El export dura lo que dura el video: no bloquees la pantalla ni cambies de app.')
          : fase === 'subiendo' && esAppNativa()
            ? t('video.publicar.trabajo.noCierres', 'No cierres la app ni bloquees la pantalla hasta que termine la subida.')
            : t('video.publicar.trabajo.procesando', 'La red procesa el video al llegar; puede tardar unos minutos.')}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        {onSegundoPlano && (
          <BotonSecundario pequeno onClick={onSegundoPlano}>
            {t('video.publicar.trabajo.segundoPlano', 'Seguir editando')}
          </BotonSecundario>
        )}
        <BotonSecundario pequeno onClick={onCancelar}>
          {t('video.publicar.trabajo.cancelar', 'Cancelar')}
        </BotonSecundario>
      </div>
    </div>
  )
}
