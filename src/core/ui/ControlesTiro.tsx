import { useEffect, useRef } from 'react'
import { useHerramienta } from '../state/herramientaStore'
import { usePaintball, paintballFrame, CADENCIA_JUGADOR } from '../state/paintballStore'
import { pistolaEnMano, ultimoDisparoVisible } from '../house/arma'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Controles de tiro compartidos por la batalla de paintball y la marcadora/láser
 * sueltos de la rueda: botón de fuego SOSTENIDO (mantener = ráfaga con cadencia)
 * y botón de apuntar. Son la contraparte táctil del ratón en PC (clic izquierdo
 * dispara, clic derecho apunta, ver `ui/Mira.tsx`), así que ambos caminos pasan
 * por `setFuegoSostenido` y por `setApuntar` y se comportan igual.
 */

/** Cadencia del arma suelta (en batalla la lleva el runtime del modo). */
const CADENCIA_LASER = 260

// Fuego sostenido: un solo rAF a nivel de módulo, lo compartan el botón, la
// barra espaciadora o el clic izquierdo (ver `ui/Mira.tsx`).
let rafFuego = 0
let ultimoTiro = 0

export function setFuegoSostenido(v: boolean): void {
  if (!v) {
    if (rafFuego) cancelAnimationFrame(rafFuego)
    rafFuego = 0
    paintballFrame.disparar = false
    return
  }
  if (rafFuego) return
  const paso = () => {
    rafFuego = requestAnimationFrame(paso)
    // En batalla dispara el runtime (lleva su propia cadencia y su color).
    if (usePaintball.getState().fase === 'jugando') {
      paintballFrame.disparar = true
      return
    }
    paintballFrame.disparar = false
    const arma = pistolaEnMano(useHerramienta.getState().equipadas)
    if (arma !== 'pintura' && arma !== 'laser') return
    const ahora = performance.now()
    const cadencia = arma === 'pintura' ? CADENCIA_JUGADOR : CADENCIA_LASER
    if (ahora - ultimoTiro < cadencia) return
    ultimoTiro = ahora
    useHerramienta.getState().disparar()
  }
  paso()
}

/** Botón grande de fuego, con barra de recarga que se rellena entre tiros. */
export function BotonDisparar({ ancho = 'w-20' }: { ancho?: string }) {
  const t = useT()
  const barraRef = useRef<HTMLDivElement>(null)

  // Barra de recarga: rAF local leyendo el instante del último tiro (sin re-render).
  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (barraRef.current) {
        const pct = Math.min(1, (performance.now() - ultimoDisparoVisible()) / CADENCIA_JUGADOR)
        barraRef.current.style.width = `${Math.round(pct * 100)}%`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Barra espaciadora: mantener = ráfaga (mismo camino que el botón).
  useEffect(() => {
    const escribiendo = () => {
      const el = document.activeElement as HTMLElement | null
      return (
        !!el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      )
    }
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || escribiendo()) return
      e.preventDefault()
      setFuegoSostenido(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || escribiendo()) return
      setFuegoSostenido(false)
    }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
      setFuegoSostenido(false)
    }
  }, [])

  return (
    <div className={`pointer-events-auto flex ${ancho} flex-col items-center gap-1`} style={{ touchAction: 'none' }}>
      <button
        type="button"
        title={t('tiro.hintDisparar', 'Mantén para disparar (clic izquierdo o Espacio)')}
        onPointerDown={() => setFuegoSostenido(true)}
        onPointerUp={() => setFuegoSostenido(false)}
        onPointerLeave={() => setFuegoSostenido(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="ui-panel-glass grid h-20 w-20 place-items-center rounded-full border-4 border-sky-400/70 shadow-xl backdrop-blur-md transition active:scale-90"
      >
        <Icono nombre="paintball" className="text-4xl leading-none" />
      </button>
      <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
        <div ref={barraRef} className="h-full bg-sky-400" style={{ width: '100%' }} />
      </div>
    </div>
  )
}

/**
 * Botón de apuntar: con el dedo es un interruptor (para poder mirar con la otra
 * mano); con el ratón se mantiene, como el clic derecho.
 */
export function BotonApuntar() {
  const t = useT()
  const apuntando = useHerramienta((s) => s.apuntando)
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        const h = useHerramienta.getState()
        h.setApuntar(e.pointerType === 'touch' ? !apuntando : true)
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'touch') useHerramienta.getState().setApuntar(false)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') useHerramienta.getState().setApuntar(false)
      }}
      onContextMenu={(e) => e.preventDefault()}
      title={t('tiro.hintApuntar', 'Apuntar (clic derecho en PC; con el dedo, toca para fijar)')}
      style={{ touchAction: 'none' }}
      className={`ui-panel-glass pointer-events-auto grid h-14 w-14 place-items-center rounded-full border-2 shadow-xl backdrop-blur-md transition active:scale-90 ${
        apuntando ? 'border-sky-300 bg-sky-500/30' : 'border-white/20'
      }`}
    >
      <Icono nombre="objetivo" className="text-2xl leading-none" />
    </button>
  )
}

/** Pareja apuntar + disparar (la usan el HUD de batalla y el panel del arma). */
export function ControlesTiro() {
  return (
    <div className="flex flex-col items-center gap-2">
      <BotonApuntar />
      <BotonDisparar />
    </div>
  )
}
