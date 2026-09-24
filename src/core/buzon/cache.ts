import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { MensajeRemoto } from './api'
import type { Contacto, MensajeBuzon } from './tipos'

/**
 * Caché local del buzón: el ÚNICO módulo del buzón que toca `db`. Las tablas
 * llevan prefijo `_` (fuera del sync, del respaldo y del middleware): la verdad
 * vive en el servidor y esto se rellena por pull.
 */

const META_CURSOR = 'buzon:cursor'
const META_USUARIO = 'buzon:usuario'

// ─── contactos ───────────────────────────────────────────────────────────────

/** Reemplaza la lista y poda los mensajes de los hilos que ya no existen. */
export async function guardarContactos(lista: Contacto[]): Promise<void> {
  const hilos = new Set(lista.map((c) => c.hiloId).filter((h): h is string => !!h))
  await db.transaction('rw', db._buzonContactos, db._buzonMensajes, async () => {
    await db._buzonContactos.clear()
    await db._buzonContactos.bulkPut(lista)
    const huerfanos = (await db._buzonMensajes.toArray()).filter((m) => !hilos.has(m.hiloId)).map((m) => m.id!)
    if (huerfanos.length) await db._buzonMensajes.bulkDelete(huerfanos)
  })
}

export async function contactosCache(): Promise<Contacto[]> {
  return db._buzonContactos.toArray()
}

export function useContactos(): Contacto[] | undefined {
  return useLiveQuery(() => db._buzonContactos.toArray(), [])
}

export function useContactosAceptados(): Contacto[] | undefined {
  return useLiveQuery(async () => (await db._buzonContactos.where('estado').equals('aceptado').toArray()).filter((c) => !!c.hiloId), [])
}

export async function contactoDeHilo(hiloId: string): Promise<Contacto | undefined> {
  return db._buzonContactos.where('hiloId').equals(hiloId).first()
}

export function useContactoDeHilo(hiloId: string | null): Contacto | undefined {
  return useLiveQuery(() => (hiloId ? db._buzonContactos.where('hiloId').equals(hiloId).first() : undefined), [hiloId])
}

// ─── mensajes ────────────────────────────────────────────────────────────────

/** Upsert por `uid` conservando lo que solo existe en local (blob, guardadoEn). */
export async function upsertMensajes(remotos: MensajeRemoto[]): Promise<MensajeBuzon[]> {
  const nuevos: MensajeBuzon[] = []
  const saltar = ocultos()
  await db.transaction('rw', db._buzonMensajes, async () => {
    for (const r of remotos) {
      if (saltar.has(r.uid)) continue
      const fila: MensajeBuzon = {
        uid: r.uid,
        hiloId: r.hilo_id,
        mio: r.mio,
        tipo: r.tipo,
        texto: r.texto,
        adjunto: r.adjunto ?? undefined,
        contenido: r.contenido ?? undefined,
        serverSeq: r.server_seq,
        creadoEn: r.creado_en,
        leidoEn: r.leido_en ?? undefined,
      }
      const previo = await db._buzonMensajes.where('uid').equals(r.uid).first()
      if (previo) {
        await db._buzonMensajes.update(previo.id!, {
          ...fila,
          blob: previo.blob,
          guardadoEn: previo.guardadoEn,
          estado: undefined,
        })
      } else {
        await db._buzonMensajes.add(fila)
        nuevos.push(fila)
      }
    }
  })
  return nuevos
}

// ─── borrados solo en este dispositivo ───────────────────────────────────────

/**
 * «Borrar para mí» no toca el servidor: el mensaje sigue allí y un pull que lo
 * traiga de nuevo (p. ej. al marcarse leído, que le cambia el seq) lo
 * resucitaría. Por eso se recuerdan sus `uid` y `upsertMensajes` los salta.
 */
const LS_OCULTOS = 'mh.buzon.ocultos'
const MAX_OCULTOS = 2000

function ocultos(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_OCULTOS) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export async function borrarMensajeLocal(uid: string): Promise<void> {
  try {
    const lista = [...ocultos(), uid].slice(-MAX_OCULTOS)
    localStorage.setItem(LS_OCULTOS, JSON.stringify(lista))
  } catch {
    // Sin almacenamiento: se borra igual; podría volver en un pull.
  }
  await db._buzonMensajes.where('uid').equals(uid).delete()
}

export async function guardarMensajeLocal(m: MensajeBuzon): Promise<number> {
  return (await db._buzonMensajes.add(m)) as number
}

/**
 * Nota local en el hilo (ver `MensajeBuzon.sistema`). `serverSeq` 0 y ya leída:
 * no mueve el cursor de leídos ni cuenta como pendiente.
 */
export async function guardarNotaSistema(hiloId: string, texto: string, mio: boolean): Promise<void> {
  const ahora = new Date().toISOString()
  await guardarMensajeLocal({
    uid: `local-${crypto.randomUUID()}`,
    hiloId,
    mio,
    tipo: 'texto',
    texto,
    serverSeq: 0,
    creadoEn: ahora,
    leidoEn: ahora,
    sistema: true,
  })
}

export async function actualizarMensaje(uid: string, cambios: Partial<MensajeBuzon>): Promise<void> {
  await db._buzonMensajes.where('uid').equals(uid).modify(cambios)
}

export async function mensajePorUid(uid: string): Promise<MensajeBuzon | undefined> {
  return db._buzonMensajes.where('uid').equals(uid).first()
}

export function useMensajesHilo(hiloId: string | null): MensajeBuzon[] | undefined {
  return useLiveQuery(
    () => (hiloId ? db._buzonMensajes.where('[hiloId+creadoEn]').between([hiloId, ''], [hiloId, '￿']).toArray() : []),
    [hiloId],
  )
}

/** Último mensaje de cada hilo (para la lista de chats). */
export function useUltimosMensajesBuzon(): Record<string, MensajeBuzon> | undefined {
  return useLiveQuery(async () => {
    const filas = await db._buzonMensajes.orderBy('[hiloId+creadoEn]').reverse().toArray()
    const ultimo: Record<string, MensajeBuzon> = {}
    for (const m of filas) if (!ultimo[m.hiloId]) ultimo[m.hiloId] = m
    return ultimo
  }, [])
}

/** Mensajes recibidos sin leer, por hilo. */
export async function contarNoLeidos(): Promise<Record<string, number>> {
  const cuenta: Record<string, number> = {}
  await db._buzonMensajes
    .filter((m) => !m.mio && !m.leidoEn)
    .each((m) => {
      cuenta[m.hiloId] = (cuenta[m.hiloId] ?? 0) + 1
    })
  return cuenta
}

/** Seq mayor del hilo (lo que el servidor debe marcar como leído). */
export async function maxSeqDeHilo(hiloId: string): Promise<number> {
  let max = 0
  await db._buzonMensajes
    .where('hiloId')
    .equals(hiloId)
    .each((m) => {
      if (m.serverSeq > max) max = m.serverSeq
    })
  return max
}

export async function marcarLeidosLocal(hiloId: string): Promise<number> {
  const ahora = new Date().toISOString()
  return db._buzonMensajes
    .where('hiloId')
    .equals(hiloId)
    .filter((m) => !m.mio && !m.leidoEn)
    .modify({ leidoEn: ahora })
}

// ─── meta y limpieza ─────────────────────────────────────────────────────────

export async function leerCursor(): Promise<number> {
  const v = (await db._syncMeta.get(META_CURSOR))?.valor
  return typeof v === 'number' ? v : 0
}

export async function escribirCursor(seq: number): Promise<void> {
  await db._syncMeta.put({ clave: META_CURSOR, valor: seq })
}

export async function usuarioDeCache(): Promise<string | null> {
  const v = (await db._syncMeta.get(META_USUARIO))?.valor
  return typeof v === 'string' ? v : null
}

export async function fijarUsuarioDeCache(uid: string): Promise<void> {
  await db._syncMeta.put({ clave: META_USUARIO, valor: uid })
}

/** Otra cuenta en el mismo dispositivo: la caché de la anterior no sirve. */
export async function limpiarCacheBuzon(): Promise<void> {
  await db.transaction('rw', db._buzonContactos, db._buzonMensajes, db._syncMeta, async () => {
    await db._buzonContactos.clear()
    await db._buzonMensajes.clear()
    await db._syncMeta.delete(META_CURSOR)
    await db._syncMeta.delete(META_USUARIO)
  })
}
