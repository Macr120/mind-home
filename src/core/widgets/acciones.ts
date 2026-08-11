import { db } from '../data/db'
import { marcarActividadHecha } from '../rutinas'
import { marcarMetaDiaria } from '../metaDiaria'
import type { AccionWidget } from './tipos'

/**
 * Ejecuta las acciones que el widget dejó encoladas, con la MISMA lógica que la
 * UI: una rutina se fija con `marcarActividadHecha` (cubre con y sin pasos) y
 * una meta con `marcarMetaDiaria`, igual que la barra del cuarto — la cascada al
 * calendario la hace el reloj de avisos, como siempre. Las acciones fijan
 * estado, no toggle: aplicar dos veces la misma es inocuo.
 */
export async function aplicarAccionesPendientes(acciones: AccionWidget[]): Promise<void> {
  // Orden de tap: si palomeó y despalomeó el mismo ítem, gana el último.
  const orden = [...acciones].sort((a, b) => a.ts - b.ts)
  for (const a of orden) {
    try {
      if (a.tipo === 'rutina') {
        const rutina = await db.rutinas.get(Number(a.id.slice('rutina:'.length)))
        // Borrada entre el tap y la apertura: se descarta en silencio.
        if (rutina) await marcarActividadHecha(rutina, a.fecha, a.hecho)
      } else if (a.tipo === 'meta') {
        await marcarMetaDiaria(a.id.slice('meta:'.length), a.fecha, a.hecho)
      }
    } catch (err) {
      console.warn('[Widgets] acción no aplicada:', a.id, err)
    }
  }
}
