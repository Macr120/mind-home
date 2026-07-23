import { useHerramienta } from '../state/herramientaStore'

/** Movimientos de la rueda usables como festejo (excluye "correr": no es un emote). */
const FESTEJOS = ['saltar', 'bailar', 'cuerda', 'mortal', 'saludar'] as const

const DUR_BAILE_MS = 2200
const DUR_CUERDA_MS = 2200

/** El personaje hace un movimiento de festejo al azar (uno de los 5 de la rueda). */
export function festejarAleatorio(): void {
  const h = useHerramienta.getState()
  const elegido = FESTEJOS[Math.floor(Math.random() * FESTEJOS.length)]
  switch (elegido) {
    case 'saltar':
      h.saltar()
      break
    case 'mortal':
      h.mortal()
      break
    case 'saludar':
      h.saludar()
      break
    case 'bailar':
      h.setBailando(true)
      setTimeout(() => h.setBailando(false), DUR_BAILE_MS)
      break
    case 'cuerda':
      h.setCuerda(true)
      setTimeout(() => h.setCuerda(false), DUR_CUERDA_MS)
      break
  }
}
