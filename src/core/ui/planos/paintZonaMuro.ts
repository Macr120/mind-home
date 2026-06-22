import { zonasRepo } from '../../data/repository'
import { edgeKey, type Cell, type SideKey, type WallState } from '../../house/walls'

/** Pinta el estado de una arista de zona (pared / puerta / abierto). */
export async function paintZonaMuro(
  zonaId: number,
  off: Cell,
  side: SideKey,
  estado: WallState,
): Promise<void> {
  const zonas = await zonasRepo.list()
  const zona = zonas.find((z) => z.id === zonaId)
  if (!zona) return
  const key = edgeKey(off, side)
  const muros = { ...(zona.muros ?? {}), [key]: estado }
  await zonasRepo.update(zonaId, { muros })
}
