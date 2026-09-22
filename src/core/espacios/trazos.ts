import * as api from './api'
import type { EspacioAbierto } from './motor'

/**
 * El tipo «dibujo» del espacio compartido: la coedición por OPERACIONES.
 *
 * A diferencia del documento (Yjs, que es un CRDT), aquí la verdad es una
 * LISTA ORDENADA de operaciones sobre un estado de partida:
 *
 *   imagen = snapshot (un PNG por capa) + operaciones del log en orden de `seq`
 *
 * Mientras se dibuja, cada operación viaja dos veces: por broadcast (`trazo`,
 * inmediato, se puede perder) y por el log (`publicar`, durable y ordenado). El
 * broadcast se aplica en cuanto llega, al final de la lista; cuando el pull le
 * pone su `seq` definitivo y resulta que va ANTES de algo ya pintado, la capa
 * afectada se vuelve a rasterizar desde el snapshot (los píxeles no se pueden
 * «insertar en medio»). Por eso todo trazo es determinista: el aerosol lleva
 * semilla y el suavizado depende solo de los puntos.
 *
 * Módulo de `core/`: no importa nada de `rooms/` ni `db`. Lo que sabe pintar lo
 * pone quien lo abre, con un `AplicadorLienzo`, y lo que sabe LEER una
 * operación ajena, la función `leer` que se le pasa.
 */

/** Los `tipo` de operación del dibujo (también son los tipos del log). */
export const TIPOS_OP = [
  'trazo',
  'forma',
  'relleno',
  'texto',
  'transformar',
  'imagen',
  'limpiar',
  'filtro',
  'redimensionar',
  'capa',
  'deshacer',
  'rehacer',
] as const

/** Las que el motor interpreta él mismo: anulan o restauran otra operación. */
const ANULACION = new Set<string>(['deshacer', 'rehacer'])
/**
 * Las que cambian la ESTRUCTURA (lista de capas o tamaño del lienzo). No se
 * pueden reparar capa a capa: si hay que arreglar el orden, se replica todo.
 */
const ESTRUCTURAL = new Set<string>(['capa', 'redimensionar'])

/** Capas sin `capa` propia (redimensionar, capa…) en los índices por capa. */
const GLOBAL = '*'

/** Operaciones en el log por encima de las cuales conviene compactar. */
const OPS_PARA_SNAPSHOT = 200
/** Tiempo tras el cual se compacta aunque haya pocas. */
const SNAPSHOT_MS = 5 * 60_000
/** Tope de un broadcast de Realtime (lo grande se queda solo en el log). */
const TOPE_BROADCAST = 48 * 1024
/** Cuántos `uid` propios guarda la pila de deshacer compartida. */
const MAX_DESHACER = 50

/** Lo único que el motor mira de una operación; el resto lo entiende el aplicador. */
export interface OpTrazo {
  tipo: string
  /** Capa sobre la que actúa; sin ella la operación es global. */
  capa?: string
}

/** Una operación ya identificada (el `uid` lo pone quien la emite). */
export type ConUid<T> = T & { uid: string }

export interface CapaBase {
  capaId: string
  nombre: string
  visible: boolean
  opacidad: number
  /** Bitmap del snapshot; `null` = capa que nació después (vacía). */
  imagen: ImageBitmap | null
}

/** El punto de partida del replay: las capas tal como las dejó el snapshot. */
export interface EstadoDibujo {
  ancho: number
  alto: number
  capas: CapaBase[]
}

export interface CapaCapturada {
  capaId: string
  nombre: string
  visible: boolean
  opacidad: number
  blob: Blob
}

/** Lo que el editor implementa sobre su lienzo para que el motor pueda replicar. */
export interface AplicadorLienzo<T extends OpTrazo> {
  /** Ejecuta la operación sobre el lienzo (pintar, filtrar, tocar capas…). */
  aplicar(op: ConUid<T>): void
  /** Descarga lo que la operación necesite antes de aplicarla (la imagen de un `imagen`). */
  preparar?(op: ConUid<T>): Promise<void>
  /** Deja la capa como en el snapshot y vuelve a pintar SUS operaciones en orden. */
  rerasterizar(capaId: string, base: ImageBitmap | null, ops: ConUid<T>[]): void
  /** Vuelve al estado de partida (lista de capas, tamaño y bitmaps). */
  cargarSnapshot(estado: EstadoDibujo): void
  /** Las capas de ahora como PNG (para compactar). */
  capturarCapas(): Promise<CapaCapturada[]>
  tamano(): { ancho: number; alto: number }
}

/** El snapshot tal como se guarda en el espacio (los PNG van al bucket). */
interface CapaSnapshot {
  capaId: string
  nombre: string
  visible: boolean
  opacidad: number
  ruta: string
}
interface SnapshotDibujo {
  v: 1
  ancho: number
  alto: number
  capas: CapaSnapshot[]
}

export interface DibujoCompartido<T extends OpTrazo> {
  /** Resuelve cuando el snapshot y el log ya están pintados. */
  listo: Promise<EstadoDibujo | null>
  /**
   * Manda una operación propia: el editor YA la pintó, aquí solo se registra y
   * viaja. Con `uid` se reutiliza el de los parciales, para que al otro lado la
   * definitiva sustituya lo que ya pintó del trazo en curso.
   */
  emitir: (op: T, uid?: string) => void
  /** Avance de un trazo largo mientras se dibuja: solo broadcast, no entra en el log. */
  emitirParcial: (op: T, uid: string) => void
  /** Un `uid` nuevo para encadenar los parciales con la operación definitiva. */
  nuevoUid: () => string
  deshacer: () => boolean
  rehacer: () => boolean
  puedeDeshacer: () => boolean
  puedeRehacer: () => boolean
  cerrar: () => Promise<void>
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

const esPrefijo = (a: string[], b: string[]) => a.length <= b.length && a.every((v, i) => v === b[i])

/**
 * Engancha un lienzo al espacio. Vuelve al instante: la carga va por detrás y
 * se espera con `listo` (hasta entonces el editor debe estar en solo lectura).
 */
export function abrirDibujoCompartido<T extends OpTrazo>(
  esp: EspacioAbierto,
  aplicador: AplicadorLienzo<T>,
  leer: (bruto: unknown) => T | null,
): DibujoCompartido<T> {
  interface Entrada {
    uid: string
    op: ConUid<T>
    /** `Infinity` mientras el log no le haya dado el suyo. */
    seq: number
  }

  let base: EstadoDibujo = { ancho: 0, alto: 0, capas: [] }
  /** Todo lo que ya está dentro de `base` tiene `seq` menor o igual que esto. */
  let baseSeq = 0
  let ops: Entrada[] = []
  const porUid = new Map<string, Entrada>()
  /** `uid` ya conocidos (dedupe entre broadcast, log propio y pull). */
  const aplicadas = new Set<string>()
  const anuladas = new Set<string>()
  /** Capas cuya pintura no se corresponde con `ops` (parciales, anulaciones). */
  const sucias = new Set<string>()
  /** Los `uid` pintados ahora mismo, en el orden en que se pintaron. */
  let aplicado: string[] = []
  /** `uid` de trazos cuyos parciales ya se pintaron (la definitiva los sustituye). */
  const parciales = new Set<string>()
  /** Rutas de los PNG que sostienen `base` (se borran al reemplazar el snapshot). */
  let rutasBase: string[] = []
  /** Mis operaciones, para la pila de deshacer compartida. */
  const mias: string[] = []
  const rehechas: string[] = []

  let cerrado = false
  let compactando = false
  let ultimoSnapshot = Date.now()
  let empujeMio = false
  let timerConciliar: ReturnType<typeof setTimeout> | null = null

  // Toda la aplicación pasa por esta cadena: nada se pinta a la vez que otra
  // cosa, y el orden de llegada se respeta aunque haya descargas por medio.
  let cadena: Promise<void> = Promise.resolve()
  const encolar = (fn: () => Promise<void> | void): void => {
    cadena = cadena.then(fn).catch(() => undefined)
  }

  const capaDe = (op: OpTrazo) => op.capa ?? GLOBAL
  // Nada se descarta por venir firmado como «yo»: Realtime no devuelve al
  // emisor su broadcast, y OTRO dispositivo de la misma persona firma con el
  // mismo `miembro_id`. El eco, si llegara, lo para el dedupe por `uid`.

  // ─── registro de operaciones ───────────────────────────────────────────────

  /** Mete la operación en la lista (o le pone su `seq` si ya estaba). */
  function registrar(uid: string, op: T, seq: number): void {
    if (aplicadas.has(uid)) {
      const e = porUid.get(uid)
      if (e && seq !== Infinity && e.seq !== seq) e.seq = seq
      return
    }
    aplicadas.add(uid)
    // Ya está dentro del snapshot: no hay nada que volver a aplicar.
    if (seq !== Infinity && seq <= baseSeq) return
    if (ANULACION.has(op.tipo)) {
      const objetivo = (op as unknown as { op?: unknown }).op
      if (typeof objetivo !== 'string') return
      if (op.tipo === 'deshacer') anuladas.add(objetivo)
      else anuladas.delete(objetivo)
      const destino = porUid.get(objetivo)
      if (destino) sucias.add(capaDe(destino.op))
      return
    }
    const e: Entrada = { uid, op: { ...op, uid } as ConUid<T>, seq }
    porUid.set(uid, e)
    ops.push(e)
    // Sus parciales pintaron de más: esa capa hay que rehacerla.
    if (parciales.delete(uid)) sucias.add(capaDe(op))
  }

  function programarConciliar(): void {
    if (timerConciliar != null || cerrado) return
    timerConciliar = setTimeout(() => {
      timerConciliar = null
      encolar(conciliar)
    }, 0)
  }

  async function preparar(e: Entrada): Promise<void> {
    if (!aplicador.preparar) return
    await aplicador.preparar(e.op).catch(() => undefined)
  }

  /**
   * Pone la pintura al día con la lista de operaciones. El camino barato (lo
   * nuevo va al final) es el de siempre; el caro re-rasteriza la capa —o el
   * dibujo entero si hay operaciones estructurales— desde el snapshot.
   */
  async function conciliar(): Promise<void> {
    await conciliarAhora()
    quizaCompactar()
  }

  async function conciliarAhora(): Promise<void> {
    if (cerrado) return
    ops.sort((a, b) => (a.seq === b.seq ? 0 : a.seq < b.seq ? -1 : 1))
    const vivas = ops.filter((e) => !anuladas.has(e.uid))
    const orden = vivas.map((e) => e.uid)

    if (!sucias.size && esPrefijo(aplicado, orden)) {
      for (const e of vivas.slice(aplicado.length)) {
        await preparar(e)
        aplicador.aplicar(e.op)
      }
      aplicado = orden
      return
    }
    if (sucias.has(GLOBAL) || vivas.some((e) => ESTRUCTURAL.has(e.op.tipo))) {
      await reconstruir(vivas)
      return
    }
    // Solo pintura: se repara capa por capa. También las que se quedaron SIN
    // operaciones (se deshizo la única que tenían): hay que devolverlas al
    // snapshot, y sin esto nadie las tocaría.
    for (const capa of new Set([...vivas.map((e) => capaDe(e.op)), ...sucias])) {
      const nuevas = vivas.filter((e) => capaDe(e.op) === capa)
      const previas = aplicado.filter((uid) => {
        const e = porUid.get(uid)
        return e != null && capaDe(e.op) === capa
      })
      for (const e of nuevas) await preparar(e)
      if (!sucias.has(capa) && esPrefijo(previas, nuevas.map((e) => e.uid))) {
        for (const e of nuevas.slice(previas.length)) aplicador.aplicar(e.op)
      } else {
        const bitmap = base.capas.find((c) => c.capaId === capa)?.imagen ?? null
        aplicador.rerasterizar(capa, bitmap, nuevas.map((e) => e.op))
      }
    }
    aplicado = orden
    sucias.clear()
  }

  /** Desde el snapshot y otra vez todo: el camino seguro. */
  async function reconstruir(vivas: Entrada[]): Promise<void> {
    for (const e of vivas) await preparar(e)
    if (cerrado) return
    aplicador.cargarSnapshot(base)
    for (const e of vivas) aplicador.aplicar(e.op)
    aplicado = vivas.map((e) => e.uid)
    sucias.clear()
  }

  // ─── entrada ───────────────────────────────────────────────────────────────

  const bajas: (() => void)[] = []

  for (const tipo of TIPOS_OP) {
    bajas.push(
      esp.alCambio(tipo, (c) => {
        const op = leer(c.datos)
        if (!op) return
        encolar(() => {
          registrar(c.uid, op, c.seq)
          programarConciliar()
        })
      }),
    )
  }

  bajas.push(
    esp.on('trazo', (p) => {
      const d = p as { op?: unknown; parcial?: unknown } | null
      const bruto = d?.op as { uid?: unknown } | null
      const uid = bruto && typeof bruto.uid === 'string' ? bruto.uid : null
      const op = leer(d?.op)
      if (!op || !uid) return
      encolar(async () => {
        if (d?.parcial === true) {
          // Avance de un trazo en curso: solo se pinta, no entra en la lista.
          if (aplicadas.has(uid)) return
          const e: Entrada = { uid, op: { ...op, uid } as ConUid<T>, seq: Infinity }
          await preparar(e)
          parciales.add(uid)
          aplicador.aplicar(e.op)
          return
        }
        registrar(uid, op, Infinity)
        programarConciliar()
      })
    }),
  )

  // Otro compactó: mi base se quedó vieja y el log ya no tiene lo de antes.
  bajas.push(
    esp.on('cambio', (p) => {
      const d = p as { tipo?: unknown } | null
      if (d?.tipo !== 'snapshot') return
      // `recargarBase` ya ignora un snapshot que no pase de `baseSeq` (el mío).
      encolar(recargarBase)
    }),
  )

  // ─── carga ─────────────────────────────────────────────────────────────────

  /** El motor responde `estado()` tras su primer `releer`; sin él no se puede publicar. */
  async function esperarEstado(): Promise<void> {
    for (let i = 0; i < 100 && !cerrado && !esp.estado(); i++) await esperar(100)
  }

  function leerSnapshotJson(v: unknown): SnapshotDibujo | null {
    const d = v as Partial<SnapshotDibujo> | null
    if (!d || typeof d.ancho !== 'number' || typeof d.alto !== 'number' || !Array.isArray(d.capas)) return null
    const capas: CapaSnapshot[] = []
    for (const c of d.capas) {
      if (!c || typeof c.capaId !== 'string' || typeof c.ruta !== 'string') continue
      capas.push({
        capaId: c.capaId,
        nombre: typeof c.nombre === 'string' ? c.nombre : c.capaId,
        visible: c.visible !== false,
        opacidad: typeof c.opacidad === 'number' ? c.opacidad : 1,
        ruta: c.ruta,
      })
    }
    return capas.length ? { v: 1, ancho: d.ancho, alto: d.alto, capas } : null
  }

  /** Baja los PNG del snapshot y los deja como bitmaps de partida. */
  async function bajarSnapshot(s: SnapshotDibujo): Promise<EstadoDibujo> {
    const capas: CapaBase[] = []
    for (const c of s.capas) {
      let imagen: ImageBitmap | null = null
      try {
        imagen = await createImageBitmap(await api.descargarArchivo(c.ruta))
      } catch {
        // Un PNG que no baja deja la capa vacía: el log repinta lo que pueda.
      }
      capas.push({ capaId: c.capaId, nombre: c.nombre, visible: c.visible, opacidad: c.opacidad, imagen })
    }
    return { ancho: s.ancho, alto: s.alto, capas }
  }

  function soltarBase(): void {
    for (const c of base.capas) c.imagen?.close()
  }

  async function cargar(): Promise<EstadoDibujo | null> {
    await esperarEstado()
    if (cerrado) return null
    const id = esp.espacioId
    const { snapshot, snapshotSeq } = await api.leerSnapshot(id)
    const s = leerSnapshotJson(snapshot)
    if (s) {
      base = await bajarSnapshot(s)
      baseSeq = snapshotSeq
      rutasBase = s.capas.map((c) => c.ruta)
    }
    if (cerrado) return null
    // El log entero desde el snapshot, TAMBIÉN lo mío: al reabrir hay que
    // recuperar lo que dibujé antes de cerrar (el dedupe por `uid` evita el eco).
    let desde = snapshotSeq
    let mas = true
    while (mas && !cerrado) {
      const r = await api.pull(id, desde)
      for (const c of r.cambios) {
        const op = leer(c.datos)
        if (op) registrar(c.uid, op, c.seq)
      }
      if (r.maxSeq <= desde) break
      desde = r.maxSeq
      mas = r.mas
    }
    if (cerrado) return null
    ops.sort((a, b) => (a.seq === b.seq ? 0 : a.seq < b.seq ? -1 : 1))
    await reconstruir(ops.filter((e) => !anuladas.has(e.uid)))
    return base
  }

  /** Alguien compactó: se relee el snapshot y se poda lo que ya cubre. */
  async function recargarBase(): Promise<void> {
    if (cerrado) return
    try {
      const { snapshot, snapshotSeq } = await api.leerSnapshot(esp.espacioId)
      if (snapshotSeq <= baseSeq) return
      const s = leerSnapshotJson(snapshot)
      if (!s) return
      const nueva = await bajarSnapshot(s)
      if (cerrado) {
        for (const c of nueva.capas) c.imagen?.close()
        return
      }
      soltarBase()
      base = nueva
      baseSeq = snapshotSeq
      rutasBase = s.capas.map((c) => c.ruta)
      ops = ops.filter((e) => e.seq === Infinity || e.seq > baseSeq)
      porUid.clear()
      for (const e of ops) porUid.set(e.uid, e)
      await reconstruir(ops.filter((e) => !anuladas.has(e.uid)))
    } catch {
      // El siguiente pull o la siguiente apertura lo reintentan.
    }
  }

  // La carga va POR LA MISMA CADENA que todo lo demás: si un broadcast llegara
  // mientras se baja el snapshot, se aplicaría sobre un lienzo a medias. Así
  // espera su turno y entra después, en orden.
  const listo = cadena.then(() => cargar()).catch(() => null)
  cadena = listo.then(
    () => undefined,
    () => undefined,
  )

  // ─── salida ────────────────────────────────────────────────────────────────

  function mandar(op: ConUid<T>): void {
    const bruto = JSON.stringify(op)
    // Un broadcast demasiado grande lo rechazaría Realtime: se queda en el log.
    if (bruto.length <= TOPE_BROADCAST) esp.enviar('trazo', { op })
    esp.publicar(op.tipo, op, op.uid)
    empujeMio = true
  }

  function emitir(op: T, propuesto?: string): void {
    if (cerrado || !esp.puedeEditar()) return
    const uid = propuesto ?? crypto.randomUUID()
    const conUid = { ...op, uid } as ConUid<T>
    encolar(() => {
      aplicadas.add(uid)
      if (ANULACION.has(op.tipo)) {
        const objetivo = (op as unknown as { op?: unknown }).op
        if (typeof objetivo === 'string') {
          if (op.tipo === 'deshacer') anuladas.add(objetivo)
          else anuladas.delete(objetivo)
          const destino = porUid.get(objetivo)
          if (destino) sucias.add(capaDe(destino.op))
        }
        programarConciliar()
        return
      }
      const e: Entrada = { uid, op: conUid, seq: Infinity }
      porUid.set(uid, e)
      ops.push(e)
      // El editor ya lo pintó en vivo: solo se anota como pintado.
      aplicado.push(uid)
      quizaCompactar()
    })
    // La pila de deshacer se apunta YA, no en la cadena: el editor consulta
    // `puedeDeshacer()` en cuanto suelta el trazo, para pintar su botón.
    mias.push(uid)
    if (mias.length > MAX_DESHACER) mias.shift()
    rehechas.length = 0
    mandar(conUid)
  }

  function emitirParcial(op: T, uid: string): void {
    if (cerrado || !esp.puedeEditar()) return
    const conUid = { ...op, uid } as ConUid<T>
    const bruto = JSON.stringify(conUid)
    if (bruto.length > TOPE_BROADCAST) return
    esp.enviar('trazo', { op: conUid, parcial: true })
  }

  // ─── deshacer compartido ───────────────────────────────────────────────────

  /**
   * Mi última operación que siga viva. En compartido NO se usa la pila de
   * `ImageData` del lienzo: deshacer es otra operación más, que anula una
   * anterior por `uid` y obliga a re-rasterizar su capa.
   */
  function ultimaMia(): string | null {
    for (let i = mias.length - 1; i >= 0; i--) {
      if (!anuladas.has(mias[i])) return mias[i]
    }
    return null
  }

  function deshacer(): boolean {
    const uid = ultimaMia()
    if (uid == null) return false
    mias.splice(mias.lastIndexOf(uid), 1)
    rehechas.push(uid)
    emitir({ tipo: 'deshacer', op: uid } as unknown as T)
    return true
  }

  function rehacer(): boolean {
    const uid = rehechas.pop()
    if (uid == null) return false
    mias.push(uid)
    emitir({ tipo: 'rehacer', op: uid } as unknown as T)
    return true
  }

  // ─── compactación ──────────────────────────────────────────────────────────

  /**
   * Sube un PNG por capa y deja el log limpio. Lo hace quien empujó algo, así
   * que un lector nunca compacta y dos editores a la vez es inocuo (el servidor
   * exige que el corte no retroceda).
   */
  async function compactar(): Promise<void> {
    if (cerrado || !esp.puedeEditar()) {
      compactando = false
      return
    }
    try {
      // Lo que el pull dejó registrado hay que PINTARLO antes de capturar: si
      // no, esas operaciones se perderían al vaciar la lista.
      await conciliarAhora()
      // Con alguna operación aún sin `seq` (un push en vuelo), la imagen la
      // llevaría dentro pero el corte no la cubriría: quien cargara después la
      // pintaría OTRA VEZ encima del snapshot. Mejor esperar al siguiente turno.
      if (ops.some((e) => e.seq === Infinity)) return
      // El corte se decide en el MISMO instante que la copia de los bitmaps
      // (`capturarCapas` copia todo antes de su primer `await`): lo que el log
      // borre tiene que estar dentro de la imagen, o se perdería.
      const hasta = ops.reduce((n, e) => (e.seq !== Infinity && e.seq > n ? e.seq : n), baseSeq)
      const capas = await aplicador.capturarCapas()
      const { ancho, alto } = aplicador.tamano()
      const marca = hasta
      const estado: SnapshotDibujo = { v: 1, ancho, alto, capas: [] }
      const nuevas: CapaBase[] = []
      for (const c of capas) {
        const ruta = await api.subirArchivo(esp.espacioId, `capas/${c.capaId}-${marca}.png`, c.blob)
        estado.capas.push({
          capaId: c.capaId,
          nombre: c.nombre,
          visible: c.visible,
          opacidad: c.opacidad,
          ruta,
        })
        nuevas.push({
          capaId: c.capaId,
          nombre: c.nombre,
          visible: c.visible,
          opacidad: c.opacidad,
          imagen: await createImageBitmap(c.blob),
        })
      }
      const rutasViejas = rutasBase
      await esp.snapshot(estado, hasta)
      if (cerrado) {
        for (const c of nuevas) c.imagen?.close()
        return
      }
      // Lo capturado ES el estado de partida nuevo. La lista arranca vacía: lo
      // que había ya está dentro de la imagen, y lo que vuelva del log con un
      // `seq` cubierto por el corte (o con un `uid` ya conocido) se descarta.
      soltarBase()
      base = { ancho, alto, capas: nuevas }
      baseSeq = hasta
      ops = []
      porUid.clear()
      aplicado = []
      anuladas.clear()
      sucias.clear()
      // Lo que está dentro del snapshot ya no se puede deshacer.
      mias.length = 0
      rehechas.length = 0
      rutasBase = estado.capas.map((c) => c.ruta)
      ultimoSnapshot = Date.now()
      empujeMio = false
      void limpiarRutas(rutasViejas, rutasBase)
    } catch {
      // El motor ya avisa del fallo; el log sigue siendo la verdad.
    } finally {
      compactando = false
    }
  }

  /** Los PNG del snapshot anterior ya no los mira nadie (best-effort). */
  async function limpiarRutas(viejas: string[], vigentes: string[]): Promise<void> {
    for (const r of viejas) {
      if (vigentes.includes(r)) continue
      await api.borrarArchivo(r).catch(() => undefined)
    }
  }

  /**
   * ¿Toca compactar? Cuenta las operaciones que este dispositivo lleva
   * ENCIMA del snapshot, que es justo lo que el replay tendría que repetir.
   *
   * Antes de capturar hay que vaciar la cola y ponerse al día con el log, y las
   * dos cosas fuera de la cadena: así lo que traiga el pull queda registrado
   * ANTES de que la captura entre a su turno (dentro, quedaría detrás).
   */
  function quizaCompactar(): void {
    if (cerrado || compactando || !esp.puedeEditar()) return
    const largo = ops.length > OPS_PARA_SNAPSHOT
    const viejo = empujeMio && ops.length > 0 && Date.now() - ultimoSnapshot > SNAPSHOT_MS
    if (!largo && !viejo) return
    compactando = true
    void (async () => {
      try {
        await esp.vaciarCola()
        await esp.pull()
      } catch {
        compactando = false
        return
      }
      encolar(compactar)
    })()
  }

  // ─── cierre ────────────────────────────────────────────────────────────────

  async function cerrar(): Promise<void> {
    if (cerrado) return
    cerrado = true
    if (timerConciliar != null) clearTimeout(timerConciliar)
    timerConciliar = null
    for (const baja of bajas) baja()
    bajas.length = 0
    try {
      await esp.vaciarCola()
    } finally {
      soltarBase()
      base = { ancho: 0, alto: 0, capas: [] }
      esp.cerrar()
    }
  }

  return {
    listo,
    emitir,
    emitirParcial,
    nuevoUid: () => crypto.randomUUID(),
    deshacer,
    rehacer,
    puedeDeshacer: () => ultimaMia() != null,
    puedeRehacer: () => rehechas.length > 0,
    cerrar,
  }
}
