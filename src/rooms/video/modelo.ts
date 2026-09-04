import type {
  ClipAvatar,
  ClipDe,
  ClipMusica,
  ClipPrincipal,
  ClipSfx,
  ClipVideo,
  ClipVoz,
  Encuadre,
  EscenaVideo,
  EsquinaAvatar,
  MedioVideo,
  NarradorVideo,
  PistaId,
  ProyectoVideo,
  Transicion,
} from '../../core/data/db'
import {
  DUR_FUNDIDO,
  DUR_TRANSICION,
  ENVOLVENTE_HZ,
  MAX_ESCENA,
  MIN_CLIP,
  MIN_ESCENA,
  nuevaEscenaId,
  nuevoClipId,
  ORDEN_PISTAS,
  TAMANOS_PIP,
} from './constantes'
import { sonidoFabrica } from './sonidos'

/**
 * Utilidades puras del modelo multipista (las comparten timeline, panel, motor,
 * render e IA). Tiempos en segundos absolutos del proyecto, a centésimas. La
 * pista principal (`video`) es COMPACTA: `normalizar` la re-empaqueta desde 0 y
 * las demás pistas son absolutas y no se desplazan (como CapCut).
 */

export type ProyectoAbierto = ProyectoVideo & { clips: ClipVideo[] }
/** Duración conocida de un medio (`MedioVideo.duracion`), o undefined. */
export type DuracionMedio = (medioId: number) => number | undefined

export const fin = (c: ClipVideo) => c.inicio + c.duracion
export const redondear = (s: number) => Math.round(s * 100) / 100

export function clipsDe<P extends PistaId>(clips: ClipVideo[], pista: P): ClipDe<P>[] {
  return (clips.filter((c) => c.pista === pista) as ClipDe<P>[]).sort((a, b) => a.inicio - b.inicio)
}

/** Fin del último clip de CUALQUIER pista (0 sin clips). */
export function duracionTotal(clips: ClipVideo[]): number {
  let m = 0
  for (const c of clips) m = Math.max(m, fin(c))
  return redondear(m)
}

export function finPrincipal(clips: ClipVideo[]): number {
  let m = 0
  for (const c of clips) if (c.pista === 'video') m = Math.max(m, fin(c))
  return redondear(m)
}

/** Duración de un proyecto en cualquier formato (migra en memoria si hace falta). */
export function duracionProyecto(p: ProyectoVideo): number {
  return duracionTotal(migrarProyecto(p, () => undefined).proyecto.clips)
}

export function clipsActivos(clips: ClipVideo[], t: number): ClipVideo[] {
  return clips.filter((c) => t >= c.inicio && t < fin(c))
}

export function pistasConClips(clips: ClipVideo[]): PistaId[] {
  const s = new Set(clips.map((c) => c.pista))
  return ORDEN_PISTAS.filter((p) => s.has(p))
}

export function esClipAudio(c: ClipVideo): c is ClipVoz | ClipMusica | ClipSfx | ClipAvatar {
  return c.pista === 'voz' || c.pista === 'musica' || c.pista === 'sfx' || c.pista === 'avatar'
}

/** Medio (fila de `mediosVideo`) que referencia el clip, si lo hay. */
export function medioIdDe(c: ClipVideo): number | undefined {
  switch (c.pista) {
    case 'video':
    case 'fondo':
      return c.fuente.tipo === 'color' || c.fuente.tipo === 'escena3d' ? undefined : c.fuente.medioId
    case 'imagen':
    case 'musica':
    case 'voz':
    case 'avatar':
      return c.medioId
    case 'sfx':
      return c.fuente.tipo === 'medio' ? c.fuente.medioId : undefined
    default:
      return undefined
  }
}

/** ¿El clip recorre un medio con tiempo (video o audio)? Entonces `desde` cuenta. */
export function tieneMedioTemporal(c: ClipVideo): boolean {
  if (c.pista === 'video') return c.fuente.tipo === 'video'
  if (c.pista === 'sfx' || c.pista === 'musica') return true
  if (c.pista === 'voz' || c.pista === 'avatar') return c.medioId != null
  return false
}

export function silenciada(p: ProyectoVideo, pista: PistaId): boolean {
  return p.pistasSilenciadas?.includes(pista) ?? false
}

/** Pistas cuyos clips pueden solapar: sonidos, y avatares (hasta dos personajes en pantalla a la vez). */
export const permiteSolape = (pista: PistaId): boolean => pista === 'sfx' || pista === 'avatar'

// ─── Narradores ──────────────────────────────────────────────────────────────

export type ClipNarracion = ClipVoz | ClipAvatar
export const esClipNarracion = (c: ClipVideo): c is ClipNarracion => c.pista === 'voz' || c.pista === 'avatar'

/** El narrador de una línea (`proyecto.narradores`), si sigue existiendo. */
export function narradorDe(p: ProyectoVideo, c: ClipNarracion): NarradorVideo | undefined {
  return c.narradorId ? p.narradores?.find((n) => n.id === c.narradorId) : undefined
}

/** Voz IA con la que se genera una línea: la de su narrador, la propia del clip de voz, o la del proyecto. */
export function vozEfectiva(p: ProyectoVideo, c: ClipNarracion): string | undefined {
  return narradorDe(p, c)?.voz ?? (c.pista === 'voz' ? c.voz : undefined) ?? p.vozNarrador
}

/** Las líneas del guion: clips de voz y de avatar con texto, en orden. */
export function lineasNarracion(clips: ClipVideo[]): ClipNarracion[] {
  return clips.filter((c): c is ClipNarracion => esClipNarracion(c) && !!c.texto?.trim()).sort((a, b) => a.inicio - b.inicio)
}

/** Esquina para un personaje: la opuesta a la de otro avatar que coincida en el tiempo (dos en pantalla, uno a cada lado). */
function esquinaLibre(clips: ClipVideo[], c: ClipVideo, asistenteId: string): EsquinaAvatar {
  const ocupadas = new Set(
    clipsDe(clips, 'avatar')
      .filter((k) => k.id !== c.id && k.asistenteId !== asistenteId && k.inicio < fin(c) && fin(k) > c.inicio)
      .map((k) => k.esquina),
  )
  return ocupadas.has('infDer') && !ocupadas.has('infIzq') ? 'infIzq' : 'infDer'
}

/**
 * Cambia quién dice una línea. Con personaje la línea vive en la pista avatar
 * (aparece hablando); sin él, en la de voz. El clip conserva id, tiempo, texto
 * y audio; la envolvente de la boca la calcula el Editor cuando ya hay audio.
 * `escena` (modo película) = el punto del mapa donde nace el actor: la línea
 * va a la casa 3D en vez de al PIP (un actor ya colocado conserva su punto).
 */
export function asignarNarrador(clips: ClipVideo[], id: string, n: NarradorVideo, escena?: { x: number; z: number }): ClipVideo[] {
  const c = clips.find((x) => x.id === id)
  if (!c || !esClipNarracion(c)) return clips
  let nuevo: ClipNarracion
  if (n.asistenteId) {
    const actor = escena ? { modo: 'escena' as const, escena: c.pista === 'avatar' && c.escena ? c.escena : escena } : {}
    nuevo =
      c.pista === 'avatar'
        ? { ...c, asistenteId: n.asistenteId, narradorId: n.id, ...actor }
        : {
            id: c.id,
            pista: 'avatar',
            inicio: c.inicio,
            duracion: c.duracion,
            desde: c.desde,
            asistenteId: n.asistenteId,
            esquina: esquinaLibre(clips, c, n.asistenteId),
            tamano: 'M',
            plano: 'busto',
            texto: c.texto ?? '',
            medioId: c.medioId,
            volumen: c.volumen,
            narradorId: n.id,
            ...actor,
          }
  } else {
    nuevo =
      c.pista === 'voz'
        ? { ...c, narradorId: n.id }
        : {
            id: c.id,
            pista: 'voz',
            inicio: c.inicio,
            duracion: c.duracion,
            desde: c.desde,
            medioId: c.medioId,
            texto: c.texto || undefined,
            volumen: c.volumen,
            narradorId: n.id,
          }
  }
  const lista = clips.map((x) => (x.id === id ? nuevo : x))
  // La pista de voz no solapa: una línea que baja del avatar se empuja al hueco más cercano.
  return nuevo.pista === 'voz' && c.pista === 'avatar' ? moverClip(lista, id, nuevo.inicio) : normalizar(lista)
}

/** Asistentes que actúan en la casa (modo película): los de los clips de actor y los narradores con personaje; sin el jugador. */
export function actoresDe(p: ProyectoVideo & { clips: ClipVideo[] }): string[] {
  const ids = new Set<string>()
  for (const c of p.clips) if (c.pista === 'avatar' && c.modo === 'escena') ids.add(c.asistenteId)
  for (const n of p.narradores ?? []) if (n.asistenteId) ids.add(n.asistenteId)
  ids.delete('jugador')
  return [...ids].sort()
}

/** Quita la referencia a un narrador borrado (los clips se quedan donde están). */
export function sinNarrador(clips: ClipVideo[], narradorId: string): ClipVideo[] {
  return clips.map((c) => (esClipNarracion(c) && c.narradorId === narradorId ? { ...c, narradorId: undefined } : c))
}

export const necesitaSaliente = (tr: Transicion | null | undefined): boolean =>
  !!tr && tr.tipo !== 'corte' && tr.tipo !== 'fundido'

/** Duración efectiva de la transición de entrada de `clip` (acotada a la mitad del más corto). */
export function durTransicionDe(
  tr: Transicion | null | undefined,
  clip: ClipPrincipal,
  anterior: ClipPrincipal | null,
): number {
  if (!tr || tr.tipo === 'corte') return 0
  const base = tr.duracion ?? (tr.tipo === 'fundido' ? DUR_FUNDIDO : DUR_TRANSICION)
  return Math.min(base, clip.duracion / 2, anterior ? anterior.duracion / 2 : Infinity)
}

export interface PosPrincipal {
  clip: ClipPrincipal
  tLocal: number
  /** La de entrada de `clip` (null en el primero salvo fundido, o si es corte). */
  transicion: Transicion | null
  durTransicion: number
  /** Progreso 0–1 (1 = terminada). */
  p: number
  /** Anterior contiguo mientras p < 1 y la transición necesita dos frames. */
  saliente: ClipPrincipal | null
  anterior: ClipPrincipal | null
  siguiente: ClipPrincipal | null
}

/** Tiempo global → clip principal activo, su tiempo local y el estado de su transición de entrada. */
export function principalEn(clips: ClipVideo[], t: number): PosPrincipal | null {
  const main = clipsDe(clips, 'video')
  if (main.length === 0) return null
  const i = main.findIndex((c) => t >= c.inicio && t < fin(c))
  if (i < 0) {
    // Frame final congelado solo EN el fin (t acotado al total); pasada la pista, negro/fondo.
    const u = main[main.length - 1]
    if (t >= fin(u) && t - fin(u) <= 0.05) {
      return { clip: u, tLocal: u.duracion, transicion: null, durTransicion: 0, p: 1, saliente: null, anterior: main[main.length - 2] ?? null, siguiente: null }
    }
    return null
  }
  const clip = main[i]
  const anterior = main[i - 1] ?? null
  const tLocal = t - clip.inicio
  let tr: Transicion | null = clip.transicion ?? null
  if (tr && tr.tipo === 'corte') tr = null
  if (tr && !anterior && tr.tipo !== 'fundido') tr = null // el primero solo funde desde negro
  if (tr && anterior && Math.abs(fin(anterior) - clip.inicio) > 0.01) tr = null // defensivo: no contiguos
  const dur = durTransicionDe(tr, clip, anterior)
  const p = tr && dur > 0 ? Math.min(1, tLocal / dur) : 1
  return {
    clip,
    tLocal,
    transicion: tr,
    durTransicion: dur,
    p,
    saliente: necesitaSaliente(tr) && p < 1 ? anterior : null,
    anterior,
    siguiente: main[i + 1] ?? null,
  }
}

/** Compacta la pista principal desde 0 (las demás pistas NO se desplazan). */
export function compactarPrincipal(clips: ClipVideo[]): ClipVideo[] {
  const main = clipsDe(clips, 'video')
  let t = 0
  const nuevo = new Map<string, number>()
  for (const c of main) {
    nuevo.set(c.id, t)
    t = redondear(t + c.duracion)
  }
  return clips.map((c) => (c.pista === 'video' && nuevo.get(c.id) !== c.inicio ? { ...c, inicio: nuevo.get(c.id)! } : c))
}

/** Compacta, redondea y ordena por (ORDEN_PISTAS, inicio). Todo mutador termina aquí. */
export function normalizar(clips: ClipVideo[]): ClipVideo[] {
  const orden = new Map(ORDEN_PISTAS.map((p, i) => [p, i] as const))
  return compactarPrincipal(clips)
    .map((c) => ({ ...c, inicio: redondear(Math.max(0, c.inicio)), duracion: redondear(Math.max(MIN_CLIP, c.duracion)) }))
    .sort((a, b) => (orden.get(a.pista) ?? 0) - (orden.get(b.pista) ?? 0) || a.inicio - b.inicio)
}

/** Inserta un clip en la pista principal en la posición `indice` (fuera de rango = al final). */
export function insertarPrincipal(clips: ClipVideo[], clip: ClipPrincipal, indice: number): ClipVideo[] {
  const main = clipsDe(clips, 'video')
  const ref = main[indice]
  if (!ref) return normalizar([...clips, { ...clip, inicio: finPrincipal(clips) }])
  // Mismo `inicio` que la referencia y ANTES en el arreglo: el orden estable lo deja delante al compactar.
  const pos = clips.findIndex((c) => c.id === ref.id)
  const lista = [...clips]
  lista.splice(pos, 0, { ...clip, inicio: ref.inicio })
  return normalizar(lista)
}

/** Reordena la pista principal según `ordenIds` (los que falten van al final, en su orden). */
export function reordenarPrincipal(clips: ClipVideo[], ordenIds: string[]): ClipVideo[] {
  const porId = new Map(clipsDe(clips, 'video').map((c) => [c.id, c]))
  let t = 0
  const inicio = new Map<string, number>()
  const colocar = (c: ClipPrincipal) => {
    inicio.set(c.id, t)
    t = redondear(t + c.duracion)
  }
  for (const id of ordenIds) {
    const c = porId.get(id)
    if (c && !inicio.has(id)) colocar(c)
  }
  for (const c of porId.values()) if (!inicio.has(c.id)) colocar(c)
  return normalizar(clips.map((c) => (c.pista === 'video' ? { ...c, inicio: inicio.get(c.id)! } : c)))
}

/** Sube/baja un clip principal `delta` puestos (botones del guion). */
export function moverPrincipalEnOrden(clips: ClipVideo[], id: string, delta: number): ClipVideo[] {
  const orden = clipsDe(clips, 'video').map((c) => c.id)
  const i = orden.indexOf(id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= orden.length) return clips
  orden.splice(i, 1)
  orden.splice(j, 0, id)
  return reordenarPrincipal(clips, orden)
}

/** Parte un clip en `t`: la mitad izquierda conserva id y transición; la derecha avanza `desde` si hay medio con tiempo. */
export function dividirClip(clips: ClipVideo[], id: string, t: number): ClipVideo[] {
  const c = clips.find((x) => x.id === id)
  if (!c) return clips
  if (t - c.inicio < MIN_CLIP || fin(c) - t < MIN_CLIP) return clips
  const corte = redondear(t - c.inicio)
  const a: ClipVideo = { ...c, duracion: corte }
  const b: ClipVideo = {
    ...c,
    id: nuevoClipId(),
    inicio: redondear(c.inicio + corte),
    duracion: redondear(c.duracion - corte),
    desde: tieneMedioTemporal(c) ? redondear((c.desde ?? 0) + corte) : c.desde,
  }
  if (b.pista === 'video') delete b.transicion // la entrada de B es corte
  const i = clips.indexOf(c)
  return normalizar([...clips.slice(0, i), a, b, ...clips.slice(i + 1)])
}

/** Hueco libre alrededor del clip en su pista: [fin del vecino izquierdo, inicio del derecho]. Las que solapan y la principal no acotan. */
export function huecoDe(clips: ClipVideo[], clip: ClipVideo): { min: number; max: number } {
  if (permiteSolape(clip.pista) || clip.pista === 'video') return { min: 0, max: Infinity }
  let min = 0
  let max = Infinity
  for (const k of clips) {
    if (k.id === clip.id || k.pista !== clip.pista) continue
    if (fin(k) <= clip.inicio + 1e-6) min = Math.max(min, fin(k))
    else if (k.inicio >= fin(clip) - 1e-6) max = Math.min(max, k.inicio)
  }
  return { min, max }
}

/**
 * Recorta por un lado hasta el borde (segundos absolutos). Por la izquierda
 * mueve `inicio` y `desde`; por la derecha acota al medio (salvo música en
 * bucle) y al hueco. La principal se compacta después (ripple).
 */
export function recortarClip(
  clips: ClipVideo[],
  id: string,
  lado: 'ini' | 'fin',
  borde: number,
  durMedio?: number,
): ClipVideo[] {
  const c = clips.find((x) => x.id === id)
  if (!c) return clips
  const temporal = tieneMedioTemporal(c)
  const desde = c.desde ?? 0
  const bucle = c.pista === 'musica' && c.bucle
  const hueco = huecoDe(clips, c)
  let nuevo: ClipVideo
  if (lado === 'ini') {
    const minDelta = Math.max(hueco.min - c.inicio, temporal && !bucle ? -desde : -Infinity, -c.inicio)
    const delta = Math.max(minDelta, Math.min(c.duracion - MIN_CLIP, borde - c.inicio))
    nuevo = {
      ...c,
      inicio: redondear(c.inicio + delta),
      duracion: redondear(c.duracion - delta),
      desde: temporal ? redondear(Math.max(0, desde + delta)) : c.desde,
    }
  } else {
    const tope = Math.min(
      hueco.max - c.inicio,
      temporal && durMedio && !bucle ? durMedio - desde : Infinity,
      c.pista === 'video' ? MAX_ESCENA : Infinity,
    )
    nuevo = { ...c, duracion: redondear(Math.max(MIN_CLIP, Math.min(tope, borde - c.inicio))) }
  }
  return normalizar(clips.map((x) => (x.id === id ? nuevo : x)))
}

export interface OpcionesIman {
  playhead: number
  /** Segundos (= IMAN_PX / pxPorSeg). */
  umbral: number
}

/** Bordes a los que se pega un clip: 0, el cursor, el fin del video y los bordes de TODOS los demás clips. */
export function puntosIman(clips: ClipVideo[], excepto: string, playhead: number): number[] {
  const puntos = [0, playhead, duracionTotal(clips)]
  for (const k of clips) if (k.id !== excepto) puntos.push(k.inicio, fin(k))
  return puntos
}

/** Desplazamiento (s) que pega el borde más cercano a un candidato dentro del umbral; 0 si ninguno. */
export function imantar(bordes: number[], candidatos: number[], umbral: number): number {
  let mejor = 0
  let dist = umbral
  for (const b of bordes) {
    for (const c of candidatos) {
      const d = c - b
      if (Math.abs(d) < dist) {
        dist = Math.abs(d)
        mejor = d
      }
    }
  }
  return mejor
}

/** Empuja `inicio` contra los vecinos de la misma pista; si no cabe en ningún hueco, se queda donde estaba. */
function evitarSolape(clips: ClipVideo[], c: ClipVideo, inicio: number): number {
  const otros = clipsDe(clips, c.pista).filter((k) => k.id !== c.id)
  const cabe = (ini: number) => otros.every((k) => ini + c.duracion <= k.inicio + 1e-6 || ini >= fin(k) - 1e-6)
  if (cabe(inicio)) return inicio
  const validos: number[] = []
  for (const k of otros) for (const x of [fin(k), k.inicio - c.duracion]) if (x >= 0 && cabe(x)) validos.push(x)
  if (validos.length === 0) return c.inicio
  return validos.reduce((a, b) => (Math.abs(b - inicio) < Math.abs(a - inicio) ? b : a))
}

/** Mueve un clip: la principal reordena por el centro; las libres imantan y evitan solapes (sfx y avatar pueden solapar). */
export function moverClip(clips: ClipVideo[], id: string, inicioDeseado: number, iman?: OpcionesIman): ClipVideo[] {
  const c = clips.find((x) => x.id === id)
  if (!c) return clips
  if (c.pista === 'video') {
    const centro = inicioDeseado + c.duracion / 2
    const otros = clipsDe(clips, 'video').filter((k) => k.id !== id)
    let idx = 0
    for (const k of otros) if (k.inicio + k.duracion / 2 < centro) idx++
    const orden = otros.map((k) => k.id)
    orden.splice(idx, 0, id)
    return reordenarPrincipal(clips, orden)
  }
  let inicio = inicioDeseado
  if (iman) inicio += imantar([inicio, inicio + c.duracion], puntosIman(clips, id, iman.playhead), iman.umbral)
  inicio = Math.max(0, redondear(inicio))
  if (!permiteSolape(c.pista)) inicio = evitarSolape(clips, c, inicio)
  return normalizar(clips.map((x) => (x.id === id ? { ...x, inicio: redondear(inicio) } : x)))
}

/** Copia con id nuevo (elemento `<audio>` propio) pegada detrás del original. */
export function duplicarClip(clips: ClipVideo[], id: string): ClipVideo[] {
  const c = clips.find((x) => x.id === id)
  if (!c) return clips
  const copia: ClipVideo = { ...c, id: nuevoClipId() }
  if (c.pista === 'video') {
    const i = clips.indexOf(c)
    const lista = [...clips]
    lista.splice(i + 1, 0, copia) // mismo inicio y detrás en el arreglo: compacta justo después
    return normalizar(lista)
  }
  const inicio = permiteSolape(c.pista) ? fin(c) : evitarSolape(clips, copia, fin(c))
  return normalizar([...clips, { ...copia, inicio }])
}

/** Dónde cae un clip nuevo de `dur` segundos en el cursor sin solapar en su pista. */
export function colocarEnHueco(
  clipsPista: ClipVideo[],
  t: number,
  dur: number,
  solapa: boolean,
): { inicio: number; duracion: number; alFinal: boolean } {
  const inicio0 = Math.max(0, redondear(t))
  if (solapa) return { inicio: inicio0, duracion: dur, alFinal: false }
  const orden = [...clipsPista].sort((a, b) => a.inicio - b.inicio)
  const dentro = orden.find((c) => c.inicio <= inicio0 && inicio0 < fin(c))
  const inicio = dentro ? fin(dentro) : inicio0
  const siguiente = orden.find((c) => c.inicio >= inicio)
  const hueco = siguiente ? siguiente.inicio - inicio : Infinity
  if (hueco >= dur) return { inicio, duracion: dur, alFinal: false }
  if (hueco >= MIN_CLIP) return { inicio, duracion: redondear(hueco), alFinal: false }
  return { inicio: duracionTotal(orden), duracion: dur, alFinal: true }
}

/** Ids de medio que un proyecto referencia, en cualquiera de los dos formatos. */
export function mediosUsados(p: ProyectoVideo): Set<number> {
  const ids = new Set<number>()
  for (const c of p.clips ?? []) {
    const m = medioIdDe(c)
    if (m != null) ids.add(m)
  }
  for (const e of p.escenas) {
    if (e.fondo.tipo !== 'color') ids.add(e.fondo.medioId)
    if (e.narracionId != null) ids.add(e.narracionId)
    for (const s of e.sonidos ?? []) if (s.fuente.tipo === 'medio') ids.add(s.fuente.medioId)
  }
  if (p.musica) ids.add(p.musica.medioId)
  return ids
}

/** Apertura de boca 0–1 del avatar en su tiempo relativo (la envolvente es del audio completo: se indexa con `desde`). */
export function aperturaBoca(clip: ClipAvatar, tRel: number): number {
  if (!clip.envolvente || clip.medioId == null) return 0
  const hz = clip.envolventeHz ?? ENVOLVENTE_HZ
  const i = Math.floor(((clip.desde ?? 0) + tRel) * hz)
  return clip.envolvente[i] ?? 0
}

/** Encuadre de una imagen superpuesta por esquina y tamaño (fracciones del lienzo, aspecto real del medio). */
export function encuadrePorEsquina(
  esquina: EsquinaAvatar,
  tamano: 'S' | 'M' | 'L',
  medio: { ancho?: number; alto?: number } | undefined,
  /** El lienzo de la composición (`RESOLUCIONES[aspecto]`, o la pantalla en el modo película): decide la proporción del PIP. */
  lienzo: { ancho: number; alto: number },
): Encuadre {
  const { ancho: W, alto: H } = lienzo
  const mw = medio?.ancho || 16
  const mh = medio?.alto || 9
  const ancho = TAMANOS_PIP[tamano]
  const alto = Math.min(0.9, ancho * (mh / mw) * (W / H))
  const m = 0.04
  const x = esquina === 'supIzq' || esquina === 'infIzq' ? m : esquina === 'centro' ? (1 - ancho) / 2 : 1 - m - ancho
  const y = esquina === 'supIzq' || esquina === 'supDer' ? m : esquina === 'centro' ? (1 - alto) / 2 : 1 - m - alto
  return { x: redondear(x), y: redondear(y), ancho: redondear(ancho), alto: redondear(alto) }
}

/** Recorta los solapes de una pista (el clip anterior termina donde empieza el siguiente). */
function recortarSolapes(clips: ClipVideo[], pista: PistaId): ClipVideo[] {
  const lista = clipsDe(clips, pista)
  const recortes = new Map<string, number>()
  for (let i = 0; i + 1 < lista.length; i++) {
    const a = lista[i]
    const b = lista[i + 1]
    if (fin(a) > b.inicio + 1e-6) recortes.set(a.id, Math.max(MIN_CLIP, redondear(b.inicio - a.inicio)))
  }
  if (recortes.size === 0) return clips
  return clips.map((c) => (recortes.has(c.id) ? { ...c, duracion: recortes.get(c.id)! } : c))
}

// ─── Formato 1 → formato 2 ───────────────────────────────────────────────────

/** Escenas (del formato 1 o del JSON de la IA) → clips compactos desde `t0`. Lo comparten migración e IA. */
export function escenasAClips(escenas: EscenaVideo[], t0: number, durMedio: DuracionMedio): ClipVideo[] {
  const clips: ClipVideo[] = []
  let t = t0
  for (const e of escenas) {
    clips.push({
      id: e.id,
      pista: 'video',
      inicio: t,
      duracion: e.duracion,
      fuente: e.fondo.tipo === 'video' ? { tipo: 'video', medioId: e.fondo.medioId } : e.fondo,
      desde: e.fondo.tipo === 'video' ? e.fondo.desde : undefined,
      filtro: e.filtro,
      volumen: e.volumen,
      transicion: e.transicion === 'fundido' ? { tipo: 'fundido' } : undefined,
    })
    if (e.texto?.contenido.trim()) {
      const desde = Math.max(0, e.texto.desde ?? 0)
      const hasta =
        e.texto.hasta != null && e.texto.hasta > desde ? Math.min(e.texto.hasta, e.duracion) : e.duracion
      if (hasta - desde >= MIN_CLIP) {
        const { desde: _d, hasta: _h, ...estilo } = e.texto
        clips.push({ id: `${e.id}-txt`, pista: 'texto', inicio: redondear(t + desde), duracion: redondear(hasta - desde), texto: estilo })
      }
    }
    if (e.narracionId != null || e.guionNarracion) {
      const dur = e.narracionId != null ? (durMedio(e.narracionId) ?? e.duracion) : e.duracion
      clips.push({
        id: `${e.id}-voz`,
        pista: 'voz',
        inicio: t,
        duracion: redondear(Math.max(MIN_CLIP, dur)),
        medioId: e.narracionId,
        texto: e.guionNarracion,
        voz: e.voz,
        volumen: 1,
      })
    }
    for (const s of e.sonidos ?? []) {
      const dur =
        s.fuente.tipo === 'fabrica' ? (sonidoFabrica(s.fuente.clave)?.duracion ?? 1) : (durMedio(s.fuente.medioId) ?? 1)
      clips.push({ id: s.id, pista: 'sfx', inicio: redondear(t + s.en), duracion: redondear(Math.max(MIN_CLIP, dur)), fuente: s.fuente, volumen: s.volumen })
    }
    t = redondear(t + e.duracion)
  }
  return recortarSolapes(clips, 'voz')
}

/**
 * Formato 1 → 2. Idempotente: si no hay nada que migrar devuelve la MISMA
 * referencia y `cambiado: false`. Escenas junto a `clips` (las escribió una app
 * vieja) se anexan al final de la pista principal.
 */
export function migrarProyecto(p: ProyectoVideo, durMedio: DuracionMedio): { proyecto: ProyectoAbierto; cambiado: boolean } {
  if (p.clips && p.escenas.length === 0 && !p.musica) return { proyecto: p as ProyectoAbierto, cambiado: false }
  const clips = [...(p.clips ?? [])]
  if (p.escenas.length > 0) clips.push(...escenasAClips(p.escenas, finPrincipal(clips), durMedio))
  if (p.musica && !clips.some((c) => c.pista === 'musica')) {
    const total = duracionTotal(clips)
    const dur = total > 0 ? total : (durMedio(p.musica.medioId) ?? 0)
    if (dur > 0) {
      clips.push({ id: `mus-${p.musica.medioId}`, pista: 'musica', inicio: 0, duracion: dur, medioId: p.musica.medioId, volumen: p.musica.volumen, bucle: true })
    }
  }
  return { proyecto: { ...p, clips: normalizar(clips), escenas: [], musica: undefined }, cambiado: true }
}

// ─── Legado (lo usa la IA para construir escenas antes de convertirlas) ──────

export function clampDuracion(v: number): number {
  return Math.max(MIN_ESCENA, Math.min(MAX_ESCENA, Math.round(v * 10) / 10))
}

export function nuevaEscena(fondo: EscenaVideo['fondo'], duracion = 4): EscenaVideo {
  return { id: nuevaEscenaId(), duracion: clampDuracion(duracion), fondo, transicion: 'corte', filtro: 'ninguno', volumen: 1 }
}

/** El guion como texto legible: SOLO contexto para «Rehacer con IA» (no hay parser de vuelta). `quien` nombra al narrador de cada línea. */
export function serializarGuion(p: ProyectoAbierto, medios: MedioVideo[], quien?: (c: ClipNarracion) => string | undefined): string {
  const nombreDe = new Map(medios.map((m) => [m.id, m.nombre]))
  const solapan = <P extends PistaId>(pista: P, c: ClipVideo) =>
    clipsDe(p.clips, pista).filter((k) => k.inicio < fin(c) && fin(k) > c.inicio)
  const lineas = clipsDe(p.clips, 'video').map((c, i) => {
    const f = c.fuente
    const fuente =
      f.tipo === 'color'
        ? `fondo ${f.color}`
        : f.tipo === 'escena3d'
          ? `plano 3D (${f.cam.vista}${f.camFin ? ', paneo' : ''})`
          : f.tipo === 'imagen'
            ? `imagen "${nombreDe.get(f.medioId) ?? '?'}"`
            : `video "${nombreDe.get(f.medioId) ?? '?'}" desde ${c.desde ?? 0}s`
    const textos = solapan('texto', c).map((k) => `texto ${k.texto.posicion} ${k.texto.tamano} "${k.texto.contenido}"`)
    const voces = [...solapan('voz', c), ...solapan('avatar', c)].flatMap((k) => {
      const tx = k.texto?.trim()
      if (!tx) return []
      const q = quien?.(k)
      return [`narración${q ? ` (${q})` : ''}: "${tx}"`]
    })
    const partes = [
      `${i + 1}. [${c.duracion}s] ${fuente}`,
      ...textos,
      c.transicion && c.transicion.tipo !== 'corte' ? c.transicion.tipo : '',
      c.filtro !== 'ninguno' ? `filtro ${c.filtro}` : '',
      ...voces,
    ]
    return partes.filter(Boolean).join(' · ')
  })
  const pistas: string[] = []
  for (const m of clipsDe(p.clips, 'musica')) pistas.push(`música "${nombreDe.get(m.medioId) ?? '?'}"${m.bucle ? ' en bucle' : ''}`)
  for (const a of clipsDe(p.clips, 'avatar')) pistas.push(`avatar dice "${a.texto}" (${a.inicio}s)`)
  for (const im of clipsDe(p.clips, 'imagen')) pistas.push(`imagen superpuesta "${nombreDe.get(im.medioId) ?? '?'}" (${im.inicio}s)`)
  if (pistas.length) lineas.push(`Pistas: ${pistas.join(' · ')}`)
  return lineas.join('\n')
}
