import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { fichaEsencial } from '../../core/tutorial/esencial'

/**
 * Ficha del tutorial de esta app: id, título y resumen. Es lo único que entra al
 * bundle de arranque (el selector la pinta y el chat lee su resumen); los pasos
 * viven en `tutorial.ts`, que solo se descarga al lanzar el tour.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Esencial: recorre las dos pestañas en la casa real y enseña el editor sobre el anuncio de fábrica. */
export const esencialVideo: TutorialDef = fichaEsencial(
  'video',
  T(
    'tut.app-video--esencial.resumen',
    'El editor de video monta clips, imágenes, textos, narración, música y sonidos sobre una línea de tiempo por pistas, con un visor que lo reproduce tal como saldrá. Se puede grabar la propia app como clip, pedirle el guion a la IA y exportar el video o publicarlo en tus redes. En Animación 3D se ruedan escenas en el mapa con tu avatar y tus asistentes.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
