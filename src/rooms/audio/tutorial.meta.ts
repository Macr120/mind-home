import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { fichaEsencial } from '../../core/tutorial/esencial'

/**
 * Ficha del tutorial de esta app: id, título y resumen. Es lo único que entra al
 * bundle de arranque (el selector la pinta y el chat lee su resumen); los pasos
 * viven en `tutorial.ts`, que solo se descarga al lanzar el tour.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Esencial: recorre las dos pestañas en la casa real y explica el editor sin abrirlo. */
export const esencialAudio: TutorialDef = fichaEsencial(
  'audio',
  T(
    'tut.app-audio--esencial.resumen',
    'El estudio musical tiene dos menús. En Canciones están tus proyectos y canciones de fábrica que se escuchan o se abren en el editor: pistas con piano roll, instrumentos sintetizados, teclado en pantalla o MIDI, grabación con metrónomo, exportación a WAV y una IA que compone contigo. Mezclar son dos platos de DJ con crossfader para mezclar canciones del estudio, audios tuyos o muestras de iTunes.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
