import type { EmocionId } from '../../core/chat/emociones'
import type { ClipAvatar, ClipVideo, ClipVoz, EscenaActor, NarradorVideo } from '../../core/data/db'
import type { PresetAnimacionId } from '../../core/house/animacion'
import { esActorEscena, puntoActor } from './actores'
import { clipPersonaje } from './clipsNuevos'
import { EN_OFF, MAX_NARRADORES, MIN_CLIP, nuevoClipId } from './constantes'
import { normalizar, redondear, type ProyectoAbierto } from './modelo'
import { nuevoNarrador } from './narradores'

/**
 * El guion de la obra (estudio de cine): las líneas SON los clips del proyecto
 * —marionetas en la casa (`avatar` con `modo: 'escena'`) y el narrador en off
 * (`voz`)—, leídas en orden de tiempo. La regla de la obra es que las líneas
 * van ENCADENADAS: cada una empieza cuando acaba la anterior, y cualquier
 * cambio estructural (añadir, mover, borrar, cambiar texto o personaje, poner
 * audio) las vuelve a encadenar. Todo son funciones puras sobre los clips.
 */

export type LineaObra = (ClipAvatar & { modo: 'escena'; escena: EscenaActor }) | ClipVoz

/** La duración de un medio de audio ya generado (undefined si aún no está en el repo). */
export type DuracionMedio = (medioId: number) => number | undefined

export const esLineaObra = (c: ClipVideo): c is LineaObra => esActorEscena(c) || c.pista === 'voz'

export const lineasObra = (clips: ClipVideo[]): LineaObra[] => clips.filter(esLineaObra).sort((a, b) => a.inicio - b.inicio)

/** Quién dice la línea: el actor ('jugador' o asistenteId) o `EN_OFF`. */
export const quienDe = (l: LineaObra): string => (l.pista === 'avatar' ? l.asistenteId : EN_OFF)

/** Lo que tarda en leerse una línea sin audio: el `durHabla` del Director (0,6 s + 0,055 s por carácter) más medio segundo de aire. */
const durLinea = (texto: string) => Math.max(MIN_CLIP, redondear(0.6 + texto.trim().length * 0.055 + 0.5))

/**
 * El narrador de ese personaje (o el de la voz en off); si no existe lo crea
 * con `nuevoNarrador` mientras quepa. null = no cabe: la línea lee con la voz
 * del proyecto.
 */
export function narradorPara(p: ProyectoAbierto, asistenteId?: string): { p: ProyectoAbierto; narrador: NarradorVideo | null } {
  const lista = p.narradores ?? []
  const existente = lista.find((n) => (asistenteId ? n.asistenteId === asistenteId : !n.asistenteId))
  if (existente) return { p, narrador: existente }
  if (lista.length >= MAX_NARRADORES) return { p, narrador: null }
  const narrador = nuevoNarrador(p, asistenteId)
  return { p: { ...p, narradores: [...lista, narrador] }, narrador }
}

/** La marca de una marioneta: el punto de su primera línea, o donde está hoy en el mapa. */
export function marcaDe(clips: ClipVideo[], id: string): { x: number; z: number } {
  const primera = lineasObra(clips).find((l) => l.pista === 'avatar' && l.asistenteId === id)
  return primera?.pista === 'avatar' ? { x: primera.escena.x, z: primera.escena.z } : puntoActor(id)
}

/** Con audio, la duración del medio menos `desde` (a décimas hacia arriba, como `ponerAudio`); sin él, la lectura. */
function duracionDe(l: LineaObra, durMedio: DuracionMedio): number {
  if (l.medioId != null) {
    const d = durMedio(l.medioId)
    return d ? Math.max(MIN_CLIP, Math.ceil((d - (l.desde ?? 0)) * 10) / 10) : l.duracion
  }
  return durLinea(l.texto ?? '')
}

/**
 * Encadena las líneas: cada una empieza donde acaba la anterior (la primera
 * conserva su inicio, o `desde`). `orden` explícito evita empates de `inicio`
 * al insertar «tras» otra. Las pausas puestas a mano entre líneas se pierden.
 */
export function encadenarObra(clips: ClipVideo[], durMedio: DuracionMedio, o: { orden?: string[]; desde?: number } = {}): ClipVideo[] {
  const lineas = lineasObra(clips)
  if (o.orden) {
    const pos = new Map(o.orden.map((id, i) => [id, i]))
    lineas.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9))
  }
  let t = o.desde ?? lineas[0]?.inicio ?? 0
  const tiempos = new Map<string, { inicio: number; duracion: number }>()
  for (const l of lineas) {
    const duracion = duracionDe(l, durMedio)
    tiempos.set(l.id, { inicio: redondear(t), duracion })
    t = redondear(t + duracion)
  }
  return normalizar(
    clips.map((c) => {
      const tm = tiempos.get(c.id)
      return tm ? { ...c, ...tm } : c
    }),
  )
}

/** Una línea nueva (tras `tras`, o al final) que nace en la marca de su marioneta, con el narrador de ese personaje. */
export function nuevaLineaObra(
  p: ProyectoAbierto,
  quien: string,
  texto: string,
  durMedio: DuracionMedio,
  o: { emocion?: EmocionId; anim?: Exclude<PresetAnimacionId, 'vida'>; tras?: string } = {},
): { p: ProyectoAbierto; id: string } {
  const enOff = quien === EN_OFF
  const { p: conNarrador, narrador } = narradorPara(p, enOff ? undefined : quien)
  const dur = durLinea(texto)
  let clip: LineaObra
  if (enOff) {
    clip = { id: nuevoClipId(), pista: 'voz', inicio: 0, duracion: dur, texto: texto || undefined, volumen: 1, narradorId: narrador?.id }
  } else {
    const marca = marcaDe(p.clips, quien)
    const escena: EscenaActor = { ...marca }
    if (o.emocion) escena.emocion = o.emocion
    if (o.anim) escena.anim = o.anim
    clip = { ...clipPersonaje(quien, narrador?.id, 0, dur, marca), texto, modo: 'escena', escena }
  }
  const ids = lineasObra(p.clips).map((l) => l.id)
  const i = o.tras ? ids.indexOf(o.tras) : -1
  const orden = i >= 0 ? [...ids.slice(0, i + 1), clip.id, ...ids.slice(i + 1)] : [...ids, clip.id]
  return { p: { ...conNarrador, clips: encadenarObra([...conNarrador.clips, clip], durMedio, { orden }) }, id: clip.id }
}

/** Sube o baja una línea un puesto y reencadena. */
export function moverLineaObra(clips: ClipVideo[], id: string, delta: 1 | -1, durMedio: DuracionMedio): ClipVideo[] {
  const ids = lineasObra(clips).map((l) => l.id)
  const i = ids.indexOf(id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= ids.length) return clips
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  return encadenarObra(clips, durMedio, { orden: ids })
}

/**
 * La marca de una marioneta en TODAS sus líneas. `mirar`: null = a la cámara,
 * un actor = mirarse entre ellos, undefined = se conserva lo que tenía.
 */
export function aplicarMarca(clips: ClipVideo[], id: string, punto: { x: number; z: number }, mirar?: EscenaActor['mirar'] | null): ClipVideo[] {
  return clips.map((c) => {
    if (!esActorEscena(c) || c.asistenteId !== id) return c
    const escena: EscenaActor = { ...c.escena, x: punto.x, z: punto.z }
    if (mirar === null) delete escena.mirar
    else if (mirar !== undefined) escena.mirar = mirar
    return { ...c, escena }
  })
}
