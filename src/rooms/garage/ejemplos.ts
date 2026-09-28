import {
  registrosMantenimientoRepo,
  talleresVehiculoRepo,
  tramitesVehiculoRepo,
  vehiculosRepo,
} from '../../core/data/repository'
import type { PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { reconciliarGarage } from './calendario'
import { sembrarEjemploGarage } from './seed'
import { borrarTaller, borrarTramite, borrarVehiculo } from './tramites'

/** Fila de la siembra de fábrica, tocada o no: la delata su uid (`seed-…`). */
const deFabrica = (fila: unknown) => !!(fila as { uid?: string }).uid?.startsWith('seed-')

const TABLAS = [vehiculosRepo, talleresVehiculoRepo, tramitesVehiculoRepo, registrosMantenimientoRepo]

/**
 * El ejemplo de fábrica del garaje: la bici y el auto con sus servicios, sus
 * trámites y dos contactos. Lo siembra la propia app al abrirse vacía
 * (`sembrarGarage`, filas `seed-…` sin marca): la barra solo lo borra y lo
 * restaura, y los trámites se van y vuelven con sus bloques del calendario.
 */
export const ejemploGarage: PaqueteEjemplo = {
  id: 'garage.vehiculos',
  // Sus filas no llevan `ejemploDe`: lo que la barra necesita saber de ellas lo
  // contestan `hayEjemplo` y `hayPropios`.
  tablas: [],
  auto: false,
  async hayEjemplo() {
    for (const t of TABLAS) if (await t.alguna(deFabrica)) return true
    return false
  },
  async hayPropios() {
    for (const t of TABLAS) if (await t.alguna((f: unknown) => !deFabrica(f))) return true
    return false
  },
  async borrar() {
    // Con las bajas de la propia app: el vehículo se lleva su historial y sus
    // trámites (con lo que tenían en el calendario), y el contacto desliga los
    // trámites del usuario que lo usaban.
    for (const v of (await vehiculosRepo.list()).filter(deFabrica)) if (v.id != null) await borrarVehiculo(v.id)
    for (const t of (await tramitesVehiculoRepo.list()).filter(deFabrica)) await borrarTramite(t)
    for (const r of (await registrosMantenimientoRepo.list()).filter(deFabrica)) {
      if (r.id != null) await registrosMantenimientoRepo.remove(r.id)
    }
    for (const c of (await talleresVehiculoRepo.list()).filter(deFabrica)) await borrarTaller(c)
  },
  async materializar(restaurar) {
    await sembrarEjemploGarage(restaurar)
    await reconciliarGarage()
  },
}
