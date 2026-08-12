import type { CuerpoTutorial, TextoTut, TutorialDef } from '../../core/tutorial/tipos'

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

const flujoEnciclopedia = tour(
  'app-biblioteca--enciclopedia',
  T('tut.app-biblioteca--enciclopedia.titulo', 'La enciclopedia propia'),
  T(
    'tut.app-biblioteca--enciclopedia.resumen',
    'Todo lo que aprendes se archiva en un árbol por campo del conocimiento: fichas con resumen y puntos clave que puedes ilustrar.',
  ),
  'cuerpoEnciclopedia',
)

const flujoCharlas = tour(
  'app-biblioteca--charlas',
  T('tut.app-biblioteca--charlas.titulo', 'Charlar y destilar'),
  T(
    'tut.app-biblioteca--charlas.resumen2',
    'Preguntas al Sabio sobre cualquier tema y la charla se archiva sola: se clasifica en tu árbol y sale ya destilada como ficha de la enciclopedia.',
  ),
  'cuerpoCharlas',
)

const flujoEstudio = tour(
  'app-biblioteca--estudio',
  T('tut.app-biblioteca--estudio.titulo', 'Estudiar y planear'),
  T(
    'tut.app-biblioteca--estudio.resumen',
    'El temporizador registra cuánto estudias —de corrido o a pomodoros— y el plan de estudio reparte tus metas en el calendario.',
  ),
  'cuerpoEstudio',
)

const flujoResumen = tour(
  'app-biblioteca--resumen',
  T('tut.app-biblioteca--resumen.titulo', 'El panorama del año'),
  T(
    'tut.app-biblioteca--resumen.resumen',
    'Resumen junta en una pantalla lo que las otras tres pestañas reparten: cuántas entradas tienes por campo, cuánto has estudiado y qué días.',
  ),
  'cuerpoResumen',
)

export const flujosBiblioteca: TutorialDef[] = [flujoEnciclopedia, flujoCharlas, flujoEstudio, flujoResumen]
