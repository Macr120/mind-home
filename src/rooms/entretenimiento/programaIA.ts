import type { TipoMedia } from '../../core/data/db'
import { conversarIA, extraerJSON } from '../../core/chat/ia'
import { idiomaActual, tGlobal } from '../../core/i18n/useT'
import { vTexto } from '../../core/registry'

/**
 * La IA armando un programa de obras: un maratón para ver, leer o jugar en
 * orden a partir de un tema libre («terror de los 80s», «Stephen King»).
 * Aquí solo se pide y valida la propuesta; guardarla como metas del
 * cronograma es cosa de la UI (`ProgramasSection`).
 */

/** Cómo se nombra cada tipo en plural en el prompt (el prompt va en español). */
const OBRAS: Record<TipoMedia, string> = {
  pelicula: 'películas',
  serie: 'series',
  libro: 'libros',
  videojuego: 'videojuegos',
}

export interface ItemPrograma {
  titulo: string
  /** Una línea de apoyo: año, autor/director y por qué entra en el programa. */
  detalle: string
}

export interface ProgramaPropuesto {
  nombre: string
  items: ItemPrograma[]
}

function system(tipo: TipoMedia, cantidad: number): string {
  const lengua = idiomaActual() === 'en' ? 'inglés' : 'español'
  return [
    `Eres un curador cultural que arma programas de ${OBRAS[tipo]}: listas para consumir en un orden recomendado. Escribe TODO en ${lengua}.`,
    'Responde ÚNICAMENTE con un objeto JSON plano, sin markdown ni texto alrededor, con estas claves:',
    '"nombre": string — nombre corto y atractivo del programa (máximo 5 palabras)',
    `"items": array de EXACTAMENTE ${cantidad} objetos, en el orden recomendado para consumirlos, cada uno con:`,
    '  "titulo": string — título de la obra (el título en la lengua pedida si es conocido; si no, el original)',
    '  "detalle": string — una sola línea: año, autor/director/estudio y por qué está en el programa',
    'Solo obras REALES y reconocidas que casen con lo pedido: nunca inventes títulos.',
    'Si el tema no da para armar un programa real, responde {"desconocido": true} y nada más.',
  ].join('\n')
}

/** Pide el programa a la IA. No guarda nada: el caller decide qué hacer con él. */
export async function generarPrograma(
  tipo: TipoMedia,
  tema: string,
  cantidad: number,
): Promise<ProgramaPropuesto> {
  const respuesta = await conversarIA(
    system(tipo, cantidad),
    [{ rol: 'usuario', texto: `Arma un programa de ${OBRAS[tipo]} sobre: ${tema}.` }],
    1600,
  )
  const json = extraerJSON(respuesta)
  if (json.desconocido) {
    throw new Error(tGlobal('entre.prog.desconocido', 'La IA no pudo armar un programa con ese tema.'))
  }
  const items = (Array.isArray(json.items) ? json.items : [])
    .map((x) => {
      const obj = (x ?? {}) as Record<string, unknown>
      return { titulo: vTexto(obj.titulo), detalle: vTexto(obj.detalle) }
    })
    .filter((x) => x.titulo)
  if (items.length === 0) {
    throw new Error(tGlobal('entre.prog.invalido', 'La IA no devolvió un programa usable.'))
  }
  return { nombre: vTexto(json.nombre) || tema.trim(), items }
}
