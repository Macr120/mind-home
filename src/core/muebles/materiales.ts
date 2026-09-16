import type {
  ConfigBase,
  ConfigFrentes,
  ConfigMetal,
  ConfigTablero,
  MaterialTableroId,
  MaterialTuboId,
  Mm,
  PerfilTubo,
} from './tipos'

/**
 * Catálogo físico del taller: qué materiales existen, en qué grosores se
 * fabrican y de qué tamaño viene la hoja. Aquí NO hay precios — esos los pone
 * el usuario en `materialesTaller` (Dexie) y los consume `costos.ts`.
 */

/** Hoja de tablero estándar (melamina/MDF de mercado): 2.44 × 1.22 m. */
export const TABLERO_ESTANDAR = { ancho: 2440 as Mm, alto: 1220 as Mm }

/** Profundidad de la ranura que aloja la trasera: la pieza se corta MÁS GRANDE. */
export const PROF_RANURA: Mm = 8

/** Holgura del entrepaño contra el frente, para que la puerta cierre. */
export const RETRANQUEO_ENTREPANO: Mm = 20

/** Luz máxima de un entrepaño antes de pandearse, por grosor de tablero. */
export const LUZ_MAXIMA: Record<number, Mm> = { 15: 800, 16: 850, 18: 900, 19: 950, 25: 1200 }

export interface DefTablero {
  id: MaterialTableroId
  clave: string
  nombreEs: string
  /** Grosores de cuerpo que se fabrican, en mm. */
  grosores: Mm[]
  /** Color sugerido al elegir el material (el usuario lo cambia). */
  color: string
  /** Se veta de verdad (hay que respetar la dirección al cortar). */
  conVeta: boolean
}

export const TABLEROS: DefTablero[] = [
  { id: 'melamina', clave: 'muebles.mat.melamina', nombreEs: 'Melamina', grosores: [15, 18, 25], color: '#e8e2d8', conVeta: true },
  { id: 'mdf', clave: 'muebles.mat.mdf', nombreEs: 'MDF', grosores: [3, 6, 9, 15, 18, 25], color: '#c8a273', conVeta: false },
  { id: 'mdf-hidrofugo', clave: 'muebles.mat.mdfHidro', nombreEs: 'MDF hidrófugo', grosores: [15, 18, 25], color: '#7fa88c', conVeta: false },
  { id: 'aglomerado', clave: 'muebles.mat.aglomerado', nombreEs: 'Aglomerado', grosores: [15, 18, 25], color: '#bda583', conVeta: false },
  { id: 'triplay', clave: 'muebles.mat.triplay', nombreEs: 'Triplay', grosores: [6, 9, 12, 15, 18], color: '#d9b88a', conVeta: true },
  { id: 'pino', clave: 'muebles.mat.pino', nombreEs: 'Pino', grosores: [18, 25], color: '#e0c49a', conVeta: true },
  { id: 'encino', clave: 'muebles.mat.encino', nombreEs: 'Encino', grosores: [19, 25], color: '#a97d4f', conVeta: true },
]

export const getTablero = (id: MaterialTableroId): DefTablero =>
  TABLEROS.find((m) => m.id === id) ?? TABLEROS[0]

export interface DefTubo {
  id: MaterialTuboId
  clave: string
  nombreEs: string
  color: string
  /** Largo comercial del tramo, en mm (para cotizar por tramo). */
  largoComercial: Mm
}

export const TUBOS: DefTubo[] = [
  { id: 'acero-negro', clave: 'muebles.mat.aceroNegro', nombreEs: 'Acero negro (PTR)', color: '#3c4044', largoComercial: 6000 },
  { id: 'acero-inox', clave: 'muebles.mat.inox', nombreEs: 'Acero inoxidable', color: '#c3c9cf', largoComercial: 6000 },
  { id: 'aluminio', clave: 'muebles.mat.aluminio', nombreEs: 'Aluminio', color: '#b8bec4', largoComercial: 6000 },
  { id: 'galvanizado', clave: 'muebles.mat.galvanizado', nombreEs: 'Galvanizado', color: '#9aa3ab', largoComercial: 6000 },
]

export const getTubo = (id: MaterialTuboId): DefTubo => TUBOS.find((m) => m.id === id) ?? TUBOS[0]

/** Secciones de tubo de mercado, en mm (lado o diámetro). */
export const SECCIONES_TUBO: Mm[] = [20, 25, 30, 38, 40, 50]

/** Espesores de pared (calibre) de mercado, en mm. */
export const PAREDES_TUBO: Mm[] = [1.2, 1.5, 2]

export const PERFILES_TUBO: { id: PerfilTubo; clave: string; nombreEs: string }[] = [
  { id: 'cuadrado', clave: 'muebles.perfil.cuadrado', nombreEs: 'Cuadrado' },
  { id: 'rectangular', clave: 'muebles.perfil.rectangular', nombreEs: 'Rectangular' },
  { id: 'redondo', clave: 'muebles.perfil.redondo', nombreEs: 'Redondo' },
]

/** Anchos de cinta de canto de mercado, en mm. */
export const CINTAS_CANTO: Mm[] = [19, 22, 28, 45]

/** Grosores de trasera de mercado, en mm. */
export const GROSORES_FONDO: Mm[] = [3, 6, 9]

/** Diámetro del tubo de colgar ropa de un clóset. */
export const DIAMETRO_TUBO_ROPA: Mm = 25

export const TABLERO_DEFECTO: ConfigTablero = {
  materialId: 'melamina',
  grosor: 18,
  grosorFondo: 3,
  materialFondo: 'mdf',
  fondo: 'ranura',
  color: '#e8e2d8',
  cintaMm: 22,
  cantear: 'vistos',
}

export const METAL_DEFECTO: ConfigMetal = {
  materialId: 'acero-negro',
  perfil: 'cuadrado',
  seccion: 25,
  pared: 1.5,
  color: '#3c4044',
}

export const BASE_DEFECTO: ConfigBase = {
  tipo: 'zoclo',
  altura: 100,
  retranqueo: 50,
  patas: { diametro: 40, color: '#3c4044' },
}

export const FRENTES_DEFECTO: ConfigFrentes = {
  puertas: 'ninguna',
  hojas: 2,
  holgura: 3,
  tirador: 'barra',
  colorFrente: '#d8d2c8',
}
