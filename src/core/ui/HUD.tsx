/** Indicaciones flotantes sobre la casa. */
export function HUD() {
  return (
    <div className="absolute left-4 top-4 z-10 pointer-events-none select-none">
      <h1 className="text-xl font-black tracking-tight text-white/90">
        🏠 Mind Home
      </h1>
      <p className="mt-1 text-xs text-white/50 max-w-50">
        Haz clic en el piso para caminar. Acércate a un cuarto y pulsa
        <span className="font-semibold text-white/70"> Entrar</span>.
      </p>
    </div>
  )
}
