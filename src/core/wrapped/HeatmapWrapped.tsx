import { useMemo } from 'react'
import { deIso, fechaLocalISO, inicioSemana, isoMasDias } from '../fechaLocal'
import { localeActual } from '../i18n/useT'
import type { Periodo } from './periodo'

/**
 * Heatmap del periodo del Wrapped. A diferencia de los de hobbies/biblioteca
 * (que siempre terminan en "hoy"), este pinta EXACTAMENTE el rango del periodo:
 * semana = fila de 7 días · mes = calendario · año = tira de semanas.
 * Solo se usa dentro del overlay (`.ui-noche`), por eso los text-white/X.
 */

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Copia mínima de hobbies/stats.rgba (los cuartos no se importan desde core).
function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const VACIO = 'rgba(255,255,255,0.08)'

const alfaDe = (n: number, max: number) => 0.25 + 0.75 * Math.min(1, n / (max || 1))

export function HeatmapWrapped({
  porDia,
  periodo,
  color,
}: {
  porDia: Map<string, number>
  periodo: Periodo
  color: string
}) {
  const { desde, hasta, tipo } = periodo

  const max = useMemo(() => {
    let m = 0
    for (const [f, n] of porDia) if (f >= desde && f <= hasta) m = Math.max(m, n)
    return m
  }, [porDia, desde, hasta])

  const celda = (f: string) => {
    const n = porDia.get(f) ?? 0
    return { n, fondo: n > 0 ? rgba(color, alfaDe(n, max)) : VACIO }
  }

  if (tipo === 'semana') {
    const dias = Array.from({ length: 7 }, (_, i) => isoMasDias(desde, i))
    return (
      <div className="flex justify-center gap-2">
        {dias.map((f, i) => {
          const { n, fondo } = celda(f)
          return (
            <div key={f} className="flex flex-col items-center gap-1.5">
              <div
                title={`${f} · ${n}`}
                className="grid h-11 w-11 place-items-center rounded-lg text-sm font-bold text-white/85"
                style={{ background: fondo }}
              >
                {n > 0 ? n : ''}
              </div>
              <span className="text-[10px] text-white/45">{DIAS[i]}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (tipo === 'mes') {
    const anio = Number(desde.slice(0, 4))
    const mes = Number(desde.slice(5, 7)) - 1
    const primero = new Date(anio, mes, 1)
    const ultimo = new Date(anio, mes + 1, 0)
    const offInicio = (primero.getDay() + 6) % 7
    const totalCeldas = offInicio + ultimo.getDate()
    const celdas = Array.from({ length: totalCeldas }, (_, i) => {
      const d = new Date(anio, mes, 1 - offInicio + i)
      return { iso: fechaLocalISO(d), enMes: d.getMonth() === mes, dia: d.getDate() }
    })
    return (
      <div className="mx-auto grid w-full max-w-xs grid-cols-7 gap-1">
        {DIAS.map((d, i) => (
          <div key={i} className="text-center text-[9px] text-white/40">
            {d}
          </div>
        ))}
        {celdas.map((c, i) => {
          if (!c.enMes) return <div key={i} />
          const { n, fondo } = celda(c.iso)
          return (
            <div
              key={i}
              title={`${c.iso} · ${n}`}
              className="grid aspect-square place-items-center rounded-md text-[10px] text-white/60"
              style={{ background: fondo }}
            >
              {c.dia}
            </div>
          )
        })}
      </div>
    )
  }

  // Año: tira de semanas (L→D) acotada al rango, con etiqueta al estrenar mes.
  const locale = localeActual()
  const columnas: { lunes: string; mes: string; dias: string[] }[] = []
  for (
    let lunes = fechaLocalISO(inicioSemana(deIso(desde)));
    lunes <= hasta;
    lunes = isoMasDias(lunes, 7)
  ) {
    columnas.push({
      lunes,
      mes:
        Number(lunes.slice(8, 10)) <= 7
          ? deIso(lunes).toLocaleDateString(locale, { month: 'short' })
          : '',
      dias: Array.from({ length: 7 }, (_, i) => isoMasDias(lunes, i)),
    })
  }
  return (
    <div className="flex justify-center">
      <div className="flex max-w-full gap-0.5 overflow-x-auto pb-1">
        {columnas.map((c) => (
          <div key={c.lunes} className="flex shrink-0 flex-col gap-0.5">
            <span className="h-3 text-[8px] leading-none text-white/40">{c.mes}</span>
            {c.dias.map((f) => {
              if (f < desde || f > hasta)
                return <div key={f} className="h-2.5 w-2.5 opacity-0" />
              const { n, fondo } = celda(f)
              return (
                <div
                  key={f}
                  title={`${f} · ${n}`}
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ background: fondo }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
