/** Tipos visuales de muro y puerta (estilo Roblox, personalizables por color). */

export type TipoMuroId = 'solido' | 'ventana' | 'ladrillo' | 'madera' | 'vitraje'
export type TipoPuertaId = 'recta' | 'sin' | 'doble' | 'porton' | 'corredera'
/** Perfil superior del muro (silueta), independiente de la textura. */
export type FormaMuroId = 'recta' | 'arco' | 'esquinas' | 'triangulo'
/** Forma del cristal de la ventana. */
export type VentanaFormaId = 'cuadrado' | 'circulo'

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

export const TIPOS_FORMA_MURO: { id: FormaMuroId; nombre: string }[] = [
  { id: 'recta', nombre: 'Recta' },
  { id: 'arco', nombre: 'Arco' },
  { id: 'esquinas', nombre: 'Esquinas altas' },
  { id: 'triangulo', nombre: 'Triángulo' },
]

export const TIPOS_VENTANA_FORMA: { id: VentanaFormaId; nombre: string }[] = [
  { id: 'cuadrado', nombre: 'Cuadrado' },
  { id: 'circulo', nombre: 'Círculo' },
]

/** Color del cristal por defecto (celeste claro). */
export const VENTANA_COLOR_DEFAULT = '#bcdcff'

export function muroDefecto(tipo: TipoMuroId = 'solido'): EstiloMuro {
  const c = TIPOS_MURO.find((t) => t.id === tipo)!
  return { tipo, color: c.defaultColor }
}

export function puertaDefecto(tipo: TipoPuertaId = 'recta'): EstiloPuerta {
  const c = TIPOS_PUERTA.find((t) => t.id === tipo)!
  return { tipo, color: c.defaultColor }
}
