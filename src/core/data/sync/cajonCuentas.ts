import Dexie, { type Table } from 'dexie'

/**
 * Cada cuenta es independiente aunque compartan el equipo: cuando entra otra,
 * lo local de la anterior (sus tablas de sync y su estado: outbox, cursor) se
 * guarda aquí, en una base aparte, y vuelve tal cual cuando ella entre de
 * nuevo. Sin esto había que escoger entre unir las dos casas o vaciar una.
 */
export interface FilaCajon {
  tabla: string
  fila: unknown
}

interface Guardada extends FilaCajon {
  n?: number
  cuenta: string
}

class Cajon extends Dexie {
  filas!: Table<Guardada, number>
  constructor() {
    super('mind-home-cuentas')
    this.version(1).stores({ filas: '++n, cuenta' })
  }
}

let cajon: Cajon | null = null
const abrir = () => (cajon ??= new Cajon())

/** Guarda (reemplazando lo anterior) lo local de `cuenta`. */
export async function guardarCuenta(cuenta: string, filas: FilaCajon[]): Promise<void> {
  const c = abrir()
  await c.transaction('rw', c.filas, async () => {
    await c.filas.where('cuenta').equals(cuenta).delete()
    for (let i = 0; i < filas.length; i += 1000) {
      await c.filas.bulkAdd(filas.slice(i, i + 1000).map((f) => ({ ...f, cuenta })))
    }
  })
}

/** Lo que `cuenta` dejó guardado (vacío si nunca se guardó). */
export async function leerCuenta(cuenta: string): Promise<FilaCajon[]> {
  return (await abrir().filas.where('cuenta').equals(cuenta).toArray()).map(({ tabla, fila }) => ({ tabla, fila }))
}

export async function borrarCuenta(cuenta: string): Promise<void> {
  await abrir().filas.where('cuenta').equals(cuenta).delete()
}
