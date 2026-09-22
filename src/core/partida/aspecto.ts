/**
 * Aspecto remoto: qué apariencia sale de este dispositivo y qué se acepta de
 * fuera. Solo APARIENCIA y sin un solo Blob (el rostro subido, el .glb y las
 * prendas a medida se quedan en casa).
 *
 * Lo que llega se valida CAMPO A CAMPO contra el catálogo local: lo que no se
 * reconoce no se dibuja, y el cuerpo cae al avatar base. Nunca se pasa por
 * `getAsistente`, que cae a `lista[0]` y dibujaría un id desconocido como tu
 * primer asistente sin avisar.
 */
import { AVATAR_DEFAULT, type Avatar } from '../state/disenoStore'
import { EXPRESIONES, PEINADOS, PRENDAS, ESCALA_DEFAULT, ESCALA_MAX, ESCALA_MIN } from '../house/apariencia'
import type { ExpresionId, PeinadoId, PrendaId, Ropa } from '../house/apariencia'
import { CUERPOS_PRESET } from '../house/cuerpos'
import { MASCOTAS, type Asistente, type MascotaId, type Pieza3D } from '../chat/mascotas'
import type { AspectoRemoto } from './tipos'

/** Tope de piezas de un cuerpo a medida que se acepta de la red. */
const MAX_PIEZAS = 120

const COLOR = /^#[0-9a-f]{6}$/i
const TIPOS_PIEZA = new Set(['caja', 'esfera', 'cono', 'cilindro', 'plano'])
const MATERIALES = new Set(['metal', 'vidrio', 'brillante'])

function color(v: unknown): string | undefined {
  return typeof v === 'string' && COLOR.test(v) ? v : undefined
}

function ropaPodada(ropa: Ropa | undefined): Record<string, string> | undefined {
  if (!ropa) return undefined
  const salida: Record<string, string> = {}
  for (const [id, prenda] of Object.entries(ropa)) {
    if (prenda?.color) salida[id] = prenda.color
  }
  return Object.keys(salida).length > 0 ? salida : undefined
}

/** `Avatar` del personaje principal → descriptor ≤4 KB. */
export function podar(av: Avatar): AspectoRemoto {
  return {
    cabeza: av.cabeza,
    torso: av.torso,
    piernas: av.piernas,
    escala: av.escala,
    ropa: ropaPodada(av.ropa),
    expresion: av.expresion,
    peinado: av.peinado,
    peloColor: av.peloColor,
    forma: av.forma,
    formaColor: av.formaColor,
    cuerpoPresetId: av.cuerpoPresetId,
    modelo3d: av.modelo3d?.slice(0, MAX_PIEZAS),
  }
}

/**
 * Un asistente del anfitrión → descriptor remoto. SOLO apariencia: `asistentes`
 * va podada del plano a propósito, así que personalidad, historia y saludo NO
 * salen del dispositivo.
 */
export function podarAsistente(a: Asistente): AspectoRemoto {
  return {
    cabeza: AVATAR_DEFAULT.cabeza,
    torso: AVATAR_DEFAULT.torso,
    piernas: AVATAR_DEFAULT.piernas,
    escala: a.escala ?? ESCALA_DEFAULT,
    ropa: ropaPodada(a.ropa),
    expresion: a.expresion,
    peinado: a.peinado,
    peloColor: a.peloColor,
    forma: a.forma,
    formaColor: a.color,
    cuerpoPresetId: a.cuerpoPresetId,
    modelo3d: a.modelo3d?.slice(0, MAX_PIEZAS),
  }
}

function numeros(v: unknown, min: number, max: number, cuantos: number[]): number[] | null {
  if (!Array.isArray(v) || !cuantos.includes(v.length)) return null
  const salida: number[] = []
  for (const n of v) {
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) return null
    salida.push(n)
  }
  return salida
}

function piezas(v: unknown): Pieza3D[] | undefined {
  if (!Array.isArray(v)) return undefined
  const salida: Pieza3D[] = []
  for (const bruta of v.slice(0, MAX_PIEZAS)) {
    if (typeof bruta !== 'object' || bruta === null) continue
    const p = bruta as Record<string, unknown>
    const col = color(p.color)
    const pos = numeros(p.pos, -10, 10, [3])
    const tam = numeros(p.tam, 0, 10, [1, 2, 3])
    if (!col || !pos || !tam || typeof p.tipo !== 'string' || !TIPOS_PIEZA.has(p.tipo)) continue
    const rot = numeros(p.rot, -Math.PI * 2, Math.PI * 2, [3])
    salida.push({
      tipo: p.tipo as Pieza3D['tipo'],
      pos: pos as [number, number, number],
      tam,
      color: col,
      ...(rot ? { rot: rot as [number, number, number] } : {}),
      ...(typeof p.mat === 'string' && MATERIALES.has(p.mat) ? { mat: p.mat as Pieza3D['mat'] } : {}),
    })
  }
  return salida.length > 0 ? salida : undefined
}

function ropaValidada(v: unknown): Ropa {
  if (typeof v !== 'object' || v === null) return {}
  const bruta = v as Record<string, unknown>
  const salida: Ropa = {}
  for (const prenda of PRENDAS) {
    const col = color(bruta[prenda.id])
    if (col) salida[prenda.id as PrendaId] = { color: col }
  }
  return salida
}

/** Descriptor remoto → `Avatar` montable. Lo que no valida, no se dibuja. */
export function aAvatar(bruto: unknown): Avatar {
  const base: Avatar = { ...AVATAR_DEFAULT, escala: ESCALA_DEFAULT, ropa: {} }
  if (typeof bruto !== 'object' || bruto === null) return base
  const a = bruto as Record<string, unknown>
  const escala = typeof a.escala === 'number' && Number.isFinite(a.escala) ? a.escala : ESCALA_DEFAULT
  const forma = MASCOTAS.find((m) => m.id === a.forma)?.id
  const preset = a.cuerpoPresetId === 'base' || CUERPOS_PRESET.some((c) => c.id === a.cuerpoPresetId)
  return {
    cabeza: color(a.cabeza) ?? base.cabeza,
    torso: color(a.torso) ?? base.torso,
    piernas: color(a.piernas) ?? base.piernas,
    escala: Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala)),
    ropa: ropaValidada(a.ropa),
    expresion: EXPRESIONES.find((e) => e.id === a.expresion)?.id as ExpresionId | undefined,
    peinado: PEINADOS.find((p) => p.id === a.peinado)?.id as PeinadoId | undefined,
    peloColor: color(a.peloColor),
    forma: forma as MascotaId | undefined,
    formaColor: color(a.formaColor),
    cuerpoPresetId: preset ? (a.cuerpoPresetId as string) : undefined,
    modelo3d: piezas(a.modelo3d),
  }
}
