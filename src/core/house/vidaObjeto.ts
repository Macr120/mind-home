/**
 * Paseo de un objeto con el preset «Dale vida»: la máquina de estados de los
 * animales de la granja (`granja.tsx`), pero en coordenadas LOCALES al objeto y
 * dentro de un círculo en vez del rectángulo de un corral.
 *
 * Sin colisiones a propósito: `walls.ts` es la única fuente de geometría de
 * paredes y no quiero un segundo consumidor. El objeto atraviesa muros y
 * muebles; lo que lo mantiene en su sitio es un radio pequeño.
 */

/** Velocidad de paseo (u/s) con velocidad de animación 1. */
const VEL_VIDA = 0.5

/** Más allá de esta distancia al jugador, el paseo tickea a ~4 Hz en vez de cada frame. */
export const RADIO_VIVO_OBJETO = 14

/** Estado de paseo de un objeto vivo (vive en un `useRef` de su componente). */
export interface PaseoVida {
  x: number
  z: number
  tx: number
  tz: number
  /** Segundos que le quedan parado antes de elegir otro destino. */
  pausa: number
  heading: number
  /** Fase de zancada, para el rebote al andar. */
  fase: number
  /** Acumuladores del gate de distancia (LOD). */
  accDist: number
  lejos: boolean
  accTick: number
}

export function nuevoPaseoVida(radio: number): PaseoVida {
  const ang = Math.random() * Math.PI * 2
  const r = Math.random() * radio * 0.5
  return {
    x: Math.cos(ang) * r,
    z: Math.sin(ang) * r,
    tx: 0,
    tz: 0,
    pausa: Math.random() * 2,
    heading: Math.random() * Math.PI * 2,
    fase: Math.random() * 10,
    accDist: Math.random() * 0.5,
    lejos: false,
    accTick: 0,
  }
}

/**
 * Avanza el paseo un frame: destino aleatorio dentro del círculo → camina →
 * pausa de 1–4 s. Devuelve la altura del rebote al andar (0 parado).
 * `quieto` (con hambre) lo deja plantado sin tocar su rumbo.
 */
export function tickVida(s: PaseoVida, dt: number, radio: number, vel: number, quieto: boolean): number {
  const d = Math.min(dt, 0.1)
  if (!quieto) {
    if (s.pausa > 0) {
      s.pausa -= d
      if (s.pausa <= 0) {
        const ang = Math.random() * Math.PI * 2
        // sqrt: puntos repartidos por área, si no se apelotonan en el centro.
        const r = Math.sqrt(Math.random()) * radio
        s.tx = Math.cos(ang) * r
        s.tz = Math.sin(ang) * r
      }
    } else {
      const dx = s.tx - s.x
      const dz = s.tz - s.z
      const dist = Math.hypot(dx, dz)
      if (dist < 0.08) {
        s.pausa = 1 + Math.random() * 3
      } else {
        const v = VEL_VIDA * vel
        s.x += (dx / dist) * v * d
        s.z += (dz / dist) * v * d
        // Giro por el camino corto del ángulo.
        let delta = Math.atan2(dx, dz) - s.heading
        while (delta > Math.PI) delta -= Math.PI * 2
        while (delta < -Math.PI) delta += Math.PI * 2
        s.heading += delta * Math.min(1, d * 6)
        s.fase += d * v * 9
        return Math.abs(Math.sin(s.fase)) * 0.05
      }
    }
  }
  return 0
}

/**
 * Posición VIVA de cada objeto que deambula (mundo), mutada en sitio sin
 * re-render. La lee el detector de proximidad: medir contra la posición guardada
 * ofrecería los botones donde el objeto ya no está. Molde: `posAsistentes`.
 */
export const posObjetosVivos: Record<number, { x: number; z: number }> = {}
