import type { Pieza3D } from '../chat/mascotas'

/**
 * Cuerpos prediseñados para el personaje principal: modelos de piezas listos que
 * se aplican con un toque desde la galería «Modelos» del editor. Respetan la
 * huella del cuerpo base (mismas posiciones de torso/piernas/brazos) para que la
 * ropa siga calzando con `ANCLAS_AVATAR`. Al elegir uno se guardan como
 * `avatar.modelo3d`, así quedan editables pieza por pieza y admiten animación.
 */

const OJO = '#141414'

/** Par de ojitos al frente (mismo estilo que las formas integradas). */
function ojos(y: number, z: number, r = 0.045): Pieza3D[] {
  return [
    { tipo: 'esfera', pos: [-0.09, y, z], tam: [r], color: OJO },
    { tipo: 'esfera', pos: [0.09, y, z], tam: [r], color: OJO },
  ]
}

/** Piernas + torso + brazos con la huella del cuerpo base (para que la ropa calce). */
function torsoBase(color: string, piernas = color): Pieza3D[] {
  return [
    { tipo: 'caja', pos: [-0.14, 0.3, 0], tam: [0.24, 0.6, 0.26], color: piernas },
    { tipo: 'caja', pos: [0.14, 0.3, 0], tam: [0.24, 0.6, 0.26], color: piernas },
    { tipo: 'caja', pos: [0, 0.92, 0], tam: [0.6, 0.62, 0.3], color },
    { tipo: 'caja', pos: [-0.42, 0.92, 0], tam: [0.2, 0.6, 0.26], color },
    { tipo: 'caja', pos: [0.42, 0.92, 0], tam: [0.2, 0.6, 0.26], color },
  ]
}

export interface CuerpoPreset {
  id: string
  nombre: string
  emoji: string
  piezas: () => Pieza3D[]
}

export const CUERPOS_PRESET: CuerpoPreset[] = [
  {
    id: 'astronauta',
    nombre: 'Astronauta',
    emoji: '🧑‍🚀',
    piezas: () => [
      ...torsoBase('#eef1f4'),
      { tipo: 'esfera', pos: [0, 1.54, 0], tam: [0.27], color: '#f4f6f8' },
      { tipo: 'caja', pos: [0, 1.54, 0.2], tam: [0.32, 0.2, 0.06], color: '#16324a' },
      { tipo: 'caja', pos: [0, 0.95, -0.24], tam: [0.34, 0.42, 0.16], color: '#c9d2da' },
      { tipo: 'caja', pos: [0, 1.02, 0.16], tam: [0.16, 0.1, 0.03], color: '#3b82f6' },
    ],
  },
  {
    id: 'androide',
    nombre: 'Androide',
    emoji: '🤖',
    piezas: () => [
      ...torsoBase('#9aa6b2', '#6b7480'),
      { tipo: 'caja', pos: [0, 1.5, 0], tam: [0.44, 0.42, 0.4], color: '#8b97a4' },
      { tipo: 'caja', pos: [0, 1.5, 0.2], tam: [0.34, 0.12, 0.04], color: '#0c1014' },
      { tipo: 'cilindro', pos: [0, 1.8, 0], tam: [0.02, 0.02, 0.18], color: '#6b7480' },
      { tipo: 'esfera', pos: [0, 1.92, 0], tam: [0.05], color: '#ff5d5d' },
    ],
  },
  {
    id: 'ninja',
    nombre: 'Ninja',
    emoji: '🥷',
    piezas: () => [
      ...torsoBase('#2b2f3a'),
      { tipo: 'caja', pos: [0, 1.5, 0], tam: [0.44, 0.44, 0.44], color: '#2b2f3a' },
      { tipo: 'caja', pos: [0, 1.56, 0.02], tam: [0.47, 0.1, 0.47], color: '#b0322b' },
      { tipo: 'caja', pos: [-0.26, 1.56, -0.24], tam: [0.06, 0.08, 0.3], color: '#b0322b', rot: [0.3, 0, 0] },
      ...ojos(1.52, 0.23, 0.05),
    ],
  },
  {
    id: 'alien',
    nombre: 'Alien',
    emoji: '👽',
    piezas: () => [
      ...torsoBase('#7ec86a', '#5fa94f'),
      { tipo: 'esfera', pos: [0, 1.55, 0], tam: [0.3], color: '#8ed67a' },
      { tipo: 'esfera', pos: [-0.12, 1.57, 0.22], tam: [0.09], color: '#101014' },
      { tipo: 'esfera', pos: [0.12, 1.57, 0.22], tam: [0.09], color: '#101014' },
    ],
  },
  {
    id: 'osito',
    nombre: 'Osito',
    emoji: '🧸',
    piezas: () => [
      ...torsoBase('#b07a45'),
      { tipo: 'esfera', pos: [0, 1.5, 0], tam: [0.27], color: '#b07a45' },
      { tipo: 'esfera', pos: [-0.19, 1.71, 0], tam: [0.1], color: '#a06a3a' },
      { tipo: 'esfera', pos: [0.19, 1.71, 0], tam: [0.1], color: '#a06a3a' },
      { tipo: 'esfera', pos: [0, 1.44, 0.22], tam: [0.11], color: '#d8b487' },
      { tipo: 'esfera', pos: [0, 1.47, 0.31], tam: [0.04], color: '#20140c' },
      ...ojos(1.55, 0.24),
    ],
  },
  {
    id: 'princesa',
    nombre: 'Princesa',
    emoji: '👸',
    piezas: () => {
      const vestido = '#e35d9e'
      const pelo = '#e8c07a'
      const oro = '#f6c945'
      return [
        // Falda acampanada (frustum: angosta en la cintura, con vuelo hacia el piso).
        { tipo: 'cilindro', pos: [0, 0.36, 0], tam: [0.28, 0.5, 0.68], color: vestido },
        // Corpiño + mangas
        { tipo: 'caja', pos: [0, 0.92, 0], tam: [0.5, 0.5, 0.3], color: vestido },
        { tipo: 'caja', pos: [-0.36, 0.9, 0], tam: [0.16, 0.5, 0.22], color: vestido },
        { tipo: 'caja', pos: [0.36, 0.9, 0], tam: [0.16, 0.5, 0.22], color: vestido },
        // Cabeza
        { tipo: 'caja', pos: [0, 1.5, 0], tam: [0.4, 0.4, 0.4], color: '#f2c79a' },
        // Coletas
        { tipo: 'esfera', pos: [-0.22, 1.56, -0.04], tam: [0.11], color: pelo },
        { tipo: 'esfera', pos: [0.22, 1.56, -0.04], tam: [0.11], color: pelo },
        // Tiara + gema
        { tipo: 'caja', pos: [0, 1.68, 0], tam: [0.42, 0.08, 0.42], color: oro },
        { tipo: 'cono', pos: [0, 1.76, 0.14], tam: [0.04, 0.1], color: '#7dd3fc' },
        ...ojos(1.5, 0.21),
      ]
    },
  },
]
