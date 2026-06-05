import { useState } from 'react'
import { House } from './core/house/House'
import { RoomOverlay } from './core/ui/RoomOverlay'
import { RoomSideMenu, FloatingMenuButton } from './core/ui/RoomSideMenu'
import { KeyboardMove, MoveControls } from './core/ui/MoveControls'
import { useLayout } from './core/state/layoutStore'

export default function App() {
  const editMode = useLayout((s) => s.editMode)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0f1115]">
      {!editMode && <KeyboardMove />}
      {sidebarOpen && <RoomSideMenu onToggle={() => setSidebarOpen(false)} />}
      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        <House />
        {!sidebarOpen && (
          <FloatingMenuButton onToggle={() => setSidebarOpen(true)} />
        )}
        {!editMode && <MoveControls />}
        <RoomOverlay />
      </div>
    </div>
  )
}
