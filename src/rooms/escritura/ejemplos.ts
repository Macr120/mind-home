import type { SeccionHistoria } from '../../core/data/db'
import { documentosRepo, historiasRepo, relacionesLibroRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_ESCRITURA } from './ejemplos.data'
import { contarPalabras, escaparHtml, parrafosHtml } from './sanitizarHtml'

/**
 * Ejemplo de fábrica del Studio de escritura: un libro con sus dos primeros
 * capítulos y las carpetas ya pobladas —dos personajes, un lugar, un acto con
 * su trama— y los dos personajes conectados en el diagrama de relaciones.
 *
 * Es el ejemplo con más piezas del Studio a propósito: la estantería no enseña
 * nada por sí sola, y lo que cuesta descubrir de esta app es justo que un libro
 * lleva fichas dentro y que las fichas se pueden unir.
 */

const ID = 'escritura.libros'

type Clave = keyof (typeof TEXTOS_ESCRITURA)['es']

/** Un bloque de una ficha: el `<h2>` de la semilla (si lleva) y su texto. */
interface Bloque {
  /** Encabezado: clave de dict + español. Ausente en los capítulos, que son texto corrido. */
  h2?: [string, string]
  texto: Clave
}

interface Ficha {
  seccion: SeccionHistoria
  titulo: Clave
  bloques: Bloque[]
  /** Posición en el diagrama de relaciones (0..1); solo los personajes. */
  rel?: { x: number; y: number }
  /** La trama cuelga del acto que la precede en esta lista. */
  enActo?: boolean
}

/**
 * Las fichas en el orden en que se crean. El orden IMPORTA dos veces: la lista
 * del panel va por `actualizadoEn` descendente (se escalona un minuto por
 * ficha) y abrir el libro entra en el texto más reciente, que así es siempre el
 * capítulo 1. Los encabezados salen de las mismas claves que `semillaSeccion`:
 * el ejemplo es una ficha normal, ya rellena.
 */
const FICHAS: Ficha[] = [
  { seccion: 'capitulo', titulo: 'cap1Titulo', bloques: [{ texto: 'cap1Texto' }] },
  { seccion: 'capitulo', titulo: 'cap2Titulo', bloques: [{ texto: 'cap2Texto' }] },
  {
    seccion: 'personaje',
    titulo: 'persAnaTitulo',
    rel: { x: 0.3, y: 0.32 },
    bloques: [
      { h2: ['escritura.semilla.personaje.apariencia', 'Apariencia'], texto: 'persAnaApariencia' },
      { h2: ['escritura.semilla.personaje.personalidad', 'Personalidad'], texto: 'persAnaPersonalidad' },
      { h2: ['escritura.semilla.personaje.quiere', 'Qué quiere'], texto: 'persAnaQuiere' },
      { h2: ['escritura.semilla.personaje.historia', 'Historia'], texto: 'persAnaHistoria' },
    ],
  },
  {
    seccion: 'personaje',
    titulo: 'persBrunoTitulo',
    rel: { x: 0.72, y: 0.62 },
    bloques: [
      { h2: ['escritura.semilla.personaje.apariencia', 'Apariencia'], texto: 'persBrunoApariencia' },
      { h2: ['escritura.semilla.personaje.personalidad', 'Personalidad'], texto: 'persBrunoPersonalidad' },
      { h2: ['escritura.semilla.personaje.quiere', 'Qué quiere'], texto: 'persBrunoQuiere' },
      { h2: ['escritura.semilla.personaje.historia', 'Historia'], texto: 'persBrunoHistoria' },
    ],
  },
  {
    seccion: 'lugar',
    titulo: 'lugarTitulo',
    bloques: [
      { h2: ['escritura.semilla.lugar.descripcion', 'Descripción'], texto: 'lugarDescripcion' },
      { h2: ['escritura.semilla.lugar.atmosfera', 'Atmósfera'], texto: 'lugarAtmosfera' },
      { h2: ['escritura.semilla.lugar.ocurre', 'Qué pasa aquí'], texto: 'lugarOcurre' },
    ],
  },
  {
    seccion: 'acto',
    titulo: 'actoTitulo',
    bloques: [
      { h2: ['escritura.semilla.acto.resumen', 'Resumen'], texto: 'actoResumen' },
      { h2: ['escritura.semilla.acto.escenas', 'Escenas'], texto: 'actoEscenas' },
    ],
  },
  {
    seccion: 'trama',
    titulo: 'tramaTitulo',
    enActo: true,
    bloques: [
      { h2: ['escritura.semilla.trama.planteamiento', 'Planteamiento'], texto: 'tramaPlanteamiento' },
      { h2: ['escritura.semilla.trama.nudo', 'Nudo'], texto: 'tramaNudo' },
      { h2: ['escritura.semilla.trama.desenlace', 'Desenlace'], texto: 'tramaDesenlace' },
    ],
  },
]

/** La nota de la conexión: un solo bloque de texto corrido, como un capítulo. */
const BLOQUES_NOTA: Bloque[] = [{ texto: 'relacionNota' }]

/** ¿Ese valor es el texto de fábrica de esa clave en algún idioma? */
const deFabrica = (valor: string | undefined, clave: Clave) =>
  valor != null && Object.values(TEXTOS_ESCRITURA).some((rama) => rama[clave] === valor)

/** El HTML de una ficha en el idioma activo (encabezados por dict, cuerpo por catálogo). */
function cuerpo(bloques: Bloque[], T: (typeof TEXTOS_ESCRITURA)['es']): string {
  return bloques
    .map((b) => (b.h2 ? `<h2>${escaparHtml(tGlobal(b.h2[0], b.h2[1]))}</h2>` : '') + parrafosHtml(T[b.texto]))
    .join('')
}

const palabrasDe = (bloques: Bloque[], T: (typeof TEXTOS_ESCRITURA)['es']) =>
  contarPalabras(bloques.map((b) => T[b.texto]).join(' '))

/**
 * ¿El texto guardado sigue siendo el de fábrica?
 *
 * El contenido es HTML y sus `<h2>` salen del dict del idioma que estuviera
 * activo al crearlo, así que no se puede comparar entero con el catálogo (que
 * es texto plano). Se compara el CUERPO: si el HTML todavía contiene el primer
 * párrafo de fábrica de algún idioma, nadie lo ha reescrito.
 */
function cuerpoIntacto(html: string, bloques: Bloque[]): boolean {
  return Object.values(TEXTOS_ESCRITURA).some((rama) =>
    bloques.every((b) => html.includes(escaparHtml(rama[b.texto].split('\n\n')[0].trim()))),
  )
}

export const ejemploEscritura: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => historiasRepo.list())) return
    const T = porIdioma(TEXTOS_ESCRITURA)
    const ahora = Date.now()
    /** Un minuto de separación por ficha: la primera de la lista es la más reciente. */
    const sello = (i: number) => new Date(ahora - i * 60_000).toISOString()

    const libroId = await historiasRepo.add({
      titulo: T.libroTitulo,
      resumen: T.libroResumen,
      tipo: 'cuento',
      creadoEn: sello(FICHAS.length),
      actualizadoEn: sello(0),
      ejemploDe: ID,
    })

    const personajes: number[] = []
    let actoId: number | undefined
    for (const [i, f] of FICHAS.entries()) {
      const id = await documentosRepo.add({
        titulo: T[f.titulo],
        contenido: cuerpo(f.bloques, T),
        palabras: palabrasDe(f.bloques, T),
        historiaId: libroId,
        seccion: f.seccion,
        ...(f.enActo && actoId != null ? { actoId } : {}),
        ...(f.rel ? { relX: f.rel.x, relY: f.rel.y } : {}),
        creadoEn: sello(i),
        actualizadoEn: sello(i),
        ejemploDe: ID,
      })
      if (f.seccion === 'acto') actoId = id
      if (f.seccion === 'personaje') personajes.push(id)
    }

    // La conexión del diagrama, con su nota: el título lo forman los dos
    // personajes, igual que al conectarlos a mano (ver `DiagramaRelaciones`).
    const [aId, bId] = personajes
    const creado = sello(FICHAS.length)
    const docId = await documentosRepo.add({
      titulo: `${T.persAnaTitulo} ↔ ${T.persBrunoTitulo}`,
      contenido: parrafosHtml(T.relacionNota),
      palabras: contarPalabras(T.relacionNota),
      historiaId: libroId,
      seccion: 'relacion',
      creadoEn: creado,
      actualizadoEn: creado,
      ejemploDe: ID,
    })
    await relacionesLibroRepo.add({
      historiaId: libroId,
      aId,
      bId,
      texto: T.relacionTexto,
      docId,
      creadoEn: creado,
      ejemploDe: ID,
    })
  },

  async retraducir() {
    const T = porIdioma(TEXTOS_ESCRITURA)
    for (const h of await historiasRepo.list()) {
      if (h.ejemploDe !== ID || h.id == null) continue
      const titulo = retraducido(TEXTOS_ESCRITURA, h.titulo, 'libroTitulo')
      const resumen = retraducido(TEXTOS_ESCRITURA, h.resumen, 'libroResumen')
      if (titulo || resumen) {
        await historiasRepo.update(h.id, { ...(titulo && { titulo }), ...(resumen && { resumen }) })
      }
    }

    for (const d of await documentosRepo.list()) {
      if (d.ejemploDe !== ID || d.id == null) continue
      if (d.seccion === 'relacion') {
        const nuevo = cuerpo(BLOQUES_NOTA, T)
        if (cuerpoIntacto(d.contenido, BLOQUES_NOTA) && d.contenido !== nuevo) {
          await documentosRepo.update(d.id, {
            titulo: `${T.persAnaTitulo} ↔ ${T.persBrunoTitulo}`,
            contenido: nuevo,
            palabras: palabrasDe(BLOQUES_NOTA, T),
          })
        }
        continue
      }
      // El título y el cuerpo se juzgan aparte: quien renombró la ficha pero no
      // la escribió (o al revés) conserva lo suyo.
      const f = FICHAS.find((x) => deFabrica(d.titulo, x.titulo))
      if (!f) continue
      const titulo = retraducido(TEXTOS_ESCRITURA, d.titulo, f.titulo)
      const cambiaCuerpo = cuerpoIntacto(d.contenido, f.bloques) && d.contenido !== cuerpo(f.bloques, T)
      if (titulo || cambiaCuerpo) {
        await documentosRepo.update(d.id, {
          ...(titulo && { titulo }),
          ...(cambiaCuerpo && { contenido: cuerpo(f.bloques, T), palabras: palabrasDe(f.bloques, T) }),
        })
      }
    }

    for (const r of await relacionesLibroRepo.list()) {
      if (r.ejemploDe !== ID || r.id == null) continue
      const texto = retraducido(TEXTOS_ESCRITURA, r.texto, 'relacionTexto')
      if (texto) await relacionesLibroRepo.update(r.id, { texto })
    }
  },
}
