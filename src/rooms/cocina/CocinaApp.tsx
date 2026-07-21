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
import { MetasTab } from './MetasTab'
import { RecetasTab } from './RecetasTab'
import { ResumenTab } from './ResumenTab'
import { hoyISO, nombreFecha, sumarDias } from './fecha'
import { perfilEfectivo, usePerfil } from './usePerfil'
import { sembrarCocina } from './seed'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { CronogramaApp } from '../../core/ui/metas/CronogramaApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

// 'plan' ya es la Dieta desde antes: el cronograma no puede llamarse así.
type Tab = 'metas' | 'diario' | 'plan' | 'cronograma' | 'recetas' | 'compras'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'metas', icono: 'progreso', labelEs: 'Metas' },
  { id: 'diario', icono: 'tab-diario', labelEs: 'Comidas' },
  { id: 'plan', icono: 'calendario', labelEs: 'Dieta' },
  { id: 'cronograma', icono: 'objetivo', labelEs: 'Cronograma' },
  { id: 'recetas', icono: 'tab-recetas', labelEs: 'Recetas' },
  { id: 'compras', icono: 'tab-compras', labelEs: 'Compras' },
]

/** Pestañas que navegan por fecha (muestran la barra ‹ hoy ›). */
const TABS_CON_FECHA: Tab[] = ['metas', 'diario']

export function CocinaApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('cocina', TABS.map((x) => x.id), 'metas'))
  const [fecha, setFecha] = useState(hoyISO())

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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            data-tut={`cocina.tab.${tabItem.id}`}
            onClick={() => setTab(tabItem.id)}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'bg-amber-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <Icono nombre={tabItem.icono} /> {t(`cocina.tab.${tabItem.id}`, tabItem.labelEs)}
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
        <div className="space-y-6">
          <ResumenTab fecha={fecha} comidas={comidas} agua={agua} perfil={perfil} pesos={pesos} />
          <MetasTab perfil={perfilRaw} />
        </div>
      )}
      {tab === 'diario' && (
        <DiarioTab
          fecha={fecha}
          comidas={comidas}
          aguaMl={aguaDia}
          aguaObjetivo={perfil.aguaMl}
        />
      )}
      {tab === 'plan' && <DietasTab dietas={dietas} recetas={recetas} />}
      {tab === 'cronograma' && <CronogramaApp plantillaId="cocina" />}
      {tab === 'recetas' && <RecetasTab recetas={recetas} />}
      {tab === 'compras' && <ComprasTab items={itemsCompra} listas={listasCompra} />}
    </div>
  )
}
