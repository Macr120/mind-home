import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Table, UpdateSpec } from 'dexie'

/**
 * Fábrica de repositorios reactivos sobre una tabla de Dexie.
 *
 * Cada cuarto usa un repositorio en vez de tocar la base directamente.
 * Esto es la "capa de datos abstracta": para migrar a la nube se reimplementa
 * aquí (mismas firmas) y las apps no se enteran.
 */
export function createRepository<T extends { id?: number }>(
  table: Table<T, number>,
  orderBy = 'fecha',
  reverse = true,
) {
  return {
    /** Hook reactivo: la UI se actualiza sola al cambiar los datos. */
    useAll(): T[] | undefined {
      return useLiveQuery(async () => {
        try {
          const q = table.orderBy(orderBy)
          return await (reverse ? q.reverse() : q).toArray()
        } catch {
          const all = await table.toArray()
          if (orderBy !== 'id') {
            all.sort((a, b) => {
              const va = (a as Record<string, unknown>)[orderBy]
              const vb = (b as Record<string, unknown>)[orderBy]
              if (typeof va === 'string' && typeof vb === 'string') {
                return reverse ? vb.localeCompare(va) : va.localeCompare(vb)
              }
              return reverse ? Number(vb) - Number(va) : Number(va) - Number(vb)
            })
          } else if (reverse) {
            all.reverse()
          }
          return all
        }
      }, [])
    },
    async add(item: Omit<T, 'id'>): Promise<number> {
      return table.add(item as T)
    },
    async update(id: number, cambios: UpdateSpec<T>): Promise<number> {
      return table.update(id, cambios)
    },
    async remove(id: number): Promise<void> {
      return table.delete(id)
    },
  }
}

export const finanzasRepo = createRepository(db.transacciones)
export const suenoRepo = createRepository(db.sueno)
export const perfilDescansoRepo = createRepository(db.perfilDescanso, 'id', false)
export const anecdotasRepo = createRepository(db.anecdotas)
export const metasRepo = createRepository(db.metas, 'id', false)
export const presupuestosRepo = createRepository(db.presupuestos, 'id', false)

export const comidasRepo = createRepository(db.registrosComida)
export const planComidasRepo = createRepository(db.planComidas)
export const aguaRepo = createRepository(db.registrosAgua)
export const favoritosRepo = createRepository(db.alimentosFavoritos, 'nombre', false)
export const perfilNutricionRepo = createRepository(db.perfilNutricion, 'id', false)

export const sesionesEjercicioRepo = createRepository(db.sesionesEjercicio)
export const seriesFuerzaRepo = createRepository(db.seriesFuerza, 'orden', false)
export const perfilEjercicioRepo = createRepository(db.perfilEjercicio, 'id', false)

export const mediaArchivoRepo = createRepository(db.mediaArchivo, 'creadoEn')
export const juegosMesaRepo = createRepository(db.juegosMesa, 'creadoEn')
export const progresoTemaRepo = createRepository(db.progresoTema, 'actualizadoEn')
export const noticiasRepo = createRepository(db.noticias)

export const viajesRepo = createRepository(db.viajes, 'fechaInicio')
export const actividadesViajeRepo = createRepository(db.actividadesViaje, 'orden', false)
export const gastosViajeRepo = createRepository(db.gastosViaje)
export const checklistViajeRepo = createRepository(db.checklistViaje, 'id', false)

export function useActividadesViaje(viajeId: number | null) {
  return useLiveQuery(
    () =>
      viajeId
        ? db.actividadesViaje.where('viajeId').equals(viajeId).sortBy('orden')
        : [],
    [viajeId],
  )
}

export function useGastosViaje(viajeId: number | null) {
  return useLiveQuery(async () => {
    if (!viajeId) return []
    const rows = await db.gastosViaje.where('viajeId').equals(viajeId).toArray()
    return rows.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [viajeId])
}

export function useChecklistViaje(viajeId: number | null) {
  return useLiveQuery(
    () =>
      viajeId ? db.checklistViaje.where('viajeId').equals(viajeId).toArray() : [],
    [viajeId],
  )
}

export const sesionesMindfulnessRepo = createRepository(db.sesionesMindfulness)
export const registroAnimoRepo = createRepository(db.registroAnimo)
export const gratitudDiariaRepo = createRepository(db.gratitudDiaria)
export const perfilMindfulnessRepo = createRepository(db.perfilMindfulness, 'id', false)

export const vehiculosRepo = createRepository(db.vehiculos, 'creadoEn')
export const registrosMantenimientoRepo = createRepository(db.registrosMantenimiento)

export function useMantenimientosVehiculo(vehiculoId: number | null) {
  return useLiveQuery(async () => {
    if (!vehiculoId) return []
    const rows = await db.registrosMantenimiento
      .where('vehiculoId')
      .equals(vehiculoId)
      .toArray()
    return rows.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [vehiculoId])
}

/** Series de una sesión de fuerza (reactivo). */
export function useSeriesSesion(sesionId: number | null) {
  return useLiveQuery(
    () =>
      sesionId
        ? db.seriesFuerza.where('sesionId').equals(sesionId).sortBy('orden')
        : [],
    [sesionId],
  )
}
