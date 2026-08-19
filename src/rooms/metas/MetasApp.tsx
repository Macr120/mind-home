import { useMemo, useState } from 'react'
import type { Rutina } from '../../core/data/db'
import { rutinasRepo } from '../../core/data/repository'
import { visibles } from '../../core/data/ejemplos'
import type { EventoResuelto } from '../../core/eventosApps'
import { esMeta } from '../../core/metas'
import { useCalendarioFiltro } from '../../core/state/calendarioFiltroStore'
import { appDeRutina } from '../../core/ui/calendario/apps'
import { FiltroApps } from '../../core/ui/calendario/FiltroApps'
import { Cronograma } from '../../core/ui/metas/Cronograma'

/** El filtro reparte eventos y metas; aquí solo hay metas, y la referencia es fija
 *  para no rearmar sus grupos en cada render. */
const SIN_EVENTOS = new Map<string, EventoResuelto[]>()

/**
 * El cuarto de las Metas: el planificador de TODA la casa en sus tres menús
 * (Metas · Planes · Cronograma).
 *
 * Va SIN `ambito` a propósito — es la misma forma en que lo monta el calendario
 * del reloj. Con ámbito el árbol se filtra a una app y el arrastre se apaga
 * (las filas re-enraizadas mentirían sobre su `padreId`); aquí se ve entero, que
 * es justo lo que hace falta para reordenarlo y para que una meta de cocina
 * pueda colgar de una meta general.
 */
export function MetasApp() {
  const todas = rutinasRepo.useAll()
  // Meta «armada» para trazarle fechas arrastrando sobre el eje.
  const [armada, setArmada] = useState<Rutina | null>(null)

  const metas = useMemo(() => visibles(todas ?? []).filter(esMeta), [todas])

  /**
   * El filtro por apps del calendario, que se quedó atrás cuando el cronograma se
   * mudó aquí: el store es el mismo (una preferencia del dispositivo), así que
   * encender Cocina en el reloj y entrar a este cuarto enseña lo mismo.
   *
   * Se recorta el ARRAY y no `filasVisibles` porque la lista, el tablero y los
   * planes no pasan por ella: agrupan el array por su cuenta. Es el mismo camino
   * que ya usa `ambito`, y por eso `Cronograma` apaga el arrastre mientras esté
   * puesto. Al filtro se le da la lista COMPLETA: con la recortada, apagar una app
   * la borraría de su propia lista de chips.
   */
  const apps = useCalendarioFiltro((s) => s.apps)
  const suyas = useMemo(
    () => (apps.size === 0 ? metas : metas.filter((m) => apps.has(appDeRutina(m)))),
    [metas, apps],
  )

  return (
    <Cronograma
      metas={suyas}
      metaArmada={armada}
      onArmar={setArmada}
      filtro={<FiltroApps rutinas={metas} eventos={SIN_EVENTOS} />}
    />
  )
}
