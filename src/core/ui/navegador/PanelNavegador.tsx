import { PestanasCarpeta } from '../../../rooms/_shared/PestanasCarpeta'
import type { PestanaNav } from '../../navegador/ordenes'
import { TabHistorial } from './TabHistorial'
import { TabSitios } from './TabSitios'
import { TabTiempo } from './TabTiempo'
import { abrirDesdePanel } from './util'

/** Pestañas del menú «Tu navegador»; los ajustes van en el ⚙ de la barra del chat (`TabAjustes`). */
export type PestanaPanelNav = Exclude<PestanaNav, 'ajustes'>

/**
 * Menú «Tu navegador» del chat: historial por página, sitios con su categoría y
 * favoritos, y tiempo por categoría/sitio/hora. Se abre desde la barra del
 * menú del chat, desde ⋮ de la tira del navegador y con las órdenes
 * «historial», «sitios», «tiempo en internet»…
 */
export function PanelNavegador({
  pestana,
  onPestana,
  onCerrar,
}: {
  pestana: PestanaPanelNav
  onPestana: (p: PestanaPanelNav) => void
  /** Al abrir una página desde el panel se cierra el menú para que se vea. */
  onCerrar: () => void
}) {
  const abrir = (url: string) => {
    void abrirDesdePanel(url)
    onCerrar()
  }
  return (
    <div data-tut="nav.panel" className="flex min-h-0 flex-1 flex-col">
      <PestanasCarpeta
        variante="sub"
        flecha={false}
        prefijoClave="nav.panel"
        items={[
          { id: 'historial', icono: 'lista', labelEs: 'Historial' },
          { id: 'sitios', icono: 'etiqueta', labelEs: 'Sitios' },
          { id: 'tiempo', icono: 'grafica', labelEs: 'Tiempo' },
        ]}
        activo={pestana}
        onCambio={onPestana}
      />
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-0.5">
        {pestana === 'historial' && <TabHistorial onAbrir={abrir} />}
        {pestana === 'sitios' && <TabSitios onAbrir={abrir} />}
        {pestana === 'tiempo' && <TabTiempo onAbrir={abrir} />}
      </div>
    </div>
  )
}
