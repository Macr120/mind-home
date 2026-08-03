import type {
  ContactoAgenda,
  CuidadoMascota,
  EventoAgenda,
  Mascota,
  Medicamento,
  ProyectoAgenda,
} from '../../core/data/db'
import {
  borrarContactoAgenda,
  borrarMascotaAgenda,
  borrarProyectoAgenda,
  contactosAgendaRepo,
  cuidadosMascotaRepo,
  eventosAgendaRepo,
  mascotasRepo,
  medicamentosRepo,
  proyectosAgendaRepo,
} from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import {
  borrarRutinasDeCuidado,
  borrarRutinasDeCumple,
  borrarRutinasDeEvento,
  borrarRutinasDeMedicamento,
  palomearEventoAgenda,
  sincronizarCuidado,
  sincronizarCumple,
  sincronizarEventoAgenda,
  sincronizarMedicamento,
} from './calendario'
import { nuevoId } from './ids'
import { sumarMeses } from './mascotas'

/**
 * Altas y bajas de la agenda. Todo pasa por aquí para que ninguna pantalla pueda
 * guardar sin actualizar el bloque que le corresponde en el calendario.
 */

type DatosEvento = Omit<EventoAgenda, 'id' | 'evId' | 'creadoEn'>
type DatosContacto = Omit<ContactoAgenda, 'id' | 'contactoId' | 'creadoEn'>
type DatosMedicamento = Omit<Medicamento, 'id' | 'medId' | 'creadoEn'>
type DatosProyecto = Omit<ProyectoAgenda, 'id' | 'proyId' | 'creadoEn'>
type DatosMascota = Omit<Mascota, 'id' | 'mascId' | 'creadoEn'>
type DatosCuidado = Omit<CuidadoMascota, 'id' | 'cuidadoId' | 'creadoEn'>

export async function guardarEvento(previo: EventoAgenda | null, datos: DatosEvento): Promise<void> {
  const fila: Omit<EventoAgenda, 'id'> = {
    ...datos,
    evId: previo?.evId ?? nuevoId('ag'),
    creadoEn: previo?.creadoEn ?? new Date().toISOString(),
  }
  if (previo?.id != null) await eventosAgendaRepo.update(previo.id, fila)
  else await eventosAgendaRepo.add(fila)
  await sincronizarEventoAgenda(fila as EventoAgenda)
}

export async function borrarEvento(ev: EventoAgenda): Promise<void> {
  if (ev.id != null) await eventosAgendaRepo.remove(ev.id)
  await borrarRutinasDeEvento(ev.evId)
}

/** Palomea el evento y refleja la palomita en su bloque del calendario. */
export async function alternarHecho(ev: EventoAgenda): Promise<void> {
  if (ev.id == null) return
  const hecho = !ev.hecho
  await eventosAgendaRepo.update(ev.id, { hecho, hechoEn: hecho ? fechaLocalISO() : undefined })
  await palomearEventoAgenda(ev, hecho)
}

/** Columnas del tablero Kanban de Trabajo. */
export type ColumnaTablero = 'porhacer' | 'encurso' | 'hecho'

export const columnaDe = (ev: EventoAgenda): ColumnaTablero =>
  ev.hecho ? 'hecho' : ev.enCurso ? 'encurso' : 'porhacer'

/**
 * Mueve una tarjeta de columna. Entrar o salir de «Hecho» pasa SIEMPRE por
 * `alternarHecho`: es lo que palomea también su bloque del calendario, así que
 * escribir `hecho` a mano dejaría las dos vistas contándose cosas distintas.
 */
export async function moverEnTablero(ev: EventoAgenda, destino: ColumnaTablero): Promise<void> {
  const actual = columnaDe(ev)
  if (actual === destino || ev.id == null) return
  if (destino === 'hecho' || actual === 'hecho') await alternarHecho(ev)
  if (destino !== 'hecho') await eventosAgendaRepo.update(ev.id, { enCurso: destino === 'encurso' })
}

export async function guardarContacto(previo: ContactoAgenda | null, datos: DatosContacto): Promise<void> {
  const fila: Omit<ContactoAgenda, 'id'> = {
    ...datos,
    contactoId: previo?.contactoId ?? nuevoId('ct'),
    creadoEn: previo?.creadoEn ?? new Date().toISOString(),
  }
  if (previo?.id != null) await contactosAgendaRepo.update(previo.id, fila)
  else await contactosAgendaRepo.add(fila)
  await sincronizarCumple(fila as ContactoAgenda)
}

export async function borrarContacto(c: ContactoAgenda): Promise<void> {
  await borrarContactoAgenda(c.contactoId)
  await borrarRutinasDeCumple(c.contactoId)
}

export async function guardarMedicamento(previo: Medicamento | null, datos: DatosMedicamento): Promise<void> {
  const fila: Omit<Medicamento, 'id'> = {
    ...datos,
    medId: previo?.medId ?? nuevoId('md'),
    creadoEn: previo?.creadoEn ?? new Date().toISOString(),
  }
  if (previo?.id != null) await medicamentosRepo.update(previo.id, fila)
  else await medicamentosRepo.add(fila)
  await sincronizarMedicamento(fila as Medicamento)
}

export async function borrarMedicamento(m: Medicamento): Promise<void> {
  if (m.id != null) await medicamentosRepo.remove(m.id)
  await borrarRutinasDeMedicamento(m.medId)
}

/** Pausar un tratamiento quita sus tomas del calendario sin perder la ficha. */
export async function alternarMedicamento(m: Medicamento): Promise<void> {
  if (m.id == null) return
  const activo = !m.activo
  await medicamentosRepo.update(m.id, { activo })
  await sincronizarMedicamento({ ...m, activo })
}

export async function guardarProyecto(previo: ProyectoAgenda | null, datos: DatosProyecto): Promise<void> {
  const fila: Omit<ProyectoAgenda, 'id'> = {
    ...datos,
    proyId: previo?.proyId ?? nuevoId('py'),
    creadoEn: previo?.creadoEn ?? new Date().toISOString(),
  }
  if (previo?.id != null) await proyectosAgendaRepo.update(previo.id, fila)
  else await proyectosAgendaRepo.add(fila)
}

export const borrarProyecto = (p: ProyectoAgenda) => borrarProyectoAgenda(p.proyId)

// ----- Mascotas -----

export async function guardarMascota(previo: Mascota | null, datos: DatosMascota): Promise<void> {
  const fila: Omit<Mascota, 'id'> = {
    ...datos,
    mascId: previo?.mascId ?? nuevoId('ms'),
    creadoEn: previo?.creadoEn ?? new Date().toISOString(),
  }
  if (previo?.id != null) await mascotasRepo.update(previo.id, fila)
  else await mascotasRepo.add(fila)
  // El nombre viaja dentro del bloque del calendario: si cambió, sus cuidados
  // seguirían anunciando a la mascota anterior hasta la próxima reconciliación.
  if (previo && previo.nombre !== fila.nombre) {
    for (const c of await cuidadosMascotaRepo.list()) {
      if (c.mascotaId === fila.mascId) await sincronizarCuidado(c, fila.nombre)
    }
  }
}

/** Borra la ficha con sus cuidados; sus citas y tratamientos solo se desligan. */
export async function borrarMascota(m: Mascota): Promise<void> {
  for (const c of await cuidadosMascotaRepo.list()) {
    if (c.mascotaId === m.mascId) await borrarCuidado(c)
  }
  await borrarMascotaAgenda(m.mascId)
}

export async function guardarCuidado(
  previo: CuidadoMascota | null,
  datos: DatosCuidado,
  nombreMascota: string,
): Promise<void> {
  const fila: Omit<CuidadoMascota, 'id'> = {
    ...datos,
    cuidadoId: previo?.cuidadoId ?? nuevoId('cu'),
    creadoEn: previo?.creadoEn ?? new Date().toISOString(),
  }
  if (previo?.id != null) await cuidadosMascotaRepo.update(previo.id, fila)
  else await cuidadosMascotaRepo.add(fila)
  await sincronizarCuidado(fila as CuidadoMascota, nombreMascota)
}

export async function borrarCuidado(c: CuidadoMascota): Promise<void> {
  if (c.id != null) await cuidadosMascotaRepo.remove(c.id)
  await borrarRutinasDeCuidado(c.cuidadoId)
}

/**
 * Da el cuidado por hecho: anota la fecha y empuja la próxima al siguiente
 * periodo. Si venía atrasado varios periodos avanza los que hagan falta, para no
 * dejarlo otra vez en el pasado; uno de una sola vez se archiva en vez de
 * repetirse.
 */
export async function completarCuidado(c: CuidadoMascota, nombreMascota: string): Promise<void> {
  if (c.id == null) return
  const hoy = fechaLocalISO()
  const cambios: Partial<CuidadoMascota> = { ultima: hoy }
  if (c.cadaMeses && c.cadaMeses > 0) {
    let proxima = sumarMeses(c.fecha, c.cadaMeses)
    while (proxima <= hoy) proxima = sumarMeses(proxima, c.cadaMeses)
    cambios.fecha = proxima
  } else {
    cambios.activo = false
  }
  await cuidadosMascotaRepo.update(c.id, cambios)
  await sincronizarCuidado({ ...c, ...cambios }, nombreMascota)
}

/** Vuelve a poner en marcha un cuidado archivado (uno de una sola vez ya hecho). */
export async function reactivarCuidado(c: CuidadoMascota, nombreMascota: string): Promise<void> {
  if (c.id == null) return
  await cuidadosMascotaRepo.update(c.id, { activo: true })
  await sincronizarCuidado({ ...c, activo: true }, nombreMascota)
}
