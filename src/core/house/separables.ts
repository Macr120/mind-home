import type { Pieza3D } from '../chat/mascotas'
import type { Superficie } from '../muebles/superficies'
import { piezasEntrada, type FormaEntrada } from './formasEntrada'
import {
  TIPO_AGENDA,
  TIPO_CABALLETE,
  TIPO_CAMARA_VIDEO,
  TIPO_ESCRITORIO_ESCRITURA,
  TIPO_ESTACION_COMPUTO,
  TIPO_GUITARRA,
  TIPO_LAPTOP,
  TIPO_LIBRERO_LIBRO,
  TIPO_LIBRETA,
  TIPO_PERIODICO,
  TIPO_REPISA_JUEGOS,
  TIPO_TECLADO_MIDI,
} from './especialesPlantillaMeta'

/**
 * Los objetos COMPUESTOS que sueltan sus partes: una base que conserva su tipo,
 * su animación y su app, y cada cosa suelta (mancuernas, libros, el monitor, el
 * banco del piano…) como un objeto de piezas propio que se mueve solo con una
 * pulsación larga. Aquí solo hay datos: dónde queda cada parte, sus piezas y
 * las superficies de la base donde descansan. Lo aplica `separarCompuestos.ts`;
 * los modelos, con `separado`, dejan de pintarlas.
 *
 * Todo en el sistema de la base: metros (partes) y milímetros (superficies,
 * como `superficiesDeMueble`). Las piezas llevan su base en y=0: el apoyo las
 * sube a la superficie. Lo animado (el libro protagonista, la máquina de
 * escribir, el lienzo y el pincel, la cabeza de la cámara) se queda en la base.
 */

export interface ParteSeparable {
  /** Único dentro del compuesto: sufijo del uid y de `ObjetoCuarto.parte`. */
  id: string
  /** Nombre con que nace el objeto (clave i18n y español). */
  clave: string
  es: string
  /** Posición local respecto al origen de la base (m, sin escala). */
  x: number
  z: number
  /** Giro extra respecto a la base (radianes). */
  rotY?: number
  /** Dónde descansa: el suelo o la superficie de la base a esa altura (mm). */
  sobre: 'suelo' | number
  piezas: (color: string) => Pieza3D[]
  /** Se puede enlazar a una entrada y tomar su etiqueta. */
  forma?: FormaEntrada
}

export interface DefSeparable {
  /** Superficies de la base ya separada (mm locales). Una receta del taller trae las suyas. */
  superficies?: Superficie[]
  partes: ParteSeparable[]
  /** También vale cuando la base ya es la receta del taller de ese recurso (`tipoOriginal`). */
  sobreReceta?: boolean
  /** Es un estante: sale entre los muebles donde acomodar entradas. */
  paraAcomodar?: boolean
}

type V3 = [number, number, number]

const caja = (tam: V3, pos: V3, color: string, extra: Partial<Pieza3D> = {}): Pieza3D => ({
  tipo: 'caja',
  pos,
  tam,
  color,
  ...extra,
})
const cil = (rTop: number, rBot: number, alto: number, pos: V3, color: string, extra: Partial<Pieza3D> = {}): Pieza3D => ({
  tipo: 'cilindro',
  pos,
  tam: [rTop, rBot, alto],
  color,
  ...extra,
})
const sup = (nivel: number, y: number, cx: number, cz: number, ancho: number, fondo: number): Superficie => ({
  nivel,
  y,
  cx,
  cz,
  ancho,
  fondo,
})

const ACOSTADO: V3 = [0, 0, Math.PI / 2]

/** Monitor de escritorio con su pie: marco del color de la base y pantalla encendida. */
function monitor(color: string, pantalla: string, marco: V3, alto: number, trazos: Pieza3D[]): Pieza3D[] {
  return [
    caja([0.26, 0.02, 0.16], [0, 0.01, -0.045], '#1f2937', { mat: 'metal' }),
    cil(0.025, 0.025, alto - 0.26, [0, (alto - 0.26) / 2 + 0.02, -0.045], '#1f2937', { mat: 'metal' }),
    caja(marco, [0, alto, 0], color, { mat: 'brillante' }),
    caja([marco[0] - 0.06, marco[1] - 0.06, 0.004], [0, alto, marco[2] / 2 + 0.003], pantalla, { mat: 'luz' }),
    ...trazos,
  ]
}

function teclado(ancho: number, fondo: number, alto: number, tecla: number): Pieza3D[] {
  return [
    caja([ancho, alto, fondo], [0, alto / 2, 0], '#e5e7eb'),
    ...[-1, 0, 1].map((k) => caja([ancho - 0.06, 0.004, 0.013], [0, alto + 0.001, k * tecla], '#9ca3af')),
  ]
}

const BOLAS = ['#ef4444', '#fbbf24', '#3b82f6']
const LOMOS = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7c3aed', '#0f766e']
const CAJAS_JUEGO = ['#f59e0b', '#7c3aed', '#0ea5e9']
/** Las mancuernas del rack de fábrica: cada una un peso, como en un gimnasio. */
const PESOS_RACK = [5, 10, 15]

export const SEPARABLES: Record<string, DefSeparable> = {
  // Billar: la mesa y sus tres bolas.
  'recurso:57': {
    superficies: [sup(0, 740, 0, 0, 2400, 1300)],
    partes: [-0.3, -0.05, 0.2].map((x, i) => ({
      id: `bola-${i + 1}`,
      clave: 'separables.bola',
      es: 'Bola de billar',
      x,
      z: 0,
      sobre: 740,
      piezas: () => [{ tipo: 'esfera', pos: [0, 0.08, 0], tam: [0.08], color: BOLAS[i], mat: 'brillante' }],
    })),
  },
  // Sofá: el asiento entre los brazos y sus tres cojines.
  'recurso:66': {
    superficies: [sup(0, 600, 0, -150, 2750, 700)],
    partes: [-0.9, 0, 0.9].map((x, i) => ({
      id: `cojin-${i + 1}`,
      clave: 'separables.cojin',
      es: 'Cojín',
      x,
      z: -0.1,
      sobre: 600,
      piezas: () => [caja([0.8, 0.18, 0.7], [0, 0.09, 0], '#cbd5e1')],
    })),
  },
  // Rack de mancuernas (el modelo viejo; la receta del taller trae sus niveles).
  'recurso:11': {
    superficies: [sup(0, 550, 0, 0, 1600, 500), sup(1, 950, 0, -100, 1600, 500)],
    sobreReceta: true,
    partes: [-0.5, 0, 0.5].map((x, i) => ({
      id: `mancuerna-${i + 1}`,
      clave: 'separables.mancuerna',
      es: 'Mancuerna',
      x,
      z: 0,
      sobre: 550,
      forma: 'mancuerna' as const,
      piezas: (color: string) => piezasEntrada('mancuerna', color, { plantillaId: '', pesoKg: PESOS_RACK[i] }),
    })),
  },
  // Banco de trabajo: la caja de herramientas de encima.
  'recurso:21': {
    superficies: [sup(0, 660, 0, 0, 2000, 800)],
    sobreReceta: true,
    partes: [
      {
        id: 'caja',
        clave: 'separables.cajaHerramientas',
        es: 'Caja de herramientas',
        x: 0,
        z: -0.1,
        sobre: 660,
        piezas: () => [
          caja([0.4, 0.25, 0.3], [0, 0.125, 0], '#fbbf24'),
          caja([0.2, 0.03, 0.03], [0, 0.265, 0], '#1f2937'),
        ],
      },
    ],
  },
  // Repisa de juegos: se queda la caja de la cima, que se menea.
  [TIPO_REPISA_JUEGOS]: {
    superficies: [75, 645, 1225, 1705].map((y, n) => sup(n, y, 0, 25, 880, 310)),
    paraAcomodar: true,
    partes: [
      {
        id: 'pila',
        clave: 'separables.pila',
        es: 'Pila de juegos',
        x: -0.15,
        z: 0.02,
        sobre: 75,
        piezas: () => [
          caja([0.5, 0.07, 0.3], [0, 0.035, 0], '#dc2626'),
          caja([0.5, 0.07, 0.3], [0, 0.115, 0], '#2563eb', { rot: [0, 0.15, 0] }),
          caja([0.5, 0.07, 0.3], [0, 0.195, 0], '#16a34a', { rot: [0, 0.3, 0] }),
        ],
      },
      ...[-0.28, -0.04, 0.2].map((x, i) => ({
        id: `caja-${i + 1}`,
        clave: 'separables.cajaJuego',
        es: 'Caja de juego',
        x,
        z: 0.02,
        sobre: 645,
        forma: 'caja' as const,
        piezas: () => [caja([0.2, 0.4, 0.28], [0, 0.2, 0], CAJAS_JUEGO[i])],
      })),
    ],
  },
  // Librero de la biblioteca: se queda el libro protagonista, que sale y se abre.
  [TIPO_LIBRERO_LIBRO]: {
    superficies: [...[370, 920, 1470].map((y, n) => sup(n, y, 0, 0, 900, 320)), sup(3, 1800, 0, -150, 1020, 360)],
    paraAcomodar: true,
    partes: [
      ...LOMOS.map((c, i) => ({
        id: `libro-a${i + 1}`,
        clave: 'separables.libro',
        es: 'Libro',
        x: -0.36 + i * 0.14,
        z: 0.02,
        sobre: 370,
        forma: 'libro' as const,
        piezas: () => [caja([0.1, 0.42, 0.24], [0, 0.21, 0], c)],
      })),
      ...LOMOS.map((c, i) => ({
        id: `libro-b${i + 1}`,
        clave: 'separables.libro',
        es: 'Libro',
        x: -0.36 + i * 0.14,
        z: 0.02,
        sobre: 1470,
        forma: 'libro' as const,
        piezas: () => [caja([0.1, 0.3, 0.24], [0, 0.15, 0], c)],
      })),
    ],
  },
  // Agenda de escritorio: se quedan la mesita y la agenda (su hoja se pasa sola).
  [TIPO_AGENDA]: {
    superficies: [sup(0, 530, 0, 0, 950, 600)],
    partes: [
      {
        id: 'frasco',
        clave: 'separables.frasco',
        es: 'Frasco de pastillas',
        x: 0.36,
        z: -0.16,
        sobre: 530,
        piezas: () => [
          cil(0.05, 0.05, 0.14, [0, 0.07, 0], '#f8fafc', { mat: 'brillante' }),
          cil(0.052, 0.052, 0.03, [0, 0.15, 0], '#14b8a6', { mat: 'brillante' }),
        ],
      },
      {
        id: 'portarretratos',
        clave: 'separables.portarretratos',
        es: 'Portarretratos',
        x: -0.34,
        z: -0.15,
        rotY: 0.5,
        sobre: 530,
        piezas: () => [
          caja([0.16, 0.18, 0.015], [0, 0.09, 0], '#fb923c'),
          caja([0.12, 0.14, 0.005], [0, 0.09, 0.01], '#e2e8f0'),
        ],
      },
      {
        id: 'pluma',
        clave: 'separables.pluma',
        es: 'Pluma',
        x: 0.06,
        z: 0.25,
        rotY: 0.35,
        sobre: 530,
        piezas: () => [cil(0.011, 0.008, 0.24, [0, 0.011, 0], '#6366f1', { rot: ACOSTADO, mat: 'brillante' })],
      },
    ],
  },
  // Escritorio de noticias: el periódico doblado.
  [TIPO_PERIODICO]: {
    superficies: [sup(0, 780, 0, 0, 1200, 600)],
    partes: [
      {
        id: 'periodico',
        clave: 'separables.periodico',
        es: 'Periódico',
        x: -0.15,
        z: 0,
        rotY: 0.2,
        sobre: 780,
        piezas: () => [
          caja([0.44, 0.04, 0.32], [0, 0.02, 0], '#e5e7eb'),
          ...[-0.08, 0, 0.08].map((z) => caja([0.3, 0.005, 0.015], [0, 0.0425, z], '#374151')),
        ],
      },
    ],
  },
  // Laptop de trabajo: el escritorio se queda (ahí se sienta el personaje).
  [TIPO_LAPTOP]: {
    superficies: [sup(0, 775, 0, 0, 1100, 600)],
    partes: [
      {
        id: 'monitor',
        clave: 'separables.monitor',
        es: 'Monitor',
        x: 0,
        z: -0.18,
        sobre: 775,
        piezas: (color) => [
          caja([0.34, 0.03, 0.2], [0, 0.015, 0.02], '#1f2937', { mat: 'metal' }),
          cil(0.04, 0.04, 0.34, [0, 0.175, 0], '#1f2937', { mat: 'metal' }),
          caja([1.1, 0.68, 0.05], [0, 0.625, -0.02], color, { mat: 'brillante' }),
          caja([1.0, 0.58, 0.005], [0, 0.625, 0.008], '#38bdf8', { mat: 'luz' }),
        ],
      },
      {
        id: 'teclado',
        clave: 'separables.teclado',
        es: 'Teclado',
        x: 0,
        z: 0.14,
        sobre: 775,
        piezas: () => teclado(0.42, 0.15, 0.03, 0.04),
      },
      {
        id: 'raton',
        clave: 'separables.raton',
        es: 'Ratón',
        x: 0.28,
        z: 0.14,
        sobre: 775,
        piezas: () => [caja([0.06, 0.025, 0.1], [0, 0.0125, 0], '#e5e7eb')],
      },
    ],
  },
  // Libreta: la mesa baja se queda; la libreta abierta y la pluma, sueltas.
  [TIPO_LIBRETA]: {
    superficies: [sup(0, 345, 0, 0, 800, 480)],
    partes: [
      {
        id: 'libreta',
        clave: 'separables.libreta',
        es: 'Libreta',
        x: 0,
        z: 0.05,
        sobre: 345,
        piezas: (color) => [
          ...[-1, 1].map((s) => caja([0.22, 0.015, 0.28], [s * 0.11, 0.01, 0], '#f8fafc', { rot: [0, 0, s * 0.06] })),
          caja([0.03, 0.02, 0.28], [0, 0.007, 0], color),
        ],
      },
      {
        id: 'pluma',
        clave: 'separables.pluma',
        es: 'Pluma',
        x: 0.16,
        z: 0.12,
        rotY: -0.62,
        sobre: 345,
        piezas: () => [cil(0.008, 0.008, 0.16, [0, 0.008, 0], '#111827', { rot: ACOSTADO })],
      },
    ],
  },
  // Estación de cómputo: el escritorio se queda; torre, monitores y lo de encima, sueltos.
  [TIPO_ESTACION_COMPUTO]: {
    superficies: [sup(0, 780, 0, 0, 1600, 720)],
    partes: [
      {
        id: 'torre',
        clave: 'separables.torre',
        es: 'Torre de la computadora',
        x: 0.95,
        z: -0.1,
        sobre: 'suelo',
        piezas: () => [
          caja([0.34, 0.72, 0.62], [0, 0.36, 0], '#1f2937', { mat: 'brillante' }),
          ...[0.32, 0.44, 0.56, 0.68].map((y) => caja([0.24, 0.02, 0.01], [0, y, 0.315], '#111827')),
          { tipo: 'esfera', pos: [0, 0.66, 0.315], tam: [0.022], color: '#22d3ee', mat: 'luz' },
        ],
      },
      {
        id: 'monitor-izq',
        clave: 'separables.monitor',
        es: 'Monitor',
        x: -0.44,
        z: -0.2,
        rotY: 0.28,
        sobre: 780,
        // El trazo de una gráfica.
        piezas: (color) =>
          monitor(
            color,
            '#22d3ee',
            [0.82, 0.5, 0.045],
            0.56,
            (
              [
                [-0.26, -0.12],
                [-0.08, 0.02],
                [0.1, -0.04],
                [0.28, 0.14],
              ] as const
            ).map(([x, y], i) => caja([0.2, 0.014, 0.002], [x, 0.56 + y, 0.03], '#0b1020', { rot: [0, 0, 0.5 - i * 0.28] })),
          ),
      },
      {
        id: 'monitor-der',
        clave: 'separables.monitor',
        es: 'Monitor',
        x: 0.44,
        z: -0.2,
        rotY: -0.28,
        sobre: 780,
        // Una rejilla de hoja de cálculo.
        piezas: (color) =>
          monitor(
            color,
            '#22d3ee',
            [0.82, 0.5, 0.045],
            0.56,
            [-0.12, 0, 0.12].map((y) => caja([0.68, 0.01, 0.002], [0, 0.56 + y, 0.03], '#0b1020')),
          ),
      },
      {
        id: 'teclado',
        clave: 'separables.teclado',
        es: 'Teclado',
        x: -0.06,
        z: 0.18,
        sobre: 780,
        piezas: () => teclado(0.56, 0.18, 0.035, 0.05),
      },
      {
        id: 'mousepad',
        clave: 'separables.mousepad',
        es: 'Mousepad',
        x: 0.4,
        z: 0.2,
        sobre: 780,
        piezas: () => [caja([0.26, 0.006, 0.2], [0, 0.003, 0], '#1f2937')],
      },
      {
        id: 'raton',
        clave: 'separables.raton',
        es: 'Ratón',
        x: 0.4,
        z: 0.2,
        sobre: 780,
        // Encima del mousepad.
        piezas: () => [caja([0.07, 0.026, 0.11], [0, 0.019, 0], '#e5e7eb')],
      },
      {
        id: 'cuadernos',
        clave: 'separables.cuadernos',
        es: 'Cuadernos',
        x: -0.62,
        z: 0.1,
        sobre: 780,
        piezas: () => [
          caja([0.26, 0.028, 0.19], [0, 0.014, 0], '#34d399'),
          caja([0.26, 0.028, 0.19], [0, 0.044, 0], '#a78bfa', { rot: [0, 0.18, 0] }),
        ],
      },
    ],
  },
  // Piano: el banco sale a su lado; sobre la tapa se pueden dejar cosas.
  [TIPO_GUITARRA]: {
    superficies: [sup(0, 1470, 0, -20, 1160, 440)],
    partes: [
      {
        id: 'banco',
        clave: 'separables.bancoPiano',
        es: 'Banco del piano',
        x: 0,
        z: 0.62,
        sobre: 'suelo',
        piezas: () => [
          caja([0.6, 0.08, 0.26], [0, 0.41, 0], '#5b3a1a'),
          ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cil(0.025, 0.025, 0.38, [sx * 0.24, 0.19, sz * 0.1], '#3f3f46'))),
        ],
      },
    ],
  },
  // Teclado MIDI: la banqueta.
  [TIPO_TECLADO_MIDI]: {
    partes: [
      {
        id: 'banqueta',
        clave: 'separables.banqueta',
        es: 'Banqueta',
        x: 0,
        z: 0.72,
        sobre: 'suelo',
        piezas: () => [
          caja([0.62, 0.08, 0.28], [0, 0.44, 0], '#1f2937'),
          ...[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => cil(0.022, 0.022, 0.4, [sx * 0.25, 0.2, sz * 0.1], '#3f3f46', { mat: 'metal' })),
          ),
        ],
      },
    ],
  },
  // Caballete: se quedan el lienzo y el pincel (pintan juntos); la paleta y los botes, sueltos.
  [TIPO_CABALLETE]: {
    superficies: [sup(0, 645, 0, 30, 780, 140)],
    partes: [
      {
        id: 'paleta',
        clave: 'separables.paleta',
        es: 'Paleta de pintor',
        x: -0.15,
        z: 0.03,
        rotY: 0.2,
        sobre: 645,
        piezas: () => [
          cil(0.14, 0.14, 0.015, [0, 0.0075, 0], '#c8a165'),
          ...(
            [
              [-0.07, '#ef4444'],
              [0, '#3b82f6'],
              [0.07, '#facc15'],
            ] as const
          ).map(([dx, c]) => cil(0.025, 0.025, 0.008, [dx, 0.019, 0], c)),
        ],
      },
      ...(
        [
          [-0.5, 0.4, '#22c55e'],
          [-0.36, 0.5, '#8b5cf6'],
        ] as const
      ).map(([x, z, c], i) => ({
        id: `bote-${i + 1}`,
        clave: 'separables.bote',
        es: 'Bote de pintura',
        x,
        z,
        sobre: 'suelo' as const,
        piezas: () => [cil(0.075, 0.07, 0.18, [0, 0.09, 0], c)],
      })),
    ],
  },
  // Escritorio de escritura: se quedan el escritorio, la cajonera y la máquina (teclea sola).
  [TIPO_ESCRITORIO_ESCRITURA]: {
    superficies: [sup(0, 795, 0, 0, 1500, 700)],
    partes: [
      {
        id: 'folios',
        clave: 'separables.folios',
        es: 'Pila de folios',
        x: 0.66,
        z: 0.16,
        sobre: 795,
        piezas: () =>
          [0, 1, 2].map((i) => caja([0.28, 0.012, 0.36], [0, 0.006 + 0.012 * i, 0], '#f1f5f9', { rot: [0, 0.09 * i, 0] })),
      },
      {
        id: 'taza',
        clave: 'separables.taza',
        es: 'Taza',
        x: -0.5,
        z: 0.2,
        sobre: 795,
        piezas: () => [
          cil(0.06, 0.05, 0.1, [0, 0.05, 0], '#e5e7eb', { mat: 'brillante' }),
          cil(0.052, 0.052, 0.01, [0, 0.095, 0], '#6b4423'),
        ],
      },
      {
        id: 'lapices',
        clave: 'separables.lapices',
        es: 'Bote de lápices',
        x: 0.66,
        z: -0.18,
        sobre: 795,
        piezas: () => [
          cil(0.05, 0.05, 0.12, [0, 0.06, 0], '#475569'),
          cil(0.008, 0.008, 0.18, [-0.02, 0.16, 0.02], '#f59e0b', { rot: [0, 0, -0.08] }),
          cil(0.008, 0.008, 0.18, [0.02, 0.16, -0.02], '#ef4444', { rot: [0.1, 0, 0] }),
          cil(0.008, 0.008, 0.18, [0.01, 0.16, 0.03], '#3b82f6', { rot: [0.2, 0, 0.08] }),
        ],
      },
    ],
  },
  // Cámara de video: el trípode y la cabeza se quedan; la claqueta y el foco, sueltos.
  [TIPO_CAMARA_VIDEO]: {
    partes: [
      {
        id: 'claqueta',
        clave: 'separables.claqueta',
        es: 'Claqueta',
        x: 0.62,
        z: 0.34,
        rotY: -0.45,
        sobre: 'suelo',
        piezas: () => {
          const incl: V3 = [0.18, 0, 0]
          return [
            caja([0.42, 0.3, 0.025], [0, 0.15, 0], '#111827', { rot: incl }),
            ...[0.11, 0.19].map((y) => caja([0.34, 0.012, 0.004], [0, y, 0.016], '#f8fafc', { rot: incl })),
            caja([0.42, 0.06, 0.025], [0, 0.33, 0.01], '#f8fafc', { rot: incl }),
            ...[-0.15, -0.03, 0.09, 0.21].map((x) => caja([0.05, 0.062, 0.004], [x, 0.33, 0.024], '#111827', { rot: [0.18, 0, 0.35] })),
          ]
        },
      },
      {
        id: 'foco',
        clave: 'separables.foco',
        es: 'Foco de set',
        x: -0.68,
        z: 0.24,
        sobre: 'suelo',
        piezas: () => [
          cil(0.16, 0.19, 0.06, [0, 0.03, 0], '#1f2937'),
          cil(0.03, 0.035, 0.94, [0, 0.5, 0], '#374151', { mat: 'metal' }),
          caja([0.34, 0.34, 0.1], [0, 1.02, 0.06], '#1f2937', { rot: [0.5, 0, 0], mat: 'brillante' }),
          caja([0.28, 0.28, 0.01], [0, 0.99, 0.13], '#fef3c7', { rot: [0.5, 0, 0], mat: 'luz' }),
        ],
      },
    ],
  },
}

/** La definición que aplica a un objeto: por su tipo o, si es la receta de un recurso, por el de origen. */
export function defSeparable(o: { tipo: string; tipoOriginal?: string; mueble?: unknown }): DefSeparable | undefined {
  const propia = SEPARABLES[o.tipo]
  if (propia) return propia
  const origen = o.tipoOriginal ? SEPARABLES[o.tipoOriginal] : undefined
  return origen?.sobreReceta && o.mueble ? origen : undefined
}
