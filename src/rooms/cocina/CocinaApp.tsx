import { useEffect, useState } from 'react'
import {
  aguaRepo,
  comidasRepo,
  favoritosRepo,
  planComidasRepo,
} from '../../core/data/repository'
import { DiarioTab } from './DiarioTab'
import { MetasTab } from './MetasTab'
import { PlanTab, semanaDesdeHoy } from './PlanTab'
import { ResumenTab } from './ResumenTab'
import { hoyISO, nombreFecha, sumarDias } from './fecha'
import { perfilEfectivo, usePerfil } from './usePerfil'
import { sembrarCocina } from './seed'

type Tab = 'resumen' | 'diario' | 'plan' | 'metas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: '📊 Resumen' },
  { id: 'diario', label: '📝 Diario' },
  { id: 'plan', label: '📅 Plan' },
  { id: 'metas', label: '⚙️ Metas' },
]

export function CocinaApp() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [fecha, setFecha] = useState(hoyISO())
  const [semana, setSemana] = useState(semanaDesdeHoy())

  const perfilRaw = usePerfil()
  const perfil = perfilEfectivo(perfilRaw)
  const comidas = comidasRepo.useAll() ?? []
  const agua = aguaRepo.useAll() ?? []
  const planes = planComidasRepo.useAll() ?? []
  const favoritos = favoritosRepo.useAll() ?? []

  const aguaDia = agua.filter((a) => a.fecha === fecha).reduce((s, a) => s + a.ml, 0)

  useEffect(() => {
    void sembrarCocina()
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'bg-amber-400 text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
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
                className="block mx-auto text-[10px] text-amber-400 hover:underline"
              >
                Ir a hoy
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

      {tab === 'plan' && (
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10 text-sm">
          <button
            type="button"
            onClick={() => setSemana((s) => sumarDias(s, -7))}
            className="rounded-lg px-2 hover:bg-white/10"
          >
            ‹ Sem
          </button>
          <span className="text-white/60">Semana del {semana.slice(8)}/{semana.slice(5, 7)}</span>
          <button
            type="button"
            onClick={() => setSemana((s) => sumarDias(s, 7))}
            className="rounded-lg px-2 hover:bg-white/10"
          >
            Sem ›
          </button>
        </div>
      )}

      {tab === 'resumen' && (
        <ResumenTab fecha={fecha} comidas={comidas} agua={agua} perfil={perfil} />
      )}
      {tab === 'diario' && (
        <DiarioTab
          fecha={fecha}
          comidas={comidas}
          aguaMl={aguaDia}
          aguaObjetivo={perfil.aguaMl}
          favoritos={favoritos}
        />
      )}
      {tab === 'plan' && (
        <PlanTab semanaInicio={semana} planes={planes} favoritos={favoritos} />
      )}
      {tab === 'metas' && (
        <MetasTab perfil={perfilRaw} favoritos={favoritos} />
      )}
    </div>
  )
}
