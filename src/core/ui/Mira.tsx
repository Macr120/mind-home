import { useEffect, useRef, useState } from 'react'
import { useHerramienta } from '../state/herramientaStore'
import { useCam } from '../state/cameraStore'
import { usePaintball, paintballFrame } from '../state/paintballStore'
import { miraFrame } from '../state/miraFrame'
import { esArmaDeTiro } from '../house/arma'
import { cursorPuntero } from '../house/punteria'
import { setFuegoSostenido } from './ControlesTiro'
import { useT } from '../i18n/useT'

/** Posición por defecto de la mira: centrada (sin cursor rastreado todavía, o fuera del lienzo). */
function centrarMira(el: HTMLDivElement | null) {
  if (!el) return
  el.style.left = '50%'
  el.style.top = '50%'
  el.style.transform = 'translate(-50%, -50%)'
}

/**
 * Mira de shooter: en PC el CURSOR REAL es la mira. Se oculta la flecha del
 * sistema mientras está sobre el lienzo y el gráfico de la mira ocupa su lugar
 * exacto; el disparo va literalmente hacia donde señala (raycast, ver
 * `house/punteria.ts`), sin capturar el ratón ni pedir ningún clic previo.
 * Clic izquierdo dispara, clic derecho apunta (acerca la cámara y cierra el
 * ángulo). Fuera del lienzo (sobre el HUD) se recupera el cursor normal y se
 * apunta con el frente de la cámara, igual que en móvil (arrastrar/joystick de
 * vista + los botones de `ui/ControlesTiro.tsx`).
 */
export function Mira() {
  const t = useT()
  const equipadas = useHerramienta((s) => s.equipadas)
  const apuntando = useHerramienta((s) => s.apuntando)
  const vista = useCam((s) => s.vista)
  const fase = usePaintball((s) => s.fase)
  const [conRaton] = useState(() => window.matchMedia('(pointer: fine)').matches)
  const [dentro, setDentro] = useState(false)
  const miraRef = useRef<HTMLDivElement>(null)
  const enBatalla = fase === 'cuenta' || fase === 'jugando'
  const conArma = equipadas.some(esArmaDeTiro)
  const activa = (enBatalla || conArma) && (vista === 'tercera' || vista === 'primera')

  // Con arma en la mano la cámara se va al hombro (si no, el avatar tapa la mira).
  useEffect(() => {
    miraFrame.conArma = activa
    return () => {
      miraFrame.conArma = false
    }
  }, [activa])

  // Posición inicial de la mira: centrada, hasta el primer movimiento del ratón.
  useEffect(() => {
    centrarMira(miraRef.current)
  }, [])

  // El cursor real es la mira: se sigue su posición sobre el lienzo (sin
  // capturarlo) y se dispara hacia donde señala (`cursorPuntero` en punteria.ts).
  useEffect(() => {
    if (!activa || !conRaton) return
    // Selector específico: la casa tiene varios <canvas> a la vez (ViewCube, el
    // preview del personaje del side menu…) y uno cualquiera daría un rectángulo
    // equivocado para mapear el cursor. R3F pone los props extra del <Canvas> en
    // el div que lo envuelve, no en el <canvas> mismo.
    const lienzo = document.querySelector<HTMLCanvasElement>('[data-lienzo-casa] canvas')
    if (!lienzo) return

    const mover = (e: MouseEvent) => {
      const r = lienzo.getBoundingClientRect()
      const sobre = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      cursorPuntero.activo = sobre
      if (!sobre) {
        centrarMira(miraRef.current)
        setDentro(false)
        return
      }
      cursorPuntero.x = ((e.clientX - r.left) / r.width) * 2 - 1
      cursorPuntero.y = -((e.clientY - r.top) / r.height) * 2 + 1
      const el = miraRef.current
      if (el) {
        el.style.left = `${e.clientX}px`
        el.style.top = `${e.clientY}px`
        el.style.transform = 'translate(-50%, -50%)'
      }
      setDentro((d) => (d ? d : true))
    }
    // Los clics fuera del lienzo (HUD: botones, paneles) no disparan ni apuntan.
    const abajo = (e: MouseEvent) => {
      if (!cursorPuntero.activo) return
      if (e.button === 0) setFuegoSostenido(true)
      else if (e.button === 2) useHerramienta.getState().setApuntar(true)
    }
    const arriba = (e: MouseEvent) => {
      if (e.button === 0) setFuegoSostenido(false)
      else if (e.button === 2) useHerramienta.getState().setApuntar(false)
    }
    // Cambiar de pestaña con el ratón sobre el lienzo no debe dejarlo disparando.
    const salir = () => {
      cursorPuntero.activo = false
      setDentro(false)
      centrarMira(miraRef.current)
    }

    lienzo.style.cursor = 'none'
    window.addEventListener('mousemove', mover)
    window.addEventListener('mousedown', abajo)
    window.addEventListener('mouseup', arriba)
    window.addEventListener('blur', salir)
    return () => {
      lienzo.style.cursor = ''
      cursorPuntero.activo = false
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mousedown', abajo)
      window.removeEventListener('mouseup', arriba)
      window.removeEventListener('blur', salir)
      setFuegoSostenido(false)
    }
  }, [activa, conRaton])

  // Al guardar el arma o cambiar a una vista sin mira, la puntería se baja sola.
  useEffect(() => {
    if (!activa && (apuntando || paintballFrame.disparar)) {
      useHerramienta.getState().setApuntar(false)
      setFuegoSostenido(false)
    }
  }, [activa, apuntando])

  // Y si la mira se desmonta (abrir el editor, entrar a un cuarto…), ni la
  // cámara se queda pegada al hombro ni el arma sigue disparando.
  useEffect(
    () => () => {
      useHerramienta.getState().setApuntar(false)
      setFuegoSostenido(false)
    },
    [],
  )

  if (!activa) return null
  // Apuntando: brazos cortos y pegados al centro (precisión); en cadera, abiertos.
  const hueco = apuntando ? 5 : 11
  const largo = apuntando ? 7 : 10
  const color = apuntando ? '#7dd3fc' : 'rgba(255,255,255,0.85)'
  const brazo = (estilo: React.CSSProperties) => (
    <span
      className="absolute rounded-full"
      style={{ background: color, boxShadow: '0 0 2px rgba(0,0,0,0.9)', ...estilo }}
    />
  )
  return (
    <div ref={miraRef} className="pointer-events-none fixed z-20 h-12 w-12">
      <div className="relative h-full w-full">
        {/* punto central */}
        <span
          className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: color, boxShadow: '0 0 2px rgba(0,0,0,0.9)' }}
        />
        {brazo({ left: '50%', top: `calc(50% - ${hueco + largo}px)`, width: 2, height: largo, marginLeft: -1 })}
        {brazo({ left: '50%', top: `calc(50% + ${hueco}px)`, width: 2, height: largo, marginLeft: -1 })}
        {brazo({ top: '50%', left: `calc(50% - ${hueco + largo}px)`, height: 2, width: largo, marginTop: -1 })}
        {brazo({ top: '50%', left: `calc(50% + ${hueco}px)`, height: 2, width: largo, marginTop: -1 })}
      </div>
      {/* Antes de mover el ratón sobre la escena (o si salió de ella): pista breve. */}
      {conRaton && !dentro && (
        <p className="absolute bottom-24 left-1/2 w-max -translate-x-1/2 px-3 py-1 text-center text-[11px] font-semibold text-white/60 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
          {t('tiro.apuntarConRaton', 'Apunta moviendo el ratón sobre la escena')}
        </p>
      )}
    </div>
  )
}
