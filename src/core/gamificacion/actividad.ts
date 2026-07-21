import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { useDiseño } from '../state/disenoStore'
import { fechaLocalISO } from '../fechaLocal'

/**
 * Gamificación tipo tamagotchi: el personaje "vive" de la actividad real del
 * usuario en las apps que eligió como enfoque (las plantillas asignadas a un
 * cuarto). No hay tabla nueva: todo se calcula de los registros existentes,
 * así el progreso siempre refleja los datos reales.
 */

const hoyISO = () => fechaLocalISO()

const diaMs = 86_400_000
const restarDias = (n: number) =>
  fechaLocalISO(new Date(Date.now() - n * diaMs))

/** Fechas (yyyy-mm-dd) con actividad registrada, por plantilla. También la
 * consume el Wrapped (core/wrapped/resumen.ts) para que "día activo" signifique
 * lo mismo en toda la app. */
export const FUENTES: Record<string, () => Promise<string[]>> = {
  cocina: async () => [
    ...(await db.registrosComida.toArray()).map((r) => r.fecha),
    ...(await db.registrosAgua.toArray()).map((r) => r.fecha),
  ],
  ejercicio: async () => (await db.sesionesEjercicio.toArray()).map((r) => r.fecha),
  descanso: async () => (await db.sueno.toArray()).map((r) => r.fecha),
  anecdotario: async () => (await db.anecdotas.toArray()).map((r) => r.fecha),
  despacho: async () => (await db.transacciones.toArray()).map((r) => r.fecha),
  biblioteca: async () => [
    ...(await db.sesionesEstudio.toArray()).map((r) => r.fecha),
    ...(await db.entradasBiblio.toArray()).map((r) => r.creadoEn.slice(0, 10)),
  ],
  entretenimiento: async () => [
    ...(await db.mediaArchivo.toArray()).map((r) => r.creadoEn.slice(0, 10)),
    ...(await db.juegosMesa.toArray()).map((r) => r.creadoEn.slice(0, 10)),
  ],
  sala: async () => [
    ...(await db.lugaresViaje.toArray()).map((r) => r.creadoEn.slice(0, 10)),
    ...(await db.bitacoraViaje.toArray()).map((r) => r.fecha),
  ],
  jardin: async () => [
    ...(await db.sesionesMindfulness.toArray()).map((r) => r.fecha),
    ...(await db.registroAnimo.toArray()).map((r) => r.fecha),
    ...(await db.gratitudDiaria.toArray()).map((r) => r.fecha),
  ],
  garage: async () => (await db.registrosMantenimiento.toArray()).map((r) => r.fecha),
  diario: async () =>
    (await db.lecturasDiario.toArray()).map((l) => l.fecha),
  hobbies: async () => (await db.sesionesHobby.toArray()).map((r) => r.fecha),
  idiomas: async () => [
    ...(await db.repasosIdioma.toArray()).map((r) => r.fecha),
    ...(await db.tarjetasIdioma.toArray()).map((r) => r.creadoEn.slice(0, 10)),
  ],
}

/**
 * Registros que una app escribió en una fecha. Reusa `FUENTES` para no duplicar el
 * conocimiento de qué tabla mira cada app: es lo que hace de motor a la meta diaria
 * genérica ("registra algo hoy") de las apps que no declaran una propia.
 */
export async function registrosDelDia(plantillaId: string, fecha: string): Promise<number> {
  const fuente = FUENTES[plantillaId]
  if (!fuente) return 0
  return (await fuente()).filter((f) => f === fecha).length
}

/** Racha: días consecutivos con actividad terminando hoy (o ayer, si hoy aún no hay). */
function racha(fechas: Set<string>): number {
  let dia = 0
  if (!fechas.has(restarDias(0))) dia = 1 // la racha no se rompe hasta que pase el día
  let n = 0
  while (fechas.has(restarDias(dia + n))) n++
  return n
}

export interface ProgresoPlantilla {
  plantillaId: string
  /** Total de registros históricos de la app. */
  total: number
  xp: number
  nivel: number
  /** Avance hacia el siguiente nivel (0–1). */
  avanceNivel: number
  racha: number
  /** Registros de hoy. */
  hoy: number
  /** Días activos en los últimos 3 días. */
  dias3: number
  /** Días activos en los últimos 7 días. */
  dias7: number
}

export type Humor = 'feliz' | 'contento' | 'triste' | 'dormido'

export interface ProgresoJugador {
  xp: number
  nivel: number
  avanceNivel: number
  racha: number
  /** Enfoques con actividad reciente (últimos 3 días) / total (0–1). */
  salud: number
  /** Enfoques con actividad HOY / total (0–1). */
  energia: number
  humor: Humor
  enfoques: ProgresoPlantilla[]
}

export const XP_POR_REGISTRO = 10
const XP_POR_NIVEL = 100

function nivelDeXp(xp: number): { nivel: number; avance: number } {
  return { nivel: 1 + Math.floor(xp / XP_POR_NIVEL), avance: (xp % XP_POR_NIVEL) / XP_POR_NIVEL }
}

async function progresoDePlantilla(plantillaId: string): Promise<ProgresoPlantilla> {
  const fechas = (await (FUENTES[plantillaId] ?? (async () => []))()).filter(Boolean)
  const setFechas = new Set(fechas)
  const hoy = hoyISO()
  const hace3 = restarDias(2)
  const hace7 = restarDias(6)
  const xp = fechas.length * XP_POR_REGISTRO
  const { nivel, avance } = nivelDeXp(xp)
  return {
    plantillaId,
    total: fechas.length,
    xp,
    nivel,
    avanceNivel: avance,
    racha: racha(setFechas),
    hoy: fechas.filter((f) => f === hoy).length,
    dias3: [...setFechas].filter((f) => f >= hace3 && f <= hoy).length,
    dias7: [...setFechas].filter((f) => f >= hace7 && f <= hoy).length,
  }
}

function humorDe(salud: number, energia: number, rachaGlobal: number, activos: boolean): Humor {
  if (!activos) return 'dormido'
  if (salud >= 0.66 || (energia > 0 && rachaGlobal >= 3)) return 'feliz'
  if (salud >= 0.33 || energia > 0) return 'contento'
  return 'triste'
}

export const EMOJI_HUMOR: Record<Humor, string> = {
  feliz: '😄',
  contento: '🙂',
  triste: '😢',
  dormido: '😴',
}

/**
 * Progreso del jugador (reactivo): se recalcula cuando cambian los registros
 * de las apps o los enfoques (plantillas asignadas). `undefined` = cargando.
 */
export function useProgreso(): ProgresoJugador | undefined {
  // Enfoques = plantillas asignadas a algún objeto de la casa.
  const objetos = useDiseño((s) => s.objetos)
  const ids = [...new Set(objetos.map((o) => o.plantillaId).filter((p): p is string => !!p))]
  const clave = ids.sort().join(',')

  return useLiveQuery(async () => {
    const enfoques = await Promise.all(ids.map(progresoDePlantilla))
    enfoques.sort((a, b) => b.xp - a.xp)

    const xp = enfoques.reduce((acc, e) => acc + e.xp, 0)
    const { nivel, avance } = nivelDeXp(xp)

    // Fechas unificadas para la racha global.
    const todas = new Set<string>()
    for (const id of ids) for (const f of await (FUENTES[id] ?? (async () => []))()) todas.add(f)

    const n = enfoques.length
    const salud = n === 0 ? 0 : enfoques.filter((e) => e.dias3 > 0).length / n
    const energia = n === 0 ? 0 : enfoques.filter((e) => e.hoy > 0).length / n
    const rachaGlobal = racha(todas)
    const activos = n > 0 && enfoques.some((e) => e.dias7 > 0)

    return {
      xp,
      nivel,
      avanceNivel: avance,
      racha: rachaGlobal,
      salud,
      energia,
      humor: humorDe(salud, energia, rachaGlobal, activos),
      enfoques,
    }
  }, [clave])
}
