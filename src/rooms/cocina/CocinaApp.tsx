import { useEffect, useState } from 'react'
import {
  aguaRepo,
  comidasRepo,
  dietasGuardadasRepo,
  itemsCompraRepo,
  listasCompraRepo,
  pesoRepo,
  recetasRepo,
} from '../../core/data/repository'
import { ComprasTab } from './ComprasTab'
import { DiarioTab } from './DiarioTab'
import { DietasTab } from './DietasTab'
import { ProgresoTab } from './ProgresoTab'
import { RecetasTab } from './RecetasTab'
import { hoyISO, nombreFecha, sumarDias } from './fecha'
import { perfilEfectivo, usePerfil } from './usePerfil'
import { sembrarCocina } from './seed'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

// 'plan' ya es la Dieta desde antes: el cronograma no puede llamarse así.
type Tab = 'metas' | 'diario' | 'plan' | 'cronograma' | 'recetas' | 'compras'
type Enfoque = 'peso' | 'recetario'

const TABS: Record<Tab, { icono: NombreIcono; labelEs: string }> = {
  metas: { icono: 'progreso', labelEs: 'Progreso' },
  diario: { icono: 'tab-diario', labelEs: 'Comidas' },
  cronograma: { icono: 'objetivo', labelEs: 'Cronograma' },
  recetas: { icono: 'tab-recetas', labelEs: 'Recetas' },
  plan: { icono: 'calendario', labelEs: 'Dieta' },
  compras: { icono: 'tab-compras', labelEs: 'Compras' },
}

/**
 * Los dos motivos por los que se entra a la cocina. Los ids de pestaña NO
 * cambian aunque cambie la etiqueta: `rutinas.seccion` los guarda al agendar un
 * horario de comida y el calendario abre la app con ese string.
 */
const ENFOQUES: { id: Enfoque; icono: NombreIcono; labelEs: string; tabs: Tab[] }[] = [
  { id: 'peso', icono: 'balanza', labelEs: 'Control de peso', tabs: ['metas', 'diario', 'cronograma'] },
  { id: 'recetario', icono: 'tab-recetas', labelEs: 'Recetario', tabs: ['recetas', 'plan', 'compras'] },
]

const TODAS = ENFOQUES.flatMap((e) => e.tabs)
const CLAVE_ENFOQUE = 'mh.cocina.enfoque'

const enfoqueDe = (tab: Tab): Enfoque => ENFOQUES.find((e) => e.tabs.includes(tab))!.id

/** Pestañas que navegan por fecha (muestran la barra ‹ hoy ›). */
const TABS_CON_FECHA: Tab[] = ['diario']

/** Manda la intención del chat; si no la hay, el último enfoque que usaste. */
function tabDeArranque(): Tab {
  const seccion = intencionApp('cocina')?.seccion
  if (seccion && TODAS.includes(seccion as Tab)) return seccion as Tab
  const guardado = localStorage.getItem(CLAVE_ENFOQUE)
  return ENFOQUES.find((e) => e.id === guardado)?.tabs[0] ?? 'metas'
}

export function CocinaApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(tabDeArranque)
  const [fecha, setFecha] = useState(hoyISO())
  const enfoque = enfoqueDe(tab)

  const perfilRaw = usePerfil()
  const perfil = perfilEfectivo(perfilRaw)
  const comidas = comidasRepo.useAll() ?? []
  const agua = aguaRepo.useAll() ?? []
  const recetas = recetasRepo.useAll() ?? []
  const dietas = dietasGuardadasRepo.useAll() ?? []
  const itemsCompra = itemsCompraRepo.useAll() ?? []
  const listasCompra = listasCompraRepo.useAll() ?? []
  const pesos = pesoRepo.useAll() ?? []

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
        {ENFOQUES.find((e) => e.id === enfoque)!.tabs.map((id) => (
          <button
            key={id}
            data-tut={`cocina.tab.${id}`}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition ${
              tab === id ? 'bg-white/15' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
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

      {tab === 'metas' && (
        <ProgresoTab
          fecha={fecha}
          comidas={comidas}
          aguaMl={aguaDia}
          perfil={perfil}
          perfilRaw={perfilRaw}
          pesos={pesos}
        />
      )}
      {tab === 'diario' && (
        <DiarioTab
          fecha={fecha}
          comidas={comidas}
          recetas={recetas}
          aguaMl={aguaDia}
          perfil={perfil}
        />
      )}
      {tab === 'plan' && <DietasTab dietas={dietas} recetas={recetas} />}
      {tab === 'cronograma' && <CronogramaApp plantillaId="cocina" />}
      {tab === 'recetas' && <RecetasTab recetas={recetas} />}
      {tab === 'compras' && <ComprasTab items={itemsCompra} listas={listasCompra} />}
    </div>
  )
}
