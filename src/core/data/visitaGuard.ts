/**
 * Guard de la visita (middleware DBCore).
 *
 * En la casa de otro NO se escribe: la BD `mind-home-visita` es una copia
 * desechable del plano del anfitrión y cualquier mutación que no sea el volcado
 * inicial se DESCARTA. No lanza —como `probarGuard`— porque media app escribe
 * sola al arrancar (seeds, reparaciones, rachas, avisos) y un `reject` llenaría
 * la consola de errores y rompería flujos que no tienen nada que ver con la
 * visita: se responde un `DBCoreMutateResponse` válido y sin efecto.
 *
 * Se instala en `db.ts` únicamente con `esVisita()`, por FUERA del middleware de
 * sync (level 2 > 1), así un solo punto cubre repos, stores de la casa, seeds y
 * cualquier código futuro.
 *
 * La exención del volcado va por la MARCA DE TRANSACCIÓN de
 * `marcarEscrituraSilenciosa()` y no por una bandera de módulo: la bandera
 * abriría una ventana de tiempo en la que TODA escritura de cualquier otro
 * módulo pasaría (los stores hidratan y los seeds arrancan justo entonces),
 * mientras que la marca solo exime a la transacción concreta del volcado.
 */
import type { DBCore, DBCoreMutateRequest, DBCoreMutateResponse, Middleware } from 'dexie'

interface TransMarcada {
  __mhAplicandoPull?: boolean
}

/** Respuesta «no pasó nada» que Dexie sabe interpretar (add/put/delete/bulk*). */
const SIN_EFECTO: DBCoreMutateResponse = { numFailures: 0, failures: [], results: [], lastResult: undefined }

let descartadas = 0

/** Cuántas escrituras se han tirado en esta visita (HUD de DEV). */
export function escriturasDescartadas(): number {
  return descartadas
}

export const visitaGuard: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'mh-visita-solo-lectura',
  level: 2,
  create(down) {
    return {
      ...down,
      table(nombre) {
        const tabla = down.table(nombre)
        // Las internas (`_outbox`, `_syncMeta`, caché del buzón) sí escriben: el
        // buzón sigue vivo durante la visita para poder chatear con el anfitrión.
        if (nombre.startsWith('_')) return tabla
        return {
          ...tabla,
          mutate(req: DBCoreMutateRequest): Promise<DBCoreMutateResponse> {
            if ((req.trans as TransMarcada).__mhAplicandoPull === true) return tabla.mutate(req)
            descartadas += 1
            return Promise.resolve(SIN_EFECTO)
          },
        }
      },
    }
  },
}
