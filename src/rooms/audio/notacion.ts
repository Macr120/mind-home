import type { NotaAudio } from '../../core/data/db'
import { PASOS_POR_COMPAS } from './constantes'

/**
 * Notación de la partitura, compartida por el roll en modo partitura y la
 * partitura de práctica. La rejilla es de semicorcheas (16 pasos por compás):
 * cada duración se escribe con las figuras estándar —redonda, blanca, negra,
 * corchea y semicorchea, con o sin puntillo— y lo que no cabe en una sola (o
 * cruza la barra de compás) se parte en varias unidas por ligadura. Las
 * corcheas y semicorcheas contiguas de un mismo pulso comparten BARRA (con
 * barra secundaria para las semicorcheas) y un acorde comparte la plica.
 */

export type Figura = {
  pasos: number
  /** Cabeza hueca (redonda y blanca). */
  hueca: boolean
  plica: boolean
  /** Corchetes en la plica: corchea 1, semicorchea 2 (agrupadas, barras). */
  corchetes: number
  puntillo: boolean
}

/** De mayor a menor: la descomposición toma siempre la más grande que cabe. */
const FIGURAS: Figura[] = [
  { pasos: 16, hueca: true, plica: false, corchetes: 0, puntillo: false },
  { pasos: 12, hueca: true, plica: true, corchetes: 0, puntillo: true },
  { pasos: 8, hueca: true, plica: true, corchetes: 0, puntillo: false },
  { pasos: 6, hueca: false, plica: true, corchetes: 0, puntillo: true },
  { pasos: 4, hueca: false, plica: true, corchetes: 0, puntillo: false },
  { pasos: 3, hueca: false, plica: true, corchetes: 1, puntillo: true },
  { pasos: 2, hueca: false, plica: true, corchetes: 1, puntillo: false },
  { pasos: 1, hueca: false, plica: true, corchetes: 2, puntillo: false },
]

/** Pasos de un pulso (negra): las barras de corcheas no lo cruzan. */
const PULSO = 4

export type Tramo = { paso: number; figura: Figura }

/** Figuras con las que se escribe una nota; a partir de la segunda van ligadas. */
export function figurasDe(paso: number, duracion: number): Tramo[] {
  const tramos: Tramo[] = []
  let p = Math.max(0, paso)
  let resta = Math.max(1, Math.round(duracion))
  while (resta > 0) {
    let enCompas = Math.min(resta, PASOS_POR_COMPAS - (p % PASOS_POR_COMPAS))
    while (enCompas > 0) {
      const figura = FIGURAS.find((f) => f.pasos <= enCompas) ?? FIGURAS[FIGURAS.length - 1]
      tramos.push({ paso: p, figura })
      p += figura.pasos
      enCompas -= figura.pasos
      resta -= figura.pasos
    }
  }
  return tramos
}

const SILENCIOS: [number, string][] = [
  [16, '𝄻'],
  [8, '𝄼'],
  [4, '𝄽'],
  [2, '𝄾'],
  [1, '𝄿'],
]

export type Silencio = { paso: number; pasos: number; glifo: string }

/**
 * Silencios que llenan los huecos de una voz entre `desde` y `hasta` (pasos):
 * nunca cruzan el compás y cada uno arranca alineado a su propio valor (un
 * hueco de la segunda semicorchea al pulso siguiente es corchea + negra, no
 * una negra a destiempo).
 */
export function silenciosDe(notas: NotaAudio[], desde: number, hasta: number): Silencio[] {
  const ocupados = notas.map((n) => [n[0], n[0] + n[1]] as const).sort((a, b) => a[0] - b[0])
  const huecos: [number, number][] = []
  let libre = desde
  for (const [a, b] of ocupados) {
    if (libre >= hasta) break
    if (a > libre) huecos.push([libre, Math.min(a, hasta)])
    libre = Math.max(libre, b)
  }
  if (libre < hasta) huecos.push([libre, hasta])
  const out: Silencio[] = []
  for (const [a, b] of huecos) {
    let p = a
    while (p < b) {
      const finCompas = Math.min(b, (Math.floor(p / PASOS_POR_COMPAS) + 1) * PASOS_POR_COMPAS)
      const [pasos, glifo] = SILENCIOS.find(([v]) => v <= finCompas - p && p % v === 0) ?? SILENCIOS[SILENCIOS.length - 1]
      out.push({ paso: p, pasos, glifo })
      p += pasos
    }
  }
  return out
}

/** Líneas centrales de los pentagramas de sol y de fa (grados diatónicos). */
export const CENTRO_SOL = 41
export const CENTRO_FA = 29
/** Pentagrama de un grado diatónico (C4 = 35 va con el de sol): su línea central. */
const centroDe = (diat: number) => (diat >= 35 ? CENTRO_SOL : CENTRO_FA)

/** Grados (impares) de las líneas adicionales que necesita una nota fuera de los pentagramas. */
export function lineasAdicionalesDe(diat: number): number[] {
  const out: number[] = []
  if (diat > 45) for (let l = 47; l <= diat; l += 2) out.push(l)
  else if (diat < 25) for (let l = 23; l >= diat; l -= 2) out.push(l)
  else if (diat === 35) out.push(35)
  return out
}

/** Semieje horizontal de la cabeza para `medio` px por grado (la cabeza se centra a esta distancia del paso). */
export const radioCabeza = (medio: number) => medio * 0.8

/**
 * Una cabeza que dibujar: su tramo (figura y paso), dónde va y, si continúa la
 * misma nota, la x de la cabeza anterior (se unen con ligadura).
 */
export type Entrada = { paso: number; figura: Figura; x: number; y: number; diat: number; xAnterior?: number }

/** Un acorde (o nota sola): las cabezas del mismo paso, figura y pentagrama comparten plica. */
type Evento = { paso: number; figura: Figura; x: number; sol: boolean; cabezas: Entrada[]; arriba: boolean }

function eventosDe(entradas: Entrada[]): Evento[] {
  const porClave = new Map<string, Evento>()
  for (const e of entradas) {
    const sol = e.diat >= 35
    const clave = `${e.paso}:${e.figura.pasos}:${sol ? 's' : 'f'}`
    let ev = porClave.get(clave)
    if (!ev) porClave.set(clave, (ev = { paso: e.paso, figura: e.figura, x: e.x, sol, cabezas: [], arriba: true }))
    ev.cabezas.push(e)
  }
  const eventos = [...porClave.values()].sort((a, b) => a.paso - b.paso)
  for (const ev of eventos) ev.arriba = plicaArriba(ev.cabezas)
  return eventos
}

/** La cabeza más lejana de la línea central decide la plica (en empate, abajo). */
function plicaArriba(cabezas: Entrada[]): boolean {
  let lejana = cabezas[0]
  let distancia = -1
  for (const c of cabezas) {
    const d = Math.abs(c.diat - centroDe(c.diat))
    if (d > distancia) {
      distancia = d
      lejana = c
    }
  }
  return lejana.diat < centroDe(lejana.diat)
}

/**
 * Grupos de barra de UN pentagrama: corcheas/semicorcheas contiguas (sin hueco)
 * dentro del mismo pulso. Lo que no lleva corchetes va solo y no corta el grupo
 * (otra voz a la vez, como una negra bajo dos corcheas).
 */
function gruposDe(eventos: Evento[]): Evento[][] {
  const grupos: Evento[][] = []
  let actual: Evento[] = []
  for (const ev of eventos) {
    if (ev.figura.corchetes === 0) {
      grupos.push([ev])
      continue
    }
    const prev = actual[actual.length - 1]
    if (prev && ev.paso === prev.paso + prev.figura.pasos && Math.floor(ev.paso / PULSO) === Math.floor(prev.paso / PULSO)) {
      actual.push(ev)
    } else {
      if (actual.length) grupos.push(actual)
      actual = [ev]
    }
  }
  if (actual.length) grupos.push(actual)
  return grupos
}

/**
 * Dibuja una voz entera (las entradas de una pista): cabezas, puntillos,
 * ligaduras, plicas, corchetes y barras. `medio` = px por grado. Pinta con el
 * fillStyle/strokeStyle vigentes (el color de la pista).
 */
export function dibujarVoz(ctx: CanvasRenderingContext2D, entradas: Entrada[], medio: number) {
  const rx = radioCabeza(medio)
  const ry = medio * 0.58
  const largo = medio * 7
  const grosorBarra = medio * 0.5
  const eventos = eventosDe(entradas)
  const grupos = [...gruposDe(eventos.filter((e) => e.sol)), ...gruposDe(eventos.filter((e) => !e.sol))]
  // En un grupo con barra, la dirección la decide la cabeza más lejana de todas.
  for (const grupo of grupos) {
    if (grupo.length < 2) continue
    const arriba = plicaArriba(grupo.flatMap((e) => e.cabezas))
    for (const ev of grupo) ev.arriba = arriba
  }

  // Cabezas, puntillos y ligaduras (la ligadura va del lado contrario a la plica).
  for (const ev of eventos) {
    for (const c of ev.cabezas) {
      ctx.beginPath()
      ctx.ellipse(c.x, c.y, rx, ry, -0.35, 0, Math.PI * 2)
      if (ev.figura.hueca) {
        ctx.lineWidth = Math.max(1.2, medio * 0.24)
        ctx.stroke()
      } else {
        ctx.fill()
      }
      if (ev.figura.puntillo) {
        // El puntillo va en el espacio: si la cabeza está en una línea, sube medio grado.
        ctx.beginPath()
        ctx.arc(c.x + rx + medio * 0.55, c.diat % 2 === 1 ? c.y - medio * 0.9 : c.y, Math.max(1, medio * 0.22), 0, Math.PI * 2)
        ctx.fill()
      }
      if (c.xAnterior != null) dibujarLigadura(ctx, c.xAnterior, c.x, c.y, medio, ev.arriba)
    }
  }

  /** X de la plica (a la derecha de la cabeza si sube, a la izquierda si baja). */
  const xPlica = (ev: Evento) => (ev.arriba ? ev.x + rx - 0.5 : ev.x - rx + 0.5)
  /** Donde arranca la plica (la cabeza más alejada del extremo) y la que marca su largo. */
  const base = (ev: Evento) =>
    ev.arriba ? Math.max(...ev.cabezas.map((c) => c.y)) : Math.min(...ev.cabezas.map((c) => c.y))
  const extremo = (ev: Evento) =>
    ev.arriba ? Math.min(...ev.cabezas.map((c) => c.y)) : Math.max(...ev.cabezas.map((c) => c.y))

  for (const grupo of grupos) {
    const arriba = grupo[0].arriba
    const s = arriba ? -1 : 1
    if (grupo.length === 1) {
      const ev = grupo[0]
      if (!ev.figura.plica) continue
      const xp = xPlica(ev)
      const yFin = extremo(ev) + s * largo
      ctx.lineWidth = Math.max(1, medio * 0.16)
      ctx.beginPath()
      ctx.moveTo(xp, base(ev))
      ctx.lineTo(xp, yFin)
      ctx.stroke()
      // Corchetes: una curva por cada uno, del extremo de la plica hacia la cabeza.
      ctx.lineWidth = Math.max(1.2, medio * 0.3)
      for (let i = 0; i < ev.figura.corchetes; i++) {
        const y0 = yFin - s * i * medio * 1.3
        ctx.beginPath()
        ctx.moveTo(xp, y0)
        ctx.bezierCurveTo(xp, y0 - s * medio * 1.6, xp + medio * 1.9, y0 - s * medio * 1.9, xp + medio * 1.1, y0 - s * medio * 3.4)
        ctx.stroke()
      }
      continue
    }

    // Barra: recta entre la primera y la última plica, con una pendiente
    // acotada a un espacio; si a alguna plica le faltara largo, la barra
    // entera se aleja de las cabezas.
    const primero = grupo[0]
    const ultimo = grupo[grupo.length - 1]
    const x0 = xPlica(primero)
    const x1 = xPlica(ultimo)
    let y0 = extremo(primero) + s * largo
    let y1 = extremo(ultimo) + s * largo
    if (Math.abs(y1 - y0) > medio * 2) y1 = y0 + Math.sign(y1 - y0) * medio * 2
    const yBarra = (x: number) => y0 + ((y1 - y0) * (x - x0)) / Math.max(1, x1 - x0)
    let ajuste = 0
    for (const ev of grupo) ajuste = Math.max(ajuste, largo * 0.75 - s * (yBarra(xPlica(ev)) - extremo(ev)))
    y0 += s * ajuste
    y1 += s * ajuste

    ctx.lineWidth = Math.max(1, medio * 0.16)
    for (const ev of grupo) {
      const xp = xPlica(ev)
      ctx.beginPath()
      ctx.moveTo(xp, base(ev))
      ctx.lineTo(xp, yBarra(xp))
      ctx.stroke()
    }
    /** Un trozo de barra entre dos x, en el nivel 0 (principal) o 1 (secundaria, hacia las cabezas). */
    const barra = (xa: number, xb: number, nivel: number) => {
      const off = -s * nivel * medio * 0.75
      ctx.beginPath()
      ctx.moveTo(xa, yBarra(xa) + off)
      ctx.lineTo(xb, yBarra(xb) + off)
      ctx.lineTo(xb, yBarra(xb) + off - s * grosorBarra)
      ctx.lineTo(xa, yBarra(xa) + off - s * grosorBarra)
      ctx.closePath()
      ctx.fill()
    }
    barra(x0, x1, 0)
    // Barra secundaria de las semicorcheas: entre vecinas, o una barrita parcial
    // hacia la izquierda (hacia la derecha si es la primera del grupo).
    for (let i = 0; i < grupo.length; i++) {
      const ev = grupo[i]
      if (ev.figura.corchetes < 2) continue
      const prev = grupo[i - 1]
      const sig = grupo[i + 1]
      if (sig && sig.figura.corchetes >= 2) barra(xPlica(ev), xPlica(sig), 1)
      else if (!(prev && prev.figura.corchetes >= 2)) {
        const stub = medio * 1.3
        if (prev) barra(xPlica(ev) - stub, xPlica(ev), 1)
        else barra(xPlica(ev), xPlica(ev) + stub, 1)
      }
    }
  }
  ctx.lineWidth = 1
}

/** Ligadura entre dos cabezas a la misma altura: el arco va del lado contrario a la plica. */
function dibujarLigadura(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  medio: number,
  arriba: boolean,
) {
  const s = arriba ? 1 : -1
  const ya = y + s * medio * 0.75
  const xa = x1 + medio * 0.5
  const xb = Math.max(xa + 2, x2 - medio * 0.5)
  ctx.lineWidth = Math.max(1, medio * 0.18)
  ctx.beginPath()
  ctx.moveTo(xa, ya)
  ctx.bezierCurveTo(xa + (xb - xa) * 0.3, ya + s * medio * 1.3, xa + (xb - xa) * 0.7, ya + s * medio * 1.3, xb, ya)
  ctx.stroke()
  ctx.lineWidth = 1
}

/** Glifo de silencio centrado verticalmente en `y` (la línea central del pentagrama, o el espacio de encima para redonda y blanca). */
export function dibujarSilencio(ctx: CanvasRenderingContext2D, x: number, y: number, medio: number, glifo: string) {
  ctx.font = `${Math.round(medio * 4.4)}px serif`
  ctx.textBaseline = 'middle'
  ctx.fillText(glifo, x, y)
}
