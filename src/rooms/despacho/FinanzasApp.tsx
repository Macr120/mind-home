import { useState } from 'react'
import { VACIO, finanzasRepo } from '../../core/data/repository'
import { BalanceTab } from './BalanceTab'
import { MovimientosTab } from './MovimientosTab'
import { MetasTab, type TipoMeta, type VistaMeta } from './MetasTab'
import { MercadosTab, type SeccionMercado } from './MercadosTab'
import { PatrimonioTab, type VistaPatrimonio } from './PatrimonioTab'
import { PERIODOS, etiquetaPeriodo, hoyISO, sumarPeriodo, type Periodo } from './mes'
import type { FocoFinanzas } from './foco'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { AZUL, ROJO, VERDE } from './ui'

type Tab = 'balance' | 'patrimonio' | 'metas' | 'mercados'
type SubBalance = 'gastos' | 'ingresos' | 'balance'
// Con cuatro pestañas el texto es lo primero que sobra en un teléfono: van a
// `text-xs` y sin icono para que ninguna se corte a 360 px.
const TABS: ItemPestana<Tab>[] = [
  { id: 'patrimonio', icono: 'casa', labelEs: 'Patrimonio' },
  { id: 'balance', icono: 'balanza', labelEs: 'Flujo' },
  { id: 'metas', icono: 'objetivo', labelEs: 'Metas' },
  { id: 'mercados', icono: 'progreso', labelEs: 'Mercados' },
]

// Verde/rojo direccionales: lo que sube (activos, ingresos) y lo que baja
// (pasivos, gastos) se marcan con el mismo par de colores que sus cifras.
const SUBS_PATRIMONIO: ItemPestana<VistaPatrimonio>[] = [
  { id: 'activos', icono: 'subir', labelEs: 'Activos', color: VERDE },
  { id: 'pasivos', icono: 'bajar', labelEs: 'Pasivos', color: ROJO },
  { id: 'simulacion', icono: 'grafica', labelEs: 'Simulación' },
]

const SUBS_BALANCE: ItemPestana<SubBalance>[] = [
  { id: 'gastos', icono: 'bajar', labelEs: 'Gastos', color: ROJO },
  { id: 'ingresos', icono: 'subir', labelEs: 'Ingresos', color: VERDE },
  { id: 'balance', icono: 'balanza', labelEs: 'Balance', clave: 'despacho.sub.balance' },
]

const PERIODO_ES: Record<Periodo, string> = {
  dia: 'Día',
  semana: 'Semana',
  mes: 'Mes',
  anio: 'Año',
}

const ITEMS_PERIODO: ItemPestana<Periodo>[] = PERIODOS.map((p) => ({ id: p, labelEs: PERIODO_ES[p] }))

const SUBS_METAS: ItemPestana<VistaMeta>[] = [
  { id: 'financieras', icono: 'calculadora', labelEs: 'Financieras' },
  { id: 'ahorroInversion', icono: 'moneda', labelEs: 'Ahorro/Inversión' },
  { id: 'deuda', icono: 'tarjeta', labelEs: 'Deuda' },
]

const SUBS_MERCADOS: ItemPestana<SeccionMercado>[] = [
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
    patrimonio: 'activos' as VistaPatrimonio,
    metas: 'ahorroInversion' as VistaMeta,
    mercados: 'divisas' as SeccionMercado,
  }
  switch (s) {
    case 'patrimonio':
    case 'activos':
      return { ...d, tab: 'patrimonio' as const }
    case 'pasivos':
      return { ...d, tab: 'patrimonio' as const, patrimonio: 'pasivos' as const }
    // En singular: `simuladores` (en plural, más abajo) es el de crédito e
    // interés compuesto, que vive en Metas y no tiene nada que ver con este.
    case 'simulacion':
      return { ...d, tab: 'patrimonio' as const, patrimonio: 'simulacion' as const }
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
  const [plegado, setPlegado] = useState(false)
  const [subBalance, setSubBalance] = useState<SubBalance>(ini.balance)
  const [subPatrimonio, setSubPatrimonio] = useState<VistaPatrimonio>(ini.patrimonio)
  const [subMetas, setSubMetas] = useState<VistaMeta>(ini.metas)
  const [subMercados, setSubMercados] = useState<SeccionMercado>(ini.mercados)
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [ancla, setAncla] = useState(hoyISO())
  const [foco, setFoco] = useState<FocoFinanzas | null>(null)
  const movimientos = finanzasRepo.useAll() ?? VACIO
  const tipoBalance: 'gasto' | 'ingreso' = subBalance === 'ingresos' ? 'ingreso' : 'gasto'

  // La naturaleza de la fila decide el submenú de Patrimonio; el tipo de la
  // meta, el de Metas. Así los cuatro saltos posibles usan un solo foco.
  const irAFila = (id: number, naturaleza: 'activo' | 'pasivo') => {
    setPlegado(false)
    setTab('patrimonio')
    setSubPatrimonio(naturaleza === 'pasivo' ? 'pasivos' : 'activos')
    setFoco({ tipo: 'patrimonio', id })
  }
  const irAMeta = (id: number, tipoMeta: TipoMeta) => {
    setPlegado(false)
    setTab('metas')
    setSubMetas(tipoMeta === 'deuda' ? 'deuda' : 'ahorroInversion')
    setFoco({ tipo: 'meta', id })
  }
  const focoUsado = () => setFoco(null)

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PestanasCarpeta
        items={TABS}
        activo={tab}
        onCambio={setTab}
        prefijoClave="despacho.tab"
        color={AZUL}
        variante="raiz"
        plegado={plegado}
        onAlternarPliegue={() => setPlegado((v) => !v)}
      />

      {!plegado && (
        <>
          {tab === 'balance' && <SubTabs items={SUBS_BALANCE} activo={subBalance} onCambio={setSubBalance} />}
          {tab === 'patrimonio' && (
            <SubTabs items={SUBS_PATRIMONIO} activo={subPatrimonio} onCambio={setSubPatrimonio} />
          )}
          {tab === 'metas' && <SubTabs items={SUBS_METAS} activo={subMetas} onCambio={setSubMetas} />}
          {tab === 'mercados' && <SubTabs items={SUBS_MERCADOS} activo={subMercados} onCambio={setSubMercados} />}

          {/* Gastos/Ingresos no navegan por fecha: su historial son carpetas año › mes › semana. */}
          {tab === 'balance' && subBalance === 'balance' && (
            <div data-tut="despacho.periodo" className="space-y-2">
              <PestanasCarpeta
                items={ITEMS_PERIODO}
                activo={periodo}
                onCambio={setPeriodo}
                prefijoClave="despacho.periodo"
                color={AZUL}
                variante="sub"
                nivel={3}
              />
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10">
                <button
                  onClick={() => setAncla((a) => sumarPeriodo(a, periodo, -1))}
                  aria-label={t('despacho.periodo.anterior', 'Periodo anterior')}
                  className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
                >
                  <Icono nombre="volver" />
                </button>
                <span className="font-semibold">{etiquetaPeriodo(ancla, periodo)}</span>
                <button
                  onClick={() => setAncla((a) => sumarPeriodo(a, periodo, 1))}
                  aria-label={t('despacho.periodo.siguiente', 'Periodo siguiente')}
                  className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
                >
                  <Icono nombre="siguiente" />
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

          {tab === 'patrimonio' && (
            <PatrimonioTab vista={subPatrimonio} foco={foco} onFocoUsado={focoUsado} onIrAMeta={irAMeta} />
          )}
          {tab === 'metas' && (
            <MetasTab vista={subMetas} foco={foco} onFocoUsado={focoUsado} onIrAFila={irAFila} />
          )}
          {tab === 'mercados' && <MercadosTab seccion={subMercados} />}
        </>
      )}
    </div>
  )
}

/** Ramas del árbol: la subfila compartida con los prefijos del despacho ya puestos. */
function SubTabs<T extends string>({
  items,
  activo,
  onCambio,
}: {
  items: ItemPestana<T>[]
  activo: T
  onCambio: (id: T) => void
}) {
  return (
    <PestanasCarpeta
      items={items}
      activo={activo}
      onCambio={onCambio}
      prefijoClave="despacho.tab"
      prefijoTut="despacho.sub"
      color={AZUL}
      variante="sub"
    />
  )
}
