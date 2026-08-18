import type { SideKey } from '../house/walls'
import { PINCELES_DEFAULT } from '../house/murosPuertas'
import { useCuartos } from './cuartosStore'
import { useDiseño } from './disenoStore'
import { useLayout } from './layoutStore'

/**
 * Pintar un cuarto de un color, en los cuatro sitios donde ese color vive.
 *
 * Hacía falta unificarlo porque cada camino hacía la mitad: el editor de planos
 * repintaba muros pero no escribía el override de diseño (y al recargar el color
 * volvía atrás), y la ficha de la pantalla de inicio escribía el dato pero dejaba
 * los muros del color viejo.
 *
 * Piso y techo no aparecen aquí: los derivan solos de `roomColors` mientras el
 * cuarto no tenga un material propio.
 */
export async function pintarCuarto(id: string, color: string, muros: boolean): Promise<void> {
  // El dato canónico y el override que realmente manda en el render 3D
  // (`House.tsx` lee `roomColors[id] ?? cuarto.color`).
  await useCuartos.getState().setColor(id, color)
  await useDiseño.getState().setRoomColor(id, color)
  if (!muros) return

  const { setPinceles, setEdgeEstilo } = useLayout.getState()
  // Merge, nunca reset desde PINCELES_DEFAULT: eso perdería el tipo de muro, el
  // grosor y el pincel de puerta que el usuario haya elegido.
  const pincel = useLayout.getState().pinceles[id] ?? PINCELES_DEFAULT
  await setPinceles(id, { ...pincel, muro: { ...pincel.muro, color } })

  // Las aristas que el usuario materializó al pintar o mover muros llevan su
  // propio color y no miran el pincel: hay que repintarlas una a una.
  for (const clave of arisIndividuales(id)) {
    const [col, row, lado] = clave.split(',')
    await setEdgeEstilo(id, { col: Number(col), row: Number(row) }, lado as SideKey, { muro: { color } })
  }
}

/** Aristas del cuarto con muro pintado a mano (las que `pintarCuarto` repinta). */
export function arisIndividuales(id: string): string[] {
  const estilos = useLayout.getState().edgeStyles[id] ?? {}
  return Object.keys(estilos).filter((k) => estilos[k].muro)
}
