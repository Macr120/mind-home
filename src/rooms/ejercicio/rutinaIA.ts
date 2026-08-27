import type { CampoCaptura } from '../../core/appContrato'
import { vLista, vNumero, vTexto } from '../../core/appContrato'
import { conversarIA, extraerJSON } from '../../core/chat/ia'
import type { TipoEntrenamiento } from '../../core/data/db'
import { rutinasCardioRepo, rutinasFlexRepo, rutinasFuerzaRepo } from '../../core/data/repository'
import { datosIdioma } from '../../core/i18n/idiomas'
import { CLAUSULA_SALUD } from '../../core/planIA'
import { useAjustes } from '../../core/state/ajustesStore'
import type { GrupoCatalogo } from './catalogo'

/**
 * Rutinas de entrenamiento escritas por la IA. Nacen DENTRO de la app —en las
 * tablas `rutinasFuerza/Cardio/Flex`, junto a las que se arman a mano— y no
 * como misiones del calendario: una rutina es la lista de ejercicios que se
 * repite, no un evento agendado. Lo que se agenda ya es cosa del planificador
 * ✨ de Misiones, que ELIGE entre estas.
 *
 * El contrato de campos es uno solo para las dos puertas (el botón ✨ del
 * catálogo y la herramienta del chat): si divergieran, la misma petición daría
 * rutinas distintas según por dónde entrara.
 */

/** Cuántos ejercicios del catálogo se le enseñan a la IA por modalidad. */
const MAX_CATALOGO = 80
/** Tope de ejercicios de una rutina: más no se lee ni se entrena de una sentada. */
const MAX_EJERCICIOS = 15

export const CAMPOS_RUTINA: CampoCaptura[] = [
  {
    campo: 'tipo',
    tipo: 'opcion',
    opciones: ['fuerza', 'resistencia', 'flexibilidad'],
    descripcion:
      "Modalidad de la rutina: pesas/gym/hipertrofia = 'fuerza'; correr/cardio/bici/nadar/HIIT = 'resistencia'; yoga/movilidad/estiramientos = 'flexibilidad'",
    requerido: true,
  },
  { campo: 'nombre', tipo: 'texto', descripcion: 'Nombre corto de la rutina (ej. "Empuje · pecho y tríceps")', requerido: true },
  { campo: 'duracionMin', tipo: 'numero', descripcion: 'Duración total de la sesión en minutos' },
  { campo: 'descripcion', tipo: 'texto', descripcion: 'Una frase: qué trabaja y para quién es' },
  {
    campo: 'ejercicios',
    tipo: 'lista',
    descripcion:
      'Los ejercicios en el orden en que se hacen, uno por elemento y solo el NOMBRE (nada de series ni repeticiones)',
    requerido: true,
  },
]

export interface RutinaIA {
  tipo: TipoEntrenamiento
  nombre: string
  duracionMin: number
  descripcion: string
  ejercicios: string[]
}

const TIPO_DEFECTO: Record<TipoEntrenamiento, number> = { fuerza: 45, resistencia: 30, flexibilidad: 15 }

const esTipo = (v: string): v is TipoEntrenamiento =>
  v === 'fuerza' || v === 'resistencia' || v === 'flexibilidad'

/**
 * Valida la respuesta del modelo (llega como `unknown`). Devuelve null en vez
 * de lanzar porque una de las dos puertas es el chat, donde una excepción
 * tumbaría el turno entero con sus otros registros.
 */
export function normalizarRutinaIA(
  json: Record<string, unknown>,
  tipoDefecto: TipoEntrenamiento,
): RutinaIA | null {
  const crudo = vTexto(json.tipo)
  const tipo = esTipo(crudo) ? crudo : tipoDefecto
  const nombre = vTexto(json.nombre)
  const ejercicios = vLista(json.ejercicios).slice(0, MAX_EJERCICIOS)
  if (!nombre || ejercicios.length === 0) return null
  return {
    tipo,
    nombre,
    duracionMin: Math.max(1, Math.round(vNumero(json.duracionMin, TIPO_DEFECTO[tipo]))),
    descripcion: vTexto(json.descripcion),
    ejercicios,
  }
}

const TIPO_JSON: Record<CampoCaptura['tipo'], string> = {
  texto: 'string',
  numero: 'number',
  fecha: 'string',
  opcion: 'string',
  lista: 'string[]',
}

/** Convierte los campos del contrato en las instrucciones de un JSON plano. */
function contrato(campos: CampoCaptura[]): string {
  return campos
    .map((c) => `"${c.campo}": ${TIPO_JSON[c.tipo]} — ${c.descripcion}${c.requerido ? ' (obligatorio)' : ''}`)
    .join('\n')
}

const ROL: Record<TipoEntrenamiento, string> = {
  fuerza: 'Eres un entrenador de fuerza que arma sesiones equilibradas y progresivas.',
  resistencia: 'Eres un entrenador de resistencia que arma sesiones de cardio con sentido (calentamiento, bloque principal y vuelta a la calma).',
  flexibilidad: 'Eres un instructor de movilidad y yoga que encadena posturas en un orden que fluye.',
}

/**
 * Pide una rutina a la IA. NO guarda nada: la respuesta cae en el formulario de
 * «Crear rutina» para revisarla y confirmarla, igual que la receta de cocina.
 *
 * Al modelo se le enseña el catálogo VIVO del usuario porque el nombre del
 * ejercicio es su identidad: con el nombre del catálogo la rutina hereda
 * historial, récords e ilustración; inventado, empieza de cero.
 */
export async function crearRutinaIA(
  peticion: string,
  tipo: TipoEntrenamiento,
  catalogo: GrupoCatalogo[],
): Promise<RutinaIA> {
  const idioma = datosIdioma(useAjustes.getState().idioma).nombreIA
  const disponibles = catalogo
    .flatMap((g) => g.ejercicios.map((e) => `${g.label}: ${e}`))
    .slice(0, MAX_CATALOGO)
  const system = [
    ROL[tipo],
    CLAUSULA_SALUD,
    `La rutina es SIEMPRE de tipo "${tipo}".`,
    'Responde ÚNICAMENTE con un objeto JSON plano, sin texto ni markdown alrededor, con estas claves:',
    contrato(CAMPOS_RUTINA),
    disponibles.length > 0
      ? `Elige los ejercicios de este catálogo del usuario y cópiales el nombre EXACTO (sin la categoría de delante). Solo inventa uno si de verdad falta algo que la rutina necesita:\n${disponibles.join('\n')}`
      : 'El usuario no tiene catálogo todavía: usa nombres de ejercicios comunes y reconocibles.',
    `Escribe el nombre y la descripción en ${idioma}.`,
  ].join('\n')

  const respuesta = await conversarIA(system, [{ rol: 'usuario', texto: peticion }], 900)
  const rutina = normalizarRutinaIA(extraerJSON(respuesta), tipo)
  if (!rutina) throw new Error('La IA no devolvió una rutina usable')
  return rutina
}

/** Guarda la rutina en la tabla de su modalidad (la puerta del chat). */
export async function guardarRutinaEjercicio(r: RutinaIA, enfoque?: string): Promise<void> {
  const comun = {
    nombre: r.nombre,
    duracionMin: r.duracionMin,
    descripcion: r.descripcion || undefined,
    ejercicios: r.ejercicios,
    creadoEn: new Date().toISOString(),
  }
  if (r.tipo === 'fuerza') await rutinasFuerzaRepo.add(comun)
  else if (r.tipo === 'resistencia') await rutinasCardioRepo.add(comun)
  else await rutinasFlexRepo.add({ ...comun, enfoque })
}
