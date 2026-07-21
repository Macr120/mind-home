// Baraja inglesa compartida por Solitario y Blackjack.
export type Palo = '♠' | '♥' | '♦' | '♣'

export interface Carta {
  palo: Palo
  valor: number // 1 = As … 11 = J, 12 = Q, 13 = K
}

const PALOS: Palo[] = ['♠', '♥', '♦', '♣']

const NOMBRES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function nombreValor(valor: number): string {
  return NOMBRES[valor - 1]
}

export function esRoja(carta: Carta): boolean {
  return carta.palo === '♥' || carta.palo === '♦'
}

export function crearBaraja(mazos = 1): Carta[] {
  const baraja: Carta[] = []
  for (let m = 0; m < mazos; m++)
    for (const palo of PALOS)
      for (let valor = 1; valor <= 13; valor++) baraja.push({ palo, valor })
  return baraja
}

/** Fisher-Yates sobre una copia; también la usan los generadores de Sudoku y las IA. */
export function barajar<T>(lista: T[]): T[] {
  const r = [...lista]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
