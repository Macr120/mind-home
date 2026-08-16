import type { Carta } from './cartas'
import { esRoja, nombreValor } from './cartas'

export function CartaView({
  carta,
  bocaAbajo = false,
  seleccionada = false,
  ancho = 46,
}: {
  carta: Carta
  bocaAbajo?: boolean
  seleccionada?: boolean
  ancho?: number
}) {
  const alto = Math.round(ancho * 1.4)

  if (bocaAbajo) {
    return (
      <div
        style={{ width: ancho, height: alto }}
        className="rounded-md border border-white/25 bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-sm"
      >
        <div className="m-1 h-[calc(100%-8px)] rounded-sm border border-white/15" />
      </div>
    )
  }

  const roja = esRoja(carta)
  return (
    <div
      style={{ width: ancho, height: alto }}
      className={`relative rounded-md bg-[#ffffff] shadow-sm border ${
        seleccionada ? 'border-amber-400 ring-2 ring-amber-400/80' : 'border-black/30'
      }`}
    >
      <p
        className={`px-1 pt-0.5 font-bold leading-none ${roja ? 'text-red-600' : 'text-slate-900'}`}
        style={{ fontSize: Math.round(ancho * 0.32) }}
      >
        {nombreValor(carta.valor)}
        <span className="block leading-none">{carta.palo}</span>
      </p>
      <span
        className={`absolute bottom-0 end-0.5 leading-none ${roja ? 'text-red-600' : 'text-slate-900'}`}
        style={{ fontSize: Math.round(ancho * 0.42) }}
      >
        {carta.palo}
      </span>
    </div>
  )
}
