/** Interruptor de una línea: etiqueta a la izquierda, pastilla a la derecha (el kit no trae uno). */
export function Interruptor({
  activo,
  onCambio,
  disabled,
  etiqueta,
  nota,
}: {
  activo: boolean
  onCambio: (v: boolean) => void
  disabled?: boolean
  etiqueta: string
  /** Por qué está deshabilitado o qué implica (va en `title`). */
  nota?: string
}) {
  return (
    <label className={`flex items-center justify-between gap-3 text-xs ${disabled ? 'opacity-40' : ''}`} title={nota}>
      <span className="text-white/75">{etiqueta}</span>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        aria-label={etiqueta}
        disabled={disabled}
        onClick={() => onCambio(!activo)}
        className={`ui-boton relative h-5 w-9 shrink-0 rounded-full border transition ${
          activo ? 'border-white/60 bg-white/70' : 'border-white/15 bg-white/10'
        } disabled:pointer-events-none`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${activo ? 'start-[1.1rem] bg-black/80' : 'start-0.5 bg-white/70'}`}
        />
      </button>
    </label>
  )
}
