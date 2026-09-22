/**
 * Árbitro de la batalla en línea. Vive APARTE del store egocéntrico del juego,
 * y esa es toda la gracia: `usePaintball` decide el final desde el punto de
 * vista de «yo» y se queda en `fase:'fin'` en cuanto me eliminan, así que un
 * anfitrión eliminado dejaría de contar impactos para los otros tres. Aquí el
 * anfitrión sigue arbitrando como espectador hasta que quede un solo equipo.
 *
 * Corre SOLO en el anfitrión y es el único que toca vidas, «fuera», el reloj de
 * la batalla y el fin. Lo que decide sale por la bajada (`veredicto`, `w`,
 * `fin`) y lo aplica todo el mundo por el mismo camino, él incluido (`eco`):
 * así no hay dos versiones del mismo número.
 */
import { emitir } from './sala'
import type { BotId, MsgFin, MsgVeredicto, MsgW, Ranura } from './tipos'

/** Reemisión de `w` aunque no cambie nada: quien llegó tarde se engancha. */
const PIGGYBACK = 2000
/**
 * Tiempo que se sigue contando el final después del `fin`. Un `fin` perdido
 * dejaría al invitado jugando para siempre (es el único mensaje que cierra la
 * batalla), así que el mundo sigue saliendo un rato con `fa:'fin'`: esa es la
 * señal con la que el que se lo perdió pide el estado otra vez.
 */
const COLA_FIN = 10000

/** Cuerpo arbitrado: una ranura o un bot, con lo único que decide el árbitro. */
interface Cuerpo {
  j: Ranura | BotId
  eq: number
  vid: number
  fue: 0 | 1
  imp: number
  col: string
  bot: boolean
}

export type FaseArbitro = 'cuenta' | 'jugando' | 'fin'

let cuerpos: Cuerpo[] = []
let fase: FaseArbitro | null = null
/** Reloj de la batalla en segundos: arranca en −3 (cuenta atrás), 0 = banderazo. */
let reloj = 0
let ultimoW = 0
let finEn = 0
/** El último `fin` difundido, tal cual, para poder repetirlo ante un `resync`. */
let ultimoFin: { eq: number; js: { j: Ranura; eq: number; imp: number; vid: number }[]; mo: 'normal' | 'abandono' | 'corte' } | null = null

/** El anfitrión aplica lo que arbitra por el MISMO camino que los demás. */
let eco: ((ev: 'veredicto' | 'w' | 'fin', p: object) => void) | null = null

export function registrarEcoArbitro(fn: ((ev: 'veredicto' | 'w' | 'fin', p: object) => void) | null): void {
  eco = fn
}

/** ¿Hay una batalla bajo mi arbitraje? */
export function arbitrando(): boolean {
  return fase !== null
}

export function faseArbitro(): FaseArbitro | null {
  return fase
}

/** Abre la batalla: todos con vidas llenas y cuenta atrás de 3 s. */
export function arrancar(
  cs: readonly { j: Ranura | BotId; eq: number; col: string; bot: boolean }[],
  vidasIniciales: number,
): void {
  cuerpos = cs.map((c) => ({ ...c, vid: vidasIniciales, fue: 0, imp: 0 }))
  fase = 'cuenta'
  reloj = -3
  ultimoFin = null
  emitirMundo()
}

export function parar(): void {
  cuerpos = []
  fase = null
  reloj = 0
  ultimoFin = null
}

/** Un tick del anfitrión: cuenta atrás, banderazo y reemisión periódica de `w`. */
export function avanzar(d: number): void {
  if (fase === null) return
  if (fase === 'fin') {
    const ahora = performance.now()
    if (ahora - finEn < COLA_FIN && ahora - ultimoW >= PIGGYBACK) emitirMundo()
    return
  }
  reloj += d
  if (fase === 'cuenta' && reloj >= 0) {
    fase = 'jugando'
    emitirMundo()
    return
  }
  if (performance.now() - ultimoW >= PIGGYBACK) emitirMundo()
}

/**
 * Un impacto validado: resta la vida, cuenta el acierto y difunde el veredicto.
 * `pi` y `c` son para que la VÍCTIMA pinte la mancha y suene aunque su propia
 * física no haya visto cruzar la bola; `ds` es el `seq` del disparo que la creó,
 * y con él la víctima que sí la vio no pinta dos veces.
 */
export function juzgar(
  de: Ranura | BotId,
  vi: Ranura | BotId,
  pi: [number, number, number],
  color: string,
  ds: number,
): MsgVeredicto | null {
  if (fase !== 'jugando') return null
  const victima = cuerpos.find((c) => c.j === vi)
  if (!victima || victima.fue) return null
  victima.vid = Math.max(0, victima.vid - 1)
  if (victima.vid === 0) victima.fue = 1
  const tirador = cuerpos.find((c) => c.j === de)
  if (tirador) tirador.imp += 1
  const datos = { ds, de, vi, vid: victima.vid, fue: victima.fue, pi, c: color }
  const sello = emitir('veredicto', datos)
  const v: MsgVeredicto = { v: 1, t: sello.t, seq: sello.seq, ...datos }
  eco?.('veredicto', v)
  emitirMundo()
  comprobarFin()
  return v
}

/** Se retiró (botón, contexto roto o `salir`): queda fuera y la batalla sigue. */
export function retirar(j: Ranura | BotId): void {
  const c = cuerpos.find((x) => x.j === j)
  if (!c || c.fue) return
  c.fue = 1
  c.vid = 0
  emitirMundo()
  comprobarFin()
}

/** Cierra la batalla sin que quede un solo equipo (el anfitrión la abandona). */
export function terminarPor(mo: 'abandono' | 'corte'): void {
  if (fase === null || fase === 'fin') return
  const vivos = cuerpos.filter((c) => !c.fue)
  difundirFin(vivos.length > 0 ? vivos[0].eq : -1, mo)
}

/** Estado de un cuerpo (lo consulta el juego para armar sus spawns y su HUD). */
export function cuerposArbitrados(): readonly Cuerpo[] {
  return cuerpos
}

/**
 * Alguien pidió `resync`: el mundo otra vez y, si la batalla ya acabó, también
 * el `fin` (con `seq` nuevo, porque el viejo se perdió justamente por el
 * camino). Quien ya lo aplicó no hace nada: `terminarOnline` es idempotente.
 */
export function reemitir(): void {
  if (fase === null) return
  emitirMundo()
  if (fase !== 'fin' || !ultimoFin) return
  const sello = emitir('fin', ultimoFin)
  eco?.('fin', { v: 1, t: sello.t, seq: sello.seq, ...ultimoFin } satisfies MsgFin)
}

function comprobarFin(): void {
  const vivos = cuerpos.filter((c) => !c.fue)
  const equipos = new Set(vivos.map((c) => c.eq))
  if (equipos.size > 1) return
  difundirFin(vivos.length > 0 ? vivos[0].eq : -1, 'normal')
}

function difundirFin(eq: number, mo: 'normal' | 'abandono' | 'corte'): void {
  fase = 'fin'
  finEn = performance.now()
  const datos = {
    eq,
    js: cuerpos
      .filter((c) => !c.bot)
      .map((c) => ({ j: c.j as Ranura, eq: c.eq, imp: c.imp, vid: c.vid })),
    mo,
  }
  ultimoFin = datos
  const sello = emitir('fin', datos)
  const f: MsgFin = { v: 1, t: sello.t, seq: sello.seq, ...datos }
  eco?.('fin', f)
}

function emitirMundo(): void {
  if (fase === null) return
  ultimoW = performance.now()
  const datos = {
    rel: Math.round(reloj * 100) / 100,
    fa: fase,
    js: cuerpos
      .filter((c) => !c.bot)
      .map((c) => ({ j: c.j as Ranura, eq: c.eq, vid: c.vid, fue: c.fue, imp: c.imp })),
    bo: cuerpos
      .filter((c) => c.bot)
      .map((c) => ({ j: c.j as BotId, vivo: (c.fue ? 0 : 1) as 0 | 1, col: c.col, eq: c.eq })),
  }
  const sello = emitir('w', datos)
  const w: MsgW = { v: 1, t: sello.t, seq: sello.seq, ...datos }
  eco?.('w', w)
}

if (import.meta.env.DEV) {
  ;(window as unknown as { arbitroPaintball: () => readonly Cuerpo[] }).arbitroPaintball = cuerposArbitrados
}
