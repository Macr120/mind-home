import { useState } from 'react'
import { VACIO, mediaArchivoRepo } from '../../core/data/repository'
import { ArchivoTab } from './ArchivoTab'
import { JuegosMesaTab } from './JuegosMesaTab'
import { ProgramasSection } from './ProgramasSection'
import { COLOR } from './constantes'
import type { IdJuegoReal } from './juegos/catalogo'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

type Tab = 'archivo' | 'mesa' | 'programas'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'mesa', icono: 'dados', labelEs: 'Juegos de mesa' },
  { id: 'archivo', icono: 'serie', labelEs: 'Archivo' },
  { id: 'programas', icono: 'calendario', labelEs: 'Programas' },
]

export function EntretenimientoApp() {
  const t = useT()
  // Intención del chat («quiero jugar la viborita»): pestaña + juego inicial.
  // Se limpia al cambiar de pestaña a mano para no reabrir el juego.
  const [intencion, setIntencion] = useState(() => intencionApp('entretenimiento'))
  const [tab, setTab] = useState<Tab>(() => {
    const s = intencion?.seccion
    return s === 'archivo' || s === 'programas' ? s : 'mesa'
  })
  const media = mediaArchivoRepo.useAll() ?? VACIO

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        {t('entre.desc', 'Películas, series, libros, videojuegos y juegos de mesa para jugar — todo en la sala de entretenimiento. Tus datos del archivo anterior se conservan aquí.')}
      </p>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            data-tut={`entretenimiento.tab.${tabItem.id}`}
            onClick={() => {
              setTab(tabItem.id)
              setIntencion(null)
            }}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === tabItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === tabItem.id ? { background: COLOR } : undefined}
          >
            <Icono nombre={tabItem.icono} /> {t(`entre.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'archivo' && <ArchivoTab items={media} />}
      {tab === 'mesa' && <JuegosMesaTab juegoInicial={intencion?.dato as IdJuegoReal | undefined} />}
      {tab === 'programas' && <ProgramasSection />}
    </div>
  )
}
