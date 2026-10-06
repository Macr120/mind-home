import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'

/** Desde qué altura (px del borde de arriba) asoma la X. */
const BORDE = 6
/** Cuánto sigue visible después de que el ratón baja. */
const ESPERA_MS = 1500

/**
 * La app de escritorio abre en pantalla completa (electron/main.js). Para salir,
 * como en Chrome: al llevar el ratón al borde de arriba asoma una X en el centro
 * y al pulsarla vuelve la ventana con su barra. F11 sigue alternando.
 */
export function SalidaPantallaCompleta() {
  const t = useT()
  const [completa, setCompleta] = useState(false)
  const [visible, setVisible] = useState(false)
  const temporizador = useRef(0)

  useEffect(() => {
    void window.mph?.pantallaCompleta?.().then(setCompleta)
    const alCambiar = (e: Event) => {
      setCompleta((e as CustomEvent<boolean>).detail)
      setVisible(false)
    }
    window.addEventListener('mph:pantalla-completa', alCambiar)
    return () => window.removeEventListener('mph:pantalla-completa', alCambiar)
  }, [])

  useEffect(() => {
    if (!completa) return
    // En captura: la escena 3D y los paneles no deben tragarse el movimiento.
    const alMover = (e: PointerEvent) => {
      if (e.clientY <= BORDE) {
        window.clearTimeout(temporizador.current)
        setVisible(true)
      } else if (e.clientY > 120) {
        window.clearTimeout(temporizador.current)
        temporizador.current = window.setTimeout(() => setVisible(false), ESPERA_MS)
      }
    }
    window.addEventListener('pointermove', alMover, true)
    return () => {
      window.removeEventListener('pointermove', alMover, true)
      window.clearTimeout(temporizador.current)
    }
  }, [completa])

  if (!completa) return null
  const titulo = t('hud.salirPantallaCompleta', 'Salir de la pantalla completa')
  return (
    <button
      type="button"
      onClick={() => void window.mph?.pantallaCompleta?.(false)}
      title={titulo}
      aria-label={titulo}
      className={`fixed start-1/2 top-3 z-[200] grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-black/70 text-2xl text-[#ffffff] shadow-2xl backdrop-blur transition duration-200 hover:bg-black/85 rtl:translate-x-1/2 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-20 opacity-0'
      }`}
    >
      <Icono nombre="cerrar" />
    </button>
  )
}
