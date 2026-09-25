import type { MedioVideo, ProyectoVideo } from '../../core/data/db'
import { asegurarBlob, idMedioPorUid } from '../../core/data/repository'
import { mapearMedios, mediosUsados } from './modelo'

/**
 * Medios del Studio de video en la nube del usuario (`EnNube`, ver
 * `core/studio/nubeStudio.ts`): en otro dispositivo la fila llega por el sync
 * SIN el blob y se baja al necesitarlo.
 */

/** El blob de un medio: el local o, si vino de otro dispositivo, bajado de la nube. */
export async function blobDeMedio(m: MedioVideo): Promise<Blob | null> {
  return m.blob ?? (m.id == null ? null : await asegurarBlob('mediosVideo', m.id))
}

/**
 * Los clips guardan ids numéricos LOCALES de `mediosVideo`, que en otro
 * dispositivo apuntan a otra fila. Al guardar, el proyecto lleva al lado su
 * mapa id local → uid (`mediosUid`); al abrirlo en otro dispositivo, cada id se
 * traduce al id local de la fila con ese uid. Los ids sin entrada se quedan tal
 * cual (medios que nunca subieron: siguen resolviendo solo donde nacieron).
 */
export function mapaUidsDe(p: ProyectoVideo, medios: MedioVideo[]): Record<number, string> {
  const porId = new Map(medios.map((m) => [m.id, m]))
  const mapa: Record<number, string> = {}
  for (const id of mediosUsados(p)) {
    const uid = (porId.get(id) as (MedioVideo & { uid?: string }) | undefined)?.uid
    if (uid) mapa[id] = uid
  }
  return mapa
}

/** Proyecto con sus ids de medios traducidos a los de ESTE dispositivo (null si no hubo nada que traducir). */
export async function remapearMedios(p: ProyectoVideo): Promise<ProyectoVideo | null> {
  const mapa = p.mediosUid
  if (!mapa) return null
  const locales = new Map<number, number>()
  for (const [idViejo, uid] of Object.entries(mapa)) {
    const idLocal = await idMedioPorUid(uid)
    if (idLocal != null && idLocal !== Number(idViejo)) locales.set(Number(idViejo), idLocal)
  }
  if (!locales.size) return null
  const nuevoMapa: Record<number, string> = {}
  for (const [idViejo, uid] of Object.entries(mapa)) nuevoMapa[locales.get(Number(idViejo)) ?? Number(idViejo)] = uid
  return { ...mapearMedios(p, (id) => locales.get(id) ?? id), mediosUid: nuevoMapa }
}
