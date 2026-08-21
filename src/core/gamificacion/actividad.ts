import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Table } from 'dexie'
import { db, type ListaCumplida } from '../data/db'
import { sinEjemplos } from '../data/ejemplos'
import { esSeedIntacta } from '../data/sync/syncables'
import { esMeta } from '../metas'
import { useDiseño } from '../state/disenoStore'
import { fechaLocalISO } from '../fechaLocal'

/**
 * Gamificación tipo tamagotchi: el personaje "vive" de la actividad real del
 * usuario en las apps que eligió como enfoque (las plantillas asignadas a un
 * cuarto). La racha, los días activos y el humor se calculan de los registros
 * existentes, sin tabla propia; el XP es la excepción desde ago 2026 — lo dan
 * las listas de objetivos cumplidas (`listasCumplidas`, ver `listas.ts`).
 */

const hoyISO = () => fechaLocalISO()

/**
 * Las filas de una tabla SIN las de los ejemplos de fábrica (estén visibles o
 * no): un ejemplo enseña cómo se ve la app, no debe subir XP, racha ni la
 * Montaña de Sísifo.
 */
const filas = async <T>(tabla: Table<T>): Promise<T[]> => sinEjemplos(await tabla.toArray())

const diaMs = 86_400_000
const restarDias = (n: number) =>
  fechaLocalISO(new Date(Date.now() - n * diaMs))

/** Fechas (yyyy-mm-dd) con actividad registrada, por plantilla. También la
 * consume el Wrapped (core/wrapped/resumen.ts) para que "día activo" signifique
 * lo mismo en toda la app. */
/**
 * Qué cuenta como actividad, por plantilla. Solo están las apps de REGISTRO: el
 * tamagotchi mide hábitos de vida, no tiempo de juego.
 *
 * Decisión explícita (ago 2026): las 5 plantillas de infraestructura (caminos,
 * canchas, huerto, granja, paintball) NO entran aunque tengan datos — cosechar o
 * ganar un partido es entretenimiento y no debe subir XP ni sostener una racha.
 * `calendario` tampoco: ya cuenta a través de las apps cuyas rutinas proyecta.
 * No es un olvido; si algún día se quiere lo contrario, es añadirlas aquí.
 *
 * El XP ya no sale de aquí (lo dan las listas cumplidas), pero el Wrapped sigue
 * contando REGISTROS de estas fuentes: una app que apunta ocho filas al día
 * valdría ocho veces más que una que apunta una — sin que el usuario haya hecho
 * ocho veces más. Donde eso desequilibraba de verdad era en la cocina (ver
 * abajo): las apps que reparten un mismo hecho en varias filas cuentan por DÍA.
 */
export const FUENTES: Record<string, () => Promise<string[]>> = {
  // Un día de cocina son 3-4 comidas y 2-3 cargas de agua: contadas una a una,
  // la cocina sola se llevaba tanto XP como el resto de la casa junta y la rueda
  // de enfoques salía con un solo pico. Comer y beber cuentan UNA VEZ POR DÍA
  // cada uno — dos actividades, como en cualquier otro cuarto.
  cocina: async () => [
    ...new Set((await filas(db.registrosComida)).map((r) => r.fecha)),
    ...new Set((await filas(db.registrosAgua)).map((r) => r.fecha)),
  ],
  ejercicio: async () => (await filas(db.sesionesEjercicio)).map((r) => r.fecha),
  descanso: async () => (await filas(db.sueno)).map((r) => r.fecha),
  anecdotario: async () => (await filas(db.anecdotas)).map((r) => r.fecha),
  despacho: async () => (await filas(db.transacciones)).map((r) => r.fecha),
  // `materialEntrada` NO entra: es un enlace, y crear la hoja o el mapa ya cuenta
  // como actividad en su propia app. `ajustesSemilla` tampoco: renombrar una rama
  // es ordenar el índice, no estudiar.
  biblioteca: async () => [
    ...(await filas(db.sesionesEstudio)).map((r) => r.fecha),
    ...(await filas(db.entradasBiblio)).map((r) => r.creadoEn.slice(0, 10)),
  ],
  entretenimiento: async () => [
    ...(await filas(db.mediaArchivo)).map((r) => r.creadoEn.slice(0, 10)),
    ...(await filas(db.juegosMesa)).map((r) => r.creadoEn.slice(0, 10)),
  ],
  sala: async () => [
    ...(await filas(db.lugaresViaje)).map((r) => r.creadoEn.slice(0, 10)),
    ...(await filas(db.bitacoraViaje)).map((r) => r.fecha),
  ],
  jardin: async () => [
    ...(await filas(db.sesionesMindfulness)).map((r) => r.fecha),
    ...(await filas(db.registroAnimo)).map((r) => r.fecha),
    ...(await filas(db.gratitudDiaria)).map((r) => r.fecha),
  ],
  garage: async () => (await filas(db.registrosMantenimiento)).map((r) => r.fecha),
  diario: async () =>
    (await filas(db.lecturasDiario)).map((l) => l.fecha),
  hobbies: async () => (await filas(db.sesionesHobby)).map((r) => r.fecha),
  // `partidasEjercicio` NO entra aquí a propósito: cada respuesta de una partida
  // ya llama a `registrarRepasoDia`, así que sumarla otra vez duplicaría el XP.
  idiomas: async () => [
    ...(await filas(db.repasosIdioma)).map((r) => r.fecha),
    ...(await filas(db.tarjetasIdioma)).map((r) => r.creadoEn.slice(0, 10)),
  ],
  // `carpetasIdea` tampoco: ordenar el diario no es tener una idea.
  ideas: async () => [
    ...(await filas(db.ideas)).map((r) => r.fecha),
    ...(await filas(db.nodosMapa)).map((r) => r.fecha),
  ],
  // Cuenta el día que resolviste algo o guardaste una fórmula. Las hojas cuentan
  // por DÍA de edición, no por celda: teclear una tabla no son cien actividades.
  //
  // `esSeedIntacta` deja fuera lo que la app trae puesto (las fórmulas y hojas
  // de `rooms/computo/siembra.ts`): sin ese filtro, entrar al cuarto por primera
  // vez regalaría 570 XP y un día de racha. En cuanto el usuario toca una, deja
  // de ser seed intacta y sí cuenta.
  computo: async () => [
    ...(await filas(db.calculosComputo)).map((r) => r.fecha),
    ...(await filas(db.formulas)).filter((f) => !esSeedIntacta(f)).map((r) => r.fecha),
    ...new Set(
      (await filas(db.hojasCalculo)).filter((h) => !esSeedIntacta(h)).map((r) => r.actualizadoEn.slice(0, 10)),
    ),
  ],
  // El día que apuntas o palomeas algo, no el día para el que lo agendaste:
  // reservar el dentista para el mes que viene no es actividad de hoy.
  agenda: async () => [
    ...(await filas(db.eventosAgenda)).flatMap((e) => [e.creadoEn.slice(0, 10), ...(e.hechoEn ? [e.hechoEn] : [])]),
    ...(await filas(db.contactosAgenda)).map((c) => c.creadoEn.slice(0, 10)),
    ...(await filas(db.mascotas)).map((m) => m.creadoEn.slice(0, 10)),
    // Del cuidado cuenta el día que lo diste por hecho (`ultima`), no su próxima vez.
    ...(await filas(db.cuidadosMascota)).flatMap((c) => (c.ultima ? [c.ultima] : [])),
  ],
  // El planificador de la casa. No registra nada suyo, así que lo que cuenta son
  // los actos de PLANEAR: el día que te propusiste una meta y el que pediste o
  // aceptaste un plan.
  //
  // El CIERRE de una meta no puede contar: `completada` es un booleano SIN fecha
  // y `pasosHechos` son índices. Lo único fechado de su avance son las
  // `ejecucionesRutina` de sus bloques, y esas ya las cuenta la app dueña del
  // bloque — sumarlas aquí sería contar el mismo día dos veces.
  //
  // Por DÍA, como la cocina: aceptar un plan escribe de golpe una docena de
  // sub-metas, y una a una el planificador pesaría en el Wrapped más que un año
  // entero de cualquier cuarto.
  //
  // Con `fechaLocalISO` y no con el `.slice(0, 10)` de las fuentes de arriba: ese
  // corte da la fecha UTC, y una meta creada de noche se apuntaría a MAÑANA — el
  // vigía de racha del cuarto vería 0 registros justo después de crearla.
  metas: async () => [
    ...new Set([
      ...(await filas(db.rutinas)).filter(esMeta).map((r) => fechaLocalISO(new Date(r.creadoEn))),
      ...(await filas(db.planesMeta)).flatMap((p) => [
        fechaLocalISO(new Date(p.creadoEn)),
        ...(p.aceptadoEn ? [fechaLocalISO(new Date(p.aceptadoEn))] : []),
      ]),
    ]),
  ],
}

/**
 * Registros que una app escribió en una fecha. Reusa `FUENTES` para no duplicar
 * el conocimiento de qué tabla mira cada app; la celebración de racha
 * (`listas.ts`) vigila con esto el primer registro del día del cuarto abierto.
 */
export async function registrosDelDia(plantillaId: string, fecha: string): Promise<number> {
  const fuente = FUENTES[plantillaId]
  if (!fuente) return 0
  return (await fuente()).filter((f) => f === fecha).length
}

/**
 * ¿La app guarda información del usuario? Vuelve a apoyarse en `FUENTES`, que ya
 * sabe qué tablas mira cada app y descuenta los ejemplos de fábrica; las
 * plantillas personalizadas no están ahí, lo suyo son las filas de
 * `itemsPlantilla`. Sirve para avisar de que una app sin cuarto no está vacía.
 */
export async function tieneDatos(plantillaId: string): Promise<boolean> {
  const fuente = FUENTES[plantillaId]
  if (fuente) return (await fuente()).length > 0
  return (await db.itemsPlantilla.where('plantillaId').equals(plantillaId).count()) > 0
}

/**
 * Cuáles de esas apps tienen información guardada (reactivo). Se le pasan solo
 * las plantillas que se están pintando: cada `FUENTES[id]()` recorre las tablas
 * de su app, así que preguntarlo por las 22 costaría como un `useProgreso`.
 */
export function useAppsConDatos(ids: string[]): Set<string> {
  const clave = [...ids].sort().join(',')
  const conDatos = useLiveQuery(async () => {
    const lista: string[] = []
    for (const id of clave ? clave.split(',') : []) if (await tieneDatos(id)) lista.push(id)
    return lista
  }, [clave])
  return useMemo(() => new Set(conDatos ?? []), [conDatos])
}

/** Racha: días consecutivos con actividad terminando hoy (o ayer, si hoy aún no hay). */
export function racha(fechas: Set<string>): number {
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
  /** Listas de objetivos completadas — la moneda del XP. */
  listas: number
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
  /** Listas de objetivos completadas entre todos los enfoques. */
  listas: number
  /** Enfoques con actividad reciente (últimos 3 días) / total (0–1). */
  salud: number
  /** Enfoques con actividad HOY / total (0–1). */
  energia: number
  humor: Humor
  enfoques: ProgresoPlantilla[]
}

export const XP_POR_NIVEL = 100

function nivelDeXp(xp: number): { nivel: number; avance: number } {
  return { nivel: 1 + Math.floor(xp / XP_POR_NIVEL), avance: (xp % XP_POR_NIVEL) / XP_POR_NIVEL }
}

async function progresoDePlantilla(plantillaId: string, listas: ListaCumplida[]): Promise<ProgresoPlantilla> {
  const fechas = (await (FUENTES[plantillaId] ?? (async () => []))()).filter(Boolean)
  const setFechas = new Set(fechas)
  const hoy = hoyISO()
  const hace3 = restarDias(2)
  const hace7 = restarDias(6)
  const xp = listas.reduce((acc, f) => acc + f.xp, 0)
  const { nivel, avance } = nivelDeXp(xp)
  return {
    plantillaId,
    total: fechas.length,
    xp,
    nivel,
    avanceNivel: avance,
    racha: racha(setFechas),
    listas: listas.length,
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
 * Progreso del jugador para una lista de enfoques: la consulta de `useProgreso`
 * sin hook, para leerla fuera de React (snapshot de los widgets nativos). Solo
 * lee Dexie, así que dentro de un `useLiveQuery` sigue siendo reactiva.
 */
export async function progresoDeEnfoques(ids: string[]): Promise<ProgresoJugador> {
  // Una sola lectura de la tabla para todas las apps, no una consulta por app.
  const porApp = new Map<string, ListaCumplida[]>()
  for (const f of await db.listasCumplidas.toArray()) {
    const suyas = porApp.get(f.plantillaId)
    if (suyas) suyas.push(f)
    else porApp.set(f.plantillaId, [f])
  }
  const enfoques = await Promise.all(ids.map((id) => progresoDePlantilla(id, porApp.get(id) ?? [])))
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
    listas: enfoques.reduce((acc, e) => acc + e.listas, 0),
    salud,
    energia,
    humor: humorDe(salud, energia, rachaGlobal, activos),
    enfoques,
  }
}

/**
 * Progreso del jugador (reactivo): se recalcula cuando cambian los registros
 * de las apps o los enfoques (plantillas asignadas). `undefined` = cargando.
 */
export function useProgreso(): ProgresoJugador | undefined {
  // Enfoques = plantillas asignadas a algún objeto de la casa. La suscripción es SOLO
  // a la clave derivada (string): mover objetos no re-renderiza a los consumidores.
  const clave = useDiseño((s) =>
    [...new Set(s.objetos.map((o) => o.plantillaId).filter((p): p is string => !!p))].sort().join(','),
  )
  const ids = useMemo(() => (clave ? clave.split(',') : []), [clave])

  return useLiveQuery(() => progresoDeEnfoques(ids), [clave])
}
