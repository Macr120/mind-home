import type {
  CamaraPelicula,
  ClipAvatar,
  ClipPrincipal,
  ClipVideo,
  ClipVoz,
  MedioVideo,
  PistaId,
} from '../../core/data/db'
import type { AppStudio, RecursoStudio } from '../../core/recursosStudio'
import { DUR_DEFECTO, nuevoClipId } from './constantes'
import { encuadrePorEsquina, fin } from './modelo'
import { sonidoFabrica } from './sonidos'

/**
 * Cómo nace un clip a partir de un medio o de un sonido de fábrica. Lo
 * comparten el menú «Añadir», el toque en el panel de medios y el arrastre
 * del panel a una pista: una sola verdad para duraciones y valores iniciales.
 */

export type MedioConId = MedioVideo & { id: number }
export type ItemArrastre =
  | { tipo: 'medio'; medio: MedioConId }
  | { tipo: 'sonido'; clave: string }
  /** Sonido del usuario (audio de la carpeta «Sonidos»): a la pista de efectos, como los de fábrica. */
  | { tipo: 'efecto'; medio: MedioConId }
  /** Recurso de otra app del Studio: se materializa (copia o texto) al soltarlo o tocarlo. */
  | { tipo: 'recurso'; app: AppStudio; recurso: RecursoStudio }

/** Qué clase de contenido es el ítem, sin materializarlo. */
const tipoDe = (item: ItemArrastre): 'video' | 'imagen' | 'audio' | 'texto' | 'sonido' =>
  item.tipo === 'sonido' || item.tipo === 'efecto' ? 'sonido' : item.tipo === 'recurso' ? item.recurso.tipo : item.medio.tipo

/** La pista donde cae un ítem al TOCARLO (sin arrastrar). */
export function pistaPorDefecto(item: ItemArrastre): PistaId {
  switch (tipoDe(item)) {
    case 'sonido':
      return 'sfx'
    case 'audio':
      return 'musica'
    case 'texto':
      return 'voz'
    default:
      return 'video'
  }
}

/** Pistas que aceptan el ítem al arrastrarlo (la principal solo si aún caben clips en ella). */
export function pistasQueAceptan(item: ItemArrastre, topePrincipal: boolean): PistaId[] {
  let lista: PistaId[]
  switch (tipoDe(item)) {
    case 'sonido':
      lista = ['sfx']
      break
    case 'video':
      lista = ['video']
      break
    case 'imagen':
      lista = ['video', 'imagen', 'fondo']
      break
    case 'texto':
      lista = ['voz']
      break
    default:
      lista = ['musica', 'sfx', 'voz']
  }
  return topePrincipal ? lista.filter((p) => p !== 'video') : lista
}

/** Duración con la que nace el clip en cada pista (la misma que en el menú «Añadir»). */
export function duracionPorDefecto(item: ItemArrastre, pista: PistaId): number {
  if (item.tipo === 'sonido') return sonidoFabrica(item.clave)?.duracion ?? 1
  if (item.tipo === 'efecto') return item.medio.duracion || 1
  if (item.tipo === 'recurso') {
    const r = item.recurso
    if (r.tipo === 'texto') return r.duracion ?? DUR_DEFECTO.voz
    if (r.tipo === 'audio') return pista === 'musica' ? r.duracion || 30 : (r.duracion ?? 1)
    return pista === 'fondo' ? DUR_DEFECTO.fondo : pista === 'imagen' ? DUR_DEFECTO.pip : DUR_DEFECTO.imagen
  }
  const m = item.medio
  switch (pista) {
    case 'video':
      return m.tipo === 'video' ? Math.min(8, m.duracion || 4) : DUR_DEFECTO.imagen
    case 'fondo':
      return DUR_DEFECTO.fondo
    case 'imagen':
      return DUR_DEFECTO.pip
    case 'musica':
      return m.duracion || 30
    case 'sfx':
      return m.duracion ?? 1
    case 'voz':
      return m.duracion ?? DUR_DEFECTO.voz
    default:
      return DUR_DEFECTO.imagen
  }
}

/** Clip de la pista principal a partir de un video o una imagen. */
export function clipPrincipalDe(m: MedioConId): ClipPrincipal {
  return {
    id: nuevoClipId(),
    pista: 'video',
    inicio: 0,
    duracion: m.tipo === 'video' ? Math.min(8, m.duracion || 4) : DUR_DEFECTO.imagen,
    fuente: m.tipo === 'video' ? { tipo: 'video', medioId: m.id } : { tipo: 'imagen', medioId: m.id },
    filtro: 'ninguno',
    volumen: 1,
  }
}

/** Clip de una pista libre; `null` si el ítem no tiene sentido ahí (un video en «fondo», un audio en «imagen»…). */
export function clipLibreDe(
  item: ItemArrastre,
  pista: PistaId,
  inicio: number,
  duracion: number,
  /** El lienzo de la composición (para el encuadre del PIP). */
  lienzo: { ancho: number; alto: number },
): ClipVideo | null {
  const id = nuevoClipId()
  if (item.tipo === 'sonido') {
    return pista === 'sfx' ? { id, pista: 'sfx', inicio, duracion, fuente: { tipo: 'fabrica', clave: item.clave }, volumen: 1 } : null
  }
  if (item.tipo === 'efecto') {
    return pista === 'sfx' ? { id, pista: 'sfx', inicio, duracion, fuente: { tipo: 'medio', medioId: item.medio.id }, volumen: 1 } : null
  }
  if (item.tipo === 'recurso') return null // se materializa antes (ver `traerRecurso`)
  const m = item.medio
  switch (pista) {
    case 'fondo':
      return m.tipo === 'imagen' ? { id, pista: 'fondo', inicio, duracion, fuente: { tipo: 'imagen', medioId: m.id } } : null
    case 'imagen':
      return m.tipo === 'imagen'
        ? { id, pista: 'imagen', inicio, duracion, medioId: m.id, encuadre: encuadrePorEsquina('infDer', 'M', m, lienzo), opacidad: 1 }
        : null
    case 'musica':
      return m.tipo === 'audio' ? { id, pista: 'musica', inicio, duracion, medioId: m.id, volumen: 0.6, bucle: true } : null
    case 'sfx':
      return m.tipo === 'audio' ? { id, pista: 'sfx', inicio, duracion, fuente: { tipo: 'medio', medioId: m.id }, volumen: 1 } : null
    case 'voz':
      return m.tipo === 'audio' ? { id, pista: 'voz', inicio, duracion, medioId: m.id, desde: 0, volumen: 1 } : null
    default:
      return null
  }
}

/** Plano del modo película: la pista principal con la cámara capturada en ese momento. */
export function clipPlano(cam: CamaraPelicula): ClipPrincipal {
  return {
    id: nuevoClipId(),
    pista: 'video',
    inicio: 0,
    duracion: DUR_DEFECTO.plano,
    fuente: { tipo: 'escena3d', cam },
    filtro: 'ninguno',
    volumen: 0,
  }
}

/** Actor del modo película: un clip de avatar que vive en la casa 3D (esquina/tamaño/plano solo por el tipo). */
export function clipPersonaje(
  asistenteId: string,
  narradorId: string | undefined,
  inicio: number,
  duracion: number,
  escena: { x: number; z: number },
): ClipAvatar {
  return {
    id: nuevoClipId(),
    pista: 'avatar',
    inicio,
    duracion,
    asistenteId,
    narradorId,
    esquina: 'infDer',
    tamano: 'M',
    plano: 'cuerpo',
    texto: '',
    volumen: 1,
    modo: 'escena',
    escena: { x: escena.x, z: escena.z },
  }
}

/** Narración con el guion ya puesto (un texto traído del Studio de escritura): la voz se genera desde su panel. */
export function clipVozDeTexto(texto: string, inicio: number, duracion: number): ClipVoz {
  return { id: nuevoClipId(), pista: 'voz', inicio, duracion, texto, volumen: 1 }
}

/**
 * Dónde entra un clip nuevo en la pista principal (compacta) para un tiempo:
 * `cursor` = la regla de «Añadir» (si el cursor coincide con el inicio de un
 * clip va ANTES; si no, después del que lo contiene); `mitad` = la del
 * arrastre (antes o después del clip según la mitad en la que se suelta).
 */
export function indicePrincipalEn(main: ClipPrincipal[], seg: number, modo: 'cursor' | 'mitad'): number {
  const i = main.findIndex((c) => seg < fin(c))
  if (i < 0) return main.length
  const c = main[i]
  if (modo === 'cursor') return Math.abs(seg - c.inicio) < 1e-6 ? i : i + 1
  return seg < c.inicio + c.duracion / 2 ? i : i + 1
}
