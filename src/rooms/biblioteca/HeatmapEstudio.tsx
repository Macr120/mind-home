import { useEffect, useMemo, useRef } from 'react'
import { useT } from '../../core/i18n/useT'
import { hoyISO } from './fecha'
import { diasSemana, inicioSemana, rgba, sumarDias } from './stats'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const FILAS = ['L', '', 'X', '', 'V', '', '']

/**
 * Mapa de calor anual del tiempo de estudio (adaptado del de hobbies; los
 * rooms no se importan entre sí): 53 semanas L→D terminando en la actual.
 */
export function HeatmapEstudio({ minPorDia, color }: { minPorDia: Map<string, number>; color: string }) {
  const t = useT()
  const scrollRef = useRef<HTMLDivElement>(null)
  const hoy = hoyISO()

  const { columnas, total, diasActivos, max } = useMemo(() => {
    const lunesFinal = inicioSemana(hoy)
    const columnas = Array.from({ length: 53 }, (_, i) => {
      const lunes = sumarDias(lunesFinal, -7 * (52 - i))
      // Etiqueta de mes solo en la semana que lo estrena (lunes en los primeros 7 días).
      const mes = Number(lunes.slice(8, 10)) <= 7 ? MESES[Number(lunes.slice(5, 7)) - 1] : ''
      return { lunes, mes, dias: diasSemana(lunes) }
    })
    let total = 0
    let diasActivos = 0
    let max = 0
    for (const c of columnas)
      for (const f of c.dias) {
        if (f > hoy) continue
        const min = minPorDia.get(f) ?? 0
        total += min
        if (min > 0) diasActivos++
        max = Math.max(max, min)
      }
    return { columnas, total, diasActivos, max }
  }, [minPorDia, hoy])

  // Abre con el scroll al final: la semana en curso queda visible.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{t('biblioteca.heatmap.anual', 'Último año de estudio')}</p>
        <p className="text-[9px] text-white/45">
          {total} min · {diasActivos} {t('biblioteca.heatmap.dias', 'días activos')}
        </p>
      </div>

      <div className="flex gap-1">
        <div className="flex flex-col gap-0.5 pt-3.5 text-[8px] text-white/35">
          {FILAS.map((d, i) => (
            <span key={i} className="flex h-2.5 items-center">
              {d}
            </span>
          ))}
        </div>
        <div ref={scrollRef} className="flex gap-0.5 overflow-x-auto pb-1">
          {columnas.map((c) => (
            <div key={c.lunes} className="flex shrink-0 flex-col gap-0.5">
              <span className="h-3 text-[8px] leading-none text-white/35">{c.mes}</span>
              {c.dias.map((f) => {
                const min = minPorDia.get(f) ?? 0
                const alpha = min > 0 ? 0.25 + 0.75 * Math.min(1, min / (max || 1)) : 0
                return (
                  <div
                    key={f}
                    title={`${f} · ${min} min`}
                    className={`h-2.5 w-2.5 rounded-[2px] ${f === hoy ? 'ring-1 ring-white/60' : ''} ${
                      f > hoy ? 'opacity-0' : ''
                    }`}
                    style={{ background: min > 0 ? rgba(color, alpha) : 'rgba(255,255,255,0.04)' }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1 text-[8px] text-white/35">
        <span>{t('biblioteca.heatmap.menos', 'menos')}</span>
        {[0.04, 0.35, 0.6, 0.85, 1].map((a, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-sm"
            style={{ background: i === 0 ? 'rgba(255,255,255,0.04)' : rgba(color, a) }}
          />
        ))}
        <span>{t('biblioteca.heatmap.mas', 'más')}</span>
      </div>
    </div>
  )
}
