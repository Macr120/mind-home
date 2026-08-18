import type { GratitudDiaria, SesionMindfulness } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'
import { diasConCalmaMes, etapaActual, minutosTotales, siguienteEtapa } from './calma'
import { COLOR } from './constantes'

/**
 * La habitación refleja CALMA ACUMULADA: minutos de por vida que solo suman.
 * Sin niveles ni rachas; los días sin práctica no se marcan ni se castigan.
 */
export function CalmaHeader({
  sesiones,
  gratitudes,
}: {
  sesiones: SesionMindfulness[]
  gratitudes: GratitudDiaria[]
}) {
  const t = useT()
  const total = minutosTotales(sesiones)
  const etapa = etapaActual(total)
  const sig = siguienteEtapa(total)
  const dias = diasConCalmaMes(sesiones, gratitudes)
  const pct = sig ? ((total - etapa.min) / (sig.min - etapa.min)) * 100 : 100
  const totalFmt = total >= 120 ? `${Math.floor(total / 60)} h ${total % 60} min` : `${total} min`

  return (
    <div className="rounded-xl border border-white/10 p-4" style={{ background: `color-mix(in srgb, ${COLOR} 7%, transparent)` }}>
      <div className="flex items-center gap-3">
        <span className="text-4xl">
          <Icono emoji={etapa.icono} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/50">{t('jardin.calma.titulo', 'Calma acumulada')}</p>
          <p className="text-xl font-black texto-vivo" style={vivo(COLOR)}>
            {totalFmt}
          </p>
          <p className="text-xs text-white/45">{t(`jardin.etapa.${etapa.id}`, etapa.nombre)}</p>
        </div>
        {dias > 0 && (
          <div className="text-end shrink-0">
            <p className="text-lg font-bold texto-vivo" style={vivo(COLOR)}>
              <Icono nombre="flor" /> {dias}
            </p>
            <p className="text-[10px] text-white/45 max-w-24">
              {dias === 1
                ? t('jardin.calma.mes1', 'día con calma este mes')
                : t('jardin.calma.mes', 'días con calma este mes')}
            </p>
          </div>
        )}
      </div>
      {sig && (
        <>
          <div className="mt-3 h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLOR }} />
          </div>
          <p className="text-[10px] text-white/35 mt-1">
            {t(
              'jardin.calma.siguiente',
              `A ${sig.min - total} min de: ${t(`jardin.etapa.${sig.id}`, sig.nombre)} ${sig.icono}`,
              { n: sig.min - total, etapa: `${t(`jardin.etapa.${sig.id}`, sig.nombre)} ${sig.icono}` },
            )}
          </p>
        </>
      )}
    </div>
  )
}
