export function Estrellas({
  valor,
  onChange,
  soloLectura = false,
}: {
  valor: number
  onChange?: (n: number) => void
  soloLectura?: boolean
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={soloLectura}
          onClick={() => onChange?.(n === valor && !soloLectura ? 0 : n)}
          className={`text-lg ${n <= valor ? 'text-amber-400' : 'text-white/20'} ${
            soloLectura ? '' : 'hover:scale-110'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
