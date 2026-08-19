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

const flujoHabito = tour(
  'app-diario--habito',
  T('tut.app-diario--habito.titulo', 'El hábito de leer el diario'),
  T(
    'tut.app-diario--habito.resumen',
    'El periódico es efímero: cada día trae titulares por categoría y efemérides, y a medianoche se renueva. Lo que se guarda es tu constancia — leerlo cuenta como el registro del día.',
  ),
  'cuerpoHabito',
)

const flujoReparto = tour(
  'app-diario--reparto',
  T('tut.app-diario--reparto.titulo', 'Que te lo traigan a ti'),
  T(
    'tut.app-diario--reparto.resumen',
    'Puedes programar qué secciones te entrega cada asistente en su chat: a una hora fija o en un momento sorpresa del día.',
  ),
  'cuerpoReparto',
)

export const flujosDiario: TutorialDef[] = [flujoHabito, flujoReparto]

/** Esencial: recorre los menús principales en la casa real, sin necesitar datos. */
export const esencialDiario: TutorialDef = fichaEsencial(
  'diario',
  T(
    'tut.app-diario--esencial.resumen',
    'El diario es un periódico efímero: titulares de prensa real por categoría y efemérides del día, que se renueva solo a medianoche. Desde el reparto programas que un asistente te lo entregue en su propio chat.',
  ),
  () => import('./tutorial').then((m) => m.cuerpoEsencial as CuerpoTutorial),
)
