import type { UpdateSpec } from 'dexie'
import type { RepeticionRutina, Rutina, TramiteVehiculo, Vehiculo } from '../../core/data/db'
import { rutinasRepo, tramitesVehiculoRepo, vehiculosRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { COLOR, HORA_TRAMITE, getTipoTramite } from './constantes'
import { sumarDias, sumarMin } from './fecha'

/**
 * Puente garaje → calendario. ÚNICO módulo del cuarto que escribe en `rutinas`.
 *
 * Mismo patrón que `rooms/agenda/calendario.ts`: la rutina es una PROYECCIÓN del
 * trámite (el dato vive en `tramitesVehiculo`) y es lo que le da bloque con hora,
 * aviso y palomita. El amarre es `Rutina.ambitoId = '<prefijo>:<tramiteId>'`, un
 * string estable entre dispositivos, y no una clave foránea numérica.
 *
 * Cada trámite proyecta hasta DOS rutinas —el vencimiento y el aviso previo—, y
 * cada una tiene su propio ámbito en vez de compartir uno con dos filas: así
 * `proyectar` no tiene que emparejar por orden y la reconciliación sabe cuál de
 * las dos manda sobre la fecha del trámite.
 */

const PLANTILLA = 'garage'

export const ambitoTramite = (tramiteId: string) => `gaTr:${tramiteId}`
export const ambitoAviso = (tramiteId: string) => `gaAv:${tramiteId}`

/** Rutinas que mantiene el garaje (nunca toca las que el usuario creó a mano). */
const esDeGarage = (r: Rutina) => r.plantillaId === PLANTILLA && !!r.ambitoId?.startsWith('ga')

/** Los campos de la rutina que decide el garaje; el resto son siempre los mismos. */
interface Proyeccion {
  nombre: string
  emoji: string
  color: string
  hora: string
  horaFin: string
  dias: number[]
  repeticion: RepeticionRutina
  fechaInicio: string
  seccion: string
}

const igual = (r: Rutina, p: Proyeccion) =>
  r.nombre === p.nombre &&
  r.emoji === p.emoji &&
  r.color === p.color &&
  (r.hora ?? '') === p.hora &&
  (r.horaFin ?? '') === p.horaFin &&
  r.dias.join() === p.dias.join() &&
  r.repeticion === p.repeticion &&
  (r.fechaInicio ?? '') === p.fechaInicio &&
  r.seccion === p.seccion

/**
 * Deja EXACTAMENTE una rutina (o ninguna) para el ámbito: actualiza la que ya
 * está —así conserva su id y con él las palomitas de `ejecucionesRutina`—, la
 * crea si falta y borra las de más. Es idempotente y no escribe si nada cambió:
 * se llama en cada apertura de la app y una escritura ciega llenaría de ruido la
 * cola de sincronización.
 */
async function proyectar(
  ambito: string,
  nueva: Proyeccion | null,
  todas?: Rutina[],
): Promise<void> {
  const rutinas = todas ?? (await rutinasRepo.list())
  const [previa, ...sobrantes] = rutinas.filter((r) => r.ambitoId === ambito && esDeGarage(r))
  for (const s of sobrantes) if (s.id != null) await rutinasRepo.remove(s.id)

  if (!nueva) {
    if (previa?.id != null) await rutinasRepo.remove(previa.id)
    return
  }
  if (previa?.id != null) {
    // El cast es el mismo que hace `createRepository`: `UpdateSpec` exige firmas
    // de índice (`dias.0`) que un objeto plano no puede declarar.
    if (!igual(previa, nueva)) await rutinasRepo.update(previa.id, nueva as UpdateSpec<Rutina>)
  } else {
    await rutinasRepo.add({
      ...nueva,
      plantillaId: PLANTILLA,
      ambitoId: ambito,
      avisar: true,
      pasos: [],
      activa: true,
      creadoEn: new Date().toISOString(),
    })
  }
}

/** Duración del bloque de un trámite en el calendario. */
const DURACION_MIN = 30

function proyeccionTramite(t: TramiteVehiculo, vehiculo: string): Proyeccion | null {
  if (!t.activo || !t.fecha) return null
  const hora = t.hora || HORA_TRAMITE
  return {
    nombre: `${t.titulo} · ${vehiculo}`,
    emoji: getTipoTramite(t.tipo).emoji,
    // El ámbar del cuarto, no un segundo color: en el calendario el bloque debe
    // leerse como «esto es del garaje», que es lo que filtra el chip de la app.
    color: COLOR,
    hora,
    horaFin: sumarMin(hora, DURACION_MIN),
    dias: [],
    repeticion: 'una_vez',
    fechaInicio: t.fecha,
    seccion: 'vehiculos',
  }
}

/** Recordatorio de cortesía N días antes (tenencia y verificación se olvidan). */
function proyeccionAviso(t: TramiteVehiculo, vehiculo: string): Proyeccion | null {
  const base = proyeccionTramite(t, vehiculo)
  if (!base || !t.avisoDias) return null
  return {
    ...base,
    nombre: tGlobal('garage.tram.recordatorio', 'Pronto: {n}', { n: base.nombre }),
    fechaInicio: sumarDias(t.fecha, -t.avisoDias),
  }
}

export async function sincronizarTramite(t: TramiteVehiculo, vehiculo: string): Promise<void> {
  await proyectar(ambitoTramite(t.tramiteId), proyeccionTramite(t, vehiculo))
  await proyectar(ambitoAviso(t.tramiteId), proyeccionAviso(t, vehiculo))
}

export async function borrarRutinasDeTramite(tramiteId: string): Promise<void> {
  await proyectar(ambitoTramite(tramiteId), null)
  await proyectar(ambitoAviso(tramiteId), null)
}

// ----- Reconciliación -----

/**
 * Repara lo que se editó por fuera. El calendario puede mover y borrar bloques
 * sin saber que detrás hay un trámite, así que al abrir la app se pasan tres
 * barridos. Es idempotente: repetirlo no cambia nada.
 *
 * Lo que NO se refleja es la palomita: marcar el bloque en el calendario no da
 * por pagada la tenencia. Completar un trámite escribe un gasto en el historial y
 * empuja la fecha al siguiente periodo, y eso solo lo dispara el botón de la app.
 */
async function hacerReconciliacion(): Promise<void> {
  const [rutinas, tramites, vehiculos] = await Promise.all([
    rutinasRepo.list(),
    tramitesVehiculoRepo.list(),
    vehiculosRepo.list(),
  ])
  const mias = rutinas.filter(esDeGarage)
  const porAmbito = new Map(tramites.map((t) => [ambitoTramite(t.tramiteId), t]))
  const vivos = new Set([
    ...porAmbito.keys(),
    ...tramites.map((t) => ambitoAviso(t.tramiteId)),
  ])
  const nombreDe = (v: Vehiculo | undefined) =>
    v?.nombre ?? tGlobal('garage.tram.sinVehiculo', 'Vehículo')
  const porId = new Map(vehiculos.map((v) => [v.id, v]))

  // 1. Huérfanas: su trámite ya no existe (se borró en otro dispositivo).
  for (const r of mias) {
    if (r.id != null && r.ambitoId && !vivos.has(r.ambitoId)) await rutinasRepo.remove(r.id)
  }

  // 2. Arrastres: si la rutina del vencimiento y su trámite discrepan, gana la
  //    rutina. La app siempre escribe las dos a la vez, así que una diferencia
  //    solo pudo salir de mover el bloque en el calendario. (El aviso previo no
  //    manda: es una sombra que se recalcula a partir de la fecha de arriba.)
  for (const r of mias) {
    const t = r.ambitoId ? porAmbito.get(r.ambitoId) : undefined
    if (!t?.id || !r.fechaInicio) continue
    if (r.fechaInicio === t.fecha && (r.hora ?? '') === (t.hora ?? HORA_TRAMITE)) continue
    const cambios = { fecha: r.fechaInicio, hora: r.hora || undefined }
    await tramitesVehiculoRepo.update(t.id, cambios)
    Object.assign(t, cambios)
  }

  // 3. Faltantes y desactualizadas (también reescribe los nombres si cambió el
  //    idioma o el nombre del vehículo).
  const frescas = await rutinasRepo.list()
  for (const t of tramites) {
    const nombre = nombreDe(porId.get(t.vehiculoId))
    await proyectar(ambitoTramite(t.tramiteId), proyeccionTramite(t, nombre), frescas)
    await proyectar(ambitoAviso(t.tramiteId), proyeccionAviso(t, nombre), frescas)
  }
}

/**
 * StrictMode monta dos veces: sin esta guarda las dos pasadas leerían "todavía no
 * hay rutina" y crearían el bloque por duplicado.
 */
let enCurso: Promise<void> | null = null

export function reconciliarGarage(): Promise<void> {
  enCurso ??= hacerReconciliacion().finally(() => {
    enCurso = null
  })
  return enCurso
}
