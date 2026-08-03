import { useState } from 'react'
import type { Meta } from '../../core/data/db'
import { metasRepo } from '../../core/data/repository'
import { money2 } from './mes'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { SimCompuesto, SimSimple, SimCredito } from './SimuladoresTab'
import { CalculadorasFinancieras } from './CalculadorasFinancieras'
import { BarraEjemplo } from './BarraEjemplo'
import { borrarEjemploMeta, cargarEjemploMeta, hayEjemploMeta } from './ejemplos'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'

/** Tipo real de la meta en la base (`Meta.tipo`); no cambia con la reorganización de pestañas. */
export type TipoMeta = 'ahorro' | 'inversion' | 'deuda'

/** Sub-menús de Metas: Ahorro e Inversión se ven juntos en una sola pestaña. */
export type VistaMeta = 'financieras' | 'ahorroInversion' | 'deuda'

/** Textos por tipo de meta: clave i18n + español (el fallback de `t`). */
const COPY: Record<
  TipoMeta,
  { nueva: [string, string]; phNombre: [string, string]; phObjetivo: [string, string]; vacio: [string, string]; abonar: [string, string]; phAbono: [string, string] }
> = {
  ahorro: {
    nueva: ['despacho.meta.nueva', 'Nueva meta de ahorro'],
    phNombre: ['despacho.meta.ph.nombre', 'Ej. Viaje a Japón'],
    phObjetivo: ['despacho.meta.ph.objetivo', 'Meta $'],
    vacio: ['despacho.meta.vacio', 'Aún no tienes metas. ¡Crea tu primer objetivo de ahorro!'],
    abonar: ['despacho.meta.abonar', '+ Abonar'],
    phAbono: ['despacho.meta.ph.abono', 'Abonar $'],
  },
  inversion: {
    nueva: ['despacho.meta.nuevaInv', 'Nueva meta de inversión'],
    phNombre: ['despacho.meta.ph.nombreInv', 'Ej. Fondo indexado'],
    phObjetivo: ['despacho.meta.ph.objetivo', 'Meta $'],
    vacio: ['despacho.meta.vacioInv', 'Aún no tienes metas de inversión. Define cuánto quieres invertir y ve aportando.'],
    abonar: ['despacho.meta.aportar', '+ Aportar'],
    phAbono: ['despacho.meta.ph.aporte', 'Aportar $'],
  },
  deuda: {
    nueva: ['despacho.meta.nuevaDeuda', 'Nueva deuda por pagar'],
    phNombre: ['despacho.meta.ph.nombreDeuda', 'Ej. Tarjeta de crédito'],
    phObjetivo: ['despacho.meta.ph.deuda', 'Deuda $'],
    vacio: ['despacho.meta.vacioDeuda', 'Sin deudas registradas. Anota lo que debes y ve registrando cada pago.'],
    abonar: ['despacho.meta.pagar', '+ Pagar'],
    phAbono: ['despacho.meta.ph.pago', 'Pagar $'],
  },
}

export function MetasTab({ vista }: { vista: VistaMeta }) {
  if (vista === 'financieras') return <VistaFinancieras />
  if (vista === 'deuda') return <VistaDeuda />
  return <VistaAhorroInversion />
}

/** Solo las calculadoras: sin lista de metas propia, sin Cronograma — eso vive en Ahorro/Inversión. */
function VistaFinancieras() {
  const t = useT()
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">
        <Icono nombre="calculadora" /> {t('despacho.calc.titulo', 'Calculadoras financieras')}
      </p>
      <CalculadorasFinancieras />
    </div>
  )
}

/**
 * Ahorro e inversión en una sola lista mezclada (`tipo` de cada fila decide su
 * texto). El toggle de la forma decide con QUÉ tipo nace la meta nueva; el
 * ejemplo y el simulador siguen ese mismo toggle. El Cronograma no se mezcla:
 * son dos árboles reales distintos (`ambitoId` 'ahorro'/'inversion'), así que
 * se muestran los dos, cada uno con su encabezado.
 */
function VistaAhorroInversion() {
  const t = useT()
  const metas = (metasRepo.useAll() ?? []).filter((m) => {
    const tp = m.tipo ?? 'ahorro'
    return tp === 'ahorro' || tp === 'inversion'
  })
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<'ahorro' | 'inversion'>('ahorro')
  const copy = COPY[nuevoTipo]

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const obj = parseFloat(objetivo)
    if (!nombre.trim() || !obj || obj <= 0) return
    await metasRepo.add({ nombre: nombre.trim(), objetivo: obj, ahorrado: 0, tipo: nuevoTipo })
    setNombre('')
    setObjetivo('')
  }

  return (
    <div className="space-y-5">
      <form onSubmit={crear} className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10">
        <div className="flex gap-2">
          {(['ahorro', 'inversion'] as const).map((tt) => (
            <button
              key={tt}
              type="button"
              onClick={() => setNuevoTipo(tt)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                nuevoTipo === tt ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {tt === 'ahorro' ? t('despacho.tab.ahorro', 'Ahorro') : t('despacho.tab.inversion', 'Inversión')}
            </button>
          ))}
        </div>
        <p className="text-sm font-semibold">{t(...copy.nueva)}</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t(...copy.phNombre)}
            className="col-span-2 rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
          <input
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            type="number"
            placeholder={t(...copy.phObjetivo)}
            className="rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-600 py-2 font-bold texto-cta hover:brightness-110 transition"
        >
          {t('despacho.meta.crear', 'Crear meta')}
        </button>
      </form>

      <div data-tut="despacho.metas.lista" className="space-y-3">
        {metas.length === 0 && (
          <p className="text-center text-white/40 text-sm py-6">{t(...copy.vacio)}</p>
        )}
        {metas.map((m) => (
          <MetaCard key={m.id} meta={m} tipo={(m.tipo ?? 'ahorro') as TipoMeta} />
        ))}
      </div>

      <BarraEjemplo
        cargado={hayEjemploMeta(metas, nuevoTipo)}
        onCargar={() => cargarEjemploMeta(nuevoTipo)}
        onBorrar={() => borrarEjemploMeta(metas, nuevoTipo)}
      />

      <div className="space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="calculadora" /> {t('despacho.s.simulador', 'Simulador')}
        </p>
        <SimInversion />
      </div>

      {/* Alto fijo: `CronogramaApp` es `flex-1 min-h-0` y sin contenedor con
          altura se colapsaría a cero (mismo truco que ejercicio/MetasTab).
          Dos árboles reales distintos: no se mezclan aunque la lista de
          arriba sí. */}
      <div data-tut="despacho.cronograma.ahorro" className="space-y-2">
        <p className="text-sm font-semibold">
          <Icono nombre="calendario" /> {t('despacho.plan.tituloAhorro', 'Cronograma · Ahorro')}
        </p>
        <p className="text-xs text-white/45">
          {t('despacho.plan.desc', 'Tu meta grande sobre el eje del tiempo. Con ✨ la IA te arma un plan de aportaciones.')}
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="flex h-96 flex-col">
            <CronogramaApp plantillaId="despacho" ambitoId="ahorro" />
          </div>
        </div>
      </div>

      <div data-tut="despacho.cronograma.inversion" className="space-y-2">
        <p className="text-sm font-semibold">
          <Icono nombre="calendario" /> {t('despacho.plan.tituloInversion', 'Cronograma · Inversión')}
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="flex h-96 flex-col">
            <CronogramaApp plantillaId="despacho" ambitoId="inversion" />
          </div>
        </div>
      </div>
    </div>
  )
}

function VistaDeuda() {
  const t = useT()
  const tipo: TipoMeta = 'deuda'
  const metas = (metasRepo.useAll() ?? []).filter((m) => (m.tipo ?? 'ahorro') === tipo)
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const copy = COPY[tipo]

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const obj = parseFloat(objetivo)
    if (!nombre.trim() || !obj || obj <= 0) return
    await metasRepo.add({ nombre: nombre.trim(), objetivo: obj, ahorrado: 0, tipo })
    setNombre('')
    setObjetivo('')
  }

  return (
    <div className="space-y-5">
      <form onSubmit={crear} className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10">
        <p className="text-sm font-semibold">{t(...copy.nueva)}</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={t(...copy.phNombre)}
            className="col-span-2 rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
          <input
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            type="number"
            placeholder={t(...copy.phObjetivo)}
            className="rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-600 py-2 font-bold texto-cta hover:brightness-110 transition"
        >
          {t('despacho.meta.crear', 'Crear meta')}
        </button>
      </form>

      <div data-tut="despacho.deuda.lista" className="space-y-3">
        {metas.length === 0 && (
          <p className="text-center text-white/40 text-sm py-6">{t(...copy.vacio)}</p>
        )}
        {metas.map((m) => (
          <MetaCard key={m.id} meta={m} tipo={tipo} />
        ))}
      </div>

      <BarraEjemplo
        cargado={hayEjemploMeta(metas, tipo)}
        onCargar={() => cargarEjemploMeta(tipo)}
        onBorrar={() => borrarEjemploMeta(metas, tipo)}
      />

      <div className="space-y-3">
        <p className="text-sm font-semibold">
          <Icono nombre="calculadora" /> {t('despacho.s.simulador', 'Simulador')}
        </p>
        <SimCredito />
      </div>

      <div data-tut="despacho.cronograma.deuda" className="space-y-2">
        <p className="text-sm font-semibold">
          <Icono nombre="calendario" /> {t('despacho.plan.titulo', 'Cronograma')}
        </p>
        <p className="text-xs text-white/45">
          {t('despacho.plan.desc', 'Tu meta grande sobre el eje del tiempo. Con ✨ la IA te arma un plan de aportaciones.')}
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="flex h-96 flex-col">
            <CronogramaApp plantillaId="despacho" ambitoId="deuda" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Inversión trae dos simuladores: interés compuesto y simple. */
function SimInversion() {
  const t = useT()
  const [sim, setSim] = useState<'compuesto' | 'simple'>('compuesto')
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['compuesto', 'simple'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSim(s)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              sim === s ? 'bg-indigo-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t(`despacho.s.${s}`, s === 'compuesto' ? 'Compuesto' : 'Simple')}
          </button>
        ))}
      </div>
      {sim === 'compuesto' ? <SimCompuesto /> : <SimSimple />}
    </div>
  )
}

function MetaCard({ meta, tipo }: { meta: Meta; tipo: TipoMeta }) {
  const t = useT()
  const copy = COPY[tipo]
  const [abono, setAbono] = useState('')
  const pct = Math.min(100, (meta.ahorrado / meta.objetivo) * 100)
  const completa = meta.ahorrado >= meta.objetivo

  const abonar = async () => {
    const v = parseFloat(abono)
    if (!v || !meta.id) return
    await metasRepo.update(meta.id, {
      ahorrado: Math.max(0, meta.ahorrado + v),
    })
    setAbono('')
  }

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="flex items-center">
        <h3 className="font-bold">
          <Icono nombre={completa ? 'trofeo' : 'objetivo'} /> {meta.nombre}
        </h3>
        <button
          onClick={() => meta.id && metasRepo.remove(meta.id)}
          className="ml-auto text-white/30 hover:text-white/70"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 h-3 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: completa ? '#fbbf24' : '#34d399' }}
        />
      </div>
      <p className="mt-1.5 text-xs text-white/60">
        {money2(meta.ahorrado)} de {money2(meta.objetivo)} ({Math.round(pct)}%)
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={abono}
          onChange={(e) => setAbono(e.target.value)}
          type="number"
          placeholder={t(...copy.phAbono)}
          className="flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-sm outline-none border border-white/10 focus:border-white/30"
        />
        <button
          onClick={abonar}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold texto-cta hover:brightness-110 transition"
        >
          {t(...copy.abonar)}
        </button>
      </div>
    </div>
  )
}
