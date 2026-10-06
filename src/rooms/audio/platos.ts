import { contextoAudio, desbloquearAudio } from '../../core/audio/motor'
import type { ProyectoAudio } from '../../core/data/db'
import { grabacionesAudioRepo, leerTomaDeClip } from '../../core/data/repository'
import { MAESTRO_DEFAULT, MAX_SEG_CLIP } from './constantes'
import { detectarBpm } from './detectorBpm'
import { crearBusMaestro, type BusMaestro } from './efectos'
import { renderizarBuffer, wavDesdeBuffer } from './exportarWav'
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
  /**
   * Segundo del primer tiempo, si se conoce (render de un proyecto: sus notas
   * arrancan a +0.05 s). Con él el auto-loop se alinea a la rejilla de tiempos;
   * sin él (audio importado) arranca justo donde está la aguja.
   */
  faseSeg?: number
}

/**
 * Bucle del plato en segundos del BUFFER (no de reloj: el pitch no lo mueve).
 * `fin: null` = IN marcado esperando el OUT. Inactivo conserva la región para
 * el «reloop».
 */
export interface LoopPlato {
  inicio: number
  fin: number | null
  activo: boolean
}

export interface SnapshotPlato {
  estado: EstadoPlato
  cancion: CancionPlato | null
  rate: number
  volumen: number
  eq: Record<BandaEq, number>
  cueSeg: number
  loop: LoopPlato | null
}

export interface SnapshotMezclador {
  a: SnapshotPlato
  b: SnapshotPlato
  /** 0 = todo A · 1 = todo B. */
  crossfade: number
  /** `performance.now()` del arranque de la grabación de la mezcla; null = sin grabar. */
  grabandoDesde: number | null
}

export const RATE_MIN = 0.5
export const RATE_MAX = 1.5
export const EQ_DB = 12
/** Una vuelta del disco = 1.8 s de audio (33⅓ RPM, como un vinilo real). */
export const SEG_POR_VUELTA = 1.8
/** Bucle más corto que se admite (al partirlo a la mitad o con IN/OUT pegados). */
export const LOOP_MIN_SEG = 0.05

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
  loop: LoopPlato | null
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
  loop: null,
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
/** Ganancia unitaria entre el maestro y el destino: de aquí cuelga la grabación de la mezcla. */
let salida: GainNode | null = null

interface GrabacionMezcla {
  desde: number
  rec: MediaRecorder
  destino: MediaStreamAudioDestinationNode
  tope: number
}
/** La grabación de la mezcla en curso (ver `grabarMezcla`). */
let grabacion: GrabacionMezcla | null = null
let contadorCarga = 0
/** La carga vigente de cada plato: otra en ESE plato (o `liberar`) la invalida; la del otro plato, no. */
const cargaDe = new WeakMap<Plato, number>()

// ─── Store para React (snapshot inmutable, se reconstruye al emitir) ────────

const snapshotPlato = (p: Plato): SnapshotPlato => ({
  estado: p.estado,
  cancion: p.cancion,
  rate: p.rate,
  volumen: p.volumen,
  eq: { ...p.eq },
  cueSeg: p.cueSeg,
  loop: p.loop && { ...p.loop },
})

const construirSnapshot = (): SnapshotMezclador => ({
  a: snapshotPlato(platos.a),
  b: snapshotPlato(platos.b),
  crossfade,
  grabandoDesde: grabacion?.desde ?? null,
})

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
/** Las 3 bandas del EQ encadenadas (grave → medio → agudo) con las ganancias dadas. */
function crearEq(ctx: BaseAudioContext, eq: Record<BandaEq, number>): Record<BandaEq, BiquadFilterNode> {
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
  grave.gain.value = eq.grave
  medio.gain.value = eq.medio
  agudo.gain.value = eq.agudo
  grave.connect(medio)
  medio.connect(agudo)
  return { grave, medio, agudo }
}

function armarGrafo(ctx: AudioContext) {
  if (!maestro) {
    salida = ctx.createGain()
    salida.connect(ctx.destination)
    maestro = crearBusMaestro(ctx, salida, MAESTRO_DEFAULT)
  }
  for (const lado of ['a', 'b'] as const) {
    const p = platos[lado]
    if (p.eqNodos) continue
    const { grave, medio, agudo } = crearEq(ctx, p.eq)
    const gainVol = ctx.createGain()
    gainVol.gain.value = p.volumen
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    const gainCross = ctx.createGain()
    gainCross.gain.value = ganCross(lado)
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

const loopCerrado = (l: LoopPlato | null): l is LoopPlato & { fin: number } => !!l?.activo && l.fin != null

/** Una posición más allá del OUT del bucle activo, plegada dentro de él (como lo hace el source). */
function plegar(l: LoopPlato | null, pos: number): number {
  if (!loopCerrado(l) || pos < l.fin) return pos
  return l.inicio + ((pos - l.inicio) % (l.fin - l.inicio))
}

export function posicionSeg(lado: LadoPlato): number {
  const p = platos[lado]
  const ctx = contextoAudio()
  const dur = p.cancion?.duracionSeg ?? 0
  // El source arranca siempre ANTES del OUT (arrancarSource pliega): lo que
  // pase del OUT es una vuelta del bucle nativo del nodo.
  if (p.source && ctx) return Math.min(dur, plegar(p.loop, p.posSeg + (ctx.currentTime - p.t0) * p.rate))
  return Math.min(dur, p.posSeg)
}

/** Copia el bucle del plato al nodo (loopStart/loopEnd en segundos del buffer). */
function cablearLoop(p: Plato, src: AudioBufferSourceNode) {
  if (loopCerrado(p.loop)) {
    src.loopStart = p.loop.inicio
    src.loopEnd = p.loop.fin
    src.loop = true
  } else {
    src.loop = false
  }
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
  // Con bucle activo, un arranque pasado el OUT entra plegado dentro del bucle.
  desdeSeg = plegar(p.loop, desdeSeg)
  cablearLoop(p, src)
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
    buscar(lado, p.cueSeg)
  } else if (p.estado === 'pausado') {
    p.cueSeg = p.posSeg
    emitir()
  }
}

export function buscar(lado: LadoPlato, seg: number): void {
  const p = platos[lado]
  if (!p.cancion) return
  const destino = Math.max(0, Math.min(p.cancion.duracionSeg, seg))
  // Saltar fuera del bucle activo lo suelta (la región queda para el reloop).
  if (loopCerrado(p.loop) && (destino < p.loop.inicio || destino >= p.loop.fin)) {
    p.loop = { ...p.loop, activo: false }
    if (p.source) cablearLoop(p, p.source)
    emitir()
  }
  if (p.estado === 'sonando') arrancarSource(lado, destino)
  else p.posSeg = destino
}

// ─── Bucles (auto por tiempos, IN/OUT manual, mitad/doble, guardar como clip) ─

/**
 * Cambia el bucle del plato sin que la aguja salte: consolida la posición con
 * el bucle VIEJO y re-ancla; si la aguja quedó pasado el nuevo OUT, re-arranca
 * el source plegado dentro (un `loopEnd` por detrás del cabezal no es fiable).
 */
function cambiarLoop(lado: LadoPlato, nuevo: LoopPlato | null) {
  const p = platos[lado]
  const ctx = contextoAudio()
  const pos = posicionSeg(lado)
  p.loop = nuevo
  if (p.source && ctx) {
    if (loopCerrado(nuevo) && pos >= nuevo.fin) arrancarSource(lado, pos)
    else {
      p.posSeg = pos
      p.t0 = ctx.currentTime
      cablearLoop(p, p.source)
    }
  } else {
    p.posSeg = plegar(nuevo, pos)
  }
  emitir()
}

/** Duración de un tiempo (negra) en segundos del buffer. */
const segPorTiempo = (c: CancionPlato) => 60 / c.bpm

/**
 * Auto-loop de `tiempos` tiempos desde el tiempo donde está la aguja (alineado
 * a la rejilla si se conoce la fase). Pulsar el tamaño que ya está activo lo suelta.
 */
export function autoLoop(lado: LadoPlato, tiempos: number): void {
  const p = platos[lado]
  const c = p.cancion
  if (!c) return
  const largo = tiempos * segPorTiempo(c)
  if (loopCerrado(p.loop) && Math.abs(p.loop.fin - p.loop.inicio - largo) < 1e-3) return salirLoop(lado)
  const pos = posicionSeg(lado)
  let inicio = pos
  if (c.faseSeg != null) {
    const rejilla = Math.min(1, tiempos) * segPorTiempo(c)
    inicio = c.faseSeg + Math.floor((pos - c.faseSeg + 1e-6) / rejilla) * rejilla
    if (inicio < 0) inicio += rejilla // aguja antes del primer tiempo: el bucle arranca en él
  }
  const fin = Math.min(c.duracionSeg, inicio + largo)
  if (fin - inicio < LOOP_MIN_SEG) return
  cambiarLoop(lado, { inicio, fin, activo: true })
}

/** IN: marca el arranque del bucle manual donde está la aguja (suelta el que hubiera). */
export function loopIn(lado: LadoPlato): void {
  if (!platos[lado].cancion) return
  cambiarLoop(lado, { inicio: posicionSeg(lado), fin: null, activo: false })
}

/** OUT: cierra el bucle manual en la aguja y vuelve al IN (como un DJ). */
export function loopOut(lado: LadoPlato): void {
  const p = platos[lado]
  const pos = posicionSeg(lado)
  if (!p.cancion || !p.loop || pos - p.loop.inicio < LOOP_MIN_SEG) return
  cambiarLoop(lado, { inicio: p.loop.inicio, fin: pos, activo: true })
}

/** Mitad (f = 0.5) o doble (f = 2) del bucle, anclado en su IN. */
export function escalarLoop(lado: LadoPlato, f: number): void {
  const p = platos[lado]
  const l = p.loop
  if (!p.cancion || !l || l.fin == null) return
  const fin = Math.min(p.cancion.duracionSeg, l.inicio + (l.fin - l.inicio) * f)
  if (fin - l.inicio < LOOP_MIN_SEG || fin === l.fin) return
  cambiarLoop(lado, { ...l, fin })
}

/**
 * Ajuste a mano de un extremo del bucle (asas de la onda o los ◀ ▶ finos): lo
 * lleva a `seg` respetando el largo mínimo y la duración de la canción.
 */
export function ajustarLoop(lado: LadoPlato, extremo: 'inicio' | 'fin', seg: number): void {
  const p = platos[lado]
  const c = p.cancion
  const l = p.loop
  if (!c || !l) return
  if (extremo === 'inicio') {
    const tope = l.fin == null ? c.duracionSeg : l.fin - LOOP_MIN_SEG
    const inicio = Math.min(Math.max(0, seg), tope)
    if (Math.abs(inicio - l.inicio) > 1e-4) cambiarLoop(lado, { ...l, inicio })
    return
  }
  if (l.fin == null) return
  const fin = Math.min(Math.max(l.inicio + LOOP_MIN_SEG, seg), c.duracionSeg)
  if (Math.abs(fin - l.fin) > 1e-4) cambiarLoop(lado, { ...l, fin })
}

/** Sale del bucle (la canción sigue de largo); la región se queda para el reloop. */
export function salirLoop(lado: LadoPlato): void {
  const l = platos[lado].loop
  if (l?.activo) cambiarLoop(lado, { ...l, activo: false })
}

/** Re-entra al último bucle cerrado; si la aguja está fuera, salta a su IN. */
export function reloop(lado: LadoPlato): void {
  const p = platos[lado]
  const l = p.loop
  if (!p.cancion || !l || l.fin == null || l.activo) return
  const pos = posicionSeg(lado)
  const dentro = pos >= l.inicio && pos < l.fin
  cambiarLoop(lado, { ...l, activo: true })
  if (!dentro) buscar(lado, l.inicio)
}

/**
 * Renderiza EXACTAMENTE el tramo del bucle tal como suena en el plato (pitch y
 * EQ; sin volumen ni crossfader) y lo guarda en Grabaciones como WAV: un loop
 * sin cortes listo para las pistas de audio. Devuelve el id de la fila.
 */
export async function guardarLoopComoClip(lado: LadoPlato, nombre: string): Promise<number | null> {
  const p = platos[lado]
  const l = p.loop
  if (!p.buffer || !l || l.fin == null) return null
  const largo = l.fin - l.inicio
  const durSalida = largo / p.rate
  if (durSalida > MAX_SEG_CLIP) return null
  const sr = p.buffer.sampleRate
  const off = new OfflineAudioContext(Math.min(2, p.buffer.numberOfChannels), Math.max(1, Math.round(durSalida * sr)), sr)
  const src = off.createBufferSource()
  src.buffer = p.buffer
  src.playbackRate.value = p.rate
  const eq = crearEq(off, p.eq)
  src.connect(eq.grave)
  eq.agudo.connect(off.destination)
  src.start(0, l.inicio, largo)
  const buffer = await off.startRendering()
  return grabacionesAudioRepo.add({
    nombre,
    blob: wavDesdeBuffer(buffer),
    duracionSeg: buffer.duration,
    picos: calcularPicos(buffer, 0),
    creadoEn: new Date().toISOString(),
  })
}

// ─── Grabar la mezcla (salida maestra → Grabaciones) ────────────────────────

/**
 * Graba lo que suena (ambos platos tras EQ, volumen, crossfader y limitador)
 * con MediaRecorder sobre un tap de la salida: opus pesa ~1/20 de un WAV y la
 * fila puede subir a la nube. Resuelve al terminar —por el botón, el tope
 * `MAX_SEG_CLIP`, la pestaña oculta o `liberar`— con la fila guardada (o null
 * si salió vacía).
 */
export function grabarMezcla(nombre: string): Promise<{ id: number; duracionSeg: number } | null> {
  if (grabacion) return Promise.resolve(null)
  desbloquearAudio()
  const ctx = contextoAudio()
  if (!ctx || typeof MediaRecorder === 'undefined') return Promise.resolve(null)
  armarGrafo(ctx)
  if (!salida) return Promise.resolve(null)
  const destino = ctx.createMediaStreamDestination()
  salida.connect(destino)
  const rec = new MediaRecorder(destino.stream)
  const trozos: Blob[] = []
  rec.ondataavailable = (ev) => {
    if (ev.data.size > 0) trozos.push(ev.data)
  }
  const procesar = async () => {
    const blob = new Blob(trozos, { type: rec.mimeType || 'audio/webm' })
    if (blob.size === 0) return null
    // Duración real por decode: los webm de MediaRecorder la traen mal.
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
    if (buffer.duration < 0.2) return null
    const id = await grabacionesAudioRepo.add({
      nombre,
      blob,
      duracionSeg: buffer.duration,
      picos: calcularPicos(buffer, 0),
      creadoEn: new Date().toISOString(),
    })
    return { id, duracionSeg: buffer.duration }
  }
  const fin = new Promise<{ id: number; duracionSeg: number } | null>((resolver) => {
    rec.onstop = () => {
      destino.stream.getTracks().forEach((tr) => tr.stop())
      procesar()
        .catch(() => null)
        .then(resolver)
    }
  })
  grabacion = {
    desde: performance.now(),
    rec,
    destino,
    tope: window.setTimeout(pararGrabacionMezcla, MAX_SEG_CLIP * 1000),
  }
  rec.start()
  emitir()
  return fin
}

export function pararGrabacionMezcla(): void {
  const g = grabacion
  if (!g) return
  grabacion = null
  window.clearTimeout(g.tope)
  if (g.rec.state !== 'inactive') g.rec.stop()
  try {
    salida?.disconnect(g.destino)
  } catch {
    // el grafo ya se había soltado
  }
  emitir()
}

// ─── Ajustes (preview imperativo + commit que emite, patrón Knob) ───────────

function aplicarRate(lado: LadoPlato, r: number) {
  const p = platos[lado]
  const nuevo = Math.max(RATE_MIN, Math.min(RATE_MAX, r))
  if (nuevo === p.rate) return
  const ctx = contextoAudio()
  if (p.source && ctx) {
    // Consolidar con el rate viejo y re-anclar ANTES de tocar el nodo (si no, la aguja salta).
    p.posSeg = posicionSeg(lado) // ya plegada dentro del bucle, si lo hay
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
        const fila = await leerTomaDeClip(clip)
        if (!fila?.blob) continue
        buffers.set(clip.grabacionId, await ctx.decodeAudioData(await fila.blob.arrayBuffer()))
      } catch {
        // sin blob (toma que no está ni aquí ni en la nube): el clip no suena, igual que en el editor
      }
    }
  }
  return buffers
}

/** Vacía el plato y lo deja en `cargando`; devuelve el token contra cargas cruzadas. */
function prepararCarga(p: Plato): number {
  const miCarga = ++contadorCarga
  cargaDe.set(p, miCarga)
  pararSource(p)
  p.buffer = null
  p.cancion = null
  p.posSeg = 0
  p.cueSeg = 0
  p.loop = null
  p.estado = 'cargando'
  emitir()
  return miCarga
}

/** Pone el buffer listo en el plato (si la carga sigue vigente) → `pausado` en 0. */
function ponerBuffer(
  lado: LadoPlato,
  miCarga: number,
  buffer: AudioBuffer,
  titulo: string,
  bpm: number,
  faseSeg?: number,
): boolean {
  if (cargaDe.get(platos[lado]) !== miCarga) return false // eligieron otra canción en este plato (o liberaron) mientras tanto
  const ctx = contextoAudio()
  if (ctx) armarGrafo(ctx)
  const p = platos[lado]
  p.buffer = buffer
  p.cancion = { titulo, bpm, duracionSeg: buffer.duration, picos: calcularPicos(buffer, 0), faseSeg }
  p.estado = 'pausado'
  emitir()
  return true
}

function cargaFallida(p: Plato, miCarga: number) {
  if (cargaDe.get(p) === miCarga) {
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
    ponerBuffer(lado, miCarga, buffer, titulo, proyecto.bpm, 0.05) // renderizarBuffer arranca las notas a +0.05 s
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
  cargaDe.delete(p)
  pararSource(p)
  p.scratch.activo = false
  p.scratch.grano = null
  p.buffer = null
  p.cancion = null
  p.posSeg = 0
  p.cueSeg = 0
  p.loop = null
  p.estado = 'vacio'
  emitir()
}

/** Suelta TODO (buffers, grafo) y vuelve a los valores de fábrica; al salir de la vista. */
export function liberar(): void {
  pararGrabacionMezcla() // lo grabado hasta aquí se guarda igual
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
  salida?.disconnect()
  salida = null
  crossfade = 0.5
  emitir()
}

// Con la pestaña oculta los platos se pausan (como el DAW: nada suena en background).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return
  pararGrabacionMezcla()
  for (const lado of ['a', 'b'] as const) {
    terminarScratch(lado)
    pausar(lado)
  }
})
