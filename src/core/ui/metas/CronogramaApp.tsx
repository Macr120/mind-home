import { useEffect, useMemo, useState } from 'react'
import type { Rutina } from '../../data/db'
import { rutinasRepo } from '../../data/repository'
import { esMeta } from '../../metas'
import { getPlantilla } from '../../registry'
import { Cronograma } from './Cronograma'

/**
 * El cronograma de UNA app, embebido en su pestaña: las mismas metas del
 * calendario, filtradas a las suyas. Las nuevas nacen ya con su `plantillaId`.
 *
 * Es el mismo componente que la vista Cronograma del calendario — solo cambia lo
 * que se le pasa por `metas`.
 *
 * Con `ambitoId` baja un escalón más: el cronograma de UNA cosa de la app (un
 * hobby, un proyecto). Sin él se ven todas las de la app, como siempre.
 */
export function CronogramaApp({
  plantillaId,
  ambitoId,
}: {
  plantillaId: string
  ambitoId?: string
}) {
  const todas = rutinasRepo.useAll()
  const [armada, setArmada] = useState<Rutina | null>(null)
  // Meta de ejemplo del dominio de la app (si la app acota su planificador).
  const [ejemplo, setEjemplo] = useState<string | undefined>()

  useEffect(() => {
    let vivo = true
    void getPlantilla(plantillaId)
      ?.planMetas?.(ambitoId)
      .then((c) => {
        if (vivo) setEjemplo(c.ejemplo)
      })
    return () => {
      vivo = false
    }
  }, [plantillaId, ambitoId])

  const metas = useMemo(() => {
    const mias = (todas ?? []).filter(
      (r) => esMeta(r) && r.plantillaId === plantillaId && (!ambitoId || r.ambitoId === ambitoId),
    )
    const ids = new Set(mias.map((m) => m.id))
    // Re-enraiza SOLO para esta vista. `raices` toma las de `padreId === undefined`,
    // así que una meta de esta app colgada de una meta general (que aquí no está)
    // no saldría ni como raíz ni como hija: desaparecería de su propio cronograma.
    // Por esto mismo el árbol va sin arrastre (ver la prop `ambito`): mover una fila
    // re-enraizada escribiría este `padreId` de mentira y la desgajaría de verdad.
    return mias.map((m) =>
      m.padreId != null && !ids.has(m.padreId) ? { ...m, padreId: undefined } : m,
    )
  }, [todas, plantillaId, ambitoId])

  return (
    <Cronograma
      metas={metas}
      metaArmada={armada}
      onArmar={setArmada}
      ambito={plantillaId}
      ambitoId={ambitoId}
      ejemplo={ejemplo}
    />
  )
}
