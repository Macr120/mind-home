/**
 * Heurística de intención humana, compartida por los guards de las BD paralelas
 * (demo y probar): los procesos de fondo también escriben (racha de Sísifo, la
 * edición del día del diario…), pero solo una mutación cercana a un click/tecla
 * del usuario cuenta como «su edición» y justifica un aviso.
 *
 * Vive aparte de los guards para que ambos la importen sin duplicarla y sin
 * ciclos (db.ts → guard → aquí).
 */
import { esDemo, esProbar } from '../edicion'

let ultimaInteraccion = 0

if (typeof window !== 'undefined' && (esDemo() || esProbar())) {
  const marcar = () => {
    ultimaInteraccion = Date.now()
  }
  window.addEventListener('pointerdown', marcar, true)
  window.addEventListener('keydown', marcar, true)
}

/** ¿Hubo un click/tecla del usuario hace menos de 3 s? */
export function hayIntencionHumana(): boolean {
  return Date.now() - ultimaInteraccion < 3000
}

// Un tutorial escribe por su cuenta —crea el dato de ejemplo y lo borra al
// salir— y lo hace justo después del click en «Siguiente», así que la
// heurística lo tomaba por una edición del usuario: el aviso salía solo y
// encima tapaba el spotlight (velo z-70 sobre overlay z-60).
let enTutorial = false
export function setTutorialActivo(v: boolean): void {
  enTutorial = v
}

export function hayTutorialActivo(): boolean {
  return enTutorial
}

// El wizard de bienvenida crea cuartos/avatar/mascota justo tras un click: en
// el modo probar, sin esta marca, el aviso de sesión taparía el propio wizard.
let enBienvenida = false
export function setBienvenidaActiva(v: boolean): void {
  enBienvenida = v
}

export function hayBienvenidaActiva(): boolean {
  return enBienvenida
}
