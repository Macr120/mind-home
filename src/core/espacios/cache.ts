import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Espacio, EspacioCache, TipoEspacio } from './tipos'

/**
 * Caché local de los espacios. Junto con `calendario.ts` (que escribe las filas
 * de `rutinas` del calendario compartido) son los únicos módulos de `espacios/`
 * que tocan `db`. La tabla lleva prefijo `_` (fuera del sync, del respaldo y del
 * middleware): la verdad vive en el servidor y esto se rellena con
 * `espacio_listar`.
 *
 * Los TOKENS no se guardan nunca en el dispositivo: se piden al servidor cuando
 * el dueño abre el panel de compartir.
 */

const META_USUARIO = 'espacios:usuario'
const cursorDe = (espacioId: string) => `espacio:${espacioId}:cursor`

const sinTokens = (e: Espacio): EspacioCache => {
  const { tokens: _tokens, ...resto } = e
  return resto
}

/** Reemplaza la lista completa: lo que ya no está es que me sacaron o lo borraron. */
export async function guardarLista(lista: Espacio[]): Promise<void> {
  const vivos = new Set(lista.map((e) => e.espacioId))
  await db.transaction('rw', db._espacios, async () => {
    const previos = (await db._espacios.toArray()).map((e) => e.espacioId)
    const sobran = previos.filter((id) => !vivos.has(id))
    if (sobran.length) await db._espacios.bulkDelete(sobran)
    await db._espacios.bulkPut(lista.map(sinTokens))
  })
}

export async function guardarEspacio(e: Espacio): Promise<void> {
  await db._espacios.put(sinTokens(e))
}

export async function espaciosCache(): Promise<EspacioCache[]> {
  return db._espacios.toArray()
}

export function useEspacios(tipo?: TipoEspacio): EspacioCache[] | undefined {
  return useLiveQuery(
    () => (tipo ? db._espacios.where('tipo').equals(tipo).toArray() : db._espacios.toArray()),
    [tipo],
  )
}

export function useEspacio(espacioId: string | null): EspacioCache | undefined {
  return useLiveQuery(() => (espacioId ? db._espacios.get(espacioId) : undefined), [espacioId])
}

/** Salir, que me expulsen o que lo borren: la fila y su cursor se van juntos. */
export async function borrarEspacio(espacioId: string): Promise<void> {
  await db.transaction('rw', db._espacios, db._syncMeta, async () => {
    await db._espacios.delete(espacioId)
    await db._syncMeta.delete(cursorDe(espacioId))
  })
}

// ─── cursor del log ──────────────────────────────────────────────────────────

export async function leerCursor(espacioId: string): Promise<number> {
  const v = (await db._syncMeta.get(cursorDe(espacioId)))?.valor
  return typeof v === 'number' ? v : 0
}

export async function escribirCursor(espacioId: string, seq: number): Promise<void> {
  await db._syncMeta.put({ clave: cursorDe(espacioId), valor: seq })
}

// ─── meta y limpieza ─────────────────────────────────────────────────────────

export async function usuarioDeCache(): Promise<string | null> {
  const v = (await db._syncMeta.get(META_USUARIO))?.valor
  return typeof v === 'string' ? v : null
}

export async function fijarUsuarioDeCache(uid: string): Promise<void> {
  await db._syncMeta.put({ clave: META_USUARIO, valor: uid })
}

/** Otra cuenta en el mismo dispositivo: la caché de la anterior no sirve. */
export async function limpiarCacheEspacios(): Promise<void> {
  await db.transaction('rw', db._espacios, db._syncMeta, async () => {
    await db._espacios.clear()
    const claves = (await db._syncMeta.toCollection().primaryKeys()) as string[]
    const cursores = claves.filter((k) => k.startsWith('espacio:') && k.endsWith(':cursor'))
    if (cursores.length) await db._syncMeta.bulkDelete(cursores)
    await db._syncMeta.delete(META_USUARIO)
  })
}
