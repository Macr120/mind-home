import { useEffect } from 'react'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { useSesion } from '../../core/cuenta/sesionStore'
import { formatoBytes, refrescarUsoAlmacen, useAlmacen } from '../../core/cuenta/almacen'
import { fechaPurga } from '../../core/cuenta/almacenUso'
import { useNubeStudio } from '../../core/studio/nubeStudio'
import { COLOR } from './constantes'

/** Lo usado de la nube, el aviso de solo lectura (con su fecha de purga) y el de nube llena. */
export function Medidor({ puedeSubir }: { puedeSubir: boolean }) {
  const t = useT()
  const uso = useAlmacen((s) => s.uso)
  const plan = useSesion((s) => s.plan)
  const planExpira = useSesion((s) => s.planExpira)
  const sinPlanDesde = useSesion((s) => s.sinPlanDesde)
  const llena = useNubeStudio((s) => s.llena)
  const purga = puedeSubir ? null : fechaPurga({ plan, planExpira, sinPlanDesde })
  useEffect(() => {
    void refrescarUsoAlmacen()
  }, [])
  if (!uso) return null
  const pct = uso.cuota ? Math.min(100, (uso.usados / uso.cuota) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-white/60">
        <span className="truncate">
          <Icono nombre="nube" />{' '}
          {uso.cuota == null
            ? t('archivos.uso.sinTope', '{usados} usados', { usados: formatoBytes(uso.usados) })
            : t('archivos.uso', '{usados} de {cuota}', { usados: formatoBytes(uso.usados), cuota: formatoBytes(uso.cuota) })}
        </span>
        {uso.cuota != null && uso.cuota > 0 && <span>{Math.round(pct)} %</span>}
      </div>
      {uso.cuota != null && uso.cuota > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 90 ? '#f87171' : COLOR }} />
        </div>
      )}
      {!puedeSubir && (
        <p className="text-xs text-amber-300/80">
          {t('archivos.soloLectura', 'Tu plan no incluye nube: puedes ver y bajar tus archivos, pero no subir nuevos.')}
          {purga && uso.usados > 0 && (
            <>
              {' '}
              {t('archivos.purga', 'Se borran de la nube el {fecha}: bájalos antes o reactiva Pro.', {
                fecha: purga.toLocaleDateString(localeActual(), { day: 'numeric', month: 'long', year: 'numeric' }),
              })}
            </>
          )}
        </p>
      )}
      {puedeSubir && llena && (
        <p className="text-xs text-amber-300/80">
          {t('archivos.studio.llena', 'Tu nube está llena: lo nuevo del Studio se queda solo en este dispositivo.')}
        </p>
      )}
    </div>
  )
}
