import { useEffect, useState } from 'react'
import { House } from './core/house/House'
import { InteractOverlay } from './core/ui/InteractOverlay'
import { AccesoOverlay } from './core/ui/AccesoOverlay'
import { AsignarPlantillaDialog } from './core/ui/AsignarPlantillaDialog'
import { RoomOverlay } from './core/ui/RoomOverlay'
import { RoomSideMenu, FloatingMenuButton } from './core/ui/RoomSideMenu'
import { MoveControls } from './core/ui/MoveControls'
import { ChatBox } from './core/chat/ChatBox'
import { RutinasPanel } from './core/ui/RutinasPanel'
import { Calendario } from './core/ui/Calendario'
import { AsistenteBurbuja } from './core/ui/AsistenteBurbuja'
import { useHouse } from './core/state/houseStore'
import { useLayout } from './core/state/layoutStore'
import { useCam } from './core/state/cameraStore'
export default function App() {
  const editMode = useLayout((s) => s.editMode)
  const setEditMode = useLayout((s) => s.setEditMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const activeRoom = useHouse((s) => s.activeRoom)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  /** Al editar un cuarto (⚙️ + zoom), el panel derecho necesita espacio: cierra el menú. */
  useEffect(() => {
    if (editingRoomId) setSidebarOpen(false)
  }, [editingRoomId])

  /** Al abrir "Editar mapa", cerrar el sidebar izquierdo (un solo panel a la vez). */
  useEffect(() => {
    if (editMode) setSidebarOpen(false)
  }, [editMode])

  /** Editar el mapa usa siempre la cámara isométrica (la edición la asume). */
  useEffect(() => {
    if (editMode) useCam.getState().setVista('iso')
  }, [editMode])

  return (
    <div className="ui-app flex h-full w-full overflow-hidden">
      {sidebarOpen && <RoomSideMenu onToggle={() => setSidebarOpen(false)} />}
      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        <House />
        {!sidebarOpen && (
          <FloatingMenuButton onToggle={() => {
            setSidebarOpen(true)
            // Cerrar el editor de mapa al abrir el sidebar (un solo panel a la vez).
            if (editMode) setEditMode(false)
          }} />
        )}
        {!editMode && !sidebarOpen && <MoveControls />}
        {!editMode && <InteractOverlay />}
        {!editMode && !activeRoom && <AccesoOverlay />}
        {!editMode && !activeRoom && <AsistenteBurbuja />}
        {!editMode && !activeRoom && <ChatBox menuAbierto={sidebarOpen} />}
        {!editMode && !activeRoom && <RutinasPanel />}
        <Calendario />
        <RoomOverlay menuFlotante={!sidebarOpen} />
      </div>
      <AsignarPlantillaDialog />
    </div>
  )
}
