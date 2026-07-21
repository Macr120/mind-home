import { useEffect, useRef } from 'react'
import { useJuegoCancha, juegoFrame } from '../state/juegoCanchaStore'
import { useT } from '../i18n/useT'

/**
 * Botón de acción del minijuego de cancha: ocupa el hueco del cubo de vistas
 * mientras juegas. Fútbol/básquet = barra de carga (mantener presionado regula la
 * fuerza, soltar ejecuta); tenis = un toque golpea la pelota cuando está en la
 * ventana de rebote. Muta `juegoFrame` directamente (patrón de BotonDerrapeCarrera
 * con monturaFrame): cero re-renders. Atajo con la barra espaciadora en PC.
 */
export function BotonAccionCancha() {
  const t = useT()
  const clase = useJuegoCancha((s) => s.clase)
  const fase = useJuegoCancha((s) => s.fase)
  const barraRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const esTenis = clase === 'tenis'

  // Barra de carga + resaltado (posesión / ventana de golpeo): rAF local, sin re-render.
  useEffect(() => {
    if (fase !== 'jugando') return
    let raf = 0
    const loop = () => {
      if (barraRef.current && !esTenis) barraRef.current.style.width = `${Math.round(juegoFrame.carga * 100)}%`
      if (btnRef.current) {
        const activo = esTenis ? juegoFrame.enVentana : juegoFrame.duena === 'yo'
        btnRef.current.style.opacity = activo ? '1' : '0.55'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [fase, esTenis])

  // Atajo con la barra espaciadora en PC (mantener/soltar; toque en tenis).
  useEffect(() => {
    if (fase !== 'jugando') return
    const escribiendo = () => {
      const el = document.activeElement as HTMLElement | null
      return (
        !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      )
    }
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || escribiendo()) return
      e.preventDefault()
      if (esTenis) juegoFrame.golpe = true
      else juegoFrame.cargando = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || escribiendo()) return
      if (!esTenis && juegoFrame.cargando) {
        juegoFrame.cargando = false
        juegoFrame.soltar = true
      }
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
    }
  }, [fase, esTenis])

  if (fase !== 'jugando' || !clase) return null

  const etiqueta =
    clase === 'futbol'
      ? t('juego.patear', 'Patear')
      : clase === 'basket'
        ? t('juego.tirar', 'Tirar')
        : t('juego.golpear', 'Golpear')
  const hint =
    clase === 'futbol'
      ? t('juego.hintFutbol', 'Mantén para cargar, suelta para patear (Espacio)')
      : clase === 'basket'
        ? t('juego.hintBasket', 'Mantén para regular la potencia, suelta para tirar (Espacio)')
        : t('juego.hintTenis', 'Toca cuando la pelota bote cerca (Espacio)')
  const press = () => {
    if (esTenis) juegoFrame.golpe = true
    else juegoFrame.cargando = true
  }
  const release = () => {
    if (!esTenis && juegoFrame.cargando) {
      juegoFrame.cargando = false
      juegoFrame.soltar = true
    }
  }

  return (
    <div className="pointer-events-auto flex w-full flex-col items-center gap-1" style={{ touchAction: 'none' }}>
      <button
        ref={btnRef}
        type="button"
        title={hint}
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onContextMenu={(e) => e.preventDefault()}
        className="ui-hud grid h-16 w-full place-items-center rounded-xl border-2 border-emerald-400/70 text-sm font-black text-white shadow-xl transition active:scale-95"
      >
        {etiqueta}
      </button>
      {!esTenis && (
        <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
          <div ref={barraRef} className="h-full bg-amber-400" style={{ width: '0%' }} />
        </div>
      )}
    </div>
  )
}
