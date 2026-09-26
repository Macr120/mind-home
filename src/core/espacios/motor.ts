import type { Transporte } from '../partida/transporte'
import * as api from './api'
import * as cache from './cache'
import { fijarVivo, fundirEnLista, olvidarVivo, quitarDeLista } from './espaciosStore'
import { abrirCanalEspacio } from './transporte'
import {
  ErrorEspacio,
  LOTE_PUSH,
  LOTE_PUSH_BYTES,
  PUSH_MS,
  type CambioEspacio,
  type Espacio,
  type EventoEspacio,
  type MiembroEspacio,
} from './tipos'

/**
 * Motor de UN espacio compartido (calcado del motor del buzón, en pequeño):
 * abre el canal `espacio:<id>`, hace pull incremental por cursor, publica en
 * lotes de forma idempotente y avisa de lo que llega.
 *
 * Quien lo usa es el editor de cada tipo (calendario, documento, dibujo…) y
 * `conectar.ts` para los calendarios, que viven abiertos en segundo plano. Por
 * eso hay REF-COUNT: dos sitios pueden pedir el mismo espacio y el último que
 * cierra es el que apaga el canal.
 *
 * El log del servidor es la única fuente DURABLE. Los broadcasts de los
 * clientes (`yjs`, `trazo`, `aw`, `sv`, `presencia`) son solo inmediatez: si se
 * pierde uno, el pull lo repara.
 */

// Con el campanazo del canal, el intervalo es red de seguridad.
const INTERVALO_MS = 120_000
const BACKOFF_BASE_MS = 5000
const BACKOFF_MAX_MS = 60_000
/** Un `cambio` de estos tipos ya llegó en vivo: su pull puede esperar y agruparse. */
const TIPOS_DIFERIDOS = new Set(['yjs', 'trazo'])
const PULL_DIFERIDO_MS = 8000
const PRESENCIA_MS = 60_000
const INTERVALO_CON_CANAL_MS = 600_000
const PRESENCIA_CADUCA_MS = 150_000

export interface EspacioAbierto {
  espacioId: string
  /** Lo último que dijo el servidor (null mientras no ha respondido). */
  estado: () => Espacio | null
  miembros: () => MiembroEspacio[]
  puedeEditar: () => boolean
  /** Escucha un evento del canal. Devuelve la función para dejar de escuchar. */
  on: (ev: EventoEspacio, cb: (p: unknown) => void) => () => void
  /** Publica en el canal (inmediatez, sin durabilidad). No-op para los lectores. */
  enviar: (ev: EventoEspacio, payload: object) => void
  /** Escucha las operaciones del log de un tipo. Devuelve la baja. */
  alCambio: (tipo: string, fn: (c: CambioEspacio) => void) => () => void
  /** Encola una operación durable. El `uid` lo hace idempotente. */
  publicar: (tipo: string, datos: unknown, uid?: string) => void
  vaciarCola: () => Promise<void>
  pull: () => Promise<void>
  releer: () => Promise<void>
  snapshot: (estado: unknown, hastaSeq?: number) => Promise<void>
  cerrar: () => void
}

interface Vivo {
  publico: EspacioAbierto
  refs: number
  apagar: () => void
}

const abiertos = new Map<string, Vivo>()

/** El espacio abierto con ese id, o null. No abre nada. */
export function espacioAbierto(espacioId: string): EspacioAbierto | null {
  return abiertos.get(espacioId)?.publico ?? null
}

/**
 * Abre (o reutiliza) el espacio. Vuelve al instante: la conexión y el primer
 * pull van por detrás. `cursor: 'persistente'` guarda el avance en `_syncMeta`
 * (calendarios, cuyas filas viven en Dexie); `'memoria'` arranca desde el
 * snapshot en cada apertura (documento y dibujo se reconstruyen enteros).
 */
export function abrirEspacio(
  espacioId: string,
  opciones?: { cursor?: 'persistente' | 'memoria' },
): EspacioAbierto {
  const ya = abiertos.get(espacioId)
  if (ya) {
    ya.refs += 1
    return ya.publico
  }
  const vivo = crear(espacioId, opciones?.cursor === 'persistente')
  abiertos.set(espacioId, vivo)
  return vivo.publico
}

function crear(espacioId: string, persistente: boolean): Vivo {
  const oyentes = new Map<EventoEspacio, Set<(p: unknown) => void>>()
  const porTipo = new Map<string, Set<(c: CambioEspacio) => void>>()
  /** `miembroId` → última señal de vida. */
  const presentes = new Map<string, number>()
  const cola: api.CambioSalida[] = []

  let canal: Transporte<EventoEspacio> | null = null
  let esp: Espacio | null = null
  let miembros: MiembroEspacio[] = []
  let cursor = 0
  /** `max_seq` devuelto por mi último push: hasta ahí los ecos con mi firma son míos. */
  let ultimoSeqPropio = 0
  let activo = true
  let enviando = false
  let fallos = 0
  let pullEnVuelo = false
  let pullPendiente = false
  let timerLote: ReturnType<typeof setTimeout> | null = null
  let timerReintento: ReturnType<typeof setTimeout> | null = null
  let timerDiferido: ReturnType<typeof setTimeout> | null = null
  let timerIntervalo: ReturnType<typeof setInterval> | null = null
  let timerPresencia: ReturnType<typeof setInterval> | null = null
  /** Último pull de la red de seguridad (o de la última (re)conexión del canal). */
  let ultimaVuelta = 0
  /** El canal llegó a unirse: desde entonces la red de seguridad se espacia. */
  let unido = false

  const puedeEditar = () => esp?.rol === 'dueno' || esp?.rol === 'editor'

  // ─── espejo al store ───────────────────────────────────────────────────────

  function espejo(conectado?: boolean): void {
    const limite = Date.now() - PRESENCIA_CADUCA_MS
    for (const [id, visto] of presentes) if (visto < limite) presentes.delete(id)
    fijarVivo(espacioId, {
      presentes: [...presentes.keys()],
      bloqueo: esp?.bloqueo ?? null,
      ...(conectado === undefined ? {} : { conectado }),
    })
  }

  // ─── ciclo de vida ─────────────────────────────────────────────────────────

  async function conectar(): Promise<void> {
    try {
      await releer()
    } catch (e) {
      if (!activo) return
      programarReintento(e)
      if (!esp) return // sin saber ni el rol no hay canal que abrir
    }
    if (!activo) return
    cursor = persistente ? await cache.leerCursor(espacioId) : (esp?.snapshotSeq ?? 0)
    const c = await abrirCanalEspacio(espacioId, puedeEditar())
    if (!activo) {
      c.cerrar()
      return
    }
    canal = c
    // UN binding por evento y TODOS antes del primer mensaje: un canal de
    // Realtime no admite `.on()` nuevos una vez suscrito.
    c.on('cambio', alCambioDelCanal)
    for (const ev of ['miembros', 'meta', 'bloqueo'] as const) {
      c.on(ev, (p) => {
        repartirCanal(ev, p)
        releerSeguro()
      })
    }
    c.on('borrado', () => void desaparecio())
    for (const ev of ['yjs', 'aw', 'sv', 'trazo'] as const) c.on(ev, (p) => repartirCanal(ev, p))
    c.on('presencia', (p) => {
      const d = p as { de?: unknown; activo?: unknown } | null
      if (!d || typeof d.de !== 'string') return
      if (d.activo === false) presentes.delete(d.de)
      else presentes.set(d.de, Date.now())
      espejo()
      repartirCanal('presencia', p)
    })

    if (c.alSuscribir) c.alSuscribir(alDia)
    else alDia() // en local no hay SUBSCRIBED: el canal nace unido

    // Red de seguridad: nada con la pestaña oculta; con el canal unido los
    // cambios llegan solos y basta una vuelta cada 10 min. La presencia solo
    // la ve quien tiene la app delante: oculta, no se anuncia.
    timerIntervalo = setInterval(() => {
      if (document.hidden || (unido && Date.now() - ultimaVuelta < INTERVALO_CON_CANAL_MS)) return
      ultimaVuelta = Date.now()
      void pull()
    }, INTERVALO_MS)
    timerPresencia = setInterval(() => {
      if (!document.hidden) saludar()
    }, PRESENCIA_MS)
    document.addEventListener('visibilitychange', alVisible)
    window.addEventListener('online', alOnline)
  }

  /** Cada (re)conexión: ponerse al día y anunciarse. */
  function alDia(): void {
    unido = true
    ultimaVuelta = Date.now()
    void pull()
    releerSeguro()
    saludar()
  }

  /**
   * `releer()` en respuesta a un evento: su fallo es la vía por la que se sabe
   * que me expulsaron o que ya no soy miembro, así que NO puede quedar en una
   * promesa rechazada sin dueño (es justo lo que avisa de que hay que cerrar).
   */
  function releerSeguro(): void {
    void releer().catch(programarReintento)
  }

  function saludar(): void {
    espejo()
    canal?.enviar('presencia', { v: 1, de: esp?.yo ?? '', activo: true })
  }

  function alVisible(): void {
    if (document.visibilityState === 'visible') void pull()
    else void vaciarCola()
  }

  function alOnline(): void {
    void pull()
  }

  function apagar(): void {
    activo = false
    document.removeEventListener('visibilitychange', alVisible)
    window.removeEventListener('online', alOnline)
    for (const t of [timerLote, timerReintento, timerDiferido]) if (t != null) clearTimeout(t)
    for (const t of [timerIntervalo, timerPresencia]) if (t != null) clearInterval(t)
    timerLote = timerReintento = timerDiferido = null
    timerIntervalo = timerPresencia = null
    canal?.enviar('presencia', { v: 1, de: esp?.yo ?? '', activo: false })
    canal?.cerrar()
    canal = null
    oyentes.clear()
    porTipo.clear()
    presentes.clear()
    abiertos.delete(espacioId)
    olvidarVivo(espacioId)
  }

  /**
   * Lo borró su dueño, me sacaron o salí: fuera del dispositivo sin dejar
   * rastro. Los oyentes de `borrado` se enteran también por el camino del
   * error (expulsión detectada al releer), no solo por el evento del canal:
   * el calendario tiene que borrar sus filas locales en los dos casos.
   */
  async function desaparecio(): Promise<void> {
    if (!activo) return
    repartirCanal('borrado', { v: 1 })
    apagar()
    quitarDeLista(espacioId)
    await cache.borrarEspacio(espacioId).catch(() => undefined)
  }

  // ─── eventos del canal ─────────────────────────────────────────────────────

  function repartirCanal(ev: EventoEspacio, p: unknown): void {
    const cbs = oyentes.get(ev)
    if (!cbs) return
    for (const cb of cbs) cb(p)
  }

  function alCambioDelCanal(p: unknown): void {
    repartirCanal('cambio', p)
    const d = p as { seq?: unknown; tipo?: unknown; de?: unknown } | null
    if (!d || typeof d.seq !== 'number') return
    // Mi propio eco: lo que publiqué ya lo tengo aplicado. OJO: `miembro_id` es
    // por (espacio, usuario), así que OTRO dispositivo mío firma igual que yo;
    // solo se descarta lo que no pase del último `seq` que devolvió MI push.
    if (typeof d.de === 'string' && esp && d.de === esp.yo && d.seq <= ultimoSeqPropio) return
    if (d.seq <= cursor) return
    if (typeof d.tipo === 'string' && TIPOS_DIFERIDOS.has(d.tipo)) {
      // Ya llegó en vivo por broadcast: el log solo hace falta para durar.
      if (timerDiferido == null) {
        timerDiferido = setTimeout(() => {
          timerDiferido = null
          void pull()
        }, PULL_DIFERIDO_MS)
      }
      return
    }
    void pull()
  }

  // ─── pull ──────────────────────────────────────────────────────────────────

  async function pull(): Promise<void> {
    if (!activo) return
    if (pullEnVuelo) {
      pullPendiente = true
      return
    }
    pullEnVuelo = true
    try {
      await navigator.locks.request(`mh-espacio-pull:${espacioId}`, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          pullPendiente = true
          return
        }
        let mas = true
        while (mas && activo) {
          const r = await api.pull(espacioId, cursor)
          for (const c of r.cambios) repartirCambio(c)
          cursor = Math.max(cursor, r.maxSeq)
          if (persistente) await cache.escribirCursor(espacioId, cursor)
          mas = r.mas
        }
        fallos = 0
        espejo(true)
      })
    } catch (e) {
      programarReintento(e)
    } finally {
      pullEnVuelo = false
      if (pullPendiente) {
        pullPendiente = false
        void pull()
      }
    }
  }

  function repartirCambio(c: CambioEspacio): void {
    const cbs = porTipo.get(c.tipo)
    if (!cbs) return
    for (const fn of cbs) fn(c)
  }

  async function releer(): Promise<void> {
    const r = await api.estado(espacioId)
    if (!activo) return
    esp = r.espacio
    miembros = r.miembros
    fundirEnLista(r.espacio)
    espejo()
    await cache.guardarEspacio(r.espacio)
  }

  function programarReintento(e: unknown): void {
    if (!activo) return
    if (e instanceof ErrorEspacio) {
      // Ya no pinto nada aquí: me sacaron, salí o lo borraron.
      if (e.codigo === 'no-encontrado' || e.codigo === 'sin-permiso' || e.codigo === 'expulsado') {
        void desaparecio()
        return
      }
      // Sin sesión no hay nada que reintentar: `conectar.ts` parará el motor.
      if (e.codigo === 'sin-sesion' || e.codigo === 'sin-backend') return
    }
    espejo(false)
    fallos += 1
    const espera = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (fallos - 1))
    if (timerReintento != null) clearTimeout(timerReintento)
    timerReintento = setTimeout(() => {
      timerReintento = null
      // Si ni el canal llegó a abrirse, lo que hay que reintentar es la conexión.
      if (!canal) {
        void conectar()
        return
      }
      void pull()
      void vaciarCola()
    }, espera)
  }

  // ─── cola de salida ────────────────────────────────────────────────────────

  const tam = (c: api.CambioSalida) => JSON.stringify(c.datos ?? null).length

  function publicar(tipo: string, datos: unknown, uid?: string): void {
    if (!activo || !puedeEditar()) return
    cola.push({ uid: uid ?? crypto.randomUUID(), tipo, datos })
    const bytes = cola.reduce((n, c) => n + tam(c), 0)
    if (cola.length >= LOTE_PUSH || bytes >= LOTE_PUSH_BYTES) {
      void vaciarCola()
      return
    }
    if (timerLote == null) {
      timerLote = setTimeout(() => {
        timerLote = null
        void vaciarCola()
      }, PUSH_MS)
    }
  }

  /**
   * Manda lo acumulado. Un lote que falla vuelve a la cabeza de la cola: el
   * servidor ignora los `uid` repetidos, así que reintentar nunca duplica.
   */
  async function vaciarCola(): Promise<void> {
    if (timerLote != null) {
      clearTimeout(timerLote)
      timerLote = null
    }
    if (enviando || !cola.length) return
    enviando = true
    try {
      while (cola.length && activo) {
        const lote: api.CambioSalida[] = []
        let bytes = 0
        while (cola.length && lote.length < LOTE_PUSH) {
          const n = tam(cola[0])
          if (lote.length && bytes + n > LOTE_PUSH_BYTES) break
          bytes += n
          lote.push(cola.shift()!)
        }
        try {
          const r = await api.push(espacioId, lote)
          if (esp) esp.seq = Math.max(esp.seq, r.maxSeq)
          ultimoSeqPropio = Math.max(ultimoSeqPropio, r.maxSeq)
          fallos = 0
        } catch (e) {
          cola.unshift(...lote)
          programarReintento(e)
          return
        }
      }
    } finally {
      enviando = false
    }
  }

  async function snapshot(estado: unknown, hastaSeq?: number): Promise<void> {
    await vaciarCola()
    // Un pull antes: el cursor no avanza con mis propios pushes (sus ecos se
    // descartan), y compactar con él atrasado dejaría mis últimos cambios en el
    // log y a `seq - snapshotSeq` por encima del umbral, repitiendo la
    // compactación en cada lote.
    await pull()
    // Se compacta hasta el CURSOR, nunca hasta `esp.seq`: el seq del servidor
    // puede incluir cambios ajenos que aún no he aplicado, y borrarlos del log
    // dejaría un snapshot sin ellos para quien entre después. Lo que aún no
    // cubre el cursor se queda en el log: no se pierde nada.
    const hasta = hastaSeq ?? cursor
    const seq = await api.guardarSnapshot(espacioId, estado, hasta)
    if (esp) esp.snapshotSeq = seq
  }

  const publico: EspacioAbierto = {
    espacioId,
    estado: () => esp,
    miembros: () => miembros,
    puedeEditar,
    on(ev, cb) {
      let cbs = oyentes.get(ev)
      if (!cbs) {
        cbs = new Set()
        oyentes.set(ev, cbs)
      }
      cbs.add(cb)
      return () => cbs.delete(cb)
    },
    enviar(ev, payload) {
      if (!puedeEditar()) return
      canal?.enviar(ev, { v: 1, de: esp?.yo ?? '', ...payload })
    },
    alCambio(tipo, fn) {
      let cbs = porTipo.get(tipo)
      if (!cbs) {
        cbs = new Set()
        porTipo.set(tipo, cbs)
      }
      cbs.add(fn)
      return () => cbs.delete(fn)
    },
    publicar,
    vaciarCola,
    pull,
    releer,
    snapshot,
    cerrar() {
      const v = abiertos.get(espacioId)
      if (!v) return
      v.refs -= 1
      if (v.refs > 0) return
      void vaciarCola().finally(apagar)
    },
  }

  void conectar()
  return { publico, refs: 1, apagar }
}

/** Cierra TODOS los espacios abiertos (cambio de cuenta o cierre de sesión). */
export function cerrarTodos(): void {
  for (const v of [...abiertos.values()]) v.apagar()
}
