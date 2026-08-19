import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'
import { fichaEsencial } from '../../core/tutorial/esencial'

/**
 * Fichas de los tutoriales de esta app: id, título y resumen. Es lo único que
 * entra al bundle de arranque (el selector las pinta y su medidor de zonas las
 * lee cada 200 ms); los pasos viven en `tutorial.ts`, que solo se descarga al
 * lanzar un tour.
 */

const T = (clave: string, es: string): TextoTut => ({ clave, es })

/** El `keyof` valida en compilación que el cuerpo exista con ese nombre. */
const tour = (
  id: string,
  titulo: TextoTut,
  resumen: TextoTut,
  cuerpo: keyof typeof import('./tutorial'),
): TutorialDef => ({
  id,
  titulo,
  resumen,
  cargar: () => import('./tutorial').then((m) => m[cuerpo] as CuerpoTutorial),
})

const flujoPiano = tour(
  'app-hobbies--piano',
  T('tut.app-hobbies--piano.titulo', 'El año de piano'),
  T(
    'tut.app-hobbies--piano.resumen',
    'Hobbies da seguimiento a cada pasatiempo: sesiones con minutos y nota, heatmap anual, rachas, meta semanal y proyectos.',
  ),
  'cuerpoPiano',
)

const flujoProyectos = tour(
  'app-hobbies--proyectos',
  T('tut.app-hobbies--proyectos.titulo', 'Proyectos con fotos'),
  T(
    'tut.app-hobbies--proyectos.resumen',
    'Cada proyecto guarda su nota, sus sesiones vinculadas y su avance en fotos.',
  ),
  'cuerpoProyectos',
)

const flujoGestion = tour(
  'app-hobbies--gestion',
  T('tut.app-hobbies--gestion.titulo', 'Registrar y planear'),
  T(
    'tut.app-hobbies--gestion.resumen',
    'Un hobby nuevo se da de alta en un formulario corto; cada práctica se registra en segundos, y una meta semanal —o el cronograma completo— le pone estructura al tiempo que le dedicas.',
  ),
  'cuerpoGestion',
)

export const flujosHobbies: TutorialDef[] = [flujoPiano, flujoProyectos, flujoGestion]

/** Esencial: recorre la lista y el alta en la casa real, sin necesitar datos. */
export const esencialHobbies: TutorialDef = fichaEsencial(
  'hobbies',
  T(
    'tut.app-hobbies--esencial.resumen',
    'Hobbies lleva el seguimiento de tus pasatiempos: la lista con la racha y el avance semanal de cada uno, y el alta de uno nuevo. Dentro de cada hobby vive el registro de sesiones, el heatmap del año y sus proyectos.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
