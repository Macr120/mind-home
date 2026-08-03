import type { UpdateSpec } from 'dexie'
import type {
  ContactoAgenda,
  CuidadoMascota,
  EventoAgenda,
  Medicamento,
  RepeticionRutina,
  Rutina,
} from '../../core/data/db'
import {
  contactosAgendaRepo,
  cuidadosMascotaRepo,
  ejecucionesRutinaRepo,
  eventosAgendaRepo,
  mascotasRepo,
  medicamentosRepo,
  rutinasRepo,
} from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { marcarHecho, tocaHoy } from '../../core/rutinas'
import {
  COLOR_AREA,
  DURACION_DEFECTO_MIN,
  DURACION_TOMA_MIN,
  EMOJI_AREA,
  EMOJI_MEDICAMENTO,
  HORA_CUMPLE,
} from './constantes'
import { ordenarHoras, sumarMin } from './horas'
import { DURACION_CUIDADO_MIN, getCuidado, HORA_CUIDADO } from './mascotas'

/**
 * Puente agenda → calendario. ÚNICO módulo que escribe en `rutinas`.
 *
 * Las rutinas de la agenda son una PROYECCIÓN: el dato vive en las tablas de la
 * agenda y aquí solo se dibuja su sombra, que es lo que da bloque con hora,
 * aviso, palomita y cumplimiento. Por eso la app NO declara `eventos()` en su
 * plantilla: una rutina sin `hora` ya cae en la fila "sin hora" del calendario
 * (ver Calendario.tsx), así que el otro canal solo serviría para pintar lo mismo
 * dos veces.
 *
 * El amarre es `Rutina.ambitoId = '<prefijo>:<idEstable>'` y no una clave
 * foránea numérica: un medicamento proyecta N rutinas (una por toma) y el motor
 * de sincronización solo traduce campos escalares.
 */

const PLANTILLA = 'agenda'

export const ambitoEvento = (evId: string) => `agEv:${evId}`
export const ambitoMedicamento = (medId: string) => `agMed:${medId}`
export const ambitoCumple = (contactoId: string) => `agCum:${contactoId}`
export const ambitoCuidado = (cuidadoId: string) => `agCui:${cuidadoId}`

/** Rutinas que mantiene la agenda (nunca toca las que el usuario creó a mano). */
const esDeAgenda = (r: Rutina) => r.plantillaId === PLANTILLA && !!r.ambitoId?.startsWith('ag')

/** Los campos de la rutina que decide la agenda; el resto son siempre los mismos. */
interface Proyeccion {
  nombre: string
  emoji: string
  color: string
  hora?: string
  horaFin?: string
  dias: number[]
  repeticion: RepeticionRutina
  fechaInicio: string
  fechaFin?: string
  seccion: string
}

const igual = (r: Rutina, p: Proyeccion) =>
  r.nombre === p.nombre &&
  r.emoji === p.emoji &&
  r.color === p.color &&
  (r.hora ?? '') === (p.hora ?? '') &&
  (r.horaFin ?? '') === (p.horaFin ?? '') &&
  r.dias.join() === p.dias.join() &&
  r.repeticion === p.repeticion &&
  (r.fechaInicio ?? '') === p.fechaInicio &&
  (r.fechaFin ?? '') === (p.fechaFin ?? '') &&
  r.seccion === p.seccion

/**
 * Deja EXACTAMENTE estas rutinas para el ámbito: actualiza las que ya están (así
 * conservan su id y con él las palomitas de `ejecucionesRutina`), crea las que
 * falten y borra las que sobren. Es idempotente y no escribe si nada cambió: se
 * llama en cada apertura de la app y una escritura ciega llenaría de ruido la
 * cola de sincronización.
 */
async function proyectar(ambito: string, nuevas: Proyeccion[], todas?: Rutina[]): Promise<void> {
  const rutinas = todas ?? (await rutinasRepo.list())
  const previas = rutinas
    .filter((r) => r.ambitoId === ambito && esDeAgenda(r))
    .sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? '') || (a.id ?? 0) - (b.id ?? 0))

  for (let i = 0; i < nuevas.length; i++) {
    const previa = previas[i]
    if (previa?.id != null) {
      // El cast es el mismo que hace `createRepository`: `UpdateSpec` exige
      // firmas de índice (`dias.0`) que un objeto plano no puede declarar.
      if (!igual(previa, nuevas[i])) await rutinasRepo.update(previa.id, nuevas[i] as UpdateSpec<Rutina>)
    } else {
      await rutinasRepo.add({
        ...nuevas[i],
        plantillaId: PLANTILLA,
        ambitoId: ambito,
        avisar: true,
        pasos: [],
        activa: true,
        creadoEn: new Date().toISOString(),
      })
    }
  }
  for (const sobrante of previas.slice(nuevas.length)) {
    if (sobrante.id != null) await rutinasRepo.remove(sobrante.id)
  }
}

// ----- Eventos (las tres secciones) -----

function proyeccionEvento(ev: EventoAgenda): Proyeccion[] {
  if (!ev.fecha) return [] // pendiente de bandeja: no ocupa día en el calendario
  return [
    {
      nombre: ev.titulo,
      emoji: EMOJI_AREA[ev.area],
      color: COLOR_AREA[ev.area],
      hora: ev.hora || undefined,
      horaFin: ev.hora ? ev.horaFin || sumarMin(ev.hora, DURACION_DEFECTO_MIN) : undefined,
      dias: [],
      repeticion: 'una_vez',
      fechaInicio: ev.fecha,
      seccion: ev.area,
    },
  ]
}

export const sincronizarEventoAgenda = (ev: EventoAgenda) =>
  proyectar(ambitoEvento(ev.evId), proyeccionEvento(ev))

export const borrarRutinasDeEvento = (evId: string) => proyectar(ambitoEvento(evId), [])

// ----- Medicamentos -----

function proyeccionMedicamento(m: Medicamento): Proyeccion[] {
  if (!m.activo) return []
  return ordenarHoras(m.horas).map((hora) => ({
    nombre: m.dosis ? `${m.nombre} · ${m.dosis}` : m.nombre,
    emoji: EMOJI_MEDICAMENTO,
    color: COLOR_AREA.salud,
    hora,
    horaFin: sumarMin(hora, DURACION_TOMA_MIN),
    dias: m.dias,
    // Nunca 'rango': `tocaFecha` lo da por bueno todos los días e ignora `dias`.
    // 'semanal'/'indefinido' respetan los días Y siguen acotados por las fechas.
    repeticion: m.dias.length > 0 ? 'semanal' : 'indefinido',
    fechaInicio: m.fechaInicio,
    fechaFin: m.fechaFin || undefined,
    seccion: 'salud',
  }))
}

export const sincronizarMedicamento = (m: Medicamento) =>
  proyectar(ambitoMedicamento(m.medId), proyeccionMedicamento(m))

export const borrarRutinasDeMedicamento = (medId: string) => proyectar(ambitoMedicamento(medId), [])

// ----- Cumpleaños -----

/**
 * El 29 de febrero se recuerda el 28: `tocaFecha` compara el "mm-dd" literal, así
 * que en los años no bisiestos el aviso no llegaría nunca. La fecha real se
 * conserva intacta en la ficha del contacto.
 */
const cumpleProyectado = (cumple: string) => (cumple.slice(5) === '02-29' ? `${cumple.slice(0, 5)}02-28` : cumple)

function proyeccionCumple(c: ContactoAgenda): Proyeccion[] {
  if (!c.cumple) return []
  return [
    {
      nombre: tGlobal('agenda.cumpleDe', 'Cumple de {n}', { n: c.nombre }),
      emoji: EMOJI_AREA.personas,
      color: COLOR_AREA.personas,
      hora: c.horaCumple || HORA_CUMPLE,
      horaFin: sumarMin(c.horaCumple || HORA_CUMPLE, 30),
      dias: [],
      repeticion: 'anual',
      fechaInicio: cumpleProyectado(c.cumple),
      seccion: 'personas',
    },
  ]
}

export const sincronizarCumple = (c: ContactoAgenda) =>
  proyectar(ambitoCumple(c.contactoId), proyeccionCumple(c))

export const borrarRutinasDeCumple = (contactoId: string) => proyectar(ambitoCumple(contactoId), [])

// ----- Cuidados de las mascotas -----

/**
 * Un cuidado proyecta SIEMPRE un bloque de una sola vez, aunque se repita: su
 * `fecha` es la próxima vez y `completarCuidado` la empuja al siguiente periodo.
 * Una serie mensual pintaría también las veces ya cumplidas, y con la palomita
 * en blanco parecerían olvidos.
 */
function proyeccionCuidado(c: CuidadoMascota, mascota: string): Proyeccion[] {
  if (!c.activo || !c.fecha) return []
  const hora = c.hora || HORA_CUIDADO
  return [
    {
      nombre: `${c.titulo} · ${mascota}`,
      emoji: getCuidado(c.tipo).emoji,
      color: COLOR_AREA.salud,
      hora,
      horaFin: sumarMin(hora, DURACION_CUIDADO_MIN),
      dias: [],
      repeticion: 'una_vez',
      fechaInicio: c.fecha,
      seccion: 'salud',
    },
  ]
}

export const sincronizarCuidado = (c: CuidadoMascota, mascota: string) =>
  proyectar(ambitoCuidado(c.cuidadoId), proyeccionCuidado(c, mascota))

export const borrarRutinasDeCuidado = (cuidadoId: string) => proyectar(ambitoCuidado(cuidadoId), [])

// ----- Palomita -----

/** Refleja en el bloque del calendario lo que se palomeó en la app. */
export async function palomearEventoAgenda(ev: EventoAgenda, hecho: boolean): Promise<void> {
  if (!ev.fecha) return
  const rutina = (await rutinasRepo.list()).find((r) => r.ambitoId === ambitoEvento(ev.evId))
  if (rutina) await marcarHecho(rutina, ev.fecha, hecho)
}

// ----- Reconciliación -----

/**
 * Repara lo que se editó por fuera. El calendario puede mover, borrar y palomear
 * bloques sin saber que detrás hay una agenda, así que al abrir la app se pasan
 * cuatro barridos. Es idempotente: repetirlo no cambia nada.
 */
async function hacerReconciliacion(): Promise<void> {
  const [rutinas, eventos, medicinas, contactos, mascotas, cuidados] = await Promise.all([
    rutinasRepo.list(),
    eventosAgendaRepo.list(),
    medicamentosRepo.list(),
    contactosAgendaRepo.list(),
    mascotasRepo.list(),
    cuidadosMascotaRepo.list(),
  ])
  const mias = rutinas.filter(esDeAgenda)
  const porEvento = new Map(eventos.map((e) => [ambitoEvento(e.evId), e]))
  const porCuidado = new Map(cuidados.map((c) => [ambitoCuidado(c.cuidadoId), c]))
  const nombreMascota = new Map(mascotas.map((m) => [m.mascId, m.nombre]))
  const vivos = new Set([
    ...porEvento.keys(),
    ...porCuidado.keys(),
    ...medicinas.map((m) => ambitoMedicamento(m.medId)),
    ...contactos.map((c) => ambitoCumple(c.contactoId)),
  ])

  // 1. Huérfanas: su dueño ya no existe (se borró desde la app en otro dispositivo).
  for (const r of mias) {
    if (r.id != null && r.ambitoId && !vivos.has(r.ambitoId)) await rutinasRepo.remove(r.id)
  }

  // 2. Arrastres: si la rutina y su evento discrepan, gana la rutina. La app
  //    siempre escribe las dos a la vez, así que una diferencia solo pudo salir
  //    de mover o estirar el bloque en el calendario.
  for (const r of mias) {
    const ev = r.ambitoId ? porEvento.get(r.ambitoId) : undefined
    if (!ev?.id || !r.fechaInicio) continue
    if (r.fechaInicio === ev.fecha && (r.hora ?? '') === (ev.hora ?? '')) continue
    const cambios = { fecha: r.fechaInicio, hora: r.hora || undefined, horaFin: r.horaFin || undefined }
    await eventosAgendaRepo.update(ev.id, cambios)
    Object.assign(ev, cambios)
  }

  // 2 bis. Lo mismo para los cuidados: mover el bloque en el calendario es
  //        aplazar la vacuna, no crear una fecha paralela.
  for (const r of mias) {
    const cu = r.ambitoId ? porCuidado.get(r.ambitoId) : undefined
    if (!cu?.id || !r.fechaInicio) continue
    if (r.fechaInicio === cu.fecha && (r.hora ?? '') === (cu.hora ?? HORA_CUIDADO)) continue
    const cambios = { fecha: r.fechaInicio, hora: r.hora || undefined }
    await cuidadosMascotaRepo.update(cu.id, cambios)
    Object.assign(cu, cambios)
  }

  // 3. Faltantes y desactualizadas (también reescribe los nombres si cambió el idioma).
  const frescas = await rutinasRepo.list()
  for (const ev of eventos) await proyectar(ambitoEvento(ev.evId), proyeccionEvento(ev), frescas)
  for (const m of medicinas) await proyectar(ambitoMedicamento(m.medId), proyeccionMedicamento(m), frescas)
  for (const c of contactos) await proyectar(ambitoCumple(c.contactoId), proyeccionCumple(c), frescas)
  for (const cu of cuidados) {
    const nombre = nombreMascota.get(cu.mascotaId) ?? tGlobal('agenda.mascota.sinFicha', 'Mascota')
    await proyectar(ambitoCuidado(cu.cuidadoId), proyeccionCuidado(cu, nombre), frescas)
  }

  // 4. Palomitas de hoy hechas desde el calendario (los días pasados no se revisan).
  const hoy = fechaLocalISO()
  const ejecuciones = (await ejecucionesRutinaRepo.list()).filter((e) => e.fecha === hoy && e.hecho)
  if (ejecuciones.length === 0) return
  const hechasHoy = new Set(ejecuciones.map((e) => e.rutinaId))
  for (const r of (await rutinasRepo.list()).filter(esDeAgenda)) {
    const ev = r.ambitoId ? porEvento.get(r.ambitoId) : undefined
    if (!ev?.id || ev.hecho || !r.id || !hechasHoy.has(r.id) || !tocaHoy(r)) continue
    await eventosAgendaRepo.update(ev.id, { hecho: true, hechoEn: hoy })
  }
}

/**
 * StrictMode monta dos veces: sin esta guarda las dos pasadas leerían "todavía no
 * hay rutina" y crearían el bloque por duplicado.
 */
let enCurso: Promise<void> | null = null

export function reconciliarAgenda(): Promise<void> {
  enCurso ??= hacerReconciliacion().finally(() => {
    enCurso = null
  })
  return enCurso
}
