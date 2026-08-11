import { useLiveQuery } from 'dexie-react-hooks'
import { registrosDelDia } from './gamificacion/actividad'
import { db, type EjecucionRutina, type Rutina } from './data/db'
import {
  borrarMetaDiariaManual,
  fijarMetaDiariaManual,
  metasDiariasManualRepo,
  objetivoDiarioDe,
  rutinasRepo,
} from './data/repository'
import { DIA_MS, fechaLocalISO } from './fechaLocal'
import { esMeta, rangoDe, vigenteEn } from './metas'
import { getPlantilla, type ObjetivoDia } from './registry'
import { marcarHecho, tocaFecha } from './rutinas'

/**
 * Los objetivos del día de cada app: el pulso de hoy. Una app declara los suyos en
 * su `Plantilla` (`objetivosDia`, o `metaDiaria` si solo tiene uno) cuando son
 * cuantitativos o tienen un objetivo propio; si no, aquí se sintetiza el genérico
 * ("registra algo hoy") desde las mismas fuentes que ya lee la gamificación, así
 * ninguna app duplica ese conocimiento.
 *
 * Se cumplen de dos formas y la manual gana: el automático refleja la actividad
 * real, pero el usuario puede decir "lo hice aunque no lo registré" (o lo
 * contrario). El override es por día, así que caduca solo a medianoche.
 */

/** Objetivo por defecto del genérico: un registro basta. */
const OBJETIVO_GENERICO = 1

/** El genérico de una app: cualquier registro de hoy lo cumple. */
function metaGenerica(plantillaId: string): ObjetivoDia {
  return {
    clave: 'meta.generica',
    etiquetaEs: 'Registra algo hoy',
    ajustable: true,
    del: async (fecha) => ({
      hecho: await registrosDelDia(plantillaId, fecha),
      objetivo: await objetivoDiarioDe(plantillaId, OBJETIVO_GENERICO),
    }),
  }
}

/**
 * Los objetivos del día de una app: los suyos, el genérico, o ninguno si se
 * excluyó. El primero es el PRINCIPAL — el que avisa, el que sale en el widget y
 * el que se palomea sin clave.
 */
export function objetivosDiaDe(plantillaId: string): ObjetivoDia[] {
  const plantilla = getPlantilla(plantillaId)
  if (!plantilla || plantilla.sinMetaDiaria) return []
  if (plantilla.objetivosDia?.length) return plantilla.objetivosDia
  return [plantilla.metaDiaria ?? metaGenerica(plantillaId)]
}

/** El objetivo principal de una app (la vieja meta diaria), o ninguno. */
export function metaDiariaDe(plantillaId: string): ObjetivoDia | null {
  return objetivosDiaDe(plantillaId)[0] ?? null
}

/** Uno de los objetivos de una app, por su clave. */
export function objetivoDia(plantillaId: string, clave: string): ObjetivoDia | undefined {
  return objetivosDiaDe(plantillaId).find((o) => o.clave === clave)
}

/**
 * Con qué clave se guardan las filas de un objetivo (su palomita a mano y su
 * objetivo configurado): el PRINCIPAL va con la clave vacía, que es como se
 * escribieron todas antes de que una app pudiera tener varios objetivos. Así las
 * filas viejas y las que escriben las apps con `objetivoDiarioDe` siguen valiendo.
 */
export function claveObjetivoDiario(plantillaId: string, clave: string): string {
  return metaDiariaDe(plantillaId)?.clave === clave ? '' : clave
}

/** La misma clave para `metasDiariasManual`, donde el principal va sin campo. */
const claveManual = (plantillaId: string, clave: string): string | undefined =>
  claveObjetivoDiario(plantillaId, clave) || undefined

/**
 * El objetivo que manda hoy: el que calculó la app, o el que pida una meta suya
 * vigente ese día («2.5 L mientras dure la fase base»). Con varias metas pidiendo
 * lo mismo gana la más exigente: bajar el listón porque además hay viva una meta
 * más floja sería regalar el día.
 *
 * Una meta también puede ENCENDER un objetivo que la app dejó en 0: es justo lo
 * que significa proponerse algo que hasta ahora no te pedía nadie.
 */
async function objetivoVigente(
  plantillaId: string,
  clave: string,
  fecha: string,
  base: number,
): Promise<{ objetivo: number; deMeta?: string }> {
  const pedidos = (await rutinasRepo.list())
    .filter((r) => esMeta(r) && r.plantillaId === plantillaId && r.objetivosDia?.length && vigenteEn(r, fecha))
    .flatMap((m) => (m.objetivosDia ?? []).filter((o) => o.clave === clave).map((o) => ({ o, m })))
  if (pedidos.length === 0) return { objetivo: base }
  const manda = pedidos.reduce((a, b) => (b.o.valor > a.o.valor ? b : a))
  return manda.o.valor > base
    ? { objetivo: manda.o.valor, deMeta: manda.m.nombre }
    : { objetivo: base }
}

/** Lo que se congeló de ese día, si ya se cerró. */
async function selloDe(
  plantillaId: string,
  clave: string,
  dia: string,
): Promise<{ hecho: number; objetivo: number } | undefined> {
  const suya = claveObjetivoDiario(plantillaId, clave)
  const filas = await db.cumplimientosDiarios.where('[plantillaId+fecha]').equals([plantillaId, dia]).toArray()
  return filas.find((c) => c.clave === suya)
}

/** Apps cuyo día ya se selló en esta sesión: evita repasar la BD en cada tic del reloj. */
const selladas = new Set<string>()

/**
 * Congela lo que dieron los objetivos de una app en un día ya cerrado. Se llama con
 * el día ANTERIOR: el de hoy sigue moviéndose y sellarlo lo dejaría a medias.
 *
 * Sella también los apagados (objetivo 0): así el histórico sabe distinguir «ese
 * día no cumpliste» de «ese día no te lo habías propuesto», y no hay que volver a
 * mirarlos cada vez.
 */
export async function sellarDia(plantillaId: string, fecha: string): Promise<void> {
  const memo = `${plantillaId}|${fecha}`
  if (selladas.has(memo)) return
  const objetivos = objetivosDiaDe(plantillaId)
  const yaSelladas = (
    await db.cumplimientosDiarios.where('[plantillaId+fecha]').equals([plantillaId, fecha]).toArray()
  ).map((c) => c.clave)
  for (const o of objetivos) {
    const suya = claveObjetivoDiario(plantillaId, o.clave)
    if (yaSelladas.includes(suya)) continue
    const estado = await estadoObjetivoDia(plantillaId, o.clave, fecha)
    if (!estado) continue
    await db.cumplimientosDiarios.add({
      plantillaId,
      clave: suya,
      fecha,
      hecho: estado.avance.hecho,
      objetivo: estado.avance.objetivo,
    })
  }
  selladas.add(memo)
}

export interface EstadoMetaDiaria {
  plantillaId: string
  meta: ObjetivoDia
  /** Siempre la cifra REAL: el override toca la palomita, nunca el número. */
  avance: { hecho: number; objetivo: number; detalle?: string }
  /** Nombre de la meta que subió el objetivo, si lo subió alguna. */
  deMeta?: string
  /** Lo que dice la actividad registrada. */
  cumplidaAuto: boolean
  /** Lo que manda: el override manual si existe, si no el automático. */
  cumplida: boolean
  /** Hay palomita a mano ese día (contradiga o confirme al automático). */
  manual: boolean
}

/**
 * Estado de UN objetivo del día de una app en una fecha, sin hook, para leerlo
 * fuera de React (snapshot de los widgets nativos). Solo lee Dexie, así que dentro
 * de un `useLiveQuery` sigue siendo reactivo.
 */
export async function estadoObjetivoDia(
  plantillaId: string,
  clave: string,
  dia: string,
): Promise<EstadoMetaDiaria | undefined> {
  const meta = objetivoDia(plantillaId, clave)
  if (!meta) return undefined
  // Un día ya sellado no se recalcula: lo que valió ese día vale para siempre.
  const sello = dia < fechaLocalISO() ? await selloDe(plantillaId, clave, dia) : undefined
  const propio = sello ?? (await meta.del(dia))
  const { objetivo, deMeta } = sello
    ? { objetivo: sello.objetivo, deMeta: undefined }
    : await objetivoVigente(plantillaId, clave, dia, propio.objetivo)
  // Con el listón movido, el `detalle` de la app hablaría del objetivo viejo: se
  // deja que el núcleo arme la fracción con la cifra que de verdad manda.
  const avance = deMeta ? { hecho: propio.hecho, objetivo } : propio
  const claveFila = claveManual(plantillaId, clave)
  const fila = (await metasDiariasManualRepo.list()).find(
    (m) => m.plantillaId === plantillaId && m.fecha === dia && (m.clave ?? '') === (claveFila ?? ''),
  )
  // Sin objetivo (0) está apagado: no se cumple solo ni se avisa.
  const cumplidaAuto = avance.objetivo > 0 && avance.hecho >= avance.objetivo
  return {
    plantillaId,
    meta,
    avance,
    deMeta,
    cumplidaAuto,
    cumplida: fila ? fila.hecha : cumplidaAuto,
    manual: fila != null,
  }
}

/** Estado del objetivo PRINCIPAL de una app (la vieja meta diaria). */
export async function estadoMetaDiaria(
  plantillaId: string,
  dia: string,
): Promise<EstadoMetaDiaria | undefined> {
  const meta = metaDiariaDe(plantillaId)
  if (!meta) return undefined
  return estadoObjetivoDia(plantillaId, meta.clave, dia)
}

/**
 * Estado de la meta diaria de una app (reactivo). `undefined` = cargando, o la app
 * no tiene meta — quien monta la UI ya lo filtró antes con `metaDiariaDe`.
 */
export function useMetaDiaria(plantillaId: string, fecha?: string): EstadoMetaDiaria | undefined {
  const dia = fecha ?? fechaLocalISO()
  return useLiveQuery(() => estadoMetaDiaria(plantillaId, dia), [plantillaId, dia])
}

/** Palomea/despalomea a mano un objetivo del día: manda sobre el automático. */
export async function marcarMetaDiaria(
  plantillaId: string,
  fecha: string,
  hecha: boolean,
  clave?: string,
) {
  const suya = clave ?? metaDiariaDe(plantillaId)?.clave
  if (!suya) return
  await fijarMetaDiariaManual(plantillaId, fecha, hecha, claveManual(plantillaId, suya))
}

/** Quita el override: ese día vuelve a mandar la actividad real. */
export async function volverAutomatico(plantillaId: string, fecha: string, clave?: string) {
  const suya = clave ?? metaDiariaDe(plantillaId)?.clave
  if (!suya) return
  await borrarMetaDiariaManual(plantillaId, fecha, claveManual(plantillaId, suya))
}

/**
 * Refleja el estado del objetivo PRINCIPAL en lo agendado: si tienes «Beber agua»
 * a las 20:00 y ya cumpliste el de cocina, esa ocurrencia aparece palomeada en el
 * calendario sin tener que marcarla otra vez.
 *
 * Deja fuera tres cosas a propósito:
 * - Las metas del cronograma: se cumplen una sola vez (`completada`), no un día sí
 *   y otro no.
 * - Los bloques de una ACTIVIDAD concreta de la app (`actividadId`: el desayuno,
 *   la rutina de pierna). Beber agua no es haber desayunado, y darlos por hechos
 *   aquí ponía en «Hechos» un desayuno que no existe. Esos van por su propio
 *   camino: `hechoHoy` de `HorarioActividad`, o su paso al registrarse.
 * - Los bloques que registran solos (su paso lleva `esquemaId`), por lo mismo: su
 *   dato real no está escrito.
 */
export async function sincronizarAgendaDeMeta(plantillaId: string, fecha: string, cumplida: boolean) {
  const dia = new Date(`${fecha}T12:00`)
  const agendadas = (await rutinasRepo.list()).filter(
    (r) =>
      r.plantillaId === plantillaId &&
      !esMeta(r) &&
      !r.actividadId &&
      !r.pasos.some((p) => p.esquemaId) &&
      tocaFecha(r, dia),
  )
  for (const r of agendadas) await marcarHecho(r, fecha, cumplida)
}

/** Un día cuenta si se palomeó la ocurrencia o se hicieron todos sus pasos. */
const diaCumplido = (r: Rutina, e: EjecucionRutina) =>
  !!e.hecho || (r.pasos.length > 0 && e.pasosHechos.length >= r.pasos.length)

/** Cuántas veces pide un bloque en todo el periodo de su meta. */
function vecesPedidas(ritmo: NonNullable<Rutina['ritmo']>, rango: { ini: string; fin: string }): number {
  if (ritmo.porPeriodo === 'total') return ritmo.veces
  const dias =
    Math.round((new Date(`${rango.fin}T12:00`).getTime() - new Date(`${rango.ini}T12:00`).getTime()) / DIA_MS) + 1
  return ritmo.veces * Math.ceil(dias / 7)
}

/**
 * Empuja las metas de una app con lo que ya se hizo: una meta con ritmo («correr
 * 3 veces por semana durante la fase base») se da por cumplida cuando sus bloques
 * suman los días que pedía. Es el camino de vuelta de `sincronizarAgendaDeMeta`:
 * allá la meta manda sobre el día, aquí el día empuja a la meta.
 *
 * Escribe estado en vez de calcularlo al vuelo porque `progresoDe` es SÍNCRONO y
 * lo usan el cronograma, la hoja del plan y `vencida`: volverlo asíncrono para
 * contar ejecuciones obligaría a tocar media UI de metas.
 */
export async function sincronizarMetasDeApp(plantillaId: string, fecha: string): Promise<void> {
  const filas = await rutinasRepo.list()
  const metas = filas.filter(
    (r) => esMeta(r) && r.plantillaId === plantillaId && !r.completada && vigenteEn(r, fecha),
  )
  for (const meta of metas) {
    const rango = rangoDe(meta)
    const bloques = filas.filter((r) => r.deMetaId === meta.id && r.ritmo && r.id != null)
    if (!rango || bloques.length === 0) continue
    let hechos = 0
    let pedidos = 0
    for (const b of bloques) {
      pedidos += vecesPedidas(b.ritmo!, rango)
      const ejecuciones = await db.ejecucionesRutina.where('rutinaId').equals(b.id!).toArray()
      hechos += ejecuciones.filter(
        (e) => e.fecha >= rango.ini && e.fecha <= rango.fin && diaCumplido(b, e),
      ).length
    }
    if (pedidos > 0 && hechos >= pedidos && meta.id != null) {
      await rutinasRepo.update(meta.id, { completada: true })
    }
  }
}

/**
 * Cuánto lleva una meta de ritmo, en días: lo que el cronograma no puede decir
 * (`progresoDe` solo sabe de pasos y sub-metas). Lo pinta su propio detalle.
 */
export async function avanceRitmo(meta: Rutina): Promise<{ hechos: number; pedidos: number } | null> {
  const rango = rangoDe(meta)
  if (!rango) return null
  const bloques = (await rutinasRepo.list()).filter((r) => r.deMetaId === meta.id && r.ritmo && r.id != null)
  if (bloques.length === 0) return null
  let hechos = 0
  let pedidos = 0
  for (const b of bloques) {
    pedidos += vecesPedidas(b.ritmo!, rango)
    const ejecuciones = await db.ejecucionesRutina.where('rutinaId').equals(b.id!).toArray()
    hechos += ejecuciones.filter((e) => e.fecha >= rango.ini && e.fecha <= rango.fin && diaCumplido(b, e)).length
  }
  return { hechos, pedidos }
}
