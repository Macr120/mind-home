import { db } from '../data/db'
import { esFija, nuevaClavePropia } from './categoriasWeb'

/**
 * Escrituras del panel del navegador sobre `sitiosWeb`, `categoriasWeb` e
 * `historialWeb` (la UI no toca la BD directamente).
 */

const ahora = () => new Date().toISOString()

/** Fija (o borra, con undefined) la categoría de un sitio; quita la marca de la IA. */
export async function fijarCategoria(sitioId: number, clave: string | undefined): Promise<void> {
  await db.sitiosWeb.update(sitioId, { categoria: clave, porIA: false, actualizadoEn: ahora() })
}

export async function alternarFavorito(sitioId: number): Promise<void> {
  const s = await db.sitiosWeb.get(sitioId)
  if (s) await db.sitiosWeb.update(sitioId, { favorito: !s.favorito, actualizadoEn: ahora() })
}

export async function fijarLimiteSitio(sitioId: number, limiteMin: number | undefined): Promise<void> {
  await db.sitiosWeb.update(sitioId, { limiteMin, actualizadoEn: ahora() })
}

/** Categoría propia nueva; devuelve su clave. */
export async function crearCategoria(nombre: string, emoji?: string): Promise<string> {
  const clave = nuevaClavePropia()
  const ultima = await db.categoriasWeb.orderBy('orden').last()
  await db.categoriasWeb.add({
    clave,
    nombre: nombre.trim(),
    emoji: emoji || undefined,
    orden: (ultima?.orden ?? 0) + 1,
    actualizadoEn: ahora(),
  })
  return clave
}

/** Fila de una categoría (creándola si es fija y aún no la tiene). */
async function filaDe(clave: string): Promise<number | null> {
  const fila = await db.categoriasWeb.where('clave').equals(clave).first()
  if (fila?.id != null) return fila.id
  if (!esFija(clave)) return null
  return db.categoriasWeb.add({ clave, orden: 0, actualizadoEn: ahora() })
}

export async function renombrarCategoria(clave: string, nombre: string): Promise<void> {
  const id = await filaDe(clave)
  if (id != null) await db.categoriasWeb.update(id, { nombre: nombre.trim() || undefined, actualizadoEn: ahora() })
}

export async function fijarLimiteCategoria(clave: string, limiteMin: number | undefined): Promise<void> {
  const id = await filaDe(clave)
  if (id != null) await db.categoriasWeb.update(id, { limiteMin, actualizadoEn: ahora() })
}

/** Borra una categoría propia; sus sitios vuelven a «según el diccionario». */
export async function borrarCategoria(clave: string): Promise<void> {
  if (esFija(clave)) return
  await db.transaction('rw', db.categoriasWeb, db.sitiosWeb, async () => {
    await db.categoriasWeb.where('clave').equals(clave).delete()
    const sitios = await db.sitiosWeb.where('categoria').equals(clave).toArray()
    for (const s of sitios) if (s.id != null) await db.sitiosWeb.update(s.id, { categoria: undefined, porIA: false, actualizadoEn: ahora() })
  })
}

export async function borrarPagina(id: number): Promise<void> {
  await db.historialWeb.delete(id)
}

/** Borra el historial visto desde `desde` (ISO); sin `desde`, todo. */
export async function borrarHistorial(desde?: string): Promise<number> {
  if (!desde) {
    const n = await db.historialWeb.count()
    await db.historialWeb.clear()
    return n
  }
  return db.historialWeb.where('visto').aboveOrEqual(desde).delete()
}
