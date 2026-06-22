import { useMemo } from 'react'
import type { SesionMindfulness } from '../../core/data/db'
import { COLOR, TIPOS } from './constantes'
import { minutosPorTipo, rachaDias, tendencia7Dias } from './stats'
import { useT } from '../../core/i18n/useT'

export function ResumenTab({
  sesiones,
  objetivoMin,
}: {
  sesiones: SesionMindfulness[]
  objetivoMin: number
}) {
  const t = useT()
  const racha = rachaDias(sesiones)
  const totalMin = sesiones.reduce((s, x) => s + x.duracionMin, 0)
  const tendencia = useMemo(() => tendencia7Dias(sesiones), [sesiones])
  const porTipo = useMemo(() => minutosPorTipo(sesiones), [sesiones])
  const maxBar = Math.max(objetivoMin, ...tendencia.map((item) => item.min), 1)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border border-white/10 p-4 col-span-2"
          style={{ background: `${COLOR}18` }}
        >
          <p className="text-xs text-white/50">{t('jardin.r.totalMin', 'Minutos totales practicados')}</p>
          <p className="text-3xl font-black" style={{ color: COLOR }}>
            {totalMin} min
          </p>
        </div>
        <Mini label={t('jardin.r.racha', 'Racha actual')} valor={`${racha} días`} />
        <Mini label={t('jardin.r.meta', 'Meta diaria')} valor={`${objetivoMin} min`} />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">{t('jardin.r.dias7', 'Minutos · últimos 7 días')}</p>
        <div className="flex items-stretch justify-between gap-1.5 h-24">
          {tendencia.map((item) => (
            <div key={item.fecha} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t"
                  style={{
                    height: `${Math.max(6, (item.min / maxBar) * 100)}%`,
                    background: COLOR,
                    opacity: item.min >= objetivoMin ? 1 : 0.5,
                  }}
                  title={`${item.min} min`}
                />
              </div>
              <span className="text-[9px] text-white/40">{item.fecha.slice(8)}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/35 text-center mt-2">
          {t('jardin.r.barraCompleta', `Barra completa = meta diaria (${objetivoMin} min)`, { n: String(objetivoMin) })}
        </p>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-2">{t('jardin.r.porTipo', 'Por tipo de práctica')}</p>
        <div className="space-y-2">
          {TIPOS.map((tipoItem) => {
            const min = porTipo.get(tipoItem.id) ?? 0
            if (min === 0) return null
            return (
              <div key={tipoItem.id} className="flex justify-between text-sm">
                <span>
                  {tipoItem.icon} {tipoItem.label}
                </span>
                <span className="text-white/50">{min} min</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Mini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-lg font-bold">{valor}</p>
    </div>
  )
}
