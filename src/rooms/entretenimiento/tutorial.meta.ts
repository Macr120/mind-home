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

const flujoArchivo = tour(
  'app-entretenimiento--archivo',
  T('tut.app-entretenimiento--archivo.titulo', 'Un año de ciencia ficción'),
  T(
    'tut.app-entretenimiento--archivo.resumen',
    'El archivo guarda lo que ves, lees y juegas: cada ficha con su estado, sus estrellas y tu reseña. Se agrupa por fecha en carpetas de año y mes, o por género.',
  ),
  'cuerpoArchivo',
)

const flujoProgramas = tour(
  'app-entretenimiento--programas',
  T('tut.app-entretenimiento--programas.titulo', 'Programas para ver'),
  T(
    'tut.app-entretenimiento--programas.resumen',
    'Un programa es una lista de títulos por tema o género convertida en metas: palomeas lo que completas y, si quieres, les pones fecha para verlas en el calendario.',
  ),
  'cuerpoProgramas',
)

const flujoJuegos = tour(
  'app-entretenimiento--juegos',
  T('tut.app-entretenimiento--juegos.titulo', 'La mesa digital'),
  T(
    'tut.app-entretenimiento--juegos.resumen',
    'Más de veinte juegos de mesa y arcade, agrupados por familia y filtrados por número de jugadores: se juegan ahí mismo, sin salir de la casa.',
  ),
  'cuerpoJuegos',
)

export const flujosEntretenimiento: TutorialDef[] = [flujoArchivo, flujoProgramas, flujoJuegos]
