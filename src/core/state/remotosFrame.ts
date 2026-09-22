/**
 * Cuerpos de los demás jugadores, interpolados. Bus mutable sin React (mismo
 * molde que `actoresFrame` del modo película): lo escribe el interpolador una
 * vez por frame y lo leen los `<JugadorRemoto3D/>` en su `useFrame`, así que
 * mover a cuatro personas no cuesta un solo re-render.
 *
 * Se dibuja SIEMPRE en el pasado (`reloj.ahora() - reloj.retraso()`): con un
 * búfer de muestras la interpolación es exacta y no hay que adivinar salvo en
 * el hueco que deja un mensaje perdido.
 */
import * as reloj from '../partida/reloj'
import { F_AGACHADO, F_AUSENTE, F_CORRIENDO, F_FUERA, type PoseCuerpo } from '../partida/tipos'

export interface CuerpoRemoto {
  x: number
  z: number
  y: number
  /** Rumbo suavizado que el interpolador ya resolvió. */
  h: number
  vel: number
  nivel: number
  corriendo: boolean
  agachado: boolean
  fuera: boolean
  ausente: boolean
  /** performance.now() de la última muestra recibida (para el olvido a 30 s). */
  visto: number
}

interface Muestra extends PoseCuerpo {
  t: number
}

/** Por ranura o BotId. Mutado en sitio: cero re-renders. */
export const remotosFrame: Record<string, CuerpoRemoto> = {}

const bufers = new Map<string, Muestra[]>()

const MAX_MUESTRAS = 20
/** Extrapolación máxima sobre la última velocidad conocida; pasada, se congela. */
const DEAD_RECKONING = 250
/** Más de esto entre dos muestras es un teletransporte (portal), no una zancada. */
const SALTO = 2
/** Sin muestras durante este tiempo el cuerpo se olvida. */
const OLVIDO = 30000
/** Un `t` que retrocede más que esto no es reordenamiento: es un reloj reiniciado. */
const RELOJ_ATRAS = 2000

/** Encola una muestra con su `t` de partida. La consume `alInterpolar`. */
export function muestraRemoto(id: string, p: PoseCuerpo, t: number): void {
  let buf = bufers.get(id)
  if (!buf) {
    buf = []
    bufers.set(id, buf)
  }
  // Reordenada y ya vieja: el búfer solo avanza. Pero un salto ATRÁS de más de
  // dos segundos no es reordenamiento, es un par que recargó y reinició su
  // reloj de partida: con su historia vieja dentro, TODAS sus muestras nuevas
  // quedarían rechazadas para siempre y su cuerpo se congelaría. Se tira el
  // búfer y el cuerpo se recoloca con esta, igual que al volver de segundo plano.
  const ultima = buf.length > 0 ? buf[buf.length - 1] : null
  if (ultima && t <= ultima.t) {
    if (t > ultima.t - RELOJ_ATRAS) return
    buf.length = 0
  }
  buf.push({ ...p, t })
  if (buf.length > MAX_MUESTRAS) buf.shift()
  const c = remotosFrame[id]
  if (c) {
    c.visto = performance.now()
    return
  }
  remotosFrame[id] = {
    x: p.x,
    z: p.z,
    y: 0,
    h: p.h,
    vel: p.vel,
    nivel: p.niv,
    corriendo: false,
    agachado: false,
    fuera: false,
    ausente: false,
    visto: performance.now(),
  }
}

function aplicarFlags(c: CuerpoRemoto, m: Muestra): void {
  c.vel = m.vel
  c.nivel = m.niv
  c.corriendo = (m.f & F_CORRIENDO) !== 0
  c.agachado = (m.f & F_AGACHADO) !== 0
  c.fuera = (m.f & F_FUERA) !== 0
  c.ausente = (m.f & F_AUSENTE) !== 0
}

function mover(c: CuerpoRemoto, buf: Muestra[], destino: number): void {
  const ultima = buf[buf.length - 1]
  // Todavía no hay historia para ese instante: el cuerpo espera en la primera.
  if (destino <= buf[0].t) {
    c.x = buf[0].x
    c.z = buf[0].z
    c.h = buf[0].h
    aplicarFlags(c, buf[0])
    return
  }
  if (destino >= ultima.t) {
    // Dead reckoning sobre la velocidad de las dos últimas muestras y, pasados
    // 250 ms, congelar: extrapolar sin fin manda al cuerpo a pasear solo.
    const previa = buf[buf.length - 2]
    const dt = Math.min(destino - ultima.t, DEAD_RECKONING) / 1000
    let vx = 0
    let vz = 0
    if (previa && ultima.t > previa.t) {
      const paso = (ultima.t - previa.t) / 1000
      if (Math.hypot(ultima.x - previa.x, ultima.z - previa.z) <= SALTO) {
        vx = (ultima.x - previa.x) / paso
        vz = (ultima.z - previa.z) / paso
      }
    }
    c.x = ultima.x + vx * dt
    c.z = ultima.z + vz * dt
    c.h = ultima.h
    aplicarFlags(c, ultima)
    return
  }
  let i = 0
  for (let k = buf.length - 2; k >= 0; k -= 1) {
    if (buf[k].t <= destino) {
      i = k
      break
    }
  }
  const a = buf[i]
  const b = buf[i + 1]
  aplicarFlags(c, b)
  // Teletransporte (portal, cambio de nivel, recolocación): salta, no interpola.
  if (Math.hypot(b.x - a.x, b.z - a.z) > SALTO) {
    c.x = b.x
    c.z = b.z
    c.h = b.h
    return
  }
  const q = b.t > a.t ? (destino - a.t) / (b.t - a.t) : 1
  c.x = a.x + (b.x - a.x) * q
  c.z = a.z + (b.z - a.z) * q
  c.h = a.h + Math.atan2(Math.sin(b.h - a.h), Math.cos(b.h - a.h)) * q
}

/** Llamado UNA vez por frame desde `<JugadoresRemotos/>`: mueve todos los cuerpos. */
export function alInterpolar(): void {
  const destino = reloj.ahora() - reloj.retraso()
  const real = performance.now()
  for (const [id, buf] of bufers) {
    const c = remotosFrame[id]
    if (!c) continue
    if (real - c.visto > OLVIDO) {
      delete remotosFrame[id]
      bufers.delete(id)
      continue
    }
    if (buf.length > 0) mover(c, buf, destino)
  }
}

export function limpiarRemotos(): void {
  bufers.clear()
  for (const id of Object.keys(remotosFrame)) delete remotosFrame[id]
}

if (import.meta.env.DEV) {
  ;(window as unknown as { remotosFrame: typeof remotosFrame }).remotosFrame = remotosFrame
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    // Volver de segundo plano: las muestras de antes del parón describirían un
    // arrastre por todo el mapa. Se tiran y el cuerpo se recoloca con la primera
    // que llegue (el reloj también se remide desde cero, en `sala.ts`).
    if (document.visibilityState === 'visible') for (const buf of bufers.values()) buf.length = 0
  })
}
