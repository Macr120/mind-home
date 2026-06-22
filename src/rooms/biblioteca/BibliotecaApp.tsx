import { useState } from 'react'
import { progresoTemaRepo } from '../../core/data/repository'
import { IndiceTab } from './IndiceTab'
import { ResumenTab } from './ResumenTab'
import { COLOR } from './constantes'
import { contarIndice } from './pilares'
import { useT } from '../../core/i18n/useT'

type Tab = 'indice' | 'resumen'

const TABS: { id: Tab; labelEs: string }[] = [
  { id: 'indice', labelEs: '📚 Índice temático' },
  { id: 'resumen', labelEs: '📊 Estadísticas' },
]

export function BibliotecaApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('indice')
  const progreso = progresoTemaRepo.useAll() ?? []
  const indice = contarIndice()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        {t('biblioteca.desc', `Enciclopedia Mind Home: explora los pilares del conocimiento humano. Marca temas a medida que los estudies — ${indice.pilares} pilares, ${indice.temas} entradas en el índice.`, { pilares: String(indice.pilares), temas: String(indice.temas) })}
      </p>

      <div className="flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === tabItem.id ? { background: COLOR } : undefined}
          >
            {t(`biblioteca.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'indice' && <IndiceTab progreso={progreso} />}
      {tab === 'resumen' && <ResumenTab progreso={progreso} />}
    </div>
  )
}
