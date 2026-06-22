import { useState } from 'react'
import { juegosMesaRepo, mediaArchivoRepo } from '../../core/data/repository'
import { ArchivoTab } from './ArchivoTab'
import { JuegosMesaTab } from './JuegosMesaTab'
import { ResumenTab } from './ResumenTab'
import { COLOR } from './constantes'
import { useT } from '../../core/i18n/useT'

type Tab = 'archivo' | 'mesa' | 'resumen'

const TABS: { id: Tab; labelEs: string }[] = [
  { id: 'archivo', labelEs: '📺 Archivo' },
  { id: 'mesa', labelEs: '🎲 Juegos de mesa' },
  { id: 'resumen', labelEs: '📊 Resumen' },
]

export function EntretenimientoApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('archivo')
  const media = mediaArchivoRepo.useAll() ?? []
  const juegos = juegosMesaRepo.useAll() ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        {t('entre.desc', 'Películas, series, libros, videojuegos y tu ludoteca de juegos de mesa — todo en la sala de entretenimiento. Tus datos del archivo anterior se conservan aquí.')}
      </p>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === tabItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === tabItem.id ? { background: COLOR } : undefined}
          >
            {t(`entre.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'archivo' && <ArchivoTab items={media} />}
      {tab === 'mesa' && <JuegosMesaTab juegos={juegos} />}
      {tab === 'resumen' && <ResumenTab media={media} juegos={juegos} />}
    </div>
  )
}
