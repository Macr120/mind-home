import { useMemo, useState } from 'react'
import type { PerfilNutricion, RegistroAgua, RegistroComida, RegistroPeso } from '../../core/data/db'
import { perfilNutricionRepo } from '../../core/data/repository'
import type { PerfilConId } from './macros'
import { balanceSemanal, DIAS_MINIMOS, sugerirAjusteKcal } from './balance'
import { progresoMeta } from './peso'
import { PesoPanel } from './PesoPanel'
import { ResumenHoy } from './ResumenHoy'
import { CalendarioAdherencia } from './CalendarioAdherencia'
import { PERIODOS, type Periodo } from './periodo'
import {
  aguaPorDia,
  barrasPeriodo,
  macrosPorDia,
  resumenAgua,
  resumenAlimentacion,
  type BarraPeriodo,
} from './stats'
import { hoyISO, nombreFecha } from './fecha'
import { COLOR } from './constantes'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'
import { useT } from '../../core/i18n/useT'
import { vivo } from '../../core/ui/estilos'
import { Icono } from '../../core/ui/iconos/Icono'

const VERDE = '#34d399'

/** Cuántos días atrás enseña la gráfica de peso en cada periodo. */
const DIAS_PESO: Record<Exclude<Periodo, 'dia'>, number | undefined> = {
  semana: 7,
  mes: 31,
  anio: 365,
  todo: undefined,
}

/**
 * Paso 3: las estadísticas. Un filtro de periodo y, debajo, alimentación
 * (kcal + macros), agua y peso, con un calendario coloreado por adherencia
 * que abre cualquier día en detalle.
 */
export function ProgresoTab({
  comidas,
  agua,
  pesos,
  perfil,
  perfilRaw,
  onIrAMetas,
}: {
  comidas: RegistroComida[]
  agua: RegistroAgua[]
  pesos: RegistroPeso[]
  perfil: PerfilNutricion
  perfilRaw: PerfilConId | undefined
  onIrAMetas: () => void
}) {
  const hoy = hoyISO()
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const macros = useMemo(() => macrosPorDia(comidas), [comidas])
  const aguaMap = useMemo(() => aguaPorDia(agua), [agua])
  const kcalMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const [k, v] of macros) m.set(k, v.calorias)
    return m
  }, [macros])

  const dia = diaSel ?? hoy

  return (
    <div className="space-y-4">
      <div data-tut="cocina.prog.filtro">
        <PestanasCarpeta
          items={PERIODOS}
          activo={periodo}
          onCambio={setPeriodo}
          prefijoClave="cocina.periodo"
          color={COLOR}
          variante="sub"
        />
      </div>

      {periodo === 'dia' ? (
        <>
          <DetalleDia dia={dia} comidas={comidas} aguaMl={aguaMap.get(dia) ?? 0} pesos={pesos} perfil={perfil} />
          <CalendarioAdherencia
            porDia={macros}
            objetivoKcal={perfil.calorias}
            seleccionado={dia}
            onSeleccionar={setDiaSel}
          />
        </>
      ) : (
        <>
          <div data-tut="cocina.prog.alimentacion">
            <Alimentacion macros={macros} kcalMap={kcalMap} comidas={comidas} perfil={perfil} periodo={periodo} hoy={hoy} />
          </div>
          <Agua aguaMap={aguaMap} perfil={perfil} periodo={periodo} hoy={hoy} />
          <div data-tut="cocina.prog.peso">
            <PesoPanel fecha={hoy} pesos={pesos} perfil={perfil} dias={DIAS_PESO[periodo]} onAjustar={onIrAMetas} />
          </div>
          <SugerenciaAjuste fecha={hoy} comidas={comidas} perfil={perfil} perfilRaw={perfilRaw} pesos={pesos} />
          <div data-tut="cocina.prog.calendario">
            <CalendarioAdherencia
              porDia={macros}
              objetivoKcal={perfil.calorias}
              seleccionado={null}
              onSeleccionar={(iso) => {
                setDiaSel(iso)
                setPeriodo('dia')
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

/** Kcal y macros del periodo: promedios, adherencia y la gráfica de barras. */
function Alimentacion({
  macros,
  kcalMap,
  comidas,
  perfil,
  periodo,
  hoy,
}: {
  macros: ReturnType<typeof macrosPorDia>
  kcalMap: Map<string, number>
  comidas: RegistroComida[]
  perfil: PerfilNutricion
  periodo: Exclude<Periodo, 'dia'>
  hoy: string
}) {
  const t = useT()
  const res = useMemo(() => resumenAlimentacion(macros, perfil, periodo, hoy), [macros, perfil, periodo, hoy])
  const barras = useMemo(() => barrasPeriodo(kcalMap, periodo, hoy), [kcalMap, periodo, hoy])
  const balance = useMemo(
    () => (periodo === 'semana' ? balanceSemanal(comidas, perfil, hoy) : null),
    [comidas, perfil, hoy, periodo],
  )
  const un = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          <Icono nombre="tendencia" /> {t('cocina.prog.alimentacion', 'Alimentación')}
        </p>
        <p className="text-[10px] text-white/40">
          {t('cocina.prog.diasRegistrados', `${res.diasRegistrados} días registrados`, {
            n: String(res.diasRegistrados),
          })}
        </p>
      </div>

      {res.diasRegistrados === 0 ? (
        <p className="mt-2 text-xs text-white/40">
          {t('cocina.prog.sinDatos', 'Sin registros en este periodo.')}
        </p>
      ) : (
        <>
          <p className="mt-1 text-3xl font-black texto-vivo" style={vivo(COLOR)}>
            {res.promedio.calorias}
            <span className="text-sm font-semibold text-white/50">
              {' '}
              {t('cocina.prog.kcalDia', 'kcal/día')} · {perfil.calorias}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-white/50">
            P {res.promedio.proteinas}g · C {res.promedio.carbohidratos}g · G {res.promedio.grasas}g
          </p>

          <Barras barras={barras} objetivo={perfil.calorias} color={COLOR} />

          {balance ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Dato
                  titulo={t('cocina.adherencia7d', 'Adherencia')}
                  valor={`${res.adherencia}%`}
                  sub={t('cocina.adherenciaSub', '±10% del objetivo')}
                />
                <Dato
                  titulo={t('cocina.semana.balance', 'Balance')}
                  valor={`${balance.netoKcal > 0 ? '+' : ''}${Math.round(balance.netoKcal)}`}
                  sub={t('cocina.semana.balanceSub', 'kcal vs objetivo')}
                />
                <Dato
                  titulo={t('cocina.semana.ritmoComida', 'Según lo que comes')}
                  valor={`${balance.kgSemanaEstimados > 0 ? '+' : ''}${un(balance.kgSemanaEstimados)}`}
                  sub={t('cocina.semana.kgSemana', 'kg/semana estimados')}
                />
              </div>
              {!balance.fiable && (
                <p className="mt-2 text-[10px] text-white/35">
                  {t('cocina.semana.pocosDatos', `Estimación aproximada: registra al menos ${DIAS_MINIMOS} días para que cuadre.`, {
                    n: String(DIAS_MINIMOS),
                  })}
                </p>
              )}
            </>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <Dato
                titulo={t('cocina.adherencia7d', 'Adherencia')}
                valor={`${res.adherencia}%`}
                sub={t('cocina.adherenciaSub', '±10% del objetivo')}
              />
              <Dato
                titulo={t('cocina.prog.promedio', 'Promedio')}
                valor={String(res.promedio.calorias)}
                sub={t('cocina.prog.kcalDia', 'kcal/día')}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** El agua del periodo: promedio, días cumplidos y sus barras. */
function Agua({
  aguaMap,
  perfil,
  periodo,
  hoy,
}: {
  aguaMap: Map<string, number>
  perfil: PerfilNutricion
  periodo: Exclude<Periodo, 'dia'>
  hoy: string
}) {
  const t = useT()
  const res = useMemo(() => resumenAgua(aguaMap, perfil.aguaMl, periodo, hoy), [aguaMap, perfil.aguaMl, periodo, hoy])
  const barras = useMemo(() => barrasPeriodo(aguaMap, periodo, hoy), [aguaMap, periodo, hoy])

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">
          <Icono nombre="humedad" /> {t('cocina.hidratacion', 'Hidratación')}
        </p>
        <p className="text-[10px] text-white/40">
          {t('cocina.prog.diasCumplidos', `${res.adherencia}% de días cumplidos`, { n: String(res.adherencia) })}
        </p>
      </div>

      {res.diasRegistrados === 0 ? (
        <p className="mt-2 text-xs text-white/40">
          {t('cocina.prog.sinDatos', 'Sin registros en este periodo.')}
        </p>
      ) : (
        <>
          <p className="mt-1 text-3xl font-black" style={{ color: VERDE }}>
            {(res.promedioMl / 1000).toFixed(1)}
            <span className="text-sm font-semibold text-white/50">
              {' '}
              {t('cocina.prog.litrosDia', 'L/día')} · {(perfil.aguaMl / 1000).toFixed(1)}
            </span>
          </p>
          <Barras barras={barras} objetivo={perfil.aguaMl} color={VERDE} />
        </>
      )}
    </div>
  )
}

/** Barras del periodo con la línea punteada del objetivo diario. */
function Barras({ barras, objetivo, color }: { barras: BarraPeriodo[]; objetivo: number; color: string }) {
  const max = Math.max(objetivo, ...barras.map((b) => b.valor), 1)
  // En el mes hay hasta 31 barras: etiquetas solo cada 5 para que respiren.
  const paso = barras.length > 12 ? 5 : 1
  const gap = barras.length > 12 ? 'gap-px' : 'gap-1.5'

  return (
    <div className="mt-3">
      <div className={`relative flex h-24 items-end ${gap}`}>
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/25"
          style={{ bottom: `${(objetivo / max) * 100}%` }}
        />
        {barras.map((b) => (
          <div
            key={b.clave}
            className="flex-1 rounded-t transition-all"
            style={{
              height: `${Math.max(4, (b.valor / max) * 100)}%`,
              background: color,
              opacity: b.valor === 0 ? 0.12 : b.actual ? 1 : 0.45,
            }}
            title={`${b.clave} · ${b.valor}`}
          />
        ))}
      </div>
      <div className={`mt-1 flex ${gap}`}>
        {barras.map((b, i) => (
          <span key={b.clave} className="flex-1 text-center text-[8px] text-white/40">
            {i % paso === 0 ? b.etiqueta : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function Dato({ titulo, valor, sub }: { titulo: string; valor: string; sub: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-2">
      <p className="text-[10px] text-white/45 truncate">{titulo}</p>
      <p className="text-lg font-bold text-white/90">{valor}</p>
      <p className="text-[9px] text-white/35">{sub}</p>
    </div>
  )
}

/** Un día en detalle: sus macros contra el objetivo, su agua y su pesaje. */
function DetalleDia({
  dia,
  comidas,
  aguaMl,
  pesos,
  perfil,
}: {
  dia: string
  comidas: RegistroComida[]
  aguaMl: number
  pesos: RegistroPeso[]
  perfil: PerfilNutricion
}) {
  const t = useT()
  // El último pesaje del día (si se pesó varias veces, gana el más reciente).
  const pesaje = useMemo(() => {
    let ultimo: RegistroPeso | null = null
    for (const p of pesos) {
      if (p.fecha === dia && (!ultimo || (p.id ?? 0) > (ultimo.id ?? 0))) ultimo = p
    }
    return ultimo
  }, [pesos, dia])

  return (
    <div className="space-y-3">
      <p className="px-1 text-sm font-semibold capitalize">{nombreFecha(dia)}</p>
      <ResumenHoy fecha={dia} comidas={comidas} aguaMl={aguaMl} perfil={perfil} />
      {pesaje && (
        <p className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm">
          <Icono nombre="balanza" />{' '}
          {t('cocina.prog.pesajeDia', `Pesaje del día: ${pesaje.kg} kg`, { n: String(pesaje.kg) })}
        </p>
      )}
    </div>
  )
}

/**
 * Cuando la báscula no sigue al plan, proponer cuántas kcal mover. Se propone y
 * se aplica con un botón: nunca solo.
 */
function SugerenciaAjuste({
  fecha,
  comidas,
  perfil,
  perfilRaw,
  pesos,
}: {
  fecha: string
  comidas: RegistroComida[]
  perfil: PerfilNutricion
  perfilRaw: PerfilConId | undefined
  pesos: RegistroPeso[]
}) {
  const t = useT()
  const [aplicado, setAplicado] = useState(false)

  const sugerencia = useMemo(() => {
    const meta = progresoMeta(pesos, perfil, fecha)
    return sugerirAjusteKcal(meta, balanceSemanal(comidas, perfil, fecha), perfil)
  }, [pesos, comidas, perfil, fecha])

  if (!sugerencia || !perfilRaw?.id) return null

  const aplicar = async () => {
    await perfilNutricionRepo.update(perfilRaw.id, { calorias: sugerencia.kcalPropuestas })
    setAplicado(true)
  }

  if (aplicado) {
    return (
      <p className="rounded-xl bg-emerald-500/15 px-4 py-3 text-xs font-semibold text-emerald-400">
        {t('cocina.ajuste.aplicado', `Listo, tu objetivo ahora es de ${sugerencia.kcalPropuestas} kcal al día.`, {
          n: String(sugerencia.kcalPropuestas),
        })}
      </p>
    )
  }

  const sube = sugerencia.deltaKcal > 0
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-amber-300">
        <Icono nombre="brillo" /> {t('cocina.ajuste.titulo', 'Tu peso no va al ritmo pactado')}
      </p>
      <p className="mt-1 text-xs text-white/60">
        {sube
          ? t('cocina.ajuste.subir', `Prueba comer ${Math.abs(sugerencia.deltaKcal)} kcal más al día.`, {
              n: String(Math.abs(sugerencia.deltaKcal)),
            })
          : t('cocina.ajuste.bajar', `Prueba comer ${Math.abs(sugerencia.deltaKcal)} kcal menos al día.`, {
              n: String(Math.abs(sugerencia.deltaKcal)),
            })}
      </p>
      <button
        type="button"
        onClick={aplicar}
        className="ui-accent-bg mt-3 w-full rounded-lg py-2 text-xs font-bold hover:brightness-110"
      >
        {t('cocina.ajuste.aplicar', `Poner ${sugerencia.kcalPropuestas} kcal como objetivo`, {
          n: String(sugerencia.kcalPropuestas),
        })}
      </button>
    </div>
  )
}
