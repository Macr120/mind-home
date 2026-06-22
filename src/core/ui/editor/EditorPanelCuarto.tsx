import type { Cuarto } from '../../data/db'
import { WallEditor } from '../WallEditor'
import { ObjetosTab } from './ObjetosTab'
import { EditorSeccion } from './EditorSeccion'
import { useEditorSeccionesCuarto } from './useEditorSecciones'
import { TITULOS_CUARTO, sanitizarOrdenCuarto, type SeccionCuartoId } from './editorSecciones'
import { EditorPisoCuartoSection } from './EditorPisoCuartoSection'
import { EditorTechoCuartoSection } from './EditorTechoCuartoSection'
import { useT } from '../../i18n/useT'

interface Props {
  room: Cuarto
  editingRoomId: string
  onRoomChange: (id: string) => void
}

/** Panel de secciones al editar un cuarto (plegables y reordenables). */
export function EditorPanelCuarto({ room, editingRoomId, onRoomChange }: Props) {
  const t = useT()
  const s = useEditorSeccionesCuarto()

  const contenidoCuarto = (id: SeccionCuartoId) => {
    switch (id) {
      case 'piso':
        return <EditorPisoCuartoSection room={room} />
      case 'paredes':
        return <WallEditor roomId={room.id} />
      case 'techo':
        return <EditorTechoCuartoSection room={room} />
      case 'objetos':
        return (
          <ObjetosTab
            roomId={editingRoomId}
            onRoomChange={onRoomChange}
            embed
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-3">
      {sanitizarOrdenCuarto(s.orden).map((id) => (
        <EditorSeccion<SeccionCuartoId>
          key={id}
          id={id}
          titulo={t(`editor.cuarto.${id}` as Parameters<typeof t>[0], TITULOS_CUARTO[id])}
          abierto={s.abierto(id)}
          onToggle={s.toggle}
          onDragStart={s.iniciarArrastre}
          onDragEnter={s.entrarObjetivo}
          onDragEnd={s.finArrastre}
          onDrop={s.soltar}
          esObjetivo={s.objetivo === id && s.arrastrando !== id}
          esArrastrado={s.arrastrando === id}
        >
          {contenidoCuarto(id)}
        </EditorSeccion>
      ))}
    </div>
  )
}
