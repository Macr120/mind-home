import type {
  AjustesCiclo,
  ContactoAgenda,
  Cuidado,
  CuidadoMascota,
  DiaCiclo,
  EventoAgenda,
  Mascota,
  Medicamento,
} from '../../core/data/db'
import {
  ajustesCicloRepo,
  borrarContactoAgenda,
  borrarMascotaAgenda,
  contactosAgendaRepo,
  cuidadosMascotaRepo,
  cuidadosRepo,
  diasCicloRepo,
  eventosAgendaRepo,
  mascotasRepo,
  medicamentosRepo,
} from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import {
  borrarRutinasDeCuidado,
  borrarRutinasDeCuidadoPersona,
  borrarRutinasDeCumple,
  borrarRutinasDeEvento,
  borrarRutinasDeMedicamento,
  palomearEventoAgenda,
  sincronizarCiclo,
  sincronizarCuidado,
  sincronizarCuidadoPersona,
  sincronizarCumple,
  sincronizarEventoAgenda,
  sincronizarMedicamento,
} from './calendario'
import { predecir } from './ciclo'
import { nuevoId } from './ids'
import { sumarMeses } from './mascotas'

/**
 * Altas y bajas de la agenda. Todo pasa por aquí para que ninguna pantalla pueda
 * guardar sin actualizar el bloque que le corresponde en el calendario.
 */

type DatosEvento = Omit<EventoAgenda, 'id' | 'evId' | 'creadoEn'>
type DatosContacto = Omit<ContactoAgenda, 'id' | 'contactoId' | 'creadoEn'>
type DatosMedicamento = Omit<Medicamento, 'id' | 'medId' | 'creadoEn'>
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

// ----- Cuidados tuyos y de los prójimos -----

type DatosCuidadoPersona = Omit<Cuidado, 'id' | 'cuidadoId' | 'creadoEn'>

export async function guardarCuidadoPersona(
  previo: Cuidado | null,
  datos: DatosCuidadoPersona,
  nombreDueno: string | null,
): Promise<void> {
  const fila: Omit<Cuidado, 'id'> = {
    ...datos,
    cuidadoId: previo?.cuidadoId ?? nuevoId('cp'),
    creadoEn: previo?.creadoEn ?? new Date().toISOString(),
  }
  if (previo?.id != null) await cuidadosRepo.update(previo.id, fila)
  else await cuidadosRepo.add(fila)
  await sincronizarCuidadoPersona(fila as Cuidado, nombreDueno)
}

export async function borrarCuidadoPersona(c: Cuidado): Promise<void> {
  if (c.id != null) await cuidadosRepo.remove(c.id)
  await borrarRutinasDeCuidadoPersona(c.cuidadoId)
}

/** Mismo empujón que el de mascota: la próxima vez se va al siguiente periodo. */
export async function completarCuidadoPersona(c: Cuidado, nombreDueno: string | null): Promise<void> {
  if (c.id == null) return
  const hoy = fechaLocalISO()
  const cambios: Partial<Cuidado> = { ultima: hoy }
  if (c.cadaMeses && c.cadaMeses > 0) {
    let proxima = sumarMeses(c.fecha, c.cadaMeses)
    while (proxima <= hoy) proxima = sumarMeses(proxima, c.cadaMeses)
    cambios.fecha = proxima
  } else {
    cambios.activo = false
  }
  await cuidadosRepo.update(c.id, cambios)
  await sincronizarCuidadoPersona({ ...c, ...cambios }, nombreDueno)
}

export async function reactivarCuidadoPersona(c: Cuidado, nombreDueno: string | null): Promise<void> {
  if (c.id == null) return
  await cuidadosRepo.update(c.id, { activo: true })
  await sincronizarCuidadoPersona({ ...c, activo: true }, nombreDueno)
}

// ----- Ciclo -----

export const AJUSTES_CICLO_INICIALES: Omit<AjustesCiclo, 'id'> = {
  activo: false,
  duracionCicloMedia: 28,
  duracionPeriodoMedia: 5,
  avisarAntes: 2,
  creadoEn: new Date().toISOString(),
}

/** Lee la única fila de ajustes, creándola la primera vez. */
export async function obtenerAjustesCiclo(): Promise<AjustesCiclo> {
  const filas = await ajustesCicloRepo.list()
  if (filas[0]) return filas[0]
  const id = await ajustesCicloRepo.add({ ...AJUSTES_CICLO_INICIALES })
  return { ...AJUSTES_CICLO_INICIALES, id: id as number }
}

/**
 * Reescribe el aviso del calendario con la predicción de AHORA. Se llama tras
 * cada cambio (día registrado o ajuste tocado) porque la estimación se mueve con
 * cada dato nuevo.
 */
async function refrescarAvisoCiclo(ajustes: AjustesCiclo): Promise<void> {
  const dias = await diasCicloRepo.list()
  await sincronizarCiclo(ajustes, predecir(dias, ajustes.duracionCicloMedia).proximo)
}

export async function guardarAjustesCiclo(cambios: Partial<AjustesCiclo>): Promise<void> {
  const previo = await obtenerAjustesCiclo()
  if (previo.id != null) await ajustesCicloRepo.update(previo.id, cambios)
  await refrescarAvisoCiclo({ ...previo, ...cambios })
}

/**
 * Registra (o corrige) un día. Un día sin sangrado, sin síntomas y sin nota se
 * borra en vez de guardarse vacío: así desmarcar deshace de verdad.
 */
export async function guardarDiaCiclo(
  fecha: string,
  datos: Pick<DiaCiclo, 'sangrado' | 'sintomas' | 'animo' | 'nota'>,
): Promise<void> {
  const previo = (await diasCicloRepo.list()).find((d) => d.fecha === fecha)
  const vacio = !datos.sangrado && !datos.sintomas.length && datos.animo == null && !datos.nota
  if (vacio) {
    if (previo?.id != null) await diasCicloRepo.remove(previo.id)
  } else if (previo?.id != null) {
    await diasCicloRepo.update(previo.id, datos)
  } else {
    await diasCicloRepo.add({ fecha, ...datos, creadoEn: new Date().toISOString() })
  }
  await refrescarAvisoCiclo(await obtenerAjustesCiclo())
}
