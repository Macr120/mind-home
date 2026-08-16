import { useMemo, useState } from 'react'
import type { Transaccion } from '../../core/data/db'
import { etiquetaCorta, hoyISO, money, money2, rangoPeriodo, sumarPeriodo, totalEnRango } from './mes'
import { promedioMensual } from './useResumen'
import { AZUL, ROJO, TARJETA, VERDE } from './ui'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'

/** Horizonte por defecto y límites del campo (1 mes a 10 años). */
const MESES_DEFECTO = 12
const MESES_MIN = 1
const MESES_MAX = 120

/**
 * Simulador a futuro: proyecta los fijos a su vencimiento real y lo variable
 * con el promedio mensual de lo ya registrado. Dibuja el acumulado en dos
 * escenarios, con el patrimonio de arranque y sin él. El horizonte (en meses)
 * lo ajusta el propio usuario.
 */
export function SimuladorAnual({ movimientos, patrimonio }: { movimientos: Transaccion[]; patrimonio: number }) {
  const t = useT()
  const hoy = hoyISO()
  const [horizonteTexto, setHorizonteTexto] = useState(String(MESES_DEFECTO))
  const horizonte = Math.min(MESES_MAX, Math.max(MESES_MIN, parseInt(horizonteTexto, 10) || MESES_DEFECTO))

  const meses = useMemo(() => {
    const promIng = promedioMensual(movimientos, 'ingreso', hoy)
    const promGas = promedioMensual(movimientos, 'gasto', hoy)
    const base = Array.from({ length: horizonte }, (_, i) => {
      const ancla = sumarPeriodo(hoy, 'mes', i)
      const { desde, hasta } = rangoPeriodo(ancla, 'mes')
      const opciones = { solo: 'fijos' as const, proyectar: true }
      const ingresos = totalEnRango(movimientos, 'ingreso', desde, hasta, opciones) + promIng
      const gastos = totalEnRango(movimientos, 'gasto', desde, hasta, opciones) + promGas
      return { ancla, ingresos, gastos }
    })
    return base.map((m, i) => ({
      ...m,
      acumulado: base.slice(0, i + 1).reduce((a, x) => a + x.ingresos - x.gastos, 0),
    }))
  }, [movimientos, hoy, horizonte])

  const ingresos = meses.reduce((a, m) => a + m.ingresos, 0)
  const gastos = meses.reduce((a, m) => a + m.gastos, 0)
  const balance = ingresos - gastos
  const final = meses[horizonte - 1].acumulado

  // Escala común a las dos líneas para que se comparen a ojo.
  const valores = meses.flatMap((m) => [m.acumulado, patrimonio + m.acumulado])
  const min = Math.min(0, ...valores)
  const max = Math.max(0, patrimonio, ...valores)
  const alto = Math.max(1, max - min)
  const y = (v: number) => 100 - ((v - min) / alto) * 100
  const x = (i: number) => (i / Math.max(1, horizonte - 1)) * 100
  const linea = (valor: (m: (typeof meses)[number]) => number) =>
    meses.map((m, i) => `${x(i)},${y(valor(m))}`).join(' ')

  // Hasta 6 etiquetas en el eje, más la última, sin importar el horizonte.
  const paso = Math.max(1, Math.round(horizonte / 6))

  return (
    <div data-tut="despacho.simulador" className={`${TARJETA} space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {t('despacho.sim.titulo', `Simulador · próximos ${horizonte} meses`, { n: String(horizonte) })}
          </p>
          <p className="text-[11px] leading-relaxed text-white/40">
            {t(
              'despacho.sim.base',
              'Proyecta tus fijos a su vencimiento y lo variable con el promedio mensual de lo que llevas registrado.',
            )}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-white/55">
          {t('despacho.sim.meses', 'meses')}
          <input
            type="number"
            min={MESES_MIN}
            max={MESES_MAX}
            value={horizonteTexto}
            onChange={(e) => setHorizonteTexto(e.target.value)}
            onBlur={() => setHorizonteTexto(String(horizonte))}
            className="w-16 rounded-lg bg-black/30 px-2 py-1 text-end text-sm outline-none border border-white/10 focus:border-white/30"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Dato titulo={t('despacho.r.ingresos', 'Ingresos')} valor={money(ingresos)} color={VERDE} />
        <Dato titulo={t('despacho.r.gastos', 'Gastos')} valor={money(gastos)} color={ROJO} />
        <Dato
          titulo={t('despacho.r.balance', 'Balance')}
          valor={money(balance)}
          color={balance >= 0 ? AZUL : ROJO}
        />
      </div>

      <div className="rounded-lg bg-black/20 p-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-32 w-full">
          {/* Línea del cero: separa lo que suma de lo que hunde el acumulado. */}
          <line x1="0" y1={y(0)} x2="100" y2={y(0)} stroke="#ffffff22" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          {patrimonio > 0 && (
            <polyline
              points={linea((m) => patrimonio + m.acumulado)}
              fill="none"
              stroke={VERDE}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <polyline
            points={linea((m) => m.acumulado)}
            fill="none"
            stroke={AZUL}
            strokeWidth="2"
            strokeDasharray={patrimonio > 0 ? '4 3' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-white/40">
          {meses
            .filter((_, i) => i % paso === 0 && i !== horizonte - 1)
            .map((m) => (
              <span key={m.ancla}>{etiquetaCorta(m.ancla, 'mes')}</span>
            ))}
          <span>{etiquetaCorta(meses[horizonte - 1].ancla, 'mes')}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Escenario
          color={AZUL}
          etiqueta={t('despacho.sim.sinPatrimonio', `Sin patrimonio · en ${horizonte} meses`, { n: String(horizonte) })}
          valor={money2(final)}
        />
        {patrimonio > 0 && (
          <Escenario
            color={VERDE}
            etiqueta={t('despacho.sim.conPatrimonio', `Con patrimonio · en ${horizonte} meses`, { n: String(horizonte) })}
            valor={money2(patrimonio + final)}
          />
        )}
        {patrimonio === 0 && (
          <p className="px-1 text-[11px] text-white/40">
            <Icono nombre="ayuda" />{' '}
            {t('despacho.sim.faltaPatrimonio', 'Apunta tu patrimonio arriba para ver también el escenario con él.')}
          </p>
        )}
      </div>
    </div>
  )
}

function Dato({ titulo, valor, color }: { titulo: string; valor: string; color: string }) {
  return (
    <div className="rounded-lg bg-black/20 p-2.5">
      <p className="text-[11px] text-white/55">{titulo}</p>
      <p className="texto-vivo text-base font-bold" style={vivo(color)}>
        {valor}
      </p>
    </div>
  )
}

function Escenario({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="text-xs text-white/55">{etiqueta}</span>
      <span className="texto-vivo ms-auto text-sm font-bold" style={vivo(color)}>
        {valor}
      </span>
    </div>
  )
}
