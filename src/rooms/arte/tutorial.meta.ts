import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { fichaEsencial } from '../../core/tutorial/esencial'

/**
 * Ficha del tutorial de esta app: id, título y resumen. Es lo único que entra al
 * bundle de arranque (el selector la pinta y el chat lee su resumen); los pasos
 * viven en `tutorial.ts`, que solo se descarga al lanzar el tour.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Esencial: la galería y, si hay un dibujo que abrir, el editor con su barra, capas, filtros, exportar e IA. */
export const esencialArte: TutorialDef = fichaEsencial(
  'arte',
  T(
    'tut.app-arte--esencial.resumen',
    'Arte es tu estudio de dibujo y foto: una galería de dibujos y, al abrir uno, un lienzo por capas con pincel, spray, formas, relleno, texto y fotos. Trae filtros, ayudas como la regla o el espejo, exportación a PNG y una IA que pinta lo que describes o reinterpreta tu dibujo. De fábrica vienen dos dibujos, «Tarde en el valle» y «Bodegón de frutas», que se borran o se restauran desde el pie de la galería.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
