import { PestanasCarpeta } from '../../../rooms/_shared/PestanasCarpeta'
import { useT } from '../../i18n/useT'
import type { PestanaNav } from '../../navegador/ordenes'
import { Icono } from '../iconos/Icono'
import { TabAjustes } from './TabAjustes'
import { TabHistorial } from './TabHistorial'
import { TabSitios } from './TabSitios'
import { TabTiempo } from './TabTiempo'
import { abrirDesdePanel } from './util'

/**
 * Panel «Navegador» del chat (como el Manual): historial por página, sitios
 * con su categoría y favoritos, tiempo por categoría/sitio/hora y ajustes. Se
 * abre desde la cabecera del menú del chat, desde ⋮ de la tira del navegador y
 * con las órdenes «historial», «sitios», «tiempo en internet»…
 */
export function PanelNavegador({
  pestana,
  onPestana,
  onCerrar,
}: {
  pestana: PestanaNav
  onPestana: (p: PestanaNav) => void
  onCerrar: () => void
}) {
  const t = useT()
  const abrir = (url: string) => {
    void abrirDesdePanel(url)
    onCerrar()
  }
  return (
    <div
      data-tut="nav.panel"
      className="ui-panel-glass mb-2 flex max-h-[60vh] flex-col rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md"
    >
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
        <span className="text-sm">
          <Icono nombre="mundo" />
        </span>
        <span className="flex-1 text-[11px] font-semibold text-white/50">
          {t('nav.panel.titulo', 'Navegador: historial, sitios y tiempo')}
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded px-2 py-0.5 text-sm text-white/40 transition hover:bg-white/10 hover:text-white/80"
          title={t('chat.conv.cerrar', 'Cerrar')}
        >
          ✕
        </button>
      </div>
      <PestanasCarpeta
        variante="sub"
        flecha={false}
        prefijoClave="nav.panel"
        items={[
          { id: 'historial', icono: 'lista', labelEs: 'Historial' },
          { id: 'sitios', icono: 'etiqueta', labelEs: 'Sitios' },
          { id: 'tiempo', icono: 'grafica', labelEs: 'Tiempo' },
          { id: 'ajustes', icono: 'ajustes', labelEs: 'Ajustes' },
        ]}
        activo={pestana}
        onCambio={onPestana}
      />
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-0.5">
        {pestana === 'historial' && <TabHistorial onAbrir={abrir} />}
        {pestana === 'sitios' && <TabSitios onAbrir={abrir} />}
        {pestana === 'tiempo' && <TabTiempo onAbrir={abrir} />}
        {pestana === 'ajustes' && <TabAjustes />}
      </div>
    </div>
  )
}
