import { useHouse } from '../state/houseStore'

const btn =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/55 text-lg backdrop-blur-sm transition hover:bg-white/15'

/** Alterna vista con techo / sin techo en la casa 3D. */
export function TechoToggleButton() {
  const conTecho = useHouse((s) => s.conTecho)
  const toggleTecho = useHouse((s) => s.toggleTecho)

  return (
    <button
      type="button"
      onClick={toggleTecho}
      title={conTecho ? 'Quitar techo (vista abierta)' : 'Ver casa con techo'}
      className={`${btn} ${conTecho ? 'border-amber-400/50 bg-amber-400/15' : ''}`}
      aria-pressed={conTecho}
    >
      🏠
    </button>
  )
}
