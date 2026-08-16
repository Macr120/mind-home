import { useState } from 'react'
import { lanzarIntencionApp, tabInicial } from '../../core/state/intencionApp'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
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

// Los tres nombres son largos a propósito: los eligió el usuario, no recortarlos.
const TABS: ItemPestana<Tab>[] = [
  { id: 'diario', icono: 'cuaderno', labelEs: 'Diario de ideas' },
  { id: 'mapas', icono: 'nodos', labelEs: 'Mapas conceptuales' },
  { id: 'diagramas', icono: 'balanza', labelEs: 'Diagramas de decisiones' },
]

export function IdeasApp() {
  const [tab, setTab] = useState<Tab>(() =>
    tabInicial(
      'ideas',
      TABS.map((x) => x.id),
      'diario',
    ),
  )
  const [plegado, setPlegado] = useState(false)

  /** Salta al mapa recién hecho desde una lluvia (mismo canal que usa el chat). */
  const abrirMapa = (mapaId: number) => {
    lanzarIntencionApp({ appId: 'ideas', seccion: 'mapas', dato: String(mapaId) })
    setPlegado(false)
    setTab('mapas')
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="mx-auto w-full max-w-2xl shrink-0">
        <PestanasCarpeta
          items={TABS}
          activo={tab}
          onCambio={setTab}
          prefijoClave="ideas.tab"
          color={COLOR}
          variante="raiz"
          plegado={plegado}
          onAlternarPliegue={() => setPlegado((v) => !v)}
        />
      </div>

      {!plegado &&
        (tab === 'diario' ? <DiarioTab onAbrirMapa={abrirMapa} /> : <MapasTab key={tab} familia={tab} />)}
    </div>
  )
}
