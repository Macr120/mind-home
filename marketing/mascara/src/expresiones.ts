import type { Classifications } from '@mediapipe/tasks-vision'
import type { ExpresionId } from '../../../src/core/house/apariencia'

/**
 * El "cerebro" de la cara automática: convierte los blendshapes ARKit de
 * MediaPipe en (a) señales continuas para animar el rostro y (b) una expresión
 * discreta estable. Sin React: Escena lo llama por frame.
 */

/** Modo de la cara del personaje. */
export type ModoCara = 'estatico' | 'expresiones' | 'vivo'

/** Señales 0..1 que Escena ESCRIBE cada frame y RostroVivo LEE en su propio useFrame (nunca setState). */
export interface SenalesCara {
  /** eyeBlinkLeft (ojo izquierdo anatómico del usuario) → ojo del avatar en x=+sep. */
  parpadeoL: number
  parpadeoR: number
  /** Cuánto habla (ver `nivelBoca`): 0 = boca de la expresión, 1 = abierta al máximo. */
  boca: number
  /** Promedio mouthSmile: curva la boca hablante. */
  sonrisa: number
  /** browInnerUp: alza las cejas en vivo. */
  cejas: number
}

export function senalesIniciales(): SenalesCara {
  return { parpadeoL: 0, parpadeoR: 0, boca: 0, sonrisa: 0, cejas: 0 }
}

// ─── Umbrales de entrada (calibrar aquí; la expresión actual los baja HISTERESIS) ───
const HISTERESIS = 0.1
const U_PARPADEO_BILATERAL = 0.5
const U_GUINO_CERRADO = 0.6
const U_GUINO_ABIERTO = 0.3
const U_SORPRESA_CEJAS = 0.5
const U_SORPRESA_OJOS = 0.25
const U_SORPRESA_BOCA = 0.6
const U_ENOJADO_CEJAS = 0.5
const U_ENOJADO_SQUINT = 0.4
const U_ENOJADO_FROWN = 0.3
const U_SERIO_CEJAS = 0.35
const U_FELIZ = 0.6
const U_SONRISA = 0.25
const U_TRISTE = 0.35
const U_TERNURA = 0.6
/** Frames estables antes de comprometer el cambio (~30 fps). */
const N_GUINO = 9
const N_NEUTRAL = 12
const N_CAMBIO = 6

/**
 * Cuánto se abre la boca al HABLAR (0..1). `jawOpen` a secas se queda corta: al
 * conversar la mandíbula apenas baja (0.05-0.2) y la boca del avatar no llegaba
 * a abrirse. Se amplifica, y se le suman las vocales redondas (o/u), que casi no
 * bajan la mandíbula pero sí ahuecan los labios.
 */
export function nivelBoca(b: Record<string, number>): number {
  const redondas = Math.max(b.mouthFunnel ?? 0, b.mouthPucker ?? 0)
  return Math.min(1, (b.jawOpen ?? 0) * 1.8 + redondas * 0.5)
}

/** Puntuaciones por nombre de categoría ARKit. */
export function puntuaciones(blend: Classifications): Record<string, number> {
  const b: Record<string, number> = {}
  for (const c of blend.categories) b[c.categoryName] = c.score
  return b
}

/** Candidato instantáneo por prioridad (null = congelar el del frame anterior). */
function candidatoDe(b: Record<string, number>, modoVivo: boolean, actual: ExpresionId): ExpresionId | null {
  // El margen Schmitt: mientras una expresión ya es la actual, entra más fácil.
  const u = (umbral: number, exp: ExpresionId) => umbral - (actual === exp ? HISTERESIS : 0)
  const sonrisa = ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2
  const cejasAbajo = ((b.browDownLeft ?? 0) + (b.browDownRight ?? 0)) / 2
  const frown = ((b.mouthFrownLeft ?? 0) + (b.mouthFrownRight ?? 0)) / 2
  const squint = ((b.eyeSquintLeft ?? 0) + (b.eyeSquintRight ?? 0)) / 2
  const wide = ((b.eyeWideLeft ?? 0) + (b.eyeWideRight ?? 0)) / 2
  const blinkL = b.eyeBlinkLeft ?? 0
  const blinkR = b.eyeBlinkRight ?? 0

  // Un parpadeo normal (bilateral) jamás altera nada.
  if (blinkL >= U_PARPADEO_BILATERAL && blinkR >= U_PARPADEO_BILATERAL) return null
  const cerrado = u(U_GUINO_CERRADO, 'guino')
  if ((blinkL >= cerrado && blinkR <= U_GUINO_ABIERTO) || (blinkR >= cerrado && blinkL <= U_GUINO_ABIERTO)) return 'guino'
  if (
    ((b.browInnerUp ?? 0) >= u(U_SORPRESA_CEJAS, 'sorpresa') && wide >= U_SORPRESA_OJOS) ||
    // Hablando en modo vivo la mandíbula abierta NO es sorpresa (la anima la boca).
    (!modoVivo && (b.jawOpen ?? 0) >= u(U_SORPRESA_BOCA, 'sorpresa'))
  )
    return 'sorpresa'
  if (cejasAbajo >= u(U_ENOJADO_CEJAS, 'enojado') && sonrisa < 0.3 && (squint >= U_ENOJADO_SQUINT || frown >= U_ENOJADO_FROWN))
    return 'enojado'
  if (cejasAbajo >= u(U_SERIO_CEJAS, 'serio') && sonrisa < 0.3) return 'serio'
  if (sonrisa >= u(U_FELIZ, 'feliz')) return 'feliz'
  if (sonrisa >= u(U_SONRISA, 'sonrisa')) return 'sonrisa'
  if (frown >= u(U_TRISTE, 'triste') && sonrisa < 0.2) return 'triste'
  if ((b.mouthPucker ?? 0) >= u(U_TERNURA, 'ternura')) return 'ternura'
  return 'neutral'
}

/**
 * Clasificador con anti-flicker: solo compromete un cambio cuando el candidato
 * se sostiene N frames (el guiño exige ~300 ms — la fase asimétrica de un
 * parpadeo natural dura 1-2 frames y no llega).
 */
export function crearClasificador() {
  let actual: ExpresionId = 'neutral'
  let candidato: ExpresionId = 'neutral'
  let frames = 0
  return {
    paso(blend: Classifications, modoVivo: boolean): ExpresionId {
      const c = candidatoDe(puntuaciones(blend), modoVivo, actual)
      if (c === null) return actual
      if (c === candidato) frames++
      else {
        candidato = c
        frames = 1
      }
      const n = c === 'guino' ? N_GUINO : c === 'neutral' ? N_NEUTRAL : N_CAMBIO
      if (candidato !== actual && frames >= n) actual = candidato
      return actual
    },
    reiniciar() {
      actual = 'neutral'
      candidato = 'neutral'
      frames = 0
    },
  }
}
