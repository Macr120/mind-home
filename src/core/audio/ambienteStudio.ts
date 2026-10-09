import type { MoodMusica } from '../state/ajustesStore'

/**
 * Música ambiental de la casa: la toca el motor del Studio de audio
 * (`rooms/audio/ambiente.ts`, una canción de ~1 min por vibe en bucle). El
 * núcleo no importa cuartos, así que el Studio registra aquí su cargador desde
 * su `index.tsx` (eager, con el código pesado tras `import()`), como
 * `recursosStudio.ts`. Se recuerda el ÚLTIMO pedido: si llega un «detener»
 * mientras baja el chunk, no arranca nada al terminar de cargar.
 */

interface MotorAmbiente {
  iniciar(mood: MoodMusica): void
  detener(fadeMs?: number): void
}

const GLOBAL = globalThis as { __mhMotorAmbiente?: () => Promise<MotorAmbiente> }

export function registrarMotorAmbiente(cargar: () => Promise<MotorAmbiente>): void {
  GLOBAL.__mhMotorAmbiente = cargar
}

let motor: MotorAmbiente | null = null
let cargando: Promise<MotorAmbiente | null> | null = null
let pedido: { mood: MoodMusica } | { fadeMs: number } | null = null

function aplicar() {
  if (!motor || !pedido) return
  if ('mood' in pedido) motor.iniciar(pedido.mood)
  else motor.detener(pedido.fadeMs)
}

export function iniciarAmbiente(mood: MoodMusica): void {
  pedido = { mood }
  if (motor) return aplicar()
  const cargar = GLOBAL.__mhMotorAmbiente
  if (!cargar) return
  cargando ??= cargar()
    .then((m) => (motor = m))
    .catch(() => null)
  void cargando.then(aplicar)
}

export function detenerAmbiente(fadeMs = 400): void {
  pedido = { fadeMs }
  aplicar()
}
