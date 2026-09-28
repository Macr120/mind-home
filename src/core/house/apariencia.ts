/**
 * Apariencia compartida de los personajes (el principal y los agentes):
 * tamaño (escala) y ropa. Cada personaje tiene sus propias `AnclasRopa` para que
 * la ropa calce sobre su cuerpo (el avatar es más alto y con piernas separadas;
 * los agentes son más bajos y con cuerpo único).
 */

import type { MascotaId, Pieza3D } from '../chat/mascotas'
import type { NombreIcono } from '../ui/iconos/catalogo'

/** Prendas que puede llevar un personaje. */
export type PrendaId =
  | 'sombrero' | 'gorroChef' | 'gorra' | 'lentes'
  | 'bufanda' | 'corbata'
  | 'camisa' | 'playera' | 'chamarra' | 'capa'
  | 'vestido' | 'falda'
  | 'pantalon' | 'shorts'
  | 'botas' | 'tenis'
  | 'guantes' | 'mochila'
  // Más sombreros
  | 'vaquero' | 'copa' | 'fedora' | 'boina' | 'gorroLana' | 'charro' | 'mexicano' | 'pirata' | 'corona' | 'vikingo'
  // Vello facial (su «color» es el del pelo)
  | 'bigote' | 'bigoteManubrio' | 'bigoteMorsa' | 'barba' | 'barbaCandado' | 'barbaLarga' | 'patillas'
  // Tatuajes (su «color» es el de la tinta)
  | 'tatuajeCorazon' | 'tatuajeAncla' | 'tatuajeTribal' | 'tatuajeRosa' | 'tatuajeDragon'
  | 'tatuajeEstrella' | 'tatuajeLagrima'

/**
 * Una prenda puesta: su color y, en los tatuajes, dónde va sobre el cuerpo
 * (`punto`) y su tamaño (`escala`, 1 = normal).
 */
interface Prenda extends AjustePrenda {
  color: string
}

/**
 * Parte del cuerpo que lleva un tatuaje. En brazos y piernas el punto es
 * relativo a su pivote (hombro/cadera), así el tatuaje sigue el balanceo.
 */
export type ParteTatuaje = 'cuerpo' | 'brazoIzq' | 'brazoDer' | 'piernaIzq' | 'piernaDer'
export const PARTES_TATUAJE: ParteTatuaje[] = ['cuerpo', 'brazoIzq', 'brazoDer', 'piernaIzq', 'piernaDer']

/** Dónde va un tatuaje: punto `p` sobre la superficie y hacia dónde mira (`n`), en coordenadas de su parte. */
export interface PuntoTatuaje {
  parte: ParteTatuaje
  p: [number, number, number]
  n: [number, number, number]
}

/** Colocación de un tatuaje (ver `Prenda`). */
export interface AjustePrenda {
  punto?: PuntoTatuaje
  escala?: number
}

/** Límites del tamaño de un tatuaje. */
export const TATUAJE_ESCALA_MIN = 0.5
export const TATUAJE_ESCALA_MAX = 2

/**
 * Pivote de cada parte en el cuerpo (x, y): el mismo de las extremidades de
 * `Prendas.tsx`. El brazo izquierdo del personaje (mira a +Z) es el de X positiva.
 */
export function pivoteParte(parte: ParteTatuaje, a: AnclasRopa): [number, number] {
  const hombroY = a.torsoY + a.torsoH / 2
  const caderaY = a.piernasY + a.piernaH / 2
  switch (parte) {
    case 'brazoIzq': return [a.brazoX, hombroY]
    case 'brazoDer': return [-a.brazoX, hombroY]
    case 'piernaIzq': return [Math.max(...a.piernasX), caderaY]
    case 'piernaDer': return [Math.min(...a.piernasX), caderaY]
    default: return [0, 0]
  }
}

/** Lugar de fábrica de cada tatuaje (donde aparece al ponérselo). */
function puntoInicial(id: PrendaId, a: AnclasRopa): PuntoTatuaje {
  const k = a.cabezaR / 0.22
  const frente: [number, number, number] = [0, 0, 1]
  switch (id) {
    case 'tatuajeCorazon': return { parte: 'brazoIzq', p: [0, -a.torsoH * 0.72, a.torsoD * 0.44], n: frente }
    case 'tatuajeAncla': return { parte: 'brazoDer', p: [0, -a.torsoH * 0.72, a.torsoD * 0.44], n: frente }
    case 'tatuajeTribal': return { parte: 'brazoIzq', p: [0.1, -a.torsoH * 0.55, 0], n: [1, 0, 0] }
    case 'tatuajeRosa': return { parte: 'cuerpo', p: [a.torsoW * 0.22, a.torsoY + a.torsoH * 0.15, a.torsoD / 2], n: frente }
    case 'tatuajeDragon': return { parte: 'cuerpo', p: [0, a.torsoY + 0.02, -a.torsoD / 2], n: [0, 0, -1] }
    case 'tatuajeEstrella': return { parte: 'cuerpo', p: [-a.cabezaR * 0.62, a.cabezaY - 0.07 * k, a.caraZ - 0.01], n: frente }
    default: return { parte: 'cuerpo', p: [a.cabezaR * 0.42, a.cabezaY - 0.055 * k, a.caraZ - 0.01], n: frente }
  }
}

/** Lugar donde aparece un tatuaje propio (dibujado o subido) al ponérselo: el centro del pecho. */
export function puntoTatuajePropio(a: AnclasRopa): PuntoTatuaje {
  return { parte: 'cuerpo', p: [0, a.torsoY + a.torsoH * 0.1, a.torsoD / 2], n: [0, 0, 1] }
}

/** Colocación efectiva de un tatuaje puesto: la que eligió el usuario o la de fábrica. */
export function colocacionTatuaje(id: PrendaId, a: AnclasRopa, prenda?: AjustePrenda) {
  return { punto: prenda?.punto ?? puntoInicial(id, a), escala: prenda?.escala ?? 1 }
}

/** Ropa de un personaje: qué prendas lleva y de qué color. */
export type Ropa = Partial<Record<PrendaId, Prenda>>

/** Tamaño por defecto (1 = normal) y límites del control. */
export const ESCALA_DEFAULT = 1
export const ESCALA_MIN = 0.5
export const ESCALA_MAX = 2

/** Categoría de una prenda (agrupa la lista de la pestaña Ropa del editor). */
export type PrendaCategoriaId =
  | 'cabeza' | 'vello' | 'cuello' | 'torso' | 'cintura' | 'pies' | 'accesorios' | 'tatuajes'

/**
 * Metadatos de cada categoría, en el orden en que se muestran. `vello` y
 * `tatuajes` no salen en la pestaña Ropa sino en Rostro y Color (ver
 * `CATEGORIAS_FUERA_DE_ROPA`). `icono`: glifo propio del catálogo (SVG en
 * estilo Profesional) cuando el emoji ya pertenece a otro icono.
 */
export const CATEGORIAS_PRENDA: { id: PrendaCategoriaId; nombre: string; emoji: string; icono?: NombreIcono }[] = [
  { id: 'cabeza', nombre: 'Cabeza', emoji: '🎩' },
  { id: 'vello', nombre: 'Barba y bigote', emoji: '🧔', icono: 'barba' },
  { id: 'cuello', nombre: 'Cuello', emoji: '🧣' },
  { id: 'torso', nombre: 'Torso', emoji: '👕' },
  { id: 'cintura', nombre: 'Cintura y piernas', emoji: '👖' },
  { id: 'pies', nombre: 'Pies', emoji: '👟' },
  { id: 'accesorios', nombre: 'Accesorios', emoji: '🎒' },
  { id: 'tatuajes', nombre: 'Tatuajes', emoji: '🐉', icono: 'tatuaje-dragon' },
]

/** Categorías que viven fuera de la pestaña Ropa: el vello en Rostro, los tatuajes en Color. */
export const CATEGORIAS_FUERA_DE_ROPA: ReadonlySet<PrendaCategoriaId> = new Set(['vello', 'tatuajes'])

/** Metadatos de cada prenda para la interfaz del editor (orden de arriba a abajo). */
export const PRENDAS: {
  id: PrendaId
  nombre: string
  emoji: string
  color: string
  categoria: PrendaCategoriaId
  icono?: NombreIcono
}[] = [
  // Cabeza
  { id: 'sombrero', nombre: 'Sombrero', emoji: '🎩', color: '#3b3b4f', categoria: 'cabeza' },
  { id: 'gorroChef', nombre: 'Gorro de chef', emoji: '🧑‍🍳', color: '#f5f5f0', categoria: 'cabeza' },
  { id: 'gorra', nombre: 'Gorra', emoji: '🧢', color: '#2563eb', categoria: 'cabeza' },
  { id: 'lentes', nombre: 'Lentes', emoji: '🕶️', color: '#1c1c22', categoria: 'cabeza' },
  { id: 'vaquero', nombre: 'Sombrero vaquero', emoji: '🤠', color: '#8b5a2b', categoria: 'cabeza', icono: 'sombrero-vaquero' },
  { id: 'copa', nombre: 'Sombrero de copa', emoji: '🎩', color: '#1f1f26', categoria: 'cabeza', icono: 'sombrero-copa' },
  { id: 'fedora', nombre: 'Fedora', emoji: '🕵️', color: '#4b5563', categoria: 'cabeza', icono: 'fedora' },
  { id: 'boina', nombre: 'Boina', emoji: '🎨', color: '#7f1d1d', categoria: 'cabeza', icono: 'boina' },
  { id: 'gorroLana', nombre: 'Gorro de lana', emoji: '🧶', color: '#0e7490', categoria: 'cabeza', icono: 'gorro-lana' },
  { id: 'charro', nombre: 'Sombrero de charro', emoji: '🐎', color: '#c8a165', categoria: 'cabeza', icono: 'sombrero-charro' },
  { id: 'mexicano', nombre: 'Sombrero mexicano', emoji: '🌵', color: '#e3c07a', categoria: 'cabeza', icono: 'sombrero-mexicano' },
  { id: 'pirata', nombre: 'Sombrero pirata', emoji: '🏴‍☠️', color: '#16161d', categoria: 'cabeza', icono: 'sombrero-pirata' },
  { id: 'corona', nombre: 'Corona', emoji: '👑', color: '#e8b923', categoria: 'cabeza', icono: 'corona' },
  { id: 'vikingo', nombre: 'Casco vikingo', emoji: '⚔️', color: '#9ca3af', categoria: 'cabeza', icono: 'casco-vikingo' },
  // Barba y bigote
  { id: 'bigote', nombre: 'Bigote', emoji: '🥸', color: '#3a2a1a', categoria: 'vello', icono: 'bigote' },
  { id: 'bigoteManubrio', nombre: 'Bigote de manubrio', emoji: '〰️', color: '#3a2a1a', categoria: 'vello', icono: 'bigote-manubrio' },
  { id: 'bigoteMorsa', nombre: 'Bigote de morsa', emoji: '🦭', color: '#3a2a1a', categoria: 'vello', icono: 'bigote-morsa' },
  { id: 'barba', nombre: 'Barba', emoji: '🧔', color: '#3a2a1a', categoria: 'vello', icono: 'barba' },
  { id: 'barbaCandado', nombre: 'Candado', emoji: '🐐', color: '#3a2a1a', categoria: 'vello', icono: 'barba-candado' },
  { id: 'barbaLarga', nombre: 'Barba larga', emoji: '🧙', color: '#6b6b6b', categoria: 'vello', icono: 'barba-larga' },
  { id: 'patillas', nombre: 'Patillas', emoji: '🎸', color: '#3a2a1a', categoria: 'vello', icono: 'patillas' },
  // Cuello
  { id: 'bufanda', nombre: 'Bufanda', emoji: '🧣', color: '#dc2626', categoria: 'cuello' },
  { id: 'corbata', nombre: 'Corbata', emoji: '👔', color: '#1e3a8a', categoria: 'cuello' },
  // Torso
  { id: 'camisa', nombre: 'Camisa', emoji: '🥼', color: '#e5e7eb', categoria: 'torso' },
  { id: 'playera', nombre: 'Playera', emoji: '👕', color: '#3b82f6', categoria: 'torso' },
  { id: 'chamarra', nombre: 'Chamarra', emoji: '🧥', color: '#7a4a2b', categoria: 'torso' },
  { id: 'capa', nombre: 'Capa', emoji: '🦸', color: '#7c3aed', categoria: 'torso' },
  // Cuerpo entero / cintura
  { id: 'vestido', nombre: 'Vestido', emoji: '👗', color: '#db2777', categoria: 'cintura' },
  { id: 'falda', nombre: 'Falda', emoji: '🩱', color: '#be185d', categoria: 'cintura' },
  { id: 'pantalon', nombre: 'Pantalón', emoji: '👖', color: '#334155', categoria: 'cintura' },
  { id: 'shorts', nombre: 'Shorts', emoji: '🩳', color: '#0d9488', categoria: 'cintura' },
  // Pies
  { id: 'botas', nombre: 'Botas', emoji: '🥾', color: '#5b3a1a', categoria: 'pies' },
  { id: 'tenis', nombre: 'Tenis', emoji: '👟', color: '#e5e7eb', categoria: 'pies' },
  // Accesorios
  { id: 'guantes', nombre: 'Guantes', emoji: '🧤', color: '#374151', categoria: 'accesorios' },
  { id: 'mochila', nombre: 'Mochila', emoji: '🎒', color: '#166534', categoria: 'accesorios' },
  // Tatuajes: se colocan en cualquier parte del cuerpo y van encima de la ropa (estampa)
  { id: 'tatuajeCorazon', nombre: 'Corazón', emoji: '❤️', color: '#1e293b', categoria: 'tatuajes', icono: 'tatuaje-corazon' },
  { id: 'tatuajeAncla', nombre: 'Ancla', emoji: '⚓', color: '#1e293b', categoria: 'tatuajes', icono: 'tatuaje-ancla' },
  { id: 'tatuajeTribal', nombre: 'Tribal', emoji: '🌀', color: '#1e293b', categoria: 'tatuajes', icono: 'tatuaje-tribal' },
  { id: 'tatuajeRosa', nombre: 'Rosa', emoji: '🌹', color: '#1e293b', categoria: 'tatuajes', icono: 'tatuaje-rosa' },
  { id: 'tatuajeDragon', nombre: 'Dragón', emoji: '🐉', color: '#1e293b', categoria: 'tatuajes', icono: 'tatuaje-dragon' },
  { id: 'tatuajeEstrella', nombre: 'Estrella', emoji: '⭐', color: '#1e293b', categoria: 'tatuajes', icono: 'tatuaje-estrella' },
  { id: 'tatuajeLagrima', nombre: 'Lágrima', emoji: '💧', color: '#1e293b', categoria: 'tatuajes', icono: 'tatuaje-lagrima' },
]

/** Color por defecto de cada prenda (al ponérsela). */
export const PRENDA_COLOR_DEFAULT = Object.fromEntries(
  PRENDAS.map((p) => [p.id, p.color]),
) as Record<PrendaId, string>

/**
 * Rostro del personaje principal: una expresión dibujada (ojos + boca) o una
 * imagen subida por el usuario que tapa el frente de la cabeza. `ninguno` deja
 * la cabeza lisa como antes.
 */
export type ExpresionId =
  | 'neutral' | 'feliz' | 'sonrisa' | 'sorpresa' | 'guino' | 'serio' | 'ternura' | 'triste' | 'enojado' | 'ninguno'

/** Expresión por defecto (cara amable) cuando el avatar no tiene una elegida. */
export const EXPRESION_DEFAULT: ExpresionId = 'neutral'

/** Metadatos de cada expresión para la interfaz del editor. */
export const EXPRESIONES: { id: ExpresionId; nombre: string; emoji: string }[] = [
  { id: 'neutral', nombre: 'Neutral', emoji: '😐' },
  { id: 'feliz', nombre: 'Feliz', emoji: '😄' },
  { id: 'sonrisa', nombre: 'Sonrisa', emoji: '🙂' },
  { id: 'sorpresa', nombre: 'Sorpresa', emoji: '😮' },
  { id: 'guino', nombre: 'Guiño', emoji: '😉' },
  { id: 'serio', nombre: 'Serio', emoji: '😠' },
  { id: 'ternura', nombre: 'Ternura', emoji: '🥰' },
  { id: 'triste', nombre: 'Triste', emoji: '😢' },
  { id: 'enojado', nombre: 'Enojado', emoji: '😡' },
  { id: 'ninguno', nombre: 'Sin rostro', emoji: '⭕' },
]

/**
 * Peinado del personaje principal, dibujado con primitivas sobre la cabeza del
 * cuerpo base (usa las `anclas`). `ninguno` deja la cabeza sin pelo.
 */
export type PeinadoId =
  | 'ninguno' | 'corto' | 'puntas' | 'coleta' | 'chongo' | 'largo' | 'afro' | 'mohawk' | 'tazon'

/** Color de pelo por defecto (castaño oscuro). */
export const PELO_COLOR_DEFAULT = '#3a2a1a'

/** Metadatos de cada peinado para la interfaz del editor. */
export const PEINADOS: { id: PeinadoId; nombre: string; emoji: string }[] = [
  { id: 'ninguno', nombre: 'Sin pelo', emoji: '🚫' },
  { id: 'corto', nombre: 'Corto', emoji: '💇' },
  { id: 'puntas', nombre: 'Puntas', emoji: '🦔' },
  { id: 'coleta', nombre: 'Coleta', emoji: '🎀' },
  { id: 'chongo', nombre: 'Chongo', emoji: '🍥' },
  { id: 'largo', nombre: 'Largo', emoji: '🦱' },
  { id: 'afro', nombre: 'Afro', emoji: '🌀' },
  { id: 'mohawk', nombre: 'Mohawk', emoji: '🦅' },
  { id: 'tazon', nombre: 'Tazón', emoji: '🥣' },
]

/** Serializa la ropa a JSON para guardar en IndexedDB (vacío = sin ropa). */
export function serializarRopa(ropa: Ropa | undefined): string {
  return ropa && Object.keys(ropa).length ? JSON.stringify(ropa) : ''
}

/** Reconstruye la ropa desde el JSON guardado (vacío/ inválido = sin ropa). */
export function parseRopa(raw: string | undefined): Ropa {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Ropa
  } catch {
    return {}
  }
}

/**
 * Puntos de anclaje del cuerpo donde se coloca cada prenda. Varían por personaje
 * para que la ropa calce: la cabeza (sombrero/lentes), el torso (playera/chamarra)
 * y las piernas/pies (pantalón/tenis).
 */
export interface AnclasRopa {
  /** Centro vertical de la cara (lentes). */
  cabezaY: number
  /** Parte superior de la cabeza (base del sombrero). */
  cabezaTop: number
  /** Medio-ancho de la cabeza (ala del sombrero y separación de lentes). */
  cabezaR: number
  /** Frente de la cara (z de los lentes). */
  caraZ: number
  /** Torso (playera/chamarra). */
  torsoY: number
  torsoW: number
  torsoH: number
  torsoD: number
  /** x de las mangas. */
  brazoX: number
  /** Posiciones x de las piernas/pies (2 = avatar, 1 = agentes con cuerpo único). */
  piernasX: number[]
  piernasY: number
  piernaW: number
  piernaH: number
  piernaD: number
  /** y de los pies (tenis). */
  piesY: number
  /**
   * Tamaño/posición propios del cuerpo de la chamarra (override). Para cuerpos
   * redondos y anchos (búho) que deben quedar "metidos" en una prenda grande, con
   * la cabeza asomando. Si falta, la chamarra se deriva del torso como siempre.
   */
  chamarra?: { w: number; h: number; d: number; y: number }
}

/** Anclas del personaje principal (box-man de `AvatarModelo`). */
export const ANCLAS_AVATAR: AnclasRopa = {
  cabezaY: 1.52, cabezaTop: 1.72, cabezaR: 0.22, caraZ: 0.23,
  torsoY: 0.92, torsoW: 0.6, torsoH: 0.62, torsoD: 0.3, brazoX: 0.42,
  piernasX: [-0.14, 0.14], piernasY: 0.34, piernaW: 0.3, piernaH: 0.56, piernaD: 0.32, piesY: 0.07,
}

/**
 * Anclas por forma de asistente (mago/gato/perro/búho/robot). Son más bajos que el
 * avatar y con la cabeza más grande respecto al cuerpo, así que la ropa se baja y
 * se ensancha, y el pantalón/tenis usan una sola pieza centrada.
 */
const ANCLAS_FORMA: Record<MascotaId, AnclasRopa> = {
  mago: {
    cabezaY: 1.1, cabezaTop: 1.34, cabezaR: 0.24, caraZ: 0.22,
    torsoY: 0.55, torsoW: 0.5, torsoH: 0.66, torsoD: 0.44, brazoX: 0.3,
    piernasX: [0], piernasY: 0.26, piernaW: 0.52, piernaH: 0.42, piernaD: 0.44, piesY: 0.12,
  },
  gato: {
    cabezaY: 1.06, cabezaTop: 1.3, cabezaR: 0.23, caraZ: 0.22,
    torsoY: 0.58, torsoW: 0.5, torsoH: 0.6, torsoD: 0.42, brazoX: 0.3,
    piernasX: [0], piernasY: 0.34, piernaW: 0.48, piernaH: 0.36, piernaD: 0.42, piesY: 0.16,
  },
  perro: {
    cabezaY: 1.06, cabezaTop: 1.3, cabezaR: 0.24, caraZ: 0.24,
    torsoY: 0.58, torsoW: 0.54, torsoH: 0.6, torsoD: 0.46, brazoX: 0.31,
    piernasX: [0], piernasY: 0.34, piernaW: 0.52, piernaH: 0.36, piernaD: 0.46, piesY: 0.16,
  },
  buho: {
    // Ojos grandes salientes: los lentes van bien al frente (caraZ alto) para no
    // meterse en los ojos. La ropa baja para quedar debajo del pico (y≈0.78).
    cabezaY: 0.92, cabezaTop: 1.22, cabezaR: 0.3, caraZ: 0.52,
    torsoY: 0.44, torsoW: 0.62, torsoH: 0.46, torsoD: 0.5, brazoX: 0.34,
    piernasX: [0], piernasY: 0.3, piernaW: 0.5, piernaH: 0.32, piernaD: 0.5, piesY: 0.16,
    // Chamarra grande que envuelve el cuerpo redondo (más ancha que el búho, ~0.84):
    // la cabeza (ojos y pico, y≈0.78–0.92) asoma por arriba.
    chamarra: { w: 0.96, h: 0.66, d: 0.88, y: 0.45 },
  },
  robot: {
    cabezaY: 1.04, cabezaTop: 1.26, cabezaR: 0.22, caraZ: 0.19,
    torsoY: 0.55, torsoW: 0.5, torsoH: 0.6, torsoD: 0.36, brazoX: 0.3,
    piernasX: [0], piernasY: 0.3, piernaW: 0.48, piernaH: 0.36, piernaD: 0.36, piesY: 0.1,
  },
}

/** Cuerpo actual de un personaje (avatar o asistente): lo mínimo para resolver anclas/soporte de rostro. */
interface CuerpoActual {
  forma?: MascotaId
  cuerpoPresetId?: string
  modelo3d?: Pieza3D[]
  modeloGlb?: Blob
  rostro?: Blob
  expresion?: ExpresionId
}

/**
 * Formas integradas cuya "cara" son solo un par de ojos y por tanto admiten el
 * rostro del editor: el gato. Las demás traen pico, visor o hocico modelados,
 * que son parte de su identidad y no se pueden tapar sin romperlas.
 */
const FORMAS_CON_ROSTRO = new Set<MascotaId>(['gato'])

/**
 * Anclas de ropa del cuerpo actual: con modelo propio (piezas o .glb) usa la
 * huella del avatar (los `CUERPOS_PRESET` calzan con ella vía `torsoBase()`,
 * igual que el "Base" horneado para un asistente); con una de las 5 formas
 * integradas, la tabla de esa forma; sin nada, Base.
 */
export function anclasDe(p: CuerpoActual): AnclasRopa {
  if (p.modeloGlb || (p.modelo3d?.length ?? 0) > 0) return ANCLAS_AVATAR
  return p.forma ? ANCLAS_FORMA[p.forma] : ANCLAS_AVATAR
}

/**
 * ¿Este cuerpo admite el editor genérico de Rostro (expresión/foto)? Base (con
 * o sin preset "Base" de asistente), Princesa y el gato: el resto ya tiene
 * pico/visor/hocico fijos que son parte de su identidad.
 */
export function soportaRostro(p: CuerpoActual): boolean {
  if (p.modeloGlb) return false
  if ((p.modelo3d?.length ?? 0) > 0) return p.cuerpoPresetId === 'base' || p.cuerpoPresetId === 'princesa'
  return !p.forma || FORMAS_CON_ROSTRO.has(p.forma)
}

/** ¿El usuario le eligió cara (foto o expresión)? Distinto de «admite rostro». */
function rostroElegido(p: CuerpoActual): boolean {
  return !!p.rostro || p.expresion != null
}

/**
 * ¿Hay que DIBUJAR el rostro del editor? En las formas con ojos de fábrica (el
 * gato) solo cuando el usuario eligió cara; si no, se queda con la suya. En los
 * cuerpos sin cara propia se dibuja siempre que la admitan.
 */
export function muestraRostro(p: CuerpoActual): boolean {
  return soportaRostro(p) && (!p.forma || rostroElegido(p))
}

/**
 * ¿Este cuerpo admite Peinado? Solo Base (con o sin preset "Base" de
 * asistente): el resto trae casco/capucha/pelaje/tiara fijos sin cuero
 * cabelludo expuesto.
 */
export function soportaPeinado(p: CuerpoActual): boolean {
  if (p.modeloGlb) return false
  if ((p.modelo3d?.length ?? 0) > 0) return p.cuerpoPresetId === 'base'
  return !p.forma
}
