import type { EstadoMedia, MediaArchivo, ResumenMedia, TipoMedia } from '../../core/data/db'
import { conversarIA, extraerJSON } from '../../core/chat/ia'
import { idiomaActual, tGlobal } from '../../core/i18n/useT'
import { datosIdioma } from '../../core/i18n/idiomas'
import { vLista, vTexto } from '../../core/appContrato'
import { hoyISO } from './fecha'

/**
 * La IA rellenando la ficha de una obra: sinopsis + claves y, de paso, los
 * datos que el usuario tendría que teclear (autor, género, estreno) y el
 * artículo de Wikipedia del que sale la portada.
 *
 * Mientras la entrada no esté «completada» la sinopsis se pide SIN spoilers:
 * la lista de pendientes no debe contarte el final.
 */

/** Cómo se nombra cada tipo en el prompt (el prompt va en español). */
const OBRA: Record<TipoMedia, string> = {
  pelicula: 'la película',
  serie: 'la serie',
  libro: 'el libro',
  videojuego: 'el videojuego',
}

/** Quién firma la obra, según el tipo (lo que el formulario llama «autor»). */
const FIRMA: Record<TipoMedia, string> = {
  pelicula: 'director',
  serie: 'creador',
  libro: 'autor',
  videojuego: 'estudio desarrollador',
}

function system(tipo: TipoMedia, sinSpoilers: boolean): string {
  const lengua = datosIdioma(idiomaActual()).nombreIA
  return [
    `Eres un crítico cultural que resume obras con precisión. Escribe TODO en ${lengua}.`,
    'Responde ÚNICAMENTE con un objeto JSON plano, sin markdown ni texto alrededor, con estas claves:',
    '"ficha": string — datos reales en una sola línea separados por " · " (año, país o estudio/autor, y duración, temporadas o páginas si las conoces)',
    '"sinopsis": string — de qué trata, de 4 a 6 frases',
    '"claves": string[] — 3 o 4 apuntes muy cortos: temas, estilo, por qué destaca o para quién es',
    `"autor": string — ${FIRMA[tipo]} de la obra, o "" si no lo sabes`,
    '"genero": string — género principal, una o dos palabras',
    '"estreno": string — fecha de estreno o publicación como yyyy-mm-dd (si solo sabes el año, yyyy-01-01), o "" si no la sabes',
    '"wiki": string — título EXACTO del artículo de la obra en la Wikipedia en inglés, o "" si no lo sabes',
    sinSpoilers
      ? 'La obra está pendiente o a medias: NO reveles giros ni el desenlace, quédate en el planteamiento.'
      : 'La obra ya está terminada por el usuario: puedes comentar el desarrollo y el desenlace.',
    'Si no reconoces la obra con seguridad, responde {"desconocida": true} y nada más: es preferible a inventarla.',
  ].join('\n')
}

/** Lo que la IA sabe de la obra: el resumen y los campos del formulario. */
export interface DatosMediaIA {
  resumen: ResumenMedia
  /** Sugerencias para los campos que el usuario dejó vacíos. */
  autor?: string
  genero?: string
  /** Estreno o publicación (ISO yyyy-mm-dd). */
  estreno?: string
}

/** Datos mínimos para preguntar: la entrada guardada o lo tecleado en el formulario. */
export interface ObraConsultada {
  tipo: TipoMedia
  titulo: string
  autor?: string
  genero?: string
  estado: EstadoMedia
  /** Artículo de Wikipedia elegido en las sugerencias: fija de qué obra hablamos. */
  wiki?: string
}

const ES_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Pregunta a la IA por la obra. No guarda nada: el caller decide qué usar. */
export async function completarMediaIA(obra: ObraConsultada): Promise<DatosMediaIA> {
  const sinSpoilers = obra.estado !== 'completado'
  const peticion = [
    `Ficha y resumen de ${OBRA[obra.tipo]} "${obra.titulo}".`,
    obra.autor ? `Autor, director o desarrollador: ${obra.autor}.` : '',
    obra.genero ? `Género según el usuario: ${obra.genero}.` : '',
    obra.wiki ? `Es la obra del artículo de Wikipedia en inglés "${obra.wiki}".` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const respuesta = await conversarIA(
    system(obra.tipo, sinSpoilers),
    [{ rol: 'usuario', texto: peticion }],
    900,
  )
  const json = extraerJSON(respuesta)
  if (json.desconocida) {
    throw new Error(tGlobal('entre.res.desconocida', 'La IA no reconoció esta obra.'))
  }
  const sinopsis = vTexto(json.sinopsis)
  if (!sinopsis) {
    throw new Error(tGlobal('entre.res.invalido', 'La IA no devolvió un resumen usable.'))
  }
  const estreno = vTexto(json.estreno)
  return {
    resumen: {
      ficha: vTexto(json.ficha),
      sinopsis,
      claves: vLista(json.claves).slice(0, 4),
      sinSpoilers,
      wiki: vTexto(json.wiki) || undefined,
      creadoEn: hoyISO(),
    },
    autor: vTexto(json.autor) || undefined,
    genero: vTexto(json.genero) || undefined,
    estreno: ES_ISO.test(estreno) ? estreno : undefined,
  }
}

/** Solo el resumen, para el botón de la tarjeta ya guardada. */
export async function generarResumenMedia(item: MediaArchivo): Promise<ResumenMedia> {
  return (await completarMediaIA(item)).resumen
}
