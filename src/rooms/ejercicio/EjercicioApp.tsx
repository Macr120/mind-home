import { useEffect, useState } from 'react'
import {
  sesionesEjercicioRepo,
  seriesFuerzaRepo,
} from '../../core/data/repository'
import { FlexibilidadTab } from './FlexibilidadTab'
import { FuerzaTab } from './FuerzaTab'
import { MetasTab } from './MetasTab'
import { ResistenciaTab } from './ResistenciaTab'
import { ResumenTab } from './ResumenTab'
import { hoyISO, nombreFecha, sumarDias } from './fecha'
import { perfilEfectivo, usePerfilEjercicio } from './usePerfil'
import { sembrarEjercicio } from './seed'
import { useT } from '../../core/i18n/useT'

type Tab = 'resumen' | 'fuerza' | 'resistencia' | 'flexibilidad' | 'metas'

const TABS: { id: Tab; labelEs: string }[] = [
  { id: 'resumen', labelEs: '📊 Resumen' },
  { id: 'fuerza', labelEs: '🏋️ Fuerza' },
  { id: 'resistencia', labelEs: '🏃 Resistencia' },
  { id: 'flexibilidad', labelEs: '🧘 Flexibilidad' },
  { id: 'metas', labelEs: '⚙️ Metas' },
]

export function EjercicioApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('resumen')
  const [fecha, setFecha] = useState(hoyISO())

  const perfilRaw = usePerfilEjercicio()
  const perfil = perfilEfectivo(perfilRaw)
  const sesiones = sesionesEjercicioRepo.useAll() ?? []
  const todasSeries = seriesFuerzaRepo.useAll() ?? []

  useEffect(() => {
    void sembrarEjercicio()
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'bg-rose-400 text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t(`ejercicio.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {tab !== 'metas' && (
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10">
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
                className="block mx-auto text-[10px] text-rose-400 hover:underline"
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

      {tab === 'resumen' && <ResumenTab sesiones={sesiones} perfil={perfil} />}
      {tab === 'fuerza' && (
        <FuerzaTab fecha={fecha} sesiones={sesiones} todasSeries={todasSeries} />
      )}
      {tab === 'resistencia' && (
        <ResistenciaTab
          fecha={fecha}
          sesiones={sesiones}
          metaMinutos={perfil.minutosResistenciaSemana}
        />
      )}
      {tab === 'flexibilidad' && (
        <FlexibilidadTab
          fecha={fecha}
          sesiones={sesiones}
          metaMinutos={perfil.minutosFlexibilidadSemana}
        />
      )}
      {tab === 'metas' && <MetasTab perfil={perfilRaw} />}
    </div>
  )
}
