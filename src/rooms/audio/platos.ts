import { contextoAudio, desbloquearAudio } from '../../core/audio/motor'
import type { ProyectoAudio } from '../../core/data/db'
import { leerGrabacionAudio } from '../../core/data/repository'
import { MAESTRO_DEFAULT } from './constantes'
import { detectarBpm } from './detectorBpm'
import { crearBusMaestro, type BusMaestro } from './efectos'
import { renderizarBuffer } from './exportarWav'
import { calcularPicos } from './grabadorClip'

/**
 * Motor del mezclador DJ (singleton de módulo, sin React). Dos platos
 * independientes que reproducen la canción PRE-RENDERIZADA con el
 * `OfflineAudioContext` de `exportarWav.ts` (mismas recetas y efectos que el
 * editor): así cada plato tiene su propio tempo, seek instantáneo y onda, cosa
 * que el transporte único de `motor.ts` no puede dar. El pitch es de vinilo:
 * `playbackRate` cambia velocidad Y tono.
 *
 * Grafo por plato:
 *   source(rate) → lowshelf 200 Hz → peaking 1 kHz → highshelf 4 kHz
 *   → gainVolumen → analyser (vúmetro) → gainCrossfade → busMaestro → destino
 * (directo a `ctx.destination`, como el DAW: el `gainMaestro()` del core es de
 * la música ambiental). El analyser va POST-volumen y PRE-crossfade: el
 * vúmetro enseña el plato aunque el crossfader lo tenga apagado.
 */

export type LadoPlato = 'a' | 'b'
type EstadoPlato = 'vacio' | 'cargando' | 'pausado' | 'sonando'
export type BandaEq = 'grave' | 'medio' | 'agudo'

interface CancionPlato {
  titulo: string
  /** BPM base del proyecto (el efectivo es `bpm × rate`). */
  bpm: number
  /** Duración del render (incluye la cola de reverb/liberaciones). */
  duracionSeg: number
  /** ~200 cubetas 0..1 para pintar la onda. */
  picos: number[]
}

export interface SnapshotPlato {
  estado: EstadoPlato
  cancion: CancionPlato | null
  rate: number
  volumen: number
  eq: Record<BandaEq, number>
  cueSeg: number
}

export interface SnapshotMezclador {
  a: SnapshotPlato
  b: SnapshotPlato
  /** 0 = todo A · 1 = todo B. */
  crossfade: number
}

export const RATE_MIN = 0.5
export const RATE_MAX = 1.5
export const EQ_DB = 12
/** Una vuelta del disco = 1.8 s de audio (33⅓ RPM, como un vinilo real). */
export const SEG_POR_VUELTA = 1.8

const VOL_DEFAULT = 0.9

interface Plato {
  estado: EstadoPlato
  buffer: AudioBuffer | null
  cancion: CancionPlato | null
  source: AudioBufferSourceNode | null
  /** Posición consolidada; con el source andando se le suma `(now − t0) × rate`. */
  posSeg: number
  t0: number
  rate: number
  volumen: number
  eq: Record<BandaEq, number>
  cueSeg: number
  // Nodos fijos del plato (nacen con `armarGrafo`, mueren con `liberar`).
  eqNodos: Record<BandaEq, BiquadFilterNode> | null
  gainVol: GainNode | null
  analyser: AnalyserNode | null
  gainCross: GainNode | null
  datosVu: Uint8Array<ArrayBuffer> | null
  scratch: { activo: boolean; sonaba: boolean; grano: AudioBufferSourceNode | null; ultimoGranoT: number; perfUltimo: number }
}

const platoNuevo = (): Plato => ({
  estado: 'vacio',
  buffer: null,
  cancion: null,
  source: null,
  posSeg: 0,
  t0: 0,
  rate: 1,
  volumen: VOL_DEFAULT,
  eq: { grave: 0, medio: 0, agudo: 0 },
  cueSeg: 0,
  eqNodos: null,
  gainVol: null,
  analyser: null,
  gainCross: null,
  datosVu: null,
  scratch: { activo: false, sonaba: false, grano: null, ultimoGranoT: 0, perfUltimo: 0 },
})

const platos: Record<LadoPlato, Plato> = { a: platoNuevo(), b: platoNuevo() }
let crossfade = 0.5
let maestro: BusMaestro | null = null
let contadorCarga = 0

// ─── Store para React (snapshot inmutable, se reconstruye al emitir) ────────

const snapshotPlato = (p: Plato): SnapshotPlato => ({
  estado: p.estado,
  cancion: p.cancion,
  rate: p.rate,
  volumen: p.volumen,
  eq: { ...p.eq },
  cueSeg: p.cueSeg,
})

const construirSnapshot = (): SnapshotMezclador => ({ a: snapshotPlato(platos.a), b: snapshotPlato(platos.b), crossfade })

let snapshot = construirSnapshot()
const oyentes = new Set<() => void>()
function emitir() {
  snapshot = construirSnapshot()
  for (const fn of oyentes) fn()
}

export const mezcladorStore = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
  getSnapshot: (): SnapshotMezclador => snapshot,
}

// ─── Grafo ──────────────────────────────────────────────────────────────────

const ganCross = (lado: LadoPlato) => (lado === 'a' ? Math.cos((crossfade * Math.PI) / 2) : Math.sin((crossfade * Math.PI) / 2))

/** Arma maestro + cadena de cada plato con los valores vigentes; idempotente. */
function armarGrafo(ctx: AudioContext) {
  if (!maestro) maestro = crearBusMaestro(ctx, ctx.destination, MAESTRO_DEFAULT)
  for (const lado of ['a', 'b'] as const) {
    const p = platos[lado]
    if (p.eqNodos) continue
    const grave = ctx.createBiquadFilter()
    grave.type = 'lowshelf'
    grave.frequency.value = 200
    const medio = ctx.createBiquadFilter()
    medio.type = 'peaking'
    medio.frequency.value = 1000
    medio.Q.value = 0.8
    const agudo = ctx.createBiquadFilter()
    agudo.type = 'highshelf'
    agudo.frequency.value = 4000
    grave.gain.value = p.eq.grave
    medio.gain.value = p.eq.medio
    agudo.gain.value = p.eq.agudo
    const gainVol = ctx.createGain()
    gainVol.gain.value = p.volumen
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    const gainCross = ctx.createGain()
    gainCross.gain.value = ganCross(lado)
    grave.connect(medio)
    medio.connect(agudo)
    agudo.connect(gainVol)
    gainVol.connect(analyser)
    analyser.connect(gainCross)
    gainCross.connect(maestro.entrada)
    p.eqNodos = { grave, medio, agudo }
    p.gainVol = gainVol
    p.analyser = analyser
    p.gainCross = gainCross
    p.datosVu = new Uint8Array(analyser.fftSize)
  }
}

// ─── Transporte ─────────────────────────────────────────────────────────────

export function posicionSeg(lado: LadoPlato): number {
  const p = platos[lado]
  const ctx = contextoAudio()
  const dur = p.cancion?.duracionSeg ?? 0
  if (p.source && ctx) return Math.min(dur, p.posSeg + (ctx.currentTime - p.t0) * p.rate)
  return Math.min(dur, p.posSeg)
}

/** Para el source SIN disparar el fin natural (limpia `onended` antes). */
function pararSource(p: Plato) {
  if (!p.source) return
  p.source.onended = null
  try {
    p.source.stop()
  } catch {
    // aún no había arrancado
  }
  p.source.disconnect()
  p.source = null
}

function arrancarSource(lado: LadoPlato, desdeSeg: number) {
  const p = platos[lado]
  const ctx = contextoAudio()
  if (!ctx || !p.buffer || !p.eqNodos) return
  pararSource(p)
  const src = ctx.createBufferSource()
  src.buffer = p.buffer
  src.playbackRate.value = p.rate
  src.connect(p.eqNodos.grave)
  src.onended = () => {
    // Fin natural: el plato vuelve al cue, pausado (los stops manuales limpian onended).
    p.source = null
    p.posSeg = p.cancion ? Math.min(p.cueSeg, p.cancion.duracionSeg) : 0
    p.estado = 'pausado'
    emitir()
  }
  p.posSeg = desdeSeg
  p.t0 = ctx.currentTime
  src.start(0, desdeSeg)
  p.source = src
}

function pausar(lado: LadoPlato) {
  const p = platos[lado]
  if (p.estado !== 'sonando') return
  p.posSeg = posicionSeg(lado)
  pararSource(p)
  p.estado = 'pausado'
  emitir()
}

export function alternarPlay(lado: LadoPlato): void {
  const p = platos[lado]
  if (p.estado === 'sonando') return pausar(lado)
  if (p.estado !== 'pausado' || !p.cancion) return
  desbloquearAudio()
  const ctx = contextoAudio()
  if (!ctx) return
  armarGrafo(ctx)
  // Al final de la canción, play re-arranca desde el cue.
  const desde = p.posSeg >= p.cancion.duracionSeg - 0.02 ? Math.min(p.cueSeg, p.cancion.duracionSeg) : p.posSeg
  arrancarSource(lado, desde)
  p.estado = 'sonando'
  emitir()
}

/** Pausado: fija el punto de cue donde está la aguja · sonando: salta al cue. */
export function cue(lado: LadoPlato): void {
  const p = platos[lado]
  if (!p.cancion) return
  if (p.estado === 'sonando') {
    arrancarSource(lado, Math.min(p.cueSeg, p.cancion.duracionSeg))
  } else if (p.estado === 'pausado') {
    p.cueSeg = p.posSeg
    emitir()
  }
}

export function buscar(lado: LadoPlato, seg: number): void {
  const p = platos[lado]
  if (!p.cancion) return
  const destino = Math.max(0, Math.min(p.cancion.duracionSeg, seg))
  if (p.estado === 'sonando') arrancarSource(lado, destino)
  else p.posSeg = destino
}

// ─── Ajustes (preview imperativo + commit que emite, patrón Knob) ───────────

function aplicarRate(lado: LadoPlato, r: number) {
  const p = platos[lado]
  const nuevo = Math.max(RATE_MIN, Math.min(RATE_MAX, r))
  if (nuevo === p.rate) return
  const ctx = contextoAudio()
  if (p.source && ctx) {
    // Consolidar con el rate viejo y re-anclar ANTES de tocar el nodo (si no, la aguja salta).
    p.posSeg = p.posSeg + (ctx.currentTime - p.t0) * p.rate
    p.t0 = ctx.currentTime
    p.source.playbackRate.value = nuevo
  }
  p.rate = nuevo
}

export function ajustarRateEnVivo(lado: LadoPlato, r: number): void {
  aplicarRate(lado, r)
}

export function fijarRate(lado: LadoPlato, r: number): void {
  aplicarRate(lado, r)
  emitir()
}

/** Iguala el tempo de este plato al BPM efectivo del de enfrente (vía pitch). */
export function sincronizar(lado: LadoPlato): void {
  const p = platos[lado]
  const otro = platos[lado === 'a' ? 'b' : 'a']
  if (!p.cancion || !otro.cancion) return
  fijarRate(lado, (otro.cancion.bpm * otro.rate) / p.cancion.bpm)
}

function aplicarVolumen(lado: LadoPlato, v: number) {
  const p = platos[lado]
  p.volumen = Math.max(0, Math.min(1, v))
  const ctx = contextoAudio()
  if (p.gainVol && ctx) p.gainVol.gain.setTargetAtTime(p.volumen, ctx.currentTime, 0.03)
}

export function ajustarVolumenEnVivo(lado: LadoPlato, v: number): void {
  aplicarVolumen(lado, v)
}

export function fijarVolumen(lado: LadoPlato, v: number): void {
  aplicarVolumen(lado, v)
  emitir()
}

function aplicarEq(lado: LadoPlato, banda: BandaEq, db: number) {
  const p = platos[lado]
  p.eq[banda] = Math.max(-EQ_DB, Math.min(EQ_DB, db))
  const ctx = contextoAudio()
  if (p.eqNodos && ctx) p.eqNodos[banda].gain.setTargetAtTime(p.eq[banda], ctx.currentTime, 0.03)
}

export function ajustarEqEnVivo(lado: LadoPlato, banda: BandaEq, db: number): void {
  aplicarEq(lado, banda, db)
}

export function fijarEq(lado: LadoPlato, banda: BandaEq, db: number): void {
  aplicarEq(lado, banda, db)
  emitir()
}

function aplicarCrossfade(x: number) {
  crossfade = Math.max(0, Math.min(1, x))
  const ctx = contextoAudio()
  if (!ctx) return
  for (const lado of ['a', 'b'] as const) {
    const g = platos[lado].gainCross
    if (g) g.gain.setTargetAtTime(ganCross(lado), ctx.currentTime, 0.02)
  }
}

export function ajustarCrossfadeEnVivo(x: number): void {
  aplicarCrossfade(x)
}

export function fijarCrossfade(x: number): void {
  aplicarCrossfade(x)
  emitir()
}

// ─── Scratch (granular: granitos a la posición del dedo) ────────────────────

export function iniciarScratch(lado: LadoPlato): void {
  const p = platos[lado]
  if (!p.cancion) return
  p.scratch.sonaba = p.estado === 'sonando'
  if (p.scratch.sonaba) {
    p.posSeg = posicionSeg(lado)
    pararSource(p)
  }
  p.scratch.activo = true
  p.scratch.perfUltimo = performance.now()
  desbloquearAudio()
  const ctx = contextoAudio()
  if (ctx) armarGrafo(ctx)
}

export function moverScratch(lado: LadoPlato, deltaSeg: number): void {
  const p = platos[lado]
  if (!p.scratch.activo || !p.cancion || !p.buffer) return
  p.posSeg = Math.max(0, Math.min(p.cancion.duracionSeg, p.posSeg + deltaSeg))
  const ctx = contextoAudio()
  if (!ctx || !p.eqNodos) return
  const ahora = performance.now()
  const dt = Math.max(0.008, (ahora - p.scratch.perfUltimo) / 1000)
  p.scratch.perfUltimo = ahora
  if (ctx.currentTime - p.scratch.ultimoGranoT < 0.045 || deltaSeg === 0) return
  p.scratch.ultimoGranoT = ctx.currentTime
  // Un granito (~90 ms con fades) a la posición del dedo, tan rápido como se
  // arrastre; hacia atrás suena hacia adelante desde ahí (aproximación).
  p.scratch.grano?.stop()
  const src = ctx.createBufferSource()
  src.buffer = p.buffer
  src.playbackRate.value = Math.max(0.25, Math.min(3, Math.abs(deltaSeg) / dt))
  const g = ctx.createGain()
  const t = ctx.currentTime
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(1, t + 0.005)
  g.gain.setValueAtTime(1, t + 0.065)
  g.gain.linearRampToValueAtTime(0, t + 0.09)
  src.connect(g)
  g.connect(p.eqNodos.grave)
  src.onended = () => {
    src.disconnect()
    g.disconnect()
  }
  src.start(t, p.posSeg, 0.12)
  src.stop(t + 0.095)
  p.scratch.grano = src
}

export function terminarScratch(lado: LadoPlato): void {
  const p = platos[lado]
  if (!p.scratch.activo) return
  p.scratch.activo = false
  p.scratch.grano = null
  if (p.scratch.sonaba && p.cancion) arrancarSource(lado, p.posSeg)
}

// ─── Vúmetro ────────────────────────────────────────────────────────────────

/** RMS 0..1 de lo que suena en el plato (para el rAF de la vista). */
export function nivel(lado: LadoPlato): number {
  const p = platos[lado]
  if (!p.analyser || !p.datosVu || (p.estado !== 'sonando' && !p.scratch.activo)) return 0
  p.analyser.getByteTimeDomainData(p.datosVu)
  let suma = 0
  for (const v of p.datosVu) {
    const c = (v - 128) / 128
    suma += c * c
  }
  return Math.sqrt(suma / p.datosVu.length)
}

// ─── Carga y ciclo de vida ──────────────────────────────────────────────────

/** Decodifica las tomas de micrófono del proyecto (sello validado); fallos, mudos. */
export async function buffersDeClipsProyecto(ctx: AudioContext, p: ProyectoAudio): Promise<Map<number, AudioBuffer>> {
  const buffers = new Map<number, AudioBuffer>()
  for (const pista of p.pistas) {
    if (pista.tipo !== 'audio') continue
    for (const clip of pista.clips ?? []) {
      if (buffers.has(clip.grabacionId)) continue
      try {
        const fila = await leerGrabacionAudio(clip.grabacionId)
        if (!fila || fila.creadoEn !== clip.sello) continue
        buffers.set(clip.grabacionId, await ctx.decodeAudioData(await fila.blob.arrayBuffer()))
      } catch {
        // sin blob local (toma de otro dispositivo): el clip no suena, igual que en el editor
      }
    }
  }
  return buffers
}

/** Vacía el plato y lo deja en `cargando`; devuelve el token contra cargas cruzadas. */
function prepararCarga(p: Plato): number {
  const miCarga = ++contadorCarga
  pararSource(p)
  p.buffer = null
  p.cancion = null
  p.posSeg = 0
  p.cueSeg = 0
  p.estado = 'cargando'
  emitir()
  return miCarga
}

/** Pone el buffer listo en el plato (si la carga sigue vigente) → `pausado` en 0. */
function ponerBuffer(lado: LadoPlato, miCarga: number, buffer: AudioBuffer, titulo: string, bpm: number): boolean {
  if (miCarga !== contadorCarga) return false // eligieron otra canción (o liberaron) mientras tanto
  const ctx = contextoAudio()
  if (ctx) armarGrafo(ctx)
  const p = platos[lado]
  p.buffer = buffer
  p.cancion = { titulo, bpm, duracionSeg: buffer.duration, picos: calcularPicos(buffer, 0) }
  p.estado = 'pausado'
  emitir()
  return true
}

function cargaFallida(p: Plato, miCarga: number) {
  if (miCarga === contadorCarga) {
    p.estado = 'vacio'
    emitir()
  }
}

/** Render offline del proyecto → el plato queda en `pausado` al inicio. */
export async function cargarCancion(lado: LadoPlato, proyecto: ProyectoAudio, titulo: string): Promise<void> {
  const p = platos[lado]
  const miCarga = prepararCarga(p)
  try {
    const ctx = contextoAudio()
    if (!ctx) throw new Error('sin-audio')
    const clips = await buffersDeClipsProyecto(ctx, proyecto)
    const buffer = await renderizarBuffer(proyecto, clips)
    ponerBuffer(lado, miCarga, buffer, titulo, proyecto.bpm)
  } catch (e) {
    cargaFallida(p, miCarga)
    throw e
  }
}

/**
 * Canción desde un archivo de audio (biblioteca importada o preview): decodifica
 * y, sin `bpm` conocido, lo detecta. Devuelve la metadata (para guardar la fila
 * de un import nuevo) o null si la carga fue descartada por otra más reciente.
 */
export async function cargarArchivo(
  lado: LadoPlato,
  blob: Blob,
  titulo: string,
  bpm?: number,
): Promise<{ duracionSeg: number; bpm: number } | null> {
  const p = platos[lado]
  const miCarga = prepararCarga(p)
  try {
    const ctx = contextoAudio()
    if (!ctx) throw new Error('sin-audio')
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
    // Tope de cordura: una hora decodificada serían cientos de MB en el móvil.
    if (buffer.duration > 900) throw new Error('muy-larga')
    const bpmFinal = bpm ?? detectarBpm(buffer)
    if (!ponerBuffer(lado, miCarga, buffer, titulo, bpmFinal)) return null
    return { duracionSeg: buffer.duration, bpm: bpmFinal }
  } catch (e) {
    cargaFallida(p, miCarga)
    throw e
  }
}

export function quitarCancion(lado: LadoPlato): void {
  const p = platos[lado]
  contadorCarga++
  pararSource(p)
  p.scratch.activo = false
  p.scratch.grano = null
  p.buffer = null
  p.cancion = null
  p.posSeg = 0
  p.cueSeg = 0
  p.estado = 'vacio'
  emitir()
}

/** Suelta TODO (buffers, grafo) y vuelve a los valores de fábrica; al salir de la vista. */
export function liberar(): void {
  contadorCarga++
  for (const lado of ['a', 'b'] as const) {
    const p = platos[lado]
    pararSource(p)
    if (p.eqNodos) {
      for (const n of Object.values(p.eqNodos)) n.disconnect()
    }
    p.gainVol?.disconnect()
    p.analyser?.disconnect()
    p.gainCross?.disconnect()
    platos[lado] = platoNuevo()
  }
  maestro?.desconectar()
  maestro = null
  crossfade = 0.5
  emitir()
}

// Con la pestaña oculta los platos se pausan (como el DAW: nada suena en background).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return
  for (const lado of ['a', 'b'] as const) {
    terminarScratch(lado)
    pausar(lado)
  }
})
