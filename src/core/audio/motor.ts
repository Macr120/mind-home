import { useAjustes } from '../state/ajustesStore'

/**
 * Motor de audio de la MÚSICA: un AudioContext compartido + gain maestro al que
 * se conectan la música generada y las pistas del usuario, con el volumen del
 * ajuste `mh.musica.volumen`. Los sonidos puntuales existentes (campanas, bips,
 * alarma) conservan sus contextos propios a propósito: no son música y no deben
 * depender de este volumen.
 */

let ctx: AudioContext | null = null
let maestro: GainNode | null = null

function crear(): void {
  if (ctx) return
  try {
    ctx = new AudioContext()
    maestro = ctx.createGain()
    maestro.gain.value = useAjustes.getState().musicaVolumen
    maestro.connect(ctx.destination)
  } catch {
    // Sin Web Audio disponible: todo sigue funcionando en silencio.
    ctx = null
    maestro = null
  }
}

/** Contexto compartido (lo crea si no existía); null si el navegador no puede. */
export function contextoAudio(): AudioContext | null {
  crear()
  return ctx
}

/** Gain maestro de la música (volumen global). */
export function gainMaestro(): GainNode | null {
  crear()
  return maestro
}

/**
 * Desbloqueo de la política de autoplay: llamar SIEMPRE desde un gesto del
 * usuario (clic/tap). Crear o reanudar el contexto dentro del gesto lo deja
 * 'running'; fuera de un gesto el navegador lo mantiene 'suspended'.
 */
export function desbloquearAudio(): void {
  crear()
  if (ctx?.state === 'suspended') void ctx.resume()
}

export const audioListo = (): boolean => ctx != null && ctx.state === 'running'

// El volumen del ajuste se aplica al maestro con una rampa corta (sin clicks).
useAjustes.subscribe((s, prev) => {
  if (s.musicaVolumen === prev.musicaVolumen || !ctx || !maestro) return
  maestro.gain.setTargetAtTime(s.musicaVolumen, ctx.currentTime, 0.05)
})
