import type { NarradorVideo } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import type { ProyectoAbierto } from './modelo'
import { LineasGuion, PanelNarradores } from './VocesGuion'

/**
 * El guion de un video como herramienta del editor: ocupa el lateral del clip
 * (columna a la derecha o cajón en móvil) con las voces del proyecto y las
 * líneas de narración en orden, con su reproductor. Tocar una línea vuelve al
 * panel del clip. Misma cabecera que Medios y el panel del clip.
 */
export function PanelGuion({
  proyecto,
  iconoCerrar,
  onCerrar,
  sonando,
  onEscuchar,
  onParar,
  onSeleccion,
  onAnadirNarrador,
  onCambiarNarrador,
  onQuitarNarrador,
}: {
  proyecto: ProyectoAbierto
  /** Icono del botón de la cabecera: plegar (columna) o cerrar (cajón). */
  iconoCerrar: NombreIcono
  onCerrar: () => void
  /** Id de la línea que suena, o null. */
  sonando: string | null
  /** Sin id: todas en orden. */
  onEscuchar: (clipId?: string) => void
  onParar: () => void
  onSeleccion: (clipId: string) => void
  onAnadirNarrador: (asistenteId?: string) => void
  onCambiarNarrador: (narradorId: string, patch: Partial<NarradorVideo>) => void
  onQuitarNarrador: (narradorId: string) => void
}) {
  const t = useT()
  const etiquetaCerrar = iconoCerrar === 'cerrar' ? t('video.panel.cerrar', 'Cerrar el panel') : t('video.lateral.plegarEditor', 'Plegar el editor')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <span className="text-sm">
          <Icono nombre="rol" />
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{t('video.pelicula.guion', 'Guion')}</p>
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
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
        <PanelNarradores proyecto={proyecto} onAnadir={onAnadirNarrador} onCambiar={onCambiarNarrador} onQuitar={onQuitarNarrador} />
        <LineasGuion proyecto={proyecto} sonando={sonando} onEscuchar={onEscuchar} onParar={onParar} onSeleccion={onSeleccion} />
      </div>
    </div>
  )
}
