import { useState } from 'react'
import { progresoTemaRepo } from '../../core/data/repository'
import { IndiceTab } from './IndiceTab'
import { ResumenTab } from './ResumenTab'
import { COLOR } from './constantes'
import { contarIndice } from './pilares'

type Tab = 'indice' | 'resumen'

const TABS: { id: Tab; label: string }[] = [
  { id: 'indice', label: '📚 Índice temático' },
  { id: 'resumen', label: '📊 Estadísticas' },
]

export function BibliotecaApp() {
  const [tab, setTab] = useState<Tab>('indice')
  const progreso = progresoTemaRepo.useAll() ?? []
  const indice = contarIndice()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        Enciclopedia Mind Home: explora los pilares del conocimiento humano. Marca temas a medida
        que los estudies — {indice.pilares} pilares, {indice.temas} entradas en el índice.
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

      {tab === 'indice' && <IndiceTab progreso={progreso} />}
      {tab === 'resumen' && <ResumenTab progreso={progreso} />}
    </div>
  )
}
