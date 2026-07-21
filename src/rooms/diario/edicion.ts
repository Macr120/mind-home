import type { EdicionDiario } from '../../core/data/db'
import { edicionesDiarioRepo, lecturasDiarioRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { useAjustes } from '../../core/state/ajustesStore'
import { cargarTitulares } from './fuentes'
import { cargarEfemerides } from './efemerides'

let cargando: Promise<EdicionDiario> | null = null

/**
 * Edición efímera del día: borra las de días anteriores y genera la de hoy si
 * no existe (o si `forzar`, o si cambió el idioma). Si la red falla y ya hay
 * edición de hoy, la conserva; si no hay nada, lanza error.
 */
export async function obtenerEdicion(forzar = false): Promise<EdicionDiario> {
  if (cargando) return cargando
  cargando = (async () => {
    const hoy = fechaLocalISO()
    const idioma = useAjustes.getState().idioma
    const filas = await edicionesDiarioRepo.list()
    for (const f of filas) {
      if (f.fecha !== hoy && f.id != null) await edicionesDiarioRepo.remove(f.id)
    }
    const previa = filas.find((f) => f.fecha === hoy)
    if (previa && !forzar && previa.idioma === idioma) return previa

    const [titulares, efemerides] = await Promise.all([
      cargarTitulares(hoy, idioma),
      cargarEfemerides(hoy, idioma),
    ])
    if (!titulares.length && !efemerides.length) {
      if (previa) return previa
      throw new Error('Sin conexión con las fuentes del diario')
    }

    if (previa?.id != null) {
      await edicionesDiarioRepo.update(previa.id, { titulares, efemerides, idioma })
      return { ...previa, titulares, efemerides, idioma }
    }
    const id = await edicionesDiarioRepo.add({ fecha: hoy, titulares, efemerides, idioma })
    return { id, fecha: hoy, titulares, efemerides, idioma }
  })()
  try {
    return await cargando
  } finally {
    cargando = null
  }
}

/** ¿La edición guardada quedó de otro día o de otro idioma? (rollover de medianoche). */
export async function edicionDesactualizada(): Promise<boolean> {
  const hoy = fechaLocalISO()
  const idioma = useAjustes.getState().idioma
  const filas = await edicionesDiarioRepo.list()
  return filas.length > 0 && filas.some((f) => f.fecha !== hoy || f.idioma !== idioma)
}

/** Deja constancia (una vez por día) de que se abrió el diario — para el progreso. */
export async function marcarVisto(): Promise<void> {
  const hoy = fechaLocalISO()
  const lecturas = await lecturasDiarioRepo.list()
  if (!lecturas.some((l) => l.fecha === hoy)) await lecturasDiarioRepo.add({ fecha: hoy })
}
