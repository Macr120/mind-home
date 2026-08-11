/**
 * Middleware DBCore de sincronización: intercepta TODA mutación de las tablas
 * sincronizables (repos, stores Zustand con acceso directo, seeds y el restore
 * de respaldos en Configuraciones) para:
 *  - sellar identidad global `uid` (UUID) y `updatedAt` (época ms, LWW), y
 *  - encolar el cambio en `_outbox` DENTRO de la misma transacción (atómico y
 *    seguro multi-pestaña). `db.ts` amplía toda transacción de escritura con
 *    `_outbox` para que esto sea posible (patrón de dexie-observable).
 *
 * El motor de pull marca sus transacciones con `__mhAplicandoPull` para
 * escribir sin eco: sin outbox y conservando uid/updatedAt remotos.
 */
import Dexie, {
  type DBCore,
  type DBCoreMutateRequest,
  type DBCoreMutateResponse,
  type DBCoreTransaction,
  type Middleware,
} from 'dexie'
import { esDemo } from '../../edicion'
import { esTablaSync } from './syncables'

export type OpOutbox = 'upsert' | 'delete'

export interface EntradaOutbox {
  id?: number
  tabla: string
  uid: string
  op: OpOutbox
}

interface TransPull extends DBCoreTransaction {
  __mhAplicandoPull?: boolean
}

type Fila = Record<string, unknown>

/** El motor de sync se suscribe aquí para su debounce de push tras escrituras. */
let alEscribirLocal: (() => void) | null = null
export function conectarAvisoEscritura(fn: (() => void) | null): void {
  alEscribirLocal = fn
}

/**
 * Marca la transacción Dexie ACTUAL como escritura silenciosa: este middleware
 * la deja pasar sin sellar uid/updatedAt ni encolar en `_outbox`, y el marcador
 * del demo tampoco la apunta. La usan el pull del motor y la construcción de la
 * casa demo (miles de filas que jamás deben sincronizarse).
 */
export function marcarEscrituraSilenciosa(): void {
  const t = Dexie.currentTransaction as unknown as {
    idbtrans?: { __mhAplicandoPull?: boolean }
  } | null
  if (t?.idbtrans) t.idbtrans.__mhAplicandoPull = true
}

/**
 * Construcción de la casa demo: sus miles de filas llenaban `_outbox` con el año
 * entero de Pep@ para tirarlo al final (en demo el motor de sync ni arranca).
 * `marcarEscrituraSilenciosa` no sirve aquí —marca la transacción actual y cada
 * `repo.add` es la suya— y además saltaría el sellado de `uid`, que algún
 * builder necesita para reescribir filas del seed. Esto salta SOLO el encolado.
 */
let sinOutbox = false
export function setSinOutbox(v: boolean): void {
  // Cinturón: fuera del demo la cola es el sustento del sync.
  if (esDemo()) sinOutbox = v
}

function sellar(v: Fila): void {
  if (typeof v.uid !== 'string' || !v.uid) v.uid = crypto.randomUUID()
  // Los seeds (uid determinista `seed-…`) conservan su updatedAt bajo: la
  // edición real de cualquier dispositivo les gana por LWW.
  const esSeed = (v.uid as string).startsWith('seed-')
  if (!esSeed || typeof v.updatedAt !== 'number') v.updatedAt = Date.now()
}

export const syncMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'mh-sync-outbox',
  level: 1,
  create(down) {
    return {
      ...down,
      table(nombre) {
        const tabla = down.table(nombre)
        if (!esTablaSync(nombre)) return tabla
        // Upgrade desde una BD anterior a v89: Dexie genera los stacks con el
        // esquema REAL de la BD, donde `_outbox` aún no existe (la crea el
        // paso v89). Sin cola no hay nada que registrar: la tabla pasa tal
        // cual, y al llegar el upgrade a v89 los stacks se regeneran ya con
        // `_outbox` creada. Resolverla aquí sin este guard rompía la
        // migración entera ("Table '_outbox' not found").
        if (!down.schema.tables.some((t) => t.name === '_outbox')) return tabla
        const outbox = down.table('_outbox')
        const kp = tabla.schema.primaryKey.keyPath as string

        const encolar = async (trans: DBCoreTransaction, entradas: EntradaOutbox[]) => {
          if (sinOutbox || !entradas.length) return
          await outbox.mutate({ type: 'add', trans, values: entradas })
          alEscribirLocal?.()
        }

        return {
          ...tabla,
          async mutate(req: DBCoreMutateRequest): Promise<DBCoreMutateResponse> {
            const trans = req.trans as TransPull
            if (trans.__mhAplicandoPull === true) return tabla.mutate(req)

            if (req.type === 'add' || req.type === 'put') {
              const valores = req.values as Fila[]
              // put: heredar el uid de la fila existente con la misma PK (los
              // stores de la casa hacen put del objeto completo, sin uid si el
              // registro nació antes de v89 o fue clonado).
              if (req.type === 'put') {
                const idx: number[] = []
                const claves: unknown[] = []
                valores.forEach((v, i) => {
                  const k = v?.[kp]
                  if (k != null && (typeof v.uid !== 'string' || !v.uid)) {
                    idx.push(i)
                    claves.push(k)
                  }
                })
                if (claves.length) {
                  const existentes = (await tabla.getMany({
                    trans: req.trans,
                    keys: claves,
                  })) as (Fila | undefined)[]
                  existentes.forEach((fila, j) => {
                    if (fila && typeof fila.uid === 'string') valores[idx[j]].uid = fila.uid
                  })
                }
              }
              for (const v of valores) sellar(v)
              const res = await tabla.mutate(req)
              const entradas: EntradaOutbox[] = []
              valores.forEach((v, i) => {
                if (res.failures?.[i]) return
                if (typeof v.uid === 'string') {
                  entradas.push({ tabla: nombre, uid: v.uid, op: 'upsert' })
                }
              })
              await encolar(req.trans, entradas)
              return res
            }

            if (req.type === 'delete') {
              const filas = (await tabla.getMany({ trans: req.trans, keys: req.keys })) as (
                | Fila
                | undefined
              )[]
              const res = await tabla.mutate(req)
              const entradas: EntradaOutbox[] = []
              for (const f of filas) {
                if (f && typeof f.uid === 'string') {
                  entradas.push({ tabla: nombre, uid: f.uid, op: 'delete' })
                }
              }
              await encolar(req.trans, entradas)
              return res
            }

            if (req.type === 'deleteRange') {
              // Cubre `clear()` (restaurar respaldo) y borrados por rango.
              const q = await tabla.query({
                trans: req.trans,
                values: true,
                query: { index: tabla.schema.primaryKey, range: req.range },
              })
              const filas = q.result as Fila[]
              const res = await tabla.mutate(req)
              const entradas: EntradaOutbox[] = []
              for (const f of filas) {
                if (typeof f.uid === 'string') {
                  entradas.push({ tabla: nombre, uid: f.uid, op: 'delete' })
                }
              }
              await encolar(req.trans, entradas)
              return res
            }

            return tabla.mutate(req)
          },
        }
      },
    }
  },
}
