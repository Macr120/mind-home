import { Icono } from '../../core/ui/iconos/Icono'
import { useMemo, useState } from 'react'
import { metasRepo } from '../../core/data/repository'
import { money, money2 } from './mes'
import { useT } from '../../core/i18n/useT'

type Sim = 'compuesto' | 'simple' | 'meta' | 'credito'

const SIMS: { id: Sim; labelEs: string }[] = [
  { id: 'compuesto', labelEs: 'Compuesto' },
  { id: 'simple', labelEs: 'Simple' },
  { id: 'meta', labelEs: 'Meta' },
  { id: 'credito', labelEs: 'Crédito' },
]

const num = (s: string) => {
  const v = parseFloat(s)
  return Number.isFinite(v) && v >= 0 ? v : 0
}

/** Tasa efectiva mensual a partir de tasa anual (%) y capitalizaciones por año. */
const tasaMensual = (tasaAnual: number, m: number) =>
  Math.pow(1 + tasaAnual / 100 / m, m / 12) - 1

export function SimuladoresTab() {
  const t = useT()
  const [sim, setSim] = useState<Sim>('compuesto')

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {SIMS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSim(s.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              sim === s.id ? 'bg-indigo-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t(`despacho.s.${s.id}`, s.labelEs)}
          </button>
        ))}
      </div>

      {sim === 'compuesto' && <SimCompuesto />}
      {sim === 'simple' && <SimSimple />}
      {sim === 'meta' && <SimMeta />}
      {sim === 'credito' && <SimCredito />}
    </div>
  )
}

// ----- Interés compuesto con aportaciones -----

function SimCompuesto() {
  const t = useT()
  const [inicial, setInicial] = useState('10000')
  const [aporte, setAporte] = useState('1000')
  const [tasa, setTasa] = useState('10')
  const [anos, setAnos] = useState('10')
  const [capitalizacion, setCapitalizacion] = useState('12')

  const filas = useMemo(() => {
    const n = Math.min(60, Math.max(1, Math.round(num(anos))))
    const iMes = tasaMensual(num(tasa), Number(capitalizacion))
    const aporteMes = num(aporte)
    let saldo = num(inicial)
    let aportado = num(inicial)
    const res: { ano: number; aportado: number; interes: number; saldo: number }[] = []
    for (let a = 1; a <= n; a++) {
      for (let m = 0; m < 12; m++) {
        saldo = saldo * (1 + iMes) + aporteMes
        aportado += aporteMes
      }
      res.push({ ano: a, aportado, interes: saldo - aportado, saldo })
    }
    return res
  }, [inicial, aporte, tasa, anos, capitalizacion])

  const final = filas[filas.length - 1]

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 grid grid-cols-2 gap-3">
        <Campo label={t('despacho.s.inicial', 'Capital inicial $')} valor={inicial} setValor={setInicial} />
        <Campo label={t('despacho.s.aporteMes', 'Aportación mensual $')} valor={aporte} setValor={setAporte} />
        <Campo label={t('despacho.s.tasaAnual', 'Tasa anual %')} valor={tasa} setValor={setTasa} />
        <Campo label={t('despacho.s.anos', 'Años')} valor={anos} setValor={setAnos} />
        <label className="col-span-2 block">
          <span className="text-xs text-white/50">{t('despacho.s.capitalizacion', 'Capitalización')}</span>
          <select
            value={capitalizacion}
            onChange={(e) => setCapitalizacion(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          >
            <option value="12">{t('despacho.s.cap.12', 'Mensual')}</option>
            <option value="4">{t('despacho.s.cap.4', 'Trimestral')}</option>
            <option value="2">{t('despacho.s.cap.2', 'Semestral')}</option>
            <option value="1">{t('despacho.s.cap.1', 'Anual')}</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Resultado titulo={t('despacho.s.saldoFinal', 'Saldo final')} valor={money(final.saldo)} color="#60a5fa" />
        <Resultado titulo={t('despacho.s.aportado', 'Aportado')} valor={money(final.aportado)} color="#e5e7eb" />
        <Resultado titulo={t('despacho.s.interesGanado', 'Interés ganado')} valor={money(final.interes)} color="#34d399" />
      </div>

      <GraficaApilada filas={filas} />

      <TablaAnual
        columnas={[
          t('despacho.s.col.ano', 'Año'),
          t('despacho.s.col.aportado', 'Aportado'),
          t('despacho.s.col.interes', 'Interés'),
          t('despacho.s.col.saldo', 'Saldo'),
        ]}
        filas={filas.map((f) => [String(f.ano), money(f.aportado), money(f.interes), money(f.saldo)])}
      />
    </div>
  )
}

/** Barras apiladas por año: aportado (azul) + interés (verde). */
function GraficaApilada({
  filas,
}: {
  filas: { ano: number; aportado: number; interes: number; saldo: number }[]
}) {
  const t = useT()
  const max = Math.max(1, ...filas.map((f) => f.saldo))
  const paso = Math.ceil(filas.length / 12)
  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="flex items-center gap-4 text-xs text-white/60 mb-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#60a5fa' }} />
          {t('despacho.s.aportado', 'Aportado')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#34d399' }} />
          {t('despacho.s.interesGanado', 'Interés ganado')}
        </span>
      </div>
      <div className="flex items-stretch gap-1 h-36">
        {filas.map((f) => (
          <div key={f.ano} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="flex-1 w-full flex flex-col justify-end">
              <div
                className="w-full flex flex-col overflow-hidden rounded-t"
                style={{ height: `${Math.max(2, (f.saldo / max) * 100)}%` }}
                title={`${t('despacho.s.col.ano', 'Año')} ${f.ano}: ${money(f.saldo)}`}
              >
                <div style={{ height: `${f.saldo > 0 ? (f.interes / f.saldo) * 100 : 0}%`, background: '#34d399' }} />
                <div className="flex-1" style={{ background: '#60a5fa' }} />
              </div>
            </div>
            <span className="text-[10px] text-white/40">
              {f.ano === 1 || f.ano % paso === 0 ? f.ano : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TablaAnual({ columnas, filas }: { columnas: string[]; filas: string[][] }) {
  const t = useT()
  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <p className="text-sm font-semibold mb-2">{t('despacho.s.porAno', 'Año por año')}</p>
      <div className="max-h-56 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/40 text-left">
              {columnas.map((c) => (
                <th key={c} className="py-1 pr-2 font-medium last:text-right last:pr-0">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f[0]} className="border-t border-white/5 text-white/70">
                {f.map((v, i) => (
                  <td key={i} className="py-1 pr-2 last:text-right last:pr-0">{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ----- Interés simple (con comparativa vs compuesto) -----

function SimSimple() {
  const t = useT()
  const [capital, setCapital] = useState('10000')
  const [tasa, setTasa] = useState('10')
  const [anos, setAnos] = useState('5')

  const r = useMemo(() => {
    const P = num(capital)
    const rate = num(tasa) / 100
    const n = Math.min(60, Math.max(1, Math.round(num(anos))))
    const interes = P * rate * n
    const compuesto = P * Math.pow(1 + rate, n)
    const filas = Array.from({ length: n }, (_, i) => ({
      ano: i + 1,
      simple: P * (1 + rate * (i + 1)),
      compuesto: P * Math.pow(1 + rate, i + 1),
    }))
    return { P, n, interes, total: P + interes, compuesto, filas }
  }, [capital, tasa, anos])

  const max = Math.max(1, ...r.filas.map((f) => f.compuesto))
  const paso = Math.ceil(r.filas.length / 12)

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 grid grid-cols-3 gap-3">
        <Campo label={t('despacho.s.inicial', 'Capital inicial $')} valor={capital} setValor={setCapital} />
        <Campo label={t('despacho.s.tasaAnual', 'Tasa anual %')} valor={tasa} setValor={setTasa} />
        <Campo label={t('despacho.s.anos', 'Años')} valor={anos} setValor={setAnos} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Resultado titulo={t('despacho.s.interesGenerado', 'Interés generado')} valor={money(r.interes)} color="#34d399" />
        <Resultado titulo={t('despacho.s.total', 'Total final')} valor={money(r.total)} color="#60a5fa" />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm text-white/70">
          {t(
            'despacho.s.vsCompuesto',
            `Con interés compuesto (capitalización anual) tendrías ${money(r.compuesto)} — ${money(r.compuesto - r.total)} más.`,
            { x: money(r.compuesto), d: money(r.compuesto - r.total) },
          )}
        </p>
        <div className="flex items-center gap-4 text-xs text-white/60 mt-3 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#60a5fa' }} />
            {t('despacho.s.simple', 'Simple')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#34d399' }} />
            {t('despacho.s.compuesto', 'Compuesto')}
          </span>
        </div>
        <div className="flex items-stretch gap-1 h-28">
          {r.filas.map((f) => (
            <div key={f.ano} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="flex-1 w-full flex items-end justify-center gap-px">
                <div
                  className="w-1/2 rounded-t"
                  style={{ height: `${Math.max(2, (f.simple / max) * 100)}%`, background: '#60a5fa' }}
                  title={`${t('despacho.s.simple', 'Simple')}: ${money(f.simple)}`}
                />
                <div
                  className="w-1/2 rounded-t"
                  style={{ height: `${Math.max(2, (f.compuesto / max) * 100)}%`, background: '#34d399' }}
                  title={`${t('despacho.s.compuesto', 'Compuesto')}: ${money(f.compuesto)}`}
                />
              </div>
              <span className="text-[10px] text-white/40">
                {f.ano === 1 || f.ano % paso === 0 ? f.ano : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ----- Meta: aportación mensual necesaria -----

function SimMeta() {
  const t = useT()
  const metas = metasRepo.useAll() ?? []
  const [objetivo, setObjetivo] = useState('100000')
  const [inicial, setInicial] = useState('0')
  const [tasa, setTasa] = useState('8')
  const [anos, setAnos] = useState('5')

  const r = useMemo(() => {
    const M = num(objetivo)
    const P = num(inicial)
    const iMes = num(tasa) / 100 / 12
    const n = Math.min(60, Math.max(1, Math.round(num(anos)))) * 12
    const factor = Math.pow(1 + iMes, n)
    const aporte = iMes === 0 ? (M - P) / n : ((M - P * factor) * iMes) / (factor - 1)
    if (aporte <= 0) return { listo: true as const }
    const aportado = P + aporte * n
    return { listo: false as const, aporte, n, aportado, interes: M - aportado }
  }, [objetivo, inicial, tasa, anos])

  const usarMeta = (id: string) => {
    const m = metas.find((x) => String(x.id) === id)
    if (!m) return
    setObjetivo(String(m.objetivo))
    setInicial(String(m.ahorrado))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-3">
        {metas.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => usarMeta(e.target.value)}
            className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          >
            <option value="">{t('despacho.s.usarMeta', 'Usar una de tus metas…')}</option>
            {metas.map((m) => (
              <option key={m.id} value={String(m.id)}>
                🎯 {m.nombre} · {money(m.objetivo)}
              </option>
            ))}
          </select>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label={t('despacho.s.objetivo', 'Cantidad meta $')} valor={objetivo} setValor={setObjetivo} />
          <Campo label={t('despacho.s.inicial', 'Capital inicial $')} valor={inicial} setValor={setInicial} />
          <Campo label={t('despacho.s.tasaAnual', 'Tasa anual %')} valor={tasa} setValor={setTasa} />
          <Campo label={t('despacho.s.anos', 'Años')} valor={anos} setValor={setAnos} />
        </div>
      </div>

      {r.listo ? (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-300">
          <Icono nombre="fiesta" /> {t('despacho.s.metaLista', 'Con tu capital inicial y esa tasa ya alcanzas la meta sin aportar más.')}
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-white/5 p-4 border border-white/10 text-center">
            <p className="text-xs text-white/50">{t('despacho.s.aporteNecesario', 'Aportación mensual necesaria')}</p>
            <p className="text-3xl font-bold text-indigo-400 mt-1">{money2(r.aporte)}</p>
            <p className="text-xs text-white/40 mt-1">
              {t('despacho.s.durante', `durante ${r.n} meses`, { n: String(r.n) })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Resultado titulo={t('despacho.s.deTuBolsillo', 'De tu bolsillo')} valor={money(r.aportado)} color="#e5e7eb" />
            <Resultado titulo={t('despacho.s.generaInteres', 'Lo pone el interés')} valor={money(r.interes)} color="#34d399" />
          </div>
        </>
      )}
    </div>
  )
}

// ----- Crédito: mensualidad y amortización -----

function SimCredito() {
  const t = useT()
  const [monto, setMonto] = useState('300000')
  const [tasa, setTasa] = useState('12')
  const [plazo, setPlazo] = useState('48')

  const r = useMemo(() => {
    const C = num(monto)
    const i = num(tasa) / 100 / 12
    const n = Math.min(600, Math.max(1, Math.round(num(plazo))))
    const pago = i === 0 ? C / n : (C * i) / (1 - Math.pow(1 + i, -n))
    let saldo = C
    const filas: { ano: number; interes: number; capital: number; saldo: number }[] = []
    let intAno = 0
    let capAno = 0
    for (let k = 1; k <= n; k++) {
      const int = saldo * i
      const cap = pago - int
      saldo = Math.max(0, saldo - cap)
      intAno += int
      capAno += cap
      if (k % 12 === 0 || k === n) {
        filas.push({ ano: Math.ceil(k / 12), interes: intAno, capital: capAno, saldo })
        intAno = 0
        capAno = 0
      }
    }
    return { pago, total: pago * n, intereses: pago * n - C, filas }
  }, [monto, tasa, plazo])

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 grid grid-cols-3 gap-3">
        <Campo label={t('despacho.s.montoCredito', 'Monto del crédito $')} valor={monto} setValor={setMonto} />
        <Campo label={t('despacho.s.tasaAnual', 'Tasa anual %')} valor={tasa} setValor={setTasa} />
        <Campo label={t('despacho.s.plazoMeses', 'Plazo (meses)')} valor={plazo} setValor={setPlazo} />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10 text-center">
        <p className="text-xs text-white/50">{t('despacho.s.mensualidad', 'Mensualidad')}</p>
        <p className="text-3xl font-bold text-amber-400 mt-1">{money2(r.pago)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Resultado titulo={t('despacho.s.totalPagado', 'Total pagado')} valor={money(r.total)} color="#e5e7eb" />
        <Resultado titulo={t('despacho.s.intereses', 'Intereses totales')} valor={money(r.intereses)} color="#f87171" />
      </div>

      <TablaAnual
        columnas={[
          t('despacho.s.col.ano', 'Año'),
          t('despacho.s.col.interes', 'Interés'),
          t('despacho.s.col.capital', 'Capital'),
          t('despacho.s.col.restante', 'Saldo restante'),
        ]}
        filas={r.filas.map((f) => [String(f.ano), money(f.interes), money(f.capital), money(f.saldo)])}
      />
    </div>
  )
}

// ----- Piezas compartidas -----

function Campo({
  label,
  valor,
  setValor,
}: {
  label: string
  valor: string
  setValor: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs text-white/50">{label}</span>
      <input
        type="number"
        min="0"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
      />
    </label>
  )
}

function Resultado({ titulo, valor, color }: { titulo: string; valor: string; color: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs text-white/50">{titulo}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {valor}
      </p>
    </div>
  )
}
