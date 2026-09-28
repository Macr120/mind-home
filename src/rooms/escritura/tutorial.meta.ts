import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { fichaEsencial } from '../../core/tutorial/esencial'

/**
 * Ficha del tutorial de esta app: id, título y resumen. Es lo único que entra al
 * bundle de arranque (el selector la pinta y el chat lee su resumen); los pasos
 * viven en `tutorial.ts`, que solo se descarga al lanzar el tour.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Esencial: la estantería y su ejemplo, y el editor si hay un libro con textos que abrir. */
export const esencialEscritura: TutorialDef = fichaEsencial(
  'escritura',
  T(
    'tut.app-escritura--esencial.resumen',
    'Escritura es una estantería de libros. Cada libro guarda sus textos en carpetas —capítulos, personajes, lugares y actos con sus tramas— y un diagrama de relaciones entre personajes. El editor da formato, arma un índice con los títulos, exporta a TXT o PDF y trae una IA que redacta, mejora, continúa y resume. La primera vez trae puesto un libro de ejemplo, «El invierno del faro», que se borra o se restaura desde su pie.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
