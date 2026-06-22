import { EditorSeccion } from './EditorSeccion'
import { useEditorSeccionesMapa } from './useEditorSecciones'
import { TITULOS_MAPA, type SeccionMapaId } from './editorSecciones'
import { EditorAjustesSection } from './EditorAjustesSection'
import { EditorTemaSection } from './EditorTemaSection'
import { EditorFondoSection } from './EditorFondoSection'
import { useT } from '../../i18n/useT'
import { EditorAvatarSection } from './EditorAvatarSection'
import { EditorPerfilSection } from './EditorPerfilSection'
import { EditorInventarioSection } from './EditorInventarioSection'

/** Panel de secciones del editor de mapa (plegables y reordenables). */
export function EditorPanelMapa() {
  const s = useEditorSeccionesMapa()
  const t = useT()

  const contenidoMapa = (id: SeccionMapaId) => {
    switch (id) {
      case 'ajustes':
        return <EditorAjustesSection embed />
      case 'inventario':
        return <EditorInventarioSection embed />
      case 'tema':
        return <EditorTemaSection embed />
      case 'fondo':
        return <EditorFondoSection embed />
      case 'perfil':
        // Perfil del usuario + su avatar 3D, en una sola sección.
        return (
          <div className="space-y-4">
            <EditorPerfilSection embed />
            <div className="border-t border-white/10 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {t('editor.mapa.avatar', 'Avatar del personaje')}
              </p>
              <EditorAvatarSection embed />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-3">
      {s.orden.map((id) => (
        <EditorSeccion<SeccionMapaId>
          key={id}
          id={id}
          titulo={t(`editor.mapa.${id}`, TITULOS_MAPA[id])}
          abierto={s.abierto(id)}
          onToggle={s.toggle}
          onDragStart={s.iniciarArrastre}
          onDragEnter={s.entrarObjetivo}
          onDragEnd={s.finArrastre}
          onDrop={s.soltar}
          esObjetivo={s.objetivo === id && s.arrastrando !== id}
          esArrastrado={s.arrastrando === id}
        >
          {contenidoMapa(id)}
        </EditorSeccion>
      ))}
    </div>
  )
}
