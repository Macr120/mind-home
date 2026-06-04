import Dexie, { type Table } from 'dexie'

/**
 * Capa de datos LOCAL (IndexedDB vía Dexie).
 *
 * Este archivo es el ÚNICO punto que toca la base de datos directamente.
 * Cuando migremos a la nube (Supabase), reescribimos solo este archivo y
 * `repository.ts`; ninguna de las apps de los cuartos cambia.
 */

// ----- Entidades (modelos de datos compartidos) -----

export interface Transaccion {
  id?: number
  fecha: string // ISO yyyy-mm-dd
  tipo: 'ingreso' | 'gasto'
  categoria: string
  monto: number
  nota?: string
}

export interface RegistroSueno {
  id?: number
  fecha: string // ISO yyyy-mm-dd
  horas: number
  calidad: number // 1-5
  nota?: string
}

export interface Anecdota {
  id?: number
  fecha: string // ISO yyyy-mm-dd
  titulo: string
  contenido: string
  animo: string // emoji o palabra
}

/** Meta de ahorro (Finanzas). */
export interface Meta {
  id?: number
  nombre: string
  objetivo: number
  ahorrado: number
}

/** Presupuesto. categoria '__mensual__' = presupuesto total del mes. */
export interface Presupuesto {
  id?: number
  categoria: string
  monto: number
}

// ----- Base de datos -----

export class MindHomeDB extends Dexie {
  transacciones!: Table<Transaccion, number>
  sueno!: Table<RegistroSueno, number>
  anecdotas!: Table<Anecdota, number>
  metas!: Table<Meta, number>
  presupuestos!: Table<Presupuesto, number>

  constructor() {
    super('mind-home')
    this.version(1).stores({
      transacciones: '++id, fecha, tipo, categoria',
      sueno: '++id, fecha',
      anecdotas: '++id, fecha',
    })
    // v2: Finanzas premium (metas de ahorro y presupuestos)
    this.version(2).stores({
      metas: '++id',
      presupuestos: '++id, categoria',
    })
  }
}

export const db = new MindHomeDB()
