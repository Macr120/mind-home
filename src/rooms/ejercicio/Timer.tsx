import { useEffect, useRef, useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Pitido corto al terminar la cuenta (WebAudio, sin archivos). */
function pitar() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
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

/**
 * Cronómetro de cuenta regresiva para cronometrar posturas / descansos.
 * `segundos` + `nonce`: al cambiar el nonce se recarga con esos segundos
 * (lo usa el botón ⏱ de cada fila para precargar el tiempo de la postura).
 */
export function Timer({
  segundos = 30,
  nonce = 0,
  color = '#a78bfa',
}: {
  segundos?: number
  nonce?: number
  color?: string
}) {
  const t = useT()
  const [total, setTotal] = useState(segundos > 0 ? segundos : 30)
  const [restante, setRestante] = useState(segundos > 0 ? segundos : 30)
  const [corriendo, setCorriendo] = useState(false)
  // Momento (época ms) en que debe terminar el conteo en curso.
  const finRef = useRef(0)

  // Recarga al pulsar ⏱ en una fila (nonce cambia): ajuste en render, sin efecto.
  const [prevNonce, setPrevNonce] = useState(nonce)
  if (nonce !== prevNonce) {
    setPrevNonce(nonce)
    const s = segundos > 0 ? segundos : 30
    setTotal(s)
    setRestante(s)
    setCorriendo(false)
  }

  // Conteo contra un deadline: restar, detectar el 0 y pitar pasa TODO en el tick.
  // clearInterval inmediato al llegar a 0 garantiza un solo pitido.
  useEffect(() => {
    if (!corriendo) return
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((finRef.current - Date.now()) / 1000))
      setRestante(r)
      if (r === 0) {
        clearInterval(id)
        setCorriendo(false)
        pitar()
      }
    }, 250)
    return () => clearInterval(id)
  }, [corriendo])

  const pct = total > 0 ? (restante / total) * 100 : 0

  return (
    <div className="rounded-xl bg-black/20 border border-white/10 p-3">
      <div className="flex items-center gap-3">
        <p className="text-3xl font-black tabular-nums" style={{ color }}>
          {fmt(restante)}
        </p>
        {!corriendo && (
          <label className="text-[10px] text-white/45">
            {t('ejercicio.timer.seg', 'segundos')}
            <input
              type="number"
              value={total}
              onChange={(e) => {
                const v = Math.max(0, parseInt(e.target.value, 10) || 0)
                setTotal(v)
                setRestante(v)
              }}
              className="mt-0.5 w-16 rounded-lg bg-black/30 px-2 py-1 text-sm border border-white/10"
            />
          </label>
        )}
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (corriendo) {
                setCorriendo(false)
                return
              }
              const desde = restante === 0 ? total : restante
              finRef.current = Date.now() + desde * 1000
              setRestante(desde)
              setCorriendo(true)
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-bold texto-cta"
            style={{ background: color }}
          >
            {corriendo ? <Icono nombre="pausa" title={t('ejercicio.timer.pausa', 'Pausa')} /> : <Icono nombre="play" title={t('ejercicio.timer.play', 'Reanudar')} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setRestante(total)
              setCorriendo(false)
            }}
            title={t('ejercicio.timer.reiniciar', 'Reiniciar')}
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm hover:bg-white/20"
          >
            <Icono nombre="rotar-izq" />
          </button>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
