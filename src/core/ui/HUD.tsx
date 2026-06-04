/** Indicaciones mínimas sobre la vista 3D (el menú de cuartos va en RoomSideMenu). */
export function HUD() {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-48 select-none rounded-lg bg-black/40 px-3 py-2 backdrop-blur-sm">
      <p className="text-[11px] text-white/55">
        Muévete con WASD/flechas o el pad (abajo izq.). Rota y haz zoom con los
        botones (abajo der.). Cruza las puertas entre cuartos.
      </p>
    </div>
  )
}
