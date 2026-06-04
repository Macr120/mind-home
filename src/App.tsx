import { House } from './core/house/House'
import { HUD } from './core/ui/HUD'
import { RoomOverlay } from './core/ui/RoomOverlay'

export default function App() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <House />
      <HUD />
      <RoomOverlay />
    </div>
  )
}
