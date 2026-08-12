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

const flujoDiario = tour(
  'app-anecdotario--diario',
  T('tut.app-anecdotario--diario.titulo', 'El diario de Pep@'),
  T(
    'tut.app-anecdotario--diario.resumen',
    'El anecdotario es el diario personal: entradas con ánimo, texto y fotos, un calendario que pinta el año según cómo te sentiste, y el historial en carpetas por año, mes y semana.',
  ),
  'cuerpoDiario',
)

const flujoFotos = tour(
  'app-anecdotario--fotos',
  T('tut.app-anecdotario--fotos.titulo', 'Los hitos en fotos'),
  T(
    'tut.app-anecdotario--fotos.resumen',
    'Las entradas importantes llevan foto: se ven en el historial y se abren a pantalla completa.',
  ),
  'cuerpoFotos',
)

export const flujosAnecdotario: TutorialDef[] = [flujoDiario, flujoFotos]
