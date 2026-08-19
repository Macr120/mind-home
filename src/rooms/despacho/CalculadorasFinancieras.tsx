import { useEffect, useRef, useState } from 'react'
import { metasRepo } from '../../core/data/repository'
import { money, money2 } from './mes'
import { useResumenReal } from './useResumen'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { Campo, Resultado } from './SimuladoresTab'
import { AZUL, TARJETA, VERDE } from './ui'
import { acento } from '../_shared/acento'
import { PestanasCarpeta } from '../_shared/PestanasCarpeta'

/**
 * Calculadoras de metas financieras (pestaña Financieras, antes Ahorro):
 * cada una propone un monto objetivo a partir de reglas conocidas de finanzas
 * personales y ofrece crear la meta de una vez con ese monto. Los parámetros
 * de cada regla son editables — nadie tiene por qué aceptar el 50/30/20 o el
 * 20/4/10 tal cual.
 */

type Calc = 'fondoEmergencia' | 'libertadFinanciera' | 'reglaCincuenta' | 'reglaAuto'

const CALCS: { id: Calc; labelEs: string }[] = [
  { id: 'fondoEmergencia', labelEs: 'Fondo de emergencia' },
  { id: 'libertadFinanciera', labelEs: 'Libertad financiera' },
  { id: 'reglaCincuenta', labelEs: '50/30/20' },
  { id: 'reglaAuto', labelEs: 'Auto 20/4/10' },
]

const num = (s: string) => {
  const v = parseFloat(s)
  return Number.isFinite(v) && v >= 0 ? v : 0
}

/**
 * Campo numérico ligado al balance real: se autocompleta y sigue el valor
 * mientras el usuario no lo toque (así llega ya calculado en cuanto abren la
 * calculadora, aunque el balance tarde un instante en cargar). En cuanto lo
 * edita a mano, deja de seguirlo y queda libre para lo que quiera simular.
 */
function useCampoLigado(real: number): [string, (v: string) => void] {
  const [valor, setValor] = useState(() => (real > 0 ? String(Math.round(real)) : ''))
  const tocado = useRef(false)

  useEffect(() => {
    if (!tocado.current) setValor(real > 0 ? String(Math.round(real)) : '')
  }, [real])

  const setManual = (v: string) => {
    tocado.current = true
    setValor(v)
  }
  return [valor, setManual]
}

export function CalculadorasFinancieras() {
  const [calc, setCalc] = useState<Calc>('fondoEmergencia')

  return (
    <div className="space-y-4">
      <div data-tut="despacho.calc.tabs">
        <PestanasCarpeta
          items={CALCS.map((c) => ({ id: c.id, labelEs: c.labelEs }))}
          activo={calc}
          onCambio={setCalc}
          prefijoClave="despacho.calc.tab"
          prefijoTut="despacho.calc"
          color={AZUL}
          variante="sub"
          desplazable
        />
      </div>

      <div data-tut="despacho.calc.panel">
        {calc === 'fondoEmergencia' && <CalcFondoEmergencia />}
        {calc === 'libertadFinanciera' && <CalcLibertadFinanciera />}
        {calc === 'reglaCincuenta' && <CalcReglaCincuenta />}
        {calc === 'reglaAuto' && <CalcReglaAuto />}
      </div>
    </div>
  )
}

/** Botón compartido: crea la meta (tipo 'ahorro') y confirma unos segundos. */
function BotonCrearMeta({ nombre, objetivo }: { nombre: string; objetivo: number }) {
  const t = useT()
  const [creada, setCreada] = useState(false)

  const crear = async () => {
    if (objetivo <= 0) return
    await metasRepo.add({ nombre, objetivo, ahorrado: 0, tipo: 'ahorro' })
    setCreada(true)
    setTimeout(() => setCreada(false), 2500)
  }

  return (
    <button
      data-tut="despacho.calc.crearMeta"
      onClick={() => void crear()}
      disabled={objetivo <= 0}
      className="ui-accent-bg w-full rounded-lg py-2.5 font-bold transition hover:brightness-110 disabled:opacity-40"
      style={acento(creada ? VERDE : AZUL)}
    >
      {creada ? (
        <>
          <Icono nombre="confirmar" /> {t('despacho.calc.metaCreada', 'Meta creada — revísala arriba')}
        </>
      ) : (
        <>
          <Icono nombre="objetivo" /> {t('despacho.calc.crearMeta', 'Crear meta con este monto')}
        </>
      )}
    </button>
  )
}

// ----- 1. Fondo de emergencia -----

const MESES_COLCHON = [3, 6, 9, 12]

function CalcFondoEmergencia() {
  const t = useT()
  const { gastos } = useResumenReal()
  const [gastoMensual, setGastoMensual] = useCampoLigado(gastos)
  const [meses, setMeses] = useState(6)

  const objetivo = num(gastoMensual) * meses

  return (
    <div className="space-y-4">
      <div className={`${TARJETA} space-y-3`}>
        <Campo dinero label={t('despacho.calc.gastoEsencial', 'Gasto mensual esencial')} valor={gastoMensual} setValor={setGastoMensual} />
        <div>
          <span className="text-xs text-white/55">{t('despacho.calc.mesesColchon', 'Meses de colchón')}</span>
          <div className="mt-1">
            <PestanasCarpeta
              items={MESES_COLCHON.map((m) => ({ id: String(m), label: String(m) }))}
              activo={String(meses)}
              onCambio={(id) => setMeses(Number(id))}
              color={AZUL}
              variante="sub"
              flecha={false}
            />
          </div>
        </div>
      </div>

      <Resultado titulo={t('despacho.calc.fondoObjetivo', 'Fondo objetivo')} valor={money(objetivo)} color="#60a5fa" />
      <p className="text-xs text-white/40">
        {t('despacho.calc.fondoNota', `${money2(num(gastoMensual))} × ${meses} meses`, {
          g: money2(num(gastoMensual)),
          n: String(meses),
        })}
      </p>

      <BotonCrearMeta nombre={t('despacho.calc.nombreFondo', 'Fondo de emergencia')} objetivo={objetivo} />
    </div>
  )
}

// ----- 2. Libertad financiera (regla del 4%) -----

function CalcLibertadFinanciera() {
  const t = useT()
  const { gastos } = useResumenReal()
  const [gastoMensual, setGastoMensual] = useCampoLigado(gastos)
  const [tasa, setTasa] = useState('4')

  const tasaN = Math.max(0.1, num(tasa))
  const objetivo = (num(gastoMensual) * 12) / (tasaN / 100)
  const multiplo = 100 / tasaN

  return (
    <div className="space-y-4">
      <div className={`${TARJETA} grid grid-cols-2 gap-3`}>
        <Campo dinero label={t('despacho.calc.gastoDeseado', 'Gasto mensual deseado')} valor={gastoMensual} setValor={setGastoMensual} />
        <Campo label={t('despacho.calc.tasaRetiro', 'Tasa de retiro segura %')} valor={tasa} setValor={setTasa} />
      </div>

      <Resultado titulo={t('despacho.calc.libertadObjetivo', 'Necesitas invertido')} valor={money(objetivo)} color="#60a5fa" />
      <p className="text-xs text-white/40">
        {t('despacho.calc.libertadNota', `Tu gasto anual × ${multiplo.toFixed(1)}`, { n: multiplo.toFixed(1) })}
      </p>

      <BotonCrearMeta nombre={t('despacho.calc.nombreLibertad', 'Libertad financiera')} objetivo={objetivo} />
    </div>
  )
}

// ----- 3. Regla 50/30/20 -----

function CalcReglaCincuenta() {
  const t = useT()
  const { ingresos } = useResumenReal()
  const [ingresoMensual, setIngresoMensual] = useCampoLigado(ingresos)
  const [necesidades, setNecesidades] = useState('50')
  const [caprichos, setCaprichos] = useState('30')
  const [ahorro, setAhorro] = useState('20')

  const ing = num(ingresoMensual)
  const suma = num(necesidades) + num(caprichos) + num(ahorro)
  const montoNecesidades = (ing * num(necesidades)) / 100
  const montoCaprichos = (ing * num(caprichos)) / 100
  const montoAhorro = (ing * num(ahorro)) / 100

  return (
    <div className="space-y-4">
      <div className={`${TARJETA} space-y-3`}>
        <Campo dinero label={t('despacho.calc.ingresoMensual', 'Ingreso mensual')} valor={ingresoMensual} setValor={setIngresoMensual} />
        <div className="grid grid-cols-3 gap-3">
          <Campo label={t('despacho.calc.pctNecesidades', 'Necesidades %')} valor={necesidades} setValor={setNecesidades} />
          <Campo label={t('despacho.calc.pctCaprichos', 'Caprichos %')} valor={caprichos} setValor={setCaprichos} />
          <Campo label={t('despacho.calc.pctAhorro', 'Ahorro %')} valor={ahorro} setValor={setAhorro} />
        </div>
        {suma !== 100 && (
          <p className="text-xs text-amber-300">
            {t('despacho.calc.noSuman100', `Los porcentajes suman ${suma}%, no 100%.`, { n: String(suma) })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Resultado titulo={t('despacho.calc.necesidades', 'Necesidades')} valor={money(montoNecesidades)} color="#60a5fa" />
        <Resultado titulo={t('despacho.calc.caprichos', 'Caprichos')} valor={money(montoCaprichos)} color="#a855f7" />
        <Resultado titulo={t('despacho.calc.ahorroTxt', 'Ahorro')} valor={money(montoAhorro)} color="#34d399" />
      </div>

      <BotonCrearMeta nombre={t('despacho.calc.nombreCaprichos', 'Presupuesto de caprichos')} objetivo={montoCaprichos} />
    </div>
  )
}

// ----- 4. Regla del auto 20/4/10 -----

function CalcReglaAuto() {
  const t = useT()
  const { ingresos } = useResumenReal()
  const [precio, setPrecio] = useState('300000')
  const [ingresoMensual, setIngresoMensual] = useCampoLigado(ingresos)
  const [pctEnganche, setPctEnganche] = useState('20')
  const [plazoMeses, setPlazoMeses] = useState('48')
  const [pctIngreso, setPctIngreso] = useState('10')
  const [tasa, setTasa] = useState('12')

  const p = num(precio)
  const enganche = (p * num(pctEnganche)) / 100
  const financiado = Math.max(0, p - enganche)
  const n = Math.min(600, Math.max(1, Math.round(num(plazoMeses))))
  const i = num(tasa) / 100 / 12
  const mensualidadEstimada = i === 0 ? financiado / n : (financiado * i) / (1 - Math.pow(1 + i, -n))
  const mensualidadMaxima = (num(ingresoMensual) * num(pctIngreso)) / 100
  const cabe = mensualidadEstimada <= mensualidadMaxima

  return (
    <div className="space-y-4">
      <div className={`${TARJETA} grid grid-cols-2 gap-3`}>
        <Campo dinero label={t('despacho.calc.precioAuto', 'Precio del auto')} valor={precio} setValor={setPrecio} />
        <Campo dinero label={t('despacho.calc.ingresoMensual', 'Ingreso mensual')} valor={ingresoMensual} setValor={setIngresoMensual} />
        <Campo label={t('despacho.calc.pctEnganche', 'Enganche %')} valor={pctEnganche} setValor={setPctEnganche} />
        <Campo label={t('despacho.calc.plazoMax', 'Plazo máx. (meses)')} valor={plazoMeses} setValor={setPlazoMeses} />
        <Campo label={t('despacho.calc.pctIngresoAuto', 'Máx. del ingreso %')} valor={pctIngreso} setValor={setPctIngreso} />
        <Campo label={t('despacho.calc.tasaAuto', 'Tasa anual %')} valor={tasa} setValor={setTasa} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Resultado titulo={t('despacho.calc.enganche', 'Enganche requerido')} valor={money(enganche)} color="#60a5fa" />
        <Resultado titulo={t('despacho.calc.mensualidadMax', 'Mensualidad máxima')} valor={money(mensualidadMaxima)} color="#e5e7eb" />
      </div>

      <div
        className={`rounded-xl border p-3 text-sm ${
          cabe ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}
      >
        <Icono nombre={cabe ? 'confirmar' : 'alerta'} />{' '}
        {cabe
          ? t('despacho.calc.autoCabe', `Te alcanza: la mensualidad estimada es ${money2(mensualidadEstimada)}.`, {
              m: money2(mensualidadEstimada),
            })
          : t(
              'despacho.calc.autoNoCabe',
              `No te alcanza con estas condiciones: la mensualidad estimada (${money2(mensualidadEstimada)}) supera tu máximo.`,
              { m: money2(mensualidadEstimada) },
            )}
      </div>

      <BotonCrearMeta nombre={t('despacho.calc.nombreEnganche', 'Enganche del auto')} objetivo={enganche} />
    </div>
  )
}
