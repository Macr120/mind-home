import { db } from '../core/data/db'
import { esObjetoLibreria } from '../core/state/disenoStore'
import { esPantalla } from '../core/house/pantallaFoto'

/**
 * Ejemplos de pantallas personalizadas en la casa de Pep@: las TV pasan GIF
 * animados (chimenea, acuario) y los monitores, imágenes fijas. Los archivos
 * viven en `public/demo/pantallas/`; se van alternando entre las pantallas.
 */
const TELES = ['chimenea.gif', 'acuario.gif']
const MONITORES = ['tablero.webp', 'atardecer.webp']

async function bajar(archivo: string): Promise<Blob | null> {
  try {
    const resp = await fetch(`/demo/pantallas/${archivo}`, { signal: AbortSignal.timeout(10_000) })
    // El dev server responde index.html (200) para rutas inexistentes.
    if (!resp.ok || !resp.headers.get('content-type')?.startsWith('image/')) return null
    return await resp.blob()
  } catch {
    return null // decorativo: sin red, las pantallas se quedan de color
  }
}

export async function ponerPantallasDemo(): Promise<void> {
  const pantallas = (await db.objetosCuarto.toArray()).filter(
    (o) => o.id != null && esPantalla(o) && !esObjetoLibreria(o) && !o.separado && !o.foto,
  )
  if (!pantallas.length) return
  const blobs = new Map<string, Blob | null>()
  const deLista = async (lista: string[], i: number) => {
    const archivo = lista[i % lista.length]
    if (!blobs.has(archivo)) blobs.set(archivo, await bajar(archivo))
    return blobs.get(archivo) ?? null
  }
  let teles = 0
  let monitores = 0
  for (const o of pantallas) {
    const tele = o.tipo === 'recurso:58' || o.tipo === 'recurso:69'
    const foto = tele ? await deLista(TELES, teles++) : await deLista(MONITORES, monitores++)
    if (foto) await db.objetosCuarto.update(o.id!, { foto })
  }
}
