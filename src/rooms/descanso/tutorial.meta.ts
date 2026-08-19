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

const flujoNoche = tour(
  'app-descanso--noche',
  T('tut.app-descanso--noche.titulo', 'Cómo se puntúa una noche'),
  T(
    'tut.app-descanso--noche.resumen',
    'Descanso puntúa cada noche sobre cien: cuánto dormiste, a qué hora te acostaste y cuántas veces te despertaste. Con eso construye el historial del año.',
  ),
  'cuerpoNoche',
)

const flujoHorario = tour(
  'app-descanso--horario',
  T('tut.app-descanso--horario.titulo', 'Tu horario de sueño'),
  T(
    'tut.app-descanso--horario.resumen',
    'El horario se dibuja en una barra de veinticuatro horas, se refleja como bloque en el calendario de la casa y puede avisarte antes de dormir.',
  ),
  'cuerpoHorario',
)

export const flujosDescanso: TutorialDef[] = [flujoNoche, flujoHorario]

/** Esencial: recorre las secciones de la app en la casa real, sin necesitar datos. */
export const esencialDescanso: TutorialDef = fichaEsencial(
  'descanso',
  T(
    'tut.app-descanso--esencial.resumen',
    'Descanso registra cómo duermes en una sola pantalla: la puntuación de la última noche, tu horario con sus avisos, el registro diario y el historial completo por año, mes y semana.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
