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

const flujoBatalla = tour(
  'infra-paintball--batalla',
  T('tut.infra-paintball--batalla.titulo', 'Batalla de paintball'),
  T(
    'tut.infra-paintball--batalla.resumen',
    'Cómo armar una batalla 1v1, 2v2 o campal contra los asistentes, con la casa entera como campo.',
  ),
  'cuerpoBatalla',
)

export const flujosPaintball: TutorialDef[] = [flujoBatalla]
