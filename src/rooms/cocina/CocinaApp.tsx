import { useEffect, useState } from 'react'
import { VACIO,
  aguaRepo,
  comidasRepo,
  dietasGuardadasRepo,
  itemsCompraRepo,
  listasCompraRepo,
  pesoRepo,
  planComidasRepo,
  recetasRepo,
} from '../../core/data/repository'
import { ComprasTab } from './ComprasTab'
import { DiarioTab } from './DiarioTab'
import { DietasTab } from './DietasTab'
import { MetasTab } from './MetasTab'
import { PlanSemanal } from './PlanSemanal'
import { ProgresoTab } from './ProgresoTab'
import { RecetasTab } from './RecetasTab'
import { hoyISO, nombreFecha, sumarDias } from './fecha'
import { perfilEfectivo, usePerfil } from './usePerfil'
import { sembrarCocina } from './seed'
import { claveLS } from '../../core/edicion'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

// 'plan' ya es la Dieta desde antes; 'diario' es el Registro (ese id lo
// guardan las rutinas de los horarios de comida y no puede cambiar).
type Tab = 'metas' | 'diario' | 'planComidas' | 'progreso' | 'plan' | 'recetas' | 'compras'
type Enfoque = 'peso' | 'recetario'

const TABS: Record<Tab, { icono: NombreIcono; labelEs: string }> = {
  metas: { icono: 'objetivo', labelEs: 'Metas' },
  diario: { icono: 'tab-diario', labelEs: 'Registro' },
  planComidas: { icono: 'calendario', labelEs: 'Plan de comidas' },
  progreso: { icono: 'progreso', labelEs: 'Progreso' },
  recetas: { icono: 'tab-recetas', labelEs: 'Recetas' },
  plan: { icono: 'calendario', labelEs: 'Dieta' },
  compras: { icono: 'tab-compras', labelEs: 'Compras' },
}

/**
 * Los dos motivos por los que se entra a la cocina. Los ids de pestaña NO
 * cambian aunque cambie la etiqueta: `rutinas.seccion` los guarda al agendar un
 * horario de comida y el calendario abre la app con ese string. El enfoque de
 * alimentación es un flujo de 4 pasos: metas → registro → plan de comidas →
 * progreso. Registro es lo que ya pasó (comidas, agua, peso); Plan de comidas
 * es lo que viene (la rejilla semanal).
 */
const ENFOQUES: { id: Enfoque; icono: NombreIcono; labelEs: string; tabs: Tab[] }[] = [
  // El recetario va primero: manda el plan y de ahí salen las recetas y la compra.
  { id: 'recetario', icono: 'tab-recetas', labelEs: 'Recetario', tabs: ['plan', 'recetas', 'compras'] },
  {
    id: 'peso',
    icono: 'balanza',
    labelEs: 'Control de alimentación',
    tabs: ['metas', 'diario', 'planComidas', 'progreso'],
  },
]

const TODAS = ENFOQUES.flatMap((e) => e.tabs)
const CLAVE_ENFOQUE = claveLS('mh.cocina.enfoque')

const enfoqueDe = (tab: Tab): Enfoque => ENFOQUES.find((e) => e.tabs.includes(tab))!.id

/**
 * Pestañas que navegan por fecha (muestran la barra ‹ hoy ›). El plan de comidas
 * NO está: tiene su propio navegador de calendario (día/3 días/semana/mes) y dos
 * cursores de fecha en la misma pantalla solo confundirían.
 */
const TABS_CON_FECHA: Tab[] = ['diario']

/** Manda la intención del chat; si no la hay, el último enfoque que usaste. */
function tabDeArranque(): Tab {
  const seccion = intencionApp('cocina')?.seccion
  // Compat: la pestaña 'cronograma' vive ahora dentro de Metas.
  if (seccion === 'cronograma') return 'metas'
  if (seccion && TODAS.includes(seccion as Tab)) return seccion as Tab
  const guardado = localStorage.getItem(CLAVE_ENFOQUE)
  // El fallback sigue al primer enfoque: si mañana cambia el orden, no hay que tocar esto.
  return ENFOQUES.find((e) => e.id === guardado)?.tabs[0] ?? ENFOQUES[0].tabs[0]
}

export function CocinaApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(tabDeArranque)
  const [fecha, setFecha] = useState(hoyISO())
  const enfoque = enfoqueDe(tab)

  const perfilRaw = usePerfil()
  const perfil = perfilEfectivo(perfilRaw)
  const comidas = comidasRepo.useAll() ?? VACIO
  const agua = aguaRepo.useAll() ?? VACIO
  const recetas = recetasRepo.useAll() ?? VACIO
  const dietas = dietasGuardadasRepo.useAll() ?? VACIO
  const itemsCompra = itemsCompraRepo.useAll() ?? VACIO
  const listasCompra = listasCompraRepo.useAll() ?? VACIO
  const pesos = pesoRepo.useAll() ?? VACIO
  const plan = planComidasRepo.useAll() ?? VACIO

  const aguaDia = agua.filter((a) => a.fecha === fecha).reduce((s, a) => s + a.ml, 0)

  useEffect(() => {
    void sembrarCocina()
  }, [])

  const cambiarEnfoque = (e: (typeof ENFOQUES)[number]) => {
    localStorage.setItem(CLAVE_ENFOQUE, e.id)
    setTab(e.tabs[0])
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {ENFOQUES.map((e) => (
          <button
            key={e.id}
            data-tut={`cocina.enfoque.${e.id}`}
            onClick={() => cambiarEnfoque(e)}
            className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
              enfoque === e.id ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <Icono nombre={e.icono} /> {t(`cocina.enfoque.${e.id}`, e.labelEs)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {ENFOQUES.find((e) => e.id === enfoque)!.tabs.map((id, i) => (
          <button
            key={id}
            data-tut={`cocina.tab.${id}`}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition ${
              tab === id ? 'bg-white/15' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {/* En el control de alimentación las pestañas son pasos: se numeran. */}
            {enfoque === 'peso' && <span className="mr-1 text-xs text-white/40">{i + 1} ·</span>}
            <Icono nombre={TABS[id].icono} /> {t(`cocina.tab.${id}`, TABS[id].labelEs)}
          </button>
        ))}
      </div>

      {TABS_CON_FECHA.includes(tab) && (
        <div data-tut="cocina.fecha" className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10">
          <button
            type="button"
            onClick={() => setFecha((f) => sumarDias(f, -1))}
            className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
          >
            ‹
          </button>
          <div className="text-center">
            <span className="font-semibold capitalize">{nombreFecha(fecha)}</span>
            {fecha !== hoyISO() && (
              <button
                type="button"
                onClick={() => setFecha(hoyISO())}
                className="block mx-auto text-[10px] text-amber-400 hover:underline"
              >
                {t('nav.irHoy', 'Ir a hoy')}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFecha((f) => sumarDias(f, 1))}
            className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
          >
            ›
          </button>
        </div>
      )}

      {tab === 'metas' && <MetasTab perfil={perfilRaw} />}
      {tab === 'diario' && (
        <DiarioTab
          fecha={fecha}
          comidas={comidas}
          recetas={recetas}
          aguaMl={aguaDia}
          pesos={pesos}
          perfil={perfil}
        />
      )}
      {tab === 'planComidas' && (
        <PlanSemanal recetas={recetas} dietas={dietas} plan={plan} comidas={comidas} perfil={perfil} />
      )}
      {tab === 'progreso' && (
        <ProgresoTab
          comidas={comidas}
          agua={agua}
          pesos={pesos}
          perfil={perfil}
          perfilRaw={perfilRaw}
          onIrAMetas={() => setTab('metas')}
        />
      )}
      {tab === 'plan' && <DietasTab dietas={dietas} recetas={recetas} />}
      {tab === 'recetas' && <RecetasTab recetas={recetas} dietas={dietas} />}
      {tab === 'compras' && <ComprasTab items={itemsCompra} listas={listasCompra} />}
    </div>
  )
}
