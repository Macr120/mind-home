import { House } from './core/house/House'
import { HUD } from './core/ui/HUD'
import { RoomOverlay } from './core/ui/RoomOverlay'
import { RoomSideMenu } from './core/ui/RoomSideMenu'

export default function App() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0f1115]">
      <RoomSideMenu />
      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        <House />
        <HUD />
        <RoomOverlay />
      </div>
    </div>
  )
}
