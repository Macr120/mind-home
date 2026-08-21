import { useEffect } from 'react'
import { Icono } from './iconos/Icono'
import { getCuarto } from '../state/cuartosStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { useDiseño, useRoomVisual } from '../state/disenoStore'
import { useNombreCuarto } from './roomDisplay'
import { useInteractUi } from '../state/interactUiStore'
import { usePendientesCasa } from '../state/pendientesStore'
import { accionCuarto } from './roomInteract'
import { BadgeMisiones } from './BadgeMisiones'

/**
 * Diálogo 2D anclado al mueble principal (proyectado desde la escena 3D).
 * No usa Html de drei para no bloquear clics ni raycast del mapa.
 */
export function InteractOverlay() {
  const editMode = useLayout((s) => s.editMode)
  const activeRoom = useHouse((s) => s.activeRoom)
  const openRoom = useHouse((s) => s.openRoom)
  const roomId = useInteractUi((s) => s.focusRoomId)
  const screenX = useInteractUi((s) => s.screenX)
  const screenY = useInteractUi((s) => s.screenY)
  const clear = useInteractUi((s) => s.clear)

  // Cerrar la etiqueta al hacer clic en cualquier otra cosa de la pantalla.
  // Se difiere con setTimeout para asegurar que el clic que abrió la burbuja
  // ya terminó de propagarse hasta window antes de registrar el listener;
  // en React 19 el flush puede ser síncrono dentro del handler de R3F.
  useEffect(() => {
    if (!roomId) return
    const handle = () => clear()
    const timer = setTimeout(() => window.addEventListener('click', handle), 0)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', handle)
    }
  }, [roomId, clear])

  if (editMode || activeRoom || !roomId) return null

  const room = getCuarto(roomId)
  if (!room) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      aria-hidden={false}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          left: screenX,
          top: screenY,
          transform: 'translate(-50%, calc(-100% - 10px))',
        }}
      >
        <Burbuja
          roomId={roomId}
          roomColor={room.color}
          roomNombre={room.nombre}
          roomIcon={room.icon}
          onEntrar={() => openRoom(roomId)}
        />
      </div>
    </div>
  )
}

function Burbuja({
  roomId,
  roomColor,
  roomNombre,
  roomIcon,
  onEntrar,
}: {
  roomId: string
  roomColor: string
  roomNombre: string
  roomIcon: string
  onEntrar: () => void
}) {
  const { color } = useRoomVisual(roomId, roomColor, roomNombre)
  // El nombre, traducido igual que en el menú lateral y la cabecera del cuarto.
  const nombreCuarto = useNombreCuarto()
  const nombre = nombreCuarto({ id: roomId, nombre: roomNombre })
  // Primera app del cuarto (como en el menú lateral): suyas son las misiones que
  // pinta el globo rojo, el mismo de la tarjeta en la pantalla de inicio.
  const appId = useDiseño((s) => s.objetos.find((o) => o.roomId === roomId && o.plantillaId)?.plantillaId)
  const pendientes = usePendientesCasa((s) => (appId ? s.porApp[appId] : undefined))
  const accion = accionCuarto(roomId)
  const titulo = nombre.split(' · ')[0]

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onEntrar()
        }}
        title={`${accion} — ${titulo}`}
        className="ui-panel-glass pointer-events-auto relative flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-2.5 shadow-xl backdrop-blur-md transition hover:scale-[1.04] active:scale-[0.97]"
        style={{
          borderColor: color,
          boxShadow: `0 6px 28px ${color}55, 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      >
        <span className="text-lg leading-none"><Icono emoji={roomIcon} /></span>
        <span
          className="text-sm font-black leading-tight"
          style={{ color }}
        >
          {accion}
        </span>
        <span className="max-w-[9rem] truncate text-[10px] font-medium text-white/45">
          {titulo}
        </span>
        {pendientes && <BadgeMisiones pendientes={pendientes} className="absolute -top-2 -end-2" />}
      </button>
      <span
        className="pointer-events-none -mt-px h-0 w-0 border-x-[10px] border-t-[12px] border-x-transparent"
        style={{ borderTopColor: color }}
        aria-hidden
      />
    </div>
  )
}
