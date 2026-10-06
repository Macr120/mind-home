import type { CSSProperties } from 'react'
import { luminancia } from '../../../core/ui/temasUI'
import type { Carta } from './cartas'
import { esRoja, nombreValor } from './cartas'

/** Colores de la baraja: cada juego de cartas pasa los suyos (apariencia.tsx). */
export interface ColoresCarta {
  dorso: string
  cara: string
  rojo: string
  negro: string
  marca: string
}

/** Los de siempre: son los del estilo «Clásico» de Solitario y Ocho locos. */
export const COLORES_CARTA: ColoresCarta = {
  dorso: '#065f46',
  cara: '#ffffff',
  rojo: '#dc2626',
  negro: '#0f172a',
  marca: '#fbbf24',
}

/** Tinta oscura o blanca, la que se lea sobre un fondo elegido por el jugador. */
export const tintaSobre = (fondo: string) => (luminancia(fondo) > 0.35 ? '#0f172a' : '#ffffff')

/**
 * Un color elegido por el jugador encima de otro también elegido (el palo sobre
 * la cara): si no llega a 3:1 se empuja hacia la tinta que sí se lee.
 */
export function legible(tinta: string, fondo: string): string {
  const a = luminancia(tinta)
  const b = luminancia(fondo)
  if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 3) return tinta
  return `color-mix(in srgb, ${tinta} 35%, ${tintaSobre(fondo)})`
}

/**
 * Isla de color para un fondo propio: la tinta (y las utilidades `text-white/X`,
 * `border-white/X`… que leen `--color-white`) pasan a la que se lee encima.
 */
export function islaTinta(fondo: string): CSSProperties {
  const tinta = tintaSobre(fondo)
  return { color: tinta, '--color-white': tinta, '--ui-ink': tinta } as CSSProperties
}

export function CartaView({
  carta,
  bocaAbajo = false,
  seleccionada = false,
  ancho = 46,
  colores: propios,
}: {
  carta: Carta
  bocaAbajo?: boolean
  seleccionada?: boolean
  ancho?: number
  /** Los que falten se quedan como los de siempre. */
  colores?: Partial<ColoresCarta>
}) {
  const colores = { ...COLORES_CARTA, ...propios }
  const alto = Math.round(ancho * 1.4)

  if (bocaAbajo) {
    return (
      <div
        style={{
          width: ancho,
          height: alto,
          background: `linear-gradient(to bottom right, ${colores.dorso}, color-mix(in srgb, ${colores.dorso} 40%, #000))`,
        }}
        className="rounded-md border border-white/25 shadow-sm"
      >
        <div className="m-1 h-[calc(100%-8px)] rounded-sm border border-white/15" />
      </div>
    )
  }

  const tinta = legible(esRoja(carta) ? colores.rojo : colores.negro, colores.cara)
  return (
    <div
      style={
        {
          width: ancho,
          height: alto,
          background: colores.cara,
          borderColor: seleccionada ? colores.marca : 'rgb(0 0 0 / 0.3)',
          '--tw-ring-color': `color-mix(in srgb, ${colores.marca} 80%, transparent)`,
        } as CSSProperties
      }
      className={`relative rounded-md shadow-sm border ${seleccionada ? 'ring-2' : ''}`}
    >
      <p className="px-1 pt-0.5 font-bold leading-none" style={{ fontSize: Math.round(ancho * 0.32), color: tinta }}>
        {nombreValor(carta.valor)}
        <span className="block leading-none">{carta.palo}</span>
      </p>
      <span
        className="absolute bottom-0 end-0.5 leading-none"
        style={{ fontSize: Math.round(ancho * 0.42), color: tinta }}
      >
        {carta.palo}
      </span>
    </div>
  )
}
