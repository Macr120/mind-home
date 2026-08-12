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

const flujoRepaso = tour(
  'app-idiomas--repaso',
  T('tut.app-idiomas--repaso.titulo', 'El repaso diario'),
  T(
    'tut.app-idiomas--repaso.resumen',
    'Las tarjetas se repasan por cajas: cada acierto aleja la próxima cita y cada fallo la acerca. La app solo te pide las que tocan hoy.',
  ),
  'cuerpoRepaso',
)

const flujoVocabulario = tour(
  'app-idiomas--vocabulario',
  T('tut.app-idiomas--vocabulario.titulo', 'El vocabulario'),
  T(
    'tut.app-idiomas--vocabulario.resumen2',
    'Las tarjetas viven DENTRO del temario: cada tema se despliega y ahí están las suyas, con su sonido, su imagen y su caja de repaso.',
  ),
  'cuerpoVocabulario',
)

const flujoTemario = tour(
  'app-idiomas--temario',
  T('tut.app-idiomas--temario.titulo', 'El temario y el plan'),
  T(
    'tut.app-idiomas--temario.resumen',
    'El temario ordena el idioma en tres áreas —temas, pronunciación y gramática— por nivel MCER, y el progreso resume tu avance.',
  ),
  'cuerpoTemario',
)

export const flujosIdiomas: TutorialDef[] = [flujoRepaso, flujoVocabulario, flujoTemario]
