/** Pitido corto para avisar del fin de una cuenta (WebAudio, sin archivos). */
export function pitar() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    g.gain.setValueAtTime(0.2, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    setTimeout(() => {
      o.stop()
      void ctx.close()
    }, 450)
  } catch {
    // Sin audio disponible: el temporizador sigue funcionando en silencio.
  }
}
