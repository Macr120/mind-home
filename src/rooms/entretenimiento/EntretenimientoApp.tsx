import { useState } from 'react'
import { juegosMesaRepo, mediaArchivoRepo } from '../../core/data/repository'
import { ArchivoTab } from './ArchivoTab'
import { JuegosMesaTab } from './JuegosMesaTab'
import { ResumenTab } from './ResumenTab'
import { COLOR } from './constantes'

type Tab = 'archivo' | 'mesa' | 'resumen'

const TABS: { id: Tab; label: string }[] = [
  { id: 'archivo', label: '📺 Archivo' },
  { id: 'mesa', label: '🎲 Juegos de mesa' },
  { id: 'resumen', label: '📊 Resumen' },
]

export function EntretenimientoApp() {
  const [tab, setTab] = useState<Tab>('archivo')
  const media = mediaArchivoRepo.useAll() ?? []
  const juegos = juegosMesaRepo.useAll() ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        Películas, series, libros, videojuegos y tu ludoteca de juegos de mesa — todo en la sala
        de entretenimiento. Tus datos del archivo anterior se conservan aquí.
      </p>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === t.id ? { background: COLOR } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'archivo' && <ArchivoTab items={media} />}
      {tab === 'mesa' && <JuegosMesaTab juegos={juegos} />}
      {tab === 'resumen' && <ResumenTab media={media} juegos={juegos} />}
    </div>
  )
}
