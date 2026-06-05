/** Control de rotación en el plano (como ⟲ ⟳ del mapa), en pasos de 90°. */
export function RotationControl({
  grados,
  onChange,
}: {
  grados: number
  onChange: (grados: number) => void
}) {
  const normalizar = (g: number) => ((g % 360) + 360) % 360
  const valor = normalizar(grados)

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(normalizar(valor - 90))}
        title="Girar 90° a la izquierda"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl text-white/80 transition hover:bg-white/15 active:scale-95"
      >
        ⟲
      </button>
      <div className="flex-1 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-center">
        <span className="text-sm font-bold text-white/90">{valor}°</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(normalizar(valor + 90))}
        title="Girar 90° a la derecha"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl text-white/80 transition hover:bg-white/15 active:scale-95"
      >
        ⟳
      </button>
    </div>
  )
}
