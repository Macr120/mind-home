import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Rutina, type EjecucionRutina, type RepeticionRutina } from './data/db'
import { getPlantilla } from './registry'
import { useMascota } from './state/mascotaStore'

/** Etiquetas cortas de los días (índice = getDay(): 0=domingo). */
export const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

/** Modo de repetición efectivo (rutinas antiguas sin campo o legacy `personalizado`). */
export function repeticionDe(r: Rutina): RepeticionRutina {
  if (r.repeticion === 'personalizado') return 'semanal'
  if (r.repeticion) return r.repeticion
  return r.dias.length === 0 ? 'indefinido' : 'semanal'
}

/** Día de la semana 0–6 a partir de yyyy-mm-dd. */
export function diaSemanaDe(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Días de la semana en los que aplica la serie (semanal/personalizado/indefinido). */
export function diasEfectivos(r: Rutina): number[] {
  if (r.dias.length > 0) return r.dias
  const rep = repeticionDe(r)
  if (rep === 'semanal' && r.fechaInicio) return [diaSemanaDe(r.fechaInicio)]
  return []
}

/** Texto legible de la repetición (listas, detalle). */
export function textoRepeticion(r: Rutina): string {
  const rep = repeticionDe(r)
  if (rep === 'una_vez') {
    const f = r.fechaInicio ?? r.creadoEn.slice(0, 10)
    return new Date(f + 'T12:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  const dias = diasEfectivos(r)
  const diasTxt =
    dias.length === 0
      ? 'todos los días'
      : dias.map((d) => DIAS_SEMANA[d]).join(' ')
  if (rep === 'semanal') {
    const fin = r.fechaFin
      ? ` hasta ${new Date(r.fechaFin + 'T12:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}`
      : ''
    return `cada semana (${diasTxt})${fin}`
  }
  return `indefinidamente (${diasTxt})`
}

/**
 * Rutinas orquestadas: lógica de "qué toca hoy", completar pasos y
 * recordatorios. La pieza orquestadora: un paso completado puede registrar
 * automáticamente en su cuarto vía el esquema de captura (`esquemaId` +
 * `valores`), así un hábito multi-cuarto se documenta solo.
 */

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Fecha local yyyy-mm-dd de un Date (sin saltos por zona horaria). */
export function fechaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** ¿La rutina corresponde a esa fecha? */
export function tocaFecha(r: Rutina, d: Date): boolean {
  if (!r.activa) return false
  const iso = fechaISO(d)
  const rep = repeticionDe(r)

  if (rep === 'una_vez') {
    const f = r.fechaInicio ?? r.creadoEn.slice(0, 10)
    return iso === f
  }

  if (r.fechaInicio && iso < r.fechaInicio) return false
  if (r.fechaFin && iso > r.fechaFin) return false

  const dias = diasEfectivos(r)
  if (dias.length === 0) return true
  return dias.includes(d.getDay())
}

/** ¿La rutina corresponde al día de hoy? */
export function tocaHoy(r: Rutina): boolean {
  return tocaFecha(r, new Date())
}

/** Cuántas rutinas de hoy siguen incompletas (reactivo, para el badge del reloj). */
export function usePendientesHoy(): number {
  return (
    useLiveQuery(async () => {
      const fecha = hoyISO()
      const rutinas = (await db.rutinas.toArray()).filter(tocaHoy)
      const ejec = await db.ejecucionesRutina.where('fecha').equals(fecha).toArray()
      return rutinas.filter((r) => pasosHechosHoy(r, ejec).size < r.pasos.length).length
    }, []) ?? 0
  )
}

/**
 * Marca/desmarca un paso de hoy. Al marcarlo, si el paso trae esquema +
 * valores, registra el dato real en el cuarto (la fecha es la de hoy).
 */
export async function togglePaso(rutina: Rutina, idx: number) {
  if (rutina.id == null) return
  const fecha = hoyISO()
  const ejec = await db.ejecucionesRutina
    .where('fecha')
    .equals(fecha)
    .and((e) => e.rutinaId === rutina.id)
    .first()

  const hechos = new Set(ejec?.pasosHechos ?? [])
  const marcar = !hechos.has(idx)
  if (marcar) hechos.add(idx)
  else hechos.delete(idx)

  if (ejec?.id != null) {
    await db.ejecucionesRutina.update(ejec.id, { pasosHechos: [...hechos] })
  } else {
    await db.ejecucionesRutina.add({ rutinaId: rutina.id, fecha, pasosHechos: [...hechos] })
  }

  // Auto-registro: solo al marcar (desmarcar no borra el dato ya escrito).
  const paso = rutina.pasos[idx]
  if (marcar && paso?.esquemaId && paso.valores) {
    const esquema = getPlantilla(paso.roomId)?.esquemas?.find((e) => e.id === paso.esquemaId)
    if (esquema) {
      try {
        await esquema.guardar({ ...paso.valores, fecha })
      } catch (err) {
        console.warn('[Mind Home] No se pudo auto-registrar el paso:', err)
      }
    }
  }
}

/** Pasos hechos hoy de una rutina (de la lista reactiva de ejecuciones). */
export function pasosHechosHoy(rutina: Rutina, ejecuciones: EjecucionRutina[] | undefined): Set<number> {
  const e = ejecuciones?.find((x) => x.rutinaId === rutina.id)
  return new Set(e?.pasosHechos ?? [])
}

/** ¿La rutina ya pasó de su hora y aún tiene pasos sin completar? */
export function estaPendiente(rutina: Rutina, ejecuciones: EjecucionRutina[] | undefined): boolean {
  if (rutina.pasos.length === 0) return false
  if (!tocaHoy(rutina) || !rutina.hora) return false
  const ahora = new Date()
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  if (horaActual < rutina.hora) return false
  return pasosHechosHoy(rutina, ejecuciones).size < rutina.pasos.length
}

// ----- Recordatorio: el asistente anuncia la rutina a su hora -----

/** Rutinas ya anunciadas hoy (en memoria: con recargar se vuelve a avisar, aceptable). */
const anunciadas = new Set<string>()

/**
 * Revisa las rutinas con hora: si alguna acaba de llegar a su hora y no está
 * completada hoy, el asistente la anuncia una vez. Llamar cada ~30s.
 */
export async function revisarRecordatorios() {
  const fecha = hoyISO()
  const rutinas = (await db.rutinas.toArray()).filter((r) => tocaHoy(r) && r.hora)
  if (rutinas.length === 0) return
  const ejecuciones = await db.ejecucionesRutina.where('fecha').equals(fecha).toArray()

  for (const r of rutinas) {
    const clave = `${r.id}|${fecha}`
    if (anunciadas.has(clave)) continue
    if (!estaPendiente(r, ejecuciones)) continue
    anunciadas.add(clave)
    useMascota.getState().decir(`⏰ Es hora de tu rutina ${r.emoji} «${r.nombre}» (${r.pasos.length} pasos). ¡Vamos!`)
    break // un anuncio a la vez; la siguiente pasada anuncia la que falte
  }
}
