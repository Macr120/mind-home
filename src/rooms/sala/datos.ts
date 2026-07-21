import {
  bitacoraViajeRepo,
  diasItinerarioRepo,
  lugaresViajeRepo,
  metasRepo,
  portadasLugarRepo,
  rutasViajeRepo,
} from '../../core/data/repository'

/** Elimina un lugar y limpia todo lo que cuelga de él (bitácora, rutas, plan, portada, meta). */
export async function eliminarLugar(id: number) {
  for (const e of await bitacoraViajeRepo.list()) {
    if (e.lugarId === id && e.id) await bitacoraViajeRepo.remove(e.id)
  }
  for (const r of await rutasViajeRepo.list()) {
    if (r.id && r.lugarIds.includes(id)) {
      await rutasViajeRepo.update(r.id, { lugarIds: r.lugarIds.filter((l) => l !== id) })
    }
  }
  // Días de su plan.
  for (const d of await diasItinerarioRepo.list()) {
    if (d.lugarId === id && d.id) await diasItinerarioRepo.remove(d.id)
  }
  // Portada de su álbum en la bitácora.
  for (const p of await portadasLugarRepo.list()) {
    if (p.lugarId === id && p.id) await portadasLugarRepo.remove(p.id)
  }
  // Meta de ahorro vinculada en el despacho.
  const lugar = (await lugaresViajeRepo.list()).find((l) => l.id === id)
  if (lugar?.metaId) await metasRepo.remove(lugar.metaId)
  await lugaresViajeRepo.remove(id)
}

/** Nombre corto de un lugar con su contexto ("Kioto · Japón"). */
export function etiquetaLugar(l: { nombre: string; ciudad?: string; pais: string }) {
  const contexto = l.ciudad && l.ciudad !== l.nombre ? `${l.ciudad}, ${l.pais}` : l.pais
  return contexto && contexto !== l.nombre ? `${l.nombre} · ${contexto}` : l.nombre
}
