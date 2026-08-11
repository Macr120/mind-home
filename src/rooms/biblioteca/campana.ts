let ctx: AudioContext | undefined

/** Do5: el tono de siempre, el que marca el fin de un tramo de trabajo. */
export const CAMPANA_TRABAJO = 523.25
/** Sol4, una cuarta abajo: el descanso suena distinto sin sonar a error. */
export const CAMPANA_DESCANSO = 392

/**
 * Campana sintetizada (sin assets) que marca el fin de una sesión de estudio:
 * tres parciales de un cuenco con decaimiento largo. `veces` golpes cada 1.2 s.
 * (Copia local de la campana del jardín: los cuartos no se importan entre sí.)
 *
 * `base` es la fundamental en Hz: los parciales se derivan de ella, así que
 * cambiarla transporta la campana entera sin desafinar el timbre.
 */
export function tocarCampana(veces = 1, base = CAMPANA_TRABAJO) {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()

    const golpe = (t: number) => {
      const parciales: [number, number][] = [
        [base, 0.4],
        [base * 2, 0.18],
        [base * 3, 0.08],
      ]
      for (const [freq, vol] of parciales) {
        const osc = ctx!.createOscillator()
        const gain = ctx!.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(vol, t + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5)
        osc.connect(gain)
        gain.connect(ctx!.destination)
        osc.start(t)
        osc.stop(t + 3.6)
      }
    }

    for (let i = 0; i < veces; i++) golpe(ctx.currentTime + i * 1.2)
  } catch {
    // Sin audio disponible: la sesión termina sin campana.
  }
}
