import type { ComponentType } from 'react'
import biblioteca from '../rooms/biblioteca'
import bodega from '../rooms/bodega'
import hobbies from '../rooms/hobbies'
import entretenimiento from '../rooms/entretenimiento'
import garage from '../rooms/garage'
import jardin from '../rooms/jardin'
import sala from '../rooms/sala'
import cocina from '../rooms/cocina'
import ejercicio from '../rooms/ejercicio'
import despacho from '../rooms/despacho'
import diario from '../rooms/diario'
import recamara from '../rooms/recamara'
/**
 * Esquema de captura declarativo: describe QUÉ datos forman un registro del
 * cuarto, sin decir cómo extraerlos del texto. La capa de IA leerá estos
 * esquemas como "herramientas" (el modelo llena los campos y `guardar` crea
 * el registro real vía repos). Las `descripcion` están escritas para el
 * modelo: deben bastar para llenar el campo sin ver el código.
 */
export interface CampoCaptura {
  campo: string
  tipo: 'texto' | 'numero' | 'fecha' | 'opcion'
  /** Qué significa el campo y cómo llenarlo (dirigida al modelo de IA). */
  descripcion: string
  /** Valores permitidos cuando tipo === 'opcion'. */
  opciones?: string[]
  requerido?: boolean
}

export interface EsquemaCaptura {
  /** Identificador del tipo de registro (ej. 'comida', 'agua'). */
  id: string
  /** Qué representa un registro de este tipo (dirigida al modelo de IA). */
  descripcion: string
  campos: CampoCaptura[]
  /** Crea el registro real a partir de los campos llenados (usa repos). */
  guardar: (valores: Record<string, unknown>) => Promise<void>
}

// Coerciones seguras para `guardar`: los valores llegan del modelo (unknown).
export const vTexto = (v: unknown, def = ''): string => (typeof v === 'string' && v.trim() ? v.trim() : def)
export const vNumero = (v: unknown, def = 0): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : def
}
export const vFecha = (v: unknown): string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10)

/**
 * Plantilla de app: una mini-app 2D del catálogo que el usuario puede ASIGNAR a un
 * objeto de un cuarto. La plantilla NO es un cuarto; la identidad del cuarto vive en
 * `Cuarto` (src/core/data/db.ts) y el store dinámico `useCuartos`. Una plantilla aporta
 * el componente `App`, su captura rápida y sus esquemas para el orquestador/IA.
 *
 * Agregar una plantilla = crear su carpeta en src/rooms/ y registrarla abajo.
 */
export interface Plantilla {
  id: string
  nombre: string
  /** Emoji de la plantilla (se hereda al cuarto/objeto si se desea). */
  icon: string
  categoria: 'cuerpo' | 'mente' | 'complemento' | 'config'
  color: string
  /** La mini-app 2D que se abre al usar la plantilla. */
  App: ComponentType
  /** Legado: posición en la cuadrícula del modelo viejo (ya no se usa). */
  posicion?: [number, number, number]
  /**
   * Quick-capture determinista (regex): intenta convertir texto libre en un
   * registro real. Retorna true si guardó algo. Es el fallback sin red/sin IA;
   * la capa de IA usa `esquemas` en su lugar.
   */
  capturar?: (texto: string) => Promise<boolean>
  /** Tipos de registro que esta plantilla puede capturar (contrato para la IA). */
  esquemas?: EsquemaCaptura[]
}

/** @deprecated Usar `Plantilla`. Alias para no romper los módulos de src/rooms/. */
export type RoomModule = Plantilla

/** Catálogo de plantillas (las 12 apps). Antes eran los "cuartos" cableados. */
export const plantillas: Plantilla[] = [
  cocina,
  ejercicio,
  recamara,
  despacho,
  biblioteca,
  entretenimiento,
  sala,
  jardin,
  garage,
  diario,
  bodega,
  hobbies,
]

export const getPlantilla = (id: string) => plantillas.find((p) => p.id === id)

/**
 * @deprecated El arreglo estático ya NO representa los cuartos de la casa (que ahora
 * son dinámicos: `useCuartos`). Se mantiene como alias del CATÁLOGO de plantillas para
 * el orquestador/IA, que referencia plantillas por su id. Para instancias de cuarto usa
 * `useCuartos` / `getCuarto`.
 */
export const rooms = plantillas
/** @deprecated Alias del catálogo. Para instancias de cuarto usa `getCuarto`. */
export const getRoom = getPlantilla

/** Descripción corta de cada plantilla (para el catálogo de asignación). */
export const DESCRIPCIONES: Record<string, string> = {
  cocina: 'Nutrición: registra comidas, macros, agua y tu plan semanal.',
  ejercicio: 'Rutinas de fuerza, resistencia y flexibilidad con metas.',
  recamara: 'Controla tu descanso y escribe tu anecdotario personal.',
  despacho: 'Finanzas: presupuesto, gastos por categoría, gráficas y metas.',
  biblioteca: 'Tu enciclopedia de aprendizaje y progreso por temas.',
  entretenimiento: 'Archivo de películas, series, libros y juegos de mesa.',
  sala: 'Planifica viajes: itinerario, gastos, checklist y lista de deseos.',
  jardin: 'Mindfulness: meditación, respiración, ánimo y gratitud.',
  garage: 'Mantenimiento de tus vehículos y sus servicios.',
  diario: 'Central de noticias del día, por categorías.',
  bodega: 'Inventario y archivo: guarda cosas y respalda tus datos.',
  hobbies: 'Tus pasatiempos y proyectos creativos.',
}
