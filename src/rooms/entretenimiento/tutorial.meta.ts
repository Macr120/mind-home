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

const flujoArchivo = tour(
  'app-entretenimiento--archivo',
  T('tut.app-entretenimiento--archivo.titulo', 'Un año de ciencia ficción'),
  T(
    'tut.app-entretenimiento--archivo.resumen',
    'El archivo guarda lo que ves, lees y juegas: cada ficha con su estado, sus estrellas y tu reseña. Se agrupa por fecha en carpetas de año y mes, o por género.',
  ),
  'cuerpoArchivo',
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

export const flujosEntretenimiento: TutorialDef[] = [flujoArchivo, flujoJuegos]

/** Esencial: recorre los dos menús en la casa real, sin necesitar datos. */
export const esencialEntretenimiento: TutorialDef = fichaEsencial(
  'entretenimiento',
  T(
    'tut.app-entretenimiento--esencial.resumen',
    'Entretenimiento tiene dos menús: Juegos de mesa, con un catálogo digital agrupado por familias y filtrado por número de jugadores, y Archivo, donde guardas las películas, series, libros y videojuegos que vas terminando con su estado y tu reseña.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
