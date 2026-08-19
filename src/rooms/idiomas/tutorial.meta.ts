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

const flujoCharlas = tour(
  'app-idiomas--charlas',
  T('tut.app-idiomas--charlas.titulo', 'Charlas con tu tutor'),
  T(
    'tut.app-idiomas--charlas.resumen',
    'La pestaña Charlas abre conversación con tu tutor de IA: responde al nivel MCER de tu perfil, corrige con suavidad y al salir te ofrece extraer el vocabulario nuevo como tarjetas. Cada charla queda guardada, con su título y su tema puestos solos.',
  ),
  'cuerpoCharlas',
)

export const flujosIdiomas: TutorialDef[] = [flujoRepaso, flujoVocabulario, flujoTemario, flujoCharlas]

/** Esencial: recorre los cuatro menús en la casa real, sin necesitar datos. */
export const esencialIdiomas: TutorialDef = fichaEsencial(
  'idiomas',
  T(
    'tut.app-idiomas--esencial.resumen',
    'Idiomas es tu escuela de idiomas, en cuatro menús. Charlas abre conversación con un tutor de inteligencia artificial que responde a tu nivel; Temario ordena el idioma en temas, pronunciación y gramática del nivel A1 al C2, y ahí vive el vocabulario en tarjetas; Repaso lo repasa con un sistema espaciado y ejercicios; Progreso resume tu avance.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
