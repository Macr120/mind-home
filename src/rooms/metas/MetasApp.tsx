import { useMemo, useState } from 'react'
import type { Rutina } from '../../core/data/db'
import { rutinasRepo } from '../../core/data/repository'
import { visibles } from '../../core/data/ejemplos'
import { esMeta } from '../../core/metas'
import { Cronograma } from '../../core/ui/metas/Cronograma'

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Cronograma metas={metas} metaArmada={armada} onArmar={setArmada} />
    </div>
  )
}
