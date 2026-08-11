import { useLayoutEffect, useRef, type RefObject } from 'react'
import { insertarNotacion } from './notaciones'

/**
 * Escribir una notación en un campo de texto DEJANDO EL CURSOR en su hueco.
 *
 * El cursor se coloca en un `useLayoutEffect` y no justo después de escribir
 * porque React repinta el `value` del input DESPUÉS del handler: cualquier
 * `setSelectionRange` anterior al repintado se pierde y el cursor acaba al
 * final (probado: `sqrt()` dejaba el cursor fuera del paréntesis).
 */
export function useInsercion(
  valor: string,
  setValor: (v: string) => void,
  campo: RefObject<HTMLInputElement | null>,
  /** Retoque del texto antes de insertar (la hoja le antepone el «=»). */
  preparar?: (v: string) => string,
): (escribe: string) => void {
  const pendiente = useRef<number | null>(null)

  useLayoutEffect(() => {
    const cursor = pendiente.current
    if (cursor == null) return
    pendiente.current = null
    const el = campo.current
    if (!el) return
    el.focus()
    el.setSelectionRange(cursor, cursor)
  })

  return (escribe: string) => {
    const base = preparar ? preparar(valor) : valor
    // Lo que crece el texto al prepararlo desplaza el cursor la misma medida.
    const desplazo = base.length - valor.length
    const el = campo.current
    // Sin el foco puesto no hay cursor de verdad: un input que nadie ha tocado
    // dice 0, y escribir al PRINCIPIO no es lo que espera nadie. Se va al final.
    const enFoco = !!el && document.activeElement === el
    const punto = enFoco ? (el.selectionStart ?? valor.length) : valor.length
    const fin = enFoco ? (el.selectionEnd ?? punto) : valor.length
    const desde = Math.max(desplazo, punto + desplazo)
    const hasta = Math.max(desplazo, fin + desplazo)
    const r = insertarNotacion(base, escribe, desde, hasta)
    setValor(r.texto)
    pendiente.current = r.cursor
  }
}
