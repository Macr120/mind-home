import type {
  TallerVehiculo,
  TipoMantenimiento,
  TipoTramite,
  TramiteVehiculo,
  Vehiculo,
} from '../../core/data/db'
import {
  registrosMantenimientoRepo,
  talleresVehiculoRepo,
  tramitesVehiculoRepo,
  vehiculosRepo,
} from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { borrarRutinasDeTramite, sincronizarTramite } from './calendario'
import { hoyISO, sumarMeses } from './fecha'

/**
 * Altas, bajas y cumplimiento de los trámites. Cada operación deja el calendario
 * al día: el bloque es una proyección (ver `calendario.ts`) y una escritura sin
 * su sincronización dejaría el recordatorio apuntando a la fecha vieja.
 */

/** Dónde cae el trámite cumplido dentro del historial de servicios. */
const TIPO_HISTORIAL: Record<TipoTramite, TipoMantenimiento> = {
  mantenimiento: 'revision',
  tenencia: 'licencia',
  verificacion: 'revision',
  circulacion: 'licencia',
  seguro: 'seguro',
  otro: 'otro',
}

export async function guardarTramite(
  datos: Omit<TramiteVehiculo, 'id'>,
  vehiculo: Vehiculo,
  id?: number,
): Promise<void> {
  if (id != null) await tramitesVehiculoRepo.update(id, datos)
  else await tramitesVehiculoRepo.add(datos)
  await sincronizarTramite(datos, vehiculo.nombre)
}

export async function borrarTramite(t: TramiteVehiculo): Promise<void> {
  if (t.id != null) await tramitesVehiculoRepo.remove(t.id)
  await borrarRutinasDeTramite(t.tramiteId)
}

/**
 * Da el trámite por hecho: lo anota en el historial (así cuenta en el gasto del
 * año) y empuja la fecha al siguiente periodo. Si venía vencido desde hace varios
 * periodos avanza los que hagan falta, para no dejarlo otra vez en el pasado.
 * Un trámite de una sola vez se archiva en vez de repetirse.
 */
export async function completarTramite(
  t: TramiteVehiculo,
  vehiculo: Vehiculo,
  taller?: string,
): Promise<void> {
  if (t.id == null) return
  await registrosMantenimientoRepo.add({
    vehiculoId: t.vehiculoId,
    fecha: hoyISO(),
    tipo: TIPO_HISTORIAL[t.tipo],
    titulo: t.titulo,
    costo: t.costo,
    odometro: vehiculo.odometroActual,
    taller,
    nota: t.folio ? tGlobal('garage.tram.folioNota', 'Folio: {n}', { n: t.folio }) : undefined,
  })

  const cambios: Partial<TramiteVehiculo> = {}
  if (t.cadaMeses && t.cadaMeses > 0) {
    const hoy = hoyISO()
    let proxima = sumarMeses(t.fecha, t.cadaMeses)
    while (proxima <= hoy) proxima = sumarMeses(proxima, t.cadaMeses)
    cambios.fecha = proxima
  } else {
    cambios.activo = false
  }
  await tramitesVehiculoRepo.update(t.id, cambios)
  await sincronizarTramite({ ...t, ...cambios }, vehiculo.nombre)
}

/**
 * Borra un contacto y DESLIGA los trámites que lo usaban: perder la fecha de la
 * verificación por borrar el verificentro sería destructivo. El vínculo no se
 * proyecta en el calendario, así que no hay que resincronizar nada.
 */
export async function borrarTaller(taller: TallerVehiculo): Promise<void> {
  for (const t of await tramitesVehiculoRepo.list()) {
    if (t.tallerId === taller.tallerId && t.id != null) {
      await tramitesVehiculoRepo.update(t.id, { tallerId: undefined })
    }
  }
  if (taller.id != null) await talleresVehiculoRepo.remove(taller.id)
}

/**
 * Borra el vehículo con su historial y sus trámites (con los bloques que hubiera
 * puesto en el calendario). Los contactos solo se DESLIGAN: perder el teléfono
 * del taller por dar de baja el coche sería destructivo.
 */
export async function borrarVehiculo(id: number): Promise<void> {
  for (const r of await registrosMantenimientoRepo.list()) {
    if (r.vehiculoId === id && r.id != null) await registrosMantenimientoRepo.remove(r.id)
  }
  for (const t of await tramitesVehiculoRepo.list()) {
    if (t.vehiculoId === id) await borrarTramite(t)
  }
  for (const c of await talleresVehiculoRepo.list()) {
    if (c.vehiculoId === id && c.id != null) {
      await talleresVehiculoRepo.update(c.id, { vehiculoId: undefined })
    }
  }
  await vehiculosRepo.remove(id)
}
