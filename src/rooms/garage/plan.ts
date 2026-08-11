import {
  registrosMantenimientoRepo,
  tramitesVehiculoRepo,
  vehiculosRepo,
} from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { CLAUSULA_RECHAZO, type ContextoPlanApp } from '../../core/planIA'

/**
 * Acotamiento del planificador ✨ en el Garaje: el plan es SIEMPRE de
 * mantenimiento — poner un vehículo al día y dejarlo así.
 *
 * El material son los TRÁMITES pendientes, que ya traen su fecha de
 * vencimiento: el plan los ordena por urgencia en vez de inventarse plazos.
 */
export async function planMetasGarage(): Promise<ContextoPlanApp> {
  const hoy = fechaLocalISO()
  const vehiculos = await vehiculosRepo.list()
  const tramites = (await tramitesVehiculoRepo.list())
    .filter((t) => t.activo && t.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const contexto: string[] = []
  if (vehiculos.length > 0)
    contexto.push(`Vehículos: ${vehiculos.map((v) => `${v.nombre} (${v.tipo})`).join(', ')}.`)
  const servicios = await registrosMantenimientoRepo.list()
  if (servicios.length > 0) {
    const ultimo = servicios.reduce((a, b) => (a.fecha > b.fecha ? a : b))
    contexto.push(`Último servicio: ${ultimo.titulo}, el ${ultimo.fecha}.`)
  }
  if (tramites.length > 0)
    contexto.push(
      `Trámites por vencer: ${tramites.slice(0, 5).map((t) => `${t.titulo} (${t.fecha})`).join(', ')}.`,
    )

  return {
    guia: [
      'La meta es de la app del Garaje (vehículos, servicios y trámites): el plan es SIEMPRE de mantenimiento de un vehículo.',
      'Las fases se ordenan por URGENCIA REAL: primero lo que tiene fecha legal (verificación, tenencia, seguro), después lo que ya falla, y al final lo preventivo.',
      'Los hijos son servicios o gestiones concretas («Cambiar frenos y líquido», «Renovar la tenencia»), con su taller o trámite.',
      'No inventes intervalos: si no sabes cada cuánto toca algo, dilo en el nombre del nodo («Revisar si toca cambiar…»).',
      CLAUSULA_RECHAZO('un vehículo, su mantenimiento o sus trámites'),
    ],
    contexto,
    ejemplo: tGlobal('garage.plan.ejemplo', 'Dejar el coche listo para el invierno'),
    material:
      tramites.length > 0
        ? {
            titulo: tGlobal('garage.plan.material', 'Trámites del plan'),
            instruccion:
              'El material son trámites pendientes con su fecha de vencimiento. Coloca en el plan los que caen dentro de su periodo y en el motivo di qué pasa si se dejan pasar. Deja "rutina" vacía.',
            items: tramites.slice(0, 12).map((t) => ({
              nombre: t.titulo,
              detalle: `${t.tipo} · vence ${t.fecha}`,
            })),
          }
        : undefined,
  }
}
