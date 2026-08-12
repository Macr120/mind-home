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

const flujoCuidar = tour(
  'infra-granja--cuidar',
  T('tut.infra-granja--cuidar.titulo', 'Cuidar el santuario'),
  T(
    'tut.infra-granja--cuidar.resumen',
    'Alimentar, mimar, limpiar y curar a los rescatados del santuario — con un corral sucio y un cerdo enfermo esperándote de verdad.',
  ),
  // Sin `preparar`: el editor se abre en el paso 2, para que la panorámica del
  // paso 1 se vea con el mapa limpio (su barra ocupa todo el bajo de pantalla).,
  'cuerpoCuidar',
)

const flujoCorrales = tour(
  'infra-granja--corrales',
  T('tut.infra-granja--corrales.titulo', 'Corrales y cupo'),
  T(
    'tut.infra-granja--corrales.resumen',
    'Cómo se levanta un corral, se puebla con sus especies, se le ponen juguetes y nombres.',
  ),
  'cuerpoCorrales',
)

export const flujosGranja: TutorialDef[] = [flujoCuidar, flujoCorrales]
