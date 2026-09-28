import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { fichaEsencial } from '../../core/tutorial/esencial'

/**
 * Ficha del tutorial de esta app: es lo único que entra al bundle de arranque;
 * los pasos viven en `tutorial.ts`, que solo se descarga al lanzar el tour. No
 * hay tours de ejemplo: en la casa demo la app se queda en su puerta («La demo
 * no sube archivos»).
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** Esencial: recorre el explorador en la casa real, sin crear ni necesitar datos. */
export const esencialArchivos: TutorialDef = fichaEsencial(
  'archivos',
  T(
    'tut.app-archivos--esencial.resumen',
    'Archivo es tu nube: carpetas y archivos de cualquier tipo, con vista previa, en todos tus dispositivos. Necesita la sesión iniciada y un plan Pro, con 10, 30 o 100 GB según el nivel; si el plan se acaba, lo subido se puede ver y bajar durante 90 días. Cada cuarto tiene su carpeta con lo que su app ya guarda, y hay Recientes, Destacados, una Papelera de 30 días y enlaces para compartir que se abren sin cuenta.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
