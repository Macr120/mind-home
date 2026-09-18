import { db } from '../data/db'
import { fijarSyncHistorial, syncHistorialActivo } from '../data/sync/syncables'

export { syncHistorialActivo }

/**
 * Enciende el sync del historial de páginas. Las filas escritas con la
 * compuerta cerrada no llevan `uid` ni `updatedAt` ni están en el outbox: se
 * «tocan» una a una y el middleware del sync las sella y encola (la compuerta
 * ya está abierta cuando se escriben). Después se dispara un ciclo.
 *
 * Limitación conocida: lo que otros dispositivos subieron ANTES de encender
 * aquí no se baja (el cursor global ya pasó); de ahora en adelante sí.
 */
export async function activarSyncHistorial(): Promise<void> {
  fijarSyncHistorial(true)
  const filas = await db.historialWeb.toArray()
  // Un cambio REAL por fila (Dexie no escribe si nada cambia): el middleware
  // conserva el uid que se le da y encola el upsert.
  for (const f of filas) {
    if (f.id == null) continue
    await db.historialWeb.update(f.id, { uid: f.uid || crypto.randomUUID(), updatedAt: Date.now() } as Partial<typeof f>)
  }
  void import('../data/sync/motor')
    .then((m) => m.sincronizar(true))
    .catch(() => {
      /* sin sesión o sin red: el próximo ciclo lo recoge */
    })
}

/** Apaga el sync: deja de encolar. Lo ya subido se queda en la nube (bórralo con «Borrar historial» antes si no lo quieres allí). */
export function desactivarSyncHistorial(): void {
  fijarSyncHistorial(false)
}
