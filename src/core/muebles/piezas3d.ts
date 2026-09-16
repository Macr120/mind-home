import type { Pieza3D } from '../chat/mascotas'
import { armarMueble } from './modulos'
import type { Cuerpo, Mm, Mueble, ParteMueble } from './tipos'

/**
 * Proyección del `Cuerpo` a las piezas de la escena 3D. Es el ÚNICO sitio del
 * taller donde se pasa de milímetros a las unidades del mundo (1 unidad = 1
 * metro, ver `core/house/walls.ts`): todo lo demás piensa en mm enteros.
 */

/** Milímetro en unidades de la escena. */
export const MM = 0.001

export const aMetros = (mm: Mm): number => mm * MM

/** Cuánto se abren las puertas en la vista de «frentes abiertos» (radianes). */
const GIRO_PUERTA_ABIERTA = 1.15

/** Rotación base que orienta un cilindro (vertical por defecto) según su eje largo. */
function rotCilindro(p: ParteMueble): [number, number, number] {
  const largo = Math.max(p.dx, p.dy, p.dz)
  if (largo === p.dx) return [0, 0, Math.PI / 2]
  if (largo === p.dz) return [Math.PI / 2, 0, 0]
  return [0, 0, 0]
}

const suma = (a: [number, number, number], b?: [number, number, number]): [number, number, number] =>
  b ? [a[0] + b[0], a[1] + b[1], a[2] + b[2]] : a

export function piezas3DDeCuerpo(c: Cuerpo, opts?: { abrirFrentes?: boolean }): Pieza3D[] {
  const piezas: Pieza3D[] = []
  const medioAncho = c.bbox.ancho / 2
  const medioFondo = c.bbox.fondo / 2

  for (const p of c.partes) {
    if (p.dx <= 0 && p.dy <= 0 && p.dz <= 0) continue
    // El mueble se centra en X/Z y se apoya en y=0, que es lo que espera el
    // resto de modelos de la casa (y el encuadre del preview).
    const pos: [number, number, number] = [
      aMetros(p.x + p.dx / 2 - medioAncho),
      aMetros(p.y + p.dy / 2),
      aMetros(p.z + p.dz / 2 - medioFondo),
    ]
    const metalico = p.hechoDe === 'tubo' || (p.hechoDe === 'accesorio' && !p.soloVisual)
    let rot = p.rot
    if (opts?.abrirFrentes && (p.rol === 'puerta' || p.rol === 'frente-cajon')) {
      // Solo visual: el despiece no se entera de que la puerta está abierta.
      const haciaIzq = p.x + p.dx / 2 < medioAncho
      rot = suma([0, haciaIzq ? GIRO_PUERTA_ABIERTA : -GIRO_PUERTA_ABIERTA, 0], p.rot)
    }

    if (p.redondo) {
      const largo = Math.max(p.dx, p.dy, p.dz)
      const radio = Math.min(p.dx, p.dy, p.dz) / 2
      piezas.push({
        tipo: 'cilindro',
        pos,
        tam: [aMetros(radio), aMetros(radio), aMetros(largo)],
        color: p.color,
        rot: suma(rotCilindro(p), rot),
        ...(metalico || p.hechoDe === 'accesorio' ? { mat: 'metal' as const } : {}),
      })
      continue
    }

    piezas.push({
      tipo: 'caja',
      pos,
      tam: [aMetros(p.dx), aMetros(p.dy), aMetros(p.dz)],
      color: p.color,
      ...(rot ? { rot } : {}),
      ...(metalico ? { mat: 'metal' as const } : {}),
    })
  }
  return piezas
}

/** Atajo: de la receta a las piezas de la escena, sin pasar por el `Cuerpo`. */
export const piezas3DDeMueble = (m: Mueble, opts?: { abrirFrentes?: boolean }): Pieza3D[] =>
  piezas3DDeCuerpo(armarMueble(m), opts)
