import { EditorSeccion } from './EditorSeccion'
import { useEditorSeccionesMapa } from './useEditorSecciones'
import { TITULOS_MAPA, type SeccionMapaId } from './editorSecciones'
import { EditorTemaSection } from './EditorTemaSection'
import { useT } from '../../i18n/useT'
import { ConstructorMapa } from '../planos/ConstructorMapa'

/** Panel de secciones del editor de mapa (plegables y reordenables). */
export function EditorPanelMapa() {
  const s = useEditorSeccionesMapa()
  const t = useT()

  const contenidoMapa = (id: SeccionMapaId) => {
    switch (id) {
      case 'tema':
        return <EditorTemaSection embed />
      default:
        return null
    }
  }

  return (
    <div className="space-y-3">
      {/* Sección "Mapa": el constructor unificado (barra de modos + croquis + editor de abajo),
          plegable como las demás secciones. */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="flex min-h-[34px] items-center gap-0.5 bg-black/15 px-1.5 py-1.5">
          <button
            type="button"
            onClick={() => s.toggle('mapa')}
            className="flex h-7 w-6 shrink-0 items-center justify-center text-[10px] text-white/50 transition hover:text-white/85"
            aria-expanded={s.abierto('mapa')}
            aria-label={
              s.abierto('mapa')
                ? t('editor.sec.contraerMapa', 'Contraer Mapa')
                : t('editor.sec.expandirMapa', 'Expandir Mapa')
            }
          >
            {s.abierto('mapa') ? '▼' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => s.toggle('mapa')}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-white/85"
          >
            {t('editor.mapa.mapa', 'Mapa')}
          </button>
        </div>
        {s.abierto('mapa') && (
          <div className="border-t border-white/10 p-3">
            <ConstructorMapa />
          </div>
        )}
      </div>

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
