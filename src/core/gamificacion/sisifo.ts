import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type EstadoSisifo } from '../data/db'
import { useDiseño } from '../state/disenoStore'
import { fechaLocalISO, isoMasDias } from '../fechaLocal'
import { FUENTES } from './actividad'
import {
  DIAS_META,
  DIAS_POR_SEMANA,
  GRACIAS_MES,
  inicioDeRango,
  insigniasGanadas,
  rangoDe,
} from './sisifoData'

/**
 * Motor de la Montaña de Sísifo: reconcilia el ascenso anual con la actividad
 * REAL del usuario (las mismas fechas que alimentan la racha del personaje).
 *
 * Un único número persistente, `altura` (días subidos), del que se derivan rango
 * e insignias. La reconciliación finaliza los días PASADOS (crédito si hubo
 * actividad; si no, gracia o retroceso de tramo); el día de HOY nunca penaliza y
 * su crédito es efímero (se suma en la vista, se persiste al día siguiente),
 * igual que `racha()` en actividad.ts. Al completar 365 nace una estrella
 * permanente y el ciclo vuelve a cero.
 */

const ESTADO_INICIAL: EstadoSisifo = {
  altura: 0,
  estrellas: 0,
  ultimaFecha: '',
  graciasGastadas: 0,
  mes: '',
  insigniasVistas: 0,
  estrellaNueva: false,
}

/** Lee la fila única (patrón singleton, como `disenoAvatar`/`mapaConfig`). */
async function leerEstado(): Promise<EstadoSisifo> {
  const filas = await db.estadoSisifo.toArray()
  return filas[0] ?? ESTADO_INICIAL
}

/** Guarda la fila única: actualiza si ya existe, la crea si es la primera vez. */
async function guardarEstado(estado: EstadoSisifo): Promise<void> {
  if (estado.id != null) await db.estadoSisifo.update(estado.id, estado)
  else await db.estadoSisifo.add(estado)
}

/**
 * Reconcilia y guarda la fila única dentro de una transacción: lee-decide-escribe
 * de forma atómica para que dos llamadas casi simultáneas (StrictMode monta los
 * efectos dos veces en dev) no creen dos filas del singleton. Re-lee DENTRO de
 * la transacción (no confía en `fechas`/`hoy` capturados fuera) para no pisar un
 * escritor concurrente. Debe llamarse FUERA de un `useLiveQuery`: Dexie no
 * permite escribir dentro del contexto de solo lectura de una live query.
 */
async function reconciliarYGuardar(fechas: Set<string>, hoy: string): Promise<void> {
  await db.transaction('rw', db.estadoSisifo, async () => {
    const prev = await leerEstado()
    const nuevo = reconciliar(prev, fechas, hoy)
    if (!cambio(prev, nuevo)) return
    const fila = { ...prev, ...nuevo }
    // Una instalación fresca NO materializa el singleton: la fila naciría con
    // updatedAt de hoy y, al fusionar dispositivos, dedupeSingletons (gana la
    // más nueva) la preferiría sobre el progreso REAL de la cuenta. Sin
    // progreso que guardar no se guarda nada; la fila nace con el primer día
    // de actividad o al ver una insignia — escrituras legítimamente nuevas.
    if (fila.id == null && !fila.altura && !fila.estrellas && !fila.insigniasVistas) return
    // Conserva uid/updatedAt que sella el middleware de sync (prev los trae en
    // runtime aunque el tipo no los declare): así la fila sincroniza como una sola.
    if (fila.id != null) await db.estadoSisifo.update(fila.id, fila)
    else await db.estadoSisifo.add(fila)
  })
}

/** Racha de días consecutivos con actividad terminando hoy (o ayer si hoy aún no hay). */
function rachaDesde(fechas: Set<string>, hoy: string): number {
  const offset = fechas.has(hoy) ? 0 : 1
  let n = 0
  while (fechas.has(isoMasDias(hoy, -(offset + n)))) n++
  return n
}

/**
 * Devuelve el nuevo estado tras finalizar todos los días pasados hasta ayer.
 * Función pura (sin efectos) para poder testearla con estados sintéticos.
 */
export function reconciliar(prev: EstadoSisifo, fechas: Set<string>, hoy: string): EstadoSisifo {
  let { altura, estrellas, ultimaFecha, graciasGastadas, mes, insigniasVistas, estrellaNueva } = prev

  // Sube un día; al coronar el año otorga una estrella y reinicia el ciclo.
  const subir = () => {
    const n = altura + 1
    if (n >= DIAS_META) {
      estrellas += 1
      estrellaNueva = true
      graciasGastadas = 0
      insigniasVistas = 0
      altura = 0
    } else {
      altura = n
    }
  }

  // Primera vez: sembrar desde la racha en curso (premia rachas ya existentes)
  // sin disparar insignias retroactivas como "nuevas".
  if (!ultimaFecha) {
    altura = Math.min(DIAS_META, rachaDesde(fechas, hoy))
    return {
      id: prev.id,
      altura,
      estrellas,
      ultimaFecha: hoy,
      graciasGastadas: 0,
      mes: hoy.slice(0, 7),
      insigniasVistas: insigniasGanadas(altura),
      estrellaNueva: false,
    }
  }

  // Finaliza cada día PASADO (estrictamente antes de hoy).
  let dia = isoMasDias(ultimaFecha, 1)
  while (dia < hoy) {
    const mesDia = dia.slice(0, 7)
    if (mesDia !== mes) {
      mes = mesDia
      graciasGastadas = 0
    }
    if (fechas.has(dia)) {
      subir()
    } else if (graciasGastadas < GRACIAS_MES) {
      graciasGastadas += 1 // día de gracia: fallo sin castigo
    } else {
      altura = inicioDeRango(altura) // la piedra rueda al rellano del rango
    }
    ultimaFecha = dia
    dia = isoMasDias(dia, 1)
  }
  // El mes en curso puede haber cambiado aunque hoy no se finalice.
  const mesHoy = hoy.slice(0, 7)
  if (mesHoy !== mes) {
    mes = mesHoy
    graciasGastadas = 0
  }

  return { id: prev.id, altura, estrellas, ultimaFecha, graciasGastadas, mes, insigniasVistas, estrellaNueva }
}

function cambio(a: EstadoSisifo, b: EstadoSisifo): boolean {
  return (
    a.altura !== b.altura ||
    a.estrellas !== b.estrellas ||
    a.ultimaFecha !== b.ultimaFecha ||
    a.graciasGastadas !== b.graciasGastadas ||
    a.mes !== b.mes ||
    a.insigniasVistas !== b.insigniasVistas ||
    a.estrellaNueva !== b.estrellaNueva
  )
}

/** El logro más reciente sin confirmar (para la notificación): uno solo, el más alto. */
export type LogroNuevo =
  | { tipo: 'estrella' }
  | { tipo: 'rango'; rango: number }
  | { tipo: 'insignia'; insignia: number }

export interface VistaSisifo {
  /** Altura mostrada (persistida + el día de hoy si ya hubo actividad), 0–365. */
  altura: number
  /** Rango actual, 1–12. */
  rango: number
  /** Insignias ganadas, 0–52. */
  insignias: number
  /** Estrellas permanentes acumuladas. */
  estrellas: number
  /** Días de gracia que quedan este mes. */
  graciasRestantes: number
  /** ¿Hoy ya cuenta como día activo? */
  hoyActivo: boolean
  /** Hay una insignia o estrella nueva sin ver (badge). */
  hayNuevo: boolean
  /** Se acaba de coronar el año (celebración pendiente). */
  estrellaNueva: boolean
  /** Logro concreto sin confirmar (dispara la notificación), o null si no hay nada nuevo. */
  nuevoLogro: LogroNuevo | null
}

function derivar(estado: EstadoSisifo, hoyActivo: boolean): VistaSisifo {
  const altura = Math.min(DIAS_META, estado.altura + (hoyActivo ? 1 : 0))
  const insignias = insigniasGanadas(altura)
  const rango = rangoDe(altura)
  // Rango que correspondía a la última cifra de insignias confirmada: mismas
  // unidades (semanas), así se detecta un salto de rango sin guardar otro campo.
  const rangoVisto = rangoDe(estado.insigniasVistas * DIAS_POR_SEMANA)
  let nuevoLogro: LogroNuevo | null = null
  if (estado.estrellaNueva) nuevoLogro = { tipo: 'estrella' }
  else if (rango > rangoVisto) nuevoLogro = { tipo: 'rango', rango }
  else if (insignias > estado.insigniasVistas) nuevoLogro = { tipo: 'insignia', insignia: insignias }
  return {
    altura,
    rango,
    insignias,
    estrellas: estado.estrellas,
    graciasRestantes: Math.max(0, GRACIAS_MES - estado.graciasGastadas),
    hoyActivo,
    hayNuevo: insignias > estado.insigniasVistas || estado.estrellaNueva,
    estrellaNueva: estado.estrellaNueva,
    nuevoLogro,
  }
}

/** Fechas (yyyy-mm-dd) con actividad en las apps enfocadas (igual que la racha global). */
async function fechasActivas(ids: string[]): Promise<Set<string>> {
  const fechas = new Set<string>()
  for (const id of ids) {
    const fuente = FUENTES[id]
    if (!fuente) continue
    for (const f of await fuente()) if (f) fechas.add(f)
  }
  return fechas
}

/**
 * Estado de la montaña (reactivo): reconcilia y persiste cuando cambian los
 * registros de las apps enfocadas. `undefined` = cargando.
 *
 * `useLiveQuery` solo LEE (Dexie no permite escribir en su contexto de solo
 * lectura); la escritura de la reconciliación corre aparte, en un efecto. El
 * efecto dispara una re-lectura de la live query al cambiar la tabla, así que
 * converge solo: si no hubo cambio no vuelve a escribir.
 */
export function useSisifo(): VistaSisifo | undefined {
  // Suscripción SOLO a la clave derivada (string): mover objetos no re-renderiza esto.
  const clave = useDiseño((s) =>
    [...new Set(s.objetos.map((o) => o.plantillaId).filter((p): p is string => !!p))].sort().join(','),
  )
  const ids = useMemo(() => (clave ? clave.split(',') : []), [clave])

  const leido = useLiveQuery(async () => {
    const hoy = fechaLocalISO()
    const fechas = await fechasActivas(ids)
    const prev = await leerEstado()
    return { prev, fechas, hoy }
  }, [clave])

  useEffect(() => {
    if (!leido) return
    reconciliarYGuardar(leido.fechas, leido.hoy).catch((err) => {
      // La Montaña de Sísifo es un extra sobre el personaje: un fallo aquí no
      // debe tumbar el resto de la app (menú, casa, apps del cuarto).
      console.error(`[Sísifo] no se pudo persistir el ascenso: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`)
    })
  }, [leido])

  if (!leido) return undefined
  const nuevo = reconciliar(leido.prev, leido.fechas, leido.hoy)
  return derivar(nuevo, leido.fechas.has(leido.hoy))
}

/**
 * Snapshot actual (sin reconciliar por la fecha de hoy): para el Wrapped, que
 * pide una foto rápida y no necesita el crédito efímero del día en curso.
 * `null` si el ascenso todavía no arrancó.
 */
export async function estadoSisifoActual(): Promise<
  { altura: number; rango: number; insignias: number; estrellas: number } | null
> {
  const estado = await leerEstado()
  if (!estado.ultimaFecha) return null
  return {
    altura: estado.altura,
    rango: rangoDe(estado.altura),
    insignias: insigniasGanadas(estado.altura),
    estrellas: estado.estrellas,
  }
}

/** Apaga el badge: marca como vistas las insignias ganadas y la estrella nueva. */
export async function marcarSisifoVisto(insigniasActuales: number): Promise<void> {
  await db.transaction('rw', db.estadoSisifo, async () => {
    const estado = await leerEstado()
    const insigniasVistas = Math.max(estado.insigniasVistas, insigniasActuales)
    if (insigniasVistas === estado.insigniasVistas && !estado.estrellaNueva) return
    await guardarEstado({ ...estado, insigniasVistas, estrellaNueva: false })
  })
}
