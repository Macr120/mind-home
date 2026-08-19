import { useCallback, useLayoutEffect, useRef } from 'react'
import { useHud } from '../state/hudStore'

/**
 * Publica en el store cuánto ocupa un bloque de la banda INFERIOR del HUD (px
 * desde el borde de abajo hasta su parte superior). Devuelve el `ref` que hay
 * que poner en su contenedor. Lo consume `PilaPrompts` para colocar los prompts
 * contextuales encima de todos ellos, sin taparlos.
 */
/**
 * Anclaje horizontal de la barra del chat (offsets laterales, sin el `bottom`).
 * Lo comparte la caja del diálogo cara a cara, que se apoya justo encima del
 * chat y debe medir exactamente lo mismo.
 * start-44: margen al joystick (izq.); end-48: hueco del cubo y las flechas
 * de rotación (der.). Con el menú lateral abierto arranca tras sus 15rem.
 */
export function anclajeChat(menuAbierto: boolean): string {
  return menuAbierto ? 'start-60 end-4 sm:end-48' : 'start-4 end-4 sm:start-44 sm:end-48'
}

export function useTopeHud(clave: string) {
  const ref = useRef<HTMLDivElement>(null)
  const medir = useCallback(() => {
    const el = ref.current
    // Sin nodo (el bloque se plegó o se ocultó): ya no ocupa banda inferior.
    if (!el) {
      useHud.getState().setTope(clave, 0)
      return
    }
    // Contra la ventana (no contra el padre posicionado): el chat mide desde su
    // propio contenedor anclado y se perdería el margen de anclaje.
    const tope = window.innerHeight - el.getBoundingClientRect().top
    useHud.getState().setTope(clave, Math.max(0, Math.round(tope)))
  }, [clave])
  // Sin deps: la posición también cambia sin cambiar de tamaño (p. ej. el abanico
  // de herramientas, que baja al hueco del joystick cuando la esquina se pliega).
  useLayoutEffect(medir)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => {
      ro.disconnect()
      useHud.getState().setTope(clave, 0)
    }
  }, [clave, medir])
  return ref
}
