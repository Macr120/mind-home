import { useState } from 'react'
import { finanzasRepo } from '../../core/data/repository'
import { BalanceTab } from './BalanceTab'
import { MovimientosTab } from './MovimientosTab'
import { MetasTab, type VistaMeta } from './MetasTab'
import { MercadosTab, type SeccionMercado } from './MercadosTab'
import { PERIODOS, etiquetaPeriodo, hoyISO, sumarPeriodo, type Periodo } from './mes'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

type Tab = 'balance' | 'metas' | 'mercados'
type SubBalance = 'gastos' | 'ingresos' | 'balance'

interface ItemTab<T extends string> {
  id: T
  icono: NombreIcono
  labelEs: string
  /** Clave i18n propia cuando `despacho.tab.<id>` ya la usa otro menú. */
  clave?: string
}

const TABS: ItemTab<Tab>[] = [
  { id: 'balance', icono: 'balanza', labelEs: 'Presupuesto' },
  { id: 'metas', icono: 'objetivo', labelEs: 'Metas' },
  { id: 'mercados', icono: 'progreso', labelEs: 'Mercados' },
]

const SUBS_BALANCE: ItemTab<SubBalance>[] = [
  { id: 'gastos', icono: 'bajar', labelEs: 'Gastos' },
  { id: 'ingresos', icono: 'subir', labelEs: 'Ingresos' },
  { id: 'balance', icono: 'balanza', labelEs: 'Balance', clave: 'despacho.sub.balance' },
]

const PERIODO_ES: Record<Periodo, string> = {
  dia: 'Día',
  semana: 'Semana',
  mes: 'Mes',
  anio: 'Año',
}

const SUBS_METAS: ItemTab<VistaMeta>[] = [
  { id: 'financieras', icono: 'calculadora', labelEs: 'Financieras' },
  { id: 'ahorroInversion', icono: 'moneda', labelEs: 'Ahorro/Inversión' },
  { id: 'deuda', icono: 'tarjeta', labelEs: 'Deuda' },
]

const SUBS_MERCADOS: ItemTab<SeccionMercado>[] = [
  { id: 'divisas', icono: 'divisas', labelEs: 'Divisas' },
  { id: 'criptos', icono: 'moneda', labelEs: 'Cripto' },
  { id: 'acciones', icono: 'tendencia', labelEs: 'Acciones' },
  { id: 'commodities', icono: 'gema', labelEs: 'Materias' },
]

/** Menú/submenú inicial según la intención del chat (acepta las secciones viejas). */
function destinoInicial() {
  const s = intencionApp('despacho')?.seccion
  const d = {
    tab: 'balance' as Tab,
    balance: 'balance' as SubBalance,
    metas: 'ahorroInversion' as VistaMeta,
    mercados: 'divisas' as SeccionMercado,
  }
  switch (s) {
    // `fijos`/`movimientos` son secciones retiradas: se fusionaron en Gastos/Ingresos.
    case 'gastos':
    case 'fijos':
    case 'movimientos':
      return { ...d, balance: 'gastos' as const }
    case 'ingresos':
      return { ...d, balance: 'ingresos' as const }
    // Ahorro e inversión viven juntos en una sola pestaña; `financieras` es
    // la de las calculadoras (antes ahí vivía «ahorro»).
    case 'metas':
    case 'ahorro':
    case 'inversion':
    case 'simuladores':
      return { ...d, tab: 'metas' as const, metas: 'ahorroInversion' as const }
    case 'financieras':
      return { ...d, tab: 'metas' as const, metas: 'financieras' as const }
    case 'deuda':
      return { ...d, tab: 'metas' as const, metas: 'deuda' as const }
    // `portafolio`/`posiciones` son secciones retiradas: sus deep-links viejos
    // siguen vivos y caen en Mercados.
    case 'portafolio':
    case 'posiciones':
    case 'mercados':
    case 'divisas':
      return { ...d, tab: 'mercados' as const }
    case 'criptos':
    case 'cripto':
      return { ...d, tab: 'mercados' as const, mercados: 'criptos' as const }
    case 'acciones':
      return { ...d, tab: 'mercados' as const, mercados: 'acciones' as const }
    case 'commodities':
    case 'materias':
      return { ...d, tab: 'mercados' as const, mercados: 'commodities' as const }
    default:
      return d
  }
}

export function FinanzasApp() {
  const t = useT()
  const [ini] = useState(destinoInicial)
  const [tab, setTab] = useState<Tab>(ini.tab)
  const [subBalance, setSubBalance] = useState<SubBalance>(ini.balance)
  const [subMetas, setSubMetas] = useState<VistaMeta>(ini.metas)
  const [subMercados, setSubMercados] = useState<SeccionMercado>(ini.mercados)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [ancla, setAncla] = useState(hoyISO())
  const movimientos = finanzasRepo.useAll() ?? []
  const tipoBalance: 'gasto' | 'ingreso' = subBalance === 'ingresos' ? 'ingreso' : 'gasto'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            data-tut={`despacho.tab.${tabItem.id}`}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'bg-blue-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <Icono nombre={tabItem.icono} /> {t(`despacho.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'balance' && <SubTabs items={SUBS_BALANCE} activo={subBalance} onCambio={setSubBalance} />}
      {tab === 'metas' && <SubTabs items={SUBS_METAS} activo={subMetas} onCambio={setSubMetas} />}
      {tab === 'mercados' && <SubTabs items={SUBS_MERCADOS} activo={subMercados} onCambio={setSubMercados} />}

      {/* Gastos/Ingresos no navegan por fecha: su historial son carpetas año › mes › semana. */}
      {tab === 'balance' && subBalance === 'balance' && (
        <div data-tut="despacho.periodo" className="space-y-2">
          <div className="flex gap-1.5">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  periodo === p ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {t(`despacho.periodo.${p}`, PERIODO_ES[p])}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10">
            <button
              onClick={() => setAncla((a) => sumarPeriodo(a, periodo, -1))}
              className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
            >
              ‹
            </button>
            <span className="font-semibold">{etiquetaPeriodo(ancla, periodo)}</span>
            <button
              onClick={() => setAncla((a) => sumarPeriodo(a, periodo, 1))}
              className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {tab === 'balance' && subBalance === 'balance' && (
        <BalanceTab ancla={ancla} periodo={periodo} movimientos={movimientos} />
      )}

      {tab === 'balance' && subBalance !== 'balance' && (
        <MovimientosTab tipo={tipoBalance} movimientos={movimientos.filter((m) => m.tipo === tipoBalance)} />
      )}

      {tab === 'metas' && <MetasTab vista={subMetas} />}
      {tab === 'mercados' && <MercadosTab seccion={subMercados} />}
    </div>
  )
}

function SubTabs<T extends string>({
  items,
  activo,
  onCambio,
}: {
  items: ItemTab<T>[]
  activo: T
  onCambio: (id: T) => void
}) {
  const t = useT()
  return (
    <div className="flex gap-2">
      {items.map((s) => (
        <button
          key={s.id}
          data-tut={`despacho.sub.${s.id}`}
          onClick={() => onCambio(s.id)}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
            activo === s.id ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <Icono nombre={s.icono} /> {t(s.clave ?? `despacho.tab.${s.id}`, s.labelEs)}
        </button>
      ))}
    </div>
  )
}
