import { useEffect, useState } from 'react'
import { noticiasRepo } from '../../core/data/repository'
import { CentralTab } from './CentralTab'
import { ResumenTab } from './ResumenTab'
import { COLOR } from './constantes'
import { sembrarDiario } from './seed'

type Tab = 'central' | 'resumen'

const TABS: { id: Tab; label: string }[] = [
  { id: 'central', label: '📰 Central' },
  { id: 'resumen', label: '📊 Resumen' },
]

export function DiarioApp() {
  const [tab, setTab] = useState<Tab>('central')
  const noticias = noticiasRepo.useAll() ?? []

  useEffect(() => {
    void sembrarDiario()
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        Tu central de noticias personal: guarda titulares por fecha, filtra por categoría y
        marca lo que ya leíste — como un recorte de prensa digital.
      </p>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === t.id ? { background: COLOR } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'central' && <CentralTab noticias={noticias} />}
      {tab === 'resumen' && <ResumenTab noticias={noticias} />}
    </div>
  )
}
