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

const flujoJugar = tour(
  'infra-canchas--jugar',
  T('tut.infra-canchas--jugar.titulo', 'Jugar en las canchas'),
  T(
    'tut.infra-canchas--jugar.resumen',
    'El complejo deportivo del demo: cómo arranca cada juego al entrar a la cancha y los marcadores de Pep@ que puedes mejorar.',
  ),
  'cuerpoJugar',
)

export const flujosCanchas: TutorialDef[] = [flujoJugar]
