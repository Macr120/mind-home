/**
 * Voz en vivo de la sala: WebRTC en malla (máximo 4 personas → 3 conexiones por
 * cabeza), audio solo. La señalización viaja por el canal de la partida con los
 * eventos `voz` (presencia) y `senal` (oferta/respuesta dirigida a un jugador).
 *
 * Reglas:
 * - Sin trickle: cada SDP sale con sus candidatos ICE ya reunidos, así una
 *   conexión cuesta DOS mensajes y una pérdida se arregla reofreciendo.
 * - Contra el «glare» ofrece SIEMPRE la ranura menor (`j0` < `j1` < …).
 * - La reproducción vive en este módulo (`new Audio()`), no en React: cambiar
 *   de vista, abrir un cuarto o entrar a un juego no corta a nadie.
 * - Se libera todo al salir de la sala, cuando alguien deja el roster y en
 *   `pagehide`.
 */
import { create } from 'zustand'
import { usePartida } from './partidaStore'
import { alRecibir, emitir, salaViva } from './sala'
import type { MsgSenal, MsgVoz, Ranura } from './tipos'

const STUN: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }]

/** TURN opcional por entorno (`VITE_TURN_URL`, `VITE_TURN_USER`, `VITE_TURN_PASS`). */
function servidoresIce(): RTCIceServer[] {
  const url = import.meta.env.VITE_TURN_URL as string | undefined
  if (!url) return STUN
  return [
    ...STUN,
    {
      urls: url.split(',').map((u) => u.trim()),
      username: import.meta.env.VITE_TURN_USER as string | undefined,
      credential: import.meta.env.VITE_TURN_PASS as string | undefined,
    },
  ]
}

/** Lo más que se espera a reunir candidatos antes de mandar el SDP igualmente. */
const ICE_TOPE = 2500
/** Sin `connected` en este tiempo, quien ofrece lo vuelve a intentar. */
const REOFERTA = 9000
const REINTENTOS = 3
/** Latido de presencia: repara un `voz` perdido y presenta a quien llegó tarde. */
const LATIDO_VOZ = 15000
/** Nivel RMS (0-1) a partir del cual se considera que alguien habla. */
const UMBRAL_HABLA = 0.04

export type EstadoPeer = 'conectando' | 'conectado' | 'fallo'

interface VozState {
  /** Estoy dentro de la voz (micro pedido y concedido). */
  activa: boolean
  pidiendo: boolean
  microMudo: boolean
  error: 'permiso' | 'sin-soporte' | null
  /** Otros que están en la voz, con su micro silenciado o no. */
  enVoz: Partial<Record<Ranura, { mu: boolean }>>
  conexiones: Partial<Record<Ranura, EstadoPeer>>
  /** A quién he silenciado YO (solo en este dispositivo). */
  silenciados: Partial<Record<Ranura, true>>
  hablando: Partial<Record<Ranura, true>>
  /** El navegador no dejó reproducir sin gesto: hace falta un toque. */
  audioBloqueado: boolean
}

export const useVoz = create<VozState>(() => ({
  activa: false,
  pidiendo: false,
  microMudo: false,
  error: null,
  enVoz: {},
  conexiones: {},
  silenciados: {},
  hablando: {},
  audioBloqueado: false,
}))

interface Peer {
  pc: RTCPeerConnection
  /** Id de la conexión (lo elige quien ofrece). */
  s: number
  ofrezco: boolean
  audio: HTMLAudioElement
  analizador: AnalyserNode | null
  fuente: MediaStreamAudioSourceNode | null
  timer: ReturnType<typeof setTimeout> | null
  intentos: number
}

let micro: MediaStream | null = null
let ctx: AudioContext | null = null
let analizadorPropio: AnalyserNode | null = null
let medidor: ReturnType<typeof setInterval> | null = null
let latido: ReturnType<typeof setInterval> | null = null
const peers = new Map<Ranura, Peer>()

function mia(): Ranura | null {
  return salaViva()?.miRanura ?? null
}

function fijarConexion(r: Ranura, e: EstadoPeer | null): void {
  useVoz.setState((s) => {
    const conexiones = { ...s.conexiones }
    if (e) conexiones[r] = e
    else delete conexiones[r]
    return { conexiones }
  })
}

function anunciar(ac: 'entra' | 'sale', re = false): void {
  const yo = mia()
  if (!yo) return
  emitir('voz', { j: yo, ac, mu: useVoz.getState().microMudo ? 1 : 0, ...(re ? { re: 1 } : {}) })
}

function crearAnalizador(stream: MediaStream): { analizador: AnalyserNode; fuente: MediaStreamAudioSourceNode } | null {
  if (!ctx) return null
  try {
    const fuente = ctx.createMediaStreamSource(stream)
    const analizador = ctx.createAnalyser()
    analizador.fftSize = 512
    fuente.connect(analizador)
    return { analizador, fuente }
  } catch {
    return null
  }
}

const muestras = new Float32Array(512)
function nivel(a: AnalyserNode | null): number {
  if (!a) return 0
  a.getFloatTimeDomainData(muestras)
  let suma = 0
  for (let i = 0; i < muestras.length; i += 1) suma += muestras[i] * muestras[i]
  return Math.sqrt(suma / muestras.length)
}

function medir(): void {
  const yo = mia()
  const st = useVoz.getState()
  const hablando: Partial<Record<Ranura, true>> = {}
  if (yo && !st.microMudo && nivel(analizadorPropio) > UMBRAL_HABLA) hablando[yo] = true
  for (const [r, p] of peers) if (!st.silenciados[r] && nivel(p.analizador) > UMBRAL_HABLA) hablando[r] = true
  const antes = Object.keys(st.hablando).sort().join()
  if (Object.keys(hablando).sort().join() !== antes) useVoz.setState({ hablando })
}

function reproducir(audio: HTMLAudioElement): void {
  void audio.play().then(
    () => undefined,
    () => useVoz.setState({ audioBloqueado: true }),
  )
}

/** El toque que pide el navegador para dejar sonar a los demás (iOS, autoplay). */
export function reanudarAudio(): void {
  void ctx?.resume()
  useVoz.setState({ audioBloqueado: false })
  for (const p of peers.values()) reproducir(p.audio)
}

function cerrarPeer(r: Ranura): void {
  const p = peers.get(r)
  if (!p) return
  peers.delete(r)
  if (p.timer) clearTimeout(p.timer)
  p.pc.onconnectionstatechange = null
  p.pc.ontrack = null
  p.pc.close()
  p.audio.pause()
  p.audio.srcObject = null
  p.fuente?.disconnect()
  fijarConexion(r, null)
}

function crearPeer(r: Ranura, s: number, ofrezco: boolean): Peer {
  cerrarPeer(r)
  const pc = new RTCPeerConnection({ iceServers: servidoresIce() })
  const audio = new Audio()
  audio.autoplay = true
  audio.muted = !!useVoz.getState().silenciados[r]
  const peer: Peer = { pc, s, ofrezco, audio, analizador: null, fuente: null, timer: null, intentos: 0 }
  if (micro) for (const pista of micro.getAudioTracks()) pc.addTrack(pista, micro)
  pc.ontrack = (e) => {
    const stream = e.streams[0] ?? new MediaStream([e.track])
    audio.srcObject = stream
    reproducir(audio)
    peer.fuente?.disconnect()
    const a = crearAnalizador(stream)
    peer.analizador = a?.analizador ?? null
    peer.fuente = a?.fuente ?? null
  }
  pc.onconnectionstatechange = () => {
    if (peers.get(r) !== peer) return
    const e = pc.connectionState
    if (e === 'connected') {
      if (peer.timer) clearTimeout(peer.timer)
      peer.timer = null
      fijarConexion(r, 'conectado')
    } else if (e === 'failed') {
      fijarConexion(r, 'fallo')
      if (peer.ofrezco) reofrecer(r, peer)
    } else if (e === 'connecting' || e === 'new') {
      fijarConexion(r, 'conectando')
    }
  }
  peers.set(r, peer)
  fijarConexion(r, 'conectando')
  return peer
}

function esperarIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolver) => {
    const fin = () => {
      clearTimeout(tope)
      pc.removeEventListener('icegatheringstatechange', alCambiar)
      resolver()
    }
    const alCambiar = () => {
      if (pc.iceGatheringState === 'complete') fin()
    }
    const tope = setTimeout(fin, ICE_TOPE)
    pc.addEventListener('icegatheringstatechange', alCambiar)
  })
}

async function ofrecer(r: Ranura, intentos = 0): Promise<void> {
  const yo = mia()
  if (!yo || !micro) return
  const peer = crearPeer(r, Math.floor(Math.random() * 1e9) + 1, true)
  peer.intentos = intentos
  try {
    await peer.pc.setLocalDescription(await peer.pc.createOffer())
    await esperarIce(peer.pc)
    if (peers.get(r) !== peer || !peer.pc.localDescription) return
    emitir('senal', { j: yo, a: r, k: 'oferta', s: peer.s, sd: peer.pc.localDescription.sdp })
    peer.timer = setTimeout(() => {
      if (peers.get(r) === peer && peer.pc.connectionState !== 'connected') reofrecer(r, peer)
    }, REOFERTA)
  } catch {
    if (peers.get(r) === peer) fijarConexion(r, 'fallo')
  }
}

function reofrecer(r: Ranura, peer: Peer): void {
  if (peer.intentos >= REINTENTOS) {
    fijarConexion(r, 'fallo')
    return
  }
  void ofrecer(r, peer.intentos + 1)
}

async function responder(m: MsgSenal, de: Ranura): Promise<void> {
  const yo = mia()
  if (!yo || !micro) return
  const peer = crearPeer(de, m.s, false)
  try {
    await peer.pc.setRemoteDescription({ type: 'offer', sdp: m.sd })
    await peer.pc.setLocalDescription(await peer.pc.createAnswer())
    await esperarIce(peer.pc)
    if (peers.get(de) !== peer || !peer.pc.localDescription) return
    emitir('senal', { j: yo, a: de, k: 'respuesta', s: m.s, sd: peer.pc.localDescription.sdp })
  } catch {
    if (peers.get(de) === peer) fijarConexion(de, 'fallo')
  }
}

/** Con quién tendría que haber conexión y aún no la hay: la ranura menor ofrece. */
function conectarPendientes(): void {
  const yo = mia()
  if (!yo || !micro) return
  for (const r of Object.keys(useVoz.getState().enVoz) as Ranura[]) {
    if (yo < r && necesitaOferta(r)) void ofrecer(r)
  }
}

/** Sin conexión, o con una que ya se dio por perdida (el latido la reintenta). */
function necesitaOferta(r: Ranura): boolean {
  const p = peers.get(r)
  return !p || p.pc.connectionState === 'failed' || p.pc.connectionState === 'closed'
}

// ─── entrada ─────────────────────────────────────────────────────────────────

function alVoz(m: MsgVoz, de: Ranura): void {
  if (m.ac === 'sale') {
    useVoz.setState((s) => {
      const enVoz = { ...s.enVoz }
      delete enVoz[de]
      return { enVoz }
    })
    cerrarPeer(de)
    return
  }
  useVoz.setState((s) => ({ enVoz: { ...s.enVoz, [de]: { mu: m.mu === 1 } } }))
  if (!micro) return
  const yo = mia()
  if (!yo) return
  if (!m.re) {
    // Acaba de entrar (o volvió): que sepa que estoy (una respuesta no se
    // contesta) y, si me toca ofrecer, conexión nueva aunque quede una vieja.
    anunciar('entra', true)
    if (yo < de) void ofrecer(de)
    return
  }
  if (yo < de && necesitaOferta(de)) void ofrecer(de)
}

function alSenal(m: MsgSenal, de: Ranura): void {
  if (m.a !== mia() || !micro) return
  if (m.k === 'oferta') {
    void responder(m, de)
    return
  }
  const peer = peers.get(de)
  if (!peer || !peer.ofrezco || peer.s !== m.s || peer.pc.signalingState !== 'have-local-offer') return
  void peer.pc.setRemoteDescription({ type: 'answer', sdp: m.sd }).catch(() => fijarConexion(de, 'fallo'))
}

alRecibir('voz', alVoz)
alRecibir('senal', alSenal)

// ─── ciclo de vida ───────────────────────────────────────────────────────────

/** Entra a la voz. Hay que llamarlo desde un clic: pide el micro y desbloquea el audio. */
export async function entrarVoz(): Promise<void> {
  const st = useVoz.getState()
  if (st.activa || st.pidiendo || !salaViva()) return
  if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
    useVoz.setState({ error: 'sin-soporte' })
    return
  }
  useVoz.setState({ pidiendo: true, error: null })
  // El contexto se crea DENTRO del gesto: en iOS no se podría reanudar después.
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
  } catch {
    ctx = null
  }
  try {
    micro = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch {
    useVoz.setState({ pidiendo: false, error: 'permiso' })
    return
  }
  // La sala pudo cerrarse mientras el permiso estaba en pantalla.
  if (!salaViva()) {
    soltarMicro()
    useVoz.setState({ pidiendo: false })
    return
  }
  analizadorPropio = crearAnalizador(micro)?.analizador ?? null
  useVoz.setState({ activa: true, pidiendo: false, microMudo: false })
  anunciar('entra')
  conectarPendientes()
  medidor = setInterval(medir, 150)
  latido = setInterval(() => {
    anunciar('entra', true)
    conectarPendientes()
  }, LATIDO_VOZ)
  window.addEventListener('pagehide', alIrse)
}

function soltarMicro(): void {
  for (const p of micro?.getTracks() ?? []) p.stop()
  micro = null
}

/** Sale de la voz y lo suelta todo (micro, conexiones, medidor). */
export function salirVoz(avisar = true): void {
  if (!useVoz.getState().activa && !micro) return
  if (avisar) anunciar('sale')
  for (const r of [...peers.keys()]) cerrarPeer(r)
  soltarMicro()
  analizadorPropio = null
  if (medidor) clearInterval(medidor)
  if (latido) clearInterval(latido)
  medidor = null
  latido = null
  window.removeEventListener('pagehide', alIrse)
  useVoz.setState({ activa: false, microMudo: false, hablando: {}, conexiones: {}, audioBloqueado: false })
}

function alIrse(): void {
  salirVoz()
}

export function alternarMicro(): void {
  if (!micro) return
  const mudo = !useVoz.getState().microMudo
  for (const p of micro.getAudioTracks()) p.enabled = !mudo
  useVoz.setState({ microMudo: mudo })
  anunciar('entra', true)
}

/** Silencia (o no) a un jugador SOLO en este dispositivo. */
export function alternarSilencio(r: Ranura): void {
  useVoz.setState((s) => {
    const silenciados = { ...s.silenciados }
    if (silenciados[r]) delete silenciados[r]
    else silenciados[r] = true
    const p = peers.get(r)
    if (p) p.audio.muted = !!silenciados[r]
    return { silenciados }
  })
}

// Roster: quien se va de la sala se va de la voz; sin sala, se cierra todo.
let salaPrevia: string | null = null
usePartida.subscribe((s) => {
  const sala = s.sala
  const id = sala?.partidaId ?? null
  if (id !== salaPrevia) {
    salaPrevia = id
    salirVoz(false)
    useVoz.setState({ enVoz: {}, silenciados: {}, error: null })
    return
  }
  if (!sala) return
  const dentro = new Set(sala.jugadores.filter((j) => j.estado === 'dentro').map((j) => j.ranura))
  // Solo en la sala: la interfaz se oculta y el micro no puede quedarse abierto.
  if (dentro.size < 2) salirVoz()
  const fuera = (Object.keys(useVoz.getState().enVoz) as Ranura[]).filter((r) => !dentro.has(r))
  for (const r of [...peers.keys()]) if (!dentro.has(r)) cerrarPeer(r)
  if (fuera.length) {
    useVoz.setState((st) => {
      const enVoz = { ...st.enVoz }
      for (const r of fuera) delete enVoz[r]
      return { enVoz }
    })
  }
})

if (import.meta.env.DEV) {
  ;(window as unknown as { useVoz: typeof useVoz; vozPeers: typeof peers }).useVoz = useVoz
  ;(window as unknown as { vozPeers: typeof peers }).vozPeers = peers
}
