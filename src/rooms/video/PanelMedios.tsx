import type { FuenteSonido, MedioVideo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import type { AppStudio, RecursoStudio } from '../../core/recursosStudio'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import type { MedioConId } from './clipsNuevos'
import { ListaSonidos, type ItemSonido } from './ListaSonidos'
import { MediosPanel } from './MediosPanel'
import { RecursosStudio } from './RecursosStudio'
import { Pestana } from './Secciones'
import type { PropsArrastreItem } from './useArrastreMedio'

export type TabMedios = 'medios' | 'sonidos' | 'studio'

/**
 * El menú lateral de multimedia: la biblioteca de medios y la carpeta de
 * sonidos (de fábrica y del usuario), para tocar (añadir en el cursor) o arrastrar a una pista.
 * Misma cabecera que el panel del clip; el botón de la derecha pliega la
 * columna o cierra el cajón según el modo.
 */
export function PanelMedios({
  tab,
  onTab,
  medios,
  iconoCerrar,
  onCerrar,
  onElegirMedio,
  onElegirSonido,
  onElegirRecurso,
  propsMedio,
  propsSonido,
  propsRecurso,
}: {
  tab: TabMedios
  onTab: (tab: TabMedios) => void
  medios: MedioVideo[]
  /** Icono del botón de la cabecera: plegar (columna) o cerrar (cajón). */
  iconoCerrar: NombreIcono
  onCerrar: () => void
  onElegirMedio: (m: MedioConId) => void
  onElegirSonido: (fuente: FuenteSonido) => void
  /** Recurso de otra app del Studio (audio, arte, escritura). */
  onElegirRecurso: (app: AppStudio, recurso: RecursoStudio) => void
  propsMedio: (m: MedioConId) => PropsArrastreItem
  propsSonido: (item: ItemSonido) => PropsArrastreItem
  propsRecurso: (app: AppStudio, recurso: RecursoStudio) => PropsArrastreItem
}) {
  const t = useT()
  const etiquetaCerrar = iconoCerrar === 'cerrar' ? t('video.panel.cerrar', 'Cerrar el panel') : t('video.lateral.plegarMedios', 'Plegar los medios')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <button
          type="button"
          onClick={onCerrar}
          aria-label={etiquetaCerrar}
          title={etiquetaCerrar}
          className="grid h-6 w-6 place-items-center rounded text-sm hover:bg-white/10"
        >
          <Icono nombre="carpeta" />
        </button>
        <span className="min-w-0 flex-1" />
        <Pestana activa={tab === 'medios'} onClick={() => onTab('medios')}>
          {t('video.lateral.medios', 'Medios')}
        </Pestana>
        <Pestana activa={tab === 'sonidos'} onClick={() => onTab('sonidos')}>
          {t('video.sonidos.titulo', 'Sonidos')}
        </Pestana>
        <Pestana activa={tab === 'studio'} onClick={() => onTab('studio')}>
          {t('video.lateral.studio', 'Studio')}
        </Pestana>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={etiquetaCerrar}
          title={etiquetaCerrar}
          className="grid h-6 w-6 place-items-center rounded text-white/50 hover:bg-white/10"
        >
          <Icono nombre={iconoCerrar} />
        </button>
      </div>
      <p className="shrink-0 px-2 pt-1.5 text-[11px] text-white/45">
        {t('video.lateral.ayuda', 'Toca para añadir en el cursor; arrastra a una pista')}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === 'medios' ? (
          <MediosPanel
            compacto
            onElegir={(m) => {
              if (m.id != null) onElegirMedio(m as MedioConId)
            }}
            propsArrastre={propsMedio}
          />
        ) : tab === 'sonidos' ? (
          <ListaSonidos compacto medios={medios} onElegir={onElegirSonido} propsArrastre={propsSonido} />
        ) : (
          <RecursosStudio onElegir={onElegirRecurso} propsArrastre={propsRecurso} />
        )}
      </div>
    </div>
  )
}
