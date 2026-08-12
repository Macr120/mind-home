import type { Efemeride, TipoEfemeride } from '../../core/data/db'
import { datosIdioma, type Idioma } from '../../core/i18n/idiomas'
import { conversarIA, extraerJSON, iaOperativa } from '../../core/chat/ia'
import { tGlobal } from '../../core/i18n/useT'
import { fetchJson } from './fuentes'
import { catalogoDelDia, imagenWikipedia } from './catalogo'
import { especieDelDia } from './especies'

type PaginaWiki = {
  title?: string
  description?: string
  extract?: string
  thumbnail?: { source?: string }
}

type EntradaOnThisDay = { text?: string; year?: number; pages?: PaginaWiki[] }

type RespuestaOnThisDay = {
  selected?: EntradaOnThisDay[]
  events?: EntradaOnThisDay[]
  births?: EntradaOnThisDay[]
}

function imagenDe(e: EntradaOnThisDay): string | undefined {
  return e.pages?.find((p) => p.thumbnail?.source)?.thumbnail?.source
}

/** Historia + personalidad desde Wikipedia "un día como hoy" (sin clave). */
async function cargarWikipedia(fecha: string, idioma: Idioma): Promise<Efemeride[]> {
  const [, mm, dd] = fecha.split('-')
  const data = (await fetchJson(
    `https://${idioma}.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`,
  )) as RespuestaOnThisDay
  const out: Efemeride[] = []

  const eventos = [...(data.selected ?? []), ...(data.events ?? [])]
  // Candidatos con imagen, sin autorreferencias de Wikipedia y, de preferencia,
  // que no sean nacimientos/muertes (de eso ya se encarga "personalidad").
  const candidatos = eventos.filter(
    (e) =>
      e.year &&
      e.text &&
      imagenDe(e) &&
      !/wikipedia|wikimedia|wikcionario|wikisource/i.test(`${e.pages?.[0]?.title} ${e.text}`),
  )
  const evento =
    candidatos.find((e) => !/^\s*(nace|muere|fallece)/i.test(e.text ?? '')) ??
    candidatos[0] ??
    eventos[0]
  if (evento?.text) {
    // El evento es la frase concreta del día; el extract del artículo da el
    // contexto que lo convierte en un párrafo.
    const extra = evento.pages?.[0]?.extract
    out.push({
      tipo: 'historia',
      titulo: evento.pages?.[0]?.title?.replace(/_/g, ' ') ?? tGlobal('diario.ef.historia', 'Un día en la historia'),
      texto: [evento.text, extra && extra !== evento.text ? extra : null].filter(Boolean).join('\n\n'),
      imagen: imagenDe(evento),
      anio: evento.year ? String(evento.year) : undefined,
    })
  }

  // Los nacimientos de `selected` están curados (gente notable); births viene
  // ordenado del más reciente al más viejo y suele empezar con deportistas jóvenes.
  const nacidos = data.births ?? []
  const persona =
    (data.selected ?? []).find((e) => /^\s*nace\b/i.test(e.text ?? '') && imagenDe(e)) ??
    nacidos.find((e) => imagenDe(e) && e.pages?.[0]?.extract) ??
    nacidos.find((e) => imagenDe(e)) ??
    nacidos[0]
  if (persona?.text) {
    const pag = persona.pages?.[0]
    out.push({
      tipo: 'personalidad',
      titulo: pag?.title?.replace(/_/g, ' ') ?? persona.text.split(',')[0],
      subtitulo: pag?.description,
      texto: pag?.extract ?? persona.text,
      imagen: imagenDe(persona),
      anio: persona.year ? `${tGlobal('diario.nacidoAbrev', 'n.')} ${persona.year}` : undefined,
    })
  }
  return out
}

const systemExtras = (idioma: Idioma) => {
  const lengua = datosIdioma(idioma).nombreIA
  return `Eres el editor cultural de un periódico en ${lengua}. Devuelve SOLO un JSON con las secciones del día, sin texto extra:
{
 "arte": { "titulo": "", "artista": "", "anio": "", "texto": "un párrafo de 4 a 6 frases: qué representa la obra, su técnica o estilo, el contexto en que se creó y por qué es importante", "wiki": "título exacto del artículo de la obra en Wikipedia en ${lengua}" },
 "libro": { "titulo": "", "autor": "", "anio": "", "texto": "un párrafo de 4 a 6 frases: de qué trata, su estilo, el contexto y su legado", "wiki": "título exacto del artículo del libro en Wikipedia en ${lengua}" },
 "especie": { "nombre": "nombre común del animal", "cientifico": "nombre científico exacto (binomial latino)", "texto": "un párrafo de 4 a 6 frases: cómo es, dónde vive, qué comportamiento o adaptación lo hace único y cómo está su conservación" },
 "palabra": { "palabra": "", "clase": "sustantivo/adjetivo/verbo…", "definicion": "definición clara en 1 o 2 frases", "origen": "breve origen o etimología en 1 o 2 frases", "ejemplo": "una frase de ejemplo" },
 "frase": { "cita": "", "autor": "", "contexto": "un párrafo de 3 a 5 frases: qué significa la cita, en qué contexto surge y quién es su autor", "wiki": "título del artículo del autor en Wikipedia en ${lengua}" }
}
Elige contenido REAL y variado (época y origen distintos cada día); la especie debe ser un ANIMAL y alternar grupos (mamífero, ave, pez, insecto, reptil, anfibio, molusco…); la palabra debe ser curiosa o bella del ${lengua}. No inventes obras, libros, citas ni especies. TODOS los textos van escritos en ${lengua}.`
}

type ExtrasIA = {
  arte?: { titulo?: string; artista?: string; anio?: string; texto?: string; wiki?: string }
  libro?: { titulo?: string; autor?: string; anio?: string; texto?: string; wiki?: string }
  especie?: { nombre?: string; cientifico?: string; texto?: string }
  palabra?: { palabra?: string; clase?: string; definicion?: string; origen?: string; ejemplo?: string }
  frase?: { cita?: string; autor?: string; contexto?: string; wiki?: string }
}

/** Obra, libro, especie, palabra y frase generados por la IA (null si falla o incompleto). */
async function extrasConIA(fecha: string, idioma: Idioma): Promise<Efemeride[] | null> {
  try {
    const respuesta = await conversarIA(
      systemExtras(idioma),
      [{ rol: 'usuario', texto: `Secciones culturales para el ${fecha}. Responde solo el JSON.` }],
      1800,
    )
    const json = extraerJSON(respuesta) as ExtrasIA
    if (
      !json.arte?.titulo ||
      !json.libro?.titulo ||
      !json.especie?.nombre ||
      !json.palabra?.palabra ||
      !json.frase?.cita
    )
      return null

    // Wikipedia casi nunca tiene portadas de libros (sin fair use): si el
    // artículo del libro no trae imagen, se usa el retrato del autor. La ficha
    // del animal se busca por su nombre científico, que existe en todas las
    // ediciones de Wikipedia y redirige al artículo local.
    const [imgArte, imgLibro, imgEspecie, imgFrase] = await Promise.all([
      json.arte.wiki ? imagenWikipedia(json.arte.wiki, idioma) : undefined,
      (async () =>
        (json.libro?.wiki ? await imagenWikipedia(json.libro.wiki, idioma) : undefined) ??
        (json.libro?.autor ? await imagenWikipedia(json.libro.autor, idioma) : undefined))(),
      imagenWikipedia(json.especie.cientifico ?? json.especie.nombre, idioma),
      json.frase.wiki ? imagenWikipedia(json.frase.wiki, idioma) : undefined,
    ])

    return [
      { tipo: 'arte', titulo: json.arte.titulo, subtitulo: json.arte.artista, texto: json.arte.texto ?? '', imagen: imgArte, anio: json.arte.anio },
      { tipo: 'libro', titulo: json.libro.titulo, subtitulo: json.libro.autor, texto: json.libro.texto ?? '', imagen: imgLibro, anio: json.libro.anio },
      { tipo: 'especie', titulo: json.especie.nombre, subtitulo: json.especie.cientifico, texto: json.especie.texto ?? '', imagen: imgEspecie },
      {
        tipo: 'palabra',
        titulo: json.palabra.palabra,
        subtitulo: json.palabra.clase,
        texto:
          [json.palabra.definicion, json.palabra.origen].filter(Boolean).join('\n\n') +
          (json.palabra.ejemplo ? `\n«${json.palabra.ejemplo}»` : ''),
      },
      { tipo: 'frase', titulo: `«${json.frase.cita}»`, subtitulo: json.frase.autor, texto: json.frase.contexto ?? '', imagen: imgFrase },
    ]
  } catch {
    return null
  }
}

const ORDEN: TipoEfemeride[] = ['historia', 'arte', 'libro', 'personalidad', 'especie', 'palabra', 'frase']

/**
 * Las efemérides del día en orden fijo. Historia y personalidad salen de
 * Wikipedia; el resto de la IA si hay clave, o del catálogo local si no.
 */
export async function cargarEfemerides(fecha: string, idioma: Idioma): Promise<Efemeride[]> {
  const [wiki, extras] = await Promise.all([
    cargarWikipedia(fecha, idioma).catch(() => [] as Efemeride[]),
    (async () => (iaOperativa() ? await extrasConIA(fecha, idioma) : null))(),
  ])
  const culturales =
    extras ??
    (await Promise.all([catalogoDelDia(fecha, idioma), especieDelDia(fecha, idioma)])).flat()
  const todas = [...wiki, ...culturales]
  return ORDEN.flatMap((tipo) => todas.filter((e) => e.tipo === tipo))
}
