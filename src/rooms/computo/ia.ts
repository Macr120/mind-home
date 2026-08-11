/**
 * Microtareas de IA de la sala de cómputo.
 *
 * Todas LANZAN con el motivo real: la UI lo muestra tal cual, porque un fallo de
 * clave, uno de red y uno de formato piden tres cosas distintas del usuario.
 *
 * Lo que la IA propone NO se guarda a ciegas. Una expresión se valida contra el
 * motor antes de aceptarla y las referencias de una hoja se comprueban una por
 * una: aquí el modelo escribe algo que luego se EVALÚA, y una fórmula inventada
 * no da un texto raro, da una hoja llena de #VALOR.
 */
import { conversarIA, extraerJSON } from '../../core/chat/ia'
import type { TipoGraficaHoja, VariableFormula } from '../../core/data/db'
import { MAX_VARIABLES_IA, MAX_CELDAS_IA } from './constantes'
import { ALIAS_PUNTO, FUNCIONES_HOJA } from './funcionesHoja'
import { deRef } from './hoja'
import type { Motor } from './motor'

const SISTEMA =
  'Eres un asistente de matemáticas, física y química dentro de una app personal. ' +
  'Respondes en el idioma en que te escriben. Eres exacto y breve: nada de rodeos ni disculpas. ' +
  'Cuando se te pida JSON, respondes SOLO con el objeto JSON, sin texto alrededor ni ```.'

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// ─── 1. Una fórmula descrita con palabras ───────────────────────────────────

export interface FormulaPropuesta {
  nombre: string
  resultado: string
  expresion: string
  descripcion?: string
  variables: VariableFormula[]
}

/**
 * «área de un cono truncado» → la fórmula lista para guardar.
 *
 * La expresión se valida con el propio motor antes de devolverla: si mathjs no
 * la entiende, no se le ofrece al usuario una fórmula que nunca podría calcular.
 */
export async function formulaDesdeTexto(peticion: string, motor: Motor): Promise<FormulaPropuesta> {
  const respuesta = await conversarIA(
    SISTEMA,
    [
      {
        rol: 'usuario',
        texto: [
          `Escribe la fórmula de: ${peticion}`,
          '',
          'Reglas de la expresión:',
          '- Sintaxis de mathjs, en una sola línea: `m * v^2 / 2`, `sqrt(b^2 - 4*a*c)`, `log(x)` es natural y `log10(x)` el de base 10.',
          '- SIEMPRE con asteriscos entre factores: `m * g * h`, nunca `mgh` (sería una única variable).',
          '- Símbolos cortos y sin acentos. Las constantes universales (g, R, NA…) van como variable con "constante": true y su valor.',
          `- Máximo ${MAX_VARIABLES_IA} variables.`,
          '',
          'Responde SOLO con este JSON:',
          '{"nombre":"<nombre corto>","resultado":"<símbolo del resultado>","expresion":"<la expresión>",' +
            '"descripcion":"<una línea: cuándo se usa>","variables":[{"simbolo":"m","nombre":"masa","unidad":"kg","constante":false}]}',
        ].join('\n'),
      },
    ],
    900,
  )

  const json = extraerJSON(respuesta)
  const expresion = texto(json.expresion)
  const nombre = texto(json.nombre)
  if (!expresion || !nombre) throw new Error('La IA no devolvió una fórmula.')

  // El motor es el juez: si no puede leer la expresión, no vale.
  let simbolos: string[]
  try {
    simbolos = motor.simbolos(expresion)
  } catch {
    throw new Error(`La expresión propuesta no se entiende: ${expresion}`)
  }

  const propuestas = Array.isArray(json.variables) ? (json.variables as Record<string, unknown>[]) : []
  const porSimbolo = new Map(propuestas.map((v) => [texto(v.simbolo), v]))
  // Manda lo que la expresión pide de verdad, no lo que el modelo enumeró: las
  // variables de más confunden y las de menos dejan la tabla a medias.
  const variables: VariableFormula[] = simbolos.slice(0, MAX_VARIABLES_IA).map((s) => {
    const v = porSimbolo.get(s)
    const valor = Number(v?.valor)
    return {
      simbolo: s,
      nombre: texto(v?.nombre) || s,
      unidad: texto(v?.unidad) || undefined,
      valor: Number.isFinite(valor) ? valor : undefined,
      constante: v?.constante === true || undefined,
    }
  })

  return {
    nombre,
    resultado: texto(json.resultado) || 'y',
    expresion,
    descripcion: texto(json.descripcion) || undefined,
    variables,
  }
}

// ─── 2. Explicar o resolver paso a paso ─────────────────────────────────────

/**
 * Un desarrollo paso a paso de lo que hay en la calculadora. Devuelve texto
 * plano: el resultado que cuenta lo sigue dando el motor, esto es el porqué.
 */
export async function explicarPasoAPaso(entrada: string): Promise<string> {
  const respuesta = await conversarIA(
    SISTEMA,
    [
      {
        rol: 'usuario',
        texto: [
          `Explica paso a paso: ${entrada}`,
          '',
          'Si es una expresión, desarrolla el orden de las operaciones. Si es una ecuación, despéjala.',
          'Si es un problema con palabras, di qué fórmula toca y sustituye.',
          'Numera los pasos, uno por línea, sin LaTeX ni markdown. Termina con una línea «Resultado: …».',
          'Máximo 12 pasos.',
        ].join('\n'),
      },
    ],
    1200,
  )
  const limpio = respuesta.trim()
  if (!limpio) throw new Error('La IA no devolvió ninguna explicación.')
  return limpio
}

// ─── 3. Una hoja de cálculo descrita con palabras ───────────────────────────

export interface HojaPropuesta {
  nombre: string
  /** Celdas por referencia A1, con lo que se teclearía en cada una. */
  celdas: Record<string, string>
}

/** Los nombres de función que la hoja entiende de verdad. */
const FUNCIONES = [...Object.keys(FUNCIONES_HOJA), ...Object.keys(ALIAS_PUNTO)].sort().join(', ')

/**
 * «control de gastos mensual» → una hoja con sus encabezados, sus datos de
 * ejemplo y sus fórmulas.
 *
 * Se descartan las celdas con una referencia imposible en vez de fallar entera:
 * una hoja a la que le falta una celda sigue sirviendo, y el usuario la ve.
 */
export async function hojaDesdeTexto(peticion: string): Promise<HojaPropuesta> {
  const respuesta = await conversarIA(
    SISTEMA,
    [
      {
        rol: 'usuario',
        texto: [
          `Arma una hoja de cálculo para: ${peticion}`,
          '',
          'Reglas:',
          '- Encabezados en la fila 1. Debajo, filas de ejemplo realistas (entre 4 y 10).',
          '- Las fórmulas empiezan por «=», usan punto y coma como separador y SOLO estas funciones:',
          `  ${FUNCIONES}`,
          '- Referencias tipo A1 y rangos tipo B2:B8. Nada de referencias a otras hojas.',
          '- Pon totales o promedios donde tengan sentido, como fórmula y no como número.',
          `- Como mucho ${MAX_CELDAS_IA} celdas, dentro del rango A1:Z60.`,
          '',
          'Responde SOLO con este JSON:',
          '{"nombre":"<nombre de la hoja>","celdas":{"A1":"Concepto","B1":"Importe","A2":"Renta","B2":"8000","B9":"=SUMA(B2:B8)"}}',
        ].join('\n'),
      },
    ],
    2500,
  )

  const json = extraerJSON(respuesta)
  const crudas = json.celdas
  if (!crudas || typeof crudas !== 'object') throw new Error('La IA no devolvió ninguna hoja.')

  const celdas: Record<string, string> = {}
  for (const [ref, valor] of Object.entries(crudas as Record<string, unknown>)) {
    if (Object.keys(celdas).length >= MAX_CELDAS_IA) break
    const limpia = ref.trim().toUpperCase()
    const contenido = typeof valor === 'number' ? String(valor) : texto(valor)
    if (!deRef(limpia) || contenido === '') continue
    celdas[limpia] = contenido
  }
  if (Object.keys(celdas).length === 0) throw new Error('La hoja propuesta no tenía ninguna celda válida.')

  return { nombre: texto(json.nombre) || peticion.slice(0, 40), celdas }
}

// ─── 4. Leer lo que dicen unos datos ────────────────────────────────────────

/**
 * Interpreta la selección de la hoja. Recibe la tabla YA calculada (valores, no
 * fórmulas): lo que se le pide es leer los números, no volver a calcularlos.
 */
export async function analizarDatos(tabla: string, rango: string): Promise<string> {
  const respuesta = await conversarIA(
    SISTEMA,
    [
      {
        rol: 'usuario',
        texto: [
          `Estos son los datos del rango ${rango} de una hoja de cálculo:`,
          '',
          tabla,
          '',
          'Dime en 4 o 5 frases qué se ve ahí: la tendencia, lo que se sale de lo normal y la relación entre las columnas.',
          'Usa los números concretos de la tabla. Nada de consejos financieros ni de inversión.',
          'Termina con una línea «Gráfica: <barras|lineas|area|pastel|dispersion> — <por qué>».',
        ].join('\n'),
      },
    ],
    900,
  )
  const limpio = respuesta.trim()
  if (!limpio) throw new Error('La IA no devolvió ningún análisis.')
  return limpio
}

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')
const TIPOS_VALIDOS = new Set<TipoGraficaHoja>(['barras', 'lineas', 'area', 'pastel', 'dispersion'])

/** El tipo de gráfica que sugirió el análisis, si sugirió alguno reconocible. */
export function graficaSugerida(analisis: string): TipoGraficaHoja | null {
  const m = /Gr[áa]fica:\s*([a-záéíóú]+)/i.exec(analisis)
  if (!m) return null
  const tipo = m[1].toLowerCase().normalize('NFD').replace(DIACRITICOS, '')
  return TIPOS_VALIDOS.has(tipo as TipoGraficaHoja) ? (tipo as TipoGraficaHoja) : null
}
