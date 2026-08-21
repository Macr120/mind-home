import { armarPasosDeTodas } from '../hoy'
import { marcarMetaDiaria } from '../metaDiaria'
import { toggleMeta, togglePasoMeta } from '../metas'
import { hoyISO, marcarActividadHecha, marcarHecho, togglePaso } from '../rutinas'
import type { AccionWidget } from './tipos'

/**
 * Ejecuta las acciones que el widget dejó encoladas, con la MISMA lógica que la
 * fila del panel de Misiones (`ui/hoy/FilaHoy.tsx`): el widget solo encola qué
 * paso y en qué estado debe quedar, y aquí se reencuentra ese paso por su id y
 * se aplica lo que corresponda a su origen.
 *
 * Las acciones fijan estado, no lo voltean: si el paso ya está como se pidió, se
 * salta, y por eso aplicar dos veces la misma es inocuo aunque debajo haya un
 * toggle (las metas solo tienen toggle).
 */
export async function aplicarAccionesPendientes(acciones: AccionWidget[]): Promise<void> {
  // Orden de tap: si palomeó y despalomeó el mismo ítem, gana el último.
  const orden = [...acciones].sort((a, b) => a.ts - b.ts)
  for (const a of orden) {
    try {
      // Se rearma en cada vuelta a propósito: la acción anterior pudo cambiar el
      // estado de este mismo paso, y son un puñado de taps por apertura.
      const pasos = (await armarPasosDeTodas(a.fecha)).flatMap((g) => g.pasos)
      const paso = pasos.find((p) => p.id === a.id)
      // Borrado o ya cumplido por otro lado entre el tap y la apertura: nada que hacer.
      if (!paso || paso.hecho === a.hecho) continue
      const { accion } = paso
      if (accion.tipo === 'objetivo') {
        await marcarMetaDiaria(accion.plantillaId, a.fecha, a.hecho, accion.clave)
      } else if (accion.tipo === 'rutina') {
        // `togglePaso` es el camino de la app —marca el paso y, si trae esquema,
        // registra el dato real en el cuarto—, pero solo sabe de hoy: un tap
        // guardado de un día anterior se aplica sobre el bloque, que sí lleva fecha.
        if (accion.idx == null) await marcarHecho(accion.rutina, a.fecha, a.hecho)
        else if (a.fecha === hoyISO()) await togglePaso(accion.rutina, accion.idx)
        else await marcarActividadHecha(accion.rutina, a.fecha, a.hecho)
      } else if (accion.tipo === 'meta') {
        if (accion.idx == null) await toggleMeta(accion.meta)
        else await togglePasoMeta(accion.meta, accion.idx)
      }
    } catch (err) {
      console.warn('[Widgets] acción no aplicada:', a.id, err)
    }
  }
}
