/**
 * Motor de sincronización push/pull contra la tabla `registros` de Supabase.
 *
 * - Push: drena `_outbox` (última operación por tabla+uid), traduce FKs
 *   numéricas a uid del padre, sube blobs a Storage y manda lotes a la RPC
 *   `sync_push` (guarda LWW en el servidor).
 * - Pull: pagina por `server_seq`, descarga blobs FUERA de la transacción,
 *   aplica en orden padres→hijos con LWW por `updatedAt`, resuelve choques de
 *   índices únicos y deja en `_pendientes` lo que espera a su padre.
 * - Bootstrap (primer login del dispositivo): pull completo → limpieza de
 *   seeds vírgenes duplicados → encolar TODO lo local al push (merge-unión).
 *
 * Un solo corredor por dispositivo (`navigator.locks`); triggers: login,
 * debounce tras escrituras (aviso del middleware), intervalo, visibilidad y
 * el botón manual de la sección Cuenta.
 */
import { esDemo, esProbar } from '../../edicion'
import { db, type EntradaOutbox, type ObjetoCuarto } from '../db'
import { exportarRespaldo } from '../respaldo'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { hayBackend, obtenerSupabase } from '../../cuenta/supabase'
import { notificarRepintado } from './repintar'
import { useSesion } from '../../cuenta/sesionStore'
import { tGlobal } from '../../i18n/useT'
import { conectarAvisoEscritura, marcarEscrituraSilenciosa } from './middleware'
import { CLAVES_UNICAS, FK, ORDEN_TOPO, SINGLETONS, TABLAS_SYNC, esTablaSync } from './syncables'
import { borrarBlobsDeRegistro, extraerBlobs, rehidratarBlobs } from './blobs'

const LOTE_PUSH = 200
const LOTE_PULL = 500
const DEBOUNCE_MS = 500
// Con el campanazo Realtime el intervalo pasa a ser red de seguridad.
const INTERVALO_MS = 120_000
const BACKOFF_BASE_MS = 5000
const BACKOFF_MAX_MS = 30_000

interface RegistroRemoto {
  tabla: string
  uid: string
  datos: Record<string, unknown> | null
  deleted: boolean
  updated_at: number
  server_seq: number
}

type Fila = Record<string, unknown>

/** Marca la transacción actual: el middleware no debe encolar estos writes. */
function marcarPull(): void {
  marcarEscrituraSilenciosa()
}

function keyPathDe(tabla: string): string {
  const kp = db.table(tabla).schema.primKey.keyPath
  return typeof kp === 'string' ? kp : 'id'
}

// ----- Push -----

/** Devuelve el server_seq máximo asignado a lo subido (0 si no subió nada). */
async function push(userId: string): Promise<number> {
  const cola = await db._outbox.orderBy('id').toArray()
  if (!cola.length) return 0

  // Última operación por (tabla, uid); todos los ids drenados se limpian al confirmar.
  const ultimo = new Map<string, EntradaOutbox>()
  const idsPorClave = new Map<string, number[]>()
  for (const e of cola) {
    const k = `${e.tabla}|${e.uid}`
    ultimo.set(k, e)
    const ids = idsPorClave.get(k) ?? []
    if (e.id != null) ids.push(e.id)
    idsPorClave.set(k, ids)
  }

  const cambios: { entrada: EntradaOutbox; cuerpo: Record<string, unknown> }[] = []
  for (const e of ultimo.values()) {
    if (!esTablaSync(e.tabla)) continue
    const tombstone = () => ({
      tabla: e.tabla,
      uid: e.uid,
      deleted: true,
      updatedAt: Date.now(),
      datos: null,
    })
    if (e.op === 'delete') {
      cambios.push({ entrada: e, cuerpo: tombstone() })
      continue
    }
    const fila = (await db.table(e.tabla).where('uid').equals(e.uid).first()) as Fila | undefined
    if (!fila) {
      // La fila ya no existe (borrada después): viaja como tombstone.
      cambios.push({ entrada: e, cuerpo: tombstone() })
      continue
    }
    const datos: Fila = { ...fila }
    const pk = db.table(e.tabla).schema.primKey
    if (pk.auto && typeof pk.keyPath === 'string') delete datos[pk.keyPath]
    delete datos.uid // viajan aparte
    delete datos.updatedAt
    const mapa = FK[e.tabla]
    if (mapa) {
      for (const [campo, destino] of Object.entries(mapa)) {
        const v = datos[campo]
        if (typeof v === 'number') {
          const padre = (await db.table(destino).get(v)) as Fila | undefined
          datos[campo] = typeof padre?.uid === 'string' ? padre.uid : null
        }
      }
    }
    const conBlobs = await extraerBlobs(userId, e.tabla, e.uid, datos)
    cambios.push({
      entrada: e,
      cuerpo: {
        tabla: e.tabla,
        uid: e.uid,
        deleted: false,
        updatedAt: typeof fila.updatedAt === 'number' ? fila.updatedAt : Date.now(),
        datos: conBlobs,
      },
    })
  }

  let maxSeq = 0
  for (let i = 0; i < cambios.length; i += LOTE_PUSH) {
    const lote = cambios.slice(i, i + LOTE_PUSH)
    const { data, error } = await cliente!.rpc('sync_push', {
      p_cambios: lote.map((c) => c.cuerpo),
    })
    if (error) throw new Error(`sync_push: ${error.message}`)
    if ((data as { error?: string } | null)?.error) {
      throw new Error(`sync_push: ${(data as { error: string }).error}`)
    }
    // max_seq permite ignorar el campanazo del propio push (0 en servidor viejo).
    const seq = (data as { max_seq?: number } | null)?.max_seq
    if (typeof seq === 'number') maxSeq = Math.max(maxSeq, seq)
    const ids = lote.flatMap((c) => idsPorClave.get(`${c.entrada.tabla}|${c.entrada.uid}`) ?? [])
    await db._outbox.bulkDelete(ids)
    for (const c of lote) {
      if (c.cuerpo.deleted === true) void borrarBlobsDeRegistro(userId, c.entrada.tabla, c.entrada.uid)
    }
  }
  return maxSeq
}

// ----- Pull -----

/**
 * Aplica un registro remoto. Devuelve false si quedó pendiente de su padre.
 * Debe llamarse DENTRO de una transacción marcada con `marcarPull()`.
 */
async function aplicarRegistro(r: RegistroRemoto, desdePendientes = false): Promise<boolean> {
  if (!esTablaSync(r.tabla)) return true
  const t = db.table(r.tabla)
  const kp = keyPathDe(r.tabla)
  const local = (await t.where('uid').equals(r.uid).first()) as Fila | undefined

  if (r.deleted) {
    if (local && local[kp] != null) await t.delete(local[kp] as never)
    return true
  }
  if (!r.datos) return true
  // LWW: lo local gana o empata (empate = eco de nuestro propio push).
  if (local && typeof local.updatedAt === 'number' && local.updatedAt >= r.updated_at) return true

  const datos: Fila = { ...r.datos }
  const mapa = FK[r.tabla]
  if (mapa) {
    for (const [campo, destino] of Object.entries(mapa)) {
      const v = datos[campo]
      if (typeof v === 'string' && v) {
        const padre = (await db.table(destino).where('uid').equals(v).first()) as Fila | undefined
        const kpPadre = keyPathDe(destino)
        if (!padre || padre[kpPadre] == null) {
          if (!desdePendientes) {
            await db._pendientes.add({
              tabla: r.tabla,
              uid: r.uid,
              datos: r.datos,
              updatedAt: r.updated_at,
              deleted: false,
            })
          }
          return false
        }
        datos[campo] = padre[kpPadre]
      }
    }
  }

  datos.uid = r.uid
  datos.updatedAt = r.updated_at
  if (local && local[kp] != null) {
    datos[kp] = local[kp]
    await t.put(datos)
    return true
  }
  const pk = t.schema.primKey
  if (pk.auto) delete datos[kp]
  try {
    await t.add(datos)
  } catch (e) {
    if (!(e instanceof Error && e.name === 'ConstraintError')) throw e
    // Choque de índice único con una fila local de otro uid: gana el updatedAt
    // mayor; la perdedora se tombstonea en el servidor (outbox directo).
    const claves = CLAVES_UNICAS[r.tabla]
    if (!claves) throw e
    const criterio: Record<string, string | number> = {}
    for (const c of claves) {
      const v = datos[c]
      if (typeof v !== 'string' && typeof v !== 'number') throw e
      criterio[c] = v
    }
    const rival = (await t.where(criterio).first()) as Fila | undefined
    if (!rival) throw e
    const ganaRemoto = r.updated_at > (typeof rival.updatedAt === 'number' ? rival.updatedAt : 0)
    if (ganaRemoto) {
      if (rival[kp] != null) await t.delete(rival[kp] as never)
      if (typeof rival.uid === 'string') {
        await db._outbox.add({ tabla: r.tabla, uid: rival.uid, op: 'delete' })
      }
      await t.add(datos)
    } else {
      await db._outbox.add({ tabla: r.tabla, uid: r.uid, op: 'delete' })
    }
  }
  return true
}

async function reintentarPendientes(): Promise<void> {
  const pendientes = await db._pendientes.toArray()
  for (const p of pendientes) {
    const ok = await aplicarRegistro(
      {
        tabla: p.tabla,
        uid: p.uid,
        datos: p.datos as Fila | null,
        deleted: p.deleted,
        updated_at: p.updatedAt,
        server_seq: 0,
      },
      true,
    )
    if (ok && p.id != null) await db._pendientes.delete(p.id)
  }
}

/** Deja una sola fila en las tablas singleton (gana la más nueva). */
async function dedupeSingletons(): Promise<void> {
  for (const tabla of SINGLETONS) {
    const t = db.table(tabla)
    const filas = (await t.toArray()) as Fila[]
    if (filas.length <= 1) continue
    const kp = keyPathDe(tabla)
    const orden = [...filas].sort(
      (a, b) =>
        (typeof b.updatedAt === 'number' ? b.updatedAt : 0) -
        (typeof a.updatedAt === 'number' ? a.updatedAt : 0),
    )
    for (const f of orden.slice(1)) {
      if (f[kp] != null) await t.delete(f[kp] as never)
      if (typeof f.uid === 'string') {
        await db._outbox.add({ tabla, uid: f.uid, op: 'delete' })
      }
    }
  }
}

/**
 * Una app solo puede vivir en un cuarto (la UI local lo garantiza), pero la
 * fusión de dos dispositivos puede traer la misma plantilla asignada en dos
 * objetos — cada casa creó "su cocina". Gana el objeto con `updatedAt` mayor
 * (LWW, como los choques únicos; empate por uid) y el cuarto del perdedor se
 * elimina entero — como si el usuario lo borrara —, salvo que tenga OTRA app,
 * en cuyo caso solo pierde el objeto duplicado.
 *
 * Corre tras el pull SIN marcar la escritura: el middleware tombstonea los
 * borrados y el resto de dispositivos converge en su siguiente pull.
 */
async function curarAppsDuplicadas(): Promise<void> {
  type ObjSync = ObjetoCuarto & { uid?: string; updatedAt?: number }
  // Los cuartos especiales (__mapa__/__libreria__) nunca llevan app asignada.
  const conApp = (await db.objetosCuarto
    .filter((o) => !!o.plantillaId && !o.roomId.startsWith('__'))
    .toArray()) as ObjSync[]
  const porApp = new Map<string, ObjSync[]>()
  for (const o of conApp) {
    const grupo = porApp.get(o.plantillaId!) ?? []
    grupo.push(o)
    porApp.set(o.plantillaId!, grupo)
  }
  if (![...porApp.values()].some((g) => g.length > 1)) return

  const cuartosReales = new Set((await db.cuartos.toCollection().primaryKeys()) as string[])
  const perdedores: ObjSync[] = []
  for (const grupo of porApp.values()) {
    if (grupo.length <= 1) continue
    // Los huérfanos (objetos legacy cuyo cuarto ya no existe) nunca ganan.
    // Empate por uid con comparación simple (localeCompare varía por dispositivo).
    grupo.sort(
      (a, b) =>
        Number(cuartosReales.has(b.roomId)) - Number(cuartosReales.has(a.roomId)) ||
        (b.updatedAt ?? 0) - (a.updatedAt ?? 0) ||
        ((b.uid ?? '') > (a.uid ?? '') ? 1 : -1),
    )
    perdedores.push(...grupo.slice(1))
  }

  const idsPerdedores = new Set(perdedores.map((o) => o.id))
  // Cuartos cuya única app era la duplicada: se van enteros (con su rastro).
  const cuartosABorrar = new Set<string>()
  for (const o of perdedores) {
    if (!cuartosReales.has(o.roomId)) continue
    if (!conApp.some((x) => x.roomId === o.roomId && !idsPerdedores.has(x.id))) {
      cuartosABorrar.add(o.roomId)
    }
  }

  await db.transaction(
    'rw',
    [db.objetosCuarto, db.cuartos, db.layout, db.disenoRooms, db.accesos],
    async () => {
      for (const o of perdedores) {
        if (o.id != null && !cuartosABorrar.has(o.roomId)) await db.objetosCuarto.delete(o.id)
      }
      // Misma limpieza que quitarCuarto/borrarCuartoInterno, pero sobre la BD.
      for (const id of cuartosABorrar) {
        const fila = await db.layout.where('roomId').equals(id).first()
        await db.cuartos.delete(id)
        if (fila?.id != null) await db.layout.delete(fila.id)
        await db.disenoRooms.where('roomId').equals(id).delete()
        await db.objetosCuarto.where('roomId').equals(id).delete()
        // Si era el último cuarto de su nivel (piso alto o sótano), retira su acceso.
        const nivel = fila?.nivel ?? 0
        if (nivel !== 0) {
          const quedan = await db.layout.filter((l) => l.placed && (l.nivel ?? 0) === nivel).count()
          if (!quedan) await db.accesos.filter((a) => a.nivel === nivel).delete()
        }
      }
    },
  )
}

/** Devuelve las tablas donde el pull pudo cambiar algo local (para repintar). */
async function pull(vistos?: Map<string, Set<string>>): Promise<Set<string>> {
  const tocadas = new Set<string>()
  let cursor = ((await db._syncMeta.get('cursor'))?.valor as number | undefined) ?? 0
  cursorCache = Math.max(cursorCache, cursor)
  for (;;) {
    const { data, error } = await cliente!
      .from('registros')
      .select('tabla, uid, datos, deleted, updated_at, server_seq')
      .gt('server_seq', cursor)
      .order('server_seq', { ascending: true })
      .limit(LOTE_PULL)
    if (error) throw new Error(`pull: ${error.message}`)
    const pagina = (data ?? []) as unknown as RegistroRemoto[]
    if (!pagina.length) break

    // `vistos` (bootstrap) registra la página COMPLETA: necesita todos los uids
    // que el servidor conoce, también los que pierden el LWW.
    if (vistos) {
      for (const r of pagina) {
        const s = vistos.get(r.tabla) ?? new Set<string>()
        s.add(r.uid)
        vistos.set(r.tabla, s)
      }
    }

    // Prefiltro LWW en lote ANTES de descargar blobs: los ecos del propio push
    // (empate de updatedAt) y los perdedores quedan fuera sin gastar red.
    // `aplicarRegistro` repite el chequeo dentro de la tx como autoridad final.
    const porTabla = new Map<string, RegistroRemoto[]>()
    for (const r of pagina) {
      if (!esTablaSync(r.tabla)) continue
      const grupo = porTabla.get(r.tabla) ?? []
      grupo.push(r)
      porTabla.set(r.tabla, grupo)
    }
    const candidatos: RegistroRemoto[] = []
    for (const [tabla, grupo] of porTabla) {
      const locales = (await db
        .table(tabla)
        .where('uid')
        .anyOf(grupo.map((r) => r.uid))
        .toArray()) as Fila[]
      const localPorUid = new Map<string, number>()
      for (const f of locales) {
        if (typeof f.uid === 'string') {
          localPorUid.set(f.uid, typeof f.updatedAt === 'number' ? f.updatedAt : 0)
        }
      }
      for (const r of grupo) {
        const local = localPorUid.get(r.uid)
        if (r.deleted || local == null || local < r.updated_at) candidatos.push(r)
      }
    }

    // Blobs FUERA de la transacción (una tx de IndexedDB muere si espera red),
    // en trozos de 4 en vez de uno a uno.
    for (let i = 0; i < candidatos.length; i += 4) {
      await Promise.all(
        candidatos.slice(i, i + 4).map(async (r) => {
          if (!r.deleted && r.datos) r.datos = (await rehidratarBlobs(r.datos)) as Fila
        }),
      )
    }
    // Padres antes que hijos (orden estable: dentro de una tabla, server_seq).
    const orden = (t: string) => ORDEN_TOPO.indexOf(t)
    const aplicables = [...candidatos].sort((a, b) => orden(a.tabla) - orden(b.tabla))
    // El cursor avanza sobre la página COMPLETA (crash-safe por página).
    cursor = pagina.reduce((m, r) => Math.max(m, r.server_seq), cursor)

    await db.transaction(
      'rw',
      [...TABLAS_SYNC.map((t) => db.table(t)), db._pendientes, db._syncMeta, db._outbox],
      async () => {
        marcarPull()
        for (const r of aplicables) await aplicarRegistro(r)
        await reintentarPendientes()
        await db._syncMeta.put({ clave: 'cursor', valor: cursor })
      },
    )
    for (const r of aplicables) tocadas.add(r.tabla)
    cursorCache = Math.max(cursorCache, cursor)
    if (pagina.length < LOTE_PULL) break
  }

  // Singletons duplicados: solo si el pull trajo filas de esas tablas (antes
  // corría en cada página, con toArray() completo de las 7 tablas).
  if ([...tocadas].some((t) => SINGLETONS.has(t))) {
    await db.transaction('rw', [...[...SINGLETONS].map((t) => db.table(t)), db._outbox], async () => {
      marcarPull()
      await dedupeSingletons()
    })
  }
  return tocadas
}

// ----- Bootstrap y cuenta -----

/**
 * Cambio de cuenta en esta casa: el usuario decide si lo local se une a la
 * cuenta nueva (merge) o se vacía para bajar solo lo de la nube. En ambos
 * casos el estado de sync (cursor/outbox) se resetea.
 */
async function verificarUsuario(userId: string): Promise<void> {
  const previo = (await db._syncMeta.get('usuario'))?.valor as string | undefined
  if (previo && previo !== userId) {
    const conservar = window.confirm(
      tGlobal(
        'cuenta.sync.otraCuenta',
        'Esta casa estaba ligada a otra cuenta. ¿Conservar lo local y unirlo a la cuenta nueva? (Cancelar = vaciar esta casa y bajar solo lo de la cuenta)',
      ),
    )
    if (!conservar) {
      await db.transaction('rw', db.tables, async () => {
        marcarPull() // vaciar SIN tombstones: no debe tocar la nube de la cuenta nueva
        for (const tabla of TABLAS_SYNC) await db.table(tabla).clear()
      })
    }
    await db._outbox.clear()
    await db._pendientes.clear()
    await db._syncMeta.clear()
  }
  await db._syncMeta.put({ clave: 'usuario', valor: userId })
}

/**
 * Devuelve las tablas que la nube conocía si el bootstrap corrió en ESTE ciclo
 * (null si ya estaba hecho): su pull interno avanza el cursor, así que el pull
 * normal del ciclo no las reporta y sin esto la casa bajada no se repintaba.
 */
async function bootstrap(): Promise<Set<string> | null> {
  if ((await db._syncMeta.get('bootstrap'))?.valor === true) return null

  // Primera sincronización con una casa ya usada: ofrecer respaldo previo.
  if ((await db.objetosCuarto.count()) > 0) {
    const exportar = window.confirm(
      tGlobal(
        'cuenta.sync.respaldoPrevio',
        'Vas a sincronizar esta casa por primera vez. ¿Descargar antes un respaldo local? (Recomendado)',
      ),
    )
    if (exportar) await exportarRespaldo()
  }

  const vistos = new Map<string, Set<string>>()
  await pull(vistos)

  // Seeds vírgenes duplicados: si la cuenta ya trae datos de una tabla, las
  // filas seed-* intactas (updatedAt === 1) que el servidor no conoce sobran
  // (son la demo local que la cuenta ya superó o trae con otros uids).
  await db.transaction('rw', [...TABLAS_SYNC.map((t) => db.table(t)), db._outbox], async () => {
    marcarPull()
    for (const [tabla, uids] of vistos) {
      if (!esTablaSync(tabla) || uids.size === 0) continue
      const t = db.table(tabla)
      const kp = keyPathDe(tabla)
      const filas = (await t
        .filter((f: Fila) => typeof f.uid === 'string' && f.uid.startsWith('seed-') && f.updatedAt === 1)
        .toArray()) as Fila[]
      for (const f of filas) {
        if (!uids.has(f.uid as string) && f[kp] != null) await t.delete(f[kp] as never)
      }
    }
  })

  // El outbox no conoce lo anterior al login: encolar TODO lo local.
  const entradas: EntradaOutbox[] = []
  for (const tabla of TABLAS_SYNC) {
    const uids = (await db.table(tabla).orderBy('uid').keys()) as string[]
    for (const uid of uids) entradas.push({ tabla, uid, op: 'upsert' })
  }
  for (let i = 0; i < entradas.length; i += 1000) {
    await db._outbox.bulkAdd(entradas.slice(i, i + 1000))
  }
  await db._syncMeta.put({ clave: 'bootstrap', valor: true })
  return new Set(vistos.keys())
}

// ----- Ciclo y triggers -----

let sincronizando = false
let falloSeguido = 0
let proximoIntento = 0
/** Cliente vivo del ciclo actual: lo fija `sincronizar()` antes de push/pull. */
let cliente: SupabaseClient | null = null
/** Último cursor conocido (espejo en memoria del `_syncMeta.cursor`). */
let cursorCache = 0
/** server_seq máximo de nuestro último push: su campanazo es eco y se ignora. */
let ultimoSeqPropio = 0
/** true tras el primer ciclo completo: el camino ligero no salta el bootstrap. */
let bootstrapListo = false
/** Un campanazo llegó con el lock tomado: quien termine re-dispara un pull. */
let pullPendiente = false

/** Ciclo completo push+pull. Seguro de llamar en cualquier momento. */
export async function sincronizar(manual = false): Promise<void> {
  // Cinturón además del candado de main.tsx: las BD demo y probar jamás tocan
  // la nube (un usuario pagado que abra `?probar=1` subiría la casa de prueba).
  if (esDemo() || esProbar()) return
  const { usuario, plan } = useSesion.getState()
  if (!hayBackend() || !usuario || sincronizando) return
  // El sync es parte de Pro y del mes trial del unlock: sin plan vigente ni se
  // intenta (el servidor igual lo rechazaría con 'sin-pro'). El _outbox sigue
  // encolando local.
  if (plan !== 'pro' && plan !== 'trial') return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  if (!manual && Date.now() < proximoIntento) return

  // El SDK se carga bajo demanda: sin cliente (fallo de red) se reintenta luego.
  cliente = await obtenerSupabase()
  if (!cliente) return

  await navigator.locks.request('mh-sync', { ifAvailable: true }, async (lock) => {
    if (!lock) return
    sincronizando = true
    useSesion.setState({ estadoSync: 'sincronizando', errorSync: null })
    try {
      await verificarUsuario(usuario.id)
      const tablasBootstrap = await bootstrap()
      const maxSeq = await push(usuario.id)
      if (maxSeq > 0) ultimoSeqPropio = Math.max(ultimoSeqPropio, maxSeq)
      const tocadas = await pull()
      // Las tablas del bootstrap se suman: su pull interno ya avanzó el cursor
      // y sin esto el repintado del primer login salía vacío (casa «desde 0»).
      if (tablasBootstrap) for (const t of tablasBootstrap) tocadas.add(t)
      // Sana duplicados que dejó la fusión (sus tombstones viajan en el
      // siguiente ciclo): dos dispositivos que asignaron la misma app offline.
      // Es un escaneo completo de objetosCuarto: solo cuando pudo hacer falta.
      if (tablasBootstrap != null || tocadas.has('objetosCuarto')) await curarAppsDuplicadas()
      falloSeguido = 0
      proximoIntento = 0
      bootstrapListo = true
      useSesion.setState({ estadoSync: 'inactivo', ultimaSync: Date.now(), errorSync: null })
      // Incluso con set vacío: drena repintados que esperaron a que acabara una edición.
      notificarRepintado(tocadas)
    } catch (e) {
      falloSeguido++
      proximoIntento = Date.now() + Math.min(BACKOFF_BASE_MS * 2 ** (falloSeguido - 1), BACKOFF_MAX_MS)
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('sin-pro')) {
        // El plan caducó con el motor andando: resincronizar perfil (detiene
        // el motor vía conectarMotorSync) y mensaje amable en vez del error crudo.
        void useSesion.getState().refrescarPerfil()
        useSesion.setState({
          estadoSync: 'error',
          errorSync: tGlobal('cuenta.sync.soloPro', 'La sincronización entre dispositivos es parte de Pro.'),
        })
      } else {
        useSesion.setState({ estadoSync: 'error', errorSync: msg })
      }
    } finally {
      sincronizando = false
    }
  })
  if (pullPendiente) {
    pullPendiente = false
    void sincronizarPull()
  }
}

/**
 * Camino LIGERO de solo-pull: lo dispara el campanazo Realtime. Sin push, sin
 * bootstrap ni verificación de cuenta (solo cambian en login, que pasa por
 * `sincronizar()`), y sin tocar `estadoSync` (el chip de Cuenta no parpadea
 * a cada campanazo). Errores silenciosos con el MISMO backoff compartido: el
 * ciclo completo del intervalo es quien reporta en la UI.
 */
export async function sincronizarPull(): Promise<void> {
  if (esDemo() || esProbar()) return
  const { usuario, plan } = useSesion.getState()
  if (!hayBackend() || !usuario) return
  if (plan !== 'pro' && plan !== 'trial') return
  if (!bootstrapListo) return void sincronizar() // primer ciclo completo primero
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  if (Date.now() < proximoIntento) return
  cliente = await obtenerSupabase()
  if (!cliente) return

  await navigator.locks.request('mh-sync', { ifAvailable: true }, async (lock) => {
    if (!lock) {
      // Hay un ciclo en vuelo: que él remate con un pull extra al soltar.
      pullPendiente = true
      return
    }
    sincronizando = true
    try {
      const tocadas = await pull()
      if (tocadas.has('objetosCuarto')) await curarAppsDuplicadas()
      falloSeguido = 0
      proximoIntento = 0
      useSesion.setState({ ultimaSync: Date.now() })
      notificarRepintado(tocadas)
    } catch {
      falloSeguido++
      proximoIntento = Date.now() + Math.min(BACKOFF_BASE_MS * 2 ** (falloSeguido - 1), BACKOFF_MAX_MS)
    } finally {
      sincronizando = false
    }
  })
  if (pullPendiente) {
    pullPendiente = false
    void sincronizarPull()
  }
}

// ----- Campanazo Realtime -----

let canal: RealtimeChannel | null = null
/** true entre iniciar() y detener(): corta la suscripción si llega tarde. */
let motorActivo = false

/**
 * Se suscribe al canal privado `sync:<user_id>`: `sync_push` (servidor) emite
 * ahí un `{seq}` cuando OTRO dispositivo aplica cambios, y este responde con
 * un pull ligero al momento en vez de esperar el intervalo.
 */
async function suscribirCampanazo(): Promise<void> {
  if (canal) return
  const sb = await obtenerSupabase()
  const { usuario } = useSesion.getState()
  if (!sb || !usuario || !motorActivo) return // detener() ganó mientras cargaba el SDK
  await sb.realtime.setAuth() // token de la sesión para el canal privado
  canal = sb
    .channel(`sync:${usuario.id}`, { config: { private: true } })
    .on('broadcast', { event: 'cambio' }, ({ payload }) => {
      const seq =
        typeof (payload as { seq?: unknown } | null)?.seq === 'number'
          ? (payload as { seq: number }).seq
          : Infinity
      // Ecos: nuestro propio push (el advisory lock del servidor garantiza que
      // todo seq ajeno menor ya estaba confirmado antes) o algo ya pulleado.
      if (seq <= cursorCache || seq <= ultimoSeqPropio) return
      void sincronizarPull()
    })
    .subscribe((estado) => {
      // Cada (re)SUBSCRIBED —incluye reconexiones tras perder red— se pone al
      // día con un pull: lo emitido con el canal caído no se repite.
      if (estado === 'SUBSCRIBED') void sincronizarPull()
    })
}

function desuscribirCampanazo(): void {
  if (canal) {
    void canal.unsubscribe()
    canal = null
  }
}

let timerDebounce: ReturnType<typeof setTimeout> | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null

function programarPush(): void {
  if (timerDebounce != null) clearTimeout(timerDebounce)
  timerDebounce = setTimeout(() => {
    timerDebounce = null
    void sincronizar()
  }, DEBOUNCE_MS)
}

function alVisible(): void {
  if (document.visibilityState === 'visible') void sincronizar()
}

function alOnline(): void {
  void sincronizar()
}

function iniciar(): void {
  motorActivo = true
  conectarAvisoEscritura(programarPush)
  document.addEventListener('visibilitychange', alVisible)
  window.addEventListener('online', alOnline)
  if (timerInterval == null) {
    timerInterval = setInterval(() => void sincronizar(), INTERVALO_MS)
  }
  void suscribirCampanazo()
  void sincronizar()
}

function detener(): void {
  motorActivo = false
  conectarAvisoEscritura(null)
  document.removeEventListener('visibilitychange', alVisible)
  window.removeEventListener('online', alOnline)
  desuscribirCampanazo()
  if (timerInterval != null) clearInterval(timerInterval)
  if (timerDebounce != null) clearTimeout(timerDebounce)
  timerInterval = null
  timerDebounce = null
  // Cambio de cuenta = detener → iniciar: sin resetear, un campanazo temprano
  // de la cuenta nueva se ignoraría o se saltaría el bootstrap.
  bootstrapListo = false
  cursorCache = 0
  ultimoSeqPropio = 0
  pullPendiente = false
  useSesion.setState({ estadoSync: 'inactivo' })
}

/**
 * Enchufa el motor al ciclo de sesión (llamar UNA vez desde main). Arranca con
 * sesión + plan Pro vigente; para al cerrar sesión O al caducar el plan
 * (conservando `_outbox` y cursor por si renueva o vuelve a entrar).
 * El plan se hidrata async tras el login: la transición local→pro dispara
 * `iniciar()` sola cuando `refrescarPerfil()` aterriza.
 */
export function conectarMotorSync(): void {
  if (!hayBackend()) return
  const activo = (s: { usuario: unknown; plan: string }) =>
    !!s.usuario && (s.plan === 'pro' || s.plan === 'trial')
  useSesion.subscribe((s, prev) => {
    if (activo(s) && !activo(prev)) iniciar()
    else if (!activo(s) && activo(prev)) detener()
  })
  if (activo(useSesion.getState())) iniciar()
}
