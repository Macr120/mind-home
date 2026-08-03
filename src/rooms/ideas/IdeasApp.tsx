import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { lanzarIntencionApp, tabInicial } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { COLOR } from './constantes'
import { DiarioTab } from './DiarioTab'
import { MapasTab } from './MapasTab'

/**
 * Ideas en tres tiempos: el DIARIO captura (ideas sueltas y lluvias), los MAPAS
 * ordenan un tema en un lienzo libre y los DIAGRAMAS ayudan a decidir. Sin ancho
 * máximo ni scroll propio: el lienzo ocupa todo el cuarto y cada pestaña centra
 * su propio contenido.
 */

type Tab = 'diario' | 'mapas' | 'diagramas'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'diario', icono: 'cuaderno', labelEs: 'Diario de ideas' },
  { id: 'mapas', icono: 'nodos', labelEs: 'Mapas conceptuales' },
  { id: 'diagramas', icono: 'balanza', labelEs: 'Diagramas de decisiones' },
]

export function IdeasApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() =>
    tabInicial(
      'ideas',
      TABS.map((x) => x.id),
      'diario',
    ),
  )

  /** Salta al mapa recién hecho desde una lluvia (mismo canal que usa el chat). */
  const abrirMapa = (mapaId: number) => {
    lanzarIntencionApp({ appId: 'ideas', seccion: 'mapas', dato: String(mapaId) })
    setTab('mapas')
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="mx-auto flex w-full max-w-2xl shrink-0 gap-2">
        {TABS.map((x) => (
          <button
            key={x.id}
            data-tut={`ideas.tab.${x.id}`}
            onClick={() => setTab(x.id)}
            // Los tres nombres son largos a propósito (los eligió el usuario):
            // texto chico y con dos renglones antes que recortarlos.
            className={`flex-1 rounded-xl px-1 py-2 text-[11px] font-semibold leading-tight transition ${
              tab === x.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === x.id ? { background: COLOR } : undefined}
          >
            <Icono nombre={x.icono} /> {t(`ideas.tab.${x.id}`, x.labelEs)}
          </button>
        ))}
      </div>

      {tab === 'diario' ? (
        <DiarioTab onAbrirMapa={abrirMapa} />
      ) : (
        <MapasTab key={tab} familia={tab} />
      )}
    </div>
  )
}
