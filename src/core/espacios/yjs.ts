/**
 * Proveedor Yjs sobre un espacio compartido: el «transporte» que le falta a
 * `y-prosemirror`/TipTap, hecho con las dos vías que ya tiene el espacio.
 *
 *   broadcast `yjs`  → inmediatez (250 ms de debounce, se puede perder)
 *   log `publicar('yjs')` → durabilidad (lotes de 2 s; el pull lo repara todo)
 *
 * No hay servidor de Yjs: la verdad durable es el LOG del espacio más su
 * snapshot compactado. Al abrir se aplica el snapshot y luego el log desde
 * `snapshotSeq` (incluidas las operaciones propias: Yjs es idempotente, aplicar
 * dos veces el mismo update no hace nada).
 *
 * Módulo de `core/`: no importa nada de `rooms/`.
 */
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import * as Y from 'yjs'
import * as api from './api'
import type { EspacioAbierto } from './motor'

/** Origen con el que se aplica lo ajeno: así no se reenvía de vuelta. */
const REMOTO = 'remoto'

/** Debounce del broadcast de updates (ver «Presupuesto Realtime» del plan). */
const BROADCAST_MS = 250
/** Debounce del awareness (cursores y selecciones). */
const AWARENESS_MS = 300
/** Debounce del lote durable. */
const DURABLE_MS = 2000
/**
 * Bytes acumulados a partir de los cuales conviene compactar en vez de publicar:
 * el update viaja en base64 (×4/3), y `datos` de un cambio topa en 64 KB y un
 * broadcast en 48 KB. 36 KB crudos ≈ 48 KB de base64: por debajo de los dos.
 */
const TOPE_UPDATE = 36 * 1024
/** Cambios en el log por encima de los cuales se compacta. */
const CAMBIOS_PARA_SNAPSHOT = 200
/** Tiempo tras el cual se compacta aunque haya pocos cambios. */
const SNAPSHOT_MS = 5 * 60_000

export interface DocCompartido {
  doc: Y.Doc
  awareness: Awareness
  /** Resuelve cuando el documento ya tiene el snapshot y el log aplicados. */
  listo: Promise<void>
  cerrar: () => Promise<void>
}

/** La paleta de los cursores (6 dígitos hex: `CollaborationCaret` descarta el resto). */
const PALETA = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8', '#f472b6']

/**
 * Color estable de un miembro: el mismo en todos los dispositivos. El hash es
 * FNV-1a y no el clásico `h*31 + c`: con `miembroId` (12 dígitos hex) ese otro
 * reparte fatal sobre ocho colores y casi todos salían del mismo.
 */
export function colorDeMiembro(miembroId: string): string {
  let h = 2166136261
  for (let i = 0; i < miembroId.length; i++) {
    h ^= miembroId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return PALETA[(h >>> 0) % PALETA.length]
}

// ─── base64 ──────────────────────────────────────────────────────────────────

/** `Uint8Array.toBase64`/`fromBase64` donde existan; si no, `btoa`/`atob`. */
interface ConBase64 {
  toBase64?: () => string
  fromBase64?: (s: string) => Uint8Array
}

export function b64(u: Uint8Array): string {
  const nativo = (u as Uint8Array & ConBase64).toBase64
  if (nativo) return nativo.call(u)
  let s = ''
  // Por trozos: `fromCharCode` con cientos de miles de argumentos revienta la pila.
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(s)
}

export function bytes(v: unknown): Uint8Array | null {
  if (typeof v !== 'string' || !v) return null
  try {
    const nativo = (Uint8Array as unknown as ConBase64).fromBase64
    if (nativo) return nativo(v)
    const s = atob(v)
    const u = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i)
    return u
  } catch {
    // Un payload corrupto se ignora: el pull traerá el estado bueno.
    return null
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─── el proveedor ────────────────────────────────────────────────────────────

/**
 * Engancha un `Y.Doc` nuevo al espacio. Devuelve al instante: la carga va por
 * detrás y se espera con `listo` (hasta entonces el editor debe estar en solo
 * lectura, o lo que se escriba se mezclaría con el texto que aún no ha bajado).
 */
export function abrirDocYjs(esp: EspacioAbierto, usuario: { name: string; color: string }): DocCompartido {
  const doc = new Y.Doc()
  const awareness = new Awareness(doc)
  awareness.setLocalStateField('user', usuario)

  const bajas: (() => void)[] = []
  let cerrado = false
  /** Acumulado pendiente de broadcast. */
  let paraCanal: Uint8Array | null = null
  /** Acumulado pendiente de publicar en el log. */
  let paraLog: Uint8Array | null = null
  const awCambiados = new Set<number>()
  let timerCanal: ReturnType<typeof setTimeout> | null = null
  let timerLog: ReturnType<typeof setTimeout> | null = null
  let timerAw: ReturnType<typeof setTimeout> | null = null
  let ultimoSnapshot = Date.now()
  /** He publicado algo desde el último snapshot (sin esto no hay nada que compactar). */
  let empujeMio = false
  /** `miembroId` a los que ya se les mandó el state vector. */
  const saludados = new Set<string>()

  const aplicar = (u: Uint8Array | null): void => {
    if (!u || !u.length || cerrado) return
    try {
      Y.applyUpdate(doc, u, REMOTO)
    } catch {
      // Update incompatible (otra versión del protocolo): mejor ignorarlo que romper el editor.
    }
  }

  const uDe = (p: unknown): Uint8Array | null => bytes((p as { u?: unknown } | null)?.u)

  // ── entrada: PRIMERO los oyentes, para no perder nada mientras se carga ──

  // Nada se descarta por venir firmado como «yo»: Realtime no devuelve al
  // emisor su propio broadcast, y OTRO dispositivo de la misma persona firma con
  // el mismo `miembro_id` (uno por espacio y usuario). Aplicar un update propio
  // por segunda vez, si alguna vez llegara, no hace nada: Yjs es idempotente.
  bajas.push(esp.alCambio('yjs', (c) => aplicar(uDe(c.datos))))
  bajas.push(esp.on('yjs', (p) => aplicar(uDe(p))))
  bajas.push(
    esp.on('sv', (p) => {
      const sv = bytes((p as { s?: unknown } | null)?.s)
      if (!sv) return
      // Lo que a ese le falta según su state vector; el resto ya lo tiene.
      esp.enviar('yjs', { u: b64(Y.encodeStateAsUpdate(doc, sv)) })
    }),
  )
  bajas.push(
    esp.on('aw', (p) => {
      const s = bytes((p as { s?: unknown } | null)?.s)
      if (s) applyAwarenessUpdate(awareness, s, REMOTO)
    }),
  )
  // Alguien nuevo en el canal: se le manda el state vector para cerrar el hueco
  // al instante (el motor no expone el `alSuscribir` del transporte).
  bajas.push(
    esp.on('presencia', (p) => {
      const d = p as { de?: unknown; activo?: unknown } | null
      if (!d || typeof d.de !== 'string') return
      if (d.activo === false) {
        saludados.delete(d.de)
        return
      }
      if (saludados.has(d.de)) return
      saludados.add(d.de)
      mandarSv()
    }),
  )

  function mandarSv(): void {
    if (cerrado) return
    esp.enviar('sv', { s: b64(Y.encodeStateVector(doc)) })
  }

  // ── salida ──────────────────────────────────────────────────────────────

  function alActualizar(u: Uint8Array, origen: unknown): void {
    if (cerrado || origen === REMOTO) return
    paraCanal = paraCanal ? Y.mergeUpdates([paraCanal, u]) : u
    paraLog = paraLog ? Y.mergeUpdates([paraLog, u]) : u
    if (timerCanal == null) {
      timerCanal = setTimeout(() => {
        timerCanal = null
        vaciarCanal()
      }, BROADCAST_MS)
    }
    // Demasiado acumulado para un cambio del log: el estado entero es más barato.
    if (paraLog.length > TOPE_UPDATE) {
      void compactar()
      return
    }
    if (timerLog == null) {
      timerLog = setTimeout(() => {
        timerLog = null
        vaciarLog()
      }, DURABLE_MS)
    }
  }
  doc.on('update', alActualizar)

  function vaciarCanal(): void {
    if (!paraCanal || cerrado) return
    const u = paraCanal
    paraCanal = null
    // Un broadcast enorme lo rechazaría Realtime: se deja al log y al `sv`.
    if (u.length <= TOPE_UPDATE) esp.enviar('yjs', { u: b64(u) })
  }

  function vaciarLog(): void {
    if (!paraLog || cerrado) return
    const u = paraLog
    paraLog = null
    empujeMio = true
    esp.publicar('yjs', { v: 1, u: b64(u) })
    void quizaCompactar()
  }

  /** Sube el estado entero y deja el log limpio. */
  async function compactar(): Promise<void> {
    if (cerrado || !esp.puedeEditar()) return
    // Lo pendiente ya está dentro del estado completo: no hace falta publicarlo.
    paraLog = null
    if (timerLog != null) {
      clearTimeout(timerLog)
      timerLog = null
    }
    empujeMio = false
    ultimoSnapshot = Date.now()
    try {
      await esp.snapshot({ v: 1, yjs: b64(Y.encodeStateAsUpdate(doc)) })
    } catch {
      // El motor ya avisa del fallo; el log sigue siendo la verdad.
    }
  }

  /** ¿Toca compactar? Log largo, o rato sin hacerlo habiendo empujado algo. */
  async function quizaCompactar(): Promise<void> {
    const e = esp.estado()
    if (!e) return
    const largo = e.seq - e.snapshotSeq > CAMBIOS_PARA_SNAPSHOT
    const viejo = empujeMio && Date.now() - ultimoSnapshot > SNAPSHOT_MS
    if (largo || viejo) await compactar()
  }

  // ── awareness ───────────────────────────────────────────────────────────

  const alAwareness = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    if (cerrado) return
    for (const c of [...added, ...updated, ...removed]) awCambiados.add(c)
    if (timerAw != null) return
    timerAw = setTimeout(() => {
      timerAw = null
      if (cerrado || !awCambiados.size) return
      const cambiados = [...awCambiados]
      awCambiados.clear()
      esp.enviar('aw', { s: b64(encodeAwarenessUpdate(awareness, cambiados)) })
    }, AWARENESS_MS)
  }
  awareness.on('update', alAwareness)

  // ── carga ───────────────────────────────────────────────────────────────

  /** El motor responde `estado()` tras su primer `releer`; sin él no se puede publicar. */
  async function esperarEstado(): Promise<void> {
    if (esp.estado()) return
    for (let i = 0; i < 100 && !cerrado && !esp.estado(); i++) await esperar(100)
  }

  async function cargar(): Promise<void> {
    await esperarEstado()
    if (cerrado) return
    const id = esp.espacioId
    const { snapshot, snapshotSeq } = await api.leerSnapshot(id)
    aplicar(bytes((snapshot as { yjs?: unknown } | null)?.yjs))
    let desde = snapshotSeq
    let mas = true
    while (mas && !cerrado) {
      const r = await api.pull(id, desde)
      // También lo MÍO: al reabrir hay que recuperar lo que escribí antes de cerrar.
      for (const c of r.cambios) if (c.tipo === 'yjs') aplicar(uDe(c.datos))
      if (r.maxSeq <= desde) break
      desde = r.maxSeq
      mas = r.mas
    }
    if (cerrado) return
    // Ya con el documento completo: que los demás me manden lo que me falte.
    mandarSv()
  }

  const listo = cargar()

  // ── cierre ──────────────────────────────────────────────────────────────

  const alOcultar = () => {
    if (document.visibilityState !== 'hidden') return
    vaciarCanal()
    vaciarLog()
    void esp.vaciarCola()
  }
  document.addEventListener('visibilitychange', alOcultar)

  async function cerrar(): Promise<void> {
    if (cerrado) return
    vaciarCanal()
    vaciarLog()
    cerrado = true
    for (const t of [timerCanal, timerLog, timerAw]) if (t != null) clearTimeout(t)
    timerCanal = timerLog = timerAw = null
    document.removeEventListener('visibilitychange', alOcultar)
    doc.off('update', alActualizar)
    awareness.off('update', alAwareness)
    for (const baja of bajas) baja()
    bajas.length = 0
    try {
      await esp.vaciarCola()
    } finally {
      esp.cerrar()
      // El editor que colgaba de este `Y.Doc` puede seguir montado hasta el
      // siguiente render (quien cierra suele ser su propio efecto). Destruirlo
      // ahora dejaría a `ySyncPlugin` observando un tipo muerto y el editor
      // reventaría; un turno de macrotarea basta para que React lo desmonte.
      setTimeout(() => {
        awareness.destroy()
        doc.destroy()
      }, 0)
    }
  }

  return { doc, awareness, listo, cerrar }
}
