import { useEffect, useRef, useState } from 'react'

/**
 * «Usar rutina» llena el formulario de registro, que vive DEBAJO de la
 * biblioteca de rutinas: con la biblioteca abierta el formulario cae fuera de
 * pantalla y el botón parecía no hacer nada. Esto lo trae a la vista.
 *
 * Va con contador + efecto y no con un `scrollIntoView` dentro del `onClick`
 * porque «Usar rutina» también se pulsa desde el plan del día, que antes cambia
 * de sub-pestaña: ahí el formulario todavía no está montado. El efecto corre
 * después del render, cuando ya existe.
 */
export function useFocoRegistro<T extends HTMLElement = HTMLDivElement>() {
  const refRegistro = useRef<T>(null)
  const [pedido, setPedido] = useState(0)

  useEffect(() => {
    if (pedido) refRegistro.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [pedido])

  return { refRegistro, irAlRegistro: () => setPedido((n) => n + 1) }
}
