import type { MomentoComida } from '../../core/data/db'
import type { CampoCaptura } from '../../core/appContrato'
import { conversarIA, extraerJSON } from '../../core/chat/ia'
import { vLista, vNumero, vTexto } from '../../core/appContrato'
import { vMomentos } from './momentos'

/**
 * Los campos de una receta, tal y como se le explican al modelo. Viven aquí
 * para que el esquema del chat (rooms/cocina/index.tsx) y el botón «Crear con
 * IA» pidan exactamente lo mismo: si divergen, la misma receta sale distinta
 * según por dónde la pidas.
 */
export const CAMPOS_RECETA: CampoCaptura[] = [
  { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre del platillo', requerido: true },
  { campo: 'emoji', tipo: 'texto', descripcion: 'Un emoji que represente el platillo (ej. 🍗)' },
  { campo: 'porciones', tipo: 'numero', descripcion: 'Porciones que rinde la receta (defecto 2)' },
  { campo: 'minutos', tipo: 'numero', descripcion: 'Tiempo total de preparación en minutos' },
  {
    campo: 'momentos',
    tipo: 'lista',
    descripcion:
      'Para qué momentos del día encaja, SOLO de esta lista: "desayuno", "comida", "cena", "snack". Puede llevar varios (ej. un batido: ["desayuno","snack"]). Si sirve para cualquier momento o no está claro, manda una lista vacía.',
  },
  { campo: 'etiquetas', tipo: 'lista', descripcion: 'Etiquetas cortas: tipo de platillo, dieta, ocasión (ej. "pollo", "rápida", "alta proteína")' },
  { campo: 'ingredientes', tipo: 'lista', descripcion: 'Un ingrediente por elemento, CON cantidad (ej. "200 g de arroz", "1 cucharada de aceite")', requerido: true },
  { campo: 'pasos', tipo: 'lista', descripcion: 'Pasos de preparación en orden, uno por elemento, claros y concisos', requerido: true },
  { campo: 'calorias', tipo: 'numero', descripcion: 'Calorías estimadas POR PORCIÓN (kcal)' },
  { campo: 'proteinas', tipo: 'numero', descripcion: 'Gramos de proteína por porción' },
  { campo: 'carbohidratos', tipo: 'numero', descripcion: 'Gramos de carbohidratos por porción' },
  { campo: 'grasas', tipo: 'numero', descripcion: 'Gramos de grasa por porción' },
]

export const CAMPOS_DIETA: CampoCaptura[] = [
  { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre corto de la dieta (ej. "Keto 1800", "Volumen limpio")', requerido: true },
  { campo: 'descripcion', tipo: 'texto', descripcion: 'En qué consiste y para quién sirve, 1-2 frases', requerido: true },
  { campo: 'calorias', tipo: 'numero', descripcion: 'Meta diaria de calorías (kcal) de la dieta' },
  { campo: 'proteinas', tipo: 'numero', descripcion: 'Meta diaria de proteína en gramos' },
  { campo: 'carbohidratos', tipo: 'numero', descripcion: 'Meta diaria de carbohidratos en gramos' },
  { campo: 'grasas', tipo: 'numero', descripcion: 'Meta diaria de grasas en gramos' },
]

const TIPO_JSON: Record<CampoCaptura['tipo'], string> = {
  texto: 'string',
  numero: 'number',
  fecha: 'string',
  opcion: 'string',
  lista: 'string[]',
}

/** Convierte los campos del esquema en las instrucciones de un JSON plano. */
function contrato(campos: CampoCaptura[]): string {
  return campos
    .map((c) => `"${c.campo}": ${TIPO_JSON[c.tipo]} — ${c.descripcion}${c.requerido ? ' (obligatorio)' : ''}`)
    .join('\n')
}

const SYSTEM_RECETA = [
  'Eres un chef que escribe recetas caseras claras y realistas.',
  'Responde ÚNICAMENTE con un objeto JSON plano, sin texto ni markdown alrededor, con estas claves:',
  contrato(CAMPOS_RECETA),
  'Inventa la receta completa aunque el usuario solo diga el nombre del platillo. Escribe en español.',
].join('\n')

export interface RecetaIA {
  nombre: string
  emoji: string
  porciones: number
  minutos: number
  momentos: MomentoComida[]
  etiquetas: string[]
  ingredientes: string[]
  pasos: string[]
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
}

/** Pide una receta a la IA. No guarda nada: el usuario revisa y confirma. */
export async function crearRecetaIA(peticion: string): Promise<RecetaIA> {
  const respuesta = await conversarIA(SYSTEM_RECETA, [{ rol: 'usuario', texto: peticion }], 1200)
  const json = extraerJSON(respuesta)
  const nombre = vTexto(json.nombre)
  const ingredientes = vLista(json.ingredientes)
  const pasos = vLista(json.pasos)
  if (!nombre || ingredientes.length === 0 || pasos.length === 0) {
    throw new Error('La IA no devolvió una receta usable')
  }
  return {
    nombre,
    emoji: vTexto(json.emoji, '🍲'),
    porciones: Math.max(1, Math.round(vNumero(json.porciones, 2))),
    minutos: Math.max(0, Math.round(vNumero(json.minutos))),
    momentos: vMomentos(json.momentos),
    etiquetas: vLista(json.etiquetas),
    ingredientes,
    pasos,
    calorias: Math.max(0, Math.round(vNumero(json.calorias))),
    proteinas: Math.max(0, Math.round(vNumero(json.proteinas))),
    carbohidratos: Math.max(0, Math.round(vNumero(json.carbohidratos))),
    grasas: Math.max(0, Math.round(vNumero(json.grasas))),
  }
}

const SYSTEM_DIETA = [
  'Eres un nutriólogo que diseña planes de alimentación sensatos y sostenibles.',
  'Responde ÚNICAMENTE con un objeto JSON plano, sin texto ni markdown alrededor, con estas claves:',
  contrato(CAMPOS_DIETA),
  '"recetas": string[] — 3 o 4 platillos que compongan la dieta, solo sus nombres.',
  'Escribe en español.',
].join('\n')

export interface DietaIA {
  nombre: string
  descripcion: string
  calorias?: number
  proteinas?: number
  carbohidratos?: number
  grasas?: number
  /** Nombres de los platillos sugeridos; las recetas se crean aparte. */
  recetas: string[]
}

/** Pide una dieta a la IA. Devuelve las metas y los platillos que la componen. */
export async function crearDietaIA(peticion: string): Promise<DietaIA> {
  const respuesta = await conversarIA(SYSTEM_DIETA, [{ rol: 'usuario', texto: peticion }], 800)
  const json = extraerJSON(respuesta)
  const nombre = vTexto(json.nombre)
  if (!nombre) throw new Error('La IA no devolvió una dieta usable')
  const meta = (x: unknown) => {
    const n = vNumero(x)
    return n > 0 ? Math.round(n) : undefined
  }
  return {
    nombre,
    descripcion: vTexto(json.descripcion),
    calorias: meta(json.calorias),
    proteinas: meta(json.proteinas),
    carbohidratos: meta(json.carbohidratos),
    grasas: meta(json.grasas),
    recetas: vLista(json.recetas).slice(0, 4),
  }
}
