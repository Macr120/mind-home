import { useLiveQuery } from 'dexie-react-hooks'
import { registrosDelDia } from './gamificacion/actividad'
import {
  borrarMetaDiariaManual,
  fijarMetaDiariaManual,
  metasDiariasManualRepo,
  objetivoDiarioDe,
  rutinasRepo,
} from './data/repository'
import { fechaLocalISO } from './fechaLocal'
import { esMeta } from './metas'
import { getPlantilla, type MetaDiaria } from './registry'
import { marcarHecho, tocaFecha } from './rutinas'

/**
 * La meta diaria de cada app: el pulso de hoy. Una app declara la suya en su
 * `Plantilla` solo si es cuantitativa o tiene un objetivo propio; si no, aquí se
 * sintetiza la genérica ("registra algo hoy") desde las mismas fuentes que ya lee
 * la gamificación, así ninguna app duplica ese conocimiento.
 *
 * Se cumple de dos formas y la manual gana: el automático refleja la actividad
 * real, pero el usuario puede decir "lo hice aunque no lo registré" (o lo
 * contrario). El override es por día, así que caduca solo a medianoche.
 */

/** Objetivo por defecto de la meta genérica: un registro basta. */
const OBJETIVO_GENERICO = 1

/** La genérica de una app: cualquier registro de hoy la cumple. */
function metaGenerica(plantillaId: string): MetaDiaria {
  return {
    clave: 'meta.generica',
    etiquetaEs: 'Registra algo hoy',
    del: async (fecha) => ({
      hecho: await registrosDelDia(plantillaId, fecha),
      objetivo: await objetivoDiarioDe(plantillaId, OBJETIVO_GENERICO),
    }),
  }
}

/** La meta de una app: la suya, la genérica, o ninguna si se excluyó. */
export function metaDiariaDe(plantillaId: string): MetaDiaria | null {
  const plantilla = getPlantilla(plantillaId)
  if (!plantilla || plantilla.sinMetaDiaria) return null
  return plantilla.metaDiaria ?? metaGenerica(plantillaId)
}

export interface EstadoMetaDiaria {
  plantillaId: string
  meta: MetaDiaria
  /** Siempre la cifra REAL: el override toca la palomita, nunca el número. */
  avance: { hecho: number; objetivo: number; detalle?: string }
  /** Lo que dice la actividad registrada. */
  cumplidaAuto: boolean
  /** Lo que manda: el override manual si existe, si no el automático. */
  cumplida: boolean
  /** Hay palomita a mano ese día (contradiga o confirme al automático). */
  manual: boolean
}

/**
 * Estado de la meta diaria de una app (reactivo). `undefined` = cargando, o la app
 * no tiene meta — quien monta la UI ya lo filtró antes con `metaDiariaDe`.
 */
export function useMetaDiaria(plantillaId: string, fecha?: string): EstadoMetaDiaria | undefined {
  const dia = fecha ?? fechaLocalISO()
  return useLiveQuery(async () => {
    const meta = metaDiariaDe(plantillaId)
    if (!meta) return undefined
    const avance = await meta.del(dia)
    const fila = (await metasDiariasManualRepo.list()).find(
      (m) => m.plantillaId === plantillaId && m.fecha === dia,
    )
    // Sin objetivo (0) la meta está apagada: no se cumple sola ni se avisa.
    const cumplidaAuto = avance.objetivo > 0 && avance.hecho >= avance.objetivo
    return {
      plantillaId,
      meta,
      avance,
      cumplidaAuto,
      cumplida: fila ? fila.hecha : cumplidaAuto,
      manual: fila != null,
    }
  }, [plantillaId, dia])
}

/** Palomea/despalomea a mano la meta de un día: manda sobre el automático. */
export async function marcarMetaDiaria(plantillaId: string, fecha: string, hecha: boolean) {
  await fijarMetaDiariaManual(plantillaId, fecha, hecha)
}

/** Quita el override: ese día vuelve a mandar la actividad real. */
export async function volverAutomatico(plantillaId: string, fecha: string) {
  await borrarMetaDiariaManual(plantillaId, fecha)
}

/**
 * Refleja el estado de la meta en lo agendado: si tienes «Beber agua» a las 20:00
 * y ya cumpliste la meta de cocina, esa ocurrencia aparece palomeada en el
 * calendario sin tener que marcarla otra vez.
 *
 * Las metas del cronograma quedan fuera a propósito: se cumplen una sola vez
 * (`completada`), no un día sí y otro no.
 */
export async function sincronizarAgendaDeMeta(plantillaId: string, fecha: string, cumplida: boolean) {
  const dia = new Date(`${fecha}T12:00`)
  const agendadas = (await rutinasRepo.list()).filter(
    (r) => r.plantillaId === plantillaId && !esMeta(r) && tocaFecha(r, dia),
  )
  for (const r of agendadas) await marcarHecho(r, fecha, cumplida)
}
