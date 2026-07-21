let ctx: AudioContext | undefined

/**
 * Campana de meditación sintetizada (sin assets): tres parciales de un
 * cuenco tibetano con decaimiento largo. `veces` golpes separados 1.2 s.
 */
export function tocarCampana(veces = 1) {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()

    const golpe = (t: number) => {
      const parciales: [number, number][] = [
        [523.25, 0.4],
        [1046.5, 0.18],
        [1567.98, 0.08],
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
    // Sin audio disponible: la sesión sigue sin campana.
  }
}
