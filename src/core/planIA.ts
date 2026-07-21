import { conversarIA, extraerJSON } from './chat/ia'
import type { EntradaPlan, NivelPartida } from './data/db'
import { DIA_MS, deIso } from './fechaLocal'
import { localeActual } from './i18n/useT'

/**
 * Le pide a la IA un cronograma para una meta grande ("preparar un maratón").
 *
 * Los días van RELATIVOS al día 0 del plan, no en fechas: un modelo cuenta enteros
 * pequeños bien y calendarios mal — con ISO absolutos devuelve días que no existen
 * y años equivocados, y validar eso es un pantano. Aquí la validación son dos
 * clamps, y quien guarda el plan ya sabe anclarlo (`inicioISO`).
 */

/** Un nodo tal como llega de la IA: anidado, con los días ya normalizados. */
export interface NodoPropuesto {
  nombre: string
  ini: number
  /** Inclusivo: la IA manda duración, aquí ya es el último día ocupado. */
  fin: number
  hijos: NodoPropuesto[]
}

export interface PlanPropuesto {
  resumen: string
  nodos: NodoPropuesto[]
}

// Topes duros: el modelo se emociona. Un plan de 60 nodos a 5 niveles no se lee en
// el eje y son 120 escrituras al aceptarlo.
const MAX_FASES = 8
const MAX_HIJOS = 8
const MAX_NODOS = 40
const MAX_DIAS = 365 * 5
const MAX_NOMBRE = 60
/** 0 = fase, 1 = sub-meta. Más profundo no se anida. */
const MAX_PROFUNDIDAD = 1

const SYSTEM = [
  'Eres un entrenador que descompone una meta grande en un cronograma de sub-metas realista.',
  'Responde ÚNICAMENTE con un objeto JSON, sin texto ni markdown alrededor:',
  '{"resumen":"<una frase>","nodos":[{"nombre":"<fase>","ini":number,"dias":number,"hijos":[{"nombre":"<sub-meta>","ini":number,"dias":number}]}]}',
  '`ini` es el día en que empieza el nodo, contado SIEMPRE desde el día 0 del plan — también en los hijos, NUNCA respecto a su fase.',
  '`dias` es cuántos días dura el nodo, mínimo 1.',
  'Entre 3 y 6 fases, cada una con 2 a 5 hijos. Solo dos niveles (fase → sub-meta): no anides más.',
  'Las fases van en orden y se encadenan sin huecos grandes; los hijos caen DENTRO del periodo de su fase.',
  'Cada nombre es una acción concreta y medible de máximo 60 caracteres ("Correr 10 km sin parar"), no un consejo genérico ("mejorar la resistencia").',
  'Ajusta el volumen a las horas por semana y a los días disponibles: un plan que no cabe en su semana no sirve de nada.',
].join('\n')

const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const TEXTO_NIVEL: Record<NivelPartida, string> = {
  cero: 'empieza desde cero, sin ninguna experiencia previa',
  algo: 'tiene algo de base pero es principiante',
  medio: 'nivel intermedio, ya practica con regularidad',
  avanzado: 'nivel avanzado, busca perfeccionarse',
}

/** Días que caben entre hoy y la fecha objetivo, contando los dos extremos. */
function topeDe(entrada: EntradaPlan, hoyIso: string): number {
  if (!entrada.fechaObjetivo || entrada.fechaObjetivo <= hoyIso) return MAX_DIAS
  const d = Math.round((deIso(entrada.fechaObjetivo).getTime() - deIso(hoyIso).getTime()) / DIA_MS) + 1
  return Math.max(1, Math.min(d, MAX_DIAS))
}

/** Valida nodo a nodo lo que devolvió la IA: nada de aquí se cree sin comprobar. */
function validarPlan(json: Record<string, unknown>, tope: number): PlanPropuesto {
  let restantes = MAX_NODOS
  const entero = (v: unknown, min: number, max: number, porDefecto: number) => {
    const n = Math.round(Number(v))
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : porDefecto
  }
  const nodo = (x: unknown, profundidad: number): NodoPropuesto | null => {
    if (restantes <= 0) return null
    const o = (x ?? {}) as Record<string, unknown>
    const nombre = typeof o.nombre === 'string' ? o.nombre.trim().slice(0, MAX_NOMBRE) : ''
    if (!nombre) return null
    restantes--
    const ini = entero(o.ini, 0, tope - 1, 0)
    const dura = entero(o.dias, 1, tope - ini, 1)
    // El corte de profundidad va aquí y no solo en el prompt: el modelo anida de más.
    const brutos = profundidad >= MAX_PROFUNDIDAD || !Array.isArray(o.hijos) ? [] : (o.hijos as unknown[])
    const hijos = brutos
      .slice(0, MAX_HIJOS)
      .map((h) => nodo(h, profundidad + 1))
      .filter((h): h is NodoPropuesto => h != null)
    return { nombre, ini, fin: ini + dura - 1, hijos }
  }

  const brutas = Array.isArray(json.nodos) ? (json.nodos as unknown[]) : []
  const nodos = brutas
    .slice(0, MAX_FASES)
    .map((x) => nodo(x, 0))
    .filter((n): n is NodoPropuesto => n != null)
  if (nodos.length === 0) throw new Error('La IA no devolvió un plan usable')

  return {
    resumen: typeof json.resumen === 'string' ? json.resumen.trim().slice(0, 200) : '',
    nodos,
  }
}

/**
 * Propone un cronograma para la meta. LANZA si la IA no está activa, si el proveedor
 * falla o si no devuelve un árbol usable: no hay fallback determinista a propósito
 * — inventar fases sin saber de qué va la meta sería peor que no proponer nada, así
 * que el caller enseña el aviso y deja el alta a mano.
 *
 * El prompt va en español fijo aunque la UI esté en inglés (el diccionario es UI, y
 * el contrato JSON no se traduce); lo que sí sigue al idioma activo es la RESPUESTA,
 * porque esos nombres acaban siendo metas reales.
 */
export async function generarPlan(
  nombreMeta: string,
  entrada: EntradaPlan,
  hoyIso: string,
): Promise<PlanPropuesto> {
  const tope = topeDe(entrada, hoyIso)
  const idioma = localeActual().startsWith('es') ? 'español' : 'inglés'
  const usuario = [
    `Meta: ${nombreMeta}`,
    `Hoy es ${hoyIso} y el día 0 del plan es hoy.`,
    entrada.fechaObjetivo
      ? `Fecha objetivo: ${entrada.fechaObjetivo}. El plan dura ${tope} días COMO MÁXIMO: ningún nodo puede pasar del día ${tope - 1}.`
      : 'Sin fecha objetivo: decide tú cuánto debe durar el plan y sé realista con lo que la meta exige.',
    `Dispone de ${entrada.horasSemana} horas por semana.`,
    entrada.dias.length > 0 && entrada.dias.length < 7
      ? `Solo puede dedicarle estos días: ${entrada.dias.map((d) => NOMBRE_DIA[d]).join(', ')}.`
      : 'Puede dedicarle cualquier día de la semana.',
    `Punto de partida: ${TEXTO_NIVEL[entrada.nivel]}.`,
    `Escribe los nombres y el resumen en ${idioma}.`,
  ].join('\n')

  // El plan más largo que permiten los topes ronda los 1.5k tokens de JSON: con
  // 2000 no se corta a media llave (y `extraerJSON` necesita la última).
  const respuesta = await conversarIA(SYSTEM, [{ rol: 'usuario', texto: usuario }], 2000)
  return validarPlan(extraerJSON(respuesta), tope)
}
