import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { fichaEsencial } from '../../core/tutorial/esencial'

/**
 * Ficha del tutorial de esta app: id, título y resumen. Es lo único que entra al
 * bundle de arranque (el selector la pinta y el chat lee su resumen); los pasos
 * viven en `tutorial.ts`, que solo se descarga al lanzar el tour.
 *
 * Los tours de EJEMPLO del cuarto no están aquí: viven con los del reloj, en
 * `core/tutorial/calendario.meta.ts` (`FLUJOS_METAS`).
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Esencial: recorre los tres menús en la casa real, sin necesitar datos. */
export const esencialMetas: TutorialDef = fichaEsencial(
  'metas',
  T(
    'tut.app-metas--esencial.resumen',
    'El planificador de toda la casa, en tres menús: Metas (la lista de lo que te propusiste, agrupada por la app que lleva cada una), Planes (los borradores de cronograma que reparten una meta en fases) y Cronograma (el eje del tiempo donde caen todas). No guarda registros propios: reúne las metas y los planes que nacen en las demás apps. Desde una meta se abre su hoja y, desde ahí, el eje acotado a ella.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
