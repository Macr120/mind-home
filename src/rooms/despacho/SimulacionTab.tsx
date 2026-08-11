import { useMemo, useState } from 'react'
import { VACIO, finanzasRepo, presupuestosRepo } from '../../core/data/repository'
import { claveLS } from '../../core/edicion'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { etiquetaCorta, etiquetaPeriodo, hoyISO, money, money2, rangoPeriodo, totalEnRango } from './mes'
import { usePatrimonio } from './patrimonio'
import { promedioMensual } from './useResumen'
import { AZUL, Ayuda, INPUT, ROJO, Seccion, TARJETA, VERDE } from './ui'
import { Campo, Resultado, TablaAnual } from './SimuladoresTab'
import { amortizar, serieNeto, type FilaProyectable, type FlujoMensual, type PuntoSerie } from './proyeccion'

/** Fila de `presupuestos` que no es una categoría: la inflación que supones. */
const INFLACION_KEY = '__inflacion__'

/** Horizonte por defecto y límites (1 mes a 30 años). */
const MESES_DEFECTO = 60
const MESES_MIN = 1
const MESES_MAX = 360

/** Cuánto pasado se dibuja antes de hoy. */
const MESES_ATRAS = 24

/** Las perillas de esta pantalla son estado de vista, no datos: van a local. */
const CLAVE_AJUSTES = claveLS('mh.despacho.simulacion')

interface Ajustes {
  meses: number
  dineroDeHoy: boolean
  conFlujo: boolean
  crecIngreso: number
  crecGasto: number
  pagosYaEnGastos: boolean
}

const POR_DEFECTO: Ajustes = {
  meses: MESES_DEFECTO,
  dineroDeHoy: false,
  conFlujo: false,
  crecIngreso: 4,
  crecGasto: 4,
  pagosYaEnGastos: true,
}

function leerAjustes(): Ajustes {
  try {
    return { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE_AJUSTES) ?? '{}') }
  } catch {
    return POR_DEFECTO
  }
}

/**
 * Tu patrimonio en el tiempo: de dónde viene y a dónde va.
 *
 * A la izquierda de «hoy» está lo que pasó de verdad; a la derecha, lo que dan
 * las tasas que tú escribiste en cada activo y en cada deuda. Nada de aquí toca
 * lo guardado: se puede mover todo sin miedo.
 */
export function SimulacionTab() {
  const t = useT()
  const hoy = hoyISO()
  const [aj, setAj] = useState(leerAjustes)
  const { fisicos, liquidos, pasivos: lineasPasivo, neto } = usePatrimonio()
  const movimientos = finanzasRepo.useAll() ?? VACIO
  const ajustes = presupuestosRepo.useAll() ?? VACIO
  const filaInflacion = ajustes.find((p) => p.categoria === INFLACION_KEY)
  const inflacion = filaInflacion?.monto ?? 0

  const guardar = (cambio: Partial<Ajustes>) => {
    const nuevo = { ...aj, ...cambio }
    setAj(nuevo)
    localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(nuevo))
  }

  const guardarInflacion = async (v: number) => {
    if (filaInflacion?.id) await presupuestosRepo.update(filaInflacion.id, { monto: v })
    else await presupuestosRepo.add({ categoria: INFLACION_KEY, monto: v })
  }

  const activos: FilaProyectable[] = useMemo(
    () => [...fisicos, ...liquidos].map((l) => l.proyectable),
    [fisicos, liquidos],
  )
  const pasivos: FilaProyectable[] = useMemo(() => lineasPasivo.map((l) => l.proyectable), [lineasPasivo])

  /**
   * Lo que entra y sale al mes hoy, con la misma cuenta que la pestaña Flujo
   * salvo por una cosa: los abonos a una meta NO cuentan como gasto aquí.
   *
   * Abonar deja un gasto real (así el balance del mes baja solo), pero ese
   * dinero no se fue: está en el saldo de la meta, que es una línea del
   * patrimonio. Restarlo del flujo Y verlo crecer como activo sería contarlo
   * dos veces, y el ahorro saldría negativo en cuanto alguien use sus metas.
   */
  const base = useMemo(() => {
    const { desde, hasta } = rangoPeriodo(hoy, 'mes')
    const soloFijos = { solo: 'fijos' as const, proyectar: true }
    const sinAbonos = movimientos.filter((m) => m.metaId == null)
    return {
      ingresoMes: totalEnRango(sinAbonos, 'ingreso', desde, hasta, soloFijos) + promedioMensual(sinAbonos, 'ingreso', hoy),
      gastoMes: totalEnRango(sinAbonos, 'gasto', desde, hasta, soloFijos) + promedioMensual(sinAbonos, 'gasto', hoy),
    }
  }, [movimientos, hoy])

  const pagosMes = pasivos.reduce((s, p) => s + (p.pagoMensual ?? 0), 0)

  // Memoizado aunque sea un objeto de cinco campos: si se recrea en cada render
  // arrastra consigo el `useMemo` de la serie, que son miles de operaciones.
  const flujo: FlujoMensual | undefined = useMemo(
    () =>
      aj.conFlujo
        ? {
            ingresoMes: base.ingresoMes,
            gastoMes: base.gastoMes,
            crecIngresoAnual: aj.crecIngreso,
            crecGastoAnual: aj.crecGasto,
            pagosYaEnGastos: aj.pagosYaEnGastos,
          }
        : undefined,
    [aj.conFlujo, aj.crecIngreso, aj.crecGasto, aj.pagosYaEnGastos, base.ingresoMes, base.gastoMes],
  )

  const serie = useMemo(
    () =>
      serieNeto({
        activos,
        pasivos,
        hoy,
        mesesAtras: MESES_ATRAS,
        mesesAdelante: aj.meses,
        inflacion,
        enDineroDeHoy: aj.dineroDeHoy,
        flujo,
      }),
    [activos, pasivos, hoy, aj.meses, inflacion, aj.dineroDeHoy, flujo],
  )

  // La serie va de mes en mes, así que su punto «hoy» es en realidad el día 1.
  // El neto de hoy sale del balance, para que cuadre al peso con la tarjeta de
  // arriba en vez de llevarle unos días de tasa.
  const ahora = serie[MESES_ATRAS]
  const final = serie[serie.length - 1]

  /** Lo que falta para liquidar cada deuda, con la tasa y la cuota que le pusiste. */
  const creditos = useMemo(
    () =>
      pasivos
        .filter((p) => p.tasaAnual || p.pagoMensual)
        .map((p) => ({ fila: p, am: amortizar(p.montoBase, p.tasaAnual ?? 0, p.pagoMensual ?? 0, hoy) })),
    [pasivos, hoy],
  )
  const interesesFuturos = creditos.reduce((s, c) => s + c.am.interesesTotales, 0)

  if (activos.length === 0 && pasivos.length === 0) {
    return (
      <p className="rounded-xl bg-white/5 p-6 text-center text-sm text-white/40 border border-white/10">
        {t(
          'despacho.sim.sinDatos',
          'Aún no hay nada que proyectar. Anota lo que tienes en Activos y lo que debes en Pasivos, ponles su tasa, y aquí verás a dónde va.',
        )}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <Grafica serie={serie} mesesAtras={MESES_ATRAS} />

      <div className="grid grid-cols-2 gap-3">
        <Resultado titulo={t('despacho.sim.netoHoy', 'Neto hoy')} valor={money(neto)} color={AZUL} />
        <Resultado
          titulo={t('despacho.sim.netoFinal', `Dentro de ${aj.meses} meses`, { n: String(aj.meses) })}
          valor={money(final.neto)}
          color={final.neto >= ahora.neto ? VERDE : ROJO}
        />
        {interesesFuturos > 0 && (
          <Resultado
            titulo={t('despacho.sim.interesesFuturos', 'Intereses por pagar')}
            valor={money(interesesFuturos)}
            color={ROJO}
          />
        )}
        {aj.conFlujo && (
          <Resultado
            titulo={t('despacho.sim.aportado', 'Lo que aportarás')}
            valor={money(final.ahorro)}
            color={final.ahorro >= 0 ? VERDE : ROJO}
          />
        )}
      </div>

      <Hitos serie={serie} mesesAtras={MESES_ATRAS} creditos={creditos} />

      <div data-tut="despacho.sim.controles" className={`${TARJETA} space-y-3`}>
        {/* El bloque de perillas por fin tiene nombre: antes solo existía como
            comentario en el código y el usuario veía inputs sueltos. */}
        <Seccion icono="ajustes" titulo={t('despacho.sim.controles', 'Ajusta el escenario')} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-white/55">{t('despacho.sim.horizonte', 'Proyectar (meses)')}</span>
            <input
              type="number"
              min={MESES_MIN}
              max={MESES_MAX}
              inputMode="decimal"
              value={aj.meses}
              onChange={(e) =>
                guardar({
                  meses: Math.min(MESES_MAX, Math.max(MESES_MIN, parseInt(e.target.value, 10) || MESES_DEFECTO)),
                })
              }
              className={`mt-1 ${INPUT}`}
            />
          </label>
          <label className="block">
            <span className="text-xs text-white/55">{t('despacho.sim.inflacion', 'Inflación anual %')}</span>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={inflacion}
              onBlur={(e) => guardarInflacion(parseFloat(e.target.value) || 0)}
              className={`mt-1 ${INPUT}`}
            />
          </label>
        </div>

        <Interruptor
          activo={aj.dineroDeHoy}
          onCambio={(v) => guardar({ dineroDeHoy: v })}
          texto={t('despacho.sim.dineroDeHoy', 'Verlo en dinero de hoy')}
          ayuda={t(
            'despacho.sim.dineroDeHoyAyuda',
            'Descuenta la inflación: cuánto valdrá de verdad ese dinero, no cuántos billetes serán.',
          )}
        />

        <Interruptor
          activo={aj.conFlujo}
          onCambio={(v) => guardar({ conFlujo: v })}
          texto={t('despacho.sim.flujoMensual', 'Sumar lo que ahorro cada mes')}
          ayuda={t(
            'despacho.sim.flujoAyuda',
            `De tus movimientos: entran ${money(base.ingresoMes)} y salen ${money(base.gastoMes)} al mes.`,
            { i: money(base.ingresoMes), g: money(base.gastoMes) },
          )}
        />

        {aj.conFlujo && (
          <div className="space-y-3 rounded-lg bg-black/20 p-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo
                label={t('despacho.sim.crecIngreso', 'Mis ingresos suben %/año')}
                valor={String(aj.crecIngreso)}
                setValor={(v) => guardar({ crecIngreso: parseFloat(v) || 0 })}
              />
              <Campo
                label={t('despacho.sim.crecGasto', 'Mis gastos suben %/año')}
                valor={String(aj.crecGasto)}
                setValor={(v) => guardar({ crecGasto: parseFloat(v) || 0 })}
              />
            </div>
            {pagosMes > 0 && (
              <Interruptor
                activo={aj.pagosYaEnGastos}
                onCambio={(v) => guardar({ pagosYaEnGastos: v })}
                texto={t('despacho.sim.pagosYaEnGastos', 'Mis pagos de deuda ya están entre esos gastos')}
                ayuda={t(
                  'despacho.sim.pagosDeudaMes',
                  `Tus deudas piden ${money(pagosMes)} al mes. Si no los tienes apuntados como gasto, apágalo y se restarán aparte.`,
                  { n: money(pagosMes) },
                )}
              />
            )}
          </div>
        )}
      </div>

      <Avisos creditos={creditos} />

      {/* Una fila por aniversario. Con menos de un año de horizonte no hay
          ninguna y la tabla sobra: no se pinta un encabezado vacío. */}
      {aj.meses >= 12 && (
        <TablaAnual
          columnas={[
            t('despacho.s.col.ano', 'Año'),
            t('despacho.sim.activos', 'Activos'),
            t('despacho.sim.pasivos', 'Pasivos'),
            t('despacho.sim.neto', 'Neto'),
          ]}
          filas={serie
            .filter((_, i) => i > MESES_ATRAS && (i - MESES_ATRAS) % 12 === 0)
            .map((p) => [p.fecha.slice(0, 4), money(p.activos), money(p.pasivos), money(p.neto)])}
        />
      )}

      <div className="px-1">
        <Ayuda
          resumen={t('despacho.sim.avisoCorta', 'Es una proyección, no una promesa.')}
          detalle={t(
            'despacho.sim.aviso',
            'Sale de las tasas que tú escribiste: sirve para comparar escenarios, no para saber lo que va a pasar.',
          )}
        />
      </div>
    </div>
  )
}

/** 'ago 24': el mes solo se repetiría cada año y no diría cuál. */
function etiquetaEje(fecha: string): string {
  return `${etiquetaCorta(fecha, 'mes')} ${fecha.slice(2, 4)}`
}

/** Las tres series: sólido hasta hoy, punteado hacia adelante. */
function Grafica({ serie, mesesAtras }: { serie: PuntoSerie[]; mesesAtras: number }) {
  const t = useT()
  const valores = serie.flatMap((p) => [p.activos, p.pasivos, p.neto])
  const min = Math.min(0, ...valores)
  const max = Math.max(1, ...valores)
  const alto = Math.max(1, max - min)
  const x = (i: number) => (i / Math.max(1, serie.length - 1)) * 100
  const y = (v: number) => 100 - ((v - min) / alto) * 100

  // El tramo punteado arranca EN hoy, no después: si no, queda un hueco.
  const trazo = (desde: number, hasta: number, valor: (p: PuntoSerie) => number) =>
    serie
      .slice(desde, hasta)
      .map((p, k) => `${x(desde + k)},${y(valor(p))}`)
      .join(' ')

  const series: { color: string; valor: (p: PuntoSerie) => number; clave: string; es: string }[] = [
    { color: VERDE, valor: (p) => p.activos, clave: 'despacho.sim.activos', es: 'Activos' },
    { color: ROJO, valor: (p) => p.pasivos, clave: 'despacho.sim.pasivos', es: 'Pasivos' },
    { color: AZUL, valor: (p) => p.neto, clave: 'despacho.sim.neto', es: 'Neto' },
  ]

  return (
    <div data-tut="despacho.sim.grafica" className={TARJETA}>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-white/55">
        {series.map((s) => (
          <span key={s.clave} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {t(s.clave, s.es)}
          </span>
        ))}
      </div>

      <div className="rounded-lg bg-black/20 p-3">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
          <line x1="0" y1={y(0)} x2="100" y2={y(0)} stroke="#ffffff22" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          {/* Dónde acaba lo que pasó y empieza lo que se supone. */}
          <line
            x1={x(mesesAtras)}
            y1="0"
            x2={x(mesesAtras)}
            y2="100"
            stroke="#ffffff33"
            strokeWidth="1"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
          {series.map((s) => (
            <g key={s.clave}>
              <polyline
                points={trazo(0, mesesAtras + 1, s.valor)}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={trazo(mesesAtras, serie.length, s.valor)}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
        {/* Con años de rango, «ago … ago» no dice nada: aquí manda el año. */}
        <div className="mt-1 flex justify-between text-[10px] text-white/40">
          <span>{etiquetaEje(serie[0].fecha)}</span>
          <span className="text-white/55">{t('despacho.sim.hoy', 'hoy')}</span>
          <span>{etiquetaEje(serie[serie.length - 1].fecha)}</span>
        </div>
      </div>
    </div>
  )
}

interface Credito {
  fila: FilaProyectable
  am: ReturnType<typeof amortizar>
}

/** Las fechas que de verdad importan, sacadas de la propia proyección. */
function Hitos({
  serie,
  mesesAtras,
  creditos,
}: {
  serie: PuntoSerie[]
  mesesAtras: number
  creditos: Credito[]
}) {
  const t = useT()
  const futuro = serie.slice(mesesAtras)
  const hitos: string[] = []

  for (const c of creditos) {
    if (c.am.fechaLiquidacion) {
      hitos.push(
        t('despacho.sim.hitoLiquidas', `Liquidas «${c.fila.nombre}» en ${etiquetaPeriodo(c.am.fechaLiquidacion, 'mes')}`, {
          n: c.fila.nombre,
          f: etiquetaPeriodo(c.am.fechaLiquidacion, 'mes'),
        }),
      )
    }
  }

  if (futuro[0].neto < 0) {
    const cruce = futuro.find((p) => p.neto >= 0)
    if (cruce) {
      hitos.push(
        t('despacho.sim.hitoPositivo', `Tu patrimonio deja de ser negativo en ${etiquetaPeriodo(cruce.fecha, 'mes')}`, {
          f: etiquetaPeriodo(cruce.fecha, 'mes'),
        }),
      )
    }
  } else if (futuro[0].neto > 0) {
    const doble = futuro.find((p) => p.neto >= futuro[0].neto * 2)
    if (doble) {
      hitos.push(
        t('despacho.sim.hitoDoble', `Tu patrimonio se duplica en ${etiquetaPeriodo(doble.fecha, 'mes')}`, {
          f: etiquetaPeriodo(doble.fecha, 'mes'),
        }),
      )
    }
  }

  if (hitos.length === 0) return null

  return (
    <ul className="space-y-1.5">
      {hitos.map((h) => (
        <li key={h} className="flex items-start gap-2 rounded-lg bg-black/20 px-3 py-2 text-xs text-white/70">
          <span className="shrink-0 text-white/40">
            <Icono nombre="objetivo" />
          </span>
          <span>{h}</span>
        </li>
      ))}
    </ul>
  )
}

/** Deudas que, con lo que pagas, no se van a acabar nunca. */
function Avisos({ creditos }: { creditos: Credito[] }) {
  const t = useT()
  const malas = creditos.filter((c) => !c.am.cubrePago || c.am.fechaLiquidacion == null)
  if (malas.length === 0) return null

  return (
    <div className="space-y-1.5">
      {malas.map((c) => (
        <p
          key={c.fila.clave}
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200"
        >
          <Icono nombre="alerta" />{' '}
          {c.fila.pagoMensual
            ? t(
                'despacho.sim.noBaja',
                `Con ${money2(c.fila.pagoMensual)} al mes, «${c.fila.nombre}» no baja: solo de intereses son ${money2((c.fila.montoBase * (c.fila.tasaAnual ?? 0)) / 100 / 12)}.`,
                {
                  p: money2(c.fila.pagoMensual),
                  n: c.fila.nombre,
                  i: money2((c.fila.montoBase * (c.fila.tasaAnual ?? 0)) / 100 / 12),
                },
              )
            : t('despacho.sim.creceSinPago', `«${c.fila.nombre}» tiene tasa pero no mensualidad: así solo crece.`, {
                n: c.fila.nombre,
              })}
        </p>
      ))}
    </div>
  )
}

function Interruptor({
  activo,
  onCambio,
  texto,
  ayuda,
}: {
  activo: boolean
  onCambio: (v: boolean) => void
  texto: string
  ayuda: string
}) {
  return (
    <label className="flex items-start gap-2 text-[11px] text-white/55">
      <input
        type="checkbox"
        checked={activo}
        onChange={(e) => onCambio(e.target.checked)}
        className="mt-0.5 accent-amber-500"
      />
      <span>
        {texto}
        <span className="block text-white/40">{ayuda}</span>
      </span>
    </label>
  )
}
