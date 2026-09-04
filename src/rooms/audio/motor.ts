import { contextoAudio, desbloquearAudio } from '../../core/audio/motor'
import type { EfectosPista, InstrumentoAudio, NotaAudio, ProyectoAudio, SintePista } from '../../core/data/db'
import { leerGrabacionAudio } from '../../core/data/repository'
import { FX_DEFAULT, MAESTRO_DEFAULT, MAX_NOTAS_POR_PASO, MAX_VOCES_VIVAS, PASOS_POR_COMPAS, segPorPaso } from './constantes'
import { crearBusMaestro, crearCadenaPista, crearRetornos, type BusMaestro, type CadenaPista, type Retornos } from './efectos'
import { iniciarVoz, tocarNota, type VozViva } from './instrumentos'

/**
 * Transporte y scheduler del Studio de audio (singleton de módulo, sin React:
 * solo hay un editor abierto a la vez). Patrón «tale of two clocks» calcado de
 * `core/audio/musicaGenerada.ts`: un setInterval grueso agenda con la precisión
 * de `ctx.currentTime`.
 *
 * OJO: el bus del proyecto va DIRECTO a `ctx.destination`, no al `gainMaestro()`
 * del core — ese gain lo gobierna el volumen de la música AMBIENTAL, y un
 * usuario con la música de fondo en 0 debe oír igual su propio proyecto.
 */

const TICK_MS = 50
const LOOKAHEAD_S = 0.15

export type EstadoTransporte = 'parado' | 'sonando' | 'cuenta' | 'grabando'

export interface OpcionesPlay {
  /** Paso inicial (default 0). */
  desde?: number
  /** Bucle en pasos; null = sin bucle. */
  loop?: { inicio: number; fin: number } | null
  metronomo?: boolean
  /** Pre-roll de grabación: un compás de metrónomo (pasos [-16, 0)). */
  grabar?: boolean
}

/** Ancla de relojes para convertir timestamps MIDI (performance) a pasos. */
export interface AnclaGrabacion {
  perfRef: number
  ctxRef: number
  anclaPaso: number
  anclaT: number
  spb: number
}

let proyecto: ProyectoAudio | null = null
let indice = new Map<string, Map<number, NotaAudio[]>>()
let busProyecto: GainNode | null = null
let maestro: BusMaestro | null = null
let retornos: Retornos | null = null
const cadenas = new Map<string, CadenaPista>()
const gainsPista = new Map<string, GainNode>()
// Previews de los knobs (mientras se arrastra, sin pasar por React); se limpian
// en cada `fijarProyecto` porque para entonces el commit ya vive en la pista.
const sintePreview = new Map<string, SintePista>()
// Último tono agendado por pista (origen del glide); por camino: vivo vs roll.
const ultimoTonoVivo = new Map<string, number>()
const ultimoTonoRoll = new Map<string, { paso: number; tono: number }>()
// Clips de micrófono: buffers decodificados por grabacionId (los llena
// `prepararClips`, los poda `fijarProyecto` y los vacía `liberar`).
const buffersClips = new Map<number, AudioBuffer>()
const clipsFallidos = new Set<number>() // sin blob o sello ajeno: no reintentar
let fuentesClip: AudioBufferSourceNode[] = []
// Factor del modo práctica de Aprender (1 = tiempo real). El DAW no lo toca.
let velocidad = 1
// Pistas cuya partitura NO se agenda (modo Ritmo: las tocas TÚ). No se
// silencian: su gain queda abierto para que tu entrada en vivo sí suene.
let pistasOmitidas = new Set<string>()
let intervalo: number | null = null
let estadoActual: EstadoTransporte = 'parado'
let proximaT = 0
let paso = 0
let loopActivo: { inicio: number; fin: number } | null = null
let conMetronomo = false
let finTimer = 0
// Ancla paso↔tiempo (se re-fija al arrancar, al re-sincronizar y en cada vuelta del loop).
let anclaPaso = 0
let anclaT = 0
let anclaPerf = 0
let alTerminar: (() => void) | null = null

const oyentes = new Set<() => void>()
const setEstado = (e: EstadoTransporte) => {
  if (estadoActual === e) return
  estadoActual = e
  for (const fn of oyentes) fn()
}

/** Suscripción a los cambios de estado del transporte (useSyncExternalStore). */
export const transporteStore = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
  getSnapshot: (): EstadoTransporte => estadoActual,
}

function reconstruirIndice() {
  indice = new Map()
  if (!proyecto) return
  for (const pista of proyecto.pistas) {
    const porPaso = new Map<number, NotaAudio[]>()
    for (const nota of pista.notas) {
      const clave = Math.floor(nota[0])
      const lista = porPaso.get(clave)
      if (lista) lista.push(nota)
      else porPaso.set(clave, [nota])
    }
    indice.set(pista.pistaId, porPaso)
  }
}

/** ¿Esta pista suena? (si alguna tiene solo, solo suenan las solo). */
function sonable(pista: { silenciada?: boolean; solo?: boolean }): boolean {
  if (!proyecto) return false
  const haySolo = proyecto.pistas.some((p) => p.solo)
  return haySolo ? !!pista.solo : !pista.silenciada
}

/** Arma (o actualiza) maestro + retornos + cadena de efectos y gain por pista; idempotente. */
function armarCadena(ctx: AudioContext) {
  if (!maestro) {
    maestro = crearBusMaestro(ctx, ctx.destination, proyecto?.volumenMaestro ?? MAESTRO_DEFAULT)
    retornos = crearRetornos(ctx, maestro.entrada, proyecto?.bpm ?? 100)
    busProyecto = maestro.entrada
  }
  if (!proyecto || !retornos) return
  maestro.fijarVolumen(proyecto.volumenMaestro ?? MAESTRO_DEFAULT)
  retornos.fijarBpm(proyecto.bpm)
  const vivas = new Set(proyecto.pistas.map((p) => p.pistaId))
  for (const [id, g] of gainsPista) {
    if (!vivas.has(id)) {
      g.disconnect()
      gainsPista.delete(id)
      cadenas.get(id)?.desconectar()
      cadenas.delete(id)
    }
  }
  for (const pista of proyecto.pistas) {
    let g = gainsPista.get(pista.pistaId)
    if (!g) {
      g = ctx.createGain()
      g.gain.value = pista.volumen
      const cadena = crearCadenaPista(ctx, maestro.entrada, retornos, pista.efectos ?? FX_DEFAULT)
      g.connect(cadena.entrada)
      cadenas.set(pista.pistaId, cadena)
      gainsPista.set(pista.pistaId, g)
    } else {
      cadenas.get(pista.pistaId)?.fijar(pista.efectos ?? FX_DEFAULT)
    }
    const destino = sonable(pista) ? pista.volumen : 0
    g.gain.setTargetAtTime(destino, ctx.currentTime, 0.03)
  }
}

/** Referencia viva del proyecto: recalcula índice y mezcla en caliente. */
export function fijarProyecto(p: ProyectoAudio): void {
  proyecto = p
  sintePreview.clear()
  reconstruirIndice()
  podarClips()
  const ctx = contextoAudio()
  if (ctx) armarCadena(ctx)
}

// ─── Clips de micrófono (pistas `tipo: 'audio'`) ───────────────────────────

/** Saca del caché los buffers que ya no referencia ningún clip del proyecto. */
function podarClips() {
  const vivos = new Set<number>()
  for (const pista of proyecto?.pistas ?? []) for (const clip of pista.clips ?? []) vivos.add(clip.grabacionId)
  for (const id of [...buffersClips.keys()]) if (!vivos.has(id)) buffersClips.delete(id)
  for (const id of [...clipsFallidos]) if (!vivos.has(id)) clipsFallidos.delete(id)
}

/** Buffer recién decodificado por el grabador (evita decodificarlo dos veces). */
export function registrarBufferClip(grabacionId: number, buffer: AudioBuffer): void {
  buffersClips.set(grabacionId, buffer)
  clipsFallidos.delete(grabacionId)
}

/** Los buffers ya decodificados (el export WAV los agenda en su OfflineAudioContext). */
export function buffersDeClips(): ReadonlyMap<number, AudioBuffer> {
  return buffersClips
}

/**
 * Decodifica los clips del proyecto que falten en el caché. El `sello` detecta
 * un `grabacionId` de OTRO dispositivo (la tabla es local y el id autoincremental
 * puede chocar): ese clip queda mudo y la UI lo avisa.
 */
export async function prepararClips(): Promise<void> {
  const ctx = contextoAudio()
  const p = proyecto
  if (!ctx || !p) return
  for (const pista of p.pistas) {
    for (const clip of pista.clips ?? []) {
      if (buffersClips.has(clip.grabacionId) || clipsFallidos.has(clip.grabacionId)) continue
      try {
        const fila = await leerGrabacionAudio(clip.grabacionId)
        if (!fila || fila.creadoEn !== clip.sello) {
          clipsFallidos.add(clip.grabacionId)
          continue
        }
        buffersClips.set(clip.grabacionId, await ctx.decodeAudioData(await fila.blob.arrayBuffer()))
      } catch {
        clipsFallidos.add(clip.grabacionId)
      }
    }
  }
}

/**
 * Agenda las fuentes de los clips desde `desdePaso` (que puede ser negativo en
 * el pre-roll de grabación, o caer a MITAD de un clip: entra con offset). Con
 * bucle solo hasta su fin; cada vuelta re-agenda.
 */
function agendarClips(ctx: AudioContext, desdePaso: number, tDe: number) {
  if (!proyecto) return
  const spb = spbEfectivo()
  for (const pista of proyecto.pistas) {
    if (pista.tipo !== 'audio' || !sonable(pista)) continue
    const g = gainsPista.get(pista.pistaId)
    if (!g) continue
    for (const clip of pista.clips ?? []) {
      const buffer = buffersClips.get(clip.grabacionId)
      if (!buffer) continue
      if (clip.inicio + clip.duracionSeg / spb <= desdePaso) continue
      if (loopActivo && clip.inicio >= loopActivo.fin) continue
      const desfaseSeg = Math.max(0, desdePaso - clip.inicio) * spb
      let dur = clip.duracionSeg - desfaseSeg
      if (loopActivo) dur = Math.min(dur, (loopActivo.fin - Math.max(clip.inicio, desdePaso)) * spb)
      if (dur <= 0.01) continue
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(g)
      src.onended = () => {
        const i = fuentesClip.indexOf(src)
        if (i >= 0) fuentesClip.splice(i, 1)
        src.disconnect()
      }
      src.start(tDe + Math.max(0, clip.inicio - desdePaso) * spb, clip.recorteSeg + desfaseSeg, dur)
      fuentesClip.push(src)
    }
  }
}

function pararClips() {
  for (const src of fuentesClip) {
    src.onended = null
    src.stop()
    src.disconnect()
  }
  fuentesClip = []
}

/** Sinte efectivo de una pista: el preview del knob (si se arrastra) o lo guardado. */
function sinteDe(pistaId: string): SintePista | undefined {
  return sintePreview.get(pistaId) ?? proyecto?.pistas.find((p) => p.pistaId === pistaId)?.sinte
}

// ─── Preview de knobs (imperativo: girar no debe re-renderizar el editor) ──

export function ajustarFxEnVivo(pistaId: string, fx: EfectosPista): void {
  cadenas.get(pistaId)?.fijar(fx)
}

export function ajustarSinteEnVivo(pistaId: string, sinte: SintePista): void {
  sintePreview.set(pistaId, sinte)
}

export function ajustarMaestroEnVivo(v: number): void {
  maestro?.fijarVolumen(v)
}

function click(ctx: AudioContext, t: number, acento: boolean) {
  if (!busProyecto) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = acento ? 1800 : 1200
  gain.gain.setValueAtTime(0.2, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015)
  osc.connect(gain)
  gain.connect(busProyecto)
  osc.start(t)
  osc.stop(t + 0.03)
}

/**
 * Segundos por paso EFECTIVOS: el BPM del proyecto escalado por la velocidad de
 * práctica. La previa del metrónomo y el arpegiador van a BPM real a propósito.
 */
function spbEfectivo(): number {
  return segPorPaso(proyecto?.bpm ?? 100) / velocidad
}

/** Pistas que el scheduler salta (la práctica las deja en manos del usuario). */
export function fijarPistasOmitidas(ids: ReadonlySet<string>): void {
  pistasOmitidas = new Set(ids)
}

/** Velocidad de práctica (0.25..2). Sonando, re-ancla para que `posicion()` no salte. */
export function fijarVelocidad(f: number): void {
  const nueva = Math.max(0.25, Math.min(2, f))
  if (nueva === velocidad) return
  const ctx = contextoAudio()
  if (ctx && estadoActual !== 'parado') {
    anclaPaso = posicion() // con la velocidad vieja; lo ya agendado (~150 ms) suena como estaba
    anclaT = ctx.currentTime
    anclaPerf = performance.now()
  }
  velocidad = nueva
}

function tick() {
  const ctx = contextoAudio()
  if (!ctx || !proyecto || estadoActual === 'parado') return
  const spb = spbEfectivo()
  // Tras una pausa larga (pestaña oculta), re-sincroniza en vez de "alcanzar".
  if (proximaT < ctx.currentTime - 0.5) {
    proximaT = ctx.currentTime + 0.05
    anclaPaso = paso
    anclaT = proximaT
  }
  const totalPasos = proyecto.compases * PASOS_POR_COMPAS
  while (proximaT < ctx.currentTime + LOOKAHEAD_S) {
    if (paso >= 0 && estadoActual === 'cuenta') setEstado('grabando')
    if (loopActivo && paso >= loopActivo.fin) {
      paso = loopActivo.inicio
      anclaPaso = paso
      anclaT = proximaT
      agendarClips(ctx, paso, proximaT) // cada vuelta del bucle re-agenda los clips
    }
    if (!loopActivo && paso >= totalPasos) {
      // Deja sonar lo agendado y para al llegar al final real. Programado UNA
      // sola vez: reprogramarlo en cada tick (50 ms) con un delay mayor lo
      // cancelaría eternamente y el transporte pasaría de largo.
      if (finTimer === 0) {
        finTimer = window.setTimeout(
          () => {
            finTimer = 0
            detener()
            alTerminar?.()
          },
          Math.max(0, (proximaT - ctx.currentTime) * 1000) + 60,
        )
      }
      return
    }
    const cadaPasos = Math.max(1, Math.round(PASOS_POR_COMPAS / (proyecto.pulsos ?? 4)))
    if (conMetronomo && ((paso % cadaPasos) + cadaPasos) % cadaPasos === 0) {
      click(ctx, proximaT, ((paso % PASOS_POR_COMPAS) + PASOS_POR_COMPAS) % PASOS_POR_COMPAS === 0)
    }
    if (paso >= 0) {
      for (const pista of proyecto.pistas) {
        if (!sonable(pista) || pistasOmitidas.has(pista.pistaId)) continue
        const g = gainsPista.get(pista.pistaId)
        const notas = indice.get(pista.pistaId)?.get(paso)
        if (!g || !notas) continue
        const sinte = sinteDe(pista.pistaId)
        const swingSeg = (((proyecto.swing ?? 0) / 100) * spb)
        let n = 0
        for (const nota of notas) {
          if (++n > MAX_NOTAS_POR_PASO) break
          // Swing: las semicorcheas débiles (pasos impares) se retrasan un %.
          const t = proximaT + (nota[0] - paso) * spb + (Math.floor(nota[0]) % 2 === 1 ? swingSeg : 0)
          const previo = ultimoTonoRoll.get(pista.pistaId)
          // El glide solo parte de una nota anterior (no entre las voces de un acorde).
          const desdeTono = previo && previo.paso < nota[0] ? previo.tono : undefined
          tocarNota(ctx, g, pista.instrumento, t, nota[2], Math.max(0.06, nota[1] * spb), nota[3] / 127, {
            sinte,
            desdeTono,
          })
          ultimoTonoRoll.set(pista.pistaId, { paso: nota[0], tono: nota[2] })
        }
      }
    }
    proximaT += spb
    paso++
  }
}

/** Prende/apaga el metrónomo EN CALIENTE (el chip debe surtir efecto a media reproducción). */
export function fijarMetronomo(v: boolean): void {
  conMetronomo = v
}

// ─── Previa del metrónomo: escuchar el ritmo sin reproducir las pistas ─────
let previaTimer: number | null = null
let previaProximaT = 0
let previaPaso = 0

/** Suscripción al estado de la previa (comparte oyentes con el transporte). */
export const previaStore = {
  subscribe: transporteStore.subscribe,
  getSnapshot: (): boolean => previaTimer != null,
}

function tickPrevia() {
  const ctx = contextoAudio()
  if (!ctx || !proyecto) return
  const spb = segPorPaso(proyecto.bpm)
  const cadaPasos = Math.max(1, Math.round(PASOS_POR_COMPAS / (proyecto.pulsos ?? 4)))
  if (previaProximaT < ctx.currentTime - 0.5) previaProximaT = ctx.currentTime + 0.05
  while (previaProximaT < ctx.currentTime + LOOKAHEAD_S) {
    if (previaPaso % cadaPasos === 0) click(ctx, previaProximaT, previaPaso % PASOS_POR_COMPAS === 0)
    previaProximaT += spb
    previaPaso++
  }
}

export function alternarPreviaMetronomo(): void {
  if (previaTimer != null) return pararPrevia()
  const ctx = contextoAudio()
  if (!ctx || !proyecto) return
  desbloquearAudio()
  armarCadena(ctx)
  previaPaso = 0
  previaProximaT = ctx.currentTime + 0.05
  previaTimer = window.setInterval(tickPrevia, TICK_MS)
  tickPrevia()
  for (const fn of oyentes) fn()
}

function pararPrevia(): void {
  if (previaTimer == null) return
  window.clearInterval(previaTimer)
  previaTimer = null
  for (const fn of oyentes) fn()
}

export function reproducir(opts: OpcionesPlay = {}): void {
  const ctx = contextoAudio()
  if (!ctx || !proyecto) return
  desbloquearAudio()
  detener()
  armarCadena(ctx)
  ultimoTonoRoll.clear()
  loopActivo = opts.loop ?? null
  conMetronomo = !!opts.metronomo || !!opts.grabar
  paso = opts.grabar ? -PASOS_POR_COMPAS : Math.max(0, Math.floor(opts.desde ?? 0))
  proximaT = ctx.currentTime + 0.08
  anclaPaso = paso
  anclaT = proximaT
  anclaPerf = performance.now() + (proximaT - ctx.currentTime) * 1000
  agendarClips(ctx, paso, proximaT)
  setEstado(opts.grabar ? 'cuenta' : 'sonando')
  intervalo = window.setInterval(tick, TICK_MS)
  tick()
}

export function detener(): void {
  pararPrevia()
  pararClips()
  if (intervalo != null) {
    window.clearInterval(intervalo)
    intervalo = null
  }
  window.clearTimeout(finTimer)
  finTimer = 0
  setEstado('parado')
}

export function estado(): EstadoTransporte {
  return estadoActual
}

/** Para y devuelve el paso donde iba (para reanudar desde ahí). */
export function pausar(): number {
  const p = Math.max(0, Math.floor(posicion()))
  detener()
  return p
}

/** Paso actual (float) para el playhead; la UI lo lee con rAF, nunca con setState. */
export function posicion(): number {
  const ctx = contextoAudio()
  if (!ctx || !proyecto || estadoActual === 'parado') return 0
  return anclaPaso + (ctx.currentTime - anclaT) / spbEfectivo()
}

/** Ancla de relojes para la grabación (válida tras `reproducir`). */
export function anclaGrabacion(): AnclaGrabacion | null {
  if (!proyecto || estadoActual === 'parado') return null
  return { perfRef: anclaPerf, ctxRef: anclaT, anclaPaso, anclaT, spb: spbEfectivo() }
}

export function alFin(fn: (() => void) | null): void {
  alTerminar = fn
}

// ─── Tocar en vivo (teclado en pantalla y MIDI) ────────────────────────────
const vocesVivas: { voz: VozViva; tono: number }[] = []

/** Suena YA por la cadena de la pista (robo de voz al superar el tope). */
export function tocarEnVivo(pistaId: string, instr: InstrumentoAudio, tono: number, vel: number): VozViva | null {
  const ctx = contextoAudio()
  if (!ctx) return null
  desbloquearAudio()
  armarCadena(ctx)
  const g = gainsPista.get(pistaId)
  if (!g) return null
  if (vocesVivas.length >= MAX_VOCES_VIVAS) vocesVivas.shift()?.voz.soltar()
  const opts = { sinte: sinteDe(pistaId), desdeTono: ultimoTonoVivo.get(pistaId) }
  ultimoTonoVivo.set(pistaId, tono)
  const voz = iniciarVoz(ctx, g, instr, tono, Math.max(0.1, Math.min(1, vel / 127)), opts)
  const viva = {
    voz: {
      soltar: () => {
        voz.soltar()
        const i = vocesVivas.findIndex((v) => v.voz === viva.voz)
        if (i >= 0) vocesVivas.splice(i, 1)
      },
    },
    tono,
  }
  vocesVivas.push(viva)
  return viva.voz
}

/**
 * Nota agendada a futuro por la cadena de la pista (el arpegiador la necesita:
 * `iniciarVoz` arranca en `currentTime` y no admite `t`).
 */
export function tocarNotaEnPista(
  pistaId: string,
  instr: InstrumentoAudio,
  tono: number,
  vel: number,
  tAudio: number,
  durSeg: number,
): void {
  const ctx = contextoAudio()
  if (!ctx) return
  armarCadena(ctx)
  const g = gainsPista.get(pistaId)
  if (!g) return
  const opts = { sinte: sinteDe(pistaId), desdeTono: ultimoTonoVivo.get(pistaId) }
  ultimoTonoVivo.set(pistaId, tono)
  tocarNota(ctx, g, instr, tAudio, tono, durSeg, Math.max(0.1, Math.min(1, vel / 127)), opts)
}

/** Suelta todo y desmonta la cadena (al cerrar el editor). */
export function liberar(): void {
  detener()
  alTerminar = null
  for (const v of [...vocesVivas]) v.voz.soltar()
  vocesVivas.length = 0
  for (const g of gainsPista.values()) g.disconnect()
  gainsPista.clear()
  for (const c of cadenas.values()) c.desconectar()
  cadenas.clear()
  retornos?.desconectar()
  retornos = null
  maestro?.desconectar()
  maestro = null
  busProyecto = null
  sintePreview.clear()
  ultimoTonoVivo.clear()
  ultimoTonoRoll.clear()
  buffersClips.clear()
  clipsFallidos.clear()
  velocidad = 1 // blinda el DAW: la velocidad de práctica no sobrevive al editor
  pistasOmitidas = new Set()
  proyecto = null
  indice = new Map()
}

// Con la pestaña oculta los timers se estrangulan: un DAW no necesita sonar en
// background — se detiene (transporte Y previa) y el usuario vuelve a dar play.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (estadoActual !== 'parado' || previaTimer != null)) detener()
})
