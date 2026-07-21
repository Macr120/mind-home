/** Tipos visuales de muro y puerta (estilo Roblox, personalizables por color). */

export type TipoMuroId = 'solido' | 'ventana' | 'ladrillo' | 'madera' | 'vitraje'
export type TipoPuertaId = 'recta' | 'sin' | 'doble' | 'porton' | 'corredera'
/** Perfil superior del muro (silueta), independiente de la textura. */
export type FormaMuroId = 'recta' | 'arco' | 'esquinas' | 'triangulo'
/** Remate del vano de la puerta: recto (rectángulo), arco o pico triangular. */
export type FormaVanoId = Exclude<FormaMuroId, 'esquinas'>
/** Forma del cristal de la ventana / abertura. */
export type VentanaFormaId = 'cuadrado' | 'circulo' | 'triangulo'
/** Qué vive en el vano: ventana (cristal), cuadro con foto o espejo con reflejo. */
export type VentanaContenidoId = 'ventana' | 'cuadro' | 'espejo'

export interface EstiloMuro {
  tipo: TipoMuroId
  color: string
  /** Forma paramétrica (factores; default = valor base). */
  alto?: number // factor de WALL_H
  grosor?: number // factor de WALL_T
  /** El muro tiene una ventana (independiente de que el borde sea puerta o pared). */
  ventana?: boolean
  /** Parámetros de la ventana. */
  ventAncho?: number // factor del largo del muro
  ventAlto?: number // metros
  ventPosY?: number // factor de WALL_H (centro vertical)
  ventPosX?: number // posición horizontal a lo largo del muro (-1 izq … 1 der)
  ventForma?: VentanaFormaId // cuadrado (default) o círculo
  /** Contenido del vano: ventana (default), cuadro con foto o espejo (empotrados, sin hueco). */
  ventContenido?: VentanaContenidoId
  /** Cara del muro donde vive el cuadro/espejo (default 'interior'; la otra queda lisa). */
  ventCara?: 'interior' | 'exterior'
  ventRot?: number // rotación del cristal en grados (cuadrado → rombo a 45°)
  ventColor?: string // color del cristal (default celeste)
  ventMosaico?: boolean // cristal dividido en piezas (vitral)
  ventMulticolor?: boolean // cada pieza del mosaico con un color distinto
  /** Silueta superior del muro: recta (default), arco, esquinas elevadas o triángulo. */
  forma?: FormaMuroId
  formaAlto?: number // alto extra del pico/postes, factor de WALL_H
  formaAncho?: number // ancho del pico/postes/triángulo, factor del largo del muro
  formaPosX?: number // posición del pico del triángulo dentro de su base (-1 izq … 1 der)
  /** Dividir en dos cuerpos: la forma (arco/triángulo/esquinas) lleva textura propia. */
  formaDividir?: boolean
  formaColor?: string // color de la forma cuando se divide en dos cuerpos
}

export interface EstiloPuerta {
  tipo: TipoPuertaId
  color: string
  /** Forma paramétrica del vano. */
  anchoVano?: number // factor de DOOR_W
  alto?: number // alto de la hoja como factor del alto del muro (0–1)
  posX?: number // posición horizontal a lo largo del muro (-1 izq … 1 der)
  /** Remate del vano sobre la hoja: recto (default), arco o pico triangular. */
  vanoForma?: FormaVanoId
  vanoFormaAlto?: number // alto del arco/pico, factor de WALL_H (como formaAlto del muro)
  vanoFormaAncho?: number // base del pico (triángulo), factor del ancho del vano
  vanoFormaPosX?: number // posición del pico dentro de su base (-1 izq … 1 der)
}

export interface EstiloArista {
  muro?: EstiloMuro
  puerta?: EstiloPuerta
}

export interface PincelesCuarto {
  muro: EstiloMuro
  puerta: EstiloPuerta
}

export const PINCELES_DEFAULT: PincelesCuarto = {
  muro: { tipo: 'solido', color: '#8c8073' },
  puerta: { tipo: 'recta', color: '#b9824f' },
}

export const TIPOS_MURO: {
  id: TipoMuroId
  nombre: string
  defaultColor: string
  /** Vista previa CSS (gradiente / patrón). */
  preview: string
}[] = [
  {
    id: 'solido',
    nombre: 'Sólido',
    defaultColor: '#8c8073',
    preview: 'linear-gradient(135deg,#7a746a,#9a9488)',
  },
  {
    id: 'ventana',
    nombre: 'Con ventana',
    defaultColor: '#8c8073',
    preview: 'linear-gradient(180deg,#7a746a 35%,#7dd3fc 35%,#7dd3fc 65%,#7a746a 65%)',
  },
  {
    id: 'ladrillo',
    nombre: 'Ladrillo',
    defaultColor: '#a0522d',
    preview: 'repeating-linear-gradient(90deg,#8b4513 0 8px,#a0522d 8px 16px)',
  },
  {
    id: 'madera',
    nombre: 'Madera',
    defaultColor: '#7a5230',
    preview: 'repeating-linear-gradient(90deg,#6b4423 0 3px,#8b5a2b 3px 6px)',
  },
  {
    id: 'vitraje',
    nombre: 'Cristal',
    defaultColor: '#94a3b8',
    preview: 'linear-gradient(135deg,#64748b44,#bae6fd88)',
  },
]

export const TIPOS_PUERTA: {
  id: TipoPuertaId
  nombre: string
  defaultColor: string
  preview: string
}[] = [
  {
    id: 'recta',
    nombre: 'Recta',
    defaultColor: '#b9824f',
    preview: 'linear-gradient(180deg,#cf9d6c 8%,#b9824f 8%)',
  },
  {
    id: 'sin',
    nombre: 'Sin puerta',
    defaultColor: '#b9824f',
    preview: 'linear-gradient(180deg,#cf9d6c 0 12%,#15171c 12%)',
  },
  {
    id: 'doble',
    nombre: 'Doble hoja',
    defaultColor: '#b9824f',
    preview: 'linear-gradient(90deg,#b9824f 48%,#cf9d6c 48% 52%,#b9824f 52%)',
  },
  {
    id: 'porton',
    nombre: 'Portón',
    defaultColor: '#b8c4cc',
    preview: 'repeating-linear-gradient(180deg,#b8c4cc 0 4px,#9ca3af 4px 8px)',
  },
  {
    id: 'corredera',
    nombre: 'Corredera',
    defaultColor: '#64748b',
    preview: 'linear-gradient(90deg,#475569 30%,#64748b 30% 70%,#334155 70%)',
  },
]

export const TIPOS_FORMA_MURO: { id: FormaVanoId; nombre: string }[] = [
  { id: 'recta', nombre: 'Recta' },
  { id: 'arco', nombre: 'Arco' },
  { id: 'triangulo', nombre: 'Triángulo' },
]

// ── Remate del vano de puerta (compartido por todos los tipos de muro) ────────
/** Alto por defecto del arco/pico del vano, factor de WALL_H. */
export const VANO_FORMA_ALTO_DEFAULT = 0.35

/**
 * Perfil del remate del vano (fracción 0–1 del alto extra) en la columna
 * un ∈ [-1 … 1] del ancho del vano. Fuente única: la usan el dintel de los
 * cuartos, el hueco de los muros libres/diagonales y el muro curvo, para que
 * la silueta del vano sea idéntica en todos los tipos de muro.
 */
export function perfilFormaVano(forma: FormaVanoId, un: number, ancho = 1, posX = 0): number {
  if (forma === 'arco') return Math.sqrt(Math.max(0, 1 - un * un))
  if (forma === 'triangulo') {
    const half = Math.max(0.05, Math.min(1, ancho))
    const apex = posX * half
    // Vértice exacto aparte: con el pico en el borde de la base (posX ±1) una de las
    // pendientes tiene ancho 0 y la fórmula lineal lo aplastaría a 0.
    if (un === apex) return 1
    if (un < apex) {
      const izq = apex + half
      return izq <= 1e-6 ? 0 : Math.max(0, (un + half) / izq)
    }
    const der = half - apex
    return der <= 1e-6 ? 0 : Math.max(0, (half - un) / der)
  }
  return 0
}

/**
 * Puntos (un, fracción) del remate del vano recorridos de un=+1 a un=−1, para
 * construir shapes 2D: el arco muestreado y el triángulo con vértices exactos.
 */
export function puntosRemateVano(forma: FormaVanoId, ancho = 1, posX = 0): [number, number][] {
  if (forma === 'arco') {
    const pts: [number, number][] = []
    const N = 24
    for (let i = 0; i <= N; i++) {
      const t = (Math.PI * i) / N
      pts.push([Math.cos(t), Math.sin(t)])
    }
    return pts
  }
  if (forma === 'triangulo') {
    const half = Math.max(0.05, Math.min(1, ancho))
    const apex = posX * half
    const pts: [number, number][] = []
    if (half < 0.999) pts.push([1, 0])
    pts.push([half, 0], [apex, 1], [-half, 0])
    if (half < 0.999) pts.push([-1, 0])
    return pts
  }
  return []
}

export const TIPOS_VENTANA_FORMA: { id: VentanaFormaId; nombre: string }[] = [
  { id: 'cuadrado', nombre: 'Cuadrado' },
  { id: 'circulo', nombre: 'Círculo' },
  { id: 'triangulo', nombre: 'Triángulo' },
]

export const TIPOS_VENTANA_CONTENIDO: { id: VentanaContenidoId; nombre: string }[] = [
  { id: 'ventana', nombre: 'Ventana' },
  { id: 'cuadro', nombre: 'Cuadro' },
  { id: 'espejo', nombre: 'Espejo' },
]

/** Color del cristal por defecto (celeste claro). */
export const VENTANA_COLOR_DEFAULT = '#bcdcff'
