import { useCuartos, getCuarto } from '../state/cuartosStore'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { EditorPanelMapa } from './editor/EditorPanelMapa'
import { EditorPanelCuarto } from './editor/EditorPanelCuarto'
import { EditorPlanosPanel } from './planos/EditorPlanosPanel'
import { usePlanos } from '../state/planosStore'
import { GeneradorMiniaturas } from '../house/Miniatura'
import { RelojWidget } from './CicloPanel'
import { useT } from '../i18n/useT'

/**
 * Modo edición.
 * - Sin cuarto seleccionado: mover cuartos, piso, avatar y perfil — o planos en planta.
 * - Con cuarto (engrane ⚙️): apariencia, paredes, tamaño y objetos de ese cuarto.
 */
export function EditPanel() {
  const t = useT()
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const editRoom = useLayout((s) => s.editRoom)
  const setEditMode = useLayout((s) => s.setEditMode)
  const toggleRoom = useLayout((s) => s.toggleRoom)
  const placed = useLayout((s) => s.placed)
  const cuartos = useCuartos((s) => s.cuartos)
  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)
  const planosActivo = usePlanos((s) => s.activo)
  const setPlanosActivo = usePlanos((s) => s.setActivo)

  const editar = (id: string | null) => editRoom(id)

  if (!editMode) {
    return <ToolbarPermanente onEditar={() => setEditMode(true)} />
  }

  const room = editingRoomId ? getCuarto(editingRoomId) : null
  const color = room ? roomColors[room.id] ?? room.color : planosActivo ? '#6ee7b7' : '#94a3b8'
  const nombre = room ? roomNames[room.id] || room.nombre : ''

  const quitarDelMapa = () => {
    if (!room) return
    toggleRoom(room.id)
    const otro = cuartos.find((r) => r.id !== room.id && placed[r.id])
    editar(otro ? otro.id : null)
  }

  const tituloHeader = room
    ? nombre.split(' · ')[0]
    : planosActivo
      ? t('planos.titulo', 'Planos')
      : t('mapa.editar', 'Editar mapa')

  const emojiHeader = room ? '✏️' : planosActivo ? '📐' : '✏️'

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l border-white/10 bg-[#12151c]/95 backdrop-blur-sm">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="truncate text-base font-black" style={{ color }}>
          {emojiHeader} {tituloHeader}
        </span>
        <button
          onClick={() => setEditMode(false)}
          className="ml-auto rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-300"
        >
          ✓ {t('mapa.listo', 'Listo')}
        </button>
      </header>

      {!room && (
        <div className="border-b border-white/10 px-3 py-2">
          <div className="flex overflow-hidden rounded-lg border border-white/10 bg-black/30">
            <button
              type="button"
              onClick={() => setPlanosActivo(false)}
              className={`h-8 flex-1 text-xs font-semibold transition ${
                !planosActivo
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/75'
              }`}
            >
              🏠 {t('planos.tab.casa', 'Casa')}
            </button>
            <button
              type="button"
              onClick={() => setPlanosActivo(true)}
              className={`h-8 flex-1 text-xs font-semibold transition ${
                planosActivo
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/75'
              }`}
            >
              📐 {t('planos.tab.planos', 'Planos')}
            </button>
          </div>
        </div>
      )}

      <p className="border-b border-white/10 px-4 py-2 text-[11px] leading-snug text-white/45">
        {room ? (
          <>
            Personaliza apariencia, paredes y tamaño.{' '}
            <b className="text-white/65">Arrastra el mueble y la decoración</b> dentro del cuarto.
          </>
        ) : planosActivo ? (
          <>
            Edita en la <b className="text-white/65">vista 3D</b>; abre el{' '}
            <b className="text-white/65">croquis</b> del panel como referencia.
          </>
        ) : (
          <>
            <b className="text-white/65">Arrastra los cuartos</b>, personaliza la casa o usa el{' '}
            <b className="text-white/65">⚙️</b> de un cuarto para editarlo.
          </>
        )}
        {!room && !planosActivo && (
          <span className="mt-1 block text-[10px] text-white/30">
            ⠿ reordenar secciones · ▶ plegar
          </span>
        )}
      </p>

      <div className="scroll-sutil min-h-0 flex-1 overflow-y-auto p-3">
        {room && editingRoomId ? (
          <EditorPanelCuarto
            room={room}
            editingRoomId={editingRoomId}
            onRoomChange={editar}
          />
        ) : planosActivo ? (
          <EditorPlanosPanel />
        ) : (
          <EditorPanelMapa />
        )}
      </div>

      <GeneradorMiniaturas />

      {room && (
        <div className="border-t border-white/10 p-3">
          <button
            onClick={quitarDelMapa}
            className="w-full rounded-lg border border-red-400/30 bg-red-400/10 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-400/20"
          >
            {t('mapa.quitar', 'Quitar del mapa')}
          </button>
        </div>
      )}
    </div>
  )
}

function ToolbarPermanente({ onEditar }: { onEditar: () => void }) {
  const t = useT()
  return (
    <div className="absolute right-4 top-4 z-20 flex items-start gap-2">
      <RelojWidget />
      <button
        type="button"
        onClick={onEditar}
        className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm font-semibold text-white/85 backdrop-blur-sm transition hover:bg-white/15"
        title={t('mapa.editarTitulo', 'Editar el mapa de la casa')}
      >
        ✏️ {t('mapa.editar', 'Editar mapa')}
      </button>
    </div>
  )
}
