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

const flujoCarrera = tour(
  'infra-caminos--carrera',
  T('tut.infra-caminos--carrera.titulo', 'Correr en la pista'),
  T(
    'tut.infra-caminos--carrera.resumen',
    'La pista del demo, la meta, cómo arrancar una carrera montado y la tabla de récords de Pep@ que puedes batir.',
  ),
  'cuerpoCarrera',
)

const flujoTrazos = tour(
  'infra-caminos--trazos',
  T('tut.infra-caminos--trazos.titulo', 'Pista, riel y coaster'),
  T(
    'tut.infra-caminos--trazos.resumen',
    'Los tres tipos de trazo del mapa y cómo se dibujan en tu propia casa.',
  ),
  'cuerpoTrazos',
)

export const flujosCaminos: TutorialDef[] = [flujoCarrera, flujoTrazos]
