import { House } from './core/house/House'
import { HUD } from './core/ui/HUD'
import { RoomOverlay } from './core/ui/RoomOverlay'
import { RoomSideMenu } from './core/ui/RoomSideMenu'
import { KeyboardMove, MoveControls } from './core/ui/MoveControls'
import { useLayout } from './core/state/layoutStore'

export default function App() {
  const editMode = useLayout((s) => s.editMode)
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0f1115]">
      {!editMode && <KeyboardMove />}
      <RoomSideMenu />
      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        <House />
        <HUD />
        {!editMode && <MoveControls />}
        <RoomOverlay />
      </div>
    </div>
  )
}
