/**
 * ESENCIAL de Escritura: corre en la casa real y no crea datos. Recorre la
 * estantería y su libro de ejemplo, y entra al editor SOLO por un libro que ya
 * tenga textos: abrir uno vacío estrena su «Capítulo 1» (`EscrituraApp`). Sin
 * un libro así, los pasos del editor se leen junto al mago, sin spotlight.
 */
import type { Historia } from '../../core/data/db'
import { documentosRepo, historiasRepo } from '../../core/data/repository'
import { abrirApp } from '../../core/abrirApp'
import { clickTut, elTut, esperarTut } from '../../core/tutorial/dom'
import type { CuerpoTutorial, TextoTut } from '../../core/tutorial/tipos'

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Sección del libro de ejemplo (`ejemplos.ts`); su pie es `ejemplo.<sección>`. */
const EJEMPLO = 'escritura.libros'

/**
 * El libro por el que entra el tour: el de ejemplo si sigue ahí, y si no otro
 * propio con textos. Ni «Compartidos conmigo» ni uno cuyo texto a abrir (el
 * primero de la lista, como en `abrirLibro`) sea una hoja compartida, que
 * conectaría con su espacio.
 */
async function libroConTextos(): Promise<number | null> {
  const [libros, docs] = await Promise.all([historiasRepo.list(), documentosRepo.list()])
  const abrible = (h: Historia) => {
    const d = docs.find((x) => x.historiaId === h.id)
    return h.id != null && !h.compartidos && d != null && !d.espacioId
  }
  return (libros.find((h) => h.ejemploDe === EJEMPLO && abrible(h)) ?? libros.find(abrible))?.id ?? null
}

/** A la estantería: el tour puede lanzarse con un texto abierto (el «?» de la app) o volver con «Atrás». */
const aLaEstanteria = async () => {
  if (clickTut('escritura.volver')) await esperarTut('escritura.libros', 3000)
}

/** Al editor. Idempotente: con la barra ya a la vista no hace nada; sin libro que abrir, se queda en la estantería. */
const alEditor = async () => {
  if (elTut('escritura.barra')) return
  const id = await libroConTextos()
  if (id == null) return
  const portada = `escritura.libro.${id}`
  if (!(await esperarTut(portada, 3000))) return
  clickTut(portada)
  await esperarTut('escritura.barra', 4000)
}

/**
 * Las carpetas del libro: en escritorio salen abiertas y en el teléfono se
 * piden con su botón, que alterna, así que solo se pulsa si faltan. Botón y
 * panel nacen en el mismo render, con el documento ya cargado.
 */
const abrirCarpetas = async () => {
  await alEditor()
  if (!elTut('escritura.barra')) return
  if (!(await esperarTut('escritura.btn.carpetas', 3000))) return
  if (!elTut('escritura.carpetas')) clickTut('escritura.btn.carpetas')
  await esperarTut('escritura.carpetas', 2000)
}

export const cuerpoEsencial: CuerpoTutorial = {
  preparar: () => {
    abrirApp('escritura')
  },
  pasos: [
    {
      titulo: T('tut.app-escritura--esencial.1.titulo', 'Tu estudio de escritura'),
      texto: T(
        'tut.app-escritura--esencial.1.texto',
        'Aquí todo lo que escribes vive en libros: un cuento, una novela, un guion, una obra de teatro o una simple carta. Cada libro guarda sus textos en carpetas, y el editor les da formato, los exporta y tiene una IA que escribe contigo.',
      ),
    },
    {
      sel: 'escritura.libros',
      titulo: T('tut.app-escritura--esencial.2.titulo', 'La estantería'),
      texto: T(
        'tut.app-escritura--esencial.2.texto',
        'Cada portada es un libro con el número de textos que lleva: el lápiz lo renombra y la papelera lo borra entero. «Nuevo libro» pregunta qué vas a escribir —En blanco, Cuento, Guion u Obra de teatro, que solo cambia el icono— y lo abre en su primer capítulo.',
      ),
      alEntrar: aLaEstanteria,
    },
    {
      sel: 'ejemplo.escritura.libros',
      titulo: T('tut.app-escritura--esencial.3.titulo', 'Un libro de ejemplo'),
      texto: T(
        'tut.app-escritura--esencial.3.texto',
        'La primera vez, la estantería trae puesto «El invierno del faro», un libro de ejemplo con dos capítulos, dos personajes, un lugar y un acto con su trama ya escritos. «Borrar el ejemplo», en este pie, lo quita entero; si ya no está, «Restaurar ejemplo de fábrica» lo trae de vuelta.',
      ),
      alEntrar: aLaEstanteria,
    },
    {
      sel: 'escritura.barra',
      titulo: T('tut.app-escritura--esencial.4.titulo', 'La hoja y su barra'),
      texto: T(
        'tut.app-escritura--esencial.4.texto',
        'Al abrir un libro entras a la hoja, que se guarda sola mientras escribes. La barra le da formato: títulos y citas, negrita, cursiva, listas, alineación y color del texto.',
      ),
      alEntrar: alEditor,
    },
    {
      sel: 'escritura.carpetas',
      titulo: T('tut.app-escritura--esencial.5.titulo', 'Las carpetas del libro'),
      texto: T(
        'tut.app-escritura--esencial.5.texto',
        'Capítulos, Personajes, Lugares y Actos, con las tramas dentro de cada acto. Las fichas llevan imagen, descripción y color, y su nombre queda marcado en el texto de las demás hojas; en Relaciones dibujas cómo se unen los personajes.',
      ),
      alEntrar: abrirCarpetas,
    },
    {
      sel: 'escritura.exportar',
      titulo: T('tut.app-escritura--esencial.6.titulo', 'Índice y exportar'),
      texto: T(
        'tut.app-escritura--esencial.6.texto',
        'El índice se arma solo con los títulos del texto y puede ir en la primera página al imprimir. Aquí también descargas el texto en TXT, lo envías a un contacto o lo imprimes o lo guardas en PDF; «Compartir», al lado, lo abre para escribirlo entre varios.',
      ),
      alEntrar: alEditor,
    },
    {
      sel: 'escritura.ia',
      titulo: T('tut.app-escritura--esencial.7.titulo', 'Escribir con IA'),
      texto: T(
        'tut.app-escritura--esencial.7.texto',
        'Redacta lo que le pidas, mejora el texto que selecciones, continúa donde vas o resume el documento. Cada opción muestra antes cuántos créditos cuesta.',
      ),
      alEntrar: alEditor,
    },
  ],
}
