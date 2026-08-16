import { useMemo } from 'react'
import type { Transaccion } from '../../core/data/db'
import { VACIO, presupuestosRepo } from '../../core/data/repository'
import { getCategoria } from './categorias'
import { usePatrimonio } from './patrimonio'
import {
  etiquetaCorta,
  money,
  money2,
  ocurrencias,
  rangoPeriodo,
  sumarPeriodo,
  totalEnRango,
  type Periodo,
} from './mes'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { SimuladorAnual } from './SimuladorAnual'
import { AZUL, CampoDinero, ROJO, TARJETA, VERDE } from './ui'
import { vivo } from '../../core/ui/estilos'

/** Fila de `presupuestos` que no es una categoría, sino un ajuste del balance. */
const PRESUPUESTO_KEY = '__mensual__'

const SOLO_FIJOS = { solo: 'fijos' as const }

/** Cuánto vale el presupuesto mensual en el periodo que se está viendo. */
const FACTOR_PRESUPUESTO: Record<Periodo, number> = {
  dia: 1 / 30.44,
  semana: 1 / 4.348,
  mes: 1,
  anio: 12,
}

/**
 * Balance del periodo elegido (día, semana, mes o año): lo que entró, lo que
 * salió, el neto y cómo queda el patrimonio al aplicarle ese neto.
 */
export function BalanceTab({
  ancla,
  periodo,
  movimientos,
}: {
  ancla: string
  periodo: Periodo
  movimientos: Transaccion[]
}) {
  const t = useT()
  const ajustes = presupuestosRepo.useAll() ?? VACIO
  const presu = ajustes.find((p) => p.categoria === PRESUPUESTO_KEY)
  const { neto: patrimonio } = usePatrimonio()

  const { desde, hasta } = useMemo(() => rangoPeriodo(ancla, periodo), [ancla, periodo])
  const ingresos = useMemo(() => totalEnRango(movimientos, 'ingreso', desde, hasta), [movimientos, desde, hasta])
  const gastos = useMemo(() => totalEnRango(movimientos, 'gasto', desde, hasta), [movimientos, desde, hasta])
  const balance = ingresos - gastos

  // Lo que aportaron los fijos al periodo: el resto es lo variable.
  const ingFijos = useMemo(() => totalEnRango(movimientos, 'ingreso', desde, hasta, SOLO_FIJOS), [movimientos, desde, hasta])
  const gasFijos = useMemo(() => totalEnRango(movimientos, 'gasto', desde, hasta, SOLO_FIJOS), [movimientos, desde, hasta])

  // Gastos por categoría del periodo (las repeticiones cuentan sus vencimientos).
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of movimientos) {
      if (m.tipo !== 'gasto') continue
      const veces = ocurrencias(m, desde, hasta)
      if (veces === 0) continue
      const cat = getCategoria(m.categoria)
      mapa.set(cat.nombre, (mapa.get(cat.nombre) ?? 0) + m.monto * veces)
    }
    return [...mapa.entries()]
      .map(([nombre, monto]) => ({ cat: getCategoria(nombre), monto }))
      .sort((a, b) => b.monto - a.monto)
  }, [movimientos, desde, hasta])

  // Tendencia: los 6 periodos anteriores al que se está viendo, incluido.
  const tendencia = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const a = sumarPeriodo(ancla, periodo, -(5 - i))
      const r = rangoPeriodo(a, periodo)
      const ing = totalEnRango(movimientos, 'ingreso', r.desde, r.hasta)
      const gas = totalEnRango(movimientos, 'gasto', r.desde, r.hasta)
      return { ancla: a, balance: ing - gas }
    })
  }, [ancla, periodo, movimientos])
  const maxAbs = Math.max(1, ...tendencia.map((p) => Math.abs(p.balance)))

  const presupuestoMes = presu?.monto ?? 0
  const presupuesto = presupuestoMes * FACTOR_PRESUPUESTO[periodo]
  const pct = presupuesto > 0 ? Math.min(100, (gastos / presupuesto) * 100) : 0
  const excedido = presupuesto > 0 && gastos > presupuesto

  const patrimonioFinal = patrimonio + balance

  const guardarAjuste = async (clave: string, fila: { id?: number } | undefined, valor: number) => {
    if (fila?.id) await presupuestosRepo.update(fila.id, { monto: valor })
    else await presupuestosRepo.add({ categoria: clave, monto: valor })
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Tarjeta titulo={t('despacho.r.ingresos', 'Ingresos')} valor={money(ingresos)} color={VERDE} />
        <Tarjeta titulo={t('despacho.r.gastos', 'Gastos')} valor={money(gastos)} color={ROJO} />
        <Tarjeta
          titulo={t('despacho.r.balance', 'Balance')}
          valor={money(balance)}
          color={balance >= 0 ? AZUL : ROJO}
        />
      </div>

      {(ingFijos > 0 || gasFijos > 0) && (
        <p className="-mt-3 px-1 text-xs text-white/55">
          <Icono nombre="repetir" />{' '}
          {t('despacho.r.deLosFijos', `De tus fijos: +${money2(ingFijos)} · −${money2(gasFijos)}`, {
            i: money2(ingFijos),
            g: money2(gasFijos),
          })}
        </p>
      )}

      {/* Solo lectura: el patrimonio se edita en su pestaña. Lo que se enseña
          aquí es la proyección — el balance del periodo NO forma parte del neto,
          es lo que le va a pasar. */}
      <div data-tut="despacho.patrimonio" className={`${TARJETA} space-y-3`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t('despacho.patrimonio', 'Patrimonio total')}</span>
          <span className="text-sm font-bold text-white/70">{money2(patrimonio)}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-white/40">
          {t('despacho.patrimonio.ayuda', 'Tus activos menos tus pasivos, en la pestaña Patrimonio. Aquí solo se ve cómo queda si el periodo cierra así.')}
        </p>
        <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
          <span className="text-xs text-white/55">
            {money2(patrimonio)} {balance >= 0 ? '+' : '−'} {money2(Math.abs(balance))}
          </span>
          <span
            className="texto-vivo text-lg font-bold"
            style={vivo(patrimonioFinal >= patrimonio ? VERDE : ROJO)}
          >
            {money2(patrimonioFinal)}
          </span>
        </div>
      </div>

      <div data-tut="despacho.presupuesto" className={TARJETA}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{t('despacho.presupuesto', 'Presupuesto mensual')}</span>
          <div className="w-32">
            <CampoDinero
              defaultValue={presupuestoMes || undefined}
              placeholder="0"
              onNumero={(v) => guardarAjuste(PRESUPUESTO_KEY, presu, v ?? 0)}
              aria-label={t('despacho.presupuesto', 'Presupuesto mensual')}
              className="w-full rounded-lg bg-black/30 py-1 ps-7 pe-2 text-end text-sm outline-none border border-white/10 focus:border-white/30"
            />
          </div>
        </div>
        {presupuesto > 0 && (
          <>
            {periodo !== 'mes' && (
              <p className="mt-1 text-[11px] text-white/40">
                {t('despacho.presupuesto.equivale', `Equivale a ${money2(presupuesto)} en este periodo`, {
                  n: money2(presupuesto),
                })}
              </p>
            )}
            <div className="mt-3 h-3 w-full rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: excedido ? ROJO : VERDE }}
              />
            </div>
            <p className={`mt-2 text-xs ${excedido ? 'text-red-400 font-semibold' : 'text-white/55'}`}>
              {excedido
                ? <><Icono nombre="alerta" /> {t('despacho.excedido', `Excediste el presupuesto por ${money2(gastos - presupuesto)}`, { n: money2(gastos - presupuesto) })}</>
                : t('despacho.progreso', `Llevas ${money2(gastos)} de ${money2(presupuesto)} (${Math.round(pct)}%)`, { used: money2(gastos), total: money2(presupuesto), pct: String(Math.round(pct)) })}
            </p>
          </>
        )}
      </div>

      <div data-tut="despacho.categorias" className={TARJETA}>
        <p className="text-sm font-semibold mb-3">{t('despacho.catGastos', 'Gastos por categoría')}</p>
        {porCategoria.length === 0 && (
          <p className="text-white/40 text-sm">{t('despacho.sinGastos', 'Sin gastos en este periodo.')}</p>
        )}
        <div className="space-y-2.5">
          {porCategoria.map(({ cat, monto }) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 text-sm">
                <span><Icono emoji={cat.icon} /></span>
                <span className="text-white/85">{cat.nombre}</span>
                <span className="ms-auto text-white/55">{money2(monto)}</span>
                <span className="w-10 text-end text-white/40 text-xs">
                  {Math.round((monto / gastos) * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(monto / gastos) * 100}%`, background: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div data-tut="despacho.tendencia" className={TARJETA}>
        <p className="text-sm font-semibold mb-3">
          {t(`despacho.tendencia.${periodo}`, TENDENCIA_ES[periodo])}
        </p>
        <div className="h-28 grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-x-2">
          {/* Eje: el máximo arriba (a la altura del 100 % de las barras) y el cero en la base */}
          <div className="flex flex-col justify-between pt-4 text-end text-[10px] leading-none text-white/40">
            <span>{money(maxAbs)}</span>
            <span>0</span>
          </div>
          {/* Las barras pintan |balance| desde abajo: la línea de cero ES la base */}
          <div className="relative border-b border-white/15">
            <div className="absolute inset-x-0 top-4 bottom-0 flex items-end justify-between gap-2">
              {tendencia.map((punto, i) => {
                const h = (Math.abs(punto.balance) / maxAbs) * 100
                const pos = punto.balance >= 0
                const ultimo = i === tendencia.length - 1
                return (
                  // key por posición: al cambiar de periodo la columna persiste y la altura transiciona
                  <div key={i} className="relative flex-1 flex h-full items-end justify-center">
                    {ultimo && (
                      <span
                        className="texto-vivo absolute end-0 whitespace-nowrap text-xs font-semibold transition-[bottom]"
                        style={{ bottom: `calc(${Math.max(4, h)}% + 3px)`, ...vivo(pos ? AZUL : ROJO) }}
                      >
                        {money(punto.balance)}
                      </span>
                    )}
                    <div
                      className="w-5 rounded-t transition-[height]"
                      style={{
                        height: `${Math.max(4, h)}%`,
                        background: pos ? AZUL : ROJO,
                      }}
                      title={money2(punto.balance)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
          <div />
          <div className="pt-1 flex justify-between gap-2">
            {tendencia.map((punto) => (
              <span key={punto.ancla} className="flex-1 text-center text-[10px] text-white/40">
                {etiquetaCorta(punto.ancla, periodo)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <SimuladorAnual movimientos={movimientos} patrimonio={patrimonio} />
    </div>
  )
}

const TENDENCIA_ES: Record<Periodo, string> = {
  dia: 'Balance · últimos 6 días',
  semana: 'Balance · últimas 6 semanas',
  mes: 'Balance · últimos 6 meses',
  anio: 'Balance · últimos 6 años',
}

function Tarjeta({ titulo, valor, color }: { titulo: string; valor: string; color: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs text-white/55">{titulo}</p>
      <p className="texto-vivo text-lg font-bold" style={vivo(color)}>
        {valor}
      </p>
    </div>
  )
}
