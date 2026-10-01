import * as THREE from 'three'
import type { EscenarioId } from '../temas'

/**
 * Regreso al vehículo de un tema dinámico: cuando el personaje se cae al vacío o vuelve
 * a la cubierta desde el suelo o el agua, una animación guionizada lo sube (sin input).
 * `Character` la sigue con `posRescate` y `Rescate3D` dibuja la pieza de cada vehículo.
 */
export type TipoRescate = 'portal' | 'paracaidas' | 'tubo' | 'liana' | 'salvavidas' | 'escalera'

export const RESCATE_DE: Record<EscenarioId, TipoRescate> = {
  nave: 'portal',
  avion: 'paracaidas',
  rodante: 'tubo',
  tortuga: 'liana',
  barco: 'salvavidas',
  tren: 'escalera',
}

const DURACION: Record<TipoRescate, number> = {
  portal: 2.2,
  paracaidas: 4.2,
  tubo: 2.4,
  liana: 2.6,
  salvavidas: 4,
  escalera: 2.6,
}

let escenarioActivo: EscenarioId | null = null
/** Lo fija `EscenarioVivo` mientras el vehículo se ve. */
export function setEscenarioRescate(e: EscenarioId | null) {
  escenarioActivo = e
}
export const escenarioRescate = () => escenarioActivo

export const rescate = {
  activo: false,
  /** Sube con cada rescate: `Rescate3D` rehace sus piezas al cambiar. */
  id: 0,
  tipo: 'escalera' as TipoRescate,
  t0: 0,
  dur: 1,
  desde: new THREE.Vector3(),
  hasta: new THREE.Vector3(),
  /** Borde de la cubierta más cercano a `desde`, a la altura de la cubierta. */
  borde: new THREE.Vector3(),
  /** Punto de amarre de la liana / boca del tubo. */
  ancla: new THREE.Vector3(),
  curva: null as THREE.QuadraticBezierCurve3 | null,
  /** Rumbo (rotación Y) hacia la cubierta: el personaje mira al vehículo al subir. */
  rumbo: 0,
  /** Escala del avatar (el portal lo encoge al tragarlo y lo devuelve). */
  escala: 1,
}

export function iniciarRescate(tipo: TipoRescate, desde: THREE.Vector3, hasta: THREE.Vector3, borde: THREE.Vector3) {
  const r = rescate
  r.activo = true
  r.id++
  r.tipo = tipo
  r.t0 = performance.now()
  r.dur = DURACION[tipo]
  r.desde.copy(desde)
  r.hasta.copy(hasta)
  r.borde.copy(borde)
  r.rumbo = Math.atan2(hasta.x - desde.x, hasta.z - desde.z)
  r.escala = 1
  const alto = Math.max(desde.y, hasta.y)
  // Liana: cuelga de una rama algo adentro de la cubierta y alta en proporción a la caída
  // (la tortuga va muy alta); el arco pasa por debajo de ella.
  const hx = borde.x - desde.x
  const hz = borde.z - desde.z
  const hn = Math.hypot(hx, hz) || 1
  r.ancla.set(borde.x + (hx / hn) * 1.5, alto + Math.max(4.5, (hasta.y - desde.y) * 0.45), borde.z + (hz / hn) * 1.5)
  // Tubo: sale del vehículo, se arquea por encima y baja sobre el personaje.
  r.curva =
    tipo === 'tubo'
      ? new THREE.QuadraticBezierCurve3(
          desde.clone(),
          new THREE.Vector3((desde.x + hasta.x) / 2, alto + 4, (desde.z + hasta.z) / 2),
          hasta.clone(),
        )
      : null
}

/** Avance 0..1 del rescate en curso. */
export const progresoRescate = (ahora = performance.now()) =>
  Math.min(1, (ahora - rescate.t0) / (rescate.dur * 1000))

const suave = (x: number) => x * x * (3 - 2 * x)
const tramo = (p: number, a: number, b: number) => THREE.MathUtils.clamp((p - a) / (b - a), 0, 1)
const _a = new THREE.Vector3()

/**
 * Escribe en `out` la posición del personaje en el rescate. Devuelve false al terminar
 * (y apaga el rescate). Pone `rescate.escala` para el portal.
 */
export function posRescate(out: THREE.Vector3, ahora = performance.now()): boolean {
  const p = progresoRescate(ahora)
  puntoRescate(out, p)
  if (p >= 1) {
    out.copy(rescate.hasta)
    rescate.activo = false
    rescate.escala = 1
    return false
  }
  return true
}

/** Posición del personaje con avance `p` (pura: `Rescate3D` la usa para no ir un frame atrás). */
export function puntoRescate(out: THREE.Vector3, p: number) {
  const r = rescate
  const { desde: A, hasta: B, borde: E } = r
  r.escala = 1
  switch (r.tipo) {
    case 'portal': {
      // Cae en el portal de abajo (se encoge), sale por el de la cubierta (crece).
      if (p < 0.4) {
        const q = tramo(p, 0, 0.4)
        out.set(A.x, A.y - 2.6 * q * q, A.z)
        r.escala = 1 - suave(q)
      } else if (p < 0.55) {
        out.copy(B)
        r.escala = 0
      } else {
        const q = suave(tramo(p, 0.55, 0.85))
        out.set(B.x, B.y + 1.4 * (1 - q), B.z)
        r.escala = q
      }
      break
    }
    case 'paracaidas': {
      // Se abre el paracaídas, una corriente lo sube sobre el avión y baja planeando.
      const arriba = B.y + 7
      if (p < 0.12) {
        out.copy(A)
      } else if (p < 0.38) {
        const q = suave(tramo(p, 0.12, 0.38))
        out.set(THREE.MathUtils.lerp(A.x, B.x, q), THREE.MathUtils.lerp(A.y, arriba, q), THREE.MathUtils.lerp(A.z, B.z, q))
      } else {
        const q = tramo(p, 0.38, 1)
        const vaiven = Math.sin(q * Math.PI * 3) * 0.9 * (1 - q)
        out.set(B.x + vaiven, THREE.MathUtils.lerp(arriba, B.y, suave(q)), B.z + vaiven * 0.5)
      }
      break
    }
    case 'tubo': {
      // El tubo baja sobre el personaje y lo succiona hasta la cubierta.
      if (p < 0.25) out.copy(A)
      else r.curva!.getPoint(suave(tramo(p, 0.25, 1)), out)
      break
    }
    case 'liana': {
      // Agarra la liana y se columpia en arco hasta el borde; luego pisa la cubierta.
      // Dirección horizontal desde A hacia la cubierta.
      _a.set(B.x - A.x, 0, B.z - A.z).normalize()
      if (p < 0.15) {
        out.copy(A)
      } else if (p < 0.8) {
        const q = suave(tramo(p, 0.15, 0.8))
        const C = r.ancla
        // Ángulos en el plano vertical que pasa por el ancla, medidos desde la vertical
        // hacia abajo (el arco pasa bajo el ancla), con el radio interpolado: trepa
        // por la liana mientras se columpia. Termina sobre la cubierta, pasado el ancla.
        const ha = (A.x - C.x) * _a.x + (A.z - C.z) * _a.z
        const hb = (B.x - C.x) * _a.x + (B.z - C.z) * _a.z + 1
        const a0 = Math.atan2(ha, C.y - A.y)
        const a1 = Math.atan2(hb, C.y - B.y - 0.6)
        const r0 = Math.hypot(ha, A.y - C.y)
        const r1 = Math.hypot(hb, B.y + 0.6 - C.y)
        const ang = THREE.MathUtils.lerp(a0, a1, q)
        const rad = THREE.MathUtils.lerp(r0, r1, q)
        const s = Math.sin(ang) * rad
        out.set(C.x + _a.x * s, C.y - Math.cos(ang) * rad, C.z + _a.z * s)
      } else {
        // Se suelta y cae de pie en la cubierta.
        const q = suave(tramo(p, 0.8, 1))
        out.set(B.x + _a.x * (1 - q), B.y + 0.6 * (1 - q), B.z + _a.z * (1 - q))
      }
      break
    }
    case 'salvavidas': {
      // Le lanzan el salvavidas, lo jalan por el agua hasta el casco y lo izan.
      if (p < 0.3) {
        out.copy(A)
      } else if (p < 0.72) {
        const q = suave(tramo(p, 0.3, 0.72))
        out.set(THREE.MathUtils.lerp(A.x, E.x, q), A.y, THREE.MathUtils.lerp(A.z, E.z, q))
      } else if (p < 0.92) {
        const q = suave(tramo(p, 0.72, 0.92))
        out.set(E.x, THREE.MathUtils.lerp(A.y, E.y + 0.5, q), E.z)
      } else {
        const q = suave(tramo(p, 0.92, 1))
        out.set(THREE.MathUtils.lerp(E.x, B.x, q), THREE.MathUtils.lerp(E.y + 0.5, B.y, q), THREE.MathUtils.lerp(E.z, B.z, q))
      }
      break
    }
    case 'escalera': {
      // Cae una escalera contra el vagón, sube peldaño a peldaño y pasa a la cubierta.
      if (p < 0.18) {
        out.copy(A)
      } else if (p < 0.85) {
        const q = tramo(p, 0.18, 0.85)
        // Se acerca al pie de la escalera y trepa con tirones por peldaño.
        const pie = Math.min(1, q * 5)
        const sube = Math.max(0, (q - 0.2) / 0.8)
        const peldanos = sube + Math.sin(sube * Math.PI * 12) * 0.025
        out.set(
          THREE.MathUtils.lerp(A.x, E.x, pie * 0.75),
          THREE.MathUtils.lerp(A.y, E.y + 0.2, peldanos),
          THREE.MathUtils.lerp(A.z, E.z, pie * 0.75),
        )
      } else {
        const q = suave(tramo(p, 0.85, 1))
        _a.set(THREE.MathUtils.lerp(A.x, E.x, 0.75), 0, THREE.MathUtils.lerp(A.z, E.z, 0.75))
        out.set(THREE.MathUtils.lerp(_a.x, B.x, q), THREE.MathUtils.lerp(E.y + 0.2, B.y, q), THREE.MathUtils.lerp(_a.z, B.z, q))
      }
      break
    }
  }
}
