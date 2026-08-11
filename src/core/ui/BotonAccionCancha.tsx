import { useEffect, useRef } from 'react'
import { useJuegoCancha, juegoFrame } from '../state/juegoCanchaStore'
import { useHerramienta } from '../state/herramientaStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/**
 * Botón de acción del minijuego de cancha: ocupa el hueco del cubo de vistas
 * mientras juegas. Fútbol/básquet/béisbol = barra de carga (mantener presionado
 * regula la fuerza, soltar ejecuta); tenis = un toque golpea la pelota cuando
 * está en la ventana. Muta `juegoFrame` directamente (patrón de
 * BotonDerrapeCarrera con monturaFrame): cero re-renders. Atajo con la barra
 * espaciadora en PC.
 *
 * Lleva además el interruptor de CORRER (fútbol, tenis y básquet): al ocupar este
 * botón el hueco del cubo desaparece la pila de herramientas, y sin él solo se
 * podía correr con Mayús (o sea, nunca en móvil).
 */
export function BotonAccionCancha() {
  const t = useT()
  const clase = useJuegoCancha((s) => s.clase)
  const fase = useJuegoCancha((s) => s.fase)
  const correr = useHerramienta((s) => s.correr)
  const barraRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const esTap = clase === 'tenis'
  const esBeisbol = clase === 'beisbol'
  // Correr: en todos menos béisbol, donde el bateador está anclado a su caja.
  const conCorrer = clase !== 'beisbol'

  // Barra de carga + resaltado (posesión / ventana de golpeo): rAF local, sin re-render.
  useEffect(() => {
    if (fase !== 'jugando') return
    let raf = 0
    const loop = () => {
      if (barraRef.current && !esTap) barraRef.current.style.width = `${Math.round(juegoFrame.carga * 100)}%`
      if (btnRef.current) {
        // En béisbol el botón se enciende cuando la bola entra en la zona de bateo.
        const activo = esTap || esBeisbol ? juegoFrame.enVentana : juegoFrame.duena === 'yo'
        btnRef.current.style.opacity = activo ? '1' : '0.55'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [fase, esTap, esBeisbol])

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
      if (esTap) juegoFrame.golpe = true
      else juegoFrame.cargando = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || escribiendo()) return
      if (!esTap && juegoFrame.cargando) {
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
  }, [fase, esTap])

  if (fase !== 'jugando' || !clase) return null

  const etiqueta =
    clase === 'futbol'
      ? t('juego.patear', 'Patear')
      : clase === 'basket'
        ? t('juego.tirar', 'Tirar')
        : clase === 'beisbol'
          ? t('juego.batear', 'Batear')
          : t('juego.golpear', 'Golpear')
  const hint =
    clase === 'futbol'
      ? t('juego.hintFutbol', 'Mantén para cargar, suelta para patear (Espacio)')
      : clase === 'basket'
        ? t('juego.hintBasket', 'Mantén para regular la potencia, suelta para tirar (Espacio)')
        : clase === 'beisbol'
          ? t('juego.hintBeisbol', 'Mantén para cargar el swing, suelta cuando la bola te llegue (Espacio)')
          : t('juego.hintTenis', 'Apunta con tu frente y toca para sacar o golpear (Espacio)')
  const press = () => {
    if (esTap) juegoFrame.golpe = true
    else juegoFrame.cargando = true
  }
  const release = () => {
    if (!esTap && juegoFrame.cargando) {
      juegoFrame.cargando = false
      juegoFrame.soltar = true
    }
  }

  return (
    <div className="pointer-events-auto flex w-full flex-col items-center gap-1" style={{ touchAction: 'none' }}>
      {conCorrer && (
        <button
          type="button"
          onClick={() => useHerramienta.getState().setCorrer(!correr)}
          title={t('herr.correr', 'Correr')}
          className={`ui-hud flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border-2 text-xs font-black text-white shadow-lg transition active:scale-95 ${
            correr ? 'border-emerald-400/70 bg-emerald-600/70' : 'border-white/15'
          }`}
        >
          <Icono emoji="🏃" />
          {correr ? t('herr.corriendo', 'Corriendo') : t('herr.correr', 'Correr')}
        </button>
      )}
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
      {!esTap && (
        <div className="h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
          <div ref={barraRef} className="h-full bg-amber-400" style={{ width: '0%' }} />
        </div>
      )}
    </div>
  )
}
