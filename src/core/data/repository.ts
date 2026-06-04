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
      return useLiveQuery(() => {
        const q = table.orderBy(orderBy)
        return (reverse ? q.reverse() : q).toArray()
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
export const anecdotasRepo = createRepository(db.anecdotas)
export const metasRepo = createRepository(db.metas, 'id', false)
export const presupuestosRepo = createRepository(db.presupuestos, 'id', false)
