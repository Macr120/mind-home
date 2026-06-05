import { useCam } from '../state/cameraStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'

/**
 * Botones de navegación de la casa 3D: rotar a las esquinas, zoom y reset.
 * Conducen el estado de la cámara (useCam); CameraRig lo aplica suavemente.
 * En edición se muestran abajo a la izquierda (lejos del panel derecho).
 */
export function NavControls() {
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const rotar = useCam((s) => s.rotar)
  const zoomBy = useCam((s) => s.zoomBy)
  const reset = useCam((s) => s.reset)
  const focusRoomEdit = useCam((s) => s.focusRoomEdit)

  const reiniciarVista = () => {
    if (editingRoomId) focusRoomEdit(roomWorldPos(editingRoomId))
    else reset()
  }

  const enEdicionCuarto = Boolean(editingRoomId)

  return (
    <div
      className={`absolute bottom-4 z-10 flex flex-col items-center gap-2 ${
        editMode ? 'left-4' : 'right-4'
      }`}
      aria-label="Controles de vista"
    >
      {editMode && (
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
          Vista del cuarto
        </p>
      )}
      <div className="flex gap-2">
        <Boton onClick={() => rotar(-1)} title="Rotar vista a la izquierda">
          ⟲
        </Boton>
        <Boton onClick={() => rotar(1)} title="Rotar vista a la derecha">
          ⟳
        </Boton>
      </div>
      <div className="flex gap-2">
        <Boton onClick={() => zoomBy(1.25)} title="Acercar">
          +
        </Boton>
        <Boton onClick={() => zoomBy(0.8)} title="Alejar">
          −
        </Boton>
      </div>
      <Boton
        onClick={reiniciarVista}
        title={enEdicionCuarto ? 'Restaurar zoom y enfoque del cuarto' : 'Vista inicial'}
        ancho
      >
        {enEdicionCuarto ? '⌂ Centrar cuarto' : '⌂ Reiniciar vista'}
      </Boton>
    </div>
  )
}

function Boton({
  children,
  onClick,
  title,
  ancho,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  ancho?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-white/15 active:scale-95 ${
        ancho ? 'h-9 px-3 text-xs font-semibold' : 'h-10 w-10 text-xl'
      }`}
    >
      {children}
    </button>
  )
}
