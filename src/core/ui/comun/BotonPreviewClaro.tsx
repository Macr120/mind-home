import { useEditorUi } from '../../state/editorUiStore'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Botón para alternar el fondo de los previews 3D del editor entre oscuro y
 * claro (blanco). El ajuste es global (`previewClaro` en el store) y lo comparten
 * todos los previews: personajes, objetos y el modelo 3D del mapa. Se coloca en
 * una esquina del preview (posición absoluta) por el componente que lo usa.
 */
export function BotonPreviewClaro() {
  const t = useT()
  const claro = useEditorUi((s) => s.previewClaro)
  const setClaro = useEditorUi((s) => s.setPreviewClaro)
  return (
    <button
      type="button"
      onClick={() => setClaro(!claro)}
      title={claro ? t('preview.fondoOscuro', 'Fondo oscuro') : t('preview.fondoClaro', 'Fondo claro')}
      className={`pointer-events-auto grid h-7 w-7 place-items-center rounded-md border text-xs backdrop-blur-sm transition ${claseOverlayBtn(claro)}`}
    >
      <Icono nombre={claro ? 'noche' : 'dia'} />
    </button>
  )
}

/**
 * Fondo del lienzo de un preview 3D según `previewClaro`. Son colores LITERALES a
 * propósito: en modo claro/transparente `temasUI.ts` reescribe `--color-white` (a
 * #1c2333), así que `bg-white` saldría azul oscuro y el fondo "claro" del preview
 * nunca sería blanco. El preview debe verse igual en los tres modos de interfaz.
 */
export function claseFondoPreview(claro: boolean) {
  return claro ? 'bg-[#ffffff]' : 'bg-[#0d0f13]'
}

/**
 * Clases del botón flotante de un preview 3D (ojo, engrane, techo/objetos…),
 * según el fondo del preview esté en claro u oscuro (`previewClaro`). Los
 * botones flotan directo sobre el canvas (no sobre el panel del editor), por
 * eso no usan las variables `--ui-*` del tema de interfaz: siguen el fondo del
 * preview, no el modo claro/oscuro general de la app. Por lo mismo los blancos
 * son literales (ver `claseFondoPreview`).
 */
export function claseOverlayBtn(claro: boolean, activo = false) {
  if (activo) return 'border-accent/60 bg-accent text-accent-ink'
  return claro
    ? 'border-black/10 bg-[#ffffff]/90 text-black/65 shadow-sm hover:bg-[#ffffff]'
    : 'ui-hud border-[#ffffff]/15 text-[#ffffff]/70 hover:bg-[#ffffff]/15'
}
